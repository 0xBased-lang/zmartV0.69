# ZMART v0.69 - Solana Prediction Markets

**Version**: v0.69 (Option B - MVP + Essential Features)
**Status**: Documentation Complete - Implementation Ready
**Architecture**: Solana (Anchor) + Supabase + IPFS
**Timeline**: 20 weeks to mainnet launch (4-5 months, realistic with 3X frontend multiplier)

---

## 🎯 What is ZMART?

ZMART is a **decentralized prediction market platform** built on Solana, using **LMSR (Logarithmic Market Scoring Rule)** for algorithmic liquidity.

### Key Features (v0.69)

✅ **Core Prediction Markets**
- Create markets on any binary outcome question
- Trade YES/NO shares using LMSR bonding curve
- Community-driven proposal approval (70% threshold)
- Automated resolution with dispute mechanism

✅ **ProposalManager Voting**
- Off-chain vote collection → on-chain aggregation
- Like/dislike system for market proposals
- Dispute voting for resolution challenges

✅ **Economic Model**
- 10% trading fees (3% protocol, 2% resolver, 5% liquidity provider)
- LMSR guarantees constant liquidity
- Bounded loss for market creators

✅ **Minimal Social Features** (Option B)
- Wallet-only authentication (SIWE)
- Flat comment system on markets
- Daily IPFS snapshots for discussion history

### Deferred to v2

❌ Twitter OAuth integration
❌ Advanced reputation scoring
❌ Community flagging/moderation
❌ Governance token
❌ Staking mechanics

---

## 📁 Project Structure

```
zmartV0.69/
├── README.md                    ← You are here
├── CLAUDE.md                    ← Project instructions (Option B strategy)
├── IMPLEMENTATION_PHASES.md     ← 16-week roadmap
├── docs/                        ← Complete technical specifications
│   ├── 00_MASTER_INDEX.md               Navigation hub
│   ├── 01_EXECUTIVE_SUMMARY.md          Project overview
│   ├── 02_SYSTEM_ARCHITECTURE.md        High-level design
│   ├── 03_SOLANA_PROGRAM_DESIGN.md      ⭐ Rust/Anchor specs (18 instructions)
│   ├── 04_TOKEN_ECONOMICS.md            Token & fee design
│   ├── 05_LMSR_MATHEMATICS.md           ⭐ Fixed-point math implementation
│   ├── 06_STATE_MANAGEMENT.md           ⭐ 6-state FSM
│   ├── 07_ON_CHAIN_OFF_CHAIN_INTEGRATION.md  ⭐ Hybrid architecture
│   ├── 08_DATABASE_SCHEMA.md            ⭐ Supabase schema
│   ├── CORE_LOGIC_INVARIANTS.md         Blueprint logic reference
│   ├── EVM_TO_SOLANA_TRANSLATION.md     EVM → Solana patterns
│   ├── SOLANA_PROGRAM_ARCHITECTURE.md   Program relationships
│   ├── TODO_CHECKLIST.md                Progress tracking
│   └── ARCHITECTURE_DECISION_AMM_VS_ORDERBOOK.md
├── programs/                    ← Anchor programs (Rust)
│   └── zmart/                   (Empty - ready for implementation)
├── backend/                     ← Node.js services
│   ├── vote-aggregator/         (Empty - ready for implementation)
│   ├── market-monitor/
│   └── ipfs-service/
├── frontend/                    ← Next.js app
│   └── app/                     (Empty - ready for implementation)
├── tests/                       ← Test suites
│   ├── unit/
│   ├── integration/
│   └── e2e/
└── scripts/                     ← Deployment & utilities
    ├── deploy.ts
    └── seed.ts
```

---

## 🚀 Quick Start

### For Developers (Starting Fresh)

**1. Understand the Scope**
```bash
# Read project strategy
cat CLAUDE.md

# Review 16-week roadmap
cat IMPLEMENTATION_PHASES.md
```

**2. Read Technical Specifications**
```bash
# Start here - complete navigation
open docs/00_MASTER_INDEX.md

# Critical implementation docs (in order)
open docs/03_SOLANA_PROGRAM_DESIGN.md    # All 18 Anchor instructions
open docs/05_LMSR_MATHEMATICS.md          # Fixed-point math
open docs/06_STATE_MANAGEMENT.md          # 6-state FSM
open docs/07_ON_CHAIN_OFF_CHAIN_INTEGRATION.md  # Backend architecture
open docs/08_DATABASE_SCHEMA.md           # Supabase schema
```

**3. Understand Core Mechanics** (Optional - Theoretical Foundation)
```bash
# Reference theoretical blueprint
cd /Users/seman/Desktop/blueprint

# Read core concepts
open 03_LMSR_BONDING_CURVE.md    # LMSR mathematics theory
open 07_STATE_MACHINE.md          # State lifecycle theory
open 11_ECONOMIC_PARAMETERS.md   # All configurable parameters
```

---

## 📖 Documentation Guide

### Implementation Documents (Start Here) ⭐

Located in `/docs` directory - **production-ready specifications**:

**Critical for Development**:
1. **03_SOLANA_PROGRAM_DESIGN.md** - Complete Rust/Anchor program (18 instructions)
2. **05_LMSR_MATHEMATICS.md** - Fixed-point LMSR implementation (u64, 9 decimals)
3. **06_STATE_MANAGEMENT.md** - 6-state FSM (PROPOSED → FINALIZED)
4. **07_ON_CHAIN_OFF_CHAIN_INTEGRATION.md** - Vote aggregation, backend services, IPFS
5. **08_DATABASE_SCHEMA.md** - Complete Supabase/PostgreSQL schema with RLS

**Supporting Documents**:
- **CORE_LOGIC_INVARIANTS.md** - Blueprint compliance reference
- **EVM_TO_SOLANA_TRANSLATION.md** - Common patterns for Solana
- **SOLANA_PROGRAM_ARCHITECTURE.md** - Program relationships

### Theoretical Foundation (Reference)

Located in `/Users/seman/Desktop/blueprint` - **blockchain-agnostic theory**:

- Economic models and LMSR formulas
- User workflows and system mechanics
- Access control patterns
- Integration patterns (abstract)

Use these to understand **WHY** decisions were made, not **HOW** to implement.

---

## 🏗️ Development Workflow

### Week-by-Week Plan (From IMPLEMENTATION_PHASES.md)

**Weeks 1-4: Solana Programs**
- Implement all 18 Anchor instructions
- LMSR fixed-point math module
- 6-state FSM with validation
- ProposalManager voting

**Weeks 5-6: Backend Services**
- Vote aggregator (off-chain → on-chain)
- Market monitor (auto-finalization)
- IPFS snapshot service (discussions)
- Event indexer

**Weeks 7-8: Testing**
- Unit tests (Rust)
- Integration tests (TypeScript)
- E2E tests (Playwright)

**Weeks 9-12: Frontend**
- Wallet integration (SIWE)
- Market creation UI
- Trading interface
- Discussion boards

**Weeks 13-14: Integration Testing**
**Weeks 15-16: Deployment & Launch**

---

## 🔧 Tech Stack

### On-Chain (Solana)
- **Framework**: Anchor 0.28+
- **Language**: Rust
- **Network**: Devnet → Mainnet

### Backend Services (Node.js)
- **Runtime**: Node.js 18+
- **Framework**: Express or Fastify
- **Event Indexing**: @solana/web3.js
- **Cron Jobs**: node-cron

### Database (Supabase)
- **Database**: PostgreSQL 15+
- **Auth**: Supabase Auth (custom SIWE integration)
- **Storage**: Supabase Storage (temporary files)
- **RLS**: Row-Level Security enabled

### IPFS (Decentralized Storage)
- **Service**: Infura IPFS or Pinata
- **Use Case**: Daily discussion snapshots
- **Format**: JSON snapshots with CIDv1

### Frontend (Next.js)
- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Wallet**: Solana Wallet Adapter
- **UI**: Tailwind CSS
- **State**: Zustand or Jotai

### Testing
- **Unit Tests**: Rust (cargo test)
- **Integration**: TypeScript (Mocha/Chai)
- **E2E**: Playwright (cross-browser)

---

## 📝 Key Concepts

### LMSR Bonding Curve

**Not an AMM** - ZMART uses Logarithmic Market Scoring Rule:

```
Cost Function: C(q_yes, q_no) = b * ln(e^(q_yes/b) + e^(q_no/b))
Price: P_yes = e^(q_yes/b) / (e^(q_yes/b) + e^(q_no/b))
```

**Benefits**:
- Always liquid (no LP tokens needed)
- Bounded loss for market creators
- Supports one-sided markets
- Proportional payouts

### ProposalManager Pattern

**Off-chain voting → On-chain aggregation**:

1. Users submit votes (creates VoteRecord PDA on-chain)
2. Backend aggregates votes off-chain (Supabase)
3. Backend calls `approve_market(likes, dislikes)` with final counts
4. On-chain program validates 70% threshold and transitions state

**Why**: Gas-efficient, scalable to thousands of voters

### 6-State Lifecycle

```
PROPOSED → APPROVED → ACTIVE → RESOLVING → DISPUTED → FINALIZED
                                      ↓
                                FINALIZED (no dispute)
```

Each state has specific allowed operations and access control.

---

## 🧪 Testing Strategy

### Unit Tests (Rust)
- LMSR math functions (precision validation)
- State transition logic
- Access control checks
- Error handling

### Integration Tests (TypeScript)
- Complete market lifecycle
- Multi-user trading scenarios
- Dispute workflows
- Fee distribution

### E2E Tests (Playwright)
- User workflows (create, trade, claim)
- Cross-browser compatibility
- Wallet integration
- Discussion system

---

## 🚢 Deployment Checklist

**Pre-Deployment**:
- [ ] All tests passing (unit, integration, E2E)
- [ ] Security audit completed (if budget permits)
- [ ] Load testing (>1000 concurrent users)
- [ ] Frontend integration tested on devnet
- [ ] Backend services deployed and monitored

**Devnet Deployment**:
- [ ] Anchor programs deployed
- [ ] GlobalConfig initialized
- [ ] Backend services connected
- [ ] Frontend connected to devnet
- [ ] Test with real users (10+ testers)

**Mainnet Deployment**:
- [ ] Programs verified with `anchor verify`
- [ ] Admin keypair secured (multi-sig recommended)
- [ ] Backend authority keypair in AWS Secrets Manager
- [ ] Monitoring and alerting configured
- [ ] Rollback plan documented

---

## 📊 Success Metrics (v0.69)

### Launch Goals
- ✅ 10+ active markets in first week
- ✅ 100+ unique users
- ✅ $10K+ total trading volume
- ✅ <1% error rate on transactions
- ✅ <2 second average transaction time

### Quality Gates
- ✅ 90%+ test coverage (unit)
- ✅ 80%+ test coverage (integration)
- ✅ Zero critical security vulnerabilities
- ✅ <100ms backend API response time
- ✅ 99.9% uptime

---

## 🔗 Related Documentation

- **Theoretical Foundation**: `/Users/seman/Desktop/blueprint`
- **Implementation Roadmap**: `IMPLEMENTATION_PHASES.md`
- **Project Instructions**: `CLAUDE.md`
- **Technical Index**: `docs/00_MASTER_INDEX.md`

---

## ❓ FAQ

**Q: Why LMSR instead of AMM?**
A: LMSR provides guaranteed liquidity without LP tokens, bounded loss, and supports one-sided markets. See `docs/ARCHITECTURE_DECISION_AMM_VS_ORDERBOOK.md` or `/Users/seman/Desktop/blueprint/17_COMPARISON_BONDING_CURVE_VS_AMM.md`.

**Q: What's deferred to v2?**
A: Twitter OAuth, advanced reputation, moderation, governance token, staking. See `CLAUDE.md` for complete list.

**Q: How long to build?**
A: 12-16 weeks for v0.69 MVP. See `IMPLEMENTATION_PHASES.md` for week-by-week breakdown.

**Q: Where's the Solana program code?**
A: Not implemented yet - `programs/` is empty. Use `docs/03_SOLANA_PROGRAM_DESIGN.md` as specification.

**Q: Can I contribute?**
A: Yes! Read `CLAUDE.md` for Option B scope, then review `docs/TODO_CHECKLIST.md` for current status.

---

## 📞 Support

- **Technical questions**: Review `docs/` directory
- **Implementation help**: See `docs/03_SOLANA_PROGRAM_DESIGN.md`
- **Architectural decisions**: See `CLAUDE.md` or blueprint directory
- **Progress tracking**: See `docs/TODO_CHECKLIST.md`

---

**Ready to build?** Start with `docs/03_SOLANA_PROGRAM_DESIGN.md` and let's ship this! 🚀

---

*ZMART v0.69 - Decentralized Prediction Markets on Solana*
