# VPS Deployment Checklist - November 12, 2025

**GitHub Status:** ✅ PR #1 Merged to Main
**VPS Status:** ⏳ Ready for Deployment
**Time:** 19:15 CET

---

## 🎯 Pre-Deployment Verification

### ✅ GitHub Main Branch Confirmed

```
Commit: 0e6d5d2 - Merge PR #1
├── 638eede - Database schema fix (monitor.ts)
└── 9433be4 - VPS hotfixes (IDL path, ecosystem.config.js)
```

**All critical fixes included:**
- ✅ IDL path uses `path.join()` (cross-platform)
- ✅ WebSocket service removed from ecosystem.config.js
- ✅ Database query fixed (no `market_id` column)

---

## 🚀 VPS Deployment Steps

### Step 1: Connect to VPS

```bash
ssh kek
# Or: ssh root@185.202.236.71
```

**Expected:** Successfully connected to VPS

---

### Step 2: Navigate to Project Directory

```bash
cd /var/www/zmart
pwd
# Expected output: /var/www/zmart
```

---

### Step 3: Check Current Branch and Status

```bash
git status
git branch -v
```

**Current State:**
- Branch: `claude/backend-sync-verification-and-documentation-audit-011CV4WKMpTFPhsx1Fr2BGwQ`
- Status: Clean (or has local .env changes)

---

### Step 4: Stash Any Local Changes (If Needed)

```bash
# If git status shows modified files
git stash save "Pre-deployment backup $(date +%Y%m%d-%H%M%S)"

# Verify clean
git status
# Expected: nothing to commit, working tree clean
```

---

### Step 5: Switch to Main Branch

```bash
git checkout main
```

**Expected Output:**
```
Switched to branch 'main'
Your branch is behind 'origin/main' by X commits.
```

---

### Step 6: Pull Latest Code from GitHub

```bash
git pull origin main
```

**Expected Output:**
```
Updating 44b26e0..0e6d5d2
Fast-forward
 backend/ecosystem.config.js                    | 40 +--
 backend/src/index.ts                           |  5 +-
 backend/src/services/market-monitor/monitor.ts | 25 +-
 docs/workflow/VPS_SYNC_FIX_NOVEMBER_12.md      | 379 +++++++++++++++++++++++++
 4 files changed, 408 insertions(+), 41 deletions(-)
```

---

### Step 7: Verify Critical Files Updated

```bash
# Check IDL path fix
grep -n "path.join.*idl" backend/src/index.ts
# Expected: Line 82 with path.join(__dirname, '../target/idl/zmart_core.json')

# Check websocket-server removed
grep -c "name: 'websocket-server'" backend/ecosystem.config.js
# Expected: 0

# Check monitor.ts query
grep "\.select.*on_chain_address" backend/src/services/market-monitor/monitor.ts
# Expected: .select('id, on_chain_address, proposed_outcome, ...') - NO market_id
```

**All 3 checks should pass ✅**

---

### Step 8: Restore .env Configuration (If Needed)

```bash
# Check if backend authority key is still correct
cd backend
grep "BACKEND_AUTHORITY_PRIVATE_KEY=424zNck4" .env

# If not found, restore it:
sed -i 's/^BACKEND_AUTHORITY_PRIVATE_KEY=.*/BACKEND_AUTHORITY_PRIVATE_KEY=424zNck4JvUFnv4BTtwShw8XUGw5A9yUtQDSvFFsZenRv5M3g1YRTpxM3UKx6kgyRJ3uNSuLMPQgrwzdD3ree5Ye/' .env

# Verify
grep "BACKEND_AUTHORITY_PRIVATE_KEY" .env | head -c 50
# Should show: BACKEND_AUTHORITY_PRIVATE_KEY=424zNck4JvUFnv4BTtwS...
```

**Critical:** Backend authority must match on-chain config:
- Public Key: `4MkybTASDtmzQnfUWztHmfgyHgBREw74eTKipVADqQLA`

---

### Step 9: Install Dependencies

```bash
# IMPORTANT: Use pnpm, not npm!
pnpm install
```

**Expected:**
```
Lockfile is up to date, resolution step is skipped
Packages: +XXX
+++++++++++++++++++++++++++
Done in Xs
```

**If you see errors:**
```bash
# Clean install
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

---

### Step 10: Build Backend

```bash
pnpm build
```

**Expected:**
```
> zmart-backend@0.69.0 build
> tsc

(No errors)
```

**Check dist directory:**
```bash
ls -la dist/
# Should show: api/, config/, services/, types/, utils/, index.js
```

---

### Step 11: Restart All Services

```bash
pm2 restart all
```

**Expected:**
```
[PM2] Applying action restartProcessId on app [all]
[PM2] [api-gateway](0) ✓
[PM2] [vote-aggregator](1) ✓
[PM2] [market-monitor](2) ✓
[PM2] [event-indexer](3) ✓
```

---

### Step 12: Verify Services Started

```bash
pm2 list
```

**Expected (all services online):**
```
┌────┬─────────────────────┬─────────┬─────────┬─────────┬──────────┐
│ id │ name                │ status  │ restart │ uptime  │ memory   │
├────┼─────────────────────┼─────────┼─────────┼─────────┼──────────┤
│ 0  │ api-gateway         │ online  │ 0       │ 0s      │ XX MB    │
│ 1  │ vote-aggregator     │ online  │ 0       │ 0s      │ XX MB    │
│ 2  │ market-monitor      │ online  │ 0       │ 0s      │ XX MB    │
│ 3  │ event-indexer       │ online  │ 0       │ 0s      │ XX MB    │
└────┴─────────────────────┴─────────┴─────────┴─────────┴──────────┘
```

**If any service shows "errored":**
```bash
pm2 logs [service-name] --lines 50
# Check for errors
```

---

### Step 13: Monitor Logs for Errors

```bash
# Watch all logs for 30 seconds
pm2 logs --lines 50 --nostream

# Or watch in real-time
pm2 logs
# Press Ctrl+C to exit after checking
```

**What to look for:**
- ✅ No "module not found" errors
- ✅ No "backend authority mismatch" errors
- ✅ No "column does not exist" errors
- ✅ Services report "running" or "started successfully"

---

### Step 14: Test Health Endpoints

```bash
# Test API Gateway (REST)
curl http://localhost:4000/health

# Expected response:
# {"status":"healthy","uptime":XX,"environment":"development"}
```

```bash
# Test Event Indexer
curl http://localhost:4002/health

# Expected response:
# {"status":"ok","service":"zmart-event-indexer","database":"connected"}
```

**Both should return 200 OK ✅**

---

### Step 15: Verify WebSocket Port

```bash
lsof -i :4001

# Expected output:
# node    XXXXX root    XX   TCP *:4001 (LISTEN)
```

**This confirms WebSocket is running inside api-gateway ✅**

---

### Step 16: Check Market Monitor (Critical)

```bash
# Check market-monitor logs specifically
pm2 logs market-monitor --lines 30 --nostream

# Look for:
# ✅ "Backend authority validation successful"
# ✅ "Fetching markets in RESOLVING state..."
# ✅ No "backend authority mismatch" errors
# ✅ No "column markets.market_id does not exist" errors
```

**Wait 5 minutes for first cron run:**
```bash
# Market monitor runs every 5 minutes (cron: */5 * * * *)
# Check logs again at XX:X0 or XX:X5
pm2 logs market-monitor --lines 20
```

---

### Step 17: Service Stability Check

```bash
# Wait 2 minutes, then check restart counts
sleep 120
pm2 list

# Verify:
# ✅ All services still "online"
# ✅ Restart count is 0 or very low
# ✅ Uptime is increasing (not stuck at 0s)
```

---

### Step 18: Save PM2 Configuration

```bash
# Save current PM2 state (so services restart after reboot)
pm2 save

# Expected:
# [PM2] Saving current process list...
# [PM2] Successfully saved in /root/.pm2/dump.pm2
```

---

## ✅ Deployment Verification Checklist

After completing all steps, verify:

- [ ] Git status: On `main` branch, up to date with origin
- [ ] All 4 services: `online` status in `pm2 list`
- [ ] API Gateway health: `curl localhost:4000/health` returns 200
- [ ] Event Indexer health: `curl localhost:4002/health` returns 200
- [ ] WebSocket port: `lsof -i :4001` shows listening
- [ ] Market Monitor logs: No authority mismatch errors
- [ ] Market Monitor logs: No database schema errors
- [ ] Vote Aggregator: Running without errors
- [ ] Service stability: No crashes after 2+ minutes
- [ ] Backend authority: Correct key in `.env`

---

## 🚨 Troubleshooting

### Issue: Service Won't Start

**Check logs:**
```bash
pm2 logs [service-name] --lines 50
```

**Common fixes:**
```bash
# Missing dependencies
pnpm install

# Stale build
rm -rf dist/
pnpm build

# Config issue
pm2 restart [service-name]
```

---

### Issue: Backend Authority Mismatch

**Error:**
```
Backend authority mismatch:
  On-chain: 4MkybTASDtmzQnfUWztHmfgyHgBREw74eTKipVADqQLA
  Local:    [different key]
```

**Fix:**
```bash
cd /var/www/zmart/backend
nano .env

# Update line:
BACKEND_AUTHORITY_PRIVATE_KEY=424zNck4JvUFnv4BTtwShw8XUGw5A9yUtQDSvFFsZenRv5M3g1YRTpxM3UKx6kgyRJ3uNSuLMPQgrwzdD3ree5Ye

# Save (Ctrl+O, Enter, Ctrl+X)
pm2 restart all
```

---

### Issue: Database Query Errors

**Error:**
```
column markets.market_id does not exist
```

**This means git pull didn't work correctly. Fix:**
```bash
# Verify monitor.ts was updated
grep "market_id" backend/src/services/market-monitor/monitor.ts | wc -l
# Should be 2 or less (only in error logging)

# If more than 2, pull failed - force update:
git fetch origin
git reset --hard origin/main
pnpm build
pm2 restart all
```

---

### Issue: Module Not Found (ts-node)

**Error:**
```
Cannot find module 'ts-node/register/transpile-only'
```

**Fix:**
```bash
# Use pnpm (not npm)
rm -rf node_modules
pnpm install
pm2 restart event-indexer
```

---

## 📊 Expected Final State

### PM2 Status
```
┌────┬─────────────────────┬─────────┬─────────┬─────────┬──────────┐
│ id │ name                │ status  │ restart │ uptime  │ memory   │
├────┼─────────────────────┼─────────┼─────────┼─────────┼──────────┤
│ 0  │ api-gateway         │ online  │ 0       │ 5m      │ ~100 MB  │
│ 1  │ vote-aggregator     │ online  │ 0       │ 5m      │ ~80 MB   │
│ 2  │ market-monitor      │ online  │ 0       │ 5m      │ ~70 MB   │
│ 3  │ event-indexer       │ online  │ 0       │ 5m      │ ~240 MB  │
└────┴─────────────────────┴─────────┴─────────┴─────────┴──────────┘
```

### Health Endpoints
- `http://localhost:4000/health` → 200 OK
- `http://localhost:4002/health` → 200 OK
- WebSocket on port 4001 listening

### Logs (No Errors)
- ✅ Backend authority validation passes
- ✅ Database queries successful
- ✅ All services initialized
- ✅ No crashes or restarts

---

## 📞 If You Need Help

### Check Service Health
```bash
# All services
pm2 status

# Specific service
pm2 describe [service-name]

# Recent logs
pm2 logs --lines 100 --nostream

# Real-time monitoring
pm2 monit
```

### Common Commands
```bash
# Restart specific service
pm2 restart [service-name]

# Restart all
pm2 restart all

# Stop all
pm2 stop all

# View logs
pm2 logs [service-name]

# Flush old logs
pm2 flush
```

---

## 🎉 Success Criteria

Deployment is successful when:

1. ✅ All 4 services show "online" in `pm2 list`
2. ✅ Both health endpoints return 200 OK
3. ✅ No errors in logs after 5+ minutes
4. ✅ Market-monitor completes cron job successfully
5. ✅ Services have 0 restarts (or very low)

---

**Estimated Time:** 10-15 minutes
**Difficulty:** Easy (step-by-step guide)
**Risk:** Low (all changes already tested on VPS)

**Created:** November 12, 2025 @ 19:15 CET
**Status:** Ready for Execution
