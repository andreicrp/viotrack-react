-- Preserve student track and course/strand values when importing or editing rosters.
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS track TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS strand TEXT NOT NULL DEFAULT '';
