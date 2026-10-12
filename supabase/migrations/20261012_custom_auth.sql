-- Custom VioTrack authentication credentials.
-- Run after deploying supabase/functions/custom-auth.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE IF EXISTS public.admins
  ADD COLUMN IF NOT EXISTS password_hash TEXT;

ALTER TABLE IF EXISTS public.teachers
  ADD COLUMN IF NOT EXISTS password_hash TEXT;

UPDATE public.admins
   SET password_hash = crypt('viotrack@2026', gen_salt('bf')),
       role = 'admin'
 WHERE lower(email) = 'admin@viotrack.edu';

INSERT INTO public.admins (fname, lname, email, role, image, password_hash)
SELECT 'System', 'Administrator', 'admin@viotrack.edu', 'admin', '', crypt('viotrack@2026', gen_salt('bf'))
WHERE NOT EXISTS (
  SELECT 1 FROM public.admins WHERE lower(email) = 'admin@viotrack.edu'
);

REVOKE SELECT (password_hash) ON public.admins FROM anon, authenticated;
REVOKE SELECT (password_hash) ON public.teachers FROM anon, authenticated;

COMMIT;
