# ZMART Backend Architecture

**Version**: 0.69.0
**Last Updated**: November 9, 2025
**Architecture Pattern**: Microservices with Event-Driven Communication

---

## Table of Contents

- [System Overview](#system-overview)
- [Service Architecture](#service-architecture)
- [Data Flow Diagrams](#data-flow-diagrams)
- [Technology Stack](#technology-stack)
- [Database Schema](#database-schema)
- [State Machines](#state-machines)
- [External Dependencies](#external-dependencies)
- [Deployment Architecture](#deployment-architecture)
- [Security Architecture](#security-architecture)
- [Scaling Strategy](#scaling-strategy)

---

## System Overview

The ZMART backend is a **microservices architecture** designed for:
- **High Availability**: PM2 process management with auto-restart
- **Real-time Updates**: WebSocket server with Redis pub/sub
- **Blockchain Integration**: Solana program interaction via Anchor
- **Event-Driven**: Helius webhooks for blockchain events
- **Scalable**: Horizontal scaling via Redis and stateless services

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         External Systems                                 │
├──────────────┬──────────────┬──────────────┬──────────────┬────────────┤
│   Frontend   │   Solana     │   Helius     │   Supabase   │   Redis    │
│  (Next.js)   │ Blockchain   │  Webhooks    │  PostgreSQL  │   Cache    │
└──────┬───────┴──────┬───────┴──────┬───────┴──────┬───────┴─────┬──────┘
       │              │              │              │             │
       │ HTTP/WS      │ RPC          │ POST         │ SQL         │ Cache
       │              │              │              │             │
       ▼              ▼              ▼              ▼             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       ZMART Backend Services (PM2)                       │
├─────────────────┬───────────────┬───────────────┬──────────────────────┤
│  API Gateway    │  WebSocket    │ Vote Aggreg.  │  Market Monitor      │
│  (port 4000)    │  (port 4001)  │ (cron 5min)   │  (cron 5min)         │
│                 │               │               │                      │
│  ┌──────────┐   │ ┌──────────┐  │ ┌──────────┐  │ ┌──────────┐         │
│  │ Routes   │   │ │  Redis   │  │ │ Proposal │  │ │ State    │         │
│  │ Handler  │───┼─│  Pub/Sub │  │ │ Votes    │  │ │ FSM      │         │
│  └──────────┘   │ └──────────┘  │ └──────────┘  │ └──────────┘         │
│       │         │      │        │      │        │      │               │
│  ┌──────────┐   │ ┌──────────┐  │ ┌──────────┐  │ ┌──────────┐         │
│  │Middleware│   │ │Connection│  │ │ Dispute  │  │ │ Auto     │         │
│  │  Chain   │   │ │  Manager │  │ │ Votes    │  │ │Finalize  │         │
│  └──────────┘   │ └──────────┘  │ └──────────┘  │ └──────────┘         │
│       │         │      │        │      │        │      │               │
│  ┌──────────┐   │ ┌──────────┐  │ ┌──────────┐  │ ┌──────────┐         │
│  │  Auth    │   │ │Broadcast │  │ │On-chain  │  │ │Resolving │         │
│  │  (SIWE)  │   │ │  Events  │  │ │  Calls   │  │ │→Final    │         │
│  └──────────┘   │ └──────────┘  │ └──────────┘  │ └──────────┘         │
└─────────────────┴───────────────┴───────────────┴──────────────────────┘
                            │
                            ▼
            ┌────────────────────────────────────┐
            │       Event Indexer (port 4002)     │
            ├────────────────────────────────────┤
            │  ┌──────────┐   ┌──────────┐       │
            │  │ Helius   │   │  Event   │       │
            │  │ Webhook  │──▶│  Parser  │       │
            │  └──────────┘   └──────────┘       │
            │       │              │             │
            │       ▼              ▼             │
            │  ┌──────────┐   ┌──────────┐       │
            │  │Signature │   │ Database │       │
            │  │  Verify  │   │  Writer  │       │
            │  └──────────┘   └──────────┘       │
            └────────────────────────────────────┘
```

---

## Service Architecture

### 1. API Gateway (REST API)

**Purpose**: Central HTTP API for frontend integration

**Architecture**:
```
HTTP Request
    ↓
Middleware Chain:
    1. Morgan (logging)
    2. Helmet (security headers)
    3. CORS (cross-origin)
    4. Rate Limiting (100 req/min)
    5. Body Parsing (JSON)
    6. Validation (Joi schemas)
    7. Authentication (SIWE + JWT)
    8. Route Handler
    ↓
Response (JSON)
```

**Key Components**:
- **Routes** (`src/api/routes/`):
  - `markets.ts` - Market CRUD operations
  - `trades.ts` - Buy/sell share endpoints
  - `votes.ts` - Proposal/dispute vote submission
  - `users.ts` - User profile management
  - `discussions.ts` - Comment system

- **Middleware** (`src/api/middleware/`):
  - `auth.ts` - SIWE + JWT verification
  - `validation.ts` - Request schema validation
  - `error-handler.ts` - Centralized error responses
  - `rate-limiter.ts` - Request throttling

- **Database Access**:
  - Supabase client with RLS (Row Level Security)
  - Service role key for admin operations
  - Anon key for user-scoped queries

**Technology**:
- Express 4.18
- Joi validation
- express-rate-limit
- helmet (security)

---

### 2. WebSocket Server (Real-Time Updates)

**Purpose**: Push real-time market price updates and events to connected clients

**Architecture**:
```
WebSocket Connection
    ↓
Authentication (JWT)
    ↓
Connection Manager
    ↓
Redis Pub/Sub
    ↓
Broadcast to Subscribers
```

**Key Components**:
- **Server** (`src/services/websocket/server.ts`):
  - WebSocket server (ws library)
  - Connection lifecycle management
  - Heartbeat/ping-pong for connection health

- **Realtime Handler** (`src/services/websocket/realtime.ts`):
  - Subscribe/unsubscribe to channels
  - Redis pub/sub integration
  - Message broadcasting to clients

- **Redis Pub/Sub Channels**:
  - `market:{marketId}:update` - Market state changes
  - `market:{marketId}:price` - LMSR price updates
  - `market:{marketId}:trade` - New trades executed
  - `global:vote` - New votes submitted

**Message Flow**:
```
Database Change (Supabase)
    ↓
API Gateway / Event Indexer
    ↓
Redis PUBLISH (channel, message)
    ↓
WebSocket Server (subscribed to Redis)
    ↓
Broadcast to connected clients
```

**Scaling**:
- Multiple WebSocket instances can run
- Redis pub/sub ensures all instances broadcast the same events
- Clients automatically reconnect if connection drops

**Technology**:
- ws 8.14
- ioredis 5.3
- JWT authentication

---

### 3. Vote Aggregator (Cron Service)

**Purpose**: Aggregate off-chain votes and submit to blockchain

**Architecture**:
```
Cron Trigger (every 5 minutes)
    ↓
Fetch markets in PROPOSED state (Supabase)
    ↓
For each market:
    1. Fetch proposal_votes (like/dislike)
    2. Calculate approval rate (likes / total * 100)
    3. Check threshold (>= 70% = 7000 bps)
    4. If met: Call approve_market() on-chain
    5. Update market state to APPROVED in Supabase
    ↓
Broadcast updates via WebSocket
```

**Proposal Workflow**:
```
User submits vote → API Gateway → Supabase (proposal_votes)
                                        ↓
                                  Vote Aggregator (cron)
                                        ↓
                          Aggregate votes per market
                                        ↓
                              Check threshold (70%)
                                        ↓
                       Yes → Call approve_market() on-chain
                                        ↓
                          Update Supabase (state = APPROVED)
                                        ↓
                            Broadcast via WebSocket
```

**Dispute Workflow** (similar pattern):
```
Market in DISPUTED state → Vote Aggregator (dispute.ts)
                                ↓
                    Aggregate dispute_votes (agree/disagree)
                                ↓
                        Check threshold (60%)
                                ↓
                    Yes → Overturn original outcome
                     No → Keep original outcome
                                ↓
                    Call finalize_market() on-chain
                                ↓
                    Update Supabase (state = FINALIZED)
```

**Technology**:
- node-cron (scheduled execution)
- @coral-xyz/anchor (Solana program calls)
- Redis (vote caching)

---

### 4. Market Monitor (Cron Service)

**Purpose**: Automated market state transitions based on time

**Architecture**:
```
Cron Trigger (every 5 minutes)
    ↓
Fetch markets in RESOLVING state (Supabase)
    ↓
For each market:
    1. Check if 48 hours elapsed since resolution_proposed_at
    2. If yes: Auto-transition to FINALIZED
    3. Call finalize_market() on-chain (if no dispute)
    4. Update Supabase (state = FINALIZED)
    ↓
Broadcast updates via WebSocket
```

**State Monitoring**:
```
Market States:
    PROPOSED → APPROVED → ACTIVE → RESOLVING → DISPUTED? → FINALIZED

Market Monitor Responsibilities:
    - RESOLVING → FINALIZED (after 48 hours)
    - Detect stuck markets (state hasn't changed in 7+ days)
    - Alert on failed state transitions
```

**Technology**:
- node-cron
- @coral-xyz/anchor
- Supabase

---

### 5. Event Indexer (Webhook Listener)

**Purpose**: Real-time blockchain event indexing via Helius webhooks

**Architecture**:
```
Solana Blockchain (on-chain events)
    ↓
Helius Enhanced Webhooks
    ↓
POST /helius/webhook (Event Indexer)
    ↓
Signature Verification (HMAC-SHA256)
    ↓
Event Parser (MarketCreated, TradeExecuted, etc.)
    ↓
Database Writers (markets, trades, votes, admin tables)
    ↓
Supabase (PostgreSQL)
    ↓
WebSocket Broadcast (real-time updates to frontend)
```

**Event Types**:
1. **Market Events**:
   - `MarketCreated` - New market initialized
   - `MarketApproved` - Proposal approved
   - `MarketActivated` - Market active for trading
   - `MarketResolved` - Outcome proposed
   - `MarketDisputed` - Dispute initiated
   - `MarketFinalized` - Final outcome set

2. **Trade Events**:
   - `TradeExecuted` - Buy or sell shares
   - `SharesTransferred` - Share ownership change

3. **Vote Events**:
   - `ProposalVoteSubmitted` - Like/dislike vote
   - `DisputeVoteSubmitted` - Agree/disagree with resolution

4. **Admin Events**:
   - `GlobalConfigUpdated` - Admin config change
   - `MarketEmergencyPaused` - Emergency stop
   - `MarketCancelled` - Market cancelled by admin

**Technology**:
- Express (webhook endpoint)
- crypto (HMAC verification)
- Anchor (event parsing)
- Supabase (database writes)

**Documentation**: [event-indexer/README.md](./event-indexer/README.md)

---

### 6. IPFS Service (Disabled for MVP)

**Purpose**: Daily snapshots of discussions to IPFS for decentralization

**Status**: ❌ Disabled (Supabase is sufficient for MVP)

**Future Architecture** (when re-enabled):
```
Cron Trigger (daily at midnight UTC)
    ↓
Fetch all discussions from Supabase
    ↓
Group by market_id
    ↓
Create JSON snapshot per market
    ↓
Upload to Pinata IPFS
    ↓
Store IPFS hash in Supabase (markets.discussion_snapshot_cid)
```

---

## Data Flow Diagrams

### User Trading Flow

```
┌─────────┐                  ┌─────────┐                ┌──────────┐
│ Frontend│                  │   API   │                │  Solana  │
│         │                  │ Gateway │                │ Blockchain│
└────┬────┘                  └────┬────┘                └────┬─────┘
     │                            │                          │
     │ 1. POST /api/trades/buy    │                          │
     │ { marketId, shares }       │                          │
     ├───────────────────────────▶│                          │
     │                            │                          │
     │                            │ 2. Validate request      │
     │                            │    (auth, funds, market) │
     │                            │                          │
     │                            │ 3. Call buy_shares()     │
     │                            ├─────────────────────────▶│
     │                            │                          │
     │                            │ 4. Execute on-chain      │
     │                            │    (LMSR calculation)    │
     │                            │                          │
     │                            │◀─────────────────────────┤
     │                            │ 5. Transaction signature │
     │                            │                          │
     │ 6. Return tx signature     │                          │
     │◀───────────────────────────┤                          │
     │                            │                          │
     │                            │ 7. Blockchain emits      │
     │                            │    TradeExecuted event   │
     │                            │                          │
     ▼                            ▼                          ▼
```

**Then asynchronously**:
```
┌──────────┐         ┌──────────┐        ┌──────────┐         ┌──────────┐
│  Helius  │         │  Event   │        │ Supabase │         │WebSocket │
│          │         │ Indexer  │        │          │         │          │
└────┬─────┘         └────┬─────┘        └────┬─────┘         └────┬─────┘
     │                    │                    │                    │
     │ 1. Webhook         │                    │                    │
     │   TradeExecuted    │                    │                    │
     ├───────────────────▶│                    │                    │
     │                    │                    │                    │
     │                    │ 2. Parse event     │                    │
     │                    │                    │                    │
     │                    │ 3. Write to trades │                    │
     │                    ├───────────────────▶│                    │
     │                    │                    │                    │
     │                    │ 4. Redis PUBLISH   │                    │
     │                    ├────────────────────┼───────────────────▶│
     │                    │                    │                    │
     │                    │                    │ 5. Broadcast to    │
     │                    │                    │    all clients     │
     │                    │                    │                    │
     ▼                    ▼                    ▼                    ▼
```

---

### Proposal Voting Flow

```
┌─────────┐         ┌─────────┐         ┌──────────┐        ┌──────────┐
│ User A  │         │   API   │         │ Supabase │        │  Vote    │
│         │         │ Gateway │         │          │        │Aggregator│
└────┬────┘         └────┬────┘         └────┬─────┘        └────┬─────┘
     │                   │                   │                   │
     │ 1. POST /votes/   │                   │                   │
     │    proposal       │                   │                   │
     │    { vote: true } │                   │                   │
     ├──────────────────▶│                   │                   │
     │                   │                   │                   │
     │                   │ 2. Validate       │                   │
     │                   │                   │                   │
     │                   │ 3. INSERT into    │                   │
     │                   │    proposal_votes │                   │
     │                   ├──────────────────▶│                   │
     │                   │                   │                   │
     │◀──────────────────┤                   │                   │
     │ 4. Return success │                   │                   │
     │                   │                   │                   │
     │                   │                   │ 5. Cron trigger   │
     │                   │                   │    (every 5 min)  │
     │                   │                   │◀──────────────────┤
     │                   │                   │                   │
     │                   │                   │ 6. Fetch markets  │
     │                   │                   │    in PROPOSED    │
     │                   │                   ├──────────────────▶│
     │                   │                   │                   │
     │                   │                   │ 7. Fetch votes    │
     │                   │                   │    per market     │
     │                   │                   ├──────────────────▶│
     │                   │                   │                   │
     │                   │                   │                   │ 8. Aggregate
     │                   │                   │                   │    (70% check)
     │                   │                   │                   │
     │                   │                   │ 9. If threshold   │
     │                   │                   │    met, call      │
     │                   │                   │    approve_market │
     │                   │                   │                   │
     ▼                   ▼                   ▼                   ▼
```

---

### Real-Time Price Update Flow

```
┌──────────┐      ┌──────────┐      ┌──────────┐      ┌──────────┐
│ Frontend │      │WebSocket │      │  Redis   │      │   API    │
│ Client   │      │  Server  │      │  Pub/Sub │      │ Gateway  │
└────┬─────┘      └────┬─────┘      └────┬─────┘      └────┬─────┘
     │                 │                 │                 │
     │ 1. Connect WS   │                 │                 │
     ├────────────────▶│                 │                 │
     │                 │                 │                 │
     │                 │ 2. Auth (JWT)   │                 │
     │                 │                 │                 │
     │ 3. Subscribe to │                 │                 │
     │   market:123    │                 │                 │
     ├────────────────▶│                 │                 │
     │                 │                 │                 │
     │                 │ 4. Redis        │                 │
     │                 │   SUBSCRIBE     │                 │
     │                 ├────────────────▶│                 │
     │                 │                 │                 │
     │                 │                 │                 │ 5. Trade
     │                 │                 │                 │    executed
     │                 │                 │                 │
     │                 │                 │ 6. PUBLISH      │
     │                 │                 │   market:123:   │
     │                 │                 │   price         │
     │                 │                 │◀────────────────┤
     │                 │                 │                 │
     │                 │ 7. Receive msg  │                 │
     │                 │   from Redis    │                 │
     │                 │◀────────────────┤                 │
     │                 │                 │                 │
     │ 8. price_update │                 │                 │
     │   broadcast     │                 │                 │
     │◀────────────────┤                 │                 │
     │                 │                 │                 │
     ▼                 ▼                 ▼                 ▼
```

---

## Technology Stack

### Core Technologies

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Runtime** | Node.js | 18+ | JavaScript runtime |
| **Language** | TypeScript | 5.3 | Type-safe development |
| **Process Manager** | PM2 | Latest | Service orchestration |
| **Web Framework** | Express | 4.18 | HTTP server |
| **WebSocket** | ws | 8.14 | Real-time connections |
| **Database** | Supabase | 2.38 | PostgreSQL + RLS |
| **Cache** | Redis | 7.x | In-memory data store |
| **Blockchain** | Solana | Devnet/Mainnet | Smart contracts |
| **Solana SDK** | @solana/web3.js | 1.95 | Blockchain interaction |
| **Anchor** | @coral-xyz/anchor | 0.32 | Solana program framework |
| **Testing** | Jest | 29.7 | Unit/integration tests |
| **Logging** | Winston | 3.11 | Structured logging |
| **Validation** | Joi | 17.11 | Schema validation |
| **Security** | Helmet | 7.1 | HTTP security headers |
| **CORS** | cors | 2.8 | Cross-origin handling |
| **Rate Limiting** | express-rate-limit | 7.1 | Request throttling |

### External Services

| Service | Purpose | Environment Variable |
|---------|---------|---------------------|
| **Helius** | Blockchain webhooks | N/A (registered via dashboard) |
| **Supabase** | PostgreSQL database + Auth | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` |
| **Pinata** | IPFS pinning (disabled for MVP) | `IPFS_PROJECT_ID`, `IPFS_PROJECT_SECRET` |
| **Solana RPC** | Blockchain interaction | `SOLANA_RPC_URL` |

---

## Database Schema

### Supabase PostgreSQL Tables

**Core Tables**:
1. **markets** - Prediction market metadata
2. **trades** - Buy/sell transactions
3. **user_positions** - User share holdings
4. **proposal_votes** - Market approval votes
5. **dispute_votes** - Resolution dispute votes
6. **discussions** - Comment threads
7. **users** - User profiles

**Event Indexer Tables** (from Helius):
8. **market_events** - Market state changes
9. **trade_events** - Trade executions
10. **vote_events** - Vote submissions
11. **admin_events** - Admin actions

**Full Schema**: See [event-indexer/docs/IMPLEMENTATION_GUIDE.md](./event-indexer/docs/IMPLEMENTATION_GUIDE.md#database-schema)

### Row Level Security (RLS)

All tables have RLS policies enabled:
- **Public Read**: Markets, trades (anonymized)
- **User Read**: Own positions, votes, discussions
- **User Write**: Own votes, discussions
- **Admin Write**: Service role key for backend operations

---

## State Machines

### Market State Machine

```
┌──────────┐
│ PROPOSED │ ← Market created, awaiting approval votes
└─────┬────┘
      │ Vote aggregation: >= 70% approval
      ▼
┌──────────┐
│ APPROVED │ ← Proposal approved, awaiting activation
└─────┬────┘
      │ Creator calls activate_market()
      ▼
┌──────────┐
│  ACTIVE  │ ← Trading enabled, users can buy/sell shares
└─────┬────┘
      │ Creator proposes outcome
      ▼
┌──────────┐
│RESOLVING │ ← 48-hour dispute window open
└─────┬────┘
      │
      ├─────────────┐
      │             │
      │ No dispute  │ Dispute initiated (>= 10% vote)
      │             │
      ▼             ▼
┌──────────┐   ┌──────────┐
│FINALIZED │   │ DISPUTED │
│          │   └─────┬────┘
│Outcome   │         │ Dispute voting (3 days)
│ settled  │         │
│          │         ▼
│          │   ┌──────────┐
│          │   │FINALIZED │
│          │   │          │
│          │   │Outcome:  │
│          │   │ >= 60%   │
│          │   │ agree?   │
│          │   │ Overturn │
│          │   │ : Keep   │
└──────────┘   └──────────┘
```

**State Transitions**:
- `PROPOSED → APPROVED`: Vote Aggregator (automatic, cron)
- `APPROVED → ACTIVE`: Market creator (manual on-chain call)
- `ACTIVE → RESOLVING`: Market creator proposes outcome (manual)
- `RESOLVING → DISPUTED`: Any user initiates dispute (manual)
- `RESOLVING → FINALIZED`: Market Monitor (automatic after 48h)
- `DISPUTED → FINALIZED`: Vote Aggregator (automatic after 3 days)

---

## External Dependencies

### Blockchain (Solana)

**Programs**:
- **zmart-core**: Main program (markets, trades, resolution)
  - ID: `7h3gXfBfYFueFVLYyfL5Qo1QGsf4GQUfW96FKVgnUsJS`
- **zmart-proposal**: Voting program
  - ID: `3XDU9r97qqJRdgqKJEWDYSJesPAUbLqsejXus4WLuhAQ`

**RPC Endpoints**:
- Devnet: `https://api.devnet.solana.com`
- Mainnet: `https://api.mainnet-beta.solana.com` (production)

**Backend Authority**:
- Keypair with admin permissions
- Signs approve_market, finalize_market instructions
- Must be funded with SOL for transaction fees

---

### Helius (Blockchain Events)

**Webhook Configuration**:
- **URL**: `https://api.yourdomain.com/helius/webhook`
- **Events**: All program events (zmart-core, zmart-proposal)
- **Auth**: HMAC-SHA256 signature verification
- **Setup**: Register via Helius dashboard

**Rate Limits**:
- Free tier: 100 webhooks/day
- Pro tier: Unlimited

---

### Supabase (Database)

**Project Configuration**:
- **URL**: `https://your-project.supabase.co`
- **Anon Key**: For user-scoped queries (RLS enforced)
- **Service Role Key**: For backend admin operations (bypasses RLS)

**Schema Deployment**:
```bash
npm run deploy:supabase
```

**Migrations**: `supabase/migrations/`

---

### Redis (Cache & Pub/Sub)

**Usage**:
1. **Vote Aggregation Cache**: Temporary vote counts
2. **WebSocket Pub/Sub**: Real-time event broadcasting
3. **Rate Limiting**: Request counters per IP

**Configuration**:
- Local: `redis://localhost:6379`
- Production: Redis Cloud or AWS ElastiCache

---

## Deployment Architecture

### PM2 Ecosystem

**Services Running**:
```
┌─────┬────────────────────┬─────────┬──────────┬─────────┐
│ ID  │ Name               │ Mode    │ Memory   │ Port    │
├─────┼────────────────────┼─────────┼──────────┼─────────┤
│ 0   │ api-gateway        │ fork    │ 500M     │ 4000    │
│ 1   │ websocket-server   │ fork    │ 500M     │ 4001    │
│ 2   │ vote-aggregator    │ cron    │ 300M     │ N/A     │
│ 3   │ market-monitor     │ cron    │ 300M     │ N/A     │
│ 4   │ event-indexer      │ fork    │ 500M     │ 4002    │
└─────┴────────────────────┴─────────┴──────────┴─────────┘
```

**Auto-Restart**:
- All services: Enabled
- Memory limit: 300-500M (auto-restart if exceeded)
- Cron services: Every 5 minutes

**Logging**:
- Per-service logs: `logs/<service>-*.log`
- Winston logs: `logs/combined.log`, `logs/error.log`

---

### Production Deployment

**Infrastructure**:
```
                    ┌──────────────┐
                    │   Internet   │
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │  Nginx       │
                    │  (SSL, Proxy)│
                    └──────┬───────┘
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
    ┌────▼─────┐     ┌────▼─────┐     ┌────▼─────┐
    │   API    │     │WebSocket │     │  Event   │
    │ Gateway  │     │  Server  │     │ Indexer  │
    │:4000     │     │:4001     │     │:4002     │
    └────┬─────┘     └────┬─────┘     └────┬─────┘
         │                │                 │
         └────────────────┴─────────────────┘
                          │
         ┌────────────────┴─────────────────┐
         │                                  │
    ┌────▼─────┐                      ┌────▼─────┐
    │ Supabase │                      │  Redis   │
    │ (Cloud)  │                      │ (Local)  │
    └──────────┘                      └──────────┘
```

**Nginx Configuration**:
```nginx
# API Gateway
location /api/ {
    proxy_pass http://localhost:4000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
}

# WebSocket
location /ws/ {
    proxy_pass http://localhost:4001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
}

# Event Indexer (webhook only, not public)
location /helius/webhook {
    proxy_pass http://localhost:4002;
    allow 52.89.214.238; # Helius webhook IP
    deny all;
}
```

---

## Security Architecture

### Authentication Flow (SIWE + JWT)

```
1. User connects wallet (Phantom, Solflare, etc.)
2. Frontend generates SIWE message
3. User signs message with wallet
4. POST /api/auth/login { message, signature }
5. Backend verifies signature (tweetnacl)
6. Issue JWT token (1 hour expiration)
7. Return JWT to frontend
8. Frontend includes JWT in Authorization header
9. Middleware validates JWT on protected routes
```

**JWT Payload**:
```json
{
  "walletAddress": "4WQw...",
  "iat": 1699564800,
  "exp": 1699568400
}
```

---

### Row Level Security (RLS)

**Supabase RLS Policies**:
```sql
-- Example: Users can only read their own positions
CREATE POLICY "Users read own positions"
ON user_positions FOR SELECT
USING (auth.uid() = user_id);

-- Example: Backend service can write all trades
CREATE POLICY "Service role write trades"
ON trades FOR INSERT
TO service_role
WITH CHECK (true);
```

**Benefits**:
- Database-level security (even if backend compromised)
- User data isolation
- Admin operations via service role key

---

### Rate Limiting

**API Gateway**:
- 100 requests/minute per IP
- 1000 requests/hour per IP
- Separate limits for authenticated users

**WebSocket**:
- Max 10 connections per IP
- Max 100 messages/minute per connection

---

## Scaling Strategy

### Horizontal Scaling

**API Gateway**:
- Run multiple instances behind load balancer
- Stateless (no session storage)
- Share Redis for rate limiting

**WebSocket Server**:
- Run multiple instances
- Redis pub/sub ensures all instances broadcast same events
- Sticky sessions recommended (but not required)

**Vote Aggregator / Market Monitor**:
- Single instance (cron jobs)
- Use distributed locks (Redis) if scaling needed

**Event Indexer**:
- Single instance sufficient (low throughput)
- Can scale horizontally with load balancer

---

### Vertical Scaling

**Memory Optimization**:
- PM2 max memory restart: 300-500M
- Node.js heap size: 2GB default
- Redis memory: 1-2GB for production

**CPU Optimization**:
- Use Node.js cluster mode for CPU-intensive tasks
- Offload heavy computation to worker threads

---

### Database Scaling

**Supabase**:
- Connection pooling (Supavisor)
- Read replicas for read-heavy workloads
- Indexes on frequently queried columns

**Redis**:
- Master-replica for high availability
- Redis Cluster for horizontal scaling

---

## Monitoring & Observability

**Metrics**:
- PM2 metrics: CPU, memory, uptime, restarts
- Winston logs: Structured JSON logging
- Supabase analytics: Query performance
- Redis metrics: Cache hit rate, memory usage

**Alerting**:
- PM2 service restarts (> 3 in 1 hour)
- API Gateway errors (> 5% error rate)
- WebSocket disconnections (> 50%)
- Database connection failures

**Dashboards**:
- PM2 Keymetrics (optional)
- Custom Grafana dashboards (future)

---

**Last Updated**: November 9, 2025
**Version**: 0.69.0
**Status**: Production Architecture (Implementation in Progress)
