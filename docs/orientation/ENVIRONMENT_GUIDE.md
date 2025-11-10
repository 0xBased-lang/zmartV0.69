# ENVIRONMENT_GUIDE.md - Complete Environment Variables Map

**Last Updated:** November 8, 2025
**Purpose:** Comprehensive map of ALL environment files, variables, and their purposes
**Security:** ⚠️ NEVER commit files containing live credentials

---

## 🎯 Purpose

This document answers:
- What environment files exist and where?
- Which file should I use for credentials?
- What does each environment variable do?
- Where is each credential used?
- How to safely manage secrets?

**See Also:**
- [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md) - Complete file tree
- [SERVICE_ARCHITECTURE.md](./SERVICE_ARCHITECTURE.md) - How services connect
- [CREDENTIALS_MAP.md](./CREDENTIALS_MAP.md) - Where each credential is used

---

## 📁 Environment Files Overview

### ⭐ THE TRUTH: backend/.env (LIVE CREDENTIALS)

**Location:** `/Users/seman/Desktop/zmartV0.69/backend/.env`
**Status:** ✅ ACTIVE - Contains ALL live credentials
**Security:** 🚨 **NEVER COMMIT THIS FILE**
**Purpose:** Single source of truth for all credentials across all services

```bash
# This is the ONLY file you should use for credentials!
# All backend services read from this file
```

**Services using this file:**
1. Event Indexer (`backend/event-indexer/`)
2. Vote Aggregator (`backend/vote-aggregator/`)
3. Market Monitor (`backend/src/services/market-monitor/`)
4. API Gateway (`backend/src/api/`)
5. Test scripts (`backend/scripts/`)

---

### ⚠️ PLACEHOLDER: .env.local (IGNORE THIS)

**Location:** `/Users/seman/Desktop/zmartV0.69/.env.local`
**Status:** ⚠️ PLACEHOLDER - DO NOT USE
**Purpose:** Template with example values (NOT for actual use)

```bash
# ⚠️ This file exists as a template but is NOT used
# Use backend/.env instead!
```

**Why it exists:**
- Created as placeholder during setup
- Contains example values only
- Serves as documentation of available env vars
- **NOT read by any service**

---

### 📋 Safe Example: .env.example.safe

**Location:** `/Users/seman/Desktop/zmartV0.69/backend/.env.example.safe`
**Status:** ✅ SAFE TO COMMIT - No live credentials
**Purpose:** Safe template showing required env vars without actual values

```bash
# Safe example template
# Copy to .env and fill in real values
```

---

## 🔑 Complete Environment Variables Reference

### Supabase Credentials (Database)

**Used by:** Event Indexer, Vote Aggregator, Market Monitor, API Gateway

```bash
# Supabase Project Configuration
SUPABASE_URL=https://tkkqqxepelibqjjhxxct.supabase.co
# Purpose: Supabase project endpoint
# Used in: All backend services
# Security: Public (can be safely exposed)
# Alternative names: NEXT_PUBLIC_SUPABASE_URL (frontend only)

SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
# Purpose: Client-side anonymous access (RLS protected)
# Used in: Frontend (FUTURE), read-only operations
# Security: Public (Row Level Security protects data)
# Alternative names: NEXT_PUBLIC_SUPABASE_ANON_KEY

SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
# Purpose: Backend admin access (bypasses RLS)
# Used in: All backend services (write operations)
# Security: 🚨 SECRET - NEVER expose to client
# Capabilities: Full database access, bypasses all RLS policies

# Supabase CLI/API (for deployment)
SUPABASE_ACCESS_TOKEN=sbp_...
# Purpose: Personal access token for CLI/API operations
# Used in: Deployment scripts, Supabase CLI
# Security: 🚨 SECRET - Account-level access
# Get from: https://app.supabase.com/account/tokens

SUPABASE_PROJECT_REF=tkkqqxepelibqjjhxxct
# Purpose: Project identifier for API operations
# Used in: Deployment scripts
# Security: Public (project identifier only)
# Get from: Settings → General → Reference ID
```

**Where to get Supabase credentials:**
1. Login to https://app.supabase.com/
2. Select your project
3. Go to Settings → API
4. Copy URL and keys

---

### Helius RPC & Webhook (Solana Events)

**Used by:** Event Indexer, Market Monitor, Vote Aggregator, Test Scripts

```bash
# Helius RPC Endpoints
HELIUS_API_KEY=your-helius-api-key-here
# Purpose: Authenticate with Helius RPC service
# Used in: All Solana RPC calls
# Security: 🚨 SECRET - Rate-limited API access
# Get from: https://dashboard.helius.dev/

SOLANA_RPC_URL=https://devnet.helius-rpc.com/?api-key=your-helius-api-key-here
# Purpose: Full Solana RPC endpoint URL
# Used in: Anchor program deployment, transaction submission
# Security: Contains API key (keep secret)
# Format: https://devnet.helius-rpc.com/?api-key=YOUR_KEY

HELIUS_WEBHOOK_URL=https://your-backend.com/helius
# Purpose: Public endpoint for Helius to send webhooks
# Used in: Helius webhook registration
# Security: Public (but verify signatures)
# Example: https://zmart-event-indexer.railway.app/helius
# Note: Must be publicly accessible (use ngrok for local dev)

HELIUS_WEBHOOK_ID=webhook_abc123
# Purpose: Identifier for registered webhook
# Used in: Webhook management, unregistering webhooks
# Security: Public (just an identifier)
# Get from: Helius webhook registration response
```

**Where to get Helius credentials:**
1. Create account at https://helius.dev/
2. Go to https://dashboard.helius.dev/
3. Create new API key
4. Copy API key

**How to register Helius webhook:**
```bash
cd backend
npm run helius:register
# This creates the webhook and saves HELIUS_WEBHOOK_ID to .env
```

---

### Solana Network Configuration

**Used by:** All services interacting with blockchain

```bash
# Solana Network
SOLANA_NETWORK=devnet
# Purpose: Which Solana network to use
# Options: devnet, testnet, mainnet-beta
# Used in: All program interactions
# Default: devnet (for development)

SOLANA_CLUSTER=https://api.devnet.solana.com
# Purpose: Direct Solana RPC endpoint (fallback if Helius down)
# Used in: Program deployment, testing
# Security: Public endpoint
# Options:
#   - devnet: https://api.devnet.solana.com
#   - mainnet: https://api.mainnet-beta.solana.com

ANCHOR_WALLET=/Users/seman/.config/solana/id.json
# Purpose: Path to Solana keypair for Anchor operations
# Used in: Anchor program deployment, admin operations
# Security: 🚨 CRITICAL - Contains private key
# Default: ~/.config/solana/id.json
# Note: This is NOT in .env (it's an environment variable for Anchor CLI)

ANCHOR_PROVIDER_URL=https://api.devnet.solana.com
# Purpose: Anchor framework RPC endpoint
# Used in: Anchor test suite, program interactions
# Security: Public endpoint
# Note: Can be same as SOLANA_RPC_URL or SOLANA_CLUSTER
```

---

### Program Addresses (On-Chain)

**Used by:** All backend services

```bash
# Deployed Program Addresses
PROGRAM_ID=7h3gXfBfYFueFVLYyfL5Qo1QGsf4GQUfW96FKVgnUsJS
# Purpose: zmart-core program address on devnet
# Used in: All program interactions
# Security: Public (program address)
# Get from: anchor keys list

PROPOSAL_PROGRAM_ID=ProposalManagerProgramID123...
# Purpose: zmart-proposal program address on devnet
# Used in: Proposal voting operations
# Security: Public (program address)
# Status: ⚠️ NOT DEPLOYED YET (Week 2 task)

ADMIN_WALLET_ADDRESS=4MkybTASDtmzQnfUWztHmfgyHgBREw74eTKipVADqQLA
# Purpose: Admin wallet for global config updates, emergency pause
# Used in: Admin instruction validation
# Security: Public (wallet address, not private key)
# Note: Must match the keypair at ANCHOR_WALLET path
```

---

### Backend Service Configuration

**Used by:** Backend services

```bash
# API Server
PORT=3001
# Purpose: Port for Express server (Event Indexer, Vote Aggregator, API Gateway)
# Used in: All backend HTTP servers
# Default: 3001 (Event Indexer), 3002 (Vote Aggregator), 3000 (API Gateway)

NODE_ENV=development
# Purpose: Node.js environment mode
# Options: development, production, test
# Used in: All backend services (logging, error handling)
# Default: development

# Market Monitor Service
MARKET_MONITOR_INTERVAL=300000
# Purpose: How often to check for markets to finalize (milliseconds)
# Default: 300000 (5 minutes)
# Used in: Market Monitor cron job

# Vote Aggregator
REDIS_URL=redis://localhost:6379
# Purpose: Redis connection for vote caching
# Used in: Vote Aggregator service
# Default: redis://localhost:6379
# Note: Redis must be running (install: brew install redis)

VOTE_AGGREGATION_INTERVAL=300000
# Purpose: How often to aggregate and submit votes (milliseconds)
# Default: 300000 (5 minutes)
# Used in: Vote Aggregator cron job
```

---

### Optional: External Services

**Used by:** IPFS service, Pinata (FUTURE)

```bash
# Pinata (IPFS pinning service) - OPTIONAL
PINATA_API_KEY=your-pinata-api-key
# Purpose: Authenticate with Pinata IPFS service
# Used in: IPFS daily snapshot uploads
# Security: 🚨 SECRET - API access
# Get from: https://pinata.cloud/
# Status: OPTIONAL (can use local IPFS instead)

PINATA_SECRET_API_KEY=your-pinata-secret-key
# Purpose: Pinata API secret
# Used in: IPFS service authentication
# Security: 🚨 SECRET - Full account access
# Get from: https://pinata.cloud/
```

---

## 🔐 Security Best Practices

### ✅ DO:

1. **Use backend/.env for ALL credentials**
   ```bash
   # All services read from backend/.env
   cd backend
   cat .env  # Verify credentials exist
   ```

2. **Never commit .env files**
   ```bash
   # Already in .gitignore
   backend/.env
   .env
   .env.local
   ```

3. **Use environment-specific values**
   ```bash
   # Development
   SOLANA_NETWORK=devnet
   HELIUS_WEBHOOK_URL=https://your-ngrok-url.com/helius

   # Production
   SOLANA_NETWORK=mainnet-beta
   HELIUS_WEBHOOK_URL=https://api.zmart.io/helius
   ```

4. **Rotate credentials periodically**
   - Supabase tokens: Every 90 days
   - Helius API key: If compromised
   - Wallet keypairs: If compromised

5. **Use different credentials per environment**
   - Development: Use test API keys
   - Production: Use production API keys

### ❌ DON'T:

1. **Don't use .env.local** - It's a placeholder!
2. **Don't commit backend/.env** - Contains secrets
3. **Don't hardcode credentials** - Always use env vars
4. **Don't expose SUPABASE_SERVICE_ROLE_KEY** - Backend only!
5. **Don't share private keys** - Ever!

---

## 🧪 Local Development Setup

### Step 1: Copy Example File

```bash
cd /Users/seman/Desktop/zmartV0.69/backend
cp .env.example.safe .env
```

### Step 2: Fill in Real Credentials

Edit `backend/.env` and replace placeholder values:

```bash
# Get from Supabase Dashboard
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_ACTUAL_KEY

# Get from Helius Dashboard
HELIUS_API_KEY=YOUR_HELIUS_KEY
SOLANA_RPC_URL=https://devnet.helius-rpc.com/?api-key=YOUR_HELIUS_KEY

# Get from anchor keys list
PROGRAM_ID=YOUR_DEPLOYED_PROGRAM_ID

# Set your admin wallet
ADMIN_WALLET_ADDRESS=YOUR_WALLET_ADDRESS
```

### Step 3: Verify Credentials

```bash
cd backend
npm run test:db  # Test Supabase connection
npm run test:integration  # Test all services
```

---

## 🚀 Deployment (Production)

### Environment Variables in Production

**DO NOT** use .env files in production. Set environment variables through your hosting platform:

**Vercel:**
```bash
# Set in Vercel Dashboard → Settings → Environment Variables
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
# (Frontend only, no service_role key!)
```

**Railway/Heroku/AWS:**
```bash
# Set in platform dashboard or CLI
railway variables set SUPABASE_SERVICE_ROLE_KEY=...
heroku config:set HELIUS_API_KEY=...
aws ssm put-parameter --name "/zmart/supabase-key" --value "..."
```

**PM2 (Backend Services):**
```bash
# Use ecosystem.config.js with env_file
module.exports = {
  apps: [{
    name: 'market-monitor',
    script: 'dist/services/market-monitor/index.js',
    env_file: '/path/to/backend/.env'  # Secure file on server
  }]
}
```

---

## 📊 Environment Variables by Service

### Event Indexer (`backend/event-indexer/`)

**Required:**
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `PORT` (default: 3001)
- `PROGRAM_ID`

**Optional:**
- `NODE_ENV`

### Vote Aggregator (`backend/vote-aggregator/`)

**Required:**
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `REDIS_URL`
- `SOLANA_RPC_URL`
- `PROGRAM_ID`
- `PORT` (default: 3002)

**Optional:**
- `VOTE_AGGREGATION_INTERVAL`
- `NODE_ENV`

### Market Monitor (`backend/src/services/market-monitor/`)

**Required:**
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SOLANA_RPC_URL`
- `PROGRAM_ID`
- `ADMIN_WALLET_ADDRESS`

**Optional:**
- `MARKET_MONITOR_INTERVAL`
- `NODE_ENV`

### API Gateway (`backend/src/api/`) - FUTURE

**Required:**
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `PORT` (default: 3000)

**Optional:**
- `NODE_ENV`

### Test Scripts (`backend/scripts/`)

**Required:**
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SOLANA_RPC_URL`
- `PROGRAM_ID`

**Optional:**
- All optional vars

---

## 🔄 Updating Environment Variables

### Adding New Variables

1. **Add to backend/.env:**
   ```bash
   NEW_VARIABLE=new_value
   ```

2. **Add to .env.example.safe:**
   ```bash
   NEW_VARIABLE=placeholder_value
   ```

3. **Document in this file:**
   - Add to relevant section
   - Explain purpose and security level
   - List which services use it

4. **Update code to read variable:**
   ```typescript
   // In config/env.ts
   export const NEW_VARIABLE = process.env.NEW_VARIABLE;
   ```

### Removing Variables

1. Remove from backend/.env
2. Remove from .env.example.safe
3. Remove from this documentation
4. Remove from code

---

## 🆘 Troubleshooting

### "Cannot find .env file"

**Problem:** Service can't load environment variables

**Solution:**
```bash
cd /Users/seman/Desktop/zmartV0.69/backend
ls -la .env  # Verify file exists
cat .env | head -5  # Verify file has content (first 5 lines)
```

### "Invalid Supabase credentials"

**Problem:** SUPABASE_URL or keys are wrong

**Solution:**
1. Go to https://app.supabase.com/project/YOUR_PROJECT/settings/api
2. Copy fresh credentials
3. Update backend/.env
4. Restart service

### "Helius RPC error"

**Problem:** HELIUS_API_KEY is invalid or rate-limited

**Solution:**
1. Check https://dashboard.helius.dev/
2. Verify API key is active
3. Check rate limits
4. Update HELIUS_API_KEY in backend/.env

### "Program ID not found"

**Problem:** PROGRAM_ID doesn't match deployed program

**Solution:**
```bash
anchor keys list  # Get current program ID
# Update PROGRAM_ID in backend/.env
```

---

## 📖 Related Documentation

**Essential Reading:**
1. [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md) - Complete file tree
2. [SERVICE_ARCHITECTURE.md](./SERVICE_ARCHITECTURE.md) - How services connect
3. [CREDENTIALS_MAP.md](./CREDENTIALS_MAP.md) - Where each credential is used
4. [CLAUDE.md](../CLAUDE.md) - Claude Code instructions

**Quick Navigation:**
- [00_MASTER_INDEX.md](./00_MASTER_INDEX.md) - Complete navigation hub
- [IMPLEMENTATION_PHASES.md](./IMPLEMENTATION_PHASES.md) - 14-week roadmap
- [TODO_CHECKLIST.md](./TODO_CHECKLIST.md) - Daily progress tracking

---

**Last Updated:** November 8, 2025
**Maintainer:** Claude Code
**Version:** 1.0
