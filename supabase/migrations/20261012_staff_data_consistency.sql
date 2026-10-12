-- Secure staff records for Supabase Auth-backed login.
-- Run after provisioning each staff member in Supabase Auth and assigning
-- app_metadata.role to admin, teacher, or adviser.

BEGIN;

ALTER TABLE IF EXISTS public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.admins ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX IF NOT EXISTS teachers_email_unique
  ON public.teachers (LOWER(email));

CREATE UNIQUE INDEX IF NOT EXISTS admins_email_unique
  ON public.admins (LOWER(email));

DO $$
BEGIN
  IF to_regclass('public.teachers') IS NOT NULL THEN
    DROP POLICY IF EXISTS "App users can read teachers" ON public.teachers;
    DROP POLICY IF EXISTS "App users can insert teachers" ON public.teachers;
    DROP POLICY IF EXISTS "App users can update teachers" ON public.teachers;
    DROP POLICY IF EXISTS "App users can delete teachers" ON public.teachers;
    DROP POLICY IF EXISTS "Authenticated users can read teachers" ON public.teachers;
    DROP POLICY IF EXISTS "Admins can manage teachers" ON public.teachers;

    CREATE POLICY "Authenticated users can read teachers"
      ON public.teachers FOR SELECT TO authenticated USING (true);
    CREATE POLICY "Admins can manage teachers"
      ON public.teachers FOR ALL TO authenticated
      USING ((auth.jwt()->'app_metadata'->>'role') = 'admin')
      WITH CHECK ((auth.jwt()->'app_metadata'->>'role') = 'admin');

    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'teachers' AND column_name = 'password'
    ) THEN
      EXECUTE 'REVOKE SELECT (password) ON public.teachers FROM anon, authenticated';
    END IF;
  END IF;

  IF to_regclass('public.admins') IS NOT NULL THEN
    DROP POLICY IF EXISTS "App users can read admins" ON public.admins;
    DROP POLICY IF EXISTS "App users can insert admins" ON public.admins;
    DROP POLICY IF EXISTS "App users can update admins" ON public.admins;
    DROP POLICY IF EXISTS "App users can delete admins" ON public.admins;
    DROP POLICY IF EXISTS "Authenticated users can read admins" ON public.admins;
    DROP POLICY IF EXISTS "Admins can manage admins" ON public.admins;

    CREATE POLICY "Authenticated users can read admins"
      ON public.admins FOR SELECT TO authenticated USING (true);
    CREATE POLICY "Admins can manage admins"
      ON public.admins FOR ALL TO authenticated
      USING ((auth.jwt()->'app_metadata'->>'role') = 'admin')
      WITH CHECK ((auth.jwt()->'app_metadata'->>'role') = 'admin');

    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'admins' AND column_name = 'password'
    ) THEN
      EXECUTE 'REVOKE SELECT (password) ON public.admins FROM anon, authenticated';
    END IF;
  END IF;
END $$;

COMMIT;
