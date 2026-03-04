-- Migration: 010_subscriptions.sql
-- Add subscription tier and Stripe billing fields to users table
-- Phase 4.2: Subscription Tiers

-- Subscription tier enum
DO $$ BEGIN
    CREATE TYPE subscription_tier AS ENUM ('free', 'tradie', 'team');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add subscription fields to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_tier subscription_tier NOT NULL DEFAULT 'free';
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255) NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255) NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_started_at TIMESTAMPTZ NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ NULL;

-- Index on Stripe customer ID for webhook lookups
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer_id ON users(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;

-- Index on subscription tier for tier-based queries
CREATE INDEX IF NOT EXISTS idx_users_subscription_tier ON users(subscription_tier);
