# STORY-3.5: Market Listing & Card Components (Day 19)

**Status:** 📋 IN PROGRESS
**Created:** November 6, 2025
**Tier:** Tier 3 (Full Feature - Complete DoD)
**Estimated:** 5-7 hours
**Owner:** Frontend Team
**Priority:** P0 Critical

---

## 📋 User Story

**As a** user visiting the ZMART platform
**I want** to see a list of active prediction markets with key information
**So that** I can browse markets and decide which ones to trade on

---

## 🎯 Acceptance Criteria

### Functional Requirements

1. **GIVEN** I navigate to the Markets page
   **WHEN** The page loads
   **THEN** I see a grid of market cards displaying active markets

2. **GIVEN** I'm viewing a market card
   **WHEN** I look at the card
   **THEN** I see title, YES/NO prices, volume, expiry date, and market state

3. **GIVEN** I want to filter markets
   **WHEN** I select a state filter (Active, Resolving, etc.)
   **THEN** The list updates to show only markets in that state

4. **GIVEN** I want to sort markets
   **WHEN** I select a sort option (Newest, Highest Volume, Ending Soon)
   **THEN** The list reorders according to my selection

5. **GIVEN** I click on a market card
   **WHEN** The click event fires
   **THEN** I navigate to the market detail page

6. **GIVEN** There are no markets matching my filters
   **WHEN** The filtered list is empty
   **THEN** I see a friendly empty state message

### Non-Functional Requirements

□ **Performance**: Market list loads in <500ms
□ **Responsive**: Works on mobile (1 col), tablet (2 col), desktop (3 col)
□ **Accessibility**: Keyboard navigable, semantic HTML, ARIA labels
□ **Error Handling**: Graceful degradation if Supabase query fails

---

## 🏗️ Technical Implementation

### Definition of Done Tier

**Selected Tier**: Tier 3 (Full Feature - 10 criteria)

**Rationale**: This is a complete feature with data fetching, state management, filtering, sorting, and responsive UI. Requires comprehensive testing and documentation.

### Files to Create

**Components** (6 files):
- `components/markets/MarketCard.tsx` - Individual market card
- `components/markets/MarketGrid.tsx` - Responsive grid container
- `components/markets/MarketFilters.tsx` - Filter and sort controls
- `components/markets/PriceDisplay.tsx` - YES/NO price component
- `components/markets/StateBadge.tsx` - Market state indicator
- `components/markets/EmptyState.tsx` - No markets found UI

**Hooks** (1 file):
- `lib/hooks/useMarkets.ts` - React Query hook for market data

**Types** (1 file):
- `types/market.ts` - Market-related TypeScript types

### Files to Modify

- `app/(app)/markets/page.tsx` - Replace placeholder with real implementation
- `lib/supabase/database.ts` - Enhance market queries with filters/sort

---

## 📐 Implementation Plan

### Phase 1: Data Layer & Types (45 min)

**1.1 Create Market Types**

Create `types/market.ts`:
```typescript
/**
 * Market state enum (matches Solana program)
 */
export enum MarketState {
  PROPOSED = 0,
  APPROVED = 1,
  ACTIVE = 2,
  RESOLVING = 3,
  DISPUTED = 4,
  FINALIZED = 5,
}

/**
 * Market state display labels
 */
export const MARKET_STATE_LABELS: Record<MarketState, string> = {
  [MarketState.PROPOSED]: 'Proposed',
  [MarketState.APPROVED]: 'Approved',
  [MarketState.ACTIVE]: 'Active',
  [MarketState.RESOLVING]: 'Resolving',
  [MarketState.DISPUTED]: 'Disputed',
  [MarketState.FINALIZED]: 'Finalized',
};

/**
 * Market state colors for badges
 */
export const MARKET_STATE_COLORS: Record<MarketState, string> = {
  [MarketState.PROPOSED]: 'bg-yellow-100 text-yellow-800',
  [MarketState.APPROVED]: 'bg-blue-100 text-blue-800',
  [MarketState.ACTIVE]: 'bg-green-100 text-green-800',
  [MarketState.RESOLVING]: 'bg-orange-100 text-orange-800',
  [MarketState.DISPUTED]: 'bg-red-100 text-red-800',
  [MarketState.FINALIZED]: 'bg-gray-100 text-gray-800',
};

/**
 * Market data from Supabase
 */
export interface Market {
  market_id: string;
  title: string;
  description: string;
  state: MarketState;
  created_at: string;
  expires_at: string;
  q_yes: string; // BigInt as string
  q_no: string; // BigInt as string
  liquidity_parameter: string; // BigInt as string
  total_volume: string; // BigInt as string
  creator: string;
}

/**
 * Calculated market prices (for display)
 */
export interface MarketPrices {
  yesPrice: number; // 0-100 (percentage)
  noPrice: number; // 0-100 (percentage)
}

/**
 * Filter options for market list
 */
export interface MarketFilters {
  state?: MarketState;
  sortBy: 'newest' | 'volume' | 'ending_soon';
}
```

**1.2 Enhance Supabase Queries**

Update `lib/supabase/database.ts`:
```typescript
import { supabase } from './client';
import type { Market } from '@/types/market';
import { MarketState } from '@/types/market';

/**
 * Get markets with optional filtering and sorting
 */
export async function getMarkets(filters?: {
  state?: MarketState;
  sortBy?: 'newest' | 'volume' | 'ending_soon';
}): Promise<Market[]> {
  let query = supabase.from('markets').select('*');

  // Filter by state if provided
  if (filters?.state !== undefined) {
    query = query.eq('state', filters.state);
  }

  // Sort based on option
  if (filters?.sortBy === 'newest') {
    query = query.order('created_at', { ascending: false });
  } else if (filters?.sortBy === 'volume') {
    query = query.order('total_volume', { ascending: false });
  } else if (filters?.sortBy === 'ending_soon') {
    query = query.order('expires_at', { ascending: true });
  } else {
    // Default: newest first
    query = query.order('created_at', { ascending: false });
  }

  const { data, error } = await query;

  if (error) {
    console.error('Failed to fetch markets:', error);
    throw error;
  }

  return data as Market[];
}

/**
 * Get single market by ID
 */
export async function getMarketById(marketId: string): Promise<Market | null> {
  const { data, error } = await supabase
    .from('markets')
    .select('*')
    .eq('market_id', marketId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // Not found
      return null;
    }
    console.error('Failed to fetch market:', error);
    throw error;
  }

  return data as Market;
}
```

**1.3 Create React Query Hook**

Create `lib/hooks/useMarkets.ts`:
```typescript
import { useQuery } from '@tanstack/react-query';
import { getMarkets } from '@/lib/supabase/database';
import type { Market, MarketFilters } from '@/types/market';

/**
 * Hook to fetch markets with filtering and caching
 */
export function useMarkets(filters?: MarketFilters) {
  return useQuery<Market[], Error>({
    queryKey: ['markets', filters],
    queryFn: () => getMarkets(filters),
    staleTime: 30 * 1000, // 30 seconds
    refetchOnWindowFocus: true,
  });
}
```

---

### Phase 2: Utility Components (1 hour)

**2.1 Create StateBadge Component**

Create `components/markets/StateBadge.tsx`:
```typescript
import { MarketState, MARKET_STATE_LABELS, MARKET_STATE_COLORS } from '@/types/market';
import { cn } from '@/lib/utils';

interface StateBadgeProps {
  state: MarketState;
  className?: string;
}

export function StateBadge({ state, className }: StateBadgeProps) {
  const label = MARKET_STATE_LABELS[state];
  const colorClass = MARKET_STATE_COLORS[state];

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        colorClass,
        className
      )}
    >
      {label}
    </span>
  );
}
```

**2.2 Create PriceDisplay Component**

Create `components/markets/PriceDisplay.tsx`:
```typescript
interface PriceDisplayProps {
  yesPrice: number; // 0-100
  noPrice: number; // 0-100
  className?: string;
}

export function PriceDisplay({ yesPrice, noPrice, className }: PriceDisplayProps) {
  return (
    <div className={className}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <div className="text-xs text-gray-500 mb-1">YES</div>
          <div className="text-lg font-bold text-green-600">{yesPrice.toFixed(1)}%</div>
        </div>
        <div className="flex-1">
          <div className="text-xs text-gray-500 mb-1">NO</div>
          <div className="text-lg font-bold text-red-600">{noPrice.toFixed(1)}%</div>
        </div>
      </div>
    </div>
  );
}
```

**2.3 Create EmptyState Component**

Create `components/markets/EmptyState.tsx`:
```typescript
import Link from 'next/link';

interface EmptyStateProps {
  hasFilters?: boolean;
}

export function EmptyState({ hasFilters = false }: EmptyStateProps) {
  return (
    <div className="text-center py-12">
      <div className="text-6xl mb-4">🔍</div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">
        {hasFilters ? 'No markets found' : 'No markets yet'}
      </h3>
      <p className="text-gray-600 mb-6 max-w-md mx-auto">
        {hasFilters
          ? 'Try adjusting your filters to see more markets.'
          : 'Be the first to create a prediction market!'}
      </p>
      {!hasFilters && (
        <Link
          href="/markets/create"
          className="inline-flex items-center justify-center px-6 py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary/90 transition-colors"
        >
          Create Market
        </Link>
      )}
    </div>
  );
}
```

---

### Phase 3: MarketCard Component (1 hour)

**3.1 Create MarketCard**

Create `components/markets/MarketCard.tsx`:
```typescript
'use client';

import Link from 'next/link';
import type { Market } from '@/types/market';
import { StateBadge } from './StateBadge';
import { PriceDisplay } from './PriceDisplay';
import { formatDistanceToNow } from 'date-fns';

interface MarketCardProps {
  market: Market;
}

/**
 * Calculate mock prices for now (will be replaced with real LMSR calculation)
 * For MVP, use simple 50/50 split with some randomness based on volume
 */
function calculateMockPrices(market: Market): { yesPrice: number; noPrice: number } {
  // TODO: Implement real LMSR price calculation in Day 20
  // For now, create some variation based on market_id hash
  const hash = market.market_id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const yesPrice = 40 + (hash % 20); // Range: 40-60%
  const noPrice = 100 - yesPrice;

  return { yesPrice, noPrice };
}

/**
 * Format volume from BigInt string to human-readable
 */
function formatVolume(volumeStr: string): string {
  const volume = parseInt(volumeStr) / 1e9; // Convert lamports to SOL

  if (volume >= 1000000) {
    return `$${(volume / 1000000).toFixed(1)}M`;
  } else if (volume >= 1000) {
    return `$${(volume / 1000).toFixed(1)}K`;
  } else {
    return `$${volume.toFixed(0)}`;
  }
}

export function MarketCard({ market }: MarketCardProps) {
  const { yesPrice, noPrice } = calculateMockPrices(market);
  const volume = formatVolume(market.total_volume);
  const createdAgo = formatDistanceToNow(new Date(market.created_at), { addSuffix: true });
  const expiresAt = new Date(market.expires_at);
  const hasExpired = expiresAt < new Date();
  const expiryText = hasExpired
    ? `Expired ${formatDistanceToNow(expiresAt, { addSuffix: true })}`
    : `Ends ${formatDistanceToNow(expiresAt, { addSuffix: true })}`;

  return (
    <Link href={`/markets/${market.market_id}`}>
      <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg hover:border-primary/50 transition-all cursor-pointer group">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 group-hover:text-primary transition-colors line-clamp-2 flex-1">
            {market.title}
          </h3>
          <StateBadge state={market.state} className="ml-3 flex-shrink-0" />
        </div>

        {/* Description */}
        <p className="text-sm text-gray-600 mb-4 line-clamp-2">{market.description}</p>

        {/* Prices */}
        <PriceDisplay yesPrice={yesPrice} noPrice={noPrice} className="mb-4" />

        {/* Stats */}
        <div className="flex items-center justify-between text-xs text-gray-500 pt-4 border-t border-gray-100">
          <div className="flex items-center gap-4">
            <div>
              <span className="font-medium">Volume:</span> {volume}
            </div>
            <div>
              <span className="font-medium">{expiryText}</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
```

---

### Phase 4: MarketFilters Component (45 min)

**4.1 Create MarketFilters**

Create `components/markets/MarketFilters.tsx`:
```typescript
'use client';

import { MarketState, MARKET_STATE_LABELS } from '@/types/market';
import type { MarketFilters as Filters } from '@/types/market';

interface MarketFiltersProps {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
}

export function MarketFilters({ filters, onFiltersChange }: MarketFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-4 mb-6">
      {/* State Filter */}
      <div className="flex-1">
        <label htmlFor="state-filter" className="block text-sm font-medium text-gray-700 mb-2">
          Filter by State
        </label>
        <select
          id="state-filter"
          value={filters.state ?? 'all'}
          onChange={(e) => {
            const value = e.target.value;
            onFiltersChange({
              ...filters,
              state: value === 'all' ? undefined : parseInt(value) as MarketState,
            });
          }}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
        >
          <option value="all">All States</option>
          <option value={MarketState.PROPOSED}>{MARKET_STATE_LABELS[MarketState.PROPOSED]}</option>
          <option value={MarketState.APPROVED}>{MARKET_STATE_LABELS[MarketState.APPROVED]}</option>
          <option value={MarketState.ACTIVE}>{MARKET_STATE_LABELS[MarketState.ACTIVE]}</option>
          <option value={MarketState.RESOLVING}>{MARKET_STATE_LABELS[MarketState.RESOLVING]}</option>
          <option value={MarketState.DISPUTED}>{MARKET_STATE_LABELS[MarketState.DISPUTED]}</option>
          <option value={MarketState.FINALIZED}>{MARKET_STATE_LABELS[MarketState.FINALIZED]}</option>
        </select>
      </div>

      {/* Sort By */}
      <div className="flex-1">
        <label htmlFor="sort-by" className="block text-sm font-medium text-gray-700 mb-2">
          Sort By
        </label>
        <select
          id="sort-by"
          value={filters.sortBy}
          onChange={(e) => {
            onFiltersChange({
              ...filters,
              sortBy: e.target.value as Filters['sortBy'],
            });
          }}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
        >
          <option value="newest">Newest First</option>
          <option value="volume">Highest Volume</option>
          <option value="ending_soon">Ending Soon</option>
        </select>
      </div>
    </div>
  );
}
```

---

### Phase 5: MarketGrid Component (30 min)

**5.1 Create MarketGrid**

Create `components/markets/MarketGrid.tsx`:
```typescript
import type { Market } from '@/types/market';
import { MarketCard } from './MarketCard';
import { EmptyState } from './EmptyState';

interface MarketGridProps {
  markets: Market[];
  loading?: boolean;
  hasFilters?: boolean;
}

/**
 * Loading skeleton for market cards
 */
function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
          <div className="h-6 bg-gray-200 rounded mb-4"></div>
          <div className="h-4 bg-gray-200 rounded mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="flex gap-4 mb-4">
            <div className="flex-1 h-12 bg-gray-200 rounded"></div>
            <div className="flex-1 h-12 bg-gray-200 rounded"></div>
          </div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      ))}
    </div>
  );
}

export function MarketGrid({ markets, loading = false, hasFilters = false }: MarketGridProps) {
  if (loading) {
    return <LoadingSkeleton />;
  }

  if (markets.length === 0) {
    return <EmptyState hasFilters={hasFilters} />;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {markets.map((market) => (
        <MarketCard key={market.market_id} market={market} />
      ))}
    </div>
  );
}
```

---

### Phase 6: MarketsPage Integration (45 min)

**6.1 Update MarketsPage**

Update `app/(app)/markets/page.tsx`:
```typescript
'use client';

import { useState } from 'react';
import { useMarkets } from '@/lib/hooks/useMarkets';
import { MarketFilters } from '@/components/markets/MarketFilters';
import { MarketGrid } from '@/components/markets/MarketGrid';
import type { MarketFilters as Filters } from '@/types/market';

export default function MarketsPage() {
  const [filters, setFilters] = useState<Filters>({
    sortBy: 'newest',
  });

  const { data: markets = [], isLoading, error } = useMarkets(filters);

  const hasFilters = filters.state !== undefined;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Active Markets</h1>
        <p className="text-gray-600 mt-2">
          Explore and trade on prediction markets
        </p>
      </div>

      {/* Filters */}
      <MarketFilters filters={filters} onFiltersChange={setFilters} />

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
          <h3 className="font-semibold text-red-800 mb-2">
            Failed to load markets
          </h3>
          <p className="text-red-700 text-sm">
            {error.message || 'An error occurred while fetching markets. Please try again.'}
          </p>
        </div>
      )}

      {/* Market Grid */}
      <MarketGrid markets={markets} loading={isLoading} hasFilters={hasFilters} />
    </div>
  );
}
```

---

### Phase 7: Dependencies Installation (5 min)

**7.1 Install date-fns**

```bash
cd frontend
pnpm add date-fns
```

---

## 🔗 Dependencies

**Requires:**
- ✅ Day 18 complete (Layout & Navigation)
- ✅ Supabase integration (Day 17)
- ✅ React Query installed (Day 15)

**Provides:**
- Market listing functionality
- Filter and sort capabilities
- Reusable market card component
- Foundation for market detail page (Day 20)

---

## 📊 Definition of Done (Tier 3 - Full Feature)

### Code Quality (3/3) ✅
- [ ] TypeScript strict mode, zero errors
- [ ] ESLint passes, zero warnings
- [ ] Code reviewed (self-review for solo)

### Build & Validation (3/3) ✅
- [ ] `pnpm type-check` passes
- [ ] `pnpm lint` passes
- [ ] `pnpm build` succeeds

### Testing (2/2) ✅
- [ ] Manual testing complete (all test cases pass)
- [ ] No console errors/warnings

### Documentation (2/2) ✅
- [ ] STORY-3.5.md updated with completion notes
- [ ] Component documentation (JSDoc comments)

---

## 🧪 Test Cases

### Manual Testing

1. **Market List Display**:
   - Navigate to /markets
   - ✅ Verify: Markets display in grid layout
   - ✅ Verify: Cards show title, prices, volume, expiry

2. **Filtering**:
   - Select "Active" from state filter
   - ✅ Verify: Only active markets shown
   - Select "All States"
   - ✅ Verify: All markets shown again

3. **Sorting**:
   - Select "Highest Volume"
   - ✅ Verify: Markets sorted by volume (highest first)
   - Select "Ending Soon"
   - ✅ Verify: Markets sorted by expiry (soonest first)

4. **Empty State**:
   - Filter by state with no markets
   - ✅ Verify: Empty state message shown

5. **Navigation**:
   - Click on a market card
   - ✅ Verify: Navigates to market detail page

6. **Responsive Design**:
   - Test on mobile (320px)
   - ✅ Verify: 1 column grid
   - Test on tablet (768px)
   - ✅ Verify: 2 column grid
   - Test on desktop (1024px+)
   - ✅ Verify: 3 column grid

7. **Loading State**:
   - Reload page
   - ✅ Verify: Loading skeleton shows
   - ✅ Verify: Skeleton replaced with data

---

## 🔍 Technical Notes

### Mock Price Calculation

For Day 19, we're using mock prices based on market ID hash. This will be replaced with real LMSR calculation in Day 20 when we implement the market detail page.

**Real LMSR Formula** (from 05_LMSR_MATHEMATICS.md):
```
P(YES) = e^(q_yes/b) / (e^(q_yes/b) + e^(q_no/b))
P(NO) = 1 - P(YES)
```

### BigInt Handling

Market data from Solana uses BigInt for quantities and volumes. We're storing them as strings in Supabase and parsing them for display.

### React Query Caching

Markets are cached for 30 seconds (`staleTime: 30000`). This reduces unnecessary database queries while keeping data reasonably fresh.

### Responsive Grid Breakpoints

- **Mobile** (<640px): 1 column
- **Tablet** (640px-1024px): 2 columns
- **Desktop** (>1024px): 3 columns

---

## 🚨 Anti-Pattern Prevention

**Pattern #2 (Scope Creep):**
- ✅ No advanced filtering (category, price range) - defer to v2
- ✅ No user favorites/bookmarks - defer to v2
- ✅ No market search - defer to v2

**Pattern #3 (Reactive Crisis Loop):**
- ✅ Loading states planned upfront
- ✅ Error handling implemented
- ✅ Empty state designed

**Pattern #6 (Security Afterthought):**
- ✅ Server-side filtering (Supabase RLS)
- ✅ Client-side validation
- ✅ Safe BigInt parsing

---

## 📝 Story Completion Checklist

- [ ] All acceptance criteria met (6 functional, 4 non-functional)
- [ ] All Tier 3 DoD items complete (10 criteria)
- [ ] Manual tests passing (7 test cases)
- [ ] date-fns dependency installed
- [ ] All components created (6 files)
- [ ] MarketsPage fully functional
- [ ] Loading and error states working
- [ ] Responsive design verified
- [ ] Code committed with proper message
- [ ] Story marked COMPLETE in git commit
- [ ] Day 19 marked complete in TODO_CHECKLIST.md
- [ ] STORY-3.6.md ready to start (Day 20)

---

**Story Points:** 5-7 hours
**Complexity:** High
**Risk Level:** Medium (data fetching, state management)
**Dependencies:** Day 17, 18 complete ✅

---

*Created: November 6, 2025 | Day 19 of Week 3 Frontend Development*
