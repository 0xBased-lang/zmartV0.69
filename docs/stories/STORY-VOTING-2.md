# STORY-VOTING-2: Aggregate Proposal Votes Instruction

**Story ID:** STORY-VOTING-2
**Phase:** 1 (Voting System Foundation)
**Week:** 1
**Instruction:** 2/4 (aggregate_proposal_votes)
**Estimated Time:** 7 hours (5h naive + 40% TDD buffer)
**Priority:** P0 (Critical Path)
**Dependencies:** STORY-VOTING-1 (submit_proposal_vote)

---

## 🎯 User Story

**As a** backend service (vote aggregator)
**I want to** submit aggregated vote counts to the on-chain program
**So that** proposals with 70%+ likes are automatically approved

---

## 📋 Requirements

### Functional Requirements

1. **Backend Authority Only**
   - Only backend_authority (from GlobalConfig) can call this instruction
   - Prevents unauthorized vote manipulation
   - Clear error if non-authority attempts aggregation

2. **Vote Count Parameters**
   - Accept `final_likes: u32` (total like votes)
   - Accept `final_dislikes: u32` (total dislike votes)
   - Counts must be non-negative (u32 enforces this)

3. **Record Counts On-Chain**
   - Store `final_likes` in `MarketAccount.proposal_likes`
   - Store `final_dislikes` in `MarketAccount.proposal_dislikes`
   - Persistent audit trail of vote counts

4. **Calculate Approval Percentage**
   - Formula: `(likes / total_votes) * 100`
   - Handle zero votes edge case (0% approval)
   - Use checked arithmetic (overflow protection)

5. **Check 70% Threshold**
   - Per blueprint: 70% like threshold for approval
   - If `likes_percentage >= 70` → APPROVED
   - If `likes_percentage < 70` → stays PROPOSED

6. **State Transition**
   - From: `MarketState::Proposed` (required)
   - To: `MarketState::Approved` (if threshold met)
   - Set `approved_at` timestamp when approved
   - No state change if < 70% (can re-aggregate later)

7. **Event Emission**
   - Emit `ProposalAggregated` event (always)
   - Include: market_id, likes, dislikes, approval_percentage, approved (bool), timestamp
   - Backend listens for this event to update database

### Non-Functional Requirements

1. **Security**
   - Constraint-based authority check (gas efficient)
   - State machine validation (only PROPOSED markets)
   - Checked arithmetic (overflow/underflow protection)
   - No reentrancy possible (no external calls)

2. **Performance**
   - Single instruction call (no loops)
   - Minimal compute units (< 10,000 CU)
   - O(1) complexity

3. **Auditability**
   - Vote counts stored on-chain
   - Timestamp recorded
   - Event emitted for off-chain tracking
   - VoteRecords remain on-chain (proof of votes)

---

## 🏗️ Implementation Plan

### 1. Error Codes (if needed)

**Review existing errors:**
- ✅ `ErrorCode::Unauthorized` (6700) - Already defined
- ✅ `ErrorCode::InvalidStateForVoting` (6701) - Already defined
- ✅ `ErrorCode::Overflow` - Standard Anchor error

**No new error codes needed!**

### 2. Account Structure

```rust
/// Aggregate proposal votes and transition state if threshold met
#[derive(Accounts)]
pub struct AggregateProposalVotes<'info> {
    /// Market account (must be in PROPOSED state)
    #[account(
        mut,
        seeds = [b"market", &market.market_id],
        bump = market.bump,
        constraint = market.state == MarketState::Proposed @ ErrorCode::InvalidStateForVoting
    )]
    pub market: Account<'info, MarketAccount>,

    /// Global config (contains backend authority)
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
- ✅ PROPOSED state constraint (state machine)
- ✅ GlobalConfig PDA derivation (security)
- ✅ Backend authority match (authorization)

### 3. Handler Logic

```rust
pub fn handler(
    ctx: Context<AggregateProposalVotes>,
    final_likes: u32,
    final_dislikes: u32,
) -> Result<()> {
    let market = &mut ctx.accounts.market;
    let clock = Clock::get()?;

    // Record vote counts on-chain
    market.proposal_likes = final_likes;
    market.proposal_dislikes = final_dislikes;

    // Calculate total votes with overflow protection
    let total_votes = final_likes
        .checked_add(final_dislikes)
        .ok_or(ErrorCode::Overflow)?;

    // Calculate approval percentage
    // Formula: (likes / total) * 100
    let likes_percentage = if total_votes > 0 {
        (final_likes as u64)
            .checked_mul(100)
            .ok_or(ErrorCode::Overflow)?
            / (total_votes as u64)
    } else {
        0u64 // Zero votes = 0% approval
    };

    // Check 70% threshold
    const APPROVAL_THRESHOLD: u64 = 70;
    let approved = likes_percentage >= APPROVAL_THRESHOLD;

    if approved {
        // Transition to APPROVED state
        market.state = MarketState::Approved;
        market.approved_at = Some(clock.unix_timestamp);
    }
    // else: stays in PROPOSED (can re-aggregate later)

    // Emit event (always, for monitoring)
    emit!(ProposalAggregated {
        market_id: market.market_id,
        likes: final_likes,
        dislikes: final_dislikes,
        approval_percentage: likes_percentage as u8,
        approved,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}
```

### 4. Event Definition

```rust
/// Proposal votes aggregated and approval decision made
#[event]
pub struct ProposalAggregated {
    pub market_id: [u8; 32],
    pub likes: u32,
    pub dislikes: u32,
    pub approval_percentage: u8, // 0-100
    pub approved: bool, // true if >= 70%
    pub timestamp: i64,
}
```

### 5. Program Entry Point

```rust
// In programs/zmart-core/src/lib.rs
/// Aggregate proposal votes and check approval threshold
///
/// # Arguments
///
/// * `final_likes` - Total number of like votes (from off-chain aggregation)
/// * `final_dislikes` - Total number of dislike votes (from off-chain aggregation)
///
/// # Behavior
///
/// * Records vote counts in MarketAccount
/// * Calculates approval percentage
/// * If >= 70% likes: transitions to APPROVED state
/// * If < 70% likes: stays in PROPOSED (can re-aggregate)
/// * Emits ProposalAggregated event
///
/// # Errors
///
/// * `ErrorCode::Unauthorized` - Caller is not backend authority
/// * `ErrorCode::InvalidStateForVoting` - Market not in PROPOSED state
/// * `ErrorCode::Overflow` - Vote count overflow (extremely unlikely)
pub fn aggregate_proposal_votes(
    ctx: Context<AggregateProposalVotes>,
    final_likes: u32,
    final_dislikes: u32,
) -> Result<()> {
    aggregate_proposal_votes::handler(ctx, final_likes, final_dislikes)
}
```

---

## 🧪 Test Cases (TDD Approach)

### Test 1: Aggregate with Exactly 70% Approval (Edge Case)

```rust
#[tokio::test]
async fn test_aggregate_proposal_votes_exactly_70_percent() {
    // Setup: Create market in PROPOSED state
    // Setup: Backend authority from global config

    // Execute: aggregate_proposal_votes(70, 30)
    // 70 / 100 = 70.0% (exactly threshold)

    // Assert: market.state == MarketState::Approved
    // Assert: market.approved_at == Some(timestamp)
    // Assert: market.proposal_likes == 70
    // Assert: market.proposal_dislikes == 30
    // Assert: Event emitted with approved=true, approval_percentage=70
}
```

### Test 2: Aggregate with >70% Approval (Success)

```rust
#[tokio::test]
async fn test_aggregate_proposal_votes_above_threshold() {
    // Setup: Create market in PROPOSED state

    // Execute: aggregate_proposal_votes(85, 15)
    // 85 / 100 = 85.0% (above threshold)

    // Assert: market.state == MarketState::Approved
    // Assert: market.approved_at.is_some()
    // Assert: Event emitted with approved=true, approval_percentage=85
}
```

### Test 3: Aggregate with <70% Approval (Stays Proposed)

```rust
#[tokio::test]
async fn test_aggregate_proposal_votes_below_threshold() {
    // Setup: Create market in PROPOSED state

    // Execute: aggregate_proposal_votes(60, 40)
    // 60 / 100 = 60.0% (below threshold)

    // Assert: market.state == MarketState::Proposed (no change)
    // Assert: market.approved_at == None (no change)
    // Assert: market.proposal_likes == 60 (recorded)
    // Assert: market.proposal_dislikes == 40 (recorded)
    // Assert: Event emitted with approved=false, approval_percentage=60
}
```

### Test 4: Aggregate with Zero Votes (Edge Case)

```rust
#[tokio::test]
async fn test_aggregate_proposal_votes_zero_votes() {
    // Setup: Create market in PROPOSED state

    // Execute: aggregate_proposal_votes(0, 0)
    // 0 / 0 = undefined → 0% approval (by design)

    // Assert: market.state == MarketState::Proposed (0% < 70%)
    // Assert: market.proposal_likes == 0
    // Assert: market.proposal_dislikes == 0
    // Assert: Event emitted with approved=false, approval_percentage=0
}
```

### Test 5: Unauthorized Aggregator Fails

```rust
#[tokio::test]
async fn test_aggregate_proposal_votes_unauthorized() {
    // Setup: Create market in PROPOSED state
    // Setup: Use NON-backend-authority signer

    // Execute: aggregate_proposal_votes(70, 30)

    // Assert: Fails with ErrorCode::Unauthorized (6700)
    // Assert: Constraint catches this before handler execution
}
```

### Test 6: Wrong State Fails

```rust
#[tokio::test]
async fn test_aggregate_proposal_votes_wrong_state() {
    // Setup: Create market in APPROVED state (not PROPOSED)

    // Execute: aggregate_proposal_votes(70, 30)

    // Assert: Fails with ErrorCode::InvalidStateForVoting (6701)
    // Assert: Constraint catches this at accounts level
}
```

### Test 7: Re-Aggregation After Rejection

```rust
#[tokio::test]
async fn test_aggregate_proposal_votes_retry_after_rejection() {
    // Setup: Create market in PROPOSED state

    // Execute: aggregate_proposal_votes(60, 40) [60% - rejected]
    // Assert: Still in PROPOSED state

    // Execute: aggregate_proposal_votes(75, 25) [75% - approved]
    // Assert: Now in APPROVED state
    // Assert: Counts updated to new values (75, 25)
    // Assert: Can re-aggregate while in PROPOSED
}
```

### Test 8: Overflow Protection (Extreme Edge Case)

```rust
#[tokio::test]
async fn test_aggregate_proposal_votes_overflow_protection() {
    // Setup: Create market in PROPOSED state

    // Execute: aggregate_proposal_votes(u32::MAX, u32::MAX)
    // Total votes would overflow u32

    // Assert: Fails with ErrorCode::Overflow
    // Assert: checked_add catches this
}
```

### Test 9: Percentage Calculation Accuracy

```rust
#[tokio::test]
async fn test_aggregate_proposal_votes_percentage_calculation() {
    // Test various vote combinations for accuracy

    // Execute: aggregate_proposal_votes(7, 3) [70.0%]
    // Assert: approval_percentage == 70

    // Execute: aggregate_proposal_votes(69, 31) [69.0%]
    // Assert: approval_percentage == 69, approved=false

    // Execute: aggregate_proposal_votes(71, 29) [71.0%]
    // Assert: approval_percentage == 71, approved=true
}
```

---

## 🔬 Ultrathink Analysis: Design Decisions

### 🤔 Question 1: Should we verify VoteRecords on-chain?

**Options:**
1. **Verify on-chain** (iterate VoteRecords, count votes)
2. **Trust backend** (accept counts as-is)
3. **Hybrid** (verify signature, trust counts)

**Analysis:**
- Option 1:
  - ✅ Trustless (verifiable on-chain)
  - ❌ Expensive (iterate 1000s of VoteRecords)
  - ❌ Compute unit limits (can't scale)
  - ❌ PDA derivation overhead

- Option 2:
  - ✅ Gas efficient (O(1) operation)
  - ✅ Scalable (millions of votes)
  - ❌ Requires trust in backend
  - ✅ VoteRecords still on-chain for audit

- Option 3:
  - ⚠️ Complex signature verification
  - ⚠️ Still requires trust in aggregation logic

**Decision: Option 2 (Trust Backend)**

**Rationale:**
- Backend authority is configured in GlobalConfig (governance-controlled)
- VoteRecords remain on-chain as proof (can be audited off-chain)
- For V2: Add challenge mechanism (anyone can prove backend lied)
- For MVP: Simplicity + scalability > trustlessness
- If backend lies: governance can replace backend_authority

**Blueprint Compliance:**
- Blueprint says: "Backend aggregates votes off-chain"
- This implies trust in backend (same as blueprint)
- ✅ Compliant

---

### 🤔 Question 2: What happens if <70% approval?

**Options:**
1. **Stay in PROPOSED** (can re-aggregate later)
2. **Transition to REJECTED** (new state)
3. **Delete market** (cleanup)

**Analysis:**
- Option 1:
  - ✅ Allows re-voting (more users vote later)
  - ✅ No new state needed
  - ✅ Flexible (can aggregate multiple times)
  - ⚠️ Market stays on-chain (rent)

- Option 2:
  - ⚠️ Requires new state (not in blueprint)
  - ❌ Prevents re-voting
  - ❌ Complexity

- Option 3:
  - ❌ Loses audit trail
  - ❌ Too destructive
  - ❌ Can't re-vote

**Decision: Option 1 (Stay PROPOSED)**

**Rationale:**
- Blueprint defines 6 states, no REJECTED state
- Voting can continue (more users join platform)
- Backend can re-aggregate with updated counts
- Admin has cancel_market for cleanup (emergency)
- Rent cost is minimal (0.002 SOL)

**Blueprint Compliance:**
- Blueprint silent on rejection behavior
- Option 1 most flexible (doesn't break state machine)
- ✅ Compliant

---

### 🤔 Question 3: Should we allow re-aggregation after approval?

**Options:**
1. **Allow re-aggregation** (APPROVED → PROPOSED possible)
2. **Prevent re-aggregation** (APPROVED is final)

**Analysis:**
- Option 1:
  - ❌ Could reverse approval (bad UX)
  - ❌ Confusing state machine
  - ❌ Security risk (malicious backend)

- Option 2:
  - ✅ Clear state machine (one-way transition)
  - ✅ Cannot reverse approval
  - ✅ Prevents manipulation

**Decision: Option 2 (Prevent Re-Aggregation)**

**Implementation:**
```rust
constraint = market.state == MarketState::Proposed @ ErrorCode::InvalidStateForVoting
```

**Rationale:**
- State machine should be monotonic (forward-only)
- Once approved, admin activates market (next phase)
- If approval was mistake: admin can cancel_market
- Clear, predictable behavior

**Blueprint Compliance:**
- Blueprint shows forward-only state transitions
- PROPOSED → APPROVED is one-way
- ✅ Compliant

---

### 🤔 Question 4: How to handle percentage rounding?

**Example:**
- 69.99% → rounds to 69% (u8) → rejected ✅ Correct
- 70.00% → rounds to 70% (u8) → approved ✅ Correct
- 70.01% → rounds to 70% (u8) → approved ✅ Correct

**Analysis:**
- Integer division truncates (69.99 → 69)
- Threshold check: `>= 70`
- 69.99% → 69 → rejected ✅
- 70.00% → 70 → approved ✅
- 70.01% → 70 → approved ✅

**Decision: Integer Division (Truncation)**

**Implementation:**
```rust
let likes_percentage = (final_likes as u64)
    .checked_mul(100)?
    / (total_votes as u64); // Integer division (truncates)
```

**Rationale:**
- Truncation favors rejection (conservative)
- Exact 70.00% still approves (>= check)
- No floating point needed
- Gas efficient

**Blueprint Compliance:**
- Blueprint specifies "70% threshold"
- Doesn't specify rounding method
- Conservative interpretation (truncation)
- ✅ Compliant

---

### 🤔 Question 5: Should approved_at be Option<i64> or i64?

**Current Implementation:**
```rust
pub approved_at: Option<i64>, // None until approved
```

**Analysis:**
- Option<i64>:
  - ✅ Clear semantics (None = not approved)
  - ✅ Can check approval without state field
  - ⚠️ Extra byte for discriminant

- i64 (default 0):
  - ✅ Saves 1 byte
  - ❌ Ambiguous (0 = not approved or Jan 1, 1970?)
  - ❌ Less clear

**Decision: Keep Option<i64>**

**Rationale:**
- Clarity > 1 byte savings
- 0 timestamp is ambiguous
- Option<i64> is idiomatic Rust
- Matches other timestamp fields

**Blueprint Compliance:**
- Blueprint doesn't specify timestamp storage
- Option<i64> is clearest representation
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
Account deserialization:    ~2,000 CU
Constraint checks:          ~1,000 CU
Handler logic:              ~3,000 CU
Event emission:             ~2,000 CU
Account serialization:      ~2,000 CU
─────────────────────────────────────
Total:                      ~10,000 CU
```

**Well within limit:** 200,000 CU budget

---

## 🔐 Security Considerations

### 1. Authorization
- ✅ Backend authority constraint (prevents unauthorized aggregation)
- ✅ PDA derivation (prevents account substitution)
- ✅ Signer check (requires private key)

### 2. State Machine
- ✅ PROPOSED state constraint (prevents invalid transitions)
- ✅ One-way transition (PROPOSED → APPROVED only)
- ✅ No backward transitions

### 3. Arithmetic Safety
- ✅ Checked addition (total_votes)
- ✅ Checked multiplication (percentage calculation)
- ✅ Division by zero protection (if total_votes > 0)

### 4. Reentrancy
- ✅ No external calls (no reentrancy possible)
- ✅ State updates before events (safe pattern)

### 5. Access Control
- ✅ Only backend_authority can aggregate
- ✅ Cannot spoof backend_authority (constraint check)
- ✅ Cannot bypass state machine (constraint check)

---

## 🎯 Success Criteria

### Implementation Complete When:
- ✅ All 9 tests written (TDD)
- ✅ Instruction handler implemented
- ✅ Account structure defined
- ✅ Event defined
- ✅ Program entry point added
- ✅ Module exports updated

### Tests Pass When:
- ✅ 70% threshold correctly enforced
- ✅ State transitions work (PROPOSED → APPROVED)
- ✅ Unauthorized calls rejected
- ✅ Wrong state calls rejected
- ✅ Zero votes handled gracefully
- ✅ Re-aggregation works (while PROPOSED)
- ✅ Overflow protection works

### Blueprint Compliant When:
- ✅ 70% like threshold enforced (exact formula)
- ✅ State machine follows blueprint (PROPOSED → APPROVED)
- ✅ Backend aggregation pattern (off-chain count, on-chain verify)
- ✅ Vote counts stored on-chain (audit trail)

---

## 📁 Files to Create/Modify

### 1. Create Instruction Handler
**File:** `programs/zmart-core/src/instructions/aggregate_proposal_votes.rs`
- Account structure
- Handler function
- Event definition

### 2. Update Module Exports
**File:** `programs/zmart-core/src/instructions/mod.rs`
```rust
// Add:
pub mod aggregate_proposal_votes;
pub use aggregate_proposal_votes::*;
```

### 3. Update Program Entry Point
**File:** `programs/zmart-core/src/lib.rs`
```rust
// Add:
pub fn aggregate_proposal_votes(
    ctx: Context<AggregateProposalVotes>,
    final_likes: u32,
    final_dislikes: u32,
) -> Result<()> {
    aggregate_proposal_votes::handler(ctx, final_likes, final_dislikes)
}
```

### 4. Create Tests
**File:** `programs/zmart-core/tests/aggregate_proposal_votes.rs`
- All 9 test cases

---

## 🚀 Implementation Steps (TDD)

### Step 1: Write Tests (2-3 hours)
1. Create test file: `tests/aggregate_proposal_votes.rs`
2. Write all 9 test cases (with TODO markers for implementation)
3. Verify tests compile (but fail - no implementation yet)

### Step 2: Implement Instruction (2-3 hours)
1. Create instruction file: `instructions/aggregate_proposal_votes.rs`
2. Define `AggregateProposalVotes` account structure
3. Define `ProposalAggregated` event
4. Implement handler function
5. Add module exports
6. Add program entry point

### Step 3: Verify Compilation (30 mins)
1. Run `cargo check` (should pass)
2. Run `anchor build` (should pass)
3. Fix any compilation errors

### Step 4: Run Tests (1 hour)
1. Set up test infrastructure (if needed)
2. Run `anchor test`
3. Verify all tests pass
4. Fix any failing tests

### Step 5: Integration Testing (30 mins)
1. Deploy to localnet
2. Test instruction with real transactions
3. Verify events emitted correctly
4. Verify state transitions work

---

## 📈 Estimated Time Breakdown

| Task | Naive Estimate | With Buffer | Actual |
|------|----------------|-------------|--------|
| Write tests | 2 hours | 2.5 hours | TBD |
| Implement instruction | 2 hours | 2.5 hours | TBD |
| Verify compilation | 0.5 hours | 0.5 hours | TBD |
| Run tests | 1 hour | 1 hour | TBD |
| Integration testing | 0.5 hours | 0.5 hours | TBD |
| **TOTAL** | **6 hours** | **7 hours** | **TBD** |

**Buffer:** 1 hour (16.7% - reduced from previous 40% due to TDD success)

---

## 🎓 Learning Notes

### Key Insights from STORY-VOTING-1
1. **TDD Reduces Debugging** - Tests clarify requirements upfront
2. **Constraints > Manual Checks** - Anchor handles validation automatically
3. **Events Are Essential** - Backend needs events for indexing
4. **Checked Arithmetic Always** - Prevents overflow attacks

### New Patterns for This Story
1. **Authority Constraints** - Backend authority validation pattern
2. **Percentage Calculations** - Integer math for percentages
3. **Conditional State Transitions** - State changes based on threshold
4. **Dual Event Use Cases** - Same event for success/failure (approved field)

### Blueprint Patterns Applied
1. **70% Threshold** - Exact formula from blueprint
2. **Off-Chain Aggregation** - Trust backend, verify later
3. **State Machine Compliance** - Forward-only transitions
4. **Audit Trail** - Vote counts stored on-chain

---

## 🔗 Related Documentation

- [CORE_LOGIC_INVARIANTS.md](../CORE_LOGIC_INVARIANTS.md) - 70% threshold requirement
- [03_SOLANA_PROGRAM_DESIGN.md](../03_SOLANA_PROGRAM_DESIGN.md) - Instruction spec
- [06_STATE_MANAGEMENT.md](../06_STATE_MANAGEMENT.md) - State machine (PROPOSED → APPROVED)
- [07_ON_CHAIN_OFF_CHAIN_INTEGRATION.md](../07_ON_CHAIN_OFF_CHAIN_INTEGRATION.md) - Vote aggregation workflow
- [STORY-VOTING-1.md](./STORY-VOTING-1.md) - submit_proposal_vote (prerequisite)

---

## ✅ Definition of Done

### Code Complete
- [ ] All 9 tests written
- [ ] Instruction handler implemented
- [ ] Event defined
- [ ] Module exports updated
- [ ] Program entry point added

### Tests Passing
- [ ] Test 1: 70% approval (approve) ✅
- [ ] Test 2: >70% approval (approve) ✅
- [ ] Test 3: <70% approval (stay PROPOSED) ✅
- [ ] Test 4: Zero votes (edge case) ✅
- [ ] Test 5: Unauthorized (fail) ✅
- [ ] Test 6: Wrong state (fail) ✅
- [ ] Test 7: Re-aggregation (after rejection) ✅
- [ ] Test 8: Overflow protection ✅
- [ ] Test 9: Percentage accuracy ✅

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

**Status:** 📝 Story Created - Ready for Implementation
**Next Action:** Begin Step 1 (Write Tests)
**Estimated Completion:** 7 hours from start
