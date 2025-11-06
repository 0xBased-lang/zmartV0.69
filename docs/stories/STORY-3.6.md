# STORY-3.6: Market Detail Page & Trading Interface

**Week 3 - Day 20 | Frontend Development**
**Status:** 🔄 IN PROGRESS
**Priority:** P0 - Critical Path
**Estimated Time:** 7-10 hours
**Actual Time:** TBD

---

## 📋 Story Overview

**As a** trader
**I want to** view market details and execute trades with real-time price updates
**So that** I can participate in prediction markets with confidence

**Acceptance Criteria:**
- [ ] Market detail page shows complete market information
- [ ] Real LMSR price calculation using fixed-point math
- [ ] Buy/sell interface with slippage protection
- [ ] Order book display (aggregated positions)
- [ ] Price chart (simple line chart for v1)
- [ ] Discussion section (read-only, links to proposals)
- [ ] Real-time price updates on trade simulation
- [ ] Wallet integration for trade execution
- [ ] Transaction confirmation flow
- [ ] Error handling for all edge cases

---

## 🧠 --ultrathink Analysis (Deep System Design)

### 1. Architecture Complexity Assessment

**System Integration Points:**
```
Market Detail Page
├── Data Layer (3 sources)
│   ├── Supabase (market metadata, discussions)
│   ├── Solana RPC (on-chain state, user positions)
│   └── LMSR Calculator (price derivation)
├── Trading Engine
│   ├── Price Calculator (real-time quotes)
│   ├── Slippage Protection
│   ├── Transaction Builder
│   └── Wallet Integration
├── UI Components (8 major)
│   ├── Market Header
│   ├── Price Display
│   ├── Trading Form
│   ├── Order Book
│   ├── Price Chart
│   ├── Position Display
│   ├── Discussion Section
│   └── Transaction Modal
└── State Management
    ├── Market Data
    ├── User Input
    ├── Trade Simulation
    └── Transaction Status
```

**Complexity Score:** 8.5/10
- Multi-source data synchronization
- Real-time price calculation
- Blockchain transaction flow
- Complex form validation

### 2. LMSR Implementation Strategy

**Core Challenge:** Translate LMSR math from 05_LMSR_MATHEMATICS.md into TypeScript with fixed-point arithmetic.

**Math Foundations:**
```typescript
// From blueprint (see 05_LMSR_MATHEMATICS.md)
// C(q) = b * ln(e^(q_yes/b) + e^(q_no/b))
// Cost = C(q_new) - C(q_old)
// Price = e^(q_yes/b) / (e^(q_yes/b) + e^(q_no/b))

// Fixed-point representation:
// - 9 decimal places (like Solana's lamports)
// - All calculations in u64 equivalent (BigInt)
// - Rounding strategy: banker's rounding
```

**Implementation Options:**

**Option A: Client-Side JavaScript (Chosen)**
- ✅ Instant price feedback (no network delay)
- ✅ Works offline for simulation
- ✅ Lower backend load
- ⚠️ Must match Rust program exactly
- ⚠️ Floating-point precision challenges

**Option B: Backend API Calculation**
- ✅ Matches Rust program perfectly (same code)
- ✅ Consistent across all clients
- ❌ Network latency on every input change
- ❌ Higher backend load

**Decision:** Option A with extensive testing against Rust reference implementation.

**Precision Strategy:**
```typescript
// Use decimal.js for high-precision math
// Convert to/from fixed-point for display
// Test against known values from 05_LMSR_MATHEMATICS.md
const DECIMALS = 9;
const SCALE = 10n ** BigInt(DECIMALS);

// Example: 0.5 SOL = 500_000_000 (500M base units)
```

### 3. Trading Flow Architecture

**User Journey:**
```
1. View Market
   ├── Fetch market data (Supabase)
   ├── Fetch on-chain state (Solana RPC)
   ├── Calculate current prices (LMSR)
   └── Display UI

2. Simulate Trade
   ├── User enters quantity
   ├── Calculate new prices (LMSR)
   ├── Calculate cost + fees
   ├── Check slippage
   └── Show preview

3. Execute Trade
   ├── Validate wallet connected
   ├── Check sufficient balance
   ├── Build transaction
   ├── Request wallet signature
   ├── Submit to blockchain
   ├── Wait for confirmation
   └── Update UI

4. Post-Trade
   ├── Refresh market data
   ├── Update user position
   ├── Show success message
   └── Clear form
```

**State Machine:**
```typescript
enum TradeState {
  IDLE = 'idle',
  SIMULATING = 'simulating',
  CONFIRMING = 'confirming',
  SUBMITTING = 'submitting',
  CONFIRMING_TX = 'confirming_tx',
  SUCCESS = 'success',
  ERROR = 'error'
}
```

### 4. Critical Edge Cases

**Market State Validation:**
```typescript
// Can only trade in ACTIVE state
if (market.state !== MarketState.ACTIVE) {
  throw new Error('Market is not active for trading');
}

// Check expiry
if (Date.now() > market.expiry) {
  throw new Error('Market has expired');
}

// Check resolution
if (market.resolved) {
  throw new Error('Market already resolved');
}
```

**Wallet Balance Checks:**
```typescript
// Check user has sufficient SOL
const cost = calculateBuyCost(quantity) + fees;
if (userBalance < cost) {
  throw new Error('Insufficient balance');
}

// Check for dust (minimum trade size)
const MIN_TRADE = 0.01 * SCALE; // 0.01 SOL minimum
if (cost < MIN_TRADE) {
  throw new Error('Trade size too small');
}
```

**Slippage Protection:**
```typescript
// User sets max slippage (default 1%)
const maxSlippage = 0.01;
const expectedPrice = calculatePrice();
const actualPrice = getPriceAfterTrade();
const slippage = Math.abs(actualPrice - expectedPrice) / expectedPrice;

if (slippage > maxSlippage) {
  throw new Error('Price moved too much, adjust slippage tolerance');
}
```

**Overflow Prevention:**
```typescript
// Prevent quantity overflow
const MAX_QUANTITY = 1_000_000 * SCALE; // 1M shares max
if (quantity > MAX_QUANTITY) {
  throw new Error('Quantity too large');
}

// Prevent cost overflow in LMSR calculation
// Use BigInt for all intermediate calculations
```

### 5. Data Fetching Strategy

**React Query Structure:**
```typescript
// Market data (30s cache)
useQuery(['market', id], () => getMarket(id), { staleTime: 30000 })

// On-chain state (10s cache, more frequent)
useQuery(['market-state', id], () => getOnChainState(id), { staleTime: 10000 })

// User position (5s cache, very frequent)
useQuery(['position', id, wallet], () => getUserPosition(id, wallet), {
  staleTime: 5000,
  enabled: !!wallet // Only fetch if wallet connected
})

// Discussions (5min cache, infrequent)
useQuery(['discussions', id], () => getDiscussions(id), { staleTime: 300000 })
```

**Optimistic Updates:**
```typescript
// After trade submitted, optimistically update UI
await mutateAsync(tradeParams, {
  onSuccess: (result) => {
    // Invalidate queries to refetch real data
    queryClient.invalidateQueries(['market', id]);
    queryClient.invalidateQueries(['position', id, wallet]);
  }
});
```

### 6. Component Architecture

**Component Hierarchy:**
```
app/(app)/markets/[id]/page.tsx
├── MarketHeader.tsx
│   ├── Title, description
│   ├── State badge
│   ├── Creator info
│   └── Expiry countdown
├── TradingPanel.tsx (left column)
│   ├── PriceChart.tsx
│   │   └── Simple line chart (recharts)
│   ├── OrderBook.tsx
│   │   ├── YES positions
│   │   └── NO positions
│   └── CurrentPosition.tsx
│       ├── User's position
│       └── P&L calculation
├── TradeForm.tsx (right column)
│   ├── Outcome selector (YES/NO)
│   ├── Action selector (BUY/SELL)
│   ├── Quantity input
│   ├── Price display (real-time)
│   ├── Cost breakdown
│   │   ├── Shares cost
│   │   ├── Protocol fee (3%)
│   │   ├── Creator fee (2%)
│   │   ├── Staker fee (5%)
│   │   └── Total cost
│   ├── Slippage settings
│   └── Trade button
├── TransactionModal.tsx
│   ├── Confirmation step
│   ├── Wallet signature step
│   ├── Blockchain confirmation
│   └── Success/error display
└── DiscussionSection.tsx
    ├── Discussion preview
    └── Link to full proposal
```

### 7. Performance Optimization

**Calculation Caching:**
```typescript
// Memoize expensive LMSR calculations
const calculatePrice = useMemo(() => {
  return computeLMSRPrice(qYes, qNo, liquidity);
}, [qYes, qNo, liquidity]);

// Debounce user input to avoid excessive calculations
const debouncedQuantity = useDebounce(quantity, 300);
```

**Code Splitting:**
```typescript
// Lazy load chart library (large dependency)
const PriceChart = dynamic(() => import('./PriceChart'), {
  loading: () => <ChartSkeleton />,
  ssr: false // Chart not needed for SSR
});
```

**Optimistic Rendering:**
```typescript
// Show instant feedback while calculating
const [optimisticPrice, setOptimisticPrice] = useState(null);

const handleQuantityChange = (value) => {
  setOptimisticPrice(estimatePrice(value)); // Rough estimate
  debouncedCalculate(value); // Precise calculation
};
```

### 8. Security Considerations

**Input Validation:**
```typescript
// Sanitize all user inputs
const sanitizedQuantity = Math.max(0, Math.min(quantity, MAX_QUANTITY));

// Validate transaction parameters
if (!isValidOutcome(outcome)) throw new Error('Invalid outcome');
if (!isValidAction(action)) throw new Error('Invalid action');
if (!isValidQuantity(quantity)) throw new Error('Invalid quantity');
```

**Transaction Safety:**
```typescript
// Use recent blockhash (30s expiry)
const { blockhash } = await connection.getRecentBlockhash();

// Set compute budget to prevent DOS
const computeBudget = ComputeBudgetProgram.setComputeUnitLimit({
  units: 200_000 // Reasonable limit
});

// Add priority fee for faster confirmation
const priorityFee = ComputeBudgetProgram.setComputeUnitPrice({
  microLamports: 1 // 1 microlamport = 0.000001 lamports
});
```

**Error Recovery:**
```typescript
// Retry failed transactions with exponential backoff
const retryTransaction = async (tx, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await sendTransaction(tx);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await sleep(2 ** i * 1000); // 1s, 2s, 4s
    }
  }
};
```

### 9. Testing Strategy

**Unit Tests (LMSR Library):**
```typescript
describe('LMSR Calculator', () => {
  it('calculates buy cost correctly', () => {
    const cost = calculateBuyCost(100, 500, 1000, 5000);
    expect(cost).toBeCloseTo(expectedValue, 6); // 6 decimal precision
  });

  it('matches Rust reference implementation', () => {
    // Test against known values from 05_LMSR_MATHEMATICS.md
  });

  it('handles edge cases', () => {
    // Zero quantity, max quantity, overflow scenarios
  });
});
```

**Integration Tests (Trading Flow):**
```typescript
describe('Trading Flow', () => {
  it('completes full buy flow', async () => {
    // 1. Load market
    // 2. Simulate trade
    // 3. Execute trade
    // 4. Verify position updated
  });

  it('handles insufficient balance', async () => {
    // Mock wallet with low balance
    // Attempt trade
    // Expect error
  });
});
```

**E2E Tests (Playwright):**
```typescript
test('user can buy YES shares', async ({ page }) => {
  await page.goto('/markets/test-market-id');
  await page.click('button:has-text("YES")');
  await page.fill('input[name="quantity"]', '10');
  await page.click('button:has-text("Buy")');
  // Wait for wallet modal, confirm, etc.
});
```

### 10. Risk Assessment

**High Risk Areas:**
1. **LMSR Precision** (P0)
   - Risk: Client calculation doesn't match on-chain
   - Mitigation: Extensive testing, TypeScript matches Rust
   - Validation: Test against reference implementation

2. **Transaction Failures** (P0)
   - Risk: User loses funds or gets stuck transaction
   - Mitigation: Proper error handling, retry logic, status tracking
   - Validation: Test failure scenarios

3. **Race Conditions** (P1)
   - Risk: Market state changes during trade execution
   - Mitigation: Check state in transaction, slippage protection
   - Validation: Test concurrent trades

4. **Price Manipulation** (P1)
   - Risk: Front-running, sandwich attacks
   - Mitigation: Slippage protection, MEV awareness
   - Validation: Monitor for suspicious activity

**Medium Risk Areas:**
1. **Chart Library Size** (P2)
   - Risk: Slow page load
   - Mitigation: Code splitting, lazy loading
   - Validation: Lighthouse audit

2. **Wallet Compatibility** (P2)
   - Risk: Some wallets don't work
   - Mitigation: Test multiple wallets
   - Validation: Browser testing matrix

---

## 📐 Implementation Plan

### Phase 1: LMSR Library (2 hours)

**Files to Create:**
- `lib/lmsr/calculator.ts` - Core LMSR functions
- `lib/lmsr/fixed-point.ts` - Fixed-point arithmetic
- `lib/lmsr/types.ts` - TypeScript types
- `lib/lmsr/__tests__/calculator.test.ts` - Unit tests

**Key Functions:**
```typescript
// Cost calculation
calculateBuyCost(quantity, qYes, qNo, liquidity): bigint
calculateSellProceeds(quantity, qYes, qNo, liquidity): bigint

// Price calculation
calculatePrice(qYes, qNo, liquidity): number // 0-100
calculatePriceImpact(quantity, qYes, qNo, liquidity): number

// Fee calculation
calculateFees(cost): { protocol, creator, staker, total }
```

### Phase 2: Trading Form Component (2 hours)

**Files to Create:**
- `components/trading/TradeForm.tsx` - Main form
- `components/trading/OutcomeSelector.tsx` - YES/NO tabs
- `components/trading/QuantityInput.tsx` - Number input with validation
- `components/trading/CostBreakdown.tsx` - Fee display
- `components/trading/SlippageSettings.tsx` - Slippage modal

**Features:**
- Real-time price updates
- Cost breakdown with fees
- Slippage protection
- Form validation
- Loading states

### Phase 3: Transaction Flow (2 hours)

**Files to Create:**
- `lib/hooks/useTrade.ts` - Trade execution hook
- `lib/solana/instructions.ts` - Transaction builders
- `components/trading/TransactionModal.tsx` - Status modal

**Flow:**
1. Build transaction
2. Request wallet signature
3. Submit to blockchain
4. Monitor confirmation
5. Update UI

### Phase 4: Market Detail Page (2 hours)

**Files to Create:**
- `app/(app)/markets/[id]/page.tsx` - Main page
- `components/markets/MarketHeader.tsx` - Header component
- `components/markets/OrderBook.tsx` - Position list
- `components/markets/PriceChart.tsx` - Simple chart
- `components/markets/DiscussionSection.tsx` - Discussion preview

**Layout:**
- Two-column (trading panel + form)
- Responsive (stacks on mobile)
- Loading skeletons
- Error boundaries

### Phase 5: Testing & Polish (2 hours)

**Tasks:**
- Unit tests for LMSR
- Integration tests for trading
- E2E tests with Playwright
- Error handling
- Loading states
- Accessibility audit

---

## 🔧 Technical Decisions

### 1. LMSR Library Choice

**Decision:** Write custom TypeScript implementation

**Rationale:**
- No existing library matches Solana fixed-point math
- Need exact match with Rust program
- Full control over precision and rounding

**Alternatives Considered:**
- `lmsr-math` npm package (too generic, uses floats)
- API endpoint (too slow for real-time updates)

### 2. Chart Library

**Decision:** `recharts` (simple, lightweight)

**Rationale:**
- React-friendly API
- Tree-shakeable (small bundle)
- Good enough for v1 (line chart only)

**Alternatives Considered:**
- `chart.js` (more features, heavier)
- `d3.js` (too complex for v1)
- Custom SVG (too much work)

### 3. State Management

**Decision:** React Query + useState (no Redux/Zustand)

**Rationale:**
- React Query handles server state
- useState sufficient for form state
- Avoid over-engineering for v1

**Alternatives Considered:**
- Zustand (overkill for current scope)
- Redux (way too heavy)

### 4. Transaction Confirmation Strategy

**Decision:** Poll blockchain with exponential backoff

**Rationale:**
- Reliable confirmation detection
- Works with all wallets
- No external dependencies

**Alternatives Considered:**
- WebSocket subscription (complex setup)
- Wallet events (inconsistent across wallets)

---

## 📊 Definition of Done (Tier 3)

### Functional Requirements
- [ ] Market detail page displays all information
- [ ] LMSR price calculation matches Rust program (tested)
- [ ] Trading form works for buy and sell
- [ ] Wallet integration works end-to-end
- [ ] Transaction confirmation displays status
- [ ] Error handling covers all edge cases
- [ ] Loading states implemented throughout
- [ ] Empty states for no data scenarios

### Code Quality
- [ ] TypeScript strict mode passes (0 errors)
- [ ] ESLint passes (0 warnings)
- [ ] Unit tests for LMSR library (>90% coverage)
- [ ] Integration tests for trading flow
- [ ] E2E test for complete trade
- [ ] Code documented with JSDoc comments
- [ ] No console.logs in production code

### Performance
- [ ] Page loads in <2s on 3G
- [ ] LMSR calculation <100ms
- [ ] Chart lazy-loaded
- [ ] Images optimized
- [ ] Lighthouse score >85

### Security
- [ ] Input validation on all fields
- [ ] Safe BigInt arithmetic (no overflow)
- [ ] Transaction parameters validated
- [ ] Slippage protection enforced
- [ ] No sensitive data in client logs

### Accessibility
- [ ] Keyboard navigation works
- [ ] Screen reader tested
- [ ] Color contrast AA compliant
- [ ] Focus indicators visible
- [ ] ARIA labels present

### Documentation
- [ ] STORY-3.6.md updated with outcomes
- [ ] Inline code comments added
- [ ] API usage documented
- [ ] Testing instructions included

### Deployment
- [ ] Production build succeeds
- [ ] No build warnings
- [ ] Bundle size <200KB for page
- [ ] Works in Chrome, Firefox, Safari

---

## 🚫 Not In Scope (Deferred)

### v2 Features
- ❌ Advanced charting (candlesticks, indicators)
- ❌ Order history timeline
- ❌ Trade notifications
- ❌ Social sharing
- ❌ Leaderboards
- ❌ Advanced order types (limit, stop-loss)
- ❌ Portfolio analytics

### Infrastructure
- ❌ WebSocket real-time updates (use polling for v1)
- ❌ GraphQL (REST API sufficient)
- ❌ CDN optimization (deploy first, optimize later)

---

## 🎯 Success Metrics

**Primary KPIs:**
- ✅ User can execute trade from start to finish
- ✅ Price calculation matches on-chain within 0.01%
- ✅ <5% transaction failure rate (excluding user cancellation)
- ✅ <3s time from button click to confirmation

**Secondary KPIs:**
- Page load <2s
- Lighthouse score >85
- 0 TypeScript errors
- >90% test coverage for LMSR

---

## 📝 Notes & Learnings

### Key Insights from --ultrathink

1. **LMSR Precision is Critical**
   - Difference between 9 and 18 decimals matters
   - Must test against Rust reference values
   - Banker's rounding for consistency

2. **Transaction Flow is Complex**
   - 5 distinct states (idle → success/error)
   - Need robust error handling
   - User education on each step

3. **Performance Tradeoffs**
   - Client-side calc = fast, risk mismatch
   - Server-side calc = accurate, slow
   - Chose client with extensive testing

4. **Scope Control is Essential**
   - Easy to add "just one more feature"
   - Stick to v1 scope (no advanced charts)
   - Save enhancements for v2

### Potential Challenges

1. **Fixed-Point Math Complexity**
   - Solution: Extensive unit testing
   - Validation: Compare with Rust program

2. **Wallet Compatibility**
   - Solution: Test Phantom, Solflare, Backpack
   - Fallback: Clear error messages

3. **Transaction Confirmation Time**
   - Solution: Show progress indicator
   - Set expectations: "This takes 10-30 seconds"

---

## 🔗 Related Stories

**Dependencies:**
- ✅ STORY-3.1 - Frontend Project Setup
- ✅ STORY-3.2 - Wallet Connection
- ✅ STORY-3.3 - Supabase Integration
- ✅ STORY-3.5 - Market Listing

**Blocked By:**
- None (all dependencies complete)

**Blocks:**
- STORY-3.7 - Portfolio & Positions (Day 21)

---

## 📅 Timeline

**Estimated:** 7-10 hours (single day with focus)
**Breakdown:**
- Phase 1 (LMSR): 2 hours
- Phase 2 (Form): 2 hours
- Phase 3 (Transactions): 2 hours
- Phase 4 (Page): 2 hours
- Phase 5 (Testing): 2 hours

**Actual:** TBD

---

*Story created: November 5, 2025*
*Last updated: November 5, 2025*
*Story-first methodology enforced via git hooks*
