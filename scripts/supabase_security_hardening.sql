-- ==============================================================================
-- VIOTRACK PRODUCTION SECURITY HARDENING & ROW LEVEL SECURITY (RLS) POLICIES
-- Target: Supabase / PostgreSQL 15+ (Compatible with Supabase SQL Editor)
-- Standards: OWASP Top 10, NIST RBAC & Philippine Data Privacy Act (RA 10173)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. EXTENSIONS & HELPER FUNCTIONS (Created in public schema)
-- ------------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Helper function: Extract user role from Supabase JWT token
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
BEGIN
  RETURN COALESCE(
    (current_setting('request.jwt.claims', true)::json->'user_metadata'->>'role'),
    'guest'
  );
EXCEPTION WHEN OTHERS THEN
  RETURN 'guest';
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Helper function: Extract adviser's assigned grade & section
CREATE OR REPLACE FUNCTION public.get_adviser_grade_section()
RETURNS TABLE (grade TEXT, section TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (current_setting('request.jwt.claims', true)::json->'user_metadata'->'adviserSection'->>'grade')::TEXT,
    (current_setting('request.jwt.claims', true)::json->'user_metadata'->'adviserSection'->>'section')::TEXT;
EXCEPTION WHEN OTHERS THEN
  RETURN;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Helper function: Check if current authenticated user is Admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (public.get_user_role() = 'admin');
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ------------------------------------------------------------------------------
-- 2. ENABLE ROW LEVEL SECURITY (RLS) ON ALL CORE TABLES
-- ------------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.records ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.violation_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.advisers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.admin_users ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 3. STUDENTS TABLE RLS POLICIES (RBAC + IDOR Protection)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins full access to students" ON public.students;
CREATE POLICY "Admins full access to students"
  ON public.students
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Teachers and advisers can view students" ON public.students;
CREATE POLICY "Teachers and advisers can view students"
  ON public.students
  FOR SELECT
  TO authenticated
  USING (
    public.get_user_role() IN ('admin', 'teacher')
  );

-- ------------------------------------------------------------------------------
-- 4. RECORDS / INCIDENTS TABLE RLS POLICIES
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins full access to records" ON public.records;
CREATE POLICY "Admins full access to records"
  ON public.records
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Teachers can view records" ON public.records;
CREATE POLICY "Teachers can view records"
  ON public.records
  FOR SELECT
  TO authenticated
  USING (
    public.get_user_role() IN ('admin', 'teacher')
  );

DROP POLICY IF EXISTS "Teachers can insert incident records" ON public.records;
CREATE POLICY "Teachers can insert incident records"
  ON public.records
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.get_user_role() IN ('admin', 'teacher')
  );

DROP POLICY IF EXISTS "Teachers can update status of incident records" ON public.records;
CREATE POLICY "Teachers can update status of incident records"
  ON public.records
  FOR UPDATE
  TO authenticated
  USING (
    public.get_user_role() IN ('admin', 'teacher')
  )
  WITH CHECK (
    public.get_user_role() IN ('admin', 'teacher')
  );

-- ------------------------------------------------------------------------------
-- 5. VIOLATION TYPES RLS POLICIES (Read for all, write for admin)
-- ------------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'violations') THEN
    DROP POLICY IF EXISTS "Everyone can read violations" ON public.violations;
    CREATE POLICY "Everyone can read violations" ON public.violations FOR SELECT TO authenticated, anon USING (true);

    DROP POLICY IF EXISTS "Admins manage violations" ON public.violations;
    CREATE POLICY "Admins manage violations" ON public.violations FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
  END IF;

  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'violation_types') THEN
    DROP POLICY IF EXISTS "Everyone can read violation_types" ON public.violation_types;
    CREATE POLICY "Everyone can read violation_types" ON public.violation_types FOR SELECT TO authenticated, anon USING (true);

    DROP POLICY IF EXISTS "Admins manage violation_types" ON public.violation_types;
    CREATE POLICY "Admins manage violation_types" ON public.violation_types FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 6. ACTIVITY & AUDIT LOGS (Append-only for security; Admin view only)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.activity_logs;
CREATE POLICY "Admins can view audit logs"
  ON public.activity_logs
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Authenticated users can write audit logs" ON public.activity_logs;
CREATE POLICY "Authenticated users can write audit logs"
  ON public.activity_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 7. TEACHERS, ADVISERS & ADMIN USERS PROTECTION
-- ------------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'teachers') THEN
    DROP POLICY IF EXISTS "Admins manage teachers" ON public.teachers;
    CREATE POLICY "Admins manage teachers" ON public.teachers FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

    DROP POLICY IF EXISTS "Authenticated read teachers" ON public.teachers;
    CREATE POLICY "Authenticated read teachers" ON public.teachers FOR SELECT TO authenticated USING (true);
  END IF;

  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'advisers') THEN
    DROP POLICY IF EXISTS "Admins manage advisers" ON public.advisers;
    CREATE POLICY "Admins manage advisers" ON public.advisers FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

    DROP POLICY IF EXISTS "Authenticated read advisers" ON public.advisers;
    CREATE POLICY "Authenticated read advisers" ON public.advisers FOR SELECT TO authenticated USING (true);
  END IF;

  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'admin_users') THEN
    DROP POLICY IF EXISTS "Admins manage admin users" ON public.admin_users;
    CREATE POLICY "Admins manage admin users" ON public.admin_users FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 8. SECURE STORAGE BUCKET (Avatars & Incident Media)
-- ------------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'storage' AND tablename = 'buckets') THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'viotrack-media',
      'viotrack-media',
      true,
      5242880,
      ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- Storage bucket configuration is optional and can be managed from Supabase UI
  NULL;
END $$;
