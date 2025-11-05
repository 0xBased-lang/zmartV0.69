# ZMART v0.69 - Frontend Scope Definition (Option B)

**Purpose**: Explicit scope boundaries to prevent 180% scope creep
**Pattern Prevention**: Addresses Pattern #2 (Scope Creep Explosion) from lessons-learned
**Timeline Impact**: 3.2X multiplier applied (4 weeks naive → 9 weeks realistic)

---

## Explicit "In Scope" for v0.69 (14 Core Features)

### ✅ Core Pages & Components

1. **Homepage / Market List**
   - Display active markets in grid/list view
   - Basic filtering (status, category)
   - Basic sorting (newest, ending soon, popular)
   - Search by title (simple text match)

2. **Market Detail Page**
   - Market information display
   - LMSR price chart (simple line chart, using recharts or similar)
   - Trading interface (buy YES/NO shares)
   - Current odds display
   - Discussion section (flat comments, no threading)

3. **Market Creation Wizard**
   - Multi-step form (3 steps: Details, Parameters, Review)
   - Title, description, end date
   - Initial liquidity parameter selection
   - Preview before submission

4. **User Dashboard**
   - Active positions list
   - P&L calculation
   - Claimable winnings display
   - Basic portfolio stats

5. **Trading Interface**
   - Buy YES/NO shares
   - Sell shares
   - Slippage display (1% default)
   - Transaction confirmation modal

6. **Resolution & Disputes**
   - Resolution proposal submission (for resolvers)
   - Dispute voting interface
   - Evidence upload (IPFS integration)
   - Outcome display

7. **Wallet Integration**
   - Solana Wallet Adapter (Phantom, Solflare, etc.)
   - Connect/disconnect wallet
   - Display wallet balance
   - Sign transactions

8. **Discussion System (Minimal)**
   - Flat comment system (no threading, no nested replies)
   - Post comment
   - View comments chronologically
   - Simple upvote (no downvote)

9. **Responsive Design**
   - Mobile-responsive (mobile-first approach)
   - Desktop optimization
   - Tablet support
   - Basic breakpoints only (sm, md, lg)

10. **Error Handling**
    - Error boundaries (catch React errors)
    - Toast notifications (success, error, info)
    - Loading states (skeletons for key components)
    - Retry mechanisms for failed transactions

11. **Basic Analytics Dashboard**
    - User's trade history
    - Market statistics
    - Leaderboard (top traders by P&L)

12. **Proposal Voting (ProposalManager)**
    - Like/dislike market proposals
    - View vote counts
    - Visual feedback (liked/disliked state)

13. **Claim Winnings Page**
    - List of claimable positions
    - Claim button
    - Transaction status

14. **Market Browse/Explore**
    - Category navigation
    - Status filters (Active, Resolved, Disputed)
    - Pagination (simple, not infinite scroll)

---

## ❌ Explicit "NOT In Scope" for v0.69 (Pattern #2 Prevention)

**RULE**: Moving ANYTHING from this section requires formal scope change process

### User Interface & Experience

❌ **Component Library from Scratch**
- **Instead**: Use shadcn/ui or existing UI library
- **Rationale**: Building custom library = +2 weeks minimum

❌ **Advanced Animations**
- **Instead**: Keep transitions simple, CSS transitions only
- **Rationale**: Framer Motion integration = +1 week

❌ **Real-Time WebSocket Updates**
- **Instead**: 30-second polling for market data
- **Rationale**: WebSocket infrastructure = +1 week, adds complexity

❌ **Advanced Search**
- **Instead**: Basic text match only
- **Rationale**: Full-text search, filters = +0.5 weeks

❌ **Infinite Scroll**
- **Instead**: Simple pagination
- **Rationale**: Virtualization = +0.5 weeks

❌ **Dark Mode**
- **Instead**: Light mode only (can be v2 feature)
- **Rationale**: Theme system = +0.5 weeks

❌ **Accessibility Beyond WCAG 2.1 A**
- **Instead**: WCAG 2.1 A compliance (keyboard nav, alt text)
- **Defer to v2**: WCAG 2.1 AA (screen reader optimization)
- **Rationale**: Full AA compliance = +1 week

❌ **Mobile App (Native)**
- **Instead**: Progressive Web App (PWA) consideration only
- **Rationale**: React Native = separate project

❌ **Multi-Language Support (i18n)**
- **Instead**: English only
- **Rationale**: i18n setup = +1 week

### Social & Community Features

❌ **User Profiles (Beyond Basics)**
- **Instead**: Wallet address + basic stats only
- **Rationale**: Profile pages, avatars, bios = +0.5 weeks

❌ **Following/Followers System**
- **Rationale**: Social graph = +1 week

❌ **Notifications System**
- **Instead**: No push notifications
- **Rationale**: Notification infrastructure = +1 week

❌ **Direct Messaging**
- **Rationale**: Chat system = +2 weeks

❌ **Comment Threading/Nested Replies**
- **Instead**: Flat comments only
- **Rationale**: Threading UI = +0.5 weeks

❌ **Comment Reactions (Beyond Simple Upvote)**
- **Instead**: Simple upvote only (or no voting)
- **Rationale**: Reaction system = +0.3 weeks

❌ **User Reputation System (Advanced)**
- **Instead**: Basic win rate calculation only
- **Defer to v2**: Detailed reputation algorithm
- **Rationale**: Complex reputation = +1 week

❌ **Community Moderation Tools**
- **Instead**: Admin-only moderation
- **Defer to v2**: User flagging, reporting
- **Rationale**: Moderation system = +1 week

### Advanced Features

❌ **Advanced Analytics**
- **Instead**: Basic stats only (P&L, win rate)
- **Defer to v2**: Charts, trends, predictions
- **Rationale**: Analytics dashboard = +1 week

❌ **Portfolio Management**
- **Instead**: Simple positions list
- **Defer to v2**: Portfolio optimization, suggestions
- **Rationale**: Portfolio tools = +1 week

❌ **Market Templates**
- **Instead**: Manual market creation only
- **Rationale**: Template system = +0.5 weeks

❌ **Bulk Operations**
- **Instead**: One-at-a-time transactions
- **Rationale**: Batch transaction UI = +0.5 weeks

❌ **CSV Export**
- **Instead**: Display only
- **Defer to v2**: Export functionality
- **Rationale**: Export feature = +0.3 weeks

### Performance & Optimization

❌ **Performance Optimization Beyond Basics**
- **Instead**: Basic React.memo, lazy loading for routes
- **Defer to Week 19**: Advanced optimization sprint
- **Rationale**: Premature optimization = wasted effort

❌ **Service Worker / Offline Support**
- **Instead**: Require internet connection
- **Defer to v2**: PWA features
- **Rationale**: Service worker setup = +0.5 weeks

❌ **Code Splitting (Aggressive)**
- **Instead**: Route-based code splitting only
- **Rationale**: Component-level splitting = +0.3 weeks

❌ **Image Optimization Pipeline**
- **Instead**: Use Next.js Image component defaults
- **Rationale**: Custom optimization = +0.3 weeks

---

## 🎯 3.2X Frontend Multiplier Breakdown

### Why 9 Weeks (Not 4 Weeks)?

**Evidence from lessons-learned**: Previous Zmart frontend scope creep = 180% growth, 7,767 lines vs planned scope

| Component | Naive Estimate | Reality Multiplier | Actual Time |
|-----------|---------------|-------------------|-------------|
| **Base features** (14 items above) | 4 weeks | 1.0x | 4 weeks |
| **Component consistency** | (assumed free) | +0.5x | +2 weeks |
| **Loading/error states** | (assumed free) | +0.2x | +0.8 weeks |
| **Error handling** | (assumed free) | +0.3x | +1.2 weeks |
| **Performance optimization** | (deferred) | +0.3x | +1.2 weeks |
| **E2E testing** | (deferred) | +0.5x | +2 weeks |
| **Polish & UX refinement** | (minimal) | +0.4x | +1.6 weeks |
| **TOTAL** | **4 weeks** | **×3.2** | **≈13 weeks** |

**Adjusted to 9 weeks**: Accounting for learning curve and tool familiarity

---

## 📋 Requirements Freeze

### Freeze Timeline

- **Week 10**: Final frontend requirements review
- **Week 11**: ❄️ **FREEZE** - No scope changes allowed
- **Weeks 11-19**: Frontend development (frozen scope)
- **Week 20**: Launch preparation

### Exception Process (Rare)

**IF** something is discovered that MUST be in v1:

1. **Document**: Write scope change request (template below)
2. **Assess Impact**: Calculate % timeline extension
3. **Get Approval**: Tech lead + product owner sign off
4. **Update Docs**: Update this file, TODO_CHECKLIST.md, IMPLEMENTATION_PHASES.md
5. **Communicate**: Notify team of new timeline

**Scope Change Request Template**:

```markdown
## Scope Change Request

**Feature**: [Name]
**Justification**: [Why it's critical for v1]
**Timeline Impact**: +X weeks (or +Y%)
**Alternative**: [What happens if we defer to v2?]
**Approval**: [ ] Tech Lead [ ] Product Owner
```

---

## 🚧 Moving Items from "Not In Scope" to "In Scope"

**Process** (Pattern #2 Prevention):

1. **Pause development** of current work
2. **Schedule meeting** with tech lead (or self if solo)
3. **Assess impact**:
   - Time required: +X weeks
   - Dependencies: What else must change?
   - Testing impact: Additional test coverage needed?
4. **Make decision**:
   - **Defer to v2**: Add to backlog, continue with v1 scope
   - **Accept scope change**: Extend timeline, update all docs
5. **Document decision** in this file (changelog section below)
6. **Resume development**

---

## 📦 Tech Stack Decisions (Locked for v1)

### Framework & Libraries

| Category | Decision | Rationale |
|----------|----------|-----------|
| **Framework** | Next.js 14+ (App Router) | Modern, TypeScript-first, excellent DX |
| **Styling** | Tailwind CSS | Rapid development, consistent design |
| **UI Components** | shadcn/ui (recommended) | Pre-built, customizable, accessible |
| **State Management** | Zustand or Jotai | Simple, minimal boilerplate |
| **Forms** | React Hook Form | Best performance, great UX |
| **Charts** | Recharts | Simple, React-native, adequate for v1 |
| **Wallet** | @solana/wallet-adapter-react | Standard for Solana |
| **Date Handling** | date-fns | Lightweight, tree-shakeable |
| **Notifications** | react-hot-toast | Simple, customizable |

**Rule**: No additional libraries without explicit approval (prevents bloat)

---

## ⚠️ Early Warning Signs (Pattern #2 Prevention)

**STOP IMMEDIATELY if you see**:

✋ "Oh, I forgot we also need..." (after freeze)
✋ "While we're at it, let's add..." (scope creep!)
✋ "This feature is more complex than expected" (didn't estimate right)
✋ Adding features to "Not In Scope" list during development
✋ Building custom components when library version exists

**Red Flag Phrases**:
- "Just a quick feature..."
- "It's only a few lines..."
- "We should probably have..."
- "I assumed this was included..."

**Recovery**:
1. Document the feature in backlog (v2)
2. Continue with current scope
3. Review scope doc (this file) to confirm boundaries

---

## 📊 Scope Tracking

### Current Status

| Scope Category | Original | Current | Growth |
|----------------|----------|---------|--------|
| **Core Features** | 14 items | 14 items | 0% |
| **Timeline** | 4 weeks naive | 9 weeks realistic | 125% (expected with 3.2X) |
| **NOT In Scope** | 35 items | 35 items | 0% |

**Goal**: Maintain 0% scope growth through v1 development

### Weekly Scope Review (Fridays)

□ Any items moved from "Not In Scope" to "In Scope"? (Should be 0)
□ Any new features added to "In Scope"? (Should be 0)
□ Any scope creep indicators detected? (Should be 0)
□ Timeline still on track? (9 weeks, Weeks 11-19)

---

## 📚 Related Documents

- **Timeline**: `IMPLEMENTATION_PHASES.md` (Weeks 11-19 = frontend)
- **TODO Checklist**: `docs/TODO_CHECKLIST.md` (track feature completion)
- **Lessons Learned**: Pattern #2 (Scope Creep Explosion)
- **Definition of Done**: `docs/DEFINITION_OF_DONE.md` (quality gates)

---

## 📝 Changelog (Scope Changes)

**Purpose**: Document any approved scope changes for transparency

| Date | Change | Impact | Approval |
|------|--------|--------|----------|
| 2025-11-05 | Initial scope defined | Baseline | N/A |
| [YYYY-MM-DD] | [Description] | +X weeks | [Approver] |

---

**Last Updated**: November 5, 2025
**Version**: 1.0 (Initial Scope Definition)
**Status**: ❄️ Frozen from Week 11 onwards
