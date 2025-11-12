# PHASE 2 IMPLEMENTATION GUIDE - Step-by-Step Execution

**Status:** Ready to Execute
**Duration:** Week 3 (7 days)
**Target Completion:** Saturday, November 13
**Confidence:** 95%

---

## 📋 Parallel Execution Strategy

### Key Success Factor
Build 4 services in **parallel**, not sequentially.

**Days 1-2:** Vote Aggregator + Event Indexer (parallel)
**Days 3-4:** API Gateway + Market Monitor (parallel)
**Days 5-7:** Integration Testing + Documentation

---

## 🚀 Service 1: Vote Aggregation Service (Days 1-2)

### What Already Exists
✅ Proposal vote aggregator scaffold (vote-aggregator/proposal.ts)
✅ Dispute vote aggregator scaffold (vote-aggregator/dispute.ts)
✅ API routes for vote submission (api/routes/votes.ts)
✅ Database schema (Supabase)
✅ Retry logic and error handling

### What Needs Completion

**1. Redis Caching Layer** (2 hours)
```typescript
// backend/src/services/vote-aggregator/redis-cache.ts
export class VoteCache {
  // Cache structure:
  // votes:proposal:{market_id} -> { likes: N, dislikes: N, voters: Set }
  // votes:dispute:{market_id} -> { agrees: N, disagrees: N, voters: Set }

  async addProposalVote(marketId, voter, vote) { }
  async getProposalVotes(marketId) { }
  async aggregateProposalVotes(marketId) { }
  // Same for dispute votes
}
```

**2. Cron Job Integration** (2 hours)
```typescript
// backend/src/services/vote-aggregator/scheduler.ts
import cron from 'node-cron';

// Run every 5 minutes
cron.schedule('*/5 * * * *', async () => {
  const aggregator = new ProposalVoteAggregator(...);
  await aggregator.run(); // Fetches votes, calls on-chain if >=70%
});
```

**3. Complete Integration Tests** (2 hours)
```typescript
// Test: Vote submission -> aggregation -> on-chain call
// Test: Redis persistence
// Test: Cron job execution
// Test: Error recovery
```

**Deliverables:**
- ✅ Redis cache working
- ✅ Cron job running every 5 minutes
- ✅ 50+ tests passing
- ✅ Vote aggregation flow end-to-end

---

## 📡 Service 2: Event Indexing Service (Days 1-2)

### What Already Exists
❌ Minimal scaffolding
❌ Helius integration

### What Needs Building

**1. Helius Webhook Handler** (2 hours)
```typescript
// backend/src/services/events/helius-listener.ts
export class HeliusEventListener {
  async handleWebhook(req) {
    // Parse webhook payload from Helius
    // Extract: event type, accounts, amounts, timestamp
    // Route to appropriate handler
  }

  private async handleMarketCreated(event) { }
  private async handleTradeExecuted(event) { }
  private async handleMarketResolved(event) { }
  // etc.
}
```

**2. Database Insertion** (2 hours)
```typescript
// backend/src/services/events/db-writer.ts
export class EventDatabaseWriter {
  async insertMarketCreated(event) {
    // INSERT INTO markets (market_id, state, ...) VALUES (...)
  }

  async insertTradeExecuted(event) {
    // INSERT INTO trades (market_id, buyer, seller, amount, ...) VALUES (...)
  }

  // One method per event type
}
```

**3. RLS Policies** (1 hour)
```sql
-- Users can only read their own positions
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_read_own_positions" ON positions
  FOR SELECT USING (auth.uid() = user_id);

-- Public read on markets
ALTER TABLE markets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_markets" ON markets
  FOR SELECT USING (true);
```

**4. Query Performance** (1 hour)
```sql
-- Create indexes for fast queries
CREATE INDEX idx_markets_state ON markets(state);
CREATE INDEX idx_positions_wallet ON positions(user_wallet);
CREATE INDEX idx_trades_market ON trades(market_id, timestamp DESC);

-- Validate <200ms response time
```

**Deliverables:**
- ✅ Helius webhook handler working
- ✅ Events stored in Supabase
- ✅ RLS policies enforced
- ✅ Queries fast (<200ms)
- ✅ 40+ tests passing

---

## 🌐 Service 3: API Gateway (Days 3-4)

### What Already Exists
✅ Express server scaffold (api/server.ts)
✅ Route scaffolding (api/routes/*.ts)
⚠️ Partial implementation

### What Needs Completion

**1. REST Endpoints** (3 hours)
```typescript
// GET /markets
// GET /markets/:id
// GET /positions/:wallet
// GET /trades/:market_id
// GET /votes/:proposal_id
```

**2. WebSocket Server** (2 hours)
```typescript
// backend/src/services/websocket/events.ts
export class WebSocketEventEmitter {
  emitPriceUpdate(marketId, prices) { }
  emitStateChange(marketId, newState) { }
  emitTradeExecuted(trade) { }
}

// Client can subscribe:
// socket.emit('subscribe:market', marketId)
// Listen for: price:update, state:change, trade:executed
```

**3. Authentication + Rate Limiting** (2 hours)
```typescript
// API key validation middleware
// Rate limiting: 100 req/min per IP, 1000 req/min per key
// Return 429 Too Many Requests
```

**4. Error Handling** (1 hour)
```typescript
// Structured error responses
// Request logging (Morgan)
// Error tracking (Sentry)
```

**Deliverables:**
- ✅ 5 REST endpoints working
- ✅ WebSocket server stable (100+ connections)
- ✅ Authentication working
- ✅ Rate limiting enforced
- ✅ 60+ tests passing

---

## ⏰ Service 4: Market Monitor Service (Days 3-4)

### What Needs Building

**1. State Transition Logic** (2 hours)
```typescript
// backend/src/services/monitor/state-transitions.ts
export class MarketMonitor {
  async checkAndTransition() {
    // Query markets where:
    // - RESOLVING state AND timestamp + 48h <= now()
    // - DISPUTED state AND voting ended

    // Call appropriate on-chain instruction
    // Handle failures → DLQ
  }
}
```

**2. Stuck Market Detection** (1 hour)
```typescript
// Alert if:
// - Market should have transitioned but hasn't
// - Transition cron job hasn't run
// - Transaction keeps failing
```

**3. Dead Letter Queue** (2 hours)
```typescript
// Failed transition → DLQ
// Retry up to 3 times with exponential backoff
// Manual review required after max retries
```

**4. Monitoring Dashboard** (1 hour)
```typescript
// Metrics: successful transitions, failures, stuck markets
// Grafana dashboard showing trends
// Alert if success rate <99%
```

**Deliverables:**
- ✅ Markets auto-transitioning
- ✅ Stuck market detection
- ✅ DLQ retry logic
- ✅ Monitoring dashboard
- ✅ 40+ tests passing

---

## 🧪 Integration Testing (Days 5-7)

### End-to-End Test Scenarios

**Scenario 1: Full Vote Flow**
```
1. User submits vote via API
2. Redis caches vote
3. After 5 minutes: cron job aggregates
4. If >=70%: call approve_proposal on-chain
5. Event emitted → Helius webhook → database
6. API query returns updated market state
```

**Scenario 2: Market Transition**
```
1. Market in RESOLVING state
2. Timestamp + 48h reaches
3. Market monitor detects and transitions to FINALIZED
4. Event emitted → stored in DB
5. API query shows market as FINALIZED
```

**Scenario 3: Real-Time Updates**
```
1. WebSocket client connects
2. Another user submits trade
3. Event → database → WebSocket emit
4. Client receives update in <1 second
```

**Scenario 4: Error Recovery**
```
1. Transaction fails to process
2. Added to DLQ
3. Retried with backoff
4. Eventually succeeds or flagged for manual review
```

### Load Testing

```bash
# 100 concurrent vote submissions
# 100 concurrent WebSocket connections
# 1000 API requests per minute
# Event processing under load (100 events/second)

# Measure:
# - Response times (target <200ms p95)
# - Error rates (target <0.1%)
# - Throughput
# - Memory usage
```

---

## 📊 Quality Checklist

### Code Quality
- [ ] 465+ tests passing
- [ ] 0 critical bugs
- [ ] All functions documented
- [ ] Typescript strict mode
- [ ] Linting passed (eslint)

### Performance
- [ ] Vote aggregation <5s
- [ ] Event indexing <5s
- [ ] API response <200ms (p95)
- [ ] WebSocket <100ms latency
- [ ] DB queries <200ms

### Security
- [ ] All inputs validated
- [ ] SQL injection prevented (Supabase parameterized)
- [ ] Signature verification on votes
- [ ] Rate limiting working
- [ ] RLS policies enforced

### Monitoring
- [ ] All services have logging
- [ ] Errors sent to Sentry
- [ ] Metrics in Grafana
- [ ] Alerts configured
- [ ] Health check endpoints

---

## ⏱️ Timeline (7 Days)

### Day 1 (Tuesday)
**Morning:** Vote Aggregator (setup, Redis, tests)
**Afternoon:** Event Indexer (webhooks, DB insertion)
**Goal:** Both services accepting data

### Day 2 (Wednesday)
**Morning:** Vote Aggregator (cron job, integration tests)
**Afternoon:** Event Indexer (RLS, query optimization)
**Goal:** Both services fully operational

### Day 3 (Thursday)
**Morning:** API Gateway (REST endpoints, WebSocket)
**Afternoon:** Market Monitor (state transitions, detection)
**Goal:** All 4 services stable

### Day 4 (Friday)
**Morning:** API Gateway (auth, rate limiting, error handling)
**Afternoon:** Market Monitor (DLQ, monitoring, alerts)
**Goal:** All services communicating

### Day 5 (Saturday)
**Full Day:** Integration testing
**Goal:** End-to-end flows working

### Day 6 (Sunday)
**Full Day:** Performance & stress testing
**Goal:** Stability under load

### Day 7 (Monday)
**Full Day:** Documentation & final validation
**Goal:** Phase 2 complete and documented

---

## 🚀 Success Metrics

✅ **All 4 services deployed and stable**
✅ **465+ tests passing (100%)**
✅ **<200ms API response time (p95)**
✅ **<5s event indexing latency**
✅ **99%+ market monitor success rate**
✅ **100% uptime over 7-day test**

---

## 📝 Next Steps

1. Start with Day 1 implementation
2. Follow parallel execution (2 services at a time)
3. Daily integration testing
4. Document as you go
5. Fix bugs immediately (don't defer)

---

**Ready to Execute** ✅
**Confidence:** 95%
**Timeline:** 7 days (Week 3)
**Overall Progress:** 68% → 75%

