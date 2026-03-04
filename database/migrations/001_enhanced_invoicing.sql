-- TradeMate NZ - Migration 001: Enhanced Invoicing & Cashflow
-- Adds: business_profiles, customers, products_services, recurring_invoices,
--        recurring_line_items, bank_transactions
-- Alters: invoices (add customer_id, recurring_invoice_id, company/bank fields)
-- Version: 0.3.0
-- Safe to re-run (uses IF NOT EXISTS / IF NOT EXISTS for columns)

-- =============================================================================
-- TABLE 1: BUSINESS PROFILES (one per user)
-- =============================================================================

CREATE TABLE IF NOT EXISTS business_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Company Details
    company_name VARCHAR(255),
    trading_as VARCHAR(255),
    ird_number VARCHAR(20),
    gst_number VARCHAR(20),
    is_gst_registered BOOLEAN DEFAULT FALSE,
    company_address TEXT,
    company_phone VARCHAR(50),
    company_email VARCHAR(255),

    -- NZD Local Bank Details (Wise NZD account)
    bank_account_name VARCHAR(255),
    bank_account_number VARCHAR(50),
    bank_name VARCHAR(100),

    -- International Bank Details (Wise international)
    intl_bank_account_name VARCHAR(255),
    intl_iban VARCHAR(50),
    intl_swift_bic VARCHAR(20),
    intl_bank_name VARCHAR(255),
    intl_bank_address TEXT,
    intl_routing_number VARCHAR(50),

    -- Invoice Defaults
    default_payment_terms INTEGER DEFAULT 20,
    default_notes TEXT,
    invoice_prefix VARCHAR(10) DEFAULT 'INV',

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_business_profiles_user_id ON business_profiles(user_id);

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_business_profiles_updated_at') THEN
        CREATE TRIGGER update_business_profiles_updated_at
            BEFORE UPDATE ON business_profiles
            FOR EACH ROW EXECUTE FUNCTION update_updated_at();
    END IF;
END $$;

-- =============================================================================
-- TABLE 2: CUSTOMERS
-- =============================================================================

CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    notes TEXT,

    -- Billing defaults
    default_payment_terms INTEGER,
    default_include_gst BOOLEAN DEFAULT TRUE,

    is_active BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_customers_user_id ON customers(user_id);
CREATE INDEX IF NOT EXISTS idx_customers_user_active ON customers(user_id, is_active);

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_customers_updated_at') THEN
        CREATE TRIGGER update_customers_updated_at
            BEFORE UPDATE ON customers
            FOR EACH ROW EXECUTE FUNCTION update_updated_at();
    END IF;
END $$;

-- =============================================================================
-- TABLE 3: PRODUCTS & SERVICES
-- =============================================================================

CREATE TABLE IF NOT EXISTS products_services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    name VARCHAR(255) NOT NULL,
    description TEXT,
    unit_price INTEGER NOT NULL DEFAULT 0,
    type VARCHAR(10) NOT NULL DEFAULT 'fixed' CHECK (type IN ('fixed', 'variable')),
    is_gst_applicable BOOLEAN DEFAULT TRUE,

    is_active BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_products_services_user_id ON products_services(user_id);
CREATE INDEX IF NOT EXISTS idx_products_services_user_active ON products_services(user_id, is_active);

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_products_services_updated_at') THEN
        CREATE TRIGGER update_products_services_updated_at
            BEFORE UPDATE ON products_services
            FOR EACH ROW EXECUTE FUNCTION update_updated_at();
    END IF;
END $$;

-- =============================================================================
-- TABLE 4: RECURRING INVOICES
-- =============================================================================

CREATE TABLE IF NOT EXISTS recurring_invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,

    name VARCHAR(255) NOT NULL,
    recurrence VARCHAR(20) NOT NULL DEFAULT 'monthly' CHECK (recurrence IN ('monthly')),
    day_of_month INTEGER NOT NULL DEFAULT 1 CHECK (day_of_month BETWEEN 1 AND 28),

    -- Cached: true if ALL line items are type='fixed'
    is_auto_generate BOOLEAN DEFAULT FALSE,

    include_gst BOOLEAN DEFAULT TRUE,
    payment_terms INTEGER DEFAULT 20,
    notes TEXT,

    is_active BOOLEAN DEFAULT TRUE,
    last_generated_at TIMESTAMP WITH TIME ZONE,
    next_generation_date DATE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_recurring_invoices_user_id ON recurring_invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_recurring_invoices_next_gen ON recurring_invoices(next_generation_date, is_active);

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_recurring_invoices_updated_at') THEN
        CREATE TRIGGER update_recurring_invoices_updated_at
            BEFORE UPDATE ON recurring_invoices
            FOR EACH ROW EXECUTE FUNCTION update_updated_at();
    END IF;
END $$;

-- =============================================================================
-- TABLE 5: RECURRING LINE ITEMS
-- =============================================================================

CREATE TABLE IF NOT EXISTS recurring_line_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recurring_invoice_id UUID NOT NULL REFERENCES recurring_invoices(id) ON DELETE CASCADE,
    product_service_id UUID NOT NULL REFERENCES products_services(id) ON DELETE RESTRICT,

    description VARCHAR(255),
    unit_price INTEGER NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    type VARCHAR(10) NOT NULL DEFAULT 'fixed' CHECK (type IN ('fixed', 'variable')),

    sort_order INTEGER DEFAULT 0,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_recurring_line_items_recurring ON recurring_line_items(recurring_invoice_id);

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_recurring_line_items_updated_at') THEN
        CREATE TRIGGER update_recurring_line_items_updated_at
            BEFORE UPDATE ON recurring_line_items
            FOR EACH ROW EXECUTE FUNCTION update_updated_at();
    END IF;
END $$;

-- =============================================================================
-- TABLE 6: BANK TRANSACTIONS
-- =============================================================================

CREATE TABLE IF NOT EXISTS bank_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Transaction data from Wise CSV
    transaction_id VARCHAR(100),
    date DATE NOT NULL,
    amount INTEGER NOT NULL,
    currency VARCHAR(3) DEFAULT 'NZD',
    description TEXT,
    payment_reference VARCHAR(255),
    running_balance INTEGER,

    -- Reconciliation
    matched_invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
    match_confidence VARCHAR(20) DEFAULT 'none' CHECK (match_confidence IN ('none', 'low', 'medium', 'high', 'confirmed')),
    is_reconciled BOOLEAN DEFAULT FALSE,
    reconciled_at TIMESTAMP WITH TIME ZONE,

    -- Upload tracking
    upload_batch_id UUID,
    source_filename VARCHAR(255),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_bank_transactions_user_id ON bank_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_date ON bank_transactions(user_id, date);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_reconciled ON bank_transactions(user_id, is_reconciled);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_batch ON bank_transactions(upload_batch_id);

-- Deduplication: prevent importing same Wise transaction twice
CREATE UNIQUE INDEX IF NOT EXISTS idx_bank_transactions_unique
    ON bank_transactions(user_id, transaction_id) WHERE transaction_id IS NOT NULL;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_bank_transactions_updated_at') THEN
        CREATE TRIGGER update_bank_transactions_updated_at
            BEFORE UPDATE ON bank_transactions
            FOR EACH ROW EXECUTE FUNCTION update_updated_at();
    END IF;
END $$;

-- =============================================================================
-- ALTER EXISTING INVOICES TABLE
-- =============================================================================

-- Link to customers
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id) ON DELETE SET NULL;

-- Link to recurring invoice origin
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS recurring_invoice_id UUID REFERENCES recurring_invoices(id) ON DELETE SET NULL;

-- GST toggle per invoice
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS include_gst BOOLEAN DEFAULT TRUE;

-- International bank details on invoice
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS intl_bank_account_name VARCHAR(255);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS intl_iban VARCHAR(50);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS intl_swift_bic VARCHAR(20);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS intl_bank_name VARCHAR(255);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS intl_bank_address TEXT;

-- Company details snapshot on invoice (frozen at creation time)
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS company_name VARCHAR(255);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS company_address TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS ird_number VARCHAR(20);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS gst_number VARCHAR(20);

CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_recurring_id ON invoices(recurring_invoice_id);

-- =============================================================================
-- COMPLETION
-- =============================================================================

DO $$ BEGIN RAISE NOTICE 'Migration 001_enhanced_invoicing completed successfully'; END $$;
