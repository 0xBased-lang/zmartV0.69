# WEEK 3 KICKOFF PLAN - Frontend Development Start

**Dates:** Days 15-21 (Week 3 of 20-week timeline)
**Phase:** Frontend Foundation & Core Infrastructure
**Status:** 🎬 READY TO START
**Mode:** --ultrathink (Comprehensive Planning)
**Created:** November 6, 2025

---

## 🎯 WEEK 3 MISSION

**Objective:** Establish bulletproof frontend foundation for 14 core features

**Deliverables:**
- ✅ Next.js 14 (App Router) project configured
- ✅ Tailwind CSS + shadcn/ui component library integrated
- ✅ Solana Wallet Adapter working (Phantom, Solflare)
- ✅ Supabase client configured with type safety
- ✅ Authentication flow (SIWE wallet signatures)
- ✅ First 2-3 core pages scaffolded (Homepage, Market Detail, Create Market)
- ✅ Design system foundations (colors, typography, spacing)

**Success Criteria:**
1. User can connect wallet
2. User can view market list (with real backend data)
3. User can view market details
4. All TypeScript strict mode, zero errors
5. Responsive design working (mobile-first)

---

## 📊 FRONTEND SCOPE RECAP (14 Core Features)

From `FRONTEND_SCOPE_V1.md`:

1. ✅ **Homepage / Market List** - Week 3 (partial)
2. ✅ **Market Detail Page** - Week 3 (scaffold)
3. ⏳ **Market Creation Wizard** - Week 4
4. ⏳ **User Dashboard** - Week 4-5
5. ⏳ **Trading Interface** - Week 5-6
6. ⏳ **Resolution & Disputes** - Week 6-7
7. ✅ **Wallet Integration** - Week 3 (complete)
8. ⏳ **Discussion System (Minimal)** - Week 7
9. ✅ **Responsive Design** - Week 3 (foundation)
10. ✅ **Error Handling** - Week 3 (infrastructure)
11. ⏳ **Basic Analytics Dashboard** - Week 8
12. ⏳ **Proposal Voting (ProposalManager)** - Week 7
13. ⏳ **Claim Winnings Page** - Week 8
14. ⏳ **Market Browse/Explore** - Week 4

**Week 3 Focus:** #1, #2, #7, #9, #10 (foundation features)

---

## 🏗️ ARCHITECTURE DECISIONS (Week 3)

### Tech Stack (Locked for v1)

**Framework:** Next.js 14.0+ (App Router)
- Server components by default
- Client components for interactivity
- API routes for server-side logic
- Middleware for auth

**Styling:** Tailwind CSS 3.4+
- Mobile-first breakpoints
- Custom design tokens
- Dark mode ready (defer to v2)

**UI Components:** shadcn/ui
- Radix UI primitives
- Tailwind-based styling
- Copy-paste components (not NPM package)
- Full TypeScript support

**State Management:** Zustand
- Simple, minimal boilerplate
- TypeScript-first
- DevTools support
- Perfect for wallet state + market data

**Forms:** React Hook Form 7.x
- Best performance
- Minimal re-renders
- Zod schema validation
- Great TypeScript support

**Wallet:** @solana/wallet-adapter-react
- Standard Solana wallet integration
- Multi-wallet support (Phantom, Solflare, etc.)
- Auto-connect, auto-approve
- Transaction signing

**Database:** Supabase Client (@supabase/supabase-js)
- Type-safe queries (generated types)
- Real-time subscriptions
- Row-level security
- Matches backend schema

**Charts:** Recharts 2.x
- Simple React-native charts
- Good enough for v1
- LMSR price curves

**Dates:** date-fns 3.x
- Lightweight, tree-shakeable
- Better than moment.js

**Notifications:** react-hot-toast
- Simple, beautiful
- Customizable
- Promise-based

**Testing (Week 19):**
- Jest for unit tests
- React Testing Library
- Playwright for E2E (deferred)

---

## 📁 FRONTEND PROJECT STRUCTURE

```
frontend/
├── app/                          # Next.js App Router
│   ├── layout.tsx               # Root layout (wallet provider)
│   ├── page.tsx                 # Homepage (market list)
│   ├── market/
│   │   ├── [id]/
│   │   │   └── page.tsx        # Market detail page
│   │   └── create/
│   │       └── page.tsx        # Create market wizard
│   ├── dashboard/
│   │   └── page.tsx            # User dashboard
│   ├── api/                     # API routes (if needed)
│   └── globals.css              # Tailwind imports
├── components/
│   ├── ui/                      # shadcn/ui components (copy-paste)
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   ├── dialog.tsx
│   │   └── ... (20-30 components)
│   ├── market/                  # Market-specific components
│   │   ├── market-card.tsx
│   │   ├── market-list.tsx
│   │   ├── price-chart.tsx
│   │   └── trading-panel.tsx
│   ├── wallet/                  # Wallet components
│   │   ├── wallet-button.tsx
│   │   ├── wallet-modal.tsx
│   │   └── wallet-adapter.tsx
│   ├── layout/                  # Layout components
│   │   ├── header.tsx
│   │   ├── footer.tsx
│   │   └── sidebar.tsx
│   └── shared/                  # Shared components
│       ├── loading-skeleton.tsx
│       ├── error-boundary.tsx
│       └── toast-provider.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts           # Supabase client instance
│   │   └── types.ts            # Generated database types
│   ├── solana/
│   │   ├── config.ts           # Solana RPC config
│   │   ├── wallet-adapter.ts  # Wallet provider setup
│   │   └── program.ts          # Anchor program client
│   ├── utils/
│   │   ├── cn.ts               # Class name utility
│   │   ├── format.ts           # Number/date formatting
│   │   └── lmsr.ts             # LMSR calculations
│   └── hooks/
│       ├── use-market.ts       # Market data hook
│       ├── use-wallet-balance.ts
│       └── use-trades.ts
├── stores/
│   ├── wallet-store.ts         # Zustand wallet state
│   ├── market-store.ts         # Market cache
│   └── ui-store.ts             # UI state (modals, toasts)
├── types/
│   ├── market.ts               # Market type definitions
│   ├── trade.ts
│   └── user.ts
├── config/
│   ├── site.ts                 # Site metadata
│   ├── solana.ts               # Solana config (RPC, program IDs)
│   └── constants.ts            # App constants
├── public/
│   ├── images/
│   └── icons/
├── styles/
│   └── globals.css             # Global styles, Tailwind config
├── .env.local                   # Environment variables
├── .env.example
├── next.config.js               # Next.js configuration
├── tailwind.config.ts           # Tailwind configuration
├── tsconfig.json                # TypeScript configuration
├── package.json
└── README.md
```

---

## 🗓️ WEEK 3 DAY-BY-DAY PLAN

### **DAY 15 (Monday): Project Setup & Configuration**

**Story:** STORY-3.1.md
**Time:** 6-8 hours
**Tier:** Tier 2 (Core - Enhanced DoD)

**Tasks:**
1. **Initialize Next.js Project** (2 hours)
   ```bash
   cd /Users/seman/Desktop/zmartV0.69
   npx create-next-app@latest frontend \
     --typescript \
     --tailwind \
     --app \
     --src-dir false \
     --import-alias "@/*"
   ```

2. **Install Core Dependencies** (1 hour)
   ```bash
   cd frontend

   # Solana
   pnpm add @solana/wallet-adapter-base \
            @solana/wallet-adapter-react \
            @solana/wallet-adapter-react-ui \
            @solana/wallet-adapter-wallets \
            @solana/web3.js \
            @coral-xyz/anchor

   # Supabase
   pnpm add @supabase/supabase-js

   # State & Forms
   pnpm add zustand react-hook-form zod @hookform/resolvers

   # UI & Utilities
   pnpm add clsx tailwind-merge date-fns recharts react-hot-toast

   # Dev Dependencies
   pnpm add -D @types/node @types/react @types/react-dom
   ```

3. **Configure TypeScript** (30 min)
   - Strict mode enabled
   - Path aliases configured
   - Types folder structure

4. **Configure Tailwind + Design Tokens** (1 hour)
   - Custom color palette
   - Typography scale
   - Spacing system
   - Breakpoints

5. **Install shadcn/ui** (2 hours)
   ```bash
   npx shadcn-ui@latest init
   npx shadcn-ui@latest add button card input label dialog
   ```

6. **Configure Environment Variables** (30 min)
   ```env
   # .env.local
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_ANON_KEY=
   NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
   NEXT_PUBLIC_SOLANA_NETWORK=devnet
   NEXT_PUBLIC_PROGRAM_ID=
   ```

7. **Create Project Structure** (1 hour)
   - All folders from structure above
   - Empty component files
   - Config files

**Deliverables:**
- ✅ Next.js project running on localhost:3000
- ✅ Tailwind CSS working
- ✅ shadcn/ui components installed
- ✅ TypeScript strict mode, zero errors
- ✅ Environment variables configured

---

### **DAY 16 (Tuesday): Wallet Integration**

**Story:** STORY-3.2.md
**Time:** 6-8 hours
**Tier:** Tier 2 (Core - Enhanced DoD)

**Tasks:**
1. **Wallet Provider Setup** (2 hours)
   ```typescript
   // lib/solana/wallet-adapter.ts
   // Configure all wallet adapters (Phantom, Solflare, etc.)
   ```

2. **Wallet Button Component** (2 hours)
   ```typescript
   // components/wallet/wallet-button.tsx
   // Connect/disconnect wallet
   // Display address (truncated)
   // Show balance
   ```

3. **Wallet Modal** (2 hours)
   - Choose wallet provider
   - Connect flow
   - Error handling
   - Success feedback

4. **Zustand Wallet Store** (1 hour)
   ```typescript
   // stores/wallet-store.ts
   // Wallet state management
   // Connection status
   // User balance
   ```

5. **Integration Testing** (1 hour)
   - Connect Phantom wallet
   - Disconnect wallet
   - Switch accounts
   - Network detection

**Deliverables:**
- ✅ User can connect/disconnect wallet
- ✅ Wallet address displayed in header
- ✅ Balance shown (SOL + USDC)
- ✅ Multi-wallet support working
- ✅ Error handling comprehensive

---

### **DAY 17 (Wednesday): Supabase Integration + Authentication**

**Story:** STORY-3.3.md
**Time:** 6-8 hours
**Tier:** Tier 2 (Core - Enhanced DoD)

**Tasks:**
1. **Supabase Client Setup** (1 hour)
   ```typescript
   // lib/supabase/client.ts
   // Create Supabase client
   // Server vs. client instances
   ```

2. **Generate Database Types** (30 min)
   ```bash
   npx supabase gen types typescript \
     --project-id <PROJECT_ID> \
     > lib/supabase/types.ts
   ```

3. **SIWE Authentication** (3 hours)
   - Sign message with wallet
   - Verify signature backend
   - Create session
   - Middleware for protected routes

4. **Auth Hooks** (2 hours)
   ```typescript
   // lib/hooks/use-auth.ts
   // useAuth() hook
   // Login/logout functions
   // Session management
   ```

5. **Protected Route Pattern** (1 hour)
   - Middleware for auth check
   - Redirect to login
   - Loading states

**Deliverables:**
- ✅ User can sign in with wallet (SIWE)
- ✅ Session persisted in Supabase
- ✅ Protected routes working
- ✅ Auth hooks ready for use
- ✅ Error handling for auth failures

---

### **DAY 18 (Thursday): Layout & Navigation**

**Story:** STORY-3.4.md
**Time:** 6-8 hours
**Tier:** Tier 2 (Core - Enhanced DoD)

**Tasks:**
1. **Root Layout** (2 hours)
   ```typescript
   // app/layout.tsx
   // Providers (Wallet, Supabase, Toast)
   // Global styles
   // Metadata
   ```

2. **Header Component** (2 hours)
   ```typescript
   // components/layout/header.tsx
   // Logo
   // Navigation links
   // Wallet button
   // Mobile hamburger menu
   ```

3. **Footer Component** (1 hour)
   - Links (About, Docs, GitHub)
   - Social links
   - Copyright

4. **Navigation** (2 hours)
   - Link components
   - Active state
   - Dropdown menus (desktop)
   - Mobile menu (slide-in)

5. **Responsive Testing** (1 hour)
   - Mobile (sm: 640px)
   - Tablet (md: 768px)
   - Desktop (lg: 1024px, xl: 1280px)

**Deliverables:**
- ✅ Header with navigation working
- ✅ Footer complete
- ✅ Mobile responsive (hamburger menu)
- ✅ All links functional
- ✅ Design consistent

---

### **DAY 19 (Friday): Homepage - Market List (Part 1)**

**Story:** STORY-3.5.md
**Time:** 6-8 hours
**Tier:** Tier 2 (Core - Enhanced DoD)

**Tasks:**
1. **Market List Hook** (2 hours)
   ```typescript
   // lib/hooks/use-markets.ts
   // Fetch markets from Supabase
   // Caching with Zustand
   // Real-time updates (optional)
   ```

2. **Market Card Component** (3 hours)
   ```typescript
   // components/market/market-card.tsx
   // Market title
   // Current odds (YES/NO percentages)
   // End date countdown
   // Trading volume
   // Category badge
   // Click → navigate to detail page
   ```

3. **Market List Component** (2 hours)
   ```typescript
   // components/market/market-list.tsx
   // Grid layout (responsive)
   // Loading skeletons
   // Empty state
   // Pagination controls (basic)
   ```

4. **Homepage** (1 hour)
   ```typescript
   // app/page.tsx
   // Hero section
   // Market list
   // Basic filters (status dropdown)
   ```

**Deliverables:**
- ✅ Homepage displays market list
- ✅ Markets fetched from backend (real data)
- ✅ Market cards clickable
- ✅ Loading states working
- ✅ Responsive grid layout

---

### **DAY 20 (Saturday): Homepage - Filters & Search (Part 2)**

**Story:** STORY-3.6.md
**Time:** 6-8 hours
**Tier:** Tier 2 (Core - Enhanced DoD)

**Tasks:**
1. **Search Input** (2 hours)
   - Text search (debounced)
   - Clear button
   - Search icon
   - Loading indicator

2. **Filter Controls** (3 hours)
   - Status filter (Active, Resolved, Disputed)
   - Category filter (Crypto, Sports, Politics, Other)
   - Sort dropdown (Newest, Ending Soon, Popular)
   - Apply filters button

3. **Filter Logic** (2 hours)
   ```typescript
   // lib/hooks/use-market-filters.ts
   // Client-side filtering
   // Query param sync
   // Reset filters
   ```

4. **Pagination** (1 hour)
   - Simple pagination (Prev/Next)
   - Page numbers (1, 2, 3, ...)
   - Items per page (default: 20)

**Deliverables:**
- ✅ Search working (by title)
- ✅ Filters working (status, category)
- ✅ Sort working
- ✅ Pagination working
- ✅ URL state synced

---

### **DAY 21 (Sunday): Market Detail Page (Scaffold)**

**Story:** STORY-3.7.md
**Time:** 6-8 hours
**Tier:** Tier 2 (Core - Enhanced DoD)

**Tasks:**
1. **Market Detail Page** (2 hours)
   ```typescript
   // app/market/[id]/page.tsx
   // Fetch market by ID
   // Display market info
   // Loading/error states
   ```

2. **Market Header** (2 hours)
   - Market question (title)
   - Status badge
   - End date
   - Creator info
   - Category

3. **Market Stats Section** (2 hours)
   - Current odds (YES/NO)
   - Trading volume
   - Liquidity
   - Total traders
   - Your position (if any)

4. **Placeholder Sections** (2 hours)
   - Trading panel (scaffold only)
   - Price chart (empty chart)
   - Discussion section (scaffold)
   - "Coming in Week 4-5" messages

**Deliverables:**
- ✅ Market detail page displays market info
- ✅ Dynamic routing working ([id])
- ✅ Stats section complete
- ✅ Scaffolding for trading/chart/discussion
- ✅ Responsive design

---

## 🎨 DESIGN SYSTEM FOUNDATIONS (Week 3)

### Color Palette

```typescript
// tailwind.config.ts
module.exports = {
  theme: {
    colors: {
      // Primary (ZMART brand)
      primary: {
        50: '#f0f9ff',
        100: '#e0f2fe',
        500: '#0ea5e9',  // Main brand color
        600: '#0284c7',
        700: '#0369a1',
      },

      // YES/NO outcomes
      yes: {
        50: '#f0fdf4',
        500: '#22c55e',  // Green for YES
        600: '#16a34a',
      },
      no: {
        50: '#fef2f2',
        500: '#ef4444',  // Red for NO
        600: '#dc2626',
      },

      // Neutral
      gray: {
        50: '#f9fafb',
        100: '#f3f4f6',
        500: '#6b7280',
        700: '#374151',
        900: '#111827',
      },

      // Status
      success: '#22c55e',
      error: '#ef4444',
      warning: '#f59e0b',
      info: '#3b82f6',
    },
  },
};
```

### Typography

```
Headings: font-semibold
Body: font-normal
Small: text-sm
Large: text-lg

Font Family: Inter (from Next.js font optimization)
```

### Spacing

```
Container max-width: 1280px (xl)
Page padding: px-4 md:px-6 lg:px-8
Component spacing: space-y-4 (1rem)
Section spacing: space-y-8 (2rem)
```

### Breakpoints

```typescript
sm: '640px',  // Mobile landscape
md: '768px',  // Tablet
lg: '1024px', // Desktop
xl: '1280px', // Large desktop
```

---

## ✅ WEEK 3 DEFINITION OF DONE

### Tier 2 (Core - Enhanced DoD)

**Code Quality:**
- ✅ TypeScript strict mode, zero errors
- ✅ ESLint passing (Next.js config)
- ✅ All components have prop types
- ✅ No `any` types (use `unknown` if needed)
- ✅ Consistent naming conventions

**Testing:**
- ✅ Manual testing on Chrome, Firefox, Safari
- ✅ Mobile responsive testing (iPhone, Android)
- ✅ Wallet connection tested (Phantom, Solflare)
- ✅ Supabase queries working with real data
- ✅ Error states tested (no wallet, network error, etc.)

**Performance:**
- ✅ Lighthouse score >90 (performance)
- ✅ First Contentful Paint <1.5s
- ✅ No console errors/warnings
- ✅ Images optimized (Next.js Image component)

**Security:**
- ✅ No secrets in client code
- ✅ Environment variables properly configured
- ✅ SIWE signature verification working
- ✅ RLS policies active on Supabase

**Documentation:**
- ✅ README.md in frontend/ folder
- ✅ Component documentation (JSDoc)
- ✅ Environment variables documented
- ✅ Setup instructions tested

**Integration:**
- ✅ Connects to backend API (17 endpoints)
- ✅ Real data from Supabase
- ✅ Wallet transactions signing works
- ✅ SIWE authentication flow complete

---

## 🚨 WEEK 3 RISK MITIGATION

### Potential Blockers

**1. Wallet Adapter Issues**
- **Risk:** Phantom wallet not connecting
- **Mitigation:** Use latest @solana/wallet-adapter-react
- **Fallback:** Test with Solflare as backup

**2. Supabase Type Generation**
- **Risk:** Generated types don't match schema
- **Mitigation:** Run type generation after every schema change
- **Fallback:** Manual type definitions if needed

**3. Next.js App Router Learning Curve**
- **Risk:** Server components vs client components confusion
- **Mitigation:** Read Next.js 14 docs thoroughly
- **Fallback:** Use "use client" directive liberally in Week 3

**4. shadcn/ui Component Conflicts**
- **Risk:** Tailwind class conflicts
- **Mitigation:** Use `cn()` utility consistently
- **Fallback:** Override with `!important` sparingly

**5. Mobile Responsiveness**
- **Risk:** Components don't work well on mobile
- **Mitigation:** Mobile-first design from Day 1
- **Fallback:** Simplify mobile UI if needed

---

## 📊 WEEK 3 SUCCESS METRICS

**Quantitative:**
- 7 story files created and completed ✅
- ~2000-3000 lines of frontend code
- 15-20 React components
- 5-7 custom hooks
- 3-4 Zustand stores
- TypeScript compilation: 0 errors
- ESLint: 0 errors, <5 warnings

**Qualitative:**
- User can connect wallet and see their address ✅
- User can browse markets with real backend data ✅
- User can view market details ✅
- Design feels professional and polished ✅
- Mobile experience is smooth ✅

**Anti-Patterns Prevented:**
- ✅ Pattern #2: No scope creep (strict adherence to Week 3 scope)
- ✅ Pattern #3: No crisis loop (comprehensive planning prevents panic)
- ✅ Pattern #5: Performance considered from start (Lighthouse >90)
- ✅ Pattern #6: Security in foundation (SIWE, RLS)

---

## 🔄 WEEK 3 → WEEK 4 HANDOFF

**What's Complete After Week 3:**
- Frontend foundation (Next.js, Tailwind, shadcn/ui)
- Wallet integration (connect, disconnect, sign transactions)
- Authentication (SIWE)
- Layout & navigation (header, footer, mobile menu)
- Homepage (market list, filters, search, pagination)
- Market detail page (scaffolded, ready for trading interface)

**What's Next in Week 4:**
- Market creation wizard (3-step form)
- User dashboard (positions, P&L, winnings)
- Trading interface (buy/sell shares, LMSR integration)
- Market browse/explore (advanced filtering)
- Begin proposal voting UI

**Preparation for Week 4:**
1. Review LMSR mathematics (05_LMSR_MATHEMATICS.md)
2. Study Anchor program client integration
3. Plan transaction signing flows
4. Design trading interface mockups

---

## 📝 STORY FILES TO CREATE

### Week 3 Stories (7 total)

1. **STORY-3.1.md** - Day 15: Project Setup & Configuration
2. **STORY-3.2.md** - Day 16: Wallet Integration
3. **STORY-3.3.md** - Day 17: Supabase Integration + Authentication
4. **STORY-3.4.md** - Day 18: Layout & Navigation
5. **STORY-3.5.md** - Day 19: Homepage - Market List (Part 1)
6. **STORY-3.6.md** - Day 20: Homepage - Filters & Search (Part 2)
7. **STORY-3.7.md** - Day 21: Market Detail Page (Scaffold)

Each story will follow the template from `/docs/stories/STORY-TEMPLATE.md`.

---

## 🎬 NEXT STEPS

**Immediate Actions:**

1. **Review this plan** - Read through, ask questions
2. **Create story files** - Generate STORY-3.1.md through STORY-3.7.md
3. **Start Day 15** - Initialize Next.js project
4. **Follow story-first development** - Complete STORY-3.1 before moving to STORY-3.2

**Command to Start:**
```bash
cd /Users/seman/Desktop/zmartV0.69
mkdir -p docs/stories

# Create first story
cp docs/stories/STORY-TEMPLATE.md docs/stories/STORY-3.1.md

# Begin implementation
# (Follow STORY-3.1.md tasks)
```

---

**Last Updated:** November 6, 2025
**Next Review:** End of Day 21 (Week 3 retrospective)
**Status:** 🎬 READY TO LAUNCH WEEK 3
