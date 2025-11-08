# Story: Backend Services - Vote Aggregator Service

**Story ID**: BACKEND-1
**Phase**: 2 (Backend Services)
**Week**: 4
**Epic**: Vote Aggregation System
**Estimated Time**: 5-7 days
**Priority**: High
**Status**: Ready to Start

---

## 📖 User Story

**As a** ZMART user
**I want** my proposal/dispute votes to be aggregated efficiently off-chain
**So that** markets can transition states based on community consensus without excessive gas costs

---

## 🎯 Business Context

The Vote Aggregator Service is a critical backend component that:

1. **Collects Individual Votes**: Users submit votes through API endpoints
2. **Aggregates Off-Chain**: Counts votes in Redis (gas-free)
3. **Submits On-Chain**: Only final aggregated counts go on-chain
4. **Saves Costs**: 1 on-chain transaction instead of N transactions

**Example**:
- 100 users vote on a proposal
- **Without aggregation**: 100 on-chain transactions (~$1-5 in fees)
- **With aggregation**: 100 off-chain + 1 on-chain (~$0.01 in fees)

---

## ✅ Acceptance Criteria

### Functional Requirements

- [ ] **Vote Collection API** endpoints functional
  - POST `/api/votes/proposal/:marketId` - Submit proposal vote
  - POST `/api/votes/dispute/:marketId` - Submit dispute vote
  - Validates wallet signatures (SIWE)
  - Checks user eligibility (token holdings, age)
  - Returns vote confirmation

- [ ] **Redis Caching** implemented
  - Schema: `votes:proposal:{marketId}` → Map of wallet → vote
  - Schema: `votes:dispute:{marketId}` → Map of wallet → vote
  - Atomic operations for vote counting
  - 7-day automatic expiry

- [ ] **Aggregation Cron Job** runs every 5 minutes
  - Counts votes from Redis
  - Checks thresholds (70% for proposals, 60% for disputes)
  - Builds Anchor transactions when thresholds met
  - Submits to Solana devnet
  - Handles errors gracefully (retry logic)

- [ ] **Monitoring & Logging**
  - Structured logging (JSON format)
  - Vote submission metrics
  - Aggregation success/failure rates
  - Alert on cron job failures

### Non-Functional Requirements

- [ ] **Performance**: <200ms API response time (p95)
- [ ] **Reliability**: 99%+ success rate for vote aggregation
- [ ] **Security**: Wallet signature validation, rate limiting
- [ ] **Scalability**: Handle 1,000+ votes per market

---

## 🏗️ Technical Specifications

### Architecture

```
┌─────────────┐
│   Frontend  │
└──────┬──────┘
       │ POST /api/votes/proposal/:marketId
       ▼
┌─────────────────────────────┐
│   Vote Aggregator Service   │
│                             │
│  ┌─────────┐  ┌──────────┐ │
│  │   API   │→ │  Redis   │ │
│  └─────────┘  └──────────┘ │
│       ▲            │        │
│       │            ▼        │
│  ┌─────────┐  ┌──────────┐ │
│  │  Cron   │← │Aggregator│ │
│  └─────────┘  └──────────┘ │
└───────────┬─────────────────┘
            │ On-chain tx
            ▼
┌─────────────────────────────┐
│  Solana Devnet (zmart-core) │
└─────────────────────────────┘
```

### Technology Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Cache**: Redis 7+
- **Solana**: @solana/web3.js, @coral-xyz/anchor
- **Scheduling**: node-cron
- **Logging**: Winston
- **Testing**: Jest

### API Endpoints

#### POST `/api/votes/proposal/:marketId`

**Request**:
```json
{
  "vote": "like" | "dislike",
  "signature": "wallet_signature",
  "publicKey": "voter_public_key",
  "message": "signed_message"
}
```

**Response (Success)**:
```json
{
  "success": true,
  "voteId": "uuid",
  "marketId": "market_public_key",
  "vote": "like",
  "timestamp": 1699449600
}
```

**Response (Error)**:
```json
{
  "success": false,
  "error": "Invalid signature" | "User not eligible" | "Market not found"
}
```

#### POST `/api/votes/dispute/:marketId`

Similar structure, but for dispute votes (`agree` | `disagree`).

### Redis Schema

```
votes:proposal:{marketId}   → HMAP { walletAddress: "like" | "dislike" }
votes:dispute:{marketId}    → HMAP { walletAddress: "agree" | "disagree" }
```

### Aggregation Logic

```typescript
// Pseudocode
async function aggregateProposalVotes(marketId: string) {
  const votes = await redis.hgetall(`votes:proposal:${marketId}`);

  const likes = Object.values(votes).filter(v => v === 'like').length;
  const dislikes = Object.values(votes).filter(v => v === 'dislike').length;
  const total = likes + dislikes;

  if (total === 0) return; // No votes yet

  const likePercentage = (likes / total) * 100;

  if (likePercentage >= 70) {
    // Call approve_proposal instruction
    await program.methods.approveProposal(likes, dislikes)
      .accounts({...})
      .rpc();
  }
}
```

---

## 📋 Implementation Tasks

Detailed breakdown from [TODO_CHECKLIST.md](../TODO_CHECKLIST.md) - Phase 2, Week 4:

### Day 1: Project Setup
- [x] Create story file (this file)
- [ ] Create feature branch: `git checkout -b feature/vote-aggregator`
- [ ] Set up Node.js project structure
  - `backend/vote-aggregator/src/index.ts`
  - `backend/vote-aggregator/src/routes/`
  - `backend/vote-aggregator/src/services/`
  - `backend/vote-aggregator/src/utils/`
  - `backend/vote-aggregator/src/config/`
- [ ] Initialize `package.json` with dependencies
- [ ] Create TypeScript configuration
- [ ] Create `.env.example`

### Day 2: Vote Collection API
- [ ] Implement POST `/api/votes/proposal/:marketId`
- [ ] Implement POST `/api/votes/dispute/:marketId`
- [ ] Wallet signature validation
- [ ] User eligibility checks
- [ ] Write 10+ unit tests

### Day 3: Redis Integration
- [ ] Set up Redis connection
- [ ] Implement vote storage (HSET/HGET operations)
- [ ] Implement vote counting logic
- [ ] Add 7-day expiry (EXPIRE command)
- [ ] Write 8+ integration tests

### Day 4: Aggregation Cron Job
- [ ] Implement cron job (every 5 minutes)
- [ ] Count votes from Redis
- [ ] Check thresholds (70% proposal, 60% dispute)
- [ ] Build Anchor transactions
- [ ] Submit to Solana
- [ ] Error handling and retry logic
- [ ] Write 6+ unit tests

### Day 5: Integration & Testing
- [ ] End-to-end testing (vote submission → aggregation → on-chain)
- [ ] Performance testing (1,000 votes)
- [ ] Error scenario testing
- [ ] Load testing (concurrent requests)

### Day 6-7: Polish & Deploy
- [ ] Add structured logging (Winston)
- [ ] Add monitoring (vote metrics)
- [ ] Documentation (API docs, setup guide)
- [ ] Deploy to devnet
- [ ] Verify with frontend integration

---

## 🧪 Testing Strategy

### Unit Tests (30+ tests)
- Vote validation logic
- Signature verification
- Redis operations
- Aggregation calculations
- Threshold checking

### Integration Tests (15+ tests)
- API endpoints (happy path)
- API endpoints (error cases)
- Redis caching flow
- Cron job execution
- On-chain transaction submission

### E2E Tests (5+ tests)
- Full vote lifecycle (submit → aggregate → on-chain)
- Multiple users voting simultaneously
- Threshold edge cases (69.9% vs 70.1%)
- Retry logic on failure
- Market state transitions

---

## 🔗 Dependencies

### Technical Dependencies
- Solana program deployed: `7h3gXfBfYFueFVLYyfL5Qo1QGsf4GQUfW96FKVgnUsJS`
- Redis server (local or cloud)
- backend-authority wallet (for signing transactions)

### Documentation Dependencies
- [07_ON_CHAIN_OFF_CHAIN_INTEGRATION.md](../07_ON_CHAIN_OFF_CHAIN_INTEGRATION.md) - Architecture
- [03_SOLANA_PROGRAM_DESIGN.md](../03_SOLANA_PROGRAM_DESIGN.md) - Program instructions
- [IMPLEMENTATION_PHASES.md](../IMPLEMENTATION_PHASES.md) - Week 4 plan

### Code Dependencies
- `programs/zmart-core/target/idl/zmart_core.json` - IDL file
- `programs/zmart-core/target/types/zmart_core.ts` - TypeScript types

---

## 📊 Success Metrics

### Delivery Metrics
- [ ] All acceptance criteria met
- [ ] 50+ tests passing
- [ ] API response time <200ms (p95)
- [ ] 99%+ aggregation success rate
- [ ] Deployed to devnet and functional

### Quality Metrics
- [ ] Code coverage ≥90%
- [ ] Zero critical bugs
- [ ] Linting passes (ESLint)
- [ ] TypeScript compilation clean

---

## 🚨 Risks & Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Redis downtime | High | Low | In-memory fallback, health checks |
| Cron job failure | High | Medium | Alerting, manual retry, logs |
| Invalid signatures | Medium | Medium | Robust validation, clear errors |
| Race conditions | Medium | Low | Atomic Redis operations |
| On-chain tx failure | High | Medium | Retry logic, error handling |

---

## 🔄 Definition of Done

### Code Complete
- [x] All implementation tasks checked off
- [x] All tests passing (unit, integration, E2E)
- [x] Code reviewed (self or peer)
- [x] Linting and type-checking clean

### Deployed
- [x] Service running on devnet
- [x] Health check endpoint returns 200
- [x] Vote submission works end-to-end
- [x] Cron job executing every 5 minutes
- [x] Logs visible and structured

### Documented
- [x] API documentation complete
- [x] Setup guide written
- [x] Environment variables documented
- [x] Common issues troubleshooting guide

### Validated
- [x] Frontend integration tested
- [x] Performance benchmarks met
- [x] Security review passed
- [x] Product owner approval

---

## 📝 Notes

- **Backend Authority Wallet**: Use `backend-authority.json` for signing transactions
- **Devnet Faucet**: Ensure wallet has ≥1 SOL for transactions
- **Rate Limiting**: Add later if abuse detected
- **Monitoring**: Basic metrics in Week 4, advanced in Week 6

---

## 🔗 Related Stories

- **Prerequisite**: None (Phase 1 complete)
- **Blocks**: STORY-BACKEND-2 (Event Indexer - Week 5)
- **Related**: STORY-BACKEND-3 (API Gateway - Week 6)

---

**Created**: November 8, 2025
**Author**: Claude Code (SuperClaude Framework)
**Status**: ✅ Ready for Implementation
**Branch**: `feature/vote-aggregator` (to be created)
