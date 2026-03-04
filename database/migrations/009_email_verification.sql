-- 009_email_verification.sql
-- Phase 4.1: Email verification and onboarding support

-- Add verification and onboarding columns to users
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS verification_code VARCHAR(6),
  ADD COLUMN IF NOT EXISTS verification_code_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;

-- Index for looking up verification codes
CREATE INDEX IF NOT EXISTS idx_users_verification_code ON users(verification_code)
  WHERE verification_code IS NOT NULL;
