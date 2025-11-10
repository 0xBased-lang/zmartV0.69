-- ============================================================
-- ZMART V0.69 - Missing Tables Migration
-- ============================================================
-- Purpose: Add tables referenced in event-indexer code but missing from initial schema
-- Tables: events, resolutions, disputes, proposals, schema_version
-- Version: v0.69
-- Created: November 8, 2025
-- ============================================================

-- ============================================================
-- SCHEMA VERSION TABLE (for connection testing)
-- ============================================================
CREATE TABLE IF NOT EXISTS schema_version (
  version TEXT PRIMARY KEY,
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  description TEXT
);

-- Insert current version
INSERT INTO schema_version (version, description) VALUES
  ('v0.69.0', 'Initial schema with event indexer support')
ON CONFLICT (version) DO NOTHING;

-- ============================================================
-- EVENTS TABLE (Audit Log)
-- ============================================================
-- Purpose: Store all raw events from Solana for audit trail and idempotency
CREATE TABLE events (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Event classification
  event_type TEXT NOT NULL CHECK (event_type IN (
    'MarketCreated',
    'TradeExecuted',
    'MarketStateChanged',
    'MarketResolved',
    'DisputeRaised',
    'DisputeResolved',
    'VoteSubmitted',
    'ProposalApproved',
    'WinningsClaimed'
  )),

  -- Blockchain data
  tx_signature TEXT NOT NULL,
  slot BIGINT NOT NULL,

  -- Event payload (full JSON)
  data JSONB NOT NULL,

  -- Processing status
  processed BOOLEAN DEFAULT FALSE,
  error TEXT,

  -- Timestamps
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL, -- From blockchain
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), -- When indexed

  -- Constraints: One event type per transaction signature
  UNIQUE (tx_signature, event_type)
);

-- Indexes for events
CREATE INDEX events_processed_idx ON events(processed, created_at DESC);
CREATE INDEX events_signature_idx ON events(tx_signature);
CREATE INDEX events_type_idx ON events(event_type, created_at DESC);
CREATE INDEX events_unprocessed_idx ON events(created_at ASC) WHERE processed = FALSE;

-- RLS for events (backend only)
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only backend can read events"
  ON events FOR SELECT
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Only backend can insert events"
  ON events FOR INSERT
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Only backend can update events"
  ON events FOR UPDATE
  USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================
-- RESOLUTIONS TABLE
-- ============================================================
-- Purpose: Track market resolution state and dispute deadlines
CREATE TABLE resolutions (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Market reference (one resolution per market)
  market_pubkey TEXT NOT NULL UNIQUE,

  -- Resolution data
  resolver TEXT NOT NULL,
  outcome TEXT NOT NULL CHECK (outcome IN ('YES', 'NO', 'INVALID')),

  -- Timing
  resolving_at TIMESTAMP WITH TIME ZONE NOT NULL,
  dispute_deadline TIMESTAMP WITH TIME ZONE NOT NULL,

  -- Status
  disputed BOOLEAN DEFAULT FALSE,
  finalized BOOLEAN DEFAULT FALSE,
  finalized_at TIMESTAMP WITH TIME ZONE,

  -- Metadata
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Foreign keys (add after markets table is updated)
  CONSTRAINT fk_resolution_market
    FOREIGN KEY (market_pubkey)
    REFERENCES markets(on_chain_address)
    ON DELETE CASCADE,

  CONSTRAINT fk_resolution_resolver
    FOREIGN KEY (resolver)
    REFERENCES users(wallet)
    ON DELETE RESTRICT
);

-- Indexes for resolutions
CREATE INDEX resolutions_market_idx ON resolutions(market_pubkey);
CREATE INDEX resolutions_disputed_idx ON resolutions(disputed, finalized);
CREATE INDEX resolutions_deadline_idx ON resolutions(dispute_deadline) WHERE NOT finalized;

-- RLS for resolutions
ALTER TABLE resolutions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read resolutions"
  ON resolutions FOR SELECT
  USING (TRUE);

CREATE POLICY "Only backend can insert resolutions"
  ON resolutions FOR INSERT
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Only backend can update resolutions"
  ON resolutions FOR UPDATE
  USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================
-- DISPUTES TABLE
-- ============================================================
-- Purpose: Track dispute records and voting outcomes
CREATE TABLE disputes (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- References
  market_pubkey TEXT NOT NULL,
  disputer TEXT NOT NULL,

  -- Dispute status
  resolved BOOLEAN DEFAULT FALSE,

  -- Outcome data
  outcome_changed BOOLEAN,
  new_outcome TEXT CHECK (new_outcome IN ('YES', 'NO', 'INVALID')),

  -- Vote counts
  support_votes INTEGER,
  reject_votes INTEGER,
  total_votes INTEGER,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  resolved_at TIMESTAMP WITH TIME ZONE,

  -- Foreign keys
  CONSTRAINT fk_dispute_market
    FOREIGN KEY (market_pubkey)
    REFERENCES markets(on_chain_address)
    ON DELETE CASCADE,

  CONSTRAINT fk_dispute_disputer
    FOREIGN KEY (disputer)
    REFERENCES users(wallet)
    ON DELETE RESTRICT
);

-- Indexes for disputes
CREATE INDEX disputes_market_idx ON disputes(market_pubkey, created_at DESC);
CREATE INDEX disputes_disputer_idx ON disputes(disputer, created_at DESC);
CREATE INDEX disputes_resolved_idx ON disputes(resolved);

-- RLS for disputes
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read disputes"
  ON disputes FOR SELECT
  USING (TRUE);

CREATE POLICY "Only backend can insert disputes"
  ON disputes FOR INSERT
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Only backend can update disputes"
  ON disputes FOR UPDATE
  USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================
-- PROPOSALS TABLE (for ProposalManager voting)
-- ============================================================
-- Purpose: Track proposal voting state before on-chain approval
CREATE TABLE proposals (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Proposal identifier (from ProposalManager)
  proposal_id TEXT NOT NULL UNIQUE,

  -- Status
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),

  -- Vote counts
  likes INTEGER DEFAULT 0,
  dislikes INTEGER DEFAULT 0,
  total_votes INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE,

  -- Constraints
  CONSTRAINT valid_vote_counts CHECK (total_votes = likes + dislikes)
);

-- Indexes for proposals
CREATE INDEX proposals_status_idx ON proposals(status, created_at DESC);
CREATE INDEX proposals_proposal_id_idx ON proposals(proposal_id);

-- RLS for proposals
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read proposals"
  ON proposals FOR SELECT
  USING (TRUE);

CREATE POLICY "Only backend can insert proposals"
  ON proposals FOR INSERT
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Only backend can update proposals"
  ON proposals FOR UPDATE
  USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================
-- UPDATE TRADES TABLE (add missing columns)
-- ============================================================
-- Note: trades table exists in initial migration but needs additional columns

-- Add trader_pubkey column (separate from tx_signature for clarity)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trades' AND column_name = 'trader_pubkey'
  ) THEN
    ALTER TABLE trades ADD COLUMN trader_pubkey TEXT NOT NULL DEFAULT '';
    ALTER TABLE trades ADD CONSTRAINT fk_trades_trader
      FOREIGN KEY (trader_pubkey) REFERENCES users(wallet) ON DELETE RESTRICT;
  END IF;
END $$;

-- Add market_pubkey column (for easier queries)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trades' AND column_name = 'market_pubkey'
  ) THEN
    ALTER TABLE trades ADD COLUMN market_pubkey TEXT NOT NULL DEFAULT '';
    ALTER TABLE trades ADD CONSTRAINT fk_trades_market
      FOREIGN KEY (market_pubkey) REFERENCES markets(on_chain_address) ON DELETE CASCADE;
  END IF;
END $$;

-- Add composite index for market trades lookup
CREATE INDEX IF NOT EXISTS trades_market_pubkey_time_idx
  ON trades(market_pubkey, block_time DESC);

-- ============================================================
-- UPDATE POSITIONS TABLE (add missing columns)
-- ============================================================
-- Note: positions table exists but may need additional columns

-- Add user_pubkey column (separate from user_wallet for on-chain compatibility)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'positions' AND column_name = 'user_pubkey'
  ) THEN
    ALTER TABLE positions ADD COLUMN user_pubkey TEXT;
    -- Copy from user_wallet if exists
    UPDATE positions SET user_pubkey = user_wallet WHERE user_pubkey IS NULL;
    ALTER TABLE positions ALTER COLUMN user_pubkey SET NOT NULL;
    ALTER TABLE positions ADD CONSTRAINT fk_positions_user
      FOREIGN KEY (user_pubkey) REFERENCES users(wallet) ON DELETE CASCADE;
  END IF;
END $$;

-- Add market_pubkey column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'positions' AND column_name = 'market_pubkey'
  ) THEN
    ALTER TABLE positions ADD COLUMN market_pubkey TEXT;
    -- Copy from market_id via markets table join
    UPDATE positions p
    SET market_pubkey = m.on_chain_address
    FROM markets m
    WHERE p.market_id = m.id AND p.market_pubkey IS NULL;
    ALTER TABLE positions ALTER COLUMN market_pubkey SET NOT NULL;
    ALTER TABLE positions ADD CONSTRAINT fk_positions_market
      FOREIGN KEY (market_pubkey) REFERENCES markets(on_chain_address) ON DELETE CASCADE;
  END IF;
END $$;

-- Add invested column (total cost basis)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'positions' AND column_name = 'invested'
  ) THEN
    ALTER TABLE positions ADD COLUMN invested BIGINT DEFAULT 0;
    -- Initialize from total_invested if exists
    UPDATE positions SET invested = total_invested WHERE invested = 0 AND total_invested IS NOT NULL;
  END IF;
END $$;

-- Add composite index for user positions lookup
CREATE INDEX IF NOT EXISTS positions_user_pubkey_market_idx
  ON positions(user_pubkey, market_pubkey);

-- ============================================================
-- UPDATE USERS TABLE (add trading stats columns)
-- ============================================================
-- Add total_trades column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'total_trades'
  ) THEN
    ALTER TABLE users ADD COLUMN total_trades INTEGER DEFAULT 0;
  END IF;
END $$;

-- Add total_volume column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'total_volume'
  ) THEN
    ALTER TABLE users ADD COLUMN total_volume BIGINT DEFAULT 0;
  END IF;
END $$;

-- Add wallet_address alias (for backward compatibility)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'wallet_address'
  ) THEN
    -- Create computed column that mirrors wallet
    ALTER TABLE users ADD COLUMN wallet_address TEXT GENERATED ALWAYS AS (wallet) STORED;
  END IF;
END $$;

-- ============================================================
-- VERIFICATION QUERIES (for testing)
-- ============================================================

-- Count all tables
DO $$
DECLARE
  table_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE';

  RAISE NOTICE 'Total tables created: %', table_count;
END $$;

-- List all tables
DO $$
DECLARE
  table_name TEXT;
BEGIN
  RAISE NOTICE 'Tables in database:';
  FOR table_name IN
    SELECT t.table_name
    FROM information_schema.tables t
    WHERE t.table_schema = 'public'
      AND t.table_type = 'BASE TABLE'
    ORDER BY t.table_name
  LOOP
    RAISE NOTICE '  - %', table_name;
  END LOOP;
END $$;

-- ============================================================
-- MIGRATION COMPLETE
-- ============================================================
-- Expected tables: 12
--   1. users
--   2. markets
--   3. positions
--   4. proposal_votes
--   5. dispute_votes
--   6. discussions
--   7. ipfs_anchors
--   8. trades
--   9. events (NEW)
--  10. resolutions (NEW)
--  11. disputes (NEW)
--  12. proposals (NEW)
--  13. schema_version (NEW)
-- ============================================================
