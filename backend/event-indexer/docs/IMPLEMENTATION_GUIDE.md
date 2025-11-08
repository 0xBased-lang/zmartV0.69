# Event Indexer Implementation Guide

**Complete step-by-step guide for implementing and deploying the Event Indexer service.**

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Local Development Setup](#local-development-setup)
4. [Database Setup (Supabase)](#database-setup-supabase)
5. [Helius Webhook Configuration](#helius-webhook-configuration)
6. [Testing](#testing)
7. [Production Deployment](#production-deployment)
8. [Monitoring & Maintenance](#monitoring--maintenance)
9. [Troubleshooting](#troubleshooting)
10. [API Reference](#api-reference)

---

## Overview

The Event Indexer service listens for Solana program events via Helius webhooks and indexes them into a Supabase PostgreSQL database for fast queries.

**Architecture:**
```
Solana Program → Helius → Event Indexer → Supabase → Frontend
```

**Key Components:**
- **Webhook Listener**: Receives HTTP POST from Helius
- **Event Parser**: Decodes Solana instructions into typed events
- **Event Processor**: Writes events to database
- **Database**: 10 tables with indexes and RLS

---

## Prerequisites

### Required Accounts

1. **Supabase** (https://supabase.com)
   - Free tier works for development
   - Pro tier recommended for production
   - Need: Project URL, Service Role Key

2. **Helius** (https://helius.dev)
   - Free tier: 100K requests/month
   - Pro tier: 1M+ requests/month
   - Need: API Key, Webhook Secret

3. **GitHub** (for deployment)
   - Repository access
   - GitHub Actions enabled

### Required Software

- Node.js 18+
- npm or pnpm
- PostgreSQL client (optional, for direct DB access)
- curl or Postman (for testing)

---

## Local Development Setup

### Step 1: Clone Repository

```bash
cd backend/event-indexer
```

### Step 2: Install Dependencies

```bash
npm install
```

Expected output:
```
added 200+ packages in 10s
```

### Step 3: Environment Configuration

```bash
cp .env.example .env
nano .env
```

**Edit `.env` with your values:**

```env
# Server
PORT=3002
NODE_ENV=development

# Supabase (from https://app.supabase.com/project/_/settings/api)
SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Helius (from https://dev.helius.xyz)
HELIUS_API_KEY=your-api-key
HELIUS_WEBHOOK_SECRET=create-a-random-string

# Solana
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_NETWORK=devnet
PROGRAM_ID=7h3gXfBfYFueFVLYyfL5Qo1QGsf4GQUfW96FKVgnUsJS

# Optional
LOG_LEVEL=info
CORS_ORIGIN=http://localhost:3000
```

**How to get these values:**

**Supabase:**
1. Go to https://app.supabase.com
2. Create new project (or select existing)
3. Settings → API
4. Copy:
   - Project URL → `SUPABASE_URL`
   - `anon` `public` key → `SUPABASE_ANON_KEY`
   - `service_role` `secret` key → `SUPABASE_SERVICE_ROLE_KEY`

**Helius:**
1. Go to https://dev.helius.xyz
2. Create API key
3. Copy API key → `HELIUS_API_KEY`
4. For webhook secret, generate random string:
   ```bash
   openssl rand -hex 32
   ```

### Step 4: Verify Setup

```bash
npm run dev
```

Expected output:
```json
{
  "timestamp": "2025-01-08T12:00:00.000Z",
  "level": "info",
  "message": "Event Indexer Service started",
  "port": 3002,
  "environment": "development"
}
```

Test health endpoint:
```bash
curl http://localhost:3002/health
```

Expected response:
```json
{
  "status": "ok",
  "service": "zmart-event-indexer",
  "database": "connected"
}
```

---

## Database Setup (Supabase)

### Step 1: Create Supabase Project

1. Go to https://app.supabase.com
2. Click "New Project"
3. Enter:
   - Name: `zmart-event-indexer`
   - Database Password: (save this!)
   - Region: (closest to your users)
4. Wait 2-3 minutes for provisioning

### Step 2: Run Database Migrations

**Option A: Using Migration Runner (Recommended)**

```bash
npm run migrate
```

This will:
- Read `migrations/001_initial_schema.sql`
- Execute all SQL statements
- Create 10 tables, indexes, RLS policies
- Report progress

Expected output:
```
🚀 Starting database migrations...

📄 Running migration: 001_initial_schema.sql

   Found 85 SQL statements

   ✅ Statement 85/85

📊 Migration Results:
   ✅ Success: 85
   ❌ Errors: 0

🎉 All migrations completed successfully!

🔍 Verifying schema...

   Found 10 tables:
      - users
      - markets
      - positions
      - trades
      - votes
      - proposals
      - resolutions
      - disputes
      - events
      - analytics

   Schema version: 1
```

**Option B: Using Supabase Dashboard**

1. Go to https://app.supabase.com/project/_/sql
2. Click "New Query"
3. Copy entire contents of `migrations/001_initial_schema.sql`
4. Paste and click "Run"
5. Verify no errors

### Step 3: Verify Tables

**Via Dashboard:**
- Go to Table Editor
- Should see 10 tables

**Via API:**
```bash
curl https://your-project.supabase.co/rest/v1/markets \
  -H "apikey: your-anon-key" \
  -H "Authorization: Bearer your-anon-key"
```

Expected: `[]` (empty array, no markets yet)

### Step 4: Configure RLS Policies

RLS policies are automatically created by the migration. Verify:

1. Go to Authentication → Policies
2. Should see policies for each table:
   - Markets: "Markets are viewable by everyone"
   - Positions: "Users can view own positions"
   - etc.

### Step 5: Test Database Connection

```bash
npm run dev
```

Then:
```bash
curl http://localhost:3002/health
```

Should show: `"database": "connected"`

---

## Helius Webhook Configuration

### Step 1: Get Public URL

For local development, use **ngrok**:

```bash
# Install ngrok
npm install -g ngrok

# Start tunnel
ngrok http 3002
```

Copy the public URL (e.g., `https://abc123.ngrok.io`)

For production, use your domain (e.g., `https://api.zmart.io`)

### Step 2: Create Webhook in Helius

1. Go to https://dev.helius.xyz/webhooks
2. Click "Create Webhook"
3. Configure:
   - **Webhook URL**: `https://your-domain.com/api/webhooks/helius`
   - **Webhook Type**: Enhanced Transactions
   - **Account Addresses**: `[Your Program ID]`
   - **Transaction Types**: All
   - **Auth Header**: Leave blank
4. Click "Create"
5. Copy the **Webhook ID** and **Webhook Secret**

### Step 3: Configure Webhook Secret

Add to `.env`:
```env
HELIUS_WEBHOOK_SECRET=the-secret-from-helius
```

Restart server:
```bash
npm run dev
```

### Step 4: Test Webhook

**Option A: Helius Test Button**

1. In Helius dashboard, click "Test" next to your webhook
2. Should receive a test payload
3. Check logs:
   ```bash
   tail -f logs/combined.log
   ```

Expected log:
```json
{
  "level": "info",
  "message": "Received Helius webhook",
  "signature": "test123"
}
```

**Option B: Manual cURL Test**

```bash
curl -X POST http://localhost:3002/api/webhooks/helius \
  -H "Content-Type: application/json" \
  -H "x-helius-signature: test-signature" \
  -d '{
    "signature": "test_tx_123",
    "slot": 123456,
    "timestamp": 1234567890,
    "instructions": []
  }'
```

Expected response:
```json
{
  "received": true,
  "eventsProcessed": 0
}
```

### Step 5: Verify Events in Database

After a real transaction:

```sql
-- In Supabase SQL Editor
SELECT * FROM events ORDER BY timestamp DESC LIMIT 10;
```

Should see parsed events with:
- `event_type`
- `tx_signature`
- `processed` = true
- `data` (JSONB with event details)

---

## Testing

### Unit Tests

Test individual components (parsers, processors):

```bash
npm run test
```

Expected output:
```
PASS  tests/eventParser.test.ts
  Event Parser
    parseHeliusWebhook
      ✓ should return empty array for payload with no program instructions (5 ms)
      ✓ should parse MarketCreated event (3 ms)
      ✓ should parse TradeExecuted event for buy (2 ms)
      ✓ should parse TradeExecuted event for sell (2 ms)
      ✓ should handle multiple instructions in one transaction (3 ms)
      ✓ should handle unknown discriminators gracefully (2 ms)

Test Suites: 1 passed, 1 total
Tests:       6 passed, 6 total
Time:        2.5 s
```

### Integration Tests

Test full webhook → database flow:

```bash
npm run test:integration
```

Creates test webhooks and verifies database writes.

### Manual Testing

**Test 1: MarketCreated Event**

```bash
# Create test payload
cat > test-market-created.json << 'EOF'
{
  "signature": "test_market_sig_001",
  "slot": 123456,
  "timestamp": 1234567890,
  "instructions": [
    {
      "programId": "7h3gXfBfYFueFVLYyfL5Qo1QGsf4GQUfW96FKVgnUsJS",
      "accounts": ["creator123", "market456"],
      "data": "AAsAAABXaWxsIEJUQyByZWFjaCAxMDBrPwBromMAAAAAAAA="
    }
  ]
}
EOF

# Send webhook
curl -X POST http://localhost:3002/api/webhooks/helius \
  -H "Content-Type: application/json" \
  -d @test-market-created.json

# Check database
curl "https://your-project.supabase.co/rest/v1/markets?pubkey=eq.market456" \
  -H "apikey: your-anon-key"
```

Expected: Market record with question "Will BTC reach 100k?"

**Test 2: TradeExecuted Event**

```bash
# Create test payload
cat > test-trade.json << 'EOF'
{
  "signature": "test_trade_sig_001",
  "slot": 123457,
  "timestamp": 1234567891,
  "instructions": [
    {
      "programId": "7h3gXfBfYFueFVLYyfL5Qo1QGsf4GQUfW96FKVgnUsJS",
      "accounts": ["trader123", "market456"],
      "data": "AQAQJwAAAAAAAABqmjsAAAAAAAA="
    }
  ]
}
EOF

# Send webhook
curl -X POST http://localhost:3002/api/webhooks/helius \
  -H "Content-Type: application/json" \
  -d @test-trade.json

# Check database
curl "https://your-project.supabase.co/rest/v1/trades?tx_signature=eq.test_trade_sig_001" \
  -H "apikey: your-anon-key"
```

Expected: Trade record with shares and cost

### Load Testing

Test with 1,000 events:

```bash
npm run test:load
```

Expected results:
- All events processed
- No errors
- Average latency <100ms
- Database writes <50ms

---

## Production Deployment

### Option 1: Vercel/Railway/Render

**Example: Railway**

1. Create `railway.toml`:
```toml
[build]
builder = "nixpacks"

[deploy]
startCommand = "npm start"
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10
```

2. Deploy:
```bash
railway up
```

3. Configure environment variables in Railway dashboard

4. Get public URL and configure Helius webhook

**Example: Render**

1. Create `render.yaml`:
```yaml
services:
  - type: web
    name: zmart-event-indexer
    env: node
    buildCommand: npm install && npm run build
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
```

2. Connect GitHub repo in Render dashboard

3. Configure environment variables

### Option 2: Docker

```bash
# Build image
docker build -t zmart-event-indexer .

# Run container
docker run -d \
  --name event-indexer \
  -p 3002:3002 \
  --env-file .env.production \
  zmart-event-indexer

# Check logs
docker logs -f event-indexer
```

### Option 3: PM2 (VPS)

```bash
# Install PM2
npm install -g pm2

# Start service
pm2 start dist/index.js --name event-indexer

# Save configuration
pm2 save

# Setup startup script
pm2 startup
```

### Post-Deployment Checklist

- [ ] Health check returns 200
- [ ] Database connection working
- [ ] Helius webhook configured with production URL
- [ ] SSL certificate configured (HTTPS)
- [ ] Firewall allows incoming webhooks
- [ ] Monitoring configured
- [ ] Logs accessible
- [ ] Backup strategy in place
- [ ] Error alerting configured

---

## Monitoring & Maintenance

### Health Checks

**Endpoint:** `GET /health`

**Monitor:**
- Response status (should be 200)
- Database connection status
- Response time (<500ms)

**Setup monitoring:**
- UptimeRobot: https://uptimerobot.com
- Pingdom: https://pingdom.com
- Custom: cron job with curl

Example cron:
```bash
# Check every 5 minutes
*/5 * * * * curl -f https://api.zmart.io/health || echo "Health check failed" | mail -s "Alert" admin@zmart.io
```

### Logs

**Location:**
- Console (stdout)
- `logs/combined.log` (all levels)
- `logs/error.log` (errors only)

**View logs:**
```bash
# Real-time
tail -f logs/combined.log

# Errors only
tail -f logs/error.log

# Search for signature
grep "signature_123" logs/combined.log
```

**Log format:**
```json
{
  "timestamp": "2025-01-08T12:00:00.000Z",
  "level": "info",
  "message": "Event processed successfully",
  "type": "MarketCreated",
  "signature": "abc123",
  "market": "market456"
}
```

### Database Monitoring

**Key metrics:**
- Table sizes
- Query performance
- Connection pool usage
- RLS policy performance

**Via Supabase Dashboard:**
1. Reports → Database
2. Check:
   - Storage used
   - Active connections
   - Slow queries

**Via SQL:**
```sql
-- Table sizes
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Event processing stats
SELECT
  processed,
  COUNT(*) as count
FROM events
GROUP BY processed;

-- Events per type
SELECT
  event_type,
  COUNT(*) as count
FROM events
GROUP BY event_type
ORDER BY count DESC;
```

### Performance Metrics

**Target metrics:**
- Webhook response time: <200ms
- Event processing time: <100ms
- Database write time: <50ms
- Query response time: <200ms
- Event-to-database latency: <5s

**Monitor:**
```bash
# Response time
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:3002/health

# Where curl-format.txt contains:
# time_total: %{time_total}s
```

### Reconciliation

Run daily to ensure database matches blockchain:

```bash
npm run reconcile
```

This script:
1. Fetches all markets from on-chain
2. Compares with database
3. Reports discrepancies
4. Optionally auto-fixes

**Schedule with cron:**
```bash
0 2 * * * cd /path/to/event-indexer && npm run reconcile
```

---

## Troubleshooting

### Issue: Database Connection Fails

**Symptom:**
```json
{
  "status": "degraded",
  "database": "disconnected"
}
```

**Solutions:**

1. Check environment variables:
   ```bash
   echo $SUPABASE_URL
   echo $SUPABASE_SERVICE_ROLE_KEY
   ```

2. Test connection manually:
   ```bash
   curl "https://your-project.supabase.co/rest/v1/" \
     -H "apikey: your-service-role-key"
   ```

3. Verify Supabase project is running (check dashboard)

4. Check firewall/network connectivity

5. Verify service role key (not anon key)

### Issue: Webhook Signature Invalid

**Symptom:**
```json
{
  "error": "Invalid signature"
}
```

**Solutions:**

1. Verify `HELIUS_WEBHOOK_SECRET` matches Helius dashboard

2. Check header format:
   ```bash
   curl -v http://localhost:3002/api/webhooks/helius \
     -H "x-helius-signature: correct-secret"
   ```

3. For development, temporarily disable verification:
   ```typescript
   // In webhookRoutes.ts
   if (!webhookSecret) {
     return true; // Allow without verification
   }
   ```

4. Regenerate webhook secret in Helius dashboard

### Issue: Events Not Processing

**Symptom:** Webhook received but no database updates

**Debug steps:**

1. Check logs:
   ```bash
   tail -f logs/combined.log | grep ERROR
   ```

2. Verify program ID matches:
   ```bash
   echo $PROGRAM_ID
   ```

3. Check event discriminators match your program:
   ```typescript
   // In eventParser.ts
   console.log('Discriminator:', data[0]);
   ```

4. Test parser directly:
   ```typescript
   import { parseHeliusWebhook } from './parsers/eventParser';
   const events = parseHeliusWebhook(testPayload);
   console.log(events);
   ```

5. Check database permissions:
   ```sql
   -- Run in Supabase SQL Editor
   SELECT * FROM information_schema.role_table_grants
   WHERE grantee = 'service_role';
   ```

### Issue: Slow Query Performance

**Symptom:** Queries taking >200ms

**Solutions:**

1. Check indexes exist:
   ```sql
   SELECT indexname, indexdef
   FROM pg_indexes
   WHERE schemaname = 'public';
   ```

2. Analyze query plan:
   ```sql
   EXPLAIN ANALYZE
   SELECT * FROM markets WHERE state = 'ACTIVE';
   ```

3. Add missing indexes:
   ```sql
   CREATE INDEX idx_markets_state_active
   ON markets(state) WHERE state = 'ACTIVE';
   ```

4. Enable connection pooling (already enabled in Supabase)

5. Consider materialized views for complex aggregations

---

## API Reference

### GET /health

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "service": "zmart-event-indexer",
  "version": "1.0.0",
  "database": "connected",
  "timestamp": "2025-01-08T12:00:00.000Z"
}
```

**Status codes:**
- `200`: Service healthy
- `503`: Service degraded (database disconnected)

### POST /api/webhooks/helius

Receives Helius webhook events.

**Headers:**
```
Content-Type: application/json
x-helius-signature: <hmac-sha256>
```

**Request body:** Helius webhook payload

**Response:**
```json
{
  "received": true,
  "eventsProcessed": 3
}
```

**Status codes:**
- `200`: Webhook received (even if processing failed)
- `401`: Invalid signature

**Example:**
```bash
curl -X POST https://api.zmart.io/api/webhooks/helius \
  -H "Content-Type: application/json" \
  -H "x-helius-signature: your-signature" \
  -d @webhook-payload.json
```

### GET /api/webhooks/health

Webhook endpoint health check.

**Response:**
```json
{
  "status": "ok",
  "service": "event-indexer",
  "endpoint": "webhooks",
  "timestamp": "2025-01-08T12:00:00.000Z"
}
```

---

## Quick Reference

### Common Commands

```bash
# Development
npm run dev              # Start dev server
npm run test             # Run unit tests
npm run test:integration # Run integration tests
npm run migrate          # Run database migrations

# Production
npm run build            # Build TypeScript
npm start                # Start production server

# Utilities
npm run reconcile        # Run reconciliation
npm run lint             # Lint code
npm run lint:fix         # Fix linting issues
```

### Environment Variables Quick Reference

| Variable | Required | Example | Description |
|----------|----------|---------|-------------|
| `SUPABASE_URL` | ✅ | `https://xxx.supabase.co` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | `eyJhbG...` | Service role secret key |
| `HELIUS_API_KEY` | ✅ | `abc123...` | Helius API key |
| `HELIUS_WEBHOOK_SECRET` | ✅ | `secret123` | Webhook verification secret |
| `PROGRAM_ID` | ✅ | `7h3gXfBf...` | Solana program ID |
| `PORT` | ❌ | `3002` | HTTP port (default: 3002) |
| `NODE_ENV` | ❌ | `production` | Environment |
| `LOG_LEVEL` | ❌ | `info` | Log level |

### Database Tables Quick Reference

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `markets` | Market data | `pubkey`, `state`, `question` |
| `trades` | Trading history | `tx_signature`, `market_pubkey`, `trader_pubkey` |
| `positions` | User holdings | `user_pubkey`, `market_pubkey`, `shares_yes`, `shares_no` |
| `votes` | Proposal/dispute votes | `vote_type`, `voter`, `choice` |
| `resolutions` | Market outcomes | `market_pubkey`, `outcome`, `disputed` |
| `disputes` | Dispute events | `market_pubkey`, `disputer`, `resolved` |
| `users` | User profiles | `wallet_address`, `total_trades` |
| `proposals` | Market proposals | `proposal_id`, `status`, `likes` |
| `events` | Raw event log | `event_type`, `tx_signature`, `processed` |
| `analytics` | Aggregated metrics | `metric_type`, `value` |

---

## Support

- **Documentation**: https://github.com/your-org/zmartV0.69/tree/main/backend/event-indexer
- **Issues**: https://github.com/your-org/zmartV0.69/issues
- **Discord**: https://discord.gg/zmart

---

*Last Updated: January 8, 2025*
*Version: 1.0.0*
