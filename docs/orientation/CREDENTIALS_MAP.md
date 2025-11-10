# CREDENTIALS_MAP.md - Where Each Credential Is Used

**Last Updated:** November 8, 2025
**Purpose:** Visual map showing which service uses which credential
**Security:** 🚨 All credentials stored in `backend/.env` ONLY

---

## 🎯 Purpose

This document answers:
- Which service needs which credentials?
- What happens if a credential is invalid?
- How do I rotate credentials safely?
- Where are credentials actually stored?

**See Also:**
- [ENVIRONMENT_GUIDE.md](./ENVIRONMENT_GUIDE.md) - Complete environment variables reference
- [SERVICE_ARCHITECTURE.md](./SERVICE_ARCHITECTURE.md) - How services connect
- [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md) - Complete file tree

---

## 🗺️ Credential Usage Map

```
┌─────────────────────────────────────────────────────────────────┐
│                   CREDENTIAL STORAGE                            │
│                                                                 │
│   ⭐ Single Source of Truth: backend/.env                       │
│                                                                 │
│   Location: /Users/seman/Desktop/zmartV0.69/backend/.env       │
│   Security: 🚨 NEVER COMMIT THIS FILE                           │
│   Backup: .env.example.safe (safe template, no real values)    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Loaded by dotenv
                              │
            ┌─────────────────┼─────────────────┐
            │                 │                 │
            ▼                 ▼                 ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ Event Indexer   │ │ Vote Aggregator │ │ Market Monitor  │
│ (Port 3001)     │ │ (Port 3002)     │ │ (Background)    │
└─────────────────┘ └─────────────────┘ └─────────────────┘
```

---

## 📊 Credential Matrix

| Credential | Event Indexer | Vote Aggregator | Market Monitor | API Gateway | Test Scripts | Security Level |
|------------|---------------|-----------------|----------------|-------------|--------------|----------------|
| **SUPABASE_URL** | ✅ Read | ✅ Write | ✅ Read/Write | ✅ Read | ✅ Read | 🟢 Public |
| **SUPABASE_SERVICE_ROLE_KEY** | ✅ Required | ✅ Required | ✅ Required | ✅ Required | ✅ Required | 🔴 SECRET |
| **HELIUS_API_KEY** | ✅ RPC | ✅ RPC | ✅ RPC | - | ✅ RPC | 🔴 SECRET |
| **SOLANA_RPC_URL** | - | ✅ Tx Submit | ✅ Tx Submit | - | ✅ Tx Submit | 🟡 Contains Key |
| **HELIUS_WEBHOOK_URL** | ✅ Registration | - | - | - | - | 🟢 Public |
| **PROGRAM_ID** | ✅ Filter | ✅ Client | ✅ Client | - | ✅ Client | 🟢 Public |
| **ADMIN_WALLET_ADDRESS** | - | - | ✅ Signing | - | ✅ Signing | 🟢 Public |
| **REDIS_URL** | - | ✅ Cache | - | - | - | 🟡 Internal |
| **PORT** | ✅ 3001 | ✅ 3002 | - | ✅ 3000 | - | 🟢 Config |

**Legend:**
- ✅ **Required** - Service cannot run without this
- 🟢 **Public** - Safe to expose (no authentication value)
- 🟡 **Internal** - Should not be public but low risk
- 🔴 **SECRET** - MUST be kept secret (critical security)

---

## 🔑 Credential Details by Service

### Event Indexer

**File:** `backend/event-indexer/src/index.ts`

**Credentials Used:**
```typescript
// Required for database writes
SUPABASE_URL              // Public endpoint
SUPABASE_SERVICE_ROLE_KEY // 🔴 SECRET - Bypasses RLS

// Required for webhook registration
HELIUS_API_KEY            // 🔴 SECRET - RPC access
HELIUS_WEBHOOK_URL        // Public callback URL

// Required for filtering events
PROGRAM_ID                // Public program address

// Optional configuration
PORT                      // Default: 3001
NODE_ENV                  // development/production
```

**What Happens If Invalid:**
- `SUPABASE_URL` invalid → Cannot write events to database
- `SUPABASE_SERVICE_ROLE_KEY` invalid → Database auth fails
- `HELIUS_API_KEY` invalid → Cannot register webhook
- `PROGRAM_ID` wrong → Will index wrong program's events

**How to Rotate:**
1. Get new credentials from Supabase/Helius dashboards
2. Update `backend/.env`
3. Restart service: `pm2 restart event-indexer`

---

### Vote Aggregator

**File:** `backend/vote-aggregator/src/index.ts`

**Credentials Used:**
```typescript
// Required for database writes
SUPABASE_URL              // Public endpoint
SUPABASE_SERVICE_ROLE_KEY // 🔴 SECRET - Bypasses RLS

// Required for caching votes
REDIS_URL                 // redis://localhost:6379

// Required for on-chain submission
SOLANA_RPC_URL            // 🔴 Contains HELIUS_API_KEY
PROGRAM_ID                // Public program address

// Optional configuration
PORT                      // Default: 3002
VOTE_AGGREGATION_INTERVAL // Default: 300000 (5 min)
NODE_ENV                  // development/production
```

**What Happens If Invalid:**
- `REDIS_URL` invalid → Cannot cache votes (service fails)
- `SOLANA_RPC_URL` invalid → Cannot submit votes on-chain
- `PROGRAM_ID` wrong → Will submit to wrong program (tx fails)

**How to Rotate:**
1. Update `backend/.env`
2. Restart service: `pm2 restart vote-aggregator`
3. Test: `curl http://localhost:3002/health`

---

### Market Monitor

**File:** `backend/src/services/market-monitor/index.ts`

**Credentials Used:**
```typescript
// Required for database queries
SUPABASE_URL              // Public endpoint
SUPABASE_SERVICE_ROLE_KEY // 🔴 SECRET - Bypasses RLS

// Required for on-chain finalization
SOLANA_RPC_URL            // 🔴 Contains HELIUS_API_KEY
PROGRAM_ID                // Public program address
ADMIN_WALLET_ADDRESS      // Public admin wallet

// Required for signing transactions
ANCHOR_WALLET             // 🔴 CRITICAL - Private key file path
                          // (Not in .env, set as environment variable)

// Optional configuration
MARKET_MONITOR_INTERVAL   // Default: 300000 (5 min)
NODE_ENV                  // development/production
```

**What Happens If Invalid:**
- `ADMIN_WALLET_ADDRESS` wrong → Transaction signature verification fails
- `ANCHOR_WALLET` path wrong → Cannot sign transactions
- `SOLANA_RPC_URL` invalid → Cannot submit finalization transactions

**How to Rotate:**
1. Update `backend/.env`
2. Restart service: `pm2 restart market-monitor`
3. Check logs: `pm2 logs market-monitor`

---

### API Gateway (FUTURE - Week 6)

**File:** `backend/src/api/server.ts`

**Credentials Used:**
```typescript
// Required for database queries
SUPABASE_URL              // Public endpoint
SUPABASE_SERVICE_ROLE_KEY // 🔴 SECRET - Bypasses RLS

// Optional configuration
PORT                      // Default: 3000
NODE_ENV                  // development/production
```

**What Happens If Invalid:**
- `SUPABASE_URL` invalid → API returns 500 errors

**How to Rotate:**
1. Update `backend/.env`
2. Restart service: `pm2 restart api-gateway`

---

### Test Scripts

**Files:** `backend/scripts/*.ts`

**Credentials Used:**
```typescript
// All test scripts use:
SUPABASE_URL              // Public endpoint
SUPABASE_SERVICE_ROLE_KEY // 🔴 SECRET - Bypasses RLS
SOLANA_RPC_URL            // 🔴 Contains HELIUS_API_KEY
PROGRAM_ID                // Public program address

// Some scripts also use:
ADMIN_WALLET_ADDRESS      // For signing test transactions
ANCHOR_WALLET             // For deploying programs
```

**What Happens If Invalid:**
- Tests fail with connection errors

**How to Rotate:**
1. Update `backend/.env`
2. Re-run tests: `npm run test:db`

---

## 🔐 Security Impact Analysis

### 🔴 CRITICAL - If Compromised, Immediate Action Required

**SUPABASE_SERVICE_ROLE_KEY**
- **Impact:** Full database access, can read/write/delete all data
- **Used By:** All backend services
- **Rotation Steps:**
  1. Go to Supabase Dashboard → Settings → API
  2. Generate new service role key
  3. Update `backend/.env`
  4. Restart all services: `pm2 restart all`
  5. Revoke old key (optional, old key still works until revoked)

**HELIUS_API_KEY**
- **Impact:** RPC quota abuse, potential cost increase
- **Used By:** All services using Solana RPC
- **Rotation Steps:**
  1. Go to Helius Dashboard
  2. Generate new API key
  3. Update `backend/.env` (both `HELIUS_API_KEY` and `SOLANA_RPC_URL`)
  4. Restart all services
  5. Revoke old key

**ANCHOR_WALLET (Private Key File)**
- **Impact:** 🚨 CRITICAL - Admin wallet control, can pause/unpause markets
- **Used By:** Market Monitor, Test Scripts
- **Rotation Steps:**
  1. Generate new Solana keypair: `solana-keygen new -o ~/.config/solana/new-admin.json`
  2. Transfer SOL from old to new wallet
  3. Update global config with new admin: `update_global_config` instruction
  4. Update `ADMIN_WALLET_ADDRESS` in `backend/.env`
  5. Delete old keypair: `rm ~/.config/solana/id.json`
  6. Rename new keypair: `mv ~/.config/solana/new-admin.json ~/.config/solana/id.json`

---

### 🟡 MODERATE - If Compromised, Update Soon

**REDIS_URL**
- **Impact:** Vote cache poisoning (temporary, clears every 5 min)
- **Used By:** Vote Aggregator
- **Rotation Steps:**
  1. Update Redis password (if using auth)
  2. Update `REDIS_URL` in `backend/.env`
  3. Restart vote aggregator

**SUPABASE_ACCESS_TOKEN**
- **Impact:** Account-level access, can manage projects
- **Used By:** Deployment scripts only
- **Rotation Steps:**
  1. Go to https://app.supabase.com/account/tokens
  2. Revoke old token
  3. Generate new token
  4. Update `SUPABASE_ACCESS_TOKEN` in `backend/.env`

---

### 🟢 LOW - If Compromised, No Immediate Risk

**SUPABASE_URL, PROGRAM_ID, ADMIN_WALLET_ADDRESS, HELIUS_WEBHOOK_URL**
- **Impact:** Public information, no security risk
- **Used By:** Various services
- **Rotation:** Not needed for security, only if changing infrastructure

---

## 🔄 Complete Rotation Checklist

### Quarterly Security Rotation (Every 90 Days)

```bash
# 1. Rotate Supabase Service Role Key
# - Go to Supabase Dashboard → Settings → API
# - Generate new service_role key
# - Update backend/.env: SUPABASE_SERVICE_ROLE_KEY=new_key

# 2. Rotate Helius API Key
# - Go to Helius Dashboard
# - Generate new API key
# - Update backend/.env: HELIUS_API_KEY=new_key
# - Update backend/.env: SOLANA_RPC_URL=https://devnet.helius-rpc.com/?api-key=new_key

# 3. Rotate Supabase Access Token
# - Go to https://app.supabase.com/account/tokens
# - Revoke old token
# - Generate new token
# - Update backend/.env: SUPABASE_ACCESS_TOKEN=new_token

# 4. Restart all services
cd /Users/seman/Desktop/zmartV0.69/backend
pm2 restart all

# 5. Verify services
npm run test:db
npm run test:integration

# 6. Check logs for errors
pm2 logs --lines 50
```

---

## 🧪 Testing Credentials

### Verify All Credentials Work

```bash
cd /Users/seman/Desktop/zmartV0.69/backend

# Test Supabase connection
npm run test:db
# Expected: ✅ Supabase connection successful

# Test Helius RPC
npx ts-node -e "
import { Connection } from '@solana/web3.js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });
const conn = new Connection(process.env.SOLANA_RPC_URL!);
conn.getVersion().then(v => console.log('✅ Helius RPC:', v));
"

# Test Redis
npx ts-node -e "
import { createClient } from 'redis';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });
const client = createClient({ url: process.env.REDIS_URL });
client.connect().then(() => console.log('✅ Redis connected'));
"

# Test complete integration
npm run test:integration
```

---

## 📋 Credential Checklist

### ✅ Before Deployment

- [ ] All credentials exist in `backend/.env`
- [ ] No credentials hardcoded in source code
- [ ] `.env` file is in `.gitignore`
- [ ] `.env.example.safe` has placeholder values only
- [ ] All services can start without errors
- [ ] Test scripts pass: `npm run test:db`

### ✅ After Deployment

- [ ] Production credentials different from dev
- [ ] Credentials stored securely (not in .env file on server)
- [ ] Environment variables set via hosting platform
- [ ] Rotation schedule established (90 days)
- [ ] Backup admin wallet created and stored securely

### ✅ Ongoing Maintenance

- [ ] Quarterly credential rotation completed
- [ ] Logs monitored for auth failures
- [ ] No credentials in error logs
- [ ] Service health checks passing

---

## 🆘 Troubleshooting

### Service Won't Start

**Symptom:** Service crashes on startup

**Diagnosis:**
```bash
cd /Users/seman/Desktop/zmartV0.69/backend
pm2 logs <service-name> --err --lines 50
```

**Common Issues:**
1. **"Cannot find .env file"**
   - Verify: `ls -la backend/.env`
   - Fix: Create from template

2. **"Invalid Supabase credentials"**
   - Verify URL: `echo $SUPABASE_URL`
   - Fix: Re-copy from Supabase Dashboard

3. **"Redis connection refused"**
   - Verify Redis running: `redis-cli ping`
   - Fix: `brew services start redis`

---

### Credential Rotation Failed

**Symptom:** Old credential still being used

**Diagnosis:**
```bash
# Check environment variables loaded
pm2 show <service-name> | grep "env:"

# Check .env file
cat backend/.env | grep -i supabase
```

**Fix:**
1. Update `backend/.env` with new credential
2. Restart service: `pm2 restart <service-name>`
3. Verify new credential loaded: `pm2 logs <service-name> --lines 10`

---

## 📖 Related Documentation

**Essential Reading:**
1. [ENVIRONMENT_GUIDE.md](./ENVIRONMENT_GUIDE.md) - Complete environment variables reference
2. [SERVICE_ARCHITECTURE.md](./SERVICE_ARCHITECTURE.md) - How services connect
3. [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md) - Complete file tree
4. [CLAUDE.md](../CLAUDE.md) - Claude Code instructions

**Quick Navigation:**
- [00_MASTER_INDEX.md](./00_MASTER_INDEX.md) - Complete navigation hub
- [IMPLEMENTATION_PHASES.md](./IMPLEMENTATION_PHASES.md) - 14-week roadmap
- [TODO_CHECKLIST.md](./TODO_CHECKLIST.md) - Daily progress tracking

---

**Last Updated:** November 8, 2025
**Maintainer:** Claude Code
**Version:** 1.0
