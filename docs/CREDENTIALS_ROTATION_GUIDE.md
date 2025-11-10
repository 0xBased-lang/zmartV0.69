# Credentials Rotation Guide

**Date:** November 9, 2025
**Reason:** Critical security fix - `.env` file was tracked in git
**Status:** ⏳ IN PROGRESS

---

## Overview

Since `backend/.env` was in git history with live credentials, we MUST assume all credentials are compromised and rotate them immediately.

**Total Time:** ~60 minutes
**Services Affected:** All 5 backend services
**Downtime:** ~5 minutes during restart

---

## Rotation Checklist

### 1. Supabase Service Role Key (15 minutes)

**Risk:** CRITICAL - Full database access

**Steps:**
1. Go to https://supabase.com/dashboard/project/tkkqqxepelibqjjhxxct/settings/api
2. Click "Regenerate service role key"
3. Copy new key
4. Update `backend/.env`:
   ```bash
   SUPABASE_SERVICE_ROLE_KEY=<new-key-here>
   ```
5. **DO NOT restart services yet** (do all rotations first)
6. After all services restarted, revoke old key (if Supabase allows)

**Current Value (OLD - REVOKE AFTER):**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRra3FxeGVwZWxpYnFqamh4eGN0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjQ1NjU4NCwiZXhwIjoyMDc4MDMyNTg0fQ.hnMSKgtbO6XkH8GWXbwOn0TlHLY8PT6usjWBrr9NyDI
```

---

### 2. Pinata API Keys (10 minutes)

**Risk:** MEDIUM - IPFS upload/delete access

**Steps:**
1. Go to https://app.pinata.cloud/developers/api-keys
2. Click "New Key"
3. Name: "ZMART Backend - Nov 2025"
4. Permissions: "Pin to IPFS" only
5. Generate and copy API Key + Secret
6. Update `backend/.env`:
   ```bash
   PINATA_API_KEY=<new-key>
   PINATA_SECRET_KEY=<new-secret>
   PINATA_JWT=<new-jwt>
   ```
7. After services restarted, revoke old key (delete old API key)

**Current Values (OLD - REVOKE AFTER):**
```
API_KEY: 1e8962ac12ddd5cf578a
SECRET: c60605b24b8c6f2e8220f981f46f0b4f1f6950db442a214a3b656a9165562a8a
```

---

### 3. Helius API Key (10 minutes)

**Risk:** LOW - RPC/webhook access only

**Steps:**
1. Go to https://dashboard.helius.dev/
2. Create new API key
3. Name: "ZMART Backend - Nov 2025"
4. Network: Devnet
5. Update `backend/.env`:
   ```bash
   HELIUS_RPC_URL=https://devnet.helius-rpc.com/?api-key=<new-key>
   ```
6. Update webhook URL with new key (if using webhooks)
7. After services restarted, delete old API key

**Current Value (OLD - REVOKE AFTER):**
```
00a6d3a9-d9ac-464b-a5c2-af3257c9a43c
```

---

### 4. Backend Authority Keypair (20 minutes) ⚠️ MOST COMPLEX

**Risk:** CRITICAL - Can execute admin transactions on-chain

**Steps:**

**4a. Generate New Keypair (5 min)**
```bash
# Generate new keypair
solana-keygen new -o ~/.config/solana/backend-authority-new.json

# Get public key
solana-keygen pubkey ~/.config/solana/backend-authority-new.json
# Save this pubkey: <NEW_PUBKEY>

# Fund with devnet SOL
solana airdrop 5 <NEW_PUBKEY> --url devnet

# Get base58 private key (for .env)
cat ~/.config/solana/backend-authority-new.json | jq -r '.[] | tostring' | tr -d '[],' | tr -d ' '
# Or use: solana-keygen pubkey ~/.config/solana/backend-authority-new.json --outfile /dev/stdout
```

**4b. Update On-Chain Program Admin (10 min)** ⚠️ CRITICAL STEP

```bash
# IMPORTANT: This must be done BEFORE updating .env
# Otherwise vote aggregation will fail!

cd /Users/seman/Desktop/zmartV0.69/programs/zmart-core

# Update program admin to new pubkey
# (You'll need to use the current backend authority to sign this)
anchor run update-admin --provider.cluster devnet \
  --program-id 7h3gXfBfYFueFVLYyfL5Qo1QGsf4GQUfW96FKVgnUsJS \
  --new-admin <NEW_PUBKEY>

# Verify update
solana program show 7h3gXfBfYFueFVLYyfL5Qo1QGsf4GQUfW96FKVgnUsJS --url devnet
```

**4c. Update .env (2 min)**
```bash
# Update backend/.env with new keypair
BACKEND_KEYPAIR_PATH=/Users/seman/.config/solana/backend-authority-new.json
BACKEND_AUTHORITY_PRIVATE_KEY=<base58-encoded-private-key>
```

**4d. Cleanup Old Keypair (3 min)**
```bash
# After services restarted and verified working:
# Backup old keypair (just in case)
cp ~/.config/solana/backend-authority.json ~/.config/solana/backend-authority-OLD-DO-NOT-USE.json

# Rename new keypair
mv ~/.config/solana/backend-authority-new.json ~/.config/solana/backend-authority.json

# Securely delete old keypair
shred -vfz -n 10 ~/.config/solana/backend-authority-OLD-DO-NOT-USE.json
```

**Current Public Key (OLD):**
```
4WQwPjKHu3x7dHBEehBDgxXHJQoDuBvj6Xhu6C1jjTye
```

---

### 5. Database URL (Included in Supabase)

**Risk:** CRITICAL - Full database access

**Note:** The DATABASE_URL password is tied to the Supabase service role key. When you regenerate the service role key, the database connection is also updated. No separate action needed.

---

## Service Restart Procedure (10 minutes)

After ALL credentials rotated above:

### Step 1: Stop All Services
```bash
pm2 stop all
```

### Step 2: Verify .env Updated
```bash
cd /Users/seman/Desktop/zmartV0.69/backend
cat .env | grep -E "SUPABASE_SERVICE_ROLE_KEY|PINATA_API_KEY|HELIUS_RPC_URL|BACKEND_AUTHORITY_PRIVATE_KEY"
# Verify all values are NEW (not matching old values above)
```

### Step 3: Restart Services in Dependency Order
```bash
# 1. IPFS Service (no dependencies)
pm2 restart ipfs-service

# 2. Event Indexer (depends on Supabase + Helius)
pm2 restart event-indexer

# 3. Market Monitor (depends on Anchor client)
pm2 restart market-monitor

# 4. Vote Aggregator (depends on Anchor + Supabase)
pm2 restart vote-aggregator

# 5. API Gateway (depends on Supabase)
pm2 restart api-gateway

# Wait 10 seconds for all services to start
sleep 10

# Verify all services online
pm2 list
```

### Step 4: Check Logs for Errors
```bash
# Check for auth errors
pm2 logs --lines 50 | grep -i "error\|unauthorized\|forbidden"

# Check specific services
pm2 logs api-gateway --lines 20
pm2 logs vote-aggregator --lines 20
pm2 logs event-indexer --lines 20
```

### Step 5: Test API Endpoints
```bash
# Health check
curl http://localhost:3000/health

# Markets endpoint
curl http://localhost:3000/api/markets

# Vote aggregator stats
curl http://localhost:3001/api/stats
```

---

## Validation Checklist

After rotation and restart:

- [ ] All 5 services showing "online" in `pm2 list`
- [ ] No "auth" errors in logs (pm2 logs --lines 50)
- [ ] API health check returns 200 (curl http://localhost:3000/health)
- [ ] Markets endpoint works (curl http://localhost:3000/api/markets)
- [ ] Integration tests pass (cd backend && npm run test:integration)
- [ ] Vote aggregation works (check pm2 logs vote-aggregator)
- [ ] IPFS upload works (check pm2 logs ipfs-service)
- [ ] Event indexer receiving events (check pm2 logs event-indexer)

---

## Rollback Plan

If something goes wrong:

### Quick Rollback
```bash
# Stop all services
pm2 stop all

# Restore old .env
cp backend/.env.backup backend/.env

# Restart all services
pm2 restart all

# Verify
pm2 list
pm2 logs --lines 50
```

### Investigate and Retry
```bash
# Check what failed
pm2 logs --lines 100

# Fix the specific issue
# (e.g., typo in new credential, missing on-chain admin update, etc.)

# Retry rotation
# (Re-run failed step above)
```

---

## Post-Rotation Actions

### Revoke Old Credentials (15 minutes)

**After confirming everything works:**

1. **Supabase:**
   - Old service role key cannot be revoked (single key per project)
   - New key replaces old automatically

2. **Pinata:**
   - Go to https://app.pinata.cloud/developers/api-keys
   - Find old key: "ZMART Backend - [OLD DATE]"
   - Click "Revoke" → Confirm

3. **Helius:**
   - Go to https://dashboard.helius.dev/
   - Find old API key
   - Click "Delete" → Confirm

4. **Backend Authority:**
   - Already securely deleted with `shred` command above
   - Verify: `ls ~/.config/solana/backend-authority-OLD*`
   - Should return: "No such file or directory"

---

## Security Best Practices Going Forward

1. **Never commit .env**
   - Already in .gitignore
   - Pre-commit hook will prevent (see Step 9 of main plan)

2. **Rotate credentials quarterly**
   - Set calendar reminder for February 9, 2026
   - Use this same rotation guide

3. **Use secrets manager in production**
   - AWS Secrets Manager
   - HashiCorp Vault
   - Doppler

4. **Monitor credential usage**
   - Check Supabase logs for suspicious queries
   - Check Pinata usage for unexpected uploads
   - Check Helius webhook deliveries

---

## Troubleshooting

### Issue: Services won't start after rotation

**Check:**
```bash
pm2 logs --lines 100 | grep -i error
```

**Common Causes:**
- Typo in new credential (.env syntax error)
- Forgot to update on-chain program admin
- New backend authority not funded with SOL
- New Pinata key missing "pinning" permission

**Fix:**
- Verify .env syntax (no extra spaces, quotes, etc.)
- Check program admin: `solana program show <PROGRAM_ID> --url devnet`
- Fund backend authority: `solana airdrop 5 <PUBKEY> --url devnet`
- Recreate Pinata key with correct permissions

---

### Issue: Vote aggregation fails with "Unauthorized"

**Cause:** On-chain program admin not updated to new backend authority

**Fix:**
```bash
cd programs/zmart-core
anchor run update-admin --provider.cluster devnet \
  --program-id 7h3gXfBfYFueFVLYyfL5Qo1QGsf4GQUfW96FKVgnUsJS \
  --new-admin <NEW_BACKEND_AUTHORITY_PUBKEY>
```

---

### Issue: Database queries fail with "Invalid JWT"

**Cause:** Supabase service role key not updated correctly

**Fix:**
1. Regenerate service role key in Supabase dashboard
2. Copy EXACT value (no extra spaces/newlines)
3. Update .env: `SUPABASE_SERVICE_ROLE_KEY=<new-key>`
4. Restart services: `pm2 restart all`

---

## Completion Checklist

Security fix complete when:

- [x] `.env` removed from git (committed)
- [x] `.env.backup` created for rollback
- [x] `.env.example` updated with safe placeholders (committed)
- [ ] All 5 credentials rotated (Supabase, Pinata, Helius, Backend Authority, Database)
- [ ] On-chain program admin updated to new backend authority
- [ ] All 5 services restarted and healthy
- [ ] Integration tests passing
- [ ] Old credentials revoked in dashboards
- [ ] New credentials documented in secure location
- [ ] Pre-commit hook installed

---

**Status:** Ready for credential rotation - Follow steps 1-5 above

**Next Steps:**
1. Complete credential rotation (60 min)
2. Restart services and validate (10 min)
3. Run integration tests (5 min)
4. Revoke old credentials (15 min)
5. Install pre-commit hook (5 min)

**Total Time Remaining:** ~95 minutes to complete security fix
