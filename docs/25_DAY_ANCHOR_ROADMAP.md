# 25-Day Anchor Roadmap

**Project:** ZMART v0.69 Solana Prediction Markets
**Scope:** Anchor Program Implementation Only (Backend-First)
**Timeline:** 25 days (200 hours) | 5 phases with mandatory gates

---

## 📋 Roadmap Overview

| Phase | Days | Focus | Gate |
|-------|------|-------|------|
| 1 | 1-8 | Core Trading (LMSR) | ✅ Trading functional |
| 2 | 9-15 | Governance System | ✅ Proposal voting works |
| 3 | 16-20 | Economic System | ✅ Fees & payouts correct |
| 4 | 21-23 | Security & Polish | ✅ Audit complete |
| 5 | 24-25 | Deployment | ✅ Production ready |

**Success Criteria:** 95%+ test coverage | All invariants preserved | Security audit passed

---

## Phase 1: Foundation (Days 1-8) - Core Trading

### Day 1: Project Setup & Dependencies (8h)
**Goal:** Anchor environment ready, project structure created

**Tasks:**
- [ ] Initialize Anchor workspace (`anchor init`)
- [ ] Create `zmart-core` program
- [ ] Create `zmart-proposal` program
- [ ] Add dependencies (spl-token, anchor-lang, etc.)
- [ ] Setup test framework
- [ ] Configure Anchor.toml for devnet
- [ ] Create initial account structures (skeleton)
- [ ] Verify `anchor build` and `anchor test` work

**Definition of Done:**
- ✅ `anchor build` completes successfully
- ✅ `anchor test` runs (even if tests are empty)
- ✅ Programs compile without errors
- ✅ Devnet config verified

---

### Day 2: GlobalConfig + Fee Structures (8h)
**Goal:** System-wide configuration and fee management implemented

**Tasks:**
- [ ] Define `GlobalConfig` account (see 03_SOLANA_PROGRAM_DESIGN.md)
- [ ] Implement `initialize_config` instruction
- [ ] Add fee parameters (protocol_fee_bps, creator_fee_bps, staker_fee_bps)
- [ ] Add admin controls (pause, upgrade authority)
- [ ] Write unit tests for config initialization
- [ ] Test fee validation logic (total = 10%)
- [ ] Document all config parameters

**Reference:** `docs/03_SOLANA_PROGRAM_DESIGN.md` (GlobalConfig structure)

**Definition of Done:**
- ✅ GlobalConfig account compiles
- ✅ initialize_config instruction works
- ✅ Fee validation tests pass
- ✅ Admin controls functional

---

### Day 3: LMSR Math & Fixed-Point Implementation (8h)
**Goal:** Production-ready LMSR calculations with numerical stability

**Tasks:**
- [ ] Implement fixed-point arithmetic (u64, 9 decimals)
- [ ] Create LMSR cost function (see 05_LMSR_MATHEMATICS.md)
- [ ] Implement binary search for share calculation
- [ ] Add overflow/underflow protection
- [ ] Test LMSR formulas against known values
- [ ] Verify bounded loss property (max loss = b * ln(2))
- [ ] Document all mathematical functions

**Reference:** `docs/05_LMSR_MATHEMATICS.md` (complete formulas)

**Definition of Done:**
- ✅ All LMSR tests pass (10+ test cases)
- ✅ Numerical stability verified
- ✅ No overflow/underflow possible
- ✅ Performance benchmarks acceptable (<100ms)

---

### Day 4: Market Accounts & Lifecycle States (8h)
**Goal:** Complete 6-state FSM implementation

**Tasks:**
- [ ] Define `MarketAccount` structure
- [ ] Implement 6 states (PROPOSED → FINALIZED)
- [ ] Create state transition validation logic
- [ ] Add timestamp-based automatic transitions
- [ ] Implement state-based access control
- [ ] Write state transition tests (all paths)
- [ ] Document FSM rules

**Reference:** `docs/06_STATE_MANAGEMENT.md` (FSM implementation)

**Definition of Done:**
- ✅ All 6 states implemented
- ✅ State transitions validated
- ✅ Access control enforced
- ✅ Automatic transitions tested

---

### Day 5: Trading Instructions (8h)
**Goal:** Buy and sell functionality complete

**Tasks:**
- [ ] Implement `buy_shares` instruction
- [ ] Implement `sell_shares` instruction
- [ ] Add slippage protection
- [ ] Integrate LMSR calculations
- [ ] Update market state after trades
- [ ] Add trade validation (amounts, prices)
- [ ] Write trade execution tests
- [ ] Test edge cases (zero amounts, max amounts)

**Definition of Done:**
- ✅ Buy/sell instructions work
- ✅ LMSR math integrated correctly
- ✅ Slippage protection functional
- ✅ Edge cases handled

---

### Day 6: Unit Tests for LMSR & Trading (8h)
**Goal:** Comprehensive test coverage for core logic

**Tasks:**
- [ ] Write 20+ LMSR unit tests
- [ ] Test all trade scenarios
- [ ] Test boundary conditions
- [ ] Test fee calculations
- [ ] Test state updates after trades
- [ ] Verify invariants preserved
- [ ] Document test methodology

**Definition of Done:**
- ✅ >90% code coverage (core logic)
- ✅ All edge cases tested
- ✅ All invariants verified
- ✅ Performance acceptable

---

### Day 7: Integration Tests & Edge Cases (8h)
**Goal:** End-to-end workflows validated

**Tasks:**
- [ ] Write full market lifecycle test (create → trade → resolve)
- [ ] Test multi-user scenarios
- [ ] Test concurrent trades
- [ ] Test market state transitions
- [ ] Test error handling
- [ ] Test recovery scenarios
- [ ] Document integration test patterns

**Definition of Done:**
- ✅ Full lifecycle test passes
- ✅ Multi-user scenarios work
- ✅ Concurrent access safe
- ✅ Error handling robust

---

### Day 8: Phase 1 Gate - Core Trading Validation (8h)
**Goal:** Validate Phase 1 complete before proceeding

**Phase Gate Requirements:**
- [ ] All Day 1-7 tasks complete
- [ ] `anchor build` succeeds
- [ ] `anchor test` passes (all tests)
- [ ] Test coverage >90%
- [ ] LMSR math verified against blueprint
- [ ] Trading functional (buy/sell work)
- [ ] State management working
- [ ] Documentation complete

**Validation:**
```bash
npm run validate-phase 1
```

**Definition of Done:**
- ✅ All phase requirements met
- ✅ Manual validation passed
- ✅ Ready for Phase 2 (Governance)

---

## Phase 2: Governance (Days 9-15) - Proposal System

### Day 9: ProposalManager Account Structure (8h)
**Goal:** Voting system foundation ready

**Tasks:**
- [ ] Define `ProposalManager` account
- [ ] Define `VoteRecord` account
- [ ] Add proposal lifecycle states
- [ ] Implement proposal creation logic
- [ ] Add vote tracking structure
- [ ] Write account structure tests

**Reference:** `docs/03_SOLANA_PROGRAM_DESIGN.md` (ProposalManager)

---

### Day 10: Vote Recording Instructions (8h)
**Goal:** On-chain vote recording functional

**Tasks:**
- [ ] Implement `like_proposal` instruction
- [ ] Implement `dislike_proposal` instruction
- [ ] Add vote validation (one vote per wallet)
- [ ] Update proposal vote counts
- [ ] Write vote recording tests
- [ ] Test vote updates

---

### Day 11: Proposal State Transitions (8h)
**Goal:** Proposal approval/rejection logic

**Tasks:**
- [ ] Implement proposal approval threshold (70%)
- [ ] Add automatic state updates based on votes
- [ ] Implement proposal expiry logic
- [ ] Add proposal cancellation
- [ ] Write state transition tests
- [ ] Test threshold calculations

**Reference:** `docs/CORE_LOGIC_INVARIANTS.md` (70% approval threshold)

---

### Day 12: Backend Vote Aggregation Service (8h)
**Goal:** Off-chain vote aggregation working

**Tasks:**
- [ ] Create Node.js vote aggregator service
- [ ] Implement Supabase vote storage
- [ ] Add periodic on-chain recording
- [ ] Test aggregation logic
- [ ] Verify vote consistency

**Reference:** `docs/07_ON_CHAIN_OFF_CHAIN_INTEGRATION.md` (hybrid architecture)

---

### Day 13: Resolution Instructions (8h)
**Goal:** Market resolution functional

**Tasks:**
- [ ] Implement `resolve_market` instruction
- [ ] Implement `finalize_market` instruction
- [ ] Add 48-hour resolution window
- [ ] Add resolution validation
- [ ] Write resolution tests
- [ ] Test finalization logic

**Reference:** `docs/CORE_LOGIC_INVARIANTS.md` (resolution process)

---

### Day 14: Dispute Mechanism (8h)
**Goal:** Dispute system complete

**Tasks:**
- [ ] Implement `dispute_resolution` instruction
- [ ] Implement `finalize_dispute` instruction
- [ ] Add dispute voting logic
- [ ] Add dispute thresholds
- [ ] Write dispute tests
- [ ] Test dispute resolution flow

**Reference:** `docs/CORE_LOGIC_INVARIANTS.md` (dispute thresholds)

---

### Day 15: Phase 2 Gate - Governance Complete (8h)
**Goal:** Validate Phase 2 complete

**Phase Gate Requirements:**
- [ ] All Day 9-14 tasks complete
- [ ] Proposal system works end-to-end
- [ ] Vote aggregation functional
- [ ] Resolution process validated
- [ ] Dispute mechanism tested
- [ ] Test coverage >90%

**Validation:**
```bash
npm run validate-phase 2
```

---

## Phase 3: Economics (Days 16-20) - Fees & Payouts

### Day 16: Fee Distribution Logic (8h)
**Goal:** 10% fee split (3/2/5) implemented

**Tasks:**
- [ ] Implement fee calculation (10% of volume)
- [ ] Split fees: 3% protocol, 2% creator, 5% stakers
- [ ] Add fee accumulation tracking
- [ ] Write fee distribution tests
- [ ] Verify fee math accuracy

**Reference:** `docs/CORE_LOGIC_INVARIANTS.md` (fee structure)

---

### Day 17: Payout Calculations (8h)
**Goal:** Winner payout logic complete

**Tasks:**
- [ ] Implement `claim_winnings` instruction
- [ ] Calculate payout amounts
- [ ] Add payout validation
- [ ] Test payout scenarios
- [ ] Verify payout correctness

---

### Day 18: Creator Rewards Distribution (8h)
**Goal:** Creator incentives working

**Tasks:**
- [ ] Implement creator fee claiming
- [ ] Add creator reward tracking
- [ ] Test creator payouts
- [ ] Verify creator incentives align with blueprint

---

### Day 19: Integration with Backend Services (8h)
**Goal:** Backend coordination complete

**Tasks:**
- [ ] Connect backend to programs
- [ ] Test event indexing
- [ ] Verify data consistency
- [ ] Test API endpoints

---

### Day 20: Phase 3 Gate - Economic System Validated (8h)
**Goal:** Validate Phase 3 complete

**Phase Gate Requirements:**
- [ ] All Day 16-19 tasks complete
- [ ] Fee distribution correct
- [ ] Payouts working
- [ ] Creator rewards functional
- [ ] Backend integration tested
- [ ] Test coverage >95%

**Validation:**
```bash
npm run validate-phase 3
```

---

## Phase 4: Security & Polish (Days 21-23)

### Day 21: Security Audit (8h)
**Goal:** Security hardening complete

**Tasks:**
- [ ] Review all access controls
- [ ] Check arithmetic safety
- [ ] Verify account validation
- [ ] Test reentrancy protection
- [ ] Document security measures

---

### Day 22: Error Handling & Edge Cases (8h)
**Goal:** Robust error handling

**Tasks:**
- [ ] Add comprehensive error codes
- [ ] Test all error paths
- [ ] Verify error messages
- [ ] Test recovery scenarios

---

### Day 23: Phase 4 Gate - Security Complete (8h)
**Goal:** Validate Phase 4 complete

**Phase Gate Requirements:**
- [ ] Security audit passed
- [ ] All error cases handled
- [ ] Edge cases tested
- [ ] Test coverage >95%

**Validation:**
```bash
npm run validate-phase 4
```

---

## Phase 5: Deployment (Days 24-25)

### Day 24: Devnet Deployment & Testing (8h)
**Goal:** Programs deployed and tested on devnet

**Tasks:**
- [ ] Deploy to devnet
- [ ] Run integration tests on devnet
- [ ] Verify all functionality
- [ ] Test with real transactions

---

### Day 25: Final Phase Gate - Production Ready (8h)
**Goal:** Complete all validation

**Phase Gate Requirements:**
- [ ] All 5 phases complete
- [ ] Devnet testing passed
- [ ] Documentation complete
- [ ] Security audit approved
- [ ] Test coverage >95%
- [ ] All invariants verified

**Validation:**
```bash
npm run validate-phase 5
```

**🎉 ROADMAP COMPLETE!**

---

## Appendix: Validation Commands

```bash
# Daily validation
npm run validate-day           # Check current day requirements
npm run validate-day-complete  # Mark day complete (auto-advances)

# Phase gates (run automatically at boundaries)
npm run validate-phase 1       # Validate Phase 1 complete
npm run validate-phase 2       # Validate Phase 2 complete
npm run validate-phase 3       # Validate Phase 3 complete
npm run validate-phase 4       # Validate Phase 4 complete
npm run validate-phase 5       # Validate Phase 5 complete (final)

# Manual day advancement (not recommended - use validate-day-complete)
npm run advance-day            # Advances day after validation
```

---

*Last Updated: 2025-11-06*
*System: 25-Day Anchor Roadmap with Bulletproof Enforcement (98/100)*
*Based on: KEKTECH 3.0 Blueprint + Solana Optimization*
