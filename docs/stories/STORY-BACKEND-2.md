# Story: BACKEND-2 - Event Indexer & Database Service

**Epic:** Phase 2 - Backend Services
**Story Points:** 8
**Priority:** High
**Sprint:** Week 5

## User Story

As a **frontend developer**, I want **all on-chain events indexed in a queryable database** so that I can **build fast, responsive UIs without directly querying the blockchain**.

## Context

The Event Indexer listens to Solana blockchain events (via Helius webhooks) and stores them in Supabase PostgreSQL. This provides:
- Fast queries for market data, trades, positions
- Historical data for charts and analytics
- Real-time updates via database triggers
- Reduced RPC load on Solana

## Acceptance Criteria

### Database Schema (Day 1-2)
- [ ] Deploy Supabase instance
- [ ] Create all 10 tables from [08_DATABASE_SCHEMA.md](../08_DATABASE_SCHEMA.md)
  - [ ] markets table (market state and metadata)
  - [ ] positions table (user positions per market)
  - [ ] trades table (all buy/sell transactions)
  - [ ] votes table (proposal and dispute votes)
  - [ ] resolutions table (market resolution data)
  - [ ] disputes table (dispute events)
  - [ ] users table (wallet addresses and profiles)
  - [ ] proposals table (market proposals)
  - [ ] events table (raw event log)
  - [ ] analytics table (aggregated metrics)
- [ ] Create indexes for performance
  - [ ] markets: (pubkey), (state), (creator), (created_at)
  - [ ] trades: (market_pubkey), (trader_pubkey), (timestamp)
  - [ ] positions: (user_pubkey, market_pubkey)
- [ ] Set up RLS (Row Level Security) policies
  - [ ] Public read for markets
  - [ ] User-scoped read for positions
  - [ ] Admin-only writes

### Event Listener (Day 3-4)
- [ ] Helius webhook integration
  - [ ] Register webhook for program events
  - [ ] Verify webhook signatures
  - [ ] Parse program logs
- [ ] Event processors
  - [ ] MarketCreated → Insert into markets table
  - [ ] TradeExecuted → Insert into trades, update positions
  - [ ] MarketResolved → Update markets, insert into resolutions
  - [ ] DisputeRaised → Insert into disputes
  - [ ] VoteSubmitted → Insert into votes
- [ ] Error handling
  - [ ] Retry failed insertions (3 attempts)
  - [ ] Dead letter queue for failures
  - [ ] Alert on critical errors

### Real-time Performance (Day 5)
- [ ] Event-to-database latency <5 seconds
- [ ] Query performance <200ms for common queries
  - [ ] GET /markets (all active markets)
  - [ ] GET /markets/:pubkey (single market)
  - [ ] GET /positions/:user (user positions)
  - [ ] GET /trades/:market (market trading history)
- [ ] Load test with 10,000 events

### Data Integrity (Day 6-7)
- [ ] Validation rules
  - [ ] No duplicate events (idempotency)
  - [ ] Position balances match on-chain state
  - [ ] Trade volumes sum correctly
- [ ] Reconciliation script
  - [ ] Compare database vs on-chain state
  - [ ] Report discrepancies
  - [ ] Auto-fix option for minor issues

## Technical Implementation

### Stack
- **Database:** Supabase (PostgreSQL)
- **Event Source:** Helius Webhooks
- **Backend:** Node.js + TypeScript + Express
- **ORM:** Supabase JS Client
- **Testing:** Jest + Supertest

### Architecture
```
Solana Program Events
       ↓
Helius Webhook (HTTP POST)
       ↓
Event Listener Service (Express)
       ↓
Event Parsers (by instruction type)
       ↓
Supabase PostgreSQL
       ↓
Frontend Queries (REST + Real-time subscriptions)
```

### Database Connection
```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);
```

### Event Processing Example
```typescript
// Parse MarketCreated event
const marketCreated = parseMarketCreatedEvent(log);

// Insert into database
await supabase.from('markets').insert({
  pubkey: marketCreated.marketPubkey,
  creator: marketCreated.creator,
  question: marketCreated.question,
  state: 'PROPOSED',
  liquidity: marketCreated.initialLiquidity,
  created_at: new Date(marketCreated.timestamp * 1000)
});
```

## Dependencies
- ✅ Solana program deployed (zmart-core)
- ✅ Helius account with webhook support
- [ ] Supabase account and project

## Testing Strategy

### Unit Tests (20+ tests)
- Event parsing for all instruction types
- Database insertion logic
- Error handling and retries
- Validation rules

### Integration Tests (10+ tests)
- End-to-end event flow (webhook → database)
- Query performance benchmarks
- Reconciliation accuracy
- Real-time subscription updates

### Load Tests
- 1,000 events/minute sustained
- 10,000 events in database
- Query latency under load

## Definition of Done
- [ ] All 10 tables created and indexed
- [ ] All event types parsed and indexed
- [ ] RLS policies enforced
- [ ] Event-to-database latency <5s
- [ ] Query performance <200ms
- [ ] 30+ tests passing (90%+ coverage)
- [ ] Reconciliation script validated
- [ ] Documentation updated
- [ ] Code reviewed and merged

## Risks & Mitigation
- **Risk:** Helius webhook failures → **Mitigation:** Fallback to RPC polling
- **Risk:** Database write bottleneck → **Mitigation:** Batch inserts, connection pooling
- **Risk:** Schema changes break indexer → **Mitigation:** Version event parsers
- **Risk:** Data drift from blockchain → **Mitigation:** Hourly reconciliation

## Success Metrics
- Event indexing success rate: >99%
- Average event-to-database latency: <3s
- Query response time p95: <150ms
- Database uptime: 99.9%

## Notes
- Use Helius webhooks for real-time events (not polling)
- Implement idempotency to handle duplicate events
- Store raw events in `events` table for audit trail
- Use database triggers for derived data (analytics table)

## References
- [08_DATABASE_SCHEMA.md](../08_DATABASE_SCHEMA.md) - Complete schema
- [07_ON_CHAIN_OFF_CHAIN_INTEGRATION.md](../07_ON_CHAIN_OFF_CHAIN_INTEGRATION.md) - Architecture
- [IMPLEMENTATION_PHASES.md](../IMPLEMENTATION_PHASES.md) - Week 5 plan
- Helius Webhooks: https://docs.helius.dev/webhooks-and-websockets/webhooks
