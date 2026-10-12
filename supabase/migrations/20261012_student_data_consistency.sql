-- Student data consistency migration.
-- Run this once in the Supabase SQL editor for the production project.

DO $$
BEGIN
  IF to_regclass('public.students') IS NULL THEN
    RAISE EXCEPTION 'public.students does not exist. Run the base VioTrack schema first.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'students'
      AND column_name = 'student_id'
  ) THEN
    ALTER TABLE public.students ADD COLUMN student_id TEXT;
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'students'
        AND column_name = 'lrn'
    ) THEN
      UPDATE public.students SET student_id = lrn WHERE student_id IS NULL;
      ALTER TABLE public.students DROP COLUMN lrn;
    ELSE
      RAISE EXCEPTION 'students.student_id is required';
    END IF;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'students'
      AND column_name = 'lrn'
  ) THEN
    UPDATE public.students
    SET student_id = COALESCE(NULLIF(student_id, ''), lrn)
    WHERE student_id IS NULL OR student_id = '';
    ALTER TABLE public.students DROP COLUMN lrn;
  END IF;
END $$;

UPDATE public.students
SET student_id = NULLIF(student_id, '')
WHERE student_id IS NULL
   OR student_id = '';

CREATE UNIQUE INDEX IF NOT EXISTS students_student_id_unique
  ON public.students (student_id)
  WHERE student_id IS NOT NULL AND student_id <> '';

ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "App users can insert students" ON public.students;
CREATE POLICY "App users can insert students"
  ON public.students
  FOR INSERT
  TO anon
  WITH CHECK (true);

DROP POLICY IF EXISTS "App users can update students" ON public.students;
CREATE POLICY "App users can update students"
  ON public.students
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "App users can delete students" ON public.students;
CREATE POLICY "App users can delete students"
  ON public.students
  FOR DELETE
  TO anon
  USING (true);

DROP POLICY IF EXISTS "App users can read students" ON public.students;
CREATE POLICY "App users can read students"
  ON public.students
  FOR SELECT
  TO anon
  USING (true);
