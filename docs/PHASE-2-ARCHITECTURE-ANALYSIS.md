# Phase 2 Architecture Analysis: Backend Services Deep Dive

**Date:** November 7, 2025
**Status:** ULTRATHINK Analysis - Comprehensive System Design
**Phase:** Phase 2 (Weeks 4-7) - Backend Services
**Confidence:** 95% (Based on Phase 1 completion + backend exploration)

---

## Executive Summary

Phase 2 requires integrating 4 interdependent backend services that form the operational backbone of the ZMART protocol. These services must work in concert to:

1. **Collect votes** off-chain (proposal/dispute)
2. **Index blockchain events** for market state synchronization
3. **Serve real-time data** to frontend (WebSocket)
4. **Automatically manage markets** (state transitions, disputes, resolution)

**System Design Principle:** Event-driven architecture with eventual consistency, high availability through circuit breakers and automatic failover.

---

## Architecture Overview

### System Components (High Level)

```
┌─────────────────────────────────────────────────────────────────┐
│                     Frontend (Phase 4)                          │
│                  (Web3 wallet + UI)                             │
└────────────────────┬────────────────────────────────────────────┘
                     │ HTTP/WebSocket
┌────────────────────┴────────────────────────────────────────────┐
│                   API Gateway Layer                             │
│  - REST Endpoints (CRUD + read queries)                         │
│  - WebSocket Server (real-time market updates)                  │
│  - Request validation + rate limiting                           │
│  - Authentication (SIWE)                                        │
└────────┬──────────────────┬──────────────────┬──────────────────┘
         │                  │                  │
    ┌────▼─────┐    ┌──────▼──────┐    ┌──────▼──────┐
    │ Solana   │    │   Solana    │    │  Solana    │
    │ RPC      │    │   Program   │    │  RPC       │
    │ (Read)   │    │   (Write)   │    │ (Subscribe)│
    └────┬─────┘    └──────┬──────┘    └──────┬──────┘
         │                 │                   │
┌────────┴─────────────────┼───────────────────┴──────────────────┐
│                  Solana Blockchain (Devnet)                    │
│                                                                 │
│  ┌──────────────────┐  ┌──────────────────┐                   │
│  │  zmart-core      │  │ zmart-proposal   │                   │
│  │  (21 instr.)     │  │ (voting mgmt)    │                   │
│  └──────────────────┘  └──────────────────┘                   │
└─────────────┬──────────────────────────────────────────────────┘
              │ Events
┌─────────────┴──────────────────────────────────────────────────┐
│              Event Indexer (Phase 2, Week 5)                  │
│                                                                 │
│  ┌─────────────────────────────────────────────────────┐      │
│  │ Helius Webhook Listener (subscribed to program)     │      │
│  │ - Monitors zmart-core transactions                  │      │
│  │ - Captures MarketCreated, StateChanged, etc events  │      │
│  │ - Writes raw events to event_logs table             │      │
│  └─────────────────────────────────────────────────────┘      │
└─────────────┬──────────────────────────────────────────────────┘
              │
┌─────────────┴──────────────────────────────────────────────────┐
│            Vote Aggregator (Phase 2, Week 4)                  │
│                                                                 │
│  ┌─────────────────────────────────────────────────────┐      │
│  │ Vote Collection (Redis cache)                       │      │
│  │ - Accumulates proposal votes (like/dislike)         │      │
│  │ - Accumulates dispute votes (support/reject)        │      │
│  │ - Validates vote eligibility                        │      │
│  └─────────────────────────────────────────────────────┘      │
│                                                                 │
│  ┌─────────────────────────────────────────────────────┐      │
│  │ Vote Aggregation Cron (every 5 minutes)             │      │
│  │ - Calculate vote percentages                        │      │
│  │ - Check if thresholds met (70%/60%)                 │      │
│  │ - Call on-chain aggregation instructions            │      │
│  │ - Record aggregation results                        │      │
│  └─────────────────────────────────────────────────────┘      │
└─────────────┬──────────────────────────────────────────────────┘
              │
┌─────────────┴──────────────────────────────────────────────────┐
│         Market Monitor (Phase 2, Week 7)                       │
│                                                                 │
│  ┌─────────────────────────────────────────────────────┐      │
│  │ Automatic State Transitions                         │      │
│  │ - Monitor time-based state changes                  │      │
│  │ - Trigger finalization after dispute period         │      │
│  │ - Handle resolution timeouts                        │      │
│  │ - Implement circuit breakers                        │      │
│  └─────────────────────────────────────────────────────┘      │
│                                                                 │
│  ┌─────────────────────────────────────────────────────┐      │
│  │ Market Health Monitoring                            │      │
│  │ - Detect stuck markets (no state change)            │      │
│  │ - Alert on anomalies                                │      │
│  │ - Trigger manual resolution if needed               │      │
│  └─────────────────────────────────────────────────────┘      │
└─────────────┬──────────────────────────────────────────────────┘
              │
┌─────────────┴──────────────────────────────────────────────────┐
│           Database Layer (Supabase PostgreSQL)                │
│                                                                 │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐          │
│  │ markets      │ │ votes        │ │ event_logs   │          │
│  └──────────────┘ └──────────────┘ └──────────────┘          │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐          │
│  │ positions    │ │ trades       │ │ aggregation  │          │
│  └──────────────┘ └──────────────┘ └──────────────┘          │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐          │
│  │ claims       │ │ discussions  │ │ alerts       │          │
│  └──────────────┘ └──────────────┘ └──────────────┘          │
└──────────────────────────────────────────────────────────────────┘
```

---

## Service Deep Dives

### 1. Vote Aggregator Service (Week 4)

**Purpose:** Collect off-chain votes and trigger on-chain aggregation when thresholds are met.

**Architecture Pattern:** Event-sourcing with Redis cache + CQRS (Command Query Responsibility Segregation)

#### Data Flow

```
User Vote Request
    ↓
API Validation (user eligible, market in PROPOSED/DISPUTED)
    ↓
Record Vote in Database (vote_records table)
    ↓
Update Redis Cache (vote_tally:{market_id}:{vote_type})
    ↓
Return Confirmation to Frontend
```

#### Vote Aggregation Cron (Every 5 minutes)

```
1. Query all active voting periods (PROPOSED markets + DISPUTED markets)
2. For each market:
   a. Count votes from Redis cache
   b. Calculate percentage: (yes_votes / total_votes) * 10000
   c. Compare to threshold (70% = 7000 bps for proposals, 60% = 6000 bps for disputes)
   d. If threshold met:
      - Call aggregate_proposal_votes or aggregate_dispute_votes on-chain
      - Record aggregation result in database
      - Update market state in database (mirror on-chain state)
      - Clear Redis cache for this market
      - Emit event: VotesAggregated
   e. If threshold not met but voting period expired:
      - Record no consensus reached
      - Transition market state (stays PROPOSED if < 70%)
3. Store aggregation metadata (vote counts, timestamp, block hash)
```

#### High Availability Strategy

**Circuit Breaker Pattern:**
```javascript
- If on-chain calls fail 3x in a row → pause aggregation
- Log alert to monitoring system
- Switch to manual operation (human review required)
- Retry with exponential backoff (5m → 10m → 20m)
```

**Data Consistency:**
```javascript
- Cache votes in Redis (fast, temporary)
- Persist votes in database (durable, queryable)
- On-chain vote records immutable proof
- Database is source-of-truth for aggregation state
```

#### Critical Implementation Details

**Vote Eligibility:**
- Proposal votes: Any wallet with Solana account
- Dispute votes: Only wallets with position in that market
- Weight calculation: Position size for disputes

**Duplicate Prevention:**
- Check vote_records table before accepting vote
- PDA-based on-chain checks prevent double-voting

**Threshold Precision:**
- Use u64 basis points (10000 = 100%)
- Example: 7000 bps = 70% exactly (per blueprint)
- Comparison: `(yes_votes * 10000) / total_votes >= 7000`

---

### 2. Event Indexer Infrastructure (Week 5)

**Purpose:** Listen to blockchain events and synchronize market state.

**Architecture Pattern:** Event-streaming with ordered log (append-only audit trail)

#### Event Flow

```
Solana Blockchain Transaction
    ↓
Program emits event (e.g., MarketCreated{market_id, creator, ...})
    ↓
Helius Webhook detects event
    ↓
Webhook sends POST to API /webhooks/events
    ↓
Event parser identifies type (MarketCreated, StateChanged, etc.)
    ↓
Write to event_logs table (immutable record)
    ↓
Trigger state synchronization
    ↓
Update market state in markets table
    ↓
Emit internal event (for WebSocket subscribers)
    ↓
Frontend receives real-time update
```

#### Helius Webhook Setup

```javascript
// Subscribe to program transactions
const webhookConfig = {
  transactionTypes: ["all"],
  accountAddresses: ["7h3gXfBfYFueFVLYyfL5Qo1QGsf4GQUfW96FKVgnUsJS"], // Program ID
  webhook: "https://api.zmart.dev/webhooks/events",
  encoding: "json",
  commitment: "confirmed"
};

// Helius will send POST to /webhooks/events with:
// {
//   transaction: {...full tx details...},
//   meta: {slot, blockTime, ...},
//   nativeTransfers: [...],
//   tokenTransfers: [...],
//   accountData: [...],
//   instructions: [
//     {
//       program: "zmart_core",
//       data: {...parsed instruction...},
//       accounts: {...}
//     }
//   ]
// }
```

#### Event Types to Index

**From zmart-core program events:**
```javascript
1. ProposalAggregated
   - market_id
   - proposal_likes, proposal_dislikes
   - approval_percentage
   - new_state (PROPOSED → APPROVED if 70%+)

2. DisputeAggregated
   - market_id
   - dispute_agree, dispute_disagree
   - agreement_percentage
   - outcome_flipped (bool)
   - new_state

3. MarketCreated
   - market_id
   - creator
   - b_parameter
   - ipfs_question_hash

4. MarketStateChanged
   - market_id
   - old_state
   - new_state
   - timestamp

5. WinningsClaimed
   - market_id
   - user
   - amount_claimed

6. ConfigUpdated
   - protocol_fee_bps
   - resolver_reward_bps
   - liquidity_provider_fee_bps
   - proposal_approval_threshold
   - dispute_success_threshold

7. ProtocolPauseStatusChanged
   - is_paused
   - paused_by
   - timestamp

8. MarketCancelled
   - market_id
   - cancelled_by
   - cancelled_at
```

#### State Synchronization Strategy

**Eventual Consistency Model:**
```
Blockchain State (Source of Truth)
         ↓
    Event Indexer (reads events)
         ↓
Database State (cache, eventually consistent)
         ↓
API Query Results
         ↓
Frontend Display
```

**Reconciliation:**
- Every 10 minutes: Query on-chain state, compare to database
- If mismatch: Log discrepancy, trigger manual review
- For critical states: Real-time verification on read path

#### Webhook Security

```javascript
// Verify webhook signature (Helius)
const isValid = verifyWebhookSignature(body, signature, secret);
if (!isValid) return 401;

// Rate limiting per program
const programId = "7h3gXfBfYFueFVLYyfL5Qo1QGsf4GQUfW96FKVgnUsJS";
rateLimit.check(programId, {
  windowMs: 60000,
  maxRequests: 1000 // 1000 events per minute
});

// Idempotency (prevent double-processing)
const eventHash = crypto.sha256(JSON.stringify(event));
if (await db.eventLogs.exists(eventHash)) return 200; // Already processed
```

---

### 3. API Gateway Upgrades (Week 4-6)

**Purpose:** Serve real-time market data and handle user interactions.

**Current Status:** 95% complete (REST endpoints exist)
**Phase 2 Work:** WebSocket real-time updates + event-driven responses

#### New WebSocket Endpoints

```javascript
// Subscribe to market updates
ws://api.zmart.dev/markets/{market_id}
// Receives: {type: 'STATE_CHANGE', market: {...}}

// Subscribe to user position updates
ws://api.zmart.dev/users/{user_pubkey}/positions
// Receives: {type: 'POSITION_UPDATE', position: {...}}

// Subscribe to voting updates (for watching vote progress)
ws://api.zmart.dev/markets/{market_id}/voting
// Receives: {type: 'VOTE_UPDATE', likes: 100, dislikes: 30}

// Subscribe to alerts (circuit breaker triggers, stuck markets)
ws://api.zmart.dev/alerts
// Receives: {type: 'ALERT', severity: 'HIGH', message: '...'}
```

#### Real-Time Update Flow

```
Database Record Updated (e.g., vote_records insert)
    ↓
PostgreSQL trigger fires
    ↓
Notify websocket subscribers
    ↓
Express/ws broadcasts update
    ↓
Frontend receives live update
```

**Implementation:**
```javascript
// In database migration:
CREATE TRIGGER vote_updated AFTER INSERT ON vote_records
FOR EACH ROW EXECUTE FUNCTION notify_websocket();

// In PostgreSQL function:
CREATE FUNCTION notify_websocket() RETURNS trigger AS $$
BEGIN
  PERFORM pg_notify('market_' || NEW.market_id,
    json_build_object('type', 'VOTE_UPDATE', 'votes', row_to_json(NEW))::text
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

// In Node.js:
const subscription = client.subscribe(['market_' + marketId]);
subscription.on('message', (message) => {
  broadcast(wsClients, message); // Send to all WebSocket subscribers
});
```

#### API Gateway Rate Limiting

```
Tier 1 (Unauthenticated):
- 100 requests/minute per IP
- Used for: Public market queries, health checks

Tier 2 (Authenticated):
- 1000 requests/minute per user
- Used for: Position queries, vote submissions

Tier 3 (Backend Services):
- Unlimited per authenticated backend service
- Used for: Internal vote aggregator calls

Tier 4 (Circuit Breaker):
- Automatic 503 if too many errors
- Prevents cascading failures
```

---

### 4. Market Monitor Service (Week 7)

**Purpose:** Autonomously manage market state transitions and health.

**Architecture Pattern:** Finite State Machine (FSM) + Scheduler + Circuit Breaker

#### Market State Transitions (Automated)

```javascript
PROPOSED
  ├─ Timeout (24h) → Manual review needed
  ├─ 70% approval → APPROVED (via vote aggregator)
  └─ Admin cancel → CANCELLED

APPROVED
  ├─ Activation (by creator) → ACTIVE
  └─ Admin cancel → CANCELLED

ACTIVE
  ├─ Market end condition → Manual RESOLVING request
  └─ Admin pause (emergency) → Markets can't trade

RESOLVING
  ├─ 48h dispute window expires → FINALIZED (auto)
  └─ Dispute initiated → DISPUTED (by user)

DISPUTED
  ├─ 60% agree with dispute → RESOLVING (outcome flipped)
  ├─ <60% agree → FINALIZED (outcome unchanged)
  └─ Dispute timeout (3 days) → FINALIZED (auto)

FINALIZED
  ├─ Claims enabled (auto)
  └─ Creator can withdraw liquidity (auto)

CANCELLED (Terminal)
  └─ No further transitions (admin only)
```

#### Automatic State Transitions

```javascript
// Week 7, Every 1 minute:
async function checkMarketTransitions() {
  // 1. Find markets ready to transition
  const marketsReadyToResolve = await db.query(`
    SELECT * FROM markets
    WHERE state = 'ACTIVE'
    AND now() - activated_at >= resolution_window
  `);

  // 2. For each: trigger resolution window
  for (const market of marketsReadyToResolve) {
    try {
      // Call resolve_market instruction on-chain
      const tx = await program.methods
        .resolveMarket(market.proposed_outcome, market.ipfs_evidence)
        .accounts({market: market.pubkey, resolver: authority})
        .rpc({commitment: 'confirmed'});

      // Record in database
      await db.markets.update(market.id, {
        state: 'RESOLVING',
        resolution_proposed_at: new Date(),
        last_action: 'auto_resolved'
      });

      // Broadcast event
      broadcast(wsClients, {
        type: 'MARKET_STATE_CHANGED',
        market_id: market.id,
        new_state: 'RESOLVING'
      });

    } catch (error) {
      // Circuit breaker
      if (consecutiveErrors >= 3) {
        await db.alerts.create({
          severity: 'HIGH',
          message: `Market ${market.id} resolution failed 3x. Manual review needed.`,
          alert_type: 'RESOLUTION_TIMEOUT'
        });
        consecutiveErrors = 0; // Reset
      }
    }
  }

  // 3. Check for stuck markets (no state change in 30 days)
  const stuckMarkets = await db.query(`
    SELECT * FROM markets
    WHERE state != 'FINALIZED' AND state != 'CANCELLED'
    AND now() - GREATEST(created_at, approved_at, activated_at) > interval '30 days'
  `);

  for (const market of stuckMarkets) {
    await db.alerts.create({
      severity: 'MEDIUM',
      market_id: market.id,
      message: `Market ${market.id} has not progressed in 30+ days`,
      alert_type: 'STUCK_MARKET'
    });
  }
}
```

#### Circuit Breaker Implementation

```javascript
class CircuitBreaker {
  constructor(threshold = 5, windowMs = 60000) {
    this.failureCount = 0;
    this.threshold = threshold;
    this.windowMs = windowMs;
    this.state = 'CLOSED'; // CLOSED → OPEN → HALF_OPEN → CLOSED
    this.nextRetryTime = null;
  }

  async execute(fn, fallback) {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextRetryTime) {
        return fallback ? fallback() : Promise.reject('Circuit open');
      }
      this.state = 'HALF_OPEN';
    }

    try {
      const result = await fn();
      if (this.state === 'HALF_OPEN') {
        this.state = 'CLOSED';
        this.failureCount = 0;
      }
      return result;
    } catch (error) {
      this.failureCount++;
      if (this.failureCount >= this.threshold) {
        this.state = 'OPEN';
        this.nextRetryTime = Date.now() + this.windowMs;
        // Alert operational team
        await alerting.send('CircuitBreakerOpen', {
          service: 'market_monitor',
          error: error.message
        });
      }
      throw error;
    }
  }
}

// Usage
const breaker = new CircuitBreaker(3, 60000); // 3 failures → open for 60s
await breaker.execute(
  () => callResolveMarket(market),
  () => manualEscalation(market)
);
```

#### Health Monitoring Metrics

```javascript
// Collect every minute:
const metrics = {
  // Vote aggregation
  votes_pending: (await db.votes.count({aggregated: false})),
  aggregation_lag_seconds: (now - last_aggregation_time),

  // Event indexing
  events_indexed_per_minute: (new_events_count),
  indexing_lag_blocks: (current_block - last_indexed_block),

  // Market states
  markets_by_state: {
    PROPOSED: count,
    APPROVED: count,
    ACTIVE: count,
    RESOLVING: count,
    DISPUTED: count,
    FINALIZED: count,
    CANCELLED: count
  },
  stuck_markets: (markets_no_change_7days),

  // System health
  active_websocket_connections: connection_count,
  api_error_rate_percent: (errors / requests * 100),
  database_connection_pool_utilization: (active / total),

  // Circuit breakers
  circuit_breaker_state: {
    market_transitions: 'CLOSED|OPEN|HALF_OPEN',
    vote_aggregation: 'CLOSED|OPEN|HALF_OPEN',
    event_indexing: 'CLOSED|OPEN|HALF_OPEN'
  }
};

// Alert thresholds:
if (aggregation_lag_seconds > 600) alert('CRITICAL');    // 10 min
if (indexing_lag_blocks > 100) alert('HIGH');             // 100 blocks
if (api_error_rate > 5) alert('HIGH');                    // 5%
if (stuck_markets > 10) alert('MEDIUM');                  // 10+ markets
```

---

## Week-by-Week Implementation Plan (Weeks 4-7)

### Week 4: Vote Aggregator (80 hours)

**Days 1-2: Design & Architecture**
- [ ] Create vote aggregator service scaffold
- [ ] Design Redis cache schema (vote_tally:{market_id}:{vote_type})
- [ ] Plan aggregation cron job (every 5 minutes)
- [ ] Document vote eligibility rules

**Days 3-4: Core Implementation**
- [ ] Implement vote validation logic
- [ ] Build vote collection endpoint (POST /votes/proposal, /votes/dispute)
- [ ] Implement Redis caching layer
- [ ] Add vote deduplication checks

**Days 5: Aggregation Logic**
- [ ] Implement vote counting algorithm
- [ ] Build threshold calculation (70% for proposal, 60% for dispute)
- [ ] Create cron job scheduler
- [ ] Implement on-chain aggregation call

**Days 6-7: Testing & Deployment**
- [ ] Write unit tests (vote validation, counting, threshold)
- [ ] Integration tests (end-to-end vote flow)
- [ ] Deploy to staging environment
- [ ] Manual testing with devnet

**Success Criteria:**
- ✅ Vote collection API working
- ✅ Votes accumulating in Redis
- ✅ Cron job executing every 5 minutes
- ✅ On-chain aggregation calls succeeding
- ✅ 100+ integration tests passing

---

### Week 5: Event Indexer (100 hours)

**Days 1-2: Helius Webhook Setup**
- [ ] Configure Helius webhook for zmart-core program
- [ ] Create webhook receiver endpoint (/webhooks/events)
- [ ] Implement webhook signature verification
- [ ] Add idempotency checking

**Days 3-4: Event Parser**
- [ ] Build event type discriminator
- [ ] Implement parsers for all event types
- [ ] Map on-chain events to database updates
- [ ] Handle event versioning (future updates)

**Days 5: Event Storage**
- [ ] Create event_logs table schema
- [ ] Implement batch event writes
- [ ] Add event query API (/events/{market_id})
- [ ] Create event search/filter endpoints

**Days 6-7: State Synchronization**
- [ ] Build market state updater (reads events, updates markets table)
- [ ] Implement reconciliation check (every 10 min)
- [ ] Create discrepancy alerting
- [ ] Deploy to staging

**Success Criteria:**
- ✅ Webhook receiving events from devnet
- ✅ Events properly parsed and stored
- ✅ Market state synchronized within 10 seconds
- ✅ Reconciliation checks detecting mismatches
- ✅ Zero event loss or duplication

---

### Week 6: API Gateway Upgrades (60 hours)

**Days 1-2: WebSocket Infrastructure**
- [ ] Upgrade Express.js with WebSocket support (ws library)
- [ ] Implement connection management
- [ ] Build subscription/unsubscription logic
- [ ] Add authentication for WebSocket connections

**Days 3-4: Real-Time Updates**
- [ ] Create PostgreSQL trigger for vote_records updates
- [ ] Implement market state change broadcasts
- [ ] Build position update notifications
- [ ] Add voting progress tracking (like/dislike counts)

**Days 5: Rate Limiting & Circuit Breaker**
- [ ] Implement tiered rate limiting (100/1000/unlimited)
- [ ] Add circuit breaker for API endpoints
- [ ] Create health check endpoint
- [ ] Build graceful degradation

**Days 6-7: Testing & Deployment**
- [ ] Load test WebSocket connections (1000+ concurrent)
- [ ] Test real-time update latency (<100ms target)
- [ ] Verify rate limiting under load
- [ ] Deploy to staging with monitoring

**Success Criteria:**
- ✅ WebSocket accepting 1000+ connections
- ✅ Real-time updates delivered <100ms
- ✅ Rate limiting preventing abuse
- ✅ Circuit breaker activating on errors
- ✅ Zero message loss

---

### Week 7: Market Monitor (80 hours)

**Days 1-2: State Transition Scheduler**
- [ ] Build FSM state machine
- [ ] Implement cron job (every 1 minute)
- [ ] Create state transition validators
- [ ] Plan automatic vs. manual transitions

**Days 3-4: Automatic Transitions**
- [ ] Implement RESOLVING auto-trigger (time-based)
- [ ] Implement DISPUTED → FINALIZED (time + vote-based)
- [ ] Implement FINALIZED claims enablement
- [ ] Add timeout detection (30+ day markets)

**Days 5: Circuit Breaker & Alerts**
- [ ] Implement circuit breaker for state transitions
- [ ] Build alert system (Slack/email integration)
- [ ] Create stuck market detection
- [ ] Add health monitoring dashboard

**Days 6-7: Testing & Deployment**
- [ ] Test all state transition paths
- [ ] Simulate stuck market scenarios
- [ ] Verify circuit breaker activation
- [ ] Deploy to staging with monitoring

**Success Criteria:**
- ✅ All automatic transitions working
- ✅ No manual intervention needed for normal flows
- ✅ Stuck markets detected within 5 minutes
- ✅ Circuit breaker preventing cascading failures
- ✅ 30+ day uptime stability

---

## Critical Integration Points

### Vote Aggregator ↔ Event Indexer

```
Proposal Vote Flow:
1. User votes via API
2. Vote stored in DB + Redis
3. Cron counts votes at T+5min
4. If 70%+ → call aggregate_proposal_votes on-chain
5. Event emitted: ProposalAggregated
6. Event Indexer picks up event
7. Market transitions to APPROVED
8. Frontend notified via WebSocket

Data Consistency:
- Database vote_records: Source of truth
- Redis cache: Temporary accumulation (can be lost)
- On-chain vote records: Immutable proof
- Database markets table: State mirror (eventual consistency)
```

### Event Indexer ↔ Market Monitor

```
Automatic RESOLVING Flow:
1. Market activation time recorded
2. Monitor checks: current_time - activated_at >= resolution_window
3. If true, calls resolve_market instruction on-chain
4. On-chain emits MarketStateChanged event
5. Event Indexer picks up event
6. Updates market.state = RESOLVING
7. Broadcasts WebSocket update
8. Frontend shows dispute window active
9. Users can vote on dispute

Critical: Market states must be in sync!
- On-chain: Source of truth (immutable)
- Database: Cache (must eventually match)
- Discrepancies: Reconciliation every 10 min
```

### API Gateway ↔ All Services

```
WebSocket Real-Time Updates:
- Market state changes: Via Event Indexer
- Vote progress: Via Vote Aggregator
- Position changes: Via on-chain trades
- Alerts: Via Market Monitor

Connection Handling:
- Keep-alive ping every 30s
- Reconnect with exponential backoff
- State synchronization on reconnect
- Graceful disconnection (browser close)
```

---

## Data Consistency & Conflict Resolution

### Eventual Consistency Model

```
Timeline:
T+0:   User submits vote
T+1:   Vote written to database
T+5:   Vote in Redis cache
T+10:  Cron job counts votes
T+12:  On-chain instruction submitted
T+15:  Block confirmed (Solana devnet ~400ms per block)
T+20:  Event emitted by program
T+25:  Event Indexer picks up event
T+30:  Database state updated
T+35:  WebSocket broadcast
T+40:  Frontend receives update

Maximum latency: 40s (acceptable for Phase 2)
```

### Conflict Resolution Strategy

**Scenario 1: Double Voting**
```
User attempts to vote twice:
- First vote: Stored in DB, checked in dedup logic ✅
- Second vote: Rejected by API validation ✅
- On-chain: PDA-based dedup prevents double vote ✅
Resolution: Prevent at API layer, validate on-chain
```

**Scenario 2: State Mismatch (DB vs On-Chain)**
```
Example: Database says PROPOSED, On-chain says APPROVED

Detection (every 10 minutes):
1. Query on-chain market state
2. Compare to database state
3. If mismatch:
   a. Log discrepancy with details
   b. Trust on-chain (source of truth)
   c. Update database to match on-chain
   d. Alert operations team
   e. Investigate root cause

Prevention:
- Event Indexer should catch all state changes
- Reconciliation catches missed events
- Review logs if mismatches frequent
```

**Scenario 3: Vote Aggregation Race**
```
Two cron jobs run simultaneously:
1. Prevent with distributed lock in Redis
2. First job acquires lock for market_id
3. Second job waits and sees lock, skips
4. First job releases lock after completing aggregation
5. Next cycle runs normally

Implementation:
```javascript
const lockKey = `lock:aggregate:${marketId}`;
const lockValue = uuid();
const acquired = await redis.set(
  lockKey,
  lockValue,
  'EX', 60,      // 60 second expiry
  'NX'           // Only if not exists
);

if (!acquired) {
  console.log(`Aggregation in progress for ${marketId}, skipping`);
  return;
}

try {
  // Perform aggregation
  await aggregateVotes(marketId);
} finally {
  // Release lock if still ours (prevent stale locks)
  const current = await redis.get(lockKey);
  if (current === lockValue) {
    await redis.del(lockKey);
  }
}
```

---

## High Availability & Disaster Recovery

### Redundancy Strategy

```
Single Point of Failure → Multiple Instances

Vote Aggregator:
- 2+ instances (load balanced)
- Shared Redis (managed service)
- Shared database (Supabase replication)

Event Indexer:
- 2+ webhook receivers
- Fallback: RPC polling every minute (if webhook fails)
- Event deduplication prevents double-processing

API Gateway:
- 3+ instances behind load balancer
- Health check every 10 seconds
- Automatic instance removal if unhealthy

Market Monitor:
- 2+ instances (one is leader via distributed lock)
- Failover if leader dies (TTL on lock)
```

### Backup & Recovery

```
Nightly Backups (00:00 UTC):
- Export event_logs (immutable, critical)
- Export market state (point-in-time snapshot)
- Store on S3 with 30-day retention

Recovery Procedure:
1. Detect data corruption / loss
2. Stop services to prevent writes
3. Restore from S3 backup
4. Reconcile with blockchain (source of truth)
5. Restart services
6. Verify consistency (reconciliation check)

RTO: 1 hour (restore + verify)
RPO: 1 hour (since last backup)
```

---

## Monitoring & Observability

### Key Metrics to Track

```javascript
// Vote Aggregation
- votes_collected_per_minute
- aggregation_success_rate
- aggregation_lag_seconds
- votes_per_market
- threshold_met_count

// Event Indexing
- events_received_per_minute
- webhook_latency_ms
- event_processing_lag_seconds
- discrepancies_found_per_reconciliation
- missed_events_count

// API Gateway
- http_requests_per_second
- websocket_connections_active
- p99_latency_ms
- error_rate_percent
- rate_limit_violations_per_minute

// Market Monitor
- automatic_transitions_per_hour
- circuit_breaker_activations
- stuck_markets_detected
- manual_interventions_required
- market_state_discrepancies
```

### Alerting Rules

```
CRITICAL (Page on-call):
- Circuit breaker open for >5 minutes
- Vote aggregation lag >10 minutes
- Event indexing lag >100 blocks
- API error rate >10%
- Stuck markets >50

HIGH (Slack notification):
- Vote aggregation lag >5 minutes
- Event indexing lag >50 blocks
- API error rate >5%
- Stuck markets >10
- WebSocket connection drop >50%

MEDIUM (Log only):
- Vote aggregation lag >2 minutes
- Any state discrepancy detected
- Rate limit violations >1000/hour
```

---

## Critical Blockers Before Week 4

### Must Complete Before Phase 2 Starts

**1. Deploy Solana Programs**
```
- zmart-core program: Deploy to devnet
  Status: ✅ COMPLETE (Program ID: 7h3gXfBfYFueFVLYyfL5Qo1QGsf4GQUfW96FKVgnUsJS)

- zmart-proposal program: May not be needed if voting done in zmart-core
  Status: Need clarity on architecture
```

**2. Environment Configuration**
```
.env variables needed:
- SOLANA_RPC_ENDPOINT = "https://api.devnet.solana.com"
- SOLANA_PROGRAM_ID = "7h3gXfBfYFueFVLYyfL5Qo1QGsf4GQUfW96FKVgnUsJS"
- BACKEND_AUTHORITY_KEYPAIR = (path to keypair for calling aggregation)
- SUPABASE_URL = (Supabase project URL)
- SUPABASE_KEY = (Supabase anon key)
- SUPABASE_SERVICE_KEY = (for admin operations)
- REDIS_URL = "redis://..."
- HELIUS_API_KEY = (for webhooks)
- HELIUS_WEBHOOK_URL = "https://api.zmart.dev/webhooks/events"
```

**3. Database Setup**
```
- Create Supabase project
- Run migrations (8 tables already defined)
- Create indexes for performance
- Enable RLS policies
- Test connections from backend
```

**4. Wallet Setup**
```
- Create backend_authority keypair (for calling aggregation instructions)
- Fund wallet with SOL (for transaction fees)
- Verify wallet can sign transactions
- Test transaction submission
```

**5. Testing Harness**
```
- Local devnet instance (optional but helpful)
- Test vote collection endpoint
- Test vote aggregation call
- Verify state transitions on-chain
```

---

## Risk Assessment

### High-Risk Items

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| **Vote double-submission** | Medium | High | PDA dedup on-chain, API validation |
| **Event loss / duplication** | Low | High | Idempotency checks, event logging |
| **State drift (DB ↔ chain)** | Medium | High | 10-min reconciliation, alerts |
| **Circuit breaker cascade** | Low | Critical | Stagger timeouts, manual escalation |
| **Helius webhook downtime** | Low | Medium | RPC polling fallback |
| **Vote threshold off by 1** | Low | Critical | Exact u64 math, hardened tests |

### Mitigation Strategy

1. **Circuit Breaker Pattern:** Prevent cascading failures
2. **Reconciliation:** Detect and fix state drift automatically
3. **Idempotency Keys:** Prevent duplicate event processing
4. **Distributed Locks:** Prevent concurrent job conflicts
5. **Comprehensive Logging:** Audit trail for debugging
6. **Manual Escalation:** Human review for edge cases

---

## Success Metrics (End of Week 7)

### Technical Metrics

- ✅ Vote aggregation: 100% success rate, <5min latency
- ✅ Event indexing: 100% events captured, <10s state sync
- ✅ API gateway: 99.9% uptime, <100ms p99 latency
- ✅ Market monitor: 100% auto-transitions, zero stuck markets
- ✅ Zero data loss across all services
- ✅ Circuit breaker: <1% false positive activation rate

### Operational Metrics

- ✅ Alerts: <5 per day (normal operations)
- ✅ Manual interventions: <1 per week
- ✅ Monitoring dashboard: 100% metrics visible
- ✅ Logs: Searchable, queryable, 30-day retention
- ✅ On-call runbooks: Created for all critical scenarios

### Load Testing Metrics

- ✅ 100+ concurrent users: <200ms p99 latency
- ✅ 1000+ votes per minute: Aggregation still <5min latency
- ✅ 1000+ WebSocket connections: <100ms message delivery
- ✅ 100+ markets: Monitor handles all without slowdown

---

## Summary

**Phase 2 is a complex integration exercise** requiring careful coordination of 4 services:
1. **Vote Aggregator** - Off-chain vote collection + on-chain recording
2. **Event Indexer** - Blockchain event synchronization
3. **API Gateway** - Real-time WebSocket updates
4. **Market Monitor** - Autonomous state management

**Critical Success Factors:**
- Eventual consistency model (Database ≠ On-chain, but reconciles)
- Circuit breaker pattern (Prevent cascading failures)
- Comprehensive monitoring (Detect issues early)
- Manual escalation path (Human override when needed)

**Risks are manageable** with the proposed mitigations, but this is where system complexity increases substantially. Phase 1 was primarily programming; Phase 2 is systems integration.

**Timeline is aggressive but achievable** with two full-time engineers and clear task breakdown.

