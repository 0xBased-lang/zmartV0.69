# SOLANA PROGRAM ARCHITECTURE

**Document:** High-Level Program Design for ZMART V0.69
**Version:** 1.0.0
**Last Updated:** January 2025

[← Back to Index](./00_MASTER_INDEX.md) | [← EVM Translation](./EVM_TO_SOLANA_TRANSLATION.md) | [Next: Detailed Program Design →](./03_SOLANA_PROGRAM_DESIGN.md)

---

## Purpose

This document defines the **high-level architecture** of the Solana/Anchor program(s) for ZMART V0.69, applying translations from [EVM_TO_SOLANA_TRANSLATION.md](./EVM_TO_SOLANA_TRANSLATION.md) while preserving all logic from [CORE_LOGIC_INVARIANTS.md](./CORE_LOGIC_INVARIANTS.md).

---

## Table of Contents

1. [Program Structure Decision](#1-program-structure-decision)
2. [Account Architecture](#2-account-architecture)
3. [Instruction Design](#3-instruction-design)
4. [Module Organization](#4-module-organization)
5. [Data Flow](#5-data-flow)
6. [Security Design](#6-security-design)
7. [Performance Considerations](#7-performance-considerations)
8. [Upgrade Strategy](#8-upgrade-strategy)

---

## 1. Program Structure Decision

### Recommendation: Single Monolithic Program

**Program Name:** `zmart_prediction_market`

**Rationale:**
```
✅ Zero CPI overhead between operations
✅ Atomic transactions (all or nothing)
✅ Simpler deployment and testing
✅ Lower compute unit usage
✅ Easier to reason about
✅ Sufficient for current scale
```

**Trade-offs Considered:**
```
❌ Larger program binary (~500KB vs ~200KB each)
❌ Must redeploy entire program on upgrade
❌ Single point of failure
```

**Alternative (If Needed Later): Two Programs**
```
Program 1: zmart_core
├─ Market lifecycle
├─ Trading operations
└─ Resolution process

Program 2: zmart_governance
├─ Parameter management
├─ Admin functions
└─ Upgrade control
```

**Decision:** Start with single program. Split only if:
- Program size exceeds 1MB
- Governance upgrades needed independent of core
- Modularity outweighs performance costs

---

## 2. Account Architecture

### 2.1 Account Types Overview

```
┌─────────────────────────────────────────────────────────────┐
│ GLOBAL (Singleton)                                          │
│ ┌───────────────────────────────────────────────────────┐   │
│ │ GlobalConfig                                          │   │
│ │ - Admin authority                                     │   │
│ │ - Economic parameters (30+)                           │   │
│ │ - Role lists (admins, resolvers, backend)             │   │
│ │ - Total markets counter                               │   │
│ └───────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ PER MARKET                                                  │
│ ┌───────────────────────────────────────────────────────┐   │
│ │ MarketAccount (one per market)                        │   │
│ │ - Market ID, creator, question                        │   │
│ │ - State (PROPOSED → FINALIZED)                        │   │
│ │ - LMSR parameters (q_yes, q_no, b)                    │   │
│ │ - Fee accumulation                                    │   │
│ │ - Resolution data                                     │   │
│ └───────────────────────────────────────────────────────┘   │
│                                                             │
│ ┌───────────────────────────────────────────────────────┐   │
│ │ ProposalVotes (one per market)                        │   │
│ │ - Like/dislike vote counts                            │   │
│ │ - Voter list                                          │   │
│ └───────────────────────────────────────────────────────┘   │
│                                                             │
│ ┌───────────────────────────────────────────────────────┐   │
│ │ DisputeVotes (one per market)                         │   │
│ │ - Agree/disagree vote counts                          │   │
│ │ - Voter list                                          │   │
│ └───────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ PER USER PER MARKET                                         │
│ ┌───────────────────────────────────────────────────────┐   │
│ │ UserPosition                                          │   │
│ │ - YES shares owned                                    │   │
│ │ - NO shares owned                                     │   │
│ │ - Total invested                                      │   │
│ │ - Average entry price                                 │   │
│ └───────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ FEE COLLECTION                                              │
│ ┌───────────────────────────────────────────────────────┐   │
│ │ FeeVault (protocol treasury)                          │   │
│ │ - Accumulated protocol fees                           │   │
│ │ - Accumulated staker fees (future)                    │   │
│ └───────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Account Structures

#### GlobalConfig (Singleton)

```rust
#[account]
pub struct GlobalConfig {
    // Authority & Roles
    pub authority: Pubkey,              // 32 bytes - Primary admin
    pub admins: Vec<Pubkey>,            // 4 + (32 * count) - Admin list
    pub resolvers: Vec<Pubkey>,         // 4 + (32 * count) - Resolver list
    pub backend_services: Vec<Pubkey>,  // 4 + (32 * count) - Backend wallets

    // Counters
    pub total_markets: u64,             // 8 bytes - Total markets created
    pub active_markets: u64,            // 8 bytes - Currently active

    // Market Creation Parameters
    pub minimum_creator_bond: u64,      // 8 bytes - Min bond (lamports)
    pub proposal_tax: u64,              // 8 bytes - Proposal fee (lamports)
    pub approval_like_threshold: u16,   // 2 bytes - % likes needed (bps)
    pub minimum_votes_required: u32,    // 4 bytes - Min votes to approve
    pub proposal_window_duration: i64,  // 8 bytes - Seconds

    // Trading Parameters
    pub trading_fee_bps: u16,           // 2 bytes - 1000 = 10%
    pub minimum_bet_amount: u64,        // 8 bytes - Lamports
    pub maximum_bet_amount: u64,        // 8 bytes - Lamports
    pub slippage_tolerance_bps: u16,    // 2 bytes - 500 = 5%

    // LMSR Parameters
    pub default_liquidity_param: u64,   // 8 bytes - Default 'b' value

    // Resolution Parameters
    pub dispute_window_duration: i64,   // 8 bytes - Seconds (48h)
    pub resolution_threshold_bps: u16,  // 2 bytes - 7500 = 75%
    pub dispute_threshold_bps: u16,     // 2 bytes - 5000 = 50%

    // Fee Distribution (bps, must sum to 10000)
    pub protocol_fee_share_bps: u16,    // 2 bytes - 3000 = 30%
    pub creator_fee_share_bps: u16,     // 2 bytes - 2000 = 20%
    pub staker_fee_share_bps: u16,      // 2 bytes - 5000 = 50%

    // System State
    pub paused: bool,                   // 1 byte - Emergency pause
    pub bump: u8,                       // 1 byte - PDA bump

    // Reserved for future upgrades
    pub reserved: [u8; 128],            // 128 bytes
}

// Total: ~280 bytes + dynamic vectors
// Estimated total: ~500 bytes with role lists
```

**PDA Seeds:**
```rust
seeds = [b"global"], bump
```

#### MarketAccount (One Per Market)

```rust
#[account]
pub struct MarketAccount {
    // Identifiers
    pub market_id: u64,                 // 8 bytes
    pub creator: Pubkey,                // 32 bytes

    // Market Details
    pub question: [u8; 256],            // 256 bytes - Fixed size
    pub category: [u8; 64],             // 64 bytes - Fixed size
    pub resolution_source: [u8; 128],   // 128 bytes - IPFS hash or URL

    // State Machine
    pub state: MarketState,             // 1 byte + padding
    pub created_at: i64,                // 8 bytes - Unix timestamp
    pub approved_at: i64,               // 8 bytes
    pub activated_at: i64,              // 8 bytes
    pub resolution_time: i64,           // 8 bytes - Market expiry
    pub finalized_at: i64,              // 8 bytes

    // LMSR State
    pub total_yes_shares: u64,          // 8 bytes - q_yes
    pub total_no_shares: u64,           // 8 bytes - q_no
    pub liquidity_param: u64,           // 8 bytes - b parameter
    pub total_deposits: u64,            // 8 bytes - Total SOL deposited

    // Fees & Metrics
    pub total_fees_collected: u64,      // 8 bytes
    pub trade_count: u32,               // 4 bytes
    pub unique_traders: u32,            // 4 bytes

    // Creator Economics
    pub creator_bond: u64,              // 8 bytes - Locked bond
    pub creator_fee_accumulated: u64,   // 8 bytes - Claimable fees
    pub bond_refunded: bool,            // 1 byte

    // Resolution
    pub proposed_outcome: Option<MarketOutcome>, // 2 bytes
    pub final_outcome: Option<MarketOutcome>,    // 2 bytes
    pub resolver: Option<Pubkey>,                // 33 bytes

    // Admin Controls
    pub trading_paused: bool,           // 1 byte
    pub bump: u8,                       // 1 byte - PDA bump

    // Reserved
    pub reserved: [u8; 64],             // 64 bytes
}

// Total: ~760 bytes (fits in single account)

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum MarketState {
    Proposed = 0,
    Approved = 1,
    Active = 2,
    Resolving = 3,
    Disputed = 4,
    Finalized = 5,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum MarketOutcome {
    No = 1,
    Yes = 2,
    Invalid = 3,
}
```

**PDA Seeds:**
```rust
seeds = [b"market", &market_id.to_le_bytes()], bump
```

#### UserPosition (One Per User Per Market)

```rust
#[account]
pub struct UserPosition {
    // References
    pub market: Pubkey,                 // 32 bytes
    pub owner: Pubkey,                  // 32 bytes

    // Shares Owned
    pub yes_shares: u64,                // 8 bytes
    pub no_shares: u64,                 // 8 bytes

    // Investment Tracking
    pub total_invested: u64,            // 8 bytes - Total deposited
    pub average_yes_price: u64,         // 8 bytes - Entry price
    pub average_no_price: u64,          // 8 bytes - Entry price

    // Claim Tracking
    pub claimed: bool,                  // 1 byte
    pub claimed_amount: u64,            // 8 bytes

    // PDA
    pub bump: u8,                       // 1 byte

    // Reserved
    pub reserved: [u8; 32],             // 32 bytes
}

// Total: ~148 bytes
```

**PDA Seeds:**
```rust
seeds = [b"position", market.key().as_ref(), owner.key().as_ref()], bump
```

#### ProposalVotes (One Per Market)

```rust
#[account]
pub struct ProposalVotes {
    pub market: Pubkey,                 // 32 bytes
    pub like_votes: u32,                // 4 bytes
    pub dislike_votes: u32,             // 4 bytes
    pub voters: Vec<Pubkey>,            // 4 + (32 * count)
    pub voting_closed: bool,            // 1 byte
    pub bump: u8,                       // 1 byte
}

// Initial size: ~80 bytes + resizing for voters
```

**PDA Seeds:**
```rust
seeds = [b"proposal", market.key().as_ref()], bump
```

#### DisputeVotes (One Per Market)

```rust
#[account]
pub struct DisputeVotes {
    pub market: Pubkey,                 // 32 bytes
    pub agree_votes: u32,               // 4 bytes
    pub disagree_votes: u32,            // 4 bytes
    pub voters: Vec<Pubkey>,            // 4 + (32 * count)
    pub dispute_started_at: i64,        // 8 bytes
    pub dispute_ended_at: i64,          // 8 bytes
    pub bump: u8,                       // 1 byte
}

// Initial size: ~100 bytes + resizing for voters
```

**PDA Seeds:**
```rust
seeds = [b"dispute", market.key().as_ref()], bump
```

#### FeeVault (Protocol Treasury)

```rust
#[account]
pub struct FeeVault {
    pub authority: Pubkey,              // 32 bytes
    pub protocol_fees_collected: u64,   // 8 bytes
    pub staker_fees_collected: u64,     // 8 bytes - Future use
    pub bump: u8,                       // 1 byte
}

// Total: ~50 bytes
```

**PDA Seeds:**
```rust
seeds = [b"fee_vault"], bump
```

---

## 3. Instruction Design

### 3.1 Instruction Categories

**18 Total Instructions**

```
LIFECYCLE (8 instructions)
├─ initialize_protocol
├─ create_market_proposal
├─ vote_on_proposal
├─ approve_market
├─ activate_market
├─ expire_market
├─ pause_market
└─ cancel_market

TRADING (4 instructions)
├─ buy_shares
├─ sell_shares
├─ update_market_params (admin)
└─ collect_creator_fees

RESOLUTION (4 instructions)
├─ propose_resolution
├─ record_dispute_votes
├─ finalize_resolution
└─ claim_winnings

ADMIN (2 instructions)
├─ update_global_parameters
└─ emergency_withdraw
```

### 3.2 Instruction Signatures

#### Lifecycle Instructions

```rust
// 1. Initialize protocol (one-time)
pub fn initialize_protocol(
    ctx: Context<InitializeProtocol>,
    params: GlobalConfigParams,
) -> Result<()>

// 2. Create market proposal
pub fn create_market_proposal(
    ctx: Context<CreateMarket>,
    market_id: u64,
    question: String,
    category: String,
    resolution_source: String,
    end_time: i64,
    initial_liquidity: u64,
) -> Result<()>

// 3. Vote on proposal
pub fn vote_on_proposal(
    ctx: Context<VoteProposal>,
    vote: bool,  // true = like, false = dislike
) -> Result<()>

// 4. Approve market (backend aggregates votes)
pub fn approve_market(
    ctx: Context<ApproveMarket>,
) -> Result<()>

// 5. Activate market (backend initiates)
pub fn activate_market(
    ctx: Context<ActivateMarket>,
) -> Result<()>

// 6. Expire market (auto-transition at end_time)
pub fn expire_market(
    ctx: Context<ExpireMarket>,
) -> Result<()>

// 7. Pause market (admin emergency)
pub fn pause_market(
    ctx: Context<PauseMarket>,
) -> Result<()>

// 8. Cancel market (admin only, refunds all)
pub fn cancel_market(
    ctx: Context<CancelMarket>,
) -> Result<()>
```

#### Trading Instructions

```rust
// 1. Buy shares (YES or NO)
pub fn buy_shares(
    ctx: Context<BuyShares>,
    side: TradeSide,        // YES or NO
    amount_lamports: u64,   // SOL to spend
    min_shares: u64,        // Slippage protection
) -> Result<()>

// 2. Sell shares (YES or NO)
pub fn sell_shares(
    ctx: Context<SellShares>,
    side: TradeSide,        // YES or NO
    shares: u64,            // Shares to sell
    min_proceeds: u64,      // Slippage protection
) -> Result<()>

// 3. Update market parameters (admin)
pub fn update_market_params(
    ctx: Context<UpdateMarketParams>,
    new_liquidity_param: Option<u64>,
    pause: Option<bool>,
) -> Result<()>

// 4. Collect creator fees
pub fn collect_creator_fees(
    ctx: Context<CollectFees>,
) -> Result<()>
```

#### Resolution Instructions

```rust
// 1. Propose resolution
pub fn propose_resolution(
    ctx: Context<ProposeResolution>,
    outcome: MarketOutcome,  // YES, NO, or INVALID
    evidence: String,        // IPFS hash
) -> Result<()>

// 2. Record dispute votes (backend aggregates)
pub fn record_dispute_votes(
    ctx: Context<RecordDisputeVotes>,
    agree_count: u32,
    disagree_count: u32,
) -> Result<()>

// 3. Finalize resolution
pub fn finalize_resolution(
    ctx: Context<FinalizeResolution>,
    final_outcome: MarketOutcome,
) -> Result<()>

// 4. Claim winnings
pub fn claim_winnings(
    ctx: Context<ClaimWinnings>,
) -> Result<()>
```

#### Admin Instructions

```rust
// 1. Update global parameters
pub fn update_global_parameters(
    ctx: Context<UpdateGlobalParams>,
    params: GlobalConfigParams,
) -> Result<()>

// 2. Emergency withdraw (security issue only)
pub fn emergency_withdraw(
    ctx: Context<EmergencyWithdraw>,
    amount: u64,
    destination: Pubkey,
) -> Result<()>
```

---

## 4. Module Organization

### 4.1 Directory Structure

```
programs/zmart-prediction-market/
├── Cargo.toml
├── Xargo.toml
├── src/
│   ├── lib.rs                  # Program entry point
│   ├── state.rs                # All account structures
│   ├── error.rs                # Error codes
│   │
│   ├── instructions/
│   │   ├── mod.rs
│   │   │
│   │   ├── lifecycle/
│   │   │   ├── mod.rs
│   │   │   ├── initialize.rs
│   │   │   ├── create_market.rs
│   │   │   ├── vote_proposal.rs
│   │   │   ├── approve_market.rs
│   │   │   ├── activate_market.rs
│   │   │   ├── expire_market.rs
│   │   │   ├── pause_market.rs
│   │   │   └── cancel_market.rs
│   │   │
│   │   ├── trading/
│   │   │   ├── mod.rs
│   │   │   ├── buy_shares.rs
│   │   │   ├── sell_shares.rs
│   │   │   ├── update_params.rs
│   │   │   └── collect_fees.rs
│   │   │
│   │   ├── resolution/
│   │   │   ├── mod.rs
│   │   │   ├── propose_resolution.rs
│   │   │   ├── record_votes.rs
│   │   │   ├── finalize.rs
│   │   │   └── claim_winnings.rs
│   │   │
│   │   └── admin/
│   │       ├── mod.rs
│   │       ├── update_global.rs
│   │       └── emergency.rs
│   │
│   └── utils/
│       ├── mod.rs
│       ├── lmsr.rs             # LMSR cost function
│       ├── state_machine.rs    # State transition logic
│       ├── validation.rs       # Input validation
│       ├── fees.rs             # Fee distribution
│       └── math.rs             # Fixed-point arithmetic
│
└── tests/
    ├── mod.rs
    ├── lifecycle.rs
    ├── trading.rs
    ├── resolution.rs
    └── edge_cases.rs
```

### 4.2 Module Responsibilities

#### `state.rs`
- All account structures
- Enums (MarketState, MarketOutcome, TradeSide)
- Constants (PRECISION, DECIMALS)

#### `utils/lmsr.rs`
- Cost function calculation
- Buy cost formula
- Sell proceeds formula
- Binary search for shares
- Numerical stability (log-sum-exp)

#### `utils/state_machine.rs`
- State transition validation
- Automatic transitions (time-based)
- Admin override logic

#### `utils/validation.rs`
- Amount bounds checking
- Slippage validation
- Role verification helpers
- Time window checks

#### `utils/fees.rs`
- Fee calculation (10% total)
- Fee distribution (3/2/5 split)
- Lamport transfer helpers

#### `utils/math.rs`
- Fixed-point multiplication
- Fixed-point division
- Checked arithmetic wrappers
- Overflow protection

---

## 5. Data Flow

### 5.1 Market Lifecycle Flow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. CREATE MARKET PROPOSAL                                   │
│    User → [create_market_proposal]                          │
│    Creates: MarketAccount, ProposalVotes                    │
│    Locks: creator_bond                                      │
│    State: PROPOSED                                          │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. COMMUNITY VOTING                                         │
│    Users → [vote_on_proposal] (off-chain aggregated)        │
│    Updates: ProposalVotes.like_votes, dislike_votes        │
│    Condition: Within proposal window (7 days)              │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. APPROVAL                                                 │
│    Backend → [approve_market]                               │
│    Check: like_votes / total >= 70%                        │
│    State: PROPOSED → APPROVED                               │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. ACTIVATION                                               │
│    Backend → [activate_market]                              │
│    State: APPROVED → ACTIVE                                 │
│    Enables: Trading                                         │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. TRADING PERIOD                                           │
│    Users → [buy_shares], [sell_shares]                      │
│    Updates: MarketAccount.total_yes/no_shares               │
│    Creates: UserPosition (if first trade)                   │
│    Duration: Until resolution_time                          │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. EXPIRY                                                   │
│    Anyone → [expire_market]                                 │
│    Check: current_time >= resolution_time                   │
│    State: ACTIVE → RESOLVING                                │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 7. RESOLUTION PROPOSAL                                      │
│    Resolver → [propose_resolution]                          │
│    Sets: proposed_outcome, evidence (IPFS)                  │
│    Creates: DisputeVotes                                    │
│    Starts: 48-hour dispute window                           │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 8. DISPUTE VOTING                                           │
│    Users → vote off-chain (aggregated)                      │
│    Backend → [record_dispute_votes]                         │
│    Duration: 48 hours                                       │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 9. FINALIZATION                                             │
│    If agree >= 75%: Auto-finalize                           │
│    If disagree > 50%: State → DISPUTED (admin review)       │
│    Backend/Admin → [finalize_resolution]                    │
│    State: RESOLVING → FINALIZED                             │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 10. PAYOUT                                                  │
│     Winners → [claim_winnings]                              │
│     Calculate: (user_shares / total_shares) * deposits      │
│     Transfer: SOL to winner                                 │
│     Update: position.claimed = true                         │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Trading Flow

```
User wants to BUY YES shares with 10 SOL
           ↓
    [buy_shares] instruction
           ↓
    ┌──────────────────────────┐
    │ 1. VALIDATION            │
    │ - Market is ACTIVE       │
    │ - Amount within bounds   │
    │ - User has 10 SOL        │
    └──────────────────────────┘
           ↓
    ┌──────────────────────────┐
    │ 2. FEE CALCULATION       │
    │ - 10% fee = 1 SOL        │
    │ - Net: 9 SOL             │
    └──────────────────────────┘
           ↓
    ┌──────────────────────────┐
    │ 3. LMSR CALCULATION      │
    │ - Binary search shares   │
    │ - Cost(q+Δq) - Cost(q)   │
    │ - Find: Δq where cost≈9  │
    └──────────────────────────┘
           ↓
    ┌──────────────────────────┐
    │ 4. SLIPPAGE CHECK        │
    │ - Price = 9 / shares     │
    │ - Verify within 5%       │
    └──────────────────────────┘
           ↓
    ┌──────────────────────────┐
    │ 5. UPDATE POSITION       │
    │ - position.yes += shares │
    │ - position.invested += 10│
    └──────────────────────────┘
           ↓
    ┌──────────────────────────┐
    │ 6. UPDATE MARKET         │
    │ - market.q_yes += shares │
    │ - market.deposits += 9   │
    │ - market.fees += 1       │
    └──────────────────────────┘
           ↓
    ┌──────────────────────────┐
    │ 7. FEE DISTRIBUTION      │
    │ - Protocol: 0.3 SOL (30%)│
    │ - Creator: 0.2 SOL (20%) │
    │ - Stakers: 0.5 SOL (50%) │
    └──────────────────────────┘
           ↓
    ┌──────────────────────────┐
    │ 8. TRANSFER SOL          │
    │ - User → Market: 10 SOL  │
    │ - Market → Vaults: 1 SOL │
    └──────────────────────────┘
           ↓
        SUCCESS
```

---

## 6. Security Design

### 6.1 Access Control Matrix

| Instruction | ADMIN | RESOLVER | BACKEND | USER | ANYONE |
|-------------|-------|----------|---------|------|--------|
| initialize_protocol | ✅ | ❌ | ❌ | ❌ | ❌ |
| create_market_proposal | ❌ | ❌ | ❌ | ✅ | ✅ |
| vote_on_proposal | ❌ | ❌ | ❌ | ✅ | ✅ |
| approve_market | ❌ | ❌ | ✅ | ❌ | ❌ |
| activate_market | ❌ | ❌ | ✅ | ❌ | ❌ |
| expire_market | ❌ | ❌ | ❌ | ❌ | ✅ |
| pause_market | ✅ | ❌ | ❌ | ❌ | ❌ |
| cancel_market | ✅ | ❌ | ❌ | ❌ | ❌ |
| buy_shares | ❌ | ❌ | ❌ | ✅ | ✅ |
| sell_shares | ❌ | ❌ | ❌ | ✅ | ✅ |
| propose_resolution | ❌ | ✅ | ❌ | ❌ | ❌ |
| record_dispute_votes | ❌ | ❌ | ✅ | ❌ | ❌ |
| finalize_resolution | ✅ | ✅ | ✅ | ❌ | ❌ |
| claim_winnings | ❌ | ❌ | ❌ | ✅ | ✅ |
| update_global_parameters | ✅ | ❌ | ❌ | ❌ | ❌ |
| emergency_withdraw | ✅ | ❌ | ❌ | ❌ | ❌ |

### 6.2 Validation Layers

```
Every Instruction:
├─ Layer 1: Anchor Constraints (#[account] macros)
│   └─ PDA seeds match, owner is program, signer required
│
├─ Layer 2: State Validation
│   └─ Market state allows this operation
│
├─ Layer 3: Role Validation
│   └─ Caller has required role
│
├─ Layer 4: Business Logic Validation
│   └─ Amounts within bounds, time windows valid
│
└─ Layer 5: Invariant Checks
    └─ P(YES) + P(NO) = 1, fees sum to 100%, etc.
```

### 6.3 Security Invariants

**Must be enforced at all times:**
```rust
// 1. State transitions one-directional (except admin override)
require!(
    new_state > current_state || is_admin_override,
    ErrorCode::InvalidStateTransition
);

// 2. Prices sum to 1
let price_yes = calculate_price_yes(&market);
let price_no = calculate_price_no(&market);
require!(
    (price_yes + price_no - PRECISION).abs() < 1_000, // 0.000001 tolerance
    ErrorCode::PriceInvariantViolation
);

// 3. Total payouts <= total deposits
let total_payouts = calculate_total_payouts(&market);
require!(
    total_payouts <= market.total_deposits,
    ErrorCode::PayoutExceedsDeposits
);

// 4. Fee distribution sums to 100%
require!(
    global.protocol_fee_share_bps +
    global.creator_fee_share_bps +
    global.staker_fee_share_bps == 10_000,
    ErrorCode::FeeShareMismatch
);

// 5. No double claims
require!(!position.claimed, ErrorCode::AlreadyClaimed);
```

---

## 7. Performance Considerations

### 7.1 Compute Unit Budget

**Target:** All instructions < 100k compute units (50% of default 200k limit)

**Critical Paths:**
```
buy_shares: ~80k CU
├─ Binary search: 40-50k (40 iterations)
├─ State updates: 10k
├─ Fee distribution: 10k
└─ Lamport transfers: 10-20k

sell_shares: ~60k CU
├─ Direct cost calc: 20k (no binary search)
├─ State updates: 10k
├─ Fee distribution: 10k
└─ Lamport transfers: 10-20k

claim_winnings: ~40k CU
├─ Payout calculation: 10k
├─ State updates: 10k
└─ Transfer: 20k
```

**Optimizations:**
1. Cache expensive calculations in account state
2. Limit binary search iterations to 40 max
3. Use u64 arithmetic (no float conversions in loop)
4. Batch operations when possible

### 7.2 Account Rent Optimization

**Rent Calculations:**
```
GlobalConfig:     ~500 bytes  → ~0.0036 SOL rent
MarketAccount:    ~760 bytes  → ~0.0055 SOL rent
UserPosition:     ~148 bytes  → ~0.0011 SOL rent
ProposalVotes:    ~80 bytes   → ~0.0006 SOL rent (+ resizing)
DisputeVotes:     ~100 bytes  → ~0.0008 SOL rent (+ resizing)
FeeVault:         ~50 bytes   → ~0.0004 SOL rent
```

**Rent Recovery:**
- User positions can be closed after claim (reclaim rent)
- Proposal/dispute votes never closed (historical record)

### 7.3 Parallel Execution

**Account Isolation:**
```
Market 1 Trade: Accounts = [global, market_1, position_1]
Market 2 Trade: Accounts = [global, market_2, position_2]

PARALLEL EXECUTION POSSIBLE (different markets)
```

**Global account is read-only for trading** → No write conflicts

---

## 8. Upgrade Strategy

### 8.1 Upgrade Authority

**Mainnet:**
```
Squads Multi-Sig (3-of-5)
├─ Admin 1
├─ Admin 2
├─ Admin 3
├─ Admin 4
└─ Admin 5
```

**Devnet:**
```
Single keypair (for rapid iteration)
```

### 8.2 Upgrade Process

```
1. Build new program version
   anchor build

2. Deploy to buffer
   solana program write-buffer target/deploy/program.so

3. Set buffer authority to upgrade authority
   solana program set-buffer-authority <buffer> <upgrade-auth>

4. Create multi-sig proposal (if mainnet)
   squads create-proposal upgrade-program <buffer> <program-id>

5. Vote and execute
   squads vote <proposal-id>
   squads execute <proposal-id>

6. Verify upgrade
   solana program show <program-id>
```

### 8.3 Data Migration

**Account compatibility:**
```rust
// Use reserved bytes for future fields
pub struct MarketAccount {
    // ... existing fields ...
    pub reserved: [u8; 64],  // Can become new fields in v2
}

// Adding a new field:
// v2: pub new_field: u64,  // Takes 8 bytes from reserved
// v2: pub reserved: [u8; 56],  // Remaining 56 bytes
```

**No migration needed if:**
- Only adding to reserved space
- Only adding new instructions
- Only changing instruction logic (not account structure)

**Migration needed if:**
- Changing existing account structure
- Removing fields
- Changing data types

---

## Summary

### Architecture Decisions

✅ **Single Program:** zmart_prediction_market
✅ **5 Account Types:** GlobalConfig, MarketAccount, UserPosition, ProposalVotes, DisputeVotes, FeeVault
✅ **18 Instructions:** Lifecycle (8), Trading (4), Resolution (4), Admin (2)
✅ **PDAs for All State:** Deterministic, program-controlled
✅ **Role-Based Access:** Admin, Resolver, Backend, User, Anyone
✅ **Compute Budget:** <100k CU per instruction
✅ **Upgrade:** Multi-sig on mainnet, single-sig on devnet

### Next Steps

With architecture defined:
1. **03_SOLANA_PROGRAM_DESIGN.md** - Detailed Rust implementation
2. **05_LMSR_MATHEMATICS.md** - Fixed-point math implementation
3. **Code Implementation** - Build the program

---

*Last Updated: January 2025 | Version 1.0.0*
