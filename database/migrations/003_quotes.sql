-- Migration 003: Quotes / Estimates
-- Mirrors invoices table with quote-specific fields

CREATE TABLE IF NOT EXISTS quotes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    quote_number TEXT NOT NULL,
    client_name TEXT NOT NULL,
    client_email TEXT,
    client_phone TEXT,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    job_description TEXT,
    line_items JSONB NOT NULL DEFAULT '[]',
    subtotal INTEGER NOT NULL DEFAULT 0,
    gst_amount INTEGER NOT NULL DEFAULT 0,
    total INTEGER NOT NULL DEFAULT 0,
    include_gst BOOLEAN DEFAULT TRUE,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'declined', 'expired', 'converted')),
    valid_until DATE,
    converted_invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
    -- Bank details snapshot
    bank_account_name TEXT,
    bank_account_number TEXT,
    intl_bank_account_name VARCHAR(255),
    intl_iban VARCHAR(50),
    intl_swift_bic VARCHAR(20),
    intl_bank_name VARCHAR(255),
    intl_bank_address TEXT,
    -- Company snapshot
    company_name VARCHAR(255),
    company_address TEXT,
    ird_number VARCHAR(20),
    gst_number VARCHAR(20),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_quotes_user_id ON quotes(user_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);
CREATE INDEX IF NOT EXISTS idx_quotes_customer_id ON quotes(customer_id);
CREATE INDEX IF NOT EXISTS idx_quotes_converted_invoice_id ON quotes(converted_invoice_id);

-- Updated_at trigger
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'update_quotes_updated_at'
    ) THEN
        CREATE TRIGGER update_quotes_updated_at
            BEFORE UPDATE ON quotes
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at();
    END IF;
END $$;
