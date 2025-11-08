# STORY-VOTING-3: Submit Dispute Vote Instruction

**Story ID:** STORY-VOTING-3
**Phase:** 1 (Voting System Foundation)
**Week:** 1
**Instruction:** 3/4 (submit_dispute_vote)
**Estimated Time:** 4 hours (3h naive + 33% TDD buffer)
**Priority:** P0 (Critical Path)
**Dependencies:** STORY-VOTING-1 (submit_proposal_vote), VoteRecord infrastructure

---

## 🎯 User Story

**As a** platform user who disagrees with a proposed resolution
**I want to** submit a dispute vote (agree/disagree with dispute)
**So that** the community can collectively decide if the resolution is correct

---

## 📋 Requirements

### Functional Requirements

1. **Market State Validation**
   - Market must be in DISPUTED state (not PROPOSED)
   - Prevents voting before dispute is initiated
   - Clear error if wrong state

2. **Vote Record Creation**
   - Create VoteRecord PDA with VoteType::Dispute (value 1)
   - PDA seeds: `[b"vote", market.key(), user.key(), &[1]]`
   - Different PDA from proposal votes (allows both vote types)
   - Automatic duplicate prevention (init fails if voted)

3. **Vote Submission**
   - Accept `vote: bool` parameter
   - `true` = agree with dispute (resolution is wrong)
   - `false` = disagree with dispute (resolution is correct)
   - Store in VoteRecord.vote

4. **Timestamp Recording**
   - Record `voted_at` timestamp (audit trail)
   - Use Clock::get()?.unix_timestamp
   - Immutable after creation

5. **Event Emission**
   - Emit `DisputeVoteSubmitted` event
   - Include: market_id, user, vote, timestamp
   - Backend listens for off-chain aggregation

6. **Duplicate Prevention**
   - PDA init constraint prevents re-voting
   - Same user can't vote twice on same dispute
   - Automatic (no manual checks needed)

### Non-Functional Requirements

1. **Security**
   - Constraint-based state validation (gas efficient)
   - PDA derivation prevents account substitution
   - Signer validation (requires wallet signature)
   - No reentrancy possible (no external calls)

2. **Performance**
   - Single instruction call (no loops)
   - Minimal compute units (< 5,000 CU)
   - O(1) complexity

3. **Auditability**
   - All dispute votes stored on-chain
   - Timestamp for temporal analysis
   - Event for off-chain tracking
   - Immutable after creation

---

## 🏗️ Implementation Plan

### 1. Error Codes (Reuse Existing)

**Review existing errors:**
- ✅ `ErrorCode::InvalidStateForVoting` (6701) - Already defined
- ✅ `ErrorCode::AlreadyVoted` (6700) - Already defined (semantic, PDA init fails)

**No new error codes needed!**

### 2. Account Structure

```rust
/// Submit a dispute vote (agree/disagree with dispute)
#[derive(Accounts)]
pub struct SubmitDisputeVote<'info> {
    /// Market (must be in DISPUTED state)
    #[account(
        seeds = [b"market", &market.market_id],
        bump = market.bump,
        constraint = market.state == MarketState::Disputed @ ErrorCode::InvalidStateForVoting
    )]
    pub market: Account<'info, MarketAccount>,

    /// VoteRecord PDA (init prevents duplicates)
    /// Seeds: [b"vote", market_key, user_key, &[VoteType::Dispute as u8]]
    #[account(
        init,
        payer = user,
        space = VoteRecord::LEN,
        seeds = [
            b"vote",
            market.key().as_ref(),
            user.key().as_ref(),
            &[VoteType::Dispute as u8]
        ],
        bump
    )]
    pub vote_record: Account<'info, VoteRecord>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub system_program: Program<'info, System>,
}
```

**Account Validation:**
- ✅ Market PDA derivation (security)
- ✅ DISPUTED state constraint (state machine)
- ✅ VoteRecord PDA with Dispute type (uniqueness)
- ✅ User signer (authorization)

### 3. Handler Logic

```rust
pub fn handler(ctx: Context<SubmitDisputeVote>, vote: bool) -> Result<()> {
    let vote_record = &mut ctx.accounts.vote_record;
    let clock = Clock::get()?;

    // Initialize VoteRecord
    vote_record.market = ctx.accounts.market.key();
    vote_record.user = ctx.accounts.user.key();
    vote_record.vote_type = VoteType::Dispute;
    vote_record.vote = vote;
    vote_record.voted_at = clock.unix_timestamp;
    vote_record.bump = ctx.bumps.vote_record;

    // Emit event for backend indexing
    emit!(DisputeVoteSubmitted {
        market_id: ctx.accounts.market.market_id,
        user: vote_record.user,
        vote,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}
```

### 4. Event Definition

```rust
/// Dispute vote submitted by user
#[event]
pub struct DisputeVoteSubmitted {
    pub market_id: [u8; 32],
    pub user: Pubkey,
    pub vote: bool, // true = agree with dispute, false = disagree
    pub timestamp: i64,
}
```

### 5. Program Entry Point

```rust
// In programs/zmart-core/src/lib.rs
/// Submit a vote on a market dispute (agree/disagree)
///
/// Creates an on-chain VoteRecord for proof and duplicate prevention.
/// Votes are aggregated off-chain by the backend. When dispute threshold
/// is NOT reached, original resolution stands. If threshold reached,
/// market returns to RESOLVING state for new resolution.
///
/// # Arguments
///
/// * `vote` - true for "agree with dispute" (resolution is wrong),
///            false for "disagree with dispute" (resolution is correct)
///
/// # Errors
///
/// * `ErrorCode::InvalidStateForVoting` - Market not in DISPUTED state
/// * `ErrorCode::AlreadyVoted` - User already voted (PDA init fails)
pub fn submit_dispute_vote(
    ctx: Context<SubmitDisputeVote>,
    vote: bool,
) -> Result<()> {
    submit_dispute_vote::handler(ctx, vote)
}
```

---

## 🧪 Test Cases (TDD Approach)

### Test 1: Agree with Dispute Vote Success

```rust
#[tokio::test]
async fn test_submit_dispute_vote_agree() {
    // Setup: Create market in DISPUTED state
    // Setup: User has not voted on dispute yet

    // Execute: submit_dispute_vote(true)
    // true = agree with dispute (resolution is wrong)

    // Assert: VoteRecord created
    // Assert: vote_record.vote == true
    // Assert: vote_record.vote_type == VoteType::Dispute
    // Assert: vote_record.market == market.key()
    // Assert: vote_record.user == user.key()
    // Assert: vote_record.voted_at > 0
    // Assert: vote_record.bump > 0
    // Assert: Event emitted with vote=true
}
```

### Test 2: Disagree with Dispute Vote Success

```rust
#[tokio::test]
async fn test_submit_dispute_vote_disagree() {
    // Setup: Create market in DISPUTED state

    // Execute: submit_dispute_vote(false)
    // false = disagree with dispute (resolution is correct)

    // Assert: VoteRecord created
    // Assert: vote_record.vote == false
    // Assert: vote_record.vote_type == VoteType::Dispute
    // Assert: All fields correctly populated
    // Assert: Event emitted with vote=false
}
```

### Test 3: Duplicate Dispute Vote Fails

```rust
#[tokio::test]
async fn test_submit_dispute_vote_duplicate_fails() {
    // Setup: Create market in DISPUTED state
    // Setup: User already voted on dispute (VoteRecord exists)

    // Execute: submit_dispute_vote(true) [second time]

    // Assert: Fails (PDA init fails)
    // Assert: AlreadyVoted semantic error
    // Assert: Original vote unchanged
}
```

### Test 4: Wrong State Fails

```rust
#[tokio::test]
async fn test_submit_dispute_vote_wrong_state() {
    // Setup: Create market in PROPOSED state (not DISPUTED)

    // Execute: submit_dispute_vote(true)

    // Assert: Fails with ErrorCode::InvalidStateForVoting (6701)
    // Assert: Constraint catches this before handler
    // Assert: No VoteRecord created
}
```

### Test 5: Separate PDAs for Proposal and Dispute Votes

```rust
#[tokio::test]
async fn test_submit_dispute_vote_separate_pdas() {
    // Setup: Create market that went through proposal vote
    // Setup: User voted on proposal (ProposalVote PDA exists)
    // Setup: Market now in DISPUTED state

    // Execute: submit_dispute_vote(true)

    // Assert: DisputeVote PDA created successfully
    // Assert: ProposalVote PDA still exists (separate)
    // Assert: Different PDA addresses (different seeds)
    // Assert: Same user can have both vote types
}
```

### Test 6: PDA Derivation Verification

```rust
#[tokio::test]
async fn test_submit_dispute_vote_pda_derivation() {
    // Setup: Create market in DISPUTED state
    // Setup: Known market, user pubkeys

    // Execute: submit_dispute_vote(true)

    // Assert: PDA derived correctly
    // Seeds: [b"vote", market.key(), user.key(), &[1]]
    // Assert: &[1] = VoteType::Dispute as u8
    // Assert: Different from ProposalVote PDA (&[0])
}
```

### Test 7: Event Content Verification

```rust
#[tokio::test]
async fn test_submit_dispute_vote_event() {
    // Setup: Create market in DISPUTED state

    // Execute: submit_dispute_vote(true)

    // Assert: DisputeVoteSubmitted event emitted
    // Assert: event.market_id == market.market_id
    // Assert: event.user == user.key()
    // Assert: event.vote == true
    // Assert: event.timestamp > 0
    // Assert: Backend can index this event
}
```

### Test 8: Multiple Users Vote on Dispute

```rust
#[tokio::test]
async fn test_submit_dispute_vote_multiple_users() {
    // Setup: Create market in DISPUTED state
    // Setup: 10 different users

    // Execute: Each user calls submit_dispute_vote(random)

    // Assert: 10 VoteRecords created
    // Assert: All have unique PDAs (different user seeds)
    // Assert: All have VoteType::Dispute
    // Assert: 10 events emitted
}
```

---

## 🔬 Ultrathink Analysis: Design Decisions

### 🤔 Question 1: Should dispute votes work differently than proposal votes?

**Options:**
1. **Identical pattern** (same logic, different state)
2. **Weighted by stake** (traders have more say)
3. **Weighted by reputation** (trusted users matter more)
4. **Time-weighted** (earlier votes matter more)

**Analysis:**
- Option 1:
  - ✅ Simple, consistent pattern
  - ✅ Democratic (1 user = 1 vote)
  - ✅ Easy to implement and test
  - ✅ Blueprint doesn't specify weighting

- Option 2:
  - ⚠️ Favors whales (large traders dominate)
  - ⚠️ Complex stake calculation
  - ⚠️ Not in blueprint
  - ❌ Creates plutocracy

- Option 3:
  - ⚠️ Requires reputation system (not in MVP)
  - ⚠️ Subjective (who decides reputation?)
  - ❌ Deferred to V2

- Option 4:
  - ⚠️ Encourages rushed voting
  - ⚠️ Penalizes careful consideration
  - ❌ Bad incentive structure

**Decision: Option 1 (Identical Pattern)**

**Rationale:**
- Blueprint doesn't specify weighted voting
- Democratic voting is fairest for MVP
- Consistent with proposal voting (user expectation)
- V2 can add reputation-weighted disputes
- Simple = fewer bugs = faster launch

**Blueprint Compliance:**
- Blueprint silent on dispute vote weighting
- Democratic voting is default assumption
- ✅ Compliant

---

### 🤔 Question 2: Can users vote on disputes if they didn't vote on proposal?

**Options:**
1. **Anyone can vote** (no proposal vote required)
2. **Only proposal voters** (must have voted on proposal)
3. **Only traders** (must have position in market)

**Analysis:**
- Option 1:
  - ✅ Inclusive (wider participation)
  - ✅ More votes = better consensus
  - ✅ New users can participate
  - ✅ No complex constraint needed

- Option 2:
  - ⚠️ Excludes new users (joined after proposal)
  - ⚠️ Complex constraint (check ProposalVote PDA exists)
  - ⚠️ Reduces participation
  - ❌ Not in blueprint

- Option 3:
  - ⚠️ Excludes observers (only traders vote)
  - ⚠️ Creates bias (traders have skin in game)
  - ⚠️ Complex constraint (check UserPosition exists)
  - ❌ Not in blueprint

**Decision: Option 1 (Anyone Can Vote)**

**Rationale:**
- Blueprint doesn't restrict who can dispute vote
- More participation = better consensus
- Dispute voting happens later (more users may have joined)
- Simple implementation (no extra constraints)
- Democratic (1 user = 1 vote)

**Blueprint Compliance:**
- Blueprint doesn't specify voter eligibility restrictions
- Inclusive voting is default assumption
- ✅ Compliant

---

### 🤔 Question 3: Should there be a time limit for dispute voting?

**Options:**
1. **No time limit** (backend decides when to aggregate)
2. **48-hour window** (matches dispute period)
3. **7-day window** (longer for careful consideration)

**Analysis:**
- Option 1:
  - ✅ Flexible (backend controls timing)
  - ✅ No on-chain time checks (simpler)
  - ✅ Backend can extend if needed
  - ⚠️ Could drag on indefinitely

- Option 2:
  - ⚠️ Short window (may miss votes)
  - ⚠️ Requires on-chain time validation
  - ⚠️ Blueprint says 48h for dispute period, not voting
  - ❌ Conflates dispute period with voting period

- Option 3:
  - ⚠️ Too long (slows resolution)
  - ⚠️ Requires on-chain time validation
  - ❌ Not in blueprint

**Decision: Option 1 (No Time Limit in submit_dispute_vote)**

**Implementation:**
- `submit_dispute_vote` has no time checks
- Backend decides when voting ends
- `aggregate_dispute_votes` can check dispute period
- Flexibility for backend policy

**Rationale:**
- Blueprint doesn't specify dispute voting window
- Backend can enforce policy off-chain
- On-chain: just record votes (simple)
- Off-chain: aggregate when ready (flexible)
- Separates vote submission from aggregation timing

**Blueprint Compliance:**
- Blueprint specifies 48h dispute period (for initiating disputes)
- Doesn't specify voting window duration
- Backend-controlled timing is flexible
- ✅ Compliant

---

### 🤔 Question 4: What if users want to change their dispute vote?

**Options:**
1. **No changes allowed** (immutable votes)
2. **Allow vote updates** (mutable VoteRecord)
3. **Delete and re-vote** (close + re-init)

**Analysis:**
- Option 1:
  - ✅ Simple (PDA init prevents changes)
  - ✅ Votes are final (clear commitment)
  - ✅ No extra instruction needed
  - ✅ Prevents manipulation

- Option 2:
  - ⚠️ Requires new instruction (update_dispute_vote)
  - ⚠️ Complexity (when to allow updates?)
  - ⚠️ Manipulation risk (vote buying)
  - ❌ Not in blueprint

- Option 3:
  - ⚠️ Requires close instruction
  - ⚠️ Rent refund complexity
  - ⚠️ Event ordering issues
  - ❌ Not in blueprint

**Decision: Option 1 (Immutable Votes)**

**Implementation:**
```rust
#[account(
    init, // init fails if account exists
    ...
)]
pub vote_record: Account<'info, VoteRecord>,
```

**Rationale:**
- PDA init constraint enforces immutability (automatic)
- Votes represent commitment (should be final)
- Prevents vote manipulation (can't change after seeing others' votes)
- Blueprint doesn't mention vote updates
- Simplicity (no extra instruction needed)

**Blueprint Compliance:**
- Blueprint doesn't specify vote mutability
- Immutable votes are standard pattern
- ✅ Compliant

---

### 🤔 Question 5: Should dispute votes use same VoteRecord struct?

**Current Implementation:**
```rust
pub struct VoteRecord {
    pub market: Pubkey,
    pub user: Pubkey,
    pub vote_type: VoteType, // Proposal = 0, Dispute = 1
    pub vote: bool,
    pub voted_at: i64,
    pub bump: u8,
}

pub enum VoteType {
    Proposal = 0,
    Dispute = 1,
}
```

**Options:**
1. **Same struct** (vote_type discriminates)
2. **Separate structs** (ProposalVoteRecord, DisputeVoteRecord)

**Analysis:**
- Option 1:
  - ✅ Code reuse (DRY principle)
  - ✅ Same fields needed
  - ✅ Single aggregation pattern
  - ✅ Less code to maintain

- Option 2:
  - ⚠️ Code duplication
  - ⚠️ Two aggregation patterns
  - ⚠️ More complexity
  - ❌ No benefit

**Decision: Option 1 (Same VoteRecord Struct)**

**Rationale:**
- Proposal and dispute votes have identical structure
- vote_type field discriminates between types
- Separate PDAs via different seeds (security)
- Code reuse (simpler, less bugs)

**PDA Security:**
- Different PDAs: [b"vote", market, user, &[0]] vs [b"vote", market, user, &[1]]
- Same user can have both vote types (separate accounts)
- vote_type field provides additional validation

**Blueprint Compliance:**
- Blueprint doesn't specify account structure
- Reusing struct is efficient
- ✅ Compliant

---

## 📊 Complexity Analysis

### Time Complexity
- **O(1)** - Constant time operations
- Single account creation
- No loops or iterations

### Space Complexity
- **O(1)** - Fixed account size
- VoteRecord: 91 bytes (83 data + 8 discriminator)
- Same as ProposalVote

### Compute Units Estimate
```
Account deserialization:    ~1,500 CU
Constraint checks:          ~1,000 CU
PDA derivation:             ~1,000 CU
Handler logic:              ~500 CU
Event emission:             ~1,000 CU
Account serialization:      ~1,000 CU
─────────────────────────────────────
Total:                      ~6,000 CU
```

**Well within limit:** 200,000 CU budget

---

## 🔐 Security Considerations

### 1. State Machine Integrity
- ✅ DISPUTED state constraint (prevents voting on wrong state)
- ✅ One-way state transitions (DISPUTED is terminal until aggregation)
- ✅ No backward transitions possible

### 2. Vote Uniqueness
- ✅ PDA init prevents duplicate votes (automatic)
- ✅ Separate PDAs for proposal/dispute (vote_type in seeds)
- ✅ No manual duplicate checking (Anchor handles it)

### 3. Authorization
- ✅ Signer check (requires wallet signature)
- ✅ No special permissions needed (anyone can vote)
- ✅ PDA derivation prevents account substitution

### 4. Immutability
- ✅ VoteRecords are immutable (init, not init_if_needed)
- ✅ Cannot change vote after submission
- ✅ Prevents manipulation

### 5. Event Integrity
- ✅ Event emitted after state update (safe ordering)
- ✅ Contains all relevant data (market_id, user, vote, timestamp)
- ✅ Backend can verify via on-chain VoteRecord

---

## 🎯 Success Criteria

### Implementation Complete When:
- ✅ All 8 tests written (TDD)
- ✅ Instruction handler implemented
- ✅ Account structure defined
- ✅ Event defined
- ✅ Program entry point added
- ✅ Module exports updated

### Tests Pass When:
- ✅ Agree vote creates VoteRecord correctly
- ✅ Disagree vote creates VoteRecord correctly
- ✅ Duplicate votes rejected (PDA init fails)
- ✅ Wrong state rejected (DISPUTED required)
- ✅ Separate PDAs for proposal/dispute votes
- ✅ PDA derivation correct (&[1] for Dispute)
- ✅ Event emitted with correct data
- ✅ Multiple users can vote

### Blueprint Compliant When:
- ✅ Democratic voting (1 user = 1 vote)
- ✅ Immutable votes (cannot change after submit)
- ✅ State machine follows blueprint (DISPUTED state)
- ✅ Vote aggregation pattern (off-chain count, on-chain verify)

---

## 📁 Files to Create/Modify

### 1. Create Instruction Handler
**File:** `programs/zmart-core/src/instructions/submit_dispute_vote.rs`
- Account structure (SubmitDisputeVote)
- Handler function
- Event definition (DisputeVoteSubmitted)

### 2. Update Module Exports
**File:** `programs/zmart-core/src/instructions/mod.rs`
```rust
// Add:
pub mod submit_dispute_vote;
pub use submit_dispute_vote::*;
```

### 3. Update Program Entry Point
**File:** `programs/zmart-core/src/lib.rs`
```rust
// Add:
pub fn submit_dispute_vote(
    ctx: Context<SubmitDisputeVote>,
    vote: bool,
) -> Result<()> {
    submit_dispute_vote::handler(ctx, vote)
}
```

### 4. Create Tests
**File:** `programs/zmart-core/tests/submit_dispute_vote.rs`
- All 8 test cases

---

## 🚀 Implementation Steps (TDD)

### Step 1: Write Tests (1-1.5 hours)
1. Create test file: `tests/submit_dispute_vote.rs`
2. Write all 8 test cases (copy from STORY-VOTING-1, modify state)
3. Verify tests compile (but fail - no implementation yet)

### Step 2: Implement Instruction (1-1.5 hours)
1. Create instruction file: `instructions/submit_dispute_vote.rs`
2. Copy `submit_proposal_vote.rs` as template
3. Change state constraint: PROPOSED → DISPUTED
4. Change PDA seeds: &[0] → &[1]
5. Change event: ProposalVoteSubmitted → DisputeVoteSubmitted
6. Update handler logic (minimal changes)
7. Add module exports
8. Add program entry point

### Step 3: Verify Compilation (15 mins)
1. Run `cargo check` (should pass)
2. Run `anchor build` (should pass)
3. Fix any compilation errors

### Step 4: Run Tests (30 mins)
1. Run `anchor test`
2. Verify all tests pass
3. Fix any failing tests

### Step 5: Integration Testing (15 mins)
1. Deploy to localnet
2. Test instruction with real transactions
3. Verify events emitted correctly

---

## 📈 Estimated Time Breakdown

| Task | Naive Estimate | With Buffer | Actual |
|------|----------------|-------------|--------|
| Write tests | 1 hour | 1.25 hours | TBD |
| Implement instruction | 1 hour | 1.25 hours | TBD |
| Verify compilation | 0.25 hours | 0.25 hours | TBD |
| Run tests | 0.5 hours | 0.75 hours | TBD |
| Integration testing | 0.25 hours | 0.5 hours | TBD |
| **TOTAL** | **3 hours** | **4 hours** | **TBD** |

**Buffer:** 1 hour (33% - conservative due to pattern reuse)

**Confidence:** 95% (very high due to pattern reuse from STORY-VOTING-1)

---

## 🎓 Learning Notes

### Key Insights from Previous Stories

1. **Pattern Reuse is Fast**
   - 90% similar to submit_proposal_vote
   - Copy/modify approach saves time
   - Only 3 changes: state, seeds, event

2. **Constraints > Manual Checks**
   - Anchor validates everything automatically
   - No manual state checking needed
   - Gas efficient

3. **TDD Prevents Mistakes**
   - Clear requirements upfront
   - No debugging during implementation
   - Fast, confident coding

### New Patterns for This Story

1. **Vote Type Discrimination**
   - Same VoteRecord struct
   - vote_type field distinguishes
   - Separate PDAs via seeds

2. **State Machine Consistency**
   - PROPOSED → ProposalVote
   - DISPUTED → DisputeVote
   - Clear, predictable pattern

3. **Democratic Voting**
   - 1 user = 1 vote (no weighting)
   - Inclusive (anyone can vote)
   - Immutable (cannot change vote)

### Blueprint Patterns Applied

1. **Democratic Governance**
   - No weighted voting (MVP simplicity)
   - Equal voice for all users
   - V2 can add reputation weighting

2. **Immutable Votes**
   - Votes represent commitment
   - Cannot manipulate after seeing others' votes
   - Clear, final decisions

3. **Flexible Timing**
   - No on-chain time limits
   - Backend controls aggregation timing
   - Simple on-chain, flexible off-chain

---

## 🔗 Related Documentation

- [CORE_LOGIC_INVARIANTS.md](../CORE_LOGIC_INVARIANTS.md) - Dispute voting requirements
- [03_SOLANA_PROGRAM_DESIGN.md](../03_SOLANA_PROGRAM_DESIGN.md) - Instruction spec
- [06_STATE_MANAGEMENT.md](../06_STATE_MANAGEMENT.md) - State machine (DISPUTED state)
- [07_ON_CHAIN_OFF_CHAIN_INTEGRATION.md](../07_ON_CHAIN_OFF_CHAIN_INTEGRATION.md) - Vote aggregation workflow
- [STORY-VOTING-1.md](./STORY-VOTING-1.md) - submit_proposal_vote (template)
- [STORY-VOTING-2.md](./STORY-VOTING-2.md) - aggregate_proposal_votes

---

## ✅ Definition of Done

### Code Complete
- [ ] All 8 tests written
- [ ] Instruction handler implemented
- [ ] Event defined
- [ ] Module exports updated
- [ ] Program entry point added

### Tests Passing
- [ ] Test 1: Agree vote (success) ✅
- [ ] Test 2: Disagree vote (success) ✅
- [ ] Test 3: Duplicate vote (fail) ✅
- [ ] Test 4: Wrong state (fail) ✅
- [ ] Test 5: Separate PDAs (success) ✅
- [ ] Test 6: PDA derivation (verify) ✅
- [ ] Test 7: Event content (verify) ✅
- [ ] Test 8: Multiple users (success) ✅

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

## 🔄 Pattern Comparison: Proposal vs. Dispute

### Similarities (90%)
```rust
// Account structure
#[account(
    init,
    payer = user,
    space = VoteRecord::LEN,
    seeds = [b"vote", market.key().as_ref(), user.key().as_ref(), &[TYPE]],
    bump
)]
pub vote_record: Account<'info, VoteRecord>,

// Handler logic
vote_record.market = ctx.accounts.market.key();
vote_record.user = ctx.accounts.user.key();
vote_record.vote_type = VoteType::XXX;
vote_record.vote = vote;
vote_record.voted_at = clock.unix_timestamp;
vote_record.bump = ctx.bumps.vote_record;

emit!(XXXVoteSubmitted { ... });
```

### Differences (10%)
| Aspect | Proposal | Dispute |
|--------|----------|---------|
| State | `MarketState::Proposed` | `MarketState::Disputed` |
| PDA Seed | `&[0]` | `&[1]` |
| Event | `ProposalVoteSubmitted` | `DisputeVoteSubmitted` |

**Implementation Strategy:**
1. Copy `submit_proposal_vote.rs`
2. Find/replace: Proposal → Dispute, Proposed → Disputed, &[0] → &[1]
3. Verify and test
4. Done in ~1 hour 🚀

---

**Status:** 📝 Story Created - Ready for Implementation
**Next Action:** Begin Step 1 (Write Tests)
**Estimated Completion:** 4 hours from start
**Confidence:** 95% (pattern reuse = fast + low risk)
