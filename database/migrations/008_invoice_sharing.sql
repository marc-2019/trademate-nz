-- Migration 008: Invoice Sharing
-- Adds share_token column to invoices for public shareable invoice links

-- Add share_token column
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS share_token TEXT UNIQUE;

-- Create index for fast token lookups
CREATE INDEX IF NOT EXISTS idx_invoices_share_token ON invoices(share_token) WHERE share_token IS NOT NULL;
