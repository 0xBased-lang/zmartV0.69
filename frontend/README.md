# ZMART Frontend

Next.js 14 frontend for ZMART prediction markets platform.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS 3.4+
- **UI Components**: shadcn/ui
- **State Management**: Zustand
- **Forms**: React Hook Form + Zod
- **Wallet**: Solana Wallet Adapter
- **Database**: Supabase Client
- **Charts**: Recharts

## Getting Started

1. **Install dependencies**:
   ```bash
   pnpm install
   ```

2. **Configure environment variables**:
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your values
   ```

3. **Run development server**:
   ```bash
   pnpm dev
   ```

4. **Open browser**: http://localhost:3000

## Project Structure

```
frontend/
├── app/                    # Next.js App Router pages
├── components/
│   ├── layout/            # Layout components (Header, Footer)
│   ├── market/            # Market-related components
│   ├── wallet/            # Wallet connection components
│   ├── shared/            # Shared/utility components
│   └── ui/                # shadcn/ui components
├── lib/
│   ├── supabase/          # Supabase client setup
│   ├── solana/            # Solana connection setup
│   ├── hooks/             # Custom React hooks
│   └── utils/             # Utility functions
├── stores/                # Zustand state stores
├── types/                 # TypeScript type definitions
└── config/                # App configuration

```

## Environment Variables

See `.env.example` for required variables:
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `NEXT_PUBLIC_SOLANA_RPC_URL` - Solana RPC endpoint
- `NEXT_PUBLIC_PROGRAM_ID` - Deployed program ID

## Development

- **Lint**: `pnpm lint`
- **Type Check**: `pnpm type-check` (add to package.json)
- **Build**: `pnpm build`

## Week 3 Implementation

This frontend implements the 14 core features from FRONTEND_SCOPE_V1.md:

### Phase 1: Core Infrastructure (Days 15-16)
- ✅ Project setup with Next.js 14 + Tailwind CSS
- ✅ Wallet connection (Solana Wallet Adapter)
- ✅ Supabase client integration
- ⏳ Basic routing structure

### Phase 2: Market Discovery (Days 17-18)
- ⏳ Market listing page
- ⏳ Market search/filter
- ⏳ Market detail view

### Phase 3: Trading Interface (Days 19-20)
- ⏳ Buy/sell form
- ⏳ Position display
- ⏳ Transaction confirmation

### Phase 4: Polish & Testing (Day 21)
- ⏳ Error handling
- ⏳ Loading states
- ⏳ Responsive design
- ⏳ End-to-end testing

## Status

**Day 15 Complete**: ✅ Project setup, dependencies, configuration
**Next**: Day 16 - Wallet connection implementation

---

*Last Updated: November 6, 2025*
