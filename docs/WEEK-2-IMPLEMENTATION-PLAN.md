# WEEK 2 IMPLEMENTATION PLAN - Backend Services

**Date:** November 5, 2025
**Status:** Ready to Start
**Timeline:** Days 8-14 (7 days)
**Dependencies:** Week 1 complete ✅

---

## 🎯 Week 2 Objectives

Build complete backend services infrastructure to support:
- ProposalManager vote aggregation (off-chain → on-chain)
- IPFS discussion snapshots (decentralized history)
- API Gateway (REST + WebSocket)
- Real-time event monitoring
- Integration with devnet programs

**Success Criteria:**
- All 3 backend services running and tested
- Vote aggregation working end-to-end
- IPFS snapshots uploading successfully
- API Gateway serving all endpoints
- 100+ concurrent users load tested
- Integration tests passing

---

## 📋 Implementation Scope

### What We're Building (Week 2)

✅ **Vote Aggregator Service**
- Poll proposal votes from Supabase every 5 minutes
- Aggregate like/dislike counts
- Trigger on-chain `approve_market` when 70% threshold met
- Same for dispute votes (60% threshold)
- Event-driven architecture

✅ **IPFS Service**
- Daily cron job (midnight UTC)
- Snapshot market discussions
- Upload to IPFS (Infura gateway)
- Store CID in Supabase for verification
- Prune old snapshots (90 days retention)

✅ **Market Monitor Service**
- Listen to Solana program events
- Index all market transactions
- Cache market state in Redis
- Trigger automatic state transitions
- WebSocket event broadcasting

✅ **API Gateway**
- REST endpoints (markets, trades, votes, discussions)
- WebSocket server (real-time updates)
- Wallet authentication (SIWE)
- Rate limiting & caching
- CORS configuration

✅ **Integration Tests**
- End-to-end vote aggregation workflow
- IPFS upload/retrieval test
- API endpoint testing (all routes)
- WebSocket connection test
- Load test (100+ concurrent users)
- Performance benchmarking

### What We're NOT Building (Deferred to Later Weeks)

❌ Frontend UI (Week 9-12)
❌ Advanced analytics (Week 6-7)
❌ Governance features (v2)
❌ Mobile app (v2)
❌ Mainnet deployment (Week 20)

---

## 🗓️ Day-by-Day Breakdown

### **Day 8: Backend Infrastructure Setup**

**Story 2.1: Backend Project Setup**

**Deliverables:**
- `backend/` directory structure
- TypeScript + Node.js configuration
- Package.json with all dependencies
- Database connection (Supabase)
- Environment variables (.env.example)
- Solana connection to devnet
- Redis cache setup
- Shared utilities

**Tasks:**
1. Create backend directory structure
2. Initialize npm project with TypeScript
3. Install dependencies (see below)
4. Configure tsconfig.json
5. Set up Supabase client
6. Set up Solana connection
7. Set up Redis client
8. Create shared utilities (logger, config)

**Dependencies to Install:**
```json
{
  "dependencies": {
    "@coral-xyz/anchor": "^0.29.0",
    "@solana/web3.js": "^1.87.6",
    "@supabase/supabase-js": "^2.38.0",
    "express": "^4.18.2",
    "ws": "^8.14.2",
    "ioredis": "^5.3.2",
    "node-cron": "^3.0.3",
    "ipfs-http-client": "^60.0.1",
    "dotenv": "^16.3.1",
    "winston": "^3.11.0",
    "joi": "^17.11.0"
  },
  "devDependencies": {
    "@types/node": "^20.10.0",
    "@types/express": "^4.17.21",
    "@types/ws": "^8.5.9",
    "@types/node-cron": "^3.0.11",
    "typescript": "^5.3.3",
    "ts-node": "^10.9.1",
    "nodemon": "^3.0.2",
    "jest": "^29.7.0",
    "@types/jest": "^29.5.11"
  }
}
```

**Acceptance Criteria:**
- [ ] Backend builds without errors
- [ ] Can connect to Supabase
- [ ] Can connect to Solana devnet
- [ ] Can connect to Redis
- [ ] Environment variables loaded
- [ ] Shared utilities working
- [ ] Story 2.1 DoD complete

**Tier:** Tier 2 (Core - Enhanced DoD)

---

### **Day 9: Vote Aggregator Service**

**Story 2.2: ProposalManager Vote Aggregator**

**Deliverables:**
- Vote aggregator service implementation
- Proposal vote aggregation logic
- Dispute vote aggregation logic
- On-chain instruction callers
- Error handling & retry logic
- Service monitoring

**Implementation:**
```typescript
// backend/src/services/vote-aggregator.ts

import { Program, AnchorProvider } from "@coral-xyz/anchor";
import { Connection, Keypair } from "@solana/web3.js";
import { createClient } from "@supabase/supabase-js";

class VoteAggregatorService {
  constructor(
    private program: Program,
    private backendKeypair: Keypair,
    private supabase: SupabaseClient
  ) {}

  // Start polling every 5 minutes
  async start() {
    setInterval(() => this.aggregateProposalVotes(), 300000);
    setInterval(() => this.aggregateDisputeVotes(), 300000);
  }

  async aggregateProposalVotes() {
    // 1. Find markets in PROPOSED state with votes
    const { data: markets } = await this.supabase
      .from("markets")
      .select("*")
      .eq("state", "PROPOSED");

    for (const market of markets) {
      // 2. Count likes/dislikes
      const { data: votes } = await this.supabase
        .from("proposal_votes")
        .select("vote")
        .eq("market_id", market.id);

      const likes = votes.filter(v => v.vote === true).length;
      const dislikes = votes.filter(v => v.vote === false).length;
      const total = likes + dislikes;

      // 3. Check 70% threshold
      if (total >= 10 && likes / total >= 0.7) {
        // 4. Call on-chain approve_market
        await this.program.methods
          .approveMarket(likes, dislikes)
          .accounts({
            market: market.on_chain_address,
            backend: this.backendKeypair.publicKey,
          })
          .signers([this.backendKeypair])
          .rpc();

        // 5. Update Supabase
        await this.supabase
          .from("markets")
          .update({ state: "APPROVED" })
          .eq("id", market.id);
      }
    }
  }

  async aggregateDisputeVotes() {
    // Similar logic for dispute votes (60% threshold)
    // ...
  }
}
```

**Acceptance Criteria:**
- [ ] Service polls Supabase every 5 minutes
- [ ] Proposal votes aggregated correctly
- [ ] Dispute votes aggregated correctly
- [ ] On-chain calls successful
- [ ] Supabase updated after approval
- [ ] Error handling and logging
- [ ] Integration test passing
- [ ] Story 2.2 DoD complete

**Tier:** Tier 1 (Foundation - Comprehensive DoD)

---

### **Day 10: IPFS Service - Part 1**

**Story 2.3: IPFS Discussion Snapshot Service**

**Deliverables:**
- IPFS client configuration
- Daily cron job implementation
- Discussion snapshot logic
- IPFS upload functionality
- CID storage in Supabase
- Snapshot retrieval API

**Implementation:**
```typescript
// backend/src/services/ipfs-service.ts

import { create, IPFSHTTPClient } from "ipfs-http-client";
import cron from "node-cron";

class IPFSService {
  private ipfs: IPFSHTTPClient;

  constructor(private supabase: SupabaseClient) {
    // Initialize IPFS client (Infura gateway)
    this.ipfs = create({
      host: "ipfs.infura.io",
      port: 5001,
      protocol: "https",
      headers: {
        authorization: `Basic ${Buffer.from(
          `${process.env.IPFS_PROJECT_ID}:${process.env.IPFS_PROJECT_SECRET}`
        ).toString("base64")}`,
      },
    });
  }

  // Start daily cron job (midnight UTC)
  start() {
    cron.schedule("0 0 * * *", () => this.snapshotAllMarkets());
  }

  async snapshotAllMarkets() {
    // 1. Get active markets
    const { data: markets } = await this.supabase
      .from("markets")
      .select("*")
      .in("state", ["ACTIVE", "RESOLVING", "DISPUTED"]);

    for (const market of markets) {
      await this.snapshotMarket(market.id);
    }
  }

  async snapshotMarket(marketId: string) {
    // 2. Get discussions from past 24 hours
    const yesterday = new Date(Date.now() - 86400000);
    const { data: discussions } = await this.supabase
      .from("discussions")
      .select("*")
      .eq("market_id", marketId)
      .gte("created_at", yesterday.toISOString())
      .is("deleted_at", null)
      .order("created_at", { ascending: true });

    // 3. Create snapshot object
    const snapshot = {
      market_id: marketId,
      snapshot_date: new Date().toISOString(),
      discussions_count: discussions.length,
      discussions: discussions.map(d => ({
        id: d.id,
        user_wallet: d.user_wallet,
        content: d.content,
        created_at: d.created_at,
      })),
    };

    // 4. Upload to IPFS
    const { cid } = await this.ipfs.add(JSON.stringify(snapshot));

    // 5. Store CID in Supabase
    await this.supabase
      .from("ipfs_anchors")
      .insert({
        market_id: marketId,
        ipfs_hash: cid.toString(),
        discussions_count: discussions.length,
      });

    console.log(`Snapshot for ${marketId}: ${cid}`);
  }
}
```

**Acceptance Criteria:**
- [ ] IPFS client configured (Infura)
- [ ] Cron job scheduled (daily midnight)
- [ ] Snapshots created correctly
- [ ] IPFS uploads successful
- [ ] CIDs stored in Supabase
- [ ] Can retrieve snapshots from IPFS
- [ ] Error handling for failed uploads
- [ ] Story 2.3 DoD complete

**Tier:** Tier 2 (Core - Enhanced DoD)

---

### **Day 11: IPFS Service - Part 2**

**Continuation of Story 2.3**

**Deliverables:**
- Snapshot retrieval endpoint
- IPFS gateway fallbacks
- Snapshot pruning (90-day retention)
- Integration with market monitor
- Testing and validation

**Tasks:**
1. Implement snapshot retrieval API
2. Add multiple IPFS gateway support
3. Implement 90-day pruning logic
4. Add monitoring and alerting
5. Write integration tests
6. Load test IPFS uploads

**Acceptance Criteria:**
- [ ] Snapshots retrievable from IPFS
- [ ] Multiple gateway fallbacks working
- [ ] Old snapshots pruned correctly
- [ ] Monitoring dashboards updated
- [ ] Integration tests passing
- [ ] Load test (100 markets) successful
- [ ] Story 2.3 fully complete

---

### **Day 12: API Gateway - Part 1**

**Story 2.4: REST API Gateway**

**Deliverables:**
- Express server setup
- REST endpoints for all resources
- Request validation (Joi)
- Rate limiting
- CORS configuration
- API documentation

**Endpoints:**
```typescript
// Market endpoints
GET    /api/markets              // List all markets
GET    /api/markets/:id          // Get market details
POST   /api/markets              // Create market (requires auth)
GET    /api/markets/:id/trades   // Get market trades
GET    /api/markets/:id/votes    // Get market votes

// Trading endpoints
POST   /api/trades/buy           // Submit buy trade
POST   /api/trades/sell          // Submit sell trade

// Voting endpoints
POST   /api/votes/proposal       // Submit proposal vote
POST   /api/votes/dispute        // Submit dispute vote

// Discussion endpoints
GET    /api/discussions/:marketId  // Get market discussions
POST   /api/discussions            // Post discussion
DELETE /api/discussions/:id        // Delete discussion (author only)

// User endpoints
GET    /api/users/:wallet         // Get user profile
GET    /api/users/:wallet/trades  // Get user trades
GET    /api/users/:wallet/votes   // Get user votes
```

**Authentication:**
```typescript
// Wallet-based auth (SIWE)
import { verifyMessage } from "@solana/web3.js";

async function authenticateWallet(req, res, next) {
  const { message, signature, wallet } = req.body;

  try {
    const verified = verifyMessage(message, signature, wallet);
    if (verified) {
      req.user = { wallet };
      next();
    } else {
      res.status(401).json({ error: "Invalid signature" });
    }
  } catch (error) {
    res.status(401).json({ error: "Authentication failed" });
  }
}
```

**Acceptance Criteria:**
- [ ] All endpoints implemented
- [ ] Request validation working
- [ ] Authentication enforced on protected routes
- [ ] Rate limiting active (100 req/min)
- [ ] CORS configured correctly
- [ ] Error handling comprehensive
- [ ] API documentation generated
- [ ] Story 2.4 Part 1 complete

**Tier:** Tier 2 (Core - Enhanced DoD)

---

### **Day 13: API Gateway - Part 2 (WebSocket)**

**Story 2.5: WebSocket Real-Time Updates**

**Deliverables:**
- WebSocket server setup
- Real-time event broadcasting
- Market state updates
- Trade notifications
- Connection management

**Implementation:**
```typescript
// backend/src/services/websocket-server.ts

import WebSocket from "ws";

class WebSocketServer {
  private wss: WebSocket.Server;
  private clients: Map<string, Set<WebSocket>>;

  constructor(port: number) {
    this.wss = new WebSocket.Server({ port });
    this.clients = new Map();

    this.wss.on("connection", (ws, req) => {
      this.handleConnection(ws, req);
    });
  }

  handleConnection(ws: WebSocket, req: any) {
    ws.on("message", (data) => {
      const message = JSON.parse(data.toString());

      // Subscribe to market updates
      if (message.type === "subscribe") {
        this.subscribe(ws, message.marketId);
      }

      // Unsubscribe
      if (message.type === "unsubscribe") {
        this.unsubscribe(ws, message.marketId);
      }
    });

    ws.on("close", () => {
      this.removeClient(ws);
    });
  }

  // Broadcast to all subscribers of a market
  broadcast(marketId: string, event: any) {
    const subscribers = this.clients.get(marketId) || new Set();
    for (const client of subscribers) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(event));
      }
    }
  }

  // Subscribe client to market
  subscribe(ws: WebSocket, marketId: string) {
    if (!this.clients.has(marketId)) {
      this.clients.set(marketId, new Set());
    }
    this.clients.get(marketId)!.add(ws);
  }
}
```

**Event Types:**
```typescript
// Market state change
{
  type: "market_state_change",
  marketId: "...",
  oldState: "ACTIVE",
  newState: "RESOLVING",
  timestamp: "..."
}

// New trade
{
  type: "trade",
  marketId: "...",
  tradeType: "buy",
  outcome: true,
  shares: "1000000000",
  price: "0.654321000",
  user: "..."
}

// New vote
{
  type: "vote",
  marketId: "...",
  voteType: "proposal",
  vote: true,
  user: "..."
}
```

**Acceptance Criteria:**
- [ ] WebSocket server running
- [ ] Clients can subscribe/unsubscribe
- [ ] Events broadcast correctly
- [ ] Connection management working
- [ ] Reconnection handling
- [ ] Load test (1000 concurrent connections)
- [ ] Story 2.5 complete

---

### **Day 14: Integration Tests & Validation**

**Story 2.6: Backend Integration Tests**

**Deliverables:**
- End-to-end vote aggregation test
- IPFS upload/retrieval test
- API endpoint test suite
- WebSocket connection test
- Load testing (100+ concurrent users)
- Performance benchmarking
- Deployment documentation

**Test Scenarios:**
1. **Vote Aggregation Flow**
   - User submits proposal vote on-chain
   - Backend indexes vote event
   - Backend aggregates votes
   - Backend calls `approve_market` when threshold met
   - Market state transitions to APPROVED

2. **IPFS Flow**
   - Post discussions to market
   - Trigger daily snapshot
   - Verify IPFS upload successful
   - Retrieve snapshot from IPFS
   - Verify content matches

3. **API Tests**
   - Test all REST endpoints
   - Verify authentication
   - Verify rate limiting
   - Verify error handling

4. **WebSocket Tests**
   - Connect 100 clients
   - Subscribe to market
   - Broadcast event
   - Verify all clients receive

5. **Load Test**
   - 100+ concurrent users
   - Mixed API + WebSocket traffic
   - Measure response times
   - Verify no errors

**Acceptance Criteria:**
- [ ] All integration tests passing
- [ ] Load test successful (100+ users)
- [ ] Response times <200ms (p95)
- [ ] Zero errors under load
- [ ] Performance benchmarks documented
- [ ] Deployment guide complete
- [ ] Story 2.6 complete

**Tier:** Tier 2 (Core - Enhanced DoD)

---

## 🏗️ Backend Directory Structure

```
backend/
├── package.json
├── tsconfig.json
├── .env.example
├── README.md
├── src/
│   ├── index.ts                    # Main entry point
│   ├── config/
│   │   ├── database.ts             # Supabase config
│   │   ├── solana.ts               # Solana connection
│   │   ├── redis.ts                # Redis config
│   │   └── env.ts                  # Environment variables
│   ├── services/
│   │   ├── vote-aggregator.ts      # Vote aggregator service
│   │   ├── ipfs-service.ts         # IPFS snapshot service
│   │   ├── market-monitor.ts       # Event indexer
│   │   └── websocket-server.ts     # WebSocket server
│   ├── api/
│   │   ├── server.ts               # Express server
│   │   ├── routes/
│   │   │   ├── markets.ts
│   │   │   ├── trades.ts
│   │   │   ├── votes.ts
│   │   │   ├── discussions.ts
│   │   │   └── users.ts
│   │   └── middleware/
│   │       ├── auth.ts
│   │       ├── rate-limit.ts
│   │       └── error-handler.ts
│   ├── utils/
│   │   ├── logger.ts
│   │   ├── retry.ts
│   │   └── validation.ts
│   └── types/
│       └── index.ts
├── tests/
│   ├── integration/
│   │   ├── vote-aggregation.test.ts
│   │   ├── ipfs.test.ts
│   │   ├── api.test.ts
│   │   └── websocket.test.ts
│   └── load/
│       └── load-test.ts
└── scripts/
    ├── start-dev.sh
    └── deploy.sh
```

---

## 🎯 Success Metrics

**Quality Gates:**
- [ ] All 6 stories complete with DoD
- [ ] Zero blocking bugs
- [ ] 95%+ test coverage
- [ ] All integration tests passing
- [ ] Load test successful (100+ users)
- [ ] Response times <200ms (p95)
- [ ] Documentation complete

**Performance Targets:**
- Vote aggregation: <5 minute latency
- IPFS upload: <10 seconds per market
- API response time: <200ms (p95)
- WebSocket message latency: <100ms
- Load capacity: 100+ concurrent users

**Compliance:**
- Story-first development (enforced by git hooks)
- Tiered DoD (Tier 1/2 for critical services)
- All anti-patterns prevented
- Weekly compliance audit

---

## 🚀 Ready to Start?

**Prerequisites (✅ from Week 1):**
- Solana programs deployed to devnet
- Test infrastructure ready
- Backend directory exists
- Git hooks active

**Next Step:** Create Story 2.1 and begin Day 8 implementation!

---

**Last Updated:** November 5, 2025
**Status:** Ready for Implementation
**Estimated Duration:** 7 days (Days 8-14)
