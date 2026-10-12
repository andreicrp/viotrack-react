-- Link the initial VioTrack administrator to Supabase Auth.
-- First enable Email Auth and create admin@viotrack.edu in:
-- Supabase Dashboard > Authentication > Users > Add user.
-- This script cannot initialize a disabled/uninitialized Supabase Auth service.
--
-- After creating the user in the dashboard, verify the link with:
-- SELECT u.email, u.email_confirmed_at, u.raw_app_meta_data, a.auth_user_id
-- FROM auth.users u LEFT JOIN public.admins a ON a.auth_user_id = u.id
-- WHERE lower(u.email) = 'admin@viotrack.edu';

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE IF EXISTS public.admins
  ADD COLUMN IF NOT EXISTS auth_user_id UUID;

CREATE UNIQUE INDEX IF NOT EXISTS admins_auth_user_id_unique
  ON public.admins (auth_user_id)
  WHERE auth_user_id IS NOT NULL;

DO $$
DECLARE
  admin_id UUID;
  admin_email CONSTANT TEXT := 'admin@viotrack.edu';
BEGIN
  SELECT id
    INTO admin_id
    FROM auth.users
   WHERE lower(email) = lower(admin_email)
   LIMIT 1;

  IF admin_id IS NULL THEN
    RAISE EXCEPTION 'Create % in Supabase Authentication > Users first, then run this script again.', admin_email;
  END IF;

  UPDATE auth.users
     SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb)
       || jsonb_build_object('role', 'admin'),
         raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb)
       || jsonb_build_object('full_name', 'System Administrator'),
         updated_at = NOW()
   WHERE id = admin_id;

  INSERT INTO public.admins (fname, lname, email, role, image, auth_user_id)
  VALUES (
    'System',
    'Administrator',
    admin_email,
    'admin',
    '',
    admin_id
  )
  ON CONFLICT (email) DO UPDATE
    SET auth_user_id = EXCLUDED.auth_user_id,
        role = 'admin';
END
$$;

COMMIT;
