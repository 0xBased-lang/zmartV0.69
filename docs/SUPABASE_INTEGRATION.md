# Supabase Integration - ZMART V0.69

## Overview

Supabase is ZMART's **external cloud database service** that provides:
- PostgreSQL database (off-chain data storage)
- Real-time subscriptions (for WebSocket server)
- Row Level Security (RLS) for access control
- Automatic backups and scaling

**Location**: External managed service (NOT on VPS)
**URL**: `https://tkkqqxepelibqjjhxxct.supabase.co`
**Project ID**: `tkkqqxepelibqjjhxxct`
**Region**: US-East (Virginia)

---

## Why Supabase? (vs. Self-Hosted Database)

### Advantages of Managed Supabase

✅ **Automatic Backups**: Daily snapshots, point-in-time recovery
✅ **Real-Time Features**: Built-in WebSocket subscriptions
✅ **Scalability**: Automatic scaling without VPS upgrade
✅ **Zero Maintenance**: No PostgreSQL installation, updates, or monitoring
✅ **Free Tier**: Perfect for development ($0 until production)

### What You Give Up

❌ **Latency**: ~20-50ms network round-trip (VPS → Supabase cloud)
❌ **Control**: Can't modify PostgreSQL internals
❌ **Cost**: $25/month for Pro in production (vs. ~$0 for self-hosted)

**Trade-off**: For ZMART's use case (read-heavy API, low write volume), the 20-50ms latency is acceptable. If sub-10ms is needed, migrate to self-hosted PostgreSQL on VPS.

---

## Single Project Strategy

**ZMART uses ONE Supabase project for all environments:**

```
Development (Local Backend)
     ↓
     ├─→ Supabase Project: tkkqqxepelibqjjhxxct
     ↓
Staging (VPS Backend)
     ↓
     ├─→ Same Supabase Project (shared database)
     ↓
Production (Future)
     ↓
     └─→ Upgrade same project to Pro tier ($25/month)
```

### Advantages of Single Project

✅ **Simplicity**: One set of credentials, one migration history
✅ **Cost**: Free tier for dev + staging (no extra projects)
✅ **Easy Testing**: Test production-like data in staging

### Risks of Single Project

⚠️ **Data Collision**: Dev and staging write to same database
⚠️ **Accidental Deletes**: Staging bug could corrupt dev data
⚠️ **No Isolation**: Can't test destructive migrations safely

### Mitigation Strategies

Since we accept this risk, we use these safeguards:

1. **Prefix Test Data**: All test markets start with `TEST_`
   ```sql
   -- Example test market
   INSERT INTO markets (market_id, title)
   VALUES ('TEST_market_123', 'Test Market - Safe to Delete');
   ```

2. **Regular Cleanup**: Weekly deletion of test data
   ```bash
   pnpm run cleanup:test-data
   ```

3. **Careful Migrations**: Always test migrations on branch before merge
   ```bash
   # Test migration locally first
   supabase db push --dry-run
   ```

4. **RLS Policies**: Row Level Security prevents unauthorized access
   ```sql
   -- Users can only write their own data
   CREATE POLICY users_own_data ON users
   FOR UPDATE USING (auth.uid() = id);
   ```

---

## How VPS Services Connect to Supabase

### Connection Methods

**1. Supabase JavaScript Client** (Most services use this)

```typescript
// backend/src/config/database.ts (on VPS)
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://tkkqqxepelibqjjhxxct.supabase.co',  // Supabase cloud URL
  process.env.SUPABASE_SERVICE_ROLE_KEY,       // From VPS .env
);

// Makes HTTPS requests to Supabase cloud
const { data } = await supabase
  .from('markets')
  .select('*');
```

**2. Direct PostgreSQL Connection** (For complex queries)

```typescript
// Using DATABASE_URL from .env
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
  // postgresql://postgres:PASSWORD@db.tkkqqxepelibqjjhxxct.supabase.co:5432/postgres
});

const result = await pool.query('SELECT * FROM markets WHERE status = $1', ['ACTIVE']);
```

### Network Flow

```
VPS Service (185.202.236.71)
     ↓ HTTPS Request
Internet
     ↓
Supabase Cloud API (tkkqqxepelibqjjhxxct.supabase.co)
     ↓
PostgreSQL Database
     ↓ Response
Internet
     ↓
VPS Service (receives data)
```

**Typical Latency**: 20-50ms per request

---

## Supabase Schema

See [08_DATABASE_SCHEMA.md](./08_DATABASE_SCHEMA.md) for complete schema.

**Quick Summary:**

```sql
-- Core Tables
markets          -- Market metadata (title, creator, status)
trades           -- Trade history (user, shares, price)
user_positions   -- Current holdings (user_id, market_id, yes_shares, no_shares)

-- Voting Tables
proposal_votes   -- Off-chain proposal votes (before aggregation)
dispute_votes    -- Off-chain dispute votes (before aggregation)

-- Discussion Tables
discussions      -- Market discussions (comments, replies)

-- User Tables
users            -- User profiles (wallet address, reputation)
```

---

## Authentication & Security

### API Keys

Supabase provides 2 types of keys:

**1. Anon Key** (Public, safe to expose in frontend)
- Used by frontend to query database
- Restricted by Row Level Security (RLS) policies
- Can only access data user is allowed to see

**2. Service Role Key** (Secret, backend only)
- Used by VPS services
- Bypasses Row Level Security
- Full database access (be careful!)

**Storage in VPS .env:**

```bash
# Frontend uses anon key (exposed in Next.js build)
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6...

# Backend uses service role key (never exposed)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6...
```

### Row Level Security (RLS)

RLS policies enforce access control at database level:

```sql
-- Example: Users can only read markets they're allowed to see
CREATE POLICY users_read_markets ON markets
FOR SELECT USING (
  status IN ('ACTIVE', 'RESOLVING', 'FINALIZED')
  OR creator = auth.uid()
);

-- Example: Users can only update their own positions
CREATE POLICY users_update_positions ON user_positions
FOR UPDATE USING (user_id = auth.uid());
```

**Why RLS?**
- ✅ Security enforced at database level (can't bypass)
- ✅ No need to write authorization logic in backend
- ✅ Same policies apply to all access methods (JS client, SQL, API)

---

## Real-Time Subscriptions

Supabase provides built-in real-time updates via PostgreSQL's `LISTEN/NOTIFY`:

### How WebSocket Server Uses Real-Time

```typescript
// backend/src/services/websocket/server.ts
const supabase = createClient(/* ... */);

// Subscribe to trade changes
supabase
  .channel('trades')
  .on('postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'trades' },
    (payload) => {
      // Broadcast to all connected frontend clients
      wss.clients.forEach(client => {
        client.send(JSON.stringify({
          type: 'TRADE_EXECUTED',
          data: payload.new
        }));
      });
    }
  )
  .subscribe();
```

### Data Flow

```
Event Indexer (VPS)
     ↓ INSERT trade
Supabase PostgreSQL
     ↓ NOTIFY websocket-channel
Supabase Real-Time Engine
     ↓ WebSocket message
WebSocket Server (VPS)
     ↓ Broadcast
Frontend Clients
```

**Latency**: ~500ms-2s (Solana finality + webhook + database write + broadcast)

---

## Database Operations

### Read Operations (Fast)

```typescript
// Get all active markets
const { data: markets } = await supabase
  .from('markets')
  .select('*')
  .eq('status', 'ACTIVE');

// Get user positions
const { data: positions } = await supabase
  .from('user_positions')
  .select('*')
  .eq('user_id', userId);
```

**Performance**: <100ms for simple queries

### Write Operations (Atomic)

```typescript
// Insert new trade (event indexer)
const { error } = await supabase
  .from('trades')
  .insert({
    market_id: 'market_123',
    user_id: 'user_456',
    side: 'YES',
    shares: 10,
    price: 0.65,
    timestamp: new Date().toISOString()
  });

if (error) {
  logger.error('Failed to insert trade', { error });
}
```

**Performance**: <200ms for simple inserts

### Complex Queries (Use Direct SQL)

```typescript
// Calculate total volume per market
const { data } = await pool.query(`
  SELECT
    market_id,
    SUM(shares) as total_volume,
    COUNT(*) as trade_count
  FROM trades
  WHERE created_at > NOW() - INTERVAL '24 hours'
  GROUP BY market_id
  ORDER BY total_volume DESC
  LIMIT 10
`);
```

**Performance**: <500ms for aggregations

---

## Migration Management

### Schema Migrations

**Tools**: Supabase CLI or manual SQL

```bash
# Generate migration from local changes
supabase db diff -f add_new_table

# Apply migration to cloud
supabase db push

# Rollback migration (careful!)
supabase db reset
```

### Migration Best Practices

✅ **Test Locally First**: Always test migrations on local Supabase before pushing
✅ **Backup Before Migration**: Supabase auto-backs up, but create manual snapshot for safety
✅ **Incremental Changes**: Small migrations are easier to rollback
✅ **Add, Don't Delete**: Add new columns instead of altering existing ones

❌ **Never Drop Tables in Production**: Archive data first
❌ **Don't Change Primary Keys**: Creates cascading issues
❌ **Avoid Breaking Changes**: Keep old columns during transition period

---

## Monitoring & Debugging

### Dashboard Access

**URL**: `https://supabase.com/dashboard/project/tkkqqxepelibqjjhxxct`

**Useful Panels**:
- **Table Editor**: Browse and edit data manually
- **SQL Editor**: Run custom queries
- **Database → Replication**: Check real-time subscriptions
- **Logs → Postgres Logs**: See query performance

### Common Issues

#### Connection Refused

```bash
# Test connection from VPS
ssh kek
curl https://tkkqqxepelibqjjhxxct.supabase.co/rest/v1/markets?limit=1 \
  -H "apikey: YOUR_ANON_KEY"

# Common causes:
# 1. Supabase service down (check status.supabase.com)
# 2. Wrong SUPABASE_URL in .env
# 3. Network issue on VPS
```

#### Authentication Failed

```bash
# Check API keys are correct
cat /var/www/zmart/backend/backend/.env | grep SUPABASE

# Common causes:
# 1. Keys rotated in Supabase dashboard (update .env)
# 2. Using anon key instead of service role key (backend needs service role)
# 3. Project paused due to inactivity (free tier auto-pauses after 7 days)
```

#### Slow Queries

```sql
-- Check slow queries in SQL Editor
SELECT
  query,
  calls,
  mean_exec_time,
  max_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Common causes:
# 1. Missing indexes (add indexes on frequently queried columns)
# 2. N+1 queries (use joins instead of multiple queries)
# 3. Large result sets (add LIMIT clause)
```

---

## Data Management

### Cleaning Up Test Data

```bash
# Delete all test markets
supabase db sql --query "
  DELETE FROM markets WHERE market_id LIKE 'TEST_%';
  DELETE FROM trades WHERE market_id LIKE 'TEST_%';
  DELETE FROM proposal_votes WHERE market_id LIKE 'TEST_%';
"

# Or use cleanup script
pnpm run cleanup:test-data
```

### Backing Up Data

```bash
# Manual backup (download SQL dump)
supabase db dump -f backup_$(date +%Y%m%d).sql

# Restore from backup
supabase db reset
psql $DATABASE_URL < backup_20251110.sql
```

---

## Upgrading to Production

### Free Tier → Pro Tier

**When to Upgrade**:
- Active users > 50
- Database size > 500MB
- Need higher query rate limits
- Want longer log retention

**How to Upgrade**:
1. Go to Supabase dashboard → Settings → Billing
2. Click "Upgrade to Pro" ($25/month)
3. No code changes needed (same project, same credentials)
4. Automatic migration, zero downtime

**What Changes**:
- ✅ 8GB database (vs. 500MB free)
- ✅ Unlimited API requests (vs. 50,000/day free)
- ✅ 7-day log retention (vs. 1-day free)
- ✅ Daily backups for 7 days (vs. none free)
- ✅ Email support (vs. community forum only)

---

## Alternative: Self-Hosted PostgreSQL

If you need <10ms latency or want to avoid monthly cost:

### Install PostgreSQL on VPS

```bash
ssh kek
sudo apt install postgresql
sudo systemctl start postgresql

# Create database
sudo -u postgres createdb zmart

# Update VPS services to use localhost
DATABASE_URL=postgresql://postgres:password@localhost:5432/zmart
```

### Trade-Offs

**Advantages**:
- ✅ <10ms latency (local connection)
- ✅ No monthly cost
- ✅ Full control over PostgreSQL

**Disadvantages**:
- ❌ Manual backups (cron job + rsync)
- ❌ No built-in real-time (implement yourself)
- ❌ Manual scaling (upgrade VPS RAM/CPU)
- ❌ You manage security updates

**Recommendation**: Start with Supabase, migrate to self-hosted if latency becomes critical.

---

## Related Documentation

- [VPS_ARCHITECTURE.md](./VPS_ARCHITECTURE.md) - How VPS services work
- [08_DATABASE_SCHEMA.md](./08_DATABASE_SCHEMA.md) - Complete schema
- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - Deployment workflows

---

*Last Updated: November 10, 2025 | Status: Production-Ready*
