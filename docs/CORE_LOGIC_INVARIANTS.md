# CORE LOGIC INVARIANTS

**Document:** Pure Mechanics Extraction from KEKTECH 3.0 Blueprint
**Version:** 1.0.0
**Last Updated:** January 2025
**Status:** 🔒 IMMUTABLE - These mechanics MUST be preserved in Solana implementation

[← Back to Index](./00_MASTER_INDEX.md)

---

## ⭐ AUTHORITATIVE SOURCE OF TRUTH

**THIS DOCUMENT IS THE SINGLE SOURCE OF TRUTH FOR:**

- ✅ **All LMSR formulas** (cost function, share calculation, pricing)
- ✅ **All state machine transitions** (6-state FSM: PROPOSED → FINALIZED)
- ✅ **All economic parameters** (fees, thresholds, timers)
- ✅ **All game theory mechanics** (incentives, payouts, dispute resolution)

**CONFLICT RESOLUTION RULES:**

1. **If conflicts exist:** CORE_LOGIC_INVARIANTS.md wins (ALWAYS)
2. **Update other docs:** Modify conflicting documents to match this source
3. **Validation:** Run `./scripts/validate-spec-consistency.sh` to verify alignment
4. **Threshold Authority:** Dispute success = 60% (simplified from blueprint's dual 75%/50% thresholds for V1 MVP)

**Note:** This is the extracted blueprint logic. For Solana-specific implementation details (account structures, PDAs, error codes), see `03_SOLANA_PROGRAM_DESIGN.md` - but THIS document defines WHAT must be implemented.

---

## Purpose

This document extracts the **core logic, mechanics, incentives, and game theory** from the KEKTECH 3.0 blueprint that MUST be preserved in the Solana implementation, regardless of blockchain-specific optimizations.

**These are the INVARIANTS** - change the implementation, but preserve these mechanics.

---

## Table of Contents

1. [LMSR Cost Function](#1-lmsr-cost-function)
2. [Market States & Lifecycle](#2-market-states--lifecycle)
3. [Dual-Sided Trading Mechanics](#3-dual-sided-trading-mechanics)
4. [Fee Distribution Model](#4-fee-distribution-model)
5. [Resolution Process](#5-resolution-process)
6. [Economic Parameters](#6-economic-parameters)
7. [Role-Based Permissions](#7-role-based-permissions)
8. [Payout Mechanics](#8-payout-mechanics)
9. [Game Theory Incentives](#9-game-theory-incentives)
10. [Security Guardrails](#10-security-guardrails)

---

## 1. LMSR Cost Function

### Core Formula (IMMUTABLE)

```
C(q_yes, q_no) = b * ln(e^(q_yes/b) + e^(q_no/b))
```

**Where:**
- **C** = Cost function (total cost to reach current share distribution)
- **q_yes** = Total YES shares issued
- **q_no** = Total NO shares issued
- **b** = Liquidity parameter (controls price sensitivity)
- **ln** = Natural logarithm
- **e** = Euler's number (≈2.71828)

### Instantaneous Price Formula

```
P(YES) = e^(q_yes/b) / (e^(q_yes/b) + e^(q_no/b))
P(NO) = e^(q_no/b) / (e^(q_yes/b) + e^(q_no/b))
```

**Invariant:** P(YES) + P(NO) = 1 (always)

### Buy Cost Calculation

```
Cost to buy Δq shares of outcome i:
Cost = C(q + Δq) - C(q)

Example (buying YES shares):
Cost = C(q_yes + Δq, q_no) - C(q_yes, q_no)
```

### Sell Proceeds Calculation

```
Proceeds from selling Δq shares of outcome i:
Proceeds = C(q) - C(q - Δq)

Example (selling YES shares):
Proceeds = C(q_yes, q_no) - C(q_yes - Δq, q_no)
```

### Bounded Loss Guarantee

```
Maximum market maker loss = b * ln(2)

When b = 100:
Max loss ≈ 69.3 units
```

**Invariant:** This bound MUST hold regardless of trading activity.

### Share Calculation (Buy Orders)

Since the inverse of C is complex, use **binary search** to find shares given cost:

```
Algorithm: Binary Search for Shares
Input: desired_cost, current_state (q_yes, q_no, b), outcome
Output: shares_to_issue

1. Set bounds: low = 0, high = max_shares (e.g., 10,000)
2. While (high - low) > tolerance:
   a. mid = (low + high) / 2
   b. cost_at_mid = C(q + mid) - C(q)
   c. If cost_at_mid < desired_cost:
      - low = mid
   d. Else:
      - high = mid
3. Return mid
```

**Typical convergence:** 20-40 iterations
**Tolerance:** 0.001 shares

---

## 2. Market States & Lifecycle

### 6-State Finite State Machine

```
PROPOSED (0) → APPROVED (1) → ACTIVE (2) → RESOLVING (3) → DISPUTED (4) → FINALIZED (5)
```

### State Definitions

| State | Value | Description | Allowed Actions |
|-------|-------|-------------|-----------------|
| **PROPOSED** | 0 | Market created, awaiting approval | Vote on proposal, Cancel |
| **APPROVED** | 1 | Community approved, awaiting activation | Activate (backend only) |
| **ACTIVE** | 2 | Trading enabled | Buy, Sell, Pause |
| **RESOLVING** | 3 | Market expired, awaiting resolution | Propose resolution, Vote on outcome |
| **DISPUTED** | 4 | Resolution disagreement >50% | Admin resolution only |
| **FINALIZED** | 5 | Outcome locked, payouts enabled | Claim winnings |

### State Transition Rules

**PROPOSED → APPROVED:**
- **Trigger:** `(like_votes / total_votes) >= approvalLikeThreshold` (default 70%)
- **Requirements:**
  - `total_votes >= minimumVotesRequired` (default 10)
  - Within proposal window (default 7 days)
- **Who:** Automatic (backend aggregates votes)

**APPROVED → ACTIVE:**
- **Trigger:** Manual activation by BACKEND role
- **Requirements:** Market not expired, creator bond locked
- **Who:** Backend service (after verification)

**ACTIVE → RESOLVING:**
- **Trigger:** `current_time >= resolutionTime` (automatic)
- **Requirements:** None (time-based)
- **Who:** Anyone can call (typically backend monitor)

**RESOLVING → FINALIZED:**
- **Trigger:** `(agree_votes / total_votes) >= resolutionThreshold` (default 75%)
- **Requirements:** Dispute window passed (48 hours)
- **Who:** Automatic (backend aggregates votes)

**RESOLVING → DISPUTED:**
- **Trigger:** `(disagree_votes / total_votes) > disputeThreshold` (default 50%)
- **Requirements:** Within dispute window
- **Who:** Automatic

**DISPUTED → FINALIZED:**
- **Trigger:** Admin decision
- **Requirements:** Admin review completed
- **Who:** ADMIN role only

**Any State → CANCELLED:**
- **Trigger:** Admin override
- **Requirements:** Emergency conditions
- **Who:** ADMIN role only

### Time-Based Transitions

```
createdAt (timestamp)
    ↓ [proposal window: 7 days]
approvedAt (timestamp)
    ↓ [no time limit]
activatedAt (timestamp)
    ↓ [until resolutionTime]
resolutionTime (timestamp)
    ↓ [dispute window: 48 hours]
finalizedAt (timestamp)
```

**Invariant:** `resolutionTime > activatedAt`
**Invariant:** `finalizedAt > resolutionTime + 48 hours` (unless admin override)

---

## 3. Dual-Sided Trading Mechanics

### Buy Order Processing (7 Steps)

```
1. VALIDATION
   - Verify market state == ACTIVE
   - Verify amount >= minimumBetAmount
   - Verify amount <= maximumBetAmount
   - Verify user not blacklisted

2. FEE DEDUCTION
   - tradingFee = amount * tradingFeePercent (default 10%)
   - netAmount = amount - tradingFee

3. SHARE CALCULATION
   - Use binary search to find shares given netAmount
   - Formula: Find Δq where C(q + Δq) - C(q) = netAmount

4. SLIPPAGE CHECK
   - actualPrice = netAmount / shares
   - expectedPrice = P(outcome) from current state
   - require: |actualPrice - expectedPrice| <= slippageTolerance

5. UPDATE POSITION
   - userPosition[outcome] += shares
   - userPosition.totalInvested += amount

6. UPDATE MARKET STATE
   - If outcome == YES: q_yes += shares
   - If outcome == NO: q_no += shares
   - totalDeposits += netAmount
   - totalFees += tradingFee
   - tradeCount += 1

7. DISTRIBUTE FEES
   - protocolFee = tradingFee * protocolFeeShare (default 30% = 3% of trade)
   - creatorFee = tradingFee * creatorFeeShare (default 20% = 2% of trade)
   - stakerFee = tradingFee * stakerFeeShare (default 50% = 5% of trade)
```

### Sell Order Processing (7 Steps)

```
1. VALIDATION
   - Verify market state == ACTIVE
   - Verify userPosition[outcome] >= sharesToSell
   - Verify sharesToSell > 0

2. CALCULATE PROCEEDS
   - grossProceeds = C(q) - C(q - sharesToSell)
   - Formula: C(q_yes, q_no) - C(q_yes - Δq, q_no) for YES

3. FEE DEDUCTION
   - tradingFee = grossProceeds * tradingFeePercent (default 10%)
   - netProceeds = grossProceeds - tradingFee

4. SLIPPAGE CHECK
   - actualPrice = netProceeds / sharesToSell
   - expectedPrice = P(outcome) from current state
   - require: actualPrice >= (expectedPrice * (1 - slippageTolerance))

5. UPDATE POSITION
   - userPosition[outcome] -= sharesToSell
   - (totalInvested remains unchanged - tracks deposits only)

6. UPDATE MARKET STATE
   - If outcome == YES: q_yes -= sharesToSell
   - If outcome == NO: q_no -= sharesToSell
   - totalDeposits -= grossProceeds (liquidity returned to market)
   - totalFees += tradingFee
   - tradeCount += 1

7. DISTRIBUTE FEES + PAYOUT
   - Distribute tradingFee (same as buy)
   - Transfer netProceeds to user
```

**Invariant:** Users can ALWAYS sell shares during ACTIVE state.
**Invariant:** Sell proceeds are ALWAYS less than buy cost (due to fees + spread).

---

## 4. Fee Distribution Model

### Total Trading Fee: 10%

**On every trade (buy OR sell):**
```
Total Fee = tradeAmount * 10%

Distribution:
├─ Protocol Treasury: 30% of fee (3% of trade)
├─ Market Creator:    20% of fee (2% of trade)
└─ Stakers:           50% of fee (5% of trade)
```

### Fee Collection Timing

**Real-time collection:**
- Fees deducted on every trade
- Immediately distributed to respective pools

**No delayed collection** - fees are split atomically with trade execution.

### Creator Fee Mechanics

```
creatorFeeAccumulated += tradingFee * creatorFeeShare

Market creator can claim anytime after market finalized:
- If market resolved normally: Full creator fee
- If market cancelled: Creator fee returned to users (pro-rata)
- If market bond slashed: Creator fee forfeited to protocol
```

### Staker Fee Mechanics (Future Phase)

```
stakerFeePool += tradingFee * stakerFeeShare

Stakers earn proportionally:
- userReward = (userStake / totalStaked) * stakerFeePool
- Claimed weekly or monthly
```

**Invariant:** Total fee distribution ALWAYS equals 100% of collected fees.

---

## 5. Resolution Process

### 7-Step Resolution Workflow

```
Step 1: MARKET EXPIRY
├─ Condition: current_time >= resolutionTime
├─ Action: Automatic state transition ACTIVE → RESOLVING
└─ Trigger: Anyone can call (typically backend monitor)

Step 2: RESOLUTION PROPOSAL
├─ Who: RESOLVER role
├─ Data: proposedOutcome (YES/NO/INVALID), evidence (IPFS hash)
├─ Deadline: resolutionTime + 7 days (proposal window)
└─ Requirement: Only one proposal per market

Step 3: DISPUTE WINDOW OPENS
├─ Duration: 48 hours from proposal
├─ Action: Community votes AGREE or DISAGREE
└─ Voting: Off-chain (aggregated on-chain by backend)

Step 4: VOTE AGGREGATION
├─ Backend service counts votes
├─ Calls contract to record results
└─ Snapshot at dispute window close

Step 5: THRESHOLD EVALUATION
├─ Calculate: agreePercent = agreeVotes / (agreeVotes + disagreeVotes)
├─ If agreePercent >= 75%: Auto-finalize with proposed outcome
├─ If disagreePercent > 50%: Auto-dispute (state → DISPUTED)
└─ Else: Wait for admin decision

Step 6: FINALIZATION
├─ If auto-finalized: outcome = proposedOutcome, state = FINALIZED
├─ If disputed: Admin reviews evidence, sets outcome, state = FINALIZED
└─ Finalization is irreversible

Step 7: PAYOUT DISTRIBUTION
├─ Winners can claim shares
├─ Losers get nothing
└─ INVALID outcome: All users refunded (pro-rata)
```

### Resolution Outcomes

| Outcome | Value | Meaning | Payout Logic |
|---------|-------|---------|--------------|
| **UNRESOLVED** | 0 | Default state | No payouts |
| **NO** | 1 | NO outcome won | NO share holders win |
| **YES** | 2 | YES outcome won | YES share holders win |
| **INVALID** | 3 | Market invalid/cancelled | All users refunded |

### Dispute Thresholds

```
Auto-Finalize Threshold: 75% agreement
├─ If (agreeVotes / totalVotes) >= 0.75
└─ Action: Finalize with proposed outcome

Auto-Dispute Threshold: 50% disagreement
├─ If (disagreeVotes / totalVotes) > 0.50
└─ Action: Transition to DISPUTED state

Default (< 75% agree, <= 50% disagree):
└─ Action: Wait for admin review
```

**Invariant:** Resolution process MUST complete within 7 days of market expiry.
**Invariant:** Admin can override ONLY in DISPUTED state or after timeout.

---

## 6. Economic Parameters

### 30+ Configurable Parameters (All with Guardrails)

#### Market Creation Parameters

| Parameter | Default | Min | Max | Description |
|-----------|---------|-----|-----|-------------|
| `minimumCreatorBond` | 0.1 ETH | 0.01 ETH | 10 ETH | Refundable bond locked during proposal |
| `proposalTax` | 0.5 BASED | 0.1 BASED | 10 BASED | Non-refundable proposal fee |
| `approvalLikeThreshold` | 70% | 51% | 95% | Percent of LIKE votes needed to approve |
| `minimumVotesRequired` | 10 | 5 | 100 | Minimum votes to approve proposal |
| `proposalWindowDuration` | 7 days | 1 day | 30 days | Time window for proposal voting |

#### Trading Parameters

| Parameter | Default | Min | Max | Description |
|-----------|---------|-----|-----|-------------|
| `tradingFeePercent` | 10% | 5% | 20% | Total fee on all trades |
| `minimumBetAmount` | 0.01 ETH | 0.001 ETH | 1 ETH | Minimum trade size |
| `maximumBetAmount` | 100 ETH | 10 ETH | 10,000 ETH | Maximum trade size |
| `slippageTolerance` | 5% | 1% | 10% | Max price movement allowed |

#### LMSR Parameters

| Parameter | Default | Min | Max | Description |
|-----------|---------|-----|-----|-------------|
| `defaultLiquidityParam` (b) | 100 | 10 | 1000 | Controls price sensitivity |
| `boundedLossMultiplier` | 0.693 | 0.693 | 0.693 | ln(2) - IMMUTABLE |

#### Resolution Parameters

| Parameter | Default | Min | Max | Description |
|-----------|---------|-----|-----|-------------|
| `disputeWindowDuration` | 48 hours | 24 hours | 168 hours | Time for community to dispute |
| `resolutionThreshold` | 75% | 60% | 95% | Percent agreement to auto-finalize |
| `disputeThreshold` | 50% | 40% | 60% | Percent disagreement to auto-dispute |
| `proposalDeadline` | 7 days | 3 days | 30 days | Deadline for resolution proposal |

#### Fee Distribution Parameters

| Parameter | Default | Min | Max | Description |
|-----------|---------|-----|-----|-------------|
| `protocolFeeShare` | 30% | 10% | 50% | Protocol's share of trading fees |
| `creatorFeeShare` | 20% | 10% | 40% | Creator's share of trading fees |
| `stakerFeeShare` | 50% | 30% | 70% | Staker's share of trading fees |

**Invariant:** `protocolFeeShare + creatorFeeShare + stakerFeeShare = 100%`

#### Security Parameters

| Parameter | Default | Min | Max | Description |
|-----------|---------|-----|-----|-------------|
| `maxMarketsPerCreator` | 10 | 1 | 100 | Rate limit for market creation |
| `cooldownPeriod` | 24 hours | 1 hour | 168 hours | Time between market creations |
| `emergencyPauseEnabled` | true | - | - | Admin can pause all markets |

### Parameter Update Rules

**Update Process:**
1. ADMIN proposes parameter change
2. Guardrail validation (min/max)
3. Timelock delay (24-48 hours)
4. Change applied globally

**Invariants:**
- Parameter changes NEVER affect existing markets (only new markets)
- All parameters bounded by min/max
- Fee distribution ALWAYS sums to 100%

---

## 7. Role-Based Permissions

### 4 Access Control Roles

#### ADMIN (1-5 addresses, multi-sig recommended)

**Permissions:**
- Update economic parameters (with guardrails)
- Upgrade contracts/programs
- Pause/unpause markets (emergency)
- Resolve disputed markets
- Blacklist malicious users
- Emergency withdraw (security issues only)

**Restrictions:**
- CANNOT change finalized outcomes
- CANNOT steal user funds
- CANNOT bypass timelock on parameter changes

#### RESOLVER (10-50 trusted addresses)

**Permissions:**
- Propose market resolutions
- Submit resolution evidence
- Finalize non-disputed resolutions

**Restrictions:**
- CANNOT resolve markets they created
- CANNOT bypass dispute window
- CANNOT override community votes

**Requirements:**
- Reputation score >= 100
- Bond requirement (e.g., 1 ETH staked)
- History of accurate resolutions

#### BACKEND (1-3 infrastructure services)

**Permissions:**
- Aggregate off-chain votes (proposals, disputes)
- Trigger automatic state transitions
- Activate approved markets
- Monitor market expiry

**Restrictions:**
- CANNOT propose resolutions
- CANNOT override community votes
- CANNOT access user funds

**Security:**
- Rate-limited actions
- Multi-sig wallets recommended
- Automated monitoring

#### CREATOR (Unlimited, anyone can register)

**Permissions:**
- Create market proposals
- Cancel own PROPOSED markets
- Claim creator fees after resolution

**Restrictions:**
- Must pay proposal tax (non-refundable)
- Must lock creator bond (refundable)
- Rate limited (max markets per day)
- Cannot create markets during cooldown

**Requirements:**
- Wallet balance >= proposalTax + creatorBond
- Not blacklisted
- Within rate limits

### Role Assignment

```
ADMIN:
├─ Hardcoded in contract/program initialization
└─ Can add/remove other admins (multi-sig)

RESOLVER:
├─ Assigned by ADMIN
├─ Requirements checked on-chain
└─ Can be revoked by ADMIN

BACKEND:
├─ Assigned by ADMIN
├─ Typically service accounts
└─ Monitored for abuse

CREATOR:
├─ Self-registration (anyone can become creator)
├─ Automatic upon first market creation
└─ No explicit assignment needed
```

**Invariant:** Role permissions are strictly enforced on-chain.

---

## 8. Payout Mechanics

### Winning Share Calculation

```
Given:
- Market resolved with outcome (YES/NO/INVALID)
- User position: { yes_shares, no_shares }
- Market state: { total_yes_shares, total_no_shares, totalDeposits }

Payout Logic:

If outcome == YES:
    winning_shares = user.yes_shares
    total_winning_shares = market.total_yes_shares

If outcome == NO:
    winning_shares = user.no_shares
    total_winning_shares = market.total_no_shares

If outcome == INVALID:
    // Pro-rata refund based on total invested
    payout = (user.totalInvested / market.totalDeposits) * market.totalDeposits
    RETURN payout
```

### Proportional Payout Formula

```
user_payout = (user_winning_shares / total_winning_shares) * totalDeposits

Where:
- totalDeposits = All deposits - All fees collected
- total_winning_shares = Sum of all winning shares
- user_winning_shares = User's winning shares
```

### Example Payout Calculation

```
Market: "Will BTC reach $100k by Dec 31?"
Outcome: YES
Total Deposits: 1000 ETH (after fees)
Total YES shares: 500
Total NO shares: 300

User A Position:
- YES shares: 50
- NO shares: 0
- Total invested: 60 ETH

User B Position:
- YES shares: 0
- NO shares: 30
- Total invested: 35 ETH

Payouts:
User A: (50 / 500) * 1000 ETH = 100 ETH (profit: 40 ETH)
User B: (0 / 500) * 1000 ETH = 0 ETH (loss: 35 ETH)
```

### Claim Process

```
1. User calls claim_winnings()
2. Contract verifies:
   - Market state == FINALIZED
   - Outcome is set
   - User has winning shares
   - User hasn't claimed already
3. Calculate payout (formula above)
4. Transfer payout to user
5. Zero out user's shares (prevent double-claim)
6. Emit ClaimEvent
```

**Invariant:** Sum of all payouts NEVER exceeds totalDeposits.
**Invariant:** Each user can claim EXACTLY once per market.

### INVALID Outcome Refund

```
If outcome == INVALID:
    All users get pro-rata refunds

Refund calculation:
    user_refund = (user.totalInvested / market.totalDeposits) * market.totalDeposits

Notes:
- Fees are NOT refunded (already distributed)
- Creator bond is slashed (market was invalid)
- Only deposits refunded
```

---

## 9. Game Theory Incentives

### Why Each Mechanism Exists

#### 1. LMSR (Logarithmic Market Scoring Rule)

**Problem Solved:**
- Order books require liquidity providers
- Traditional AMMs (x*y=k) don't work for binary outcomes

**How LMSR Solves It:**
- Always provides liquidity (no LPs needed)
- Prices bounded [0, 1] (natural for probabilities)
- Bounded loss for market maker (protocol solvency guaranteed)
- Proper scoring rule (incentivizes truth-telling)

**Incentive Alignment:**
- Traders profit by correcting mispriced markets
- Arbitrageurs drive prices toward true probabilities
- Protocol's max loss is capped (b * ln(2))

#### 2. Dual-Sided Trading (Buy + Sell)

**Problem Solved:**
- Users locked into positions
- No price discovery from exits
- Illiquid markets

**How It Solves It:**
- Users can exit anytime (sell shares back)
- Selling pressure adjusts prices
- Market liquidity improved
- Users comfortable taking larger positions

**Incentive Alignment:**
- Users trade more (less commitment risk)
- More volume = more fees = more revenue
- Better price discovery

#### 3. 10% Trading Fee (3% / 2% / 5% split)

**Problem Solved:**
- Protocol needs revenue
- Creators need incentive to create quality markets
- Future stakers need rewards

**How It Solves It:**
- 3% protocol: Funds development, security, operations
- 2% creator: Incentivizes high-quality market creation
- 5% stakers: Future governance token utility

**Incentive Alignment:**
- Creators optimize for volume (better questions, clear resolution criteria)
- Protocol sustainable (self-funding)
- Users accept fee (value of liquidity + convenience)

#### 4. Proposal Voting (70% approval threshold)

**Problem Solved:**
- Spam markets
- Low-quality questions
- Ambiguous resolution criteria

**How It Solves It:**
- Community filters bad markets before activation
- 70% threshold prevents simple majority abuse
- Proposal tax (non-refundable) deters spam

**Incentive Alignment:**
- Creators self-filter (won't propose garbage)
- Community curates (good markets get approved)
- Quality over quantity

#### 5. Creator Bond (0.1 ETH, refundable)

**Problem Solved:**
- Creator abandonment
- Market manipulation
- No skin in the game

**How It Solves It:**
- Bond locked until resolution
- Slashed if market cancelled for manipulation
- Refunded if market resolves cleanly

**Incentive Alignment:**
- Creators committed to see market through
- Financial penalty for bad behavior
- Aligns creator with traders' interests

#### 6. 48-Hour Dispute Window

**Problem Solved:**
- Incorrect resolutions
- Resolver collusion
- Rushed outcomes

**How It Solves It:**
- Community can challenge resolution
- 48 hours allows thorough review
- Auto-dispute if >50% disagree

**Incentive Alignment:**
- Resolvers incentivized to be accurate (reputation + bonds)
- Community vigilance rewarded
- Bad resolutions get caught

#### 7. Resolution Thresholds (75% finalize, 50% dispute)

**Problem Solved:**
- Consensus measurement
- Dispute spam
- Contentious markets

**How It Solves It:**
- 75% agreement = Strong consensus (auto-finalize)
- >50% disagreement = Weak consensus (auto-dispute)
- Between thresholds = Admin review

**Incentive Alignment:**
- Clear outcomes finalize quickly
- Contentious outcomes get human review
- Prevents gaming with marginal votes

#### 8. INVALID Outcome (Pro-rata refunds)

**Problem Solved:**
- Ambiguous questions
- Resolution source failures
- Unforeseen events

**How It Solves It:**
- Markets can be invalidated
- All users get deposits back
- Creator bond slashed (penalty for bad market)

**Incentive Alignment:**
- Safety valve for broken markets
- Creators avoid ambiguous questions (bond at risk)
- Traders protected from unfair losses

---

## 10. Security Guardrails

### Mandatory Checks (MUST be enforced)

#### State Validation

```
BEFORE every action:
1. Check market exists
2. Check market in valid state for action
3. Check user has required role/permissions
4. Check amounts within bounds (min/max)
5. Check no overflow/underflow in math
```

#### Integer Math Safety

```
ALL arithmetic operations MUST use checked math:
- Addition: checked_add() or overflow protection
- Subtraction: checked_sub() with underflow check
- Multiplication: checked_mul() with overflow check
- Division: checked_div() with zero-division check
```

#### Slippage Protection

```
Buy orders:
- Max price per share = expected_price * (1 + slippage_tolerance)
- If actual_price > max_price: REJECT

Sell orders:
- Min price per share = expected_price * (1 - slippage_tolerance)
- If actual_price < min_price: REJECT
```

#### Reentrancy Prevention

```
State updates BEFORE external calls:
1. Update all state variables
2. Emit events
3. THEN transfer tokens/funds
```

#### Access Control

```
Every privileged action:
1. Check signer matches required role
2. Verify role hasn't been revoked
3. Log action for audit trail
```

#### Parameter Bounds

```
On every parameter update:
1. Validate min <= new_value <= max
2. Validate sum constraints (e.g., fee distribution = 100%)
3. Apply timelock delay (24-48 hours)
4. Emit ParameterUpdateEvent
```

#### Rate Limiting

```
Market creation:
- Max markets per creator per day
- Cooldown period between creations
- Exponential backoff on spam detection

Trading:
- Max trade size (maximumBetAmount)
- Min trade size (minimumBetAmount)
```

### Attack Vectors to Prevent

#### 1. Market Manipulation

**Attack:** Creator creates market, manipulates odds, profits unfairly
**Prevention:**
- Creator bond locked until resolution
- Cannot trade in own markets (enforcement optional)
- Community voting filters bad markets

#### 2. Resolution Collusion

**Attack:** Resolver colludes with traders, resolves incorrectly
**Prevention:**
- 48-hour dispute window
- Community can challenge with evidence
- Resolver bond slashed if overturned
- Reputation system (future)

#### 3. Sybil Attacks (Voting)

**Attack:** Create many wallets to manipulate proposal/dispute votes
**Prevention:**
- Twitter verification (off-chain, aggregated)
- Reputation weighting (future)
- Minimum vote thresholds
- Admin review for close votes

#### 4. Flash Loan Attacks

**Attack:** Borrow large amount, manipulate price, profit, repay
**Prevention:**
- LMSR bounded loss (max loss = b * ln(2))
- Slippage protection
- Maximum bet limits
- Protocol can absorb manipulated trades

#### 5. Front-Running

**Attack:** See pending trade, front-run with own trade
**Prevention:**
- Slippage tolerance (user sets max price)
- Fair sequencing (rely on blockchain ordering)
- MEV awareness in parameter tuning

#### 6. Denial of Service

**Attack:** Spam markets/trades to overload system
**Prevention:**
- Proposal tax (non-refundable)
- Rate limiting
- Exponential backoff
- Admin pause functionality

### Invariants (Always Enforced)

```
✅ State Invariants:
- Market state transitions are one-directional (except admin override)
- Finalized outcomes cannot change
- Claimed payouts tracked (no double-claims)

✅ Economic Invariants:
- P(YES) + P(NO) = 1 (always)
- Sum of payouts <= totalDeposits
- Fee distribution = 100%
- Market maker loss <= b * ln(2)

✅ Access Invariants:
- Only authorized roles can call privileged functions
- Users can only modify their own positions
- Admin cannot steal funds

✅ Time Invariants:
- resolutionTime > activatedAt
- finalizedAt > resolutionTime + dispute_window
- Expired markets cannot be traded

✅ Math Invariants:
- All arithmetic operations checked for overflow/underflow
- Division always checks for zero
- LMSR calculations use safe math
```

---

## Summary Checklist

### Core Mechanics to Preserve

- [x] LMSR cost function (exact formula)
- [x] 6-state lifecycle FSM
- [x] Dual-sided trading (buy + sell)
- [x] 10% trading fee (3/2/5 distribution)
- [x] 48-hour dispute window
- [x] 75% auto-finalize, 50% auto-dispute thresholds
- [x] Proportional winner payouts
- [x] INVALID outcome refunds
- [x] Creator bond + proposal tax
- [x] 70% approval threshold
- [x] Bounded loss guarantee (b * ln(2))
- [x] Binary search for share calculation
- [x] 4-role access control
- [x] 30+ economic parameters with guardrails
- [x] Slippage protection
- [x] Integer overflow protection
- [x] Reentrancy prevention

### Game Theory to Preserve

- [x] Creators incentivized by 2% fee share
- [x] Resolvers incentivized by reputation + bonds
- [x] Traders incentivized by price discovery
- [x] Community filters via proposal voting
- [x] Dispute mechanism prevents bad resolutions
- [x] INVALID outcome safety valve
- [x] Bounded loss ensures protocol solvency

---

## Next Steps

With these invariants documented, proceed to:
1. **EVM_TO_SOLANA_TRANSLATION.md** - Map these mechanics to Solana patterns
2. **SOLANA_PROGRAM_ARCHITECTURE.md** - Design program structure
3. **Implementation** - Code while preserving ALL above invariants

**Golden Rule:** Implementation can change, but these mechanics MUST remain intact.

---

*Last Updated: January 2025 | Version 1.0.0 | Status: IMMUTABLE*
