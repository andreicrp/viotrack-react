-- Keep staff directory fields available for roster imports and exports.
ALTER TABLE public.teachers
  ADD COLUMN IF NOT EXISTS mname TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS specialization TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS gender TEXT NOT NULL DEFAULT '';

ALTER TABLE public.admins
  ADD COLUMN IF NOT EXISTS mname TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS position TEXT NOT NULL DEFAULT 'Discipline Staff',
  ADD COLUMN IF NOT EXISTS contact TEXT NOT NULL DEFAULT '';
