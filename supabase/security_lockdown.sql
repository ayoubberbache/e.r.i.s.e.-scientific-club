-- ═════════════════════════════════════════════════════════════════════════════════
-- E.R.I.S.E. SCIENTIFIC CLUB — DATABASE SECURITY HARDENING & RLS LOCKDOWN
-- Run this script in the Supabase SQL Editor:
-- https://supabase.com/dashboard/project/ygougrhejaesbtifacdk/sql
-- ═════════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. LOCK DOWN REGISTRATIONS (MEMBER RECRUITMENT DATA)
-- Disables public reading, updating, and deleting.
-- External scrapers, scripts, and unauthorized applications (including your
-- friend's application) will receive 403 Forbidden or empty data immediately!
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;

-- Drop insecure open public policies
DROP POLICY IF EXISTS "Allow public read access" ON registrations;
DROP POLICY IF EXISTS "Allow public all access" ON registrations;
DROP POLICY IF EXISTS "Allow public update" ON registrations;
DROP POLICY IF EXISTS "Allow public delete" ON registrations;
DROP POLICY IF EXISTS "Allow public insert" ON registrations;

-- ONLY allow public INSERT so students can still apply through the website form
CREATE POLICY "Allow public insert only" 
  ON registrations 
  FOR INSERT 
  TO anon, authenticated
  WITH CHECK (true);


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. LOCK DOWN EVENT REGISTRATIONS & ATTENDEE DATA
-- Disables public reading of attendees, emails, phones, and team members.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE event_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_registration_members ENABLE ROW LEVEL SECURITY;

-- Drop insecure policies on event_registrations
DROP POLICY IF EXISTS "Allow public read event_registrations" ON event_registrations;
DROP POLICY IF EXISTS "Allow public update event_registrations" ON event_registrations;
DROP POLICY IF EXISTS "Allow public delete event_registrations" ON event_registrations;
DROP POLICY IF EXISTS "Allow public insert event_registrations" ON event_registrations;

-- Allow public INSERT only
CREATE POLICY "Allow public insert event_registrations" 
  ON event_registrations 
  FOR INSERT 
  TO anon, authenticated
  WITH CHECK (true);

-- Drop insecure policies on event_registration_members
DROP POLICY IF EXISTS "Allow public read event_registration_members" ON event_registration_members;
DROP POLICY IF EXISTS "Allow public update event_registration_members" ON event_registration_members;
DROP POLICY IF EXISTS "Allow public delete event_registration_members" ON event_registration_members;
DROP POLICY IF EXISTS "Allow public insert event_registration_members" ON event_registration_members;

-- Allow public INSERT only
CREATE POLICY "Allow public insert event_registration_members" 
  ON event_registration_members 
  FOR INSERT 
  TO anon, authenticated
  WITH CHECK (true);


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. LOCK DOWN ADMIN_USERS TABLE
-- Drop all public read and write access so credentials cannot be queried.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access" ON admin_users;
DROP POLICY IF EXISTS "Allow public all access" ON admin_users;
DROP POLICY IF EXISTS "Allow public insert" ON admin_users;
DROP POLICY IF EXISTS "Allow public update" ON admin_users;
DROP POLICY IF EXISTS "Allow public delete" ON admin_users;

-- Update the admin password in the database to the cryptographic salted SHA-256 hash
-- Salt: daa11b2c9cbb1e1db1182408e90e616d
-- Hash: 516e12592f7d46e624c3668fc146a8b83a97b7df13250b5d95de9640b145071e
UPDATE admin_users 
SET password = '516e12592f7d46e624c3668fc146a8b83a97b7df13250b5d95de9640b145071e'
WHERE username IN ('admin', 'erise_admin');


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. SECURE CONTENT TABLES (LEADERS, EVENTS, ACHIEVEMENTS, STAR MEMBERS)
-- Keep public SELECT so the website functions normally, but revoke ALL public writes!
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE leaders ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

-- Revoke open write access
DROP POLICY IF EXISTS "Allow public all access" ON leaders;
DROP POLICY IF EXISTS "Allow public all access" ON events;
DROP POLICY IF EXISTS "Allow public all access" ON achievements;
DROP POLICY IF EXISTS "Allow public all access" ON site_settings;

-- Ensure public SELECT remains active
DROP POLICY IF EXISTS "Allow public read access" ON leaders;
CREATE POLICY "Allow public read access" ON leaders FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public read access" ON events;
CREATE POLICY "Allow public read access" ON events FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public read access" ON achievements;
CREATE POLICY "Allow public read access" ON achievements FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public read access" ON site_settings;
CREATE POLICY "Allow public read access" ON site_settings FOR SELECT USING (true);

-- Star members table (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'star_members') THEN
    ALTER TABLE star_members ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Allow public all access star_members" ON star_members;
    DROP POLICY IF EXISTS "Allow public read star_members" ON star_members;
    CREATE POLICY "Allow public read star_members" ON star_members FOR SELECT USING (true);
  END IF;
END $$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 5. VISITOR & COUNTRY VISITS TABLE (STRUCTURED TRACKING)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS country_visits (
  country_code text PRIMARY KEY,
  country_name text NOT NULL,
  visit_count bigint NOT NULL DEFAULT 1,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE country_visits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read country_visits" ON country_visits;
CREATE POLICY "Allow public read country_visits" ON country_visits FOR SELECT USING (true);
