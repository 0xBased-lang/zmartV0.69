# EVM TO SOLANA TRANSLATION GUIDE

**Document:** Pattern-by-Pattern Translation from KEKTECH 3.0 Blueprint
**Version:** 1.0.0
**Last Updated:** January 2025

[← Back to Index](./00_MASTER_INDEX.md) | [← Core Invariants](./CORE_LOGIC_INVARIANTS.md) | [Next: Program Architecture →](./SOLANA_PROGRAM_ARCHITECTURE.md)

---

## Purpose

This document provides **exact translation patterns** from the EVM-based KEKTECH 3.0 blueprint to optimized Solana/Anchor implementations.

**Rule:** Preserve ALL logic from [CORE_LOGIC_INVARIANTS.md](./CORE_LOGIC_INVARIANTS.md), but optimize the implementation for Solana.

---

## Table of Contents

1. [Architecture Pattern Translation](#1-architecture-pattern-translation)
2. [Storage Pattern Translation](#2-storage-pattern-translation)
3. [Access Control Translation](#3-access-control-translation)
4. [Upgrade Pattern Translation](#4-upgrade-pattern-translation)
5. [Data Type Translation](#5-data-type-translation)
6. [Event System Translation](#6-event-system-translation)
7. [Fee Distribution Translation](#7-fee-distribution-translation)
8. [Math Operations Translation](#8-math-operations-translation)
9. [Common Patterns Translation](#9-common-patterns-translation)
10. [Performance Optimizations](#10-performance-optimizations)

---

## 1. Architecture Pattern Translation

### EVM: 7 Separate Contracts

**Blueprint Design:**
```solidity
// 7 independent contracts
contract MasterRegistry { ... }
contract ParameterStorage { ... }
contract AccessControlManager { ... }
contract FlexibleMarketFactory { ... }
contract ProposalManager { ... }
contract ResolutionManager { ... }
contract RewardDistributor { ... }

// Registry pattern for linking
registry.getContract("FlexibleMarketFactory");
```

**Why This in EVM:**
- Modular upgrades (replace one contract)
- Size limits per contract
- Clear separation of concerns

**Solana Translation: 1-2 Anchor Programs**

```rust
// Single monolithic program (recommended)
#[program]
pub mod zmart_prediction_market {
    // All functionality in one program
    // No CPI overhead between instructions
}

// OR two programs if needed:
// 1. zmart_core (markets, trading, resolution)
// 2. zmart_governance (parameters, admin)
```

**Why This Change:**
- **CPI Overhead:** Cross-program invocation costs compute units
- **Account Size:** Solana accounts can be larger (10MB+)
- **Atomicity:** All operations in one transaction
- **Simplicity:** Easier to reason about and audit

**Trade-offs:**
```
Single Program:
✅ No CPI overhead (faster, cheaper)
✅ Atomic operations
✅ Simpler deployment
❌ Larger program binary
❌ Must redeploy entire program on upgrade

Two Programs:
✅ Independent upgrades
✅ Smaller binaries
❌ CPI overhead
❌ More complexity
```

**Recommendation:** Start with single program, split later if needed.

---

## 2. Storage Pattern Translation

### EVM: Contract State Variables

**Blueprint:**
```solidity
contract FlexibleMarketFactory {
    struct Market {
        uint256 marketId;
        address creator;
        string question;
        MarketState state;
        uint256 totalYesShares;
        uint256 totalNoShares;
        uint256 liquidityParam;
        // ... more fields
    }

    mapping(uint256 => Market) public markets;
    mapping(address => uint256[]) public userMarkets;
}
```

**Solana Translation: PDAs (Program Derived Addresses)**

```rust
// Define account structures
#[account]
pub struct GlobalConfig {
    pub authority: Pubkey,           // 32 bytes
    pub total_markets: u64,          // 8 bytes
    pub platform_fee_bps: u16,       // 2 bytes
    pub bump: u8,                    // 1 byte
    // ... more fields
}

#[account]
pub struct MarketAccount {
    pub market_id: u64,
    pub creator: Pubkey,
    pub question: [u8; 256],         // Fixed-size array
    pub state: MarketState,
    pub total_yes_shares: u64,
    pub total_no_shares: u64,
    pub liquidity_param: u64,
    pub bump: u8,
    // ... more fields
}

#[account]
pub struct UserPosition {
    pub market: Pubkey,
    pub owner: Pubkey,
    pub yes_shares: u64,
    pub no_shares: u64,
    pub total_invested: u64,
    pub bump: u8,
}
```

**PDA Derivation (Deterministic Addresses):**

```rust
// Global config (singleton)
let (global_config, bump) = Pubkey::find_program_address(
    &[b"global"],
    &program_id
);

// Market account (one per market)
let (market, bump) = Pubkey::find_program_address(
    &[
        b"market",
        &market_id.to_le_bytes()
    ],
    &program_id
);

// User position (one per user per market)
let (position, bump) = Pubkey::find_program_address(
    &[
        b"position",
        market.as_ref(),
        user.key().as_ref()
    ],
    &program_id
);
```

**Why PDAs:**
- ✅ Deterministic (can find without indexing)
- ✅ Program "owns" the account (only program can sign)
- ✅ No private key needed
- ✅ Can store arbitrary data

**Key Differences:**
```
EVM Mapping:
markets[id] = Market { ... }
→ O(1) lookup, stored in contract

Solana PDA:
find_program_address([b"market", id])
→ Deterministic derivation, separate account
→ Must pass account in transaction
```

---

## 3. Access Control Translation

### EVM: OpenZeppelin AccessControl

**Blueprint:**
```solidity
import "@openzeppelin/contracts/access/AccessControl.sol";

contract FlexibleMarketFactory is AccessControl {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant RESOLVER_ROLE = keccak256("RESOLVER_ROLE");
    bytes32 public constant BACKEND_ROLE = keccak256("BACKEND_ROLE");

    modifier onlyAdmin() {
        require(hasRole(ADMIN_ROLE, msg.sender), "Not admin");
        _;
    }

    function proposeResolution() external onlyResolver {
        // ...
    }
}
```

**Solana Translation: Anchor Constraints**

```rust
// Store roles in GlobalConfig
#[account]
pub struct GlobalConfig {
    pub authority: Pubkey,          // Primary admin
    pub admins: Vec<Pubkey>,        // Additional admins
    pub resolvers: Vec<Pubkey>,     // Resolver list
    pub backend_services: Vec<Pubkey>, // Backend wallets
    pub bump: u8,
}

// Use Anchor constraints for validation
#[derive(Accounts)]
pub struct ProposeResolution<'info> {
    #[account(
        seeds = [b"global"],
        bump = global_config.bump
    )]
    pub global_config: Account<'info, GlobalConfig>,

    pub resolver: Signer<'info>,  // Must be signer

    // Validation happens in instruction
}

pub fn propose_resolution(ctx: Context<ProposeResolution>, ...) -> Result<()> {
    let global = &ctx.accounts.global_config;

    // Check if resolver has RESOLVER role
    require!(
        global.resolvers.contains(&ctx.accounts.resolver.key()),
        ErrorCode::Unauthorized
    );

    // Proceed with logic
    Ok(())
}
```

**Alternative: Bitflag Roles (Gas Optimized)**

```rust
#[account]
pub struct User {
    pub wallet: Pubkey,
    pub roles: u8,  // Bitflags
    pub bump: u8,
}

// Role constants
pub const ADMIN_ROLE: u8 = 1 << 0;      // 0b00000001
pub const RESOLVER_ROLE: u8 = 1 << 1;   // 0b00000010
pub const BACKEND_ROLE: u8 = 1 << 2;    // 0b00000100
pub const CREATOR_ROLE: u8 = 1 << 3;    // 0b00001000

// Check role
fn has_role(user: &User, role: u8) -> bool {
    (user.roles & role) != 0
}

// Add role
fn add_role(user: &mut User, role: u8) {
    user.roles |= role;
}

// Remove role
fn remove_role(user: &mut User, role: u8) {
    user.roles &= !role;
}
```

**Recommendation:** Use Vec<Pubkey> for simplicity unless role count is very high (>100 users).

---

## 4. Upgrade Pattern Translation

### EVM: Registry Pattern (No Proxies)

**Blueprint:**
```solidity
contract MasterRegistry {
    mapping(string => address) public contracts;
    mapping(string => uint256) public versions;

    function upgradeContract(
        string memory name,
        address newImplementation
    ) external onlyAdmin {
        versions[name]++;
        contracts[name] = newImplementation;
    }
}
```

**Solana Translation: Anchor Program Upgrades**

```rust
// Built-in to Anchor/Solana
// No additional code needed

// Program deployment creates:
// - Program account (executable bytecode)
// - Program data account (upgrade authority)

// Upgrade authority can upgrade program
```

**Upgrade Process:**

```bash
# Deploy new version
anchor build
anchor upgrade <program-id> --program-keypair <authority>

# Or use Squads multi-sig for governance
# 1. Create proposal
# 2. Vote on upgrade
# 3. Execute when passed
```

**Key Differences:**
```
EVM Registry:
- Manual contract replacement
- Old contracts can still be called
- Requires migration logic

Solana Upgrade:
- Built-in upgrade mechanism
- Program address stays same
- Old code replaced completely
- Upgrade authority controls process
```

**Recommendation:** Use multi-sig (Squads) as upgrade authority for production.

---

## 5. Data Type Translation

### 5.1 Numeric Types

**Blueprint (EVM with floats):**
```solidity
// EVM uses uint256 (no floats), but blueprint shows:
uint256 liquidityParam = 100;  // Represents 100.0
uint256 price = 0.5 * 1e18;    // 0.5 as fixed-point
```

**Solana Translation:**

```rust
// Use u64 with 9 decimal places (lamport standard)
pub const DECIMALS: u8 = 9;
pub const PRECISION: u64 = 1_000_000_000; // 10^9

// Examples:
let liquidity_param: u64 = 100 * PRECISION;  // 100.0
let price: u64 = (PRECISION / 2);            // 0.5

// LMSR calculations
let b = 100_000_000_000_u64;  // b = 100.0
let q_yes = 500_000_000_000_u64;  // 500 shares
```

**Fixed-Point Arithmetic:**

```rust
// Multiplication (avoid overflow)
pub fn mul_fp(a: u64, b: u64) -> Result<u64> {
    let result = (a as u128)
        .checked_mul(b as u128)
        .ok_or(ErrorCode::Overflow)?
        / (PRECISION as u128);

    Ok(result as u64)
}

// Division
pub fn div_fp(a: u64, b: u64) -> Result<u64> {
    require!(b != 0, ErrorCode::DivisionByZero);

    let result = (a as u128 * PRECISION as u128)
        .checked_div(b as u128)
        .ok_or(ErrorCode::Overflow)?;

    Ok(result as u64)
}
```

### 5.2 String Types

**Blueprint:**
```solidity
string public question;  // Dynamic length
```

**Solana Translation:**

```rust
// Use fixed-size arrays (cheaper, predictable)
pub question: [u8; 256],  // Max 256 bytes

// Helper function to convert
pub fn string_to_bytes(s: String, len: usize) -> Result<Vec<u8>> {
    require!(s.len() <= len, ErrorCode::StringTooLong);

    let mut bytes = vec![0u8; len];
    bytes[..s.len()].copy_from_slice(s.as_bytes());
    Ok(bytes)
}

// Helper to convert back
pub fn bytes_to_string(bytes: &[u8]) -> String {
    let end = bytes.iter().position(|&b| b == 0).unwrap_or(bytes.len());
    String::from_utf8_lossy(&bytes[..end]).to_string()
}
```

### 5.3 Address Types

**Blueprint:**
```solidity
address public creator;
```

**Solana Translation:**

```rust
pub creator: Pubkey,  // 32 bytes

// Ed25519 public key (not Ethereum address)
```

---

## 6. Event System Translation

### EVM: Events

**Blueprint:**
```solidity
event MarketCreated(
    uint256 indexed marketId,
    address indexed creator,
    string question
);

emit MarketCreated(marketId, msg.sender, question);
```

**Solana Translation: Anchor Events**

```rust
#[event]
pub struct MarketCreatedEvent {
    pub market_id: u64,
    pub creator: Pubkey,
    pub question: String,  // Or [u8; 256]
    pub timestamp: i64,
}

// Emit event
emit!(MarketCreatedEvent {
    market_id,
    creator: ctx.accounts.creator.key(),
    question: question_string,
    timestamp: Clock::get()?.unix_timestamp,
});
```

**Key Differences:**
```
EVM Events:
- Indexed for filtering
- Stored in blockchain logs
- Gas cost per event

Solana Events:
- Encoded in transaction logs
- No indexing (use off-chain indexer)
- No additional cost (part of transaction)
```

**Recommendation:** Use events for important state changes (market created, resolved, etc.).

---

## 7. Fee Distribution Translation

### EVM: Token Transfers

**Blueprint:**
```solidity
// Transfer ETH
payable(protocol).transfer(protocolFee);
payable(creator).transfer(creatorFee);
payable(stakerPool).transfer(stakerFee);

// Or ERC20
IERC20(token).transfer(protocol, protocolFee);
```

**Solana Translation: Lamport Transfers / SPL Tokens**

```rust
// Native SOL transfer (lamports)
**market.to_account_info().try_borrow_mut_lamports()? -= amount;
**recipient.to_account_info().try_borrow_mut_lamports()? += amount;

// SPL Token transfer (CPI)
use anchor_spl::token::{self, Transfer};

let cpi_accounts = Transfer {
    from: ctx.accounts.from_token_account.to_account_info(),
    to: ctx.accounts.to_token_account.to_account_info(),
    authority: ctx.accounts.authority.to_account_info(),
};

let cpi_program = ctx.accounts.token_program.to_account_info();
let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);

token::transfer(cpi_ctx, amount)?;
```

**Fee Distribution Example:**

```rust
pub fn distribute_fees(
    trading_fee: u64,
    protocol_vault: &mut Account<FeeVault>,
    creator: &AccountInfo,
    staker_pool: &mut Account<FeeVault>,
) -> Result<()> {
    // Calculate splits (3% / 2% / 5% of total fee)
    let protocol_fee = (trading_fee * 30) / 100;  // 30% of 10% fee
    let creator_fee = (trading_fee * 20) / 100;   // 20% of 10% fee
    let staker_fee = (trading_fee * 50) / 100;    // 50% of 10% fee

    // Verify sum
    require!(
        protocol_fee + creator_fee + staker_fee == trading_fee,
        ErrorCode::FeeMismatch
    );

    // Transfer to each recipient
    **protocol_vault.to_account_info().try_borrow_mut_lamports()? += protocol_fee;
    **creator.try_borrow_mut_lamports()? += creator_fee;
    **staker_pool.to_account_info().try_borrow_mut_lamports()? += staker_fee;

    Ok(())
}
```

---

## 8. Math Operations Translation

### 8.1 LMSR Cost Function

**Blueprint (Conceptual float math):**
```javascript
// Cost function (using JavaScript for clarity)
function costFunction(qYes, qNo, b) {
    const expYes = Math.exp(qYes / b);
    const expNo = Math.exp(qNo / b);
    return b * Math.log(expYes + expNo);
}
```

**Solana Translation (Fixed-point + Approximation):**

```rust
// Use fixed-point u64 with 9 decimals
pub fn cost_function_fp(q_yes: u64, q_no: u64, b: u64) -> Result<u64> {
    // Convert to f64 for calculation (careful with precision)
    let q_yes_f = q_yes as f64 / PRECISION as f64;
    let q_no_f = q_no as f64 / PRECISION as f64;
    let b_f = b as f64 / PRECISION as f64;

    // Calculate
    let exp_yes = (q_yes_f / b_f).exp();
    let exp_no = (q_no_f / b_f).exp();
    let cost_f = b_f * (exp_yes + exp_no).ln();

    // Convert back to u64
    let cost_lamports = (cost_f * PRECISION as f64) as u64;

    Ok(cost_lamports)
}
```

**Numerical Stability (Log-Sum-Exp Trick):**

```rust
// Prevent exp() overflow for large values
pub fn log_sum_exp(x: f64, y: f64) -> f64 {
    let max = x.max(y);
    max + ((x - max).exp() + (y - max).exp()).ln()
}

pub fn stable_cost_function(q_yes: u64, q_no: u64, b: u64) -> Result<u64> {
    let q_yes_f = q_yes as f64 / PRECISION as f64;
    let q_no_f = q_no as f64 / PRECISION as f64;
    let b_f = b as f64 / PRECISION as f64;

    let x_yes = q_yes_f / b_f;
    let x_no = q_no_f / b_f;

    let cost_f = b_f * log_sum_exp(x_yes, x_no);
    let cost_lamports = (cost_f * PRECISION as f64) as u64;

    Ok(cost_lamports)
}
```

### 8.2 Checked Arithmetic

**Blueprint:**
```solidity
// Solidity 0.8+ has built-in overflow checks
uint256 total = a + b;  // Reverts on overflow
```

**Solana Translation:**

```rust
// Use checked operations explicitly
let total = a.checked_add(b).ok_or(ErrorCode::Overflow)?;
let diff = a.checked_sub(b).ok_or(ErrorCode::Underflow)?;
let product = a.checked_mul(b).ok_or(ErrorCode::Overflow)?;
let quotient = a.checked_div(b).ok_or(ErrorCode::DivisionByZero)?;
```

**Recommendation:** ALWAYS use checked arithmetic in Rust. Never use `+`, `-`, `*`, `/` directly for user inputs.

---

## 9. Common Patterns Translation

### 9.1 Reentrancy Protection

**Blueprint:**
```solidity
bool private locked;

modifier nonReentrant() {
    require(!locked, "Reentrant call");
    locked = true;
    _;
    locked = false;
}
```

**Solana Translation:**

```rust
// Not needed in same way (no recursive calls)
// But still follow "checks-effects-interactions" pattern

pub fn buy_shares(ctx: Context<BuyShares>, shares: u64) -> Result<()> {
    // 1. CHECKS
    require!(shares > 0, ErrorCode::InvalidAmount);
    require!(market.state == MarketState::Active, ErrorCode::MarketNotActive);

    // 2. EFFECTS (update state)
    market.total_yes_shares += shares;
    position.yes_shares += shares;

    // 3. INTERACTIONS (external calls)
    // Transfer SOL from user to market
    **ctx.accounts.user.try_borrow_mut_lamports()? -= cost;
    **ctx.accounts.market.to_account_info().try_borrow_mut_lamports()? += cost;

    Ok(())
}
```

**Key Principle:** Update all state BEFORE any external calls (transfers, CPIs).

### 9.2 Pausing Mechanism

**Blueprint:**
```solidity
bool public paused;

modifier whenNotPaused() {
    require(!paused, "Contract paused");
    _;
}

function pause() external onlyAdmin {
    paused = true;
}
```

**Solana Translation:**

```rust
#[account]
pub struct GlobalConfig {
    pub paused: bool,
    // ...
}

#[derive(Accounts)]
pub struct BuyShares<'info> {
    #[account(
        seeds = [b"global"],
        bump = global_config.bump,
        constraint = !global_config.paused @ ErrorCode::SystemPaused
    )]
    pub global_config: Account<'info, GlobalConfig>,
    // ...
}
```

**Constraint enforces pause check automatically.**

---

## 10. Performance Optimizations

### 10.1 Compute Unit Budget

**Challenge:** Solana limits compute units per transaction (200k default, 1.4M max).

**Binary Search Optimization:**

```rust
// EVM: Can loop 100+ times (gas cost scales linearly)
// Solana: Must stay under compute budget

pub fn binary_search_shares(
    desired_cost: u64,
    market: &MarketAccount,
    side: TradeSide,
) -> Result<u64> {
    let mut low = 0_u64;
    let mut high = 10_000_000_000_000_u64;  // Max 10,000 shares
    let mut iterations = 0_u32;
    const MAX_ITERATIONS: u32 = 40;  // Limit iterations

    while (high - low) > 1_000 && iterations < MAX_ITERATIONS {
        let mid = (low + high) / 2;
        let cost_at_mid = calculate_buy_cost(market, side, mid)?;

        if cost_at_mid < desired_cost {
            low = mid;
        } else {
            high = mid;
        }

        iterations += 1;
    }

    Ok((low + high) / 2)
}
```

**Result:** 40 iterations max = ~80k compute units (safe).

### 10.2 Account Resizing

**EVM:** Storage grows automatically (more gas cost).
**Solana:** Must explicitly reallocate account size.

```rust
// Resize account if needed
pub fn resize_account_if_needed(
    account: &AccountInfo,
    new_size: usize,
    payer: &AccountInfo,
    system_program: &AccountInfo,
) -> Result<()> {
    let current_size = account.data_len();

    if new_size > current_size {
        let rent = Rent::get()?;
        let new_minimum_balance = rent.minimum_balance(new_size);
        let current_balance = account.lamports();

        // Calculate additional rent needed
        let additional_rent = new_minimum_balance.saturating_sub(current_balance);

        // Transfer additional rent from payer
        if additional_rent > 0 {
            invoke(
                &system_instruction::transfer(payer.key, account.key, additional_rent),
                &[payer.clone(), account.clone(), system_program.clone()],
            )?;
        }

        // Reallocate
        account.realloc(new_size, false)?;
    }

    Ok(())
}
```

**Recommendation:** Use fixed-size arrays when possible to avoid resizing.

### 10.3 Parallel Execution

**Solana Advantage:** Transactions that don't touch same accounts can execute in parallel.

**Design Pattern:**
```
Market 1 trades → Account: market_1, position_1
Market 2 trades → Account: market_2, position_2

These can execute in PARALLEL (different accounts)
```

**Implementation:**
- Use separate MarketAccount PDAs per market
- Use separate UserPosition PDAs per user per market
- Avoid shared global state when possible

---

## Summary Checklist

### Architecture
- [x] 7 contracts → 1-2 programs (CPI reduction)
- [x] Registry pattern → Canonical PDAs
- [x] Mappings → PDA derivation

### Storage
- [x] Contract state → Account structs
- [x] Dynamic arrays → Fixed-size or resizable
- [x] Strings → [u8; N] arrays

### Access Control
- [x] OpenZeppelin → Anchor constraints
- [x] Role modifiers → require! checks
- [x] Bitflags for gas optimization

### Math
- [x] Float → Fixed-point u64 (9 decimals)
- [x] Unchecked → Checked arithmetic
- [x] LMSR → Stable implementation

### Events
- [x] EVM events → Anchor #[event]
- [x] Indexed params → Off-chain indexing

### Fees
- [x] ETH transfer → Lamport manipulation
- [x] ERC20 → SPL Token CPI

### Safety
- [x] Reentrancy → State-before-interaction
- [x] Overflow → Checked ops
- [x] Access control → Constraints

---

## Next Steps

With these translation patterns documented:
1. **SOLANA_PROGRAM_ARCHITECTURE.md** - Apply patterns to program design
2. **03_SOLANA_PROGRAM_DESIGN.md** - Implement with these translations
3. **Code Implementation** - Use as reference during development

**Golden Rule:** When translating, ask:
1. What's the LOGIC? (preserve from CORE_LOGIC_INVARIANTS.md)
2. What's the EVM pattern? (reference blueprint)
3. What's the optimal Solana pattern? (use this guide)

---

*Last Updated: January 2025 | Version 1.0.0*
