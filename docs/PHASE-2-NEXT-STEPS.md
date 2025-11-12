# Phase 2: Next Steps - API Endpoint Implementation

**Date:** November 7, 2025
**Current Status:** Phase 2 Day 2 Complete (100%)
**Remaining Work:** Phase 2 Day 3-5 (4-6 hours estimated)

---

## 🎯 What's Already Complete

✅ **Infrastructure (100%)**
- Anchor program deployed to devnet
- Global config initialized on-chain
- Test market created on-chain
- Cloud database operational (Supabase)
- Backend services running (API, WebSocket, Vote Aggregator)
- Integration tests passing (8/8)
- Schema alignment complete

---

## 🚀 Remaining Tasks (Phase 2 Day 3-5)

### Task 1: Implement POST /api/markets (1.5-2 hours)

**Current State:**
- Endpoint exists but only creates in database
- File: `backend/src/api/routes/markets.ts` (lines 89-123)

**Required Changes:**
1. Import Anchor program utilities from `backend/src/config`
2. Generate unique market ID (crypto.randomBytes(32))
3. Convert question to IPFS hash format ([u8; 46])
4. Call `program.methods.createMarket()` with parameters:
   - market_id: [u8; 32]
   - b_parameter: u64 (liquidity parameter)
   - initial_liquidity: u64
   - ipfs_question_hash: [u8; 46]
5. Derive market PDA and store in database
6. Return both database record and on-chain address

**Implementation Pattern:**
```typescript
import { getProvider, getBackendKeypair, getConnection, getProgramIds } from "../../config";
import { Program, AnchorProvider } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import crypto from "crypto";
import fs from "fs";

// Inside POST /api/markets handler:
const marketId = crypto.randomBytes(32);
const [marketPda] = PublicKey.findProgramAddressSync(
  [Buffer.from("market"), Buffer.from(marketId)],
  programId
);

// Load IDL and create program
const idl = JSON.parse(fs.readFileSync("../../target/idl/zmart_core.json", "utf-8"));
const provider = getProvider();
const program = new Program(idl, provider);
const [globalConfigPda] = PublicKey.findProgramAddressSync(
  [Buffer.from("global-config")],
  program.programId
);

// Create market on-chain
const tx = await program.methods
  .createMarket(
    Array.from(marketId),
    new BN(liquidity),
    new BN(liquidity),
    Array.from(Buffer.from(question.padEnd(46, '0').slice(0, 46)))
  )
  .accounts({
    creator: req.user!.wallet_pubkey,
    globalConfig: globalConfigPda,
    market: marketPda,
    systemProgram: SystemProgram.programId,
  })
  .rpc();

// Store in database with on_chain_address
const { data, error } = await supabase
  .from("markets")
  .insert({
    id: Buffer.from(marketId).toString("hex"),
    on_chain_address: marketPda.toBase58(),
    question,
    category,
    creator_wallet: req.user!.wallet,
    state: "PROPOSED",
    b_parameter: liquidity.toString(),
    initial_liquidity: liquidity.toString(),
    // ... other fields
  })
  .select()
  .single();
```

**Testing:**
```bash
curl -X POST http://localhost:4000/api/markets \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <wallet_signature>" \
  -d '{
    "question": "Will ETH reach $5k in 2025?",
    "category": "crypto",
    "liquidity": 1000000000
  }'
```

---

### Task 2: Implement POST /api/markets/:id/trades (2-3 hours)

**Current State:**
- Trade routes file exists: `backend/src/api/routes/trades.ts`
- Need to add buy/sell endpoints

**Required Implementation:**

**Endpoint 1: POST /api/markets/:id/buy**
```typescript
router.post(
  "/:id/buy",
  requireAuth,
  validate(schemas.buyShares),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { outcome, shares, max_cost } = req.body; // outcome: true=YES, false=NO

    // 1. Fetch market from database
    // 2. Derive market PDA
    // 3. Derive user position PDA
    // 4. Call program.methods.buyShares()
    // 5. Update database (user position, market shares)
    // 6. Broadcast via WebSocket
    // 7. Return trade details
  })
);
```

**Endpoint 2: POST /api/markets/:id/sell**
```typescript
router.post(
  "/:id/sell",
  requireAuth,
  validate(schemas.sellShares),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { outcome, shares, min_proceeds } = req.body;

    // 1. Fetch market and user position
    // 2. Derive PDAs
    // 3. Call program.methods.sellShares()
    // 4. Update database
    // 5. Broadcast via WebSocket
    // 6. Return trade details
  })
);
```

**Key Program Instructions:**
```typescript
// Buy shares
const tx = await program.methods
  .buyShares(
    outcome, // true=YES, false=NO
    new BN(shares),
    new BN(max_cost)
  )
  .accounts({
    buyer: wallet.publicKey,
    globalConfig: globalConfigPda,
    market: marketPda,
    userPosition: userPositionPda,
    protocolFeeWallet: protocolFeeWalletPubkey,
    systemProgram: SystemProgram.programId,
  })
  .rpc();

// Sell shares
const tx = await program.methods
  .sellShares(
    outcome,
    new BN(shares),
    new BN(min_proceeds)
  )
  .accounts({
    seller: wallet.publicKey,
    globalConfig: globalConfigPda,
    market: marketPda,
    userPosition: userPositionPda,
    systemProgram: SystemProgram.programId,
  })
  .rpc();
```

**Testing:**
```bash
# Buy YES shares
curl -X POST http://localhost:4000/api/markets/{market_id}/buy \
  -H "Authorization: Bearer <token>" \
  -d '{"outcome": true, "shares": 100, "max_cost": 500000000}'

# Sell NO shares
curl -X POST http://localhost:4000/api/markets/{market_id}/sell \
  -H "Authorization: Bearer <token>" \
  -d '{"outcome": false, "shares": 50, "min_proceeds": 200000000}'
```

---

### Task 3: Implement POST /api/markets/:id/resolve (1 hour)

**Current State:**
- Need to add resolution endpoint to markets.ts

**Required Implementation:**
```typescript
router.post(
  "/:id/resolve",
  requireAuth,
  validate(schemas.resolveMarket),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { outcome, ipfs_evidence_hash } = req.body; // outcome: true=YES, false=NO, null=INVALID

    // 1. Verify user is creator or admin
    // 2. Fetch market from database
    // 3. Verify market state is ACTIVE
    // 4. Call program.methods.resolveMarket()
    // 5. Update database (state=RESOLVING, proposed_outcome)
    // 6. Broadcast via WebSocket
    // 7. Return resolution details
  })
);
```

**Program Instruction:**
```typescript
const tx = await program.methods
  .resolveMarket(
    outcome === null ? null : { [outcome ? "yes" : "no"]: {} },
    Array.from(Buffer.from(ipfs_evidence_hash.padEnd(46, '0').slice(0, 46)))
  )
  .accounts({
    resolver: wallet.publicKey,
    globalConfig: globalConfigPda,
    market: marketPda,
  })
  .rpc();
```

**Testing:**
```bash
curl -X POST http://localhost:4000/api/markets/{market_id}/resolve \
  -H "Authorization: Bearer <token>" \
  -d '{"outcome": true, "ipfs_evidence_hash": "QmEvidence..."}'
```

---

### Task 4: End-to-End Integration Test (2-3 hours)

**Test Script:** `backend/scripts/test-full-lifecycle.ts`

**Test Flow:**
```typescript
// 1. CREATE MARKET
const market = await createMarketOnChain(question, category, liquidity);

// 2. SUBMIT VOTES (simulate 5 users voting)
for (let i = 0; i < 5; i++) {
  await submitProposalVote(market.id, voters[i], true); // 80% approval
}

// 3. WAIT FOR VOTE AGGREGATION (Vote Aggregator cron runs every 5 min)
await waitForVoteAggregation(market.id, 5 * 60 * 1000);

// 4. VERIFY MARKET APPROVED
const marketAfterVotes = await fetchMarket(market.id);
assert(marketAfterVotes.state === "APPROVED");

// 5. ADMIN ACTIVATES MARKET
await activateMarket(market.id);

// 6. USERS BUY SHARES
await buyShares(market.id, user1, true, 100); // Buy YES
await buyShares(market.id, user2, false, 50); // Buy NO

// 7. VERIFY LMSR PRICING
const prices = await getMarketPrices(market.id);
assert(prices.yes_price > 0.5); // YES price increased

// 8. RESOLVE MARKET
await resolveMarket(market.id, true, "QmEvidence...");

// 9. WAIT FOR DISPUTE PERIOD (3 days in test mode: 10 seconds)
await sleep(10_000);

// 10. FINALIZE MARKET
await finalizeMarket(market.id);

// 11. CLAIM WINNINGS
await claimWinnings(market.id, user1);

// 12. VERIFY PAYOUTS
const user1Position = await getUserPosition(market.id, user1);
assert(user1Position.claimed === true);
```

**Success Criteria:**
- [x] Market created on-chain
- [x] Votes aggregated on-chain
- [x] Market transitions through all states
- [x] LMSR pricing working correctly
- [x] Users can buy/sell shares
- [x] Resolution works
- [x] Payouts calculated correctly
- [x] WebSocket broadcasts working
- [x] No errors in logs

---

## 📁 Files to Modify

1. `backend/src/api/routes/markets.ts`
   - Update POST / to create on-chain
   - Add POST /:id/resolve

2. `backend/src/api/routes/trades.ts`
   - Add POST /:id/buy
   - Add POST /:id/sell

3. `backend/src/api/middleware/validation.ts`
   - Add schemas for new endpoints

4. `backend/src/services/vote-aggregator/proposal.ts`
   - Verify working with real on-chain data

5. Create `backend/scripts/test-full-lifecycle.ts`
   - Complete end-to-end test

---

## 🎯 Implementation Order

**Day 3 (4 hours):**
1. Implement POST /api/markets with on-chain creation (1.5h)
2. Test market creation end-to-end (0.5h)
3. Implement POST /api/markets/:id/buy (1h)
4. Implement POST /api/markets/:id/sell (1h)

**Day 4 (2 hours):**
5. Test trading with LMSR pricing (0.5h)
6. Implement POST /api/markets/:id/resolve (1h)
7. Test resolution flow (0.5h)

**Day 5 (2-3 hours):**
8. Create full lifecycle test script (1h)
9. Run and debug full lifecycle test (1-2h)
10. Document results and create completion report (0.5h)

---

## 🔧 Development Tips

### Working with Anchor Program

**Load Program:**
```typescript
import { Program } from "@coral-xyz/anchor";
import { readFileSync } from "fs";
import path from "path";

const idlPath = path.join(__dirname, "../../../target/idl/zmart_core.json");
const idl = JSON.parse(readFileSync(idlPath, "utf-8"));
const program = new Program(idl, provider);
```

**Derive PDAs:**
```typescript
// Global Config
const [globalConfigPda] = PublicKey.findProgramAddressSync(
  [Buffer.from("global-config")],
  program.programId
);

// Market
const [marketPda] = PublicKey.findProgramAddressSync(
  [Buffer.from("market"), Buffer.from(marketId)],
  program.programId
);

// User Position
const [userPositionPda] = PublicKey.findProgramAddressSync(
  [Buffer.from("user-position"), marketPda.toBuffer(), userWallet.toBuffer()],
  program.programId
);
```

### Error Handling

```typescript
try {
  const tx = await program.methods.createMarket(...).rpc();
  await connection.confirmTransaction(tx, "confirmed");
} catch (error: any) {
  if (error.logs) {
    console.error("Program logs:", error.logs);
  }
  throw new ApiError(500, `On-chain transaction failed: ${error.message}`);
}
```

### WebSocket Broadcasting

```typescript
import { broadcastEvent } from "../../services/websocket";

// After successful trade
broadcastEvent("trade_executed", {
  market_id: id,
  user_wallet: req.user!.wallet,
  outcome,
  shares,
  cost,
  timestamp: new Date().toISOString(),
});
```

---

## 📊 Success Metrics

**Phase 2 Completion Criteria:**
- [ ] POST /api/markets creates markets on-chain (1/1)
- [ ] POST /api/markets/:id/buy working with LMSR (1/1)
- [ ] POST /api/markets/:id/sell working with LMSR (1/1)
- [ ] POST /api/markets/:id/resolve working (1/1)
- [ ] Vote aggregation end-to-end working (1/1)
- [ ] Full lifecycle test passing (1/1)
- [ ] WebSocket broadcasts working (1/1)
- [ ] All 18 instructions tested (18/18)
- [ ] No critical bugs (0 critical)
- [ ] Performance acceptable (<500ms API response)

**Target Completion:** Phase 2 Day 5 (3-5 days from now)

---

## 🚀 Quick Start Commands

```bash
# Start backend
cd backend
npm run dev

# Test market creation
npx ts-node scripts/create-market-onchain.ts

# Run integration tests
npx ts-node scripts/test-integration.ts

# Run full lifecycle test (after implementation)
npx ts-node scripts/test-full-lifecycle.ts
```

---

## 📖 Reference Documentation

- Program Instructions: `programs/zmart-core/src/lib.rs`
- Account Structures: `programs/zmart-core/src/state.rs`
- LMSR Math: `docs/05_LMSR_MATHEMATICS.md`
- State Machine: `docs/06_STATE_MANAGEMENT.md`
- API Design: `docs/07_ON_CHAIN_OFF_CHAIN_INTEGRATION.md`

---

**Status:** Ready to begin Phase 2 Day 3 implementation

**Next Action:** Implement POST /api/markets endpoint with on-chain market creation

**Estimated Time to Phase 2 Completion:** 8-11 hours of focused development
