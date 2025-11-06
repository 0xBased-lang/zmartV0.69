# STORY-3.4: Layout & Navigation (Day 18)

**Status:** 📋 IN PROGRESS
**Created:** November 6, 2025
**Tier:** Tier 2 (Small/Core - Enhanced DoD)
**Estimated:** 4-6 hours
**Owner:** Frontend Team
**Priority:** P0 Critical

---

## 📋 User Story

**As a** user navigating the ZMART platform
**I want** a consistent, intuitive layout with clear navigation
**So that** I can easily access different sections (Markets, Portfolio, Create Market)

---

## 🎯 Acceptance Criteria

### Functional Requirements

1. **GIVEN** I am on any page of the application
   **WHEN** The page loads
   **THEN** I see a consistent header with logo and navigation menu

2. **GIVEN** I click on a navigation link
   **WHEN** The route changes
   **THEN** The page navigates to the correct section and the active link is highlighted

3. **GIVEN** I am on a mobile device
   **WHEN** I tap the menu icon
   **THEN** A responsive sidebar slides in with navigation options

4. **GIVEN** I scroll to the bottom of any page
   **WHEN** I reach the footer
   **THEN** I see copyright information and useful links

5. **GIVEN** I am on different pages (Markets, Portfolio, Create Market)
   **WHEN** The layout renders
   **THEN** The main content area adapts properly with consistent spacing

### Non-Functional Requirements

□ **Responsive Design**: Works on mobile (320px+), tablet (768px+), desktop (1024px+)
□ **Performance**: Layout renders in <100ms
□ **Accessibility**: Keyboard navigable, semantic HTML, ARIA labels
□ **Consistency**: All pages use the same layout structure

---

## 🏗️ Technical Implementation

### Definition of Done Tier

**Selected Tier**: Tier 2 (Small/Core Changes - 8 criteria)

**Rationale**: This involves creating layout components and navigation structure. Not a full feature (Tier 3) but foundational UI work that requires responsive design, accessibility, and proper routing integration.

### Files to Create

**Layout Components** (3 files):
- `components/layout/AppLayout.tsx` - Main app layout wrapper
- `components/layout/Sidebar.tsx` - Mobile responsive sidebar
- `components/layout/Footer.tsx` - Footer component

**Navigation Components** (2 files):
- `components/navigation/NavMenu.tsx` - Desktop navigation menu
- `components/navigation/MobileNav.tsx` - Mobile navigation with hamburger menu

**Page Layouts** (3 files):
- `app/(app)/layout.tsx` - Layout for authenticated app pages
- `app/(app)/markets/page.tsx` - Markets listing page (placeholder)
- `app/(app)/portfolio/page.tsx` - Portfolio page (placeholder)

### Files to Modify

- `components/layout/Header.tsx` - Add navigation menu integration
- `app/page.tsx` - Update to use new layout structure
- `tailwind.config.ts` - Add custom spacing/breakpoints if needed

---

## 📐 Implementation Plan

### Phase 1: Footer Component (30 min)

**1.1 Create Footer Component**

Create `components/layout/Footer.tsx`:
```typescript
export function Footer() {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <h3 className="text-xl font-bold text-primary-400">ZMART v0.69</h3>
            <p className="text-gray-400 mt-2 text-sm">
              Decentralized prediction markets on Solana
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold mb-3">Quick Links</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><a href="/markets" className="hover:text-primary-400">Markets</a></li>
              <li><a href="/portfolio" className="hover:text-primary-400">Portfolio</a></li>
              <li><a href="/markets/create" className="hover:text-primary-400">Create Market</a></li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="font-semibold mb-3">Resources</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><a href="/docs" className="hover:text-primary-400">Documentation</a></li>
              <li><a href="https://github.com/zmart" className="hover:text-primary-400" target="_blank" rel="noopener">GitHub</a></li>
              <li><a href="https://discord.gg/zmart" className="hover:text-primary-400" target="_blank" rel="noopener">Discord</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-6 text-center text-sm text-gray-500">
          <p>&copy; {new Date().getFullYear()} ZMART. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
```

---

### Phase 2: Navigation Components (1.5 hours)

**2.1 Create NavMenu Component (Desktop)**

Create `components/navigation/NavMenu.tsx`:
```typescript
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const navItems = [
  { label: 'Markets', href: '/markets' },
  { label: 'Portfolio', href: '/portfolio' },
  { label: 'Create Market', href: '/markets/create' },
] as const;

export function NavMenu() {
  const pathname = usePathname();

  return (
    <nav className="hidden md:flex items-center gap-6">
      {navItems.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'text-sm font-medium transition-colors hover:text-primary',
              isActive ? 'text-primary' : 'text-gray-600'
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
```

**2.2 Create Mobile Navigation**

Create `components/navigation/MobileNav.tsx`:
```typescript
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const navItems = [
  { label: 'Markets', href: '/markets' },
  { label: 'Portfolio', href: '/portfolio' },
  { label: 'Create Market', href: '/markets/create' },
] as const;

export function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="md:hidden">
      {/* Hamburger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-gray-600 hover:text-primary"
        aria-label="Toggle menu"
        aria-expanded={isOpen}
      >
        <svg
          className="w-6 h-6"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          {isOpen ? (
            <path d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>

      {/* Mobile Sidebar */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          {/* Sidebar */}
          <div className="fixed inset-y-0 right-0 w-64 bg-white shadow-xl z-50 transform transition-transform">
            <div className="p-6">
              <button
                onClick={() => setIsOpen(false)}
                className="absolute top-4 right-4 p-2 text-gray-600 hover:text-primary"
                aria-label="Close menu"
              >
                <svg className="w-6 h-6" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                  <path d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <nav className="mt-8 space-y-4">
                {navItems.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      className={cn(
                        'block px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-primary text-white'
                          : 'text-gray-600 hover:bg-gray-100'
                      )}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
```

**2.3 Utility Function for Class Names**

Create `lib/utils.ts` (if it doesn't exist):
```typescript
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

---

### Phase 3: Layout Structure (1.5 hours)

**3.1 Update Header Component**

Modify `components/layout/Header.tsx`:
```typescript
'use client';

import Link from 'next/link';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { NavMenu } from '@/components/navigation/NavMenu';
import { MobileNav } from '@/components/navigation/MobileNav';

export function Header() {
  return (
    <header className="sticky top-0 z-30 w-full border-b bg-white/95 backdrop-blur">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
            <span className="text-white font-bold text-lg">Z</span>
          </div>
          <span className="font-bold text-xl hidden sm:block">ZMART</span>
        </Link>

        {/* Desktop Navigation */}
        <NavMenu />

        {/* Right Section */}
        <div className="flex items-center gap-4">
          <WalletMultiButton />
          <MobileNav />
        </div>
      </div>
    </header>
  );
}
```

**3.2 Create App Layout**

Create `components/layout/AppLayout.tsx`:
```typescript
import { ReactNode } from 'react';
import { Header } from './Header';
import { Footer } from './Footer';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
}
```

**3.3 Create App Route Group Layout**

Create `app/(app)/layout.tsx`:
```typescript
import { AppLayout } from '@/components/layout/AppLayout';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppLayout>{children}</AppLayout>;
}
```

---

### Phase 4: Page Placeholders (45 min)

**4.1 Create Markets Page**

Create `app/(app)/markets/page.tsx`:
```typescript
export default function MarketsPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Active Markets</h1>
        <p className="text-gray-600 mt-2">
          Explore and trade on prediction markets
        </p>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <h3 className="font-semibold text-yellow-800 mb-2">🚧 Coming Soon</h3>
        <p className="text-yellow-700 text-sm">
          Market listing and trading interface will be implemented in Day 19-20.
        </p>
      </div>
    </div>
  );
}
```

**4.2 Create Portfolio Page**

Create `app/(app)/portfolio/page.tsx`:
```typescript
'use client';

import { useWallet } from '@solana/wallet-adapter-react';

export default function PortfolioPage() {
  const { connected } = useWallet();

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Your Portfolio</h1>
        <p className="text-gray-600 mt-2">
          Track your positions and winnings
        </p>
      </div>

      {!connected ? (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-800 mb-2">Connect Your Wallet</h3>
          <p className="text-blue-700 text-sm">
            Connect your wallet to view your portfolio and trading positions.
          </p>
        </div>
      ) : (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h3 className="font-semibold text-yellow-800 mb-2">🚧 Coming Soon</h3>
          <p className="text-yellow-700 text-sm">
            Portfolio tracking will be implemented in Day 21.
          </p>
        </div>
      )}
    </div>
  );
}
```

**4.3 Create Market Creation Page**

Create `app/(app)/markets/create/page.tsx`:
```typescript
'use client';

import { useWallet } from '@solana/wallet-adapter-react';

export default function CreateMarketPage() {
  const { connected } = useWallet();

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Create a Market</h1>
        <p className="text-gray-600 mt-2">
          Submit a new prediction market for community voting
        </p>
      </div>

      {!connected ? (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-800 mb-2">Connect Your Wallet</h3>
          <p className="text-blue-700 text-sm">
            Connect your wallet to create a new prediction market.
          </p>
        </div>
      ) : (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h3 className="font-semibold text-yellow-800 mb-2">🚧 Coming Soon</h3>
          <p className="text-yellow-700 text-sm">
            Market creation form will be implemented in Day 22.
          </p>
        </div>
      )}
    </div>
  );
}
```

**4.4 Update Homepage**

Modify `app/page.tsx`:
```typescript
'use client';

import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { useAuth } from '@/lib/hooks/useAuth';
import { useSupabaseStatus } from '@/lib/hooks/useSupabase';
import { useWallet } from '@solana/wallet-adapter-react';

export default function Home() {
  const { connected } = useWallet();
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const { connected: dbConnected, checking } = useSupabaseStatus();

  return (
    <>
      <Header />
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-secondary-50">
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          {/* Hero Section */}
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            Predict. Trade. Win.
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            ZMART is a decentralized prediction market platform built on Solana.
            Trade on real-world events and earn rewards for accurate predictions.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link
              href="/markets"
              className="inline-flex items-center justify-center px-8 py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary/90 transition-colors"
            >
              Explore Markets
            </Link>
            <Link
              href="/markets/create"
              className="inline-flex items-center justify-center px-8 py-3 border-2 border-primary text-primary font-semibold rounded-lg hover:bg-primary/10 transition-colors"
            >
              Create Market
            </Link>
          </div>

          {/* Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
            {/* Wallet Status */}
            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <div className="text-sm text-gray-500 mb-2">Wallet</div>
              <div className="flex items-center justify-center gap-2">
                <span className={connected ? 'text-green-500' : 'text-gray-400'}>
                  {connected ? '✅' : '○'}
                </span>
                <span className="text-gray-800 font-medium">
                  {connected ? 'Connected' : 'Not Connected'}
                </span>
              </div>
            </div>

            {/* Database Status */}
            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <div className="text-sm text-gray-500 mb-2">Database</div>
              <div className="flex items-center justify-center gap-2">
                <span className={dbConnected ? 'text-green-500' : checking ? 'text-yellow-500' : 'text-red-500'}>
                  {dbConnected ? '✅' : checking ? '⏳' : '❌'}
                </span>
                <span className="text-gray-800 font-medium">
                  {checking ? 'Checking...' : dbConnected ? 'Connected' : 'Failed'}
                </span>
              </div>
            </div>

            {/* Auth Status */}
            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <div className="text-sm text-gray-500 mb-2">Authentication</div>
              <div className="flex items-center justify-center gap-2">
                <span className={isAuthenticated ? 'text-green-500' : authLoading ? 'text-yellow-500' : 'text-gray-400'}>
                  {isAuthenticated ? '✅' : authLoading ? '⏳' : '○'}
                </span>
                <span className="text-gray-800 font-medium">
                  {authLoading ? 'Loading...' : isAuthenticated ? 'Authenticated' : 'Not Authenticated'}
                </span>
              </div>
            </div>
          </div>

          {/* User Profile (if authenticated) */}
          {user && (
            <div className="mt-8 bg-primary-50 p-6 rounded-lg border border-primary-200 max-w-md mx-auto">
              <h3 className="font-semibold text-sm mb-3 text-primary-700">Welcome Back!</h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Wallet:</span>
                  <span className="font-mono text-gray-800 truncate ml-2">
                    {user.wallet.slice(0, 4)}...{user.wallet.slice(-4)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Member Since:</span>
                  <span className="text-gray-800">
                    {new Date(user.created_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Reputation:</span>
                  <span className="text-gray-800">{user.reputation_score}</span>
                </div>
              </div>
            </div>
          )}

          {/* Day 18 Complete Badge */}
          <div className="mt-12 bg-green-50 border border-green-200 rounded-lg p-6 max-w-md mx-auto">
            <h3 className="font-semibold text-sm mb-2 text-green-700">Day 18 Complete ✅</h3>
            <div className="space-y-1 text-xs text-green-600">
              <p>✅ Consistent layout structure</p>
              <p>✅ Desktop & mobile navigation</p>
              <p>✅ Footer with links</p>
              <p>✅ Page routing working</p>
              <p>✅ Responsive sidebar</p>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
```

---

### Phase 5: Dependency Installation (15 min)

**5.1 Install Required Dependencies**

```bash
cd frontend
pnpm add clsx tailwind-merge
```

---

### Phase 6: Testing & Verification (30 min)

**6.1 Manual Testing Checklist**

1. ✅ Desktop navigation displays correctly
2. ✅ Navigation links highlight active page
3. ✅ Mobile menu opens and closes properly
4. ✅ Clicking navigation links navigates correctly
5. ✅ Footer displays on all pages
6. ✅ Layout is responsive (test 320px, 768px, 1024px)
7. ✅ Keyboard navigation works (Tab, Enter, Escape)

**6.2 TypeScript & Linting**

```bash
pnpm type-check  # Must pass with zero errors
pnpm lint        # Must pass with zero warnings
pnpm build       # Must succeed
```

---

## 🔗 Dependencies

**Requires:**
- ✅ Day 17 complete (Supabase integration)
- ✅ Header component exists
- ✅ Tailwind CSS configured

**Provides:**
- Consistent layout structure
- Navigation system
- Foundation for all app pages
- Responsive design framework

---

## 📊 Definition of Done (Tier 2 - Small/Core)

### Code Quality (3/3) ✅
- [ ] TypeScript strict mode, zero errors
- [ ] ESLint passes, zero warnings
- [ ] Code reviewed (self-review for solo)

### Build & Validation (3/3) ✅
- [ ] `pnpm type-check` passes
- [ ] `pnpm lint` passes
- [ ] `pnpm build` succeeds

### Documentation (2/2) ✅
- [ ] No console errors/warnings
- [ ] STORY-3.4.md updated with completion notes

---

## 🧪 Test Cases

### Manual Testing

1. **Desktop Navigation**:
   - Visit `/`, `/markets`, `/portfolio`
   - ✅ Verify: Active link highlighted, navigation works

2. **Mobile Navigation**:
   - Resize to mobile (< 768px)
   - Click hamburger menu
   - ✅ Verify: Sidebar opens, links work, closes on click

3. **Keyboard Navigation**:
   - Tab through navigation links
   - Press Enter on a link
   - ✅ Verify: Focus visible, navigation works

4. **Footer Display**:
   - Scroll to bottom of any page
   - ✅ Verify: Footer displays with correct links

5. **Responsive Layout**:
   - Test 320px (mobile), 768px (tablet), 1024px (desktop)
   - ✅ Verify: Layout adapts properly

6. **Page Routing**:
   - Click each navigation link
   - ✅ Verify: URL changes, correct page displays

---

## 🔍 Technical Notes

### Layout Architecture

**Route Groups**: Using `app/(app)` for authenticated pages
- Allows shared layout without affecting root routes
- Clean URL structure (no `/app` prefix)
- Easy to add marketing routes later `app/(marketing)`

**Component Structure**:
```
components/
├── layout/
│   ├── AppLayout.tsx      # Main layout wrapper
│   ├── Header.tsx         # Top header with nav
│   └── Footer.tsx         # Bottom footer
└── navigation/
    ├── NavMenu.tsx        # Desktop nav menu
    └── MobileNav.tsx      # Mobile sidebar
```

### Responsive Breakpoints

**Tailwind Defaults (used):**
- `sm`: 640px (small phones landscape)
- `md`: 768px (tablets, show desktop nav)
- `lg`: 1024px (desktops)
- `xl`: 1280px (large desktops)

**Mobile-First Approach:**
- Base styles for mobile
- `md:` prefix for tablet/desktop

### Accessibility Features

**Keyboard Navigation:**
- All links focusable with Tab
- Enter key activates links
- Escape closes mobile menu

**ARIA Labels:**
- `aria-label` on menu buttons
- `aria-expanded` on toggle buttons
- `aria-hidden` on backdrop

**Semantic HTML:**
- `<nav>` for navigation
- `<header>` for page header
- `<footer>` for footer
- `<main>` for main content

---

## 🚨 Anti-Pattern Prevention

**Pattern #2 (Scope Creep):**
- ✅ No advanced navigation features (breadcrumbs, mega menus)
- ✅ No user dropdown menu (defer to later)
- ✅ Just basic layout and navigation

**Pattern #3 (Reactive Crisis Loop):**
- ✅ Accessibility planned upfront
- ✅ Responsive design from start
- ✅ Component structure thought through

**Pattern #6 (Security Afterthought):**
- ✅ All external links have `rel="noopener"`
- ✅ Proper client component boundaries
- ✅ No sensitive data in navigation

---

## 📝 Story Completion Checklist

- [ ] All acceptance criteria met (5 requirements)
- [ ] All Tier 2 DoD items complete (8 criteria)
- [ ] Manual tests passing (6 test cases)
- [ ] Desktop navigation working
- [ ] Mobile navigation working
- [ ] Footer displays correctly
- [ ] Responsive design verified
- [ ] Accessibility tested
- [ ] Code committed with proper message
- [ ] Story marked COMPLETE in git commit
- [ ] Day 18 marked complete in TODO_CHECKLIST.md
- [ ] STORY-3.5.md ready to start (Day 19)

---

**Story Points:** 4-6 hours
**Complexity:** Medium
**Risk Level:** Low (standard UI layout work)
**Dependencies:** Day 17 complete ✅

---

## 🎯 Success Metrics

**Visual:**
- ✅ Consistent layout across all pages
- ✅ Smooth transitions and hover states
- ✅ Professional appearance

**Functional:**
- ✅ All navigation links work
- ✅ Mobile menu opens/closes properly
- ✅ Active link highlighting works

**Technical:**
- ✅ Zero TypeScript errors
- ✅ Zero ESLint warnings
- ✅ Build succeeds
- ✅ No console errors

---

*Created: November 6, 2025 | Day 18 of Week 3 Frontend Development*
