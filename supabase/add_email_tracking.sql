-- ═══════════════════════════════════════════════════════════════
-- E.R.I.S.E. Scientific Club - Recruitment Email Tracking Migration
-- Run this in the Supabase SQL Editor (Project: ygougrhejaesbtifacdk)
-- ═══════════════════════════════════════════════════════════════

-- 1. Add email tracking columns to registrations table
ALTER TABLE registrations 
ADD COLUMN IF NOT EXISTS meeting_email_sent boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS meeting_email_sent_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS acceptance_email_sent boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS acceptance_email_sent_at timestamp with time zone;

-- 2. Add documentation comments
COMMENT ON COLUMN registrations.meeting_email_sent IS 'Whether an interview meeting email invitation has been sent to the applicant';
COMMENT ON COLUMN registrations.meeting_email_sent_at IS 'Timestamp when the interview meeting email was sent';
COMMENT ON COLUMN registrations.acceptance_email_sent IS 'Whether a recruitment acceptance email has been sent to the applicant';
COMMENT ON COLUMN registrations.acceptance_email_sent_at IS 'Timestamp when the recruitment acceptance email was sent';

-- 3. Create indexes for quick filtering in admin queries
CREATE INDEX IF NOT EXISTS idx_registrations_meeting_email_sent ON registrations(meeting_email_sent);
CREATE INDEX IF NOT EXISTS idx_registrations_acceptance_email_sent ON registrations(acceptance_email_sent);
