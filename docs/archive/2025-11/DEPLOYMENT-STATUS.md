# ZMART Backend Services - Deployment Status
**Last Updated:** November 7, 2025, 6:10 PM
**Infrastructure:** Ready
**Services Deployed:** 0/6

---

## ✅ INFRASTRUCTURE STATUS

### System Requirements
- ✅ **Node.js:** v18+ installed
- ✅ **TypeScript:** Compiled to dist/
- ✅ **PM2:** Installed globally
- ✅ **Redis:** Running on port 6379
- ✅ **Supabase:** Connected and operational
- ✅ **Backend Keypair:** Configured and funded (4.98 SOL)
- ✅ **GlobalConfig:** Initialized on devnet

### Environment Configuration
- ✅ SOLANA_RPC_URL: Configured
- ✅ SOLANA_PROGRAM_ID_CORE: Configured
- ✅ BACKEND_KEYPAIR_PATH: Configured
- ✅ SUPABASE_URL: Configured
- ✅ SUPABASE_SERVICE_ROLE_KEY: Configured
- ✅ REDIS_URL: Configured
- ⏳ HELIUS_RPC_URL: Needs API key
- ⏳ HELIUS_WEBHOOK_SECRET: Needs webhook secret
- ⏳ PINATA_API_KEY: Needs account setup
- ⏳ PINATA_SECRET_KEY: Needs account setup

---

## 🚀 SERVICES DEPLOYMENT STATUS

### Group A: Ready to Deploy (No External Dependencies)

#### Service 1: API Gateway ⏳ READY

**Status:** Built, ready to start
**Port:** 4000
**Dependencies:** ✅ Supabase only
**Command:** `pm2 start ecosystem.config.js --only api-gateway`

**Endpoints (21):**
- GET /api/markets
- GET /api/markets/:id
- POST /api/markets
- POST /api/markets/:id/resolve
- POST /api/markets/:id/approve
- POST /api/markets/:id/activate
- POST /api/markets/:id/cancel
- POST /api/trades/buy
- POST /api/trades/sell
- POST /api/trades/claim
- POST /api/trades/withdraw
- POST /api/votes/proposal
- POST /api/votes/dispute
- GET /api/discussions/:marketId
- POST /api/discussions/:marketId
- GET /api/discussions/:marketId/snapshots
- GET /api/users/:wallet
- PUT /api/users/:wallet
- GET /api/users/:wallet/stats
- POST /api/auth/nonce
- POST /api/auth/verify

**Test:**
```bash
# Start service
pm2 start ecosystem.config.js --only api-gateway

# Test endpoint
curl http://localhost:4000/api/markets

# Check logs
pm2 logs api-gateway
```

---

#### Service 2: WebSocket Server ⏳ READY

**Status:** Built, ready to start
**Port:** 4001
**Dependencies:** ✅ Supabase only
**Command:** `pm2 start ecosystem.config.js --only websocket-server`

**Features:**
- Real-time market updates
- Trade notifications
- Vote notifications
- Discussion updates

**Test:**
```bash
# Start service
pm2 start ecosystem.config.js --only websocket-server

# Test connection (use wscat)
npm install -g wscat
wscat -c ws://localhost:4001

# Check logs
pm2 logs websocket-server
```

---

#### Service 3: Vote Aggregator ⏳ READY

**Status:** Built, ready to start
**Cron:** Every 5 minutes
**Dependencies:** ✅ Redis + Supabase
**Command:** `pm2 start ecosystem.config.js --only vote-aggregator`

**Logic:**
- Proposal votes: 70% threshold
- Dispute votes: 60% threshold
- Minimum 10 votes before aggregation
- Submits on-chain when threshold met

**Test:**
```bash
# Start service
pm2 start ecosystem.config.js --only vote-aggregator

# Manually trigger (for testing)
node dist/services/vote-aggregator/index.js

# Check logs
pm2 logs vote-aggregator
```

---

#### Service 4: Market Monitor ⏳ READY

**Status:** Built, ready to start
**Cron:** Every 5 minutes
**Dependencies:** ✅ Program access + Supabase
**Command:** `pm2 start ecosystem.config.js --only market-monitor`

**Logic:**
- Monitors RESOLVING markets
- Checks if 48-hour dispute window elapsed
- Auto-finalizes eligible markets
- Updates database state

**Test:**
```bash
# Start service
pm2 start ecosystem.config.js --only market-monitor

# Manually trigger (for testing)
node dist/services/market-monitor/index.js

# Check logs
pm2 logs market-monitor
```

---

### Group B: Needs External Account Setup

#### Service 5: Event Indexer ❌ BLOCKED

**Status:** Built, waiting for Helius account
**Port:** Webhook endpoint (part of API Gateway)
**Dependencies:** ❌ Helius API key + webhook
**Command:** `pm2 start ecosystem.config.js --only event-indexer`

**Blocked By:**
1. Sign up for Helius: https://www.helius.dev/
2. Create API key for devnet
3. Configure webhook for program address: `7h3gXfBfYFueFVLYyfL5Qo1QGsf4GQUfW96FKVgnUsJS`
4. Add credentials to .env:
   - HELIUS_RPC_URL=https://devnet.helius-rpc.com/?api-key=YOUR_KEY
   - HELIUS_WEBHOOK_SECRET=YOUR_SECRET

**Estimated Setup Time:** 30 minutes

---

#### Service 6: IPFS Service ❌ BLOCKED

**Status:** Built, waiting for Pinata account
**Cron:** Daily at midnight UTC
**Dependencies:** ❌ Pinata API credentials
**Command:** `pm2 start ecosystem.config.js --only ipfs-service`

**Blocked By:**
1. Sign up for Pinata: https://www.pinata.cloud/
2. Create API key and secret (free tier works)
3. Add credentials to .env:
   - PINATA_API_KEY=YOUR_KEY
   - PINATA_SECRET_KEY=YOUR_SECRET

**Estimated Setup Time:** 15 minutes

---

## 📊 DEPLOYMENT PROGRESS

### Overall Status
- **Built:** 6/6 services (100%)
- **Ready to Deploy:** 4/6 services (67%)
- **Deployed:** 0/6 services (0%)
- **Blocked:** 2/6 services (33%)

### Timeline
- **Now:** Deploy Group A services (4/6) - 15 minutes
- **Tomorrow:** Set up Helius + Pinata accounts - 45 minutes
- **Tomorrow:** Deploy Group B services (2/6) - 30 minutes
- **Total Time:** ~1.5 hours to all 6 services running

---

## 🎯 QUICK START

### Option A: Deploy All Ready Services Now (Recommended)

```bash
# Start all Group A services at once
cd /Users/seman/Desktop/zmartV0.69/backend
pm2 start ecosystem.config.js

# Check status
pm2 list

# View logs
pm2 logs

# Test API Gateway
curl http://localhost:4000/api/markets
```

**Result:** 4/6 services running in < 1 minute

---

### Option B: Deploy One Service at a Time

```bash
# Service 1: API Gateway
pm2 start ecosystem.config.js --only api-gateway
curl http://localhost:4000/api/markets

# Service 2: WebSocket Server
pm2 start ecosystem.config.js --only websocket-server
# Test with wscat: wscat -c ws://localhost:4001

# Service 3: Vote Aggregator
pm2 start ecosystem.config.js --only vote-aggregator
# Check logs: pm2 logs vote-aggregator

# Service 4: Market Monitor
pm2 start ecosystem.config.js --only market-monitor
# Check logs: pm2 logs market-monitor
```

---

### Option C: Deploy After Full Setup (All 6 Services)

```bash
# 1. Set up Helius account (30 min)
# 2. Set up Pinata account (15 min)
# 3. Update .env with API keys
# 4. Uncomment services in ecosystem.config.js
# 5. Start all services
pm2 start ecosystem.config.js
```

---

## 🔍 MONITORING

### PM2 Commands

```bash
# View all services
pm2 list

# View logs (all services)
pm2 logs

# View logs (specific service)
pm2 logs api-gateway
pm2 logs market-monitor
pm2 logs vote-aggregator
pm2 logs websocket-server

# Restart service
pm2 restart api-gateway

# Stop service
pm2 stop api-gateway

# Delete service
pm2 delete api-gateway

# Monitor resources
pm2 monit

# Save PM2 configuration
pm2 save

# Set PM2 to start on boot
pm2 startup
```

### Health Checks

```bash
# API Gateway
curl http://localhost:4000/health

# WebSocket Server
curl http://localhost:4001/health

# Check Redis
redis-cli ping

# Check Supabase
curl https://tkkqqxepelibqjjhxxct.supabase.co/rest/v1/

# Check backend balance
solana balance 4WQwPjKHu3x7dHBEehBDgxXHJQoDuBvj6Xhu6C1jjTye --url devnet
```

---

## ❓ TROUBLESHOOTING

### Service Won't Start

```bash
# Check logs
pm2 logs [service-name] --lines 100

# Check environment variables
pm2 env [service-id]

# Restart with fresh logs
pm2 delete [service-name]
pm2 start ecosystem.config.js --only [service-name]
```

### Port Already in Use

```bash
# Find process using port
lsof -i :4000
lsof -i :4001

# Kill process
kill -9 [PID]

# Restart service
pm2 restart [service-name]
```

### Redis Connection Issues

```bash
# Check Redis status
redis-cli ping

# Start Redis
brew services start redis

# Check Redis logs
brew services info redis
```

### Out of Memory

```bash
# Check memory usage
pm2 monit

# Increase memory limit in ecosystem.config.js
max_memory_restart: '1G'

# Restart service
pm2 restart [service-name]
```

---

## ✅ SUCCESS CRITERIA

### After Deploying Group A (4 services)
- ✅ PM2 shows 4 services online
- ✅ API Gateway responds on port 4000
- ✅ WebSocket Server accepts connections on port 4001
- ✅ Vote Aggregator cron runs every 5 minutes
- ✅ Market Monitor cron runs every 5 minutes
- ✅ All logs show no errors
- ✅ Services auto-restart if crashed

### After Deploying Group B (all 6 services)
- ✅ PM2 shows 6 services online
- ✅ Event Indexer receives webhook events
- ✅ Events written to database correctly
- ✅ IPFS snapshots created daily
- ✅ All services monitored and healthy

---

## 🎉 NEXT STEPS

### Immediate (5 minutes)
1. Deploy Group A services: `pm2 start ecosystem.config.js`
2. Test API Gateway: `curl http://localhost:4000/api/markets`
3. Check all services running: `pm2 list`

### Tomorrow (45 minutes)
1. Sign up for Helius account (30 min)
2. Sign up for Pinata account (15 min)
3. Update .env with credentials
4. Deploy Group B services

### This Week (2 hours)
1. Create test data in database
2. Test full lifecycle (create → vote → approve → trade → resolve → finalize)
3. Monitor services for 24 hours
4. Fix any issues
5. Document any edge cases

---

**Status:** Infrastructure complete, 4/6 services ready to deploy immediately
**Recommendation:** Deploy Group A now, set up accounts tomorrow
**Total Time to All Services Running:** ~1.5 hours
