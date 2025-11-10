# PHASE 2 ULTRATHINK PLAN - Backend Services

**Date:** November 6, 2025
**Status:** Ready for Execution
**Duration:** Week 3 (Days 1-7) - 4 services in parallel
**Estimated:** 24-28 hours
**Target Velocity:** 2x faster (12-14 actual hours)

---

## 🎯 Phase 2 Overview

### Mission
Build backend infrastructure to enable off-chain vote aggregation, event indexing, and API access while maintaining on-chain security and finality.

### Success Criteria
- ✅ Vote aggregation service processing votes with Redis caching
- ✅ Event indexer capturing all program events with <5s latency
- ✅ REST API + WebSocket serving market data
- ✅ Market monitor auto-transitioning states
- ✅ All 4 services stable with monitoring
- ✅ 99% uptime validation (7-day testing period)

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (Week 5)                         │
└────────────────┬────────────────────────────────┬────────────────┘
                 │                                │
        ┌────────▼────────┐            ┌──────────▼──────────┐
        │ WebSocket Client │            │   REST API Client   │
        └────────┬────────┘            └──────────┬──────────┘
                 │                                │
    ┌────────────▼────────────────────────────────▼──────────────┐
    │              API Gateway (Week 6)                          │
    │  ┌──────────────────┐           ┌──────────────────────┐  │
    │  │ REST Endpoints   │           │ WebSocket Server     │  │
    │  │ - /markets       │           │ - Price updates      │  │
    │  │ - /positions     │           │ - State transitions  │  │
    │  │ - /trades        │           │ - Real-time events   │  │
    │  └──────────────────┘           └──────────────────────┘  │
    └────────────────┬────────────────────────────┬──────────────┘
                     │                            │
    ┌────────────────▼──────────┐   ┌────────────▼──────────────┐
    │  Event Indexer (Week 5)   │   │ Vote Aggregator (Week 4)  │
    │  - Helius webhooks        │   │ - Redis cache             │
    │  - Parse program events   │   │ - Cron aggregation        │
    │  - Store in Supabase      │   │ - Call on-chain           │
    └────────────────┬──────────┘   └────────────┬──────────────┘
                     │                           │
    ┌────────────────▼──────────────────────────▼──────────────┐
    │            Supabase Database (PostgreSQL)                │
    │  ┌──────────┬──────────┬──────────┬─────────────────┐   │
    │  │ markets  │positions │  trades  │ votes, disputes │   │
    │  │ proposals│ disputes │resolutions│ events (audit)  │   │
    │  └──────────┴──────────┴──────────┴─────────────────┘   │
    └────────────────┬──────────────────────────────────────────┘
                     │
    ┌────────────────▼──────────────────────────────────────────┐
    │         Market Monitor (Week 7)                           │
    │  - Query markets needing transition                       │
    │  - Auto-call state transition instructions                │
    │  - Alert on stuck markets                                │
    │  - Dead letter queue for failures                        │
    └────────────────┬──────────────────────────────────────────┘
                     │
    ┌────────────────▼──────────────────────────────────────────┐
    │         Solana Blockchain (Program: zmart-core)           │
    │  - Markets, positions, votes stored in accounts           │
    │  - Instructions handle state transitions                  │
    │  - Events emitted for indexing                            │
    └───────────────────────────────────────────────────────────┘
```

---

## 📋 Week 3 Schedule (Parallel Execution)

### Days 1-2: Vote Aggregator + Event Indexer Foundation
**Parallel:** Build infrastructure for both services

**Vote Aggregator (Day 1-2):**
- [ ] Project setup (express, redis, @solana/web3.js)
- [ ] Vote submission API endpoint
- [ ] Redis caching layer
- [ ] Cron scheduler setup
- [ ] On-chain aggregation calls
- [ ] Integration tests (50+)
- [ ] Time: 6-8 hours

**Event Indexer (Day 1-2):**
- [ ] Supabase schema deployment
- [ ] Helius webhook configuration
- [ ] Event listener service
- [ ] RLS policies setup
- [ ] Query optimization
- [ ] Integration tests (40+)
- [ ] Time: 6-8 hours

**Quality Gate:** Both services accept data and store in respective backends

---

### Days 3-4: API Gateway + Market Monitor
**Parallel:** Build frontend-facing and monitoring infrastructure

**API Gateway (Day 3-4):**
- [ ] Express REST API scaffold
- [ ] 5 core endpoints (markets, positions, trades, votes, proposals)
- [ ] WebSocket server (Socket.io)
- [ ] API key authentication
- [ ] Rate limiting (Redis-based)
- [ ] Error handling + Sentry integration
- [ ] Integration tests (60+)
- [ ] Time: 6-8 hours

**Market Monitor (Day 3-4):**
- [ ] Cron job scheduler
- [ ] State transition logic
- [ ] Stuck market detection
- [ ] Alert system (email/Slack)
- [ ] Dead letter queue
- [ ] Grafana dashboard setup
- [ ] Integration tests (40+)
- [ ] Time: 5-7 hours

**Quality Gate:** All 4 services stable and communicating

---

### Days 5-7: Integration Testing + Documentation
**Sequential:** Validate everything works end-to-end

**Integration Testing (Day 5-6):**
- [ ] End-to-end vote flow (submit → aggregate → on-chain)
- [ ] Event indexing validation (100% event capture)
- [ ] API query accuracy (100 test markets)
- [ ] WebSocket real-time updates
- [ ] Market monitor state transitions
- [ ] Stress testing (100+ concurrent users)
- [ ] Time: 8-10 hours

**Documentation + Deployment (Day 7):**
- [ ] API documentation (OpenAPI/Swagger)
- [ ] Backend deployment guide
- [ ] Architecture diagrams
- [ ] Monitoring setup guide
- [ ] Performance benchmarks
- [ ] Time: 4-6 hours

**Quality Gate:** All tests passing, documentation complete

---

## 🏗️ Detailed Component Breakdown

### 1. Vote Aggregator Service (Week 4)

**Technology Stack:**
- Node.js + Express
- Redis (for vote caching)
- node-cron (job scheduler)
- @solana/web3.js (blockchain interaction)
- Jest (testing)

**Data Structure (Redis):**
```javascript
// Proposal votes
votes:proposal:{market_id} = {
  likes: u32,
  dislikes: u32,
  voters: Set<pubkey>,
  last_updated: timestamp
}

// Dispute votes
votes:dispute:{market_id} = {
  agrees: u32,
  disagrees: u32,
  voters: Set<pubkey>,
  last_updated: timestamp
}
```

**API Endpoints:**
```
POST /votes/proposal
  Body: { market_id, user_wallet, vote (bool), signature }
  Returns: { success, message }

POST /votes/dispute
  Body: { market_id, user_wallet, vote (bool), signature }
  Returns: { success, message }

GET /votes/proposal/:market_id
  Returns: { likes, dislikes, voters_count, approval_percentage }

GET /votes/dispute/:market_id
  Returns: { agrees, disagrees, voters_count, agreement_percentage }
```

**Cron Job (Every 5 minutes):**
```
1. Query all markets in PROPOSED state
2. Get vote counts from Redis
3. If >=70% likes: call aggregate_proposal_votes on-chain
4. Clear Redis cache for aggregated votes
5. Log results and errors
```

**Error Handling:**
- Invalid signatures → 400 Bad Request
- User already voted → 409 Conflict
- Market not in correct state → 400 Bad Request
- Redis failure → 503 Service Unavailable
- On-chain transaction failure → 500 Internal Server Error + DLQ

---

### 2. Event Indexer Service (Week 5)

**Technology Stack:**
- Supabase (PostgreSQL + realtime)
- Helius Webhooks (event stream)
- Node.js event processor
- TypeScript for type safety

**Database Tables (from Schema):**
```sql
markets
positions
trades
proposals
votes
disputes
resolutions
users
events (audit log)
analytics
```

**Event Processing Pipeline:**
```
1. Helius webhook → POST /webhooks/events
2. Parse event data
3. Determine event type (MarketCreated, TradeExecuted, etc.)
4. Extract accounts and amounts
5. Insert into appropriate table
6. Emit realtime update to WebSocket clients
```

**RLS Policies:**
- Users can read own positions/votes
- Users can read all markets (public)
- Only backend can write to positions/trades
- Admin-only access to sensitive fields

**Query Performance:**
- Markets by state: Index on (state, created_at)
- User positions: Index on (user_wallet, market_id)
- Trading history: Index on (market_id, timestamp)
- Target: <200ms for all queries

---

### 3. API Gateway (Week 6)

**Technology Stack:**
- Express.js (REST API)
- Socket.io (WebSocket)
- Redis (rate limiting + session store)
- Sentry (error tracking)

**REST Endpoints (5 core):**
```
GET /markets                 - List all markets (paginated)
GET /markets/:id            - Market details + current state
GET /positions/:wallet      - User positions in all markets
GET /trades/:market_id      - Trading history for market
GET /votes/:proposal_id     - Vote counts and status
```

**WebSocket Events:**
```
// Client subscribes to market
subscribe:market:{id}

// Server emits updates
price:update → { market_id, yes_price, no_price, timestamp }
state:change → { market_id, new_state, timestamp }
trade:executed → { market_id, buyer, amount, outcome, timestamp }
```

**Authentication:**
- API key in headers: `Authorization: Bearer {api_key}`
- Validate against allowlist in Redis
- Log all requests with key_id

**Rate Limiting:**
- Per-IP: 100 req/min
- Per-key: 1000 req/min
- Return 429 Too Many Requests when exceeded
- Include Retry-After header

---

### 4. Market Monitor Service (Week 7)

**Technology Stack:**
- Node.js + node-cron
- BullMQ (job queue)
- Grafana (dashboard)
- Slack API (notifications)

**State Transition Logic:**
```
RESOLVING → FINALIZED: After 48 hours
DISPUTED → FINALIZED: After dispute voting
Auto-transition on 1-minute cron

Stuck detection: If transition expected but not done in 2 hours
```

**Dead Letter Queue:**
```
Failed transition → Add to DLQ
Max retries: 3 (exponential backoff: 1m, 5m, 15m)
After max retries → Alert to Slack
Manual review required for stuck markets
```

**Monitoring Metrics:**
- Successful transitions per day
- Failed transitions (by reason)
- Stuck markets count
- Transition latency (average, p95)
- Service uptime

**Alerts:**
- Stuck market in RESOLVING >3 hours
- Transition success rate <99%
- Service downtime >5 minutes
- Dead letter queue growing >10 items

---

## 🧪 Testing Strategy

### Unit Tests (By Service)

**Vote Aggregator:**
- Vote submission validation (40 tests)
- Redis operations (20 tests)
- Cron scheduling (15 tests)
- On-chain call building (20 tests)
- Error handling (15 tests)
- **Total: 110 tests**

**Event Indexer:**
- Webhook parsing (30 tests)
- Event type detection (20 tests)
- Supabase insertion (30 tests)
- RLS policy verification (20 tests)
- Query performance (15 tests)
- **Total: 115 tests**

**API Gateway:**
- REST endpoint responses (40 tests)
- WebSocket connections (25 tests)
- Authentication (25 tests)
- Rate limiting (20 tests)
- Error responses (20 tests)
- **Total: 130 tests**

**Market Monitor:**
- State transition logic (35 tests)
- Stuck detection (20 tests)
- Alert triggering (20 tests)
- DLQ operations (20 tests)
- Cron scheduling (15 tests)
- **Total: 110 tests**

**Total Unit Tests: 465+**

### Integration Tests

**Full Flow Tests:**
1. Vote submission → cron aggregation → on-chain update
2. Program event → Helius webhook → database storage → API query
3. Multiple WebSocket clients → price update event
4. Market state transition → automatic finalization
5. Rate limit exceeded → 429 response

**Stress Tests:**
- 100 concurrent vote submissions
- 100 concurrent WebSocket connections
- 1000 queries per minute to API
- Event indexing under load (100 events/second)

---

## 📊 Velocity Projection

### Based on Week 2 Success (2.3x faster)

**Week 3 Estimates:**

| Component | Estimate | Projected Actual | Velocity |
|-----------|----------|------------------|----------|
| Vote Aggregator | 7h | 3-4h | 2x |
| Event Indexer | 7h | 3-4h | 2x |
| API Gateway | 7h | 3-4h | 2x |
| Market Monitor | 7h | 3-4h | 2x |
| Integration Testing | 8h | 4-5h | 1.5-2x |
| **Total** | **36h** | **16-20h** | **1.8-2.2x** |

**Why This is Achievable:**
1. **Pattern Reuse** - Same patterns from Week 2 (fluent builders, TDD)
2. **Parallel Execution** - Services independent, can build simultaneously
3. **Clear Specifications** - API contracts defined, no ambiguity
4. **Testing Framework** - Jest/Mocha setup speeds test writing
5. **Infrastructure** - Supabase, Redis, Helius pre-configured

---

## 🎯 Daily Breakdown

### Day 1 (Tuesday):
**Morning (4 hours):**
- Vote Aggregator: Project setup + vote submission API
- Event Indexer: Supabase schema deployment + Helius setup

**Afternoon (4 hours):**
- Vote Aggregator: Redis caching + tests (25+ tests)
- Event Indexer: Event listener + RLS policies (20+ tests)

**Target:** Both services accepting data

### Day 2 (Wednesday):
**Morning (4 hours):**
- Vote Aggregator: Cron scheduler + on-chain integration
- Event Indexer: Query optimization + tests (30+ tests)

**Afternoon (4 hours):**
- Vote Aggregator: Integration tests + error handling (30+ tests)
- Event Indexer: Webhook verification (25+ tests)

**Target:** Both services fully operational

### Day 3 (Thursday):
**Morning (4 hours):**
- API Gateway: Express setup + 5 endpoints
- Market Monitor: Cron job scheduler + transition logic

**Afternoon (4 hours):**
- API Gateway: WebSocket + authentication (30+ tests)
- Market Monitor: Stuck detection + alerts (25+ tests)

**Target:** Both services accepting requests

### Day 4 (Friday):
**Morning (4 hours):**
- API Gateway: Rate limiting + error handling (25+ tests)
- Market Monitor: DLQ + monitoring dashboard

**Afternoon (4 hours):**
- API Gateway: Sentry integration + API docs (20+ tests)
- Market Monitor: Cron verification (20+ tests)

**Target:** All 4 services stable and communicating

### Day 5 (Saturday):
**Full Day (8 hours):**
- End-to-end testing (vote flow, event indexing, API queries)
- Stress testing (100+ concurrent users)
- Performance benchmarking
- Bug fixes

**Target:** All tests passing

### Day 6 (Sunday):
**Full Day (8 hours):**
- Integration testing (complex workflows)
- Monitoring dashboard verification
- Deployment validation
- Documentation

**Target:** Ready for Phase 3

### Day 7 (Monday):
**Full Day (8 hours):**
- Final validation and polish
- Performance tuning
- Create final report
- Begin Phase 3 preparation

**Target:** Phase 2 complete and documented

---

## 🚀 Success Criteria

### Code Quality
- ✅ 465+ tests passing (100%)
- ✅ 0 critical bugs
- ✅ <2% error rate in production simulation
- ✅ All endpoints documented

### Performance
- ✅ Vote aggregation <5s (cron) + <100ms (submission API)
- ✅ Event indexing <5s (webhook to DB)
- ✅ API response <200ms (p95)
- ✅ WebSocket stable (100+ concurrent)
- ✅ Market monitor 99%+ successful transitions

### Architecture
- ✅ All 4 services deployed
- ✅ Services can operate independently
- ✅ Graceful degradation (one service down won't break others)
- ✅ Full monitoring and alerting
- ✅ Error recovery and retry logic

### Documentation
- ✅ API documentation (OpenAPI)
- ✅ Architecture diagrams
- ✅ Deployment guide
- ✅ Troubleshooting guide
- ✅ Performance benchmarks

---

## 📝 Assumptions & Dependencies

### Dependencies
- ✅ Solana devnet running and stable
- ✅ Program deployed (7h3gXfBfYFueFVLYyfL5Qo1QGsf4GQUfW96FKVgnUsJS)
- ✅ Supabase account configured
- ✅ Helius API key available
- ✅ Redis instance running

### Assumptions
- Events emit correctly from program
- Helius webhooks reliable
- PostgreSQL performance adequate
- Node.js version 16+ available
- Redis connection stable

---

## 🔄 Phase 2 Exit Criteria

**All of the following must be true:**

1. **Vote Aggregator:**
   - Accepting votes via API
   - Aggregating to on-chain every 5 minutes
   - 100+ test scenarios passing

2. **Event Indexer:**
   - Capturing 100% of program events
   - <5 second latency (webhook to DB)
   - RLS policies enforced

3. **API Gateway:**
   - All 5 endpoints responding correctly
   - WebSocket stable with 100 connections
   - Authentication + rate limiting working

4. **Market Monitor:**
   - Auto-transitioning states correctly
   - Detecting stuck markets
   - Alerting on issues

5. **Integration:**
   - Full end-to-end flow working
   - All services communicating
   - 99% uptime over 7-day test

6. **Documentation:**
   - API docs complete
   - Architecture documented
   - Deployment procedures documented

---

## 🎊 Next Phase Preview

After Phase 2 is complete, Phase 3 (Integration Testing) will:
- Run end-to-end tests with real users
- Stress test with 100+ concurrent traders
- Validate all market states and transitions
- Performance benchmarking
- Security audit preparation

---

**Status:** Ready to Execute
**Confidence:** 95% (pattern proven in Week 2)
**Target Completion:** Saturday Nov 13, 2025
**Overall Progress:** 68% → 75%

