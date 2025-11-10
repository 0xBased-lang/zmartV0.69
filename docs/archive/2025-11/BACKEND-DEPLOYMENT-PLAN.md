# ZMART Backend Services - Deployment Plan
**Start Date:** November 7, 2025
**Timeline:** 23 hours over 5 days
**Status:** Ready to execute

---

## 📋 DEPLOYMENT SEQUENCE

### Prerequisites (30 minutes) - Day 1 Morning

#### Infrastructure Setup
- [x] Supabase deployed and configured
- [x] Backend keypair created and funded
- [x] Program deployed to devnet
- [x] GlobalConfig initialized
- [ ] Redis server running (local or cloud)
- [ ] Helius account created (webhook + RPC)
- [ ] Pinata account created (IPFS)
- [ ] PM2 installed for process management

#### Environment Variables Checklist
```bash
# Solana
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_PROGRAM_ID_CORE=7h3gXfBfYFueFVLYyfL5Qo1QGsf4GQUfW96FKVgnUsJS
BACKEND_KEYPAIR_PATH=/Users/seman/.config/solana/backend-authority.json

# Supabase
SUPABASE_URL=https://tkkqqxepelibqjjhxxct.supabase.co
SUPABASE_SERVICE_ROLE_KEY=[configured]

# Redis
REDIS_URL=redis://localhost:6379

# Helius (NEW)
HELIUS_RPC_URL=https://devnet.helius-rpc.com/?api-key=YOUR_KEY
HELIUS_WEBHOOK_SECRET=YOUR_WEBHOOK_SECRET

# Pinata (NEW)
PINATA_API_KEY=YOUR_PINATA_KEY
PINATA_SECRET_KEY=YOUR_PINATA_SECRET

# Services
API_PORT=4000
WS_PORT=4001
```

---

## SERVICE 1: Event Indexer (10 hours) - Day 1-2

### Overview
Listens to on-chain events via Helius webhooks and writes to Supabase.

### Architecture
```
Solana Program → Helius Webhook → Event Parser → Database Writers
                                        ↓
                    (16 event types parsed and stored)
```

### Deployment Steps

#### Step 1.1: Helius Account Setup (30 min)
1. Create Helius account: https://www.helius.dev/
2. Create API key for devnet
3. Configure webhook for program address
4. Test webhook endpoint

#### Step 1.2: Configure Webhook Endpoint (1 hour)
```typescript
// backend/src/services/event-indexer/webhook-handler.ts
POST /api/webhooks/helius
- Verify webhook signature
- Parse transaction events
- Route to appropriate writer
```

#### Step 1.3: Deploy Event Parser (2 hours)
```bash
# Test event parsing
npm run test -- event-indexer/event-parser.test.ts

# Build TypeScript
npm run build

# Start webhook server
pm2 start dist/services/event-indexer/index.js --name event-indexer
```

#### Step 1.4: Configure Helius Webhook (1 hour)
```bash
# Webhook configuration
curl -X POST https://api.helius.xyz/v0/webhooks \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "webhookURL": "https://your-domain.com/api/webhooks/helius",
    "transactionTypes": ["Any"],
    "accountAddresses": ["7h3gXfBfYFueFVLYyfL5Qo1QGsf4GQUfW96FKVgnUsJS"],
    "webhookType": "enhanced"
  }'
```

#### Step 1.5: Test with Real Transactions (2 hours)
1. Create test market on-chain
2. Verify webhook receives event
3. Check database for indexed data
4. Test all 16 event types

#### Step 1.6: Error Handling & Monitoring (3.5 hours)
1. Add retry logic for failed writes
2. Set up error logging
3. Create health check endpoint
4. Monitor first 24 hours

### Success Criteria
- ✅ Webhook receives program events within 1 second
- ✅ All 16 event types parsed correctly
- ✅ Database writes succeed with no data loss
- ✅ Error rate <0.1%
- ✅ 24-hour uptime test passes

---

## SERVICE 2: Vote Aggregator (3 hours) - Day 2

### Overview
Aggregates off-chain votes and submits on-chain when thresholds met.

### Architecture
```
Supabase (votes) → Redis (cache) → Cron (5 min) → Aggregation Logic → On-chain TX
                                                         ↓
                                        Check thresholds (70% proposal, 60% dispute)
```

### Deployment Steps

#### Step 2.1: Redis Setup (30 min)
```bash
# Local Redis
brew install redis
brew services start redis

# Or Docker
docker run -d -p 6379:6379 redis:7-alpine

# Test connection
redis-cli ping
# Should return: PONG
```

#### Step 2.2: Deploy Vote Aggregator (1 hour)
```bash
# Test aggregation logic
npm run test -- vote-aggregator/*.test.ts

# Build
npm run build

# Start service
pm2 start dist/services/vote-aggregator/index.js --name vote-aggregator --cron-restart="*/5 * * * *"
```

#### Step 2.3: Test Aggregation (1 hour)
1. Insert test votes into Supabase
2. Trigger cron manually
3. Verify on-chain transaction sent
4. Check Redis cache updates

#### Step 2.4: Monitor First Cycle (30 min)
1. Watch logs for 15 minutes (3 cycles)
2. Verify no errors
3. Check gas usage
4. Validate threshold logic

### Success Criteria
- ✅ Cron runs every 5 minutes
- ✅ Votes aggregated correctly (70%/60% thresholds)
- ✅ On-chain transactions succeed
- ✅ Redis cache working
- ✅ No duplicate aggregations

---

## SERVICE 3: Market Monitor (2 hours) - Day 3

### Overview
Monitors RESOLVING markets and auto-finalizes after 48-hour dispute window.

### Architecture
```
Cron (5 min) → Query Supabase (RESOLVING markets) → Check 48h elapsed → Finalize on-chain
                                                              ↓
                                            Update database (FINALIZED)
```

### Deployment Steps

#### Step 3.1: Configure Backend Authority (15 min)
```bash
# Verify backend keypair has authority
solana address -k /Users/seman/.config/solana/backend-authority.json
# Should match: 4WQwPjKHu3x7dHBEehBDgxXHJQoDuBvj6Xhu6C1jjTye

# Check balance
solana balance 4WQwPjKHu3x7dHBEehBDgxXHJQoDuBvj6Xhu6C1jjTye --url devnet
# Should have >1 SOL
```

#### Step 3.2: Deploy Market Monitor (45 min)
```bash
# Run comprehensive tests
npm run test -- market-monitor/*.test.ts

# Build
npm run build

# Start service
pm2 start dist/services/market-monitor/index.js --name market-monitor --cron-restart="*/5 * * * *"
```

#### Step 3.3: Create Test RESOLVING Market (30 min)
```sql
-- Backdate a market to 50 hours ago (past 48h window)
UPDATE markets
SET
  state = 'RESOLVING',
  proposed_outcome = 'YES',
  resolution_proposed_at = NOW() - INTERVAL '50 hours'
WHERE id = 'test-market-xxx';
```

#### Step 3.4: Test Finalization (30 min)
1. Trigger cron manually
2. Watch logs for finalization attempt
3. Verify on-chain transaction
4. Check database state updated to FINALIZED

### Success Criteria
- ✅ Detects markets past 48-hour window
- ✅ Finalization transaction succeeds
- ✅ Database state updated correctly
- ✅ Error handling works (retries, logging)
- ✅ Cron runs reliably every 5 minutes

---

## SERVICE 4: API Gateway (2 hours) - Day 3

### Overview
REST API with 21 endpoints for frontend integration.

### Architecture
```
Frontend → Express Server (port 4000) → Solana Program
                    ↓
              Supabase (read/write)
```

### Deployment Steps

#### Step 4.1: Configure Express Server (15 min)
```typescript
// backend/src/index.ts
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN }));
app.use(helmet());
app.use(express.json());

// Routes
app.use('/api/markets', marketRoutes);
app.use('/api/trades', tradeRoutes);
app.use('/api/votes', voteRoutes);
app.use('/api/discussions', discussionRoutes);
app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);

app.listen(4000, () => console.log('API Gateway running on port 4000'));
```

#### Step 4.2: Deploy API Gateway (45 min)
```bash
# Test all endpoints
npm run test -- api/*.test.ts

# Build
npm run build

# Start server
pm2 start dist/index.js --name api-gateway
```

#### Step 4.3: Test Endpoints (1 hour)
```bash
# Test GET /api/markets
curl http://localhost:4000/api/markets

# Test POST /api/votes/proposal
curl -X POST http://localhost:4000/api/votes/proposal \
  -H "Content-Type: application/json" \
  -d '{
    "market_id": "test-market-xxx",
    "user_wallet": "xxx",
    "vote": true
  }'

# Test all 21 endpoints systematically
```

### Success Criteria
- ✅ All 21 endpoints respond correctly
- ✅ CORS configured properly
- ✅ Rate limiting works
- ✅ Authentication validates
- ✅ Error responses are helpful

---

## SERVICE 5: WebSocket Server (4 hours) - Day 4

### Overview
Real-time updates via WebSocket for frontend.

### Architecture
```
Database Change → Supabase Realtime → WebSocket Server (port 4001) → Frontend Clients
                                              ↓
                            Broadcast updates (markets, trades, votes)
```

### Deployment Steps

#### Step 5.1: Configure WebSocket Server (1 hour)
```typescript
// backend/src/services/websocket/server.ts
import WebSocket from 'ws';

const wss = new WebSocket.Server({ port: 4001 });

wss.on('connection', (ws) => {
  console.log('Client connected');

  // Subscribe to channels
  ws.on('message', (message) => {
    const { action, channel } = JSON.parse(message);
    if (action === 'subscribe') {
      subscribeToChannel(ws, channel);
    }
  });
});
```

#### Step 5.2: Integrate Supabase Realtime (1 hour)
```typescript
// Listen to database changes
supabase
  .channel('markets')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'markets' }, (payload) => {
    broadcast('market-update', payload.new);
  })
  .subscribe();
```

#### Step 5.3: Deploy WebSocket Server (1 hour)
```bash
# Test WebSocket connections
npm run test -- websocket/*.test.ts

# Build
npm run build

# Start server
pm2 start dist/services/websocket/server.js --name websocket-server
```

#### Step 5.4: Load Testing (1 hour)
```bash
# Test with 100 concurrent connections
npm install -g artillery
artillery quick --count 100 --num 10 ws://localhost:4001
```

### Success Criteria
- ✅ Supports 100+ concurrent connections
- ✅ Updates broadcast within 500ms
- ✅ Handles reconnections gracefully
- ✅ No memory leaks
- ✅ Proper error handling

---

## SERVICE 6: IPFS Service (2 hours) - Day 4

### Overview
Daily snapshots of discussions to IPFS with 30-day retention.

### Architecture
```
Cron (midnight UTC) → Query Discussions → Upload to Pinata → Store CID in database
                                                    ↓
                                  Delete snapshots >30 days old
```

### Deployment Steps

#### Step 6.1: Pinata Account Setup (15 min)
1. Create account: https://www.pinata.cloud/
2. Generate API key and secret
3. Test upload with curl

#### Step 6.2: Deploy IPFS Service (45 min)
```bash
# Test snapshot logic
npm run test -- ipfs/*.test.ts

# Build
npm run build

# Start service
pm2 start dist/services/ipfs/index.js --name ipfs-service --cron-restart="0 0 * * *"
```

#### Step 6.3: Test Snapshot Creation (30 min)
1. Trigger cron manually
2. Verify upload to Pinata
3. Check CID stored in database
4. Test 30-day pruning logic

#### Step 6.4: Verify IPFS Gateway (30 min)
```bash
# Test retrieval
curl https://gateway.pinata.cloud/ipfs/YOUR_CID
```

### Success Criteria
- ✅ Daily snapshot runs at midnight UTC
- ✅ Discussions uploaded to IPFS
- ✅ CIDs stored in database
- ✅ 30-day pruning works
- ✅ Gateway retrieval succeeds

---

## INTEGRATION TESTING (2 hours) - Day 5

### Full Lifecycle Test

#### Test Scenario: Create → Vote → Approve → Trade → Resolve → Finalize → Claim

```bash
# 1. Create market (Event Indexer should capture)
npx ts-node scripts/create-market-onchain.ts

# 2. Submit proposal votes (Vote Aggregator should aggregate)
# Insert votes via API
curl -X POST http://localhost:4000/api/votes/proposal \
  -H "Content-Type: application/json" \
  -d '{"market_id": "xxx", "user_wallet": "xxx", "vote": true}'

# 3. Wait 5 minutes for aggregation
# Check logs: pm2 logs vote-aggregator

# 4. Approve market (once threshold reached)
# Call approve instruction

# 5. Activate market
# Call activate instruction

# 6. Buy shares (Event Indexer should capture trade)
# Call buy_shares instruction

# 7. Resolve market
# Call resolve_market instruction

# 8. Wait 48+ hours (or backdate for testing)
# Market Monitor should finalize

# 9. Claim winnings
# Call claim_winnings instruction

# 10. Verify all database updates
# Query Supabase to verify state transitions
```

### Success Criteria
- ✅ All events captured by Event Indexer
- ✅ Votes aggregated on-chain
- ✅ Market finalized automatically
- ✅ API endpoints return correct data
- ✅ WebSocket broadcasts all updates
- ✅ IPFS snapshot created
- ✅ No errors in logs
- ✅ Database state consistent

---

## MONITORING & HEALTH CHECKS (Ongoing)

### PM2 Dashboard
```bash
# View all services
pm2 list

# View logs
pm2 logs

# Monitor resources
pm2 monit

# Restart service
pm2 restart [service-name]
```

### Health Check Endpoints
```bash
# Event Indexer
curl http://localhost:4000/health/event-indexer

# Vote Aggregator
curl http://localhost:4000/health/vote-aggregator

# Market Monitor
curl http://localhost:4000/health/market-monitor

# API Gateway
curl http://localhost:4000/health

# WebSocket Server
curl http://localhost:4001/health

# IPFS Service
curl http://localhost:4000/health/ipfs
```

### Metrics to Monitor
- **Event Indexer**: Events/min, parse errors, database write latency
- **Vote Aggregator**: Votes aggregated, on-chain TXs, threshold accuracy
- **Market Monitor**: Markets finalized, finalization success rate, 48h accuracy
- **API Gateway**: Requests/sec, response times, error rate
- **WebSocket**: Connected clients, messages/sec, reconnection rate
- **IPFS**: Snapshots/day, upload success rate, storage used

---

## DEPLOYMENT CHECKLIST

### Day 1: Infrastructure + Event Indexer
- [ ] Install Redis
- [ ] Create Helius account
- [ ] Configure webhook
- [ ] Deploy Event Indexer
- [ ] Test with real transactions
- [ ] Monitor for 24 hours

### Day 2: Vote Aggregator
- [ ] Configure Redis connection
- [ ] Deploy Vote Aggregator
- [ ] Test aggregation logic
- [ ] Verify on-chain transactions
- [ ] Monitor first 3 cycles

### Day 3: Market Monitor + API Gateway
- [ ] Verify backend authority
- [ ] Deploy Market Monitor
- [ ] Create test RESOLVING market
- [ ] Test finalization
- [ ] Deploy API Gateway
- [ ] Test all 21 endpoints

### Day 4: WebSocket + IPFS
- [ ] Deploy WebSocket Server
- [ ] Test with 100 connections
- [ ] Create Pinata account
- [ ] Deploy IPFS Service
- [ ] Test snapshot creation

### Day 5: Integration Testing
- [ ] Run full lifecycle test
- [ ] Verify all services communicate
- [ ] Check database consistency
- [ ] Load testing
- [ ] Document any issues

---

## ROLLBACK PLAN

If any service fails:

```bash
# Stop service
pm2 stop [service-name]

# Check logs
pm2 logs [service-name] --lines 100

# Rollback to previous version
git checkout [previous-commit]
npm run build
pm2 restart [service-name]

# If database issue:
# Run rollback migration
npm run migrate:rollback
```

---

## SUCCESS METRICS

### After 5 Days
- ✅ 6/6 services deployed and running
- ✅ 99%+ uptime for all services
- ✅ Full lifecycle test passes
- ✅ <1% error rate across services
- ✅ Database state consistent
- ✅ All health checks passing
- ✅ Monitoring dashboard operational

### Ready for Next Phase
- ✅ Frontend can connect to API
- ✅ Real-time updates working
- ✅ Event indexing reliable
- ✅ Vote aggregation automated
- ✅ Market finalization automated
- ✅ IPFS snapshots working

---

**Timeline:** 5 days, 23 hours total
**Status:** Ready to execute
**Next Steps:** Start with infrastructure setup (Redis + Helius)
