# ZMART V0.69 - 14-Week Implementation Plan

**Status:** Ready to Begin Week 1
**Last Updated:** November 6, 2025
**Timeline:** 14 weeks to production-ready V1 mainnet launch
**Quality Target:** 90/100 bulletproof rating (up from 60/100 current)

---

## Table of Contents

1. [Overview](#overview)
2. [Current State Analysis](#current-state-analysis)
3. [Phase 1: Voting System Foundation (Weeks 1-3)](#phase-1-voting-system-foundation-weeks-1-3)
4. [Phase 2: Backend Services (Weeks 4-7)](#phase-2-backend-services-weeks-4-7)
5. [Phase 3: Integration Testing (Weeks 8-9)](#phase-3-integration-testing-weeks-8-9)
6. [Phase 4: Frontend Integration (Weeks 10-12)](#phase-4-frontend-integration-weeks-10-12)
7. [Phase 5: Security + Deployment (Weeks 13-14)](#phase-5-security-deployment-weeks-13-14)
8. [Quality Gates](#quality-gates)
9. [Risk Mitigation](#risk-mitigation)
10. [Success Metrics](#success-metrics)

---

## Overview

### Implementation Philosophy

**Quality > Speed** - We prioritize correctness, security, and maintainability over rapid deployment.

**Evidence-Based** - This plan is built from line-by-line code analysis, not assumptions.

**Phased Approach** - Critical features first (voting), then supporting (backend), then UX (frontend).

**Validation Gates** - No phase advances without passing comprehensive quality checks.

### Project Scope (Option B - V1 MVP)

**✅ Implement (Blueprint + Essentials):**
- All blueprint mechanics (voting, LMSR, resolution, disputes)
- Proposal voting system (like/dislike, 70% threshold)
- Off-chain vote aggregation → on-chain recording
- Minimal discussion system (Supabase + daily IPFS snapshots)
- Wallet-only auth (SIWE)
- Basic user profiles (wallet address only)

**❌ Defer to V2 (Social Features):**
- Twitter OAuth integration
- Advanced reputation scoring algorithm
- Community flagging/moderation system
- Detailed user profiles
- Governance token
- Staking mechanics
- DAO features

### Cross-References

- **Task Tracking:** [docs/TODO_CHECKLIST.md](./TODO_CHECKLIST.md)
- **Project Context:** [CLAUDE.md](../CLAUDE.md)
- **Core Logic Specs:** [docs/CORE_LOGIC_INVARIANTS.md](./CORE_LOGIC_INVARIANTS.md)
- **Program Design:** [docs/03_SOLANA_PROGRAM_DESIGN.md](./03_SOLANA_PROGRAM_DESIGN.md)

---

## Current State Analysis

### ✅ What's Already Built (60% Foundation Complete)

**Programs (zmart-core):**
- LMSR Mathematics: 100% complete (cost function, price calculation, share buying/selling)
- Trading Instructions: 100% complete (buy_shares, sell_shares, add_liquidity, withdraw_liquidity)
- State Management: 100% complete (6-state FSM with proper transitions)
- Resolution: 100% complete (submit_resolution, finalize_market, claim_winnings)
- Tests: 102 unit tests passing

**Total Lines Analyzed:** 4,923 lines of Rust code

### ❌ Critical Gaps (40% Remaining Work)

**Gap 1: Voting System (0% implemented)**
- 7 missing instructions: submit_proposal_vote, aggregate_proposal_votes, submit_dispute_vote, aggregate_dispute_votes, update_global_config, emergency_pause, cancel_market
- ProposalManager program: 28 lines placeholder (needs ~800 lines)
- Vote tracking accounts: Not created
- Threshold logic: Not implemented

**Gap 2: Backend Services (0% functional)**
- Vote Aggregator: Scaffolding only, no cron job or Redis integration
- Event Indexer: Not built
- API Gateway: Scaffolding only
- Market Monitor: Not built
- Database: Schema defined but not deployed

**Gap 3: Frontend Integration (0% Solana integration)**
- Wallet connection: UI exists but no transaction signing
- Trading interface: Mock data only
- Real-time updates: Not connected to backend

**Gap 4: Testing & Deployment**
- No end-to-end tests
- No stress testing
- No security audit
- No deployment procedures

### Why 14 Weeks (Not 20)

**Original 20-week estimate was inflated because:**
1. 60% already built (LMSR, trading, state machine all work)
2. Clear requirements (no design ambiguity)
3. Proven patterns (Option B scope well-defined)
4. Quality foundation (102 passing tests to build on)

**Realistic breakdown:**
- Voting System: 3 weeks (complex but isolated)
- Backend Services: 4 weeks (straightforward services)
- Integration Testing: 2 weeks (validate what's built)
- Frontend Integration: 3 weeks (UI exists, add Solana)
- Security + Deployment: 2 weeks (audit + launch)

**Total: 14 weeks with 2-week contingency buffer = 16 weeks worst case**

---

## Phase 1: Voting System Foundation (Weeks 1-3)

**Goal:** Complete all voting instructions + ProposalManager program

**Why First:** Voting is the most complex missing piece. Complete it early to reduce risk.

**Success Criteria:** All 18 instructions implemented, ProposalManager program functional, votes aggregate correctly on devnet.

### Week 1: Core Voting Instructions

**Objective:** Implement proposal and dispute vote submission/aggregation

**Deliverables:**
1. ✅ `submit_proposal_vote` instruction (like/dislike recording)
   - Input: ProposalPDA, user wallet, vote choice (like/dislike)
   - Validation: User hasn't voted yet, proposal in PROPOSED state
   - Output: ProposalVote account created

2. ✅ `aggregate_proposal_votes` instruction (backend → on-chain)
   - Input: ProposalPDA, vote counts from backend
   - Validation: Only authorized aggregator can call
   - Logic: If likes >= 70% of total votes → transition to APPROVED
   - Output: Proposal state updated

3. ✅ `submit_dispute_vote` instruction
   - Input: MarketPDA, user wallet, vote choice (support/reject)
   - Validation: Market in DISPUTED state, user has position
   - Output: DisputeVote account created

4. ✅ `aggregate_dispute_votes` instruction
   - Input: MarketPDA, vote counts from backend
   - Validation: Only authorized aggregator can call
   - Logic: If support >= 60% of total votes → overturn resolution
   - Output: Market outcome updated

5. ✅ Unit tests for all 4 instructions (20+ test cases)
   - Happy path: Valid votes recorded correctly
   - Edge cases: Duplicate votes rejected, wrong state rejected
   - Threshold logic: 70% approval, 60% dispute support
   - Access control: Only aggregator can aggregate

**Validation Checklist:**
- [ ] All 4 instructions compile without warnings
- [ ] All 20+ unit tests pass
- [ ] Code coverage >= 90% for voting logic
- [ ] Formulas match blueprint (70% proposal threshold, 60% dispute threshold)
- [ ] Access control enforced (aggregator role validated)

**Documentation References:**
- [03_SOLANA_PROGRAM_DESIGN.md](./03_SOLANA_PROGRAM_DESIGN.md) - Instructions 13-16
- [06_STATE_MANAGEMENT.md](./06_STATE_MANAGEMENT.md) - State transitions from PROPOSED → APPROVED
- [07_ON_CHAIN_OFF_CHAIN_INTEGRATION.md](./07_ON_CHAIN_OFF_CHAIN_INTEGRATION.md) - Vote aggregation workflow

**Time Estimate:** 5 days (1 day per instruction + 1 day tests)

---

### Week 2: ProposalManager Program

**Objective:** Complete ProposalManager program with vote tracking

**Deliverables:**
1. ✅ ProposalManager program structure
   - Entry point with all instruction handlers
   - Account structures (ProposalVote, DisputeVote)
   - Error codes for voting failures

2. ✅ Vote tracking accounts
   - ProposalVote: { proposal_id, user, vote_choice, timestamp }
   - DisputeVote: { market_id, user, vote_choice, weight, timestamp }
   - Seeds: ["proposal_vote", proposal_id, user_pubkey]

3. ✅ Aggregation logic implementation
   - Count votes from VoteRecord accounts
   - Calculate percentages (likes/total, support/total)
   - Apply thresholds (70% proposal approval, 60% dispute support)
   - Trigger state transitions

4. ✅ Integration tests (10+ test scenarios)
   - Proposal approval flow: 10 users vote → 7 like → aggregation → APPROVED state
   - Proposal rejection: 10 users vote → 3 like → aggregation → stays PROPOSED
   - Dispute resolution: 20 users vote → 12 support → aggregation → outcome overturned
   - Duplicate vote prevention: User votes twice → second vote rejected

**Validation Checklist:**
- [ ] ProposalManager program deploys to devnet successfully
- [ ] All integration tests pass (end-to-end vote flows)
- [ ] Vote counts accurate (manual verification on devnet)
- [ ] State transitions trigger correctly (PROPOSED → APPROVED at 70%)
- [ ] No duplicate votes possible (tested with 100 vote attempts)

**Documentation References:**
- [03_SOLANA_PROGRAM_DESIGN.md](./03_SOLANA_PROGRAM_DESIGN.md) - ProposalManager architecture
- [07_ON_CHAIN_OFF_CHAIN_INTEGRATION.md](./07_ON_CHAIN_OFF_CHAIN_INTEGRATION.md) - ProposalManager workflow

**Time Estimate:** 7 days (complex state management + testing)

---

### Week 3: Admin Instructions

**Objective:** Implement admin controls for protocol management

**Deliverables:**
1. ✅ `update_global_config` instruction
   - Input: GlobalConfig PDA, new parameters (fees, thresholds, liquidity)
   - Validation: Only admin can call
   - Output: GlobalConfig updated with new values

2. ✅ `emergency_pause` instruction
   - Input: GlobalConfig PDA
   - Validation: Only admin can call
   - Effect: Set is_paused = true, block all trading instructions
   - Output: Protocol paused

3. ✅ `cancel_market` instruction
   - Input: MarketPDA, reason
   - Validation: Only admin can call, market in PROPOSED/APPROVED state
   - Effect: Refund all positions, set state to CANCELLED
   - Output: Market cancelled

4. ✅ Unit tests for all 3 instructions (15+ test cases)
   - Admin access control: Non-admin calls rejected
   - Parameter validation: Invalid fees rejected (>100%)
   - Pause behavior: Trading blocked when paused
   - Cancel refunds: All users refunded correctly

**Validation Checklist:**
- [ ] All 3 admin instructions implemented
- [ ] Access control prevents non-admin calls
- [ ] Emergency pause blocks trading (tested on devnet)
- [ ] Cancel market refunds all users correctly
- [ ] All 18 instructions now complete (7 trading + 4 resolution + 7 voting/admin)

**Documentation References:**
- [03_SOLANA_PROGRAM_DESIGN.md](./03_SOLANA_PROGRAM_DESIGN.md) - Instructions 17-18 + emergency_pause
- [CORE_LOGIC_INVARIANTS.md](./CORE_LOGIC_INVARIANTS.md) - Admin controls section

**Time Estimate:** 5 days (3 instructions + comprehensive testing)

---

### Phase 1 Quality Gate

**Must Pass Before Phase 2:**

✅ **Code Quality:**
- [ ] All 18 instructions implemented and tested
- [ ] Code coverage >= 90% for all voting/admin logic
- [ ] No compiler warnings or linter errors
- [ ] All 150+ tests passing (102 existing + 50 new)

✅ **Functional Validation:**
- [ ] Vote aggregation works correctly on devnet (10 test votes → approval)
- [ ] Dispute votes trigger outcome changes (20 test votes → overturn)
- [ ] Admin controls functional (pause tested, cancel tested)
- [ ] State transitions correct (PROPOSED → APPROVED at 70% threshold)

✅ **Blueprint Compliance:**
- [ ] 70% proposal approval threshold enforced (exact match to blueprint)
- [ ] 60% dispute support threshold enforced (exact match to blueprint)
- [ ] Vote weighting correct (1 vote per user for proposals, position-weighted for disputes)
- [ ] All formulas verified against CORE_LOGIC_INVARIANTS.md

✅ **Documentation:**
- [ ] All new instructions documented in code comments
- [ ] Integration test scenarios documented
- [ ] TODO_CHECKLIST.md updated with completed tasks

**If Gate Fails:** Pause Phase 2, fix issues, re-validate

---

## Phase 2: Backend Services (Weeks 4-7)

**Goal:** Build and deploy all 4 backend services

**Why Now:** Programs are feature-complete, backend can integrate with stable contracts.

**Success Criteria:** All services running on production infrastructure, 99% uptime, <200ms API response times.

### Week 4: Vote Aggregator Service

**Objective:** Off-chain vote collection + on-chain aggregation

**Deliverables:**
1. ✅ Vote collection API
   - Endpoints: `POST /votes/proposal`, `POST /votes/dispute`
   - Validation: Verify wallet signature, check user eligibility
   - Storage: Store votes in Redis (temporary cache)

2. ✅ Aggregation cron job
   - Schedule: Every 5 minutes
   - Logic: Count votes per proposal/market from Redis
   - Threshold check: If >= 70% (proposal) or >= 60% (dispute), call on-chain
   - Call: Invoke `aggregate_proposal_votes` or `aggregate_dispute_votes` instruction

3. ✅ On-chain vote recording
   - Transaction builder: Build signed transactions for aggregation
   - Error handling: Retry failed transactions (max 3 attempts)
   - Logging: Record all aggregation attempts (success/failure)

4. ✅ Redis caching
   - Schema: `votes:proposal:{id}` → [user_pubkey: vote_choice]
   - Expiry: 7 days (proposals expire if not approved)
   - Atomic operations: Prevent race conditions during counting

5. ✅ Integration tests
   - Scenario: Submit 100 votes via API → verify aggregation triggers
   - Scenario: 70 likes + 30 dislikes → proposal approved on-chain
   - Scenario: 40 support + 60 reject → dispute rejected, outcome unchanged

**Validation Checklist:**
- [ ] API accepts and validates votes correctly (100% signature validation)
- [ ] Cron job runs every 5 minutes without failures
- [ ] On-chain aggregation triggers at correct thresholds
- [ ] Redis data persists correctly (no data loss)
- [ ] Integration tests pass (100 votes → approval flow works)

**Tech Stack:**
- Node.js + Express (API server)
- Redis (vote cache)
- node-cron (job scheduler)
- @solana/web3.js (blockchain interaction)

**Time Estimate:** 7 days (complex workflow with multiple integrations)

---

### Week 5: Event Indexer + Database

**Objective:** Capture all program events and store in queryable database

**Deliverables:**
1. ✅ Deploy Supabase schema
   - 10 tables from [08_DATABASE_SCHEMA.md](./08_DATABASE_SCHEMA.md)
   - Tables: markets, positions, trades, votes, resolutions, disputes, users, proposals, events, analytics
   - Indexes: market_id, user_wallet, state, timestamp
   - RLS policies: Row-level security for user data

2. ✅ Event listener service
   - Listen to program events: MarketCreated, TradeExecuted, MarketResolved, etc.
   - Parse event data: Extract account info, amounts, timestamps
   - Store in Supabase: Insert events into respective tables
   - Real-time: <5 seconds from event to database storage

3. ✅ RLS policies implementation
   - Users can only read their own positions and votes
   - Public read access to markets, trades, resolutions
   - Admin-only write access to all tables

4. ✅ Indexed queries
   - Get markets by state: `SELECT * FROM markets WHERE state = 'ACTIVE'`
   - Get user positions: `SELECT * FROM positions WHERE user_wallet = $1`
   - Get trading history: `SELECT * FROM trades WHERE market_id = $1 ORDER BY timestamp DESC`
   - Performance: <200ms for all queries (tested with 10,000 records)

5. ✅ Migration scripts
   - Forward migration: Create schema from scratch
   - Rollback procedure: Drop tables in reverse dependency order
   - Seed data: Test markets and trades for development

**Validation Checklist:**
- [ ] Supabase schema deployed successfully (all 10 tables created)
- [ ] Event listener captures 100% of program events (<5s latency)
- [ ] RLS policies prevent unauthorized access (tested with 10 user accounts)
- [ ] Query performance <200ms (p95 measured with k6 load test)
- [ ] Migration scripts work (tested: deploy → rollback → redeploy)

**Tech Stack:**
- Supabase (PostgreSQL database + auth)
- Node.js event listener
- Helius API (reliable event webhooks)

**Time Estimate:** 7 days (database setup + event processing)

---

### Week 6: API Gateway

**Objective:** REST API + WebSocket server for frontend integration

**Deliverables:**
1. ✅ REST API endpoints
   - `GET /markets` - List all markets (paginated, filterable by state)
   - `GET /markets/:id` - Market details
   - `GET /positions/:wallet` - User positions
   - `GET /trades/:market_id` - Trading history
   - `GET /votes/:proposal_id` - Vote counts
   - Response time: <200ms (p95)

2. ✅ WebSocket server
   - Real-time price updates: Emit price changes when trades execute
   - State change notifications: Emit when market state transitions
   - Connection handling: Support 100+ concurrent connections
   - Heartbeat: 30s ping/pong to detect disconnects

3. ✅ API key authentication
   - Generate API keys for frontend clients
   - Validate keys on all requests
   - Rate limit by API key

4. ✅ Rate limiting
   - 100 requests/minute per IP address
   - 1000 requests/minute per API key
   - 429 Too Many Requests response when exceeded

5. ✅ Error handling + logging
   - Structured error responses: `{ error: "ErrorCode", message: "Human readable" }`
   - Request logging: Log all requests with timestamp, IP, endpoint
   - Error logging: Log all errors with stack traces
   - Monitoring: Integrate with Sentry for error tracking

**Validation Checklist:**
- [ ] All REST endpoints return correct data (tested against known markets)
- [ ] WebSocket stable with 100 connections (load tested with Artillery)
- [ ] Rate limiting works (tested by exceeding limits)
- [ ] API authentication blocks unauthorized requests
- [ ] Error logs captured in Sentry (tested by triggering errors)

**Tech Stack:**
- Express.js (REST API)
- Socket.io (WebSocket)
- Redis (rate limiting)
- Sentry (error tracking)

**Time Estimate:** 7 days (API + WebSocket + monitoring)

---

### Week 7: Market Monitor Service

**Objective:** Automated market state transitions

**Deliverables:**
1. ✅ Cron job for state transitions
   - Schedule: Every 1 minute
   - Check: Query all markets with transition_timestamp <= now()
   - Action: Call appropriate instruction (e.g., RESOLVING → FINALIZED after 48h)

2. ✅ Auto state transition logic
   - RESOLVING → FINALIZED: After 48-hour dispute window
   - DISPUTED → FINALIZED: After dispute vote completes
   - Edge cases: Handle markets stuck in transition

3. ✅ Alert system
   - Detect stuck markets: Markets that haven't transitioned in expected time
   - Alert channels: Email + Slack notifications
   - Escalation: Page on-call engineer if critical market stuck

4. ✅ Dead letter queue
   - Store failed transitions: If transaction fails, add to DLQ
   - Retry logic: Retry up to 3 times with exponential backoff
   - Manual review: Flag markets requiring manual intervention

5. ✅ Monitoring dashboard
   - Metrics: Successful transitions, failed transitions, stuck markets
   - Visualization: Grafana dashboard showing transition trends
   - Alerts: Alert if transition success rate <99%

**Validation Checklist:**
- [ ] Cron job runs every 1 minute (verified with logs)
- [ ] Markets transition automatically (tested with 10 test markets)
- [ ] Failed transactions retry correctly (simulated failures)
- [ ] Alerts fire for stuck markets (tested by creating stuck market)
- [ ] Success rate >= 99% (measured over 7 days)

**Tech Stack:**
- Node.js + node-cron
- BullMQ (job queue)
- Grafana (monitoring)
- PagerDuty (alerts)

**Time Estimate:** 7 days (cron + monitoring + alerting)

---

### Phase 2 Quality Gate

**Must Pass Before Phase 3:**

✅ **Service Availability:**
- [ ] All 4 services running on production infrastructure
- [ ] 99% uptime over 7-day validation period
- [ ] No service crashes or restarts
- [ ] Auto-restart on failure (PM2 or equivalent)

✅ **Performance:**
- [ ] API response time <200ms (p95)
- [ ] WebSocket stable with 100 concurrent connections
- [ ] Event indexing latency <5 seconds (event to database)
- [ ] Market monitor transitions 99% successful

✅ **Integration:**
- [ ] Vote aggregator calls on-chain instructions successfully
- [ ] Event indexer captures all program events
- [ ] API returns accurate data from database
- [ ] Market monitor triggers state transitions on time

✅ **Monitoring:**
- [ ] All services logged to centralized logging (e.g., Datadog)
- [ ] Grafana dashboards showing key metrics
- [ ] Alerts configured for critical failures
- [ ] Error tracking in Sentry

**If Gate Fails:** Fix service issues, stabilize infrastructure, re-validate

---

## Phase 3: Integration Testing (Weeks 8-9)

**Goal:** Comprehensive end-to-end testing of full system

**Why Now:** All components built, validate they work together correctly.

**Success Criteria:** 150+ tests passing, >90% coverage, no critical bugs found.

### Week 8: Full Lifecycle Tests

**Objective:** Test complete market lifecycle flows

**Deliverables:**
1. ✅ Happy path test (full lifecycle)
   - Step 1: User creates market proposal
   - Step 2: 10 users vote (7 like, 3 dislike)
   - Step 3: Vote aggregator triggers → market APPROVED
   - Step 4: Admin activates market → ACTIVE
   - Step 5: 20 users trade (buy YES/NO shares)
   - Step 6: Oracle submits resolution → RESOLVING
   - Step 7: 48h passes → market monitor transitions → FINALIZED
   - Step 8: Users claim winnings
   - Validation: All steps complete successfully, final balances correct

2. ✅ Multi-user test (concurrent trading)
   - Scenario: 10 users trade simultaneously on same market
   - Actions: 50 buy transactions, 30 sell transactions
   - Validation: No race conditions, all transactions succeed, final state consistent
   - Performance: All transactions complete in <30 seconds

3. ✅ Dispute flow test
   - Step 1: Market resolved to YES
   - Step 2: Users submit dispute → DISPUTED
   - Step 3: 20 users vote on dispute (12 support, 8 reject)
   - Step 4: Vote aggregator triggers → outcome overturned to NO
   - Step 5: Market transitions to FINALIZED
   - Validation: Outcome changed correctly, losers don't get paid

4. ✅ Edge cases
   - Zero trades: Market created, approved, resolved with 0 trades → creator refunded
   - Max slippage: User attempts trade with 1% slippage, actual 1.5% → transaction rejected
   - Minimum liquidity: Market with 1 SOL liquidity → trades work but high slippage
   - Double claim: User claims winnings twice → second claim rejected

5. ✅ Error recovery
   - Transaction failure: Simulate RPC failure → retry logic works
   - Network disconnect: Simulate network issue → service auto-reconnects
   - Invalid state: Attempt trade on FINALIZED market → rejected with clear error

**Test Suite Size:** 50+ integration tests

**Validation Checklist:**
- [ ] Happy path test passes (100% success rate over 10 runs)
- [ ] Multi-user test passes (no race conditions detected)
- [ ] Dispute flow test passes (outcome overturns correctly)
- [ ] All edge cases handled gracefully (no crashes)
- [ ] Error recovery works (services resilient to failures)

**Time Estimate:** 7 days (complex test scenarios + debugging)

---

### Week 9: Stress Testing + Bug Fixes

**Objective:** Validate system under load and fix all bugs

**Deliverables:**
1. ✅ Load test design
   - Scenario: 100 concurrent users
   - Actions: 1,000 total trades over 10 minutes
   - Metrics: Transaction time, success rate, error rate
   - Tools: k6 (load testing), Grafana (visualization)

2. ✅ Load test execution
   - Run 1: Baseline (validate setup works)
   - Run 2: Stress test (push to limits)
   - Run 3: Soak test (sustained load for 1 hour)
   - Analysis: Identify bottlenecks (RPC limits, database queries, etc.)

3. ✅ Performance benchmarks
   - Transaction time: <2 seconds (p95) from submit to confirmation
   - Transaction cost: <$0.01 per trade (measured on devnet)
   - API response time: <200ms (p95) under load
   - WebSocket latency: <100ms for price updates

4. ✅ Bug triaging
   - Categorize bugs: Critical (blocker), High (impacts functionality), Medium (UX issue), Low (cosmetic)
   - Prioritize fixes: Critical bugs fixed immediately, High bugs in this phase
   - Track in TODO_CHECKLIST.md: Each bug gets a checkbox

5. ✅ Bug fixes + regression testing
   - Fix all critical and high-priority bugs
   - Re-run all 150+ tests (unit + integration)
   - Validate no regressions introduced by fixes

**Validation Checklist:**
- [ ] Load test completes successfully (100 users, 1,000 trades)
- [ ] Performance benchmarks met (transaction time <2s, cost <$0.01)
- [ ] All critical bugs fixed and validated
- [ ] All 150+ tests passing (including new regression tests)
- [ ] System stable under sustained load (1-hour soak test)

**Time Estimate:** 7 days (load testing + bug fixing)

---

### Phase 3 Quality Gate

**Must Pass Before Phase 4:**

✅ **Test Coverage:**
- [ ] 150+ tests passing (102 unit + 50+ integration)
- [ ] Code coverage >=90% (measured with cargo tarpaulin)
- [ ] All critical paths tested (create, trade, resolve, claim)
- [ ] All error paths tested (invalid inputs, unauthorized access)

✅ **Performance:**
- [ ] Load test passes (100 users, 1,000 trades)
- [ ] Transaction time <2s (p95)
- [ ] Transaction cost <$0.01 (measured on devnet)
- [ ] API response time <200ms (p95)

✅ **Stability:**
- [ ] No critical bugs remaining
- [ ] All high-priority bugs fixed
- [ ] System stable under load (no crashes, no data loss)
- [ ] Services auto-recover from failures

✅ **Documentation:**
- [ ] All tests documented (purpose, setup, validation)
- [ ] Known issues documented (workarounds provided)
- [ ] Performance benchmarks recorded

**If Gate Fails:** Address stability issues, improve performance, re-test

---

## Phase 4: Frontend Integration (Weeks 10-12)

**Goal:** Connect UI to Solana programs and backend services

**Why Now:** Backend is stable and tested, frontend can integrate confidently.

**Success Criteria:** Users can complete full trading flow in <1 minute, all UI features functional.

### Week 10: Wallet + Transactions

**Objective:** Solana wallet integration and transaction signing

**Deliverables:**
1. ✅ Wallet adapter integration
   - Libraries: @solana/wallet-adapter-react, @solana/wallet-adapter-wallets
   - Supported wallets: Phantom, Solflare, Backpack
   - Connection UI: Wallet selection modal

2. ✅ Transaction signing flow
   - Build transactions: Use @solana/web3.js to build instructions
   - Request signature: Call wallet.signTransaction()
   - Send transaction: Use connection.sendTransaction()
   - Confirm: Wait for confirmation (confirmed commitment level)

3. ✅ Error handling
   - Rejected transactions: Show user-friendly error ("Transaction rejected by wallet")
   - Insufficient SOL: Show error + link to faucet/exchange
   - RPC errors: Retry with exponential backoff
   - Timeout: Show timeout error after 30 seconds

4. ✅ Connection state management
   - Detect wallet connection/disconnection
   - Persist connection preference (localStorage)
   - Auto-reconnect on page refresh
   - Show connection status in UI

5. ✅ Mobile responsive
   - Wallet selection works on mobile
   - Transaction confirmations show correctly
   - Deep links to wallet apps (Phantom, Solflare)

**Validation Checklist:**
- [ ] Users can connect all 3 supported wallets
- [ ] Transactions sign and send successfully
- [ ] Error messages clear and actionable
- [ ] Connection persists across page refreshes
- [ ] Mobile wallet connections work (tested on iOS + Android)

**Tech Stack:**
- @solana/wallet-adapter-react
- @solana/web3.js
- React Context (connection state)

**Time Estimate:** 7 days (wallet integration + error handling)

---

### Week 11: Trading Interface

**Objective:** Full trading UI with real-time data

**Deliverables:**
1. ✅ Market list page
   - Browse all markets (fetched from API)
   - Search by title/description
   - Filter by state (ACTIVE, RESOLVING, FINALIZED)
   - Sort by volume, end date, creation date
   - Pagination (20 markets per page)

2. ✅ Trading UI
   - Market details: Title, description, end date, current prices
   - Buy/Sell interface: Select YES/NO, enter amount, show estimated price
   - Slippage settings: Default 1%, user can adjust
   - Confirm dialog: Review transaction before signing
   - Transaction status: Pending → Success/Failed

3. ✅ Real-time price chart
   - WebSocket integration: Connect to API WebSocket
   - Price updates: Show YES/NO prices updating in real-time
   - Historical data: Show price chart (using Chart.js or similar)
   - Performance: Chart updates smoothly (60fps)

4. ✅ Position view
   - User holdings: Show YES shares, NO shares, liquidity tokens
   - Unrealized P&L: Calculate current value vs. cost basis
   - Claim button: If market finalized, show "Claim Winnings" button
   - Portfolio view: Show all positions across all markets

5. ✅ Voting interface
   - Proposal list: Show all PROPOSED markets
   - Vote buttons: Like/Dislike buttons
   - Vote confirmation: Show transaction signing dialog
   - Vote status: Show current vote counts (X likes, Y dislikes)

**Validation Checklist:**
- [ ] Users can browse and search markets
- [ ] Trading UI functional (buy/sell executes correctly)
- [ ] Real-time price updates work (WebSocket connected)
- [ ] Position view shows accurate data
- [ ] Voting interface allows like/dislike votes

**Tech Stack:**
- Next.js (React framework)
- TailwindCSS (styling)
- Chart.js (price charts)
- React Query (data fetching)

**Time Estimate:** 7 days (complex UI + real-time integration)

---

### Week 12: Claiming + Polish

**Objective:** Complete remaining user flows and polish UX

**Deliverables:**
1. ✅ Claim winnings UI
   - Detect claimable markets: Markets in FINALIZED state where user has winning shares
   - Claim button: Show prominent "Claim Winnings" button
   - Transaction: Build and sign claim_winnings transaction
   - Success state: Show claimed amount + confetti animation

2. ✅ Withdraw liquidity UI
   - Detect withdrawable liquidity: User has liquidity tokens, market FINALIZED
   - Withdraw button: Show "Withdraw Liquidity" button
   - Transaction: Build and sign withdraw_liquidity transaction
   - Success state: Show withdrawn amount

3. ✅ User profile
   - Trading history: List all trades by user (fetched from API)
   - Win rate: Calculate (winning trades / total trades)
   - Total volume: Sum of all trade amounts
   - Active positions: Show all current holdings

4. ✅ Notifications
   - Market resolved: Show notification when market user traded in resolves
   - Payout available: Show notification when user has claimable winnings
   - Notification system: Browser notifications + in-app toasts
   - Preferences: Allow user to enable/disable notifications

5. ✅ Help documentation + FAQ
   - How to trade: Step-by-step guide
   - How to create markets: Explain proposal process
   - How to vote: Explain voting mechanics
   - Fee structure: Show 10% fee breakdown (3% protocol, 2% creator, 5% stakers)
   - FAQ: Common questions (What is LMSR? How do disputes work? etc.)

**Validation Checklist:**
- [ ] Users can claim winnings successfully
- [ ] Liquidity withdrawal works correctly
- [ ] User profile shows accurate statistics
- [ ] Notifications fire when expected
- [ ] Help docs are clear and comprehensive

**Time Estimate:** 7 days (polish + documentation)

---

### Phase 4 Quality Gate

**Must Pass Before Phase 5:**

✅ **User Flows:**
- [ ] Users can connect wallet (<30 seconds)
- [ ] Users can complete trade (<1 minute from browse to confirmation)
- [ ] Users can vote on proposals (<30 seconds)
- [ ] Users can claim winnings (<30 seconds)
- [ ] Users can withdraw liquidity (<30 seconds)

✅ **UI Quality:**
- [ ] All pages mobile responsive (tested on iOS + Android)
- [ ] No UI bugs (tested by 5 beta users)
- [ ] Real-time updates work (prices, states, notifications)
- [ ] Error messages clear and actionable
- [ ] Loading states shown during transactions

✅ **Performance:**
- [ ] Page load time <3 seconds (measured with Lighthouse)
- [ ] Interactions feel responsive (<100ms feedback)
- [ ] WebSocket stable (no disconnects during 10-minute session)
- [ ] No memory leaks (tested with Chrome DevTools)

✅ **Accessibility:**
- [ ] Keyboard navigation works (all buttons tabbable)
- [ ] Screen reader compatible (tested with VoiceOver)
- [ ] Color contrast meets WCAG AA standards
- [ ] Focus indicators visible

**If Gate Fails:** Fix UI bugs, improve performance, re-test with users

---

## Phase 5: Security + Deployment (Weeks 13-14)

**Goal:** Security audit, mainnet deployment, launch

**Why Last:** Deploy with confidence after comprehensive validation.

**Success Criteria:** No critical security issues, successful mainnet deployment, 24h stable operation.

### Week 13: Security Audit

**Objective:** Comprehensive security review and remediation

**Deliverables:**
1. ✅ Self-audit checklist
   - Checked arithmetic: All math operations use `.checked_add()`, `.checked_mul()`, etc.
   - Account validation: All accounts validated (ownership, signer, PDAs)
   - Access control: All admin functions restricted to authorized users
   - State validation: All state transitions validated
   - Integer overflow/underflow: Impossible due to checked math
   - Reentrancy: State updated before external calls

2. ✅ Automated security tools
   - Soteria: Solana program analyzer (detects common vulnerabilities)
   - Sec3: Security scanner for Anchor programs
   - cargo-audit: Check dependencies for known vulnerabilities
   - Run all tools, generate reports

3. ✅ Vulnerability scanning
   - OWASP Top 10 review: Check for web vulnerabilities (XSS, CSRF, SQLi)
   - API security: Validate authentication, rate limiting, input validation
   - Frontend security: Check for exposed secrets, insecure dependencies

4. ✅ Penetration testing
   - Simulated attacks: Attempt to exploit system (unauthorized access, fund theft)
   - Fuzzing: Send random inputs to all endpoints
   - Load testing: Attempt to crash system with excessive requests
   - Document findings: Record all vulnerabilities found

5. ✅ Security report + remediation plan
   - Categorize findings: Critical, High, Medium, Low
   - Fix critical issues immediately
   - Plan remediation for High/Medium issues
   - Document Low issues for future sprints

**Validation Checklist:**
- [ ] Self-audit checklist 100% complete (all items checked)
- [ ] Automated tools run without critical findings
- [ ] All critical vulnerabilities fixed and validated
- [ ] High-severity vulnerabilities fixed or mitigated
- [ ] Remediation plan documented for remaining issues

**Time Estimate:** 7 days (thorough security review)

---

### Week 14: Mainnet Deployment

**Objective:** Production deployment and launch monitoring

**Timeline:**

**Day 1-2: Deploy to Devnet + Smoke Tests**
- Deploy programs: zmart-core, zmart-proposal to devnet
- Deploy backend services: All 4 services running on devnet infrastructure
- Deploy frontend: Staging frontend pointing to devnet
- Smoke tests: Quick validation (create market, trade, resolve)

**Day 3-4: Community Beta Testing**
- Recruit beta testers: 10 community members
- Beta test goals: 20 markets created, 100 trades executed
- Monitoring: Watch for errors, crashes, unexpected behavior
- Feedback collection: Survey beta testers for UX issues

**Day 5: Bug Fixes from Beta**
- Triage bugs: Critical bugs fixed immediately, others scheduled
- Regression testing: Re-run all 150+ tests
- Performance tuning: Address any bottlenecks found in beta
- Final validation: Ensure all beta issues resolved

**Day 6: Mainnet Deployment**
- Deploy programs: zmart-core, zmart-proposal to mainnet-beta
- Deploy backend services: Production infrastructure (AWS/GCP)
- Deploy frontend: Production frontend at zmartV0.69.com
- Final checks: Validate all services healthy, transactions working

**Day 7: Launch Monitoring + Incident Response**
- 24-hour watch: Team on-call to respond to issues
- Monitor metrics: Transaction success rate, error rate, uptime
- User support: Respond to user questions/issues in Discord
- Hotfix readiness: Prepared to deploy fixes if critical issues arise

**Launch Criteria (Must All Be True):**
- ✅ All 18 instructions deployed to mainnet
- ✅ All 4 backend services running (99% uptime on devnet)
- ✅ All 150+ tests passing
- ✅ Security audit complete (no critical issues)
- ✅ Frontend transactions working (beta tested by 10 users)
- ✅ 10+ successful test markets on devnet (full lifecycle)
- ✅ Monitoring and alerting configured
- ✅ Incident response plan documented

**Validation Checklist:**
- [ ] Programs deployed to mainnet successfully
- [ ] Backend services running on production infrastructure
- [ ] Frontend accessible at production URL
- [ ] First 10 mainnet markets created and traded
- [ ] No critical incidents in first 24 hours
- [ ] Transaction success rate >95%

**Time Estimate:** 7 days (phased deployment + monitoring)

---

### Phase 5 Quality Gate (Launch Gate)

**Must All Be True for Public Launch:**

✅ **Technical Readiness:**
- [ ] All 18 instructions deployed to mainnet
- [ ] All 4 backend services running (99% uptime)
- [ ] All 150+ tests passing
- [ ] Security audit complete (no critical issues, High issues mitigated)
- [ ] Performance benchmarks met (transaction time <2s, cost <$0.01)

✅ **User Readiness:**
- [ ] Frontend transactions working (validated by 10 beta users)
- [ ] User documentation complete (guides, FAQ, video tutorials)
- [ ] Support channels ready (Discord, email, help center)

✅ **Operational Readiness:**
- [ ] Monitoring and alerting configured (Grafana, PagerDuty)
- [ ] Incident response plan documented and tested
- [ ] Backup procedures in place (database backups, program upgrade process)
- [ ] Team trained on operations (on-call rotation, runbooks)

✅ **Business Readiness:**
- [ ] Launch announcement ready (blog post, social media, press release)
- [ ] Community engaged (Discord active, beta feedback positive)
- [ ] Metrics dashboard live (track markets, trades, volume, users)

**If Gate Fails:** Delay launch, address issues, re-validate

---

## Quality Gates

### Gate Process (Every Phase)

**Before Advancing to Next Phase:**

1. ✅ **Run All Tests**
   - Unit tests: `anchor test` (all passing)
   - Integration tests: `npm run test:integration` (all passing)
   - Coverage: `cargo tarpaulin` (>90%)

2. ✅ **Code Review**
   - Peer review: At least 1 team member reviews all new code
   - Automated linting: `cargo clippy` (no warnings)
   - Format check: `cargo fmt` (all files formatted)

3. ✅ **Documentation Update**
   - Code comments: All complex logic documented
   - README: Updated with new features
   - TODO_CHECKLIST.md: Completed tasks checked off

4. ✅ **Blueprint Compliance Verification**
   - Formulas: All math formulas match CORE_LOGIC_INVARIANTS.md
   - State machine: All states and transitions match spec
   - Fees: 10% fee with 3/2/5 split verified

5. ✅ **Deployment Validation**
   - Devnet deployment: Deploy to devnet and smoke test
   - Transaction testing: Execute 10 test transactions, all succeed
   - Monitoring: Check service health, all green

**Failure Protocol:**
- If any gate fails, pause next phase
- Fix issues immediately
- Re-run validation
- Document root cause and prevention

---

## Risk Mitigation

### High-Risk Areas + Mitigation Strategies

**Risk 1: Voting System Complexity**
- **Risk:** Vote aggregation logic complex, potential for bugs
- **Mitigation:** Prototype in Week 1, extensive unit tests (20+ cases), devnet validation with real votes
- **Contingency:** If aggregation fails, simplify to on-chain voting only (slower but safer)

**Risk 2: Backend Service Coordination**
- **Risk:** 4 services must coordinate correctly, risk of data inconsistency
- **Mitigation:** Integration tests in Week 8 (full lifecycle), monitoring dashboards, dead letter queue for failed jobs
- **Contingency:** Manual intervention procedures documented, admin tools to fix stuck markets

**Risk 3: Frontend Transaction Bugs**
- **Risk:** Wallet integration tricky, transaction errors confuse users
- **Mitigation:** Wallet testing in Week 10, comprehensive error handling, beta testing with 10 users
- **Contingency:** Fallback to CLI tools for power users if UI fails

**Risk 4: Performance Under Load**
- **Risk:** System may not handle 100 concurrent users
- **Mitigation:** Load testing in Week 9, performance benchmarks, auto-scaling infrastructure
- **Contingency:** Rate limiting, queue system for transactions during peak load

**Risk 5: Security Vulnerabilities**
- **Risk:** Exploits could drain funds
- **Mitigation:** Self-audit, automated tools (Soteria, Sec3), penetration testing, bug bounty program
- **Contingency:** Emergency pause instruction, incident response plan, insurance fund for losses

### Contingency Buffer

**Planned: 14 weeks**
**Buffer: +2 weeks**
**Worst Case: 16 weeks**

**How Buffer is Used:**
- Week 15: Additional testing if Phase 3 finds major bugs
- Week 16: Extended beta testing if community finds issues

---

## Success Metrics

### V1 Launch Success Criteria

**Technical Metrics:**
- ✅ 18/18 instructions implemented and tested
- ✅ 4/4 backend services running (99% uptime)
- ✅ 150+ tests passing (>90% coverage)
- ✅ Transaction time <2s (p95)
- ✅ Transaction cost <$0.01 (measured on mainnet)
- ✅ No critical security issues (audit complete)

**Business Metrics (First 30 Days):**
- ✅ 20+ markets created
- ✅ 200+ trades executed
- ✅ $5,000+ total volume
- ✅ 100+ unique users
- ✅ <3% transaction error rate

**User Experience Metrics:**
- ✅ Time to complete trade <1 minute
- ✅ User satisfaction score >4/5 (from beta testers)
- ✅ Support ticket volume <10/day
- ✅ Discord community active (50+ members, 10+ daily messages)

**Quality Metrics:**
- ✅ Code coverage >90%
- ✅ Zero critical bugs in production
- ✅ Uptime >99.5% (measured over 30 days)
- ✅ Mean time to resolution (MTTR) <4 hours for incidents

**Final Bulletproof Rating Target: 90/100**
- Current: 60/100 (60% complete, gaps identified)
- Target: 90/100 (all critical features, tested, secure, performant)

---

## Next Steps After Approval

**Week 1, Day 1 Actions:**

1. ✅ **Create Story File**
   - File: `docs/stories/STORY-VOTING-1.md`
   - Content: Full spec for `submit_proposal_vote` instruction
   - Template: Use [docs/stories/STORY-TEMPLATE.md](./stories/STORY-TEMPLATE.md)

2. ✅ **Set Up Development Branch**
   - Branch: `feature/voting-system`
   - Base: `main` branch
   - Command: `git checkout -b feature/voting-system`

3. ✅ **Begin Implementation (TDD Approach)**
   - Step 1: Write test for `submit_proposal_vote` (expected behavior)
   - Step 2: Implement instruction (make test pass)
   - Step 3: Write additional edge case tests
   - Step 4: Refactor for clarity
   - File: `programs/zmart-core/src/instructions/submit_proposal_vote.rs`

4. ✅ **Daily Standup Format**
   - Yesterday: What was completed (checked in TODO_CHECKLIST.md)
   - Today: What will be worked on (next unchecked task)
   - Blockers: Any issues preventing progress
   - Update TODO_CHECKLIST.md daily

**Timeline: 14 weeks to production-ready V1 mainnet launch**

---

**Ready to Proceed?**

This plan is evidence-based (built from actual codebase analysis), phased (critical features first), quality-gated (no phase advances without validation), and realistic (14 weeks, not 20).

Approve to begin Week 1, Day 1 implementation.
