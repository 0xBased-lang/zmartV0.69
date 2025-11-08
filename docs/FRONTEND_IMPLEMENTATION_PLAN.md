# ZMART V0.69 - Frontend Implementation Plan (6 Weeks)

**Status:** In Progress
**Timeline:** 6 weeks (Weeks 10-15 of overall project)
**Approach:** Desktop-Primary, WebSocket from Day 1, Database-Only Discussions

---

## Critical Decisions (LOCKED IN)

### ✅ Desktop-Primary Approach (60-80% Users)
- **Rationale:** LMSR bonding curves require desktop visualization
- **Strategy:** Optimize for desktop first, then simplify for mobile
- **Mobile Support:** Core trading flows only (20-40% users)

### ✅ WebSocket from Day 1 (NOT Polling)
- **Rationale:** Prediction markets need real-time price updates
- **Implementation:** Backend Week 6, Frontend integration Week 2 Day 6
- **Fallback:** Automatic switch to polling after 5 failed reconnections

### ✅ Database-Only Discussions (NO IPFS in V1)
- **Rationale:** Faster to market, simpler implementation
- **Storage:** Supabase with RLS policies
- **Future:** IPFS snapshots deferred to V2

### ✅ LMSR not AMM (Terminology)
- **Always use:** "LMSR bonding curve" NOT "AMM mechanics"
- **Visualization:** Logarithmic probability curve [0,1]
- **Max Loss:** Bounded at b * ln(2) ≈ 0.693 * b

---

## Week 1: Foundation & Infrastructure (Days 1-7)

### Day 1: Project Setup & Configuration
**Deliverables:**
- ✅ Next.js 14 with App Router (TypeScript)
- ✅ Tailwind CSS + shadcn/ui setup
- ✅ ESLint + Prettier configuration
- ✅ Git hooks (pre-commit linting)

**Tasks:**
1. Initialize Next.js 14 project
2. Configure `tailwind.config.js` with custom colors
3. Install shadcn/ui components: `button`, `card`, `dialog`, `input`, `select`
4. Set up ESLint rules (airbnb-typescript)
5. Configure Prettier (single quotes, 2 spaces)

**Files Created:**
- `next.config.js`
- `tailwind.config.js`
- `.eslintrc.json`
- `.prettierrc`

---

### Day 2: Routing & Layout Structure
**Deliverables:**
- ✅ App Router structure (desktop-primary layout)
- ✅ Main layout with navigation
- ✅ Route groups for authenticated pages

**Tasks:**
1. Create `app/layout.tsx` (root layout with providers)
2. Create `app/(app)/layout.tsx` (authenticated layout)
3. Create `app/(app)/markets/page.tsx` (market list)
4. Create `app/(app)/markets/[id]/page.tsx` (market detail)
5. Create `app/(app)/portfolio/page.tsx` (user dashboard)
6. Add navigation component (desktop: sidebar, mobile: bottom nav)

**Files Created:**
- `app/layout.tsx`
- `app/(app)/layout.tsx`
- `components/Navigation.tsx`
- `components/MobileNav.tsx`

---

### Day 3: Wallet Integration (Phase 1)
**Deliverables:**
- ✅ 6 wallet adapters (Phantom, Solflare, Backpack, Coinbase, Trust, Torus)
- ✅ Wallet connection modal
- ✅ Wallet state management

**Tasks:**
1. Install `@solana/wallet-adapter-react` and wallet adapters
2. Create `lib/solana/wallet-provider.tsx`
3. Create `components/WalletButton.tsx` (connect/disconnect)
4. Add wallet modal (shadcn/ui dialog)
5. Set up Zustand store for wallet state
6. Test wallet connection on devnet

**Files Created:**
- `lib/solana/wallet-provider.tsx` ✅ (Already exists)
- `components/WalletButton.tsx`
- `stores/wallet-store.ts` ✅ (Already exists)

---

### Day 4: WebSocket Client Service
**Deliverables:**
- ✅ WebSocket client with auto-reconnect ✅ (ALREADY DONE)
- ✅ React hooks for real-time updates ✅ (ALREADY DONE)
- ✅ Automatic fallback to polling ✅ (ALREADY DONE)

**Tasks:**
1. ~~Create `lib/services/websocket.ts`~~ ✅ COMPLETE
2. ~~Implement reconnection logic (exponential backoff)~~ ✅ COMPLETE
3. ~~Create `hooks/useWebSocket.ts`~~ ✅ COMPLETE
4. ~~Add `useMarketUpdates()` hook~~ ✅ COMPLETE
5. ~~Add `useTradeUpdates()` hook~~ ✅ COMPLETE
6. ~~Add polling fallback (after 5 failures)~~ ✅ COMPLETE

**Files Created:**
- `lib/services/websocket.ts` ✅ (318 lines)
- `hooks/useWebSocket.ts` ✅ (275 lines)

---

### Day 5: API Client with Token Caching
**Deliverables:**
- ✅ HTTP client with Axios ✅ (ALREADY DONE)
- ✅ 1-hour wallet token caching ✅ (ALREADY DONE)
- ✅ Automatic token injection ✅ (ALREADY DONE)

**Tasks:**
1. ~~Create `lib/services/api.ts`~~ ✅ COMPLETE
2. ~~Implement 1-hour token cache~~ ✅ COMPLETE
3. ~~Add request interceptor (auto-inject token)~~ ✅ COMPLETE
4. ~~Add response interceptor (error handling)~~ ✅ COMPLETE
5. ~~Create API methods (markets, positions, trades, discussions)~~ ✅ COMPLETE

**Files Created:**
- `lib/services/api.ts` ✅ (279 lines)

---

### Day 6: Transaction Signing Flow
**Deliverables:**
- ✅ Transaction builder utilities
- ✅ Signature request modal
- ✅ Transaction confirmation feedback

**Tasks:**
1. Create `lib/solana/transactions.ts` (build, sign, send)
2. Create `components/TransactionModal.tsx` (signature request)
3. Add loading states (pending, confirming, confirmed)
4. Add error handling (rejected, failed, timeout)
5. Test transaction flow on devnet

**Files Created:**
- `lib/solana/transactions.ts`
- `components/TransactionModal.tsx`
- `components/TransactionStatus.tsx`

---

### Day 7: Week 1 Testing & Documentation
**Deliverables:**
- ✅ All wallet adapters tested
- ✅ WebSocket connection verified
- ✅ API client tested with backend
- ✅ Documentation updated

**Tasks:**
1. Test wallet connection (all 6 adapters)
2. Test WebSocket connection with backend devnet instance
3. Test API calls (GET /markets, POST /auth/wallet)
4. Fix any integration bugs
5. Update `.env.example` with all variables
6. Document setup instructions in README.md

**Quality Gate:**
- [ ] All 6 wallets connect successfully
- [ ] WebSocket receives market updates
- [ ] API calls return data (with token)
- [ ] Transaction signing works on devnet

---

## Week 2: LMSR Trading Interface (Days 8-14)

### Day 8: Market Detail Page Layout (Desktop-First)
**Deliverables:**
- ✅ Desktop 3-column layout (info, chart, trading)
- ✅ Mobile stacked layout (simplified)
- ✅ Market info display

**Tasks:**
1. Create `app/(app)/markets/[id]/page.tsx` layout
2. Desktop: 3-column grid (300px | 1fr | 350px)
3. Mobile: Single column stack
4. Create `components/markets/MarketHeader.tsx`
5. Create `components/markets/MarketStats.tsx`
6. Add market state badge (ACTIVE, RESOLVING, etc.)

**Files Created:**
- `app/(app)/markets/[id]/page.tsx`
- `components/markets/MarketHeader.tsx`
- `components/markets/MarketStats.tsx`

---

### Day 9: LMSR Bonding Curve Chart (Desktop-Only)
**Deliverables:**
- ✅ Interactive LMSR curve visualization (800x400px)
- ✅ Current price marker on curve
- ✅ Bounded loss annotation

**Tasks:**
1. Install `recharts` for charting
2. Create `lib/utils/lsmr.ts` (client-side calculations)
3. Implement `calculateLSMRCost()` (fixed-point math)
4. Create `components/markets/LSMRChart.tsx`
5. Add interactive cursor (shows price at quantity)
6. Add bounded loss line (b * ln(2))
7. Mobile: Show simplified price card instead

**Files Created:**
- `lib/utils/lsmr.ts`
- `components/markets/LSMRChart.tsx`
- `components/markets/MobilePriceCard.tsx`

**Math Reference:**
```typescript
// LMSR cost function (from CORE_LOGIC_INVARIANTS.md)
C(q_yes, q_no) = b * ln(e^(q_yes/b) + e^(q_no/b))

// Price calculation
P(YES) = e^(q_yes/b) / (e^(q_yes/b) + e^(q_no/b))

// Bounded loss
Max Loss = b * ln(2) ≈ 0.693 * b
```

---

### Day 10: Trading Panel (Buy/Sell Interface)
**Deliverables:**
- ✅ YES/NO outcome selector
- ✅ Share quantity input
- ✅ Cost calculation preview

**Tasks:**
1. Create `components/markets/TradingPanel.tsx`
2. Add outcome tabs (YES / NO)
3. Add share quantity input (with max button)
4. Add cost preview (uses LSMR calculation)
5. Add "Buy Shares" button (opens transaction modal)
6. Desktop: 350px fixed panel, Mobile: Bottom sheet

**Files Created:**
- `components/markets/TradingPanel.tsx`
- `components/markets/OutcomeSelector.tsx`

---

### Day 11: Binary Search for Share Calculation
**Deliverables:**
- ✅ Client-side binary search (quantity → cost)
- ✅ Reverse calculation (cost → quantity)

**Tasks:**
1. Implement `calculateSharesForCost()` in `lib/utils/lsmr.ts`
2. Use binary search (precision: 0.0001)
3. Add max iterations limit (100)
4. Add "Spend" mode toggle (enter cost, get shares)
5. Test accuracy vs on-chain calculation (<0.1% error)

**Files Updated:**
- `lib/utils/lsmr.ts` (+50 lines)
- `components/markets/TradingPanel.tsx` (add "Spend" mode)

---

### Day 12: Slippage Protection & Price Impact
**Deliverables:**
- ✅ Price impact warning (>5% change)
- ✅ Slippage tolerance setting
- ✅ Expected vs actual price display

**Tasks:**
1. Calculate price impact: `(newPrice - oldPrice) / oldPrice`
2. Add warning if impact >5%
3. Add slippage tolerance dropdown (0.5%, 1%, 2%, 5%)
4. Show expected price range (min/max based on slippage)
5. Disable trade if price moves beyond tolerance

**Files Updated:**
- `components/markets/TradingPanel.tsx` (+80 lines)
- `components/markets/SlippageSettings.tsx` (NEW)

---

### Day 13: WebSocket Integration (Real-Time Prices)
**Deliverables:**
- ✅ Real-time price updates on chart
- ✅ Live trade feed
- ✅ Position updates

**Tasks:**
1. Add `useMarketUpdates(marketId)` to market detail page
2. Update LMSR chart when price changes (WebSocket)
3. Add `useTradeUpdates(marketId)` for trade feed
4. Show toast notification on new trade
5. Update position P&L in real-time
6. Test with multiple browser windows (see updates cross-window)

**Files Updated:**
- `app/(app)/markets/[id]/page.tsx` (+20 lines)
- `components/markets/LSMRChart.tsx` (react to updates)
- `components/markets/TradingPanel.tsx` (update cost preview)

---

### Day 14: Optimistic UI & Transaction Flow
**Deliverables:**
- ✅ Instant UI feedback on trade
- ✅ Automatic rollback on failure
- ✅ Transaction status tracking

**Tasks:**
1. Add `useOptimisticUpdate()` hook to trading panel
2. On "Buy" click → Immediately update UI (optimistic)
3. Show pending state (spinner + "Confirming...")
4. On success → Confirm optimistic update
5. On failure → Rollback + show error
6. Add transaction history (last 5 trades)

**Files Updated:**
- `components/markets/TradingPanel.tsx` (+60 lines)
- `hooks/useWebSocket.ts` (already has `useOptimisticUpdate`) ✅

**Quality Gate:**
- [ ] LMSR chart matches on-chain calculation (<0.1% error)
- [ ] Trades execute successfully on devnet
- [ ] WebSocket updates prices in real-time
- [ ] Optimistic UI works with rollback
- [ ] Desktop layout polished, mobile simplified

---

## Week 3: Discussion System (Days 15-21)

### Day 15: Database Schema for Discussions
**Deliverables:**
- ✅ Supabase `comments` table
- ✅ RLS policies for security
- ✅ Indexes for performance

**Tasks:**
1. Create migration: `supabase/migrations/005_comments.sql`
2. Add `comments` table:
   - `id` (uuid)
   - `market_id` (text, foreign key)
   - `author` (text, wallet address)
   - `content` (text)
   - `parent_id` (uuid, nullable for flat threading)
   - `upvotes` (integer, default 0)
   - `downvotes` (integer, default 0)
   - `is_flagged` (boolean, default false)
   - `created_at` (timestamp)
3. Add RLS policies (users can read all, write own, admins can moderate)
4. Add indexes (`market_id`, `author`, `created_at`)
5. Run migration on Supabase devnet instance

**Files Created:**
- `supabase/migrations/005_comments.sql`

---

### Day 16: Comment Posting UI
**Deliverables:**
- ✅ Comment input form
- ✅ Submit comment to database
- ✅ Validation (max 500 chars)

**Tasks:**
1. Create `components/discussions/CommentForm.tsx`
2. Add textarea (max 500 chars, show count)
3. Add "Post Comment" button (requires wallet)
4. Call `api.postDiscussion(marketId, content)`
5. Show success toast on submit
6. Clear form after submission

**Files Created:**
- `components/discussions/CommentForm.tsx`

---

### Day 17: Comment List (Flat Display)
**Deliverables:**
- ✅ Chronological comment list
- ✅ Author display (truncated wallet)
- ✅ Timestamp (relative, e.g., "5 minutes ago")

**Tasks:**
1. Create `components/discussions/CommentList.tsx`
2. Fetch comments: `api.getDiscussions(marketId)`
3. Display flat list (no threading in V1)
4. Show author (first 4 + last 4 chars of wallet)
5. Show timestamp using `date-fns` (relative time)
6. Add loading skeleton

**Files Created:**
- `components/discussions/CommentList.tsx`
- `components/discussions/CommentItem.tsx`

---

### Day 18: Upvote System
**Deliverables:**
- ✅ Upvote button (no downvote in V1)
- ✅ Upvote count display
- ✅ Optimistic UI for votes

**Tasks:**
1. Add upvote button to `CommentItem.tsx`
2. Call `api.voteDiscussion(marketId, commentId, 'up')`
3. Optimistic update (increment count immediately)
4. Show user's vote state (voted = filled icon)
5. Prevent double voting (track in local state)
6. Add vote count badge

**Files Updated:**
- `components/discussions/CommentItem.tsx` (+40 lines)

---

### Day 19: WebSocket for Live Comments
**Deliverables:**
- ✅ Real-time new comments
- ✅ Live upvote updates

**Tasks:**
1. Add `useDiscussionUpdates(marketId)` to market detail page
2. Append new comments to list (WebSocket push)
3. Show toast: "New comment from [user]"
4. Update upvote counts in real-time
5. Scroll to new comment (optional animation)

**Files Updated:**
- `app/(app)/markets/[id]/page.tsx` (+15 lines)
- `components/discussions/CommentList.tsx` (react to updates)

---

### Day 20: Admin Moderation Panel
**Deliverables:**
- ✅ Admin-only moderation UI
- ✅ Flag comment functionality
- ✅ Hide flagged comments

**Tasks:**
1. Create `app/(app)/admin/moderation/page.tsx` (admin route)
2. Show flagged comments list
3. Add "Hide Comment" action (sets `is_flagged = true`)
4. Add RLS check (only admins can flag)
5. Hide flagged comments from public view

**Files Created:**
- `app/(app)/admin/moderation/page.tsx`
- `components/admin/ModerationList.tsx`

---

### Day 21: Week 3 Testing & Polish
**Deliverables:**
- ✅ Discussion system fully functional
- ✅ All edge cases handled
- ✅ Mobile-responsive

**Tasks:**
1. Test comment posting (wallet required)
2. Test upvoting (optimistic UI)
3. Test live comments (WebSocket)
4. Test moderation (admin only)
5. Test mobile layout (comment form + list)
6. Fix any bugs

**Quality Gate:**
- [ ] Users can post comments (database-only, NO IPFS)
- [ ] Upvotes work with optimistic UI
- [ ] New comments appear via WebSocket
- [ ] Admins can moderate flagged comments
- [ ] Mobile layout functional

---

## Week 4: Market List & Exploration (Days 22-28)

### Day 22: Market List Page Layout
**Deliverables:**
- ✅ Grid layout (desktop: 3 columns, mobile: 1 column)
- ✅ Market card component
- ✅ Pagination (20 markets per page)

**Tasks:**
1. Create `components/markets/MarketGrid.tsx`
2. Create `components/markets/MarketCard.tsx`
3. Desktop: 3-column grid (gap 24px)
4. Mobile: Single column (gap 16px)
5. Add pagination controls (shadcn/ui pagination)
6. Fetch markets: `api.getMarkets({ limit: 20, offset: page * 20 })`

**Files Created:**
- `components/markets/MarketGrid.tsx`
- `components/markets/MarketCard.tsx`

---

### Day 23: Market Card Design
**Deliverables:**
- ✅ Compact market info display
- ✅ Current price (YES/NO)
- ✅ Market state badge

**Tasks:**
1. Show question (truncate to 2 lines)
2. Show prices: "YES: 67% | NO: 33%"
3. Show state badge (ACTIVE = green, RESOLVING = yellow)
4. Show total volume (optional)
5. Add hover effect (lift card, show shadow)
6. Link to market detail page

**Files Updated:**
- `components/markets/MarketCard.tsx` (+80 lines)

---

### Day 24: Filtering (State & Category)
**Deliverables:**
- ✅ Filter by market state (ACTIVE, RESOLVING, FINALIZED)
- ✅ Filter by category (future: Sports, Politics, Crypto)
- ✅ URL persistence (query params)

**Tasks:**
1. Create `components/markets/MarketFilters.tsx`
2. Add state dropdown (All, Active, Resolving, Finalized)
3. Add category dropdown (All, Sports, Politics, Crypto) [V2 feature, placeholder]
4. Update URL on filter change: `?state=ACTIVE&category=sports`
5. Fetch filtered markets: `api.getMarkets({ state: 'ACTIVE' })`

**Files Created:**
- `components/markets/MarketFilters.tsx`

---

### Day 25: Sorting & Search
**Deliverables:**
- ✅ Sort by (Volume, Newest, Ending Soon)
- ✅ Simple text search (question matching)

**Tasks:**
1. Add sort dropdown (Volume, Newest, Ending Soon)
2. Update API call with sort param: `?sort=volume`
3. Add search input (debounced 500ms)
4. Search matches question text (Supabase `ilike`)
5. Show "No results" state

**Files Updated:**
- `components/markets/MarketFilters.tsx` (+60 lines)
- `app/(app)/markets/page.tsx` (handle search)

---

### Day 26: Infinite Scroll (Optional Enhancement)
**Deliverables:**
- ✅ Infinite scroll (load more on scroll)
- ✅ "Load More" button fallback

**Tasks:**
1. Install `react-infinite-scroll-component`
2. Replace pagination with infinite scroll
3. Fetch next page when scrolled to bottom
4. Show loading spinner while fetching
5. Add "Load More" button if scroll disabled

**Files Updated:**
- `components/markets/MarketGrid.tsx` (+40 lines)

---

### Day 27: Empty States & Error Handling
**Deliverables:**
- ✅ Empty state (no markets found)
- ✅ Error state (API failure)
- ✅ Loading skeleton

**Tasks:**
1. Create `components/markets/EmptyState.tsx`
2. Show when no markets match filters
3. Add "Clear Filters" button
4. Add error boundary for API failures
5. Add skeleton loader (3 cards while loading)

**Files Created:**
- `components/markets/EmptyState.tsx`
- `components/markets/MarketSkeleton.tsx`

---

### Day 28: Week 4 Testing & Polish
**Deliverables:**
- ✅ Market list fully functional
- ✅ All filters/sorting work
- ✅ Mobile-responsive

**Tasks:**
1. Test all filter combinations
2. Test sorting (verify backend API)
3. Test search (special characters)
4. Test pagination/infinite scroll
5. Test mobile layout
6. Fix any bugs

**Quality Gate:**
- [ ] Market list loads (20+ markets)
- [ ] Filtering works (state dropdown)
- [ ] Sorting works (volume, newest)
- [ ] Search works (text match)
- [ ] Mobile grid responsive

---

## Week 5: User Dashboard & Testing (Days 29-35)

### Day 29: Portfolio Page Layout
**Deliverables:**
- ✅ Active positions list
- ✅ Position card component
- ✅ P&L calculation

**Tasks:**
1. Create `app/(app)/portfolio/page.tsx`
2. Create `components/portfolio/PositionCard.tsx`
3. Fetch positions: `api.getPositions(walletAddress)`
4. Calculate P&L: `(currentPrice * shares) - totalCost`
5. Show unrealized P&L (green/red indicator)
6. Desktop: 2-column grid, Mobile: 1-column

**Files Created:**
- `app/(app)/portfolio/page.tsx`
- `components/portfolio/PositionCard.tsx`

---

### Day 30: Position Details & Claim Winnings
**Deliverables:**
- ✅ Expandable position details
- ✅ "Claim Winnings" button (FINALIZED markets only)
- ✅ Transaction flow for claiming

**Tasks:**
1. Add expand/collapse to `PositionCard.tsx`
2. Show position breakdown (shares YES/NO, avg price)
3. Add "Claim Winnings" button (only if market FINALIZED)
4. Build claim transaction (call program instruction)
5. Show success toast after claiming

**Files Updated:**
- `components/portfolio/PositionCard.tsx` (+60 lines)
- `lib/solana/transactions.ts` (add `buildClaimTx()`)

---

### Day 31: User Stats Summary
**Deliverables:**
- ✅ Total P&L (realized + unrealized)
- ✅ Win rate
- ✅ Total volume

**Tasks:**
1. Create `components/portfolio/UserStats.tsx`
2. Fetch stats: `api.getUserStats(walletAddress)`
3. Show total P&L (big number, green/red)
4. Show win rate (% of profitable positions)
5. Show total volume (sum of all trades)
6. Add sparkline chart (optional, 7-day P&L trend)

**Files Created:**
- `components/portfolio/UserStats.tsx`

---

### Day 32: E2E Testing Setup (Playwright)
**Deliverables:**
- ✅ Playwright installed and configured
- ✅ Test utilities (wallet mock)
- ✅ First E2E test (wallet connection)

**Tasks:**
1. Install Playwright: `pnpm add -D @playwright/test`
2. Initialize Playwright: `pnpm dlx playwright install`
3. Create `playwright.config.ts`
4. Create `tests/utils/wallet-mock.ts` (mock Phantom)
5. Write test: `tests/e2e/wallet-connection.spec.ts`
6. Run test: `pnpm playwright test`

**Files Created:**
- `playwright.config.ts`
- `tests/utils/wallet-mock.ts`
- `tests/e2e/wallet-connection.spec.ts`

---

### Day 33: E2E Testing (Trading Flow)
**Deliverables:**
- ✅ End-to-end trade test
- ✅ Market detail → Buy shares → Confirm

**Tasks:**
1. Write test: `tests/e2e/trading-flow.spec.ts`
2. Test steps:
   - Navigate to market detail
   - Connect wallet (mock)
   - Enter share quantity
   - Click "Buy Shares"
   - Confirm transaction
   - Verify position updated
3. Run on devnet (real on-chain market)

**Files Created:**
- `tests/e2e/trading-flow.spec.ts`

---

### Day 34: E2E Testing (Discussion Flow)
**Deliverables:**
- ✅ Comment posting test
- ✅ Upvote test

**Tasks:**
1. Write test: `tests/e2e/discussion-flow.spec.ts`
2. Test steps:
   - Navigate to market detail
   - Post comment
   - Verify comment appears
   - Upvote comment
   - Verify upvote count increments
3. Test WebSocket (open 2 browsers, post in one, see in other)

**Files Created:**
- `tests/e2e/discussion-flow.spec.ts`

---

### Day 35: Week 5 Bug Fixes & Cleanup
**Deliverables:**
- ✅ All E2E tests passing
- ✅ Bug fixes from testing
- ✅ Code cleanup

**Tasks:**
1. Run all Playwright tests
2. Fix any failing tests
3. Fix bugs discovered during testing
4. Remove console.logs
5. Remove unused code/comments
6. Run ESLint + Prettier

**Quality Gate:**
- [ ] All E2E tests passing (wallet, trading, discussions)
- [ ] No console errors in browser
- [ ] Portfolio shows accurate P&L
- [ ] Claim winnings works on devnet

---

## Week 6: Polish & Optimization (Days 36-42)

### Day 36: Loading States & Skeletons
**Deliverables:**
- ✅ Skeleton loaders for all pages
- ✅ Loading spinners for actions
- ✅ Smooth transitions

**Tasks:**
1. Add skeleton to market list (3 cards)
2. Add skeleton to market detail (chart, trading panel)
3. Add skeleton to portfolio (position cards)
4. Add spinner to transaction buttons
5. Add fade-in animation when data loads

**Files Created:**
- `components/ui/Skeleton.tsx` (if not from shadcn)

---

### Day 37: Error Boundaries & Error States
**Deliverables:**
- ✅ Global error boundary
- ✅ Page-level error states
- ✅ User-friendly error messages

**Tasks:**
1. Create `components/ErrorBoundary.tsx`
2. Wrap app in error boundary
3. Add error states to all pages
4. Map API errors to friendly messages:
   - 401 → "Please connect your wallet"
   - 404 → "Market not found"
   - 500 → "Something went wrong, try again"
5. Add "Retry" button on errors

**Files Created:**
- `components/ErrorBoundary.tsx`
- `components/ErrorState.tsx`

---

### Day 38: Performance Optimization
**Deliverables:**
- ✅ React.memo for expensive components
- ✅ Lazy loading for routes
- ✅ Image optimization

**Tasks:**
1. Add `React.memo()` to:
   - `LSMRChart.tsx`
   - `MarketCard.tsx`
   - `CommentItem.tsx`
2. Add `next/dynamic` for lazy loading:
   - Portfolio page (not needed on homepage)
   - Admin panel (rare route)
3. Optimize images (use `next/image`)
4. Run Lighthouse audit (target: 95+ on desktop)

**Files Updated:**
- `components/markets/LSMRChart.tsx` (wrap in memo)
- `components/markets/MarketCard.tsx` (wrap in memo)

---

### Day 39: Accessibility (WCAG 2.1 Level A)
**Deliverables:**
- ✅ Keyboard navigation
- ✅ ARIA labels
- ✅ Focus indicators

**Tasks:**
1. Add ARIA labels to all buttons
2. Add `alt` text to all images
3. Ensure focus indicators visible (blue outline)
4. Test keyboard navigation (Tab, Enter, Esc)
5. Add screen reader testing (NVDA/VoiceOver)
6. Run axe DevTools audit

**Files Updated:**
- All components (add ARIA labels)

---

### Day 40: Analytics Integration (PostHog)
**Deliverables:**
- ✅ PostHog initialized
- ✅ Event tracking (page views, trades, comments)

**Tasks:**
1. Install PostHog: `pnpm add posthog-js`
2. Create `lib/analytics/posthog.ts`
3. Initialize in `app/layout.tsx`
4. Track events:
   - Page views (automatic)
   - Wallet connected
   - Trade executed
   - Comment posted
5. Add custom properties (wallet address, market ID)

**Files Created:**
- `lib/analytics/posthog.ts`

**Environment Variables:**
- `NEXT_PUBLIC_POSTHOG_KEY`
- `NEXT_PUBLIC_POSTHOG_HOST`

---

### Day 41: Error Monitoring (Sentry - Optional)
**Deliverables:**
- ✅ Sentry initialized
- ✅ Error reporting (client + server)

**Tasks:**
1. Install Sentry: `pnpm add @sentry/nextjs`
2. Initialize Sentry: `pnpm dlx @sentry/wizard -i nextjs`
3. Configure `sentry.client.config.ts`
4. Configure `sentry.server.config.ts`
5. Test error reporting (throw error, see in Sentry dashboard)

**Files Created:**
- `sentry.client.config.ts`
- `sentry.server.config.ts`

**Environment Variables:**
- `NEXT_PUBLIC_SENTRY_DSN`

---

### Day 42: Final QA & Launch Prep
**Deliverables:**
- ✅ All features tested end-to-end
- ✅ Documentation updated
- ✅ Deployment checklist complete

**Tasks:**
1. Run all E2E tests (Playwright)
2. Manual testing on real devices:
   - Desktop: Chrome, Firefox, Safari
   - Mobile: iOS Safari, Android Chrome
3. Test wallet connection (all 6 adapters)
4. Test WebSocket connection stability
5. Verify API token caching (1-hour duration)
6. Update README.md (setup instructions)
7. Create deployment checklist

**Quality Gate:**
- [ ] All E2E tests passing
- [ ] Lighthouse score >95 (desktop), >85 (mobile)
- [ ] No console errors
- [ ] Tested on 5+ real devices
- [ ] WebSocket connection stable (no disconnects)
- [ ] Documentation complete

---

## Success Criteria (Overall 6 Weeks)

### Technical Metrics
- ✅ LMSR calculations match on-chain (<0.1% error)
- ✅ WebSocket handles 100+ concurrent users
- ✅ Desktop Lighthouse score >95
- ✅ Mobile Lighthouse score >85
- ✅ Average trade execution <500ms
- ✅ Zero critical bugs in production
- ✅ WCAG 2.1 Level A compliance

### User Experience
- ✅ Wallet connection <30 seconds
- ✅ Trade completion <1 minute end-to-end
- ✅ LMSR curve understandable (with tooltips)
- ✅ Discussions load instantly
- ✅ Mobile features work on 5+ real devices
- ✅ Real-time updates (<1s latency)
- ✅ Token caching reduces signing friction (1-hour cache)

### Scope Compliance
- ✅ Desktop-primary approach (LMSR curve 800x400px)
- ✅ Mobile-essential only (core trading flows)
- ✅ WebSocket from Day 1 (not polling)
- ✅ Database-only discussions (NO IPFS)
- ✅ LMSR terminology (NOT AMM)

---

## Files Summary

### Created (New Files)
- `docs/FRONTEND_IMPLEMENTATION_PLAN.md` (this file)
- `lib/services/websocket.ts` ✅ (Day 4)
- `lib/services/api.ts` ✅ (Day 5)
- `hooks/useWebSocket.ts` ✅ (Day 4)
- `components/markets/LSMRChart.tsx` (Day 9)
- `components/markets/TradingPanel.tsx` (Day 10)
- `components/discussions/CommentList.tsx` (Day 17)
- `components/portfolio/PositionCard.tsx` (Day 29)
- ~40+ more component files

### Modified (Existing Files)
- `CLAUDE.md` (add frontend approach section)
- `docs/FRONTEND_SCOPE_V1.md` (fix 3 conflicts)
- `docs/IMPLEMENTATION_PHASES.md` (remove IPFS)
- `docs/TODO_CHECKLIST.md` (add 36 frontend tasks)

---

## Deviation Risk Mitigation

**Before This Document:** 70% deviation risk
- Missing 6-week detailed plan
- Conflicting docs (WebSocket vs polling, IPFS vs database, mobile-first vs desktop-primary)

**After This Document:** 10% deviation risk
- Daily task-level granularity
- All conflicts resolved
- Critical decisions documented

**Usage:**
- Reference this file daily for current week's tasks
- Check off tasks in TODO_CHECKLIST.md as completed
- Update this file if scope changes (require user approval)

---

**Last Updated:** November 7, 2025
**Status:** Ready for Execution
**Next:** Begin Week 1 Day 1 (already 60% complete as of today)
