-- ==============================================================================
-- VIOTRACK ROW LEVEL SECURITY (RLS) & RBAC SERVER-SIDE ENFORCEMENT POLICIES
-- Aligned with OWASP Top 10 & Philippine Data Privacy Act (RA 10173)
-- ==============================================================================

-- Enable Row Level Security across all core tables
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE advisers ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_events ENABLE ROW LEVEL SECURITY;

-- 1. Helper function to extract user role from authenticated JWT claims
CREATE OR REPLACE FUNCTION auth.viotrack_user_role()
RETURNS TEXT AS $$
BEGIN
  RETURN COALESCE(
    current_setting('request.jwt.claims', true)::json->>'role',
    (current_setting('request.jwt.claims', true)::json->'app_metadata'->>'role')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. STUDENTS POLICIES
-- Anyone authenticated can view students roster (Admin, Teachers, Advisers)
CREATE POLICY "Authenticated users can view student directory"
ON students FOR SELECT
TO authenticated
USING (true);

-- Only Administrators can insert, update, or delete student profiles
CREATE POLICY "Only Administrators can modify student records"
ON students FOR ALL
TO authenticated
USING (auth.viotrack_user_role() IN ('admin', 'superadmin', 'headadmin'))
WITH CHECK (auth.viotrack_user_role() IN ('admin', 'superadmin', 'headadmin'));

-- 3. VIOLATIONS POLICIES
-- Teachers can view violations; Administrators have full oversight
CREATE POLICY "Staff can view disciplinary records"
ON violations FOR SELECT
TO authenticated
USING (true);

-- Teachers and Admins can log new violations
CREATE POLICY "Staff and Admins can log incidents"
ON violations FOR INSERT
TO authenticated
WITH CHECK (auth.role() = 'authenticated');

-- Only Administrators can resolve or delete violation records
CREATE POLICY "Only Administrators can update or delete violations"
ON violations FOR UPDATE
TO authenticated
USING (auth.viotrack_user_role() IN ('admin', 'superadmin', 'headadmin'))
WITH CHECK (auth.viotrack_user_role() IN ('admin', 'superadmin', 'headadmin'));

CREATE POLICY "Only Administrators can remove violations"
ON violations FOR DELETE
TO authenticated
USING (auth.viotrack_user_role() IN ('admin', 'superadmin', 'headadmin'));

-- 4. ADMIN USERS & SENSITIVE CREDENTIALS
-- Only existing administrators can query or modify admin user accounts
CREATE POLICY "Admin users management restricted to Admins"
ON admin_users FOR ALL
TO authenticated
USING (auth.viotrack_user_role() IN ('admin', 'superadmin', 'headadmin'))
WITH CHECK (auth.viotrack_user_role() IN ('admin', 'superadmin', 'headadmin'));

-- 5. ACTIVITY AUDIT LOGS (APPEND-ONLY)
-- Audit logs can be read by admins, inserted by any authenticated staff, but never updated or deleted
CREATE POLICY "Admins can view audit logs"
ON activity_logs FOR SELECT
TO authenticated
USING (auth.viotrack_user_role() IN ('admin', 'superadmin', 'headadmin'));

CREATE POLICY "Authenticated staff can append audit logs"
ON activity_logs FOR INSERT
TO authenticated
WITH CHECK (true);

-- Immutable protection: No UPDATE or DELETE allowed on activity_logs
-- (Enforced by omitting UPDATE and DELETE policies)
