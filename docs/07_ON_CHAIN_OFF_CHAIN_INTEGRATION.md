# 07 - On-Chain/Off-Chain Integration: Hybrid Architecture

**Status**: Implementation-Ready
**Version**: v0.69 (Option B - Minimal Social Features)
**Last Updated**: 2025-11-05
**Prerequisites**: `03_SOLANA_PROGRAM_DESIGN.md`, `CLAUDE.md` (Option B scope)

---

## Table of Contents

1. [Hybrid Architecture Overview](#hybrid-architecture-overview)
2. [On-Chain Components](#on-chain-components)
3. [Off-Chain Components](#off-chain-components)
4. [Vote Aggregation Workflow](#vote-aggregation-workflow)
5. [Discussion System (Option B)](#discussion-system-option-b)
6. [Backend Services](#backend-services)
7. [Event Indexing](#event-indexing)
8. [API Gateway Design](#api-gateway-design)
9. [Data Synchronization](#data-synchronization)
10. [Security Considerations](#security-considerations)

---

## Hybrid Architecture Overview

### Design Philosophy

**Core Principle**: Critical state on-chain, everything else off-chain

**Why Hybrid?**
1. **Gas Efficiency**: On-chain storage expensive (~0.00348 SOL per KB)
2. **Scalability**: Can handle thousands of votes without on-chain bloat
3. **Flexibility**: Off-chain logic easier to upgrade
4. **Performance**: Faster queries and analytics from traditional DB

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER INTERFACE                           │
│                     (Next.js Frontend)                          │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ↓                     ↓                     ↓
┌──────────────┐    ┌────────────────┐    ┌──────────────┐
│   Solana     │    │  API Gateway   │    │    IPFS      │
│   Program    │    │   (Backend)    │    │   Storage    │
│  (On-Chain)  │    │  (Off-Chain)   │    │ (Evidence)   │
└──────────────┘    └────────────────┘    └──────────────┘
       │                     │                     │
       │            ┌────────┴────────┐           │
       │            ↓                 ↓           │
       │    ┌──────────────┐  ┌──────────────┐   │
       │    │   Supabase   │  │   Event      │   │
       │    │   Database   │  │   Indexer    │   │
       │    │  (Postgres)  │  │   (Redis)    │   │
       │    └──────────────┘  └──────────────┘   │
       │                                          │
       └──────────────────────────────────────────┘
              Solana Events / IPFS CIDs
```

---

## On-Chain Components

### What Lives On-Chain

```rust
// Critical state only
pub struct MarketAccount {
    // Core market parameters
    pub market_id: [u8; 32],
    pub creator: Pubkey,
    pub state: MarketState,

    // LMSR state
    pub b_parameter: u64,
    pub shares_yes: u64,
    pub shares_no: u64,
    pub current_liquidity: u64,

    // Resolution
    pub resolver: Pubkey,
    pub proposed_outcome: Option<bool>,
    pub final_outcome: Option<bool>,
    pub ipfs_evidence_hash: [u8; 46],

    // Aggregated vote counts (not individual votes!)
    pub proposal_likes: u32,
    pub proposal_dislikes: u32,
    pub dispute_agree: u32,
    pub dispute_disagree: u32,

    // Timestamps
    pub created_at: i64,
    pub activated_at: i64,
    pub finalized_at: i64,

    // ... (see 03_SOLANA_PROGRAM_DESIGN.md for complete structure)
}
```

**Size**: ~400 bytes per market (rent: ~0.003 SOL)

### What Does NOT Live On-Chain

❌ Individual vote records (tracked via VoteRecord PDAs, not in market state)
❌ Market metadata (title, description, category)
❌ User profiles (wallet address only on-chain)
❌ Trading history (derived from events)
❌ Analytics (computed off-chain)
❌ Discussion comments (Supabase + IPFS)

---

## Off-Chain Components

### Supabase (PostgreSQL) Schema

**Purpose**: Fast queries, rich metadata, discussions, analytics

```sql
-- Markets metadata (off-chain only)
CREATE TABLE markets (
  id TEXT PRIMARY KEY,                    -- UUID from on-chain
  on_chain_address TEXT UNIQUE NOT NULL,  -- Solana PDA
  question TEXT NOT NULL,
  description TEXT,
  category TEXT,
  creator_wallet TEXT NOT NULL,
  state TEXT NOT NULL,

  -- Cached on-chain data (for fast queries)
  b_parameter BIGINT,
  shares_yes BIGINT,
  shares_no BIGINT,
  current_price NUMERIC(18, 9),
  total_volume BIGINT,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Individual votes (aggregated → on-chain)
CREATE TABLE proposal_votes (
  market_id TEXT REFERENCES markets(id),
  user_wallet TEXT NOT NULL,
  vote BOOLEAN NOT NULL,                  -- true = like, false = dislike
  voted_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (market_id, user_wallet)
);

CREATE TABLE dispute_votes (
  market_id TEXT REFERENCES markets(id),
  user_wallet TEXT NOT NULL,
  vote BOOLEAN NOT NULL,                  -- true = agree, false = disagree
  voted_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (market_id, user_wallet)
);

-- Discussions (Option B - minimal)
CREATE TABLE discussions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id TEXT REFERENCES markets(id),
  user_wallet TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP,                   -- Soft delete
  CONSTRAINT content_length CHECK (char_length(content) <= 1000)
);

-- IPFS anchors (daily snapshots)
CREATE TABLE ipfs_anchors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id TEXT REFERENCES markets(id),
  ipfs_hash TEXT NOT NULL,                -- CIDv1 (bafy...)
  discussions_count INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Users (wallet-only for v1)
CREATE TABLE users (
  wallet TEXT PRIMARY KEY,
  created_at TIMESTAMP DEFAULT NOW(),
  last_seen_at TIMESTAMP DEFAULT NOW(),

  -- Reserved for v2
  twitter_handle TEXT,
  reputation_score INTEGER,
  avatar_url TEXT
);

-- Trading history (indexed from events)
CREATE TABLE trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id TEXT REFERENCES markets(id),
  user_wallet TEXT NOT NULL,
  trade_type TEXT NOT NULL,               -- 'buy' | 'sell'
  outcome BOOLEAN NOT NULL,               -- true = YES, false = NO
  shares BIGINT NOT NULL,
  cost BIGINT NOT NULL,
  price_after NUMERIC(18, 9),
  tx_signature TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Complete schema**: See `08_DATABASE_SCHEMA.md`

---

## Vote Aggregation Workflow

### ProposalManager Pattern

**Problem**: Storing 1000s of individual votes on-chain is expensive and slow

**Solution**: Store votes off-chain, aggregate, post final counts on-chain

### Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 1: INDIVIDUAL VOTES (On-Chain)                           │
└─────────────────────────────────────────────────────────────────┘

User A                      User B                      User C
  │                           │                           │
  │ submit_proposal_vote()    │                           │
  ├──────────────────────────►│                           │
  │                           │ submit_proposal_vote()    │
  │                           ├──────────────────────────►│
  │                           │                           │
  ▼                           ▼                           ▼
┌────────────────┐  ┌────────────────┐  ┌────────────────┐
│  VoteRecord    │  │  VoteRecord    │  │  VoteRecord    │
│  (On-Chain PDA)│  │  (On-Chain PDA)│  │  (On-Chain PDA)│
│  vote: true    │  │  vote: true    │  │  vote: false   │
└────────────────┘  └────────────────┘  └────────────────┘
        │                   │                   │
        │                   │                   │
        └───────────────────┴───────────────────┘
                            │
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 2: OFF-CHAIN AGGREGATION (Backend)                       │
└─────────────────────────────────────────────────────────────────┘
                            │
                    Event Indexer
                (listens to ProposalVoteSubmitted events)
                            │
                            ↓
                   ┌──────────────────┐
                   │    Supabase      │
                   │  proposal_votes  │
                   ├──────────────────┤
                   │ A → true         │
                   │ B → true         │
                   │ C → false        │
                   └──────────────────┘
                            │
                    Count: likes = 2
                           dislikes = 1
                            │
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 3: ON-CHAIN FINALIZATION (Backend Authority)             │
└─────────────────────────────────────────────────────────────────┘
                            │
                Backend calls approve_market(2, 1)
                            │
                            ↓
                   ┌──────────────────┐
                   │  MarketAccount   │
                   │   (On-Chain)     │
                   ├──────────────────┤
                   │ proposal_likes: 2│
                   │ proposal_dislikes│
                   │ state: APPROVED  │
                   └──────────────────┘
```

### Implementation

**Frontend**:
```typescript
// User submits vote
async function submitProposalVote(marketId: string, vote: boolean) {
  // 1. Call on-chain instruction
  const tx = await program.methods
    .submitProposalVote(vote)
    .accounts({
      market: marketPda,
      voteRecord: voteRecordPda,
      user: wallet.publicKey,
    })
    .rpc();

  // 2. Frontend optimistic update (optional)
  updateLocalVoteCount(marketId, vote);

  return tx;
}
```

**Backend Aggregator**:
```typescript
// Listen to events and aggregate
async function aggregateProposalVotes(marketId: string) {
  // 1. Query all VoteRecords from chain (or use indexed events)
  const votes = await db.proposalVotes.findMany({
    where: { marketId },
  });

  const likes = votes.filter((v) => v.vote === true).length;
  const dislikes = votes.filter((v) => v.vote === false).length;

  // 2. Check if threshold met (70%)
  const total = likes + dislikes;
  const approvalRate = likes / total;

  if (approvalRate >= 0.7 && total >= MIN_VOTES) {
    // 3. Call on-chain to approve market
    await program.methods
      .approveMarket(likes, dislikes)
      .accounts({
        market: marketPda,
        backend: backendKeypair.publicKey,
        globalConfig: configPda,
      })
      .signers([backendKeypair])
      .rpc();

    // 4. Update Supabase
    await db.markets.update({
      where: { id: marketId },
      data: { state: "APPROVED" },
    });
  }
}
```

**Security**:
- Backend authority keypair secured in AWS Secrets Manager / HashiCorp Vault
- Rate limiting on vote submission (prevent spam)
- VoteRecord PDAs prevent double-voting (one per user+market+type)

---

## Discussion System (Option B)

### Design Goals

1. **Minimal v1 Scope**: Flat comments, no threading
2. **IPFS Preservation**: Daily snapshots for decentralization
3. **Moderation Ready**: Soft deletes for future moderation
4. **Fast Queries**: Supabase for real-time access

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER POSTS COMMENT                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ↓
                   ┌────────────────────┐
                   │    API Gateway     │
                   │  POST /discussions │
                   └────────────────────┘
                              │
                              ↓
                   ┌────────────────────┐
                   │     Supabase       │
                   │   discussions      │
                   │   (Real-time DB)   │
                   └────────────────────┘
                              │
                              │ (Daily Cron Job)
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      IPFS SNAPSHOT SERVICE                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ↓
        1. Fetch all discussions for market (past 24h)
        2. Generate JSON file
        3. Upload to IPFS
        4. Store CID in ipfs_anchors table
                              │
                              ↓
                   ┌────────────────────┐
                   │       IPFS         │
                   │  (Permanent Store) │
                   │  CID: bafy...xyz   │
                   └────────────────────┘
```

### Discussion API

**POST /api/discussions**
```typescript
interface CreateDiscussionRequest {
  marketId: string;
  content: string; // Max 1000 chars
  signature: string; // Wallet signature for auth
}

interface CreateDiscussionResponse {
  id: string;
  marketId: string;
  userWallet: string;
  content: string;
  createdAt: string;
}
```

**GET /api/discussions/:marketId**
```typescript
interface GetDiscussionsResponse {
  discussions: Array<{
    id: string;
    userWallet: string;
    content: string;
    createdAt: string;
  }>;
  ipfsSnapshots: Array<{
    ipfsHash: string;
    discussionsCount: number;
    createdAt: string;
  }>;
}
```

### IPFS Snapshot Format

**Daily Snapshot Structure**:
```json
{
  "market_id": "a1b2c3...",
  "snapshot_date": "2025-11-05T00:00:00Z",
  "discussions_count": 127,
  "discussions": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "user_wallet": "7Xb3...",
      "content": "I think YES will win because...",
      "created_at": "2025-11-04T14:23:10Z"
    },
    // ... more discussions
  ],
  "ipfs_cid": "bafybeihdwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenxquvyku"
}
```

**Upload Service** (Node.js):
```typescript
import { create } from "ipfs-http-client";
import cron from "node-cron";

const ipfs = create({ url: "https://ipfs.infura.io:5001" });

// Run daily at midnight
cron.schedule("0 0 * * *", async () => {
  const markets = await db.markets.findMany({
    where: { state: { in: ["ACTIVE", "RESOLVING", "DISPUTED"] } },
  });

  for (const market of markets) {
    const discussions = await db.discussions.findMany({
      where: {
        marketId: market.id,
        createdAt: { gte: new Date(Date.now() - 86400000) }, // Past 24h
        deletedAt: null,
      },
      orderBy: { createdAt: "asc" },
    });

    const snapshot = {
      market_id: market.id,
      snapshot_date: new Date().toISOString(),
      discussions_count: discussions.length,
      discussions: discussions.map((d) => ({
        id: d.id,
        user_wallet: d.userWallet,
        content: d.content,
        created_at: d.createdAt.toISOString(),
      })),
    };

    // Upload to IPFS
    const { cid } = await ipfs.add(JSON.stringify(snapshot));

    // Store CID in database
    await db.ipfsAnchors.create({
      data: {
        marketId: market.id,
        ipfsHash: cid.toString(),
        discussionsCount: discussions.length,
      },
    });

    console.log(`Snapshot for ${market.id}: ${cid}`);
  }
});
```

### Why Daily Snapshots?

1. **Cost**: IPFS uploads cost gas (pinning services charge per pin)
2. **Performance**: Avoid IPFS read latency for real-time comments
3. **Flexibility**: Can improve discussion format in v2 without breaking IPFS records
4. **Decentralization**: Still preserves history permanently

---

## Backend Services

### Service Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Backend Services                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐ │
│  │  Vote Aggregator │  │  Market Monitor  │  │ IPFS Service │ │
│  │   (Node.js)      │  │   (Node.js)      │  │  (Node.js)   │ │
│  └──────────────────┘  └──────────────────┘  └──────────────┘ │
│           │                     │                     │         │
│           └─────────────────────┴─────────────────────┘         │
│                               │                                 │
│                               ↓                                 │
│                   ┌────────────────────┐                        │
│                   │   Shared Services  │                        │
│                   ├────────────────────┤                        │
│                   │ • Event Indexer    │                        │
│                   │ • Database Pool    │                        │
│                   │ • RPC Connection   │                        │
│                   │ • Redis Cache      │                        │
│                   └────────────────────┘                        │
└─────────────────────────────────────────────────────────────────┘
```

### 1. Vote Aggregator Service

**Purpose**: Count votes and trigger on-chain approval/finalization

```typescript
// services/vote-aggregator.ts
import { Program, AnchorProvider } from "@coral-xyz/anchor";
import { Connection, Keypair } from "@solana/web3.js";

class VoteAggregatorService {
  constructor(
    private program: Program,
    private backendKeypair: Keypair,
    private db: PrismaClient
  ) {}

  // Poll every 5 minutes
  async start() {
    setInterval(() => this.aggregateProposalVotes(), 300000);
    setInterval(() => this.aggregateDisputeVotes(), 300000);
  }

  async aggregateProposalVotes() {
    // Find markets in PROPOSED state with enough votes
    const markets = await this.db.markets.findMany({
      where: {
        state: "PROPOSED",
        proposalVotesCount: { gte: MIN_PROPOSAL_VOTES },
      },
    });

    for (const market of markets) {
      const votes = await this.db.proposalVotes.findMany({
        where: { marketId: market.id },
      });

      const likes = votes.filter((v) => v.vote === true).length;
      const dislikes = votes.filter((v) => v.vote === false).length;
      const total = likes + dislikes;
      const approvalRate = likes / total;

      if (approvalRate >= 0.7) {
        try {
          // Call on-chain instruction
          await this.program.methods
            .approveMarket(likes, dislikes)
            .accounts({
              market: market.onChainAddress,
              backend: this.backendKeypair.publicKey,
            })
            .signers([this.backendKeypair])
            .rpc();

          // Update database
          await this.db.markets.update({
            where: { id: market.id },
            data: { state: "APPROVED" },
          });

          console.log(`Market ${market.id} approved: ${approvalRate * 100}%`);
        } catch (error) {
          console.error(`Failed to approve market ${market.id}:`, error);
        }
      }
    }
  }

  async aggregateDisputeVotes() {
    // Similar logic for dispute votes
    // ...
  }
}
```

### 2. Market Monitor Service

**Purpose**: Detect time-based state transitions and auto-finalize

```typescript
// services/market-monitor.ts
class MarketMonitorService {
  async start() {
    setInterval(() => this.checkExpiredDisputePeriods(), 60000); // Every minute
  }

  async checkExpiredDisputePeriods() {
    const now = Date.now() / 1000; // Unix timestamp

    // Find markets in RESOLVING state past dispute deadline
    const markets = await this.db.markets.findMany({
      where: {
        state: "RESOLVING",
        resolutionProposedAt: { lte: new Date((now - DISPUTE_PERIOD) * 1000) },
      },
    });

    for (const market of markets) {
      try {
        // Check if dispute was initiated
        const hasDispute = await this.db.disputeVotes.count({
          where: { marketId: market.id },
        });

        if (hasDispute === 0) {
          // Auto-finalize (no dispute)
          await this.program.methods
            .finalizeMarket(null, null)
            .accounts({
              market: market.onChainAddress,
              backend: this.backendKeypair.publicKey,
            })
            .signers([this.backendKeypair])
            .rpc();

          await this.db.markets.update({
            where: { id: market.id },
            data: { state: "FINALIZED" },
          });

          console.log(`Auto-finalized market ${market.id} (no dispute)`);
        }
      } catch (error) {
        console.error(`Failed to finalize market ${market.id}:`, error);
      }
    }
  }
}
```

### 3. IPFS Snapshot Service

**Purpose**: Daily discussion snapshots to IPFS

(See [Discussion System](#discussion-system-option-b) for implementation)

---

## Event Indexing

### Solana Event Listening

```typescript
// services/event-indexer.ts
import { Program } from "@coral-xyz/anchor";

class EventIndexerService {
  constructor(private program: Program, private db: PrismaClient) {}

  async start() {
    // Listen to all program events
    this.program.addEventListener("MarketProposed", this.handleMarketProposed);
    this.program.addEventListener("MarketApproved", this.handleMarketApproved);
    this.program.addEventListener("SharesBought", this.handleSharesBought);
    this.program.addEventListener("SharesSold", this.handleSharesSold);
    this.program.addEventListener("MarketResolved", this.handleMarketResolved);
    this.program.addEventListener("MarketFinalized", this.handleMarketFinalized);
    // ... more events
  }

  handleMarketProposed = async (event: MarketProposedEvent) => {
    await this.db.markets.create({
      data: {
        id: Buffer.from(event.marketId).toString("hex"),
        onChainAddress: event.market.toString(),
        creator: event.creator.toString(),
        state: "PROPOSED",
        bParameter: event.bParameter.toString(),
        initialLiquidity: event.initialLiquidity.toString(),
        createdAt: new Date(event.timestamp * 1000),
      },
    });
  };

  handleSharesBought = async (event: SharesBoughtEvent) => {
    // 1. Update market cached state
    await this.db.markets.update({
      where: { id: Buffer.from(event.marketId).toString("hex") },
      data: {
        sharesYes: event.sharesYes.toString(),
        sharesNo: event.sharesNo.toString(),
        currentPrice: event.newPrice.toString(),
      },
    });

    // 2. Record trade history
    await this.db.trades.create({
      data: {
        marketId: Buffer.from(event.marketId).toString("hex"),
        userWallet: event.user.toString(),
        tradeType: "buy",
        outcome: event.outcome,
        shares: event.shares.toString(),
        cost: event.cost.toString(),
        priceAfter: event.newPrice.toString(),
        txSignature: event.signature,
        createdAt: new Date(event.timestamp * 1000),
      },
    });
  };

  // ... more event handlers
}
```

---

## API Gateway Design

### REST API Endpoints

```typescript
// API Routes (Next.js App Router)

// Markets
GET  /api/markets                 // List all markets
GET  /api/markets/:id             // Get market details
POST /api/markets/:id/vote        // Submit proposal vote

// Trading
POST /api/markets/:id/buy         // Buy shares
POST /api/markets/:id/sell        // Sell shares
GET  /api/markets/:id/price       // Get current price

// Discussions (Option B)
GET  /api/discussions/:marketId   // Get discussions
POST /api/discussions             // Post comment
GET  /api/discussions/ipfs/:cid   // Fetch IPFS snapshot

// User
GET  /api/users/:wallet           // Get user profile
GET  /api/users/:wallet/positions // Get user's positions
GET  /api/users/:wallet/trades    // Get user's trade history

// Admin (backend only)
POST /api/admin/approve/:marketId     // Approve market
POST /api/admin/finalize/:marketId    // Finalize market
POST /api/admin/cancel/:marketId      // Cancel market
```

### Example API Handler

```typescript
// app/api/markets/[id]/buy/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifyWalletSignature } from "@/lib/auth";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 1. Verify wallet signature
    const { wallet, signature } = await request.json();
    const isValid = await verifyWalletSignature(wallet, signature);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    // 2. Fetch market from database
    const market = await db.markets.findUnique({
      where: { id: params.id },
    });

    if (!market || market.state !== "ACTIVE") {
      return NextResponse.json(
        { error: "Market not active" },
        { status: 400 }
      );
    }

    // 3. Call Solana program
    const tx = await program.methods
      .buyShares(outcome, maxCost)
      .accounts({
        market: market.onChainAddress,
        user: wallet,
        // ... other accounts
      })
      .rpc();

    // 4. Return transaction signature
    return NextResponse.json({ signature: tx });
  } catch (error) {
    console.error("Buy shares error:", error);
    return NextResponse.json(
      { error: "Transaction failed" },
      { status: 500 }
    );
  }
}
```

---

## Data Synchronization

### Consistency Strategy

**Challenge**: Keep Supabase cache in sync with on-chain state

**Solution**: Event-driven updates with periodic reconciliation

### Sync Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    REAL-TIME SYNC (Events)                      │
└─────────────────────────────────────────────────────────────────┘

On-Chain Event → Event Indexer → Update Supabase

Example: SharesBought event
  ├─ Update markets.shares_yes
  ├─ Update markets.current_price
  ├─ Insert trades record
  └─ Invalidate Redis cache

┌─────────────────────────────────────────────────────────────────┐
│               PERIODIC RECONCILIATION (Hourly)                  │
└─────────────────────────────────────────────────────────────────┘

Every hour:
  1. Fetch all markets from Supabase
  2. For each market:
     a. Fetch on-chain state
     b. Compare with cached state
     c. If mismatch → update Supabase
     d. Log discrepancy for investigation
```

### Reconciliation Service

```typescript
// services/reconciliation.ts
class ReconciliationService {
  async start() {
    setInterval(() => this.reconcileMarkets(), 3600000); // Every hour
  }

  async reconcileMarkets() {
    const markets = await this.db.markets.findMany();

    for (const market of markets) {
      try {
        // Fetch on-chain state
        const onChainMarket = await this.program.account.marketAccount.fetch(
          market.onChainAddress
        );

        // Compare cached vs on-chain
        const discrepancies = this.findDiscrepancies(market, onChainMarket);

        if (discrepancies.length > 0) {
          console.warn(`Discrepancies found in market ${market.id}:`, discrepancies);

          // Update Supabase with on-chain truth
          await this.db.markets.update({
            where: { id: market.id },
            data: {
              state: onChainMarket.state,
              sharesYes: onChainMarket.sharesYes.toString(),
              sharesNo: onChainMarket.sharesNo.toString(),
              currentLiquidity: onChainMarket.currentLiquidity.toString(),
            },
          });
        }
      } catch (error) {
        console.error(`Reconciliation failed for ${market.id}:`, error);
      }
    }
  }

  findDiscrepancies(cached: Market, onChain: MarketAccount): string[] {
    const issues: string[] = [];

    if (cached.state !== onChain.state) {
      issues.push(`State mismatch: ${cached.state} != ${onChain.state}`);
    }

    // ... more checks

    return issues;
  }
}
```

---

## Security Considerations

### Backend Authority Security

**Problem**: Backend keypair can approve/finalize markets

**Mitigation**:
1. Store keypair in AWS Secrets Manager / HashiCorp Vault
2. Rate limiting on admin endpoints
3. Audit logging for all backend actions
4. Multi-sig option for production (v2)

### Rate Limiting

```typescript
// middleware/rate-limit.ts
import rateLimit from "express-rate-limit";

export const voteLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 votes per minute per IP
  message: "Too many votes, please try again later",
});

export const tradeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30, // 30 trades per minute per IP
});
```

### Wallet Signature Verification

```typescript
// lib/auth.ts
import { PublicKey } from "@solana/web3.js";
import nacl from "tweetnacl";

export async function verifyWalletSignature(
  wallet: string,
  signature: string,
  message: string
): Promise<boolean> {
  try {
    const publicKey = new PublicKey(wallet);
    const messageBytes = new TextEncoder().encode(message);
    const signatureBytes = Buffer.from(signature, "base64");

    return nacl.sign.detached.verify(
      messageBytes,
      signatureBytes,
      publicKey.toBytes()
    );
  } catch {
    return false;
  }
}
```

---

## Production Checklist

### Backend Services

- [ ] Vote aggregator running with proper error handling
- [ ] Market monitor running with auto-finalization
- [ ] IPFS snapshot service with daily cron
- [ ] Event indexer with retry logic for failed events
- [ ] Reconciliation service with alerting for discrepancies

### Database

- [ ] All indexes created for fast queries
- [ ] RLS policies enabled on Supabase
- [ ] Backup strategy configured (daily snapshots)
- [ ] Connection pooling optimized (max 20 connections)

### API Gateway

- [ ] Rate limiting enabled on all endpoints
- [ ] CORS configured correctly
- [ ] Error handling and logging comprehensive
- [ ] Health check endpoint (/api/health)

### Monitoring

- [ ] Backend service uptime monitoring
- [ ] Database query performance monitoring
- [ ] Alert on failed transactions (vote aggregation, finalization)
- [ ] IPFS upload success rate tracking
- [ ] Event indexer lag monitoring (should be <10 seconds)

---

**Document Status**: ✅ Implementation-Ready (Option B)
**Next Document**: `08_DATABASE_SCHEMA.md`
**Integration**: `03_SOLANA_PROGRAM_DESIGN.md`, `CLAUDE.md` (Option B)
