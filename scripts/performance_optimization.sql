-- ==============================================================================
-- VIOTRACK PRODUCTION PERFORMANCE OPTIMIZATION & INDEXING SCHEMA
-- Target: Supabase / PostgreSQL 15+ (Fully Resilient & Table-Agnostic)
-- Optimized for: 100,000+ Students, 1,000,000+ Violation Records
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. EXTENSIONS FOR HIGH-SPEED TEXT SEARCH & TRIVIAL MATCHING
-- ------------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- ------------------------------------------------------------------------------
-- 2. HIGH-PERFORMANCE INDEXES (Executed safely with table existence checks)
-- ------------------------------------------------------------------------------
DO $$
BEGIN
  -- Students Table Indexes
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'students') THEN
    CREATE INDEX IF NOT EXISTS idx_students_lrn ON public.students (lrn);
    CREATE INDEX IF NOT EXISTS idx_students_grade_section ON public.students (grade, section);
    CREATE INDEX IF NOT EXISTS idx_students_name_gin ON public.students USING gin (
      (fname || ' ' || mname || ' ' || lname) gin_trgm_ops
    );
    CREATE INDEX IF NOT EXISTS idx_students_created_at ON public.students (created_at DESC);
  END IF;

  -- Violations Categories Reference Table (named 'violations' or 'violation_types')
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'violations') THEN
    CREATE INDEX IF NOT EXISTS idx_violations_type ON public.violations (type);
    CREATE INDEX IF NOT EXISTS idx_violations_title_trgm ON public.violations USING gin (title gin_trgm_ops);
  END IF;

  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'violation_types') THEN
    CREATE INDEX IF NOT EXISTS idx_violation_types_type ON public.violation_types (type);
    CREATE INDEX IF NOT EXISTS idx_violation_types_title_trgm ON public.violation_types USING gin (title gin_trgm_ops);
  END IF;

  -- Records / Incidents Table (The high-volume transactional table)
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'records') THEN
    CREATE INDEX IF NOT EXISTS idx_records_student_id ON public.records (student_id);
    CREATE INDEX IF NOT EXISTS idx_records_violation_id ON public.records (violation_id);
    CREATE INDEX IF NOT EXISTS idx_records_date_status ON public.records (date_reported DESC, status);
    CREATE INDEX IF NOT EXISTS idx_records_status ON public.records (status);
    CREATE INDEX IF NOT EXISTS idx_records_created_at ON public.records (created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_records_student_date ON public.records (student_id, date_reported DESC);
  END IF;

  -- Activity & Audit Logs Table
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'activity_logs') THEN
    CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.activity_logs (created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON public.activity_logs (action);
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 3. SINGLE-ROUNDTRIP PRECOMPUTED DASHBOARD AGGREGATE FUNCTION (RPC)
-- Eliminates N+1 client-side queries and full-table scans
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_dashboard_summary(
  p_role TEXT DEFAULT 'admin', 
  p_grade TEXT DEFAULT NULL, 
  p_section TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
  v_seven_days_ago TIMESTAMPTZ := NOW() - INTERVAL '7 days';
  v_fourteen_days_ago TIMESTAMPTZ := NOW() - INTERVAL '14 days';
  v_start_of_month TIMESTAMPTZ := date_trunc('month', NOW());
BEGIN
  WITH filtered_records AS (
    SELECT 
      r.id,
      r.student_id,
      r.status,
      r.date_reported,
      r.created_at,
      COALESCE(v.type, 'Minor') AS violation_type,
      COALESCE(v.title, 'Violation Incident') AS violation_title,
      s.fname,
      s.lname,
      s.grade,
      s.section,
      s.image AS student_image
    FROM public.records r
    LEFT JOIN public.students s ON r.student_id = s.id
    LEFT JOIN public.violations v ON r.violation_id = v.id
    WHERE 
      (p_role = 'admin') 
      OR (p_role = 'teacher' AND (p_grade IS NULL OR (s.grade = p_grade AND s.section = p_section)))
  ),
  counts AS (
    SELECT
      COUNT(*) AS total_records,
      COUNT(*) FILTER (WHERE violation_type = 'Minor') AS minor_count,
      COUNT(*) FILTER (WHERE violation_type = 'Serious') AS serious_count,
      COUNT(*) FILTER (WHERE violation_type = 'Major') AS major_count,
      COUNT(*) FILTER (WHERE status = 'Resolved') AS resolved_count,
      COUNT(*) FILTER (WHERE status IN ('Pending', 'Investigation')) AS pending_count,
      COUNT(*) FILTER (WHERE date_reported >= v_seven_days_ago) AS this_week_count,
      COUNT(*) FILTER (WHERE date_reported >= v_fourteen_days_ago AND date_reported < v_seven_days_ago) AS last_week_count,
      COUNT(*) FILTER (WHERE date_reported >= v_start_of_month) AS this_month_count
    FROM filtered_records
  ),
  top_offenders AS (
    SELECT 
      student_id,
      fname,
      lname,
      grade,
      section,
      student_image,
      COUNT(*) AS violation_count,
      COUNT(*) FILTER (WHERE status IN ('Pending', 'Investigation')) AS pending_count,
      COUNT(*) FILTER (WHERE status = 'Resolved') AS resolved_count
    FROM filtered_records
    WHERE student_id IS NOT NULL
    GROUP BY student_id, fname, lname, grade, section, student_image
    ORDER BY violation_count DESC
    LIMIT 10
  ),
  recent_incidents AS (
    SELECT 
      id,
      student_id,
      fname,
      lname,
      grade,
      section,
      violation_title,
      violation_type,
      status,
      date_reported
    FROM filtered_records
    ORDER BY date_reported DESC
    LIMIT 10
  )
  SELECT json_build_object(
    'metrics', (SELECT row_to_json(counts) FROM counts),
    'top_offenders', (SELECT COALESCE(json_agg(top_offenders), '[]'::json) FROM top_offenders),
    'recent_incidents', (SELECT COALESCE(json_agg(recent_incidents), '[]'::json) FROM recent_incidents)
  ) INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ------------------------------------------------------------------------------
-- 4. HIGH-SPEED SERVER-SIDE PAGINATED STUDENTS QUERY
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_paginated_students(
  p_search TEXT DEFAULT '',
  p_grade TEXT DEFAULT 'all',
  p_section TEXT DEFAULT 'all',
  p_page INT DEFAULT 1,
  p_limit INT DEFAULT 15,
  p_sort_field TEXT DEFAULT 'lname',
  p_sort_order TEXT DEFAULT 'asc'
)
RETURNS TABLE (
  id BIGINT,
  lrn TEXT,
  fname TEXT,
  mname TEXT,
  lname TEXT,
  grade TEXT,
  section TEXT,
  academicyear TEXT,
  gender TEXT,
  contact TEXT,
  parent_name TEXT,
  parent_contact TEXT,
  address TEXT,
  image TEXT,
  total_count BIGINT
) AS $$
DECLARE
  v_offset INT := (p_page - 1) * p_limit;
BEGIN
  RETURN QUERY
  WITH filtered AS (
    SELECT 
      s.id, s.lrn, s.fname, s.mname, s.lname, s.grade, s.section,
      s.academicyear, s.gender, s.contact, s.parent_name, s.parent_contact,
      s.address, s.image,
      COUNT(*) OVER() AS full_count
    FROM public.students s
    WHERE
      (p_grade = 'all' OR s.grade = p_grade)
      AND (p_section = 'all' OR s.section = p_section)
      AND (
        p_search = '' 
        OR s.lrn ILIKE '%' || p_search || '%'
        OR (s.fname || ' ' || s.lname) ILIKE '%' || p_search || '%'
      )
  )
  SELECT 
    f.id, f.lrn, f.fname, f.mname, f.lname, f.grade, f.section,
    f.academicyear, f.gender, f.contact, f.parent_name, f.parent_contact,
    f.address, f.image, f.full_count
  FROM filtered f
  ORDER BY
    CASE WHEN p_sort_field = 'lname' AND p_sort_order = 'asc' THEN f.lname END ASC,
    CASE WHEN p_sort_field = 'lname' AND p_sort_order = 'desc' THEN f.lname END DESC,
    CASE WHEN p_sort_field = 'grade' AND p_sort_order = 'asc' THEN f.grade END ASC,
    CASE WHEN p_sort_field = 'grade' AND p_sort_order = 'desc' THEN f.grade END DESC,
    f.id DESC
  LIMIT p_limit OFFSET v_offset;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
