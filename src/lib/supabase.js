import { createClient } from '@supabase/supabase-js';

const FALLBACK_SUPABASE_URL = 'https://kdojhuyevdswulndfvok.supabase.co';
const FALLBACK_SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtkb2podXlldmRzd3VsbmRmdm9rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAzNDU1NzcsImV4cCI6MjEwNTkyMTU3N30.yijdEOt_V-m_j8pr6C5ctLwskbVI86aH0jMRgow_PY0';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || FALLBACK_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || FALLBACK_SUPABASE_ANON;

export const isSupabaseConfigured = () => {
  return Boolean(
    supabaseUrl &&
    supabaseAnonKey &&
    !supabaseUrl.includes('your-project-id') &&
    !supabaseAnonKey.includes('your-anon-key')
  );
};

export const supabase = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

const TOKEN_KEY = 'viotrack_auth_token';

export const getStoredToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY) || null;
  } catch {
    return null;
  }
};

export const setStoredToken = (token, remember = true) => {
  try {
    if (token) {
      if (remember) {
        localStorage.setItem(TOKEN_KEY, token);
        sessionStorage.removeItem(TOKEN_KEY);
      } else {
        sessionStorage.setItem(TOKEN_KEY, token);
        localStorage.removeItem(TOKEN_KEY);
      }
    } else {
      localStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(TOKEN_KEY);
    }
  } catch {}
};

export const clearStoredToken = () => {
  try {
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
  } catch {}
};

export const customAuth = async (payload) => {
  if (!isSupabaseConfigured()) {
    throw new Error('Authentication service is not configured.');
  }

  const token = getStoredToken();
  const requestBody = {
    ...payload,
    ...(token && !payload.token ? { token } : {})
  };

  const headers = {
    'Content-Type': 'application/json',
    'apikey': supabaseAnonKey,
    'Authorization': `Bearer ${supabaseAnonKey}`,
  };

  if (token) {
    headers['X-Viotrack-Token'] = token;
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/custom-auth`, {
    method: 'POST',
    credentials: 'include',
    headers,
    body: JSON.stringify(requestBody)
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || 'Authentication request failed.');

  if (body.token) {
    setStoredToken(body.token, payload.rememberMe !== false);
  } else if (payload.action === 'logout') {
    clearStoredToken();
  }

  return body;
};
