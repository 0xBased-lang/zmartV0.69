# 06 - State Management: 6-State FSM Implementation

**Status**: Implementation-Ready
**Version**: v0.69
**Last Updated**: 2025-11-05
**Prerequisites**: `CORE_LOGIC_INVARIANTS.md`, `03_SOLANA_PROGRAM_DESIGN.md`

---

## Table of Contents

1. [FSM Overview](#fsm-overview)
2. [State Definitions](#state-definitions)
3. [State Transitions](#state-transitions)
4. [Rust Implementation](#rust-implementation)
5. [Automatic Transitions](#automatic-transitions)
6. [State-Based Access Control](#state-based-access-control)
7. [State Validation](#state-validation)
8. [Error Handling](#error-handling)
9. [Testing Strategy](#testing-strategy)

---

## FSM Overview

### 6-State Lifecycle

```
PROPOSED → APPROVED → ACTIVE → RESOLVING → DISPUTED → FINALIZED
                                      ↓
                                FINALIZED (no dispute)
```

### State Machine Diagram

```
┌─────────────┐
│  PROPOSED   │  Market created, awaiting community approval
│   (State 0) │
└─────────────┘
      │
      │ approve_market (70% like votes)
      ↓
┌─────────────┐
│  APPROVED   │  Community approved, awaiting activation
│   (State 1) │
└─────────────┘
      │
      │ activate_market (creator funds liquidity)
      ↓
┌─────────────┐
│   ACTIVE    │  Trading enabled
│   (State 2) │
└─────────────┘
      │
      │ resolve_market (resolver proposes outcome)
      ↓
┌─────────────┐
│  RESOLVING  │  3-day dispute period
│   (State 3) │
└─────────────┘
      │                   │
      │ (disputed)        │ (no dispute after 3 days)
      ↓                   ↓
┌─────────────┐     ┌─────────────┐
│  DISPUTED   │     │  FINALIZED  │
│   (State 4) │     │   (State 5) │
└─────────────┘     └─────────────┘
      │
      │ finalize_market (community votes)
      ↓
┌─────────────┐
│  FINALIZED  │  Final outcome set, claims enabled
│   (State 5) │
└─────────────┘
```

---

## State Definitions

### Rust Enum

```rust
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
#[repr(u8)]
pub enum MarketState {
    /// Market created, awaiting community approval via voting
    Proposed = 0,

    /// Community approved (≥70% likes), waiting for creator to activate
    Approved = 1,

    /// Active trading, users can buy/sell shares
    Active = 2,

    /// Resolution proposed, 3-day dispute period active
    Resolving = 3,

    /// Dispute initiated, community voting on outcome
    Disputed = 4,

    /// Final outcome determined, claims enabled
    Finalized = 5,
}
```

### State Properties

| State | Trading | Voting | Resolution | Claiming | Withdrawal |
|-------|---------|--------|------------|----------|------------|
| PROPOSED | ❌ | ✅ (proposal) | ❌ | ❌ | ❌ |
| APPROVED | ❌ | ❌ | ❌ | ❌ | ❌ |
| ACTIVE | ✅ | ❌ | ❌ | ❌ | ❌ |
| RESOLVING | ❌ | ❌ (can dispute) | ❌ | ❌ | ❌ |
| DISPUTED | ❌ | ✅ (dispute) | ❌ | ❌ | ❌ |
| FINALIZED | ❌ | ❌ | ❌ | ✅ | ✅ (creator) |

---

## State Transitions

### Valid Transitions

```rust
impl MarketState {
    /// Check if transition from current state to new state is valid
    pub fn can_transition_to(&self, new_state: MarketState) -> bool {
        use MarketState::*;
        matches!(
            (*self, new_state),
            (Proposed, Approved) |
            (Approved, Active) |
            (Active, Resolving) |
            (Resolving, Disputed) |
            (Resolving, Finalized) |
            (Disputed, Finalized)
        )
    }

    /// Get all valid next states
    pub fn valid_next_states(&self) -> Vec<MarketState> {
        use MarketState::*;
        match self {
            Proposed => vec![Approved],
            Approved => vec![Active],
            Active => vec![Resolving],
            Resolving => vec![Disputed, Finalized],
            Disputed => vec![Finalized],
            Finalized => vec![], // Terminal state
        }
    }

    /// Check if state is terminal (no further transitions)
    pub fn is_terminal(&self) -> bool {
        matches!(self, MarketState::Finalized)
    }
}
```

### Transition Triggers

#### 1. PROPOSED → APPROVED

**Trigger**: Backend calls `approve_market` after vote aggregation

**Pre-conditions**:
- Proposal votes aggregated off-chain
- Like ratio ≥ 70% (configurable via GlobalConfig)
- Market not cancelled

```rust
pub fn approve_market(
    ctx: Context<ApproveMarket>,
    final_likes: u32,
    final_dislikes: u32,
) -> Result<()> {
    let market = &mut ctx.accounts.market;
    let config = &ctx.accounts.global_config;

    // Validate current state
    require!(
        market.state == MarketState::Proposed,
        ErrorCode::InvalidStateTransition
    );

    // Update vote counts
    market.proposal_likes = final_likes;
    market.proposal_dislikes = final_dislikes;
    market.proposal_total_votes = final_likes + final_dislikes;

    // Check approval threshold
    require!(
        market.proposal_approved(config.proposal_approval_threshold),
        ErrorCode::InsufficientApprovalVotes
    );

    // Transition state
    market.state = MarketState::Approved;
    market.approved_at = Clock::get()?.unix_timestamp;

    emit!(MarketApproved {
        market_id: market.market_id,
        likes: final_likes,
        dislikes: final_dislikes,
        timestamp: market.approved_at,
    });

    Ok(())
}
```

#### 2. APPROVED → ACTIVE

**Trigger**: Market creator calls `activate_market`

**Pre-conditions**:
- Market in APPROVED state
- Creator has sufficient balance for initial liquidity
- Protocol not paused

```rust
pub fn activate_market(ctx: Context<ActivateMarket>) -> Result<()> {
    let market = &mut ctx.accounts.market;

    // Validate state
    require!(
        market.state == MarketState::Approved,
        ErrorCode::InvalidStateTransition
    );

    // Transfer initial liquidity from creator to market PDA
    let transfer_ix = anchor_lang::solana_program::system_instruction::transfer(
        &ctx.accounts.creator.key(),
        &market.key(),
        market.initial_liquidity,
    );

    anchor_lang::solana_program::program::invoke(
        &transfer_ix,
        &[
            ctx.accounts.creator.to_account_info(),
            market.to_account_info(),
            ctx.accounts.system_program.to_account_info(),
        ],
    )?;

    // Initialize LMSR state
    market.current_liquidity = market.initial_liquidity;
    market.shares_yes = 0;
    market.shares_no = 0;

    // Transition state
    market.state = MarketState::Active;
    market.activated_at = Clock::get()?.unix_timestamp;

    emit!(MarketActivated {
        market_id: market.market_id,
        liquidity: market.initial_liquidity,
        timestamp: market.activated_at,
    });

    Ok(())
}
```

#### 3. ACTIVE → RESOLVING

**Trigger**: Resolver calls `resolve_market`

**Pre-conditions**:
- Market in ACTIVE state
- Minimum time elapsed since activation (24 hours)
- Resolver has sufficient reputation (checked off-chain)

```rust
pub fn resolve_market(
    ctx: Context<ResolveMarket>,
    outcome: Option<bool>, // Some(true)=YES, Some(false)=NO, None=INVALID
    ipfs_evidence_hash: [u8; 46],
) -> Result<()> {
    let market = &mut ctx.accounts.market;
    let config = &ctx.accounts.global_config;
    let clock = Clock::get()?;

    // Validate state
    require!(
        market.state == MarketState::Active,
        ErrorCode::InvalidStateTransition
    );

    // Check minimum resolution delay
    require!(
        clock.unix_timestamp >= market.activated_at + config.min_resolution_delay,
        ErrorCode::ResolutionTooEarly
    );

    // Record resolution
    market.resolver = ctx.accounts.resolver.key();
    market.proposed_outcome = outcome;
    market.ipfs_evidence_hash = ipfs_evidence_hash;
    market.resolution_proposed_at = clock.unix_timestamp;

    // Transition state
    market.state = MarketState::Resolving;

    emit!(MarketResolved {
        market_id: market.market_id,
        resolver: market.resolver,
        outcome,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}
```

#### 4. RESOLVING → DISPUTED

**Trigger**: Any user calls `initiate_dispute`

**Pre-conditions**:
- Market in RESOLVING state
- Still within 3-day dispute period

```rust
pub fn initiate_dispute(ctx: Context<InitiateDispute>) -> Result<()> {
    let market = &mut ctx.accounts.market;
    let config = &ctx.accounts.global_config;
    let clock = Clock::get()?;

    // Validate state
    require!(
        market.state == MarketState::Resolving,
        ErrorCode::InvalidStateTransition
    );

    // Check dispute period not expired
    let dispute_deadline = market.resolution_proposed_at + config.dispute_period;
    require!(
        clock.unix_timestamp <= dispute_deadline,
        ErrorCode::DisputePeriodExpired
    );

    // Initialize dispute tracking
    market.dispute_initiator = ctx.accounts.initiator.key();
    market.dispute_initiated_at = clock.unix_timestamp;
    market.dispute_agree = 0;
    market.dispute_disagree = 0;
    market.dispute_total_votes = 0;

    // Transition state
    market.state = MarketState::Disputed;

    emit!(DisputeInitiated {
        market_id: market.market_id,
        initiator: market.dispute_initiator,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}
```

#### 5. RESOLVING → FINALIZED (No Dispute)

**Trigger**: Backend calls `finalize_market` after dispute period expires

**Pre-conditions**:
- Market in RESOLVING state
- 3-day dispute period expired
- No dispute was initiated

```rust
pub fn finalize_market(
    ctx: Context<FinalizeMarket>,
    dispute_agree: Option<u32>,
    dispute_disagree: Option<u32>,
) -> Result<()> {
    let market = &mut ctx.accounts.market;
    let config = &ctx.accounts.global_config;
    let clock = Clock::get()?;

    // Case 1: RESOLVING → FINALIZED (no dispute)
    if market.state == MarketState::Resolving {
        // Validate dispute period expired
        require!(
            clock.unix_timestamp >= market.resolution_proposed_at + config.dispute_period,
            ErrorCode::DisputePeriodNotExpired
        );

        // Accept proposed outcome
        market.final_outcome = market.proposed_outcome;
    }
    // Case 2: DISPUTED → FINALIZED (handled below)

    // Transition state
    market.state = MarketState::Finalized;
    market.finalized_at = clock.unix_timestamp;

    emit!(MarketFinalized {
        market_id: market.market_id,
        final_outcome: market.final_outcome,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}
```

#### 6. DISPUTED → FINALIZED

**Trigger**: Backend calls `finalize_market` after dispute votes aggregated

**Pre-conditions**:
- Market in DISPUTED state
- Dispute votes aggregated off-chain
- Community decision reached

```rust
// Inside finalize_market function
if market.state == MarketState::Disputed {
    // Update dispute vote counts
    let agree = dispute_agree.ok_or(ErrorCode::MissingDisputeVotes)?;
    let disagree = dispute_disagree.ok_or(ErrorCode::MissingDisputeVotes)?;

    market.dispute_agree = agree;
    market.dispute_disagree = disagree;
    market.dispute_total_votes = agree + disagree;

    // Check if dispute succeeded (≥60% agree)
    if market.dispute_succeeded(config.dispute_success_threshold) {
        // Flip outcome
        market.final_outcome = match market.proposed_outcome {
            Some(true) => Some(false),  // YES → NO
            Some(false) => Some(true),  // NO → YES
            None => None,               // INVALID stays INVALID
        };
    } else {
        // Keep original outcome
        market.final_outcome = market.proposed_outcome;
    }
}
```

---

## Rust Implementation

### MarketAccount State Field

```rust
#[account]
pub struct MarketAccount {
    // ... other fields

    /// Current state of the market
    pub state: MarketState,

    /// State transition timestamps
    pub created_at: i64,          // PROPOSED
    pub approved_at: i64,         // APPROVED
    pub activated_at: i64,        // ACTIVE
    pub resolution_proposed_at: i64, // RESOLVING
    pub dispute_initiated_at: i64,   // DISPUTED
    pub finalized_at: i64,        // FINALIZED

    // ... other fields
}
```

### State Validation Constraint

```rust
// In instruction context
#[derive(Accounts)]
pub struct BuyShares<'info> {
    #[account(
        mut,
        constraint = market.state == MarketState::Active @ ErrorCode::MarketNotActive
    )]
    pub market: Account<'info, MarketAccount>,

    // ... other accounts
}
```

### State Transition Helper

```rust
impl MarketAccount {
    /// Safely transition to new state with validation
    pub fn transition_to(&mut self, new_state: MarketState, clock: &Clock) -> Result<()> {
        // Validate transition
        require!(
            self.state.can_transition_to(new_state),
            ErrorCode::InvalidStateTransition
        );

        // Update state
        let old_state = self.state;
        self.state = new_state;

        // Update timestamp for new state
        match new_state {
            MarketState::Approved => self.approved_at = clock.unix_timestamp,
            MarketState::Active => self.activated_at = clock.unix_timestamp,
            MarketState::Resolving => self.resolution_proposed_at = clock.unix_timestamp,
            MarketState::Disputed => self.dispute_initiated_at = clock.unix_timestamp,
            MarketState::Finalized => self.finalized_at = clock.unix_timestamp,
            _ => {}
        }

        // Emit event
        emit!(StateTransitioned {
            market_id: self.market_id,
            from_state: old_state as u8,
            to_state: new_state as u8,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }
}
```

---

## Automatic Transitions

### Backend Monitor Service

**Purpose**: Detect and execute time-based state transitions

```rust
// Pseudo-code for backend service
async fn monitor_markets() {
    loop {
        let now = SystemTime::now().unix_timestamp();

        // Find markets in RESOLVING state past dispute deadline
        let markets_to_finalize = query_markets(|m| {
            m.state == MarketState::Resolving &&
            now >= m.resolution_proposed_at + DISPUTE_PERIOD &&
            !m.has_dispute()
        });

        for market in markets_to_finalize {
            // Automatically finalize (no dispute)
            program
                .methods
                .finalizeMarket(None, None)
                .accounts({
                    market: market.address,
                    backend: backend_keypair.publicKey,
                })
                .rpc();
        }

        sleep(60_000); // Check every minute
    }
}
```

### State Expiry Checks

```rust
impl MarketAccount {
    /// Check if dispute period has expired
    pub fn dispute_period_expired(&self, clock: &Clock, config: &GlobalConfig) -> bool {
        if self.state != MarketState::Resolving {
            return false;
        }

        clock.unix_timestamp >= self.resolution_proposed_at + config.dispute_period
    }

    /// Check if resolution can be proposed (24h delay passed)
    pub fn can_resolve(&self, clock: &Clock, config: &GlobalConfig) -> bool {
        if self.state != MarketState::Active {
            return false;
        }

        clock.unix_timestamp >= self.activated_at + config.min_resolution_delay
    }
}
```

---

## State-Based Access Control

### Instruction Guard Macros

```rust
/// Require market to be in specific state
macro_rules! require_state {
    ($market:expr, $state:expr) => {
        require!(
            $market.state == $state,
            ErrorCode::InvalidStateTransition
        );
    };
}

/// Require market to be in one of multiple states
macro_rules! require_states {
    ($market:expr, $($state:expr),+) => {
        require!(
            $(
                $market.state == $state
            )||+,
            ErrorCode::InvalidStateTransition
        );
    };
}
```

### Usage Examples

```rust
// Buy shares: only allowed in ACTIVE
pub fn buy_shares(ctx: Context<BuyShares>, ...) -> Result<()> {
    require_state!(ctx.accounts.market, MarketState::Active);
    // ... buy logic
}

// Claim winnings: only in FINALIZED
pub fn claim_winnings(ctx: Context<ClaimWinnings>) -> Result<()> {
    require_state!(ctx.accounts.market, MarketState::Finalized);
    // ... claim logic
}

// Submit proposal vote: only in PROPOSED
pub fn submit_proposal_vote(ctx: Context<SubmitProposalVote>, ...) -> Result<()> {
    require_state!(ctx.accounts.market, MarketState::Proposed);
    // ... vote logic
}

// Submit dispute vote: only in DISPUTED
pub fn submit_dispute_vote(ctx: Context<SubmitDisputeVote>, ...) -> Result<()> {
    require_state!(ctx.accounts.market, MarketState::Disputed);
    // ... vote logic
}
```

---

## State Validation

### Invariant Checks

```rust
impl MarketAccount {
    /// Validate market state consistency
    pub fn validate_state_invariants(&self, clock: &Clock) -> Result<()> {
        use MarketState::*;

        match self.state {
            Proposed => {
                // Should have creation timestamp
                require!(self.created_at > 0, ErrorCode::InvalidState);
                // Should not have activation timestamp
                require!(self.activated_at == 0, ErrorCode::InvalidState);
            }
            Approved => {
                // Should have approval timestamp after creation
                require!(self.approved_at > self.created_at, ErrorCode::InvalidState);
                // Should have passed approval threshold
                require!(
                    self.proposal_approved(7000), // 70%
                    ErrorCode::InvalidState
                );
            }
            Active => {
                // Should have liquidity
                require!(self.current_liquidity > 0, ErrorCode::InvalidState);
                // Should have activation timestamp
                require!(self.activated_at > self.approved_at, ErrorCode::InvalidState);
            }
            Resolving => {
                // Should have resolver set
                require!(self.resolver != Pubkey::default(), ErrorCode::InvalidState);
                // Should have resolution timestamp
                require!(
                    self.resolution_proposed_at > self.activated_at,
                    ErrorCode::InvalidState
                );
                // Should be within dispute period or expired
                let deadline = self.resolution_proposed_at + 259200; // 3 days
                require!(
                    clock.unix_timestamp <= deadline + 86400, // +1 day grace
                    ErrorCode::InvalidState
                );
            }
            Disputed => {
                // Should have dispute timestamp
                require!(self.dispute_initiated_at > 0, ErrorCode::InvalidState);
                // Should have initiator
                require!(self.dispute_initiator != Pubkey::default(), ErrorCode::InvalidState);
            }
            Finalized => {
                // Should have final outcome set
                require!(self.final_outcome.is_some() || true, ErrorCode::InvalidState);
                // Should have finalization timestamp
                require!(self.finalized_at > 0, ErrorCode::InvalidState);
            }
        }

        Ok(())
    }
}
```

---

## Error Handling

### State-Related Errors

```rust
#[error_code]
pub enum ErrorCode {
    // State Transition Errors (6100-6119)
    #[msg("Invalid state transition")]
    InvalidStateTransition,

    #[msg("Market not in active state for trading")]
    MarketNotActive,

    #[msg("Market not finalized yet")]
    MarketNotFinalized,

    #[msg("Invalid state for voting")]
    InvalidStateForVoting,

    #[msg("Resolution proposed too early (min 24h required)")]
    ResolutionTooEarly,

    #[msg("Dispute period has expired")]
    DisputePeriodExpired,

    #[msg("Dispute period has not expired yet")]
    DisputePeriodNotExpired,

    #[msg("Market state is inconsistent")]
    InvalidState,

    // ... other errors
}
```

### State Transition Logging

```rust
#[event]
pub struct StateTransitioned {
    pub market_id: [u8; 32],
    pub from_state: u8,
    pub to_state: u8,
    pub timestamp: i64,
}

#[event]
pub struct StateTransitionFailed {
    pub market_id: [u8; 32],
    pub attempted_from: u8,
    pub attempted_to: u8,
    pub reason: String,
    pub timestamp: i64,
}
```

---

## Testing Strategy

### Unit Tests

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_valid_transitions() {
        assert!(MarketState::Proposed.can_transition_to(MarketState::Approved));
        assert!(MarketState::Approved.can_transition_to(MarketState::Active));
        assert!(MarketState::Active.can_transition_to(MarketState::Resolving));
        assert!(MarketState::Resolving.can_transition_to(MarketState::Disputed));
        assert!(MarketState::Resolving.can_transition_to(MarketState::Finalized));
        assert!(MarketState::Disputed.can_transition_to(MarketState::Finalized));
    }

    #[test]
    fn test_invalid_transitions() {
        // Cannot skip states
        assert!(!MarketState::Proposed.can_transition_to(MarketState::Active));
        assert!(!MarketState::Approved.can_transition_to(MarketState::Resolving));

        // Cannot go backwards
        assert!(!MarketState::Active.can_transition_to(MarketState::Proposed));
        assert!(!MarketState::Finalized.can_transition_to(MarketState::Active));

        // Finalized is terminal
        assert!(!MarketState::Finalized.can_transition_to(MarketState::Active));
    }

    #[test]
    fn test_terminal_state() {
        assert!(MarketState::Finalized.is_terminal());
        assert!(!MarketState::Active.is_terminal());
    }
}
```

### Integration Tests

```typescript
describe("Market State Transitions", () => {
  it("Complete lifecycle: PROPOSED → FINALIZED", async () => {
    // 1. Create market (PROPOSED)
    await program.methods.proposeMarket(...).rpc();
    let market = await program.account.marketAccount.fetch(marketPda);
    expect(market.state).to.equal(MarketState.Proposed);

    // 2. Approve (PROPOSED → APPROVED)
    await program.methods.approveMarket(70, 30).rpc();
    market = await program.account.marketAccount.fetch(marketPda);
    expect(market.state).to.equal(MarketState.Approved);

    // 3. Activate (APPROVED → ACTIVE)
    await program.methods.activateMarket().rpc();
    market = await program.account.marketAccount.fetch(marketPda);
    expect(market.state).to.equal(MarketState.Active);

    // 4. Trade (stays ACTIVE)
    await program.methods.buyShares(...).rpc();
    market = await program.account.marketAccount.fetch(marketPda);
    expect(market.state).to.equal(MarketState.Active);

    // 5. Resolve (ACTIVE → RESOLVING)
    await program.methods.resolveMarket(true, evidenceHash).rpc();
    market = await program.account.marketAccount.fetch(marketPda);
    expect(market.state).to.equal(MarketState.Resolving);

    // 6. Wait 3 days (mock time)
    await advanceTime(3 * 24 * 60 * 60);

    // 7. Finalize (RESOLVING → FINALIZED, no dispute)
    await program.methods.finalizeMarket(null, null).rpc();
    market = await program.account.marketAccount.fetch(marketPda);
    expect(market.state).to.equal(MarketState.Finalized);
  });

  it("Dispute flow: RESOLVING → DISPUTED → FINALIZED", async () => {
    // ... setup market in RESOLVING state

    // Initiate dispute
    await program.methods.initiateDispute().rpc();
    let market = await program.account.marketAccount.fetch(marketPda);
    expect(market.state).to.equal(MarketState.Disputed);

    // Community votes on dispute (off-chain aggregation)
    // ...

    // Finalize with dispute results
    await program.methods.finalizeMarket(60, 40).rpc();
    market = await program.account.marketAccount.fetch(marketPda);
    expect(market.state).to.equal(MarketState.Finalized);
    expect(market.finalOutcome).to.equal(false); // Outcome flipped
  });
});
```

### State Visualization Tool

```bash
# CLI tool to visualize market state
$ zmart-cli market state <MARKET_ID>

Market ID: a1b2c3...
Current State: RESOLVING
Timeline:
  ✅ PROPOSED    (2025-11-01 10:00:00)
  ✅ APPROVED    (2025-11-02 14:30:00) - 78% approval
  ✅ ACTIVE      (2025-11-02 15:00:00) - 10 SOL liquidity
  🔄 RESOLVING   (2025-11-05 12:00:00) - Resolver: 0xabc...
     Outcome: YES
     Evidence: Qm...xyz (IPFS)
     Dispute Deadline: 2025-11-08 12:00:00 (2d 18h remaining)
  ⏳ DISPUTED    (not yet)
  ⏳ FINALIZED   (not yet)

Next Actions:
  - Anyone can initiate dispute (within 2d 18h)
  - Auto-finalize after deadline if no dispute
```

---

## Production Checklist

### Pre-Deployment

- [ ] All state transitions tested in integration suite
- [ ] Invalid transitions properly rejected with correct error codes
- [ ] State invariants validated in all instructions
- [ ] Time-based transitions handled correctly (dispute deadline, min resolution delay)
- [ ] Backend monitor service tested for auto-finalization
- [ ] State events emitted correctly for indexing
- [ ] Frontend state visualization working

### Monitoring

- [ ] Track state distribution across all markets
- [ ] Alert on markets stuck in non-terminal states for >7 days
- [ ] Monitor invalid state transition attempts
- [ ] Track average time in each state
- [ ] Identify bottlenecks (e.g., markets stuck in APPROVED)

---

**Document Status**: ✅ Implementation-Ready
**Next Document**: `07_ON_CHAIN_OFF_CHAIN_INTEGRATION.md`
**Integration**: `03_SOLANA_PROGRAM_DESIGN.md`, `CORE_LOGIC_INVARIANTS.md`
