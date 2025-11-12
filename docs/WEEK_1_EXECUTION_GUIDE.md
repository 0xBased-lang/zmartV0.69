# Week 1 Execution Guide - Backend Stabilization

**Timeline:** November 11-15, 2025 (5 days)
**Objective:** Fix critical backend stability issues (2 services crash-looping)
**Status:** Ready to Execute
**Blocking:** This MUST be completed before Week 2 parallel tracks can begin

---

## 🚨 Critical Context

### Current Situation
- **Vote Aggregator:** 42 restarts in 81 seconds (CRITICAL)
- **Market Monitor:** 42 restarts in 81 seconds (CRITICAL)
- **Other Services:** Stable (API Gateway, WebSocket, Event Indexer)

### Why This Blocks Everything
- Cannot proceed to Week 2 parallel tracks with unstable services
- Testing requires stable backend
- Frontend integration requires stable backend
- Security audit requires stable foundation

### Success Criteria
- ✅ Vote Aggregator: 0 restarts for 24+ hours
- ✅ Market Monitor: 0 restarts for 24+ hours
- ✅ All 5 services: "online" status in PM2
- ✅ Clean error logs (pm2 logs --err)

---

## Day 1-2: Fix Vote Aggregator (Monday-Tuesday)

### Step 1: Investigate Root Cause (4 hours)

**Check PM2 Logs:**
```bash
# SSH to server (if remote) or work locally
cd /Users/seman/Desktop/zmartV0.69/backend

# Check vote aggregator logs
pm2 logs vote-aggregator --lines 100 --err

# Look for patterns:
# - "ECONNREFUSED" (Redis connection failed)
# - "UnhandledPromiseRejectionWarning"
# - "TypeError" or "ReferenceError"
# - Stack traces pointing to specific files
```

**Check Redis Connection:**
```bash
# Verify Redis is running
redis-cli ping
# Expected: PONG

# If PONG, Redis is fine
# If error, Redis is not running or not accessible
```

**Check Environment Variables:**
```bash
# View current .env
cat backend/.env | grep REDIS

# Verify REDIS_URL is correct
# Expected format: redis://localhost:6379 or redis://[host]:6379
```

**Review Code (vote-aggregator/src/services/aggregationService.ts):**
```bash
# Search for Redis usage without error handling
grep -n "redis\." vote-aggregator/src/services/aggregationService.ts

# Look for:
# - redis.get() without try/catch
# - redis.set() without error handler
# - Missing .catch() on promises
```

**Hypothesis Formation:**
Based on logs, determine most likely cause:
1. ✅ **Hypothesis A:** Redis connection failure (ECONNREFUSED errors)
2. ✅ **Hypothesis B:** Unhandled promise rejection (promise-related errors)
3. ✅ **Hypothesis C:** Incorrect environment variable (wrong Redis URL)

---

### Step 2: Implement Fix (8 hours)

**If Hypothesis A (Redis Connection Failure):**

```typescript
// File: vote-aggregator/src/services/aggregationService.ts

import Redis from 'ioredis';

// BEFORE (no retry logic):
const redis = new Redis(process.env.REDIS_URL);

// AFTER (with retry logic):
const redis = new Redis(process.env.REDIS_URL, {
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay; // Exponential backoff, max 2s
  },
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  reconnectOnError(err) {
    const targetError = 'READONLY';
    if (err.message.includes(targetError)) {
      // Reconnect on specific errors
      return true;
    }
    return false;
  }
});

// Add error handlers
redis.on('error', (err) => {
  console.error('Redis connection error:', err);
  // Don't crash, just log
});

redis.on('connect', () => {
  console.log('Redis connected successfully');
});

redis.on('ready', () => {
  console.log('Redis ready to accept commands');
});
```

**If Hypothesis B (Unhandled Promise Rejection):**

```typescript
// File: vote-aggregator/src/services/aggregationService.ts

// BEFORE (no error handling):
export async function aggregateProposalVotes(marketId: string) {
  const votes = await redis.hgetall(`votes:proposal:${marketId}`);
  const result = await processVotes(votes);
  return result;
}

// AFTER (with try/catch):
export async function aggregateProposalVotes(marketId: string) {
  try {
    const votes = await redis.hgetall(`votes:proposal:${marketId}`);

    if (!votes || Object.keys(votes).length === 0) {
      console.log(`No votes found for market ${marketId}`);
      return { success: false, reason: 'no_votes' };
    }

    const result = await processVotes(votes);
    return { success: true, result };

  } catch (error) {
    console.error('Error aggregating proposal votes:', error);

    // Log error but don't crash
    if (error.message.includes('Redis')) {
      console.error('Redis error - will retry on next cron');
    }

    return { success: false, error: error.message };
  }
}
```

**If Hypothesis C (Wrong Environment Variable):**

```bash
# Fix .env file
nano backend/.env

# Ensure correct format:
REDIS_URL=redis://localhost:6379

# If using remote Redis:
# REDIS_URL=redis://[host]:[port]
# Or with auth:
# REDIS_URL=redis://:[password]@[host]:[port]

# Save and restart service
pm2 restart vote-aggregator
```

**Add Global Error Handlers:**

```typescript
// File: vote-aggregator/src/index.ts

// Add at top of file
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Log but don't crash
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Log but don't crash (PM2 will restart if needed)
});
```

---

### Step 3: Test Fix (4 hours)

**Local Testing:**
```bash
# Kill current process
pm2 delete vote-aggregator

# Rebuild
npm run build

# Start with PM2
pm2 start ecosystem.config.js --only vote-aggregator

# Monitor for 1 hour
pm2 monit

# Check logs every 15 minutes
pm2 logs vote-aggregator --lines 50

# Verify no crashes
pm2 status
# Expected: vote-aggregator "online" with 0 restarts
```

**Trigger Aggregation Manually:**
```bash
# If cron is every 5 min, wait for automatic trigger
# OR trigger manually:
curl -X POST http://localhost:4000/api/votes/aggregate/proposal \
  -H "Content-Type: application/json" \
  -d '{"marketId":"test-market-123"}'

# Check logs for success
pm2 logs vote-aggregator --lines 20
# Expected: "Aggregation successful" or similar
```

**4-Hour Stability Check:**
```bash
# Leave running for 4 hours
# Check every hour:
pm2 status

# After 4 hours:
# Vote Aggregator should show:
# - status: "online"
# - restart: 0
# - uptime: 4h+
```

**Commit Fix:**
```bash
git add .
git commit -m "fix(vote-aggregator): Add Redis connection retry logic and error handling

- Add exponential backoff retry strategy (max 2s delay)
- Add global unhandled rejection handler
- Add try/catch to aggregation functions
- Add Redis event handlers (error, connect, ready)

Fixes: Vote Aggregator crash loop (42 restarts/81s)
Test: Stable for 4+ hours with 0 crashes"

git push origin main
```

---

## Day 3-4: Fix Market Monitor (Wednesday-Thursday)

### Step 1: Investigate Root Cause (4 hours)

**Check PM2 Logs:**
```bash
pm2 logs market-monitor --lines 100 --err

# Look for:
# - RPC errors (429 rate limit, ECONNREFUSED)
# - Cron job errors
# - Database query errors
# - Unhandled exceptions
```

**Check Cron Job Configuration:**
```bash
# Review cron configuration
cat backend/src/services/market-monitor/index.ts

# Verify cron schedule (should be every 1-30 min)
# Verify cron job is wrapped in try/catch
```

**Check RPC Connection:**
```bash
# Test Solana RPC
curl https://api.devnet.solana.com -X POST \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}'

# Expected: {"result":"ok"}

# If rate limited (429), need fallback RPC
```

**Review Finalization Logic:**
```bash
# Check finalization code
cat backend/src/services/market-monitor/finalization.ts | grep -A 20 "finalizeMarket"

# Look for:
# - Missing try/catch
# - Unhandled async errors
# - Database query errors
```

**Hypothesis Formation:**
1. ✅ **Hypothesis A:** RPC rate limiting (429 errors)
2. ✅ **Hypothesis B:** Unhandled errors in cron job
3. ✅ **Hypothesis C:** Database query failures

---

### Step 2: Implement Fix (8 hours)

**If Hypothesis A (RPC Rate Limiting):**

```typescript
// File: backend/src/services/market-monitor/index.ts

import { Connection, clusterApiUrl } from '@solana/web3.js';

// BEFORE (single RPC):
const connection = new Connection(process.env.SOLANA_RPC_URL);

// AFTER (fallback RPC):
const primaryRPC = process.env.SOLANA_RPC_URL;
const fallbackRPCs = [
  'https://api.devnet.solana.com',
  'https://rpc.ankr.com/solana_devnet',
  clusterApiUrl('devnet')
];

let connection = new Connection(primaryRPC);
let currentRPCIndex = 0;

async function getRPCConnection() {
  try {
    // Test primary RPC
    await connection.getLatestBlockhash();
    return connection;
  } catch (error) {
    if (error.message.includes('429')) {
      // Rate limited, switch to fallback
      console.log(`Primary RPC rate limited, switching to fallback ${currentRPCIndex}`);

      currentRPCIndex = (currentRPCIndex + 1) % fallbackRPCs.length;
      connection = new Connection(fallbackRPCs[currentRPCIndex]);

      return connection;
    }
    throw error;
  }
}
```

**If Hypothesis B (Unhandled Cron Errors):**

```typescript
// File: backend/src/services/market-monitor/index.ts

import cron from 'node-cron';

// BEFORE (no error handling):
cron.schedule('*/1 * * * *', async () => {
  await checkAndFinalizeMarkets();
});

// AFTER (with try/catch):
cron.schedule('*/1 * * * *', async () => {
  try {
    console.log('Market Monitor: Starting finalization check');

    const result = await checkAndFinalizeMarkets();

    console.log('Market Monitor: Finalization check complete', {
      marketsChecked: result.checked,
      marketsFinalized: result.finalized
    });

  } catch (error) {
    console.error('Market Monitor: Error in cron job', {
      error: error.message,
      stack: error.stack
    });

    // Log to Sentry or error tracking
    // Don't crash - wait for next cron run
  }
});

// Add graceful error handling to checkAndFinalizeMarkets
async function checkAndFinalizeMarkets() {
  try {
    // Get markets ready for finalization
    const markets = await getMarketsReadyForFinalization();

    if (!markets || markets.length === 0) {
      console.log('Market Monitor: No markets ready for finalization');
      return { checked: 0, finalized: 0 };
    }

    let finalized = 0;

    for (const market of markets) {
      try {
        await finalizeMarket(market.id);
        finalized++;
      } catch (error) {
        console.error(`Failed to finalize market ${market.id}:`, error);
        // Continue with next market (don't crash)
      }
    }

    return { checked: markets.length, finalized };

  } catch (error) {
    console.error('Error checking markets for finalization:', error);
    return { checked: 0, finalized: 0, error: error.message };
  }
}
```

**If Hypothesis C (Database Query Failures):**

```typescript
// File: backend/src/services/market-monitor/finalization.ts

// BEFORE (no error handling):
export async function getMarketsReadyForFinalization() {
  const markets = await supabase
    .from('markets')
    .select('*')
    .eq('state', 'RESOLVING')
    .lte('resolution_timestamp', new Date().toISOString());

  return markets.data;
}

// AFTER (with error handling):
export async function getMarketsReadyForFinalization() {
  try {
    const { data, error } = await supabase
      .from('markets')
      .select('*')
      .eq('state', 'RESOLVING')
      .lte('resolution_timestamp', new Date().toISOString());

    if (error) {
      throw new Error(`Database query failed: ${error.message}`);
    }

    if (!data || data.length === 0) {
      console.log('No markets ready for finalization');
      return [];
    }

    console.log(`Found ${data.length} markets ready for finalization`);
    return data;

  } catch (error) {
    console.error('Error querying markets:', error);
    return []; // Return empty array, don't crash
  }
}
```

---

### Step 3: Test Fix (4 hours)

**Same process as Vote Aggregator:**

```bash
# Rebuild and restart
pm2 delete market-monitor
npm run build
pm2 start ecosystem.config.js --only market-monitor

# Monitor for 4 hours
pm2 monit
pm2 logs market-monitor --lines 50

# Verify stability
pm2 status
# Expected: market-monitor "online" with 0 restarts
```

**Commit Fix:**
```bash
git add .
git commit -m "fix(market-monitor): Add RPC fallback and cron error handling

- Add fallback RPC endpoints (rate limit protection)
- Add try/catch to cron job (prevent crashes)
- Add error handling to database queries
- Add graceful degradation (continue on individual failures)

Fixes: Market Monitor crash loop (42 restarts/81s)
Test: Stable for 4+ hours with 0 crashes"

git push origin main
```

---

## Day 5: Stability Verification (Friday)

### 24-Hour Monitoring

**Morning Check (9:00 AM):**
```bash
# Check all services
pm2 status

# Expected output:
# ┌────┬────────────────┬─────────┬─────────┬──────────┬────────┐
# │ id │ name           │ status  │ restart │ uptime   │ memory │
# ├────┼────────────────┼─────────┼─────────┼──────────┼────────┤
# │ 0  │ api-gateway    │ online  │ 0       │ 5d       │ 37 MB  │
# │ 1  │ websocket      │ online  │ 0       │ 5d       │ 23 MB  │
# │ 2  │ vote-aggregator│ online  │ 0       │ 2d       │ 43 MB  │ ✅
# │ 3  │ market-monitor │ online  │ 0       │ 1d       │ 43 MB  │ ✅
# │ 4  │ event-indexer  │ online  │ 0       │ 5d       │ 27 MB  │
# └────┴────────────────┴─────────┴─────────┴──────────┴────────┘

# Check error logs
pm2 logs --err --lines 50
# Expected: No errors
```

**Afternoon Check (3:00 PM):**
```bash
# Same checks
pm2 status
pm2 logs vote-aggregator --lines 20
pm2 logs market-monitor --lines 20

# Verify services still stable
```

**Evening Check (9:00 PM):**
```bash
# Final check
pm2 status

# All services should show:
# - status: online
# - restart: 0
# - uptime: 1d+ (for fixed services)
```

---

### Documentation

**Create WEEK1_DEBUGGING_REPORT.md:**
```markdown
# Week 1 Debugging Report

**Date:** November 11-15, 2025
**Objective:** Fix backend service stability issues

## Issues Fixed

### 1. Vote Aggregator Crash Loop
**Symptom:** 42 restarts in 81 seconds
**Root Cause:** Redis connection failure without retry logic
**Fix:**
- Added exponential backoff retry strategy
- Added global error handlers
- Added try/catch to aggregation functions
**Test:** Stable for 48+ hours, 0 crashes
**Commit:** [hash]

### 2. Market Monitor Crash Loop
**Symptom:** 42 restarts in 81 seconds
**Root Cause:** Unhandled errors in cron job
**Fix:**
- Added try/catch to cron job
- Added RPC fallback endpoints
- Added database query error handling
**Test:** Stable for 48+ hours, 0 crashes
**Commit:** [hash]

## Lessons Learned
1. Always add retry logic for external connections (Redis, RPC)
2. Always wrap cron jobs in try/catch
3. Add global error handlers (unhandledRejection, uncaughtException)
4. Test stability for 24+ hours before considering "fixed"

## Next Steps
- Week 2: Begin parallel tracks (security audit, frontend, tests)
- All services now stable foundation ✅
```

---

### Week 1 Quality Gate Check

**Checklist:**
- [ ] ✅ Vote Aggregator: 0 restarts for 24+ hours
- [ ] ✅ Market Monitor: 0 restarts for 24+ hours
- [ ] ✅ API Gateway: Still stable (0 new crashes)
- [ ] ✅ WebSocket Server: Still stable (0 new crashes)
- [ ] ✅ Event Indexer: Still stable (0 new crashes)
- [ ] ✅ All services: "online" status
- [ ] ✅ Redis: Connection stable
- [ ] ✅ RPC: Calls successful
- [ ] ✅ Clean error logs (no errors in pm2 logs --err)
- [ ] ✅ WEEK1_DEBUGGING_REPORT.md created

**If ALL checkboxes ✅:** PROCEED TO WEEK 2 🎉

**If ANY checkbox ❌:** Continue debugging, do NOT proceed

---

## Troubleshooting Common Issues

### Issue: Still Crashing After Fix

**Check:**
1. Did you rebuild? (`npm run build`)
2. Did you restart PM2? (`pm2 restart [service]`)
3. Are environment variables correct? (`cat .env`)
4. Is Redis actually running? (`redis-cli ping`)

**Debug:**
```bash
# Watch logs in real-time
pm2 logs [service] --lines 0 --raw

# Look for NEW error messages (not the old ones)
```

---

### Issue: Fix Works Locally, Crashes on Server

**Check:**
1. Environment differences (local vs production .env)
2. Redis URL different on server
3. RPC URL different on server
4. Missing dependencies on server

**Fix:**
```bash
# SSH to server
ssh [server]

# Pull latest code
cd /path/to/backend
git pull

# Rebuild
npm install
npm run build

# Restart with PM2
pm2 restart all
pm2 save
```

---

### Issue: Don't Know Root Cause

**Systematic Debugging:**
```bash
# 1. Check PM2 logs thoroughly
pm2 logs [service] --lines 200 --err > error-log.txt
less error-log.txt
# Look for first error in sequence (not cascade errors)

# 2. Add more logging
# Edit service code, add console.log at key points
console.log('1. Starting function X');
console.log('2. Redis connected');
console.log('3. Query completed');

# 3. Rebuild and monitor
npm run build
pm2 restart [service]
pm2 logs [service] --lines 0

# 4. See which log line appears before crash
```

---

## Success Criteria (Week 1 Gate)

**PASS Week 1 Quality Gate:**
✅ All 5 services stable 24+ hours
✅ 0 crashes across all services
✅ Clean error logs
✅ Documentation complete

**READY for Week 2:**
🎯 Proceed to parallel tracks
🔐 Launch blockchain-tool PRIMARY AUDIT
💻 Begin frontend transaction integration
🧪 Start integration test suite

---

**Estimated Completion:** November 15, 2025 (Friday EOD)
**Next Milestone:** Week 2 Day 1 - Launch PRIMARY AUDIT 🔐
