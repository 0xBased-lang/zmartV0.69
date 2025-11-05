# Anchor Instruction Implementation Template

**Purpose**: Step-by-step guide for implementing EACH of the 18 Anchor instructions
**Time**: 4-8 hours per instruction (broken into 20 micro-steps of 15-30 min each)
**Usage**: Follow this template for EVERY instruction you implement

---

## 📋 Prerequisites

Before starting, ensure you have:
- [ ] Story file created: `docs/stories/STORY-X.Y.md`
- [ ] Feature branch: `feature/story-X-Y-instruction-name`
- [ ] Anchor project compiling: `anchor build`
- [ ] Reference docs open:
  - `docs/03_SOLANA_PROGRAM_DESIGN.md` (instruction specification)
  - `docs/VERIFICATION_SUMMARY.md` (mechanics reference)

---

## 🎯 PHASE 1: Planning (30 min total)

### Step 1.1: Understand the Instruction (15 min)

```
□ Read instruction specification in 03_SOLANA_PROGRAM_DESIGN.md
  - What is the purpose?
  - What are inputs/outputs?
  - What state transitions occur?

□ Check VERIFICATION_SUMMARY.md for mechanics
  - Any formulas to implement?
  - Any state validations required?
  - Any economic parameters to use?

□ Document in story file
  - Write 2-3 sentence summary of what this instruction does
  - List key validations needed
  - Note any dependencies
```

**Validation**: Can you explain this instruction in plain English?

---

### Step 1.2: Design Account Context (15 min)

```
□ Identify all accounts needed
  - Which accounts are read-only?
  - Which accounts are mutable?
  - Which accounts must sign?

□ Sketch account structure in comments
  Example:
  // Accounts:
  // 1. market (mut) - MarketAccount being updated
  // 2. user (signer) - User performing action
  // 3. config (read) - GlobalConfig for parameters
  // 4. system_program (read) - For transfers

□ Check PDA derivations
  - What seeds are needed?
  - Any bumps to store/verify?

□ Document in story file
  - List all accounts with read/write/signer status
```

**Validation**: Have you identified ALL accounts this instruction touches?

---

## 🏗️ PHASE 2: Structure Definition (60 min total)

### Step 2.1: Create Account Context Struct (20 min)

**File**: `programs/zmart-core/src/instructions/[category]/[instruction_name].rs`

```rust
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct InstructionName<'info> {
    /// Market account being operated on
    #[account(
        mut,
        seeds = [b"market", market.market_id.as_ref()],
        bump = market.bump,
        has_one = creator @ ErrorCode::Unauthorized,
        constraint = market.state == MarketState::Active @ ErrorCode::MarketNotActive
    )]
    pub market: Account<'info, MarketAccount>,

    /// User performing the action
    #[account(mut)]
    pub user: Signer<'info>,

    /// Global configuration
    #[account(
        seeds = [b"config"],
        bump = config.bump
    )]
    pub config: Account<'info, GlobalConfig>,

    /// System program for transfers
    pub system_program: Program<'info, System>,
}
```

**Checklist**:
```
□ All accounts from Step 1.2 included
□ Appropriate macros (#[account(...)] with constraints)
□ PDA seeds correct (cross-check with state.rs)
□ Appropriate constraints (state checks, ownership checks)
□ Error codes defined (see below)
□ Comments explaining each account
```

**Validation**: Does `anchor build` compile without errors?

---

### Step 2.2: Define Instruction Parameters (10 min)

```rust
/// Parameters for this instruction
pub fn instruction_name(
    ctx: Context<InstructionName>,
    param1: u64,          // Amount in lamports (9 decimals)
    param2: bool,         // Outcome (true = YES, false = NO)
    param3: [u8; 32],     // Optional data (e.g., market ID)
) -> Result<()> {
    // Implementation in next phase
    Ok(())
}
```

**Checklist**:
```
□ All parameters from specification included
□ Correct types (u64 for amounts, i64 for timestamps, etc.)
□ Comments explaining each parameter
□ Fixed-point precision noted (9 decimals = PRECISION)
```

**Validation**: Do parameter types match specification?

---

### Step 2.3: Define Error Codes (10 min)

**File**: `programs/zmart-core/src/lib.rs` (add to existing ErrorCode enum)

```rust
#[error_code]
pub enum ErrorCode {
    // ... existing errors

    // Your instruction errors (6XXX range)
    #[msg("Invalid state for this operation")]
    InvalidStateForOperation,

    #[msg("Amount below minimum threshold")]
    AmountBelowMinimum,

    #[msg("User does not have sufficient balance")]
    InsufficientBalance,

    // Add 3-5 specific error codes for your instruction
}
```

**Checklist**:
```
□ 3-5 specific error codes for this instruction
□ Error numbers in correct range (see 03_SOLANA_PROGRAM_DESIGN.md)
□ Clear, actionable error messages
□ Covers all validation failures
```

**Validation**: Are all possible failures covered?

---

### Step 2.4: Add to Program Entry Point (20 min)

**File**: `programs/zmart-core/src/lib.rs`

```rust
// Add module declaration
pub mod instructions;

// In instructions/mod.rs:
pub mod admin;
pub mod market;
pub mod trading;
pub mod resolution;
pub mod moderation;

// In specific category mod.rs (e.g., instructions/trading/mod.rs):
pub mod buy_shares;  // Your new instruction
pub use buy_shares::*;

// In lib.rs, add instruction handler:
pub fn buy_shares(
    ctx: Context<BuyShares>,
    outcome: bool,
    amount: u64,
    max_slippage: u64,
) -> Result<()> {
    instructions::trading::buy_shares::handler(ctx, outcome, amount, max_slippage)
}
```

**Checklist**:
```
□ Module declared in mod.rs
□ Public handler function in lib.rs
□ Parameters match context struct
□ Calls actual implementation (next phase)
```

**Validation**: Does `anchor build` still compile?

---

## 💻 PHASE 3: Core Implementation (120-180 min total)

### Step 3.1: Input Validation (30 min)

```rust
pub fn handler(
    ctx: Context<InstructionName>,
    param1: u64,
    param2: bool,
) -> Result<()> {
    // Get accounts
    let market = &mut ctx.accounts.market;
    let user = &ctx.accounts.user;
    let config = &ctx.accounts.config;

    // STEP 1: Validate inputs
    require!(param1 > 0, ErrorCode::InvalidAmount);
    require!(
        param1 >= config.minimum_bet_amount,
        ErrorCode::AmountBelowMinimum
    );
    require!(
        param1 <= config.maximum_bet_amount,
        ErrorCode::AmountAboveMaximum
    );

    // STEP 2: Validate state
    require!(
        market.state == MarketState::Active,
        ErrorCode::MarketNotActive
    );

    // STEP 3: Validate permissions
    require!(
        !market.creator.eq(&user.key()),
        ErrorCode::CreatorCannotTrade  // If applicable
    );

    // Continue to next step...
    Ok(())
}
```

**Checklist**:
```
□ All input parameters validated
□ Range checks (min/max)
□ State preconditions checked
□ Permission/authorization checks
□ Null checks (for optional parameters)
□ All require!() have appropriate error codes
```

**Validation**: Do all validations have corresponding error codes?

---

### Step 3.2: Core Business Logic (60-90 min)

**This is the meat of the instruction. Break into 3-4 sub-steps:**

#### Sub-step 3.2a: Calculate Values (20-30 min)

```rust
// Example: LMSR calculation for buy_shares
use crate::utils::lmsr;

// Get current state
let q_yes = market.shares_yes;
let q_no = market.shares_no;
let b = market.b_parameter;

// Calculate shares to buy
let shares = lmsr::calculate_shares_for_amount(
    q_yes,
    q_no,
    b,
    param1,  // amount
    param2,  // outcome
)?;

// Verify result
require!(shares > 0, ErrorCode::InvalidShares);
```

**Checklist**:
```
□ Use utility functions from utils/ (don't duplicate logic)
□ All math uses checked operations (.checked_add, .checked_mul, etc.)
□ Fixed-point precision maintained (9 decimals)
□ Result validated (non-zero, within bounds)
```

---

#### Sub-step 3.2b: Calculate Fees (15 min)

```rust
// Calculate 10% total fee (3/2/5 split)
let total_fee = param1
    .checked_mul(config.trading_fee_percent)  // 1000 = 10%
    .ok_or(ErrorCode::OverflowError)?
    .checked_div(10000)
    .ok_or(ErrorCode::DivisionByZero)?;

let protocol_fee = total_fee
    .checked_mul(config.protocol_fee_share)  // 3000 = 30% of fee
    .ok_or(ErrorCode::OverflowError)?
    .checked_div(10000)
    .ok_or(ErrorCode::DivisionByZero)?;

let resolver_fee = total_fee
    .checked_mul(config.resolver_fee_share)  // 2000 = 20% of fee
    .ok_or(ErrorCode::OverflowError)?
    .checked_div(10000)
    .ok_or(ErrorCode::DivisionByZero)?;

let lp_fee = total_fee
    .checked_sub(protocol_fee)
    .ok_or(ErrorCode::UnderflowError)?
    .checked_sub(resolver_fee)
    .ok_or(ErrorCode::UnderflowError)?;

// Net amount after fees
let net_amount = param1
    .checked_sub(total_fee)
    .ok_or(ErrorCode::UnderflowError)?;
```

**Checklist**:
```
□ Fee calculation matches VERIFICATION_SUMMARY.md (10% split 3/2/5)
□ All arithmetic uses checked operations
□ Fee sum equals total fee (no rounding errors)
□ Net amount calculated correctly
```

---

#### Sub-step 3.2c: Update State (20-30 min)

```rust
// Update market state
if param2 {  // YES shares
    market.shares_yes = market.shares_yes
        .checked_add(shares)
        .ok_or(ErrorCode::OverflowError)?;
} else {  // NO shares
    market.shares_no = market.shares_no
        .checked_add(shares)
        .ok_or(ErrorCode::OverflowError)?;
}

// Update liquidity
market.current_liquidity = market.current_liquidity
    .checked_add(net_amount)
    .ok_or(ErrorCode::OverflowError)?;

// Update fees
market.accumulated_protocol_fees = market.accumulated_protocol_fees
    .checked_add(protocol_fee)
    .ok_or(ErrorCode::OverflowError)?;

market.accumulated_resolver_fees = market.accumulated_resolver_fees
    .checked_add(resolver_fee)
    .ok_or(ErrorCode::OverflowError)?;

market.accumulated_lp_fees = market.accumulated_lp_fees
    .checked_add(lp_fee)
    .ok_or(ErrorCode::OverflowError)?;

// Update trade count
market.trade_count = market.trade_count
    .checked_add(1)
    .ok_or(ErrorCode::OverflowError)?;
```

**Checklist**:
```
□ All state updates use checked operations
□ State changes match specification
□ Counter increments (trade_count, etc.)
□ Timestamps updated if needed (Clock::get()?)
```

---

#### Sub-step 3.2d: Token Transfers (15-20 min)

```rust
// Transfer user tokens to market PDA
let transfer_ix = anchor_lang::solana_program::system_instruction::transfer(
    &user.key(),
    &market.key(),
    param1,  // Total amount including fees
);

anchor_lang::solana_program::program::invoke(
    &transfer_ix,
    &[
        user.to_account_info(),
        market.to_account_info(),
        ctx.accounts.system_program.to_account_info(),
    ],
)?;

// Transfer protocol fee to protocol wallet
let protocol_transfer_ix = anchor_lang::solana_program::system_instruction::transfer(
    &market.key(),
    &config.protocol_fee_wallet.key(),
    protocol_fee,
);

anchor_lang::solana_program::program::invoke_signed(
    &protocol_transfer_ix,
    &[
        market.to_account_info(),
        ctx.accounts.protocol_fee_wallet.to_account_info(),
        ctx.accounts.system_program.to_account_info(),
    ],
    &[&[
        b"market",
        market.market_id.as_ref(),
        &[market.bump],
    ]],
)?;
```

**Checklist**:
```
□ Transfer directions correct (who pays whom)
□ Amounts correct (net amounts, fees)
□ PDA signatures included (invoke_signed with seeds)
□ System program passed for SOL transfers
□ OR: SPL token transfer if using tokens
```

---

### Step 3.3: Event Emission (15 min)

```rust
// Emit event for indexing
emit!(SharesBought {
    market_id: market.market_id,
    user: user.key(),
    outcome: param2,
    shares,
    cost: param1,
    price_after: lmsr::get_current_price(
        market.shares_yes,
        market.shares_no,
        market.b_parameter
    )?,
    timestamp: Clock::get()?.unix_timestamp,
});

Ok(())
```

**Event Definition** (in lib.rs or events.rs):
```rust
#[event]
pub struct SharesBought {
    pub market_id: [u8; 32],
    pub user: Pubkey,
    pub outcome: bool,
    pub shares: u64,
    pub cost: u64,
    pub price_after: u64,
    pub timestamp: i64,
}
```

**Checklist**:
```
□ Event struct defined with #[event]
□ All relevant data included
□ No sensitive data exposed
□ Timestamp included
□ emit!() macro called at end
```

**Validation**: Does event capture all data needed for frontend/backend?

---

### Step 3.4: Add Logging (10 min)

```rust
use anchor_lang::solana_program::msg;

// At key points in your handler:
msg!("BuyShares: user={}, market={}, amount={}",
     user.key(), market.key(), param1);

msg!("BuyShares: calculated shares={}, fees={}",
     shares, total_fee);

msg!("BuyShares: updated shares_yes={}, shares_no={}",
     market.shares_yes, market.shares_no);
```

**Checklist**:
```
□ Log at function entry
□ Log key calculations
□ Log state updates
□ Log at function exit
□ Use msg!() macro (appears in transaction logs)
```

---

## 🧪 PHASE 4: Testing (90-120 min total)

### Step 4.1: Write Unit Test Structure (20 min)

**File**: `programs/zmart-core/tests/[instruction_name].ts`

```typescript
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { ZmartCore } from "../target/types/zmart_core";
import { expect } from "chai";

describe("buy_shares", () => {
  // Configure the client
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.ZmartCore as Program<ZmartCore>;

  // Test accounts
  let globalConfig: anchor.web3.Keypair;
  let market: anchor.web3.Keypair;
  let user: anchor.web3.Keypair;

  before(async () => {
    // Setup test accounts
    globalConfig = anchor.web3.Keypair.generate();
    market = anchor.web3.Keypair.generate();
    user = anchor.web3.Keypair.generate();

    // Initialize (implement in next step)
  });

  it("should buy YES shares successfully", async () => {
    // Test implementation
  });

  it("should buy NO shares successfully", async () => {
    // Test implementation
  });

  it("should reject amount below minimum", async () => {
    // Test implementation
  });

  it("should reject when market not active", async () => {
    // Test implementation
  });

  // Add 5-10 more tests covering edge cases
});
```

**Checklist**:
```
□ Test file created in tests/ directory
□ Imports correct
□ Test accounts defined
□ before() hook for setup
□ 5-10 test cases planned
```

---

### Step 4.2: Implement Happy Path Test (30 min)

```typescript
it("should buy YES shares successfully", async () => {
  // Arrange: Setup test state
  const amount = 1_000_000_000; // 1 SOL with 9 decimals
  const outcome = true; // YES

  // Get initial state
  const marketBefore = await program.account.marketAccount.fetch(market.publicKey);
  const initialSharesYes = marketBefore.sharesYes.toNumber();

  // Act: Call instruction
  const tx = await program.methods
    .buyShares(outcome, new anchor.BN(amount), new anchor.BN(0)) // 0 slippage for test
    .accounts({
      market: market.publicKey,
      user: user.publicKey,
      config: globalConfig.publicKey,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .signers([user])
    .rpc();

  // Assert: Verify results
  const marketAfter = await program.account.marketAccount.fetch(market.publicKey);

  // Check shares increased
  expect(marketAfter.sharesYes.toNumber()).to.be.greaterThan(initialSharesYes);

  // Check fees collected
  expect(marketAfter.accumulatedProtocolFees.toNumber()).to.be.greaterThan(0);

  // Check event emitted
  const events = await program.account.marketAccount.fetch(market.publicKey);
  // Verify event data matches
});
```

**Checklist**:
```
□ Arrange: Setup clear
□ Act: Instruction called correctly
□ Assert: All state changes verified
□ Fees verified
□ Events checked
□ Test passes
```

---

### Step 4.3: Implement Error Tests (30 min)

```typescript
it("should reject amount below minimum", async () => {
  const tooSmall = 1_000_000; // 0.001 SOL (below minimum)

  try {
    await program.methods
      .buyShares(true, new anchor.BN(tooSmall), new anchor.BN(0))
      .accounts({ /* ... */ })
      .signers([user])
      .rpc();

    // Should not reach here
    expect.fail("Expected error was not thrown");
  } catch (err) {
    // Verify correct error code
    expect(err.error.errorCode.code).to.equal("AmountBelowMinimum");
  }
});

it("should reject when market not active", async () => {
  // Set market to PROPOSED state
  await program.methods
    .updateMarketState(0) // PROPOSED
    .accounts({ /* ... */ })
    .rpc();

  try {
    await program.methods
      .buyShares(true, new anchor.BN(1_000_000_000), new anchor.BN(0))
      .accounts({ /* ... */ })
      .signers([user])
      .rpc();

    expect.fail("Expected error was not thrown");
  } catch (err) {
    expect(err.error.errorCode.code).to.equal("MarketNotActive");
  }
});
```

**Checklist**:
```
□ Test for EACH error code defined
□ Verify correct error code returned
□ Test for boundary conditions (min/max)
□ Test for state validation failures
□ All tests pass
```

---

### Step 4.4: Run Tests and Fix Issues (30 min)

```bash
# Run all tests
anchor test

# Run specific test file
anchor test --skip-build -- --grep "buy_shares"

# Check test coverage
anchor test --coverage
```

**Checklist**:
```
□ All tests passing
□ No warnings in output
□ Test coverage >80% for this instruction
□ Edge cases covered
□ Error cases covered
```

**If tests fail**:
1. Read error message carefully
2. Check RECOVERY_PROCEDURES.md → "Test Failures"
3. Fix ONE test at a time
4. Commit after each fix

---

## 📝 PHASE 5: Documentation (30 min total)

### Step 5.1: Add Inline Documentation (15 min)

```rust
/// Buys shares in a prediction market using LMSR pricing
///
/// This instruction allows users to purchase YES or NO shares in an active market.
/// The LMSR algorithm determines the number of shares based on the provided amount.
/// A 10% fee is collected and split between protocol (3%), creator (2%), and LPs (5%).
///
/// # Arguments
/// * `outcome` - true for YES, false for NO
/// * `amount` - Total amount to spend (including fees), in lamports
/// * `max_slippage` - Maximum acceptable slippage in basis points (e.g., 500 = 5%)
///
/// # Errors
/// * `AmountBelowMinimum` - Amount less than configured minimum
/// * `AmountAboveMaximum` - Amount exceeds configured maximum
/// * `MarketNotActive` - Market must be in ACTIVE state
/// * `SlippageExceeded` - Price moved beyond acceptable range
///
/// # Example
/// ```rust
/// // Buy 1 SOL worth of YES shares with 5% max slippage
/// buy_shares(ctx, true, 1_000_000_000, 500)?;
/// ```
pub fn handler(
    ctx: Context<BuyShares>,
    outcome: bool,
    amount: u64,
    max_slippage: u64,
) -> Result<()> {
    // ... implementation
}
```

**Checklist**:
```
□ Function-level documentation (///)
□ Arguments explained
□ Errors listed
□ Example provided
□ Complex logic commented
```

---

### Step 5.2: Update Story File (15 min)

**File**: `docs/stories/STORY-X.Y.md`

Add to "Implementation Notes" section:
```markdown
## Implementation Notes

### buy_shares Instruction

**Implementation Time**: X hours
**Challenges**:
- LMSR calculation required careful fixed-point math
- Fee distribution needed checked arithmetic throughout
- Event structure required all relevant data for indexer

**Key Decisions**:
- Used invoke_signed for protocol fee transfer (PDA authority)
- Slippage check happens after share calculation (not before)
- Fees calculated from gross amount, not net

**Testing**:
- 10 test cases covering happy path + errors
- Coverage: 85%
- All tests passing

**Files Modified**:
- programs/zmart-core/src/instructions/trading/buy_shares.rs (new)
- programs/zmart-core/src/lib.rs (added handler)
- programs/zmart-core/tests/buy_shares.ts (new)
```

**Checklist**:
```
□ Time spent documented
□ Challenges noted
□ Key decisions explained
□ Test results documented
□ Files list updated
```

---

## ✅ Completion Checklist

Before marking instruction as COMPLETE:

```
□ Implementation compiles without errors
□ All validations in place
□ All error codes defined and used
□ Business logic matches specification
□ Fees calculated correctly
□ State updates correct
□ Event emitted
□ Logging added
□ 5-10 tests written and passing
□ Test coverage >80%
□ Documentation complete
□ Story file updated
□ Committed and pushed
□ PR created (optional)
□ Code reviewed (if team)
```

---

## 🔄 Iteration Tips

**First instruction (slowest)**:
- Expect 6-8 hours
- Learn the pattern
- Set up testing infrastructure

**Subsequent instructions (faster)**:
- Should take 4-6 hours
- Copy structure from first
- Reuse testing setup

**By 5th instruction**:
- Should take 3-4 hours
- Pattern is muscle memory
- Can do multiple per day

---

## 📚 Related Templates

- [Backend Service Template](./backend-service-template.md)
- [Frontend Component Template](./frontend-component-template.md)
- [Testing Template](./testing-template.md)

---

**Last Updated**: November 5, 2025
**Version**: 1.0
**Status**: ✅ READY FOR USE

**Remember**: Every instruction follows this exact pattern. No shortcuts. Quality over speed. 🚀
