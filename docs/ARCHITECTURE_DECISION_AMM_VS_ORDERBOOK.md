# ARCHITECTURAL DECISION: AMM vs Order Book for Prediction Markets

**Date:** January 2025
**Status:** 🔴 CRITICAL DECISION REQUIRED
**Impact:** Core trading engine architecture

---

## Executive Summary

**Current Plan:** LMSR (Logarithmic Market Scoring Rule) Automated Market Maker
**Industry Reality:** Most successful prediction markets use Order Books
**Recommendation:** See Section 5 - Three Options Presented

---

## 1. What's Currently Planned (LMSR/AMM)

### Our Current Design

```
Current ZMART V0.69 Plan:
└── Trading Engine (Anchor Program)
    ├── LMSR Pricing Algorithm
    ├── Automated liquidity provision
    ├── No order book required
    └── Market maker subsidizes trades
```

### How It Works

1. **Market Creation:**
   - Creator deposits initial liquidity (e.g., 10 SOL)
   - Algorithm calculates parameter *b* = liquidity / ln(2)
   - Market starts at 50% YES / 50% NO

2. **Trading:**
   - User wants to buy YES shares
   - Algorithm calculates cost: `C(q+Δq) - C(q)`
   - User pays cost, receives shares
   - Price adjusts automatically based on quantity

3. **Liquidity:**
   - Always available (no need for counterparty)
   - Bounded loss for market maker (max subsidy = b * ln(2))
   - Simple implementation

### Pros of AMM/LMSR

✅ **Simple Implementation** - One program, no order matching logic
✅ **Always Liquid** - Users can always trade instantly
✅ **No Market Makers Needed** - Algorithm provides liquidity
✅ **Bounded Risk** - Maximum loss is known upfront
✅ **Fast Time to Market** - Can launch in 3-4 months
✅ **Low Complexity** - Easy to test and audit
✅ **Proven Math** - LMSR is academically sound

### Cons of AMM/LMSR

❌ **Requires Subsidy** - Someone must fund the market maker loss
❌ **Capital Inefficient** - Requires large liquidity pool for deep markets
❌ **Wide Spreads** - Cost to trade > instantaneous price
❌ **Impermanent Loss** - Liquidity providers can lose money
❌ **Not Industry Standard** - Major platforms moved away from this
❌ **Price Manipulation** - Large traders can move prices significantly
❌ **User Confusion** - "Why do I pay more than the displayed price?"

---

## 2. What Industry Leaders Actually Use

### Polymarket (Market Leader - $100M+ daily volume)

**Architecture:** Central Limit Order Book (CLOB)
```
Polymarket Tech Stack:
└── Order Book System
    ├── Off-chain order matching (centralized)
    ├── On-chain settlement (Polygon)
    ├── Professional market makers provide liquidity
    └── Tight spreads (0.1-0.5%)
```

**Why They Use Order Books:**
- Most capital efficient (1:1 trades, no AMM subsidy)
- Tightest spreads (more attractive to traders)
- Familiar UX (looks like traditional exchanges)
- Scalable (can handle millions of orders)
- Professional market makers compete to provide liquidity

### Kalshi (Regulated US platform - $50M+ volume)

**Architecture:** Order Book
```
Kalshi:
└── Traditional exchange model
    ├── Order book matching engine
    ├── Limit orders, market orders
    └── Professional liquidity provision
```

### Augur (Original decentralized prediction market)

**Evolution:**
- **Augur V1:** Used AMM (automated market maker)
- **Augur V2:** Switched to order book (0x protocol)
- **Why they switched:** "AMM couldn't provide competitive pricing vs centralized alternatives"

### Manifold Markets (Play money / fun markets)

**Architecture:** AMM (constant product)
```
Manifold:
└── AMM with play money
    ├── No real money risk
    ├── Simple for casual users
    └── Good for fun/entertainment
```

**Note:** They use AMM because it's play money, not real money.

---

## 3. Deep Dive: Order Book vs AMM Comparison

### Capital Efficiency

**Order Book Example:**
```
Trader A wants to buy YES at 55¢
Trader B wants to sell YES at 55¢

Match:
├─ Trader A pays 55¢, gets 1 YES share
├─ Trader B receives 55¢, loses 1 YES share
└─ No capital required from platform
```

**AMM Example:**
```
Trader A wants to buy YES

AMM Calculation:
├─ Current price: 50¢
├─ Cost for 100 shares: $52 (includes slippage)
├─ Price moves to 52¢
├─ AMM takes on risk
└─ Requires liquidity pool (e.g., 1000 SOL locked)
```

**Winner: Order Book** (no capital lockup required)

### Spread Comparison

**Order Book:**
```
Best Bid: 54.5¢
Best Ask: 55.5¢
Spread: 1¢ (1.8%)
```

**AMM:**
```
Instantaneous Price: 55¢
Cost for Small Trade: 55.5¢
Cost for Large Trade: 58¢
Effective Spread: 0.5% - 5%+
```

**Winner: Order Book** (tighter spreads, especially for size)

### User Experience

**Order Book:**
```
Pros:
✅ Familiar (looks like stock trading)
✅ See full depth of market
✅ Place limit orders ("buy if price drops")
✅ Transparent pricing

Cons:
❌ More complex UI
❌ Might not have liquidity at desired price
```

**AMM:**
```
Pros:
✅ Simple interface
✅ Always executes instantly
✅ No need to understand order types

Cons:
❌ Slippage confusion
❌ "Why did I pay more than shown?"
❌ Can't place limit orders
```

**Winner: Order Book** (for serious traders)

### Development Complexity

**Order Book:**
```
Complexity: HIGH
├─ Order matching engine (on-chain or off-chain)
├─ Order storage and indexing
├─ Partial fill logic
├─ Order cancellation
├─ Time priority logic
└─ Estimated Timeline: 6-8 months
```

**AMM:**
```
Complexity: MEDIUM
├─ Pricing algorithm implementation
├─ Position tracking
├─ Liquidity pool management
└─ Estimated Timeline: 3-4 months
```

**Winner: AMM** (much faster to build)

---

## 4. Industry Trends Analysis

### Historical Evolution

```
2015-2017: Augur V1 (AMM)
├─ First major decentralized prediction market
├─ Used AMM because it was simpler
└─ Struggled with liquidity and pricing

2018-2020: Migration to Order Books
├─ Augur V2 switched to 0x order book
├─ Realized AMM couldn't compete with centralized platforms
└─ Better pricing = more volume

2020-2023: Order Books Win
├─ Polymarket dominates with order book
├─ Kalshi (regulated) uses order book
├─ Only play-money platforms still use AMM
└─ Real money demands efficiency
```

### Why Order Books Won

1. **Capital Efficiency** - Critical for scaling
2. **Competitive Pricing** - Tight spreads attract traders
3. **Professional Market Makers** - Provide deep liquidity
4. **Regulatory Acceptance** - Looks like traditional exchange
5. **User Familiarity** - Traders understand order books

### Where AMM Still Makes Sense

1. **Play Money Markets** - Manifold, prediction.vc
2. **Low Volume Markets** - Where order book would be empty
3. **Rapid Prototyping** - Get to market fast, validate idea
4. **Niche Use Cases** - Specific market types

---

## 5. Three Options for ZMART V0.69

### Option A: Pure Order Book (Industry Standard)

**Architecture:**
```
Order Book System:
└── Trading Engine (Anchor Program)
    ├── Order Book Storage (on-chain)
    ├── Order Matching Logic
    ├── Partial Fill Handling
    └── Settlement Engine

└── Cranker (Off-chain Service)
    ├── Match orders continuously
    ├── Call on-chain settlement
    └── Handle order priority
```

**Pros:**
- ✅ Industry standard (what successful platforms use)
- ✅ Most capital efficient
- ✅ Tightest spreads
- ✅ Familiar to traders
- ✅ Scalable to high volume

**Cons:**
- ❌ Much more complex to build
- ❌ 6-8 month timeline (vs 3-4 months for AMM)
- ❌ Requires professional market makers for liquidity
- ❌ Empty order books for unpopular markets
- ❌ More potential bugs and attack vectors

**Estimated Timeline:**
```
Week 1-4:   Order book program design & implementation
Week 5-8:   Matching engine & settlement
Week 9-12:  Cranker service & testing
Week 13-16: Security audit & fixes
Week 17-20: Frontend integration
Week 21-24: Testing & launch

Total: 6 months
```

### Option B: Pure AMM (Currently Planned)

**Architecture:**
```
AMM System:
└── Trading Engine (Anchor Program)
    ├── LMSR Pricing
    ├── Position Tracking
    └── Liquidity Pool Management
```

**Pros:**
- ✅ Fast to build (3-4 months)
- ✅ Simple architecture
- ✅ Always liquid
- ✅ No market makers needed
- ✅ Easy to test and audit

**Cons:**
- ❌ Not what industry leaders use
- ❌ Requires subsidy for liquidity
- ❌ Wide spreads deter serious traders
- ❌ Capital inefficient
- ❌ May struggle to compete

**Estimated Timeline:**
```
Week 1-10:  Backend (Anchor + Node.js)
Week 11-16: Frontend (Next.js)

Total: 4 months (as originally planned)
```

### Option C: Hybrid (Best of Both Worlds)

**Architecture:**
```
Hybrid System:
└── Trading Engine
    ├── Order Book (Primary)
    │   ├── Match orders when available
    │   └── Tight spreads for liquid markets
    │
    └── AMM Fallback (Secondary)
        ├── Provide liquidity when order book empty
        └── Ensure all markets tradeable
```

**Pros:**
- ✅ Order book efficiency for popular markets
- ✅ AMM ensures all markets liquid
- ✅ Best user experience
- ✅ Competitive with industry leaders
- ✅ Differentiator ("hybrid" = innovation)

**Cons:**
- ❌ Most complex to build
- ❌ Highest development time
- ❌ Two systems to maintain
- ❌ Risk of bugs in interaction

**Estimated Timeline:**
```
Week 1-6:   AMM implementation (simpler first)
Week 7-12:  Order book implementation
Week 13-16: Hybrid routing logic
Week 17-20: Testing & security audit
Week 21-24: Frontend integration
Week 25-28: Launch

Total: 7 months
```

---

## 6. Recommended Path Forward

### My Recommendation: Phased Approach

```
PHASE 1 (Months 1-4): Launch with AMM
└── Build and launch AMM version
    ├── Validate product-market fit
    ├── Build user base
    ├── Generate revenue
    └── Learn from real usage

PHASE 2 (Months 5-10): Add Order Book
└── Implement order book in parallel
    ├── Don't shut down AMM
    ├── Add order book as enhancement
    ├── Migrate high-volume markets
    └── Keep AMM for low-volume markets

PHASE 3 (Months 11+): Hybrid Optimization
└── Optimize routing between systems
    ├── AMM for cold markets
    ├── Order book for hot markets
    └── Best of both worlds
```

### Rationale

**Why Start with AMM:**
1. **Speed to Market** - 4 months vs 6-8 months
2. **Validation** - Prove concept before complex engineering
3. **Lower Risk** - Simpler = fewer bugs
4. **Funding** - Generate revenue sooner
5. **Learning** - Understand users before building complex system

**Why Add Order Book Later:**
1. **Proven Need** - Only add if volume justifies
2. **Better Engineering** - More time for quality
3. **User Feedback** - Build what users actually want
4. **Competitive Pressure** - If AMM works well enough, why rebuild?

**What If AMM Fails:**
- Failed fast (4 months, not 7)
- Lower sunk cost
- Learned valuable lessons
- Can pivot to order book with knowledge

---

## 7. Alternative: Skip Both, Use Existing DEX

### Option D: Integrate with Existing Order Book DEX

**Idea:** Don't build trading engine at all. Use existing Solana DEX.

**Architecture:**
```
Prediction Market Layer:
├── Market Factory (create markets)
├── Resolution Manager (resolve outcomes)
└── YES/NO SPL Tokens

Trading Layer:
└── Openbook (Serum successor)
    ├── Existing order book DEX
    ├── Create YES/NO token pairs
    └── Let users trade on established platform
```

**Pros:**
- ✅ Don't reinvent the wheel
- ✅ Use battle-tested infrastructure
- ✅ Leverage existing liquidity
- ✅ Focus on prediction market logic, not trading
- ✅ Fastest to market (2-3 months)

**Cons:**
- ❌ Less control over user experience
- ❌ Dependent on third-party platform
- ❌ Share revenue with DEX
- ❌ Less differentiation

**Example:** Drift Protocol (uses Openbook for settlement)

---

## 8. Decision Matrix

|  | **AMM** | **Order Book** | **Hybrid** | **External DEX** |
|---|---|---|---|---|
| **Time to Launch** | 🟢 4 months | 🟡 6-8 months | 🔴 7 months | 🟢 2-3 months |
| **Capital Efficiency** | 🔴 Low | 🟢 High | 🟢 High | 🟢 High |
| **User Experience** | 🟡 Simple but confusing | 🟢 Familiar | 🟢 Best | 🟡 External platform |
| **Spreads** | 🔴 Wide | 🟢 Tight | 🟢 Tight | 🟢 Tight |
| **Liquidity** | 🟢 Always available | 🔴 Can be empty | 🟢 Always available | 🟡 Depends on DEX |
| **Development Complexity** | 🟢 Low | 🔴 High | 🔴 Very High | 🟢 Low |
| **Industry Standard** | 🔴 Outdated | 🟢 Current | 🟢 Cutting edge | 🟡 Workaround |
| **Differentiation** | 🔴 Low | 🟡 Medium | 🟢 High | 🔴 Low |
| **Total Cost** | 🟢 $50k-$100k | 🟡 $150k-$250k | 🔴 $250k-$400k | 🟢 $30k-$70k |

---

## 9. Final Recommendation

**RECOMMENDED: Option B → AMM Launch + Order Book V2**

### Launch Strategy

**V1 (Months 1-4): AMM MVP**
```
Build:
├─ Market Factory (Anchor)
├─ Trading Engine with LMSR (Anchor)
├─ Resolution Manager (Anchor)
├─ Backend Services (Node.js)
├─ Frontend (Next.js)
└─ Launch on mainnet

Goal: Validate product-market fit
Timeline: 4 months
Budget: $75k-$125k
```

**V2 (Months 5-10): Order Book Addition**
```
Build (If V1 Successful):
├─ Order Book Program (Anchor)
├─ Matching Engine (Cranker)
├─ Hybrid Routing Logic
└─ Migrate high-volume markets

Goal: Competitive with Polymarket
Timeline: 6 months
Budget: $150k-$250k
```

### Success Criteria for Triggering V2

Launch Order Book V2 if V1 AMM achieves:
- ✅ 1000+ daily active users
- ✅ $1M+ monthly volume
- ✅ User feedback requesting better pricing
- ✅ Competing platforms undercutting our spreads
- ✅ Secured additional funding

### If V1 Doesn't Hit Targets

Don't build V2. Pivot or shut down.
- Better to fail fast with AMM (4 months)
- Than fail slow with order book (10 months)

---

## 10. Action Items

### If Continuing with AMM (Current Plan):

1. ✅ Continue documentation as planned
2. ✅ Build LMSR Trading Engine
3. ✅ Launch in 4 months
4. ✅ Gather user feedback
5. ⏳ Reevaluate after 6 months

### If Switching to Order Book:

1. 🔴 Pause current plan
2. 🔴 Redesign programs (order book architecture)
3. 🔴 Extend timeline to 6-8 months
4. 🔴 Update all documentation
5. 🔴 Hire additional developers (matching engine expertise)

### If Choosing External DEX:

1. 🔵 Research Openbook integration
2. 🔵 Design token pair architecture
3. 🔵 Simplify program design (no trading engine)
4. 🔵 Fastest path to market (2-3 months)

---

## My Honest Assessment

**ZMART V0.69 should launch with AMM (current plan), then add order book in V2.**

**Why:**
- ✅ You're early enough to validate idea
- ✅ 4 months to market is powerful
- ✅ Polymarket took years to get where they are
- ✅ Better to have working product than perfect architecture
- ✅ Can always rebuild trading engine with more capital/time

**BUT:**
- ⚠️ Know you're using "outdated" approach
- ⚠️ Plan migration to order book if successful
- ⚠️ Don't over-invest in AMM optimization
- ⚠️ Communicate honestly: "V1 = AMM, V2 = Order Book"

**Bottom Line:**
Ship the AMM, prove the market, then build the "right" architecture.

---

**Your Decision:**

Which option do you want to pursue?

A. ✅ **Continue with AMM (current plan)** - Ship in 4 months, iterate later
B. 🔄 **Switch to Order Book** - Delay to 6-8 months, industry standard
C. 🔀 **Hybrid from Day 1** - Delay to 7 months, best long-term
D. 🔌 **Use External DEX** - Ship in 2-3 months, less control

Please specify your choice and I'll adjust documentation accordingly.

