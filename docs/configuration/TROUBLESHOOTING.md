# ZMART Configuration Troubleshooting Guide

**Last Updated**: November 12, 2025
**Status**: Comprehensive Troubleshooting Reference

---

## Table of Contents

1. [Common Configuration Issues](#common-configuration-issues)
2. [Service-Specific Troubleshooting](#service-specific-troubleshooting)
3. [PM2 Issues](#pm2-issues)
4. [Environment Variable Problems](#environment-variable-problems)
5. [Solana/Web3 Issues](#solanaweb3-issues)
6. [Database Connection Issues](#database-connection-issues)
7. [Network & Connectivity](#network--connectivity)
8. [Performance Issues](#performance-issues)
9. [Debugging Workflows](#debugging-workflows)

---

## Common Configuration Issues

### Issue: Service Can't Load .env File

**Symptoms**:
- Service starts but crashes immediately
- Error: "Environment variable X is not defined"
- Missing configuration values

**Diagnosis**:
```bash
# Check if .env file exists
ls -la /var/www/zmart/backend/.env

# Check file permissions
ls -l /var/www/zmart/backend/.env
# Should be readable by the user running PM2

# Check PM2 configuration
pm2 info <service-name> | grep -E '(node_args|cwd|script path)'
```

**Solution 1**: Add `node_args: '-r dotenv/config'` to ecosystem.config.js

```javascript
{
  name: 'api-gateway',
  script: './dist/index.js',
  cwd: '/var/www/zmart/backend',
  node_args: '-r dotenv/config',  // ← Add this
  // ...rest of config
}
```

**Solution 2**: Check cwd matches .env location

```javascript
// .env location: /var/www/zmart/backend/.env
// Service cwd should be:
cwd: '/var/www/zmart/backend',  // ✅ Correct

// NOT:
cwd: '/var/www/zmart/backend/some-subdirectory',  // ❌ Wrong
```

**Solution 3**: Use absolute path for subdirectory services

```javascript
// For services in subdirectories (like event-indexer)
env: {
  DOTENV_CONFIG_PATH: '/var/www/zmart/backend/.env',
}
```

**Verification**:
```bash
# Restart service and check logs
pm2 restart <service-name>
pm2 logs <service-name> --lines 50

# Should NOT see env var errors
```

---

### Issue: Wrong Environment Variables Loaded

**Symptoms**:
- Service connects to wrong network (mainnet instead of devnet)
- Using old/incorrect program IDs
- Unexpected configuration values

**Diagnosis**:
```bash
# Check which .env file is being loaded
pm2 env <service-id> | grep -E '(SOLANA|SUPABASE|NODE_ENV)'

# Compare with expected .env
cat /var/www/zmart/backend/.env | grep SOLANA_PROGRAM_ID_CORE
```

**Common Cause**: Multiple .env files (old backups, nested directories)

```bash
# Find all .env files
find /var/www/zmart -name '.env' -type f

# Expected output:
# /var/www/zmart/backend/.env  ← Only this one should exist!

# If you see others:
# /var/www/zmart/backend/backend/.env  ← DELETE (old duplicate)
# /var/www/zmart/backend/some-service/.env  ← VERIFY if needed
```

**Solution**: Remove duplicate .env files

```bash
# Backup old .env files
ssh kek "mv /var/www/zmart/backend/backend/.env /var/www/zmart/backups/old-env-$(date +%Y%m%d).env"

# Verify only one .env remains
ssh kek "find /var/www/zmart/backend -name '.env' -type f"
# Should only show: /var/www/zmart/backend/.env
```

**Verification**:
```bash
# Restart all services
pm2 restart all

# Check each service loads correct config
curl http://localhost:4000/health | jq '.config'
```

---

### Issue: Service in Crash Loop (Constant Restarts)

**Symptoms**:
- Service status shows "errored" or "stopped"
- High restart count (↺ >10)
- PID is 0 or changes constantly

**Diagnosis**:
```bash
# Check PM2 status
pm2 list | grep <service-name>

# Check error logs
pm2 logs <service-name> --err --lines 100

# Check if service starts manually
ssh kek "cd /var/www/zmart/backend && node dist/index.js"
```

**Common Causes**:

1. **Missing Dependencies**:
```bash
# Check if node_modules exist
ls /var/www/zmart/backend/node_modules | wc -l

# Reinstall if missing
cd /var/www/zmart/backend && pnpm install
```

2. **TypeScript Not Compiled**:
```bash
# Check if dist/ exists
ls /var/www/zmart/backend/dist/

# Rebuild if missing
cd /var/www/zmart/backend && pnpm build
```

3. **Port Already in Use**:
```bash
# Check if port is in use
lsof -i :4000

# Kill conflicting process
kill <PID>
```

4. **Missing Environment Variables**:
```bash
# Run validation script
./scripts/validate-env.sh
```

**Solution**: Fix the root cause, then restart

```bash
# After fixing issue
pm2 delete <service-name>
pm2 start ecosystem.config.js --only <service-name>
pm2 save
```

---

## Service-Specific Troubleshooting

### API Gateway (Port 4000)

**Issue**: API Gateway won't start

**Check**:
```bash
# 1. Check port availability
lsof -i :4000

# 2. Check logs
pm2 logs api-gateway --err --lines 50

# 3. Test manually
cd /var/www/zmart/backend
node -r dotenv/config dist/index.js
```

**Common Errors**:

| Error | Cause | Solution |
|-------|-------|----------|
| `EADDRINUSE: address already in use` | Port 4000 taken | Kill conflicting process or change port |
| `Cannot find module` | Missing dependencies | `pnpm install` |
| `SUPABASE_URL is required` | Missing env var | Check .env file |
| `Connection refused` | Supabase/Redis down | Check external services |

---

### WebSocket Server (Port 4001)

**Issue**: WebSocket connections fail

**Check**:
```bash
# 1. Check if server is running
pm2 list | grep websocket

# 2. Test WebSocket connection
wscat -c ws://localhost:4001

# 3. Check firewall
sudo ufw status | grep 4001
```

**Common Errors**:

```javascript
// Client error: WebSocket connection failed
// Cause: Server not running or firewall blocking

// Server error: "Redis connection failed"
// Solution: Check Redis is running
redis-cli ping
```

**Solution**:
```bash
# Restart WebSocket server
pm2 restart websocket-server

# Check logs for errors
pm2 logs websocket-server --lines 50
```

---

### Vote Aggregator (Port 4005)

**Issue**: Vote aggregation not running

**Symptoms**:
- Votes not aggregated after 5 minutes
- No cron logs in PM2 logs
- Service status: errored or high restarts

**Check**:
```bash
# 1. Check service status
pm2 info vote-aggregator | grep -E '(status|restarts)'

# 2. Check logs for cron execution
pm2 logs vote-aggregator --lines 100 | grep -i cron

# 3. Test health endpoint
curl http://localhost:4005/health
```

**Common Issues**:

**Issue 1**: Can't find ts-node/register (for subdirectory services)

```bash
# Error: "Error: Cannot find module 'ts-node/register'"

# Solution: Use absolute path in ecosystem.config.js
interpreter_args: '--require /var/www/zmart/backend/node_modules/.pnpm/ts-node@10.9.2_@types+node@20.19.24_typescript@5.9.3/node_modules/ts-node/register'
```

**Issue 2**: Port conflict (default 4001, changed to 4005)

```bash
# Check PORT env var
pm2 env vote-aggregator | grep PORT

# Should be PORT=4005
```

**Issue 3**: Cron not executing

```bash
# Verify cron configuration
pm2 info vote-aggregator | grep cron

# Should NOT have cron_restart (runs continuously)
# Cron jobs are INTERNAL (in service code)
```

---

### Event Indexer (Port 4002)

**Issue**: Not receiving Helius webhooks

**Check**:
```bash
# 1. Check service is listening
lsof -i :4002

# 2. Test webhook endpoint locally
curl -X POST http://localhost:4002/api/webhooks/helius \
  -H "Content-Type: application/json" \
  -d '{"test": true}'

# 3. Check Helius webhook configuration
# Helius Dashboard → Webhooks → Verify URL and secret
```

**Common Issues**:

**Issue 1**: Webhook signature validation fails

```bash
# Error: "Invalid webhook signature"

# Solution: Verify HELIUS_WEBHOOK_SECRET matches Helius dashboard
grep HELIUS_WEBHOOK_SECRET /var/www/zmart/backend/.env
```

**Issue 2**: TypeScript execution fails (uses ts-node)

```bash
# Error: "Cannot find module 'ts-node/register'"

# Solution: Correct interpreter_args path
interpreter_args: '--require /var/www/zmart/backend/node_modules/.pnpm/ts-node@10.9.2_@types+node@20.19.24_typescript@5.9.3/node_modules/ts-node/register'
```

---

### Market Monitor (Background Service)

**Issue**: Markets not auto-resolving

**Check**:
```bash
# 1. Check service is running
pm2 list | grep market-monitor

# 2. Check logs for cron execution
pm2 logs market-monitor --lines 100 | grep -i "market check"

# 3. Check database for markets needing resolution
# (Use Supabase dashboard or psql)
```

**Common Issues**:

**Issue 1**: Excessive restarts (previously 101,317!)

```bash
# Cause: cron_restart in ecosystem.config.js

# Solution: Remove cron_restart, service runs continuously
# Cron jobs are INTERNAL (in service code)

# Verify cron_restart is NOT in config
pm2 info market-monitor | grep cron_restart
# Should return nothing
```

**Issue 2**: Not in fork mode (was cluster mode)

```bash
# Check exec_mode
pm2 info market-monitor | grep 'exec mode'

# Should be: fork
# If cluster, fix ecosystem.config.js:
exec_mode: 'fork',
```

---

## PM2 Issues

### Issue: PM2 Not Saving Configuration

**Symptoms**:
- Services don't restart after reboot
- PM2 list empty after server restart

**Solution**:
```bash
# Save current PM2 process list
pm2 save

# Verify save file exists
ls -la ~/.pm2/dump.pm2

# Enable PM2 startup script
pm2 startup
# Follow the instructions (run the command it gives you)

# Test by rebooting
sudo reboot
# After reboot:
pm2 list  # Should show all services
```

---

### Issue: PM2 Shows Old/Duplicate Services

**Symptoms**:
- Multiple instances of same service
- Old services with different IDs
- Can't restart specific service

**Solution**:
```bash
# Delete all instances of a service
pm2 delete all

# Or delete specific service by ID
pm2 delete <id>

# Start fresh from ecosystem.config.js
pm2 start ecosystem.config.js

# Save new configuration
pm2 save
```

---

### Issue: PM2 Logs Not Rotating

**Symptoms**:
- Log files growing unbounded
- Disk space running out

**Solution**:
```bash
# Install PM2 log rotate module
pm2 install pm2-logrotate

# Configure log rotation
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true
```

---

## Environment Variable Problems

### Issue: Environment Variable Not Set

**Diagnosis**:
```bash
# Check if variable exists in .env
grep VARIABLE_NAME /var/www/zmart/backend/.env

# Check if PM2 loaded it
pm2 env <service-id> | grep VARIABLE_NAME
```

**Solutions**:

**Solution 1**: Add to .env file
```bash
ssh kek "echo 'VARIABLE_NAME=value' >> /var/www/zmart/backend/.env"
pm2 restart all --update-env
```

**Solution 2**: Add to ecosystem.config.js
```javascript
env: {
  VARIABLE_NAME: 'value',
}
```

---

### Issue: Environment Variable Wrong Format

**Common Format Issues**:

```bash
# Keypairs: Must be base58-encoded
SOLANA_ADMIN_KEYPAIR=base58_string_here  # ✅ Correct
SOLANA_ADMIN_KEYPAIR=[1,2,3,...]  # ❌ Wrong (JSON format)

# URLs: Must include protocol
SUPABASE_URL=https://project.supabase.co  # ✅ Correct
SUPABASE_URL=project.supabase.co  # ❌ Wrong (missing https://)

# Ports: Must be numbers (no quotes in .env)
API_PORT=4000  # ✅ Correct
API_PORT="4000"  # ❌ Wrong (quoted)
```

---

## Solana/Web3 Issues

### Issue: RPC Connection Fails

**Symptoms**:
- Error: "failed to get recent blockhash"
- Transactions timeout
- Slow response times

**Diagnosis**:
```bash
# Test RPC endpoint
curl -X POST $SOLANA_RPC_URL \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}'

# Should return: {"jsonrpc":"2.0","result":"ok","id":1}
```

**Solutions**:

**Solution 1**: Use different RPC endpoint
```bash
# Public devnet (free, rate-limited)
SOLANA_RPC_URL=https://api.devnet.solana.com

# Helius (paid, reliable)
SOLANA_RPC_URL=https://devnet.helius-rpc.com/?api-key=YOUR_KEY

# QuickNode (paid, reliable)
SOLANA_RPC_URL=https://your-endpoint.quiknode.pro/YOUR_KEY/
```

**Solution 2**: Implement RPC failover
```typescript
// See WEB3_SECURITY.md for complete failover implementation
```

---

### Issue: Transaction Fails with "Blockhash not found"

**Cause**: Transaction used stale blockhash (older than ~60 seconds)

**Solution**:
```typescript
// Always get fresh blockhash before sending
const { blockhash, lastValidBlockHeight } =
  await connection.getLatestBlockhash('finalized');

transaction.recentBlockhash = blockhash;
transaction.lastValidBlockHeight = lastValidBlockHeight;
```

---

### Issue: Program ID Not Found

**Symptoms**:
- Error: "Program ID not found on chain"
- Invalid program ID in transactions

**Check**:
```bash
# Verify program is deployed
solana program show $SOLANA_PROGRAM_ID_CORE --url devnet

# Check .env has correct program ID
grep SOLANA_PROGRAM_ID_CORE /var/www/zmart/backend/.env

# Deployed program ID: 6s8bbbCS7oNYNnTUHgrPDHG4jqaSrD6MSxQSPVR1rxw
```

**Solution**: Update program ID in .env
```bash
# Correct program ID for devnet
SOLANA_PROGRAM_ID_CORE=6s8bbbCS7oNYNnTUHgrPDHG4jqaSrD6MSxQSPVR1rxw
```

---

## Database Connection Issues

### Issue: Supabase Connection Fails

**Symptoms**:
- Error: "Could not connect to Supabase"
- Database queries timeout
- RLS policy errors

**Diagnosis**:
```bash
# Test Supabase connection
curl $SUPABASE_URL/rest/v1/ \
  -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY"

# Should return API info
```

**Solutions**:

**Solution 1**: Check credentials
```bash
# Verify SUPABASE_URL and keys
grep SUPABASE /var/www/zmart/backend/.env

# Test service_role key (backend)
curl $SUPABASE_URL/rest/v1/markets \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
```

**Solution 2**: Check RLS policies
```sql
-- Connect to Supabase
psql "postgresql://postgres.PROJECT:PASSWORD@HOST:PORT/postgres"

-- Check if RLS is enabled
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'markets';

-- Check policies
SELECT * FROM pg_policies WHERE tablename = 'markets';
```

---

### Issue: Redis Connection Fails

**Symptoms**:
- Error: "Redis connection refused"
- Session management broken
- Pub/sub not working

**Diagnosis**:
```bash
# Test Redis connection
redis-cli -u $REDIS_URL ping

# Should return: PONG
```

**Solutions**:

**Solution 1**: Start Redis
```bash
# Check if Redis is running
ps aux | grep redis

# Start Redis (if not running)
sudo systemctl start redis
# or
redis-server
```

**Solution 2**: Check Redis URL
```bash
# Correct format
REDIS_URL=redis://localhost:6379

# With password
REDIS_URL=redis://:password@host:6379

# With TLS
REDIS_URL=rediss://host:6380
```

---

## Network & Connectivity

### Issue: Can't Access Services from External IP

**Symptoms**:
- Services work on localhost
- Can't access from external IP
- Firewall blocking connections

**Diagnosis**:
```bash
# Check if service is listening on correct interface
netstat -tuln | grep 4000

# Should show:
# tcp  0  0  0.0.0.0:4000  0.0.0.0:*  LISTEN  # ✅ All interfaces
# tcp  0  0  127.0.0.1:4000  0.0.0.0:*  LISTEN  # ❌ Localhost only
```

**Solution**: Bind to 0.0.0.0
```javascript
// In service code
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on 0.0.0.0:${PORT}`);
});
```

**Check Firewall**:
```bash
# Check UFW status
sudo ufw status

# Allow port
sudo ufw allow 4000/tcp
```

---

### Issue: CORS Errors (Frontend)

**Symptoms**:
- Browser console: "CORS policy blocked"
- API calls fail from frontend
- OPTIONS preflight fails

**Solution**: Configure CORS in API Gateway
```typescript
import cors from 'cors';

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
```

---

## Performance Issues

### Issue: High Memory Usage

**Symptoms**:
- PM2 shows high mem usage (>500MB)
- Service restarts due to max_memory_restart
- Server runs out of memory

**Diagnosis**:
```bash
# Check memory usage
pm2 list

# Detailed memory stats
pm2 monit
```

**Solutions**:

**Solution 1**: Increase max_memory_restart
```javascript
// ecosystem.config.js
max_memory_restart: '1G',  // Increase from 500M
```

**Solution 2**: Fix memory leaks
```typescript
// Common causes:
// 1. Unclosed connections
// 2. Event listeners not removed
// 3. Large objects in memory
// 4. Circular references

// Use memory profiling
node --inspect dist/index.js
// Then use Chrome DevTools
```

---

### Issue: Slow Response Times

**Diagnosis**:
```bash
# Test API response time
time curl http://localhost:4000/api/markets

# Should be <100ms for local
```

**Solutions**:

**Solution 1**: Enable Redis caching
```typescript
// Cache market data
const cachedMarkets = await redis.get('markets');
if (cachedMarkets) {
  return JSON.parse(cachedMarkets);
}

const markets = await fetchMarketsFromDB();
await redis.set('markets', JSON.stringify(markets), 'EX', 60);  // 60s TTL
```

**Solution 2**: Optimize database queries
```sql
-- Add indexes
CREATE INDEX idx_markets_status ON markets(status);
CREATE INDEX idx_positions_user ON positions(user_id);
```

---

## Debugging Workflows

### Complete Service Debugging Workflow

```bash
#!/bin/bash
# debug-service.sh - Complete service debugging

SERVICE_NAME=$1

echo "🔍 Debugging $SERVICE_NAME..."

# 1. Check PM2 status
echo "Step 1: PM2 Status"
pm2 info $SERVICE_NAME

# 2. Check recent logs
echo "Step 2: Recent Logs (last 50 lines)"
pm2 logs $SERVICE_NAME --lines 50 --nostream

# 3. Check error logs specifically
echo "Step 3: Error Logs"
pm2 logs $SERVICE_NAME --err --lines 20 --nostream

# 4. Check environment variables
echo "Step 4: Environment Variables"
pm2 env $(pm2 jlist | jq ".[] | select(.name==\"$SERVICE_NAME\") | .pm_id") \
  | grep -E '(NODE_ENV|SOLANA|SUPABASE|REDIS|PORT)'

# 5. Test manual startup
echo "Step 5: Manual Startup Test"
ssh kek "cd /var/www/zmart/backend && node -r dotenv/config dist/index.js"

# 6. Check port availability
echo "Step 6: Port Check"
lsof -i :4000 | grep -v PID

# 7. Check dependencies
echo "Step 7: Dependencies"
ls -la /var/www/zmart/backend/node_modules | wc -l

# 8. Check health endpoint
echo "Step 8: Health Check"
curl http://localhost:4000/health

echo "✅ Debugging complete!"
```

### Network Debugging Workflow

```bash
#!/bin/bash
# debug-network.sh - Network connectivity debugging

echo "🔍 Network Debugging..."

# 1. Check local ports
echo "Step 1: Local Ports Listening"
netstat -tuln | grep -E '(4000|4001|4002|4005|6379)'

# 2. Test localhost connections
echo "Step 2: Localhost Connections"
curl -s http://localhost:4000/health && echo "✅ API Gateway OK" || echo "❌ API Gateway FAILED"
curl -s http://localhost:4002/health && echo "✅ Event Indexer OK" || echo "❌ Event Indexer FAILED"

# 3. Test Redis
echo "Step 3: Redis Connection"
redis-cli ping && echo "✅ Redis OK" || echo "❌ Redis FAILED"

# 4. Test Solana RPC
echo "Step 4: Solana RPC Connection"
curl -s -X POST $SOLANA_RPC_URL \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}' \
  | jq '.result' && echo "✅ Solana RPC OK" || echo "❌ Solana RPC FAILED"

# 5. Test Supabase
echo "Step 5: Supabase Connection"
curl -s $SUPABASE_URL/rest/v1/ \
  -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" \
  > /dev/null && echo "✅ Supabase OK" || echo "❌ Supabase FAILED"

echo "✅ Network debugging complete!"
```

---

## Quick Reference: Common Commands

### PM2 Commands
```bash
# List all services
pm2 list

# View service details
pm2 info <service-name>

# View logs
pm2 logs <service-name>
pm2 logs <service-name> --lines 100
pm2 logs <service-name> --err --lines 50

# Restart services
pm2 restart <service-name>
pm2 restart all

# Stop/Start services
pm2 stop <service-name>
pm2 start ecosystem.config.js --only <service-name>

# Delete and recreate
pm2 delete <service-name>
pm2 start ecosystem.config.js --only <service-name>

# Save configuration
pm2 save

# Monitor resources
pm2 monit
```

### Debugging Commands
```bash
# Check service health
curl http://localhost:4000/health

# Test environment variables
pm2 env <service-id> | grep SOLANA

# Check logs for errors
pm2 logs <service-name> --err --lines 100 | grep -i error

# Test manual startup
cd /var/www/zmart/backend && node -r dotenv/config dist/index.js

# Check port usage
lsof -i :4000
netstat -tuln | grep 4000
```

### File System Commands
```bash
# Find .env files
find /var/www/zmart -name '.env' -type f

# Check file permissions
ls -la /var/www/zmart/backend/.env

# View ecosystem config
cat /var/www/zmart/backend/ecosystem.config.js

# Check build artifacts
ls -la /var/www/zmart/backend/dist/
```

---

## Related Documentation

- [ARCHITECTURE_MAP.md](./ARCHITECTURE_MAP.md) - Complete directory structure and service architecture
- [ENVIRONMENT_VARS.md](./ENVIRONMENT_VARS.md) - Complete environment variable reference
- [WEB3_SECURITY.md](./WEB3_SECURITY.md) - Solana keypair management and security best practices
- [SERVICE_ARCHITECTURE.md](../orientation/SERVICE_ARCHITECTURE.md) - How services connect and communicate

---

## Getting Help

If you've tried these troubleshooting steps and still have issues:

1. **Check Logs**: Review PM2 logs for specific error messages
2. **Test Components**: Isolate and test individual components (DB, Redis, RPC)
3. **Check Configuration**: Verify all environment variables are set correctly
4. **Review Recent Changes**: What changed before the issue started?
5. **Ask Team**: Post in team chat with error logs and steps tried

**Useful Debug Info to Include**:
- PM2 service status (`pm2 list`)
- Error logs (`pm2 logs <service> --err --lines 50`)
- Environment check (`pm2 env <id> | grep -E '(SOLANA|SUPABASE|REDIS)'`)
- Recent changes (git log, deployment history)

---

**Last Updated**: November 12, 2025
**Maintainer**: ZMART Development Team
**Status**: Comprehensive Reference ✅
