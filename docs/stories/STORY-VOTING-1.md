# Story 1.1: Submit Proposal Vote Instruction

**Epic**: Phase 1 - Voting System Foundation (Week 1)
**Priority**: P0 Critical
**Estimated Time**: 5 hours naive, 7 hours with buffer
**Assigned To**: @claude
**Status**: IN PROGRESS

---

## Overview

Implement the `submit_proposal_vote` instruction that allows users to cast votes (like/dislike) on market proposals in the PROPOSED state. This instruction creates an on-chain VoteRecord that serves as proof of vote for backend aggregation.

**Why It's Needed**: This is the foundation of the proposal voting system. Users must be able to express approval/disapproval of market proposals before they can be activated. The vote records are created on-chain for verifiability but aggregated off-chain for gas efficiency.

---

## Acceptance Criteria

### Functional Requirements

1. **GIVEN** a market in PROPOSED state and a user who hasn't voted yet
   **WHEN** user calls submit_proposal_vote with vote=true (like)
   **THEN** a VoteRecord account is created with correct PDA, vote recorded as true, and ProposalVoteSubmitted event emitted

2. **GIVEN** a market in PROPOSED state and a user who hasn't voted yet
   **WHEN** user calls submit_proposal_vote with vote=false (dislike)
   **THEN** a VoteRecord account is created with vote recorded as false and event emitted

3. **GIVEN** a market in PROPOSED state and a user who already voted
   **WHEN** user tries to call submit_proposal_vote again
   **THEN** transaction fails with ErrorCode::AlreadyVoted error

4. **GIVEN** a market in ACTIVE state (not PROPOSED)
   **WHEN** user tries to call submit_proposal_vote
   **THEN** transaction fails with ErrorCode::InvalidStateForVoting error

5. **GIVEN** a valid vote submission
   **WHEN** VoteRecord account is created
   **THEN** account has correct PDA seeds: [b"vote", market.key(), user.key(), &[VoteType::Proposal as u8]]

### Non-Functional Requirements

□ Performance: Transaction completes in <2s on devnet
□ Security: VoteRecord PDA prevents duplicate votes (init fails if account exists)
□ Gas Efficiency: Account size minimized (VoteRecord::LEN = 83 bytes)
□ Blueprint Compliance: Vote recording mechanism matches CORE_LOGIC_INVARIANTS.md

---

## Technical Implementation

### Definition of Done Tier

**Selected Tier**: Tier 2 - Feature Implementation (Moderate Testing)

**Rationale**: New core instruction with account creation, but no external integrations or complex logic. Requires comprehensive unit testing but not full E2E yet (that comes in Week 2 integration tests).

**Tier 2 Requirements:**
- ✅ All unit tests pass (5 tests minimum)
- ✅ Code coverage ≥90% for this instruction
- ✅ Code review completed
- ✅ Documentation (inline comments)
- ✅ Compiles without warnings
- ✅ Works on devnet (smoke test)

### Files to Create

- [x] `programs/zmart-core/src/instructions/submit_proposal_vote.rs` - Instruction implementation
- [ ] `programs/zmart-core/tests/submit_proposal_vote.rs` - Unit tests (5+ test cases)

### Files to Modify

- [ ] `programs/zmart-core/src/instructions/mod.rs` - Export new instruction
- [ ] `programs/zmart-core/src/lib.rs` - Add instruction to program entry point
- [ ] `programs/zmart-core/src/state/vote_record.rs` - Ensure VoteRecord struct exists
- [ ] `programs/zmart-core/src/errors.rs` - Verify AlreadyVoted and InvalidStateForVoting errors exist

### Dependencies

- **Must Complete First**: None (this is the first voting instruction)
- **Blocks**: Story 1.2 (aggregate_proposal_votes) - Cannot aggregate votes that don't exist
- **Related**: Story 1.3 (submit_dispute_vote) - Similar pattern, different vote type

### External Dependencies

- [x] Anchor framework installed and configured
- [x] MarketAccount struct defined with PROPOSED state
- [x] VoteRecord account structure defined
- [x] Error codes defined (ErrorCode enum)

---

## Testing Strategy

### Unit Tests (TDD Approach - Write These First!)

**Test 1: Valid Like Vote**
- [ ] Test name: `test_submit_proposal_vote_like_success`
- [ ] Setup: Create market in PROPOSED state, create user wallet
- [ ] Execute: Call submit_proposal_vote(vote=true)
- [ ] Assert: VoteRecord created, vote=true, market key matches, user key matches, timestamp set

**Test 2: Valid Dislike Vote**
- [ ] Test name: `test_submit_proposal_vote_dislike_success`
- [ ] Setup: Create market in PROPOSED state, create user wallet
- [ ] Execute: Call submit_proposal_vote(vote=false)
- [ ] Assert: VoteRecord created, vote=false, all fields correct

**Test 3: Duplicate Vote Rejected**
- [ ] Test name: `test_submit_proposal_vote_duplicate_fails`
- [ ] Setup: Create market in PROPOSED state, user already voted (VoteRecord exists)
- [ ] Execute: Call submit_proposal_vote again
- [ ] Assert: Transaction fails with ErrorCode::AlreadyVoted (PDA init fails)

**Test 4: Invalid State Rejected**
- [ ] Test name: `test_submit_proposal_vote_wrong_state_fails`
- [ ] Setup: Create market in ACTIVE state (not PROPOSED)
- [ ] Execute: Call submit_proposal_vote
- [ ] Assert: Transaction fails with ErrorCode::InvalidStateForVoting

**Test 5: PDA Seeds Correct**
- [ ] Test name: `test_submit_proposal_vote_pda_derivation`
- [ ] Setup: Create market in PROPOSED state
- [ ] Execute: Call submit_proposal_vote
- [ ] Assert: VoteRecord address matches PDA derived from [b"vote", market_key, user_key, &[0]]

### Integration Tests (Week 2)
- Deferred to Story 2.1 (ProposalManager integration tests)

### E2E Tests (Week 2)
- Deferred to Story 2.1 (full vote aggregation flow)

### Manual Testing Checklist
- [ ] Deploy to devnet
- [ ] Create test market in PROPOSED state
- [ ] Submit like vote from test wallet #1
- [ ] Submit dislike vote from test wallet #2
- [ ] Attempt duplicate vote from wallet #1 (should fail)
- [ ] Attempt vote on ACTIVE market (should fail)
- [ ] Verify VoteRecords visible on Solana Explorer

---

## Design Notes

### Account Structure

```rust
#[account]
pub struct VoteRecord {
    /// Market being voted on
    pub market: Pubkey,          // 32 bytes

    /// User who voted
    pub user: Pubkey,            // 32 bytes

    /// Vote type (Proposal = 0, Dispute = 1)
    pub vote_type: VoteType,     // 1 byte

    /// Vote value (true = like/agree, false = dislike/disagree)
    pub vote: bool,              // 1 byte

    /// Timestamp when vote was cast
    pub voted_at: i64,           // 8 bytes

    /// PDA bump
    pub bump: u8,                // 1 byte
}

impl VoteRecord {
    pub const LEN: usize = 8 +   // discriminator
        32 +                      // market
        32 +                      // user
        1 +                       // vote_type
        1 +                       // vote
        8 +                       // voted_at
        1;                        // bump
    // Total: 83 bytes
}
```

### PDA Derivation

**Seeds**: `[b"vote", market.key().as_ref(), user.key().as_ref(), &[vote_type as u8]]`

**Why These Seeds:**
- `b"vote"`: Namespace prefix (prevents collisions)
- `market.key()`: Ties vote to specific market
- `user.key()`: Ties vote to specific user (prevents duplicates)
- `vote_type`: Distinguishes proposal votes from dispute votes

**Uniqueness Guarantee**: One VoteRecord per (market, user, vote_type) tuple

---

## Implementation Notes

### Approach

**TDD Steps:**
1. Write all 5 unit tests first (they will fail)
2. Implement minimal code to make tests pass
3. Refactor for clarity and performance
4. Add inline documentation
5. Run `cargo test` until 100% pass
6. Run `cargo clippy` and fix warnings
7. Deploy to devnet and smoke test

**Instruction Handler Logic:**
```rust
pub fn handler(
    ctx: Context<SubmitProposalVote>,
    vote: bool,
) -> Result<()> {
    let vote_record = &mut ctx.accounts.vote_record;
    let clock = Clock::get()?;

    // Populate VoteRecord
    vote_record.market = ctx.accounts.market.key();
    vote_record.user = ctx.accounts.user.key();
    vote_record.vote_type = VoteType::Proposal;
    vote_record.vote = vote;
    vote_record.voted_at = clock.unix_timestamp;
    vote_record.bump = ctx.bumps.vote_record;

    // Emit event for backend indexing
    emit!(ProposalVoteSubmitted {
        market_id: ctx.accounts.market.market_id,
        user: vote_record.user,
        vote,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}
```

**Accounts Context:**
```rust
#[derive(Accounts)]
pub struct SubmitProposalVote<'info> {
    #[account(
        seeds = [b"market", &market.market_id],
        bump = market.bump,
        constraint = market.state == MarketState::Proposed @ ErrorCode::InvalidStateForVoting
    )]
    pub market: Account<'info, MarketAccount>,

    #[account(
        init,
        payer = user,
        space = VoteRecord::LEN,
        seeds = [b"vote", market.key().as_ref(), user.key().as_ref(), &[VoteType::Proposal as u8]],
        bump
    )]
    pub vote_record: Account<'info, VoteRecord>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub system_program: Program<'info, System>,
}
```

### Alternatives Considered

- **Option A**: Store all votes in a single VotingAccount with Vec<Vote>
  - Rejected: Gas inefficient (requires resizing), limited by max account size (10MB)

- **Option B**: Use PDA per vote (current approach) - **SELECTED**
  - Pros: Gas efficient (fixed size), scalable (unlimited votes), verifiable (each vote is separate account)
  - Cons: More accounts to query (handled by backend indexing)

- **Option C**: Store vote counts directly in MarketAccount
  - Rejected: Requires on-chain increment (expensive), vulnerable to race conditions

### Risks & Mitigation

- **Risk**: User confusion about vote vs. like/dislike terminology
  **Mitigation**: Clear documentation and frontend UI labels ("Support this market" vs. "Oppose this market")

- **Risk**: PDA derivation mismatch between instruction and tests
  **Mitigation**: Test 5 explicitly verifies PDA derivation with known seeds

- **Risk**: Gas cost for account creation
  **Mitigation**: Account rent-exempt at 83 bytes (~0.0006 SOL), acceptable for voting

---

## Completion Notes

**Completed**: [YYYY-MM-DD - To be filled]
**Actual Time**: [X hours - To be filled]
**Variance**: [+/- Y hours from estimate - To be filled]

### What Went Well
- [To be filled after completion]

### What Didn't Go Well
- [To be filled after completion]

### Lessons Learned
- [To be filled after completion]

### Follow-Up Tasks (if any)
- [ ] Story 1.2: Implement aggregate_proposal_votes instruction
- [ ] Story 1.3: Implement submit_dispute_vote instruction
- [ ] Story 1.4: Implement aggregate_dispute_votes instruction

---

## References

- **Blueprint Compliance**: [docs/CORE_LOGIC_INVARIANTS.md](../CORE_LOGIC_INVARIANTS.md) - Section 3.2 (Proposal Voting)
- **Program Design**: [docs/03_SOLANA_PROGRAM_DESIGN.md](../03_SOLANA_PROGRAM_DESIGN.md) - Instruction #13
- **Implementation Plan**: [docs/IMPLEMENTATION_PHASES.md](../IMPLEMENTATION_PHASES.md) - Phase 1, Week 1
- **Anchor Documentation**: https://www.anchor-lang.com/docs/pdas
- **Solana Clock**: https://docs.rs/solana-program/latest/solana_program/clock/struct.Clock.html

---

**Next Steps After Completion:**
1. Mark this story COMPLETED in TODO_CHECKLIST.md
2. Update Phase 1 Week 1 progress (1/4 instructions complete)
3. Begin Story 1.2: aggregate_proposal_votes
4. Commit changes: `git commit -m "feat: implement submit_proposal_vote instruction"`
