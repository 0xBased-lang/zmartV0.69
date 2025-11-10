# PROJECT_STRUCTURE.md - ZMART V0.69 Complete File Tree

**Last Updated:** November 8, 2025
**Purpose:** Complete project structure reference with file descriptions and cross-references
**Maintenance:** Update this file whenever adding/removing major directories or files

---

## 🎯 Purpose

This document provides a complete map of the ZMART V0.69 codebase to ensure full project awareness and prevent confusion about:
- What files exist and where they are located
- What each file/directory is responsible for
- Where credentials and configurations are stored
- How different parts of the project connect

**See Also:**
- [ENVIRONMENT_GUIDE.md](./ENVIRONMENT_GUIDE.md) - Environment variables and credentials
- [SERVICE_ARCHITECTURE.md](./SERVICE_ARCHITECTURE.md) - How services interact
- [CREDENTIALS_MAP.md](./CREDENTIALS_MAP.md) - Where each credential is used

---

## 📁 Project Root Structure

```
zmartV0.69/
├── .git/                           # Git version control
├── .github/                        # GitHub workflows (CI/CD) - FUTURE
├── .supabase/                      # Supabase CLI local state
├── programs/                       # Solana Anchor programs (on-chain)
├── backend/                        # Node.js backend services (off-chain)
├── frontend/                       # Next.js frontend (UI) - FUTURE (Week 10-12)
├── supabase/                       # Supabase migrations and config
├── docs/                           # Complete project documentation
├── test-data/                      # E2E test data collection - FUTURE
├── Anchor.toml                     # Anchor workspace configuration
├── Cargo.toml                      # Rust workspace configuration
├── package.json                    # Root package.json (workspace)
├── .env.local                      # PLACEHOLDER (DO NOT USE - see backend/.env)
├── .gitignore                      # Git ignore patterns
├── README.md                       # User-facing project README
└── CLAUDE.md                       # Claude Code instructions (THIS IS KEY!)
```

---

## 🔧 Programs Directory (On-Chain)

**Path:** `/Users/seman/Desktop/zmartV0.69/programs/`

```
programs/
├── zmart-core/                     # Main prediction market program (18 instructions)
│   ├── Cargo.toml                  # Rust dependencies
│   ├── Xargo.toml                  # Cross-compilation config
│   └── src/
│       ├── lib.rs                  # Program entry point
│       ├── state.rs                # Account structures (GlobalConfig, Market, etc.)
│       ├── error.rs                # Error codes
│       ├── constants.rs            # Program constants
│       ├── instructions/           # 18 Anchor instructions
│       │   ├── mod.rs              # Instruction module exports
│       │   ├── initialize.rs       # Initialize global config
│       │   ├── create_market.rs    # Create new market
│       │   ├── approve_market.rs   # Approve market (ProposalManager)
│       │   ├── activate_market.rs  # Activate trading
│       │   ├── buy.rs              # Buy shares (LMSR)
│       │   ├── sell.rs             # Sell shares (LMSR)
│       │   ├── submit_proposal_vote.rs      # Vote on proposal
│       │   ├── aggregate_proposal_votes.rs  # Aggregate proposal votes
│       │   ├── record_resolution.rs         # Record resolution
│       │   ├── submit_dispute_vote.rs       # Dispute vote
│       │   ├── aggregate_dispute_votes.rs   # Aggregate dispute votes
│       │   ├── finalize_market.rs           # Finalize after dispute window
│       │   ├── claim_winnings.rs            # Claim winnings
│       │   ├── update_global_config.rs      # Update config (admin)
│       │   ├── emergency_pause.rs           # Emergency pause (admin)
│       │   └── cancel_market.rs             # Cancel market (admin)
│       └── utils/                  # Utility functions
│           ├── lmsr.rs             # LMSR cost function (fixed-point u64)
│           ├── fee_distribution.rs # 3/2/5 fee split
│           └── state_machine.rs    # 6-state FSM validation
└── zmart-proposal/                 # ProposalManager program (vote tracking)
    ├── Cargo.toml
    └── src/
        ├── lib.rs                  # Proposal program entry point
        ├── state.rs                # ProposalVote, DisputeVote accounts
        └── instructions/           # Vote aggregation logic
```

**Key Files:**
- `programs/zmart-core/src/state.rs` - All account structures (60% complete)
- `programs/zmart-core/src/instructions/` - 18 instructions (TRADING complete, VOTING 0%)
- `programs/zmart-core/src/utils/lmsr.rs` - LMSR math (100% complete)

**Status:** Trading instructions complete, voting instructions NOT started (Week 1-3 task)

---

## 🖥️ Backend Directory (Off-Chain Services)

**Path:** `/Users/seman/Desktop/zmartV0.69/backend/`

```
backend/
├── .env                            # ⭐ LIVE CREDENTIALS (DO NOT COMMIT!)
├── .env.example.safe               # Safe example template
├── package.json                    # Backend dependencies
├── tsconfig.json                   # TypeScript config
├── ecosystem.config.js             # PM2 process manager config
├── logs/                           # Service logs
│   ├── combined.log                # All logs
│   ├── error.log                   # Error logs
│   ├── market-monitor-combined-*.log
│   └── market-monitor-out-*.log
├── scripts/                        # Utility scripts
│   ├── test-db-connection.ts       # Test Supabase connection
│   ├── test-integration.ts         # Integration tests
│   ├── test-api-lifecycle.ts       # API lifecycle tests
│   ├── create-market-onchain.ts    # Create market on devnet
│   ├── initialize-program.ts       # Initialize program
│   ├── register-helius-webhook.ts  # Register Helius webhook
│   ├── apply-missing-tables-migration.ts  # Apply Supabase migrations
│   └── verify-schema.ts            # ⭐ NEW: Verify Supabase schema
├── src/                            # Main source code
│   ├── config/                     # Configuration modules
│   │   ├── env.ts                  # Environment variable validation
│   │   └── solana.ts               # Solana connection setup
│   ├── api/                        # API Gateway (REST + WebSocket)
│   │   ├── server.ts               # Express server
│   │   └── routes/                 # API routes (GET /markets, etc.)
│   ├── services/                   # Backend services
│   │   ├── market-monitor/         # Market Monitor service
│   │   │   ├── index.ts            # Service entry point
│   │   │   ├── config.ts           # Monitor configuration
│   │   │   └── finalization.ts     # Auto-finalization logic
│   │   └── ipfs/                   # IPFS service (daily snapshots)
│   │       └── standalone.ts       # IPFS client
│   └── utils/                      # Shared utilities
│       └── logger.ts               # Winston logger
├── event-indexer/                  # ⭐ Event Indexer service (Helius webhooks)
│   ├── package.json                # Event indexer dependencies
│   ├── tsconfig.json               # TypeScript config
│   ├── src/
│   │   ├── index.ts                # Express server for webhooks
│   │   ├── routes/
│   │   │   └── webhookRoutes.ts    # POST /helius webhook endpoint
│   │   ├── parsers/
│   │   │   └── eventParser.ts      # Parse Solana transaction logs
│   │   ├── services/
│   │   │   ├── eventProcessor.ts   # Process events → Supabase
│   │   │   └── supabaseClient.ts   # Supabase client
│   │   └── utils/
│   │       └── logger.ts           # Winston logger
│   └── tests/                      # Unit tests
│       └── schema-validation.test.ts
└── vote-aggregator/                # Vote Aggregator service (Redis + cron)
    ├── package.json                # Vote aggregator dependencies
    ├── tsconfig.json               # TypeScript config
    └── src/
        ├── index.ts                # Express server
        ├── routes/
        │   └── voteRoutes.ts       # POST /votes/proposal, /votes/dispute
        ├── services/
        │   ├── aggregationService.ts  # Aggregate votes → on-chain
        │   └── anchorClient.ts     # Anchor program client
        └── utils/
            └── logger.ts           # Winston logger
```

**⭐ CRITICAL: backend/.env contains ALL live credentials!**

**Key Files:**
- `backend/.env` - **LIVE Supabase, Helius, Solana credentials**
- `backend/event-indexer/` - Helius webhook listener (85% complete)
- `backend/vote-aggregator/` - Off-chain vote aggregation (50% complete)
- `backend/src/services/market-monitor/` - Auto-finalization (75% complete)
- `backend/scripts/verify-schema.ts` - **NEW: Schema verification tool**

**Status:**
- Event Indexer: 85% (needs Helius webhook registration)
- Vote Aggregator: 50% (needs testing)
- Market Monitor: 75% (needs deployment)
- API Gateway: 30% (Week 6 task)

---

## 🗄️ Supabase Directory (Database Migrations)

**Path:** `/Users/seman/Desktop/zmartV0.69/supabase/`

```
supabase/
├── config.toml                     # Supabase CLI configuration
├── .gitignore                      # Don't commit local state
├── migrations/                     # SQL migration files (sequential)
│   ├── 20251106220000_initial_schema.sql           # ✅ APPLIED
│   ├── 20251107000000_market_finalization_errors.sql  # ✅ APPLIED
│   └── 20251108000000_add_missing_tables.sql       # ✅ APPLIED
└── DEPLOYMENT_GUIDE.md             # How to deploy schema
```

**Migration Order (CRITICAL - must apply in sequence):**
1. `20251106220000_initial_schema.sql` - Base tables (markets, trades, etc.)
2. `20251107000000_market_finalization_errors.sql` - Error tracking table
3. `20251108000000_add_missing_tables.sql` - Missing tables (schema_version, etc.)

**All migrations applied! ✅**

**Database Tables (9 total):**
1. `markets` (10 rows) - Market metadata
2. `trades` (0 rows) - Trade history
3. `user_positions` (0 rows) - User positions
4. `vote_records` (0 rows) - Vote records
5. `proposal_votes` (20 rows) - Proposal votes
6. `dispute_votes` (0 rows) - Dispute votes
7. `discussions` (33 rows) - Market discussions
8. `market_finalization_errors` (0 rows) - Finalization errors
9. `schema_version` (1 row) - Schema version tracking

---

## 📚 Documentation Directory

**Path:** `/Users/seman/Desktop/zmartV0.69/docs/`

```
docs/
├── 00_MASTER_INDEX.md              # Navigation hub (all docs)
├── CLAUDE.md → ../CLAUDE.md        # Symlink to root CLAUDE.md
├── README.md → ../README.md        # Symlink to root README.md
│
├── CORE_LOGIC_INVARIANTS.md        # ⭐ Blueprint compliance reference
├── IMPLEMENTATION_PHASES.md        # ⭐ 14-week roadmap
├── TODO_CHECKLIST.md               # ⭐ Daily task tracking
│
├── EVM_TO_SOLANA_TRANSLATION.md    # Solana patterns
├── SOLANA_PROGRAM_ARCHITECTURE.md  # Program relationships
├── 03_SOLANA_PROGRAM_DESIGN.md     # ⭐ Complete program spec (18 instructions)
├── 05_LMSR_MATHEMATICS.md          # ⭐ LMSR fixed-point math
├── 06_STATE_MANAGEMENT.md          # ⭐ 6-state FSM
├── 07_ON_CHAIN_OFF_CHAIN_INTEGRATION.md  # ⭐ Hybrid architecture
├── 08_DATABASE_SCHEMA.md           # ⭐ Supabase schema
│
├── DEVELOPMENT_WORKFLOW.md         # ⭐ Git strategy
├── DEFINITION_OF_DONE.md           # ⭐ Tiered DoD
├── FRONTEND_SCOPE_V1.md            # ⭐ Explicit scope
├── SCHEMA_MANAGEMENT.md            # ⭐ Supabase type generation
│
├── PROJECT_STRUCTURE.md            # ⭐ THIS FILE (complete file tree)
├── ENVIRONMENT_GUIDE.md            # ⭐ Environment variables map
├── SERVICE_ARCHITECTURE.md         # ⭐ Service connections
├── CREDENTIALS_MAP.md              # ⭐ Credential usage
│
└── stories/                        # User story files
    ├── STORY-TEMPLATE.md           # Story file template
    ├── STORY-BACKEND-1.md          # Vote Aggregator (COMPLETE)
    └── STORY-BACKEND-2.md          # Event Indexer (85% COMPLETE)
```

**Navigation:**
- Start with: `00_MASTER_INDEX.md`
- Claude Code instructions: `CLAUDE.md`
- Implementation plan: `IMPLEMENTATION_PHASES.md`
- Progress tracking: `TODO_CHECKLIST.md`

---

## 🌐 Frontend Directory (FUTURE - Week 10-12)

**Path:** `/Users/seman/Desktop/zmartV0.69/frontend/`

```
frontend/                           # ⚠️ NOT IMPLEMENTED YET
└── (To be created in Week 10)      # Next.js 14 with App Router
```

**Status:** Not started (Week 10-12 task)

---

## 🧪 Test Data Directory (FUTURE)

**Path:** `/Users/seman/Desktop/zmartV0.69/test-data/`

```
test-data/                          # ⚠️ NOT IMPLEMENTED YET
└── (To be created during E2E testing)
```

**Status:** Not started (Week 8-9 task)

---

## 📦 Root Configuration Files

```
zmartV0.69/
├── Anchor.toml                     # Anchor workspace config
│   └── Defines: programs, test validator, scripts
├── Cargo.toml                      # Rust workspace config
│   └── Workspace members: zmart-core, zmart-proposal
├── package.json                    # Root npm workspace config
│   └── Workspaces: backend, backend/event-indexer, backend/vote-aggregator
├── .env.local                      # ⚠️ PLACEHOLDER (DO NOT USE!)
│   └── Use backend/.env instead!
├── .gitignore                      # Git ignore patterns
│   └── Ignores: .env, node_modules, target, test-data, logs
├── README.md                       # User-facing README
├── CLAUDE.md                       # ⭐ Claude Code instructions
└── .supabase/config.toml           # Supabase CLI config
```

---

## 🔍 Quick Reference by Task

### "Where do I find...?"

**Credentials:**
- ✅ **Live credentials:** `backend/.env` (DO NOT COMMIT)
- ⚠️ **Placeholder:** `.env.local` (IGNORE THIS)
- 📖 **Credential map:** [CREDENTIALS_MAP.md](./CREDENTIALS_MAP.md)

**Program Code:**
- ✅ **On-chain logic:** `programs/zmart-core/src/`
- ✅ **LMSR math:** `programs/zmart-core/src/utils/lmsr.rs`
- ✅ **State machine:** `programs/zmart-core/src/utils/state_machine.rs`

**Backend Services:**
- ✅ **Event Indexer:** `backend/event-indexer/`
- ✅ **Vote Aggregator:** `backend/vote-aggregator/`
- ✅ **Market Monitor:** `backend/src/services/market-monitor/`
- ✅ **API Gateway:** `backend/src/api/` (Week 6 task)

**Database:**
- ✅ **Migrations:** `supabase/migrations/`
- ✅ **Schema verification:** `backend/scripts/verify-schema.ts`
- ✅ **Live database:** `https://tkkqqxepelibqjjhxxct.supabase.co`

**Documentation:**
- ✅ **Implementation plan:** `docs/IMPLEMENTATION_PHASES.md`
- ✅ **Progress tracking:** `docs/TODO_CHECKLIST.md`
- ✅ **Program spec:** `docs/03_SOLANA_PROGRAM_DESIGN.md`
- ✅ **Navigation hub:** `docs/00_MASTER_INDEX.md`

**Testing:**
- ✅ **Test scripts:** `backend/scripts/test-*.ts`
- ⚠️ **E2E tests:** Not started (Week 8-9)

---

## 🚨 Common Pitfalls (Lessons Learned)

### ❌ DON'T:
1. **Use `.env.local`** - It's a placeholder! Use `backend/.env` instead
2. **Commit `backend/.env`** - It contains live credentials
3. **Skip reading this file** - Prevents confusion about project structure
4. **Assume files don't exist** - Check this file first
5. **Create duplicate configs** - Centralize in `backend/.env`

### ✅ DO:
1. **Always use `backend/.env`** for credentials
2. **Reference this file** when unsure about structure
3. **Update this file** when adding new directories/files
4. **Cross-reference** with ENVIRONMENT_GUIDE.md, SERVICE_ARCHITECTURE.md
5. **Follow the implementation plan** in IMPLEMENTATION_PHASES.md

---

## 📊 Current Status Summary

**Overall Completion:** 60% (foundation built, 40% remaining)

| Component | Status | Completion | Next Step |
|-----------|--------|------------|-----------|
| **Programs** | Partial | 50% | Week 1-3: Voting instructions |
| **Event Indexer** | Nearly Complete | 85% | Register Helius webhook |
| **Vote Aggregator** | Partial | 50% | End-to-end testing |
| **Market Monitor** | Partial | 75% | Deployment to PM2 |
| **API Gateway** | Not Started | 0% | Week 6 task |
| **Frontend** | Not Started | 0% | Week 10-12 task |
| **Database** | ✅ Complete | 100% | All migrations applied |
| **Documentation** | ✅ Complete | 95% | This file NEW! |

**Current Phase:** Ready for Phase 1, Week 1 - Voting System Foundation

---

## 🔄 Maintenance

**When to update this file:**
1. Adding new directories or major files
2. Changing project structure
3. Adding new services or components
4. Updating status of incomplete components
5. Adding new environment files

**How to update:**
1. Edit this file
2. Update timestamps
3. Commit with message: "docs: Update PROJECT_STRUCTURE.md"
4. Cross-reference with other docs if needed

---

## 📖 Related Documentation

**Essential Reading:**
1. [CLAUDE.md](../CLAUDE.md) - Claude Code instructions
2. [IMPLEMENTATION_PHASES.md](./IMPLEMENTATION_PHASES.md) - 14-week roadmap
3. [ENVIRONMENT_GUIDE.md](./ENVIRONMENT_GUIDE.md) - Environment variables
4. [SERVICE_ARCHITECTURE.md](./SERVICE_ARCHITECTURE.md) - Service connections
5. [CREDENTIALS_MAP.md](./CREDENTIALS_MAP.md) - Credential usage

**Quick Navigation:**
- [00_MASTER_INDEX.md](./00_MASTER_INDEX.md) - Complete navigation hub
- [README.md](../README.md) - User-facing overview
- [TODO_CHECKLIST.md](./TODO_CHECKLIST.md) - Daily progress tracking

---

**Last Updated:** November 8, 2025
**Maintainer:** Claude Code
**Version:** 1.0
