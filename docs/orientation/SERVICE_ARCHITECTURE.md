# SERVICE_ARCHITECTURE.md - ZMART V0.69 Service Architecture

**Last Updated:** November 8, 2025
**Purpose:** Visual and detailed explanation of how all services connect and interact
**Audience:** Developers, DevOps, architects

---

## 🎯 Purpose

This document answers:
- How do all the services fit together?
- What is the data flow between components?
- How does on-chain data reach the database?
- How do users interact with the system?
- What happens during each user action?

**See Also:**
- [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md) - Complete file tree
- [ENVIRONMENT_GUIDE.md](./ENVIRONMENT_GUIDE.md) - Environment variables
- [CREDENTIALS_MAP.md](./CREDENTIALS_MAP.md) - Credential usage

---

## 🏗️ High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         ZMART V0.69                             │
│                 Prediction Market Platform                      │
└─────────────────────────────────────────────────────────────────┘

┌──────────────┐        ┌──────────────┐        ┌──────────────┐
│   Frontend   │◄──────►│   Backend    │◄──────►│   Solana     │
│   Next.js    │  HTTP  │   Services   │  RPC   │  Blockchain  │
│  (Week 10+)  │  WS    │   (Node.js)  │        │   (Devnet)   │
└──────────────┘        └──────────────┘        └──────────────┘
                               │
                               │ SQL
                               ▼
                        ┌──────────────┐
                        │   Supabase   │
                        │  PostgreSQL  │
                        └──────────────┘
```

---

## 🔄 Complete System Diagram

```
┌───────────────────────────────────────────────────────────────────────┐
│                          USER INTERACTIONS                            │
└───────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
                    ▼               ▼               ▼
            ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
            │   Wallet     │ │   Browser    │ │  Mobile App  │
            │  (Phantom)   │ │   (Chrome)   │ │   (Future)   │
            └──────────────┘ └──────────────┘ └──────────────┘
                    │               │               │
                    └───────────────┼───────────────┘
                                    │
                                    │ HTTP/WebSocket
                                    │
┌───────────────────────────────────▼───────────────────────────────────┐
│                         FRONTEND LAYER (Week 10+)                     │
├───────────────────────────────────────────────────────────────────────┤
│  Next.js 14 App Router                                                │
│  - Market Listing UI                                                  │
│  - Trading Interface                                                  │
│  - Voting Interface                                                   │
│  - User Profile                                                       │
│  - Real-time Updates (WebSocket)                                      │
└───────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
                    │ REST API      │ WebSocket     │ Wallet Adapter
                    │               │               │
┌───────────────────▼───────────────▼───────────────▼───────────────────┐
│                          BACKEND SERVICES                             │
├───────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  API Gateway (Week 6)                                        │    │
│  │  - REST: GET /markets, /trades, /positions                   │    │
│  │  - WebSocket: Real-time price/trade updates                  │    │
│  │  - Auth: Wallet signature verification                       │    │
│  │  Port: 3000                                                   │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                           │                                           │
│                           │ SQL Queries                               │
│                           │                                           │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  Event Indexer (Week 5 - 85% Complete)                       │    │
│  │  - Helius Webhook Listener: POST /helius                     │    │
│  │  - Parse Solana transaction logs                             │    │
│  │  - Write to Supabase: markets, trades, positions             │    │
│  │  Port: 3001                                                   │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                           ▲                                           │
│                           │ Webhook (HTTP POST)                       │
│                           │                                           │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  Vote Aggregator (Week 4 - 50% Complete)                     │    │
│  │  - POST /votes/proposal, /votes/dispute                      │    │
│  │  - Cache votes in Redis                                      │    │
│  │  - Aggregate every 5 min → submit on-chain                   │    │
│  │  Port: 3002                                                   │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                           │                                           │
│                           │ Anchor Client                             │
│                           │                                           │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  Market Monitor (Week 5 - 75% Complete)                      │    │
│  │  - Cron job every 5 min                                      │    │
│  │  - Find markets in RESOLVING state (48h+ old)                │    │
│  │  - Auto-finalize → FINALIZED                                 │    │
│  │  - Log errors to market_finalization_errors                  │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                           │                                           │
│                           │ SQL + Anchor Client                       │
│                           │                                           │
└───────────────────────────┼───────────────────────────────────────────┘
                            │
            ┌───────────────┼───────────────┐
            │               │               │
            │ SQL           │ RPC           │
            │               │               │
┌───────────▼───────────────┼───────────────▼───────────────────────────┐
│  DATABASE LAYER           │           BLOCKCHAIN LAYER                │
├───────────────────────────┤   ┌───────────────────────────────────────┤
│                           │   │                                       │
│  ┌─────────────────┐      │   │  ┌─────────────────────────────┐    │
│  │   Supabase      │      │   │  │  Helius RPC Service         │    │
│  │   PostgreSQL    │      │   │  │  - Enhanced Solana RPC      │    │
│  │                 │      │   │  │  - Transaction webhooks      │    │
│  │  Tables:        │      │   │  │  - Events: devnet           │    │
│  │  - markets      │◄─────┼───┼──┤    https://devnet.helius-   │    │
│  │  - trades       │      │   │  │    rpc.com                   │    │
│  │  - positions    │      │   │  └─────────────────────────────┘    │
│  │  - votes        │      │   │               │                      │
│  │  - discussions  │      │   │               │ Events               │
│  │  - errors       │      │   │               │                      │
│  └─────────────────┘      │   │               ▼                      │
│                           │   │  ┌─────────────────────────────┐    │
└───────────────────────────┘   │  │  Solana Devnet              │    │
                                │  │                              │    │
                                │  │  Programs:                   │    │
                                │  │  ┌─────────────────────────┐ │    │
                                │  │  │ zmart-core              │ │    │
                                │  │  │ 18 instructions:        │ │    │
                                │  │  │ - Trading (buy/sell)    │ │    │
                                │  │  │ - Voting (TODO Week 1)  │ │    │
                                │  │  │ - Resolution            │ │    │
                                │  │  │ - Admin                 │ │    │
                                │  │  └─────────────────────────┘ │    │
                                │  │  ┌─────────────────────────┐ │    │
                                │  │  │ zmart-proposal          │ │    │
                                │  │  │ (TODO Week 2)           │ │    │
                                │  │  └─────────────────────────┘ │    │
                                │  └─────────────────────────────┘    │
                                └───────────────────────────────────────┘
```

---

## 🔀 Data Flow Diagrams

### Flow 1: User Buys Shares

```
┌──────────┐
│  User    │
│ (Wallet) │
└────┬─────┘
     │ 1. Sign transaction
     │    (buy 10 YES shares)
     ▼
┌──────────────────┐
│   Frontend UI    │
└────┬─────────────┘
     │ 2. Submit tx to Solana
     │    via Wallet Adapter
     ▼
┌────────────────────────────────┐
│  Solana Devnet                 │
│  ┌──────────────────────────┐  │
│  │  zmart-core Program      │  │
│  │  - Validate state        │  │
│  │  - Calculate cost (LMSR) │  │
│  │  - Transfer SOL          │  │
│  │  - Update q_yes          │  │
│  │  - Emit TradeEvent       │  │
│  └──────────────────────────┘  │
└────┬───────────────────────────┘
     │ 3. Transaction confirmed
     │    Event emitted
     ▼
┌──────────────────────────────┐
│  Helius RPC Service          │
│  - Detects TradeEvent        │
│  - Sends webhook             │
└────┬─────────────────────────┘
     │ 4. POST /helius
     │    {event: "trade", data: {...}}
     ▼
┌──────────────────────────────┐
│  Event Indexer               │
│  - Parse transaction logs    │
│  - Extract trade data        │
│  - Write to Supabase         │
└────┬─────────────────────────┘
     │ 5. INSERT INTO trades
     │    UPDATE user_positions
     ▼
┌──────────────────────────────┐
│  Supabase PostgreSQL         │
│  - trades table updated      │
│  - user_positions updated    │
└────┬─────────────────────────┘
     │ 6. Database NOTIFY
     │    (PostgreSQL LISTEN)
     ▼
┌──────────────────────────────┐
│  API Gateway WebSocket       │
│  - Broadcast to clients:     │
│    "trade_executed"          │
└────┬─────────────────────────┘
     │ 7. WebSocket message
     ▼
┌──────────────────────────────┐
│  Frontend UI                 │
│  - Update price chart        │
│  - Update user position      │
│  - Show success notification │
└──────────────────────────────┘
```

**Timeline:** ~2-5 seconds end-to-end

---

### Flow 2: User Votes on Proposal

```
┌──────────┐
│  User    │
└────┬─────┘
     │ 1. Submit vote: "APPROVE"
     ▼
┌──────────────────┐
│   Frontend UI    │
└────┬─────────────┘
     │ 2. POST /votes/proposal
     │    {market_id, vote: "APPROVE", signature}
     ▼
┌────────────────────────────────┐
│  Vote Aggregator Service       │
│  - Verify wallet signature     │
│  - Store in Redis cache        │
│  - Return: "Vote recorded"     │
└────┬───────────────────────────┘
     │ 3. Cache updated
     │
     │ [Every 5 minutes: Cron Job]
     │
     ▼
┌────────────────────────────────┐
│  Vote Aggregator Cron          │
│  - Read all votes from Redis   │
│  - Count: YES=45, NO=5         │
│  - Calculate: 90% YES          │
└────┬───────────────────────────┘
     │ 4. aggregate_proposal_votes
     │    instruction
     ▼
┌────────────────────────────────┐
│  Solana Devnet                 │
│  ┌──────────────────────────┐  │
│  │  zmart-proposal Program  │  │
│  │  - Record aggregated vote│  │
│  │  - Check threshold (70%) │  │
│  │  - Emit VoteAggregated   │  │
│  └──────────────────────────┘  │
└────┬───────────────────────────┘
     │ 5. Transaction confirmed
     ▼
┌────────────────────────────────┐
│  Helius Webhook                │
└────┬───────────────────────────┘
     │ 6. POST /helius
     ▼
┌────────────────────────────────┐
│  Event Indexer                 │
│  - Write to vote_records       │
└────┬───────────────────────────┘
     │ 7. UPDATE vote_records
     ▼
┌────────────────────────────────┐
│  Supabase PostgreSQL           │
└────┬───────────────────────────┘
     │ 8. WebSocket broadcast
     ▼
┌────────────────────────────────┐
│  Frontend UI                   │
│  - Show: "Proposal APPROVED"   │
└────────────────────────────────┘
```

**Timeline:** Vote recorded instantly, aggregated within 5 min

---

### Flow 3: Market Auto-Finalization

```
     [Cron: Every 5 minutes]
            │
            ▼
┌────────────────────────────────┐
│  Market Monitor Service        │
│  - Query Supabase:             │
│    SELECT * FROM markets       │
│    WHERE state = 'RESOLVING'   │
│    AND resolution_proposed_at  │
│        < NOW() - 48 hours      │
└────┬───────────────────────────┘
     │ Found: Market ABC (49h old)
     ▼
┌────────────────────────────────┐
│  Market Monitor                │
│  - Build finalize_market tx    │
│  - Sign with admin wallet      │
│  - Submit to Solana            │
└────┬───────────────────────────┘
     │ Success?
     ├─ YES ──────────────────────┐
     │                            ▼
     │                     ┌──────────────────┐
     │                     │  Helius Webhook  │
     │                     │  Event Indexer   │
     │                     │  Supabase        │
     │                     │  (Flow 1)        │
     │                     └──────────────────┘
     │
     └─ NO (RPC error) ───────────┐
                                  ▼
                    ┌─────────────────────────────┐
                    │  Market Monitor             │
                    │  - Log to Supabase:         │
                    │    INSERT INTO              │
                    │    market_finalization_     │
                    │    errors (...)             │
                    └─────────────────────────────┘
                                  │
                                  ▼
                    ┌─────────────────────────────┐
                    │  Admin Dashboard (Future)   │
                    │  - Alert admin              │
                    │  - Show manual retry option │
                    └─────────────────────────────┘
```

**Timeline:** 48h dispute window + up to 5 min cron delay

---

## 🔧 Service Details

### 1. Event Indexer Service

**Purpose:** Listen for on-chain events and sync to database

**Technology:**
- Express.js HTTP server
- Helius webhook endpoint
- Supabase client

**Endpoints:**
- `POST /helius` - Receive Helius webhooks

**Process:**
1. Helius detects transaction on Solana
2. Helius sends webhook to Event Indexer
3. Event Indexer parses transaction logs
4. Event Indexer writes to Supabase

**Tables Written:**
- `markets` - Market creation/state changes
- `trades` - Buy/sell transactions
- `user_positions` - User position updates
- `vote_records` - Vote aggregation results

**Configuration:**
```typescript
// backend/event-indexer/src/index.ts
PORT=3001
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
PROGRAM_ID=...
```

**Status:** 85% Complete
- ✅ Webhook endpoint
- ✅ Transaction parser
- ✅ Supabase writer
- ⚠️ Needs: Helius webhook registration

---

### 2. Vote Aggregator Service

**Purpose:** Collect off-chain votes and submit aggregated results on-chain

**Technology:**
- Express.js HTTP server
- Redis for caching
- Anchor client for on-chain submission

**Endpoints:**
- `POST /votes/proposal` - Submit proposal vote
- `POST /votes/dispute` - Submit dispute vote
- `GET /votes/proposal/:market_id` - Get current vote count

**Process:**
1. User submits vote via API
2. Vote stored in Redis (fast cache)
3. Every 5 min: Aggregate votes from Redis
4. Submit aggregated count on-chain (1 transaction for all votes)
5. Clear Redis cache for that market

**Why Off-Chain First?**
- **Cost:** 1 transaction for 100 votes vs 100 transactions
- **Speed:** Instant vote recording (no blockchain wait)
- **UX:** User sees "Vote recorded" immediately

**Configuration:**
```typescript
// backend/vote-aggregator/src/index.ts
PORT=3002
REDIS_URL=redis://localhost:6379
SOLANA_RPC_URL=...
PROGRAM_ID=...
VOTE_AGGREGATION_INTERVAL=300000 // 5 min
```

**Status:** 50% Complete
- ✅ Vote collection API
- ✅ Redis caching
- ⚠️ Needs: Aggregation cron job
- ⚠️ Needs: On-chain submission

---

### 3. Market Monitor Service

**Purpose:** Automatically finalize markets after dispute window

**Technology:**
- Node.js cron job
- Supabase client (query markets)
- Anchor client (finalize on-chain)

**No Endpoints** - Background service only

**Process:**
1. Every 5 min: Query Supabase for RESOLVING markets
2. Find markets where `resolution_proposed_at < NOW() - 48 hours`
3. For each market:
   - Submit `finalize_market` transaction
   - If success: Event Indexer updates state
   - If failure: Log to `market_finalization_errors` table

**Configuration:**
```typescript
// backend/src/services/market-monitor/config.ts
MARKET_MONITOR_INTERVAL=300000 // 5 min
SUPABASE_URL=...
SOLANA_RPC_URL=...
ADMIN_WALLET_ADDRESS=...
```

**Status:** 75% Complete
- ✅ Market query logic
- ✅ Finalization transaction
- ✅ Error logging
- ⚠️ Needs: PM2 deployment

---

### 4. API Gateway (FUTURE - Week 6)

**Purpose:** REST API + WebSocket for frontend

**Technology:**
- Express.js HTTP server
- WebSocket server (Socket.IO or ws)
- Supabase client

**Endpoints (REST):**
- `GET /markets` - List all markets
- `GET /markets/:id` - Get market details
- `GET /markets/:id/trades` - Get trade history
- `GET /positions/:wallet` - Get user positions
- `GET /votes/:market_id` - Get vote status

**WebSocket Events:**
- `market_created` - New market created
- `trade_executed` - Trade confirmed
- `price_updated` - LMSR price changed
- `market_finalized` - Market resolved

**Configuration:**
```typescript
// backend/src/api/server.ts
PORT=3000
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

**Status:** 0% (Week 6 task)

---

## 🔗 Service Dependencies

```
API Gateway
├─ Depends on: Supabase (read)
└─ Used by: Frontend

Event Indexer
├─ Depends on: Helius (webhooks), Supabase (write)
└─ Used by: All services (indirectly via database)

Vote Aggregator
├─ Depends on: Redis, Supabase, Solana RPC
└─ Used by: Frontend (POST votes)

Market Monitor
├─ Depends on: Supabase (read), Solana RPC (write)
└─ Used by: None (autonomous background service)

Supabase
├─ Depends on: None
└─ Used by: All backend services

Helius
├─ Depends on: Solana Devnet
└─ Used by: Event Indexer

Solana Programs
├─ Depends on: None
└─ Used by: Vote Aggregator, Market Monitor, Frontend (via Wallet)
```

---

## 📊 Service Communication Matrix

| From → To | Event Indexer | Vote Aggregator | Market Monitor | API Gateway | Supabase | Solana |
|-----------|---------------|-----------------|----------------|-------------|----------|--------|
| **Event Indexer** | - | - | - | - | ✅ Write | - |
| **Vote Aggregator** | - | - | - | - | ✅ Write | ✅ RPC |
| **Market Monitor** | - | - | - | - | ✅ Read/Write | ✅ RPC |
| **API Gateway** | - | - | - | - | ✅ Read | - |
| **Helius** | ✅ Webhook | - | - | - | - | ✅ Monitor |
| **Frontend** | - | ✅ POST | - | ✅ REST/WS | - | ✅ Wallet |

**Legend:**
- ✅ **Write** - Inserts/updates data
- ✅ **Read** - Queries data
- ✅ **RPC** - Sends transactions
- ✅ **Webhook** - HTTP POST notification
- ✅ **REST/WS** - REST API + WebSocket
- ✅ **Wallet** - Wallet Adapter (direct)
- ✅ **POST** - HTTP POST endpoint
- ✅ **Monitor** - Passive monitoring

---

## 🚀 Deployment Architecture

### Development (Current)

```
┌─────────────────────────────────────┐
│  Local Machine (macOS)              │
│                                     │
│  ┌───────────────────────────────┐  │
│  │  Event Indexer                │  │
│  │  npm run dev (Port 3001)      │  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌───────────────────────────────┐  │
│  │  Vote Aggregator              │  │
│  │  npm run dev (Port 3002)      │  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌───────────────────────────────┐  │
│  │  Market Monitor               │  │
│  │  pm2 start (Background)       │  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌───────────────────────────────┐  │
│  │  Redis                        │  │
│  │  brew services start redis    │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
           │
           │ SQL
           ▼
┌─────────────────────────────────────┐
│  Supabase Cloud                     │
│  https://tkkqqxepelibqjjhxxct...    │
└─────────────────────────────────────┘
```

### Production (Future)

```
┌─────────────────────────────────────┐
│  Frontend (Vercel)                  │
│  - Next.js SSR                      │
│  - Edge Functions                   │
└─────────────────────────────────────┘
           │
           │ HTTPS
           ▼
┌─────────────────────────────────────┐
│  Backend Services (Railway/VPS)     │
│                                     │
│  PM2 Process Manager:               │
│  ├─ API Gateway (Port 3000)         │
│  ├─ Event Indexer (Port 3001)       │
│  ├─ Vote Aggregator (Port 3002)     │
│  └─ Market Monitor (Background)     │
│                                     │
│  Redis (Managed)                    │
└─────────────────────────────────────┘
           │
           │ SQL
           ▼
┌─────────────────────────────────────┐
│  Supabase Production                │
│  - PostgreSQL (Managed)             │
│  - Daily backups                    │
│  - Read replicas                    │
└─────────────────────────────────────┘
```

---

## 🔐 Security Boundaries

### Public Internet ↔ Backend Services

**Authentication:**
- API Gateway: Wallet signature verification (SIWE)
- Event Indexer: Helius webhook signature verification
- Vote Aggregator: Wallet signature verification

**Protection:**
- Rate limiting (10 req/sec per IP)
- CORS (allow specific origins only)
- HTTPS only (no HTTP)

### Backend Services ↔ Supabase

**Authentication:**
- Service role key (bypasses RLS)
- Connection pooling
- SSL/TLS encryption

**Protection:**
- Row Level Security (RLS) policies
- Prepared statements (prevent SQL injection)
- Environment variables (no hardcoded keys)

### Backend Services ↔ Solana

**Authentication:**
- Admin wallet keypair (for Market Monitor)
- Transaction signatures

**Protection:**
- Anchor program constraints (account validation)
- Rate limiting (RPC provider)
- Fallback RPC endpoints

---

## 📈 Scalability Considerations

### Current Capacity (Week 5)

| Metric | Limit | Bottleneck |
|--------|-------|------------|
| Concurrent Users | ~100 | WebSocket connections |
| Trades/Second | ~5 | Solana RPC rate limit |
| Markets | ~1,000 | Database queries |
| Votes/Second | ~50 | Redis throughput |

### Future Optimizations (Post-V1)

1. **Database:**
   - Read replicas for GET endpoints
   - Connection pooling (PgBouncer)
   - Caching layer (Redis)

2. **Backend:**
   - Horizontal scaling (multiple instances)
   - Load balancer (Nginx)
   - CDN for static assets

3. **Blockchain:**
   - Multiple RPC providers
   - Transaction batching
   - Geyser plugin (direct blockchain stream)

---

## 🧪 Testing Strategy

### Unit Tests

```
programs/zmart-core/
└─ tests/
   ├─ lmsr.test.ts        # LMSR math
   ├─ state.test.ts       # State transitions
   └─ instructions.test.ts # Each instruction

backend/
├─ event-indexer/tests/
│  └─ parser.test.ts      # Event parsing
├─ vote-aggregator/tests/
│  └─ aggregation.test.ts # Vote aggregation
└─ market-monitor/tests/
   └─ finalization.test.ts # Auto-finalization
```

### Integration Tests

```
backend/scripts/
├─ test-api-lifecycle.ts  # Full market lifecycle
├─ test-integration.ts    # Service integration
└─ test-db-connection.ts  # Database connectivity
```

### E2E Tests (Week 8-9)

```
test-data/
└─ e2e/
   ├─ create-market.test.ts
   ├─ trading-flow.test.ts
   ├─ voting-flow.test.ts
   └─ resolution-flow.test.ts
```

---

## 🔍 Monitoring & Observability

### Logs

**Location:** `backend/logs/`

```
backend/logs/
├─ combined.log                # All logs
├─ error.log                   # Error logs only
├─ market-monitor-combined.log # Market Monitor
└─ market-monitor-out.log      # Market Monitor stdout
```

**Log Format:**
```json
{
  "timestamp": "2025-11-08T01:37:00Z",
  "level": "info",
  "service": "event-indexer",
  "message": "Trade event processed",
  "data": {
    "market_id": "abc123",
    "amount": 1000000000
  }
}
```

### Metrics (Future)

```
┌─────────────────────────────────────┐
│  Prometheus / Grafana               │
│                                     │
│  Dashboards:                        │
│  - Transactions/sec                 │
│  - Database query time              │
│  - RPC response time                │
│  - Error rates                      │
│  - WebSocket connections            │
└─────────────────────────────────────┘
```

---

## 📖 Related Documentation

**Essential Reading:**
1. [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md) - Complete file tree
2. [ENVIRONMENT_GUIDE.md](./ENVIRONMENT_GUIDE.md) - Environment variables
3. [CREDENTIALS_MAP.md](./CREDENTIALS_MAP.md) - Credential usage
4. [CLAUDE.md](../CLAUDE.md) - Claude Code instructions

**Implementation Specs:**
- [03_SOLANA_PROGRAM_DESIGN.md](./03_SOLANA_PROGRAM_DESIGN.md) - Program instructions
- [07_ON_CHAIN_OFF_CHAIN_INTEGRATION.md](./07_ON_CHAIN_OFF_CHAIN_INTEGRATION.md) - Hybrid architecture
- [08_DATABASE_SCHEMA.md](./08_DATABASE_SCHEMA.md) - Database schema

**Quick Navigation:**
- [00_MASTER_INDEX.md](./00_MASTER_INDEX.md) - Complete navigation hub
- [IMPLEMENTATION_PHASES.md](./IMPLEMENTATION_PHASES.md) - 14-week roadmap
- [TODO_CHECKLIST.md](./TODO_CHECKLIST.md) - Daily progress tracking

---

**Last Updated:** November 8, 2025
**Maintainer:** Claude Code
**Version:** 1.0
