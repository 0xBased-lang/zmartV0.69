-- ============================================================
-- Performance Optimization Indexes
-- ============================================================
-- Purpose: Add indexes for common query patterns to improve API response times
-- Target: Reduce GET /api/markets from 2.9s to <1s

-- Markets table indexes
CREATE INDEX IF NOT EXISTS idx_markets_created_at ON markets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_markets_state ON markets(state);
CREATE INDEX IF NOT EXISTS idx_markets_category ON markets(category);
CREATE INDEX IF NOT EXISTS idx_markets_state_created_at ON markets(state, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_markets_category_created_at ON markets(category, created_at DESC);

-- Trades table indexes (for GET /api/markets/:id/trades)
CREATE INDEX IF NOT EXISTS idx_trades_market_id ON trades(market_id);
CREATE INDEX IF NOT EXISTS idx_trades_market_id_created_at ON trades(market_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trades_user_wallet ON trades(user_wallet);

-- Votes table indexes (for GET /api/markets/:id/votes)
CREATE INDEX IF NOT EXISTS idx_proposal_votes_market_id ON proposal_votes(market_id);
CREATE INDEX IF NOT EXISTS idx_proposal_votes_market_id_voted_at ON proposal_votes(market_id, voted_at DESC);
CREATE INDEX IF NOT EXISTS idx_dispute_votes_market_id ON dispute_votes(market_id);
CREATE INDEX IF NOT EXISTS idx_dispute_votes_market_id_voted_at ON dispute_votes(market_id, voted_at DESC);

-- User positions indexes (for user portfolio queries)
CREATE INDEX IF NOT EXISTS idx_user_positions_user_wallet ON user_positions(user_wallet);
CREATE INDEX IF NOT EXISTS idx_user_positions_market_id ON user_positions(market_id);
CREATE INDEX IF NOT EXISTS idx_user_positions_user_market ON user_positions(user_wallet, market_id);

-- Add index on on_chain_address for market lookups
CREATE INDEX IF NOT EXISTS idx_markets_on_chain_address ON markets(on_chain_address);

COMMENT ON INDEX idx_markets_created_at IS 'Performance: Speeds up market list queries sorted by creation date';
COMMENT ON INDEX idx_markets_state IS 'Performance: Speeds up market filtering by state (PROPOSED, ACTIVE, etc.)';
COMMENT ON INDEX idx_markets_category IS 'Performance: Speeds up market filtering by category';
COMMENT ON INDEX idx_markets_state_created_at IS 'Performance: Composite index for filtered + sorted queries';
COMMENT ON INDEX idx_trades_market_id_created_at IS 'Performance: Speeds up trade history queries for specific markets';
COMMENT ON INDEX idx_proposal_votes_market_id_voted_at IS 'Performance: Speeds up vote queries for specific markets';
