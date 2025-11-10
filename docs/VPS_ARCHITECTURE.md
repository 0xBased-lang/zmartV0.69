# VPS Architecture - ZMART V0.69

## Overview

This document explains how ZMART's backend services are deployed and managed on the VPS (Virtual Private Server).

**Server Details:**
- **IP**: 185.202.236.71
- **Hostname**: kek
- **OS**: Ubuntu Linux
- **SSH Access**: `ssh kek`

---

## What Runs on the VPS

### 5 Backend Services (via PM2)

All services run as PM2 processes managed by Node.js:

```
┌────┬─────────────────────┬──────────┬─────────┐
│ ID │ Service Name        │ Port     │ Purpose │
├────┼─────────────────────┼──────────┼─────────┤
│ 0  │ api-gateway         │ 4000     │ REST API│
│ 1  │ websocket-server    │ 4001     │ Real-time│
│ 2  │ vote-aggregator     │ None     │ Cron job│
│ 3  │ market-monitor      │ None     │ Cron job│
│ 4  │ event-indexer       │ 4002     │ Webhooks│
└────┴─────────────────────┴──────────┴─────────┘
```

#### Service 1: API Gateway (Port 4000)
- **Purpose**: REST API for frontend requests
- **Features**:
  - GET /markets - List all markets
  - GET /positions/:userId - User positions
  - GET /trades - Trade history
  - Health checks, CORS, rate limiting
- **Dependencies**: Supabase (database), Solana RPC

#### Service 2: WebSocket Server (Port 4001)
- **Purpose**: Real-time updates to frontend
- **Features**:
  - Broadcasts market price changes
  - Notifies new trades
  - Sends state transitions (PROPOSED → ACTIVE, etc.)
- **Dependencies**: Supabase real-time subscriptions

#### Service 3: Vote Aggregator (Cron: Every 5 min)
- **Purpose**: Aggregate off-chain votes → on-chain
- **Workflow**:
  - Collect proposal/dispute votes from Supabase
  - Calculate thresholds (70% like/dislike)
  - Submit aggregate transaction to Solana program
- **Dependencies**: Supabase, Solana RPC

#### Service 4: Market Monitor (Cron: Every 5 min)
- **Purpose**: Automatic state transitions
- **Workflow**:
  - Check markets in RESOLVING state
  - If 48h elapsed → trigger finalize_market()
  - Alert stuck markets
- **Dependencies**: Supabase, Solana RPC

#### Service 5: Event Indexer (Port 4002)
- **Purpose**: Blockchain event listener
- **Features**:
  - Receives Helius webhooks (new trades, state changes)
  - Indexes events to Supabase
  - Caches on-chain state for fast API reads
- **Dependencies**: Helius, Supabase

---

## What DOES NOT Run on VPS

### Database (Supabase Cloud)
- **Location**: External managed service
- **URL**: `https://tkkqqxepelibqjjhxxct.supabase.co`
- **Connection**: VPS services connect over HTTPS
- **Why external**: Managed backups, scalability, real-time features

### Frontend (Vercel)
- **Development**: Local (localhost:3000)
- **Staging**: Vercel Free (future)
- **Production**: Vercel Pro (future)
- **Why not VPS**: Better CDN, automatic deployments, optimized for Next.js

### Blockchain (Solana Network)
- **Development**: Devnet
- **Production**: Mainnet (future)
- **Connection**: VPS services call Solana RPC via Helius

---

## Network Architecture

```
┌───────────────────────────────────────────────────────────┐
│                    INTERNET                               │
└─────────────────┬─────────────────┬───────────────────────┘
                  │                 │
        ┌─────────▼───────┐  ┌──────▼─────────────┐
        │  Solana Devnet  │  │  Supabase Cloud    │
        │  (Blockchain)   │  │  (Database)        │
        └─────────┬───────┘  └──────┬─────────────┘
                  │                 │
                  │                 │
        ┌─────────▼─────────────────▼─────────────┐
        │      VPS (185.202.236.71)               │
        │                                         │
        │  ┌───────────────────────────────────┐  │
        │  │   PM2 Process Manager             │  │
        │  │                                   │  │
        │  │  ┌─────────────────────────────┐ │  │
        │  │  │ 1. API Gateway :4000        │ │  │
        │  │  └─────────────────────────────┘ │  │
        │  │  ┌─────────────────────────────┐ │  │
        │  │  │ 2. WebSocket :4001          │ │  │
        │  │  └─────────────────────────────┘ │  │
        │  │  ┌─────────────────────────────┐ │  │
        │  │  │ 3. Vote Aggregator (cron)   │ │  │
        │  │  └─────────────────────────────┘ │  │
        │  │  ┌─────────────────────────────┐ │  │
        │  │  │ 4. Market Monitor (cron)    │ │  │
        │  │  └─────────────────────────────┘ │  │
        │  │  ┌─────────────────────────────┐ │  │
        │  │  │ 5. Event Indexer :4002      │ │  │
        │  │  └─────────────────────────────┘ │  │
        │  └───────────────────────────────────┘  │
        └─────────────────────────────────────────┘
                          │
                          │
                ┌─────────▼────────┐
                │  Frontend        │
                │  (Vercel)        │
                └──────────────────┘
```

---

## File Structure on VPS

```
/var/www/zmart/
├── backend/
│   ├── backend/              # Main backend code
│   │   ├── .env             # Live credentials (DEVNET)
│   │   ├── dist/            # Compiled JS (PM2 runs this)
│   │   │   ├── index.js     # API Gateway entry
│   │   │   └── services/
│   │   │       ├── websocket/
│   │   │       └── market-monitor/
│   │   ├── ecosystem.config.js  # PM2 configuration
│   │   └── logs/            # Service logs
│   ├── vote-aggregator/     # Standalone service
│   │   └── dist/
│   └── event-indexer/       # Standalone service
│       └── src/
└── logs/                    # All service logs
```

---

## PM2 Management

### Common Commands

```bash
# SSH to VPS
ssh kek

# Check all services
pm2 list

# View logs
pm2 logs api-gateway
pm2 logs --lines 50

# Restart services
pm2 restart all
pm2 restart api-gateway

# Stop services
pm2 stop all
pm2 stop vote-aggregator

# Delete and recreate
pm2 delete market-monitor
pm2 start ecosystem.config.js --only market-monitor

# Save PM2 state
pm2 save
```

### Understanding Restarts

**High restart count (4,000+) is NORMAL for cron jobs:**
- `vote-aggregator` restarts every 5 minutes (by design)
- `market-monitor` restarts every 5 minutes (by design)
- This is controlled by `cron_restart: '*/5 * * * *'` in `ecosystem.config.js`

**Permanent services should have low restart count:**
- `api-gateway` - Should stay under 10 restarts
- `websocket-server` - Should stay under 10 restarts
- `event-indexer` - Should stay under 10 restarts

**If services crash frequently:**
```bash
# Check error logs
pm2 logs <service-name> --err

# Check environment variables
cat /var/www/zmart/backend/backend/.env | grep -E "SOLANA_RPC|SUPABASE"

# Verify dependencies installed
cd /var/www/zmart/backend/backend && npm list async winston
```

---

## Environment Configuration

### Critical Environment Variables

Located in: `/var/www/zmart/backend/backend/.env`

```bash
# Network Configuration (MUST BE DEVNET)
SOLANA_RPC_URL=https://devnet.helius-rpc.com/?api-key=YOUR_KEY

# Database Connection
SUPABASE_URL=https://tkkqqxepelibqjjhxxct.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<secret>

# API Configuration
API_PORT=4000
WS_PORT=4001
```

**⚠️ CRITICAL: VPS MUST use DEVNET, never mainnet during development!**

### Verifying Network Configuration

```bash
ssh kek
cat /var/www/zmart/backend/backend/.env | grep SOLANA_RPC_URL
# Should show: https://devnet.helius-rpc.com/...
# NOT: https://mainnet.helius-rpc.com/...
```

---

## Data Flow Example

### User Buys Shares

1. **Frontend** (Vercel) → User clicks "Buy 10 YES shares"
2. **Wallet** → Signs transaction with user's private key
3. **Solana Devnet** → Transaction executed, shares minted
4. **Helius** → Detects transaction, sends webhook
5. **Event Indexer** (VPS:4002) → Receives webhook
6. **Supabase** (Cloud) → Event Indexer writes trade record
7. **WebSocket Server** (VPS:4001) → Broadcasts update to all clients
8. **Frontend** (Vercel) → Receives WebSocket message, updates UI

**Total latency: ~2-5 seconds** (Solana finality + webhook + database write)

---

## Security Best Practices

### VPS Access
- ✅ SSH key authentication only (no password login)
- ✅ Firewall configured (only ports 22, 80, 443, 4000-4002 open)
- ❌ Never commit VPS IP or SSH keys to git

### Environment Variables
- ✅ `.env` files in `.gitignore`
- ✅ Use service role keys for backend, anon keys for frontend
- ❌ Never expose `SUPABASE_SERVICE_ROLE_KEY` to frontend

### Process Management
- ✅ PM2 automatically restarts crashed services
- ✅ Logs rotated to prevent disk space issues
- ✅ Max restart limits prevent crash loops

---

## Monitoring & Debugging

### Health Checks

```bash
# Test API Gateway
curl http://185.202.236.71:4000/health

# Test Event Indexer
curl http://185.202.236.71:4002/health

# Check WebSocket (requires wscat)
wscat -c ws://185.202.236.71:4001
```

### Common Issues

#### Services Not Starting
```bash
# Check PM2 logs
pm2 logs <service-name> --err

# Common causes:
# 1. Missing dependencies: npm install in service directory
# 2. Port already in use: kill existing process
# 3. Invalid .env: check SOLANA_RPC_URL, SUPABASE_URL
```

#### High Memory Usage
```bash
# Check memory per service
pm2 list

# Restart memory-heavy services
pm2 restart <service-name>

# Services restart automatically at 500MB (configured in ecosystem.config.js)
```

#### Database Connection Errors
```bash
# Test Supabase connection
curl https://tkkqqxepelibqjjhxxct.supabase.co/rest/v1/markets?limit=1 \
  -H "apikey: YOUR_ANON_KEY"

# Common causes:
# 1. Wrong SUPABASE_URL in .env
# 2. Expired API keys (rotate in Supabase dashboard)
# 3. Supabase service down (check status.supabase.com)
```

---

## Deployment Workflow

See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for complete deployment instructions.

**Quick Summary:**

```bash
# 1. Deploy code to VPS
git push origin main
ssh kek "cd /var/www/zmart/backend && git pull"

# 2. Build and restart
ssh kek "cd /var/www/zmart/backend/backend && npm run build && pm2 restart all"

# 3. Verify
ssh kek "pm2 list"
curl http://185.202.236.71:4000/health
```

---

## Cost Breakdown

**Current (Development):**
- VPS: $20/month (Hetzner or similar)
- All services run on single VPS

**Future (Production):**
- VPS Upgrade: $40-80/month (more CPU/RAM)
- Services stay on same VPS (no need for separate servers)

**Why not serverless?**
- Cron jobs (vote aggregator, market monitor) need persistent processes
- WebSocket server requires stateful connection
- VPS is simpler and cheaper for 5 small services

---

## Related Documentation

- [SUPABASE_INTEGRATION.md](./SUPABASE_INTEGRATION.md) - How Supabase fits in
- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - Step-by-step deployment
- [CLAUDE.md](../CLAUDE.md) - Project instructions for Claude Code

---

*Last Updated: November 10, 2025 | Status: Production-Ready*
