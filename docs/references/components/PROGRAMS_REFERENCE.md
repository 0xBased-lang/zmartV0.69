# PROGRAMS_REFERENCE.md - On-Chain Programs Reference

**Category:** Component Reference
**Tags:** [programs, on-chain, solana, anchor, developer]
**Last Updated:** 2025-11-08 23:50 PST

---

## Quick Links

- ⬆️ [Back to CLAUDE.md](../../../CLAUDE.md)
- 📊 [Project State](../state/STATE_MASTER.md)
- 🧪 [Testing Hub](../testing/TESTING_MASTER.md)
- 🔗 [Integration Map](../architecture/INTEGRATION_MAP.md) ⏳
- 🔧 [Commands Reference](../commands/COMMANDS_REFERENCE.md) ⏳

---

## 🎯 Purpose

**Complete reference for all on-chain Solana programs in the ZMART V0.69 prediction market platform.**

This document catalogs:
- Program IDs and deployment status
- All account structures with field descriptions
- All 18 instructions with parameters
- State machine (7-state FSM)
- Error codes (6000-6999 range)
- LMSR formulas and math implementation

**This is a reference document - it describes what exists, not how to use it.**

---

## 📦 Program Overview

### Two-Program Architecture

**Design Decision:** Separate core logic from voting aggregation for modularity.

| Program | Purpose | Status | Program ID |
|---------|---------|--------|------------|
| **zmart-core** | Core prediction market logic (LMSR trading, resolution, claims) | ✅ Deployed | `7h3gXfBfYFueFVLYyfL5Qo1QGsf4GQUfW96FKVgnUsJS` |
| **zmart-proposal** | Proposal voting aggregation (off-chain vote tracking) | ⏳ Planned | TBD |

**Current Focus:** zmart-core is complete and deployed. zmart-proposal will be built in Phase 1.

---

## 🏗️ zmart-core Program

**Program ID:** `7h3gXfBfYFueFVLYyfL5Qo1QGsf4GQUfW96FKVgnUsJS`
**Network:** Devnet
**Status:** ✅ Deployed and tested
**Location:** `programs/zmart-core/`

### Program Statistics

- **Total Instructions:** 18
- **Account Types:** 4 (GlobalConfig, MarketAccount, UserPosition, VoteRecord)
- **Error Codes:** 46 (range 6000-6999)
- **State Machine:** 7 states (PROPOSED → APPROVED → ACTIVE → RESOLVING → DISPUTED → FINALIZED / CANCELLED)

---

## 📋 Account Structures

### 1. GlobalConfig

**Purpose:** Protocol-wide configuration and admin controls
**PDA Seeds:** `["global_config"]`
**Size:** 198 bytes (8 discriminator + 190 data)

#### Fields

| Field | Type | Size | Description |
|-------|------|------|-------------|
| `admin` | Pubkey | 32 | Protocol admin (can update parameters) |
| `backend_authority` | Pubkey | 32 | Backend service authority (vote aggregation, auto-resolution) |
| `protocol_fee_wallet` | Pubkey | 32 | Receives protocol fees (3% default) |
| `protocol_fee_bps` | u16 | 2 | Protocol fee in basis points (300 = 3%) |
| `resolver_reward_bps` | u16 | 2 | Resolver reward in basis points (200 = 2%) |
| `liquidity_provider_fee_bps` | u16 | 2 | LP fee in basis points (500 = 5%) |
| `proposal_approval_threshold` | u16 | 2 | Proposal approval threshold (7000 = 70%) |
| `dispute_success_threshold` | u16 | 2 | Dispute success threshold (6000 = 60%) |
| `min_resolution_delay` | i64 | 8 | Minimum delay before finalization (86400 = 24h) |
| `dispute_period` | i64 | 8 | Dispute window duration (259200 = 3 days) |
| `min_resolver_reputation` | u16 | 2 | Minimum reputation to resolve (8000 = 80%) |
| `is_paused` | bool | 1 | Emergency pause flag (stops trading) |
| `reserved` | [u8; 64] | 64 | Reserved for future upgrades |
| `bump` | u8 | 1 | PDA bump seed |

#### Methods

**`validate()`**
- Checks total fees ≤ 100%
- Validates all thresholds ≤ 100%
- Ensures time limits > 0

**`calculate_fees(amount: u64) -> (protocol, resolver, lp)`**
- Splits fee amount according to configured percentages
- Returns tuple of (protocol_fee, resolver_fee, lp_fee)

**`total_fee_bps() -> u16`**
- Returns sum of all fee percentages
- Default: 1000 (10%)

#### Configuration Defaults

```rust
protocol_fee_bps: 300           // 3%
resolver_reward_bps: 200        // 2%
liquidity_provider_fee_bps: 500 // 5%
proposal_approval_threshold: 7000 // 70%
dispute_success_threshold: 6000   // 60%
min_resolution_delay: 86400       // 24 hours
dispute_period: 259200            // 3 days
min_resolver_reputation: 8000     // 80%
```

---

### 2. MarketAccount

**Purpose:** Individual prediction market state
**PDA Seeds:** `["market", market_id]`
**Size:** 480 bytes (8 discriminator + 472 data)

#### Core Fields

| Field | Type | Size | Description |
|-------|------|------|-------------|
| `market_id` | [u8; 32] | 32 | Unique market identifier (UUID) |
| `creator` | Pubkey | 32 | Market creator (receives creator rewards) |
| `state` | MarketState | 1 | Current state (0-6, see FSM below) |
| `b_parameter` | u64 | 8 | LMSR liquidity sensitivity (fixed-point, 9 decimals) |
| `initial_liquidity` | u64 | 8 | Initial liquidity provided (lamports) |
| `current_liquidity` | u64 | 8 | Current pool liquidity (lamports) |
| `shares_yes` | u64 | 8 | YES shares outstanding (fixed-point, 9 decimals) |
| `shares_no` | u64 | 8 | NO shares outstanding (fixed-point, 9 decimals) |
| `total_volume` | u64 | 8 | Cumulative trading volume (lamports) |

#### Timestamps (all i64, Unix seconds)

| Field | Description |
|-------|-------------|
| `created_at` | Market creation timestamp |
| `approved_at` | Proposal approval timestamp |
| `activated_at` | Trading enabled timestamp |
| `resolution_proposed_at` | Resolution proposal timestamp |
| `resolved_at` | Resolution timestamp (deprecated, use finalized_at) |
| `finalized_at` | Market finalization timestamp |

#### Resolution Data

| Field | Type | Description |
|-------|------|-------------|
| `resolver` | Pubkey | Resolver's wallet address |
| `proposed_outcome` | Option<bool> | Proposed outcome (Some(true)=YES, Some(false)=NO, None=INVALID) |
| `final_outcome` | Option<bool> | Final outcome after dispute |
| `ipfs_evidence_hash` | [u8; 46] | IPFS CIDv0 hash (Qm...) |

#### Dispute Tracking

| Field | Type | Description |
|-------|------|-------------|
| `dispute_initiated_at` | i64 | Dispute initiation timestamp |
| `dispute_initiator` | Pubkey | User who initiated dispute |
| `was_disputed` | bool | Flag indicating if market was disputed |

#### Fee Accumulation (all u64, in lamports)

| Field | Description |
|-------|-------------|
| `accumulated_protocol_fees` | Protocol fees (3% default) |
| `accumulated_resolver_fees` | Resolver rewards (2% default) |
| `accumulated_lp_fees` | LP fees (5% default) |

#### Voting Aggregation (all u32)

**Proposal Voting:**
| Field | Description |
|-------|-------------|
| `proposal_likes` | Number of "like" votes |
| `proposal_dislikes` | Number of "dislike" votes |
| `proposal_total_votes` | Total proposal votes |

**Resolution Voting:**
| Field | Description |
|-------|-------------|
| `resolution_agree` | "Agree with resolution" votes |
| `resolution_disagree` | "Disagree with resolution" votes |
| `resolution_total_votes` | Total resolution votes |

**Dispute Voting:**
| Field | Description |
|-------|-------------|
| `dispute_agree` | "Agree with dispute" votes |
| `dispute_disagree` | "Disagree with dispute" votes |
| `dispute_total_votes` | Total dispute votes |

#### Access Control

| Field | Type | Description |
|-------|------|-------------|
| `is_cancelled` | bool | Market cancellation flag (admin only) |
| `cancelled_at` | Option<i64> | Cancellation timestamp |
| `reserved` | [u8; 120] | Reserved for future upgrades |
| `bump` | u8 | PDA bump seed |

#### Methods

**State Validation:**
- `can_transition_to(new_state) -> bool` - Validates state transitions
- `is_tradable() -> bool` - Checks if market is in ACTIVE state and not cancelled

**Voting:**
- `proposal_approved(threshold_bps) -> bool` - Checks if proposal passed
- `dispute_succeeded(threshold_bps) -> bool` - Checks if dispute succeeded

**Timing:**
- `can_finalize(min_delay, current_time) -> bool` - Checks if resolution delay passed
- `can_dispute(dispute_period, current_time) -> bool` - Checks if dispute window active

**Accounting:**
- `get_liquidity() -> u64` - Returns current liquidity
- `total_fees_accumulated() -> Result<u64>` - Sums all accumulated fees

---

### 3. UserPosition

**Purpose:** User's holdings in a specific market
**PDA Seeds:** `["position", market.key(), user.key()]`
**Size:** 182 bytes (8 discriminator + 174 data)

#### Fields

| Field | Type | Size | Description |
|-------|------|------|-------------|
| `market` | Pubkey | 32 | Market this position belongs to |
| `user` | Pubkey | 32 | User's wallet address |
| `shares_yes` | u64 | 8 | YES shares held (fixed-point, 9 decimals) |
| `shares_no` | u64 | 8 | NO shares held (fixed-point, 9 decimals) |
| `total_invested` | u64 | 8 | Total amount invested (cost basis, lamports) |
| `trades_count` | u32 | 4 | Number of trades executed |
| `last_trade_at` | i64 | 8 | Timestamp of last trade |
| `has_claimed` | bool | 1 | Winnings claimed flag |
| `claimed_amount` | u64 | 8 | Amount claimed (lamports) |
| `reserved` | [u8; 64] | 64 | Reserved for future features |
| `bump` | u8 | 1 | PDA bump seed |

#### Methods

**Holdings:**
- `has_shares() -> bool` - Checks if user has any shares
- `total_shares() -> Result<u64>` - Returns YES + NO shares
- `calculate_winnings(winning_outcome) -> u64` - Returns winnings for outcome

**Analytics:**
- `average_price() -> Result<u64>` - Calculates average price paid per share
- `net_profit() -> Option<i128>` - Returns profit/loss if claimed

**Claiming:**
- `already_claimed() -> bool` - Checks if winnings claimed

---

### 4. VoteRecord

**Purpose:** Individual vote record for proposal or dispute voting
**PDA Seeds:** `["vote", market.key(), user.key(), &[vote_type as u8]]`
**Size:** 83 bytes (8 discriminator + 75 data)

#### Fields

| Field | Type | Size | Description |
|-------|------|------|-------------|
| `market` | Pubkey | 32 | Market being voted on |
| `user` | Pubkey | 32 | User who cast the vote |
| `vote_type` | VoteType | 1 | Proposal (0) or Dispute (1) |
| `vote` | bool | 1 | Vote value (true = support, false = oppose) |
| `voted_at` | i64 | 8 | Unix timestamp when vote was cast |
| `bump` | u8 | 1 | PDA bump seed |

#### VoteType Enum

```rust
pub enum VoteType {
    Proposal = 0,  // Vote on market proposal (like/dislike)
    Dispute = 1,   // Vote on dispute resolution (support/reject)
}
```

**Note:** PDA seeds include vote_type to allow one vote per (market, user, vote_type) tuple. Users can vote on both proposal AND dispute for the same market.

---

## 🔄 State Machine (7-State FSM)

### States

| State | Value | Description | Can Trade? | Can Vote? | Can Resolve? |
|-------|-------|-------------|------------|-----------|--------------|
| **PROPOSED** | 0 | Created, awaiting community approval | ❌ | ✅ Proposal | ❌ |
| **APPROVED** | 1 | Approved by community, waiting activation | ❌ | ❌ | ❌ |
| **ACTIVE** | 2 | Trading enabled | ✅ | ❌ | ❌ |
| **RESOLVING** | 3 | Resolution proposed, dispute window active | ❌ | ✅ Dispute | ⏳ After 48h |
| **DISPUTED** | 4 | Dispute in progress, community voting | ❌ | ✅ Dispute | ❌ |
| **FINALIZED** | 5 | Final outcome set, claims enabled | ❌ | ❌ | ❌ |
| **CANCELLED** | 6 | Market cancelled by admin (terminal) | ❌ | ❌ | ❌ |

### State Transitions

```
PROPOSED (0)
    ↓ approve_proposal (70% likes)
APPROVED (1)
    ↓ activate_market
ACTIVE (2)
    ↓ resolve_market
RESOLVING (3)
    ├→ initiate_dispute → DISPUTED (4)
    │                         ↓ aggregate_dispute_votes
    │                         ├→ finalize_market (≥60% agree → flip)
    │                         └→ finalize_market (<60% agree → keep)
    └→ finalize_market (no dispute after 48h)
FINALIZED (5) [terminal]

PROPOSED/APPROVED
    ↓ cancel_market (admin)
CANCELLED (6) [terminal]
```

### Valid Transitions

| From | To | Instruction | Condition |
|------|-----|-------------|-----------|
| PROPOSED | APPROVED | `aggregate_proposal_votes` | ≥70% likes |
| APPROVED | ACTIVE | `activate_market` | Admin or creator |
| ACTIVE | RESOLVING | `resolve_market` | Any user |
| RESOLVING | DISPUTED | `initiate_dispute` | Within 48h dispute window |
| RESOLVING | FINALIZED | `finalize_market` | After 48h, no dispute |
| DISPUTED | FINALIZED | `aggregate_dispute_votes` | Backend authority |
| PROPOSED | CANCELLED | `cancel_market` | Admin only |
| APPROVED | CANCELLED | `cancel_market` | Admin only |

---

## 📝 Instructions Reference

### Lifecycle Instructions (5)

#### 1. `initialize_global_config`

**Purpose:** One-time protocol initialization
**Access:** Anyone (one-time, PDA prevents re-initialization)

**Arguments:**
- `backend_authority: Pubkey` - Backend service authority for vote aggregation

**Creates:**
- GlobalConfig PDA with default settings

**Errors:**
- `AlreadyInitialized` (6003) - If GlobalConfig already exists

---

#### 2. `create_market`

**Purpose:** Create new prediction market in PROPOSED state
**Access:** Anyone

**Arguments:**
- `market_id: [u8; 32]` - Unique identifier (32-byte UUID from off-chain)
- `b_parameter: u64` - LMSR liquidity sensitivity (fixed-point, 9 decimals)
- `initial_liquidity: u64` - Starting liquidity (lamports)
- `ipfs_question_hash: [u8; 46]` - IPFS CIDv0 for market question

**Creates:**
- MarketAccount PDA in PROPOSED state

**Transfers:**
- Initial liquidity from creator to market account

**Errors:**
- `InvalidLiquidity` (6204) - If initial_liquidity ≤ 0
- `InvalidBParameter` (6600) - If b_parameter < MIN_B
- `InvalidIpfsHash` (6603) - If IPFS hash invalid

---

#### 3. `approve_proposal`

**Purpose:** Admin approval after 70% community vote (deprecated, use aggregate_proposal_votes)
**Access:** Admin only

**State Transition:** PROPOSED → APPROVED

**Errors:**
- `Unauthorized` (6400) - If caller not admin
- `InvalidStateTransition` (6100) - If not in PROPOSED state

**Note:** This instruction is deprecated. Use `aggregate_proposal_votes` which automatically transitions to APPROVED if threshold met.

---

#### 4. `activate_market`

**Purpose:** Enable trading on approved market
**Access:** Admin or market creator

**State Transition:** APPROVED → ACTIVE

**Errors:**
- `Unauthorized` (6400) - If caller not admin or creator
- `InvalidStateTransition` (6100) - If not in APPROVED state

---

### Trading Instructions (2)

#### 5. `buy_shares`

**Purpose:** Purchase YES or NO shares using LMSR
**Access:** Anyone (market must be ACTIVE)

**Arguments:**
- `outcome: bool` - true for YES, false for NO
- `target_cost: u64` - Maximum willing to pay (slippage protection, lamports)

**Behavior:**
1. Calculate shares received using LMSR: `Δshares = C(q + Δq) - C(q)`
2. Add 10% fees on top: `total_cost = cost + fees`
3. Check `total_cost ≤ target_cost` (slippage protection)
4. Transfer lamports from user to market
5. Update market shares and user position
6. Accumulate fees in market account

**Fee Distribution (10% total):**
- 3% → Protocol fee wallet
- 2% → Resolver (accumulated in market)
- 5% → Liquidity provider (accumulated in market)

**Creates:**
- UserPosition PDA if first trade

**Errors:**
- `InvalidMarketState` (6101) - If not ACTIVE
- `ProtocolPaused` (6104) - If emergency pause active
- `MarketCancelled` (6103) - If market cancelled
- `ZeroAmount` (6200) - If target_cost = 0
- `SlippageExceeded` (6202) - If actual cost > target_cost
- `InsufficientLiquidity` (6203) - If pool has insufficient funds

---

#### 6. `sell_shares`

**Purpose:** Sell YES or NO shares back to pool
**Access:** Anyone (market must be ACTIVE)

**Arguments:**
- `outcome: bool` - true for YES, false for NO
- `shares_to_sell: u64` - Number of shares to sell (fixed-point, 9 decimals)
- `min_proceeds: u64` - Minimum acceptable proceeds (slippage protection, lamports)

**Behavior:**
1. Calculate proceeds using LMSR: `proceeds = C(q) - C(q - Δq)`
2. Deduct 10% fees: `net_proceeds = proceeds - fees`
3. Check `net_proceeds ≥ min_proceeds` (slippage protection)
4. Transfer lamports from market to user
5. Update market shares and user position
6. Accumulate fees in market account

**Errors:**
- `InvalidMarketState` (6101) - If not ACTIVE
- `ProtocolPaused` (6104) - If emergency pause active
- `MarketCancelled` (6103) - If market cancelled
- `ZeroAmount` (6200) - If shares_to_sell = 0
- `InsufficientShares` (6201) - If user doesn't have enough shares
- `SlippageExceeded` (6202) - If net_proceeds < min_proceeds

---

### Resolution Instructions (3)

#### 7. `resolve_market`

**Purpose:** Propose market resolution, start dispute window
**Access:** Anyone (after market conditions met)

**Arguments:**
- `proposed_outcome: bool` - true for YES, false for NO
- `ipfs_evidence_hash: [u8; 46]` - IPFS CIDv0 with resolution evidence

**State Transition:** ACTIVE → RESOLVING

**Behavior:**
1. Set proposed_outcome and evidence hash
2. Record resolver address
3. Start 48-hour dispute window
4. Emit ResolutionProposed event

**Errors:**
- `InvalidStateTransition` (6100) - If not in ACTIVE state
- `AlreadyResolved` (6307) - If resolution already proposed

---

#### 8. `initiate_dispute`

**Purpose:** Challenge proposed resolution
**Access:** Anyone (within 48h dispute window)

**State Transition:** RESOLVING → DISPUTED

**Behavior:**
1. Check dispute window still active
2. Record dispute initiator
3. Open community voting
4. Emit DisputeInitiated event

**Errors:**
- `InvalidStateTransition` (6100) - If not in RESOLVING state
- `DisputePeriodEnded` (6301) - If dispute window expired
- `AlreadyDisputed` (6308) - If already disputed

---

#### 9. `finalize_market`

**Purpose:** Set final outcome after resolution/dispute
**Access:** Backend authority only

**Arguments:**
- `dispute_agree: Option<u32>` - Dispute agree votes (Some for DISPUTED, None for RESOLVING)
- `dispute_disagree: Option<u32>` - Dispute disagree votes (Some for DISPUTED, None for RESOLVING)

**State Transition:** RESOLVING or DISPUTED → FINALIZED

**Behavior:**

**For RESOLVING (no dispute):**
1. Check 48h dispute window passed
2. Set final_outcome = proposed_outcome
3. Transition to FINALIZED

**For DISPUTED (community vote):**
1. Record vote counts
2. If ≥60% agree: flip outcome (`final_outcome = !proposed_outcome`)
3. If <60% agree: keep outcome (`final_outcome = proposed_outcome`)
4. Transition to FINALIZED

**Errors:**
- `Unauthorized` (6400) - If caller not backend authority
- `InvalidStateTransition` (6100) - If not in RESOLVING or DISPUTED
- `DisputePeriodNotEnded` (6308) - If finalizing RESOLVING before 48h
- `NoVotesRecorded` (6305) - If DISPUTED but no votes

---

### Claim Instructions (2)

#### 10. `claim_winnings`

**Purpose:** Claim winnings after market finalized
**Access:** Anyone with winning shares

**Behavior:**

**For YES outcome:**
- Only YES shareholders can claim
- Payout = shares_yes (1:1 redemption)

**For NO outcome:**
- Only NO shareholders can claim
- Payout = shares_no (1:1 redemption)

**For INVALID outcome:**
- All shareholders refunded proportionally

**First Claimer:**
- Pays resolver their accumulated fees (`accumulated_resolver_fees`)

**Errors:**
- `InvalidMarketState` (6101) - If not FINALIZED
- `AlreadyClaimed` (6303) - If user already claimed
- `NoWinnings` (6304) - If user has no shares on winning outcome

---

#### 11. `withdraw_liquidity`

**Purpose:** Creator withdraws remaining liquidity + LP fees
**Access:** Market creator only (after finalization)

**Behavior:**
1. Calculate remaining liquidity + LP fees
2. Preserve rent reserve
3. Transfer to creator
4. Mark liquidity withdrawn

**Errors:**
- `Unauthorized` (6400) - If caller not creator
- `InvalidMarketState` (6101) - If not FINALIZED

---

### Voting Instructions (4)

#### 12. `submit_proposal_vote`

**Purpose:** Submit like/dislike vote on market proposal
**Access:** Anyone (market must be PROPOSED)

**Arguments:**
- `vote: bool` - true for "like" (support), false for "dislike" (oppose)

**Behavior:**
1. Create VoteRecord PDA (prevents duplicate votes)
2. Emit ProposalVoteSubmitted event
3. Backend aggregates votes off-chain
4. When 70% threshold reached, backend calls aggregate_proposal_votes

**Creates:**
- VoteRecord PDA with vote_type = Proposal

**Errors:**
- `InvalidStateForVoting` (6701) - If not in PROPOSED state
- `AlreadyVoted` (6700) - If VoteRecord PDA already exists

---

#### 13. `aggregate_proposal_votes`

**Purpose:** Aggregate proposal votes and check 70% threshold
**Access:** Backend authority only

**Arguments:**
- `final_likes: u32` - Total number of like votes (from off-chain aggregation)
- `final_dislikes: u32` - Total number of dislike votes (from off-chain aggregation)

**Behavior:**
1. Record vote counts in market account
2. Calculate approval percentage: `likes / (likes + dislikes)`
3. If ≥70% likes: transition to APPROVED state
4. If <70% likes: stay in PROPOSED (can re-aggregate)
5. Emit ProposalAggregated event

**State Transition:** PROPOSED → APPROVED (if threshold met)

**Errors:**
- `Unauthorized` (6400) - If caller not backend authority
- `InvalidStateForVoting` (6701) - If not in PROPOSED state
- `OverflowError` (6500) - If vote counts overflow (extremely unlikely)

---

#### 14. `submit_dispute_vote`

**Purpose:** Submit vote on dispute resolution
**Access:** Anyone (market must be DISPUTED)

**Arguments:**
- `vote: bool` - true for "agree with dispute" (resolution is wrong), false for "disagree with dispute" (resolution is correct)

**Behavior:**
1. Create VoteRecord PDA (prevents duplicate votes)
2. Emit DisputeVoteSubmitted event
3. Backend aggregates votes off-chain
4. When voting concludes, backend calls aggregate_dispute_votes

**Creates:**
- VoteRecord PDA with vote_type = Dispute

**Errors:**
- `InvalidStateForVoting` (6701) - If not in DISPUTED state
- `AlreadyVoted` (6700) - If VoteRecord PDA already exists

---

#### 15. `aggregate_dispute_votes`

**Purpose:** Aggregate dispute votes and check 60% threshold
**Access:** Backend authority only

**Arguments:**
- `final_agrees: u32` - Total number of "agree with dispute" votes
- `final_disagrees: u32` - Total number of "disagree with dispute" votes

**Behavior:**
1. Record vote counts in market account
2. Calculate agreement percentage: `agrees / (agrees + disagrees)`
3. If ≥60% agree: transition to RESOLVING (resolution rejected)
4. If <60% agree: transition to FINALIZED (resolution accepted)
5. Emit DisputeAggregated event

**State Transition:**
- DISPUTED → RESOLVING (if ≥60% agree, resolution rejected)
- DISPUTED → FINALIZED (if <60% agree, resolution accepted)

**Errors:**
- `Unauthorized` (6400) - If caller not backend authority
- `InvalidStateForVoting` (6701) - If not in DISPUTED state
- `OverflowError` (6500) - If vote counts overflow

---

### Admin Instructions (3)

#### 16. `update_global_config`

**Purpose:** Update protocol configuration parameters
**Access:** Admin only

**Arguments:**
- `protocol_fee_bps: u16` - Protocol fee in basis points (0-10000)
- `resolver_reward_bps: u16` - Resolver reward in basis points (0-10000)
- `liquidity_provider_fee_bps: u16` - LP fee in basis points (0-10000)
- `proposal_approval_threshold: u16` - Proposal approval threshold (0-10000)
- `dispute_success_threshold: u16` - Dispute success threshold (0-10000)

**Behavior:**
1. Validate new configuration (total fees ≤ 100%, thresholds ≤ 100%)
2. Update GlobalConfig fields
3. Emit ConfigUpdated event

**Errors:**
- `Unauthorized` (6400) - If caller not admin
- `InvalidFeeConfiguration` (6004) - If total fees > 100%
- `InvalidThreshold` (6015) - If thresholds > 100%

---

#### 17. `emergency_pause`

**Purpose:** Toggle protocol pause state (pause/unpause trading)
**Access:** Admin only

**Behavior:**
- If `is_paused = false`: sets `is_paused = true` (pauses trading)
- If `is_paused = true`: sets `is_paused = false` (resumes trading)
- Voting and resolution continue during pause
- Only trading (buy_shares, sell_shares) is blocked

**Errors:**
- `Unauthorized` (6400) - If caller not admin

---

#### 18. `cancel_market`

**Purpose:** Cancel market and transition to CANCELLED state
**Access:** Admin only

**Constraints:**
- Only works for PROPOSED or APPROVED markets
- Cannot cancel ACTIVE, RESOLVING, or FINALIZED markets

**State Transition:**
- PROPOSED → CANCELLED
- APPROVED → CANCELLED

**Behavior:**
1. Set `is_cancelled = true`
2. Set `cancelled_at = current_timestamp`
3. Emit MarketCancelled event
4. Refunds handled by separate instruction (TBD)

**Errors:**
- `Unauthorized` (6400) - If caller not admin
- `CannotCancelMarket` (6105) - If market in ACTIVE, RESOLVING, DISPUTED, or FINALIZED state
- `MarketAlreadyCancelled` (6106) - If already cancelled

---

## ⚠️ Error Codes Reference

**Error Range:** 6000-6999 (46 error codes)

### Configuration Errors (6000-6099)

| Code | Name | Description |
|------|------|-------------|
| 6000 | `InvalidFeeConfiguration` | Total fees exceed 100% |
| 6001 | `InvalidThreshold` | Threshold > 10000 (100%) |
| 6002 | `InvalidTimeLimit` | Time limit ≤ 0 |
| 6003 | `AlreadyInitialized` | GlobalConfig already exists |
| 6004 | `InvalidFeeStructure` | Fee structure invalid |

### State Transition Errors (6100-6199)

| Code | Name | Description |
|------|------|-------------|
| 6100 | `InvalidStateTransition` | Transition not allowed |
| 6101 | `InvalidMarketState` | Market not in required state |
| 6102 | `MarketPaused` | Market is paused (deprecated) |
| 6103 | `MarketCancelled` | Market is cancelled |
| 6104 | `ProtocolPaused` | Protocol emergency pause active |
| 6105 | `CannotCancelMarket` | Cannot cancel in current state |
| 6106 | `MarketAlreadyCancelled` | Already cancelled |

### Trading Errors (6200-6299)

| Code | Name | Description |
|------|------|-------------|
| 6200 | `ZeroAmount` | Trading amount is zero |
| 6201 | `InsufficientShares` | Not enough shares to sell |
| 6202 | `SlippageExceeded` | Price moved beyond tolerance |
| 6203 | `InsufficientLiquidity` | Pool has insufficient funds |
| 6204 | `InvalidLiquidity` | Liquidity amount ≤ 0 |

### Resolution Errors (6300-6399)

| Code | Name | Description |
|------|------|-------------|
| 6300 | `ResolutionPeriodNotEnded` | Resolution period not ended |
| 6301 | `DisputePeriodEnded` | Dispute window expired |
| 6302 | `NoResolutionProposed` | No resolution proposed |
| 6303 | `AlreadyClaimed` | Winnings already claimed |
| 6304 | `NoWinnings` | No winnings to claim |
| 6305 | `NoVotesRecorded` | No votes recorded |
| 6306 | `InsufficientVotes` | Not enough votes to meet threshold |
| 6307 | `AlreadyResolved` | Resolution already proposed |
| 6308 | `DisputePeriodNotEnded` | Cannot finalize before 48h |
| 6309 | `AlreadyDisputed` | Already disputed |

### Authorization Errors (6400-6499)

| Code | Name | Description |
|------|------|-------------|
| 6400 | `Unauthorized` | Caller lacks required permission |
| 6401 | `InvalidAdmin` | Invalid admin |
| 6402 | `InvalidResolver` | Invalid resolver |
| 6403 | `InsufficientReputation` | Reputation too low for resolver role |

### Math Errors (6500-6599)

| Code | Name | Description |
|------|------|-------------|
| 6500 | `OverflowError` | Arithmetic overflow |
| 6501 | `UnderflowError` | Arithmetic underflow |
| 6502 | `DivisionByZero` | Division by zero |
| 6503 | `InvalidFixedPoint` | Invalid fixed-point value |
| 6504 | `InvalidLogarithm` | Log of ≤0 |
| 6505 | `ExponentialOverflow` | Exponential result too large |
| 6506 | `ExponentTooLarge` | Exponent > safe limit |
| 6507 | `InvalidInput` | Invalid input value |

### Validation Errors (6600-6699)

| Code | Name | Description |
|------|------|-------------|
| 6600 | `InvalidBParameter` | b parameter < MIN_B |
| 6601 | `InvalidMarketId` | Invalid market ID |
| 6602 | `InvalidTimestamp` | Invalid timestamp |
| 6603 | `InvalidIpfsHash` | Invalid IPFS hash |

### Voting Errors (6700-6799)

| Code | Name | Description |
|------|------|-------------|
| 6700 | `AlreadyVoted` | User already voted |
| 6701 | `InvalidStateForVoting` | Market not in voting state |

---

## 🧮 LMSR Math Implementation

### Fixed-Point Representation

**Precision:** 9 decimals (1.0 = 1_000_000_000)
**Type:** u64 (unsigned 64-bit integer)

**Examples:**
- 1.5 shares = 1_500_000_000
- 0.693147 (ln(2)) = 693_147_000
- 1000 SOL (b parameter) = 1_000_000_000_000

### Core LMSR Formulas

**Cost Function:**
```
C(q_yes, q_no) = b * ln(e^(q_yes/b) + e^(q_no/b))
```

**Buy Cost:**
```
Cost = C(q_yes + Δshares, q_no) - C(q_yes, q_no)
```

**Sell Proceeds:**
```
Proceeds = C(q_yes, q_no) - C(q_yes - Δshares, q_no)
```

**Price (Probability):**
```
P(YES) = e^(q_yes/b) / (e^(q_yes/b) + e^(q_no/b))
```

**Bounded Loss:**
```
Max Loss = b * ln(2) ≈ 0.693147 * b
```

### Mathematical Properties

**Probability Bounds:** P(outcome) ∈ [0, 1]
**Sum Property:** P(YES) + P(NO) = 1
**Market Maker Loss:** Always ≤ b * ln(2)
**Share Redemption:** 1 share = 1 lamport (1:1 ratio)

### Implementation Notes

**Fixed-Point Operations:**
- Use u128 for intermediate calculations to prevent overflow
- Apply checked arithmetic for all operations
- Convert back to u64 for storage

**Numerical Stability:**
- Exponential capping to prevent overflow
- Logarithm bounds checking
- Precision loss mitigation through careful ordering

**Reference:** See [05_LMSR_MATHEMATICS.md](../../05_LMSR_MATHEMATICS.md) for complete implementation details.

---

## 📚 Related Documentation

### Core Specs

- [03_SOLANA_PROGRAM_DESIGN.md](../../03_SOLANA_PROGRAM_DESIGN.md) - Complete program design
- [05_LMSR_MATHEMATICS.md](../../05_LMSR_MATHEMATICS.md) - Fixed-point math implementation
- [06_STATE_MANAGEMENT.md](../../06_STATE_MANAGEMENT.md) - State machine details
- [CORE_LOGIC_INVARIANTS.md](../../CORE_LOGIC_INVARIANTS.md) - Blueprint compliance

### Testing

- [TESTING_MASTER.md](../testing/TESTING_MASTER.md) - All testing documentation
- [Backend Test Scripts](../../../backend/tests/) - Integration tests
- [Anchor Tests](../../../programs/zmart-core/tests/) - Program tests

### Architecture

- [INTEGRATION_MAP.md](../architecture/INTEGRATION_MAP.md) ⏳ - How programs connect to backend
- [DATA_FLOW.md](../architecture/DATA_FLOW.md) ⏳ - Transaction flow diagrams
- [ARCHITECTURE_DECISIONS.md](../architecture/ARCHITECTURE_DECISIONS.md) ⏳ - Why 2-program design

---

## 🔍 Quick Reference

### Common Queries

**"What accounts exist?"**
→ 4 accounts: GlobalConfig, MarketAccount, UserPosition, VoteRecord

**"How many instructions?"**
→ 18 instructions across 5 categories

**"What's the state machine?"**
→ 7 states: PROPOSED → APPROVED → ACTIVE → RESOLVING → [DISPUTED] → FINALIZED / CANCELLED

**"What are the PDA seeds?"**
- GlobalConfig: `["global_config"]`
- MarketAccount: `["market", market_id]`
- UserPosition: `["position", market.key(), user.key()]`
- VoteRecord: `["vote", market.key(), user.key(), &[vote_type]]`

**"What fees are charged?"**
→ 10% total: 3% protocol, 2% resolver, 5% LP

**"How does voting work?"**
- Proposal: 70% threshold to approve
- Dispute: 60% threshold to flip outcome
- Off-chain aggregation, on-chain recording

**"What's the resolution process?"**
1. Anyone calls `resolve_market` (ACTIVE → RESOLVING)
2. 48-hour dispute window opens
3. If disputed: community votes, backend aggregates
4. Backend calls `finalize_market` (RESOLVING/DISPUTED → FINALIZED)

**"How do claims work?"**
- Winning outcome holders: 1:1 share redemption
- Losing outcome holders: No payout
- INVALID outcome: Proportional refund
- First claimer pays resolver fees

---

## 📊 Program Statistics

### Account Sizes

| Account | Size (bytes) | Monthly Rent | Note |
|---------|--------------|--------------|------|
| GlobalConfig | 198 | ~0.0014 SOL | One per protocol |
| MarketAccount | 480 | ~0.0034 SOL | One per market |
| UserPosition | 182 | ~0.0013 SOL | One per (user, market) |
| VoteRecord | 83 | ~0.0006 SOL | One per (user, market, vote_type) |

**Estimated Costs:**
- Create market: ~0.0034 SOL (MarketAccount rent)
- First trade: ~0.0013 SOL (UserPosition rent)
- Vote: ~0.0006 SOL (VoteRecord rent)

### Compute Units

| Instruction | Estimated CU | Note |
|-------------|--------------|------|
| initialize_global_config | ~5,000 | Simple PDA creation |
| create_market | ~10,000 | PDA + liquidity transfer |
| buy_shares | ~20,000 | LMSR calculation + transfer |
| sell_shares | ~20,000 | LMSR calculation + transfer |
| resolve_market | ~8,000 | State update |
| submit_proposal_vote | ~5,000 | VoteRecord creation |
| aggregate_proposal_votes | ~10,000 | Vote calculation |
| finalize_market | ~12,000 | State transition + payouts |
| claim_winnings | ~15,000 | Payout calculation + transfer |

**Note:** Actual compute units may vary based on transaction complexity.

---

## 🚀 Usage Examples

### Creating a Market

```typescript
// Off-chain: Generate market ID
const marketId = new Uint8Array(32); // UUID
crypto.getRandomValues(marketId);

// On-chain: Create market
await program.methods
  .createMarket(
    Array.from(marketId),
    new BN(1000 * 1_000_000_000), // b = 1000 (fixed-point)
    new BN(10 * LAMPORTS_PER_SOL), // 10 SOL liquidity
    Array.from(ipfsHash) // 46-byte IPFS hash
  )
  .accounts({
    market: marketPda,
    creator: creatorKeypair.publicKey,
    systemProgram: SystemProgram.programId,
  })
  .signers([creatorKeypair])
  .rpc();
```

### Buying Shares

```typescript
await program.methods
  .buyShares(
    true, // outcome = YES
    new BN(1 * LAMPORTS_PER_SOL) // target_cost = 1 SOL
  )
  .accounts({
    market: marketPda,
    position: positionPda,
    user: userKeypair.publicKey,
    globalConfig: globalConfigPda,
    systemProgram: SystemProgram.programId,
  })
  .signers([userKeypair])
  .rpc();
```

### Claiming Winnings

```typescript
await program.methods
  .claimWinnings()
  .accounts({
    market: marketPda,
    position: positionPda,
    user: userKeypair.publicKey,
    creator: creatorPublicKey,
    resolver: resolverPublicKey,
  })
  .signers([userKeypair])
  .rpc();
```

---

## 🛠️ Development Tools

### Useful Commands

```bash
# Build program
anchor build

# Run tests
anchor test

# Deploy to devnet
anchor deploy --provider.cluster devnet

# Get program logs
solana logs 7h3gXfBfYFueFVLYyfL5Qo1QGsf4GQUfW96FKVgnUsJS --url devnet

# Inspect account
solana account <account-address> --url devnet

# Get account data with Anchor
anchor account GlobalConfig <address>
anchor account MarketAccount <address>
anchor account UserPosition <address>
anchor account VoteRecord <address>
```

### Explorer Links

**Devnet:**
- Program: https://explorer.solana.com/address/7h3gXfBfYFueFVLYyfL5Qo1QGsf4GQUfW96FKVgnUsJS?cluster=devnet
- View transactions, accounts, and program data

---

## 📝 Notes

### Design Decisions

**Why 7 states instead of 6?**
- Added CANCELLED state for admin intervention
- Blueprint had 6 states (PROPOSED → FINALIZED)
- Admin cancellation needed explicit terminal state

**Why off-chain vote aggregation?**
- On-chain vote storage scales poorly (1 account per vote)
- Off-chain aggregation with on-chain recording preserves verifiability
- Backend authority trusted for aggregation, not outcome determination

**Why 48-hour dispute window?**
- Balances quick resolution with community oversight
- Longer than 24h (too short), shorter than 7d (too long)
- Blueprint specified flexible timing, 48h chosen as reasonable default

**Why 70% proposal threshold?**
- Higher than simple majority (prevents borderline markets)
- Lower than 80% (allows legitimate markets)
- Blueprint specified "significant majority" without exact percentage

**Why 60% dispute threshold?**
- Lower than proposal (easier to challenge than approve)
- Higher than majority (prevents frivolous disputes)
- Blueprint specified "substantial agreement" without exact percentage

### Known Limitations

**Fixed-Point Precision:**
- 9 decimals provides sufficient accuracy for most cases
- Extreme values may lose precision in division
- Always use checked arithmetic to detect errors

**State Transition Constraints:**
- Cannot undo state transitions (except DISPUTED → RESOLVING)
- CANCELLED is terminal (no recovery)
- Carefully test state machine logic

**Vote Aggregation Trust:**
- Backend authority trusted for vote counting
- Users can verify votes by checking VoteRecord PDAs
- Future: Implement on-chain merkle proof verification

---

**Last Updated:** 2025-11-08 23:50 PST
**Next Review:** 2025-11-15
**Maintained By:** Development Team

---
