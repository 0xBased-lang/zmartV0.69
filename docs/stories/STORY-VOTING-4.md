# STORY-VOTING-4: Aggregate Dispute Votes Instruction

**Story ID:** STORY-VOTING-4
**Phase:** 1 (Voting System Foundation)
**Week:** 1
**Instruction:** 4/4 (aggregate_dispute_votes) - **FINAL WEEK 1 INSTRUCTION!** 🎯
**Estimated Time:** 2 hours (1.5h naive + 33% TDD buffer)
**Priority:** P0 (Critical Path)
**Dependencies:** STORY-VOTING-3 (submit_dispute_vote), STORY-VOTING-2 (aggregate_proposal_votes pattern)

---

## 🎯 User Story

**As a** backend service (vote aggregator)
**I want to** submit aggregated dispute vote counts to the on-chain program
**So that** disputes with 60%+ agreement result in resolution rejection and return to RESOLVING state

---

## 📋 Requirements

### Functional Requirements

1. **Backend Authority Only**
   - Only backend_authority (from GlobalConfig) can call this instruction
   - Prevents unauthorized vote manipulation
   - Clear error if non-authority attempts aggregation

2. **Vote Count Parameters**
   - Accept `final_agrees: u32` (total "agree with dispute" votes)
   - Accept `final_disagrees: u32` (total "disagree with dispute" votes)
   - Counts must be non-negative (u32 enforces this)

3. **Record Counts On-Chain**
   - Store `final_agrees` in `MarketAccount.dispute_agree`
   - Store `final_disagrees` in `MarketAccount.dispute_disagree`
   - Calculate and store `dispute_total_votes` (agrees + disagrees)
   - Persistent audit trail of vote counts

4. **Calculate Dispute Agreement Percentage**
   - Formula: `(agrees / total_votes) * 100`
   - Handle zero votes edge case (0% agreement = dispute fails)
   - Use checked arithmetic (overflow protection)

5. **Check 60% Threshold**
   - Per blueprint: 60% agreement threshold for dispute success
   - Use `market.dispute_succeeded(config.dispute_success_threshold)`
   - If `agreement_percentage >= 60%` → dispute succeeds
   - If `agreement_percentage < 60%` → dispute fails

6. **State Transition (Critical Logic!)**
   - **Dispute Succeeds (>=60% agree):**
     - From: `MarketState::Disputed`
     - To: `MarketState::Resolving`
     - Reason: Resolution rejected, needs new resolution
     - Set `was_disputed = true` (audit trail)

   - **Dispute Fails (<60% agree):**
     - From: `MarketState::Disputed`
     - To: `MarketState::Finalized`
     - Reason: Original resolution accepted
     - Set `resolved_at` timestamp
     - Set `was_disputed = true` (audit trail)

7. **Event Emission**
   - Emit `DisputeAggregated` event (always)
   - Include: market_id, agrees, disagrees, agreement_percentage, dispute_succeeded (bool), timestamp
   - Backend listens for this event to update database

### Non-Functional Requirements

1. **Security**
   - Constraint-based authority check (gas efficient)
   - State machine validation (only DISPUTED markets)
   - Checked arithmetic (overflow/underflow protection)
   - No reentrancy possible (no external calls)

2. **Performance**
   - Single instruction call (no loops)
   - Minimal compute units (< 12,000 CU)
   - O(1) complexity

3. **Auditability**
   - Vote counts stored on-chain
   - Timestamps recorded
   - Event emitted for off-chain tracking
   - VoteRecords remain on-chain (proof of votes)
   - `was_disputed` flag preserves history

---

## 🏗️ Implementation Plan

### 1. Error Codes (Reuse Existing)

**Review existing errors:**
- ✅ `ErrorCode::Unauthorized` (6400) - Already defined
- ✅ `ErrorCode::InvalidStateForVoting` (6701) - Already defined
- ✅ `ErrorCode::OverflowError` (6500) - Already defined

**No new error codes needed!**

### 2. Account Structure

```rust
/// Aggregate dispute votes and transition state based on threshold
#[derive(Accounts)]
pub struct AggregateDisputeVotes<'info> {
    /// Market account (must be in DISPUTED state)
    #[account(
        mut,
        seeds = [b"market", &market.market_id],
        bump = market.bump,
        constraint = market.state == MarketState::Disputed @ ErrorCode::InvalidStateForVoting
    )]
    pub market: Account<'info, MarketAccount>,

    /// Global config (contains backend authority and dispute threshold)
    #[account(
        seeds = [b"global_config"],
        bump = global_config.bump,
    )]
    pub global_config: Account<'info, GlobalConfig>,

    /// Backend authority (must match global config)
    #[account(
        constraint = backend_authority.key() == global_config.backend_authority @ ErrorCode::Unauthorized
    )]
    pub backend_authority: Signer<'info>,
}
```

**Account Validation:**
- ✅ Market PDA derivation (security)
- ✅ DISPUTED state constraint (state machine)
- ✅ GlobalConfig PDA derivation (security)
- ✅ Backend authority match (authorization)

### 3. Handler Logic

```rust
pub fn handler(
    ctx: Context<AggregateDisputeVotes>,
    final_agrees: u32,
    final_disagrees: u32,
) -> Result<()> {
    let market = &mut ctx.accounts.market;
    let global_config = &ctx.accounts.global_config;
    let clock = Clock::get()?;

    // Record vote counts on-chain
    market.dispute_agree = final_agrees;
    market.dispute_disagree = final_disagrees;

    // Calculate total votes with overflow protection
    let total_votes = final_agrees
        .checked_add(final_disagrees)
        .ok_or(ErrorCode::OverflowError)?;

    market.dispute_total_votes = total_votes;

    // Calculate agreement percentage using helper method
    // Returns: (agrees / total) * 10000 >= threshold_bps
    let dispute_succeeded = market.dispute_succeeded(global_config.dispute_success_threshold);

    // Calculate percentage for event (0-100)
    let agreement_percentage = if total_votes > 0 {
        ((final_agrees as u64)
            .checked_mul(100)
            .ok_or(ErrorCode::OverflowError)?
            / (total_votes as u64)) as u8
    } else {
        0u8 // Zero votes = 0% agreement = dispute fails
    };

    // State transition based on dispute outcome
    if dispute_succeeded {
        // >=60% agree: Resolution rejected, return to RESOLVING
        market.state = MarketState::Resolving;
        market.was_disputed = true;
        // Note: resolution_proposed_at remains set (for dispute period calculation)
    } else {
        // <60% agree: Original resolution accepted, finalize market
        market.state = MarketState::Finalized;
        market.resolved_at = clock.unix_timestamp;
        market.was_disputed = true;
    }

    // Emit event (always, for monitoring)
    emit!(DisputeAggregated {
        market_id: market.market_id,
        agrees: final_agrees,
        disagrees: final_disagrees,
        agreement_percentage,
        dispute_succeeded,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}
```

### 4. Event Definition

```rust
/// Dispute votes aggregated and resolution decision made
#[event]
pub struct DisputeAggregated {
    pub market_id: [u8; 32],
    pub agrees: u32,
    pub disagrees: u32,
    pub agreement_percentage: u8, // 0-100
    pub dispute_succeeded: bool, // true if >= 60%
    pub timestamp: i64,
}
```

### 5. Program Entry Point

```rust
// In programs/zmart-core/src/lib.rs
/// Aggregate dispute votes and check dispute threshold
///
/// Backend authority aggregates votes off-chain (from VoteRecords) and submits
/// final counts. If 60%+ agree with dispute, resolution is rejected and market
/// returns to RESOLVING state. If <60%, original resolution stands and market
/// transitions to FINALIZED.
///
/// # Arguments
///
/// * `final_agrees` - Total number of "agree with dispute" votes
/// * `final_disagrees` - Total number of "disagree with dispute" votes
///
/// # Behavior
///
/// * Records vote counts in MarketAccount
/// * Calculates agreement percentage
/// * If >= 60% agree: transitions to RESOLVING (resolution rejected)
/// * If < 60% agree: transitions to FINALIZED (resolution accepted)
/// * Emits DisputeAggregated event
///
/// # Errors
///
/// * `ErrorCode::Unauthorized` - Caller is not backend authority
/// * `ErrorCode::InvalidStateForVoting` - Market not in DISPUTED state
/// * `ErrorCode::OverflowError` - Vote count overflow (extremely unlikely)
pub fn aggregate_dispute_votes(
    ctx: Context<AggregateDisputeVotes>,
    final_agrees: u32,
    final_disagrees: u32,
) -> Result<()> {
    aggregate_dispute_votes::handler(ctx, final_agrees, final_disagrees)
}
```

---

## 🧪 Test Cases (TDD Approach)

### Test 1: Aggregate with Exactly 60% Agreement (Edge Case - Dispute Succeeds)

```rust
#[tokio::test]
async fn test_aggregate_dispute_votes_exactly_60_percent() {
    // Setup: Create market in DISPUTED state
    // Setup: Backend authority from global config

    // Execute: aggregate_dispute_votes(60, 40)
    // 60 / 100 = 60.0% (exactly threshold)

    // Assert: market.state == MarketState::Resolving (dispute succeeded)
    // Assert: market.was_disputed == true
    // Assert: market.dispute_agree == 60
    // Assert: market.dispute_disagree == 40
    // Assert: market.dispute_total_votes == 100
    // Assert: Event emitted with dispute_succeeded=true, agreement_percentage=60
}
```

### Test 2: Aggregate with >60% Agreement (Dispute Succeeds)

```rust
#[tokio::test]
async fn test_aggregate_dispute_votes_above_threshold() {
    // Setup: Create market in DISPUTED state

    // Execute: aggregate_dispute_votes(75, 25)
    // 75 / 100 = 75.0% (above threshold)

    // Assert: market.state == MarketState::Resolving
    // Assert: market.was_disputed == true
    // Assert: Event emitted with dispute_succeeded=true, agreement_percentage=75
}
```

### Test 3: Aggregate with <60% Agreement (Dispute Fails)

```rust
#[tokio::test]
async fn test_aggregate_dispute_votes_below_threshold() {
    // Setup: Create market in DISPUTED state

    // Execute: aggregate_dispute_votes(50, 50)
    // 50 / 100 = 50.0% (below threshold)

    // Assert: market.state == MarketState::Finalized (dispute failed)
    // Assert: market.resolved_at > 0 (timestamp set)
    // Assert: market.was_disputed == true
    // Assert: market.dispute_agree == 50
    // Assert: market.dispute_disagree == 50
    // Assert: Event emitted with dispute_succeeded=false, agreement_percentage=50
}
```

### Test 4: Aggregate with Zero Votes (Edge Case - Dispute Fails)

```rust
#[tokio::test]
async fn test_aggregate_dispute_votes_zero_votes() {
    // Setup: Create market in DISPUTED state

    // Execute: aggregate_dispute_votes(0, 0)
    // 0 / 0 = undefined → 0% agreement (by design)

    // Assert: market.state == MarketState::Finalized (0% < 60%)
    // Assert: market.dispute_agree == 0
    // Assert: market.dispute_disagree == 0
    // Assert: market.dispute_total_votes == 0
    // Assert: Event emitted with dispute_succeeded=false, agreement_percentage=0
}
```

### Test 5: Unauthorized Aggregator Fails

```rust
#[tokio::test]
async fn test_aggregate_dispute_votes_unauthorized() {
    // Setup: Create market in DISPUTED state
    // Setup: Use NON-backend-authority signer

    // Execute: aggregate_dispute_votes(60, 40)

    // Assert: Fails with ErrorCode::Unauthorized (6400)
    // Assert: Constraint catches this before handler execution
}
```

### Test 6: Wrong State Fails

```rust
#[tokio::test]
async fn test_aggregate_dispute_votes_wrong_state() {
    // Setup: Create market in PROPOSED state (not DISPUTED)

    // Execute: aggregate_dispute_votes(60, 40)

    // Assert: Fails with ErrorCode::InvalidStateForVoting (6701)
    // Assert: Constraint catches this at accounts level
}
```

### Test 7: Dispute Success Returns to RESOLVING

```rust
#[tokio::test]
async fn test_aggregate_dispute_votes_success_returns_to_resolving() {
    // Setup: Create market in DISPUTED state
    // Setup: Original resolution_proposed_at timestamp set

    // Execute: aggregate_dispute_votes(70, 30) [70% - dispute succeeds]

    // Assert: market.state == MarketState::Resolving
    // Assert: market.was_disputed == true
    // Assert: market.resolution_proposed_at still set (not cleared)
    // Assert: Market can receive new resolution proposal
}
```

### Test 8: Dispute Failure Finalizes Market

```rust
#[tokio::test]
async fn test_aggregate_dispute_votes_failure_finalizes() {
    // Setup: Create market in DISPUTED state
    // Setup: Original resolution proposal (outcome stored)

    // Execute: aggregate_dispute_votes(40, 60) [40% - dispute fails]

    // Assert: market.state == MarketState::Finalized
    // Assert: market.resolved_at > 0 (timestamp set)
    // Assert: market.was_disputed == true
    // Assert: market.final_outcome == original resolution (preserved)
}
```

### Test 9: Overflow Protection (Extreme Edge Case)

```rust
#[tokio::test]
async fn test_aggregate_dispute_votes_overflow_protection() {
    // Setup: Create market in DISPUTED state

    // Execute: aggregate_dispute_votes(u32::MAX, u32::MAX)
    // Total votes would overflow u32

    // Assert: Fails with ErrorCode::OverflowError
    // Assert: checked_add catches this
}
```

### Test 10: Percentage Calculation Accuracy

```rust
#[tokio::test]
async fn test_aggregate_dispute_votes_percentage_calculation() {
    // Test various vote combinations for accuracy

    // Execute: aggregate_dispute_votes(6, 4) [60.0%]
    // Assert: agreement_percentage == 60, dispute_succeeded=true

    // Execute: aggregate_dispute_votes(59, 41) [59.0%]
    // Assert: agreement_percentage == 59, dispute_succeeded=false

    // Execute: aggregate_dispute_votes(61, 39) [61.0%]
    // Assert: agreement_percentage == 61, dispute_succeeded=true
}
```

---

## 🔬 Ultrathink Analysis: Design Decisions

### 🤔 Question 1: What happens when dispute succeeds (>=60%)?

**Options:**
1. **Return to RESOLVING** (allow new resolution proposal)
2. **Return to ACTIVE** (restart trading)
3. **Cancel market** (refund all traders)

**Analysis:**
- Option 1:
  - ✅ Resolution was wrong, need new resolution
  - ✅ Preserves market integrity
  - ✅ Resolver can propose correct outcome
  - ✅ Blueprint pattern

- Option 2:
  - ❌ Resolution period already passed
  - ❌ Would confuse state machine
  - ❌ Not in blueprint

- Option 3:
  - ❌ Too destructive
  - ❌ Traders lose positions
  - ❌ Not in blueprint

**Decision: Option 1 (Return to RESOLVING)**

**Implementation:**
```rust
if dispute_succeeded {
    market.state = MarketState::Resolving;
    market.was_disputed = true;
}
```

**Rationale:**
- Blueprint logic: Dispute success = resolution rejected
- New resolver can propose correct outcome
- State machine: DISPUTED → RESOLVING (forward progress)
- Preserves market value (no cancellation)

**Blueprint Compliance:**
- Blueprint shows DISPUTED → RESOLVING transition
- "Dispute success means resolution was wrong"
- ✅ Compliant

---

### 🤔 Question 2: What happens when dispute fails (<60%)?

**Options:**
1. **Finalize market** (original resolution stands)
2. **Stay in DISPUTED** (allow re-aggregation)
3. **Return to RESOLVING** (allow re-resolution anyway)

**Analysis:**
- Option 1:
  - ✅ Original resolution accepted by community
  - ✅ Clear finality (market complete)
  - ✅ Traders can claim winnings
  - ✅ Blueprint pattern

- Option 2:
  - ⚠️ Allows unlimited re-aggregation
  - ⚠️ Market never finalizes
  - ❌ Bad UX

- Option 3:
  - ❌ Community voted to accept resolution
  - ❌ Ignores vote result
  - ❌ Not in blueprint

**Decision: Option 1 (Finalize Market)**

**Implementation:**
```rust
if !dispute_succeeded {
    market.state = MarketState::Finalized;
    market.resolved_at = clock.unix_timestamp;
    market.was_disputed = true;
}
```

**Rationale:**
- Community voted to accept original resolution
- <60% agreement = resolution is correct
- Market should finalize (traders claim winnings)
- Clear endpoint (no infinite loops)

**Blueprint Compliance:**
- Blueprint shows DISPUTED → FINALIZED transition
- "Dispute failure means resolution accepted"
- ✅ Compliant

---

### 🤔 Question 3: Should we clear resolution data when dispute succeeds?

**Context:** When dispute succeeds, market returns to RESOLVING. Should we:
- Clear `final_outcome`?
- Clear `resolution_proposed_at`?
- Clear `resolver` pubkey?

**Options:**
1. **Keep resolution data** (for audit trail)
2. **Clear resolution data** (fresh start)

**Analysis:**
- Option 1:
  - ✅ Preserves history (what was disputed)
  - ✅ Audit trail (see rejected resolution)
  - ✅ Less code (no clearing logic)
  - ⚠️ Old data remains in fields

- Option 2:
  - ⚠️ Loses history (can't see what was disputed)
  - ⚠️ More code (clearing logic)
  - ✅ Clean state for new resolution

**Decision: Option 1 (Keep Resolution Data)**

**Implementation:**
```rust
if dispute_succeeded {
    market.state = MarketState::Resolving;
    market.was_disputed = true;
    // Note: resolution_proposed_at, final_outcome, resolver remain set
    // New resolution will overwrite these fields
}
```

**Rationale:**
- `was_disputed` flag indicates data is historical
- New resolution will overwrite old data
- Audit trail preserved until overwrite
- Simpler code (no clearing logic)

**Blueprint Compliance:**
- Blueprint doesn't specify data clearing
- Preserving history is safer
- ✅ Compliant

---

### 🤔 Question 4: Should we allow re-aggregation after finalization?

**Options:**
1. **Prevent re-aggregation** (FINALIZED is terminal)
2. **Allow re-aggregation** (can re-enter DISPUTED)

**Analysis:**
- Option 1:
  - ✅ Clear state machine (terminal state)
  - ✅ Finality for traders
  - ✅ Cannot reverse finalization
  - ✅ Blueprint pattern

- Option 2:
  - ❌ Confusing (market "finalized" but not final)
  - ❌ Traders can't claim with confidence
  - ❌ Not in blueprint

**Decision: Option 1 (Prevent Re-Aggregation)**

**Implementation:**
```rust
constraint = market.state == MarketState::Disputed @ ErrorCode::InvalidStateForVoting
```

**Rationale:**
- FINALIZED is terminal state (blueprint)
- Once finalized, traders claim winnings
- Cannot reverse finalization
- Clear, predictable behavior

**Blueprint Compliance:**
- Blueprint shows FINALIZED as terminal
- No transitions from FINALIZED
- ✅ Compliant

---

### 🤔 Question 5: Should we use existing `dispute_succeeded()` helper or inline logic?

**Current Helper:**
```rust
pub fn dispute_succeeded(&self, threshold_bps: u16) -> bool {
    if self.dispute_total_votes == 0 {
        return false;
    }
    let agree_rate = (self.dispute_agree as u64 * 10000) / (self.dispute_total_votes as u64);
    agree_rate >= threshold_bps as u64
}
```

**Options:**
1. **Use helper method** (DRY, tested)
2. **Inline logic** (self-contained)

**Analysis:**
- Option 1:
  - ✅ Code reuse (DRY principle)
  - ✅ Already tested (has unit tests)
  - ✅ Consistent calculation across codebase
  - ✅ Single source of truth

- Option 2:
  - ⚠️ Code duplication
  - ⚠️ Two places to maintain logic
  - ❌ No benefit

**Decision: Option 1 (Use Helper Method)**

**Implementation:**
```rust
let dispute_succeeded = market.dispute_succeeded(global_config.dispute_success_threshold);
```

**Rationale:**
- Helper method already exists and is tested
- DRY principle (single source of truth)
- Consistent with existing codebase patterns
- Less code in instruction handler

**Blueprint Compliance:**
- Blueprint specifies 60% threshold
- Helper implements this correctly
- ✅ Compliant

---

## 📊 Complexity Analysis

### Time Complexity
- **O(1)** - Constant time operations
- No loops, iterations, or recursive calls
- Single arithmetic calculations

### Space Complexity
- **O(1)** - Fixed account sizes
- MarketAccount update (in-place)
- No additional account creation

### Compute Units Estimate
```
Account deserialization:    ~2,500 CU
Constraint checks:          ~1,500 CU
Handler logic:              ~4,000 CU
  - Checked arithmetic:     ~1,000 CU
  - Helper method call:     ~1,500 CU
  - State transitions:      ~1,500 CU
Event emission:             ~2,000 CU
Account serialization:      ~2,000 CU
─────────────────────────────────────
Total:                      ~12,000 CU
```

**Well within limit:** 200,000 CU budget

---

## 🔐 Security Considerations

### 1. Authorization
- ✅ Backend authority constraint (prevents unauthorized aggregation)
- ✅ PDA derivation (prevents account substitution)
- ✅ Signer check (requires private key)

### 2. State Machine
- ✅ DISPUTED state constraint (prevents invalid transitions)
- ✅ Two-way branching (success → RESOLVING, failure → FINALIZED)
- ✅ No backward transitions (FINALIZED is terminal)

### 3. Arithmetic Safety
- ✅ Checked addition (total_votes)
- ✅ Checked multiplication (percentage calculation)
- ✅ Division by zero protection (helper method checks)

### 4. Reentrancy
- ✅ No external calls (no reentrancy possible)
- ✅ State updates before events (safe pattern)

### 5. Access Control
- ✅ Only backend_authority can aggregate
- ✅ Cannot spoof backend_authority (constraint check)
- ✅ Cannot bypass state machine (constraint check)

### 6. Audit Trail
- ✅ `was_disputed` flag preserves history
- ✅ Vote counts stored on-chain
- ✅ Timestamps recorded
- ✅ Event emitted for off-chain tracking

---

## 🎯 Success Criteria

### Implementation Complete When:
- ✅ All 10 tests written (TDD)
- ✅ Instruction handler implemented
- ✅ Account structure defined
- ✅ Event defined
- ✅ Program entry point added
- ✅ Module exports updated

### Tests Pass When:
- ✅ 60% threshold correctly enforced
- ✅ State transitions work (DISPUTED → RESOLVING/FINALIZED)
- ✅ Dispute success returns to RESOLVING
- ✅ Dispute failure finalizes market
- ✅ Unauthorized calls rejected
- ✅ Wrong state calls rejected
- ✅ Zero votes handled gracefully (dispute fails)
- ✅ Overflow protection works

### Blueprint Compliant When:
- ✅ 60% agreement threshold enforced (exact formula)
- ✅ State machine follows blueprint (DISPUTED → RESOLVING/FINALIZED)
- ✅ Backend aggregation pattern (off-chain count, on-chain verify)
- ✅ Vote counts stored on-chain (audit trail)
- ✅ `was_disputed` flag preserves history

---

## 📁 Files to Create/Modify

### 1. Create Instruction Handler
**File:** `programs/zmart-core/src/instructions/aggregate_dispute_votes.rs`
- Account structure
- Handler function
- Event definition

### 2. Update Module Exports
**File:** `programs/zmart-core/src/instructions/mod.rs`
```rust
// Add:
pub mod aggregate_dispute_votes;
pub use aggregate_dispute_votes::*;
```

### 3. Update Program Entry Point
**File:** `programs/zmart-core/src/lib.rs`
```rust
// Add:
pub fn aggregate_dispute_votes(
    ctx: Context<AggregateDisputeVotes>,
    final_agrees: u32,
    final_disagrees: u32,
) -> Result<()> {
    aggregate_dispute_votes::handler(ctx, final_agrees, final_disagrees)
}
```

### 4. Create Tests
**File:** `programs/zmart-core/tests/aggregate_dispute_votes.rs`
- All 10 test cases

---

## 🚀 Implementation Steps (TDD)

### Step 1: Write Tests (1 hour)
1. Create test file: `tests/aggregate_dispute_votes.rs`
2. Write all 10 test cases (copy from STORY-VOTING-2, modify thresholds)
3. Verify tests compile (but fail - no implementation yet)

### Step 2: Implement Instruction (30 mins)
1. Create instruction file: `instructions/aggregate_dispute_votes.rs`
2. Copy `aggregate_proposal_votes.rs` as template
3. Change state constraint: PROPOSED → DISPUTED
4. Change field names: proposal_likes/dislikes → dispute_agree/disagree
5. Change threshold logic: Use helper method
6. Add state branching (success → RESOLVING, failure → FINALIZED)
7. Change event: ProposalAggregated → DisputeAggregated
8. Add module exports
9. Add program entry point

### Step 3: Verify Compilation (10 mins)
1. Run `cargo check` (should pass)
2. Run `anchor build` (should pass)
3. Fix any compilation errors

### Step 4: Run Tests (15 mins)
1. Run `anchor test`
2. Verify all tests pass
3. Fix any failing tests

### Step 5: Integration Testing (5 mins)
1. Deploy to localnet
2. Test instruction with real transactions
3. Verify events emitted correctly
4. Verify state transitions work

---

## 📈 Estimated Time Breakdown

| Task | Naive Estimate | With Buffer | Actual |
|------|----------------|-------------|--------|
| Write tests | 0.75 hours | 1 hour | TBD |
| Implement instruction | 0.5 hours | 0.5 hours | TBD |
| Verify compilation | 0.15 hours | 0.15 hours | TBD |
| Run tests | 0.1 hours | 0.15 hours | TBD |
| Integration testing | 0 hours | 0.2 hours | TBD |
| **TOTAL** | **1.5 hours** | **2 hours** | **TBD** |

**Buffer:** 0.5 hours (33% - conservative due to pattern reuse + state branching logic)

**Confidence:** 95% (very high due to pattern reuse from aggregate_proposal_votes)

---

## 🎓 Learning Notes

### Key Insights from Previous Stories

1. **Pattern Reuse is Fast**
   - 95% similar to aggregate_proposal_votes
   - Copy/modify approach saves time
   - Main change: state branching logic

2. **Helper Methods Reduce Code**
   - `dispute_succeeded()` already tested
   - DRY principle
   - Single source of truth

3. **State Branching is Critical**
   - Success → RESOLVING (new resolution)
   - Failure → FINALIZED (accept original)
   - Clear, deterministic behavior

### New Patterns for This Story

1. **Two-Way State Transition**
   - First instruction with branching state logic
   - Different outcomes based on threshold
   - Both transitions are valid (not error cases)

2. **Audit Trail with `was_disputed`**
   - Boolean flag preserves history
   - Indicates market had dispute (regardless of outcome)
   - Important for analytics

3. **Resolution Data Preservation**
   - Keep rejected resolution data (audit trail)
   - New resolution overwrites old data
   - Simple, clear pattern

### Blueprint Patterns Applied

1. **60% Dispute Threshold**
   - Exact formula from blueprint
   - Lower than proposal threshold (70%)
   - Easier to dispute than approve

2. **State Machine Branching**
   - Success and failure both valid outcomes
   - Clear transitions (no ambiguity)
   - Terminal states (FINALIZED)

3. **Backend Aggregation**
   - Trust backend authority
   - On-chain vote records for proof
   - V2 can add challenge mechanism

---

## 🔗 Related Documentation

- [CORE_LOGIC_INVARIANTS.md](../CORE_LOGIC_INVARIANTS.md) - 60% dispute threshold requirement
- [03_SOLANA_PROGRAM_DESIGN.md](../03_SOLANA_PROGRAM_DESIGN.md) - Instruction spec
- [06_STATE_MANAGEMENT.md](../06_STATE_MANAGEMENT.md) - State machine (DISPUTED → RESOLVING/FINALIZED)
- [07_ON_CHAIN_OFF_CHAIN_INTEGRATION.md](../07_ON_CHAIN_OFF_CHAIN_INTEGRATION.md) - Vote aggregation workflow
- [STORY-VOTING-2.md](./STORY-VOTING-2.md) - aggregate_proposal_votes (template)
- [STORY-VOTING-3.md](./STORY-VOTING-3.md) - submit_dispute_vote (prerequisite)

---

## ✅ Definition of Done

### Code Complete
- [ ] All 10 tests written
- [ ] Instruction handler implemented
- [ ] Event defined
- [ ] Module exports updated
- [ ] Program entry point added

### Tests Passing
- [ ] Test 1: 60% agreement (dispute succeeds) ✅
- [ ] Test 2: >60% agreement (dispute succeeds) ✅
- [ ] Test 3: <60% agreement (dispute fails) ✅
- [ ] Test 4: Zero votes (dispute fails) ✅
- [ ] Test 5: Unauthorized (fail) ✅
- [ ] Test 6: Wrong state (fail) ✅
- [ ] Test 7: Success returns to RESOLVING ✅
- [ ] Test 8: Failure finalizes market ✅
- [ ] Test 9: Overflow protection ✅
- [ ] Test 10: Percentage accuracy ✅

### Quality Gates
- [ ] `cargo check` passes
- [ ] `anchor build` passes
- [ ] No compiler warnings (except unused imports)
- [ ] All tests pass locally
- [ ] Blueprint compliance verified

### Documentation
- [ ] Code comments added
- [ ] Story file complete
- [ ] TODO_CHECKLIST.md updated

---

## 🔄 Pattern Comparison: Proposal vs. Dispute Aggregation

### Similarities (90%)
```rust
// Authorization
#[account(
    constraint = backend_authority.key() == global_config.backend_authority
)]

// Vote recording
market.XXX_agree = final_agrees;
market.XXX_disagree = final_disagrees;
market.XXX_total_votes = total_votes;

// Overflow protection
let total_votes = final_agrees.checked_add(final_disagrees)?;

// Event emission
emit!(XXXAggregated { ... });
```

### Differences (10%)
| Aspect | Proposal | Dispute |
|--------|----------|---------|
| State Constraint | `Proposed` | `Disputed` |
| Field Names | `proposal_likes/dislikes` | `dispute_agree/disagree` |
| Threshold | `70%` | `60%` |
| Success Transition | `PROPOSED → APPROVED` | `DISPUTED → RESOLVING` |
| Failure Behavior | Stay `PROPOSED` | `DISPUTED → FINALIZED` |
| Helper Method | None | `dispute_succeeded()` |

**Implementation Strategy:**
1. Copy `aggregate_proposal_votes.rs`
2. Find/replace: Proposal → Dispute, PROPOSED → DISPUTED, 70 → 60
3. Add state branching logic (if/else for success/failure)
4. Use `dispute_succeeded()` helper method
5. Verify and test
6. Done in ~30 minutes 🚀

---

**Status:** 📝 Story Created - Ready for Implementation
**Next Action:** Begin Step 1 (Write Tests) or Step 2 (Implement - copy/modify)
**Estimated Completion:** 2 hours from start (conservative)
**Confidence:** 95% (pattern reuse + helper method = fast + low risk)

**🎉 FINAL INSTRUCTION OF WEEK 1! LET'S CRUSH IT! 🎉**
