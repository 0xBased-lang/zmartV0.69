# Cloud Supabase Setup Guide - Quick Start

**Date:** November 7, 2025
**Estimated Time:** 5-10 minutes
**Status:** Step-by-Step Instructions

---

## 📋 Prerequisites

- [ ] Web browser (Chrome, Firefox, Safari, or Edge)
- [ ] Email address for Supabase account
- [ ] Migration SQL ready: `backend/migrations/001_initial_schema.sql`

---

## 🚀 Step-by-Step Setup

### Step 1: Create Supabase Account & Project (2 minutes)

1. **Visit Supabase:**
   - Go to: https://supabase.com
   - Click "Start your project" or "Sign In"

2. **Sign In/Up:**
   - Use GitHub, Google, or Email
   - Complete authentication

3. **Create New Project:**
   - Click "New Project"
   - **Organization:** Select or create one
   - **Project Name:** `zmart-v069` (or your preferred name)
   - **Database Password:** Generate strong password (SAVE THIS!)
   - **Region:** Choose closest to you (e.g., `us-west-1` for California)
   - **Pricing Plan:** Free tier is fine for development
   - Click "Create new project"

4. **Wait for Project Initialization:**
   - Takes 1-2 minutes
   - Status will show "Setting up project..."
   - Wait until you see "Project is ready"

---

### Step 2: Deploy Database Schema (2 minutes)

1. **Open SQL Editor:**
   - In left sidebar, click "SQL Editor"
   - Click "New query"

2. **Copy Migration SQL:**
   - Open: `/Users/seman/Desktop/zmartV0.69/backend/migrations/001_initial_schema.sql`
   - Select ALL content (Cmd+A or Ctrl+A)
   - Copy (Cmd+C or Ctrl+C)

3. **Paste & Execute:**
   - Paste SQL into Supabase SQL Editor
   - Click "Run" button (bottom right)
   - Wait for execution (10-20 seconds)

4. **Verify Success:**
   - You should see success messages like:
     ```
     NOTICE: ZMART V0.69 Database Schema deployed successfully
     NOTICE: Total tables: 8
     NOTICE: RLS enabled on all tables
     ```
   - Check "Table Editor" in left sidebar - you should see 8 tables:
     - users
     - markets
     - positions
     - proposal_votes
     - dispute_votes
     - discussions
     - ipfs_anchors
     - trades

---

### Step 3: Get Connection Credentials (1 minute)

1. **Navigate to Settings:**
   - Click "Settings" (gear icon) in left sidebar
   - Click "API" tab

2. **Copy These Values:**

   **A. Project URL:**
   - Look for "Project URL" section
   - Copy the full URL (e.g., `https://abcdefghijklmnop.supabase.co`)
   - **Save as:** `SUPABASE_URL`

   **B. Project API Keys:**
   - Scroll to "Project API keys" section
   - Find "anon" key (public)
     - **Save as:** `SUPABASE_ANON_KEY`
   - Find "service_role" key (secret)
     - **Save as:** `SUPABASE_SERVICE_KEY`

   **C. Database Connection String:**
   - Click "Database" tab (still in Settings)
   - Scroll to "Connection string" section
   - Select "URI" tab
   - Copy the connection string
   - **Replace** `[YOUR-PASSWORD]` with your actual database password
   - **Save as:** `DATABASE_URL`

---

### Step 4: Update Backend Configuration (1 minute)

**I'll help you with this step automatically once you provide the credentials.**

Your `.env` file will look like:
```env
# Supabase Configuration (Cloud)
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.your-project-id.supabase.co:5432/postgres

# Solana Configuration (existing)
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_NETWORK=devnet
BACKEND_KEYPAIR_PATH=/Users/seman/.config/solana/backend-authority.json

# API Configuration (existing)
API_PORT=4000
WEBSOCKET_PORT=4001
NODE_ENV=development

# Redis Configuration (existing)
REDIS_URL=redis://localhost:6379

# Services Configuration (existing)
VOTE_AGGREGATOR_CRON="*/5 * * * *"
IPFS_SNAPSHOT_CRON="0 0 * * *"
```

---

## 🧪 Verification Steps

### 1. Test Database Connection

I'll run this for you automatically:
```bash
npm run test:db
```

Expected output:
```
✅ Database connection successful
✅ Found 8 tables
✅ RLS policies active
```

### 2. Test Vote Aggregator

I'll verify:
- Vote Aggregator connects to cloud database
- Can read from proposal_votes and dispute_votes tables
- Cron scheduler operational

### 3. Test API Server

I'll check:
- API health endpoint responds
- WebSocket connection works
- Supabase realtime subscriptions active

---

## 📊 Post-Setup Checklist

After providing credentials, I will:
- [ ] Update backend/.env with cloud credentials
- [ ] Restart backend services
- [ ] Test database connection
- [ ] Verify Vote Aggregator reads from cloud
- [ ] Test API endpoints
- [ ] Verify WebSocket realtime events
- [ ] Generate connection test report

---

## 🎯 What You Need to Provide

**Once you've completed Steps 1-3 above, provide me with:**

1. **SUPABASE_URL** - Project URL from API settings
2. **SUPABASE_ANON_KEY** - Public anon key from API settings
3. **SUPABASE_SERVICE_KEY** - Secret service_role key from API settings
4. **DATABASE_URL** - Connection string from Database settings (with password filled in)

**Format:**
```
SUPABASE_URL=https://...
SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_KEY=eyJhbGci...
DATABASE_URL=postgresql://postgres:your-password@db...
```

I'll handle the rest automatically!

---

## ⚠️ Security Notes

1. **Keep service_role key SECRET** - Never commit to git
2. **Database password** - Store securely, never share
3. **RLS Policies** - Already configured in migration, protects data
4. **API Keys** - Anon key is safe for frontend, service_role for backend only

---

## 🐛 Troubleshooting

### Migration Fails with "already exists" errors:
- **Solution:** Normal if re-running migration. Check Table Editor for tables.

### Can't connect to database:
- **Check:** Password correct in DATABASE_URL
- **Check:** Project finished initialization (green status)
- **Check:** Firewall/VPN not blocking Supabase

### Tables not showing in Table Editor:
- **Solution:** Refresh page, check SQL Editor for error messages

---

## 📖 Additional Resources

- Supabase Docs: https://supabase.com/docs
- Connection Issues: https://supabase.com/docs/guides/database/connecting-to-postgres
- RLS Guide: https://supabase.com/docs/guides/auth/row-level-security

---

**Ready to proceed?** Follow Steps 1-3 above and provide the credentials. I'll handle the rest! 🚀
