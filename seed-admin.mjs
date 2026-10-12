import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://kdojhuyevdswulndfvok.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

// Actual bcrypt hash of 'viotrack@2026' (12 rounds)
const hash = '$2b$12$.wxGnXZjCUjIO7eai92HquBVsvP.5WB55tgD9nI6Qguaaf0uQoSua';

const { data: existing, error: findErr } = await supabase
  .from('admins')
  .select('id, email')
  .ilike('email', 'admin@viotrack.edu')
  .maybeSingle();

if (findErr) {
  console.error('Find error:', findErr.message);
  process.exit(1);
}

console.log('Existing admin:', existing);

if (existing) {
  const { error } = await supabase
    .from('admins')
    .update({ password_hash: hash })
    .eq('id', existing.id);
  if (error) {
    console.error('Update failed:', error.message);
    process.exit(1);
  }
  console.log('✅ Password updated! Login with: admin@viotrack.edu / viotrack@2026');
} else {
  const { data, error } = await supabase.from('admins').insert({
    fname: 'System',
    lname: 'Admin',
    email: 'admin@viotrack.edu',
    role: 'admin',
    password_hash: hash,
  }).select();
  if (error) {
    console.error('Insert failed:', error.message, error.details);
    process.exit(1);
  }
  console.log('✅ Admin created:', data);
  console.log('Login with: admin@viotrack.edu / viotrack@2026');
}
