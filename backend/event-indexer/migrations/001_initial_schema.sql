-- Initial Database Schema for Zmart Event Indexer
-- Based on: docs/08_DATABASE_SCHEMA.md

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- USERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_address TEXT UNIQUE NOT NULL,
  twitter_handle TEXT,  -- Reserved for V2
  reputation_score INTEGER DEFAULT 0,  -- Reserved for V2
  total_trades INTEGER DEFAULT 0,
  total_volume BIGINT DEFAULT 0,  -- In lamports
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_users_wallet ON users(wallet_address);
CREATE INDEX idx_users_created_at ON users(created_at DESC);

-- ============================================================================
-- MARKETS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS markets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pubkey TEXT UNIQUE NOT NULL,
  creator TEXT NOT NULL REFERENCES users(wallet_address),
  question TEXT NOT NULL,
  description TEXT,
  state TEXT NOT NULL CHECK (state IN ('PROPOSED', 'APPROVED', 'ACTIVE', 'RESOLVING', 'DISPUTED', 'FINALIZED')),

  -- LMSR parameters
  liquidity BIGINT NOT NULL,  -- b parameter (in lamports)
  shares_yes BIGINT DEFAULT 0,
  shares_no BIGINT DEFAULT 0,

  -- Outcome
  outcome TEXT CHECK (outcome IN ('YES', 'NO', 'INVALID', NULL)),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolver TEXT REFERENCES users(wallet_address),

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Timestamps for state transitions
  approved_at TIMESTAMP WITH TIME ZONE,
  activated_at TIMESTAMP WITH TIME ZONE,
  resolving_at TIMESTAMP WITH TIME ZONE,
  finalized_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_markets_pubkey ON markets(pubkey);
CREATE INDEX idx_markets_state ON markets(state);
CREATE INDEX idx_markets_creator ON markets(creator);
CREATE INDEX idx_markets_created_at ON markets(created_at DESC);
CREATE INDEX idx_markets_state_active ON markets(state) WHERE state = 'ACTIVE';

-- ============================================================================
-- POSITIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS positions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_pubkey TEXT NOT NULL REFERENCES users(wallet_address),
  market_pubkey TEXT NOT NULL REFERENCES markets(pubkey),

  -- Holdings
  shares_yes BIGINT DEFAULT 0,
  shares_no BIGINT DEFAULT 0,

  -- P&L tracking
  invested BIGINT DEFAULT 0,  -- Total invested (in lamports)
  claimed BIGINT DEFAULT 0,   -- Total claimed (in lamports)

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(user_pubkey, market_pubkey)
);

CREATE INDEX idx_positions_user ON positions(user_pubkey);
CREATE INDEX idx_positions_market ON positions(market_pubkey);
CREATE INDEX idx_positions_composite ON positions(user_pubkey, market_pubkey);

-- ============================================================================
-- TRADES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS trades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tx_signature TEXT UNIQUE NOT NULL,
  market_pubkey TEXT NOT NULL REFERENCES markets(pubkey),
  trader_pubkey TEXT NOT NULL REFERENCES users(wallet_address),

  -- Trade details
  side TEXT NOT NULL CHECK (side IN ('BUY', 'SELL')),
  outcome TEXT NOT NULL CHECK (outcome IN ('YES', 'NO')),
  shares BIGINT NOT NULL,
  cost BIGINT NOT NULL,  -- In lamports

  -- Prices
  price_before BIGINT,  -- Price before trade (9 decimals)
  price_after BIGINT,   -- Price after trade (9 decimals)

  -- Fees
  fee_protocol BIGINT DEFAULT 0,
  fee_creator BIGINT DEFAULT 0,
  fee_stakers BIGINT DEFAULT 0,

  -- Timestamp
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  slot BIGINT NOT NULL
);

CREATE INDEX idx_trades_market ON trades(market_pubkey);
CREATE INDEX idx_trades_trader ON trades(trader_pubkey);
CREATE INDEX idx_trades_timestamp ON trades(timestamp DESC);
CREATE INDEX idx_trades_tx_signature ON trades(tx_signature);

-- ============================================================================
-- VOTES TABLE (Proposal & Dispute Votes)
-- ============================================================================
CREATE TABLE IF NOT EXISTS votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vote_type TEXT NOT NULL CHECK (vote_type IN ('PROPOSAL', 'DISPUTE')),

  -- For proposal votes
  proposal_id TEXT,

  -- For dispute votes
  market_pubkey TEXT REFERENCES markets(pubkey),

  -- Vote details
  voter TEXT NOT NULL REFERENCES users(wallet_address),
  choice TEXT NOT NULL,  -- 'like'/'dislike' for proposals, 'support'/'reject' for disputes
  weight BIGINT DEFAULT 1,  -- 1 for proposals, position size for disputes

  -- Metadata
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(vote_type, proposal_id, voter),
  UNIQUE(vote_type, market_pubkey, voter)
);

CREATE INDEX idx_votes_proposal ON votes(proposal_id) WHERE vote_type = 'PROPOSAL';
CREATE INDEX idx_votes_dispute ON votes(market_pubkey) WHERE vote_type = 'DISPUTE';
CREATE INDEX idx_votes_voter ON votes(voter);

-- ============================================================================
-- PROPOSALS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS proposals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  proposal_id TEXT UNIQUE NOT NULL,

  -- Market data
  question TEXT NOT NULL,
  description TEXT,
  creator TEXT NOT NULL REFERENCES users(wallet_address),
  liquidity BIGINT NOT NULL,

  -- Voting
  likes INTEGER DEFAULT 0,
  dislikes INTEGER DEFAULT 0,
  total_votes INTEGER DEFAULT 0,

  -- Status
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_proposals_id ON proposals(proposal_id);
CREATE INDEX idx_proposals_status ON proposals(status);
CREATE INDEX idx_proposals_creator ON proposals(creator);

-- ============================================================================
-- RESOLUTIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS resolutions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  market_pubkey TEXT UNIQUE NOT NULL REFERENCES markets(pubkey),
  resolver TEXT NOT NULL REFERENCES users(wallet_address),
  outcome TEXT NOT NULL CHECK (outcome IN ('YES', 'NO', 'INVALID')),

  -- Resolution window
  resolving_at TIMESTAMP WITH TIME ZONE NOT NULL,
  dispute_deadline TIMESTAMP WITH TIME ZONE NOT NULL,  -- 48 hours after resolving_at

  -- Status
  disputed BOOLEAN DEFAULT FALSE,
  finalized BOOLEAN DEFAULT FALSE,
  finalized_at TIMESTAMP WITH TIME ZONE,

  -- Metadata
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_resolutions_market ON resolutions(market_pubkey);
CREATE INDEX idx_resolutions_resolver ON resolutions(resolver);
CREATE INDEX idx_resolutions_disputed ON resolutions(disputed);

-- ============================================================================
-- DISPUTES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS disputes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  market_pubkey TEXT NOT NULL REFERENCES markets(pubkey),
  disputer TEXT NOT NULL REFERENCES users(wallet_address),

  -- Vote tallying
  support_votes INTEGER DEFAULT 0,
  reject_votes INTEGER DEFAULT 0,
  total_votes INTEGER DEFAULT 0,

  -- Resolution
  resolved BOOLEAN DEFAULT FALSE,
  outcome_changed BOOLEAN DEFAULT FALSE,  -- TRUE if dispute succeeded
  new_outcome TEXT CHECK (new_outcome IN ('YES', 'NO', 'INVALID', NULL)),

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_disputes_market ON disputes(market_pubkey);
CREATE INDEX idx_disputes_disputer ON disputes(disputer);
CREATE INDEX idx_disputes_resolved ON disputes(resolved);

-- ============================================================================
-- EVENTS TABLE (Raw Event Log)
-- ============================================================================
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type TEXT NOT NULL,
  tx_signature TEXT NOT NULL,
  slot BIGINT NOT NULL,

  -- Event data (JSONB for flexibility)
  data JSONB NOT NULL,

  -- Processing status
  processed BOOLEAN DEFAULT FALSE,
  error TEXT,

  -- Timestamp
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(tx_signature, event_type)
);

CREATE INDEX idx_events_type ON events(event_type);
CREATE INDEX idx_events_processed ON events(processed);
CREATE INDEX idx_events_timestamp ON events(timestamp DESC);
CREATE INDEX idx_events_tx_signature ON events(tx_signature);

-- ============================================================================
-- ANALYTICS TABLE (Aggregated Metrics)
-- ============================================================================
CREATE TABLE IF NOT EXISTS analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  metric_type TEXT NOT NULL,
  metric_key TEXT NOT NULL,

  -- Aggregated values
  value BIGINT NOT NULL,
  count INTEGER DEFAULT 1,

  -- Time bucket (for time-series data)
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(metric_type, metric_key, timestamp)
);

CREATE INDEX idx_analytics_type ON analytics(metric_type);
CREATE INDEX idx_analytics_key ON analytics(metric_key);
CREATE INDEX idx_analytics_timestamp ON analytics(timestamp DESC);

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_markets_updated_at BEFORE UPDATE ON markets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_positions_updated_at BEFORE UPDATE ON positions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE markets ENABLE ROW LEVEL SECURITY;
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE resolutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics ENABLE ROW LEVEL SECURITY;

-- Public read policies
CREATE POLICY "Markets are viewable by everyone" ON markets FOR SELECT USING (true);
CREATE POLICY "Trades are viewable by everyone" ON trades FOR SELECT USING (true);
CREATE POLICY "Proposals are viewable by everyone" ON proposals FOR SELECT USING (true);
CREATE POLICY "Analytics are viewable by everyone" ON analytics FOR SELECT USING (true);

-- User-scoped read policies
CREATE POLICY "Users can view own positions" ON positions FOR SELECT
  USING (auth.uid()::text = user_pubkey OR true);  -- Allow all for now, tighten in production

CREATE POLICY "Users can view own votes" ON votes FOR SELECT
  USING (auth.uid()::text = voter OR true);  -- Allow all for now

-- Admin-only write policies (service role only)
-- No policies = service role can write, anon cannot

-- ============================================================================
-- GRANTS
-- ============================================================================

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Grant SELECT on all tables to anon (read-only access)
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;

-- Grant ALL on tables to service_role (for indexer)
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

-- Grant sequence usage
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- ============================================================================
-- INITIAL DATA
-- ============================================================================

-- Insert system user for contract-initiated events
INSERT INTO users (wallet_address, created_at)
VALUES ('SYSTEM', NOW())
ON CONFLICT (wallet_address) DO NOTHING;

-- ============================================================================
-- SCHEMA VERSION
-- ============================================================================
CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER PRIMARY KEY,
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO schema_version (version) VALUES (1);
