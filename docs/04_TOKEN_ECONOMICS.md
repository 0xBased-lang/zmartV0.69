# 04 - Token Economics

**Document:** ZMART V0.69 Token Model & Economics
**Version:** 0.1.0
**Last Updated:** January 2025

[← Back to Index](./00_MASTER_INDEX.md) | [← Solana Programs](./03_SOLANA_PROGRAM_DESIGN.md) | [Next: LMSR Mathematics →](./05_LMSR_MATHEMATICS.md)

---

## Table of Contents

1. [Multi-Environment Strategy](#multi-environment-strategy)
2. [Token Model Overview](#token-model-overview)
3. [Phase 1: Devnet Testing (SOL)](#phase-1-devnet-testing-sol)
4. [Phase 2: Pump.fun Launch (ZMART)](#phase-2-pumpfun-launch-zmart)
5. [Phase 3: Mainnet Deployment](#phase-3-mainnet-deployment)
6. [Platform Fee Structure](#platform-fee-structure)
7. [Incentive Mechanisms](#incentive-mechanisms)
8. [Economic Security](#economic-security)
9. [Token Utility](#token-utility)

---

## Multi-Environment Strategy

ZMART V0.69 uses a **phased token approach** to ensure technical stability before mainnet launch:

```
┌────────────────────────────────────────────────────────────────────┐
│ PHASE 1: DEVNET TESTING                                            │
│ Timeline: Weeks 1-10 (Backend Development)                         │
│ Currency: Devnet SOL (Free test tokens)                            │
│ Purpose: Technical validation, bug discovery, integration testing  │
│ Users: Development team, internal testers                          │
└────────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────────────────┐
│ PHASE 2: PUMP.FUN COMMUNITY LAUNCH                                 │
│ Timeline: Weeks 11-14 (Parallel to Frontend Development)           │
│ Currency: ZMART token (Mainnet, launched via Pump.fun)             │
│ Purpose: Community building, market validation, liquidity testing  │
│ Users: Early adopters, crypto community, beta testers              │
└────────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────────────────┐
│ PHASE 3: MAINNET FULL LAUNCH                                       │
│ Timeline: Week 15-16 (Production Launch)                           │
│ Currency: ZMART token (Established liquidity + SOL pairs)          │
│ Purpose: Production platform with proven token economics           │
│ Users: General public, institutional users                         │
└────────────────────────────────────────────────────────────────────┘
```

### Why This Strategy?

✅ **Risk Mitigation** - Test with worthless tokens before real money
✅ **Community First** - Build following during development via Pump.fun
✅ **Market Validation** - Prove token utility before mainnet commitment
✅ **Regulatory Clarity** - Community-launched token, not team-issued
✅ **Liquidity Bootstrapping** - Pump.fun provides initial liquidity
✅ **Hype Building** - Generate excitement during frontend development

---

## Token Model Overview

### Token Standards

#### Devnet Phase
- **Token:** Devnet SOL
- **Standard:** Native Solana
- **Supply:** Unlimited (faucet distribution)
- **Value:** $0 (test environment)

#### Pump.fun Phase & Mainnet
- **Token:** ZMART
- **Standard:** SPL Token (Metaplex metadata)
- **Supply:** 1,000,000,000 ZMART (1 billion)
- **Decimal Places:** 9
- **Launch Method:** Pump.fun bonding curve
- **Liquidity:** Community-driven + automated migration to Raydium

### Token Distribution (Post-Pump.fun)

```
ZMART Token Distribution (1B Total Supply)
═══════════════════════════════════════════════════════════════

Community Sale (Pump.fun)         40%  = 400,000,000 ZMART
├─ Initial bonding curve          20%  = 200,000,000 ZMART
└─ Raydium liquidity migration    20%  = 200,000,000 ZMART

Development & Operations          25%  = 250,000,000 ZMART
├─ Core team (2-year vest)        15%  = 150,000,000 ZMART
├─ Advisors (1-year vest)          5%  =  50,000,000 ZMART
└─ Operations reserve              5%  =  50,000,000 ZMART

Community Incentives              20%  = 200,000,000 ZMART
├─ User rewards (staking)         10%  = 100,000,000 ZMART
├─ Market creator bounties         5%  =  50,000,000 ZMART
├─ Liquidity mining                3%  =  30,000,000 ZMART
└─ Airdrops & marketing            2%  =  20,000,000 ZMART

Ecosystem Development             10%  = 100,000,000 ZMART
├─ Grants program                  5%  =  50,000,000 ZMART
├─ Partnerships                    3%  =  30,000,000 ZMART
└─ Security audits                 2%  =  20,000,000 ZMART

Treasury Reserve                   5%  =  50,000,000 ZMART
└─ Emergency fund & governance     5%  =  50,000,000 ZMART
```

### Vesting Schedule

```rust
// Team tokens (2-year linear vest)
pub struct TeamVesting {
    total_allocation: 150_000_000,
    cliff_period: 6 * 30 * 24 * 3600,  // 6 months
    vesting_duration: 24 * 30 * 24 * 3600, // 24 months
    start_time: i64,
}

// Advisor tokens (1-year linear vest)
pub struct AdvisorVesting {
    total_allocation: 50_000_000,
    cliff_period: 3 * 30 * 24 * 3600,  // 3 months
    vesting_duration: 12 * 30 * 24 * 3600, // 12 months
    start_time: i64,
}
```

---

## Phase 1: Devnet Testing (SOL)

### Purpose
Technical validation with **zero financial risk**.

### Token Distribution
```bash
# Developers get devnet SOL from faucet
solana airdrop 10 --url devnet

# Test users receive tokens via distribution script
npm run distribute-test-tokens
```

### Testing Scenarios
1. **Market Creation** - Create 50+ test markets across categories
2. **Trading Simulation** - Simulate 1000+ trades with varying sizes
3. **Resolution Testing** - Test all resolution paths (normal, disputed, cancelled)
4. **LMSR Validation** - Verify pricing algorithm under all conditions
5. **Load Testing** - Stress test with 100+ concurrent users

### Success Criteria
- ✅ All 4 Anchor programs deployed and functional
- ✅ Backend services operational (aggregator, API, monitoring)
- ✅ Database schema fully implemented
- ✅ 95%+ test coverage across all code
- ✅ Security audit completed with no critical issues
- ✅ Load test passed (1000+ concurrent users)
- ✅ Zero critical bugs in 2-week testing period

---

## Phase 2: Pump.fun Launch (ZMART)

### What is Pump.fun?

**Pump.fun** is a Solana-native token launch platform that provides:
- ✅ **No Code Required** - Launch tokens without technical knowledge
- ✅ **Fair Launch** - Community-driven price discovery via bonding curve
- ✅ **Instant Liquidity** - Automated liquidity provision
- ✅ **Raydium Migration** - Auto-migrate to Raydium DEX when bonding curve completes
- ✅ **Social Integration** - Built-in community features, memes, and hype

### Pump.fun Bonding Curve Mechanics

```
Price = Base_Price * (1 + k * Tokens_Sold / Total_Supply)

Where:
- Base_Price = Starting price (e.g., $0.0001)
- k = Price sensitivity constant (e.g., 10)
- Tokens_Sold = Tokens sold so far
- Total_Supply = Max tokens in bonding curve (200M)
```

**Example Price Progression:**
```
   0 tokens sold  → $0.0001 per ZMART
  50M tokens sold → $0.00035 per ZMART (+250%)
 100M tokens sold → $0.0006 per ZMART (+500%)
 150M tokens sold → $0.00085 per ZMART (+750%)
 200M tokens sold → $0.0011 per ZMART (+1000%)
```

When bonding curve sells out (200M tokens), **automatic Raydium migration** occurs:
1. Collected SOL becomes liquidity pool
2. Remaining ZMART tokens paired with SOL
3. LP tokens burned or locked
4. Trading opens on Raydium DEX

### Launch Strategy

#### Pre-Launch (Week 11)
1. **Community Building**
   - Launch Twitter account (@ZmartPredicts)
   - Create Discord server with alpha channels
   - Publish launch announcement with vision
   - Share memes and viral content

2. **Technical Preparation**
   - Frontend MVP ready (core trading functionality)
   - Backend deployed and stable
   - Monitoring and alerting operational
   - Documentation complete

3. **Marketing Materials**
   - Launch video (explainer + hype)
   - Pitch deck (for investors/partners)
   - Press releases
   - Influencer partnerships

#### Launch Day (Week 12)
```
T-0 hours: Create ZMART token on Pump.fun
├─ Token name: "Zmart Prediction Market"
├─ Symbol: ZMART
├─ Description: "Decentralized prediction markets powered by LMSR
│                on Solana. Trade on anything, profit from
│                knowledge."
├─ Image: High-quality logo (512x512)
├─ Social links: Twitter, Discord, Website
└─ Initial liquidity: 0 SOL (bonding curve starts empty)

T+0 hours: Announce launch on Twitter
├─ Tweet launch link
├─ Engage with community
└─ Monitor sentiment

T+1 hours: Begin marketing campaign
├─ Post in Solana Discord channels
├─ Share on Reddit (r/solana, r/cryptocurrency)
├─ Activate influencer partnerships
└─ Run Twitter Spaces AMA

T+6 hours: First major price milestone
├─ Celebrate on social media
├─ Share stats and metrics
└─ Engage top holders

T+24 hours: 24-hour recap
├─ Total raised
├─ Number of holders
├─ Volume metrics
└─ Next steps announcement

T+7 days: Bonding curve completion (target)
├─ Automatic Raydium migration
├─ Trading opens on DEX
└─ Integration with ZMART platform begins
```

#### Post-Launch (Weeks 12-14)
1. **Platform Integration**
   - Add ZMART as accepted currency (in addition to SOL)
   - Implement ZMART staking for fee discounts
   - Launch loyalty rewards program

2. **Community Engagement**
   - Daily Twitter updates
   - Weekly AMAs on Discord
   - Meme contests with ZMART rewards
   - Trading competitions

3. **Liquidity Management**
   - Monitor Raydium liquidity depth
   - Adjust trading parameters if needed
   - Partner with market makers if required

### ZMART Token Utility During Pump.fun Phase

Even before full mainnet launch, ZMART has utility:

1. **Platform Fee Discounts**
   - Pay fees in ZMART → 50% discount
   - Pay fees in SOL → Full price

2. **Staking Rewards**
   - Stake ZMART → Earn share of platform fees
   - Minimum stake: 10,000 ZMART
   - Rewards paid weekly in SOL

3. **Enhanced Features**
   - Hold 50,000+ ZMART → Unlock advanced analytics
   - Hold 100,000+ ZMART → Priority customer support
   - Hold 500,000+ ZMART → Early access to new markets

4. **Governance Rights**
   - 1 ZMART = 1 vote on platform proposals
   - Propose new features (requires 100,000 ZMART)
   - Vote on market approval parameters

### Risk Mitigation

**What if Pump.fun launch fails?**
- Platform still works with SOL (primary currency)
- ZMART is optional enhancement, not requirement
- Team can manually create Raydium pool if needed
- Refund community if token doesn't achieve utility

**What if token price crashes?**
- Utility remains constant (fee discounts still 50%)
- Team holds reserves to provide liquidity
- Implement buyback program if price < floor
- Focus on product quality over token price

---

## Phase 3: Mainnet Deployment

### Pre-Launch Checklist

**Technical Requirements:**
- ✅ All devnet tests passed
- ✅ Security audit completed (no critical issues)
- ✅ Load testing passed (1000+ users)
- ✅ Frontend polished and responsive
- ✅ Documentation complete
- ✅ Legal review completed

**Community Requirements:**
- ✅ ZMART token trading on Raydium
- ✅ 1000+ Discord members
- ✅ 5000+ Twitter followers
- ✅ Liquidity > $100k
- ✅ 500+ unique ZMART holders

**Economic Requirements:**
- ✅ Platform fees tested on devnet
- ✅ Token utility mechanics validated
- ✅ Staking contracts audited
- ✅ Liquidity incentives designed

### Mainnet Launch (Week 15-16)

```
Week 15: Soft Launch
├─ Deploy programs to mainnet
├─ Migrate 10 highest-quality markets from devnet
├─ Invite 100 beta users (whitelist only)
├─ Monitor stability for 7 days
└─ Collect feedback and iterate

Week 16: Public Launch
├─ Open to all users
├─ Major marketing push (PR, influencers, ads)
├─ Launch incentive programs
├─ Monitor 24/7 for first 72 hours
└─ Scale infrastructure as needed
```

### Post-Launch Token Utility

Full ZMART utility on mainnet includes:

1. **Trading Medium**
   - Use ZMART to buy/sell prediction shares
   - Lower fees when using ZMART vs SOL

2. **Staking & Rewards**
   - Stake ZMART to earn platform fees
   - Stakers receive 50% of all platform fees
   - Distributed proportionally by stake

3. **Governance Voting**
   - Vote on parameter changes
   - Approve/reject controversial markets
   - Elect moderators and admins
   - Propose platform upgrades

4. **Market Creation**
   - Pay market creation fee in ZMART (discount)
   - Stake ZMART as market creator bond (returned on resolution)
   - Earn ZMART rewards for popular markets

5. **Reputation Boost**
   - ZMART holdings influence reputation score
   - Higher reputation = More trusted markets
   - Priority in dispute resolution

---

## Platform Fee Structure

### Fee Schedule

```rust
pub struct FeeStructure {
    // Trading fees (basis points, 1 bp = 0.01%)
    pub trading_fee_bps: u16,           // 200 = 2%
    pub trading_fee_zmart_bps: u16,     // 100 = 1% (50% discount)

    // Market creation fees
    pub market_creation_fee_sol: u64,   // 0.1 SOL
    pub market_creation_fee_zmart: u64, // 1000 ZMART (≈$0.50 at $0.0005)

    // Resolution fees
    pub resolution_reward_bps: u16,     // 50 = 0.5% of pot

    // Staking rewards
    pub staking_apy_target: u16,        // 1500 = 15% APY
}
```

### Fee Distribution

```
Platform Fee Distribution (2% of all trades)
═══════════════════════════════════════════════════════════════

Stakers (ZMART holders)           50%
├─ Distributed weekly
└─ Proportional to stake weight

Protocol Treasury                 25%
├─ Development fund
└─ Security audits & insurance

Market Creators                   15%
├─ Reward for quality markets
└─ Based on market volume

Liquidity Providers               10%
├─ ZMART/SOL LP rewards
└─ Raydium pool incentives
```

### Fee Examples

**Example 1: SOL Trading**
```
User buys 100 YES shares for 2 SOL
├─ Trade value: 2 SOL
├─ Platform fee (2%): 0.04 SOL
├─ User pays: 2.04 SOL
└─ Fee distribution:
    ├─ Stakers:    0.02 SOL (50%)
    ├─ Treasury:   0.01 SOL (25%)
    ├─ Creator:    0.006 SOL (15%)
    └─ LPs:        0.004 SOL (10%)
```

**Example 2: ZMART Trading (50% discount)**
```
User buys 100 YES shares for 2 SOL worth of ZMART
├─ Trade value: 2 SOL = 4000 ZMART (@$0.0005)
├─ Platform fee (1%): 40 ZMART
├─ User pays: 4040 ZMART
└─ Fee distribution (in ZMART):
    ├─ Stakers:    20 ZMART (50%)
    ├─ Treasury:   10 ZMART (25%)
    ├─ Creator:    6 ZMART (15%)
    └─ LPs:        4 ZMART (10%)
```

---

## Incentive Mechanisms

### 1. Market Creator Rewards

**Objective:** Encourage creation of high-quality, popular markets.

**Mechanism:**
```rust
pub fn calculate_creator_reward(
    market_volume: u64,
    platform_fee_bps: u16,
    creator_share_bps: u16,
) -> u64 {
    let total_fees = (market_volume * platform_fee_bps as u64) / 10_000;
    let creator_reward = (total_fees * creator_share_bps as u64) / 10_000;
    creator_reward
}
```

**Example:**
```
Market: "Will BTC reach $100k by Dec 31?"
├─ Total volume: 1000 SOL
├─ Platform fees (2%): 20 SOL
├─ Creator reward (15% of fees): 3 SOL
└─ Earned passively as market trades
```

**Bonus Rewards:**
- Top 10 markets by volume each month: +100,000 ZMART
- Most accurate resolver: +50,000 ZMART
- Fastest resolution: +25,000 ZMART

### 2. Staking Rewards

**Objective:** Encourage long-term ZMART holding and liquidity commitment.

**Mechanism:**
```rust
pub fn calculate_staking_reward(
    user_stake: u64,
    total_staked: u64,
    weekly_fees_collected: u64,
    staker_share_bps: u16,
) -> u64 {
    let staker_pool = (weekly_fees_collected * staker_share_bps as u64) / 10_000;
    let user_share = (user_stake * staker_pool) / total_staked;
    user_share
}
```

**Example:**
```
User stakes: 100,000 ZMART
Total staked: 10,000,000 ZMART (1% of supply)
Weekly platform fees: 100 SOL
Staker pool (50%): 50 SOL

User's reward:
= (100,000 / 10,000,000) * 50 SOL
= 0.5 SOL per week
= 26 SOL per year
= 26% APY (at user's stake level)
```

**Staking Tiers:**
```
Bronze (10,000+ ZMART)
├─ Weekly rewards
└─ 0.5% fee discount

Silver (50,000+ ZMART)
├─ Weekly rewards
├─ 1% fee discount
└─ Advanced analytics access

Gold (100,000+ ZMART)
├─ Weekly rewards
├─ 2% fee discount
├─ Advanced analytics
└─ Priority support

Platinum (500,000+ ZMART)
├─ Weekly rewards
├─ 3% fee discount
├─ Advanced analytics
├─ Priority support
├─ Early feature access
└─ Governance power (2x votes)
```

### 3. Liquidity Mining

**Objective:** Incentivize ZMART/SOL liquidity on Raydium.

**Mechanism:**
```
Total LP Incentives: 30,000,000 ZMART (3% of supply)
Distribution: 12 months (2,500,000 ZMART/month)

Formula:
User LP Reward = (User LP Tokens / Total LP Tokens) * Monthly Pool
```

**Example:**
```
User provides: 10,000 ZMART + 5 SOL to Raydium
LP tokens received: 1000 LP-ZMART-SOL
Total LP supply: 100,000 LP-ZMART-SOL

User's share: 1%
Monthly reward: 25,000 ZMART (1% of 2.5M)
Annual reward: 300,000 ZMART

If ZMART = $0.0005:
├─ Initial investment: $5 + $750 = $755
├─ Annual reward value: $150
└─ APR: 19.9%
```

### 4. Trading Competitions

**Monthly Trading Competitions:**
```
Prize Pool: 500,000 ZMART ($250 @ $0.0005)

1st Place (Highest PnL): 200,000 ZMART
2nd Place: 150,000 ZMART
3rd Place: 100,000 ZMART
4th-10th Place: 50,000 ZMART each
```

**Rules:**
- Must trade in at least 5 different markets
- Minimum 10 trades per month
- No wash trading (same-side trades banned)
- Winners announced first Monday of each month

---

## Economic Security

### Anti-Manipulation Measures

#### 1. Market Creation Bond
```rust
pub fn create_market_with_bond(
    ctx: Context<CreateMarket>,
    bond_amount: u64,  // e.g., 10,000 ZMART
) -> Result<()> {
    // Creator must lock bond
    // Bond returned only if market resolves cleanly
    // Bond slashed if market is cancelled due to manipulation
}
```

#### 2. Resolution Collateral
```rust
pub fn propose_resolution_with_collateral(
    ctx: Context<ProposeResolution>,
    collateral: u64,  // e.g., 1000 ZMART
) -> Result<()> {
    // Resolver must stake collateral
    // Collateral returned if resolution accepted
    // Collateral slashed if resolution overturned via dispute
}
```

#### 3. Dispute Threshold
```
Dispute Requirements:
├─ Minimum stake: 5000 ZMART
├─ Dispute window: 48 hours
├─ Evidence required: Yes
└─ If dispute wins: Stake returned + reward
```

### Sybil Resistance

**Twitter Verification:**
```rust
pub struct UserReputation {
    pub twitter_verified: bool,        // +100 reputation
    pub twitter_followers: u32,        // +1 per 100 followers
    pub zmart_holdings: u64,           // +1 per 1000 ZMART
    pub successful_trades: u32,        // +10 per profitable trade
    pub market_creator_score: u32,     // +50 per approved market
}

pub fn calculate_reputation(user: &UserReputation) -> u32 {
    let mut score = 0;

    if user.twitter_verified {
        score += 100;
    }

    score += user.twitter_followers / 100;
    score += (user.zmart_holdings / 1000) as u32;
    score += user.successful_trades * 10;
    score += user.market_creator_score * 50;

    score
}
```

**Reputation Gating:**
```
Create Market:
├─ Reputation < 50: Requires 0.5 SOL bond
├─ Reputation 50-200: Requires 0.2 SOL bond
└─ Reputation > 200: Requires 0.05 SOL bond

Propose Resolution:
├─ Reputation < 100: Requires 5000 ZMART collateral
└─ Reputation > 100: Requires 1000 ZMART collateral

Initiate Dispute:
├─ Reputation < 150: Requires 10,000 ZMART stake
└─ Reputation > 150: Requires 5000 ZMART stake
```

### Price Stability Mechanisms

#### 1. Token Buyback Program
```
Conditions:
├─ ZMART price < 50% of 7-day MA
├─ Treasury has > 100 SOL
└─ Activated automatically

Mechanism:
├─ Treasury buys ZMART from Raydium
├─ Purchased tokens burned (reduce supply)
└─ Max buyback: 10% of treasury per week
```

#### 2. Liquidity Depth Requirements
```
Raydium Pool Targets:
├─ Minimum liquidity: $100k
├─ Target liquidity: $500k
├─ Max slippage (1% trade): 0.5%
└─ LP incentives adjust to meet targets
```

---

## Token Utility Summary

```
ZMART Token Utility Matrix
═══════════════════════════════════════════════════════════════

Utility                          Value Proposition
───────────────────────────────────────────────────────────────
Trading Medium                   50% fee discount vs SOL
Staking Rewards                  15-30% APY from platform fees
Governance Voting                1 token = 1 vote on proposals
Market Creation Discount         Pay in ZMART for lower fees
Reputation Boost                 Holdings improve trust score
Liquidity Mining                 Earn tokens for providing liquidity
Fee Distribution                 Stakers earn 50% of all fees
Access Gating                    Unlock features at holding tiers
Dispute Participation            Stake ZMART to challenge resolutions
Creator Rewards                  Earn bonus ZMART for popular markets
```

---

## Migration Plan

### Devnet → Pump.fun Migration

**Week 11:**
1. Export top 10 markets from devnet (metadata only)
2. Create ZMART token on Pump.fun
3. Launch marketing campaign
4. Begin bonding curve phase

**Week 12:**
5. Once bonding curve completes, auto-migrate to Raydium
6. Add ZMART as payment option on frontend
7. Enable staking contracts

### Pump.fun → Mainnet Migration

**Week 15-16:**
1. No token migration needed (ZMART already on mainnet)
2. Deploy production Anchor programs
3. Migrate markets from devnet to mainnet
4. Enable full ZMART utility (governance, advanced staking)
5. Launch incentive programs
6. Begin marketing to wider audience

---

## Next Steps

✅ **Documentation Created:** Complete token economics and multi-phase strategy
📋 **Next Document:** [05 - LMSR Mathematics](./05_LMSR_MATHEMATICS.md)
🔗 **Related:** [Executive Summary](./01_EXECUTIVE_SUMMARY.md) | [Solana Programs](./03_SOLANA_PROGRAM_DESIGN.md)

---

*Last Updated: January 2025 | Version 0.1.0*
