# BACKEND_REFERENCE.md - Backend Services Reference

**Category:** Component Reference
**Tags:** [backend, services, api, nodejs, developer]
**Last Updated:** 2025-11-09 00:00 PST

---

## Quick Links

- ⬆️ [Back to CLAUDE.md](../../../CLAUDE.md)
- 📊 [Project State](../state/STATE_MASTER.md)
- 🧪 [Testing Hub](../testing/TESTING_MASTER.md)
- 🏗️ [Programs Reference](./PROGRAMS_REFERENCE.md)
- 🔗 [Integration Map](../architecture/INTEGRATION_MAP.md) ⏳

---

## 🎯 Purpose

**Complete reference for all backend services in the ZMART V0.69 prediction market platform.**

This document catalogs:
- All 6 backend services (5 active + 1 disabled)
- PM2 process configuration
- Service architecture and dependencies
- API endpoints and routes
- Environment configuration
- Deployment status and health monitoring

**This is a reference document - it describes what exists, not how to use it.**

---

## 📦 Service Overview

### Six-Service Architecture

**Design Decision:** Microservices architecture for scalability and maintainability.

| # | Service | Purpose | Port | Status | PM2 Name |
|---|---------|---------|------|--------|----------|
| 1 | **API Gateway** | REST API + routing | 4000 | ✅ Running | `api-gateway` |
| 2 | **WebSocket Server** | Real-time updates | 4001 | ⏳ Planned | `websocket-server` |
| 3 | **Vote Aggregator** | Off-chain vote counting | - | ⏳ Planned | `vote-aggregator` |
| 4 | **Market Monitor** | Auto-finalization + alerts | - | ⏳ Planned | `market-monitor` |
| 5 | **Event Indexer** | Blockchain event indexing | 4002 | ✅ Running | `event-indexer` |
| 6 | **IPFS Snapshot** | Daily discussion backups | - | ❌ Disabled (MVP) | `ipfs-snapshot` |

**Current Status:** 2 of 5 services deployed (API Gateway + Event Indexer)

---

## 🔧 Tech Stack

### Core Technologies

| Technology | Version | Purpose |
|------------|---------|---------|
| **Node.js** | >=18.0.0 | Runtime environment |
| **TypeScript** | ^5.3.3 | Type-safe development |
| **Express** | ^4.18.2 | HTTP server framework |
| **PM2** | Latest | Process management |
| **Winston** | ^3.11.0 | Logging |
| **Anchor** | ^0.32.1 | Solana program interaction |

### Key Dependencies

| Library | Purpose |
|---------|---------|
| `@solana/web3.js` | Solana blockchain interaction |
| `@supabase/supabase-js` | Database client |
| `ioredis` | Redis caching (Vote Aggregator) |
| `ws` | WebSocket server |
| `ipfs-http-client` | IPFS integration |
| `node-cron` | Scheduled jobs |
| `helmet` | Security headers |
| `cors` | Cross-origin resource sharing |
| `express-rate-limit` | Rate limiting |
| `joi` | Input validation |

---

## 📋 Service Details

### 1. API Gateway ✅

**Status:** Running on port 4000
**PM2 Name:** `api-gateway`
**Script:** `./dist/index.js`
**Purpose:** Main REST API server for frontend

#### Configuration

```javascript
{
  name: 'api-gateway',
  script: './dist/index.js',
  cwd: '/Users/seman/Desktop/zmartV0.69/backend',
  instances: 1,
  autorestart: true,
  max_memory_restart: '500M',
  env: {
    NODE_ENV: 'development',
    API_PORT: 4000,
  }
}
```

#### Routes

| Route | Purpose | Methods |
|-------|---------|---------|
| `/health` | Health check endpoint | GET |
| `/api/markets` | Market CRUD operations | GET, POST |
| `/api/trades` | Trading operations | GET, POST |
| `/api/votes` | Voting operations | GET, POST |
| `/api/discussions` | Discussion management | GET, POST |
| `/api/users` | User profile operations | GET, POST |

#### Middleware Stack

1. **helmet** - Security headers
2. **cors** - Cross-origin resource sharing
3. **express.json** - JSON body parsing (10mb limit)
4. **morgan** - HTTP request logging
5. **rateLimit** - 100 req/15min per IP
6. **errorHandler** - Centralized error handling

#### Features

- **Rate Limiting:** 100 requests per 15 minutes per IP
- **CORS:** Configured for localhost:3000 and production frontend
- **Error Handling:** Centralized error middleware
- **Logging:** HTTP request logging via Winston
- **Health Checks:** `/health` endpoint with uptime and environment info

#### Environment Variables

```env
API_PORT=4000
CORS_ORIGINS=http://localhost:3000,https://app.zmart.io
NODE_ENV=development
LOG_LEVEL=info
```

#### Logs

- **Error:** `./logs/api-gateway-error.log`
- **Output:** `./logs/api-gateway-out.log`
- **Combined:** `./logs/api-gateway-combined.log`

---

### 2. WebSocket Server ⏳

**Status:** Planned (Phase 2, Week 6)
**PM2 Name:** `websocket-server`
**Script:** `./dist/services/websocket/server.js`
**Purpose:** Real-time updates for price changes, trades, votes

#### Configuration

```javascript
{
  name: 'websocket-server',
  script: './dist/services/websocket/server.js',
  instances: 1,
  autorestart: true,
  max_memory_restart: '500M',
  env: {
    NODE_ENV: 'development',
    WS_PORT: 4001,
  }
}
```

#### Planned Features

- **Real-Time Market Updates:** Price changes broadcasted to all connected clients
- **Trade Notifications:** Instant notification of new trades
- **Vote Updates:** Live vote counts during proposal/dispute voting
- **Connection Management:** Automatic reconnection, heartbeat monitoring
- **Event Filtering:** Clients subscribe to specific markets

#### WebSocket Events (Planned)

| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `subscribe` | Client → Server | `{ marketId }` | Subscribe to market updates |
| `unsubscribe` | Client → Server | `{ marketId }` | Unsubscribe from market |
| `market_update` | Server → Client | `{ marketId, price, ... }` | Market state changed |
| `trade` | Server → Client | `{ marketId, trade, ... }` | New trade executed |
| `vote_update` | Server → Client | `{ marketId, likes, dislikes }` | Vote count updated |
| `ping` | Client → Server | `{}` | Heartbeat |
| `pong` | Server → Client | `{}` | Heartbeat response |

#### Port

- **WebSocket Port:** 4001
- **Connection URL:** `ws://localhost:4001`

#### Environment Variables

```env
WS_PORT=4001
HEARTBEAT_INTERVAL=30000  # 30 seconds
MAX_CONNECTIONS=10000
```

---

### 3. Vote Aggregator ⏳

**Status:** Planned (Phase 1, Week 2)
**PM2 Name:** `vote-aggregator`
**Script:** `./dist/services/vote-aggregator/index.js`
**Purpose:** Aggregate off-chain votes and submit to blockchain

#### Configuration

```javascript
{
  name: 'vote-aggregator',
  script: './dist/services/vote-aggregator/index.js',
  instances: 1,
  autorestart: true,
  max_memory_restart: '300M',
  cron_restart: '*/5 * * * *', // Every 5 minutes
  env: {
    NODE_ENV: 'development',
    VOTE_AGGREGATION_INTERVAL: 300000, // 5 minutes
  }
}
```

#### Planned Architecture

**Vote Collection API:**
- `POST /api/votes/proposal` - Submit proposal vote
- `POST /api/votes/dispute` - Submit dispute vote
- `GET /api/votes/proposal/:marketId` - Get proposal vote counts
- `GET /api/votes/dispute/:marketId` - Get dispute vote counts

**Redis Caching:**
- Cache votes in Redis for fast aggregation
- Key pattern: `votes:proposal:{marketId}` and `votes:dispute:{marketId}`
- TTL: 7 days

**Aggregation Cron:**
- Runs every 5 minutes (configurable)
- Fetches votes from Redis
- Verifies on-chain VoteRecord PDAs for authenticity
- If proposal ≥70% threshold: calls `aggregate_proposal_votes` instruction
- If dispute voting period ends: calls `aggregate_dispute_votes` instruction

#### Flow

```
1. User submits vote via API (POST /api/votes/proposal)
   ↓
2. Backend creates on-chain VoteRecord (proof of vote)
   ↓
3. Vote cached in Redis (fast aggregation)
   ↓
4. Cron job runs every 5 minutes
   ↓
5. Aggregator fetches all votes from Redis
   ↓
6. Verifies VoteRecords exist on-chain (anti-fraud)
   ↓
7. If threshold met: Submit aggregate transaction to blockchain
```

#### Dependencies

- **Redis:** Vote caching and deduplication
- **Solana RPC:** On-chain VoteRecord verification
- **Anchor:** Transaction submission

#### Environment Variables

```env
REDIS_URL=redis://localhost:6379
VOTE_AGGREGATION_INTERVAL=300000  # 5 minutes
BACKEND_WALLET_PATH=/path/to/backend-wallet.json
```

---

### 4. Market Monitor ⏳

**Status:** Planned (Phase 2, Week 7)
**PM2 Name:** `market-monitor`
**Script:** `./dist/services/market-monitor/index.js`
**Purpose:** Automatic market finalization and alerts

#### Configuration

```javascript
{
  name: 'market-monitor',
  script: './dist/services/market-monitor/index.js',
  instances: 1,
  autorestart: true,
  max_memory_restart: '300M',
  cron_restart: '*/5 * * * *', // Every 5 minutes
  env: {
    NODE_ENV: 'development',
  }
}
```

#### Planned Responsibilities

**1. Auto-Finalization:**
- Monitor markets in RESOLVING state
- Check if 48-hour dispute window passed
- If no dispute: Call `finalize_market` instruction
- Set `final_outcome = proposed_outcome`

**2. Stuck Market Detection:**
- Identify markets stuck in invalid states
- Alert admin if market hasn't progressed in expected time
- Examples:
  - PROPOSED for >7 days (low vote participation)
  - ACTIVE with no trades for >30 days (inactive market)
  - RESOLVING for >72 hours (finalization failed)

**3. Dispute Period Expiry:**
- Monitor DISPUTED markets
- Check if voting period ended
- Aggregate dispute votes and finalize

**4. Health Monitoring:**
- Track market state transitions
- Log anomalies and errors
- Alert on repeated transaction failures

#### Monitoring Checks

| Check | Frequency | Action |
|-------|-----------|--------|
| Auto-finalize RESOLVING markets | Every 5 min | Call `finalize_market` if 48h passed |
| Stuck market detection | Every 5 min | Log alert if market stuck >expected time |
| Dispute period expiry | Every 5 min | Aggregate dispute votes and finalize |
| Health status | Every 5 min | Update monitoring dashboard |

#### Environment Variables

```env
MONITORING_INTERVAL=300000  # 5 minutes
AUTO_FINALIZE_ENABLED=true
ALERT_WEBHOOK_URL=https://hooks.slack.com/...
BACKEND_WALLET_PATH=/path/to/backend-wallet.json
```

---

### 5. Event Indexer ✅

**Status:** Running on port 4002
**PM2 Name:** `event-indexer`
**Script:** `./src/index.ts` (ts-node)
**Purpose:** Index blockchain events to Supabase via Helius webhooks

#### Configuration

```javascript
{
  name: 'event-indexer',
  script: './src/index.ts',
  cwd: '/Users/seman/Desktop/zmartV0.69/backend/event-indexer',
  interpreter: 'node',
  interpreter_args: '--require ts-node/register',
  instances: 1,
  autorestart: true,
  max_memory_restart: '500M',
  env: {
    NODE_ENV: 'development',
    PORT: 4002,
  }
}
```

#### Architecture

**Helius Webhook Integration:**
- Registered webhook: `http://your-server:4002/api/webhooks/helius`
- Monitors program: `7h3gXfBfYFueFVLYyfL5Qo1QGsf4GQUfW96FKVgnUsJS`
- Receives real-time transaction notifications
- Event types: All (account updates, transactions)

**Event Processing Pipeline:**
1. Receive Helius webhook POST
2. Validate webhook signature (security)
3. Parse transaction data (instructions, accounts)
4. Extract event type (MarketCreated, TradeExecuted, etc.)
5. Transform to database schema
6. Insert to Supabase (markets, trades, votes tables)
7. Emit WebSocket update (future)

#### Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/health` | GET | Health check + DB connection status |
| `/api/webhooks/helius` | POST | Helius webhook receiver |

#### Indexed Events

| Event | Supabase Table | Trigger |
|-------|----------------|---------|
| MarketCreated | `markets` | `create_market` instruction |
| MarketApproved | `markets` (state update) | `aggregate_proposal_votes` |
| MarketActivated | `markets` (state update) | `activate_market` |
| TradeExecuted | `trades` | `buy_shares` or `sell_shares` |
| ProposalVoteSubmitted | `votes` | `submit_proposal_vote` |
| DisputeVoteSubmitted | `votes` | `submit_dispute_vote` |
| MarketResolved | `markets` (state update) | `resolve_market` |
| MarketFinalized | `markets` (state update) | `finalize_market` |
| WinningsClaimed | `trades` or custom table | `claim_winnings` |

#### Database Schema Integration

**Markets Table Updates:**
- `state` - Market lifecycle state
- `shares_yes`, `shares_no` - Share quantities
- `current_liquidity` - Pool liquidity
- `total_volume` - Trading volume
- `proposal_likes`, `proposal_dislikes` - Vote counts
- `finalized_at` - Finalization timestamp

**Trades Table Inserts:**
- `market_id` - Market reference
- `user` - Trader wallet
- `outcome` - YES/NO
- `shares` - Share quantity
- `cost` - Total cost (with fees)
- `tx_signature` - Blockchain transaction

**Votes Table Inserts:**
- `market_id` - Market reference
- `user` - Voter wallet
- `vote_type` - Proposal or Dispute
- `vote` - Support or oppose
- `tx_signature` - Blockchain transaction

#### Environment Variables

```env
PORT=4002
HELIUS_API_KEY=your-api-key
HELIUS_WEBHOOK_SECRET=your-webhook-secret
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
PROGRAM_ID=7h3gXfBfYFueFVLYyfL5Qo1QGsf4GQUfW96FKVgnUsJS
```

#### Logs

- **Error:** `../logs/event-indexer-error.log`
- **Output:** `../logs/event-indexer-out.log`
- **Combined:** `../logs/event-indexer-combined.log`

#### Helius Webhook Management

```bash
# Register webhook
pnpm run helius:register

# List webhooks
pnpm run helius:list

# Delete webhook
pnpm run helius:delete
```

---

### 6. IPFS Snapshot Service ❌

**Status:** Disabled for MVP
**PM2 Name:** `ipfs-snapshot` (commented out)
**Script:** `./dist/services/ipfs/standalone.js`
**Purpose:** Daily snapshots of discussions to IPFS for decentralization

#### Why Disabled?

**MVP Rationale:**
1. **Not Core Functionality:** Supabase stores discussions reliably
2. **Nice-to-Have:** IPFS provides decentralization but not required for v1
3. **Complexity:** Adds dependency and failure mode
4. **Cost:** IPFS pinning services have costs
5. **Timeline:** Focus on essential features first

**Future Re-enablement:**
- Phase 4 or later (after frontend complete)
- If decentralized discussion storage becomes requirement
- If regulatory/censorship concerns arise

#### Planned Architecture (If Enabled)

**Daily Cron Job:**
- Runs at midnight UTC daily
- Fetches all discussions from Supabase
- Creates JSON snapshot
- Uploads to IPFS via Pinata or local node
- Stores IPFS CID in Supabase

**Snapshot Format:**
```json
{
  "timestamp": "2025-11-09T00:00:00Z",
  "markets": [
    {
      "market_id": "...",
      "discussions": [...]
    }
  ]
}
```

#### Configuration (Commented Out)

```javascript
{
  name: 'ipfs-snapshot',
  script: './dist/services/ipfs/standalone.js',
  cron_restart: '0 0 * * *', // Daily at midnight UTC
  instances: 1,
  autorestart: true,
  max_memory_restart: '300M',
}
```

---

## 🔄 PM2 Process Management

### All Services Configuration

**File:** `backend/ecosystem.config.js`

**PM2 Commands:**

```bash
# Start all services
pm2 start ecosystem.config.js

# Start specific service
pm2 start ecosystem.config.js --only api-gateway
pm2 start ecosystem.config.js --only event-indexer

# View status
pm2 status

# View logs
pm2 logs api-gateway
pm2 logs event-indexer

# Restart service
pm2 restart api-gateway

# Stop service
pm2 stop api-gateway

# Delete service
pm2 delete api-gateway

# Save PM2 state (auto-restart on reboot)
pm2 save
pm2 startup
```

### Service Status Check

```bash
# Quick status
pm2 status

# Detailed info
pm2 show api-gateway

# Monitor all services
pm2 monit

# Real-time logs
pm2 logs --lines 50
```

### Memory Limits

| Service | Max Memory | Behavior |
|---------|------------|----------|
| API Gateway | 500 MB | Auto-restart if exceeded |
| WebSocket Server | 500 MB | Auto-restart if exceeded |
| Vote Aggregator | 300 MB | Auto-restart if exceeded |
| Market Monitor | 300 MB | Auto-restart if exceeded |
| Event Indexer | 500 MB | Auto-restart if exceeded |

---

## 📊 Service Dependencies

### Dependency Graph

```
API Gateway (port 4000)
├── Supabase (database)
├── Solana RPC (blockchain read)
└── Frontend (CORS)

WebSocket Server (port 4001)
├── Redis (pub/sub)
├── API Gateway (event source)
└── Frontend (WS connections)

Vote Aggregator
├── Redis (vote cache)
├── Supabase (vote storage)
├── Solana RPC (VoteRecord verification)
└── Backend Wallet (transaction signing)

Market Monitor
├── Solana RPC (market state reading)
├── Backend Wallet (finalization transactions)
└── Slack Webhook (alerts)

Event Indexer (port 4002)
├── Helius Webhook (event source)
├── Supabase (event storage)
└── Solana RPC (fallback event fetching)

IPFS Snapshot (disabled)
├── Supabase (discussion source)
└── IPFS/Pinata (storage)
```

### External Dependencies

| Service | Purpose | Provider |
|---------|---------|----------|
| **Supabase** | PostgreSQL database | supabase.com |
| **Helius** | Solana RPC + webhooks | helius.dev |
| **Redis** | Cache and pub/sub | Local or Redis Cloud |
| **Slack** | Alerting | slack.com |
| **IPFS** | Decentralized storage | Pinata or local node |

---

## 🔐 Environment Configuration

### Required Environment Variables

**File:** `backend/.env`

```env
# Node Environment
NODE_ENV=development
LOG_LEVEL=info

# API Gateway
API_PORT=4000
CORS_ORIGINS=http://localhost:3000,https://app.zmart.io

# WebSocket Server
WS_PORT=4001
HEARTBEAT_INTERVAL=30000

# Solana Configuration
SOLANA_RPC_URL=https://api.devnet.solana.com
HELIUS_API_KEY=your-api-key-here
PROGRAM_ID_CORE=7h3gXfBfYFueFVLYyfL5Qo1QGsf4GQUfW96FKVgnUsJS
PROGRAM_ID_PROPOSAL=TBD

# Backend Wallet (for signing transactions)
BACKEND_WALLET_PATH=/Users/seman/Desktop/zmartV0.69/backend/backend-wallet.json

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Redis Configuration (Vote Aggregator)
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=optional-password

# IPFS Configuration (disabled for MVP)
# IPFS_API_URL=http://localhost:5001
# PINATA_API_KEY=your-pinata-key
# PINATA_SECRET_KEY=your-pinata-secret

# Monitoring & Alerts
ALERT_WEBHOOK_URL=https://hooks.slack.com/services/...

# Vote Aggregation
VOTE_AGGREGATION_INTERVAL=300000  # 5 minutes

# Market Monitoring
MONITORING_INTERVAL=300000  # 5 minutes
AUTO_FINALIZE_ENABLED=true

# Helius Webhook
HELIUS_WEBHOOK_SECRET=your-webhook-secret
```

**Reference:** See [ENVIRONMENT_GUIDE.md](../../ENVIRONMENT_GUIDE.md) for complete variable documentation.

---

## 📝 NPM Scripts Reference

### Build & Development

```bash
# Build TypeScript
pnpm run build

# Development server (auto-reload)
pnpm run dev

# Production start
pnpm run start
```

### Testing

```bash
# Run all tests
pnpm test

# Unit tests only
pnpm test:unit

# Integration tests
pnpm test:integration

# Watch mode
pnpm test:watch

# Coverage report
pnpm test:coverage

# Test database connection
pnpm run test:db

# Setup test wallets
pnpm run test:setup-wallets

# Cleanup test data
pnpm run test:cleanup
```

### Code Quality

```bash
# Lint code
pnpm run lint

# Fix lint errors
pnpm run lint:fix

# Format code
pnpm run format
```

### Deployment & Operations

```bash
# Deploy market monitor
pnpm run deploy:market-monitor

# Run market monitor once
pnpm run monitor:run

# Deploy Supabase schema
pnpm run deploy:supabase

# Validate Week 2 completion
pnpm run validate:week2
```

### Helius Webhook Management

```bash
# Register Helius webhook
pnpm run helius:register

# List registered webhooks
pnpm run helius:list

# Delete webhook
pnpm run helius:delete
```

---

## 🏥 Health Monitoring

### Health Check Endpoints

| Service | Endpoint | Response |
|---------|----------|----------|
| API Gateway | `http://localhost:4000/health` | `{ status, timestamp, uptime, environment }` |
| Event Indexer | `http://localhost:4002/health` | `{ status, service, version, database, timestamp }` |
| WebSocket Server | `ws://localhost:4001/ping` | `pong` response |

### Health Check Script

```bash
# Check all services
curl http://localhost:4000/health
curl http://localhost:4002/health

# Or via PM2
pm2 status
```

### Service Status Indicators

**✅ Healthy:**
- PM2 status: `online`
- Memory usage: < max limit
- Health endpoint: 200 OK
- Database: connected

**⚠️ Degraded:**
- PM2 status: `online` but restarting frequently
- Memory usage: approaching limit
- Health endpoint: 503 Service Unavailable
- Database: intermittent connection

**❌ Down:**
- PM2 status: `stopped` or `errored`
- Health endpoint: no response
- Database: disconnected

---

## 📚 API Routes Reference

### Market Routes (`/api/markets`)

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| GET | `/api/markets` | List all markets | Public |
| GET | `/api/markets/:id` | Get market details | Public |
| POST | `/api/markets` | Create new market | Wallet signature |
| GET | `/api/markets/:id/trades` | Get market trades | Public |
| GET | `/api/markets/:id/votes` | Get market votes | Public |

### Trade Routes (`/api/trades`)

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| GET | `/api/trades` | List recent trades | Public |
| GET | `/api/trades/:user` | Get user trades | Public |
| POST | `/api/trades/buy` | Execute buy trade | Wallet signature |
| POST | `/api/trades/sell` | Execute sell trade | Wallet signature |

### Vote Routes (`/api/votes`)

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| GET | `/api/votes/proposal/:marketId` | Get proposal votes | Public |
| GET | `/api/votes/dispute/:marketId` | Get dispute votes | Public |
| POST | `/api/votes/proposal` | Submit proposal vote | Wallet signature |
| POST | `/api/votes/dispute` | Submit dispute vote | Wallet signature |

### Discussion Routes (`/api/discussions`)

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| GET | `/api/discussions/:marketId` | Get market discussions | Public |
| POST | `/api/discussions/:marketId` | Post comment | Wallet signature |
| GET | `/api/discussions/:marketId/:commentId` | Get specific comment | Public |

### User Routes (`/api/users`)

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| GET | `/api/users/:wallet` | Get user profile | Public |
| GET | `/api/users/:wallet/positions` | Get user positions | Public |
| GET | `/api/users/:wallet/trades` | Get user trade history | Public |

**Note:** Complete API documentation in [API_REFERENCE.md](../api/API_REFERENCE.md) ⏳

---

## 🔒 Security Features

### API Gateway Security

1. **Helmet.js:** Security headers (XSS, clickjacking, MIME sniffing)
2. **CORS:** Whitelist-based origin control
3. **Rate Limiting:** 100 req/15min per IP
4. **Input Validation:** Joi schema validation
5. **Error Sanitization:** Hide stack traces in production
6. **Wallet Signature Verification:** All write operations require signature

### Event Indexer Security

1. **Webhook Signature Verification:** Validates Helius webhook signatures
2. **Request Size Limits:** 10MB max payload
3. **Database RLS:** Supabase Row Level Security policies
4. **Error Logging:** Sanitized error messages

### Vote Aggregator Security

1. **VoteRecord Verification:** Checks on-chain PDAs before aggregating
2. **Redis Authentication:** Password-protected Redis connection
3. **Backend Wallet Security:** Encrypted wallet file with passphrase
4. **Duplicate Prevention:** Redis deduplication

---

## 📊 Performance Metrics

### Expected Performance

| Service | Metric | Target | Current |
|---------|--------|--------|---------|
| API Gateway | Response Time (p95) | <200ms | TBD |
| API Gateway | Throughput | >100 req/s | TBD |
| Event Indexer | Event Processing Time | <5s | TBD |
| Vote Aggregator | Aggregation Time | <30s | N/A |
| Market Monitor | Check Frequency | 5 min | N/A |

### Resource Usage

| Service | CPU (avg) | Memory (avg) | Disk I/O |
|---------|-----------|--------------|----------|
| API Gateway | <20% | ~100 MB | Low |
| WebSocket Server | <15% | ~80 MB | Low |
| Event Indexer | <10% | ~120 MB | Medium |
| Vote Aggregator | <5% (cron) | ~60 MB | Low |
| Market Monitor | <5% (cron) | ~50 MB | Low |

---

## 🧪 Testing Infrastructure

### Test Scripts Location

**Backend:** `backend/tests/`
**Event Indexer:** `backend/event-indexer/tests/`

### Test Categories

**Unit Tests:** `backend/__tests__/services/`
- Vote aggregation logic
- LMSR calculations
- Data transformations

**Integration Tests:** `backend/tests/integration/`
- API endpoint testing
- Database integration
- Blockchain interaction

**Test Database:** `backend/scripts/test-db-connection.ts`
**Test Wallets:** `backend/tests/setup/create-test-wallets.ts`

**Reference:** See [TESTING_MASTER.md](../testing/TESTING_MASTER.md) for complete testing guide.

---

## 🚀 Deployment Guide

### Initial Setup

```bash
# Navigate to backend
cd backend

# Install dependencies
pnpm install

# Build TypeScript
pnpm run build

# Configure environment
cp .env.example .env
# Edit .env with your credentials

# Deploy Supabase schema
pnpm run deploy:supabase

# Register Helius webhook
pnpm run helius:register
```

### Start Services

```bash
# Start all services
pm2 start ecosystem.config.js

# Save PM2 state
pm2 save

# Enable PM2 auto-startup
pm2 startup
```

### Verify Deployment

```bash
# Check PM2 status
pm2 status

# Test health endpoints
curl http://localhost:4000/health
curl http://localhost:4002/health

# View logs
pm2 logs --lines 50
```

---

## 🔍 Troubleshooting

### Common Issues

**Service won't start:**
- Check logs: `pm2 logs <service-name>`
- Verify environment variables in `.env`
- Check port availability: `lsof -i :4000`
- Ensure dependencies installed: `pnpm install`

**Database connection error:**
- Verify Supabase credentials in `.env`
- Test connection: `pnpm run test:db`
- Check Supabase dashboard for service status

**Helius webhook not receiving events:**
- Verify webhook registered: `pnpm run helius:list`
- Check webhook URL is publicly accessible
- Verify webhook secret matches `.env`
- Check Event Indexer logs: `pm2 logs event-indexer`

**Vote aggregation not working:**
- Check Redis connection: `redis-cli ping`
- Verify backend wallet has SOL: `solana balance backend-wallet.json`
- Check Vote Aggregator logs: `pm2 logs vote-aggregator`

**Market monitor not auto-finalizing:**
- Check Market Monitor logs: `pm2 logs market-monitor`
- Verify backend wallet permissions
- Ensure markets are in RESOLVING state >48h

**Reference:** See [TROUBLESHOOTING_REFERENCE.md](../troubleshooting/TROUBLESHOOTING_REFERENCE.md) ⏳

---

## 📁 Directory Structure

```
backend/
├── dist/                          # Compiled TypeScript
│   ├── index.js                   # API Gateway entry
│   ├── api/                       # API routes
│   │   ├── routes/                # Route handlers
│   │   └── middleware/            # Express middleware
│   ├── services/
│   │   ├── vote-aggregator/       # Vote aggregation service
│   │   ├── market-monitor/        # Market monitoring service
│   │   ├── websocket/             # WebSocket server
│   │   └── ipfs/                  # IPFS service (disabled)
│   ├── config/                    # Configuration
│   └── utils/                     # Utilities
├── src/                           # TypeScript source
│   ├── index.ts                   # API Gateway entry
│   ├── api/                       # API implementation
│   ├── services/                  # Service implementations
│   ├── config/                    # Config files
│   └── utils/                     # Utility functions
├── event-indexer/                 # Separate service
│   ├── src/
│   │   ├── index.ts               # Entry point
│   │   ├── routes/                # Webhook routes
│   │   ├── services/              # Event processing
│   │   └── utils/                 # Utilities
│   ├── tests/                     # Tests
│   └── package.json               # Dependencies
├── tests/                         # Integration tests
│   ├── integration/               # Integration tests
│   └── setup/                     # Test setup scripts
├── scripts/                       # Operational scripts
│   ├── deploy-market-monitor.ts
│   ├── deploy-supabase-schema.ts
│   ├── register-helius-webhook.ts
│   └── test-db-connection.ts
├── logs/                          # PM2 logs
│   ├── api-gateway-*.log
│   ├── event-indexer-*.log
│   └── ...
├── ecosystem.config.js            # PM2 configuration
├── package.json                   # Dependencies
├── tsconfig.json                  # TypeScript config
└── .env                           # Environment variables
```

---

## 📖 Related Documentation

### Core References

- [PROGRAMS_REFERENCE.md](./PROGRAMS_REFERENCE.md) - On-chain programs
- [INFRASTRUCTURE_REFERENCE.md](./INFRASTRUCTURE_REFERENCE.md) ⏳ - Supabase, Redis, RPC
- [API_REFERENCE.md](../api/API_REFERENCE.md) ⏳ - Complete API docs

### Architecture

- [INTEGRATION_MAP.md](../architecture/INTEGRATION_MAP.md) ⏳ - How services connect
- [DATA_FLOW.md](../architecture/DATA_FLOW.md) ⏳ - Data flow diagrams
- [ARCHITECTURE_DECISIONS.md](../architecture/ARCHITECTURE_DECISIONS.md) ⏳ - Design decisions

### Operations

- [TESTING_MASTER.md](../testing/TESTING_MASTER.md) - Testing guide
- [TROUBLESHOOTING_REFERENCE.md](../troubleshooting/TROUBLESHOOTING_REFERENCE.md) ⏳ - Issue resolution
- [ENVIRONMENT_GUIDE.md](../../ENVIRONMENT_GUIDE.md) ✅ - Environment variables

---

## 🎯 Quick Reference

### Service Ports

- **API Gateway:** 4000
- **WebSocket Server:** 4001
- **Event Indexer:** 4002

### PM2 Quick Commands

```bash
pm2 status                    # View all services
pm2 logs                      # Tail all logs
pm2 restart all               # Restart all services
pm2 stop all                  # Stop all services
pm2 delete all                # Remove all services
```

### Health Checks

```bash
curl http://localhost:4000/health  # API Gateway
curl http://localhost:4002/health  # Event Indexer
```

### Common Tasks

```bash
# Start backend
cd backend && pm2 start ecosystem.config.js

# View API Gateway logs
pm2 logs api-gateway

# Restart Event Indexer
pm2 restart event-indexer

# Deploy schema
pnpm run deploy:supabase

# Register webhook
pnpm run helius:register
```

---

## 📊 Service Status Summary

| Service | Status | Port | PM2 Status | Dependencies |
|---------|--------|------|------------|--------------|
| API Gateway | ✅ Running | 4000 | `online` | Supabase, Solana RPC |
| Event Indexer | ✅ Running | 4002 | `online` | Helius, Supabase |
| WebSocket Server | ⏳ Planned | 4001 | N/A | Redis, API Gateway |
| Vote Aggregator | ⏳ Planned | - | N/A | Redis, Supabase, Backend Wallet |
| Market Monitor | ⏳ Planned | - | N/A | Solana RPC, Backend Wallet |
| IPFS Snapshot | ❌ Disabled | - | N/A | Supabase, IPFS/Pinata |

**Overall Backend Status:** 50% complete (2 of 4 essential services running)

---

**Last Updated:** 2025-11-09 00:00 PST
**Next Review:** 2025-11-16
**Maintained By:** Development Team

---
