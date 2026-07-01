-- ====================================================================
-- IHSG Bot - Multi-Condition Alerts & Trailing Stop Support
-- Migration: 20260701000000_add_multi_condition_alerts
-- Description: Add support for percentage-based and trailing stop alerts
-- ====================================================================

-- ────────────────────────────────────────────────────────────────────
-- Add new columns to alerts table
-- ────────────────────────────────────────────────────────────────────

-- Alert type: STATIC (existing), PERCENTAGE (snapshot), TRAILING_STOP (dynamic)
ALTER TABLE alerts ADD COLUMN alert_type TEXT DEFAULT 'STATIC' 
  CHECK (alert_type IN ('STATIC', 'PERCENTAGE', 'TRAILING_STOP'));

-- Percentage value for percentage-based and trailing stop alerts (1-100)
ALTER TABLE alerts ADD COLUMN percentage NUMERIC;

-- Base price snapshot for percentage alerts (price at creation time)
ALTER TABLE alerts ADD COLUMN base_price NUMERIC;

-- Current day's high price for trailing stop alerts (reset at market open)
ALTER TABLE alerts ADD COLUMN day_high_price NUMERIC;

-- Last update timestamp for day high tracking
ALTER TABLE alerts ADD COLUMN day_high_updated_at TIMESTAMPTZ;

-- ────────────────────────────────────────────────────────────────────
-- Backfill existing records
-- ────────────────────────────────────────────────────────────────────

-- Set all existing alerts to STATIC type (default already applies to new inserts)
UPDATE alerts SET alert_type = 'STATIC' WHERE alert_type IS NULL;

-- ────────────────────────────────────────────────────────────────────
-- Add indexes for performance optimization
-- ────────────────────────────────────────────────────────────────────

-- Index for filtering by alert type
CREATE INDEX idx_alerts_type ON alerts(alert_type);

-- Partial index for active trailing stop alerts (used by worker for day high updates)
CREATE INDEX idx_alerts_trailing_active ON alerts(alert_type, is_active) 
  WHERE alert_type = 'TRAILING_STOP' AND is_active = true;

-- Composite index for worker queries (chat_id + symbol + active status)
CREATE INDEX idx_alerts_active_lookup ON alerts(chat_id, symbol, is_active);

-- ────────────────────────────────────────────────────────────────────
-- Add comments for documentation
-- ────────────────────────────────────────────────────────────────────

COMMENT ON COLUMN alerts.alert_type IS 'Alert type: STATIC (fixed price), PERCENTAGE (snapshot-based %), TRAILING_STOP (dynamic day high tracking)';
COMMENT ON COLUMN alerts.percentage IS 'Percentage value (1-100) for PERCENTAGE and TRAILING_STOP alerts';
COMMENT ON COLUMN alerts.base_price IS 'Snapshot price at creation for PERCENTAGE alerts';
COMMENT ON COLUMN alerts.day_high_price IS 'Current day high for TRAILING_STOP alerts (reset at 09:00 WIB)';
COMMENT ON COLUMN alerts.day_high_updated_at IS 'Last timestamp when day_high_price was updated';
