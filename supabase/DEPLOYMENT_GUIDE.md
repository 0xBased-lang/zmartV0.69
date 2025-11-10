# Supabase Schema Deployment Guide

**Project:** ZMART V0.69
**Last Updated:** November 8, 2025
**Schema Version:** v0.69.0

---

## Overview

This guide covers deploying the complete Supabase database schema for the ZMART prediction market platform.

**Total Tables:** 13
- Core: users, markets, positions
- Voting: proposal_votes, dispute_votes
- Events: events, resolutions, disputes, proposals
- Discussions: discussions, ipfs_anchors
- Trading: trades
- System: schema_version

---

## Prerequisites

### 1. Install Supabase CLI

```bash
# macOS
brew install supabase/tap/supabase

# Windows (PowerShell)
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase

# Linux
brew install supabase/tap/supabase
```

Verify installation:
```bash
supabase --version
```

### 2. Supabase Account Setup

1. Create account at https://supabase.com
2. Create new project:
   - Organization: Your org
   - Project name: `zmart-v069`
   - Database password: Strong password (save it!)
   - Region: Choose closest to users
   - Plan: Free tier OK for development

3. Wait for project provisioning (~2 minutes)

### 3. Get Project Credentials

Navigate to Project Settings → API:

```bash
# Copy these values to your .env file:
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Deployment Steps

### Step 1: Link Local Project to Remote

```bash
cd /Users/seman/Desktop/zmartV0.69

# Login to Supabase (opens browser)
supabase login

# Link to your project
supabase link --project-ref xxxxxxxxxxxxx

# Enter database password when prompted
```

### Step 2: Local Testing (Optional but Recommended)

```bash
# Start local Supabase instance
supabase start

# This will output local connection details:
# API URL: http://localhost:54321
# DB URL: postgresql://postgres:postgres@localhost:54322/postgres
# Studio URL: http://localhost:54323

# Apply migrations locally
supabase db reset

# Verify tables created
supabase db diff

# Stop local instance when done
supabase stop
```

### Step 3: Deploy to Remote (Production)

```bash
# Push all migrations to remote database
supabase db push

# Verify deployment
supabase db remote inspect
```

Expected output:
```
Applying migration 20251106220000_initial_schema.sql...
Applying migration 20251107000000_market_finalization_errors.sql...
Applying migration 20251108000000_add_missing_tables.sql...
✔ All migrations applied successfully
```

### Step 4: Verify Deployment

```bash
# Check schema version
supabase db remote exec "SELECT * FROM schema_version;"

# Expected output:
#  version  |        applied_at         |                    description
# ----------+---------------------------+---------------------------------------------------
#  v0.69.0  | 2025-11-08 18:45:00+00:00 | Initial schema with event indexer support
```

```bash
# Count tables
supabase db remote exec "SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';"

# Expected output: 13 tables
```

```bash
# List all tables
supabase db remote exec "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name;"

# Expected output:
# dispute_votes
# disputes
# discussions
# events
# ipfs_anchors
# markets
# positions
# proposal_votes
# proposals
# resolutions
# schema_version
# trades
# users
```

### Step 5: Update Environment Variables

Update your `.env` file with remote connection details:

```bash
# backend/.env
SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Frontend .env.local
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Step 6: Test Backend Connection

```bash
cd backend/event-indexer

# Test Supabase connection
npm run dev

# In another terminal, test health endpoint
curl http://localhost:3002/health

# Expected output:
# {
#   "status": "ok",
#   "service": "zmart-event-indexer",
#   "version": "1.0.0",
#   "database": "connected",
#   "timestamp": "2025-11-08T18:45:00.000Z"
# }
```

---

## Migration Files Overview

### 1. `20251106220000_initial_schema.sql` (464 lines)
- Core tables: users, markets, positions
- Voting tables: proposal_votes, dispute_votes
- Discussion tables: discussions, ipfs_anchors
- Trading table: trades
- All RLS policies
- Initial indexes

### 2. `20251107000000_market_finalization_errors.sql`
- Market finalization error handling
- Additional constraints and validations

### 3. `20251108000000_add_missing_tables.sql` (NEW - 440 lines)
- Events table (audit log)
- Resolutions table (resolution tracking)
- Disputes table (dispute records)
- Proposals table (proposal voting)
- Schema version table
- Additional columns: trader_pubkey, market_pubkey, user_pubkey
- User stats columns: total_trades, total_volume

---

## Rollback Strategy

### Rollback Last Migration

```bash
# Check migration history
supabase db remote inspect --schema migrations.schema_migrations

# Rollback last migration
supabase db remote reset --target 20251107000000

# Verify rollback
supabase db remote inspect
```

### Complete Reset (DESTRUCTIVE)

```bash
# WARNING: This deletes ALL data
supabase db remote reset --destructive

# Re-apply all migrations
supabase db push
```

---

## Common Issues & Solutions

### Issue 1: "relation already exists"

**Cause:** Migration already applied or table created manually

**Solution:**
```bash
# Drop table manually first
supabase db remote exec "DROP TABLE IF EXISTS table_name CASCADE;"

# Re-run migration
supabase db push
```

### Issue 2: Foreign key constraint errors

**Cause:** Referenced table doesn't exist yet

**Solution:** Check migration order. Initial schema must run before missing tables migration.

### Issue 3: RLS policy errors

**Cause:** `auth.jwt()` function not available

**Solution:** RLS policies work only with Supabase Auth. For service role access, policies are bypassed.

### Issue 4: Column doesn't exist

**Cause:** Code expects column from new migration but migration not applied

**Solution:**
```bash
# Apply latest migration
supabase db push

# Verify column exists
supabase db remote exec "SELECT column_name FROM information_schema.columns WHERE table_name = 'table_name';"
```

---

## Database Maintenance

### Backup Strategy

```bash
# Manual backup
supabase db dump -f backup_$(date +%Y%m%d_%H%M%S).sql

# Restore from backup
supabase db reset --restore backup_20251108_184500.sql
```

Supabase automatically backs up:
- **Free tier:** Daily backups, 7-day retention
- **Pro tier:** Daily backups, 30-day retention + point-in-time recovery

### Monitor Database Size

```bash
# Check database size
supabase db remote exec "SELECT pg_size_pretty(pg_database_size('postgres'));"

# Check table sizes
supabase db remote exec "
  SELECT
    table_name,
    pg_size_pretty(pg_total_relation_size('public.' || table_name)) AS size
  FROM information_schema.tables
  WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
  ORDER BY pg_total_relation_size('public.' || table_name) DESC;
"
```

### Performance Monitoring

Access Supabase Dashboard → Reports:
- Query performance
- Cache hit rate
- Connection count
- Table sizes
- Index usage

---

## Production Checklist

- [ ] All 3 migrations applied successfully
- [ ] 13 tables created
- [ ] RLS enabled on all tables
- [ ] Indexes created (24+ indexes)
- [ ] Connection pooling configured (default: 20)
- [ ] Backup strategy confirmed
- [ ] Environment variables updated
- [ ] Backend health check passing
- [ ] Service role key secured (not committed to git)

---

## Security Best Practices

1. **Never commit secrets:**
   ```bash
   # Add to .gitignore
   .env
   .env.local
   .env.production
   ```

2. **Use service role key only in backend:**
   - Backend: Service role key (full access)
   - Frontend: Anon key (RLS enforced)

3. **Enable 2FA on Supabase account**

4. **Rotate keys periodically:**
   - Supabase Dashboard → Settings → API → Reset keys

5. **Monitor suspicious activity:**
   - Supabase Dashboard → Reports → Activity log

---

## Next Steps After Deployment

1. **Week 5 Day 2:** Set up Helius webhooks
2. **Week 5 Day 3:** End-to-end testing on devnet
3. **Week 5 Day 4-5:** Performance optimization
4. **Week 5 Day 6-7:** Integration tests and documentation

---

## Support

- **Supabase Docs:** https://supabase.com/docs
- **ZMART Docs:** `docs/08_DATABASE_SCHEMA.md`
- **Migration Issues:** `supabase/migrations/README.md`
- **Slack:** #zmart-backend

---

**Deployment Status:** ✅ Ready to deploy
**Tested On:** Local Supabase instance
**Last Verification:** November 8, 2025
