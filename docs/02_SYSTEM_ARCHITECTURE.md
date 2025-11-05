# 02 - System Architecture

**Document:** ZMART V0.69 Complete System Architecture
**Version:** 0.1.0
**Last Updated:** January 2025

[← Back to Index](./00_MASTER_INDEX.md) | [← Executive Summary](./01_EXECUTIVE_SUMMARY.md)

---

## Table of Contents

1. [Overview](#overview)
2. [High-Level Architecture](#high-level-architecture)
3. [Solana Programs Layer](#solana-programs-layer)
4. [Backend Services Layer](#backend-services-layer)
5. [Database Layer](#database-layer)
6. [Frontend Layer](#frontend-layer)
7. [External Integrations](#external-integrations)
8. [Data Flow Examples](#data-flow-examples)
9. [Technology Stack](#technology-stack)

---

## Overview

ZMART V0.69 uses a **hybrid architecture** that optimizes for:
- **Performance**: Solana programs for speed + cheap transactions
- **Scalability**: Off-chain storage for discussions and voting
- **User Experience**: Free voting, rich discussions, social features
- **Transparency**: IPFS anchoring for audit trails
- **Decentralization**: Backend services can be run by anyone

---

## High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                         FRONTEND LAYER                               │
│                   (Next.js + Solana Wallet Adapter)                  │
│                                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │
│  │ Market List  │  │ Trading UI   │  │ Discussions  │             │
│  └──────────────┘  └──────────────┘  └──────────────┘             │
│                                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │
│  │ Portfolio    │  │ User Profile │  │ Admin Panel  │             │
│  └──────────────┘  └──────────────┘  └──────────────┘             │
└──────────────────────────────────────────────────────────────────────┘
                               │
                               │ WebSocket + REST API
                               │
┌──────────────────────────────▼───────────────────────────────────────┐
│                       BACKEND SERVICES LAYER                          │
│                  (Node.js + TypeScript + Express)                     │
│                                                                       │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────────┐   │
│  │   REST API      │  │ Vote Aggregator │  │ Market Monitor   │   │
│  │                 │  │ (Cron Job)      │  │ (Event Listener) │   │
│  │ - CRUD markets  │  │                 │  │                  │   │
│  │ - Discussions   │  │ - Proposal votes│  │ - MarketCreated  │   │
│  │ - User auth     │  │ - Dispute votes │  │ - MarketClosed   │   │
│  │ - Rate limiting │  │ - Auto-trigger  │  │ - Resolution     │   │
│  └─────────────────┘  └─────────────────┘  └──────────────────┘   │
│                                                                       │
│  ┌─────────────────┐  ┌─────────────────┐                          │
│  │ IPFS Anchoring  │  │ SIWE Auth       │                          │
│  │ (Daily Job)     │  │ + Twitter OAuth │                          │
│  └─────────────────┘  └─────────────────┘                          │
└───────────────────────────────────────────────────────────────────────┘
           │                        │                        │
           │ Write                  │ Read/Write             │ Listen
           ▼                        ▼                        ▼
┌────────────────────┐   ┌────────────────────┐   ┌────────────────────┐
│  SUPABASE (DB)     │   │  SOLANA PROGRAMS   │   │  IPFS / ARWEAVE    │
│  (PostgreSQL)      │   │  (Anchor/Rust)     │   │  (Decentralized    │
│                    │   │                    │   │   Storage)         │
│ - users            │   │ ┌────────────────┐ │   │                    │
│ - markets_metadata │   │ │market_factory  │ │   │ - Discussion       │
│ - discussions      │   │ │                │ │   │   hashes (daily)   │
│ - proposal_votes   │   │ │- create_market │ │   │ - Evidence files   │
│ - dispute_votes    │   │ │- approve_market│ │   │ - Metadata         │
│ - content_flags    │   │ │- activate      │ │   │                    │
│ - ipfs_anchors     │   │ └────────────────┘ │   └────────────────────┘
│                    │   │                    │
│                    │   │ ┌────────────────┐ │
│                    │   │ │trading_engine  │ │
│                    │   │ │                │ │
│                    │   │ │- place_bet     │ │
│                    │   │ │- calculate     │ │
│                    │   │ │- LMSR curve    │ │
│                    │   │ └────────────────┘ │
│                    │   │                    │
│                    │   │ ┌────────────────┐ │
│                    │   │ │resolution_mgr  │ │
│                    │   │ │                │ │
│                    │   │ │- propose       │ │
│                    │   │ │- dispute       │ │
│                    │   │ │- finalize      │ │
│                    │   │ └────────────────┘ │
│                    │   │                    │
│                    │   │ ┌────────────────┐ │
│                    │   │ │governance      │ │
│                    │   │ │                │ │
│                    │   │ │- parameters    │ │
│                    │   │ │- roles/access  │ │
│                    │   │ └────────────────┘ │
└────────────────────┘   └────────────────────┘

             ┌───────────────────────────────┐
             │   PUMP.FUN TOKEN (SPL Token)  │
             │   - Proposal tax              │
             │   - Creator bonds             │
             │   - Trading fees              │
             │   - Staking rewards (future)  │
             └───────────────────────────────┘
```

---

## Solana Programs Layer

### Program 1: market-factory

**Responsibility:** Market creation, approval, and lifecycle management

**Program ID:** TBD (deployed on devnet first)

**Accounts (PDAs):**
```
Config: ["config"]
Market: ["market", market_id]
MarketVault: Associated Token Account for bonds
```

**Instructions:**
```rust
// Initialize program with token mint
pub fn initialize(ctx: Context<Initialize>, token_mint: Pubkey) -> Result<()>

// Create market proposal
pub fn create_market(
    ctx: Context<CreateMarket>,
    question: String,
    category: String,
    end_time: i64,
    creator_bond: u64,
    liquidity_param: u64,
) -> Result<()>

// Approve market (called by backend after 70% votes)
pub fn approve_market(ctx: Context<ApproveMarket>, market_id: Pubkey) -> Result<()>

// Activate market for trading
pub fn activate_market(ctx: Context<ActivateMarket>, market_id: Pubkey) -> Result<()>

// Close market at end_time
pub fn close_market(ctx: Context<CloseMarket>, market_id: Pubkey) -> Result<()>

// Update market state
pub fn update_state(ctx: Context<UpdateState>, market_id: Pubkey, new_state: u8) -> Result<()>
```

**State:**
```rust
#[account]
pub struct Config {
    pub authority: Pubkey,
    pub token_mint: Pubkey,
    pub proposal_tax: u64,
    pub min_creator_bond: u64,
    pub max_creator_bond: u64,
    pub bump: u8,
}

#[account]
pub struct Market {
    pub market_id: Pubkey,
    pub creator: Pubkey,
    pub question: String,          // Max 200 chars
    pub category: String,           // Max 50 chars
    pub created_at: i64,
    pub approved_at: i64,
    pub end_time: i64,
    pub state: MarketState,
    pub creator_bond: u64,
    pub liquidity_param: u64,
    pub total_yes_shares: u64,
    pub total_no_shares: u64,
    pub total_deposits: u64,
    pub outcome: u8,                // 0=UNRESOLVED, 1=NO, 2=YES, 3=INVALID
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum MarketState {
    PROPOSED = 0,
    APPROVED = 1,
    ACTIVE = 2,
    RESOLVING = 3,
    DISPUTED = 4,
    FINALIZED = 5,
}
```

**Events:**
```rust
#[event]
pub struct MarketCreated {
    pub market_id: Pubkey,
    pub creator: Pubkey,
    pub question: String,
    pub end_time: i64,
}

#[event]
pub struct MarketApproved {
    pub market_id: Pubkey,
    pub approved_at: i64,
}

#[event]
pub struct MarketClosed {
    pub market_id: Pubkey,
    pub closed_at: i64,
}
```

---

### Program 2: trading-engine

**Responsibility:** LMSR bonding curve trading

**Program ID:** TBD

**Accounts (PDAs):**
```
CurveState: ["curve", market_id]
UserPosition: ["position", market_id, user]
```

**Instructions:**
```rust
// Place bet (buy shares)
pub fn place_bet(
    ctx: Context<PlaceBet>,
    market_id: Pubkey,
    outcome: u8,      // 0=NO, 1=YES
    amount: u64,      // SPL token amount
) -> Result<()>

// Calculate shares for amount (view function equivalent)
pub fn calculate_shares(
    ctx: Context<CalculateShares>,
    market_id: Pubkey,
    amount: u64,
) -> Result<u64>

// Get current price for outcome
pub fn get_price(
    ctx: Context<GetPrice>,
    market_id: Pubkey,
    outcome: u8,
) -> Result<u64>

// Sell shares early (optional feature)
pub fn sell_shares(
    ctx: Context<SellShares>,
    market_id: Pubkey,
    outcome: u8,
    shares: u64,
) -> Result<()>
```

**State:**
```rust
#[account]
pub struct CurveState {
    pub market_id: Pubkey,
    pub liquidity_param: u64,      // 'b' in LMSR
    pub q_yes: u64,                 // Outstanding YES shares
    pub q_no: u64,                  // Outstanding NO shares
    pub cost_function: u64,         // Current C value
    pub yes_price: u64,             // Current YES price (basis points)
    pub no_price: u64,              // Current NO price (basis points)
    pub last_update: i64,
    pub bump: u8,
}

#[account]
pub struct UserPosition {
    pub market_id: Pubkey,
    pub user: Pubkey,
    pub outcome: u8,
    pub shares: u64,
    pub total_cost: u64,
    pub entry_price: u64,
    pub bump: u8,
}
```

**Events:**
```rust
#[event]
pub struct BetPlaced {
    pub market_id: Pubkey,
    pub user: Pubkey,
    pub outcome: u8,
    pub shares: u64,
    pub cost: u64,
    pub fee: u64,
}

#[event]
pub struct PriceUpdated {
    pub market_id: Pubkey,
    pub yes_price: u64,
    pub no_price: u64,
}
```

---

### Program 3: resolution-manager

**Responsibility:** Market outcome resolution and disputes

**Program ID:** TBD

**Accounts (PDAs):**
```
Resolution: ["resolution", market_id]
DisputeWindow: ["dispute", market_id]
```

**Instructions:**
```rust
// Propose resolution (called by authorized resolver)
pub fn propose_resolution(
    ctx: Context<ProposeResolution>,
    market_id: Pubkey,
    outcome: u8,        // 1=NO, 2=YES, 3=INVALID
    evidence: String,   // IPFS hash
) -> Result<()>

// Record dispute vote (called by backend after aggregation)
pub fn record_dispute_vote(
    ctx: Context<RecordDisputeVote>,
    market_id: Pubkey,
    agree_count: u64,
    disagree_count: u64,
) -> Result<()>

// Finalize resolution (auto or admin)
pub fn finalize_resolution(
    ctx: Context<FinalizeResolution>,
    market_id: Pubkey,
    final_outcome: u8,
) -> Result<()>

// Distribute payouts to winners
pub fn claim_payout(
    ctx: Context<ClaimPayout>,
    market_id: Pubkey,
) -> Result<()>
```

**State:**
```rust
#[account]
pub struct Resolution {
    pub market_id: Pubkey,
    pub resolver: Pubkey,
    pub proposed_outcome: u8,
    pub evidence: String,           // IPFS hash
    pub proposed_at: i64,
    pub finalized: bool,
    pub final_outcome: u8,
    pub finalized_at: i64,
    pub admin_override: bool,
    pub bump: u8,
}

#[account]
pub struct DisputeWindow {
    pub market_id: Pubkey,
    pub start_time: i64,
    pub end_time: i64,
    pub active: bool,
    pub agree_votes: u64,
    pub disagree_votes: u64,
    pub total_votes: u64,
    pub bump: u8,
}
```

**Events:**
```rust
#[event]
pub struct ResolutionProposed {
    pub market_id: Pubkey,
    pub resolver: Pubkey,
    pub outcome: u8,
    pub evidence: String,
}

#[event]
pub struct DisputeVoteRecorded {
    pub market_id: Pubkey,
    pub agree: u64,
    pub disagree: u64,
}

#[event]
pub struct MarketFinalized {
    pub market_id: Pubkey,
    pub outcome: u8,
    pub finalized_at: i64,
}
```

---

### Program 4: governance

**Responsibility:** Parameter storage and access control

**Program ID:** TBD

**Accounts (PDAs):**
```
Config: ["governance_config"]
Parameter: ["param", param_name]
RoleMembership: ["role", role_type, user]
```

**Instructions:**
```rust
// Set economic parameter
pub fn set_parameter(
    ctx: Context<SetParameter>,
    name: String,
    value: u64,
) -> Result<()>

// Grant role to user
pub fn grant_role(
    ctx: Context<GrantRole>,
    role: RoleType,
    user: Pubkey,
) -> Result<()>

// Revoke role from user
pub fn revoke_role(
    ctx: Context<RevokeRole>,
    role: RoleType,
    user: Pubkey,
) -> Result<()>
```

**State:**
```rust
#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum RoleType {
    ADMIN = 0,
    RESOLVER = 1,
    BACKEND = 2,
}

#[account]
pub struct Parameter {
    pub name: String,
    pub value: u64,
    pub min_value: u64,
    pub max_value: u64,
    pub last_updated: i64,
    pub updated_by: Pubkey,
}

#[account]
pub struct RoleMembership {
    pub role: RoleType,
    pub user: Pubkey,
    pub granted_at: i64,
    pub granted_by: Pubkey,
}
```

---

## Backend Services Layer

### Service 1: REST API (Express.js)

**Port:** 3000 (development), 443 (production)

**Endpoints:**

**Markets:**
```
GET    /api/markets              - List all markets (with filters)
GET    /api/markets/:id          - Get market details
GET    /api/markets/:id/prices   - Get current prices
POST   /api/markets/:id/vote     - Vote on proposal (like/dislike)
```

**Discussions:**
```
GET    /api/discussions/:marketId           - Get all discussions
POST   /api/discussions                     - Create discussion
POST   /api/discussions/:id/react           - React to discussion (like/dislike/report)
```

**User:**
```
POST   /api/auth/siwe                       - SIWE authentication
POST   /api/auth/twitter                    - Twitter OAuth
GET    /api/user/profile                    - Get user profile
PATCH  /api/user/profile                    - Update profile
```

**Admin:**
```
GET    /api/admin/flags                     - Get flagged content
POST   /api/admin/flags/:id/review          - Review flag
GET    /api/admin/stats                     - Platform statistics
```

---

### Service 2: Vote Aggregator (Cron Job)

**Runs:** Every 5 minutes

**Purpose:** Aggregate off-chain votes and trigger on-chain actions

**Logic:**
```typescript
async function aggregateProposalVotes() {
  const pendingMarkets = await db.markets.findMany({
    where: { state: 'PROPOSED' }
  });

  for (const market of pendingMarkets) {
    const votes = await db.proposal_votes.count({
      where: { market_id: market.id },
      groupBy: ['vote']
    });

    const totalVotes = votes.like + votes.dislike;
    const likePercentage = (votes.like / totalVotes) * 100;

    // Check threshold (70%)
    if (likePercentage >= 70 && totalVotes >= 10) {
      // Call Solana program to approve market
      await program.methods
        .approveMarket(new PublicKey(market.on_chain_address))
        .accounts({ /* ... */ })
        .rpc();

      // Update database
      await db.markets.update({
        where: { id: market.id },
        data: { state: 'APPROVED', approved_at: new Date() }
      });
    }
  }
}
```

---

### Service 3: Market Monitor (Event Listener)

**Purpose:** Listen to Solana program events and sync to database

**Logic:**
```typescript
async function monitorProgramEvents() {
  const connection = new Connection(RPC_ENDPOINT);

  // Subscribe to market_factory logs
  connection.onLogs(
    new PublicKey(MARKET_FACTORY_PROGRAM_ID),
    async (logs) => {
      // Parse event
      if (logs.logs.includes('MarketCreated')) {
        const event = parseMarketCreatedEvent(logs);

        // Create discussion thread
        await db.discussions.create({
          data: {
            market_id: event.marketId.toString(),
            phase: 'proposal',
            // ... initial discussion setup
          }
        });
      }

      if (logs.logs.includes('MarketClosed')) {
        const event = parseMarketClosedEvent(logs);

        // Trigger resolution process
        await triggerResolutionWorkflow(event.marketId);
      }
    }
  );
}
```

---

### Service 4: IPFS Anchoring (Daily Job)

**Runs:** Daily at midnight UTC

**Purpose:** Anchor discussions to IPFS for transparency

**Logic:**
```typescript
async function anchorDiscussionsToIPFS() {
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const discussions = await db.discussions.findMany({
    where: {
      created_at: { gte: yesterday },
      deleted_at: null
    }
  });

  // Group by market
  const byMarket = groupBy(discussions, 'market_id');

  for (const [marketId, items] of Object.entries(byMarket)) {
    const batch = {
      market_id: marketId,
      timestamp: Date.now(),
      discussions: items.map(d => ({
        id: d.id,
        user: d.user_wallet,
        content: d.content,
        created_at: d.created_at
      }))
    };

    // Pin to IPFS
    const ipfsHash = await ipfs.add(JSON.stringify(batch));

    // Store hash in database
    await db.ipfs_anchors.create({
      data: {
        market_id: marketId,
        anchor_type: 'discussions',
        ipfs_hash: ipfsHash,
        discussions_count: items.length
      }
    });
  }
}
```

---

## Database Layer

See [08_DATABASE_SCHEMA.md](./08_DATABASE_SCHEMA.md) for complete schema.

**Key Tables:**
- `users` - User profiles, Twitter, reputation
- `markets` - Market metadata (synced from Solana)
- `discussions` - All comments and threads
- `proposal_votes` - Like/dislike votes
- `dispute_votes` - Agree/disagree votes
- `content_flags` - Moderation flags
- `ipfs_anchors` - Daily IPFS hashes
- `rate_limits` - Anti-spam tracking

---

## Frontend Layer

See [10_FRONTEND_ARCHITECTURE.md](./10_FRONTEND_ARCHITECTURE.md) for details.

**Tech Stack:**
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS + Radix UI
- Framer Motion (animations)
- @solana/wallet-adapter-react
- @tanstack/react-query
- Recharts

**Key Pages:**
- Landing page (marketing)
- Market list (browse/filter)
- Market detail (trading + discussions)
- Portfolio (user positions)
- User profile
- Admin dashboard

---

## External Integrations

### Pump.fun Token

**Integration Points:**
- Token mint address configured in environment
- SPL token program for transfers
- Associated Token Accounts (ATAs) for users
- Token metadata from pump.fun API

### IPFS

**Provider:** Pinata or Web3.Storage
**Use Cases:**
- Daily discussion anchors
- Evidence files for resolutions
- Market metadata (images, descriptions)

### Solana RPC

**Providers:**
- Helius (recommended for mainnet)
- QuickNode (fallback)
- Alchemy (alternative)

**Endpoints:**
- Devnet: https://api.devnet.solana.com
- Mainnet: Custom RPC endpoint

---

## Data Flow Examples

### Example 1: Create Market

```
1. User (Frontend)
   └─> Clicks "Create Market"
   └─> Fills form (question, category, end_time, bond)
   └─> Clicks "Submit"

2. Frontend
   └─> Builds transaction with market-factory.create_market()
   └─> Signs with wallet
   └─> Sends to Solana

3. Solana (market-factory program)
   └─> Validates inputs
   └─> Transfers bond + proposal tax (SPL tokens)
   └─> Creates Market account (PDA)
   └─> Emits MarketCreated event

4. Backend (Event Listener)
   └─> Hears MarketCreated event
   └─> Inserts market into Supabase
   └─> Creates initial discussion thread

5. Frontend
   └─> Receives confirmation
   └─> Redirects to market page
```

---

### Example 2: Approve Market (Hybrid Flow)

```
1. Community (Off-Chain)
   └─> Users vote like/dislike on proposal
   └─> Votes stored in Supabase

2. Backend (Vote Aggregator - Every 5 min)
   └─> Counts votes for pending markets
   └─> Calculates like percentage
   └─> If ≥70%:
       └─> Calls market-factory.approve_market()
       └─> Updates Supabase: state = APPROVED

3. Backend (Market Monitor)
   └─> Hears MarketApproved event
   └─> Calls market-factory.activate_market()
   └─> Market state → ACTIVE

4. Frontend
   └─> Polls or WebSocket updates
   └─> Shows "Market is live!" notification
   └─> Enables trading UI
```

---

### Example 3: Place Bet

```
1. User (Frontend)
   └─> Selects outcome (YES or NO)
   └─> Enters amount (e.g., 100 tokens)
   └─> Clicks "Place Bet"

2. Frontend
   └─> Calls trading-engine.calculate_shares()
   └─> Shows preview: "100 tokens → 85 shares at 0.65 price"
   └─> User confirms

3. Frontend
   └─> Builds transaction with trading-engine.place_bet()
   └─> Signs with wallet
   └─> Sends to Solana

4. Solana (trading-engine program)
   └─> Validates market is ACTIVE
   └─> Transfers tokens from user to market vault
   └─> Calculates shares via LMSR
   └─> Updates CurveState (q_yes/q_no, prices)
   └─> Creates/updates UserPosition
   └─> Emits BetPlaced event

5. Backend (Event Listener)
   └─> Hears BetPlaced event
   └─> Updates market analytics in Supabase

6. Frontend
   └─> Receives confirmation
   └─> Updates user portfolio
   └─> Updates price chart (real-time)
```

---

## Technology Stack

### Blockchain
- **Solana** - Layer 1 blockchain
- **Anchor** - Rust framework for Solana programs
- **SPL Token** - Token program (for pump.fun token)

### Backend
- **Node.js** v18+ - JavaScript runtime
- **TypeScript** - Type safety
- **Express.js** - REST API framework
- **Supabase** - PostgreSQL database + real-time
- **node-cron** - Scheduled jobs
- **@solana/web3.js** - Solana SDK
- **@project-serum/anchor** - Anchor TypeScript SDK

### Frontend
- **Next.js 14** - React framework (App Router)
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility CSS framework
- **Radix UI** - Headless component library
- **Framer Motion** - Animations
- **@solana/wallet-adapter-react** - Wallet integration
- **@tanstack/react-query** - Data fetching
- **Recharts** - Charts

### Infrastructure
- **Vercel** - Frontend hosting
- **Railway** or **Fly.io** - Backend hosting
- **Supabase** - Database + auth
- **Pinata** or **Web3.Storage** - IPFS pinning
- **Helius** or **QuickNode** - Solana RPC

### Development Tools
- **Anchor CLI** - Program development
- **Solana CLI** - Blockchain interaction
- **Rust** - Programming language
- **Cargo** - Rust package manager
- **pnpm** - JavaScript package manager
- **Vitest** - Unit testing
- **Playwright** - E2E testing

---

## Next Steps

**For Implementation:**
1. Read [03_SOLANA_PROGRAM_DESIGN.md](./03_SOLANA_PROGRAM_DESIGN.md) for detailed program structure
2. Read [08_DATABASE_SCHEMA.md](./08_DATABASE_SCHEMA.md) for complete database design
3. Read [16_DEPLOYMENT_GUIDE.md](./16_DEPLOYMENT_GUIDE.md) for setup instructions

**For Understanding:**
1. Review data flow examples above
2. Study program responsibilities
3. Understand hybrid architecture benefits

---

[← Back to Index](./00_MASTER_INDEX.md) | [← Executive Summary](./01_EXECUTIVE_SUMMARY.md) | [Next: Solana Program Design →](./03_SOLANA_PROGRAM_DESIGN.md)
