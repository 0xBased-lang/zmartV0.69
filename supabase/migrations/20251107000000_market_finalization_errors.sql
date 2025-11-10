-- ============================================================
-- Market Finalization Errors Table
-- ============================================================
-- Purpose: Track failed automatic finalization attempts by Market Monitor
-- Service: Market Monitor (backend/src/services/market-monitor/)
-- Pattern Prevention: #3 (Reactive Crisis) - Error tracking for manual review

-- Migration: 20251107000000_market_finalization_errors.sql
-- Created: 2025-11-07
-- Description: Add table to log Market Monitor finalization errors for manual review

-- ============================================================
-- Table: market_finalization_errors
-- ============================================================
--
-- Purpose: Store failed finalization attempts from Market Monitor service
--
-- Use Cases:
-- 1. Manual review of markets that failed to finalize automatically
-- 2. Debugging Market Monitor service issues
-- 3. Identifying patterns in finalization failures (RPC errors, etc.)
-- 4. Retrying failed markets manually or via admin dashboard
-- 5. Monitoring Market Monitor service health and reliability
--
-- Workflow:
-- 1. Market Monitor attempts to finalize market (RESOLVING → FINALIZED)
-- 2. If finalization fails (RPC error, transaction timeout, etc.):
--    a. Log error to this table
--    b. Continue processing other markets
--    c. Alert admin if error count exceeds threshold
-- 3. Admin reviews errors in dashboard
-- 4. Admin can:
--    - Retry finalization manually
--    - Investigate on-chain state
--    - Mark error as resolved with notes
-- 5. Event Indexer catches successful finalization (retry or automatic)
-- 6. Admin marks error record as resolved

CREATE TABLE IF NOT EXISTS market_finalization_errors (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Market References (for investigation)
  market_id TEXT NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
  market_on_chain_address TEXT NOT NULL,
  market_identifier TEXT NOT NULL,

  -- Error Details
  error_message TEXT NOT NULL,
  error_stack TEXT,

  -- Context (for debugging)
  resolution_proposed_at TIMESTAMPTZ,
  attempt_count INTEGER DEFAULT 1,

  -- Resolution Tracking
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  resolved_by TEXT, -- Admin user ID or 'auto' for automatic resolution

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Indexes
-- ============================================================

-- Primary access pattern: Get unresolved errors for admin dashboard
CREATE INDEX IF NOT EXISTS idx_finalization_errors_unresolved
  ON market_finalization_errors(created_at DESC)
  WHERE resolved_at IS NULL;

-- Secondary access pattern: Get errors for specific market
CREATE INDEX IF NOT EXISTS idx_finalization_errors_market_id
  ON market_finalization_errors(market_id);

-- Monitoring access pattern: Get recent errors (last 24 hours)
CREATE INDEX IF NOT EXISTS idx_finalization_errors_recent
  ON market_finalization_errors(created_at DESC);

-- Search access pattern: Find errors by market identifier
CREATE INDEX IF NOT EXISTS idx_finalization_errors_market_identifier
  ON market_finalization_errors(market_identifier);

-- ============================================================
-- Row Level Security (RLS) Policies
-- ============================================================

-- Enable RLS
ALTER TABLE market_finalization_errors ENABLE ROW LEVEL SECURITY;

-- Policy: Public read access (for admin dashboard)
-- Anyone can read error records (no sensitive data)
CREATE POLICY "Allow public read access to finalization errors"
  ON market_finalization_errors
  FOR SELECT
  USING (true);

-- Policy: Service role insert (for Market Monitor service)
-- Only service role can insert error records
CREATE POLICY "Allow service role to insert finalization errors"
  ON market_finalization_errors
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Policy: Service role update (for admin dashboard or Market Monitor)
-- Only service role can update error records (mark as resolved)
CREATE POLICY "Allow service role to update finalization errors"
  ON market_finalization_errors
  FOR UPDATE
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Policy: Service role delete (for cleanup)
-- Only service role can delete error records (after 90 days)
CREATE POLICY "Allow service role to delete finalization errors"
  ON market_finalization_errors
  FOR DELETE
  USING (auth.role() = 'service_role');

-- ============================================================
-- Trigger: Update updated_at timestamp
-- ============================================================

CREATE OR REPLACE FUNCTION update_market_finalization_errors_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_market_finalization_errors_updated_at
  BEFORE UPDATE ON market_finalization_errors
  FOR EACH ROW
  EXECUTE FUNCTION update_market_finalization_errors_updated_at();

-- ============================================================
-- Comments (for documentation)
-- ============================================================

COMMENT ON TABLE market_finalization_errors IS
  'Tracks failed automatic finalization attempts by Market Monitor service. Used for manual review, debugging, and retry workflows.';

COMMENT ON COLUMN market_finalization_errors.market_id IS
  'TEXT reference to markets table (CASCADE DELETE if market deleted)';

COMMENT ON COLUMN market_finalization_errors.market_on_chain_address IS
  'Base58-encoded on-chain market PDA address for investigation';

COMMENT ON COLUMN market_finalization_errors.market_identifier IS
  'Human-readable market identifier (market_id field from markets table)';

COMMENT ON COLUMN market_finalization_errors.error_message IS
  'Error message from failed finalization attempt (RPC error, timeout, etc.)';

COMMENT ON COLUMN market_finalization_errors.error_stack IS
  'Full error stack trace for debugging (optional)';

COMMENT ON COLUMN market_finalization_errors.resolution_proposed_at IS
  'Timestamp when resolution was proposed (context for dispute window calculation)';

COMMENT ON COLUMN market_finalization_errors.attempt_count IS
  'Number of finalization attempts (incremented on retry)';

COMMENT ON COLUMN market_finalization_errors.resolved_at IS
  'Timestamp when error was resolved (manually or automatically)';

COMMENT ON COLUMN market_finalization_errors.resolution_notes IS
  'Admin notes about how error was resolved';

COMMENT ON COLUMN market_finalization_errors.resolved_by IS
  'Admin user ID who resolved error, or "auto" for automatic resolution';

-- ============================================================
-- Sample Queries (for admin dashboard)
-- ============================================================

-- Get unresolved errors (sorted by oldest first)
-- SELECT
--   id,
--   market_identifier,
--   error_message,
--   created_at,
--   attempt_count
-- FROM market_finalization_errors
-- WHERE resolved_at IS NULL
-- ORDER BY created_at ASC
-- LIMIT 20;

-- Get errors for specific market
-- SELECT *
-- FROM market_finalization_errors
-- WHERE market_id = '123e4567-e89b-12d3-a456-426614174000'
-- ORDER BY created_at DESC;

-- Get error statistics (last 24 hours)
-- SELECT
--   COUNT(*) as total_errors,
--   COUNT(*) FILTER (WHERE resolved_at IS NOT NULL) as resolved_errors,
--   COUNT(*) FILTER (WHERE resolved_at IS NULL) as unresolved_errors,
--   AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))) as avg_resolution_time_seconds
-- FROM market_finalization_errors
-- WHERE created_at >= NOW() - INTERVAL '24 hours';

-- Mark error as resolved (admin action)
-- UPDATE market_finalization_errors
-- SET
--   resolved_at = NOW(),
--   resolution_notes = 'Manually retried finalization - successful',
--   resolved_by = 'admin_user_123'
-- WHERE id = '123e4567-e89b-12d3-a456-426614174000';

-- Clean up old resolved errors (after 90 days)
-- DELETE FROM market_finalization_errors
-- WHERE resolved_at IS NOT NULL
--   AND resolved_at < NOW() - INTERVAL '90 days';
