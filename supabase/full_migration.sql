-- ═══════════════════════════════════════════════════════════════
-- E.R.I.S.E. Database Update — Events, Achievements, Registrations
-- Run this in the Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- ──── 1. EVENTS TABLE: Add missing columns ────
ALTER TABLE events ADD COLUMN IF NOT EXISTS start_date date;
ALTER TABLE events ADD COLUMN IF NOT EXISTS end_date date;
ALTER TABLE events ADD COLUMN IF NOT EXISTS time text;
ALTER TABLE events ADD COLUMN IF NOT EXISTS location text;
ALTER TABLE events ADD COLUMN IF NOT EXISTS status text DEFAULT 'UPCOMING';
ALTER TABLE events ADD COLUMN IF NOT EXISTS images text[] DEFAULT '{}';
ALTER TABLE events ADD COLUMN IF NOT EXISTS no_registration boolean DEFAULT false;

-- Backfill: parse exact single dates (YYYY-MM-DD)
UPDATE events
SET start_date = SUBSTRING(date FROM 1 FOR 10)::date
WHERE start_date IS NULL
  AND date IS NOT NULL
  AND date ~ '^\d{4}-\d{2}-\d{2}$';

-- Backfill: parse date ranges like "2026-02-14 – 2026-02-16"
UPDATE events
SET start_date = SUBSTRING(date FROM 1 FOR 10)::date,
    end_date = SUBSTRING(date FROM '\d{4}-\d{2}-\d{2}$')::date
WHERE start_date IS NULL
  AND date IS NOT NULL
  AND date ~ '^\d{4}-\d{2}-\d{2}\s*[–-]\s*\d{4}-\d{2}-\d{2}$';

-- ──── 2. ACHIEVEMENTS TABLE: Add missing columns ────
ALTER TABLE achievements ADD COLUMN IF NOT EXISTS year text;
ALTER TABLE achievements ADD COLUMN IF NOT EXISTS category text DEFAULT 'ACHIEVEMENT';
ALTER TABLE achievements ADD COLUMN IF NOT EXISTS date date;
ALTER TABLE achievements ADD COLUMN IF NOT EXISTS images text[] DEFAULT '{}';

-- ──── 3. REGISTRATIONS TABLE: Add status column ────
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending';
