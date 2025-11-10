# TROUBLESHOOTING_REFERENCE.md - Troubleshooting Guide

**Category:** Troubleshooting Reference
**Tags:** [troubleshooting, debugging, diagnostics, known-issues]
**Last Updated:** 2025-11-09 02:00 PST

---

## 🎯 Purpose

**Complete troubleshooting guide** - diagnostic procedures, known issues, and solutions.

---

## 🔍 Quick Diagnostic Checklist

### System Health Check

```bash
# 1. Check all PM2 services
pm2 status

# 2. Check program deployed
solana program show 7h3gXfBfYFueFVLYyfL5Qo1QGsf4GQUfW96FKVgnUsJS --url devnet

# 3. Check database connection
npx ts-node backend/scripts/test-db-connection.ts

# 4. Check RPC connection
curl https://devnet.helius-rpc.com/?api-key={HELIUS_API_KEY}

# 5. Check wallet balance
solana balance ~/.config/solana/id.json --url devnet
```

**All ✅?** System healthy
**Any ❌?** See specific troubleshooting below

---

## 🔴 Known Issues

### Issue #1: PM2 Services Not Starting

**Symptoms:**
- `pm2 status` shows services as "errored"
- Services crash immediately after start

**Causes:**
1. Missing environment variables
2. Port already in use
3. Node modules not installed

**Solutions:**
```bash
# Check environment
cat backend/.env | grep -v "^#" | grep -v "^$"

# Kill processes on ports
lsof -ti:4000 | xargs kill
lsof -ti:4001 | xargs kill
lsof -ti:4002 | xargs kill

# Reinstall dependencies
cd backend && npm install

# Restart PM2
pm2 delete all
pm2 start ecosystem.config.js
pm2 save
```

---

### Issue #2: Event Indexer Not Receiving Webhooks

**Symptoms:**
- Transactions confirm on-chain but not in database
- Event Indexer logs show no incoming webhooks

**Causes:**
1. Helius webhook not configured
2. Event Indexer not publicly accessible
3. Firewall blocking webhooks

**Solutions:**
```bash
# Check Event Indexer running
pm2 status event-indexer

# Check listening on correct port
lsof -i:4002

# Test webhook endpoint
curl -X POST http://localhost:4002/api/webhooks/solana \
  -H "Content-Type: application/json" \
  -d '{"type":"TEST"}'

# Configure Helius webhook (if not done)
# Go to: https://dashboard.helius.dev/webhooks
# Add webhook URL: https://your-domain.com/api/webhooks/solana
# Select events: All transaction types
```

**Temporary Workaround:**
```bash
# Manual re-indexing
npx ts-node backend/scripts/reindex-transaction.ts {tx_signature}
```

---

### Issue #3: Vote Aggregation Not Happening

**Symptoms:**
- Users vote but on-chain state not updated
- Votes stay `aggregated = false` in database

**Causes:**
1. Vote Aggregator service not running
2. Insufficient votes (need 100+ for meaningful aggregation)
3. RPC connection issue

**Solutions:**
```bash
# Check service running
pm2 status vote-aggregator
pm2 logs vote-aggregator --lines 50

# Check pending votes
psql {SUPABASE_URL} -c "SELECT market_id, COUNT(*) FROM votes WHERE aggregated = false GROUP BY market_id;"

# Manual aggregation
npx ts-node backend/src/services/vote-aggregator/index.ts

# Restart service
pm2 restart vote-aggregator
```

---

### Issue #4: WebSocket Disconnections

**Symptoms:**
- Real-time updates stop working
- Frontend shows "Disconnected" status

**Causes:**
1. WebSocket server crashed
2. Network proxy/firewall blocking WebSockets
3. Client-side connection timeout

**Solutions:**
```bash
# Check WebSocket server
pm2 status websocket-server
pm2 logs websocket-server

# Test WebSocket connection
npm install -g wscat
wscat -c ws://localhost:4001

# Check for proxy issues (if using nginx/cloudflare)
# Ensure WebSocket upgrade headers enabled

# Client-side: Implement reconnection
socket.on('disconnect', () => {
  setTimeout(() => socket.connect(), 1000);
});
```

---

### Issue #5: High Supabase Usage / Hitting Free Tier Limits

**Symptoms:**
- 503 errors from API
- Supabase dashboard shows quota exceeded

**Solutions:**
```bash
# Check current usage
# Go to: https://supabase.com/dashboard/project/{PROJECT_ID}/settings/billing

# Temporary: Reduce polling frequency
# Long-term: Upgrade to Pro tier ($25/mo)

# Add Redis caching (Phase 3) to reduce DB queries
```

---

## 🛠️ Component-Specific Troubleshooting

### Programs (On-Chain)

**Problem:** Transaction fails to confirm

**Debug:**
```bash
# Get transaction details
solana confirm -v {tx_signature} --url devnet

# Check program logs
solana logs 7h3gXfBfYFueFVLYyfL5Qo1QGsf4GQUfW96FKVgnUsJS --url devnet

# Simulate transaction
anchor test --skip-deploy
```

**Common Issues:**
- Insufficient SOL for rent
- Account ownership mismatch
- Invalid instruction parameters

---

**Problem:** Account data not updating

**Debug:**
```bash
# Query account state
solana account {account_address} --url devnet

# Decode account data
anchor account marketAccount {market_pda}
```

---

### Backend Services

**Problem:** API Gateway not responding

**Debug:**
```bash
# Check service health
curl http://localhost:4000/health

# Check logs
pm2 logs api-gateway --lines 100

# Check database connection
npx ts-node backend/scripts/test-db-connection.ts

# Restart service
pm2 restart api-gateway
```

---

**Problem:** Vote Aggregator stuck

**Debug:**
```bash
# Check cron schedule
pm2 info vote-aggregator | grep cron

# Check recent aggregations
grep "Aggregated" logs/vote-aggregator-combined.log

# Force run manually
npx ts-node backend/src/services/vote-aggregator/index.ts
```

---

**Problem:** Market Monitor not transitioning states

**Debug:**
```bash
# Check service running
pm2 status market-monitor

# Check eligible markets
psql {SUPABASE_URL} -c "SELECT market_id, state, end_time FROM markets WHERE state = 'ACTIVE' AND end_time < NOW();"

# Manual transition
npx ts-node backend/scripts/transition-market.ts {market_id}
```

---

### Database (Supabase)

**Problem:** Connection timeout

**Debug:**
```bash
# Test connection
npx ts-node backend/scripts/test-db-connection.ts

# Check connection string
echo $SUPABASE_URL

# Verify service role key
echo $SUPABASE_SERVICE_ROLE_KEY | head -c 20
```

**Solutions:**
- Check Supabase dashboard for outages
- Verify environment variables correct
- Restart affected service

---

**Problem:** RLS policy blocking writes

**Debug:**
```sql
-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'votes';

-- Test query as user
SET ROLE anon;
INSERT INTO votes ...;

-- Disable RLS for debugging (not recommended in production)
ALTER TABLE votes DISABLE ROW LEVEL SECURITY;
```

---

## 📊 Performance Issues

### High CPU Usage

**Symptoms:** PM2 shows >80% CPU for service

**Debug:**
```bash
# Check resource usage
pm2 monit

# Profile Node.js app
node --prof backend/dist/index.js

# Analyze profile
node --prof-process isolate-*.log > profile.txt
```

**Common Causes:**
- Infinite loops
- Heavy computation (LMSR calculations)
- Too many concurrent requests

**Solutions:**
- Add caching (Redis - Phase 3)
- Optimize database queries (add indexes)
- Horizontal scaling (multiple instances)

---

### High Memory Usage

**Symptoms:** Service restarts due to memory limit (500MB)

**Debug:**
```bash
# Check memory usage
pm2 status

# Take heap snapshot
node --inspect backend/dist/index.js
# In Chrome DevTools: Take heap snapshot
```

**Common Causes:**
- Memory leaks (unclosed connections)
- Large response payloads
- WebSocket connection accumulation

**Solutions:**
- Increase memory limit in ecosystem.config.js
- Fix memory leaks (close connections)
- Implement connection pooling

---

### Slow API Responses

**Symptoms:** API requests take >1 second

**Debug:**
```bash
# Test API latency
time curl http://localhost:4000/api/markets

# Check database query performance
# Enable slow query logging in Supabase dashboard
```

**Common Causes:**
- Missing database indexes
- N+1 queries
- No caching

**Solutions:**
```sql
-- Add indexes
CREATE INDEX idx_markets_state ON markets(state);
CREATE INDEX idx_trades_market_id ON trades(market_id);
CREATE INDEX idx_positions_user ON positions(user_id);
```

---

## 🔄 Recovery Procedures

### Recover from Event Indexer Downtime

**Scenario:** Event Indexer was down for 2 hours

**Recovery:**
```bash
# 1. Check last indexed block/slot
psql {SUPABASE_URL} -c "SELECT MAX(slot) FROM transaction_logs;"

# 2. Query missed transactions from blockchain
solana transaction-history {program_id} --limit 1000 --url devnet > missed-txs.json

# 3. Re-index missed transactions
npx ts-node backend/scripts/bulk-reindex.ts missed-txs.json

# 4. Verify database up-to-date
# Compare transaction count on-chain vs database
```

---

### Recover from Database Corruption

**Scenario:** Database tables corrupted or missing data

**Recovery:**
```bash
# 1. Stop all services
pm2 stop all

# 2. Restore from Supabase backup
# Go to: https://supabase.com/dashboard/project/{PROJECT_ID}/database/backups
# Select latest backup → Restore

# 3. Rebuild indexes
psql {SUPABASE_URL} -f backend/scripts/rebuild-indexes.sql

# 4. Re-sync from blockchain (if needed)
npx ts-node backend/scripts/full-resync.ts

# 5. Restart services
pm2 start ecosystem.config.js
```

---

### Recover from PM2 Process Crash Loop

**Scenario:** Service keeps restarting immediately

**Recovery:**
```bash
# 1. Stop problematic service
pm2 stop {service-name}

# 2. Check logs for error
pm2 logs {service-name} --lines 200 --err

# 3. Fix issue (environment variable, dependency, etc.)

# 4. Test manually first
node backend/dist/index.js

# 5. If works, restart with PM2
pm2 restart {service-name}
```

---

## 🔗 Related Documentation

- [ERROR_CATALOG.md](./ERROR_CATALOG.md) - All error codes + solutions
- [COMMANDS_REFERENCE.md](../commands/COMMANDS_REFERENCE.md) - Diagnostic commands
- [BACKEND_REFERENCE.md](../components/BACKEND_REFERENCE.md) - Service details
- [INFRASTRUCTURE_REFERENCE.md](../components/INFRASTRUCTURE_REFERENCE.md) - Infrastructure setup

---

**Last Updated:** 2025-11-09 02:00 PST
**Maintained By:** Development Team

---
