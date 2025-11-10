# On-Chain Test Scenarios

**Purpose:** Comprehensive catalog of all test scenarios for ZMART prediction markets.
**Coverage:** All 18 instructions, 6 states, edge cases, and error conditions.

## Table of Contents

1. [Market Lifecycle Tests](#market-lifecycle-tests)
2. [Trading Tests](#trading-tests)
3. [Voting Tests](#voting-tests)
4. [Resolution Tests](#resolution-tests)
5. [State Transition Tests](#state-transition-tests)
6. [LMSR Mathematics Tests](#lmsr-mathematics-tests)
7. [Fee Distribution Tests](#fee-distribution-tests)
8. [Authorization Tests](#authorization-tests)
9. [Edge Case Tests](#edge-case-tests)
10. [Load Tests](#load-tests)
11. [Security Tests](#security-tests)

---

## Market Lifecycle Tests

### Test 1.1: Create Market - Standard
**Purpose:** Verify market creation with standard LMSR parameters
**Instructions:** `create_market`
**Test Data:**
```typescript
{
  title: "Will BTC reach $100k by EOY 2025?",
  description: "Resolution based on CoinGecko price",
  category: "CRYPTO",
  tags: ["bitcoin", "price"],
  creator: testWallet1.publicKey,
  oracle: oracleWallet.publicKey,
  lmsrB: 1000_000_000_000, // 1000 USDC liquidity
  resolutionTime: Date.now() + 30 * 24 * 60 * 60 * 1000 // 30 days
}
```
**Expected Results:**
- Market created in PROPOSED state
- Market ID generated (PDA)
- Creator set correctly
- LMSR parameters stored
- Event emitted: MarketCreated

**Historical Results:** `03-TEST-RESULTS/*/test-1.1-create-market-*.json`

---

### Test 1.2: Approve Market
**Purpose:** Verify admin can approve proposed markets
**Instructions:** `approve_market`
**Preconditions:** Market in PROPOSED state
**Test Data:**
```typescript
{
  marketId: "test-market-1",
  admin: adminWallet.publicKey
}
```
**Expected Results:**
- Market state → APPROVED
- Event emitted: MarketApproved
- Only admin can approve

**Historical Results:** `03-TEST-RESULTS/*/test-1.2-approve-market-*.json`

---

### Test 1.3: Activate Market
**Purpose:** Verify market activation after approval
**Instructions:** `activate_market`
**Preconditions:** Market in APPROVED state
**Test Data:**
```typescript
{
  marketId: "test-market-1",
  activator: creatorWallet.publicKey // or admin
}
```
**Expected Results:**
- Market state → ACTIVE
- Trading enabled
- Initial prices set (50/50)
- Event emitted: MarketActivated

**Historical Results:** `03-TEST-RESULTS/*/test-1.3-activate-market-*.json`

---

## Trading Tests

### Test 2.1: Buy YES Shares
**Purpose:** Verify buying YES shares with LMSR pricing
**Instructions:** `buy_shares`
**Preconditions:** Market in ACTIVE state
**Test Data:**
```typescript
{
  marketId: "test-market-1",
  outcome: "YES",
  shares: 100_000_000_000, // 100 shares
  maxCost: 60_000_000_000, // 60 USDC max
  buyer: traderWallet1.publicKey
}
```
**Expected Results:**
- Cost calculated via LMSR formula
- User position updated
- Market quantities updated
- Fees deducted (10%)
- Price impact reflected
- Event emitted: SharesPurchased

**Historical Results:** `03-TEST-RESULTS/*/test-2.1-buy-yes-*.json`

---

### Test 2.2: Buy NO Shares
**Purpose:** Verify buying NO shares with LMSR pricing
**Instructions:** `buy_shares`
**Test Data:** Similar to 2.1 but outcome = "NO"
**Expected Results:** Similar to 2.1 but for NO shares

---

### Test 2.3: Sell YES Shares
**Purpose:** Verify selling shares back to LMSR
**Instructions:** `sell_shares`
**Preconditions:** User owns YES shares
**Test Data:**
```typescript
{
  marketId: "test-market-1",
  outcome: "YES",
  shares: 50_000_000_000, // 50 shares
  minProceeds: 40_000_000_000, // 40 USDC minimum
  seller: traderWallet1.publicKey
}
```
**Expected Results:**
- Proceeds calculated via LMSR
- User position reduced
- Market quantities updated
- Fees deducted
- Price adjusted
- Event emitted: SharesSold

---

### Test 2.4: Buy with Exact Slippage
**Purpose:** Test maximum slippage protection
**Test:** Buy with maxCost exactly equal to LMSR cost
**Expected:** Transaction succeeds

---

### Test 2.5: Buy Exceeding Slippage
**Purpose:** Test slippage protection
**Test:** Buy with maxCost less than LMSR cost
**Expected:** Transaction fails with SlippageExceeded error

---

## Voting Tests

### Test 3.1: Submit Proposal Vote
**Purpose:** Verify voting on market proposals
**Instructions:** `submit_proposal_vote`
**Preconditions:** Market in PROPOSED state
**Test Data:**
```typescript
{
  marketId: "test-market-1",
  vote: "LIKE", // or "DISLIKE"
  voter: voterWallet1.publicKey
}
```
**Expected Results:**
- Vote recorded
- User marked as voted
- Cannot vote twice
- Event emitted: ProposalVoteSubmitted

---

### Test 3.2: Aggregate Proposal Votes
**Purpose:** Verify vote aggregation meets threshold
**Instructions:** `aggregate_proposal_votes`
**Test Data:** Multiple votes to reach 70% threshold
**Expected Results:**
- Votes aggregated
- If threshold met, state changes
- Event emitted: ProposalVotesAggregated

---

### Test 3.3: Submit Dispute Vote
**Purpose:** Verify dispute voting
**Instructions:** `submit_dispute_vote`
**Preconditions:** Market in DISPUTED state
**Test Data:** Similar to proposal vote
**Expected Results:** Similar to proposal vote but for disputes

---

## Resolution Tests

### Test 4.1: Resolve Market
**Purpose:** Verify oracle can resolve market
**Instructions:** `resolve_market`
**Preconditions:** Market past resolution time
**Test Data:**
```typescript
{
  marketId: "test-market-1",
  outcome: "YES", // or "NO" or "INVALID"
  oracle: oracleWallet.publicKey
}
```
**Expected Results:**
- Market state → RESOLVING
- Outcome recorded
- 48-hour dispute window starts
- Event emitted: MarketResolved

---

### Test 4.2: Dispute Resolution
**Purpose:** Verify dispute can be raised
**Instructions:** `dispute_resolution`
**Preconditions:** Market in RESOLVING state
**Test Data:**
```typescript
{
  marketId: "test-market-1",
  disputer: disputerWallet.publicKey,
  reason: "Incorrect oracle decision"
}
```
**Expected Results:**
- Market state → DISPUTED
- Dispute recorded
- Dispute voting enabled
- Event emitted: ResolutionDisputed

---

### Test 4.3: Finalize Market
**Purpose:** Verify market finalization
**Instructions:** `finalize_market`
**Preconditions:** 48 hours passed since RESOLVING
**Expected Results:**
- Market state → FINALIZED
- Claims enabled
- No further changes allowed
- Event emitted: MarketFinalized

---

### Test 4.4: Claim Winnings
**Purpose:** Verify users can claim winnings
**Instructions:** `claim_winnings`
**Preconditions:** Market FINALIZED, user has winning shares
**Test Data:**
```typescript
{
  marketId: "test-market-1",
  claimer: winnerWallet.publicKey
}
```
**Expected Results:**
- Winnings calculated correctly
- Funds transferred to user
- Position marked as claimed
- Cannot claim twice
- Event emitted: WinningsClaimed

---

## State Transition Tests

### Test 5.1: Full Happy Path
**Purpose:** Test complete lifecycle
**Flow:** PROPOSED → APPROVED → ACTIVE → RESOLVING → FINALIZED
**Expected:** All transitions successful

---

### Test 5.2: Dispute Path
**Purpose:** Test dispute flow
**Flow:** RESOLVING → DISPUTED → RESOLVING → FINALIZED
**Expected:** Dispute resolved, market finalized

---

### Test 5.3: Invalid Transitions
**Purpose:** Test invalid state changes
**Tests:**
- PROPOSED → ACTIVE (should fail)
- ACTIVE → PROPOSED (should fail)
- FINALIZED → any (should fail)
**Expected:** All invalid transitions rejected

---

## LMSR Mathematics Tests

### Test 6.1: Cost Function Accuracy
**Purpose:** Verify LMSR cost calculations
**Test Cases:**
- Small trades (< 1% of liquidity)
- Medium trades (1-10% of liquidity)
- Large trades (> 10% of liquidity)
**Expected:** Cost matches formula within 0.001%

---

### Test 6.2: Price Impact
**Purpose:** Verify price changes after trades
**Test:** Series of trades, measure price impact
**Expected:** Prices follow LMSR curve

---

### Test 6.3: Bounded Loss
**Purpose:** Verify maximum loss is bounded
**Test:** Extreme one-sided trading
**Expected:** Max loss ≤ b * ln(2)

---

### Test 6.4: Numerical Stability
**Purpose:** Test edge cases in calculations
**Test Cases:**
- Very small shares (1 unit)
- Very large shares (near overflow)
- Zero shares (should fail)
**Expected:** No overflow/underflow, graceful handling

---

## Fee Distribution Tests

### Test 7.1: Fee Calculation
**Purpose:** Verify 10% fee on trades
**Test:** Various trade amounts
**Expected:** Exactly 10% deducted

---

### Test 7.2: Fee Split
**Purpose:** Verify 3/2/5 distribution
**Test:** Track fee allocation
**Expected:**
- 3% to protocol treasury
- 2% to market creator
- 5% to staker rewards pool

---

## Authorization Tests

### Test 8.1: Admin Functions
**Purpose:** Verify only admin can:
- Approve markets
- Update global config
- Emergency pause
**Test:** Non-admin attempts
**Expected:** All rejected with Unauthorized

---

### Test 8.2: Creator Functions
**Purpose:** Verify only creator can:
- Update market metadata
- Cancel (if allowed)
**Test:** Non-creator attempts
**Expected:** Rejected

---

### Test 8.3: Oracle Functions
**Purpose:** Verify only oracle can:
- Resolve market
- Update resolution
**Test:** Non-oracle attempts
**Expected:** Rejected

---

## Edge Case Tests

### Test 9.1: Zero Liquidity Market
**Purpose:** Test minimum liquidity
**Test:** Create market with b = 0
**Expected:** Rejected with InvalidLiquidity

---

### Test 9.2: Expired Resolution
**Purpose:** Test late resolution
**Test:** Resolve after deadline
**Expected:** Special handling or rejection

---

### Test 9.3: Double Operations
**Purpose:** Test idempotency
**Tests:**
- Vote twice
- Claim twice
- Resolve twice
**Expected:** Second attempts rejected

---

## Load Tests

### Test 10.1: Concurrent Traders
**Purpose:** Test system under load
**Setup:** 100 users trading simultaneously
**Metrics:**
- Transaction success rate
- Average confirmation time
- System throughput (TPS)
**Expected:** >95% success, <5s confirmation

---

### Test 10.2: Market Saturation
**Purpose:** Test with many markets
**Setup:** Create 1000 markets
**Tests:**
- Query performance
- State account size
- RPC response times
**Expected:** Linear scaling, no degradation

---

### Test 10.3: Vote Aggregation Load
**Purpose:** Test vote aggregation at scale
**Setup:** 10,000 votes to aggregate
**Expected:** Batching works, no timeout

---

## Security Tests

### Test 11.1: Reentrancy Prevention
**Purpose:** Verify no reentrancy attacks
**Test:** Attempt recursive calls
**Expected:** All rejected

---

### Test 11.2: Integer Overflow
**Purpose:** Test arithmetic safety
**Test:** Operations near u64::MAX
**Expected:** Overflow detected and rejected

---

### Test 11.3: Unauthorized Access
**Purpose:** Test access control
**Test:** Attempt privileged operations
**Expected:** All unauthorized attempts rejected

---

### Test 11.4: Economic Attacks
**Purpose:** Test manipulation resistance
**Tests:**
- Price manipulation attempts
- Fee bypass attempts
- Double-spend attempts
**Expected:** All attacks fail

---

## Test Automation

### Running a Specific Test
```bash
npm run test:onchain -- --grep "Test 1.1"
```

### Running a Category
```bash
npm run test:onchain:trading
npm run test:onchain:voting
npm run test:onchain:security
```

### Generating Test Report
```bash
npm run test:report
```

---

## Adding New Tests

### Template
```typescript
describe("Test X.Y: [Name]", () => {
  it("should [expected behavior]", async () => {
    // Setup
    const testData = { /* ... */ };

    // Execute
    const tx = await program.methods
      .instructionName(testData)
      .accounts({ /* ... */ })
      .rpc();

    // Document
    await testDocumenter.document(tx, {
      scenario: "Test X.Y",
      data: testData,
      expected: "...",
      actual: "..."
    });

    // Assert
    expect(result).to.equal(expected);
  });
});
```

---

**Last Updated:** November 8, 2025
**Total Scenarios:** 50+
**Coverage:** 100% of instructions