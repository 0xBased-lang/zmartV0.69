# 08 - Database Schema: Supabase/PostgreSQL Implementation

**Status**: Implementation-Ready
**Version**: v0.69 (Option B - Minimal Social Features)
**Last Updated**: 2025-11-05
**Prerequisites**: `07_ON_CHAIN_OFF_CHAIN_INTEGRATION.md`, `CLAUDE.md` (Option B)

---

## Table of Contents

1. [Schema Overview](#schema-overview)
2. [Core Tables](#core-tables)
3. [Voting Tables](#voting-tables)
4. [Discussion Tables (Option B)](#discussion-tables-option-b)
5. [Trading Tables](#trading-tables)
6. [Indexes](#indexes)
7. [Row-Level Security](#row-level-security)
8. [Migrations](#migrations)
9. [Backup Strategy](#backup-strategy)

---

## Schema Overview

### Database Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                       Supabase PostgreSQL                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Core Data (Essential)                                          │
│  ├─ users (wallet-only)                                         │
│  ├─ markets (metadata + cached on-chain state)                 │
│  └─ positions (off-chain cache)                                │
│                                                                 │
│  Voting (ProposalManager)                                       │
│  ├─ proposal_votes (aggregated → on-chain)                     │
│  └─ dispute_votes (aggregated → on-chain)                      │
│                                                                 │
│  Discussions (Option B)                                         │
│  ├─ discussions (flat comments, Supabase storage)              │
│  └─ ipfs_anchors (daily snapshot CIDs)                         │
│                                                                 │
│  Trading History (Indexed from events)                          │
│  └─ trades (buy/sell transactions)                             │
│                                                                 │
│  Reserved for v2                                                │
│  └─ (twitter integrations, reputation, moderation)             │
└─────────────────────────────────────────────────────────────────┘
```

### Design Principles

1. **Wallet-Only Auth (v1)**: No email, no passwords, just Solana wallet signatures
2. **Reserved Columns**: Prepared for v2 features (Twitter, reputation)
3. **RLS Enabled**: Supabase Row-Level Security for data protection
4. **Soft Deletes**: Preserve data for auditing, use `deleted_at` timestamps
5. **Event Sourcing**: Trades derived from Solana events, not direct inserts

---

## Core Tables

### users

**Purpose**: Basic user profiles (wallet-only for v1)

```sql
CREATE TABLE users (
  -- Primary identity
  wallet TEXT PRIMARY KEY,

  -- v1: Basic tracking
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Reserved for v2 (social features)
  twitter_handle TEXT,
  twitter_verified BOOLEAN DEFAULT FALSE,
  reputation_score INTEGER,
  avatar_url TEXT,
  bio TEXT,

  -- Metadata
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX users_created_at_idx ON users(created_at DESC);
CREATE INDEX users_reputation_idx ON users(reputation_score DESC) WHERE reputation_score IS NOT NULL;

-- Trigger: Update updated_at
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON users FOR SELECT
  USING (wallet = auth.jwt() ->> 'sub');

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (wallet = auth.jwt() ->> 'sub');
```

### markets

**Purpose**: Market metadata + cached on-chain state for fast queries

```sql
CREATE TABLE markets (
  -- Identity
  id TEXT PRIMARY KEY, -- UUID from on-chain market_id
  on_chain_address TEXT UNIQUE NOT NULL, -- Solana PDA address

  -- Market question & metadata
  question TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL, -- 'politics', 'sports', 'crypto', etc.
  tags TEXT[], -- Array of tags for search

  -- Creator & resolution
  creator_wallet TEXT NOT NULL REFERENCES users(wallet),
  resolver_wallet TEXT REFERENCES users(wallet),

  -- State (cached from on-chain)
  state TEXT NOT NULL DEFAULT 'PROPOSED', -- PROPOSED|APPROVED|ACTIVE|RESOLVING|DISPUTED|FINALIZED

  -- LMSR parameters (cached from on-chain)
  b_parameter BIGINT NOT NULL,
  initial_liquidity BIGINT NOT NULL,
  current_liquidity BIGINT,

  -- Share quantities (cached from on-chain)
  shares_yes BIGINT DEFAULT 0,
  shares_no BIGINT DEFAULT 0,

  -- Derived metrics (computed from shares)
  current_price_yes NUMERIC(18, 9), -- YES price (0.0 to 1.0)
  current_price_no NUMERIC(18, 9),  -- NO price (complement)
  total_volume BIGINT DEFAULT 0,    -- Total trading volume in lamports

  -- Resolution data
  proposed_outcome BOOLEAN, -- true=YES, false=NO, null=INVALID or not resolved
  final_outcome BOOLEAN,
  ipfs_evidence_hash TEXT, -- IPFS CID for evidence

  -- Voting counts (cached from on-chain)
  proposal_likes INTEGER DEFAULT 0,
  proposal_dislikes INTEGER DEFAULT 0,
  dispute_agree INTEGER DEFAULT 0,
  dispute_disagree INTEGER DEFAULT 0,

  -- Timestamps (synced from on-chain)
  created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  approved_at TIMESTAMP WITH TIME ZONE,
  activated_at TIMESTAMP WITH TIME ZONE,
  resolution_proposed_at TIMESTAMP WITH TIME ZONE,
  finalized_at TIMESTAMP WITH TIME ZONE,

  -- Off-chain only
  is_cancelled BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_state CHECK (state IN ('PROPOSED', 'APPROVED', 'ACTIVE', 'RESOLVING', 'DISPUTED', 'FINALIZED')),
  CONSTRAINT valid_category CHECK (category IN ('politics', 'sports', 'crypto', 'science', 'entertainment', 'other')),
  CONSTRAINT question_length CHECK (char_length(question) >= 10 AND char_length(question) <= 200),
  CONSTRAINT description_length CHECK (char_length(description) <= 2000)
);

-- Indexes
CREATE INDEX markets_state_idx ON markets(state) WHERE NOT is_cancelled;
CREATE INDEX markets_category_idx ON markets(category);
CREATE INDEX markets_creator_idx ON markets(creator_wallet);
CREATE INDEX markets_created_at_idx ON markets(created_at DESC);
CREATE INDEX markets_volume_idx ON markets(total_volume DESC);
CREATE INDEX markets_search_idx ON markets USING gin(to_tsvector('english', question || ' ' || COALESCE(description, '')));
CREATE INDEX markets_tags_idx ON markets USING gin(tags);

-- Trigger: Update updated_at
CREATE TRIGGER update_markets_updated_at
  BEFORE UPDATE ON markets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE markets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Markets are readable by everyone"
  ON markets FOR SELECT
  USING (TRUE);

CREATE POLICY "Only backend can insert markets"
  ON markets FOR INSERT
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Only backend can update markets"
  ON markets FOR UPDATE
  USING (auth.jwt() ->> 'role' = 'service_role');
```

### positions

**Purpose**: Off-chain cache of user positions (derived from on-chain state)

```sql
CREATE TABLE positions (
  -- Composite key
  market_id TEXT NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
  user_wallet TEXT NOT NULL REFERENCES users(wallet),

  -- Position data (cached from on-chain UserPosition account)
  shares_yes BIGINT NOT NULL DEFAULT 0,
  shares_no BIGINT NOT NULL DEFAULT 0,
  total_invested BIGINT NOT NULL DEFAULT 0, -- Total cost basis

  -- Derived metrics
  trades_count INTEGER DEFAULT 0,
  realized_pnl BIGINT DEFAULT 0, -- From sells
  unrealized_pnl BIGINT, -- Current value - cost basis

  -- Claiming
  has_claimed BOOLEAN DEFAULT FALSE,
  claimed_amount BIGINT,

  -- Timestamps
  first_trade_at TIMESTAMP WITH TIME ZONE,
  last_trade_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  PRIMARY KEY (market_id, user_wallet)
);

-- Indexes
CREATE INDEX positions_user_idx ON positions(user_wallet);
CREATE INDEX positions_market_idx ON positions(market_id);
CREATE INDEX positions_updated_at_idx ON positions(updated_at DESC);

-- RLS
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own positions"
  ON positions FOR SELECT
  USING (user_wallet = auth.jwt() ->> 'sub');

CREATE POLICY "Users can read all positions for a market (leaderboard)"
  ON positions FOR SELECT
  USING (TRUE);

CREATE POLICY "Only backend can modify positions"
  ON positions FOR INSERT
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Only backend can update positions"
  ON positions FOR UPDATE
  USING (auth.jwt() ->> 'role' = 'service_role');
```

---

## Voting Tables

### proposal_votes

**Purpose**: Individual proposal votes (aggregated → on-chain)

```sql
CREATE TABLE proposal_votes (
  -- Composite key (one vote per user per market)
  market_id TEXT NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
  user_wallet TEXT NOT NULL REFERENCES users(wallet),

  -- Vote data
  vote BOOLEAN NOT NULL, -- true = like, false = dislike

  -- Metadata
  voted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  tx_signature TEXT, -- Optional: on-chain VoteRecord creation tx

  PRIMARY KEY (market_id, user_wallet)
);

-- Indexes
CREATE INDEX proposal_votes_market_idx ON proposal_votes(market_id);
CREATE INDEX proposal_votes_user_idx ON proposal_votes(user_wallet);
CREATE INDEX proposal_votes_voted_at_idx ON proposal_votes(voted_at DESC);

-- RLS
ALTER TABLE proposal_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read proposal votes"
  ON proposal_votes FOR SELECT
  USING (TRUE);

CREATE POLICY "Users can insert own proposal votes"
  ON proposal_votes FOR INSERT
  WITH CHECK (user_wallet = auth.jwt() ->> 'sub');

CREATE POLICY "Users cannot update existing votes"
  ON proposal_votes FOR UPDATE
  USING (FALSE);
```

### dispute_votes

**Purpose**: Individual dispute votes (aggregated → on-chain)

```sql
CREATE TABLE dispute_votes (
  -- Composite key (one vote per user per market)
  market_id TEXT NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
  user_wallet TEXT NOT NULL REFERENCES users(wallet),

  -- Vote data
  vote BOOLEAN NOT NULL, -- true = agree with dispute, false = disagree

  -- Metadata
  voted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  tx_signature TEXT, -- Optional: on-chain VoteRecord creation tx

  PRIMARY KEY (market_id, user_wallet),

  -- Constraint: Market must be in DISPUTED state
  CONSTRAINT dispute_only_when_disputed CHECK (
    EXISTS (
      SELECT 1 FROM markets m
      WHERE m.id = market_id AND m.state = 'DISPUTED'
    )
  )
);

-- Indexes
CREATE INDEX dispute_votes_market_idx ON dispute_votes(market_id);
CREATE INDEX dispute_votes_user_idx ON dispute_votes(user_wallet);
CREATE INDEX dispute_votes_voted_at_idx ON dispute_votes(voted_at DESC);

-- RLS
ALTER TABLE dispute_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read dispute votes"
  ON dispute_votes FOR SELECT
  USING (TRUE);

CREATE POLICY "Users can insert own dispute votes"
  ON dispute_votes FOR INSERT
  WITH CHECK (user_wallet = auth.jwt() ->> 'sub');

CREATE POLICY "Users cannot update existing votes"
  ON dispute_votes FOR UPDATE
  USING (FALSE);
```

---

## Discussion Tables (Option B)

### discussions

**Purpose**: Flat comments on markets (Supabase + IPFS snapshots)

```sql
CREATE TABLE discussions (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- References
  market_id TEXT NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
  user_wallet TEXT NOT NULL REFERENCES users(wallet),

  -- Content
  content TEXT NOT NULL,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE, -- Soft delete

  -- Constraints
  CONSTRAINT content_not_empty CHECK (char_length(trim(content)) > 0),
  CONSTRAINT content_max_length CHECK (char_length(content) <= 1000)
);

-- Indexes
CREATE INDEX discussions_market_idx ON discussions(market_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX discussions_user_idx ON discussions(user_wallet, created_at DESC);
CREATE INDEX discussions_created_at_idx ON discussions(created_at DESC) WHERE deleted_at IS NULL;

-- RLS
ALTER TABLE discussions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read discussions"
  ON discussions FOR SELECT
  USING (deleted_at IS NULL);

CREATE POLICY "Users can insert own discussions"
  ON discussions FOR INSERT
  WITH CHECK (user_wallet = auth.jwt() ->> 'sub');

CREATE POLICY "Users can soft-delete own discussions"
  ON discussions FOR UPDATE
  USING (user_wallet = auth.jwt() ->> 'sub' AND deleted_at IS NULL)
  WITH CHECK (deleted_at IS NOT NULL);
```

### ipfs_anchors

**Purpose**: Track IPFS snapshot CIDs for discussion history

```sql
CREATE TABLE ipfs_anchors (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- References
  market_id TEXT NOT NULL REFERENCES markets(id) ON DELETE CASCADE,

  -- IPFS data
  ipfs_hash TEXT NOT NULL, -- CIDv1 (bafy...)
  discussions_count INTEGER NOT NULL,

  -- Snapshot metadata
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraint: One snapshot per market per day
  UNIQUE (market_id, snapshot_date)
);

-- Indexes
CREATE INDEX ipfs_anchors_market_idx ON ipfs_anchors(market_id, snapshot_date DESC);
CREATE INDEX ipfs_anchors_created_at_idx ON ipfs_anchors(created_at DESC);

-- RLS
ALTER TABLE ipfs_anchors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read ipfs anchors"
  ON ipfs_anchors FOR SELECT
  USING (TRUE);

CREATE POLICY "Only backend can insert ipfs anchors"
  ON ipfs_anchors FOR INSERT
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');
```

---

## Trading Tables

### trades

**Purpose**: Trading history (indexed from Solana events, not direct inserts)

```sql
CREATE TABLE trades (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- References
  market_id TEXT NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
  user_wallet TEXT NOT NULL REFERENCES users(wallet),

  -- Trade data
  trade_type TEXT NOT NULL, -- 'buy' | 'sell'
  outcome BOOLEAN NOT NULL, -- true = YES, false = NO
  shares BIGINT NOT NULL, -- Shares bought/sold
  cost BIGINT NOT NULL, -- Cost in lamports (includes fees)

  -- Market state after trade
  price_after NUMERIC(18, 9), -- Price immediately after this trade

  -- Blockchain data
  tx_signature TEXT NOT NULL UNIQUE, -- Solana transaction signature
  block_time TIMESTAMP WITH TIME ZONE NOT NULL,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), -- When indexed

  -- Constraints
  CONSTRAINT valid_trade_type CHECK (trade_type IN ('buy', 'sell')),
  CONSTRAINT positive_shares CHECK (shares > 0),
  CONSTRAINT positive_cost CHECK (cost > 0)
);

-- Indexes
CREATE INDEX trades_market_idx ON trades(market_id, block_time DESC);
CREATE INDEX trades_user_idx ON trades(user_wallet, block_time DESC);
CREATE INDEX trades_tx_signature_idx ON trades(tx_signature);
CREATE INDEX trades_block_time_idx ON trades(block_time DESC);

-- Composite index for market analytics
CREATE INDEX trades_market_outcome_idx ON trades(market_id, outcome, block_time DESC);

-- RLS
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read trades"
  ON trades FOR SELECT
  USING (TRUE);

CREATE POLICY "Only backend can insert trades (from events)"
  ON trades FOR INSERT
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');
```

---

## Indexes

### Performance Optimization

```sql
-- Full-text search on markets
CREATE INDEX markets_search_idx
  ON markets
  USING gin(to_tsvector('english', question || ' ' || COALESCE(description, '')));

-- Active markets query (most common)
CREATE INDEX markets_active_volume_idx
  ON markets(total_volume DESC)
  WHERE state = 'ACTIVE' AND NOT is_cancelled;

-- User leaderboard query
CREATE INDEX positions_user_pnl_idx
  ON positions(unrealized_pnl DESC NULLS LAST)
  WHERE has_claimed = FALSE;

-- Recent trades for market page
CREATE INDEX trades_market_recent_idx
  ON trades(market_id, block_time DESC);

-- Vote aggregation query
CREATE INDEX proposal_votes_market_count_idx
  ON proposal_votes(market_id, vote);

CREATE INDEX dispute_votes_market_count_idx
  ON dispute_votes(market_id, vote);
```

---

## Row-Level Security

### RLS Policies Summary

| Table | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| **users** | Own profile | Not allowed | Own profile | Not allowed |
| **markets** | Everyone | Backend only | Backend only | Not allowed |
| **positions** | Everyone | Backend only | Backend only | Not allowed |
| **proposal_votes** | Everyone | Own votes | Not allowed | Not allowed |
| **dispute_votes** | Everyone | Own votes | Not allowed | Not allowed |
| **discussions** | Everyone (not deleted) | Own comments | Own (soft delete) | Not allowed |
| **ipfs_anchors** | Everyone | Backend only | Not allowed | Not allowed |
| **trades** | Everyone | Backend only (from events) | Not allowed | Not allowed |

### Helper Function: Update Timestamp

```sql
-- Function to auto-update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## Migrations

### Migration Strategy

**Tool**: Supabase Migrations (SQL-based)

**Structure**:
```
supabase/
├── migrations/
│   ├── 20250101000000_initial_schema.sql
│   ├── 20250101000001_rls_policies.sql
│   ├── 20250101000002_indexes.sql
│   ├── 20250102000000_discussions_tables.sql
│   └── 20250201000000_add_reserved_columns.sql
└── seed.sql (optional test data)
```

### Initial Migration

**File**: `20250101000000_initial_schema.sql`

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table
CREATE TABLE users (...); -- (see above)

-- Create markets table
CREATE TABLE markets (...); -- (see above)

-- Create positions table
CREATE TABLE positions (...); -- (see above)

-- Create proposal_votes table
CREATE TABLE proposal_votes (...); -- (see above)

-- Create dispute_votes table
CREATE TABLE dispute_votes (...); -- (see above)

-- Create discussions table (Option B)
CREATE TABLE discussions (...); -- (see above)

-- Create ipfs_anchors table
CREATE TABLE ipfs_anchors (...); -- (see above)

-- Create trades table
CREATE TABLE trades (...); -- (see above)
```

### Running Migrations

```bash
# Local development
supabase db reset

# Production
supabase db push

# Create new migration
supabase migration new add_reputation_column
```

---

## Backup Strategy

### Supabase Built-in Backups

**Free Tier**: Daily backups, 7-day retention
**Pro Tier**: Daily backups, 30-day retention, point-in-time recovery

### Custom Backup Script

```bash
#!/bin/bash
# backup.sh - Daily database backup to S3

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="zmart_backup_${TIMESTAMP}.sql"

# Dump database
pg_dump $DATABASE_URL > $BACKUP_FILE

# Compress
gzip $BACKUP_FILE

# Upload to S3
aws s3 cp ${BACKUP_FILE}.gz s3://zmart-backups/

# Clean up local file
rm ${BACKUP_FILE}.gz

echo "Backup completed: ${BACKUP_FILE}.gz"
```

### Cron Job

```cron
# Daily at 2 AM UTC
0 2 * * * /path/to/backup.sh
```

---

## Seed Data (Development)

### File: `supabase/seed.sql`

```sql
-- Seed test users
INSERT INTO users (wallet) VALUES
  ('7Xb3...abc'), -- Test User 1
  ('8Yc4...def'), -- Test User 2
  ('9Zd5...ghi'); -- Test User 3

-- Seed test market
INSERT INTO markets (
  id,
  on_chain_address,
  question,
  description,
  category,
  creator_wallet,
  state,
  b_parameter,
  initial_liquidity,
  created_at
) VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'ABC...XYZ',
  'Will Bitcoin reach $100K by end of 2025?',
  'Market resolves YES if BTC spot price >= $100,000 USD on any major exchange (Binance, Coinbase, Kraken) before 2026-01-01 00:00 UTC.',
  'crypto',
  '7Xb3...abc',
  'ACTIVE',
  1000000000000, -- 1000 SOL
  10000000000,   -- 10 SOL
  NOW()
);

-- Seed test votes
INSERT INTO proposal_votes (market_id, user_wallet, vote) VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '7Xb3...abc', true),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '8Yc4...def', true);

-- Seed test discussions
INSERT INTO discussions (market_id, user_wallet, content) VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '7Xb3...abc', 'I think YES will happen because institutional adoption is accelerating.'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '8Yc4...def', 'Interesting market! What evidence would you accept for resolution?');
```

---

## Production Checklist

### Pre-Deployment

- [ ] All migrations tested locally with `supabase db reset`
- [ ] RLS policies enabled on all tables
- [ ] Indexes created for all common queries
- [ ] Seed data removed (only for dev)
- [ ] Backup script tested and cron job configured
- [ ] Connection pooling configured (Supabase: max 20 connections)

### Monitoring

- [ ] Query performance monitoring (slow query log enabled)
- [ ] Database size tracking (alert at 80% capacity)
- [ ] Connection count monitoring (alert at 80% max connections)
- [ ] RLS policy violations logged
- [ ] Backup success rate tracking (alert on failure)

### Security

- [ ] Database credentials rotated
- [ ] Service role key stored in AWS Secrets Manager
- [ ] Anon key configured for frontend (read-only operations)
- [ ] RLS policies tested for all user roles
- [ ] SQL injection prevention verified (use parameterized queries)

---

**Document Status**: ✅ Implementation-Ready
**Next Steps**: Update existing documentation and create development roadmap
**Integration**: `07_ON_CHAIN_OFF_CHAIN_INTEGRATION.md`, `CLAUDE.md` (Option B)
