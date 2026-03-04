-- TradeMate NZ - Migration 002: Photo Attachments
-- Adds: photos table for universal photo attachments
-- Supports: SWMS, invoices, expenses, job logs
-- Version: 0.4.0
-- Safe to re-run (uses IF NOT EXISTS)

-- =============================================================================
-- TABLE: PHOTOS (universal photo attachments)
-- =============================================================================

CREATE TABLE IF NOT EXISTS photos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Entity link (polymorphic)
    entity_type VARCHAR(20) NOT NULL CHECK (entity_type IN ('swms', 'invoice', 'expense', 'job_log')),
    entity_id UUID NOT NULL,

    -- File details
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255),
    mime_type VARCHAR(50) DEFAULT 'image/jpeg',
    file_size INTEGER,
    path VARCHAR(500) NOT NULL,

    -- Metadata
    caption TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for listing photos by entity
CREATE INDEX IF NOT EXISTS idx_photos_entity ON photos(entity_type, entity_id);

-- Index for listing photos by user
CREATE INDEX IF NOT EXISTS idx_photos_user_id ON photos(user_id);
