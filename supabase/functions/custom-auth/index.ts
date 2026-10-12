import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import bcrypt from 'npm:bcryptjs@2.4.3';
import { SignJWT, jwtVerify } from 'npm:jose@5.10.0';

const getCorsHeaders = (request: Request) => {
  const origin = request.headers.get('origin');
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info, x-viotrack-token',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
};

const json = (request: Request, body: unknown, status = 200, headers: HeadersInit = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...getCorsHeaders(request), 'Content-Type': 'application/json', ...headers },
  });

const getSecret = () => {
  const value = Deno.env.get('CUSTOM_AUTH_SECRET');
  return value ? new TextEncoder().encode(value) : null;
};

const db = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

const cookie = (value: string, maxAge: number) =>
  `viotrack_session=${value}; Max-Age=${maxAge}; Path=/; HttpOnly; Secure; SameSite=None; Partitioned`;

const extractToken = (request: Request, bodyToken?: unknown): string | null => {
  if (typeof bodyToken === 'string' && bodyToken) return bodyToken;
  const xToken = request.headers.get('x-viotrack-token');
  if (xToken) return xToken;
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const candidate = authHeader.replace(/^Bearer\s+/, '').trim();
    if (candidate && candidate !== Deno.env.get('SUPABASE_ANON_KEY')) {
      return candidate;
    }
  }
  const cookieToken = request.headers.get('cookie')?.match(/(?:^|;\s*)viotrack_session=([^;]+)/)?.[1];
  return cookieToken || null;
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: getCorsHeaders(request) });
  if (request.method !== 'POST') return json(request, { error: 'Method not allowed' }, 405);
  if (!Deno.env.get('CUSTOM_AUTH_SECRET')) return json(request, { error: 'Authentication is not configured' }, 503);

  try {
    const signingSecret = getSecret();
    if (!signingSecret) return json(request, { error: 'Authentication is not configured' }, 503);

    const requestBody = await request.json().catch(() => ({}));
    const { action = 'login', email, password, currentPassword, newPassword } = requestBody;

    if (action === 'logout') {
      return json(request, { ok: true }, 200, { 'Set-Cookie': cookie('', 0) });
    }

    if (action === 'session') {
      const token = extractToken(request, requestBody.token);
      if (!token) return json(request, { user: null }, 401);
      try {
        const { payload } = await jwtVerify(token, signingSecret);
        return json(request, { user: payload, token });
      } catch {
        return json(request, { user: null }, 401);
      }
    }

    if (action === 'change-password') {
      const token = extractToken(request, requestBody.token);
      if (!token) return json(request, { error: 'Authentication required' }, 401);
      const { payload } = await jwtVerify(token, signingSecret);
      const accountId = String(payload.id ?? '');
      const role = payload.role === 'admin' ? 'admin' : 'teacher';
      const table = role === 'admin' ? 'admins' : 'teachers';
      if (!accountId || !currentPassword || !newPassword || String(newPassword).length > 256) {
        return json(request, { error: 'Invalid password change request' }, 400);
      }
      const { data: account } = await db.from(table).select('id,password_hash').eq('id', accountId).maybeSingle();
      if (!account?.password_hash || !(await bcrypt.compare(String(currentPassword), account.password_hash))) {
        return json(request, { error: 'Current password is incorrect' }, 401);
      }
      const passwordHash = await bcrypt.hash(String(newPassword), 12);
      const { error } = await db.from(table).update({ password_hash: passwordHash }).eq('id', accountId);
      if (error) throw error;
      return json(request, { ok: true });
    }

    const normalizedEmail = String(email ?? '').trim().toLowerCase();
    const suppliedPassword = String(password ?? '');
    if (!normalizedEmail || !suppliedPassword || suppliedPassword.length > 256) {
      return json(request, { error: 'Invalid email or password' }, 401);
    }

    const { data: admin } = await db
      .from('admins')
      .select('id,fname,lname,email,role,image,password_hash')
      .ilike('email', normalizedEmail)
      .maybeSingle();
    const { data: teacher } = admin ? { data: null } : await db
      .from('teachers')
      .select('id,fname,lname,email,position,department,image,password_hash')
      .ilike('email', normalizedEmail)
      .maybeSingle();
    const account = admin ?? teacher;
    if (!account || !account.password_hash || !(await bcrypt.compare(suppliedPassword, account.password_hash))) {
      return json(request, { error: 'Invalid email or password' }, 401);
    }

    const role = admin ? 'admin' : 'teacher';
    const user = {
      id: account.id,
      email: account.email,
      name: `${account.fname ?? ''} ${account.lname ?? ''}`.trim(),
      role,
      position: account.position ?? (role === 'admin' ? 'Administrator' : 'Teacher'),
      department: account.department ?? 'Faculty',
      avatar: account.image || '/images/phcm-logo2.png',
    };
    const token = await new SignJWT(user)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('8h')
      .sign(signingSecret);
    return json(request, { user, token }, 200, { 'Set-Cookie': cookie(token, 8 * 60 * 60) });
  } catch (error) {
    console.error('custom-auth error', error);
    return json(request, { error: 'Authentication request failed' }, 500);
  }
});
