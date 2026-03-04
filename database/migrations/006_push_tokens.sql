-- Migration 006: Push Tokens for Notifications
-- Adds push_token column to users table for Expo Push Notifications

ALTER TABLE users ADD COLUMN IF NOT EXISTS push_token TEXT;

-- Index for efficient push token lookups (only non-null tokens)
CREATE INDEX IF NOT EXISTS idx_users_push_token ON users(push_token) WHERE push_token IS NOT NULL;

-- Add notification tracking to certifications
-- (reminder_sent already exists from init.sql, add last_reminder_at for tracking)
ALTER TABLE certifications ADD COLUMN IF NOT EXISTS last_reminder_at TIMESTAMP WITH TIME ZONE;
