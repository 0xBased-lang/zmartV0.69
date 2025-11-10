# RESOURCE_INVENTORY.md - Complete Resource Inventory

**Category:** Resource Reference
**Tags:** [resources, inventory, wallets, infrastructure, quotas]
**Last Updated:** 2025-11-09 02:15 PST

---

## 🎯 Purpose

**Complete inventory of all project resources** - wallets, infrastructure, quotas, and dependencies.

---

## 💰 Wallet Inventory

### Production Wallets (7 total)

**1. Deployer Authority**
- **Path:** `~/.config/solana/id.json`
- **Address:** `{DEPLOYER_PUBKEY}`
- **Purpose:** Deploy/upgrade programs
- **Balance:** Check with `solana balance`
- **Security:** Private key, never commit

**2. Backend Authority**
- **Path:** `~/.config/solana/backend-authority.json`
- **Address:** `{BACKEND_AUTHORITY_PUBKEY}`
- **Purpose:** Sign backend transactions (vote aggregation, state transitions)
- **Balance:** Requires 1+ SOL for operations
- **Security:** Service account, rotate regularly

**3. Test Wallet**
- **Path:** `backend/test-wallet-keypair.json`
- **Address:** `{TEST_WALLET_PUBKEY}`
- **Purpose:** E2E testing, on-chain testing
- **Balance:** 2+ SOL recommended
- **Security:** Test only, funded via airdrop

**4-7. Program Keypairs**
- **zmart-core:** `target/deploy/zmart_core-keypair.json`
- **zmart-proposal:** `target/deploy/zmart_proposal-keypair.json` (planned)
- **Purpose:** Program deployment accounts
- **Note:** Generated during `anchor build`

---

## 🏗️ Infrastructure Resources

### Supabase (Database + Auth)

**Tier:** Free (500MB database, 1GB bandwidth/month)
**URL:** `{SUPABASE_URL}`
**Status:** Active
**Usage:** ~100MB / 500MB (20%)

**Resources:**
- PostgreSQL Database (500MB)
- Realtime Subscriptions (2 concurrent)
- Auth (50,000 MAUs)
- Storage (1GB)
- Edge Functions (500K invocations/month)

**Upgrade Path:** Pro tier $25/month when needed

---

### Helius (RPC + Webhooks)

**Tier:** Free (100K requests/day, webhooks included)
**API Key:** `{HELIUS_API_KEY}`
**Status:** Active
**Usage:** ~5K requests/day (5%)

**Resources:**
- RPC Endpoint: `https://devnet.helius-rpc.com/?api-key={KEY}`
- Webhooks: Unlimited events (free tier)
- Enhanced API: Transaction history, NFT data

**Upgrade Path:** Pro tier $50/month (1M requests/day)

---

### IPFS/Pinata (Content Storage)

**Tier:** Free (1GB storage, 100GB bandwidth/month)
**Status:** Configured but disabled for MVP
**API Key:** `{PINATA_API_KEY}`

**Resources:**
- IPFS Storage: 1GB
- Bandwidth: 100GB/month
- Pin Manager: 1,000 pins

**Note:** Re-enable in Phase 4+ for decentralized discussion snapshots

---

### Solana Devnet

**Network:** Devnet
**RPC:** Via Helius (see above)
**Faucet:** 2 SOL per airdrop, rate-limited

**Programs Deployed:**
- zmart-core: `7h3gXfBfYFueFVLYyfL5Qo1QGsf4GQUfW96FKVgnUsJS`
- zmart-proposal: (planned Phase 2)

**Upgrade Authority:** Deployer wallet

---

### PM2 (Process Management)

**Version:** Latest
**Status:** Active
**Services:** 5 running

**Resources:**
- Max Memory: 500MB per service
- Logs: Rotated daily
- Auto-restart: Enabled

---

## 📊 Resource Quotas & Limits

### Supabase Free Tier

| Resource | Quota | Current | % Used |
|----------|-------|---------|--------|
| Database Size | 500MB | ~100MB | 20% |
| Bandwidth | 1GB/month | ~200MB | 20% |
| Realtime | 2 concurrent | 1 (WebSocket) | 50% |
| Auth MAUs | 50,000 | ~10 | 0.02% |

**Alerts:** Email at 80% usage

---

### Helius Free Tier

| Resource | Quota | Current | % Used |
|----------|-------|---------|--------|
| RPC Requests | 100K/day | ~5K/day | 5% |
| Webhooks | Unlimited | Active | - |
| Rate Limit | 10 req/sec | Low | <10% |

**Alerts:** Dashboard shows usage

---

### Solana Devnet

| Resource | Limit | Notes |
|----------|-------|-------|
| Airdrop | 2 SOL/request | Rate-limited |
| Transaction size | 1232 bytes | Includes accounts + data |
| Compute units | 200K per tx | Increased via priority fee |
| Account size | 10MB | Rent-exempt minimum |

---

## 🔐 API Keys & Secrets

### Environment Variables (.env)

**Critical Secrets:**
```bash
# Database
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhb...  # Service role (backend only)
SUPABASE_ANON_KEY=eyJhb...           # Anon key (frontend)

# RPC
HELIUS_API_KEY=00a6d3a9-d9ac-464b-a5c2-af3257c9a43c
HELIUS_WEBHOOK_SECRET=webhook_secret_here

# IPFS (disabled MVP)
PINATA_API_KEY=xxx
PINATA_SECRET_KEY=xxx

# Blockchain
PROGRAM_ID=7h3gXfBfYFueFVLYyfL5Qo1QGsf4GQUfW96FKVgnUsJS
ANCHOR_WALLET=/Users/seman/.config/solana/id.json
ANCHOR_PROVIDER_URL=https://devnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}

# Server
API_PORT=4000
WS_PORT=4001
EVENT_INDEXER_PORT=4002
```

**Security:** Never commit to git, rotate regularly

---

## 🌍 External Service Dependencies

### Required for Operation

1. **Solana Devnet**
   - Uptime: 99.9%
   - Impact if down: Cannot submit transactions
   - Fallback: None (wait for recovery)

2. **Helius RPC**
   - Uptime: 99.9%
   - Impact if down: Cannot query blockchain or receive webhooks
   - Fallback: Public Solana RPC (slower)

3. **Supabase**
   - Uptime: 99.9%
   - Impact if down: Cannot read/write database, auth fails
   - Fallback: None (critical dependency)

---

### Optional for Operation

4. **IPFS/Pinata**
   - Status: Disabled for MVP
   - Impact if down: No impact (not used)
   - Fallback: N/A

5. **Redis**
   - Status: Planned Phase 3
   - Impact if down: Slower queries (no cache)
   - Fallback: Direct database queries

---

## 💻 Development Resources

### Node.js Dependencies

**Package Count:** ~150 packages
**Total Size:** ~200MB (node_modules)
**Key Dependencies:**
- @coral-xyz/anchor: ^0.30.1
- @solana/web3.js: ^1.95.8
- express: ^4.21.1
- @supabase/supabase-js: ^2.47.10
- socket.io: ^4.8.1

---

### Rust/Anchor Dependencies

**Package Count:** ~80 crates
**Total Size:** ~500MB (target/)
**Key Dependencies:**
- anchor-lang: 0.30.1
- solana-program: 1.18

---

## 📈 Resource Usage Trends

### Historical Usage (Last 30 Days)

**Supabase:**
- Database: 80MB → 100MB (+25%)
- Bandwidth: 150MB → 200MB (+33%)
- Trend: Linear growth

**Helius:**
- RPC Requests: 3K/day → 5K/day (+67%)
- Trend: Growing as more tests run

**Wallets:**
- Deployer: 5 SOL → 4.5 SOL (-10%, normal burn)
- Backend: 2 SOL → 1.8 SOL (-10%, vote aggregation)
- Test: 2 SOL → 0.5 SOL (-75%, frequent testing)

---

## 🚨 Resource Alerts

### Current Alerts

✅ All resources within safe limits

### Alert Thresholds

**Supabase:**
- 🟡 Warning: >400MB database (80%)
- 🔴 Critical: >480MB database (96%)

**Helius:**
- 🟡 Warning: >80K requests/day (80%)
- 🔴 Critical: >95K requests/day (95%)

**Wallets:**
- 🟡 Warning: <0.5 SOL balance
- 🔴 Critical: <0.1 SOL balance

**PM2 Services:**
- 🟡 Warning: >400MB memory (80%)
- 🔴 Critical: Service crash loop

---

## 🔄 Resource Rotation Schedule

### API Keys

| Resource | Rotation Frequency | Last Rotated | Next Due |
|----------|-------------------|--------------|----------|
| Supabase Service Role | Every 90 days | Nov 1, 2025 | Feb 1, 2026 |
| Helius API Key | Every 180 days | Oct 15, 2025 | Apr 15, 2026 |
| Pinata API Key | Every 180 days | Oct 1, 2025 | Apr 1, 2026 |

---

### Wallets

| Wallet | Rotation Frequency | Purpose |
|--------|-------------------|---------|
| Deployer | Never (until mainnet) | Program deployment |
| Backend Authority | Every 90 days | Service account |
| Test Wallet | As needed | Testing only |

---

## 💰 Cost Analysis

### Current Monthly Cost

**Total: $0/month** (all free tiers)

| Service | Tier | Cost | Status |
|---------|------|------|--------|
| Supabase | Free | $0 | Active |
| Helius | Free | $0 | Active |
| Pinata | Free | $0 | Disabled |
| Solana Devnet | Free | $0 | Active |
| PM2 | Open Source | $0 | Active |
| VPS | - | - | Using local dev |

---

### Future Cost Estimate (Production)

**Estimated: $85-$125/month**

| Service | Tier | Cost | When Needed |
|---------|------|------|-------------|
| Supabase | Pro | $25/mo | Phase 4 (>500MB or >10K MAUs) |
| Helius | Pro | $50/mo | Phase 5 (>100K req/day) |
| VPS | 2GB RAM | $10-50/mo | Phase 5 (production deployment) |
| Domain | .io | $35/year | Phase 5 (mainnet launch) |

---

## 🔗 Related Documentation

- [INFRASTRUCTURE_REFERENCE.md](../components/INFRASTRUCTURE_REFERENCE.md) - Infrastructure setup details
- [ENVIRONMENT_GUIDE.md](../../../docs/ENVIRONMENT_GUIDE.md) - Environment variables
- [CREDENTIALS_MAP.md](../../../docs/CREDENTIALS_MAP.md) - Credential usage matrix

---

**Last Updated:** 2025-11-09 02:15 PST
**Next Review:** 2025-12-01
**Maintained By:** DevOps Team

---
