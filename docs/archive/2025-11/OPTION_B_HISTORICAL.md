# Implementation Strategy "Option B" (Historical)

**Date Archived**: November 10, 2025
**Status**: Historical planning documentation - No longer actively used

This document archives the original "Option B" implementation strategy that was defined during early planning phases. This was the chosen approach for V1 MVP development.

---

## V1 MVP Scope

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

---

## Why This Approach

1. **Get to Market Fast** - Essential features only
2. **Validate Core Mechanics** - Prove LMSR + resolution works
3. **Clean Architecture** - Easy to add v2 features later
4. **Reduced Complexity** - Simpler testing and deployment
5. **Focus on Prediction Markets** - Not social network

---

## What This Means for Development

- **Programs**: Pure blueprint implementation (no social features)
- **Backend**: Vote aggregation + minimal discussion storage
- **Database**: Reserved columns for v2 features (twitter_handle, reputation_score)
- **Frontend**: Wallet connect + trading + simple discussions

---

## Frontend Implementation Approach

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

**Detailed Plan**: Originally at `docs/FRONTEND_IMPLEMENTATION_PLAN.md` - 6-week day-by-day breakdown with 42 daily deliverables

---

## Why This Was Archived

This planning documentation was created during the early design phase. The actual implementation has evolved beyond this initial plan, so this document serves as a historical reference of the original strategy rather than current active guidance.

For current implementation status and plans, see:
- [CURRENT_STATUS.md](../../CURRENT_STATUS.md) - Current project status
- [docs/workflow/IMPLEMENTATION_PHASES.md](../workflow/IMPLEMENTATION_PHASES.md) - Current roadmap
- [docs/workflow/TODO_CHECKLIST.md](../workflow/TODO_CHECKLIST.md) - Current task tracking
