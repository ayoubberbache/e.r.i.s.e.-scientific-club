-- ═══════════════════════════════════════════════════════════════
-- E.R.I.S.E. Scientific Club - Student Educational Number Migration
-- Run this in the Supabase SQL Editor (Project: ygougrhejaesbtifacdk)
-- ═══════════════════════════════════════════════════════════════

-- 1. Add student_id (12-digit Algerian higher education registration number) to registrations table
ALTER TABLE registrations 
ADD COLUMN IF NOT EXISTS student_id text;

-- 2. Add documentation comment
COMMENT ON COLUMN registrations.student_id IS '12-digit university student educational registration number (Matricule Étudiant / رقم التسجيل الجامعي)';

-- 3. Optional index for quick lookup by student ID
CREATE INDEX IF NOT EXISTS idx_registrations_student_id ON registrations(student_id);
