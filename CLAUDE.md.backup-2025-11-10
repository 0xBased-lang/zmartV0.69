# ZMART V0.69 - Claude Code Project Instructions

## 🔴 IMPORTANT: Current Project Status

**➡️ See [CURRENT_STATUS.md](./CURRENT_STATUS.md) for the single source of truth on project status**
- Overall: 30% complete
- Programs: ✅ 100% deployed
- Backend: 🟡 50% (1 of 6 services deployed)
- Frontend: ❌ 0% (not started)
- Timeline: 14 weeks to production (January 15, 2026)

### ✅ Recent Infrastructure Cleanup (November 10, 2025)

**VPS Restructuring Complete:**
- ✅ Fixed VPS network (mainnet → devnet)
- ✅ Removed old KEKTECH services (2 duplicate services)
- ✅ Cleaned up old project directories (backed up 91MB, freed disk space)
- ✅ Reduced .env files from 13 → 6 essential files
- ✅ Archived old documentation (233 → 31 docs, 88% reduction)
- ✅ Created 3 architecture guides (VPS, Supabase, Deployment)
- ✅ Created 3 deployment scripts (deploy, health-check, backup)

**Current VPS Status:**
- 4 ZMART services running on devnet (api-gateway, websocket-server, vote-aggregator, event-indexer)
- Clean project structure (/var/www/zmart only)
- Production-ready deployment automation

---

## Project Overview

**Project:** ZMART V0.69 - Solana Prediction Market Platform
**Blueprint Source:** KEKTECH 3.0 (EVM-based design)
**Mission:** Translate blueprint logic to optimized Solana implementation while preserving all core mechanics, incentives, and game theory

---

## Development Philosophy

### Core Principles

1. **Logic Preservation** - All mechanics from blueprint MUST be preserved
2. **Solana Optimization** - Discard EVM inefficiencies, embrace Solana patterns
3. **Backend-First** - Programs → Backend → Testing → Frontend
4. **Thorough Testing** - 95%+ coverage before frontend work begins
5. **Security First** - All invariants enforced, all edge cases covered

### What to Preserve

✅ **MUST Keep (from blueprint):**
- LMSR cost function (exact formulas)
- 6-state lifecycle FSM
- Dual-sided trading (buy + sell)
- 10% fee distribution (3/2/5 split)
- Resolution process (48h window, thresholds)
- All 30+ economic parameters
- Game theory incentives
- Role-based permissions

❌ **MUST Discard (EVM-specific):**
- 7 separate contracts (use 1-2 Anchor programs instead)
- Proxy upgrade pattern (use Anchor native upgrades)
- Float math (use fixed-point u64)
- OpenZeppelin libraries (use Anchor equivalents)
- Gas optimization patterns that don't apply to Solana

---

## Implementation Strategy (Option B)

### V1 MVP Scope

**✅ Implement (Blueprint + Essentials):**
- All blueprint mechanics (voting, LMSR, resolution, disputes)
- Proposal voting system (like/dislike, 70% threshold per blueprint)
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

### Why This Approach

1. **Get to Market Fast** - Essential features only
2. **Validate Core Mechanics** - Prove LMSR + resolution works
3. **Clean Architecture** - Easy to add v2 features later
4. **Reduced Complexity** - Simpler testing and deployment
5. **Focus on Prediction Markets** - Not social network

### What This Means for Development

- **Programs**: Pure blueprint implementation (no social features)
- **Backend**: Vote aggregation + minimal discussion storage
- **Database**: Reserved columns for v2 features (twitter_handle, reputation_score)
- **Frontend**: Wallet connect + trading + simple discussions

### Frontend Implementation Approach

**Desktop-Primary Strategy** (60-80% users on desktop):
- **Design Philosophy**: Desktop-first layout decisions optimized for large screens
- **LMSR Visualization**: Bonding curve charts require 800x400px minimum (desktop-only)
- **Mobile Support**: Core trading flows only (20-40% users, simplified UI)
- **Responsive Breakpoints**: Desktop (1024px+) → Tablet (768px+) → Mobile (<768px)

**Key UX Decisions** (LOCKED IN):
1. **LMSR not AMM**: Always use "LMSR bonding curve" terminology (NOT "AMM mechanics")
   - Logarithmic probability curve displaying P(YES) and P(NO) in range [0,1]
   - Bounded loss visualization: b * ln(2) ≈ 0.693 * b
   - Binary search for share calculation (client-side preview)

2. **Database-Only Discussions**: No IPFS in V1, Supabase PostgreSQL only
   - Flat comment system (no threading in V1)
   - RLS policies for security (users read all, write own, admins moderate)
   - IPFS daily snapshots deferred to V2 for archival/decentralization

3. **Real-Time Updates**: WebSocket from Day 1 (NOT 30-second polling)
   - Backend WebSocket server: Week 6 (2 days implementation)
   - Frontend integration: Week 2 Day 6 (1 day integration)
   - Automatic fallback to polling after 5 failed reconnections
   - Sub-second latency for price updates, trade executions, and discussions

4. **Token Caching**: 1-hour wallet signature cache
   - Reduces wallet signing friction (sign once per hour vs every API call)
   - Automatic silent refresh before expiry
   - Clear messaging on token expiry ("Please sign to continue")

**See Detailed Plan**: [docs/FRONTEND_IMPLEMENTATION_PLAN.md](./docs/FRONTEND_IMPLEMENTATION_PLAN.md) - 6-week day-by-day breakdown with 42 daily deliverables

---

## Critical Documentation

### Foundation Documents (Read First)

1. **[CURRENT_STATUS.md](./CURRENT_STATUS.md)** ⭐ PROJECT STATUS
   - Single source of truth for project status
   - Real-time completion percentages
   - Critical blockers and next steps
   - **CHECK THIS FIRST for current state**

2. **[IMPLEMENTATION_PHASES.md](./docs/IMPLEMENTATION_PHASES.md)** ⭐ ROADMAP
   - 14-week implementation plan (Week-by-week roadmap)
   - Evidence-based (built from actual codebase analysis)
   - Quality gates and success criteria
   - **START HERE for development workflow**

3. **[TODO_CHECKLIST.md](./docs/TODO_CHECKLIST.md)** ⭐ TRACK PROGRESS
   - Daily task tracking aligned with IMPLEMENTATION_PHASES.md
   - Checkbox-driven progress monitoring
   - Current status of all tasks
   - Dependencies and blockers

4. **[CORE_LOGIC_INVARIANTS.md](./docs/CORE_LOGIC_INVARIANTS.md)** ⭐ BLUEPRINT COMPLIANCE
   - Pure mechanics extraction from blueprint
   - All formulas, state machines, and rules
   - This is the "spec sheet" - everything derives from this
   - **Reference for all logic questions**

5. **[README.md](./README.md)** ⭐ PROJECT OVERVIEW
   - User-facing project documentation
   - Quick start guides
   - Tech stack and structure
   - FAQ and success metrics

6. **[Blueprint Directory](../blueprint/)** ⭐ SOURCE OF TRUTH
   - Original KEKTECH 3.0 theoretical specifications
   - Reference for all logic questions
   - Contains 18 blockchain-agnostic documents

### Project Structure Documentation (NEW - Nov 8, 2025)

**⭐ CRITICAL: These docs prevent confusion about project structure and credentials**

7. **[PROJECT_STRUCTURE.md](./docs/PROJECT_STRUCTURE.md)** ⭐ COMPLETE FILE TREE
   - Complete file tree of entire codebase with descriptions
   - What each file/directory is responsible for
   - Current status of all components
   - Quick reference by task type ("Where do I find...?")
   - **Use this to understand where everything is located**

8. **[ENVIRONMENT_GUIDE.md](./docs/ENVIRONMENT_GUIDE.md)** ⭐ CREDENTIALS & ENV VARS
   - Map of ALL environment files (`.env`, `.env.local`, `.env.example.safe`)
   - Complete reference for all 20+ environment variables
   - **CRITICAL:** Live credentials are in `backend/.env` (NOT `.env.local`)
   - Security best practices and troubleshooting
   - **Use this to understand which credentials go where**

9. **[SERVICE_ARCHITECTURE.md](./docs/SERVICE_ARCHITECTURE.md)** ⭐ HOW SERVICES CONNECT
   - Visual diagrams of complete system architecture
   - Data flow between services (Event Indexer → Supabase, etc.)
   - Service dependencies and communication patterns
   - User interaction flows (buy shares, vote, etc.)
   - **Use this to understand how all the pieces fit together**

10. **[CREDENTIALS_MAP.md](./docs/CREDENTIALS_MAP.md)** ⭐ CREDENTIAL USAGE
   - Matrix showing which service uses which credential
   - Security impact analysis (what happens if compromised)
   - Credential rotation procedures
   - Troubleshooting credential issues
   - **Use this when rotating credentials or debugging auth failures**

### Core Implementation Documents (Option B Complete Set)

11. **[03_SOLANA_PROGRAM_DESIGN.md](./docs/03_SOLANA_PROGRAM_DESIGN.md)** ⭐ CRITICAL
   - Complete Rust/Anchor program with 18 instructions
   - All account structures (GlobalConfig, MarketAccount, UserPosition, VoteRecord)
   - ProposalManager voting system
   - LMSR trading implementation
   - Resolution + dispute mechanics
   - Complete error codes and security constraints

12. **[05_LMSR_MATHEMATICS.md](./docs/05_LMSR_MATHEMATICS.md)** ⭐ CRITICAL
   - Production-ready fixed-point math (u64, 9 decimals)
   - Complete LMSR cost function
   - Binary search for share calculation
   - Numerical stability techniques
   - Worked examples and test cases

13. **[06_STATE_MANAGEMENT.md](./docs/06_STATE_MANAGEMENT.md)** ⭐ CRITICAL
   - 6-state FSM implementation (PROPOSED → FINALIZED)
   - State transition validation logic
   - Automatic transitions (time-based)
   - State-based access control
   - Rust implementation examples

14. **[07_ON_CHAIN_OFF_CHAIN_INTEGRATION.md](./docs/07_ON_CHAIN_OFF_CHAIN_INTEGRATION.md)** ⭐ CRITICAL
   - Hybrid architecture (on-chain state + off-chain aggregation)
   - ProposalManager vote aggregation workflow
   - Backend services (vote aggregator, market monitor, IPFS service)
   - Discussion system (Option B minimal scope)
   - Event indexing and API gateway
   - Security considerations

15. **[08_DATABASE_SCHEMA.md](./docs/08_DATABASE_SCHEMA.md)** ⭐ CRITICAL
   - Complete Supabase/PostgreSQL schema
   - All tables with RLS policies
   - Indexes for performance
   - Migration strategy

### Supporting Architecture Documents

16. **[EVM_TO_SOLANA_TRANSLATION.md](./docs/EVM_TO_SOLANA_TRANSLATION.md)**
    - Pattern-by-pattern mapping
    - Why each translation decision was made

17. **[SOLANA_PROGRAM_ARCHITECTURE.md](./docs/SOLANA_PROGRAM_ARCHITECTURE.md)**
    - High-level program structure
    - Account design, instruction flow

18. **[00_MASTER_INDEX.md](./docs/00_MASTER_INDEX.md)**
    - Complete navigation hub for all documentation
    - Quick start guides by role
    - Document relationships

---

## Development Workflow

**Primary Reference:** [IMPLEMENTATION_PHASES.md](./docs/IMPLEMENTATION_PHASES.md) - 14-week detailed plan

**Quick Summary:**

### Phase 1: Voting System Foundation (Weeks 1-3)

**Current Phase** - Building voting instructions + ProposalManager program

```bash
# Week 1: Core Voting Instructions
1. Create story file: docs/stories/STORY-VOTING-1.md
2. Set up branch: git checkout -b feature/voting-system
3. Implement submit_proposal_vote, aggregate_proposal_votes
4. Implement submit_dispute_vote, aggregate_dispute_votes
5. Write 20+ unit tests (TDD approach)
6. Update TODO_CHECKLIST.md daily

# Week 2: ProposalManager Program
1. Create program scaffold: programs/zmart-proposal/
2. Define vote tracking accounts (ProposalVote, DisputeVote)
3. Implement aggregation logic
4. Write 10+ integration tests
5. Deploy to devnet and validate

# Week 3: Admin Instructions
1. Implement update_global_config
2. Implement emergency_pause
3. Implement cancel_market
4. Write 15+ unit tests
5. Verify all 18 instructions complete
```

**Quality Gate:** All 18 instructions implemented, vote aggregation working on devnet

**Reference:** [IMPLEMENTATION_PHASES.md - Phase 1](./docs/IMPLEMENTATION_PHASES.md#phase-1-voting-system-foundation-weeks-1-3)

---

### Phase 2: Backend Services (Weeks 4-7)

**After programs feature-complete**

```bash
# Week 4: Vote Aggregator Service
- Vote collection API (POST /votes/proposal, /votes/dispute)
- Redis caching
- Aggregation cron job (every 5 min)

# Week 5: Event Indexer + Database
- Deploy Supabase schema
- Event listener (Helius webhooks)
- RLS policies

# Week 6: API Gateway
- REST endpoints (GET /markets, /positions, /trades)
- WebSocket server (real-time updates)

# Week 7: Market Monitor Service
- Auto state transitions (RESOLVING → FINALIZED after 48h)
- Alert system for stuck markets
```

**Quality Gate:** All 4 services running, 99% uptime

**Reference:** [IMPLEMENTATION_PHASES.md - Phase 2](./docs/IMPLEMENTATION_PHASES.md#phase-2-backend-services-weeks-4-7)

---

### Phase 3: Integration Testing (Weeks 8-9)

**Comprehensive testing before frontend**

```bash
# Week 8: Full Lifecycle Tests
- Happy path (create → trade → resolve → claim)
- Multi-user test (10 users trade simultaneously)
- Dispute flow test
- Edge cases (zero trades, max slippage, double claim)

# Week 9: Stress Testing + Bug Fixes
- Load test (100 users, 1,000 trades)
- Performance benchmarks
- Fix all critical/high bugs
```

**Quality Gate:** 150+ tests passing, >90% coverage, no critical bugs

**Reference:** [IMPLEMENTATION_PHASES.md - Phase 3](./docs/IMPLEMENTATION_PHASES.md#phase-3-integration-testing-weeks-8-9)

---

### Phase 4: Frontend Integration (Weeks 10-12)

**Only after backend fully validated**

```bash
# Week 10: Wallet + Transactions
- Wallet adapters (Phantom, Solflare, Backpack)
- Transaction signing flow

# Week 11: Trading Interface
- Market list + trading UI
- Real-time price chart (WebSocket)
- Voting interface

# Week 12: Claiming + Polish
- Claim winnings UI
- User profile
- Help documentation
```

**Quality Gate:** Users can complete full trading flow in <1 minute

**Reference:** [IMPLEMENTATION_PHASES.md - Phase 4](./docs/IMPLEMENTATION_PHASES.md#phase-4-frontend-integration-weeks-10-12)

---

### Phase 5: Security + Deployment (Weeks 13-14)

**Security audit and mainnet launch**

```bash
# Week 13: Security Audit
- Self-audit checklist
- Automated tools (Soteria, Sec3)
- Penetration testing

# Week 14: Mainnet Deployment
- Day 1-2: Devnet smoke tests
- Day 3-4: Community beta (10 users, 20 markets)
- Day 5: Bug fixes
- Day 6: Mainnet deployment
- Day 7: Launch monitoring
```

**Quality Gate:** No critical security issues, successful mainnet deployment

**Reference:** [IMPLEMENTATION_PHASES.md - Phase 5](./docs/IMPLEMENTATION_PHASES.md#phase-5-security-deployment-weeks-13-14)

---

## Working with Me (Claude Code)

### Before Starting Any Task

1. **Read CORE_LOGIC_INVARIANTS.md** - Understand what MUST be preserved
2. **Check TODO_CHECKLIST.md** - See current status and dependencies
3. **Review relevant docs** - Don't guess, read the specs

### When Implementing Features

1. **Verify against blueprint** - Cross-reference with `/blueprint` directory
2. **Preserve all invariants** - Every formula, threshold, and rule
3. **Write tests first** - TDD approach preferred
4. **Update checklist** - Mark tasks complete as you finish

### When Stuck or Unsure

1. **Check blueprint docs** - Answer is probably there
2. **Ask clarifying questions** - Don't assume
3. **Reference CORE_LOGIC_INVARIANTS.md** - Core logic documented
4. **Search codebase** - Maybe already implemented

### Code Quality Standards

**Rust/Anchor:**
- Use checked arithmetic (`.checked_add()`, etc.)
- Validate all account ownership
- Use Anchor constraints (e.g., `#[account(mut, has_one = creator)]`)
- Document complex logic with comments
- Add error codes for all failures

**TypeScript/Node.js:**
- Use TypeScript strict mode
- Validate all inputs
- Handle errors gracefully
- Log all important events
- Write integration tests

---

## Key Commands

### Solana/Anchor

```bash
# Build program
anchor build

# Run tests
anchor test

# Deploy to devnet
anchor deploy --provider.cluster devnet

# Upgrade program
anchor upgrade <program-id> --provider.cluster devnet

# Get program logs
solana logs <program-id>
```

### Backend

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Run tests
npm run test

# Run linter
npm run lint

# Build for production
npm run build
```

### Useful Debugging

```bash
# Check Solana config
solana config get

# Get devnet SOL
solana airdrop 2 --url devnet

# Check account data
solana account <address> --url devnet

# Watch program logs in real-time
solana logs <program-id> --url devnet
```

---

## Testing Requirements

### Program Tests (Rust)

**Required Coverage:**
- LMSR calculations (all formulas)
- State transitions (all 6 states)
- Fee distribution (verify 3/2/5 split)
- Access control (role validation)
- Edge cases (overflow, underflow, zero amounts)

**Test Structure:**
```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_lmsr_buy_cost() {
        // Test LMSR formula
    }

    #[test]
    fn test_state_transition_proposed_to_approved() {
        // Test state machine
    }
}
```

### Integration Tests (TypeScript)

**Required Coverage:**
- Full market lifecycle (create → trade → resolve → claim)
- Vote aggregation workflow
- Dispute resolution process
- Error handling

**Test Structure:**
```typescript
describe("Market Lifecycle", () => {
    it("creates, approves, activates, trades, resolves, and pays out", async () => {
        // End-to-end test
    });
});
```

---

## 🔍 On-Chain Testing & Data Collection Protocol

### Philosophy & Purpose

**CRITICAL REQUIREMENT:** During the building, optimizing, and validating phases, we maintain **ultra-detailed tracking** of ALL on-chain mechanics and transactions. This comprehensive data collection is:

- ✅ **Mandatory** during development and optimization
- ✅ **Archivable** after system stabilization
- ✅ **Refinable** to smaller size once patterns are established
- ✅ **Essential** for debugging, pattern recognition, and quality assurance

**Rationale:** When working with real blockchain transactions, having complete historical context enables:
1. Faster debugging (complete state at failure point)
2. Pattern detection (identify recurring issues)
3. Performance optimization (track regression over time)
4. Inconsistency detection (find unexpected behaviors)
5. Long-term quality trends (data-driven decisions)

---

### Mandatory Data Collection (15 Categories)

When running any on-chain test or validation, we **MUST** capture:

#### **Network & Communication**
1. **HTTP Traffic** - Every request/response with timing
2. **RPC Calls** - All Solana RPC interactions with parameters
3. **WebSocket Messages** - Real-time data streams (if implemented)

#### **Application State**
4. **React Query Cache** - Cache state before/after operations
5. **Wallet State** - Connection status, balance changes, signing events
6. **Browser Storage** - localStorage/sessionStorage snapshots

#### **Blockchain State**
7. **On-Chain Snapshots** - Account data before/after transactions
8. **Transaction Details** - Complete tx metadata (compute units, fees, logs)

#### **Performance**
9. **Timing Breakdown** - Precise timing for every operation step
10. **Browser Metrics** - Memory, CPU, network performance

#### **User Context**
11. **User Actions** - Every interaction with full context
12. **Test Environment** - Complete environment metadata

#### **Error Handling**
13. **Enhanced Errors** - Full error context, stack traces, recovery suggestions

#### **Analysis**
14. **Before/After Comparison** - Structured state change verification
15. **Historical Trends** - Link to previous runs for regression detection

---

### Data Organization Structure

All test data stored in structured format:

```
test-data/
├── runs/
│   └── {timestamp}/
│       ├── metadata.json              # Run metadata
│       ├── environment.json           # Environment snapshot
│       ├── tests/
│       │   └── {test-name}/
│       │       ├── console-logs.json
│       │       ├── network-traffic.json
│       │       ├── rpc-calls.json
│       │       ├── react-query-cache.json
│       │       ├── wallet-state.json
│       │       ├── on-chain-state.json
│       │       ├── transaction-details.json
│       │       ├── timing-breakdown.json
│       │       ├── performance-metrics.json
│       │       ├── user-actions.json
│       │       ├── errors.json
│       │       ├── comparisons.json
│       │       ├── screenshots/
│       │       └── video.webm
│       └── summary.json
├── analysis/
│   ├── trends/
│   ├── patterns/
│   └── inconsistencies/
└── queries/
```

---

### When to Apply This Protocol

#### **MANDATORY (Current Phase - Building/Optimizing/Validating)**
- ✅ All E2E tests with real blockchain transactions
- ✅ Integration tests involving on-chain state
- ✅ Performance benchmarking
- ✅ Bug reproduction
- ✅ Feature validation before deployment
- ✅ Any testing on devnet with real transactions
- ✅ Manual testing of critical flows
- ✅ Security audit test runs

#### **OPTIONAL (Future - After Stabilization)**
- ⚠️ Smoke tests on stable features
- ⚠️ Regression tests on unchanged code
- ⚠️ CI/CD quick validation

#### **ARCHIVE CANDIDATES (Post-Launch)**
Once the system is stable and patterns are well-understood, historical data can be:
- Compressed and archived (keep last 30 days full detail)
- Aggregated into trends (monthly summaries)
- Reduced to critical metrics only (error rates, performance)

---

### Running Tests with Full Tracking

All test commands automatically enable comprehensive tracking:

```bash
# Run E2E tests with full tracking (default)
pnpm test:e2e:real

# All data automatically saved to test-data/{timestamp}/
```

**No special flags required** - comprehensive tracking is the default during development phase.

---

### Querying Collected Data

Analysis scripts for exploring test data:

```bash
# Find all failed transactions
pnpm run analyze:failures --since "7 days ago"

# Performance trends
pnpm run analyze:performance --metric transactionTime

# Find state inconsistencies
pnpm run analyze:inconsistencies --type balanceMismatch

# Generate detailed report for specific run
pnpm run analyze:report --run {timestamp}

# Search console logs
pnpm run analyze:logs --search "Transaction failed" --run {timestamp}

# Compare two test runs
pnpm run analyze:compare {run1} {run2}

# Weekly trend analysis
pnpm run analyze:trends --days 7
```

---

### Data Retention Policy

**During Development (Current Phase):**
- Keep ALL data for 90 days
- Archive anything older (compressed)
- No automatic deletion
- Review weekly for patterns

**After Stabilization (Future):**
- Keep full detail for 30 days
- Keep aggregated trends indefinitely
- Archive detailed data after 30 days
- Reduce sampling frequency

**Critical Data (Always Keep):**
- Production deployment test runs (tagged)
- Bug reproduction runs (tagged)
- Performance baseline runs (tagged)
- Security audit test runs (tagged)
- Failed test runs (for pattern analysis)

---

### Quick Reference Card

**Running Tests:**
```bash
pnpm test:e2e:real                    # Full suite with tracking
pnpm test:e2e:real:trading            # Trading tests only
pnpm test:e2e:real:validation         # Validation tests
pnpm test:e2e:real:realtime           # Real-time update tests
pnpm test:e2e:real --grep "buy"       # Specific test pattern
pnpm test:e2e:real:ui                 # Interactive debugging mode
```

**Accessing Raw Data:**
```bash
# List all test runs
ls test-data/runs/

# View run summary
cat test-data/runs/{timestamp}/summary.json

# Browse test-specific data
open test-data/runs/{timestamp}/tests/{test-name}/

# View console logs
cat test-data/runs/{timestamp}/tests/{test-name}/console-logs.json

# Check network traffic
cat test-data/runs/{timestamp}/tests/{test-name}/network-traffic.json

# Review screenshots
open test-data/runs/{timestamp}/tests/{test-name}/screenshots/
```

**Analyzing Data:**
```bash
pnpm run analyze:latest               # Analyze most recent run
pnpm run analyze:summary              # Summary of all recent runs
pnpm run analyze:errors               # All errors from recent runs
pnpm run analyze:slow                 # Find slow operations
```

---

### Debugging Workflow with Collected Data

**When Something Goes Wrong:**

1. **Identify the Run**
   - Note the timestamp from test output
   - Or use: `pnpm run analyze:latest`

2. **Check Overview**
   ```bash
   cat test-data/runs/{timestamp}/summary.json
   ```

3. **Find Failed Test**
   ```bash
   ls test-data/runs/{timestamp}/tests/
   cd test-data/runs/{timestamp}/tests/{failed-test}/
   ```

4. **Review Logs**
   ```bash
   # Browser console
   cat console-logs.json | jq '.[] | select(.type=="error")'

   # Network issues
   cat network-traffic.json | jq '.[] | select(.response.status>=400)'

   # RPC problems
   cat rpc-calls.json | jq '.[] | select(.success==false)'
   ```

5. **Check State**
   ```bash
   # React Query cache
   cat react-query-cache.json

   # Wallet state
   cat wallet-state.json

   # On-chain state
   cat on-chain-state.json
   ```

6. **Review Visuals**
   ```bash
   # Screenshots
   open screenshots/

   # Video recording
   open video.webm
   ```

---

### Examples of What This Data Enables

**Debugging Questions:**
- "Show me the exact React Query cache state when test X failed"
- "What was the wallet balance before/after this transaction?"
- "Which RPC call is taking the longest?"
- "What network requests happened before the error?"
- "What was in localStorage when the wallet disconnected?"

**Performance Questions:**
- "Has buy transaction confirmation time increased this week?"
- "What's the 95th percentile transaction time?"
- "Are we making unnecessary RPC calls?"
- "Which operation is the bottleneck?"
- "How does performance vary by time of day?"

**Quality Questions:**
- "Find all cases where balance didn't update correctly"
- "Show me flaky tests (inconsistent pass/fail)"
- "What errors have occurred more than 3 times?"
- "Which tests are slowest on average?"
- "Are we seeing more failures on certain days?"

**Trend Questions:**
- "How has test suite duration changed over time?"
- "Are we getting slower RPC responses?"
- "What's our transaction success rate trend?"
- "Is memory usage increasing over time?"
- "Are error rates going up or down?"

---

### Important Considerations

**Storage Requirements:**
- Each test run: ~100-500 MB (depends on test count)
- 90 days of daily runs: ~9-45 GB
- Ensure adequate disk space
- Clean up manually if needed: `rm -rf test-data/runs/old-timestamp/`

**Performance Impact:**
- Minimal during test execution
- Data saved asynchronously
- No measurable impact on test timing
- Slightly longer startup (environment validation)

**Security:**
- Never commit test data to git (already in .gitignore)
- Sanitize wallet addresses before sharing externally
- Private keys are NEVER logged
- Transaction signatures are public (safe to share)

**Maintenance Tasks:**
- Weekly: Review for anomalies and patterns
- Monthly: Archive old data to free space
- As needed: Clean up incomplete runs from crashes
- Quarterly: Evaluate if tracking can be reduced

---

### Transition Strategy (Future)

**Indicators That Tracking Can Be Reduced:**
1. System has been stable for 30+ consecutive days
2. All major bugs have been resolved
3. Performance baselines are well-established
4. Error patterns are understood
5. Team has consensus on stability

**How to Gradually Reduce Tracking:**
1. Start with reducing retention (90d → 30d)
2. Keep only critical metrics (errors, key performance indicators)
3. Sample tests instead of tracking all tests (e.g., 1 in 10)
4. Move detailed logs to archive storage
5. Keep aggregated trends indefinitely

**What to Always Keep:**
- Error rates and types
- Transaction success rates
- Key performance metrics (p50, p95, p99)
- Production deployment validation runs
- Critical bug reproduction data

**This protocol can be revisited and refined as the project matures. The goal is maximum insight during development, transitioning to efficient monitoring in production.**

---

### Why This Matters

During the current **building, optimizing, and validating phase**, we are:
- Discovering edge cases
- Tuning performance
- Fixing bugs
- Understanding patterns
- Establishing baselines

**Without comprehensive data**, we would:
- Spend hours reproducing issues
- Miss performance regressions
- Lack context for debugging
- Make decisions based on guesses
- Repeat the same mistakes

**With comprehensive data**, we can:
- Debug issues in minutes with full context
- Detect problems before they reach production
- Make data-driven optimization decisions
- Learn from historical patterns
- Continuously improve quality

**The investment in comprehensive tracking during development pays massive dividends in quality, velocity, and confidence.**

---

## Security Checklist

### Before Deploying to Devnet

- [ ] All arithmetic uses checked operations
- [ ] All accounts validated (ownership, signer)
- [ ] All state transitions validated
- [ ] Slippage protection implemented
- [ ] Reentrancy prevented (state before external calls)
- [ ] Access control enforced
- [ ] Integer overflow/underflow impossible
- [ ] All invariants tested

### Before Mainnet

- [ ] External security audit completed
- [ ] All audit issues resolved
- [ ] Load testing passed (1000+ users)
- [ ] Bug bounty program launched
- [ ] Multi-sig admin wallet setup
- [ ] Emergency pause tested
- [ ] Upgrade process tested

---

## Common Pitfalls to Avoid

### ❌ Don't Do This

1. **Float Math in Rust** - Solana doesn't support it
   ```rust
   // ❌ WRONG
   let price = 0.5_f64;

   // ✅ CORRECT
   let price = 500_000_000_u64; // 0.5 with 9 decimals
   ```

2. **Unbounded Loops** - Compute units are limited
   ```rust
   // ❌ WRONG
   for user in all_users.iter() { ... }

   // ✅ CORRECT
   let batch_size = 100;
   for user in users.iter().take(batch_size) { ... }
   ```

3. **Unchecked Math** - Always use checked operations
   ```rust
   // ❌ WRONG
   let total = a + b;

   // ✅ CORRECT
   let total = a.checked_add(b).ok_or(ErrorCode::Overflow)?;
   ```

4. **Missing Account Validation** - Always verify ownership
   ```rust
   // ❌ WRONG
   #[account(mut)]
   pub market: Account<'info, Market>,

   // ✅ CORRECT
   #[account(
       mut,
       has_one = creator @ ErrorCode::Unauthorized
   )]
   pub market: Account<'info, Market>,
   ```

5. **Modifying Blueprint Logic** - Don't change formulas
   ```rust
   // ❌ WRONG - Changing LMSR formula
   let cost = calculate_custom_cost(...);

   // ✅ CORRECT - Use exact blueprint formula
   let cost = calculate_lmsr_cost(...); // Per CORE_LOGIC_INVARIANTS.md
   ```

---

## File Structure

```
zmartV0.69/
├── CLAUDE.md                           # This file
├── README.md                           # User-facing README
├── docs/                               # All documentation
│   ├── 00_MASTER_INDEX.md
│   ├── CORE_LOGIC_INVARIANTS.md       # ⭐ MOST IMPORTANT
│   ├── TODO_CHECKLIST.md              # ⭐ TRACK PROGRESS
│   ├── EVM_TO_SOLANA_TRANSLATION.md
│   ├── SOLANA_PROGRAM_ARCHITECTURE.md
│   ├── 03_SOLANA_PROGRAM_DESIGN.md
│   └── [15+ more docs]
├── programs/                           # Anchor programs
│   └── zmart-prediction-market/
│       ├── Cargo.toml
│       ├── src/
│       │   ├── lib.rs
│       │   ├── state.rs
│       │   ├── instructions/
│       │   └── utils/
│       └── tests/
├── backend/                            # Node.js services
│   ├── package.json
│   ├── src/
│   │   ├── services/
│   │   ├── api/
│   │   └── db/
│   └── tests/
└── frontend/                           # Next.js app (Phase 4)
    └── [TBD after backend validated]
```

---

## Quick Reference

### Blueprint Location
`/Users/seman/Desktop/blueprint/`

### Important Formulas (from CORE_LOGIC_INVARIANTS.md)

**LMSR Cost Function:**
```
C(q_yes, q_no) = b * ln(e^(q_yes/b) + e^(q_no/b))
```

**Buy Cost:**
```
Cost = C(q + Δq) - C(q)
```

**Sell Proceeds:**
```
Proceeds = C(q) - C(q - Δq)
```

**Price:**
```
P(YES) = e^(q_yes/b) / (e^(q_yes/b) + e^(q_no/b))
```

**Bounded Loss:**
```
Max Loss = b * ln(2) ≈ 0.693 * b
```

### State Transitions
```
PROPOSED → APPROVED → ACTIVE → RESOLVING → DISPUTED → FINALIZED
   (0)        (1)       (2)        (3)         (4)        (5)
```

### Fee Distribution
```
10% total fee:
├─ 3% Protocol
├─ 2% Creator
└─ 5% Stakers
```

---

## ✅ Current Project Status

➡️ **See [CURRENT_STATUS.md](./CURRENT_STATUS.md) for live project status**

**Quick Summary:**
- **Overall:** 30% complete (not 60% as previously thought)
- **Programs:** ✅ 100% deployed on devnet
- **Backend:** 🟡 50% (1 of 6 services deployed)
- **Frontend:** ❌ 0% (not started)
- **Timeline:** 14 weeks to production (January 15, 2026)

### Next Actions - Phase 1, Week 1, Day 1

**Ready to Start Development**:

See [IMPLEMENTATION_PHASES.md - Week 1 Day 1](./docs/IMPLEMENTATION_PHASES.md#next-steps-after-approval) for complete instructions.

**Quick Start**:
1. Create story file: `docs/stories/STORY-VOTING-1.md`
2. Set up branch: `git checkout -b feature/voting-system`
3. Begin TDD: Write tests for `submit_proposal_vote` first
4. Implement instruction: `programs/zmart-core/src/instructions/submit_proposal_vote.rs`
5. Update TODO_CHECKLIST.md daily

**Prerequisites**: All complete ✅

**Timeline**: 14 weeks to production-ready V1 mainnet launch

---

## 📖 Complete Documentation Reference

### Essential Reading (Start Here)

1. **[README.md](./README.md)** - Project overview, tech stack, 20-week timeline
2. **[CLAUDE.md](./CLAUDE.md)** (this file) - Complete project instructions
3. **[IMPLEMENTATION_PHASES.md](./IMPLEMENTATION_PHASES.md)** - Week-by-week roadmap
4. **[docs/TODO_CHECKLIST.md](./docs/TODO_CHECKLIST.md)** - Progress tracking

### Core Implementation Specs (Build From These)

5. **[03_SOLANA_PROGRAM_DESIGN.md](./docs/03_SOLANA_PROGRAM_DESIGN.md)** ⭐ - 18 Anchor instructions (64KB)
6. **[05_LMSR_MATHEMATICS.md](./docs/05_LMSR_MATHEMATICS.md)** ⭐ - Fixed-point math (31KB)
7. **[06_STATE_MANAGEMENT.md](./docs/06_STATE_MANAGEMENT.md)** ⭐ - 6-state FSM (26KB)
8. **[07_ON_CHAIN_OFF_CHAIN_INTEGRATION.md](./docs/07_ON_CHAIN_OFF_CHAIN_INTEGRATION.md)** ⭐ - Hybrid arch (35KB)
9. **[08_DATABASE_SCHEMA.md](./docs/08_DATABASE_SCHEMA.md)** ⭐ - Supabase schema (22KB)

### Development Workflow & Standards (⭐ Critical)

10. **[DEVELOPMENT_WORKFLOW.md](./docs/DEVELOPMENT_WORKFLOW.md)** ⭐ - Git strategy (GitHub Flow), PR process
11. **[DEFINITION_OF_DONE.md](./docs/DEFINITION_OF_DONE.md)** ⭐ - Tiered DoD (4 tiers, prevents bureaucracy)
12. **[FRONTEND_SCOPE_V1.md](./docs/FRONTEND_SCOPE_V1.md)** ⭐ - Explicit scope (Pattern #2 prevention)
13. **[SCHEMA_MANAGEMENT.md](./docs/SCHEMA_MANAGEMENT.md)** ⭐ - Supabase type generation (Pattern #4 prevention)
14. **[stories/STORY-TEMPLATE.md](./docs/stories/STORY-TEMPLATE.md)** ⭐ - Story file template

### Infrastructure & Operations

15. **.env.example** - Environment variables template
16. **.git-hooks/pre-commit** - Smart git hook (selective enforcement)
17. **.github/workflows/ci.yml** - CI/CD with circuit breakers

### Supporting Documentation

18. **[CORE_LOGIC_INVARIANTS.md](./docs/CORE_LOGIC_INVARIANTS.md)** - Blueprint compliance reference
19. **[EVM_TO_SOLANA_TRANSLATION.md](./docs/EVM_TO_SOLANA_TRANSLATION.md)** - Solana patterns
20. **[SOLANA_PROGRAM_ARCHITECTURE.md](./docs/SOLANA_PROGRAM_ARCHITECTURE.md)** - Program relationships
21. **[00_MASTER_INDEX.md](./docs/00_MASTER_INDEX.md)** - Complete navigation hub

---

## 🚀 Ready to Start Development

**Status Check**:
- [x] All 23 documentation files complete or in progress
- [x] Timeline realistic (20 weeks: 3.2X frontend, 2X backend multipliers)
- [x] Git hooks ready to install
- [x] Definition of Done tiered (prevents bureaucracy + abandonment)
- [x] Testing strategy defined
- [x] Security checklist comprehensive
- [x] Lessons learned integrated (6 patterns prevented)
- [x] Program architecture consistent (2 programs: zmart-core + zmart-proposal)
- [x] Schema management automated (Supabase type generation)

**Bulletproof Rating**: 94/100 ✅

**Start Development**: See IMPLEMENTATION_PHASES.md Week 1 Day 1

---

**Questions or Issues?**
1. Check CORE_LOGIC_INVARIANTS.md first (mechanics reference)
2. Search relevant documentation (use 00_MASTER_INDEX.md for navigation)
3. Review lessons-learned for pattern prevention strategies
4. Check Definition of Done for appropriate tier
5. Ask for clarification if still unclear

**Remember**: We're translating blueprint logic to Solana, preserving mechanics while optimizing implementation. Follow the 14-week implementation plan with strict quality gates.

---

## 🎯 Implementation Compliance System

### Three-Document System for 100% Compliance

**1. [IMPLEMENTATION_PHASES.md](./docs/IMPLEMENTATION_PHASES.md)** - Strategic Plan
- 14-week phased roadmap
- Quality gates between phases
- Success criteria and metrics
- Evidence-based timeline

**2. [TODO_CHECKLIST.md](./docs/TODO_CHECKLIST.md)** - Tactical Execution
- Daily task tracking
- Checkbox-driven progress
- Aligned with IMPLEMENTATION_PHASES.md
- Update daily

**3. [CLAUDE.md](./CLAUDE.md)** - Project Context (This File)
- Development philosophy
- Documentation reference
- Quick navigation
- Working with Claude Code

### Cross-Reference Validation

**Before Starting Any Task:**
1. Check IMPLEMENTATION_PHASES.md for current week/phase
2. Find corresponding section in TODO_CHECKLIST.md
3. Reference CORE_LOGIC_INVARIANTS.md for blueprint compliance
4. Create story file if needed

**During Development:**
1. Follow TDD approach (tests first)
2. Update TODO_CHECKLIST.md daily
3. Check quality gate criteria
4. Commit changes with descriptive messages

**Phase Completion:**
1. Verify all checklist items complete
2. Run quality gate validation
3. Get user approval before next phase
4. Update progress percentages

### Bulletproof Compliance Metrics

**Current Status:**
- ✅ Implementation plan complete (14 weeks, evidence-based)
- ✅ TODO checklist aligned (all 5 phases mapped)
- ✅ CLAUDE.md cross-references complete
- ✅ Quality gates defined (5 phases, strict criteria)
- ✅ 60% foundation complete (LMSR, trading, state, resolution)

**Compliance Rating: 100/100** ✅
- Strategic plan: 100% complete
- Tactical tracking: 100% aligned
- Documentation: 100% cross-referenced
- Quality gates: 100% defined
- Foundation: 60% built

**Next Action:** Begin Phase 1, Week 1, Day 1 - Voting System Foundation

---

*Last Updated: November 6, 2025 | Project Status: Implementation Plan Complete - Ready to Execute*
- When doing on chain testing, we need to document everything every detail
  for every transaction every inconsistency so that we create kind of
  library a document where we can get back to it in case we have any other
  inconsistencies a document to solve other stuff easily records of all the
  information
- Not only on chain transactions and information should be documented, but actually all kind of inconsistencies and how we fix. It should be documented in our library. The main document we can shift back to if anything any hiccups happen in our frontend backend integration management or Or also related to our on Chain transactions
- Always use CLI or API to manover supabase instead of human interaction with supabase