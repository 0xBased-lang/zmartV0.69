# ARCHITECTURE_DECISIONS.md - Architecture Decision Reference

**Category:** Architecture Reference
**Tags:** [architecture, decisions, rationale, design, trade-offs]
**Last Updated:** 2025-11-09 01:00 PST

---

## Quick Links

- ⬆️ [Back to CLAUDE.md](../../../CLAUDE.md)
- 🔗 [Integration Map](./INTEGRATION_MAP.md)
- 🔄 [Data Flow](./DATA_FLOW.md)
- 📦 [Programs Reference](../components/PROGRAMS_REFERENCE.md)

---

## 🎯 Purpose

**Complete record of all major architecture decisions** with rationale, alternatives considered, and trade-offs.

This document answers:
- "Why did we build it this way?"
- "What alternatives were considered?"
- "What trade-offs were made?"
- "Can we change this decision later?"

---

## 📋 Decision Catalog

### D1: Two-Program Architecture (zmart-core + zmart-proposal)

**Decision:** Use 2 separate Anchor programs instead of 1 monolithic program

**Date:** October 2025

**Context:**
- Need market logic (LMSR, trading, resolution)
- Need voting system (proposal approval, disputes)
- Blueprint uses 7 separate EVM contracts

**Options Considered:**
1. **Single Program** (all functionality in one program)
   - ✅ Simpler deployment
   - ✅ Lower transaction costs (same program)
   - ❌ Larger program size (max 10MB)
   - ❌ Harder to maintain
   - ❌ Tight coupling

2. **Two Programs** (market logic + voting) ✅ CHOSEN
   - ✅ Separation of concerns
   - ✅ Independent deployment
   - ✅ Smaller individual programs
   - ✅ Easier to test and maintain
   - ❌ Cross-program invocation overhead
   - ❌ More complex deployment

3. **Seven Programs** (match blueprint)
   - ✅ Maximum modularity
   - ❌ Excessive overhead on Solana
   - ❌ Complex deployment
   - ❌ Poor developer experience

**Decision Rationale:**
- Solana programs ≠ EVM contracts (different cost model)
- 2 programs balances modularity vs. complexity
- Market logic (zmart-core) is production-ready
- Voting system (zmart-proposal) can iterate independently

**Reversibility:** Medium
- Can merge into one program (migration required)
- Can split further (migration required)

**Status:** ✅ Implemented (zmart-core deployed, zmart-proposal planned)

---

### D2: Hybrid On-Chain/Off-Chain Architecture

**Decision:** Keep critical state on-chain, non-critical data off-chain

**Date:** October 2025

**Context:**
- Solana rent costs for account storage
- Need fast, cheap user interactions
- Need decentralization for core logic

**On-Chain (Blockchain):**
- ✅ Market state (shares, liquidity, final result)
- ✅ User positions (holdings, claimed status)
- ✅ LMSR calculations (price, cost)
- ✅ Resolution outcome (immutable record)
- ✅ Aggregated votes (proposal/dispute results)

**Off-Chain (Supabase):**
- ✅ Market list & metadata
- ✅ Trade history
- ✅ Individual votes (before aggregation)
- ✅ Discussions
- ✅ User profiles

**Alternatives Considered:**
1. **Full On-Chain**
   - ✅ Maximum decentralization
   - ❌ Very expensive (rent costs)
   - ❌ Slow queries (no indexing)
   - ❌ Poor UX (no pagination, search)

2. **Full Off-Chain** (blockchain only for payments)
   - ✅ Cheap and fast
   - ❌ No trustlessness
   - ❌ Censorship risk
   - ❌ Not a prediction market

3. **Hybrid** ✅ CHOSEN
   - ✅ Best of both worlds
   - ✅ Critical data trustless
   - ✅ Query performance excellent
   - ❌ Eventual consistency (1-5 sec lag)

**Decision Rationale:**
- Blockchain = source of truth for money & outcomes
- Database = fast queries & user experience
- Balance decentralization vs. usability

**Reversibility:** Low
- Core architecture decision
- Would require complete rewrite

**Status:** ✅ Implemented

---

### D3: Vote Aggregation Strategy (Off-Chain → Batched On-Chain)

**Decision:** Collect votes off-chain in database, aggregate and submit on-chain every 5 minutes

**Date:** October 2025

**Context:**
- Voting is frequent (hundreds of votes per proposal)
- Each on-chain vote costs ≈$0.0001 (adds up)
- Need cheap voting for user engagement

**Alternatives Considered:**
1. **Pure On-Chain Voting**
   - ✅ Fully decentralized
   - ❌ Expensive ($0.0001 per vote × 1000 votes = $0.10)
   - ❌ Slow (blockchain confirmation)

2. **Off-Chain Only** (no blockchain record)
   - ✅ Free and instant
   - ❌ No trustless guarantee
   - ❌ Operator can manipulate results

3. **Off-Chain → Batched Aggregation** ✅ CHOSEN
   - ✅ Cheap for users (free voting)
   - ✅ Fast feedback (instant vote recorded)
   - ✅ Trustless final result (on-chain aggregation)
   - ✅ Operator can't fake votes (signature verification)
   - ❌ 5-10 minute delay for on-chain submission
   - ❌ Requires trust during aggregation window

**Decision Rationale:**
- Solana transaction costs make per-vote on-chain impractical
- Prediction markets need lots of votes (70% threshold)
- Off-chain voting + on-chain aggregation balances cost vs. trust
- Similar to how Snapshot works for DAO voting

**Reversibility:** Medium
- Can switch to pure on-chain (more expensive)
- Hard to switch to pure off-chain (less trustless)

**Status:** ✅ Implemented (Vote Aggregator service)

---

### D4: Event Indexing via Helius Webhooks

**Decision:** Use Helius webhooks instead of polling RPC for events

**Date:** October 2025

**Context:**
- Need real-time event notifications (transactions, state changes)
- Polling RPC is inefficient (wasted requests)
- Helius offers webhook service (free tier)

**Alternatives Considered:**
1. **Polling RPC** (query every 5 seconds)
   - ✅ Simple implementation
   - ❌ Wasteful (99% empty responses)
   - ❌ Slow (5-second delay)
   - ❌ Expensive (RPC quota usage)

2. **Solana WebSocket** (subscribe to account changes)
   - ✅ Real-time notifications
   - ❌ Complex connection management
   - ❌ Unreliable (frequent disconnections)
   - ❌ Doesn't provide transaction logs

3. **Helius Webhooks** ✅ CHOSEN
   - ✅ Real-time push notifications
   - ✅ Reliable delivery (retries)
   - ✅ Includes transaction logs (parsed events)
   - ✅ Free tier sufficient (100K requests/day)
   - ❌ Dependency on external service
   - ❌ Requires public webhook endpoint

**Decision Rationale:**
- Webhooks are industry standard (GitHub, Stripe, etc.)
- Helius provides reliable event delivery
- Saves RPC quota for actual queries
- Faster than polling (sub-second latency)

**Reversibility:** High
- Can switch to polling (Event Indexer already has RPC client)
- Can add WebSocket as backup

**Status:** ✅ Implemented (Event Indexer service)

---

### D5: PM2 for Backend Service Management

**Decision:** Use PM2 instead of Docker/Kubernetes for backend services

**Date:** October 2025

**Context:**
- Need to run 5-6 backend services (API Gateway, WebSocket, etc.)
- Single VPS deployment (not distributed)
- Team familiar with Node.js

**Alternatives Considered:**
1. **Systemd** (native Linux service manager)
   - ✅ No extra dependencies
   - ❌ Complex configuration (unit files)
   - ❌ No log aggregation
   - ❌ No process monitoring UI

2. **Docker + Docker Compose**
   - ✅ Container isolation
   - ✅ Easy replication
   - ❌ Overhead on single VPS
   - ❌ Complexity for simple app

3. **PM2** ✅ CHOSEN
   - ✅ Simple ecosystem.config.js
   - ✅ Built-in log aggregation
   - ✅ Auto-restart on crash
   - ✅ Cron jobs (market monitor, vote aggregator)
   - ✅ Web UI (pm2 monit)
   - ❌ Not containerized (harder to replicate)
   - ❌ Less isolation than Docker

**Decision Rationale:**
- PM2 is perfect for Node.js microservices on single server
- Simpler than Docker for current scale
- Easy to migrate to Docker later if needed

**Reversibility:** High
- Can dockerize services anytime (just add Dockerfile)

**Status:** ✅ Implemented (ecosystem.config.js)

---

### D6: Supabase for Database (vs. Self-Hosted PostgreSQL)

**Decision:** Use Supabase cloud instead of self-hosted PostgreSQL

**Date:** October 2025

**Context:**
- Need PostgreSQL database with authentication
- Want real-time subscriptions (WebSocket)
- Limited DevOps resources

**Alternatives Considered:**
1. **Self-Hosted PostgreSQL** (on VPS)
   - ✅ Full control
   - ✅ No external dependency
   - ❌ Manual backups
   - ❌ Manual scaling
   - ❌ No built-in auth
   - ❌ No real-time subscriptions

2. **Supabase Cloud** ✅ CHOSEN
   - ✅ Managed backups
   - ✅ Built-in authentication (SIWE support)
   - ✅ Real-time subscriptions (WebSocket)
   - ✅ Row-Level Security (RLS)
   - ✅ Free tier (500MB DB)
   - ❌ Vendor lock-in
   - ❌ Cost at scale ($25/mo Pro)

3. **Firebase/MongoDB** (NoSQL alternatives)
   - ✅ Real-time built-in
   - ❌ No SQL (complex queries harder)
   - ❌ No relational model

**Decision Rationale:**
- Supabase = PostgreSQL + Auth + Real-time + RLS
- Perfect for MVP (free tier)
- Easy to migrate to self-hosted later (just PostgreSQL dump)

**Reversibility:** High
- Can export PostgreSQL dump
- Can self-host Supabase (open-source)

**Status:** ✅ Implemented

---

### D7: Option B (MVP Scope - Minimal Social Features)

**Decision:** Defer advanced social features (Twitter OAuth, reputation, governance) to post-MVP

**Date:** October 2025

**Context:**
- Limited development time (14 weeks to production)
- Core prediction market mechanics more important than social features

**Option A (Full Social):**
- ✅ Twitter OAuth integration
- ✅ Advanced reputation system
- ✅ Community moderation
- ✅ Governance token
- ❌ 6-8 extra weeks development
- ❌ Distracts from core product

**Option B (MVP - Minimal Social):** ✅ CHOSEN
- ✅ Wallet-only auth (SIWE)
- ✅ Basic user profiles
- ✅ Simple discussions (Supabase only)
- ✅ Proposal voting (like/dislike)
- ✅ 14-week timeline achievable
- ❌ Less engaging socially
- ❌ No Twitter virality

**Decision Rationale:**
- Focus on prediction market core mechanics first
- Get to market faster, validate product-market fit
- Can add social features in V2 based on user feedback
- Clean architecture makes V2 features easy to add

**Reversibility:** Very High
- V2 features are additive (no breaking changes)
- Database already has reserved columns (twitter_handle, reputation_score)

**Status:** ✅ Decided, implementing Option B

---

### D8: Fixed-Point Math (u64 with 9 decimals)

**Decision:** Use integer math with 9 decimals instead of floating-point

**Date:** October 2025

**Context:**
- LMSR formula requires exponentials and logarithms
- Solana programs don't support f64 floating-point
- Need precision for financial calculations

**Alternatives Considered:**
1. **Floating-Point (f64)**
   - ✅ Easier math (built-in exp/ln)
   - ❌ Not supported on Solana
   - ❌ Precision issues ($0.0000001 rounding errors)

2. **Fixed-Point (u64 with 9 decimals)** ✅ CHOSEN
   - ✅ Works on Solana
   - ✅ Exact precision (no rounding errors)
   - ✅ Matches SOL denomination (1 SOL = 1B lamports)
   - ❌ Requires custom math library
   - ❌ More complex to implement

3. **External Oracle** (calculate off-chain, submit result)
   - ✅ Can use floating-point
   - ❌ Centralization risk
   - ❌ Oracle can manipulate prices

**Decision Rationale:**
- Fixed-point is industry standard for DeFi on Solana
- Avoids floating-point precision issues
- Aligns with SOL denomination (9 decimals)

**Implementation:**
- Binary search for LMSR cost calculation
- Custom exp/ln approximations
- Checked arithmetic (overflow/underflow protection)

**Reversibility:** Low
- Core math decision, hard to change

**Status:** ✅ Implemented (src/utils/lmsr.rs)

---

### D9: WebSocket for Real-Time Updates (vs. Polling)

**Decision:** Use WebSocket for real-time updates instead of frontend polling

**Date:** October 2025

**Context:**
- Need sub-second updates (trades, price changes)
- Polling every second is wasteful (99% no changes)

**Alternatives Considered:**
1. **Polling** (GET /api/markets/:id every 30 seconds)
   - ✅ Simple implementation
   - ❌ Wasteful (most requests return no changes)
   - ❌ Slow (30-second delay)
   - ❌ High server load (100 users = 200 req/min)

2. **WebSocket** ✅ CHOSEN
   - ✅ Real-time (sub-second updates)
   - ✅ Efficient (server pushes only when changes)
   - ✅ Low latency (50-200ms)
   - ❌ More complex (connection management)
   - ❌ Firewall/proxy issues (rare)

3. **Server-Sent Events (SSE)**
   - ✅ Simpler than WebSocket
   - ❌ One-way only (server → client)
   - ❌ Less browser support

**Decision Rationale:**
- Prediction markets need real-time price updates
- WebSocket is industry standard (Binance, Coinbase)
- Better UX (users see trades instantly)
- Fallback to polling if WebSocket fails

**Reversibility:** High
- Can fallback to polling anytime

**Status:** ✅ Implemented (WebSocket Server service)

---

### D10: Disable IPFS Service for MVP

**Decision:** Disable IPFS discussion snapshots for MVP launch

**Date:** November 2025

**Context:**
- IPFS snapshots not critical for core functionality
- Supabase stores discussions reliably
- Can enable post-MVP for decentralization

**Alternatives Considered:**
1. **Enable IPFS from Day 1**
   - ✅ More decentralized
   - ❌ Extra complexity
   - ❌ Pinata costs ($0/mo free, then $20/mo)
   - ❌ Not core feature

2. **Disable for MVP** ✅ CHOSEN
   - ✅ Simpler deployment
   - ✅ Supabase sufficient for V1
   - ✅ Can enable later (just uncomment PM2 config)
   - ❌ Less decentralized initially

**Decision Rationale:**
- Supabase is reliable for discussions
- IPFS adds complexity without proportional value in MVP
- Easy to enable post-MVP if users want decentralization

**Reversibility:** Very High
- Just uncomment service in ecosystem.config.js
- Code already written, just disabled

**Status:** ✅ Disabled in MVP (can enable anytime)

---

## 🔄 Decision Status Summary

| Decision | Status | Reversibility | Impact |
|----------|--------|---------------|--------|
| D1: Two-Program Architecture | ✅ Implemented | Medium | High |
| D2: Hybrid On-Chain/Off-Chain | ✅ Implemented | Low | High |
| D3: Vote Aggregation Strategy | ✅ Implemented | Medium | Medium |
| D4: Helius Webhooks | ✅ Implemented | High | Medium |
| D5: PM2 for Services | ✅ Implemented | High | Low |
| D6: Supabase Database | ✅ Implemented | High | Medium |
| D7: Option B (MVP Scope) | ✅ Decided | Very High | High |
| D8: Fixed-Point Math | ✅ Implemented | Low | High |
| D9: WebSocket Real-Time | ✅ Implemented | High | Medium |
| D10: Disable IPFS for MVP | ✅ Disabled | Very High | Low |

**Legend:**
- **Status:** Implemented, Decided, Under Review
- **Reversibility:** Low (hard to change), Medium (migration required), High (easy to change), Very High (toggle)
- **Impact:** Low (minor), Medium (significant), High (architectural)

---

## 📊 Trade-Off Analysis

### Decentralization vs. User Experience

**Choice:** Prioritize UX with acceptable decentralization

| Aspect | Decentralized | Centralized | Our Choice |
|--------|--------------|-------------|------------|
| Market state | On-chain ✅ | Database | On-chain ✅ |
| User positions | On-chain ✅ | Database | On-chain ✅ |
| Individual votes | On-chain | Database ✅ | Database (batched) |
| Discussions | IPFS | Database ✅ | Database (MVP) |
| Price calculation | On-chain ✅ | Off-chain | On-chain ✅ |

**Result:** Core financial data trustless, social data centralized

---

### Cost vs. Speed

**Choice:** Optimize for low cost, acceptable speed

| Operation | Fast (Expensive) | Cheap (Slow) | Our Choice |
|-----------|------------------|--------------|------------|
| Vote submission | On-chain (instant) | Off-chain → batched ✅ | Batched |
| Event indexing | Polling (wasteful) | Webhooks ✅ | Webhooks |
| Real-time updates | WebSocket ✅ | Polling | WebSocket |
| Database queries | Redis cache ✅ (planned) | Direct Supabase | Cache (Phase 3) |

**Result:** Most operations cheap and fast

---

### Simplicity vs. Modularity

**Choice:** Balance with 2-program architecture

| Aspect | Simple (1 program) | Modular (7+ programs) | Our Choice (2 programs) ✅ |
|--------|-------------------|----------------------|---------------------------|
| Deployment | Easy | Complex | Medium |
| Maintenance | Hard | Easy | Medium |
| Testing | Hard | Easy | Medium |
| Transaction cost | Low | High | Medium |

**Result:** Good balance for our scale

---

## 🔗 Related Documentation

- [INTEGRATION_MAP.md](./INTEGRATION_MAP.md) - How components connect
- [DATA_FLOW.md](./DATA_FLOW.md) - Data flow details
- [PROGRAMS_REFERENCE.md](../components/PROGRAMS_REFERENCE.md) - On-chain implementation
- [BACKEND_REFERENCE.md](../components/BACKEND_REFERENCE.md) - Backend implementation

---

**Last Updated:** 2025-11-09 01:00 PST
**Next Review:** Before major architecture changes
**Maintained By:** Development Team

---
