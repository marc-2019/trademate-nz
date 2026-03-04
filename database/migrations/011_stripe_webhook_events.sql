-- Migration: 011_stripe_webhook_events.sql
-- Idempotency table for Stripe webhook events
-- Prevents double-processing when Stripe retries an event delivery

CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  event_id    VARCHAR(255) PRIMARY KEY,  -- Stripe event ID (e.g. evt_xxx)
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-expire old records after 30 days (optional cleanup)
-- This table is append-only in practice; just needs uniqueness on event_id.
CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_processed_at
  ON stripe_webhook_events(processed_at);

COMMENT ON TABLE stripe_webhook_events IS
  'Processed Stripe webhook event IDs for idempotency — prevents double-processing on retries';
