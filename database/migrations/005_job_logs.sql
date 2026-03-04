-- 005_job_logs.sql
-- Job/Site Log table for time tracking

CREATE TABLE IF NOT EXISTS job_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  description VARCHAR(500) NOT NULL,
  site_address VARCHAR(500),
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  start_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_time TIMESTAMPTZ,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_job_logs_user_id ON job_logs(user_id);
CREATE INDEX idx_job_logs_customer_id ON job_logs(customer_id);
CREATE INDEX idx_job_logs_status ON job_logs(user_id, status);
CREATE INDEX idx_job_logs_start_time ON job_logs(user_id, start_time DESC);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_job_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_job_logs_updated_at
  BEFORE UPDATE ON job_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_job_logs_updated_at();
