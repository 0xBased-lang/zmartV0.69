# INTEGRATION_MAP.md - System Architecture & Integration Reference

**Category:** Architecture Reference
**Tags:** [architecture, integration, data-flow, components, system-design]
**Last Updated:** 2025-11-09 00:30 PST

---

## Quick Links

- ⬆️ [Back to CLAUDE.md](../../../CLAUDE.md)
- 📦 [Programs Reference](../components/PROGRAMS_REFERENCE.md)
- 🔧 [Backend Reference](../components/BACKEND_REFERENCE.md)
- 🏗️ [Infrastructure Reference](../components/INFRASTRUCTURE_REFERENCE.md)
- 🔄 [Data Flow Reference](./DATA_FLOW.md) ⏳
- 📚 [API Reference](../api/API_REFERENCE.md) ⏳

---

## 🎯 Purpose

**Complete visual map of ZMART V0.69 system architecture** showing how all components integrate, communicate, and depend on each other.

This document answers:
- "How do all the pieces fit together?"
- "What talks to what?"
- "Where does data flow?"
- "What are the dependencies?"

---

## 📊 System Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         ZMART V0.69 SYSTEM                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────┐      ┌──────────────┐      ┌──────────────┐      │
│  │   Frontend   │      │   Backend    │      │   Blockchain │      │
│  │  (Phase 4)   │◄────►│   Services   │◄────►│   Programs   │      │
│  │              │      │   (Node.js)  │      │   (Solana)   │      │
│  └──────────────┘      └──────────────┘      └──────────────┘      │
│         │                     │                       │              │
│         │                     │                       │              │
│         └────────────┬────────┴───────────────┬──────┘              │
│                      │                        │                     │
│                 ┌────▼────┐              ┌────▼────┐                │
│                 │ Supabase│              │ Helius  │                │
│                 │PostgreSQL│             │   RPC   │                │
│                 └─────────┘              └─────────┘                │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

### Component Layers

```
Layer 1: Blockchain (On-Chain)
├── zmart-core (18 instructions, market logic)
└── zmart-proposal (voting system) [planned]

Layer 2: RPC & Event Streaming
├── Helius RPC (transaction submission)
├── Helius Webhooks (event streaming)
└── Solana Devnet (blockchain network)

Layer 3: Backend Services
├── Event Indexer (Helius → Supabase)
├── Vote Aggregator (off-chain → on-chain)
├── Market Monitor (auto state transitions)
├── API Gateway (REST endpoints)
├── WebSocket Server (real-time updates)
└── IPFS Service (discussion snapshots) [disabled MVP]

Layer 4: Data Storage
├── Supabase PostgreSQL (primary database)
├── Redis (caching) [planned Phase 3]
└── IPFS/Pinata (discussion archive) [planned Phase 4+]

Layer 5: Frontend (Phase 4)
└── Next.js App (user interface)
```

---

## 🔗 Component Integration Diagram

### Complete System Integration

```
┌────────────────────────────────────────────────────────────────────────────┐
│                                  Users                                      │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │                         Frontend (Phase 4)                           │  │
│  │                          Next.js + React                             │  │
│  │                         Port: 3000 (dev)                             │  │
│  └──────────┬──────────────────────────────────────┬───────────────────┘  │
│             │                                       │                       │
│             │ HTTP/REST                             │ WebSocket             │
│             ▼                                       ▼                       │
│  ┌─────────────────────┐                ┌─────────────────────┐            │
│  │   API Gateway       │                │  WebSocket Server   │            │
│  │   Express + Routes  │                │   Socket.IO         │            │
│  │   Port: 4000        │                │   Port: 4001        │            │
│  └──────────┬──────────┘                └──────────┬──────────┘            │
│             │                                       │                       │
│             │ Read/Write                            │ Subscribe/Emit        │
│             ▼                                       ▼                       │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │                        Supabase PostgreSQL                            │ │
│  │                     Database + RLS + Auth                             │ │
│  │                    Port: 5432 (cloud-hosted)                          │ │
│  └──────────┬───────────────────────────────┬──────────────────────────┘ │
│             │                                │                             │
│             │ Insert Events                  │ Read State                  │
│             ▲                                │                             │
│  ┌──────────┴──────────┐          ┌─────────▼─────────────┐               │
│  │   Event Indexer     │          │   Market Monitor       │               │
│  │   Helius Webhooks   │          │   Cron: 5 min          │               │
│  │   Port: 4002        │          │   State Transitions    │               │
│  └──────────▲──────────┘          └─────────┬──────────────┘               │
│             │                                │                             │
│             │ POST /webhook                  │ Call Instructions           │
│  ┌──────────┴──────────┐          ┌─────────▼──────────────┐              │
│  │   Helius Webhook    │          │   Vote Aggregator      │              │
│  │   Event Stream      │          │   Cron: 5 min          │              │
│  │   (cloud-hosted)    │          │   Submit Votes         │              │
│  └──────────▲──────────┘          └─────────┬──────────────┘              │
│             │                                │                             │
│             │ Events                         │ Transactions                │
│             │                                ▼                             │
│  ┌──────────┴────────────────────────────────────────────────────────┐   │
│  │                      Solana Blockchain (Devnet)                    │   │
│  │                                                                     │   │
│  │   ┌──────────────────┐            ┌──────────────────┐            │   │
│  │   │  zmart-core      │            │ zmart-proposal   │            │   │
│  │   │  Market Logic    │            │ Voting System    │            │   │
│  │   │  18 Instructions │            │ [Planned]        │            │   │
│  │   └──────────────────┘            └──────────────────┘            │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘  │
│             ▲                                                               │
│             │ RPC Calls (Submit Tx, Query State)                           │
│  ┌──────────┴──────────┐                                                   │
│  │   Helius RPC        │                                                   │
│  │   Enhanced Solana   │                                                   │
│  │   (cloud-hosted)    │                                                   │
│  └─────────────────────┘                                                   │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Data Flow Paths

### 1. User Creates Market (Write Path)

```
User (Frontend)
   │
   │ 1. Sign Transaction
   │
   ▼
Wallet (Phantom/Solflare)
   │
   │ 2. Submit Transaction via RPC
   │
   ▼
Helius RPC
   │
   │ 3. Forward to Blockchain
   │
   ▼
Solana Blockchain
   │
   │ 4. Execute: create_market()
   │    - Validate parameters
   │    - Create MarketAccount
   │    - Deduct SOL for rent
   │
   ▼
MarketAccount Created
   │
   │ 5. Emit Transaction Log
   │
   ▼
Helius Webhook Listener
   │
   │ 6. POST /api/webhooks/solana
   │
   ▼
Event Indexer Service
   │
   │ 7. Parse Event → Insert Row
   │
   ▼
Supabase: markets table
   │
   │ 8. Trigger Change Event
   │
   ▼
WebSocket Server
   │
   │ 9. Emit: market:created
   │
   ▼
Frontend (Real-Time Update)
```

**Time:** ~2-5 seconds end-to-end

---

### 2. User Buys Shares (Trading Path)

```
User (Frontend)
   │
   │ 1. Enter amount, click "Buy YES"
   │
   ▼
Frontend: Calculate Cost
   │
   │ 2. Call LMSR formula (client-side preview)
   │    Cost = C(q + Δq) - C(q)
   │
   ▼
Frontend: Create Transaction
   │
   │ 3. Build buy_shares instruction
   │    Parameters: market_id, outcome, amount, max_cost
   │
   ▼
Wallet: Sign Transaction
   │
   │ 4. User approves in wallet popup
   │
   ▼
Helius RPC → Solana
   │
   │ 5. Execute: buy_shares()
   │    - Calculate exact cost (LMSR)
   │    - Check slippage (cost ≤ max_cost)
   │    - Transfer SOL from user
   │    - Update market liquidity
   │    - Create/update UserPosition
   │    - Distribute fees (10%)
   │
   ▼
Transaction Complete
   │
   │ 6. Helius webhook triggers
   │
   ▼
Event Indexer
   │
   │ 7. Insert into trades table
   │    Update markets.liquidity
   │    Update positions table
   │
   ▼
Supabase Updated
   │
   │ 8. WebSocket broadcasts:
   │    - trade:executed
   │    - market:updated
   │    - position:updated
   │
   ▼
Frontend Updates
   │
   ├─ Market page: New price, liquidity
   ├─ User portfolio: New position
   └─ Activity feed: Trade appears
```

**Time:** ~3-7 seconds end-to-end

---

### 3. Vote Aggregation (Off-Chain → On-Chain)

```
User (Frontend)
   │
   │ 1. Click "Like" or "Dislike" on proposal
   │
   ▼
API Gateway
   │
   │ 2. POST /api/votes/proposal
   │    Body: { proposal_id, vote_type }
   │    Auth: Wallet signature
   │
   ▼
Supabase: votes table
   │
   │ 3. Insert vote record
   │    Check: 1 vote per user per proposal
   │
   ▼
Vote Stored (Off-Chain)

   ... Time passes (up to 5 minutes) ...

Vote Aggregator Service (Cron)
   │
   │ 4. Every 5 min: Fetch pending votes
   │    Query: votes WHERE aggregated = false
   │
   ▼
Aggregate Votes
   │
   │ 5. Group by proposal_id
   │    Count: likes, dislikes
   │    Calculate: approval_rate = likes / (likes + dislikes)
   │
   ▼
Submit to Blockchain
   │
   │ 6. Call: aggregate_proposal_votes()
   │    Parameters: proposal_id, total_votes, approval_rate
   │
   ▼
zmart-core Program
   │
   │ 7. Update ProposalVote account
   │    - Check threshold (70%)
   │    - Update market state if approved
   │
   ▼
Blockchain State Updated
   │
   │ 8. Helius webhook triggers
   │
   ▼
Event Indexer
   │
   │ 9. Mark votes as aggregated
   │    Update proposal status
   │
   ▼
Supabase: votes.aggregated = true
   │
   │ 10. WebSocket: proposal:approved
   │
   ▼
Frontend: Market state changes
```

**Time:** 5-10 minutes (batched every 5 min)

---

### 4. Market Resolution (Auto State Transition)

```
Market reaches end_time
   │
   │ ... Time passes ...
   │
Market Monitor Service (Cron)
   │
   │ 1. Every 5 min: Check markets
   │    Query: state = ACTIVE && now() > end_time
   │
   ▼
Found Expired Market
   │
   │ 2. Call: transition_to_resolving()
   │
   ▼
zmart-core Program
   │
   │ 3. Validate: now() >= end_time
   │    Update: state = RESOLVING
   │    Set: resolution_start = now()
   │
   ▼
State: ACTIVE → RESOLVING
   │
   │ 4. Helius webhook triggers
   │
   ▼
Event Indexer
   │
   │ 5. Update markets.state = 'RESOLVING'
   │
   ▼
Supabase Updated
   │
   │ 6. WebSocket: market:resolving
   │
   ▼
Frontend: Show resolution UI

   ... 48 hours pass ...

Market Monitor (Cron)
   │
   │ 7. Check: resolution_start + 48h < now()
   │    AND final_result is set
   │
   ▼
Call: finalize_market()
   │
   │ 8. Validate: dispute window passed
   │    Update: state = FINALIZED
   │
   ▼
State: RESOLVING → FINALIZED
   │
   │ 9. Event indexed to Supabase
   │
   ▼
Users can claim winnings
```

**Time:** 48+ hours (dispute window)

---

## 🏗️ Service Communication Matrix

### Who Talks to Who

```
┌────────────────────┬─────────┬──────────┬────────┬────────┬──────────┬───────────┐
│ Service            │ Supabase│ Blockchain│ Helius │ Redis  │ Frontend │ Other Svcs│
├────────────────────┼─────────┼──────────┼────────┼────────┼──────────┼───────────┤
│ API Gateway        │ R/W     │ -        │ -      │ R/W    │ HTTP     │ -         │
│ WebSocket Server   │ R       │ -        │ -      │ R/W    │ WS       │ -         │
│ Event Indexer      │ W       │ -        │ Receive│ -      │ -        │ -         │
│ Vote Aggregator    │ R/W     │ W (tx)   │ RPC    │ R/W    │ -        │ -         │
│ Market Monitor     │ R       │ W (tx)   │ RPC    │ -      │ -        │ -         │
│ IPFS Service       │ R       │ -        │ -      │ -      │ -        │ Pinata API│
└────────────────────┴─────────┴──────────┴────────┴────────┴──────────┴───────────┘

Legend:
R = Read operations
W = Write operations
R/W = Both read and write
WS = WebSocket connection
tx = Submit transactions
RPC = Call Helius RPC
Receive = Receive webhooks
```

---

## 🔌 Integration Points

### 1. Frontend ↔ Backend (Phase 4)

**Protocol:** HTTP REST + WebSocket

**REST API Endpoints:**
```
GET  /api/markets                 # List markets
GET  /api/markets/:id             # Get market details
POST /api/votes/proposal          # Submit proposal vote
POST /api/votes/dispute           # Submit dispute vote
GET  /api/trades/:marketId        # Get trade history
GET  /api/positions/:walletId     # Get user positions
POST /api/discussions             # Create discussion post
GET  /api/discussions/:marketId   # Get discussion thread
```

**WebSocket Events:**
```
Client → Server:
  - subscribe:market:{id}         # Subscribe to market updates
  - subscribe:trades:{id}         # Subscribe to trade feed
  - unsubscribe:market:{id}       # Unsubscribe

Server → Client:
  - market:created                # New market created
  - market:updated                # Market data changed
  - market:resolving              # Market entering resolution
  - market:finalized              # Market finalized
  - trade:executed                # New trade
  - position:updated              # User position changed
  - discussion:new                # New discussion post
```

**Authentication:**
- Method: Wallet signature (SIWE - Sign-In with Ethereum)
- Token: JWT with 1-hour expiry
- Header: `Authorization: Bearer {token}`

---

### 2. Backend ↔ Blockchain

**Protocol:** Solana RPC via Helius

**Read Operations (Query State):**
```typescript
// Get market account
const marketAccount = await program.account.marketAccount.fetch(marketPDA);

// Get user position
const position = await program.account.userPosition.fetch(positionPDA);

// Get global config
const config = await program.account.globalConfig.fetch(configPDA);
```

**Write Operations (Submit Transactions):**
```typescript
// Vote Aggregator: Submit aggregated votes
await program.methods
  .aggregateProposalVotes(totalVotes, approvalRate)
  .accounts({ market, proposalVote, authority })
  .rpc();

// Market Monitor: Transition state
await program.methods
  .transitionToResolving()
  .accounts({ market, authority })
  .rpc();
```

**RPC Endpoint:**
- Devnet: `https://devnet.helius-rpc.com/?api-key={HELIUS_API_KEY}`
- Mainnet: `https://mainnet.helius-rpc.com/?api-key={HELIUS_API_KEY}` (future)

---

### 3. Blockchain → Backend (Events)

**Protocol:** Helius Webhooks

**Webhook URL:**
```
POST https://your-backend.com/api/webhooks/solana
```

**Webhook Payload:**
```json
{
  "type": "TRANSACTION",
  "signature": "5j7s...",
  "slot": 123456789,
  "timestamp": 1699564800,
  "events": [
    {
      "type": "MarketCreated",
      "data": {
        "marketId": "7h3g...",
        "creator": "5KQw...",
        "question": "Will Bitcoin reach $100k by 2025?",
        "endTime": 1735689600,
        "liquidityParameter": 100000000
      }
    }
  ]
}
```

**Event Types:**
- `MarketCreated`
- `SharesPurchased`
- `SharesSold`
- `MarketResolved`
- `DisputeRaised`
- `MarketFinalized`
- `WinningsClaimed`
- `ProposalVoteAggregated`
- `DisputeVoteAggregated`

**Processing:**
1. Event Indexer receives webhook
2. Validates signature (HMAC)
3. Parses event data
4. Inserts into Supabase tables
5. Triggers WebSocket broadcast

---

### 4. Backend ↔ Supabase

**Protocol:** PostgreSQL + Supabase Client SDK

**Connection:**
```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Service role for backend
);
```

**Operations:**

**API Gateway (Read-Heavy):**
```typescript
// Get markets with pagination
const { data: markets } = await supabase
  .from('markets')
  .select('*')
  .eq('state', 'ACTIVE')
  .order('created_at', { ascending: false })
  .range(0, 19);
```

**Event Indexer (Write-Heavy):**
```typescript
// Insert trade record
const { error } = await supabase
  .from('trades')
  .insert({
    market_id: marketId,
    trader: traderAddress,
    outcome: 'YES',
    shares_amount: 1000000000,
    cost: 500000000,
    transaction_signature: txSig
  });
```

**Vote Aggregator (Read + Write):**
```typescript
// Fetch pending votes
const { data: votes } = await supabase
  .from('votes')
  .select('*')
  .eq('aggregated', false)
  .eq('vote_context', 'proposal');

// Mark as aggregated
await supabase
  .from('votes')
  .update({ aggregated: true, aggregated_at: new Date() })
  .in('id', voteIds);
```

**Row-Level Security (RLS):**
- Frontend uses anon key (RLS enforced)
- Backend uses service role key (bypasses RLS)
- Users can only insert their own votes
- Users can read all public data

---

### 5. Backend ↔ Redis (Planned Phase 3)

**Protocol:** Redis protocol (ioredis client)

**Use Cases:**
- Cache market data (5 min TTL)
- Cache user positions (1 min TTL)
- Rate limiting counters
- WebSocket connection state
- Vote aggregation buffer

**Example Operations:**
```typescript
// Cache market data
await redis.setex(
  `market:${marketId}`,
  300, // 5 minutes
  JSON.stringify(marketData)
);

// Get cached data
const cached = await redis.get(`market:${marketId}`);

// Rate limiting
const count = await redis.incr(`ratelimit:${ip}`);
await redis.expire(`ratelimit:${ip}`, 900); // 15 min window
```

---

### 6. Backend ↔ IPFS/Pinata (Planned Phase 4+)

**Protocol:** Pinata API (HTTP)

**Use Cases:**
- Daily discussion snapshots
- Market creation metadata
- Decentralized data archive

**Example Operations:**
```typescript
// Upload discussion snapshot
const result = await pinata.pinJSONToIPFS({
  marketId: '7h3g...',
  discussions: discussionData,
  timestamp: Date.now()
});

// Returns CID: bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi
```

---

## 📦 Component Dependencies

### Dependency Graph

```
┌─────────────┐
│  Frontend   │ (Phase 4)
│  Next.js    │
└──────┬──────┘
       │ depends on
       ├─ API Gateway (REST)
       ├─ WebSocket Server (real-time)
       └─ Wallet (transaction signing)
           │
           ▼
    ┌──────────────┐
    │ API Gateway  │
    └──────┬───────┘
           │ depends on
           ├─ Supabase (data)
           ├─ Redis (cache) [planned]
           └─ Solana RPC (query state)

    ┌──────────────────┐
    │ WebSocket Server │
    └──────┬───────────┘
           │ depends on
           ├─ Supabase (realtime subscriptions)
           └─ Redis (connection state) [planned]

    ┌────────────────┐
    │ Event Indexer  │
    └──────┬─────────┘
           │ depends on
           ├─ Helius Webhooks (events)
           └─ Supabase (write events)

    ┌─────────────────┐
    │ Vote Aggregator │
    └──────┬──────────┘
           │ depends on
           ├─ Supabase (read votes)
           ├─ Solana RPC (submit tx)
           └─ Redis (batching) [planned]

    ┌────────────────┐
    │ Market Monitor │
    └──────┬─────────┘
           │ depends on
           ├─ Supabase (query markets)
           └─ Solana RPC (state transitions)

    ┌──────────────┐
    │ IPFS Service │ (disabled MVP)
    └──────┬───────┘
           │ depends on
           ├─ Supabase (read discussions)
           └─ Pinata API (upload)

    ┌──────────────┐
    │   Supabase   │
    └──────────────┘
           │ no dependencies (external service)

    ┌──────────────┐
    │    Redis     │ (planned)
    └──────────────┘
           │ no dependencies (external service)

    ┌──────────────┐
    │ Solana Chain │
    └──────┬───────┘
           │ programs
           ├─ zmart-core (deployed)
           └─ zmart-proposal (planned)

    ┌──────────────┐
    │ Helius RPC   │
    └──────────────┘
           │ depends on
           └─ Solana Devnet

    ┌────────────────┐
    │ Helius Webhook │
    └────────────────┘
           │ depends on
           ├─ Solana Devnet (event source)
           └─ Event Indexer (webhook target)
```

---

### Critical Dependencies

**If Supabase is down:**
- ❌ API Gateway cannot serve data
- ❌ Event Indexer cannot write events
- ❌ Vote Aggregator cannot read votes
- ❌ Frontend cannot load markets/trades
- ✅ Blockchain still works (on-chain state independent)

**If Helius RPC is down:**
- ❌ Cannot submit transactions
- ❌ Cannot query blockchain state
- ❌ Cannot receive webhook events
- ✅ Supabase data still readable (stale)
- ✅ Frontend can show cached data

**If Event Indexer is down:**
- ❌ New events not indexed to database
- ✅ Blockchain still processes transactions
- ✅ Historical data still available
- ⚠️ WebSocket updates delayed/missing

**If Vote Aggregator is down:**
- ❌ Votes not submitted to blockchain
- ✅ Users can still vote off-chain
- ⚠️ Market approval delayed
- 🔄 Will catch up when restarted

**If Market Monitor is down:**
- ❌ Auto state transitions don't happen
- ✅ Manual transitions still work
- ⚠️ Markets may stay in ACTIVE longer
- 🔄 Will catch up when restarted

---

## 🔐 Security Boundaries

### Trust Boundaries

```
┌─────────────────────────────────────────────────────────────────┐
│                        Untrusted Zone                            │
│  ┌──────────────┐                                                │
│  │   Frontend   │  • User-controlled                             │
│  │   Browser    │  • Can be modified                             │
│  └──────────────┘  • Never trust client input                   │
└────────────┬────────────────────────────────────────────────────┘
             │ HTTPS + Wallet Signature
             │
┌────────────▼────────────────────────────────────────────────────┐
│                      Semi-Trusted Zone                           │
│  ┌──────────────┐                                                │
│  │   Backend    │  • Validate all inputs                         │
│  │   Services   │  • Rate limiting                               │
│  │              │  • Authentication required                     │
│  └──────────────┘  • RLS on database                            │
└────────────┬────────────────────────────────────────────────────┘
             │ Service Role Key (secured)
             │
┌────────────▼────────────────────────────────────────────────────┐
│                        Trusted Zone                              │
│  ┌──────────────┐       ┌──────────────┐                        │
│  │  Blockchain  │       │   Supabase   │                        │
│  │   Programs   │       │   Database   │                        │
│  │              │       │              │                        │
│  └──────────────┘       └──────────────┘                        │
│  • Immutable logic      • RLS enforced                          │
│  • Cryptographically    • Encrypted at rest                     │
│    verified             • Backup/restore                        │
└─────────────────────────────────────────────────────────────────┘
```

### Security Measures by Layer

**Frontend:**
- Wallet signature required for all mutations
- SIWE (Sign-In with Ethereum) authentication
- HTTPS only (enforced)
- No sensitive keys in client code

**API Gateway:**
- Rate limiting: 100 req/15min per IP
- JWT validation (1-hour tokens)
- Input validation (joi/zod schemas)
- CORS whitelist

**Backend Services:**
- Service role key (not exposed)
- Environment variable protection
- Logging (no PII leakage)
- Error handling (no stack traces in prod)

**Supabase:**
- Row-Level Security (RLS)
- Users can only write own votes
- All reads public (prediction market)
- Service role bypasses RLS (backend only)

**Blockchain:**
- Immutable program code
- Account ownership validation
- Signer checks (has_one constraints)
- Rent exemption enforced

---

## 🎯 Performance Characteristics

### Latency by Operation

```
Operation                          | Latency      | Bottleneck
-----------------------------------+--------------+------------------------
Query market list (cached)         | 50-100ms     | Database query
Query market list (uncached)       | 200-500ms    | Database + formatting
Submit transaction (buy shares)    | 2-5 seconds  | Blockchain confirmation
WebSocket real-time update         | 100-500ms    | Event → Index → Broadcast
Vote aggregation (off→on chain)    | 5-10 min     | Cron interval
Market state transition            | 5-10 min     | Cron interval
Load user portfolio                | 100-300ms    | Multiple DB queries
Search discussions                 | 200-800ms    | Full-text search
```

### Throughput Limits

```
Component              | Max Throughput      | Bottleneck
-----------------------+---------------------+------------------
Solana Devnet          | ~1,000 TPS          | Network limit
Helius RPC             | 100 req/sec         | Free tier quota
Helius Webhooks        | Real-time (no limit)| Network bandwidth
API Gateway            | ~500 req/sec        | Single Node.js process
WebSocket Server       | ~10,000 connections | Memory (500MB limit)
Supabase Free Tier     | 500MB DB, 1GB transfer/mo | Free tier quota
Event Indexer          | ~100 events/sec     | Write throughput
```

### Scalability Plans

**Phase 3-4 Optimizations:**
- Add Redis caching (5 min TTL for markets)
- Horizontal scaling (multiple API Gateway instances)
- Database indexes (market_id, trader, timestamp)
- Connection pooling (Supabase)

**Phase 5 Production:**
- Upgrade Supabase to Pro ($25/mo)
- Cloudflare CDN for static assets
- Load balancer for backend services
- Mainnet deployment (better TPS)

---

## 🔄 Data Consistency

### Consistency Model

```
Blockchain (Strong Consistency)
   │
   │ Events streamed via Helius
   │
   ▼
Supabase (Eventual Consistency)
   │
   │ ~1-5 second delay
   │
   ▼
Frontend (Optimistic UI)
```

### Handling Inconsistencies

**Scenario 1: Event Indexer lag**
- **Problem:** Blockchain confirms transaction, but not yet in database
- **Solution:** Frontend shows "pending" state, polls until indexed
- **Timeout:** 30 seconds → show error, suggest refresh

**Scenario 2: Vote aggregation delay**
- **Problem:** User votes off-chain, but not yet submitted on-chain
- **Solution:** Show "pending aggregation" status
- **Timing:** Aggregated within 5-10 minutes

**Scenario 3: Market state out of sync**
- **Problem:** Market transitioned on-chain, database stale
- **Solution:**
  - Market Monitor triggers transition (5 min cron)
  - Event Indexer catches event
  - WebSocket broadcasts update
- **Fallback:** Frontend can call blockchain directly (bypass cache)

**Scenario 4: Failed transaction**
- **Problem:** User submits transaction, but it fails
- **Solution:**
  - Blockchain returns error immediately
  - No database write occurs (correct behavior)
  - Frontend shows error message
- **Recovery:** User retries with adjusted parameters

---

## 📍 Service Discovery

### How Services Find Each Other

**Environment Variables:**
```bash
# API Gateway
API_PORT=4000
SUPABASE_URL=https://xxx.supabase.co
HELIUS_RPC=https://devnet.helius-rpc.com/...

# WebSocket Server
WS_PORT=4001
SUPABASE_URL=https://xxx.supabase.co

# Event Indexer
PORT=4002
SUPABASE_URL=https://xxx.supabase.co

# Vote Aggregator
SUPABASE_URL=https://xxx.supabase.co
HELIUS_RPC=https://devnet.helius-rpc.com/...
PROGRAM_ID=7h3gXfBfYFueFVLYyfL5Qo1QGsf4GQUfW96FKVgnUsJS

# Market Monitor
SUPABASE_URL=https://xxx.supabase.co
HELIUS_RPC=https://devnet.helius-rpc.com/...
PROGRAM_ID=7h3gXfBfYFueFVLYyfL5Qo1QGsf4GQUfW96FKVgnUsJS
```

**PM2 Ecosystem:**
- All services defined in `ecosystem.config.js`
- Centralized configuration
- Easy to add/remove services
- Health monitoring built-in

---

## 🛠️ Integration Testing

### Integration Test Coverage

**Existing Tests:** (See TESTING_MASTER.md)

```
1. Full Market Lifecycle Test
   - Create market on-chain
   - Wait for event indexing
   - Verify database record
   - Buy shares
   - Verify position updated
   - Resolve market
   - Claim winnings

2. Vote Aggregation Test
   - Submit votes off-chain (Supabase)
   - Trigger Vote Aggregator manually
   - Verify on-chain aggregation
   - Check proposal approval

3. Real-Time Update Test
   - Subscribe to WebSocket
   - Execute on-chain transaction
   - Verify WebSocket event received
   - Check event payload accuracy

4. Market State Transition Test
   - Create market with short duration
   - Wait for expiry
   - Verify Market Monitor transitions state
   - Check database updated
```

**Test Data Collected:** (3,273-line on-chain testing system)
- HTTP traffic (all requests/responses)
- RPC calls (parameters + results)
- WebSocket messages (subscribe/emit)
- React Query cache state
- Wallet state changes
- On-chain account snapshots
- Transaction details (compute, fees, logs)
- Timing breakdown (every operation)
- Browser metrics (memory, CPU)
- User actions (clicks, inputs)
- Errors (full context, stack traces)

---

## 🔗 Related Documentation

### Component References
- [PROGRAMS_REFERENCE.md](../components/PROGRAMS_REFERENCE.md) - All on-chain instructions
- [BACKEND_REFERENCE.md](../components/BACKEND_REFERENCE.md) - All backend services
- [INFRASTRUCTURE_REFERENCE.md](../components/INFRASTRUCTURE_REFERENCE.md) - Supabase, RPC, wallets

### Architecture Deep Dives
- [DATA_FLOW.md](./DATA_FLOW.md) ⏳ - Detailed data flow diagrams
- [ARCHITECTURE_DECISIONS.md](./ARCHITECTURE_DECISIONS.md) ⏳ - Why we built it this way
- [API_REFERENCE.md](../api/API_REFERENCE.md) ⏳ - Complete API documentation

### Operations
- [COMMANDS_REFERENCE.md](../commands/COMMANDS_REFERENCE.md) - All CLI commands
- [TROUBLESHOOTING_REFERENCE.md](../troubleshooting/TROUBLESHOOTING_REFERENCE.md) ⏳ - Known issues

---

## 🚀 Next Steps

**Using This Document:**
1. Understand how components fit together
2. Identify integration points for new features
3. Debug cross-service issues
4. Plan performance optimizations
5. Design new features with full system context

**Expanding This Document:**
- Add more detailed sequence diagrams (PlantUML)
- Document error propagation paths
- Add performance benchmarks per integration
- Document retry/fallback strategies

---

**Last Updated:** 2025-11-09 00:30 PST
**Next Review:** 2025-11-16
**Maintained By:** Development Team
**Auto-Update:** When architecture changes

---
