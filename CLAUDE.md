# ZMART V0.69 - Claude Code Project Instructions

## 🔴 IMPORTANT: Current Project Status

**➡️ See [CURRENT_STATUS.md](./CURRENT_STATUS.md) for the single source of truth on project status**

**Overall Progress: 45% Complete** (Phase 3 of 5)

| Component | Status | Progress |
|-----------|--------|----------|
| Programs | ✅ DEPLOYED | 100% (zmart-core on devnet: 6s8b...rxw) |
| Backend Services | ✅ OPERATIONAL | 100% (4 PM2 services + market-monitor) |
| Security Audit | ✅ COMPLETE | 100% (12/12 findings resolved) |
| Integration Tests | 🔄 IN PROGRESS | 65% (E2E suite operational) |
| Frontend | 🟡 SCAFFOLDED | 15% (exists, not production-ready) |
| Production Deploy | 🔜 PLANNING | 20% |

**Timeline:** 12 weeks to production (Target: January 29, 2026)

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
- 4 PM2 services running on devnet (api-gateway, websocket-server, event-indexer, market-monitor)
- Clean project structure (/var/www/zmart only)
- Production-ready deployment automation

---

## 🎯 CURRENT FOCUS: Integration Testing & Validation

**Active Phase:** Week 2 of 12 - Integration Testing on Devnet
**Priority:** Comprehensive testing before frontend production work

**Active Tasks:**
- ✅ E2E test suite operational (8 test files, Playwright)
- ✅ Test data collection working (9 runs recorded)
- 🔄 Integration testing at 65% complete
- 🔄 Backend validation (4 services stable on VPS)
- 🔄 Security fixes verification (12/12 resolved)
- 📋 Performance benchmarking (pending)

**Why This Matters:**
- Validate all backend services before frontend integration
- Ensure program logic matches blueprint specifications
- Build confidence in core mechanics (LMSR, state transitions, fees)
- Catch issues early when they're cheaper to fix

**See:** [docs/testing/ON_CHAIN_TESTING_PROTOCOL.md](./docs/testing/ON_CHAIN_TESTING_PROTOCOL.md)

---

## 🚨 CRITICAL: Backend Development Workflow

**LOCAL DEVELOPMENT + VPS DEPLOYMENT (Recommended)**

### Development Workflow (Local → VPS)

**1. Develop Locally:**
```bash
cd backend
pnpm dev  # Starts on localhost:4000

# Test locally
curl http://localhost:4000/health
curl http://localhost:4000/api/markets
```

**2. Deploy to VPS:**
```bash
# From project root
./scripts/deploy-backend-to-vps.sh

# This script:
# - Builds locally (catches TypeScript errors early)
# - Syncs files to VPS via rsync
# - Rebuilds on VPS with VPS dependencies
# - Restarts PM2 services
# - Runs health checks
```

**3. Test on VPS:**
```bash
ssh kek "curl http://localhost:4000/health"
ssh kek "pm2 logs api-gateway --lines 20"
```

### Frontend Environment Switching

**Local Development (default):**
- Frontend `.env.local` points to `localhost:4000`
- Backend runs locally via `pnpm dev`

**VPS Testing:**
- Comment out localhost URLs in `.env.local`
- Uncomment VPS URLs (`185.202.236.71:4000`)
- Backend runs on VPS via PM2

### Direct VPS Development (Hotfixes Only)

For urgent production fixes:
```bash
# 1. SSH to VPS
ssh kek

# 2. Navigate to backend
cd /var/www/zmart/backend

# 3. Make changes
nano src/api/routes/markets.ts

# 4. Rebuild and restart
pnpm build && pm2 restart api-gateway

# 5. Check logs
pm2 logs api-gateway --lines 50
```

**Note:** Always sync changes back to local repository after VPS hotfixes.

See [docs/orientation/SERVICE_ARCHITECTURE.md](./docs/orientation/SERVICE_ARCHITECTURE.md) for complete VPS and service architecture documentation.

---

## Project Overview

**Project:** ZMART V0.69 - Solana Prediction Market Platform
**Blueprint Source:** KEKTECH 3.0 (EVM-based design)
**Mission:** Translate blueprint logic to optimized Solana implementation while preserving all core mechanics, incentives, and game theory

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              👤 USER LAYER                                   │
│                         (Browser / Wallet Integration)                       │
└────────────────────┬────────────────────────────────────┬───────────────────┘
                     │                                    │
                     ▼                                    ▼
    ┌────────────────────────────────┐      ┌──────────────────────────┐
    │      FRONTEND (Vercel)         │      │   WALLET INTEGRATION     │
    │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━  │      │  ━━━━━━━━━━━━━━━━━━━━  │
    │  • Next.js 14 (App Router)     │◄─────┤  • Solana Wallet Adapter │
    │  • React Components            │      │  • Phantom / Backpack    │
    │  • TanStack Query (state)      │      │  • Transaction Signing   │
    │  • WebSocket Client            │      └──────────────────────────┘
    │  • Real-time UI Updates        │                  │
    └────────────┬───────────────────┘                  │
                 │ HTTP/REST + WebSocket                │ Direct RPC
                 │                                       │
    ┌────────────▼───────────────────────────────────────▼───────────────┐
    │               BACKEND SERVICES (VPS: 185.202.236.71)                │
    │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
    │                                                                       │
    │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐            │
    │  │ API Gateway  │  │  WebSocket   │  │    Event     │            │
    │  │  (Express)   │  │   Server     │  │   Indexer    │            │
    │  │              │  │              │  │              │            │
    │  │ • REST API   │  │ • Real-time  │  │ • Listen to  │            │
    │  │ • Markets    │  │   updates    │  │   on-chain   │            │
    │  │ • Trading    │  │ • Price feed │  │   events     │            │
    │  │ • Positions  │  │ • Market     │  │ • Parse &    │            │
    │  │ • Votes      │  │   events     │  │   store      │            │
    │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘            │
    │         │                  │                  │                     │
    │         │    ┌─────────────▼──────────────────▼──────────┐        │
    │         │    │         Market Monitor                     │        │
    │         │    │  • Price calculations (LMSR)               │        │
    │         │    │  • State transition checks                 │        │
    │         │    │  • Auto-resolution triggers                │        │
    │         │    │  • Health monitoring                       │        │
    │         │    └────────────────────────────────────────────┘        │
    │         │                                                            │
    │         │    ┌────────────────────────────────────────────┐        │
    │         └───►│         Redis Cache / Pub-Sub              │        │
    │              │  • Session management                       │        │
    │              │  • Real-time event distribution             │        │
    │              │  • Rate limiting                            │        │
    │              └────────────────────────────────────────────┘        │
    └───────────────────────┬───────────────────┬───────────────────────┘
                            │                   │
                 ┌──────────▼─────────┐         │
                 │  Supabase Database │         │
                 │  (PostgreSQL)      │         │
                 │  ━━━━━━━━━━━━━━━  │         │
                 │  • Markets         │         │
                 │  • Positions       │         │
                 │  • Votes           │         │
                 │  • Transactions    │         │
                 │  • User profiles   │         │
                 │  • Activity logs   │         │
                 │                    │         │
                 │  • RLS Policies    │         │
                 │  • Real-time subs  │         │
                 └────────────────────┘         │
                                                 │ Helius RPC + Webhooks
                            ┌────────────────────▼────────────────────┐
                            │    SOLANA BLOCKCHAIN (Devnet)           │
                            │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
                            │                                          │
                            │  ┌────────────────────────────────────┐ │
                            │  │  zmart-core Program                │ │
                            │  │  (6s8bbbCS7oNYNnTUHgrPDHG4...)     │ │
                            │  │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │ │
                            │  │  • GlobalConfig Account            │ │
                            │  │  • MarketAccount (per market)      │ │
                            │  │  • UserPosition (per user/market)  │ │
                            │  │  • VoteRecord (per vote)           │ │
                            │  │                                    │ │
                            │  │  Instructions:                     │ │
                            │  │  • create_market                   │ │
                            │  │  • buy_shares / sell_shares        │ │
                            │  │  • submit_vote / aggregate_votes   │ │
                            │  │  • resolve_market / claim_payout   │ │
                            │  │  • dispute_resolution              │ │
                            │  └────────────────────────────────────┘ │
                            │                                          │
                            │  Connected via:                          │
                            │  • Helius RPC (api.mainnet-beta...)     │
                            │  • Helius Webhooks (events)             │
                            └──────────────────────────────────────────┘

DATA FLOW EXAMPLES:

  1. User Buys Shares:
     User → Frontend → Wallet signs TX → Solana Program → Event emitted →
     Event Indexer → Supabase → WebSocket → Frontend updates UI

  2. Market Resolution:
     Market Monitor → Checks time → Calls resolve_market IX → Solana Program →
     State change → Event Indexer → Supabase → WebSocket → All users notified

  3. Real-time Price Updates:
     Trade TX → Solana → Event Indexer → Market Monitor (LMSR calc) →
     Redis Pub/Sub → WebSocket Server → All connected clients get new price

KEY CONNECTIONS:
  ━━━ : Component boundary
  ─── : Data flow / API calls
  ▼   : Direction of data flow
  •   : Feature / Capability
```

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

**Historical Note**: Original "Option B" implementation strategy archived at [docs/archive/2025-11/OPTION_B_HISTORICAL.md](./docs/archive/2025-11/OPTION_B_HISTORICAL.md)

---

## Critical Documentation

### Foundation Documents (Read First)

1. **[CURRENT_STATUS.md](./CURRENT_STATUS.md)** ⭐ PROJECT STATUS
   - Single source of truth for project status
   - Real-time completion percentages
   - Critical blockers and next steps
   - **CHECK THIS FIRST for current state**

2. **[IMPLEMENTATION_PHASES.md](./docs/workflow/IMPLEMENTATION_PHASES.md)** ⭐ ROADMAP
   - 14-week implementation plan (Week-by-week roadmap)
   - Evidence-based (built from actual codebase analysis)
   - Quality gates and success criteria
   - **START HERE for development workflow**

3. **[TODO_CHECKLIST.md](./docs/workflow/TODO_CHECKLIST.md)** ⭐ TRACK PROGRESS
   - Daily task tracking aligned with IMPLEMENTATION_PHASES.md
   - Checkbox-driven progress monitoring
   - Current status of all tasks
   - Dependencies and blockers

4. **[CORE_LOGIC_INVARIANTS.md](./docs/specifications/CORE_LOGIC_INVARIANTS.md)** ⭐ BLUEPRINT COMPLIANCE
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

7. **[PROJECT_STRUCTURE.md](./docs/orientation/PROJECT_STRUCTURE.md)** ⭐ COMPLETE FILE TREE
   - Complete file tree of entire codebase with descriptions
   - What each file/directory is responsible for
   - Current status of all components
   - Quick reference by task type ("Where do I find...?")
   - **Use this to understand where everything is located**

8. **[ENVIRONMENT_GUIDE.md](./docs/orientation/ENVIRONMENT_GUIDE.md)** ⭐ CREDENTIALS & ENV VARS
   - Map of ALL environment files (`.env`, `.env.local`, `.env.example.safe`)
   - Complete reference for all 20+ environment variables
   - **CRITICAL:** Live credentials are in `backend/.env` (NOT `.env.local`)
   - Security best practices and troubleshooting
   - **Use this to understand which credentials go where**

9. **[SERVICE_ARCHITECTURE.md](./docs/orientation/SERVICE_ARCHITECTURE.md)** ⭐ HOW SERVICES CONNECT
   - Visual diagrams of complete system architecture
   - Data flow between services (Event Indexer → Supabase, etc.)
   - Service dependencies and communication patterns
   - User interaction flows (buy shares, vote, etc.)
   - **Use this to understand how all the pieces fit together**

10. **[CREDENTIALS_MAP.md](./docs/orientation/CREDENTIALS_MAP.md)** ⭐ CREDENTIAL USAGE
   - Matrix showing which service uses which credential
   - Security impact analysis (what happens if compromised)
   - Credential rotation procedures
   - Troubleshooting credential issues
   - **Use this when rotating credentials or debugging auth failures**

### Core Implementation Documents (Option B Complete Set)

11. **[03_SOLANA_PROGRAM_DESIGN.md](./docs/specifications/03_SOLANA_PROGRAM_DESIGN.md)** ⭐ CRITICAL
   - Complete Rust/Anchor program with 18 instructions
   - All account structures (GlobalConfig, MarketAccount, UserPosition, VoteRecord)
   - ProposalManager voting system
   - LMSR trading implementation
   - Resolution + dispute mechanics
   - Complete error codes and security constraints

12. **[05_LMSR_MATHEMATICS.md](./docs/specifications/05_LMSR_MATHEMATICS.md)** ⭐ CRITICAL
   - Production-ready fixed-point math (u64, 9 decimals)
   - Complete LMSR cost function
   - Binary search for share calculation
   - Numerical stability techniques
   - Worked examples and test cases

13. **[06_STATE_MANAGEMENT.md](./docs/specifications/06_STATE_MANAGEMENT.md)** ⭐ CRITICAL
   - 6-state FSM implementation (PROPOSED → FINALIZED)
   - State transition validation logic
   - Automatic transitions (time-based)
   - State-based access control
   - Rust implementation examples

14. **[07_ON_CHAIN_OFF_CHAIN_INTEGRATION.md](./docs/specifications/07_ON_CHAIN_OFF_CHAIN_INTEGRATION.md)** ⭐ CRITICAL
   - Hybrid architecture (on-chain state + off-chain aggregation)
   - ProposalManager vote aggregation workflow
   - Backend services (vote aggregator, market monitor, IPFS service)
   - Discussion system (Option B minimal scope)
   - Event indexing and API gateway
   - Security considerations

15. **[08_DATABASE_SCHEMA.md](./docs/specifications/08_DATABASE_SCHEMA.md)** ⭐ CRITICAL
   - Complete Supabase/PostgreSQL schema
   - All tables with RLS policies
   - Indexes for performance
   - Migration strategy

### Supporting Architecture Documents

16. **[EVM_TO_SOLANA_TRANSLATION.md](./docs/specifications/EVM_TO_SOLANA_TRANSLATION.md)**
    - Pattern-by-pattern mapping
    - Why each translation decision was made

17. **[SOLANA_PROGRAM_ARCHITECTURE.md](./docs/specifications/SOLANA_PROGRAM_ARCHITECTURE.md)**
    - High-level program structure
    - Account design, instruction flow

18. **[00_MASTER_INDEX.md](./docs/00_MASTER_INDEX.md)**
    - Complete navigation hub for all documentation
    - Quick start guides by role
    - Document relationships

---


## Development Workflow

**See**: [docs/workflow/IMPLEMENTATION_PHASES.md](./docs/workflow/IMPLEMENTATION_PHASES.md) - Complete 14-week implementation plan with week-by-week roadmap, quality gates, and success criteria.

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

### Program Development (Anchor)

```bash
# Build Solana programs
pnpm build              # or: anchor build

# Run Anchor tests
pnpm test               # or: anchor test

# Deploy to devnet
pnpm deploy:devnet      # or: anchor deploy --provider.cluster devnet

# Upgrade program
anchor upgrade <program-id> --provider.cluster devnet
```

### Backend Development (VPS)

**⚠️ IMPORTANT: All backend work happens on VPS via `ssh kek`**

```bash
# SSH to VPS
ssh kek

# Navigate to backend
cd /var/www/zmart/backend

# Make code changes
nano src/api/routes/markets.ts

# Rebuild and restart
pnpm build && pm2 restart api-gateway

# Check logs
pm2 logs api-gateway --lines 50

# View all services
pm2 list
```

### Frontend Development (Local)

```bash
# Start Next.js dev server
cd frontend && pnpm dev

# Build for production
cd frontend && pnpm build

# Generate Supabase types
cd frontend && pnpm types:generate

# Type checking
cd frontend && pnpm type-check
```

### E2E Testing (Playwright)

```bash
# Run all E2E tests on devnet
pnpm test:e2e:real

# Interactive Playwright UI mode
pnpm test:e2e:real:ui

# Specific test suites
pnpm test:e2e:real:trading      # Trading flows
pnpm test:e2e:real:validation   # Data validation
pnpm test:e2e:real:realtime     # WebSocket updates

# View test report
pnpm test:e2e:report
```

### Rust Unit Tests

```bash
# Run all Rust unit tests (136 tests)
cargo test

# Run specific test
cargo test test_lmsr_buy_cost

# Run with output
cargo test -- --nocapture
```

### Solana CLI

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


## Testing Strategy

**E2E Testing with Playwright** - All E2E tests run against actual Solana devnet with comprehensive data collection.

**Key Commands**:
```bash
pnpm test:e2e:real                # Run all E2E tests
pnpm test:e2e:real:ui             # Interactive Playwright UI
pnpm test:e2e:real:trading        # Trading flow tests
```

**Test Data Collection**: Comprehensive tracking of all on-chain transactions, state changes, and interactions for debugging and analysis.

**See Complete Protocol**: [docs/testing/ON_CHAIN_TESTING_PROTOCOL.md](./docs/testing/ON_CHAIN_TESTING_PROTOCOL.md) - Detailed testing protocol with data collection requirements, retention policies, and debugging workflows.

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
├── CLAUDE.md                           # Project instructions (this file)
├── README.md                           # User-facing documentation
├── CURRENT_STATUS.md                   # Project status (single source of truth)
├── programs/
│   └── zmart-core/                    # Main Anchor program (deployed to devnet)
├── backend/                            # Node.js services (runs on VPS)
│   ├── api/                           # API Gateway (PM2: api-gateway)
│   ├── event-indexer/                 # Event indexer (PM2: event-indexer)
│   ├── vote-aggregator/               # Vote aggregation component
│   ├── monitoring/                    # Market monitor (PM2: market-monitor)
│   ├── websocket/                     # WebSocket server (PM2: websocket-server)
│   ├── scripts/                       # Deployment scripts
│   └── tests/                         # Backend tests
├── frontend/                           # Next.js app (runs locally)
│   ├── app/                           # App router pages
│   ├── components/                    # React components
│   ├── hooks/                         # Custom hooks
│   ├── lib/                           # Libraries
│   └── stores/                        # State management
├── tests/
│   ├── e2e/                           # Playwright E2E tests
│   ├── integration/                   # Integration tests
│   └── unit/                          # Unit tests
├── test-data/                          # Test data collection system
│   └── runs/                          # Test run data (90-day retention)
├── docs/
│   ├── 00_MASTER_INDEX.md             # Navigation hub
│   ├── orientation/                   # PROJECT_STRUCTURE, SERVICE_ARCHITECTURE, etc.
│   ├── workflow/                      # IMPLEMENTATION_PHASES, TODO_CHECKLIST, etc.
│   ├── specifications/                # CORE_LOGIC_INVARIANTS, 03-08 docs, etc.
│   ├── testing/                       # ON_CHAIN_TESTING_PROTOCOL, etc.
│   ├── guides/                        # User guides
│   ├── stories/                       # Story files
│   └── archive/                       # Historical documentation
├── scripts/                            # Project-level scripts
│   ├── deploy-to-vps.sh               # VPS deployment
│   ├── health-check.sh                # Health checking
│   └── backup.sh                      # Backup script
└── supabase/
    └── migrations/                    # Database migrations
```

**See**: [docs/orientation/PROJECT_STRUCTURE.md](./docs/orientation/PROJECT_STRUCTURE.md) for complete file tree with descriptions.

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

*Last Updated: November 10, 2025*
*Project Status: 45% Complete (Phase 3 of 5) - Integration Testing & Validation Phase*

**Key Achievements (November 2025)**:
- ✅ Programs deployed (zmart-core on devnet: 6s8b...rxw, slot 420641215)
- ✅ Backend fully operational (4 PM2 services + market-monitor on VPS)
- ✅ Security audit complete (12/12 findings resolved)
- ✅ E2E test suite operational (8 tests with comprehensive data collection)
- ✅ VPS infrastructure restructured (devnet migration, documentation reorganized)
- ✅ Git-based deployment workflow established

**Current Focus: Integration Testing & Validation (65% complete)**

**Important Reminders**:
- All backend development happens on VPS (`ssh kek`) - NEVER run backend locally
- Use CLI/API for Supabase operations (not UI)
- See [docs/testing/ON_CHAIN_TESTING_PROTOCOL.md](./docs/testing/ON_CHAIN_TESTING_PROTOCOL.md) for comprehensive testing requirements