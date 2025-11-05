# STORY-1.5: Resolution Instructions (resolve_market, initiate_dispute, finalize_market)

**Status:** 🔄 IN PROGRESS
**Started:** November 5, 2025
**Tier:** Tier 1 (Foundation - Comprehensive DoD)

---

## 📋 Story Overview

**Epic:** Week 1 - Project Setup & Foundation
**Story:** Day 5 - Resolution Instructions
**Dependencies:**
- STORY-1.1 (Anchor Setup) ✅ Complete
- STORY-1.2 (Account Structures) ✅ Complete
- STORY-1.3 (Lifecycle Instructions) ✅ Complete
- STORY-1.4 (Trading Instructions) ✅ Complete

**Objective:** Implement the 3 resolution instructions that enable markets to transition from ACTIVE trading state through resolution proposal, optional dispute, and final outcome determination. These instructions implement the critical 6-state FSM that ensures fair market resolution.

**Estimated Time:** 8-10 hours
**Risk Level:** Medium-High (complex state machine, timing validations, dispute logic)

---

## ✅ Acceptance Criteria

### Instruction 7: resolve_market()

**Purpose:** Propose market resolution (ACTIVE → RESOLVING, starts dispute window)

**Requirements:**
- [x] **Context Accounts:**
  - `global_config` (seeds=[b"global-config"], bump) - Protocol configuration
  - `market` (mut, seeds=[b"market", market_id], bump) - Market to resolve
  - `resolver` (signer, mut) - User proposing resolution
  - (No resolver validation on-chain, reputation checked by frontend/backend)

- [ ] **Arguments:**
  - `outcome: Option<bool>` - Proposed outcome (Some(true)=YES, Some(false)=NO, None=INVALID)
  - `ipfs_evidence_hash: [u8; 46]` - IPFS CID with resolution evidence

- [ ] **Functionality:**
  - [ ] Validate market state == ACTIVE
  - [ ] Validate market has ended (current_time >= resolution deadline, if exists)
  - [ ] Set proposed outcome and evidence hash
  - [ ] Record resolver address
  - [ ] Record resolution_proposed_at timestamp
  - [ ] Initialize resolution vote counters (resolution_agree/disagree = 0)
  - [ ] Transition state: ACTIVE → RESOLVING
  - [ ] Emit MarketResolved event

- [ ] **Error Handling:**
  - [ ] InvalidMarketState (if not ACTIVE)
  - [ ] MarketNotExpired (if called before resolution deadline)
  - [ ] AlreadyResolved (if resolution already proposed)

**Test Cases:**
- [ ] Resolve market with YES outcome
- [ ] Resolve market with NO outcome
- [ ] Resolve market with INVALID outcome
- [ ] Fail if market not ACTIVE
- [ ] Fail if market not expired yet
- [ ] Fail if already resolved
- [ ] Verify state transition to RESOLVING
- [ ] Verify timestamp recorded correctly
- [ ] Verify evidence hash stored

---

### Instruction 8: initiate_dispute()

**Purpose:** Challenge a resolution (RESOLVING → DISPUTED)

**Requirements:**
- [x] **Context Accounts:**
  - `global_config` (seeds=[b"global-config"], bump) - For dispute_period check
  - `market` (mut, seeds=[b"market", market_id], bump) - Market being disputed
  - `initiator` (signer) - User initiating dispute

- [ ] **Arguments:**
  - None (disputes the currently proposed outcome)

- [ ] **Functionality:**
  - [ ] Validate market state == RESOLVING
  - [ ] Validate within dispute window (current_time < resolution_proposed_at + dispute_period)
  - [ ] Record dispute initiator address
  - [ ] Record dispute_initiated_at timestamp
  - [ ] Reset dispute vote counters (dispute_agree/disagree = 0)
  - [ ] Transition state: RESOLVING → DISPUTED
  - [ ] Emit DisputeInitiated event

- [ ] **Error Handling:**
  - [ ] InvalidMarketState (if not RESOLVING)
  - [ ] DisputePeriodEnded (if past dispute window)
  - [ ] AlreadyDisputed (if already in DISPUTED state)

**Test Cases:**
- [ ] Initiate dispute within window (valid)
- [ ] Fail if market not RESOLVING
- [ ] Fail if dispute window expired
- [ ] Fail if already disputed
- [ ] Verify state transition to DISPUTED
- [ ] Verify timestamps recorded
- [ ] Verify dispute votes reset to 0

---

### Instruction 9: finalize_market()

**Purpose:** Set final outcome (RESOLVING/DISPUTED → FINALIZED)

**Requirements:**
- [x] **Context Accounts:**
  - `global_config` (seeds=[b"global-config"], bump) - For thresholds
  - `market` (mut, seeds=[b"market", market_id], bump) - Market to finalize
  - `backend_authority` (signer) - Backend service authority
  - (Validate signer == global_config.backend_authority)

- [ ] **Arguments:**
  - `resolution_agree: u32` - Resolution agree votes (for RESOLVING state)
  - `resolution_disagree: u32` - Resolution disagree votes (for RESOLVING state)
  - `dispute_agree: u32` - Dispute agree votes (for DISPUTED state)
  - `dispute_disagree: u32` - Dispute disagree votes (for DISPUTED state)

- [ ] **Functionality:**
  - [ ] Validate market state == RESOLVING OR DISPUTED
  - [ ] Validate backend_authority is signer
  - [ ] **If RESOLVING:**
    - [ ] Check dispute window expired (current_time >= resolution_proposed_at + dispute_period)
    - [ ] Record resolution vote counts
    - [ ] Final outcome = proposed_outcome (no dispute occurred)
  - [ ] **If DISPUTED:**
    - [ ] Record dispute vote counts
    - [ ] Calculate dispute agreement rate: dispute_agree / (dispute_agree + dispute_disagree)
    - [ ] If dispute_agreement >= 60% (config.dispute_success_threshold):
      - [ ] Flip outcome (YES→NO, NO→YES, INVALID stays INVALID)
    - [ ] Else:
      - [ ] Keep proposed_outcome (dispute failed)
  - [ ] Set final_outcome field
  - [ ] Record finalized_at timestamp
  - [ ] Set was_disputed flag appropriately
  - [ ] Transition state: RESOLVING/DISPUTED → FINALIZED
  - [ ] Emit MarketFinalized event

- [ ] **Error Handling:**
  - [ ] InvalidMarketState (if not RESOLVING or DISPUTED)
  - [ ] Unauthorized (if not backend_authority)
  - [ ] DisputePeriodNotEnded (if trying to finalize RESOLVING before window expires)
  - [ ] NoVotesRecorded (if total votes == 0)

**Test Cases:**
- [ ] Finalize from RESOLVING (no dispute, after window)
- [ ] Finalize from DISPUTED with dispute success (flip outcome)
- [ ] Finalize from DISPUTED with dispute failure (keep outcome)
- [ ] Fail if not backend_authority
- [ ] Fail if dispute window not expired (RESOLVING case)
- [ ] Fail if invalid state
- [ ] Verify state transition to FINALIZED
- [ ] Verify final_outcome set correctly
- [ ] Verify was_disputed flag set correctly
- [ ] Test outcome flipping logic (YES→NO, NO→YES, INVALID→INVALID)
- [ ] Test with zero votes (should error)
- [ ] Test threshold boundary (59.9% vs 60.0% vs 60.1%)

---

## 📂 Technical Implementation

### Definition of Done Tier

**Selected Tier:** Tier 1 (Foundation - Comprehensive DoD)

**Rationale:** Resolution instructions are critical state machine logic. They require:
- Comprehensive testing (state transitions, timing, thresholds)
- Security validation (access control, timing checks)
- Blueprint compliance (exact FSM implementation)
- Complete documentation (complex state machine)

This is foundation code that all claiming and withdrawal features depend on.

---

### Files to Create

**Instruction Modules:**
- [ ] `programs/zmart-core/src/instructions/resolve_market.rs`
  - ResolveMarket context struct
  - handler() function with state transition logic
  - Tests for resolution flow

- [ ] `programs/zmart-core/src/instructions/initiate_dispute.rs`
  - InitiateDispute context struct
  - handler() function with timing validation
  - Tests for dispute flow

- [ ] `programs/zmart-core/src/instructions/finalize_market.rs`
  - FinalizeMarket context struct
  - handler() function with outcome determination logic
  - Tests for finalization flow (both RESOLVING and DISPUTED paths)

---

### Files to Modify

- [ ] `programs/zmart-core/src/instructions/mod.rs`
  - Export resolve_market, initiate_dispute, finalize_market modules

- [ ] `programs/zmart-core/src/lib.rs`
  - Add 3 instruction handlers to program module

- [ ] `programs/zmart-core/src/error.rs` (if needed)
  - Add MarketNotExpired, DisputePeriodEnded, DisputePeriodNotEnded, AlreadyResolved, AlreadyDisputed

- [ ] `programs/zmart-core/src/state.rs` (if needed)
  - Add events: MarketResolved, DisputeInitiated, MarketFinalized

---

### Dependencies

**Must Complete First:**
- ✅ STORY-1.3: Market lifecycle (create_market, approve_proposal, activate_market)

**Blocks:**
- STORY-1.6: claim_winnings (needs FINALIZED state)
- STORY-1.6: withdraw_liquidity (needs FINALIZED state)

**Related:**
- STORY-2.1: Vote aggregation backend (provides vote counts to finalize_market)

---

### External Dependencies

- [x] Anchor framework
- [x] MarketAccount with state machine fields
- [x] GlobalConfig with timing parameters
- [ ] Clock::get() for timestamp checks

---

## 🧪 Testing Strategy

### Unit Tests (Comprehensive)

**State Machine Tests:**
- [ ] resolve_market transitions ACTIVE → RESOLVING
- [ ] initiate_dispute transitions RESOLVING → DISPUTED
- [ ] finalize_market transitions RESOLVING → FINALIZED
- [ ] finalize_market transitions DISPUTED → FINALIZED
- [ ] Invalid transitions rejected (e.g., PROPOSED → RESOLVING)

**Timing Validation Tests:**
- [ ] resolve_market fails if market not expired
- [ ] initiate_dispute succeeds within dispute window
- [ ] initiate_dispute fails after dispute window
- [ ] finalize_market fails before dispute window expires (RESOLVING case)
- [ ] finalize_market succeeds after dispute window expires

**Outcome Logic Tests:**
- [ ] Finalize with YES outcome (no dispute)
- [ ] Finalize with NO outcome (no dispute)
- [ ] Finalize with INVALID outcome (no dispute)
- [ ] Dispute success flips YES → NO
- [ ] Dispute success flips NO → YES
- [ ] Dispute success keeps INVALID → INVALID
- [ ] Dispute failure keeps original outcome

**Threshold Tests:**
- [ ] Dispute success at exactly 60% threshold
- [ ] Dispute success at 61% (above threshold)
- [ ] Dispute failure at 59% (below threshold)
- [ ] Edge case: 50/50 split (should fail dispute)
- [ ] Edge case: 100% agreement (should succeed)

**Access Control Tests:**
- [ ] resolve_market: any user can call
- [ ] initiate_dispute: any user can call
- [ ] finalize_market: only backend_authority can call

**Edge Cases:**
- [ ] Resolve with zero votes recorded (should work)
- [ ] Finalize with zero votes (should error)
- [ ] Multiple dispute attempts (only first succeeds)
- [ ] Resolve already resolved market (should error)
- [ ] Dispute window exactly at boundary (equal to deadline)

---

### Integration Tests

**Full Resolution Flow (Happy Path):**
- [ ] Create → Approve → Activate → Trade → Resolve → Wait → Finalize
- [ ] Verify timestamps progress correctly
- [ ] Verify states transition correctly
- [ ] Verify final_outcome set correctly

**Dispute Flow (Dispute Success):**
- [ ] Activate → Trade → Resolve(YES) → Dispute → Finalize(60%+ agree) → Outcome=NO
- [ ] Verify dispute vote counts recorded
- [ ] Verify outcome flipped
- [ ] Verify was_disputed flag set

**Dispute Flow (Dispute Failure):**
- [ ] Activate → Trade → Resolve(NO) → Dispute → Finalize(59% agree) → Outcome=NO
- [ ] Verify outcome unchanged
- [ ] Verify was_disputed flag set

**Timing Edge Cases:**
- [ ] Dispute at last second of window (should succeed)
- [ ] Dispute 1 second after window (should fail)
- [ ] Finalize immediately after dispute window (should succeed)

---

### Manual Testing Checklist

- [ ] Deploy to devnet
- [ ] Create and activate test market
- [ ] Advance time to resolution deadline
- [ ] Resolve market with evidence hash
- [ ] Verify RESOLVING state
- [ ] Initiate dispute
- [ ] Verify DISPUTED state
- [ ] Finalize with vote counts
- [ ] Verify FINALIZED state
- [ ] Check Solana Explorer for events
- [ ] Verify compute units used (<200k)

---

## 🔍 Implementation Notes

### Approach

**1. State Machine Validation:**

Each instruction validates current state and only allows specific transitions:
```rust
// resolve_market
require!(market.state == MarketState::Active, ErrorCode::InvalidMarketState);
market.state = MarketState::Resolving;

// initiate_dispute
require!(market.state == MarketState::Resolving, ErrorCode::InvalidMarketState);
market.state = MarketState::Disputed;

// finalize_market
require!(
    market.state == MarketState::Resolving || market.state == MarketState::Disputed,
    ErrorCode::InvalidMarketState
);
market.state = MarketState::Finalized;
```

**2. Timing Validation:**

Use Clock::get() for timestamp checks:
```rust
let clock = Clock::get()?;

// resolve_market: Check if market expired (optional, depends on resolution_deadline field)
// For now, skip this check (markets can be resolved anytime after ACTIVE)

// initiate_dispute: Must be within dispute window
let dispute_deadline = market.resolution_proposed_at
    .checked_add(config.dispute_period_seconds).ok_or(ErrorCode::OverflowError)?;
require!(clock.unix_timestamp < dispute_deadline, ErrorCode::DisputePeriodEnded);

// finalize_market (from RESOLVING): Must be after dispute window
require!(clock.unix_timestamp >= dispute_deadline, ErrorCode::DisputePeriodNotEnded);
```

**3. Outcome Determination Logic:**

```rust
let final_outcome = if market.state == MarketState::Disputed {
    // Check if dispute succeeded (≥60% agreement)
    let total_dispute_votes = dispute_agree.checked_add(dispute_disagree).ok_or(ErrorCode::OverflowError)?;
    require!(total_dispute_votes > 0, ErrorCode::NoVotesRecorded);

    let dispute_agreement_bps = (dispute_agree as u64)
        .checked_mul(10000).ok_or(ErrorCode::OverflowError)?
        .checked_div(total_dispute_votes as u64).ok_or(ErrorCode::DivisionByZero)?;

    if dispute_agreement_bps >= config.dispute_success_threshold_bps {
        // Dispute succeeded → flip outcome
        match market.proposed_outcome {
            Some(true) => Some(false),   // YES → NO
            Some(false) => Some(true),   // NO → YES
            None => None,                // INVALID stays INVALID
        }
    } else {
        // Dispute failed → keep proposed outcome
        market.proposed_outcome
    }
} else {
    // No dispute → use proposed outcome
    market.proposed_outcome
};

market.final_outcome = final_outcome;
```

**4. Vote Recording:**

Backend passes vote counts, we record them:
```rust
market.resolution_agree = resolution_agree;
market.resolution_disagree = resolution_disagree;
market.resolution_total_votes = resolution_agree.checked_add(resolution_disagree).ok_or(ErrorCode::OverflowError)?;

market.dispute_agree = dispute_agree;
market.dispute_disagree = dispute_disagree;
market.dispute_total_votes = dispute_agree.checked_add(dispute_disagree).ok_or(ErrorCode::OverflowError)?;
```

---

### Alternatives Considered

**Option A: Auto-finalize after dispute window** ⭐ **SELECTED**
- **Approach**: Backend monitors markets and calls finalize_market when ready
- **Selected**: Aligns with blueprint hybrid architecture (off-chain monitoring, on-chain execution)

**Option B: Permissionless finalize with automatic checks**
- **Approach**: Anyone can call finalize, instruction checks if window expired
- **Rejected**: More complex, higher compute units, opens attack surface

**Option C: On-chain timer with Clockwork**
- **Approach**: Use Clockwork to schedule automatic finalization
- **Rejected**: External dependency, not in MVP scope

---

### Risks & Mitigation

**Risk 1: Clock Manipulation**
- **Description**: Validators could manipulate Clock::get() timestamp
- **Mitigation**:
  - Solana clock is BFT consensus-based (very hard to manipulate)
  - Use timestamp checks for ~hours/days (not seconds precision)
  - Backend monitoring provides additional safety

**Risk 2: Dispute Window Edge Cases**
- **Description**: Disputes at exact boundary of window (equal to deadline)
- **Mitigation**:
  - Use strict inequality (`<` not `<=`) for "within window" checks
  - Use `>=` for "after window" checks
  - Clear test cases for boundary conditions

**Risk 3: Outcome Flipping Logic Errors**
- **Description**: Incorrect logic could flip INVALID outcomes or not flip YES/NO
- **Mitigation**:
  - Explicit match statement with all cases
  - Comprehensive tests for all outcome combinations
  - INVALID → INVALID explicitly coded

**Risk 4: Zero Vote Edge Cases**
- **Description**: Finalizing with zero votes could cause division by zero
- **Mitigation**:
  - Check `total_votes > 0` before calculating percentages
  - Return error if no votes recorded

**Risk 5: Backend Authority Compromise**
- **Description**: If backend_authority key compromised, could finalize incorrectly
- **Mitigation**:
  - Backend authority uses multi-sig in production
  - Vote counts verifiable via event logs
  - Future: Timelock on sensitive operations

---

## ⏱️ Time Breakdown (Estimated)

### Day 5 (8-10 hours):
- [x] Create STORY-1.5.md (1 hour)
- [ ] Implement resolve_market instruction (1.5 hours)
  - [ ] Context struct
  - [ ] Handler with state transition
  - [ ] Unit tests
- [ ] Implement initiate_dispute instruction (1.5 hours)
  - [ ] Context struct
  - [ ] Handler with timing validation
  - [ ] Unit tests
- [ ] Implement finalize_market instruction (2-3 hours)
  - [ ] Context struct
  - [ ] Handler with outcome logic
  - [ ] Comprehensive unit tests (many edge cases)
- [ ] Integration tests (1.5-2 hours)
  - [ ] Full resolution flow
  - [ ] Dispute success flow
  - [ ] Dispute failure flow
- [ ] Add missing error codes and events (0.5 hour)
- [ ] Final verification and DoD checklist (0.5-1 hour)

**Total: 8-10 hours**

---

## 📊 Definition of Done - Tier 1 Checklist

### Code Quality (8/8)

- [ ] **Functionality Complete**: All 3 instructions work as specified
- [ ] **Error Handling**: All error cases handled with descriptive codes
- [ ] **Code Style**: Follows Rust/Anchor conventions (rustfmt + clippy)
- [ ] **Comments**: Complex state machine logic documented inline
- [ ] **No Warnings**: clippy and compiler warnings resolved
- [ ] **DRY Principle**: Shared validation logic extracted
- [ ] **Security**: Checked arithmetic, timing validation, access control
- [ ] **Blueprint Compliance**: FSM matches CORE_LOGIC_INVARIANTS.md exactly

### Testing (5/5)

- [ ] **Unit Tests**: 100% coverage of state transitions and outcome logic
- [ ] **Integration Tests**: Full resolution + dispute flows tested
- [ ] **Edge Cases**: Timing boundaries, thresholds, zero votes covered
- [ ] **All Tests Pass**: 100% pass rate
- [ ] **Performance**: Compute units <200k per instruction

### Documentation (2/2)

- [ ] **Story Complete**: This file updated with implementation notes
- [ ] **Inline Docs**: All public functions documented (doc comments)

### Git Workflow (2/2)

- [ ] **Feature Branch**: work/story-1.5-resolution
- [ ] **Atomic Commit**: Single commit with message "feat: Implement resolution instructions (Story 1.5)"

### Security (3/3)

- [ ] **Checked Arithmetic**: All math operations use checked_add/sub/mul
- [ ] **Access Control**: Backend authority validated, state transitions enforced
- [ ] **Timing Validation**: All time-based checks use Clock::get() properly

### Performance (3/3)

- [ ] **Efficient Instructions**: No expensive operations
- [ ] **Build Time**: <20s clean, <5s incremental
- [ ] **Test Execution**: <5s for all tests

**Total: 18/18 Criteria** (Tier 1 - Foundation)

---

## 📝 Completion Notes

**Completed**: [YYYY-MM-DD]
**Actual Time**: [X hours]
**Variance**: [+/- Y hours from 8-10h estimate]

### What Went Well
- [TBD after implementation]

### What Didn't Go Well
- [TBD after implementation]

### Lessons Learned
- [TBD after implementation]

### Follow-Up Tasks
- [ ] STORY-1.6: claim_winnings + withdraw_liquidity (depends on FINALIZED state)
- [ ] Add MarketResolved, DisputeInitiated, MarketFinalized events
- [ ] Backend monitoring service to auto-call finalize_market after window

---

## 📚 References

**Core Documentation:**
- **CORE_LOGIC_INVARIANTS.md** Section 2: Market States & Lifecycle
- **CORE_LOGIC_INVARIANTS.md** Section 5: Resolution Process (7-step workflow)
- **03_SOLANA_PROGRAM_DESIGN.md**: Instructions 6-8 (resolve, dispute, finalize)

**Related Stories:**
- **STORY-1.3**: Lifecycle instructions (state machine foundation)
- **STORY-1.4**: Trading instructions (markets must be ACTIVE to trade)

**Blueprint Reference:**
- Blueprint defines 6-state FSM: PROPOSED → APPROVED → ACTIVE → RESOLVING → DISPUTED → FINALIZED
- Timing: 48-hour dispute window, 75% resolution threshold, 50% dispute threshold

**External Resources:**
- [Solana Clock](https://docs.solana.com/developing/runtime-facilities/sysvars#clock)
- [Anchor Book - Clock](https://book.anchor-lang.com/anchor_in_depth/the_program_module.html)

---

**Implementation Status**: 🔄 IN PROGRESS
**Next Step**: Implement resolve_market instruction
**Confidence Level**: 🟢 HIGH (state machine clear, Day 4 momentum strong)