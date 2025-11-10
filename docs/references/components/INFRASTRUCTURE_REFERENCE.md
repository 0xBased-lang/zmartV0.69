# INFRASTRUCTURE_REFERENCE.md - Infrastructure & Resources Reference

**Category:** Component Reference
**Tags:** [infrastructure, supabase, redis, rpc, wallets, external-services]
**Last Updated:** 2025-11-09 00:15 PST

---

## Quick Links

- ⬆️ [Back to CLAUDE.md](../../../CLAUDE.md)
- 📊 [Project State](../state/STATE_MASTER.md)
- 🏗️ [Programs Reference](./PROGRAMS_REFERENCE.md)
- 🔧 [Backend Reference](./BACKEND_REFERENCE.md)
- 🗺️ [Integration Map](../architecture/INTEGRATION_MAP.md) ⏳

---

## 🎯 Purpose

**Complete reference for all external infrastructure, services, and resources in the ZMART V0.69 platform.**

This document catalogs:
- **Supabase:** Database, authentication, and storage
- **Redis:** Caching and pub/sub
- **Solana RPC:** Blockchain access (Helius + public endpoints)
- **IPFS:** Decentralized storage (Pinata)
- **Wallets:** All keypairs and their purposes
- **External Services:** Monitoring, alerts, and third-party integrations

**This is a reference document - it describes what infrastructure exists, not how to use it.**

---

## 📦 Infrastructure Overview

### Service Inventory

| Service | Provider | Purpose | Status | Cost |
|---------|----------|---------|--------|------|
| **Supabase** | supabase.com | PostgreSQL database + auth | ✅ Active | Free tier |
| **Helius RPC** | helius.dev | Solana RPC + webhooks | ✅ Active | Free tier |
| **Pinata** | pinata.cloud | IPFS hosting | ✅ Configured | Free tier |
| **Redis** | Local/Cloud | Cache + pub/sub | ⏳ Planned | Free (local) |
| **Solana Public RPC** | Solana Foundation | Fallback RPC | ✅ Available | Free |
| **Slack Webhooks** | slack.com | Alerts and monitoring | ⏳ Planned | Free |

**Total Infrastructure Cost:** $0/month (using free tiers)

---

## 🗄️ Supabase (PostgreSQL Database)

**Provider:** Supabase Cloud
**Project:** tkkqqxepelibqjjhxxct
**Created:** November 7, 2025
**Region:** US East (default)
**Status:** ✅ Active and configured

### Connection Details

**Dashboard:** https://supabase.com/dashboard/project/tkkqqxepelibqjjhxxct

**API Endpoint:** https://tkkqqxepelibqjjhxxct.supabase.co

**Database Connection:**
```
Host: db.tkkqqxepelibqjjhxxct.supabase.co
Port: 5432
Database: postgres
User: postgres
Password: Lr7JeGk1uhzBDqwI
```

**PostgreSQL URL:**
```
postgresql://postgres:Lr7JeGk1uhzBDqwI@db.tkkqqxepelibqjjhxxct.supabase.co:5432/postgres
```

### API Keys

**Anon Key (Public - Frontend Safe):**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRra3FxeGVwZWxpYnFqamh4eGN0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0NTY1ODQsImV4cCI6MjA3ODAzMjU4NH0.QL5FgfLevz1JoZa4FWsP-0vCd4TJb7OEkY_teyGn8zI
```

**Service Role Key (Backend Only - NEVER expose to frontend!):**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRra3FxeGVwZWxpYnFqamh4eGN0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjQ1NjU4NCwiZXhwIjoyMDc4MDMyNTg0fQ.hnMSKgtbO6XkH8GWXbwOn0TlHLY8PT6usjWBrr9NyDI
```

### Database Schema

**Deployed:** November 7, 2025
**Migration Status:** ✅ Complete
**Total Tables:** 9
**Total Indexes:** 40+

#### Tables

| Table | Purpose | Row Count | Size |
|-------|---------|-----------|------|
| `markets` | Market metadata and state | ~0 | Empty |
| `trades` | Trading history | ~0 | Empty |
| `votes` | Proposal and dispute votes | ~0 | Empty |
| `discussions` | Market discussions | ~0 | Empty |
| `users` | User profiles | ~0 | Empty |
| `market_finalization_errors` | Auto-finalization error tracking | ~0 | Empty |
| `market_snapshots` | Historical market states | ~0 | Empty |
| `vote_snapshots` | Historical vote aggregations | ~0 | Empty |
| `ipfs_snapshots` | IPFS backup metadata | ~0 | Empty |

#### Row Level Security (RLS)

**Status:** ✅ Enabled on all tables

**Policies:**

**Markets Table:**
- `SELECT`: Public read access
- `INSERT`: Authenticated users only
- `UPDATE`: Market creator or admin only
- `DELETE`: Admin only

**Trades Table:**
- `SELECT`: Public read access
- `INSERT`: Authenticated traders only
- `UPDATE`: None (immutable)
- `DELETE`: Admin only

**Votes Table:**
- `SELECT`: Public read access
- `INSERT`: Authenticated voters only
- `UPDATE`: None (immutable)
- `DELETE`: Admin only

**Discussions Table:**
- `SELECT`: Public read access
- `INSERT`: Authenticated users only
- `UPDATE`: Comment author only
- `DELETE`: Author or admin

**Users Table:**
- `SELECT`: Public read access
- `INSERT`: User themselves only
- `UPDATE`: User themselves only
- `DELETE`: User themselves or admin

### Indexes

**Performance Optimizations:**

```sql
-- Markets
CREATE INDEX idx_markets_state ON markets(state);
CREATE INDEX idx_markets_creator ON markets(creator);
CREATE INDEX idx_markets_created_at ON markets(created_at DESC);
CREATE INDEX idx_markets_finalized_at ON markets(finalized_at DESC) WHERE finalized_at IS NOT NULL;

-- Trades
CREATE INDEX idx_trades_market_id ON trades(market_id);
CREATE INDEX idx_trades_user ON trades("user");
CREATE INDEX idx_trades_timestamp ON trades(timestamp DESC);
CREATE INDEX idx_trades_outcome ON trades(outcome);

-- Votes
CREATE INDEX idx_votes_market_id ON votes(market_id);
CREATE INDEX idx_votes_user ON votes("user");
CREATE INDEX idx_votes_vote_type ON votes(vote_type);
CREATE INDEX idx_votes_timestamp ON votes(voted_at DESC);

-- Discussions
CREATE INDEX idx_discussions_market_id ON discussions(market_id);
CREATE INDEX idx_discussions_user ON discussions("user");
CREATE INDEX idx_discussions_created_at ON discussions(created_at DESC);

-- Market Finalization Errors
CREATE INDEX idx_finalization_errors_market_id ON market_finalization_errors(market_id);
CREATE INDEX idx_finalization_errors_resolved ON market_finalization_errors(resolved);
CREATE INDEX idx_finalization_errors_created_at ON market_finalization_errors(created_at DESC);
```

### Features Used

| Feature | Status | Purpose |
|---------|--------|---------|
| PostgreSQL Database | ✅ Active | Core data storage |
| Row Level Security | ✅ Enabled | Access control |
| Realtime Subscriptions | ⏳ Planned | Live updates (Phase 4) |
| Storage | ❌ Not used | IPFS used instead |
| Auth | ❌ Not used | Wallet-based auth instead |
| Edge Functions | ❌ Not used | Node.js services instead |

### Backup Strategy

**Automatic Backups:**
- Supabase daily automatic backups (7-day retention on free tier)
- Point-in-time recovery available (paid feature)

**Manual Backups:**
```bash
# Export database
pg_dump "postgresql://postgres:Lr7JeGk1uhzBDqwI@db.tkkqqxepelibqjjhxxct.supabase.co:5432/postgres" > backup.sql

# Restore database
psql "postgresql://postgres:Lr7JeGk1uhzBDqwI@db.tkkqqxepelibqjjhxxct.supabase.co:5432/postgres" < backup.sql
```

### Monitoring

**Dashboard:** https://supabase.com/dashboard/project/tkkqqxepelibqjjhxxct

**Key Metrics:**
- Database size: ~10 MB (mostly indexes)
- Active connections: ~2-5
- Queries per second: <10
- Response time: <50ms average

### Limits (Free Tier)

| Resource | Limit | Current Usage |
|----------|-------|---------------|
| Database size | 500 MB | ~10 MB (2%) |
| Bandwidth | 2 GB | ~0.1 GB |
| Realtime connections | 200 | 0 |
| Storage | 1 GB | 0 (not using) |
| Auth users | 50,000 | 0 (not using) |

**Upgrade Path:** Pay-as-you-go ($25/month base + usage)

---

## 🔴 Redis (Caching & Pub/Sub)

**Status:** ⏳ Planned (Phase 2)
**Provider:** Local Redis instance
**Use Cases:** Vote caching, WebSocket pub/sub

### Installation

```bash
# macOS (Homebrew)
brew install redis

# Start Redis
brew services start redis

# Or run manually
redis-server
```

### Connection Details

**Local Instance:**
```
Host: localhost
Port: 6379
URL: redis://localhost:6379
Password: None (development)
```

**Production (Redis Cloud - Planned):**
```
URL: redis://:password@redis-12345.c1.us-east-1-2.ec2.cloud.redislabs.com:12345
```

### Planned Use Cases

#### 1. Vote Aggregation Cache

**Purpose:** Cache votes for fast aggregation

**Key Pattern:**
```
votes:proposal:{marketId}     # Set of user addresses who voted
votes:proposal:{marketId}:likes   # Count of likes
votes:proposal:{marketId}:dislikes # Count of dislikes

votes:dispute:{marketId}      # Set of user addresses who voted
votes:dispute:{marketId}:agrees   # Count of agrees
votes:dispute:{marketId}:disagrees # Count of disagrees
```

**TTL:** 7 days

**Operations:**
```redis
# Add proposal vote
SADD votes:proposal:market123 user_wallet_address
INCR votes:proposal:market123:likes

# Check if user voted
SISMEMBER votes:proposal:market123 user_wallet_address

# Get vote counts
GET votes:proposal:market123:likes
GET votes:proposal:market123:dislikes

# Get all voters
SMEMBERS votes:proposal:market123
```

#### 2. WebSocket Pub/Sub

**Purpose:** Broadcast real-time updates to connected clients

**Channel Pattern:**
```
market:{marketId}:updates     # All market updates
market:{marketId}:trades      # Trade notifications
market:{marketId}:votes       # Vote updates
market:global:updates         # Global updates
```

**Operations:**
```redis
# Publish market update
PUBLISH market:abc123:updates '{"type":"price_change","price":0.65}'

# Subscribe to market
SUBSCRIBE market:abc123:updates

# Subscribe to all markets
PSUBSCRIBE market:*:updates
```

#### 3. Rate Limiting

**Purpose:** Prevent spam and abuse

**Key Pattern:**
```
ratelimit:{ip}:{endpoint}     # Request count per IP
```

**Operations:**
```redis
# Check rate limit (100 req/15min)
INCR ratelimit:1.2.3.4:/api/trades
EXPIRE ratelimit:1.2.3.4:/api/trades 900  # 15 minutes

# Get current count
GET ratelimit:1.2.3.4:/api/trades
```

### Configuration

**File:** `/opt/homebrew/etc/redis.conf` (macOS Homebrew)

**Key Settings:**
```conf
# Memory
maxmemory 256mb
maxmemory-policy allkeys-lru

# Persistence (development: off, production: on)
save ""  # Disable RDB snapshots in development
appendonly no  # Disable AOF in development

# Network
bind 127.0.0.1
port 6379
protected-mode yes

# Logging
loglevel notice
logfile /opt/homebrew/var/log/redis.log
```

### Monitoring

```bash
# Check Redis status
redis-cli ping  # Should return "PONG"

# Monitor commands
redis-cli monitor

# Get info
redis-cli info

# Check memory usage
redis-cli info memory

# List all keys
redis-cli keys '*'
```

### Persistence Strategy

**Development:** In-memory only (no persistence)
**Production:** RDB snapshots + AOF log

```conf
# Production settings
save 900 1       # Save after 900 sec if 1 key changed
save 300 10      # Save after 300 sec if 10 keys changed
save 60 10000    # Save after 60 sec if 10000 keys changed

appendonly yes   # Enable AOF
appendfsync everysec  # Fsync every second
```

---

## 🌐 Solana RPC Endpoints

### Helius RPC + Webhooks ✅

**Provider:** Helius (https://www.helius.dev)
**Status:** ✅ Active
**Created:** November 7, 2025
**Account:** Devnet

**API Key:** `00a6d3a9-d9ac-464b-a5c2-af3257c9a43c`

**RPC Endpoint:**
```
https://devnet.helius-rpc.com/?api-key=00a6d3a9-d9ac-464b-a5c2-af3257c9a43c
```

#### Features

| Feature | Status | Purpose |
|---------|--------|---------|
| Enhanced RPC | ✅ Active | Faster than public RPC |
| Webhooks | ✅ Configured | Real-time event notifications |
| Rate Limits | 100,000 req/month | Free tier |
| WebSocket | ✅ Available | Real-time subscriptions |
| DAS API | ✅ Available | Digital Asset Standard API |

#### Webhook Configuration

**Webhook URL:** `http://your-server:4002/api/webhooks/helius`
**Webhook Secret:** `whsec_placeholder` (TODO: Generate secure secret)
**Program ID:** `7h3gXfBfYFueFVLYyfL5Qo1QGsf4GQUfW96FKVgnUsJS`

**Event Types:**
- Account updates (market state changes)
- Transaction notifications (all instructions)
- Token transfers (future)

**Management Commands:**
```bash
# Register webhook
pnpm run helius:register

# List webhooks
pnpm run helius:list

# Delete webhook
pnpm run helius:delete
```

#### Rate Limits (Free Tier)

| Metric | Limit | Current Usage |
|--------|-------|---------------|
| Requests/month | 100,000 | ~500 |
| Requests/second | 10 | <1 |
| Webhooks | 3 | 1 |
| Data retention | 7 days | N/A |

**Upgrade Path:**
- Developer ($99/month): 1M req/month, 50 RPS
- Professional ($499/month): 10M req/month, 100 RPS

### Solana Public RPC (Fallback)

**Provider:** Solana Foundation
**Status:** ✅ Available
**Cost:** Free

**Endpoints:**

**Devnet:**
```
https://api.devnet.solana.com
```

**Mainnet:**
```
https://api.mainnet-beta.solana.com
```

**Rate Limits:**
- 100 requests/second per IP
- No authentication required
- Unreliable (not recommended for production)

**Usage:** Fallback when Helius quota exceeded

---

## 📦 IPFS (Decentralized Storage)

**Provider:** Pinata Cloud
**Status:** ✅ Configured (not used in MVP)
**Account:** basedbrain@proton.me
**Created:** November 7, 2025

### API Credentials

**API Key:** `1e8962ac12ddd5cf578a`

**Secret Key:** `c60605b24b8c6f2e8220f981f46f0b4f1f6950db442a214a3b656a9165562a8a`

**JWT:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiIwYzNlNWY2Yi1iZDRiLTRlZTItODEwNC1kMzJmMmFiZGE4OGUiLCJlbWFpbCI6ImJhc2VkYnJhaW5AcHJvdG9uLm1lIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsInBpbl9wb2xpY3kiOnsicmVnaW9ucyI6W3siZGVzaXJlZFJlcGxpY2F0aW9uQ291bnQiOjEsImlkIjoiRlJBMSJ9LHsiZGVzaXJlZFJlcGxpY2F0aW9uQ291bnQiOjEsImlkIjoiTllDMSJ9XSwidmVyc2lvbiI6MX0sIm1mYV9lbmFibGVkIjpmYWxzZSwic3RhdHVzIjoiQUNUSVZFIn0sImF1dGhlbnRpY2F0aW9uVHlwZSI6InNjb3BlZEtleSIsInNjb3BlZEtleUtleSI6IjFlODk2MmFjMTJkZGQ1Y2Y1NzhhIiwic2NvcGVkS2V5U2VjcmV0IjoiYzYwNjA1YjI0YjhjNmYyZTgyMjBmOTgxZjQ2ZjBiNGYxZjY5NTBkYjQ0MmEyMTRhM2I2NTZhOTE2NTU2MmE4YSIsImV4cCI6MTc5NDA3NDE4N30.ElqXo7y6yn9xzu_G-mcvivP4XVIMIISZ7_qYQpQ9j-s
```

**Gateway URL:** `https://gateway.pinata.cloud/ipfs/`

### Planned Use Cases (Phase 4+)

1. **Market Question Storage**
   - Store detailed market questions with formatting
   - Return IPFS CID (46 bytes) to store on-chain
   - Example: `QmXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

2. **Resolution Evidence**
   - Store resolution evidence (images, PDFs, articles)
   - Immutable proof for dispute resolution

3. **Discussion Snapshots (Disabled in MVP)**
   - Daily snapshots of all discussions
   - Decentralized backup of Supabase data
   - Censorship-resistant archive

### API Usage Examples

**Upload to IPFS:**
```typescript
import pinataSDK from '@pinata/sdk';

const pinata = pinataSDK(API_KEY, SECRET_KEY);

// Upload JSON
const result = await pinata.pinJSONToIPFS({
  question: "Will BTC reach $100k by end of 2025?",
  description: "...",
  tags: ["crypto", "bitcoin"]
});

console.log(result.IpfsHash); // Qm...
```

**Retrieve from IPFS:**
```typescript
const url = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
const response = await fetch(url);
const data = await response.json();
```

### Limits (Free Tier)

| Resource | Limit | Current Usage |
|----------|-------|---------------|
| Storage | 1 GB | 0 MB |
| Bandwidth | 100 GB/month | 0 GB |
| Requests | 100,000/month | 0 |
| Pin count | 100 | 0 |

**Upgrade Path:**
- Picnic ($20/month): 100 GB storage, unlimited bandwidth
- Submarine ($100/month): 1 TB storage, dedicated gateways

### Status

**MVP Decision:** IPFS disabled for v1
- **Reason:** Supabase stores discussions reliably
- **Future:** Re-enable in Phase 4 if needed
- **Cost Impact:** $0 saved per month

---

## 🔐 Wallet Inventory

### Wallet Summary

| Wallet | Purpose | Location | Balance | Status |
|--------|---------|----------|---------|--------|
| **Default Wallet** | Development + deployer | `~/.config/solana/id.json` | ~2 SOL | ✅ Active |
| **Backend Authority** | Vote aggregation + auto-finalization | `~/.config/solana/backend-authority.json` | ~5 SOL | ✅ Active |
| **Devnet Deployer** | CI/CD deployments | `~/.config/solana/devnet-deployer.json` | ~3 SOL | ✅ Active |
| **Test Wallet** | On-chain testing | `~/.config/solana/zmart-test-wallet.json` | ~10 SOL | ✅ Active |
| **Program Keypairs** | Program deployment IDs | `target/deploy/*-keypair.json` | - | ✅ Deployed |

---

### 1. Default Wallet

**Location:** `~/.config/solana/id.json`
**Public Key:** (Check with `solana address`)
**Purpose:** General development and program deployment
**Permissions:** Full access (private key on local machine)

**Usage:**
```bash
# Check address
solana address

# Check balance
solana balance

# Airdrop devnet SOL
solana airdrop 2
```

**Security:**
- ✅ File permissions: 0600 (read/write owner only)
- ✅ Not committed to git
- ⚠️ Only use on devnet (never mainnet!)

---

### 2. Backend Authority Wallet ✅

**Location:** `~/.config/solana/backend-authority.json`
**Public Key:** `4WQwPjKHu3x7dHBEehBDgxXHJQoDuBvj6Xhu6C1jjTye`
**Balance:** ~5 SOL (devnet)
**Created:** November 6, 2025

**Purpose:**
- Vote aggregation (calling `aggregate_proposal_votes`, `aggregate_dispute_votes`)
- Auto-finalization (calling `finalize_market` after 48h)
- Backend service transaction signing

**Used By:**
- Vote Aggregator service
- Market Monitor service

**Environment Variable:**
```env
BACKEND_KEYPAIR_PATH=/Users/seman/.config/solana/backend-authority.json
```

**Alternative Format (Base58 Private Key):**
```env
BACKEND_AUTHORITY_PRIVATE_KEY=29uZKrL5MY7urczg5QBL6bgtqHQuT5paHB8Tqi3W5hPgy8Bq3en8nb22zs9NSEpxo1noYG6uasPft2iTCQT6DHuv
```

**Permissions:**
- On-chain: Registered as `backend_authority` in GlobalConfig
- Can aggregate votes
- Can finalize markets
- Cannot modify GlobalConfig
- Cannot cancel markets

**Security:**
- ✅ File permissions: 0600
- ✅ Not committed to git
- ✅ Separate from admin wallet (principle of least privilege)
- ⚠️ Production: Use AWS Secrets Manager or similar

---

### 3. Devnet Deployer Wallet

**Location:** `~/.config/solana/devnet-deployer.json`
**Created:** October 16, 2024
**Balance:** ~3 SOL (devnet)

**Purpose:**
- CI/CD automated deployments
- GitHub Actions program upgrades
- Test deployments

**GitHub Secret:** `DEVNET_DEPLOYER_KEYPAIR` (base64 encoded)

**Usage in CI/CD:**
```yaml
# .github/workflows/deploy.yml
- name: Deploy to devnet
  env:
    DEPLOYER_KEYPAIR: ${{ secrets.DEVNET_DEPLOYER_KEYPAIR }}
  run: |
    echo "$DEPLOYER_KEYPAIR" | base64 -d > deployer.json
    anchor deploy --provider.wallet deployer.json
```

**Security:**
- ✅ Only stored in GitHub Secrets
- ✅ Limited to devnet (not funded on mainnet)
- ✅ Read-only access to repository (cannot modify code)

---

### 4. Test Wallet

**Location:** `~/.config/solana/zmart-test-wallet.json`
**Created:** November 8, 2025
**Balance:** ~10 SOL (devnet)

**Purpose:**
- On-chain integration testing
- E2E test suite
- Manual testing and debugging

**Used By:**
- `pnpm test:e2e:real` (on-chain tests)
- Manual testing scripts

**Setup:**
```bash
# Create test wallet
solana-keygen new --outfile ~/.config/solana/zmart-test-wallet.json

# Fund with devnet SOL
solana airdrop 10 ~/.config/solana/zmart-test-wallet.json
```

**Security:**
- ✅ Only funded on devnet
- ✅ No real funds ever
- ✅ Can be regenerated anytime

---

### 5. Program Keypairs

**Location:** `target/deploy/`

**Zmart Core Program:**
```
File: target/deploy/zmart_core-keypair.json
Program ID: 7h3gXfBfYFueFVLYyfL5Qo1QGsf4GQUfW96FKVgnUsJS
Status: ✅ Deployed on devnet
```

**Zmart Proposal Program:**
```
File: target/deploy/zmart_proposal-keypair.json
Program ID: 3XDU9r97qqJRdgqKJEWDYSJesPAUbLqsejXus4WLuhAQ
Status: ⏳ Planned (Phase 1)
```

**Purpose:**
- Deterministic program addresses
- Program upgrade authority
- Deployment identity

**Security:**
- ✅ Committed to git (needed for builds)
- ✅ Public program IDs (on-chain addresses)
- ⚠️ Upgrade authority should be multi-sig for mainnet

**Upgrade Authority:**
```bash
# Check current upgrade authority
solana program show 7h3gXfBfYFueFVLYyfL5Qo1QGsf4GQUfW96FKVgnUsJS

# Transfer authority to multi-sig (production)
solana program set-upgrade-authority \
  7h3gXfBfYFueFVLYyfL5Qo1QGsf4GQUfW96FKVgnUsJS \
  --new-upgrade-authority <multisig-address>
```

---

## 🔒 Secrets Management

### Current Setup (Development)

**Storage:** `.env` files (not committed to git)
**Location:** `backend/.env`, `backend/event-indexer/.env`

**Security Measures:**
- ✅ `.gitignore` includes all `.env` files
- ✅ `.env.example` provided as template (no secrets)
- ✅ File permissions: 0600
- ✅ Separate credentials per service
- ✅ Wallet keypairs outside project directory (`~/.config/solana/`)

### Production Setup (Planned)

**Provider:** AWS Secrets Manager or HashiCorp Vault

**Secrets to Store:**
- Supabase Service Role Key
- Backend Authority Private Key
- Helius API Key
- Pinata JWT
- Database Password
- Redis Password (if using Redis Cloud)

**Access Pattern:**
```typescript
// Fetch secrets at runtime (not hardcoded)
import { SecretsManager } from 'aws-sdk';

const secretsManager = new SecretsManager({ region: 'us-east-1' });
const secret = await secretsManager.getSecretValue({ SecretId: 'prod/zmart/backend-authority' }).promise();
const privateKey = JSON.parse(secret.SecretString).private_key;
```

**Rotation Policy:**
- Backend Authority: Rotate every 90 days
- API Keys: Rotate every 180 days
- Database Password: Rotate every 90 days

---

## 📊 Resource Limits & Quotas

### Supabase Limits (Free Tier)

| Resource | Limit | Usage | Alert Threshold |
|----------|-------|-------|-----------------|
| Database size | 500 MB | 10 MB | >400 MB (80%) |
| Bandwidth | 2 GB/month | ~100 MB | >1.6 GB (80%) |
| Storage | 1 GB | 0 MB | N/A |
| Realtime connections | 200 | 0 | >160 (80%) |

**Monitoring:** Supabase dashboard provides usage charts

---

### Helius Limits (Free Tier)

| Resource | Limit | Usage | Alert Threshold |
|----------|-------|-------|-----------------|
| Requests/month | 100,000 | ~500 | >80,000 (80%) |
| Requests/second | 10 | <1 | >8 (80%) |
| Webhooks | 3 | 1 | N/A |

**Monitoring:** Helius dashboard tracks usage

---

### Pinata Limits (Free Tier)

| Resource | Limit | Usage | Alert Threshold |
|----------|-------|-------|-----------------|
| Storage | 1 GB | 0 MB | >800 MB (80%) |
| Bandwidth | 100 GB/month | 0 GB | >80 GB (80%) |
| Requests | 100,000/month | 0 | >80,000 (80%) |

**Monitoring:** Pinata dashboard tracks usage

---

### Redis Limits (Local)

| Resource | Limit | Usage | Alert Threshold |
|----------|-------|-------|-----------------|
| Memory | 256 MB (configured) | 0 MB | >200 MB (80%) |
| Connections | 10,000 (default) | 0 | >8,000 (80%) |

**Monitoring:** `redis-cli info memory`

---

## 🛡️ Security Best Practices

### Access Control

**Principle of Least Privilege:**
- ✅ Backend Authority: Can only aggregate votes and finalize markets
- ✅ API Gateway: Read-only Supabase access (anon key)
- ✅ Event Indexer: Write-only Supabase access (service role key)
- ✅ Database: RLS policies enforce row-level permissions

**Separation of Concerns:**
- ✅ Different wallets for different purposes
- ✅ Service-specific API keys
- ✅ Isolated database credentials per service

### Network Security

**HTTPS Only:**
- ✅ All external services use HTTPS
- ✅ Supabase API: HTTPS
- ✅ Helius RPC: HTTPS
- ✅ Pinata Gateway: HTTPS

**Firewall Rules (Production):**
- Allow: Port 4000 (API Gateway) from internet
- Allow: Port 4002 (Event Indexer) from Helius webhooks
- Block: Direct database access from internet
- Block: Redis from internet (local/VPN only)

### Credential Security

**Never Commit:**
- ❌ Private keys
- ❌ API secrets
- ❌ Database passwords
- ❌ Service role keys

**Use .gitignore:**
```gitignore
.env
.env.local
.env.*.local
*.json  # Wallet keypairs
backend/.env
backend/event-indexer/.env
```

**File Permissions:**
```bash
chmod 600 ~/.config/solana/*.json  # Wallet keypairs
chmod 600 backend/.env             # Environment variables
```

### Monitoring & Alerts

**Critical Alerts:**
- Database size >80% of limit
- Helius quota >80% used
- Failed finalization attempts >10/hour
- Unauthorized database access attempts

**Monitoring Channels:**
- Slack webhook (planned)
- Email alerts (Supabase)
- CloudWatch (production)

---

## 🔧 Operations & Maintenance

### Daily Tasks

```bash
# Check service health
pm2 status
curl http://localhost:4000/health
curl http://localhost:4002/health

# Check wallet balances
solana balance ~/.config/solana/backend-authority.json

# Check Redis
redis-cli ping
```

### Weekly Tasks

```bash
# Review Supabase usage
# Visit: https://supabase.com/dashboard/project/tkkqqxepelibqjjhxxct/settings/billing

# Review Helius usage
# Visit: https://www.helius.dev/dashboard

# Check database backups
# Automatic backups via Supabase

# Review error logs
pm2 logs --lines 100 --err
```

### Monthly Tasks

```bash
# Rotate secrets (if needed)
# Update .env files with new credentials

# Review access logs
# Check for unauthorized access attempts

# Audit permissions
# Verify RLS policies still correct

# Performance review
# Check query performance, index usage
```

---

## 📚 Related Documentation

### Infrastructure Setup

- [ENVIRONMENT_GUIDE.md](../../ENVIRONMENT_GUIDE.md) ✅ - Environment variable reference
- [CREDENTIALS_MAP.md](../../CREDENTIALS_MAP.md) ✅ - Credential usage matrix

### Integration

- [INTEGRATION_MAP.md](../architecture/INTEGRATION_MAP.md) ⏳ - How infrastructure connects
- [DATA_FLOW.md](../architecture/DATA_FLOW.md) ⏳ - Data flow between services

### Operations

- [TROUBLESHOOTING_REFERENCE.md](../troubleshooting/TROUBLESHOOTING_REFERENCE.md) ⏳ - Infrastructure issues
- [BACKEND_REFERENCE.md](./BACKEND_REFERENCE.md) ✅ - Backend services

---

## 🎯 Quick Reference

### Connection Strings

**Supabase:**
```
https://tkkqqxepelibqjjhxxct.supabase.co
postgresql://postgres:Lr7JeGk1uhzBDqwI@db.tkkqqxepelibqjjhxxct.supabase.co:5432/postgres
```

**Redis:**
```
redis://localhost:6379
```

**Helius RPC:**
```
https://devnet.helius-rpc.com/?api-key=00a6d3a9-d9ac-464b-a5c2-af3257c9a43c
```

**Solana Public RPC:**
```
https://api.devnet.solana.com
```

### Wallet Addresses

```
Default: (check with: solana address)
Backend Authority: 4WQwPjKHu3x7dHBEehBDgxXHJQoDuBvj6Xhu6C1jjTye
Program (Core): 7h3gXfBfYFueFVLYyfL5Qo1QGsf4GQUfW96FKVgnUsJS
Program (Proposal): 3XDU9r97qqJRdgqKJEWDYSJesPAUbLqsejXus4WLuhAQ
```

### Service Status

```bash
# Supabase
curl https://tkkqqxepelibqjjhxxct.supabase.co/rest/v1/

# Redis
redis-cli ping

# Helius RPC
curl -X POST https://devnet.helius-rpc.com/?api-key=00a6d3a9-d9ac-464b-a5c2-af3257c9a43c \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}'
```

### Common Commands

```bash
# Check wallet balance
solana balance ~/.config/solana/backend-authority.json

# Airdrop devnet SOL
solana airdrop 5 ~/.config/solana/backend-authority.json

# Check Redis memory
redis-cli info memory

# Backup database
pg_dump "postgresql://postgres:Lr7JeGk1uhzBDqwI@db.tkkqqxepelibqjjhxxct.supabase.co:5432/postgres" > backup.sql
```

---

## 📊 Infrastructure Status Summary

| Component | Provider | Status | Cost | Health |
|-----------|----------|--------|------|--------|
| Supabase | supabase.com | ✅ Active | $0 | Healthy |
| Helius RPC | helius.dev | ✅ Active | $0 | Healthy |
| Redis | Local | ⏳ Planned | $0 | N/A |
| Pinata | pinata.cloud | ✅ Configured | $0 | Not used |
| Wallets | Local | ✅ Active | 0 SOL | Funded |

**Total Infrastructure:** $0/month (all free tiers)
**Production Estimate:** ~$50/month (Supabase Pro + Helius Developer)

---

**Last Updated:** 2025-11-09 00:15 PST
**Next Review:** 2025-11-16
**Maintained By:** Development Team

---
