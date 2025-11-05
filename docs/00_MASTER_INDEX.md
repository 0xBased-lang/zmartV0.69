# ZMART v0.69 - Master Documentation Index

**Version:** v0.69 (Option B - MVP + Essential Features)
**Last Updated:** November 5, 2025
**Status:** Implementation-Ready Specifications
**Architecture:** Solana (Anchor) + Supabase + IPFS

---

## 📋 About This Documentation

This directory contains **implementation-ready specifications** for ZMART v0.69, a Solana-based prediction market platform.

### Documentation Structure

**Main Documents** (Root):
- `README.md` - User-facing project overview and quick start
- `CLAUDE.md` - Project instructions and Option B strategy
- `IMPLEMENTATION_PHASES.md` - 16-week development roadmap

**Technical Specifications** (`docs/`):
- Complete Solana program designs
- Fixed-point LMSR mathematics
- Database schemas and backend architecture
- Reference materials and decision logs

---

## 🗺️ Documentation Map

### 📌 Overview & Navigation

**[00_MASTER_INDEX.md](./00_MASTER_INDEX.md)** (This Document)
- Complete documentation navigation
- Quick start guides by role
- Document relationships

**[01_EXECUTIVE_SUMMARY.md](./01_EXECUTIVE_SUMMARY.md)**
- Project vision and goals
- Key features (v0.69 scope)
- Technology stack
- Success metrics

**[02_SYSTEM_ARCHITECTURE.md](./02_SYSTEM_ARCHITECTURE.md)** ⭐ START HERE
- High-level system architecture
- Component relationships
- Hybrid on-chain/off-chain design
- Data flow diagrams

---

### 🔧 Core Implementation Specs

**[03_SOLANA_PROGRAM_DESIGN.md](./03_SOLANA_PROGRAM_DESIGN.md)** ⭐ CRITICAL
- Complete Rust/Anchor program specifications
- All 18 program instructions with full contexts
- Account structures (GlobalConfig, MarketAccount, UserPosition, VoteRecord)
- ProposalManager voting system (like/dislike, 70% threshold)
- LMSR trading implementation
- Resolution + dispute mechanics
- Fee distribution (3/2/5 split)
- 6-state FSM integration
- Complete error codes
- Security constraints
- Testing strategies

**[05_LMSR_MATHEMATICS.md](./05_LMSR_MATHEMATICS.md)** ⭐ CRITICAL
- Production-ready fixed-point arithmetic (u64, 9 decimals)
- Complete LMSR cost function implementation
- Price calculation (YES/NO with complementary logic)
- Binary search for share calculation
- Numerical stability techniques (log-sum-exp, Padé approximation)
- Bounded loss calculation
- Slippage protection mechanisms
- Worked examples and test cases
- Performance benchmarks

**[06_STATE_MANAGEMENT.md](./06_STATE_MANAGEMENT.md)** ⭐ CRITICAL
- 6-state FSM detailed implementation (PROPOSED → APPROVED → ACTIVE → RESOLVING → DISPUTED → FINALIZED)
- State transition validation logic
- Automatic transitions (time-based)
- State-based access control
- Error handling and testing
- Rust implementation with examples

**[07_ON_CHAIN_OFF_CHAIN_INTEGRATION.md](./07_ON_CHAIN_OFF_CHAIN_INTEGRATION.md)** ⭐ CRITICAL
- Hybrid architecture pattern (critical state on-chain, aggregation off-chain)
- ProposalManager vote aggregation workflow
- Backend services specifications:
  - Vote aggregator
  - Market monitor
  - IPFS snapshot service
  - Event indexer
- Discussion system (Option B): Supabase + daily IPFS snapshots
- API gateway design (Next.js App Router)
- Data synchronization strategies
- Security considerations

**[08_DATABASE_SCHEMA.md](./08_DATABASE_SCHEMA.md)** ⭐ CRITICAL
- Complete Supabase/PostgreSQL schema
- Core tables (users, markets, positions)
- Voting tables (proposal_votes, dispute_votes)
- Discussion tables (discussions, ipfs_anchors) - Option B
- Trading tables (trades indexed from events)
- Indexes for performance optimization
- Row-Level Security (RLS) policies
- Migration strategy
- Backup and recovery

---

### 💰 Economics & Token Design

**[04_TOKEN_ECONOMICS.md](./04_TOKEN_ECONOMICS.md)**
- Fee structure (3% protocol, 2% resolver, 5% liquidity provider)
- Token flow and distribution
- Economic incentives
- Pump.fun integration strategy

---

### 📚 Reference & Supporting Docs

**[CORE_LOGIC_INVARIANTS.md](./CORE_LOGIC_INVARIANTS.md)** ⭐ IMPORTANT
- Blueprint compliance reference
- Core logic that must be preserved
- Mathematical invariants
- Economic parameters
- State transition rules

**[EVM_TO_SOLANA_TRANSLATION.md](./EVM_TO_SOLANA_TRANSLATION.md)**
- Common patterns for porting EVM concepts to Solana
- Account model differences
- State management strategies
- Event handling
- Access control patterns

**[SOLANA_PROGRAM_ARCHITECTURE.md](./SOLANA_PROGRAM_ARCHITECTURE.md)**
- Program relationships and responsibilities
- Cross-Program Invocation (CPI) patterns
- PDA derivation strategies
- Account lifecycle management

**[ARCHITECTURE_DECISION_AMM_VS_ORDERBOOK.md](./ARCHITECTURE_DECISION_AMM_VS_ORDERBOOK.md)**
- Why LMSR bonding curve (not AMM)
- Technical comparison
- Trade-offs analysis
- Decision rationale

**[TODO_CHECKLIST.md](./TODO_CHECKLIST.md)**
- Project progress tracking
- Implementation checklist
- Testing milestones
- Deployment readiness

---

## 🎯 Quick Start Guides

### For Solana/Anchor Developers ⭐ RECOMMENDED

**Goal**: Implement ZMART on Solana

1. **Understand Scope** - Read `../CLAUDE.md` (Option B strategy)
2. **Architecture Overview** - Read `02_SYSTEM_ARCHITECTURE.md`
3. **Core Implementation** - Read in order:
   - `03_SOLANA_PROGRAM_DESIGN.md` - All 18 Anchor instructions
   - `05_LMSR_MATHEMATICS.md` - Fixed-point math module
   - `06_STATE_MANAGEMENT.md` - 6-state FSM
   - `07_ON_CHAIN_OFF_CHAIN_INTEGRATION.md` - Backend architecture
   - `08_DATABASE_SCHEMA.md` - Supabase schema
4. **Reference Materials**:
   - `CORE_LOGIC_INVARIANTS.md` - Blueprint compliance
   - `EVM_TO_SOLANA_TRANSLATION.md` - Solana patterns
5. **Track Progress** - Use `TODO_CHECKLIST.md`

### For Backend Developers (Node.js/TypeScript)

1. Read `02_SYSTEM_ARCHITECTURE.md` - System overview
2. Read `07_ON_CHAIN_OFF_CHAIN_INTEGRATION.md` - Backend services specs
3. Read `08_DATABASE_SCHEMA.md` - Database design
4. Reference `03_SOLANA_PROGRAM_DESIGN.md` - Program events to index
5. Start with vote aggregation service (Week 5-6)

### For Frontend Developers (Next.js/React)

1. Read `02_SYSTEM_ARCHITECTURE.md` - System overview
2. Read `07_ON_CHAIN_OFF_CHAIN_INTEGRATION.md` - API gateway design
3. Read `06_STATE_MANAGEMENT.md` - Market lifecycle states
4. Wait for backend completion (Week 8)
5. Start UI implementation (Week 9-12)

### For Product Managers

1. Read `../README.md` - Project overview
2. Read `01_EXECUTIVE_SUMMARY.md` - Vision and goals
3. Read `../CLAUDE.md` - Option B scope (what's in v1 vs v2)
4. Read `../IMPLEMENTATION_PHASES.md` - 16-week timeline
5. Track progress in `TODO_CHECKLIST.md`

### For Auditors & Security Reviewers

1. Read `02_SYSTEM_ARCHITECTURE.md` - System design
2. Read `03_SOLANA_PROGRAM_DESIGN.md` - Complete program specs
3. Read `CORE_LOGIC_INVARIANTS.md` - Logic that must hold
4. Focus on security constraints sections in each doc
5. Review error handling and access control patterns

---

## 📊 Document Statistics

- **Total Documents**: 14 implementation specifications
- **Core Implementation Docs**: 6 (03, 05, 06, 07, 08 + CORE_LOGIC_INVARIANTS)
- **Supporting Docs**: 8 (01, 02, 04, + 4 reference docs + TODO)

---

## 🔑 Key Concepts

### LMSR Bonding Curve

ZMART uses **Logarithmic Market Scoring Rule**, NOT an AMM:

```
Cost Function: C(q_yes, q_no) = b * ln(e^(q_yes/b) + e^(q_no/b))
Price: P_yes = e^(q_yes/b) / (e^(q_yes/b) + e^(q_no/b))
```

See `05_LMSR_MATHEMATICS.md` and `ARCHITECTURE_DECISION_AMM_VS_ORDERBOOK.md` for details.

### ProposalManager Voting

Off-chain vote collection → On-chain aggregation:

1. Users vote (creates VoteRecord PDA)
2. Backend aggregates in Supabase
3. Backend calls `approve_market(likes, dislikes)`
4. Program validates 70% threshold

See `03_SOLANA_PROGRAM_DESIGN.md` and `07_ON_CHAIN_OFF_CHAIN_INTEGRATION.md`.

### 6-State Lifecycle

```
PROPOSED → APPROVED → ACTIVE → RESOLVING → DISPUTED → FINALIZED
                                      ↓
                                FINALIZED (no dispute)
```

See `06_STATE_MANAGEMENT.md` for complete FSM implementation.

### Option B Scope (v0.69)

**Implemented in v1**:
- ✅ Core prediction markets
- ✅ LMSR trading
- ✅ ProposalManager voting
- ✅ Resolution + disputes
- ✅ Minimal discussions (Supabase + IPFS)
- ✅ Wallet-only auth

**Deferred to v2**:
- ❌ Twitter OAuth
- ❌ Advanced reputation
- ❌ Community moderation
- ❌ Governance token
- ❌ Staking

See `../CLAUDE.md` for complete scope definition.

---

## 🔗 Related Documentation

### Theoretical Foundation

**Location**: `/Users/seman/Desktop/blueprint`

**Use For**: Understanding core mechanics and "why" decisions

**Key Documents**:
- `03_LMSR_BONDING_CURVE.md` - LMSR theory
- `07_STATE_MACHINE.md` - State lifecycle theory
- `11_ECONOMIC_PARAMETERS.md` - All parameters
- `17_COMPARISON_BONDING_CURVE_VS_AMM.md` - LMSR vs AMM

**When to Reference**:
- Need theoretical background on LMSR
- Want to understand original design decisions
- Auditing for blueprint compliance
- Explaining concepts to stakeholders

---

## 📞 Document Maintenance

**Update Protocol**:
- Architecture changes → Update 02, 03, SOLANA_PROGRAM_ARCHITECTURE
- Implementation changes → Update relevant core docs (03-08)
- New features → Update all affected docs + this index + TODO_CHECKLIST
- Blueprint deviations → Document in CORE_LOGIC_INVARIANTS

**Version History**:
- v0.69 (2025-11-05): Complete implementation specifications (Option B)

---

## ✅ Pre-Development Checklist

Before starting implementation:

- [ ] Read `../README.md` - Project overview
- [ ] Read `../CLAUDE.md` - Option B scope
- [ ] Read `../IMPLEMENTATION_PHASES.md` - 16-week timeline
- [ ] Read `02_SYSTEM_ARCHITECTURE.md` - Architecture overview
- [ ] Read all 5 critical docs (03, 05, 06, 07, 08)
- [ ] Review `CORE_LOGIC_INVARIANTS.md` - Blueprint compliance
- [ ] Understand reference docs (EVM_TO_SOLANA, SOLANA_PROGRAM_ARCHITECTURE)
- [ ] Set up development environment
- [ ] Clone and initialize project structure

---

**Ready to build?**

- **Start**: `03_SOLANA_PROGRAM_DESIGN.md` - Begin with Solana programs
- **Reference**: `CORE_LOGIC_INVARIANTS.md` - Ensure blueprint compliance
- **Track**: `TODO_CHECKLIST.md` - Monitor progress

---

*ZMART v0.69 - Complete Implementation Specifications*
