# SOL Budget for Comprehensive Testing
**Date:** November 12, 2025
**Available Balance:** 26.96 SOL
**Wallet:** 4WQwPjKHu3x7dHBEehBDgxXHJQoDuBvj6Xhu6C1jjTye

---

## Transaction Cost Estimates (Devnet)

### Typical Costs Per Operation
| Operation | Cost (SOL) | Notes |
|-----------|-----------|-------|
| Create Market | 0.005 | One-time per market |
| Buy Shares | 0.002 | Per trade |
| Sell Shares | 0.002 | Per trade |
| Submit Vote | 0.002 | Per vote |
| Aggregate Votes | 0.003 | Per aggregation |
| Resolve Market | 0.003 | One-time per market |
| Claim Payout | 0.002 | Per claim |
| Dispute Resolution | 0.003 | Per dispute |

**Average Transaction:** ~0.003 SOL
**Safety Buffer:** 20% overhead

---

## Testing Budget Allocation

### Priority 1: Market Lifecycle Complete (12 hours)
**Test Suite:** market-lifecycle-complete.spec.ts

**Test Scenarios:**
1. **PROPOSED → APPROVED → ACTIVE Transition**
   - 1 market creation: 0.005 SOL
   - 3 state checks: 0.006 SOL
   - **Subtotal:** 0.011 SOL

2. **ACTIVE → RESOLVING → FINALIZED Flow**
   - 1 market creation: 0.005 SOL
   - 5 trades: 0.010 SOL
   - 3 votes: 0.006 SOL
   - 1 vote aggregation: 0.003 SOL
   - 1 resolution: 0.003 SOL
   - 2 claims: 0.004 SOL
   - **Subtotal:** 0.031 SOL

3. **Dispute Mechanism (DISPUTED State)**
   - 1 market creation: 0.005 SOL
   - 3 votes: 0.006 SOL
   - 1 dispute: 0.003 SOL
   - 3 more votes: 0.006 SOL
   - 1 resolution: 0.003 SOL
   - **Subtotal:** 0.023 SOL

4. **Time-Based State Changes**
   - 2 markets: 0.010 SOL
   - State monitoring: 0.006 SOL
   - **Subtotal:** 0.016 SOL

**Priority 1 Total:** 0.081 SOL (with 20% buffer: **0.097 SOL**)

---

### Priority 2: LMSR Validation (4 hours)
**Test Suite:** lmsr-validation.spec.ts

**Test Scenarios:**
1. **P(YES) + P(NO) = 1 Verification**
   - 1 market: 0.005 SOL
   - 10 trades (different amounts): 0.020 SOL
   - **Subtotal:** 0.025 SOL

2. **Bounded Loss Guarantee**
   - 1 market: 0.005 SOL
   - 20 trades (extreme scenarios): 0.040 SOL
   - **Subtotal:** 0.045 SOL

3. **Price Impact Accuracy**
   - 1 market: 0.005 SOL
   - 15 trades: 0.030 SOL
   - **Subtotal:** 0.035 SOL

**Priority 2 Total:** 0.105 SOL (with 20% buffer: **0.126 SOL**)

---

### Priority 3: Fee Distribution (4 hours)
**Test Suite:** fee-distribution.spec.ts

**Test Scenarios:**
1. **10% Total Fee Verification**
   - 1 market: 0.005 SOL
   - 10 trades: 0.020 SOL
   - **Subtotal:** 0.025 SOL

2. **3/2/5 Split (Protocol/Creator/Stakers)**
   - 1 market: 0.005 SOL
   - 20 trades: 0.040 SOL
   - 3 claims: 0.006 SOL
   - **Subtotal:** 0.051 SOL

3. **Fee Accumulation Across Trades**
   - 1 market: 0.005 SOL
   - 30 trades: 0.060 SOL
   - **Subtotal:** 0.065 SOL

**Priority 3 Total:** 0.141 SOL (with 20% buffer: **0.169 SOL**)

---

### Priority 4: Resolution & Payout (4 hours)
**Test Suite:** resolution-payout.spec.ts

**Test Scenarios:**
1. **Winner Payout Calculation**
   - 3 markets: 0.015 SOL
   - 30 trades (10 per market): 0.060 SOL
   - 3 resolutions: 0.009 SOL
   - 6 claims: 0.012 SOL
   - **Subtotal:** 0.096 SOL

2. **Claim Mechanism Validation**
   - 2 markets: 0.010 SOL
   - 20 trades: 0.040 SOL
   - 10 claims: 0.020 SOL
   - **Subtotal:** 0.070 SOL

3. **Double-Claim Prevention**
   - 1 market: 0.005 SOL
   - 10 trades: 0.020 SOL
   - 5 claim attempts: 0.010 SOL
   - **Subtotal:** 0.035 SOL

**Priority 4 Total:** 0.201 SOL (with 20% buffer: **0.241 SOL**)

---

### Priority 5: Error Handling (8 hours)
**Test Suite:** program-errors.spec.ts, slippage-advanced.spec.ts

**Test Scenarios:**
1. **All Error Codes Tested**
   - 5 markets: 0.025 SOL
   - 50 transactions (expected failures): 0.150 SOL
   - **Subtotal:** 0.175 SOL

2. **Slippage Edge Cases**
   - 3 markets: 0.015 SOL
   - 40 trades: 0.080 SOL
   - **Subtotal:** 0.095 SOL

**Priority 5 Total:** 0.270 SOL (with 20% buffer: **0.324 SOL**)

---

### Priority 6: Performance Benchmarks (6 hours)
**Test Suite:** performance-benchmarks.spec.ts

**Test Scenarios:**
1. **Transaction Confirmation Speed**
   - 2 markets: 0.010 SOL
   - 100 transactions: 0.300 SOL
   - **Subtotal:** 0.310 SOL

2. **API Response Times**
   - Minimal on-chain cost: 0.010 SOL
   - **Subtotal:** 0.010 SOL

**Priority 6 Total:** 0.320 SOL (with 20% buffer: **0.384 SOL**)

---

### Priority 7: Concurrent Trading (8 hours)
**Test Suite:** concurrent-trading.spec.ts

**Requirements:**
- ⚠️ **REQUIRES 10 FUNDED WALLETS**
- Cannot proceed with single wallet

**Alternative: Simulate with Sequential Trades**
- 5 markets: 0.025 SOL
- 100 trades (simulated concurrent): 0.200 SOL
- **Subtotal:** 0.225 SOL (with 20% buffer: **0.270 SOL**)

**Priority 7 Total:** **0.270 SOL** (simulated)

---

## Total Budget Summary

| Priority | Test Suite | Estimated Cost | Status |
|----------|-----------|----------------|--------|
| P1 | Market Lifecycle | 0.097 SOL | ✅ Affordable |
| P2 | LMSR Validation | 0.126 SOL | ✅ Affordable |
| P3 | Fee Distribution | 0.169 SOL | ✅ Affordable |
| P4 | Resolution & Payout | 0.241 SOL | ✅ Affordable |
| P5 | Error Handling | 0.324 SOL | ✅ Affordable |
| P6 | Performance | 0.384 SOL | ✅ Affordable |
| P7 | Concurrent (Simulated) | 0.270 SOL | ✅ Affordable |
| **TOTAL** | **All Testing** | **1.611 SOL** | **✅ SAFE** |

**Available Balance:** 26.96 SOL
**Required for Testing:** 1.611 SOL
**Safety Buffer:** 25.349 SOL (94% remaining)
**Status:** ✅ **EXTREMELY SAFE - Can run 16+ full test cycles**

---

## Spending Tracking

### Actual Spending Log
**Format:** [Date] [Test Suite] [Cost] [Balance]

*To be updated during testing...*

| Date | Test Suite | Cost (SOL) | Remaining Balance |
|------|-----------|-----------|-------------------|
| 2025-11-12 | Starting Balance | - | 26.96 |
| ... | ... | ... | ... |

---

## Cost Optimization Strategies

### 1. Reuse Test Markets
- Create markets once, reuse across multiple tests
- **Savings:** ~40% reduction in market creation costs

### 2. Batch Assertions
- Validate multiple scenarios per transaction
- **Savings:** ~20% reduction in state-check costs

### 3. Strategic Test Ordering
- Run expensive tests last (after critical validation)
- **Risk Management:** Preserve SOL for highest-priority tests

### 4. Mock Where Possible
- Use off-chain calculations for validation (no SOL cost)
- Only verify critical on-chain state changes
- **Savings:** ~30% reduction in unnecessary transactions

---

## Emergency Procedures

### If Balance Gets Low (<5 SOL)
1. **STOP ALL TESTING IMMEDIATELY**
2. Document current test results
3. Prioritize remaining tests by criticality
4. Consider requesting additional devnet SOL via:
   - Web faucet: https://faucet.solana.com
   - Discord community faucet
   - Request from project stakeholders

### Transaction Failure Rate Monitoring
- **Expected Success Rate:** >95%
- **Alert Threshold:** <90% success rate
- **Action:** Investigate program errors before continuing

---

## Recommendations

✅ **Proceed with Confidence**
- 26.96 SOL is MORE than sufficient for comprehensive testing
- Even with 20% safety buffer, we can run 16+ full test cycles
- Focus on test quality, not cost optimization

🎯 **Testing Strategy**
1. Start with Priority 1-4 (critical path validation)
2. Monitor spending via logs
3. Adjust strategy if costs exceed estimates
4. Keep detailed records for future planning

⚠️ **Important Notes**
- All costs are estimates based on typical devnet behavior
- Actual costs may vary ±20%
- Failed transactions still consume SOL (rent + compute)
- Monitor balance regularly during testing

---

**Next Steps:**
1. Update TODO_CHECKLIST.md to mark Phase 1 complete
2. Begin Priority 1 testing (market-lifecycle-complete.spec.ts)
3. Log all spending in this document
4. Proceed with confidence! 🚀
