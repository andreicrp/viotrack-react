-- Run once in the Supabase SQL editor.
-- Extends the existing activity_logs table without deleting existing history.

BEGIN;

DO $$
BEGIN
  IF to_regclass('public.activity_logs') IS NULL THEN
    RAISE EXCEPTION 'The public.activity_logs table does not exist.';
  END IF;
END $$;

ALTER TABLE public.activity_logs
  ADD COLUMN IF NOT EXISTS audit_id TEXT,
  ADD COLUMN IF NOT EXISTS device_info TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS activity_logs_audit_id_unique
  ON public.activity_logs (audit_id)
  WHERE audit_id IS NOT NULL;

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "App users can read activity logs" ON public.activity_logs;
CREATE POLICY "App users can read activity logs"
  ON public.activity_logs FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "App users can insert activity logs" ON public.activity_logs;
CREATE POLICY "App users can insert activity logs"
  ON public.activity_logs FOR INSERT TO anon WITH CHECK (true);

COMMIT;
