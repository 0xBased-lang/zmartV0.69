# Frontend Component Implementation Template

**Purpose**: Step-by-step guide for implementing React/Next.js components with full testing
**Time**: 4-8 hours per component (broken into 20 micro-steps of 15-30 min each)
**Usage**: Follow this template for EVERY frontend component you implement
**WARNING**: Frontend has 3.2X scope multiplier - STRICT adherence required!

---

## 📋 Prerequisites

Before starting, ensure you have:
- [ ] Story file created: `docs/stories/STORY-X.Y.md`
- [ ] Feature branch: `feature/story-X-Y-component-name`
- [ ] Component in FRONTEND_SCOPE_V1.md "In Scope" list (CRITICAL!)
- [ ] Reference docs open:
  - `docs/FRONTEND_SCOPE_V1.md` (scope boundaries)
  - `docs/10_FRONTEND_ARCHITECTURE.md` (if exists)
  - Design mockups (Figma)

---

## 🚨 CRITICAL: Scope Check (5 min)

**STOP and verify BEFORE implementing**:

```
□ Is this component explicitly in FRONTEND_SCOPE_V1.md "In Scope" list?
  If NO → STOP, do NOT implement
  If YES → Continue

□ Does this component add features NOT in scope?
  If YES → STOP, remove features
  If NO → Continue

□ Is this a "nice to have" or "while I'm at it" feature?
  If YES → STOP, defer to v2
  If NO → Continue
```

**Pattern #2 Prevention**: This check prevents 180% scope creep

---

## 🎯 PHASE 1: Planning & Design (45 min total)

### Step 1.1: Understand Component Requirements (15 min)

```
□ Read story file acceptance criteria
  - What user need does this solve?
  - What are the key interactions?
  - What data does it display?

□ Review design mockup (Figma)
  - Exact visual specs?
  - Responsive behavior?
  - Loading/error states?

□ Check FRONTEND_SCOPE_V1.md
  - What features are explicitly in scope?
  - What features are explicitly NOT in scope?

□ Document in story file
  - 2-3 sentence component purpose
  - List key props/state
  - Note API endpoints needed
```

**Validation**: Can you describe this component in one sentence?

---

### Step 1.2: Define Component API (30 min)

```typescript
// Sketch out component props interface
interface ComponentNameProps {
  // Required props
  marketId: string;
  onSubmit: (data: Data) => Promise<void>;

  // Optional props with defaults
  className?: string;
  disabled?: boolean;

  // Callbacks
  onError?: (error: Error) => void;
}

// Sketch out internal state
interface ComponentState {
  isLoading: boolean;
  error: Error | null;
  data: Data | null;
}
```

**Checklist**:
```
□ All required props identified
□ Optional props with defaults
□ Callbacks for key events
□ Internal state planned
□ Types match backend API
```

**Validation**: Are prop names clear and consistent?

---

## 🏗️ PHASE 2: Component Structure (60 min total)

### Step 2.1: Create Component File (15 min)

**File Structure** (Next.js 14 App Router):
```
app/
└── (app)/
    └── markets/
        └── [id]/
            └── components/
                └── ComponentName/
                    ├── index.tsx          # Main component
                    ├── ComponentName.tsx  # Implementation
                    ├── types.ts           # TypeScript types
                    └── __tests__/
                        └── ComponentName.test.tsx
```

**Create files**:
```bash
cd app/(app)/markets/[id]/components
mkdir ComponentName
cd ComponentName
touch index.tsx ComponentName.tsx types.ts
mkdir __tests__
touch __tests__/ComponentName.test.tsx
```

**Checklist**:
```
□ Directory created
□ All files created
□ Follows project structure
```

---

### Step 2.2: Define TypeScript Types (15 min)

**File**: `types.ts`

```typescript
/**
 * Props for ComponentName
 */
export interface ComponentNameProps {
  /** Unique market identifier */
  marketId: string;

  /** Callback when user submits */
  onSubmit: (data: SubmitData) => Promise<void>;

  /** Optional CSS classes */
  className?: string;

  /** Disable all interactions */
  disabled?: boolean;

  /** Callback for errors */
  onError?: (error: Error) => void;
}

/**
 * Data structure for submission
 */
export interface SubmitData {
  outcome: boolean; // true = YES, false = NO
  amount: number;   // In SOL
}

/**
 * Internal component state
 */
export interface ComponentState {
  isLoading: boolean;
  error: Error | null;
  data: ResponseData | null;
}

/**
 * API response shape
 */
export interface ResponseData {
  shares: number;
  cost: number;
  priceAfter: number;
}
```

**Checklist**:
```
□ All interfaces exported
□ JSDoc comments for all types
□ Types match backend API
□ Optional props marked with ?
```

---

### Step 2.3: Create Component Skeleton (30 min)

**File**: `ComponentName.tsx`

```typescript
'use client';

import { useState } from 'react';
import { ComponentNameProps, ComponentState } from './types';

/**
 * ComponentName - [Brief description]
 *
 * @example
 * ```tsx
 * <ComponentName
 *   marketId="123"
 *   onSubmit={handleSubmit}
 * />
 * ```
 */
export function ComponentName({
  marketId,
  onSubmit,
  className = '',
  disabled = false,
  onError,
}: ComponentNameProps) {
  // State
  const [state, setState] = useState<ComponentState>({
    isLoading: false,
    error: null,
    data: null,
  });

  // Handlers (implemented in next phase)
  const handleSubmit = async () => {
    // TODO
  };

  // Render
  return (
    <div className={className}>
      <h2>Component Name</h2>
      {/* Implementation in next phase */}
    </div>
  );
}

// Export for index
export default ComponentName;
```

**File**: `index.tsx`
```typescript
export { ComponentName } from './ComponentName';
export type { ComponentNameProps } from './types';
```

**Checklist**:
```
□ 'use client' directive (if client component)
□ Props destructured with defaults
□ State initialized
□ Handler stubs created
□ JSDoc comment with example
□ Default export for lazy loading
```

**Validation**: Does TypeScript compile without errors?

---

## 💻 PHASE 3: Implementation (120-180 min total)

### Step 3.1: Implement Data Fetching (30 min)

```typescript
import { useQuery } from '@tanstack/react-query';

export function ComponentName({ marketId, ...props }: ComponentNameProps) {
  // Fetch market data
  const {
    data: marketData,
    isLoading: isLoadingMarket,
    error: marketError,
  } = useQuery({
    queryKey: ['market', marketId],
    queryFn: () => fetch(`/api/markets/${marketId}`).then(r => r.json()),
    staleTime: 30_000, // 30 seconds
  });

  // Loading state
  if (isLoadingMarket) {
    return <ComponentSkeleton />;
  }

  // Error state
  if (marketError) {
    return <ErrorMessage error={marketError} />;
  }

  // Rest of component...
}
```

**Checklist**:
```
□ React Query for data fetching
□ Loading state handled
□ Error state handled
□ Stale time configured
□ Query key unique and descriptive
```

---

### Step 3.2: Implement Form/Interaction Logic (40 min)

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// Validation schema
const formSchema = z.object({
  outcome: z.boolean(),
  amount: z.number()
    .min(0.01, 'Minimum 0.01 SOL')
    .max(100, 'Maximum 100 SOL'),
});

type FormData = z.infer<typeof formSchema>;

export function ComponentName({ marketId, onSubmit, ...props }: ComponentNameProps) {
  // Form setup
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      outcome: true,
      amount: 1,
    },
  });

  // Submit handler
  const onSubmitForm = async (data: FormData) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      await onSubmit({
        outcome: data.outcome,
        amount: data.amount,
      });

      setState(prev => ({ ...prev, isLoading: false }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error as Error,
      }));

      if (props.onError) {
        props.onError(error as Error);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmitForm)}>
      {/* Form fields implemented next */}
    </form>
  );
}
```

**Checklist**:
```
□ React Hook Form for form handling
□ Zod schema for validation
□ Default values set
□ Submit handler with error handling
□ Loading state during submission
□ Error callback invoked
```

---

### Step 3.3: Implement UI (60 min)

```typescript
return (
  <div className={cn('space-y-4', className)}>
    {/* Header */}
    <div>
      <h2 className="text-2xl font-bold">
        {marketData.question}
      </h2>
      <p className="text-gray-600 text-sm">
        {marketData.description}
      </p>
    </div>

    {/* Error Display */}
    {state.error && (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800 text-sm">
          {state.error.message}
        </p>
      </div>
    )}

    {/* Form */}
    <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-4">
      {/* Outcome Selection */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setValue('outcome', true)}
          className={cn(
            'flex-1 py-3 rounded-lg font-semibold transition-colors',
            outcome === true
              ? 'bg-green-500 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          )}
          disabled={disabled || isSubmitting}
        >
          YES {marketData.yesPrice}%
        </button>
        <button
          type="button"
          onClick={() => setValue('outcome', false)}
          className={cn(
            'flex-1 py-3 rounded-lg font-semibold transition-colors',
            outcome === false
              ? 'bg-red-500 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          )}
          disabled={disabled || isSubmitting}
        >
          NO {marketData.noPrice}%
        </button>
      </div>

      {/* Amount Input */}
      <div>
        <label htmlFor="amount" className="block text-sm font-medium mb-2">
          Amount (SOL)
        </label>
        <input
          id="amount"
          type="number"
          step="0.01"
          {...register('amount', { valueAsNumber: true })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
          disabled={disabled || isSubmitting}
        />
        {errors.amount && (
          <p className="text-red-600 text-sm mt-1">
            {errors.amount.message}
          </p>
        )}
      </div>

      {/* Preview */}
      {previewData && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-gray-700">
            You'll receive approximately{' '}
            <span className="font-semibold">{previewData.shares}</span> shares
          </p>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={disabled || isSubmitting}
        className={cn(
          'w-full py-3 rounded-lg font-semibold transition-colors',
          'bg-indigo-600 text-white hover:bg-indigo-700',
          'disabled:opacity-50 disabled:cursor-not-allowed'
        )}
      >
        {isSubmitting ? (
          <span className="flex items-center justify-center gap-2">
            <Spinner className="w-5 h-5" />
            Processing...
          </span>
        ) : (
          'Place Bet'
        )}
      </button>
    </form>
  </div>
);
```

**Checklist**:
```
□ All form fields implemented
□ Validation errors displayed
□ Loading state shown (spinner)
□ Disabled state handled
□ Tailwind classes used
□ cn() helper for className merging
□ Accessibility (labels, ARIA)
□ Keyboard navigation works
```

---

### Step 3.4: Add Loading Skeleton (20 min)

```typescript
/**
 * Loading skeleton while data fetches
 */
function ComponentSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-3/4" />
      <div className="h-4 bg-gray-200 rounded w-1/2" />
      <div className="flex gap-2">
        <div className="flex-1 h-12 bg-gray-200 rounded" />
        <div className="flex-1 h-12 bg-gray-200 rounded" />
      </div>
      <div className="h-12 bg-gray-200 rounded" />
      <div className="h-12 bg-gray-200 rounded" />
    </div>
  );
}
```

**Checklist**:
```
□ Skeleton matches final layout
□ Smooth loading experience
□ animate-pulse applied
□ Used while data loading
```

---

### Step 3.5: Add Error Component (15 min)

```typescript
/**
 * Error display with retry
 */
function ErrorMessage({
  error,
  onRetry,
}: {
  error: Error;
  onRetry?: () => void;
}) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
      <div className="text-red-600 text-4xl mb-2">⚠️</div>
      <h3 className="text-lg font-semibold text-red-900 mb-2">
        Something went wrong
      </h3>
      <p className="text-red-700 text-sm mb-4">
        {error.message}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          Try Again
        </button>
      )}
    </div>
  );
}
```

**Checklist**:
```
□ Clear error message
□ Retry button (if applicable)
□ User-friendly language
□ Visually distinct from content
```

---

### Step 3.6: Implement Responsive Design (15 min)

```typescript
// Use Tailwind responsive classes
<div className="space-y-4">
  {/* Mobile: Stack, Desktop: Side-by-side */}
  <div className="flex flex-col md:flex-row gap-4">
    <button className="w-full md:w-1/2">YES</button>
    <button className="w-full md:w-1/2">NO</button>
  </div>

  {/* Mobile: Full width, Desktop: Max width */}
  <div className="w-full max-w-md mx-auto">
    <input className="w-full" />
  </div>
</div>
```

**Breakpoints** (Tailwind):
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px

**Checklist**:
```
□ Mobile-first approach
□ Responsive at all breakpoints
□ Touch targets ≥44px
□ No horizontal scrolling
□ Tested on mobile Safari
```

---

## 🧪 PHASE 4: Testing (90-120 min total)

### Step 4.1: Write Component Tests (60 min)

**File**: `__tests__/ComponentName.test.tsx`

```typescript
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ComponentName } from '../ComponentName';

// Test wrapper with providers
function Wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

describe('ComponentName', () => {
  const mockOnSubmit = vi.fn();

  beforeEach(() => {
    mockOnSubmit.mockClear();
  });

  it('renders component with correct title', () => {
    render(
      <ComponentName marketId="123" onSubmit={mockOnSubmit} />,
      { wrapper: Wrapper }
    );

    expect(screen.getByRole('heading')).toHaveTextContent('Component Name');
  });

  it('submits form with correct data', async () => {
    const user = userEvent.setup();

    render(
      <ComponentName marketId="123" onSubmit={mockOnSubmit} />,
      { wrapper: Wrapper }
    );

    // Select YES
    await user.click(screen.getByRole('button', { name: /YES/ }));

    // Enter amount
    const input = screen.getByLabelText(/Amount/);
    await user.clear(input);
    await user.type(input, '5');

    // Submit
    await user.click(screen.getByRole('button', { name: /Place Bet/ }));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        outcome: true,
        amount: 5,
      });
    });
  });

  it('shows validation error for amount below minimum', async () => {
    const user = userEvent.setup();

    render(
      <ComponentName marketId="123" onSubmit={mockOnSubmit} />,
      { wrapper: Wrapper }
    );

    const input = screen.getByLabelText(/Amount/);
    await user.clear(input);
    await user.type(input, '0.001');

    await user.click(screen.getByRole('button', { name: /Place Bet/ }));

    await waitFor(() => {
      expect(screen.getByText(/Minimum 0.01 SOL/)).toBeInTheDocument();
    });
  });

  it('disables form while submitting', async () => {
    const user = userEvent.setup();
    mockOnSubmit.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

    render(
      <ComponentName marketId="123" onSubmit={mockOnSubmit} />,
      { wrapper: Wrapper }
    );

    const submitButton = screen.getByRole('button', { name: /Place Bet/ });
    await user.click(submitButton);

    expect(submitButton).toBeDisabled();
  });

  it('calls onError callback when submission fails', async () => {
    const user = userEvent.setup();
    const mockOnError = vi.fn();
    const error = new Error('Network error');
    mockOnSubmit.mockRejectedValue(error);

    render(
      <ComponentName
        marketId="123"
        onSubmit={mockOnSubmit}
        onError={mockOnError}
      />,
      { wrapper: Wrapper }
    );

    await user.click(screen.getByRole('button', { name: /Place Bet/ }));

    await waitFor(() => {
      expect(mockOnError).toHaveBeenCalledWith(error);
    });
  });
});
```

**Checklist**:
```
□ Test renders correctly
□ Test user interactions
□ Test form validation
□ Test loading states
□ Test error states
□ Test callbacks
□ 5-10 tests total
□ All tests passing
```

---

### Step 4.2: E2E Test with Playwright (30 min)

**File**: `tests/e2e/component-name.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('ComponentName', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/markets/123');
  });

  test('should submit bet successfully', async ({ page }) => {
    // Click YES button
    await page.click('button:has-text("YES")');

    // Enter amount
    await page.fill('input[type="number"]', '5');

    // Submit
    await page.click('button:has-text("Place Bet")');

    // Wait for success message
    await expect(page.locator('.toast-success')).toBeVisible();
  });

  test('should show validation error for invalid amount', async ({ page }) => {
    await page.fill('input[type="number"]', '0.001');
    await page.click('button:has-text("Place Bet")');

    await expect(page.locator('text=Minimum 0.01 SOL')).toBeVisible();
  });

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    // Buttons should stack vertically
    const buttons = page.locator('button:has-text("YES"), button:has-text("NO")');
    const firstButton = buttons.first();
    const secondButton = buttons.last();

    const firstBox = await firstButton.boundingBox();
    const secondBox = await secondButton.boundingBox();

    // Second button should be below first (stacked)
    expect(secondBox!.y).toBeGreaterThan(firstBox!.y + firstBox!.height);
  });
});
```

**Checklist**:
```
□ E2E test for happy path
□ E2E test for errors
□ E2E test for responsiveness
□ Tests pass in Chrome/Firefox
□ Tests pass on mobile viewport
```

---

## 📝 PHASE 5: Polish & Documentation (45 min total)

### Step 5.1: Accessibility Audit (20 min)

```
□ All interactive elements keyboard accessible
  - Tab through all fields
  - Enter/Space activates buttons

□ ARIA labels present
  - Form fields have labels
  - Buttons have descriptive text
  - Error messages associated with fields

□ Color contrast ≥4.5:1
  - Check with Chrome DevTools

□ Screen reader friendly
  - Test with VoiceOver (Mac) or NVDA (Windows)
  - All content announced correctly

□ Focus indicators visible
  - Tab focus clearly visible
  - Not removed with outline:none
```

**Tools**:
- Chrome DevTools Lighthouse
- axe DevTools extension
- WAVE browser extension

---

### Step 5.2: Performance Optimization (15 min)

```typescript
// Lazy load heavy components
const HeavyChart = dynamic(() => import('./HeavyChart'), {
  loading: () => <Skeleton />,
  ssr: false,
});

// Memoize expensive calculations
const calculatedShares = useMemo(
  () => calculateShares(amount, marketData),
  [amount, marketData]
);

// Debounce API calls
const debouncedFetch = useDebouncedCallback(
  (value) => fetchPreview(value),
  500
);
```

**Checklist**:
```
□ Lazy load below-the-fold content
□ Memoize expensive calculations
□ Debounce API calls
□ Optimize images (Next.js Image)
□ Bundle size <50KB
```

---

### Step 5.3: Documentation (10 min)

**Update story file**:
```markdown
## Implementation Notes

### ComponentName

**Implementation Time**: X hours
**Challenges**:
- [Challenge 1]
- [Challenge 2]

**Key Features**:
- Form validation with Zod
- Responsive design (mobile-first)
- Loading/error states
- Accessibility (WCAG 2.1 AA)

**Testing**:
- 8 unit tests (100% coverage)
- 3 E2E tests (Playwright)
- Manual testing: Chrome, Firefox, Safari
- Mobile testing: iPhone 14, Samsung S22

**Performance**:
- Bundle size: 45KB
- Lighthouse score: 98
- LCP: 1.2s

**Files Created**:
- app/(app)/markets/[id]/components/ComponentName/
```

---

## ✅ Completion Checklist

Before marking component as COMPLETE:

```
□ Component renders correctly
□ All interactions work
□ Form validation correct
□ Loading states implemented
□ Error states implemented
□ Responsive (mobile, tablet, desktop)
□ Accessible (WCAG 2.1 AA)
□ Unit tests passing (>80% coverage)
□ E2E tests passing
□ Performance optimized (<50KB)
□ Documentation complete
□ Story file updated
□ Lighthouse score >90
□ No console errors/warnings
□ Committed and pushed
□ PR created with screenshots
```

---

## 🚨 Scope Creep Prevention

**Before adding ANY feature, ask**:
1. Is this in FRONTEND_SCOPE_V1.md?
2. Does the user NEED this for v1?
3. Can this wait for v2?

**If in doubt, DON'T add it!**

---

## 📚 Related Templates

- [Anchor Instruction Template](./anchor-instruction-template.md)
- [Backend Service Template](./backend-service-template.md)
- [Testing Template](./testing-template.md)

---

**Last Updated**: November 5, 2025
**Version**: 1.0
**Status**: ✅ READY FOR USE

**Remember**: Frontend is where scope creep happens (3.2X multiplier). Follow this template STRICTLY! 🚀
