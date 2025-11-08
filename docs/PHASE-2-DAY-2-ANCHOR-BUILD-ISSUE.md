# Phase 2 Day 2: Anchor Build Issue

**Date:** November 7, 2025
**Status:** ⚠️ BLOCKER IDENTIFIED
**Priority:** HIGH - Blocks Vote Aggregator service

---

## Issue Summary

**Problem:** `anchor build` fails at IDL generation step due to stack overflow errors in `spl-token-2022` dependency.

**Impact:**
- Cannot generate IDL for Vote Aggregator service
- Backend services running without vote aggregation (expected until resolved)
- Does NOT block database setup or other Day 2 tasks

---

## Error Details

### Build Command

```bash
anchor build
```

### Error Output

```
Error: Function _ZN14spl_token_20229extension21confidential_transfer12verify_proof30verify_transfer_with_fee_proof17h503791981d978969E Stack offset of 4264 exceeded max offset of 4096 by 168 bytes
Error: IDL doesn't exist
```

### Root Cause

The `spl-token-2022` crate has stack overflow issues during Solana BPF compilation. The Rust code compiles successfully, but IDL generation fails.

---

## Attempted Solutions

### 1. Anchor Build ❌
```bash
anchor build
```
**Result:** Failed at IDL generation step

### 2. Fetch IDL from Devnet ❌
```bash
anchor idl fetch 7h3gXfBfYFueFVLYyfL5Qo1QGsf4GQUfW96FKVgnUsJS --provider.cluster devnet
```
**Result:** Timeout / Account not found

---

## Workarounds

### Short-term (Day 2-3)

**Option A: Proceed without Vote Aggregator**
- ✅ Complete database schema deployment
- ✅ Test other services (API, WebSocket)
- ⏸️ Skip vote aggregation testing until IDL resolved

**Option B: Create Minimal IDL Manually**
- Extract instruction signatures from `lib.rs`
- Create minimal IDL JSON for Vote Aggregator service
- Test with mock data

**Option C: Use cargo build-sbf**
- Build program with `cargo build-sbf` directly
- Deploy .so file to devnet
- Extract IDL using alternative tools

### Long-term Solutions

**1. Update spl-token-2022 Version**
```toml
[dependencies]
spl-token-2022 = "4.0.0"  # Check for newer version
```

**2. Remove spl-token-2022 Dependency**
- If not actively using Token-2022 features
- Replace with standard spl-token

**3. Downgrade Anchor CLI**
```bash
# Match version in Cargo.toml
avm install 0.29.0
avm use 0.29.0
```

**4. Use Anchor 0.30+ with BPF Stack Fixes**
```bash
avm install 0.30.1
avm use 0.30.1
anchor build
```

---

## Recommended Immediate Action

**Proceed with Option A: Database Setup First**

**Rationale:**
1. Database schema is independent of Anchor program
2. Can test API endpoints and WebSocket with mock data
3. Buys time to resolve Anchor build issue properly
4. Vote aggregation can be tested once IDL is available

**Next Steps:**
1. ✅ Complete Task 5-8: Database Schema Deployment
2. ✅ Update backend .env with Supabase credentials
3. ✅ Test API endpoints with database
4. ⏸️ Defer Task 2-4 (Anchor build) to Day 3 or later
5. 🔍 Research spl-token-2022 workarounds in parallel

---

## Alternative: Manual IDL Creation

If we need Vote Aggregator immediately, I can create a minimal IDL manually:

```json
{
  "version": "0.1.0",
  "name": "zmart_core",
  "instructions": [
    {
      "name": "initializeGlobalConfig",
      "accounts": [...],
      "args": [{"name": "backendAuthority", "type": "publicKey"}]
    },
    {
      "name": "submitProposalVote",
      "accounts": [...],
      "args": [...]
    },
    // ... other instructions
  ]
}
```

This would allow backend services to start, but requires manual maintenance.

---

## Program Status

**Deployment Info:**
- Program ID: `7h3gXfBfYFueFVLYyfL5Qo1QGsf4GQUfW96FKVgnUsJS`
- Network: Devnet
- Status: Previously deployed (IDL may exist on-chain)

**Compilation Status:**
- ✅ Rust code compiles successfully
- ✅ Program .so file generated
- ❌ IDL generation fails
- ❌ Cannot fetch IDL from devnet

---

## Impact Assessment

### ✅ Not Blocked
- Database schema deployment
- API Server functionality
- WebSocket Server functionality
- Frontend development (uses mock data initially)

### ⚠️ Partially Blocked
- Vote Aggregator service (can't initialize Program object)
- On-chain vote recording (off-chain collection still works)
- Integration testing of voting flow

### ❌ Completely Blocked
- End-to-end vote aggregation testing
- Devnet deployment of new program version

---

## Decision

**Proceed with Database Setup (Task 5-8)**

Vote Aggregator will remain in "skipped" state until IDL issue resolved. This is acceptable for Day 2-3 as we can test other components independently.

**Timeline Adjustment:**
- Original: Day 2 complete with Vote Aggregator
- Revised: Day 2 complete with database, Day 3 resolve Anchor build + enable Vote Aggregator

**Confidence:** Still 95/100 for Day 2 completion (database tasks unaffected)

---

**Report Generated:** November 7, 2025
**Next Action:** Begin Task 5 - Extract Database Schema SQL
