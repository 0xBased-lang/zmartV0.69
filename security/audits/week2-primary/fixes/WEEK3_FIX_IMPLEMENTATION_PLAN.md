# Week 3: Security Fix Implementation Plan

**Date:** November 10, 2025
**Based on:** Security Audit Report (Week 2)
**Timeline:** 5 days (Nov 25-29, 2025)
**Goal:** Resolve all CRITICAL and HIGH severity findings

---

## OVERVIEW

**Total Findings:** 12
- 🔴 CRITICAL: 2 (must fix)
- 🟡 HIGH: 4 (high priority)
- 🟠 MEDIUM: 3 (recommended)
- 🟢 LOW: 2 (optional)

**Estimated Effort:** 35 hours (~1 week)

---

## DAILY BREAKDOWN

### **Day 1: Critical Fixes (8 hours)**

**🚨 CRITICAL Priority**

#### Task 1.1: Fix #3 - Add Rent Reserve Protection (4 hours)

**Files to modify:**
- `programs/zmart-core/src/instructions/sell_shares.rs`
- `programs/zmart-core/src/instructions/claim_winnings.rs`
- `programs/zmart-core/src/instructions/withdraw_liquidity.rs`
- `programs/zmart-core/src/utils/` (create new file: `transfers.rs`)

**Implementation:**

```rust
// Step 1: Create transfer utility (programs/zmart-core/src/utils/transfers.rs)
use anchor_lang::prelude::*;

/// Minimum rent reserve with 50% safety buffer
pub const MIN_RENT_RESERVE_LAMPORTS: u64 = 3_000_000; // ~0.003 SOL

/// Transfer lamports while preserving rent-exempt reserve
pub fn transfer_with_rent_check(
    from: &AccountInfo,
    to: &AccountInfo,
    amount: u64,
    from_account_size: usize,
) -> Result<()> {
    // Get rent minimum for account size
    let rent = Rent::get()?;
    let rent_minimum = rent.minimum_balance(from_account_size);

    // Add 50% safety buffer
    let required_reserve = rent_minimum
        .checked_mul(3)
        .and_then(|x| x.checked_div(2))
        .ok_or(ErrorCode::MathError)?;

    // Calculate final balance after transfer
    let current_balance = from.lamports();
    let final_balance = current_balance
        .checked_sub(amount)
        .ok_or(ErrorCode::InsufficientFunds)?;

    // Enforce rent reserve
    require!(
        final_balance >= required_reserve,
        ErrorCode::InsufficientLiquidity
    );

    // Safe to transfer
    **from.try_borrow_mut_lamports()? = final_balance;
    **to.try_borrow_mut_lamports()? = to
        .lamports()
        .checked_add(amount)
        .ok_or(ErrorCode::OverflowError)?;

    msg!("Transfer: {} lamports (reserve: {} SOL)", amount, final_balance);

    Ok(())
}
```

```rust
// Step 2: Update sell_shares.rs (line 137-159)
// Replace direct lamport manipulation with:
use crate::utils::transfers::transfer_with_rent_check;

transfer_with_rent_check(
    market.to_account_info(),
    ctx.accounts.user.to_account_info(),
    net_proceeds,
    MarketAccount::LEN,
)?;
```

```rust
// Step 3: Update claim_winnings.rs
transfer_with_rent_check(
    market.to_account_info(),
    ctx.accounts.user.to_account_info(),
    payout_amount,
    MarketAccount::LEN,
)?;
```

```rust
// Step 4: Update withdraw_liquidity.rs
transfer_with_rent_check(
    market.to_account_info(),
    ctx.accounts.creator.to_account_info(),
    withdrawal_amount,
    MarketAccount::LEN,
)?;
```

**Testing:**
```rust
#[test]
#[should_panic(expected = "InsufficientLiquidity")]
fn test_cannot_drain_below_rent() {
    let market = setup_market(liquidity: 0.005 SOL);

    // Try to withdraw all liquidity
    let result = sell_shares(amount: 0.004 SOL);

    // Should panic - can't drain below rent reserve
}

#[test]
fn test_rent_reserve_enforced() {
    let market_balance = get_market_balance();
    let rent_minimum = Rent::get().minimum_balance(MarketAccount::LEN);
    let required = rent_minimum * 3 / 2;

    assert!(market_balance >= required);
}
```

**Verification:**
- [ ] Compile without errors
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Rent reserve maintained in all scenarios

---

#### Task 1.2: Fix #1 - Fix Account Aliasing in buy_shares (4 hours)

**Files to modify:**
- `programs/zmart-core/src/instructions/buy_shares.rs`
- `programs/zmart-core/src/state/position.rs`

**Implementation:**

```rust
// Step 1: Update BuyShares account struct (buy_shares.rs:41-48)
#[account(
    init_if_needed,  // ✅ Allow updates to existing positions
    payer = user,
    space = UserPosition::LEN,
    seeds = [b"position", market.key().as_ref(), user.key().as_ref()],
    bump,
    constraint = position.user == user.key() || position.user == Pubkey::default()
        @ ErrorCode::Unauthorized
)]
pub position: Account<'info, UserPosition>,
```

```rust
// Step 2: Update handler logic (buy_shares.rs handler)
pub fn handler(ctx: Context<BuyShares>, outcome: bool, target_cost: u64) -> Result<()> {
    // ... existing validation code ...

    let position = &mut ctx.accounts.position;
    let market = &mut ctx.accounts.market;

    // Check if position exists (non-default user field)
    if position.user != Pubkey::default() {
        // EXISTING POSITION - Update it

        // Verify ownership for safety
        require!(
            position.user == ctx.accounts.user.key(),
            ErrorCode::Unauthorized
        );

        // Update shares based on outcome
        if outcome {
            position.shares_yes = position.shares_yes
                .checked_add(shares_bought)
                .ok_or(ErrorCode::OverflowError)?;
        } else {
            position.shares_no = position.shares_no
                .checked_add(shares_bought)
                .ok_or(ErrorCode::OverflowError)?;
        }

        // Update investment totals
        position.total_invested = position.total_invested
            .checked_add(total_cost)
            .ok_or(ErrorCode::OverflowError)?;

        position.trades_count = position.trades_count
            .checked_add(1)
            .ok_or(ErrorCode::OverflowError)?;

        msg!("Updated existing position for {}", position.user);
    } else {
        // NEW POSITION - Initialize it
        position.user = ctx.accounts.user.key();
        position.market = market.key();
        position.shares_yes = if outcome { shares_bought } else { 0 };
        position.shares_no = if !outcome { shares_bought } else { 0 };
        position.total_invested = total_cost;
        position.trades_count = 1;
        position.claimed = false;
        position.bump = ctx.bumps.position;
        position.reserved = [0; 64];

        msg!("Created new position for {}", position.user);
    }

    // ... rest of existing logic (update market state, transfer funds, etc.) ...

    Ok(())
}
```

**Testing:**
```rust
#[test]
fn test_position_created_correctly() {
    // First purchase
    let position1 = buy_shares(user, market, outcome: true, cost: 1000);
    assert_eq!(position1.shares_yes, expected_shares);
    assert_eq!(position1.user, user.pubkey());
}

#[test]
fn test_position_updated_on_second_purchase() {
    // First purchase
    buy_shares(user, market, outcome: true, cost: 1000);
    let shares_first = get_position_shares_yes(user, market);

    // Second purchase
    buy_shares(user, market, outcome: true, cost: 500);
    let shares_second = get_position_shares_yes(user, market);

    // Verify accumulation
    assert!(shares_second > shares_first);
}

#[test]
#[should_panic(expected = "Unauthorized")]
fn test_cannot_manipulate_other_position() {
    // Alice creates position
    let alice_position = buy_shares(alice, market, true, 1000);

    // Bob tries to pass Alice's position PDA
    let result = buy_shares_with_custom_position(
        bob,
        market,
        alice_position,  // ❌ Alice's position
        true,
        500
    );

    // Should panic
}
```

**Verification:**
- [ ] First buy creates new position
- [ ] Subsequent buys update existing position
- [ ] Cannot manipulate other user's positions
- [ ] shares_yes and shares_no accumulate correctly

---

### **Day 2: Fee Rounding & Vote Authority (5 hours)**

#### Task 2.1: Fix #7 - Fee Calculation Rounding Errors (3 hours)

**Files to modify:**
- `programs/zmart-core/src/instructions/buy_shares.rs`
- `programs/zmart-core/src/instructions/sell_shares.rs`
- `programs/zmart-core/src/math/` (create new file: `fees.rs`)

**Implementation:**

```rust
// Step 1: Create fee calculation utility (programs/zmart-core/src/math/fees.rs)
use anchor_lang::prelude::*;
use crate::state::GlobalConfig;
use crate::error::ErrorCode;

/// Calculate fees with proportional splitting (avoids triple truncation)
/// Returns: (total_cost_with_fees, protocol_fee, resolver_fee, lp_fee)
pub fn calculate_fees(
    cost_before_fees: u64,
    config: &GlobalConfig,
) -> Result<(u64, u64, u64, u64)> {
    // Calculate total fee (10% = 1000 bps)
    let total_fee_bps = config.total_fee_bps()?; // 300 + 200 + 500 = 1000
    let total_fee = (cost_before_fees as u128)
        .checked_mul(total_fee_bps as u128)
        .ok_or(ErrorCode::OverflowError)?
        .checked_div(10000)
        .ok_or(ErrorCode::MathError)?
        as u64;

    // Split using proportions (avoids triple truncation)
    let protocol_fee = (total_fee as u128)
        .checked_mul(config.protocol_fee_bps as u128)
        .ok_or(ErrorCode::OverflowError)?
        .checked_div(total_fee_bps as u128)
        .ok_or(ErrorCode::MathError)?
        as u64;

    let resolver_fee = (total_fee as u128)
        .checked_mul(config.resolver_reward_bps as u128)
        .ok_or(ErrorCode::OverflowError)?
        .checked_div(total_fee_bps as u128)
        .ok_or(ErrorCode::MathError)?
        as u64;

    // LP fee gets remainder (ensures sum = total_fee exactly)
    let lp_fee = total_fee
        .checked_sub(protocol_fee)
        .ok_or(ErrorCode::UnderflowError)?
        .checked_sub(resolver_fee)
        .ok_or(ErrorCode::UnderflowError)?;

    // Invariant check: sum must equal total_fee
    let sum = protocol_fee
        .checked_add(resolver_fee)
        .ok_or(ErrorCode::OverflowError)?
        .checked_add(lp_fee)
        .ok_or(ErrorCode::OverflowError)?;

    require!(
        sum == total_fee,
        ErrorCode::FeeSplitInvariantViolation
    );

    // Calculate total cost with fees
    let total_cost = cost_before_fees
        .checked_add(total_fee)
        .ok_or(ErrorCode::OverflowError)?;

    msg!("Fees calculated: total={}, protocol={}, resolver={}, lp={}",
        total_fee, protocol_fee, resolver_fee, lp_fee);

    Ok((total_cost, protocol_fee, resolver_fee, lp_fee))
}
```

```rust
// Step 2: Update buy_shares.rs to use new fee calculation
use crate::math::fees::calculate_fees;

// Replace lines 86-101 with:
let (total_cost, protocol_fee, resolver_fee, lp_fee) =
    calculate_fees(cost_before_fees, &config)?;
```

```rust
// Step 3: Add minimum trade size check
const MIN_TRADE_AMOUNT: u64 = 10_000; // 0.00001 SOL minimum

require!(
    target_cost >= MIN_TRADE_AMOUNT,
    ErrorCode::TradeTooSmall
);
```

**Testing:**
```rust
#[test]
fn test_fee_calculation_no_rounding_errors() {
    // Test various trade sizes
    let test_cases = vec![
        (10, 1),      // Micro-trade: should have 1 lamport fee
        (99, 9),      // Edge case
        (1000, 100),  // Normal trade
        (u64::MAX / 2, _), // Large trade
    ];

    for (cost, expected_min_fee) in test_cases {
        let (total, p, r, l) = calculate_fees(cost, &config).unwrap();
        let total_fee = p + r + l;

        // Verify no fee is zero for non-zero trades
        if cost > 0 {
            assert!(total_fee >= expected_min_fee);
        }

        // Verify sum equals total
        assert_eq!(p + r + l, total - cost);
    }
}

#[test]
fn test_fee_invariant_holds() {
    let (total_cost, protocol, resolver, lp) = calculate_fees(1000, &config).unwrap();
    let fee_sum = protocol + resolver + lp;
    assert_eq!(total_cost, 1000 + fee_sum);
}
```

---

#### Task 2.2: Fix #4 - Vote Aggregation Authority Bypass (2 hours)

**Files to modify:**
- `programs/zmart-core/src/instructions/aggregate_proposal_votes.rs`
- `programs/zmart-core/src/instructions/aggregate_dispute_votes.rs`

**Implementation:**

```rust
// Step 1: Add canonical config validation
pub fn handler(ctx: Context<AggregateProposalVotes>, ...) -> Result<()> {
    // Derive canonical global config PDA
    let (canonical_config, _canonical_bump) = Pubkey::find_program_address(
        &[b"global-config"],
        ctx.program_id
    );

    // Verify we're using the canonical config
    require!(
        ctx.accounts.global_config.key() == canonical_config,
        ErrorCode::InvalidGlobalConfig
    );

    msg!("Validated canonical global config: {}", canonical_config);

    // ... rest of existing logic ...
}
```

```rust
// Step 2: Add error code
#[error_code]
pub enum ErrorCode {
    // ... existing errors ...

    #[msg("Invalid global config - not canonical PDA")]
    InvalidGlobalConfig,
}
```

**Testing:**
```rust
#[test]
#[should_panic(expected = "InvalidGlobalConfig")]
fn test_rejects_fake_global_config() {
    // Create fake global config with attacker as authority
    let fake_config = create_fake_global_config(attacker.pubkey());

    // Try to aggregate votes with fake config
    let result = aggregate_proposal_votes(
        fake_config,  // ❌ Not canonical
        attacker,     // Fake authority
        market,
        votes
    );

    // Should panic
}

#[test]
fn test_accepts_canonical_config() {
    let canonical = get_canonical_global_config();
    let result = aggregate_proposal_votes(canonical, backend_authority, market, votes);
    assert!(result.is_ok());
}
```

---

### **Day 3: State Validation & Bounded Loss (7 hours)**

#### Task 3.1: Fix #6 - State Transition Validation (4 hours)

**Files to modify:**
- `programs/zmart-core/src/state/market.rs`
- All instruction files that change state

**Implementation:**

```rust
// Step 1: Add helper method to MarketAccount (state/market.rs)
impl MarketAccount {
    /// Transition to new state with automatic validation
    pub fn transition_state(&mut self, new_state: MarketState) -> Result<()> {
        // Validate transition is legal
        require!(
            self.can_transition_to(new_state),
            ErrorCode::InvalidStateTransition
        );

        // Log transition for observability
        msg!(
            "State transition: {:?} -> {:?} (market: {})",
            self.state,
            new_state,
            self.key()
        );

        // Update state
        let old_state = self.state;
        self.state = new_state;

        // Emit event (if events are enabled)
        // emit!(StateTransitionEvent { market, old_state, new_state });

        Ok(())
    }
}
```

```rust
// Step 2: Replace all direct state assignments
// In approve_proposal.rs:
market.state = MarketState::Approved;  // ❌ Old

market.transition_state(MarketState::Approved)?;  // ✅ New

// In activate_market.rs:
market.transition_state(MarketState::Active)?;

// In resolve_market.rs:
market.transition_state(MarketState::Resolving)?;

// In initiate_dispute.rs:
market.transition_state(MarketState::Disputed)?;

// In finalize_market.rs:
market.transition_state(MarketState::Finalized)?;
```

**Testing:**
```rust
#[test]
fn test_valid_state_transitions() {
    let transitions = vec![
        (MarketState::Proposed, MarketState::Approved),
        (MarketState::Approved, MarketState::Active),
        (MarketState::Active, MarketState::Resolving),
        (MarketState::Resolving, MarketState::Disputed),
        (MarketState::Resolving, MarketState::Finalized),
        (MarketState::Disputed, MarketState::Finalized),
    ];

    for (from, to) in transitions {
        let mut market = create_market_in_state(from);
        assert!(market.transition_state(to).is_ok());
    }
}

#[test]
#[should_panic(expected = "InvalidStateTransition")]
fn test_cannot_skip_states() {
    let mut market = create_market_in_state(MarketState::Proposed);

    // Try to skip APPROVED and go directly to ACTIVE
    market.transition_state(MarketState::Active).unwrap();
}
```

---

#### Task 3.2: Fix #5 - LMSR Bounded Loss Enforcement (3 hours)

**Files to modify:**
- `programs/zmart-core/src/math/lmsr.rs`
- `programs/zmart-core/src/instructions/finalize_market.rs`

**Implementation:**

```rust
// Step 1: Add validation function to lmsr.rs
/// Validate that market has not exceeded bounded loss guarantee
pub fn validate_bounded_loss(market: &MarketAccount) -> Result<()> {
    let max_allowed_loss = calculate_max_loss(market.b_parameter);

    // Calculate initial pool value (at shares_yes = 0, shares_no = 0)
    let initial_value = cost_function(0, 0, market.b_parameter)?;

    // Calculate current pool value
    let current_value = cost_function(
        market.shares_yes,
        market.shares_no,
        market.b_parameter
    )?;

    // Calculate actual loss
    let actual_loss = if initial_value > current_value {
        initial_value.checked_sub(current_value).unwrap()
    } else {
        0 // No loss (market maker profitable)
    };

    // Enforce bounded loss invariant
    require!(
        actual_loss <= max_allowed_loss,
        ErrorCode::BoundedLossViolation
    );

    msg!(
        "Bounded loss check: actual={} SOL <= max={} SOL",
        actual_loss,
        max_allowed_loss
    );

    Ok(())
}
```

```rust
// Step 2: Call in finalize_market.rs (before allowing claims)
pub fn handler(ctx: Context<FinalizeMarket>, ...) -> Result<()> {
    // ... existing validation ...

    // Validate bounded loss before finalization
    validate_bounded_loss(&market)?;

    // Safe to finalize
    market.transition_state(MarketState::Finalized)?;

    // ... rest of logic ...
}
```

**Testing:**
```rust
#[test]
fn test_bounded_loss_normal_case() {
    let market = create_market(b: 1000 SOL);

    // Normal trading
    buy_shares(...);
    sell_shares(...);

    // Finalize
    let result = finalize_market(market);
    assert!(result.is_ok());

    // Verify loss within bounds
    let max_loss = calculate_max_loss(1000);
    assert!(actual_loss <= max_loss);
}

#[test]
#[should_panic(expected = "BoundedLossViolation")]
fn test_bounded_loss_extreme_case() {
    // This test should be theoretical - we shouldn't be able to violate
    // bounded loss with valid LMSR implementation
}
```

---

### **Day 4: Medium Priority Fixes (5 hours)**

#### Task 4.1: Fix #8 - Add Reentrancy Guards (2 hours)

**Files to modify:**
- `programs/zmart-core/src/state/market.rs`
- `programs/zmart-core/src/instructions/sell_shares.rs`
- `programs/zmart-core/src/instructions/claim_winnings.rs`

**Implementation:**

```rust
// Step 1: Add is_locked field to MarketAccount
pub struct MarketAccount {
    // ... existing fields ...

    pub is_locked: bool,  // Reentrancy guard
}

// Step 2: Add lock helper
impl MarketAccount {
    pub fn lock(&mut self) -> Result<()> {
        require!(!self.is_locked, ErrorCode::Reentrant);
        self.is_locked = true;
        Ok(())
    }

    pub fn unlock(&mut self) {
        self.is_locked = false;
    }
}

// Step 3: Use in sell_shares
pub fn handler(ctx: Context<SellShares>, ...) -> Result<()> {
    let market = &mut ctx.accounts.market;

    // Lock market
    market.lock()?;

    // ... perform transfers ...

    // Unlock market
    market.unlock();

    Ok(())
}
```

---

#### Task 4.2: Fix #10 - Clock Bounds (1 hour)

**Files to modify:**
- `programs/zmart-core/src/instructions/finalize_market.rs`

**Implementation:**

```rust
let clock = Clock::get()?;
let current_time = clock.unix_timestamp;

// Sanity checks
require!(
    current_time >= market.created_at,
    ErrorCode::InvalidTimestamp
);
require!(
    current_time <= market.created_at + (86400 * 365 * 10), // 10 years max
    ErrorCode::InvalidTimestamp
);
```

---

#### Task 4.3: Fix #2 - Double Claim Defense in Depth (2 hours)

Add explicit `resolver_fees_paid` flag as described in audit report.

---

### **Day 5: Testing & Validation (10 hours)**

#### Task 5.1: Write Exploit Verification Tests (5 hours)

Create comprehensive test suite covering all fixes.

#### Task 5.2: Integration Testing (3 hours)

Full lifecycle tests with all fixes applied.

#### Task 5.3: Fuzzing & Stress Testing (2 hours)

- Fuzz LMSR math
- Stress test with 1000+ trades
- Test extreme edge cases

---

## VERIFICATION CHECKLIST

### Pre-Deployment

- [ ] All CRITICAL fixes implemented
- [ ] All HIGH priority fixes implemented
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] Exploit verification tests pass
- [ ] Fuzzing tests pass (no panics)
- [ ] Code review completed
- [ ] Documentation updated
- [ ] Changelog updated

### Post-Deployment (Devnet)

- [ ] Deploy to devnet
- [ ] Smoke tests pass
- [ ] Real trading tests (10+ users)
- [ ] Monitor for 48 hours
- [ ] No unexpected errors
- [ ] Gas costs acceptable

---

## SUCCESS CRITERIA

**Week 3 Complete When:**
1. ✅ All CRITICAL findings resolved
2. ✅ All HIGH priority findings resolved
3. ✅ 100% of exploit tests passing
4. ✅ No regressions introduced
5. ✅ Code review approved
6. ✅ Successfully deployed to devnet
7. ✅ 48-hour stability verification complete

**Timeline:** 5 days + 2 days validation = **7 days total**

**Ready for Week 4:** Re-audit and final security review

---

**End of Fix Implementation Plan**
