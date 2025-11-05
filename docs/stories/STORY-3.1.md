# STORY-3.1: Frontend Project Setup & Configuration (Day 15)

**Status:** 📋 READY TO START
**Created:** November 6, 2025
**Tier:** Tier 2 (Core - Enhanced DoD)
**Estimated:** 6-8 hours
**Owner:** Frontend Team

---

## 📋 User Story

**As a** developer
**I want** a properly configured Next.js 14 project with all dependencies
**So that** I can build the ZMART frontend with modern tooling and best practices

---

## 🎯 Acceptance Criteria

### Functional Requirements
- [ ] Next.js 14.0+ project initialized with App Router
- [ ] TypeScript configured (strict mode)
- [ ] Tailwind CSS 3.4+ working
- [ ] shadcn/ui component library installed (5 core components)
- [ ] Solana Wallet Adapter dependencies installed
- [ ] Supabase client library installed
- [ ] State management (Zustand) installed
- [ ] Form library (React Hook Form + Zod) installed
- [ ] All dependencies in package.json
- [ ] Environment variables configured (.env.local + .env.example)
- [ ] Project structure created (all folders)
- [ ] Development server running on localhost:3000

### Technical Requirements
- [ ] TypeScript `strict: true` in tsconfig.json
- [ ] Path aliases configured (`@/*`)
- [ ] ESLint configured (Next.js defaults)
- [ ] Tailwind config with custom design tokens
- [ ] No compilation errors
- [ ] No ESLint errors
- [ ] Hot reload working

---

## 📐 Implementation Plan

### Phase 1: Initialize Next.js Project (2 hours)

**1.1 Create Next.js App**
```bash
cd /Users/seman/Desktop/zmartV0.69

npx create-next-app@latest frontend \
  --typescript \
  --tailwind \
  --app \
  --src-dir false \
  --import-alias "@/*" \
  --no-git

# Expected prompts:
# ✔ Would you like to use TypeScript? … Yes
# ✔ Would you like to use ESLint? … Yes
# ✔ Would you like to use Tailwind CSS? … Yes
# ✔ Would you like to use `src/` directory? … No
# ✔ Would you like to use App Router? … Yes
# ✔ Would you like to customize the default import alias? … No
```

**1.2 Verify Installation**
```bash
cd frontend
npm run dev

# Open http://localhost:3000
# Should see Next.js welcome page
```

**1.3 Update package.json Metadata**
```json
{
  "name": "zmart-frontend",
  "version": "0.69.0",
  "description": "ZMART Prediction Markets - Frontend",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "type-check": "tsc --noEmit"
  }
}
```

---

### Phase 2: Install Core Dependencies (1 hour)

**2.1 Solana & Wallet Dependencies**
```bash
pnpm add @solana/wallet-adapter-base@^0.9.23 \
         @solana/wallet-adapter-react@^0.15.35 \
         @solana/wallet-adapter-react-ui@^0.9.35 \
         @solana/wallet-adapter-wallets@^0.19.32 \
         @solana/web3.js@^1.87.6 \
         @coral-xyz/anchor@^0.29.0
```

**2.2 Supabase Client**
```bash
pnpm add @supabase/supabase-js@^2.38.0
```

**2.3 State Management & Forms**
```bash
pnpm add zustand@^4.4.7 \
         react-hook-form@^7.48.2 \
         zod@^3.22.4 \
         @hookform/resolvers@^3.3.2
```

**2.4 UI & Utilities**
```bash
pnpm add clsx@^2.0.0 \
         tailwind-merge@^2.1.0 \
         date-fns@^2.30.0 \
         recharts@^2.10.3 \
         react-hot-toast@^2.4.1 \
         lucide-react@^0.294.0
```

**2.5 Dev Dependencies**
```bash
pnpm add -D @types/node@^20.10.0 \
            @types/react@^18.2.42 \
            @types/react-dom@^18.2.17
```

**2.6 Verify Installation**
```bash
pnpm list
# Check that all packages installed correctly
# No peer dependency warnings
```

---

### Phase 3: Configure TypeScript (30 min)

**3.1 Update tsconfig.json**
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "jsx": "preserve",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "allowJs": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

**3.2 Run Type Check**
```bash
pnpm type-check
# Should complete with no errors
```

---

### Phase 4: Configure Tailwind + Design Tokens (1 hour)

**4.1 Update tailwind.config.ts**
```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        // Primary (ZMART brand)
        primary: {
          DEFAULT: '#0ea5e9',
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
        // YES/NO outcomes
        yes: {
          DEFAULT: '#22c55e',
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        no: {
          DEFAULT: '#ef4444',
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}

export default config
```

**4.2 Update app/globals.css**
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 199.2 89% 48%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 199.2 89% 48%;
    --radius: 0.5rem;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```

**4.3 Test Tailwind**
```typescript
// app/page.tsx (temporary test)
export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-primary-50">
      <div className="bg-white p-8 rounded-lg shadow-lg">
        <h1 className="text-3xl font-bold text-primary">ZMART v0.69</h1>
        <p className="text-gray-600 mt-2">Tailwind CSS is working! ✅</p>
      </div>
    </div>
  );
}
```

---

### Phase 5: Install shadcn/ui (2 hours)

**5.1 Initialize shadcn/ui**
```bash
npx shadcn-ui@latest init

# Prompts:
# ✔ Which style would you like to use? › Default
# ✔ Which color would you like to use as base color? › Slate
# ✔ Would you like to use CSS variables for colors? … yes
```

**5.2 Install Core Components**
```bash
npx shadcn-ui@latest add button
npx shadcn-ui@latest add card
npx shadcn-ui@latest add input
npx shadcn-ui@latest add label
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add dropdown-menu
npx shadcn-ui@latest add select
npx shadcn-ui@latest add separator
npx shadcn-ui@latest add skeleton
npx shadcn-ui@latest add toast
```

**5.3 Verify Components**
```typescript
// Test in app/page.tsx
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  return (
    <div className="container mx-auto p-8">
      <Card>
        <CardHeader>
          <CardTitle>shadcn/ui Test</CardTitle>
        </CardHeader>
        <CardContent>
          <Button>Click me</Button>
          <Button variant="outline" className="ml-2">Outline</Button>
          <Button variant="destructive" className="ml-2">Destructive</Button>
        </CardContent>
      </Card>
    </div>
  );
}
```

**5.4 Create lib/utils.ts**
```typescript
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

---

### Phase 6: Configure Environment Variables (30 min)

**6.1 Create .env.local**
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Solana
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_SOLANA_NETWORK=devnet
NEXT_PUBLIC_PROGRAM_ID=your-program-id

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**6.2 Create .env.example**
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Solana
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_SOLANA_NETWORK=devnet
NEXT_PUBLIC_PROGRAM_ID=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**6.3 Update .gitignore**
```
# Environment
.env.local
.env.development.local
.env.test.local
.env.production.local
```

**6.4 Create config/constants.ts**
```typescript
export const SOLANA_NETWORK = process.env.NEXT_PUBLIC_SOLANA_NETWORK as 'devnet' | 'mainnet-beta';
export const SOLANA_RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com';
export const PROGRAM_ID = process.env.NEXT_PUBLIC_PROGRAM_ID || '';

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export const APP_NAME = 'ZMART';
export const APP_DESCRIPTION = 'Decentralized Prediction Markets on Solana';
```

---

### Phase 7: Create Project Structure (1 hour)

**7.1 Create Folder Structure**
```bash
cd frontend

# Components
mkdir -p components/ui
mkdir -p components/market
mkdir -p components/wallet
mkdir -p components/layout
mkdir -p components/shared

# Lib
mkdir -p lib/supabase
mkdir -p lib/solana
mkdir -p lib/utils
mkdir -p lib/hooks

# Stores
mkdir -p stores

# Types
mkdir -p types

# Config
mkdir -p config

# Public
mkdir -p public/images
mkdir -p public/icons
```

**7.2 Create Empty Files (Placeholders)**
```bash
# Types
touch types/market.ts
touch types/trade.ts
touch types/user.ts

# Stores
touch stores/wallet-store.ts
touch stores/market-store.ts
touch stores/ui-store.ts

# Lib
touch lib/supabase/client.ts
touch lib/supabase/types.ts
touch lib/solana/config.ts
touch lib/solana/wallet-adapter.ts
touch lib/hooks/use-market.ts
touch lib/hooks/use-wallet-balance.ts

# Config
touch config/site.ts
```

**7.3 Create config/site.ts**
```typescript
export const siteConfig = {
  name: "ZMART",
  description: "Decentralized Prediction Markets on Solana",
  url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  links: {
    github: "https://github.com/zmart/zmart",
    docs: "https://docs.zmart.io",
    twitter: "https://twitter.com/zmart",
  },
};
```

---

## 🔗 Dependencies

**Requires:**
- ✅ Week 2 backend complete (API endpoints available)
- ✅ Supabase project created and accessible
- ✅ Node.js 18+ installed
- ✅ pnpm installed

**Provides:**
- Next.js 14 project ready for development
- All dependencies installed
- Configuration complete
- Foundation for Week 3 Days 16-21

---

## 📊 Definition of Done (Tier 2 - Core Enhanced)

### Code Quality ✅
- [ ] TypeScript strict mode enabled, zero errors
- [ ] ESLint passing, zero errors
- [ ] All imports using `@/*` aliases
- [ ] Consistent file naming (kebab-case)

### Testing ✅
- [ ] `pnpm dev` starts server on localhost:3000
- [ ] `pnpm build` completes successfully
- [ ] `pnpm lint` passes
- [ ] `pnpm type-check` passes
- [ ] Test page renders with shadcn/ui components

### Documentation ✅
- [ ] .env.example documented
- [ ] README.md in frontend/ folder
- [ ] Setup instructions work (tested from scratch)

### Performance ✅
- [ ] Hot reload working (<2s)
- [ ] Build completes in <60s
- [ ] No console errors/warnings

### Security ✅
- [ ] .env.local in .gitignore
- [ ] No secrets committed
- [ ] Environment variables validated

### Integration ✅
- [ ] Tailwind CSS working
- [ ] shadcn/ui components render correctly
- [ ] Font optimization working
- [ ] Path aliases resolve correctly

---

## 🧪 Test Cases

### Manual Testing
1. **Project Initialization:**
   - Run `pnpm dev`
   - Visit http://localhost:3000
   - Verify page loads without errors

2. **Tailwind CSS:**
   - Add className with Tailwind utilities
   - Verify styles apply correctly
   - Test responsive breakpoints

3. **shadcn/ui Components:**
   - Import Button component
   - Render multiple variants
   - Verify all variants display correctly

4. **TypeScript:**
   - Create a component with props
   - Add wrong type intentionally
   - Verify TypeScript error shows

5. **Environment Variables:**
   - console.log() an env variable
   - Verify it's accessible
   - Change value, verify hot reload

6. **Hot Reload:**
   - Edit app/page.tsx
   - Save file
   - Verify change appears in browser (<2s)

---

## 🔍 Technical Notes

### Next.js 14 App Router
- Server components by default
- Client components need "use client" directive
- Metadata API for SEO
- Parallel routes, intercepting routes available

### Tailwind Configuration
- Custom colors defined in theme
- Design tokens for consistency
- Responsive breakpoints: sm, md, lg, xl, 2xl
- Dark mode ready (class strategy)

### shadcn/ui Philosophy
- Copy-paste components (not NPM package)
- Full control over component code
- Radix UI primitives underneath
- Tailwind for styling
- Accessible by default

### Path Aliases
```typescript
@/components/ui/button → /Users/.../frontend/components/ui/button
@/lib/utils → /Users/.../frontend/lib/utils
```

---

## 🚨 Anti-Pattern Prevention

**Pattern #2 (Scope Creep):**
- ✅ Only install dependencies listed in this story
- ✅ No "While we're at it, let's add..." features
- ✅ Stick to Day 15 scope (setup only, no features)

**Pattern #3 (Reactive Crisis Loop):**
- ✅ Comprehensive setup prevents future issues
- ✅ All tooling configured properly upfront
- ✅ No panic installations mid-development

**Pattern #6 (Performance/Security Afterthought):**
- ✅ TypeScript strict mode from start
- ✅ Environment variables proper from start
- ✅ .gitignore configured correctly

---

## 📝 Story Completion Checklist

- [ ] All acceptance criteria met
- [ ] All Tier 2 DoD items complete
- [ ] Manual tests passing
- [ ] Code committed with proper message
- [ ] Story marked COMPLETE in git commit
- [ ] Day 15 marked complete in TODO_CHECKLIST.md
- [ ] STORY-3.2.md ready to start (Day 16)

---

**Story Points:** 6-8 hours
**Complexity:** Medium
**Risk Level:** Low (standard setup, well-documented)
**Dependencies:** Week 2 backend complete ✅
