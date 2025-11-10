# ZMART Backend Services

**Version**: 0.69.0
**Last Updated**: November 9, 2025

Comprehensive backend infrastructure for the ZMART prediction market platform on Solana. Handles vote aggregation, real-time updates, blockchain event indexing, and API gateway for frontend applications.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Service Inventory](#service-inventory)
- [Quick Start](#quick-start)
- [Environment Setup](#environment-setup)
- [Running Services](#running-services)
- [Testing](#testing)
- [Documentation](#documentation)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)

---

## Overview

The ZMART backend is a **microservices architecture** running 6 specialized services:

1. **API Gateway** - REST API for frontend integration (port 4000)
2. **WebSocket Server** - Real-time market updates (port 4001)
3. **Vote Aggregator** - Off-chain vote collection → on-chain submission
4. **Market Monitor** - Automated market state transitions
5. **Event Indexer** - Blockchain event processing via Helius webhooks (port 4002)
6. **IPFS Service** - Discussion snapshots (optional, disabled in MVP)

### Technology Stack

- **Runtime**: Node.js 18+ with TypeScript 5.3
- **Database**: Supabase (PostgreSQL with RLS)
- **Cache**: Redis 7.x
- **Process Manager**: PM2
- **Blockchain**: Solana (devnet/mainnet)
- **Real-time**: WebSocket (ws library)
- **Logging**: Winston
- **Testing**: Jest + ts-jest

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           ZMART Backend Services                         │
└─────────────────────────────────────────────────────────────────────────┘

┌──────────────┐           ┌──────────────┐           ┌──────────────┐
│   Frontend   │           │  Blockchain  │           │   Helius     │
│  (Next.js)   │           │   (Solana)   │           │  Webhooks    │
└──────┬───────┘           └──────┬───────┘           └──────┬───────┘
       │                          │                          │
       │ HTTP/WS                  │ Events                   │ POST
       │                          │                          │
       ▼                          ▼                          ▼
┌────────────────────────────────────────────────────────────────────────┐
│                         Backend Services (PM2)                          │
├─────────────────┬──────────────┬──────────────┬─────────────┬─────────┤
│   API Gateway   │  WebSocket   │Vote Aggreg.  │Market Mon.  │ Event   │
│   (port 4000)   │ (port 4001)  │ (cron: 5min) │(cron: 5min) │Indexer  │
│                 │              │              │             │(port    │
│ - Markets API   │ - Price      │ - Proposal   │ - State     │4002)    │
│ - Trades API    │   updates    │   votes      │   FSM       │         │
│ - Votes API     │ - Trade      │ - Dispute    │ - Auto      │- Helius │
│ - Users API     │   events     │   votes      │   finalize  │  events │
│ - Discussions   │ - Market     │ - On-chain   │ - Resolving │- Parse  │
│ - Auth (SIWE)   │   changes    │   calls      │   → Final   │- Write  │
│                 │              │              │             │  to DB  │
└────────┬────────┴──────┬───────┴──────┬───────┴──────┬──────┴────┬────┘
         │               │              │              │           │
         └───────────────┴──────────────┴──────────────┴───────────┘
                                        │
                                        ▼
                        ┌───────────────────────────────┐
                        │        Supabase (PostgreSQL)   │
                        │  - markets                     │
                        │  - trades                      │
                        │  - proposal_votes              │
                        │  - dispute_votes               │
                        │  - discussions                 │
                        │  - users                       │
                        │  (RLS policies for security)   │
                        └───────────────┬───────────────┘
                                        │
                        ┌───────────────────────────────┐
                        │        Redis (Cache)           │
                        │  - Vote aggregation queues     │
                        │  - WebSocket pub/sub           │
                        │  - Rate limiting counters      │
                        └───────────────────────────────┘
```

### Data Flow

**1. User Trades (Frontend → Backend → Blockchain)**:
```
Frontend → API Gateway → Solana RPC → Blockchain
                ↓
         Supabase (record trade)
                ↓
         WebSocket (real-time update to all clients)
```

**2. On-Chain Events → Database**:
```
Blockchain → Helius → Event Indexer → Parse → Supabase
                                                  ↓
                                          WebSocket (broadcast)
```

**3. Off-Chain Votes → On-Chain**:
```
User → API Gateway → Supabase (proposal_votes)
                                  ↓
Vote Aggregator (cron) → Aggregate → On-chain call (approve_market)
```

---

## Service Inventory

### 1. API Gateway (`src/api/`)
**Port**: 4000
**Purpose**: REST API for frontend integration
**Documentation**: [src/api/README.md](./src/api/README.md)

**Key Features**:
- SIWE + JWT authentication
- Rate limiting (100 req/min)
- Input validation (Joi schemas)
- Error handling middleware
- CORS configured

**Endpoints**:
- `GET /api/markets` - List markets
- `POST /api/trades/buy` - Execute buy trade
- `POST /api/votes/proposal` - Submit proposal vote
- `GET /api/users/me` - Get user profile
- See full API reference: [src/api/docs/API_REFERENCE.md](./src/api/docs/API_REFERENCE.md)

---

### 2. WebSocket Server (`src/services/websocket/`)
**Port**: 4001
**Purpose**: Real-time price updates and market events
**Documentation**: [src/services/websocket/README.md](./src/services/websocket/README.md)

**Key Features**:
- JWT authentication via query param or first message
- Subscribe to market-specific channels
- Redis pub/sub for horizontal scaling
- Automatic reconnection handling

**Events**:
- `market_update` - Market state changes
- `price_update` - LMSR price recalculation
- `trade_executed` - New trade completed
- See protocol: [src/services/websocket/docs/PROTOCOL.md](./src/services/websocket/docs/PROTOCOL.md)

---

### 3. Vote Aggregator (`src/services/vote-aggregator/`)
**Cron**: Every 5 minutes
**Purpose**: Off-chain vote collection → on-chain submission
**Documentation**: [vote-aggregator/README.md](./vote-aggregator/README.md)

**Workflow**:
1. Poll Supabase for proposal_votes (like/dislike)
2. Aggregate votes per market
3. Check threshold (70% approval = 7000 bps)
4. Call `approve_market` on-chain if threshold met
5. Update Supabase market state to APPROVED

---

### 4. Market Monitor (`src/services/market-monitor/`)
**Cron**: Every 5 minutes
**Purpose**: Automated market state transitions
**Documentation**: Coming soon (P1)

**Responsibilities**:
- Monitor markets in RESOLVING state
- Auto-transition to FINALIZED after 48 hours
- Check for stuck markets
- Alert if state transition fails

---

### 5. Event Indexer (`event-indexer/`)
**Port**: 4002
**Purpose**: Blockchain event indexing via Helius webhooks
**Documentation**: [event-indexer/README.md](./event-indexer/README.md)

**Workflow**:
1. Receive webhook from Helius (POST /helius/webhook)
2. Verify signature (HMAC-SHA256)
3. Parse blockchain events (MarketCreated, TradeExecuted, etc.)
4. Write to Supabase
5. Broadcast to WebSocket clients

---

### 6. IPFS Service (`src/services/ipfs/`) ❌ DISABLED FOR MVP
**Cron**: Daily at midnight UTC
**Purpose**: Discussion snapshots to IPFS
**Status**: Disabled (Supabase is sufficient for MVP)

**Future Use**:
- Daily snapshots of discussion threads
- Pinata IPFS pinning
- Decentralized discussion storage

---

## Quick Start

### Prerequisites

- **Node.js**: >=18.0.0
- **npm**: >=8.0.0
- **Redis**: 7.x running on localhost:6379
- **Supabase**: Project created with schema deployed
- **Solana CLI**: For backend authority keypair
- **PM2**: `npm install -g pm2`

### Installation

```bash
# 1. Clone repository (or navigate to backend directory)
cd /path/to/zmartV0.69/backend

# 2. Install dependencies
npm install

# 3. Copy environment template
cp .env.example .env

# 4. Edit .env with your credentials
nano .env  # or your preferred editor

# 5. Build TypeScript
npm run build

# 6. Start all services with PM2
pm2 start ecosystem.config.js

# 7. Check status
pm2 status

# 8. View logs
pm2 logs
```

**Expected output**:
```
┌─────┬────────────────────┬─────────┬─────────┬─────────┬──────────┐
│ id  │ name               │ status  │ restart │ uptime  │ cpu      │
├─────┼────────────────────┼─────────┼─────────┼─────────┼──────────┤
│ 0   │ api-gateway        │ online  │ 0       │ 5s      │ 0%       │
│ 1   │ websocket-server   │ online  │ 0       │ 5s      │ 0%       │
│ 2   │ vote-aggregator    │ online  │ 0       │ 5s      │ 0%       │
│ 3   │ market-monitor     │ online  │ 0       │ 5s      │ 0%       │
│ 4   │ event-indexer      │ online  │ 0       │ 5s      │ 0%       │
└─────┴────────────────────┴─────────┴─────────┴─────────┴──────────┘
```

### Verify Services

```bash
# API Gateway
curl http://localhost:4000/health
# Expected: {"status":"healthy","service":"api-gateway"}

# WebSocket
wscat -c ws://localhost:4001
# Expected: Connection established

# Event Indexer
curl http://localhost:4002/health
# Expected: {"status":"healthy","service":"event-indexer"}
```

---

## Environment Setup

### Required Environment Variables

Create `.env` file in backend root:

```bash
# ============================================
# Solana Configuration
# ============================================
SOLANA_RPC_URL=https://api.devnet.solana.com
# Core program (markets, trades, resolution)
SOLANA_PROGRAM_ID_CORE=7h3gXfBfYFueFVLYyfL5Qo1QGsf4GQUfW96FKVgnUsJS
# Proposal manager program (voting)
SOLANA_PROGRAM_ID_PROPOSAL=3XDU9r97qqJRdgqKJEWDYSJesPAUbLqsejXus4WLuhAQ

# Backend authority keypair (has permissions to call admin functions)
# SECURE: Never commit this file to git!
BACKEND_KEYPAIR_PATH=/Users/yourusername/.config/solana/backend-authority.json

# ============================================
# Supabase Configuration
# ============================================
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
# Get these from: Supabase Dashboard → Settings → API

# ============================================
# Redis Configuration
# ============================================
REDIS_URL=redis://localhost:6379
# For production: redis://username:password@host:port

# ============================================
# IPFS Configuration (Pinata)
# ============================================
IPFS_PROJECT_ID=your-pinata-api-key
IPFS_PROJECT_SECRET=your-pinata-secret-key
IPFS_GATEWAY_URL=https://gateway.pinata.cloud
# Get these from: https://app.pinata.cloud/keys

# ============================================
# API Configuration
# ============================================
API_PORT=4000
API_HOST=localhost
CORS_ORIGIN=http://localhost:3001
# For production: https://yourdomain.com

# ============================================
# WebSocket Configuration
# ============================================
WS_PORT=4001

# ============================================
# Service Configuration
# ============================================
VOTE_AGGREGATION_INTERVAL=300000  # 5 minutes (milliseconds)
IPFS_SNAPSHOT_CRON=0 0 * * *      # Daily at midnight UTC
MIN_PROPOSAL_VOTES=10              # Minimum votes before aggregation
PROPOSAL_APPROVAL_THRESHOLD=0.7    # 70% approval required
DISPUTE_THRESHOLD=0.6              # 60% agree to overturn

# ============================================
# Logging
# ============================================
LOG_LEVEL=info  # debug | info | warn | error
NODE_ENV=development  # development | production | test
```

### Setting up Backend Authority Keypair

The backend authority keypair is used to sign on-chain transactions (e.g., `approve_market`, `finalize_market`).

```bash
# 1. Generate keypair
solana-keygen new --outfile ~/.config/solana/backend-authority.json

# 2. Get address
solana-keygen pubkey ~/.config/solana/backend-authority.json
# Example: 4WQwPjKHu3x7dHBEehBDgxXHJQoDuBvj6Xhu6C1jjTye

# 3. Airdrop SOL (devnet only)
solana airdrop 2 4WQwPjKHu3x7dHBEehBDgxXHJQoDuBvj6Xhu6C1jjTye --url devnet

# 4. Verify balance
solana balance 4WQwPjKHu3x7dHBEehBDgxXHJQoDuBvj6Xhu6C1jjTye --url devnet
# Expected: 2 SOL

# 5. Update .env with keypair path
BACKEND_KEYPAIR_PATH=/Users/yourusername/.config/solana/backend-authority.json
```

**⚠️ SECURITY WARNING**:
- **NEVER** commit the keypair file to git
- **NEVER** share the keypair with anyone
- **NEVER** commit `.env` with real credentials
- Use `.env.example` as template only

---

## Running Services

### Development Mode

**Option 1: Run all services with PM2** (recommended)
```bash
npm run build
pm2 start ecosystem.config.js
pm2 logs  # View real-time logs
```

**Option 2: Run individual service**
```bash
# API Gateway only
npm run dev

# Vote Aggregator only
cd vote-aggregator && npm run dev

# Event Indexer only
cd event-indexer && npm run dev
```

### Production Mode

```bash
# 1. Build all services
npm run build

# 2. Start with PM2 (production mode)
NODE_ENV=production pm2 start ecosystem.config.js

# 3. Save PM2 process list
pm2 save

# 4. Setup PM2 startup script (runs on server reboot)
pm2 startup
# Follow instructions printed

# 5. Monitor
pm2 monit
```

### PM2 Commands Reference

```bash
# Status of all services
pm2 status

# View logs (all services)
pm2 logs

# View logs (specific service)
pm2 logs api-gateway

# Restart a service
pm2 restart api-gateway

# Restart all services
pm2 restart all

# Stop a service
pm2 stop api-gateway

# Delete a service
pm2 delete api-gateway

# Monitor resource usage
pm2 monit

# View detailed info
pm2 show api-gateway
```

---

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run unit tests only
npm run test:unit

# Run integration tests
npm run test:integration

# Watch mode (re-run on file changes)
npm run test:watch

# Test database connection
npm run test:db
```

### Test Coverage

**Current Coverage** (as of Nov 9, 2025):
```
File                      | % Stmts | % Branch | % Funcs | % Lines
--------------------------|---------|----------|---------|--------
All files                 |   16.7  |    12.5  |   14.3  |   16.2
 src/utils/validation.ts  |    100  |     100  |    100  |    100
 src/api/middleware/      |   75.5  |    68.2  |   80.0  |   74.1
 src/services/vote-agg/   |   32.0  |    25.0  |   40.0  |   31.5
```

**Coverage Goals**:
- Week 1 (Nov 15): 60% overall coverage
- Week 2 (Nov 22): 90% overall coverage
- Before mainnet: 95%+ coverage required

### Creating Test Data

```bash
# Create test wallets
npm run test:setup-wallets

# Clean up test data
npm run test:cleanup
```

---

## Documentation

### Complete Documentation Map

**Backend Overview**:
- [README.md](./README.md) - This file
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture (coming soon)

**Service Documentation**:
- [API Gateway](./src/api/README.md) - REST API documentation
  - [API Reference](./src/api/docs/API_REFERENCE.md) - Complete endpoint reference
- [WebSocket Server](./src/services/websocket/README.md) - Real-time updates
  - [Protocol Documentation](./src/services/websocket/docs/PROTOCOL.md) - Message format
  - [Client Integration Guide](./src/services/websocket/docs/CLIENT_INTEGRATION.md) - Frontend guide
- [Vote Aggregator](./vote-aggregator/README.md) - Vote aggregation service
  - [API Documentation](./vote-aggregator/docs/API.md) - Vote APIs
  - [Deployment Guide](./vote-aggregator/docs/DEPLOYMENT.md) - PM2 setup
- [Event Indexer](./event-indexer/README.md) - Blockchain event processing
  - [Implementation Guide](./event-indexer/docs/IMPLEMENTATION_GUIDE.md) - Setup guide
  - [API Documentation](./event-indexer/docs/API_DOCUMENTATION.md) - Webhook API
  - [Event Reference](./event-indexer/docs/EVENT_REFERENCE.md) - Event types

**Operations** (coming soon):
- OPERATIONS.md - Production runbook
- MONITORING.md - Monitoring setup
- SECURITY.md - Security best practices

---

## Deployment

### Prerequisites for Production

- Ubuntu 20.04+ or compatible Linux server
- Node.js 18+ installed
- Redis 7.x running
- PM2 installed globally
- Nginx (for reverse proxy)
- SSL certificate (Let's Encrypt recommended)

### Deployment Steps

```bash
# 1. Clone repository
git clone https://github.com/your-repo/zmart.git
cd zmart/backend

# 2. Install dependencies
npm install --production

# 3. Configure environment
cp .env.example .env
nano .env  # Edit with production values

# 4. Build
npm run build

# 5. Start with PM2
NODE_ENV=production pm2 start ecosystem.config.js

# 6. Setup PM2 startup
pm2 save
pm2 startup
# Follow instructions

# 7. Configure Nginx reverse proxy
sudo nano /etc/nginx/sites-available/zmart-backend
# (See deployment guide for Nginx config)

# 8. Restart Nginx
sudo systemctl restart nginx

# 9. Verify
curl https://api.yourdomain.com/health
```

### Monitoring

```bash
# PM2 monitoring
pm2 monit

# View logs
pm2 logs

# Check service status
pm2 status

# Restart if needed
pm2 restart all
```

---

## Troubleshooting

### Common Issues

#### 1. Services won't start

**Symptom**: PM2 shows services as "errored" or "stopped"

**Solution**:
```bash
# Check logs
pm2 logs api-gateway

# Common causes:
# - Missing .env file → Copy .env.example and fill in values
# - Redis not running → Start Redis: redis-server
# - Port already in use → Change port in .env or kill process
# - TypeScript not compiled → Run: npm run build
```

#### 2. Database connection failed

**Symptom**: `Error: connect ECONNREFUSED` or Supabase errors

**Solution**:
```bash
# Verify Supabase credentials
npm run test:db

# Check .env values:
# - SUPABASE_URL (correct project URL)
# - SUPABASE_SERVICE_ROLE_KEY (has admin permissions)
```

#### 3. Redis connection refused

**Symptom**: `Error: connect ECONNREFUSED 127.0.0.1:6379`

**Solution**:
```bash
# Start Redis
redis-server

# Or start as background service (macOS)
brew services start redis

# Or start as background service (Ubuntu)
sudo systemctl start redis
```

#### 4. WebSocket not connecting

**Symptom**: Frontend WebSocket connection fails

**Solution**:
```bash
# Check WebSocket server logs
pm2 logs websocket-server

# Verify WebSocket is running
wscat -c ws://localhost:4001

# Check firewall rules (production)
sudo ufw allow 4001/tcp
```

#### 5. Votes not aggregating

**Symptom**: Proposal votes submitted but market not auto-approved

**Solution**:
```bash
# Check vote aggregator logs
pm2 logs vote-aggregator

# Verify cron is running (should run every 5 minutes)
pm2 show vote-aggregator | grep "cron_restart"

# Manual trigger (for testing)
npm run monitor:run
```

### Debug Mode

```bash
# Enable debug logging
LOG_LEVEL=debug pm2 restart all

# View detailed logs
pm2 logs --lines 100
```

### Getting Help

- **Documentation**: Check service-specific READMEs
- **Logs**: `pm2 logs <service-name>` for error details
- **Health Checks**: `/health` endpoints for each service
- **Discord**: Join ZMART development Discord (coming soon)
- **Issues**: Open GitHub issue with logs attached

---

## Development

### Code Style

```bash
# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Format code with Prettier
npm run format
```

### Git Workflow

```bash
# Create feature branch
git checkout -b feature/your-feature-name

# Make changes, commit
git add .
git commit -m "feat: Add your feature description"

# Push and create PR
git push origin feature/your-feature-name
```

### Adding a New Service

1. Create service directory: `src/services/your-service/`
2. Add to PM2 config: `ecosystem.config.js`
3. Create service README: `src/services/your-service/README.md`
4. Add environment variables to `.env.example`
5. Update this README with service description
6. Write tests: `src/services/your-service/__tests__/`

---

## License

MIT License - See [LICENSE](../LICENSE) for details

---

## Contributors

**ZMART Development Team**
- Backend Architecture: Claude Code
- Vote Aggregation: Week 2 Sprint
- Event Indexing: Week 5 Sprint
- Documentation: Nov 9, 2025

---

**Last Updated**: November 9, 2025
**Version**: 0.69.0
**Status**: Development (Pre-Production)
**Mainnet Launch**: Planned for January 15, 2026
