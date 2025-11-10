# Phase 2: Supabase Setup Guide

**Date:** November 7, 2025
**Purpose:** Step-by-step instructions to create Supabase project and deploy database schema
**Estimated Time:** 20-30 minutes
**Prerequisites:** Browser access, email account

---

## Overview

This guide will help you:
1. Create a free Supabase project
2. Deploy the ZMART database schema (8 tables, 40+ indexes, RLS policies)
3. Configure backend `.env` with Supabase credentials
4. Verify database connection

---

## Step 1: Create Supabase Project (5 minutes)

### 1.1: Go to Supabase

**URL:** https://supabase.com

**Actions:**
1. Click **"Start your project"** button
2. Sign up with email (or GitHub/Google)
3. Verify email if required

### 1.2: Create New Project

**In Supabase Dashboard:**
1. Click **"New Project"** button
2. Fill in project details:

```
Project Name: zmart-v069
Database Password: [Generate strong password and SAVE IT]
Region: [Choose closest to you, e.g., "US West (Oregon)"]
Pricing Plan: Free (includes 500MB database, plenty for testing)
```

3. Click **"Create new project"**
4. Wait 2-3 minutes for project provisioning

---

## Step 2: Get Supabase Credentials (2 minutes)

### 2.1: Navigate to API Settings

**In Supabase Dashboard:**
1. Click **"Settings"** (gear icon in left sidebar)
2. Click **"API"**
3. Find the **"Project API keys"** section

### 2.2: Copy Credentials

You'll need these 3 values:

**1. Project URL:**
```
https://[project-id].supabase.co
```
Example: `https://abc123xyz.supabase.co`

**2. Anon Public Key:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```
(Long JWT string, starts with `eyJ`)

**3. Service Role Key:** ⚠️ **KEEP THIS SECRET**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```
(Different JWT string, also starts with `eyJ`)

**IMPORTANT:** The Service Role key has admin access. Never commit it to git or share publicly.

---

## Step 3: Deploy Database Schema (5-10 minutes)

### 3.1: Open SQL Editor

**In Supabase Dashboard:**
1. Click **"SQL Editor"** in left sidebar
2. Click **"New query"** button

### 3.2: Copy Migration SQL

**On your local machine:**

Open the migration file:
```bash
cat /Users/seman/Desktop/zmartV0.69/backend/migrations/001_initial_schema.sql
```

**Or** open it in your text editor and copy the entire contents.

### 3.3: Run Migration

**In Supabase SQL Editor:**
1. Paste the entire SQL migration (all ~600 lines)
2. Click **"Run"** button (or press `Cmd+Enter`)
3. Wait 5-10 seconds for execution

### 3.4: Verify Success

**Expected output:**
```
NOTICE:  ZMART V0.69 Database Schema deployed successfully
NOTICE:  Total tables: 8
NOTICE:    - Core: users, markets, positions
NOTICE:    - Voting: proposal_votes, dispute_votes
NOTICE:    - Discussions: discussions, ipfs_anchors
NOTICE:    - Trading: trades
NOTICE:  Total indexes: 40+
NOTICE:  RLS enabled on all tables
```

**Check for errors:**
- If you see `ERROR: ...`, read the error message carefully
- Most common issue: Missing extensions (should auto-create)
- If error persists, try running the SQL in smaller chunks

### 3.5: Verify Tables Created

**In Supabase Dashboard:**
1. Click **"Table Editor"** in left sidebar
2. You should see 8 tables:
   - users
   - markets
   - positions
   - proposal_votes
   - dispute_votes
   - discussions
   - ipfs_anchors
   - trades

---

## Step 4: Update Backend Environment (5 minutes)

### 4.1: Edit Backend .env File

**On your local machine:**
```bash
cd /Users/seman/Desktop/zmartV0.69/backend
nano .env  # or use your preferred editor
```

### 4.2: Update Supabase Credentials

**Find these lines:**
```bash
# Supabase Configuration
SUPABASE_URL=https://placeholder-project.supabase.co
SUPABASE_ANON_KEY=placeholder-anon-key
SUPABASE_SERVICE_ROLE_KEY=placeholder-service-role-key
```

**Replace with your real values:**
```bash
# Supabase Configuration
SUPABASE_URL=https://[your-project-id].supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...[your-anon-key]
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...[your-service-role-key]
```

**Save and close the file.**

---

## Step 5: Restart Backend Services (2 minutes)

### 5.1: Stop Running Services

**Find running backend processes:**
```bash
# Method 1: If you know the process is running
pkill -f "node dist/index.js"

# Method 2: Find and kill manually
ps aux | grep "node dist/index.js"
# Note the PID, then:
kill [PID]
```

### 5.2: Rebuild TypeScript

```bash
cd /Users/seman/Desktop/zmartV0.69/backend
npm run build
```

**Expected output:**
```
> zmart-backend@0.69.0 build
> tsc
```
(Should complete with no errors)

### 5.3: Start Services

```bash
npm start
```

**Expected output (after ~2 seconds):**
```json
{"level":"info","message":"============================================================"}
{"level":"info","message":"ZMART Backend Services Starting..."}
{"level":"info","message":"Configuration loaded","backendWallet":"4WQwPjKHu3x7dHBEehBDgxXHJQoDuBvj6Xhu6C1jjTye"}
{"level":"info","message":"Testing external connections..."}
{"level":"info","message":"Database connection test successful"}  ✅
{"level":"info","message":"Redis connection test successful"}
{"level":"info","message":"Solana connection test successful"}
{"level":"info","message":"All connections successful!"}
{"level":"info","message":"[1/4] ✅ API Server running on port 4000"}
{"level":"info","message":"[2/4] ✅ WebSocket Server running on port 4001"}
{"level":"info","message":"[3/4] ⚠️  Vote Aggregator SKIPPED (program IDL not found)"}
{"level":"info","message":"[4/4] ⚠️  IPFS Snapshot SKIPPED (package issue)"}
{"level":"info","message":"🚀 ZMART Backend Services READY"}
```

**Key change:** Database connection now succeeds ✅ (was failing before)

---

## Step 6: Verify Database Connection (2 minutes)

### 6.1: Test Health Endpoint

```bash
curl http://localhost:4000/health | jq .
```

**Expected:**
```json
{
  "status": "healthy",
  "timestamp": "2025-11-07T...",
  "uptime": 10.5,
  "environment": "development"
}
```

### 6.2: Test Database Query

**In Supabase Dashboard:**
1. Go to **SQL Editor**
2. Run simple query:

```sql
SELECT COUNT(*) FROM users;
```

**Expected:** `0` (no users yet, but table exists)

### 6.3: Test Backend Database Access

**Create test script:**
```bash
cat > /Users/seman/Desktop/zmartV0.69/backend/scripts/test-db.ts << 'EOF'
import { getSupabaseClient } from '../src/config/database';

async function testDatabase() {
  const supabase = getSupabaseClient();

  // Test 1: Count users
  const { count: userCount, error: userError } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true });

  if (userError) {
    console.error('❌ Users table query failed:', userError);
    process.exit(1);
  }

  console.log(`✅ Users table: ${userCount} records`);

  // Test 2: Count markets
  const { count: marketCount, error: marketError } = await supabase
    .from('markets')
    .select('*', { count: 'exact', head: true });

  if (marketError) {
    console.error('❌ Markets table query failed:', marketError);
    process.exit(1);
  }

  console.log(`✅ Markets table: ${marketCount} records`);

  console.log('\n✅✅✅ Database connection verified!');
  process.exit(0);
}

testDatabase().catch(console.error);
EOF
```

**Run test:**
```bash
npx ts-node backend/scripts/test-db.ts
```

**Expected output:**
```
✅ Users table: 0 records
✅ Markets table: 0 records

✅✅✅ Database connection verified!
```

---

## Troubleshooting

### Issue 1: "relation does not exist"

**Problem:** Tables not created

**Solution:**
1. Check SQL Editor for errors during migration
2. Verify you pasted the ENTIRE migration file
3. Try running migration again (it's idempotent for most operations)

---

### Issue 2: "Database connection test failed"

**Problem:** Backend can't connect to Supabase

**Diagnosis:**
```bash
# Check .env values
grep SUPABASE backend/.env
```

**Common causes:**
- Wrong SUPABASE_URL (missing `https://` or wrong project ID)
- Wrong SUPABASE_SERVICE_ROLE_KEY (copied Anon key instead)
- Trailing spaces in .env values

**Solution:**
1. Double-check credentials from Supabase Dashboard > Settings > API
2. Ensure no extra spaces or quotes around values
3. Restart backend: `pkill -f "node dist/index.js" && npm start`

---

### Issue 3: WebSocket channels showing "TIMED_OUT"

**Problem:** WebSocket real-time channels timing out

**This is EXPECTED and OK for now:**
- WebSocket is trying to subscribe to Supabase Realtime channels
- Free tier has Realtime disabled by default
- This doesn't affect API functionality

**To enable Realtime (optional):**
1. Supabase Dashboard > Settings > API
2. Enable **"Realtime"** toggle
3. Restart backend services

---

## Success Checklist

- [ ] Supabase project created
- [ ] Database password saved securely
- [ ] Project URL, Anon Key, Service Role Key copied
- [ ] Migration SQL executed successfully
- [ ] 8 tables visible in Table Editor
- [ ] Backend `.env` updated with real credentials
- [ ] Backend services restarted
- [ ] Database connection test passes
- [ ] Health endpoint responding
- [ ] Test database query succeeds

---

## Next Steps

**After completing this guide:**

1. ✅ Database is ready for use
2. ✅ Backend can read/write to database
3. ✅ API endpoints will now work with real data
4. ⏸️ Vote Aggregator still skipped (waiting for Anchor IDL)
5. ⏸️ IPFS Snapshot still skipped (package issue)

**Phase 2 Week 1 Day 2 Remaining Tasks:**
- [ ] Resolve Anchor build issue (spl-token-2022)
- [ ] Generate IDL for Vote Aggregator
- [ ] Test full backend stack with database

---

## Security Reminders

⚠️ **NEVER** commit `.env` file to git
⚠️ **NEVER** share Service Role Key publicly
⚠️ **DO** use Anon Key for frontend (read-only)
⚠️ **DO** rotate credentials if accidentally exposed

---

## Supabase Dashboard Quick Links

**After setup, bookmark these:**

- **Project Home:** https://supabase.com/dashboard/project/[project-id]
- **Table Editor:** https://supabase.com/dashboard/project/[project-id]/editor
- **SQL Editor:** https://supabase.com/dashboard/project/[project-id]/sql
- **API Docs:** https://supabase.com/dashboard/project/[project-id]/api
- **Database:** https://supabase.com/dashboard/project/[project-id]/database/tables

---

**Guide Version:** 1.0
**Last Updated:** November 7, 2025
**Next:** Phase 2 Week 1 Day 3 - Resolve Anchor Build Issue
