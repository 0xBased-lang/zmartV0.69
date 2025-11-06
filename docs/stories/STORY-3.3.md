# STORY-3.3: Supabase Integration + Authentication (Day 17)

**Status:** 📋 READY TO START
**Created:** November 6, 2025
**Tier:** Tier 2 (Small/Core - Enhanced DoD)
**Estimated:** 4-6 hours
**Owner:** Frontend Team
**Priority:** P0 Critical

---

## 📋 User Story

**As a** developer
**I want** Supabase integrated with type-safe database access
**So that** I can store user data, discussions, and off-chain state with proper authentication

---

## 🎯 Acceptance Criteria

### Functional Requirements

1. **GIVEN** Supabase credentials are configured
   **WHEN** The frontend initializes
   **THEN** A Supabase client is available for database operations

2. **GIVEN** A user connects their wallet
   **WHEN** They interact with the platform
   **THEN** Their wallet address is used for authentication and user identification

3. **GIVEN** Database schema exists in Supabase
   **WHEN** Types are generated
   **THEN** TypeScript types match the database schema exactly

4. **GIVEN** A database query is made
   **WHEN** Using the Supabase client
   **THEN** The query returns properly typed results

5. **GIVEN** RLS (Row-Level Security) policies are in place
   **WHEN** A user queries data
   **THEN** They only see data they're authorized to access

### Non-Functional Requirements

□ **Type Safety**: 100% type coverage for database operations
□ **Performance**: Query response <200ms for simple selects
□ **Security**: No service role key exposed to frontend
□ **Error Handling**: Clear error messages for connection failures

---

## 🏗️ Technical Implementation

### Definition of Done Tier

**Selected Tier**: Tier 2 (Small/Core Changes - 8 criteria)

**Rationale**: This is configuration and setup work with basic integration. Not a full feature (Tier 3) but more than trivial (Tier 1). Involves environment setup, type generation, and basic helper functions.

### Files to Create

**Configuration** (2 files):
- `lib/supabase/client.ts` - Already exists, will enhance
- `lib/supabase/types.ts` - Generated types from schema

**Authentication** (2 files):
- `lib/supabase/auth.ts` - Wallet-based auth helpers
- `lib/hooks/useAuth.ts` - Authentication hook

**Database Helpers** (2 files):
- `lib/supabase/database.ts` - Database query helpers
- `lib/hooks/useSupabase.ts` - Supabase hook

**Types** (1 file):
- `types/database.ts` - Database type exports

### Files to Modify

- `frontend/.env.local` - Add Supabase credentials (if not already present)
- `frontend/.env.example` - Update with Supabase vars
- `package.json` - Add type generation script

---

## 📐 Implementation Plan

### Phase 1: Environment Configuration (30 min)

**1.1 Update Environment Variables**

Update `frontend/.env.local`:
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Note: Service role key should NEVER be in frontend
# Only anon key (safe for client-side)
```

Update `frontend/.env.example`:
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

**1.2 Verify Supabase Client**

Check/enhance `lib/supabase/client.ts`:
```typescript
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/config/constants';
import type { Database } from './types';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);
```

---

### Phase 2: Type Generation (45 min)

**2.1 Install Supabase CLI (if not installed)**

```bash
# Install globally
npm install -g supabase

# Or use npx
npx supabase --version
```

**2.2 Generate TypeScript Types**

Add script to `frontend/package.json`:
```json
{
  "scripts": {
    "types:generate": "npx supabase gen types typescript --project-id YOUR_PROJECT_ID > lib/supabase/types.ts"
  }
}
```

**Manual Generation** (for now):
```bash
# Get project ref from Supabase dashboard URL
# https://app.supabase.com/project/[PROJECT_REF]

cd frontend
npx supabase gen types typescript --project-id YOUR_PROJECT_REF > lib/supabase/types.ts
```

**2.3 Create Type Exports**

Create `types/database.ts`:
```typescript
export type { Database } from '@/lib/supabase/types';

// User types
export type User = {
  wallet: string;
  created_at: string;
  last_seen_at: string;
  twitter_handle: string | null;
  reputation_score: number;
};

// Market types (extend from generated)
export type Market = {
  market_id: string;
  title: string;
  description: string;
  state: number;
  // ... other fields from schema
};

// Discussion types
export type Discussion = {
  discussion_id: string;
  market_id: string;
  wallet: string;
  content: string;
  created_at: string;
  upvotes: number;
};
```

---

### Phase 3: Authentication Helpers (1 hour)

**3.1 Create Auth Helpers**

Create `lib/supabase/auth.ts`:
```typescript
import { supabase } from './client';

/**
 * Create or update user profile using wallet address
 * @param wallet - Solana wallet address
 */
export async function upsertUser(wallet: string) {
  const { data, error } = await supabase
    .from('users')
    .upsert(
      {
        wallet,
        last_seen_at: new Date().toISOString(),
      },
      {
        onConflict: 'wallet',
      }
    )
    .select()
    .single();

  if (error) {
    console.error('Failed to upsert user:', error);
    throw error;
  }

  return data;
}

/**
 * Get user profile by wallet address
 * @param wallet - Solana wallet address
 */
export async function getUser(wallet: string) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('wallet', wallet)
    .single();

  if (error && error.code !== 'PGRST116') {
    // PGRST116 = not found (expected for new users)
    console.error('Failed to get user:', error);
    throw error;
  }

  return data;
}

/**
 * Update user's last seen timestamp
 * @param wallet - Solana wallet address
 */
export async function updateLastSeen(wallet: string) {
  const { error } = await supabase
    .from('users')
    .update({ last_seen_at: new Date().toISOString() })
    .eq('wallet', wallet);

  if (error) {
    console.error('Failed to update last seen:', error);
  }
}
```

**3.2 Create Authentication Hook**

Create `lib/hooks/useAuth.ts`:
```typescript
import { useWallet } from '@solana/wallet-adapter-react';
import { useEffect, useState } from 'react';
import { upsertUser, updateLastSeen } from '@/lib/supabase/auth';
import type { User } from '@/types/database';

export function useAuth() {
  const { publicKey, connected } = useWallet();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!connected || !publicKey) {
      setUser(null);
      return;
    }

    const wallet = publicKey.toString();

    const initUser = async () => {
      setLoading(true);
      try {
        // Upsert user (create if new, update last_seen if exists)
        const userData = await upsertUser(wallet);
        setUser(userData);

        // Update last seen every 5 minutes
        const interval = setInterval(() => {
          updateLastSeen(wallet);
        }, 5 * 60 * 1000);

        return () => clearInterval(interval);
      } catch (error) {
        console.error('Failed to initialize user:', error);
      } finally {
        setLoading(false);
      }
    };

    initUser();
  }, [connected, publicKey]);

  return {
    user,
    loading,
    isAuthenticated: !!user,
  };
}
```

---

### Phase 4: Database Helpers (1 hour)

**4.1 Create Database Query Helpers**

Create `lib/supabase/database.ts`:
```typescript
import { supabase } from './client';

/**
 * Get all active markets
 */
export async function getActiveMarkets() {
  const { data, error } = await supabase
    .from('markets')
    .select('*')
    .eq('state', 2) // ACTIVE state
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch markets:', error);
    throw error;
  }

  return data;
}

/**
 * Get market by ID
 * @param marketId - Market public key
 */
export async function getMarket(marketId: string) {
  const { data, error } = await supabase
    .from('markets')
    .select('*')
    .eq('market_id', marketId)
    .single();

  if (error) {
    console.error('Failed to fetch market:', error);
    throw error;
  }

  return data;
}

/**
 * Get user's positions
 * @param wallet - User's wallet address
 */
export async function getUserPositions(wallet: string) {
  const { data, error } = await supabase
    .from('positions')
    .select('*')
    .eq('wallet', wallet)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch positions:', error);
    throw error;
  }

  return data;
}

/**
 * Get discussions for a market
 * @param marketId - Market public key
 */
export async function getDiscussions(marketId: string) {
  const { data, error } = await supabase
    .from('discussions')
    .select('*')
    .eq('market_id', marketId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch discussions:', error);
    throw error;
  }

  return data;
}
```

**4.2 Create useSupabase Hook**

Create `lib/hooks/useSupabase.ts`:
```typescript
import { supabase } from '@/lib/supabase/client';
import { useState, useEffect } from 'react';

/**
 * Generic hook for Supabase queries with loading/error states
 */
export function useSupabase<T>(
  query: () => Promise<T>,
  deps: React.DependencyList = []
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await query();
        setData(result);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, error, refetch: () => query() };
}

/**
 * Hook to check Supabase connection status
 */
export function useSupabaseStatus() {
  const [connected, setConnected] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkConnection = async () => {
      try {
        // Simple query to test connection
        const { error } = await supabase.from('users').select('count').limit(1);
        setConnected(!error);
      } catch {
        setConnected(false);
      } finally {
        setChecking(false);
      }
    };

    checkConnection();
  }, []);

  return { connected, checking };
}
```

---

### Phase 5: Testing & Verification (1 hour)

**5.1 Create Test Page**

Update `app/page.tsx` (temporary test):
```typescript
'use client';

import { Header } from '@/components/layout/Header';
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
      <div className="min-h-screen flex items-center justify-center bg-primary-50">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md">
          <h1 className="text-4xl font-bold text-primary">ZMART v0.69</h1>
          <p className="text-gray-600 mt-2">Connect your wallet to get started!</p>

          <div className="mt-6 space-y-3">
            <div className="p-3 bg-gray-50 rounded">
              <h3 className="font-semibold text-sm mb-2">Status</h3>
              <div className="space-y-1 text-sm">
                <p>✅ Wallet: {connected ? 'Connected' : 'Disconnected'}</p>
                <p>
                  {dbConnected ? '✅' : checking ? '⏳' : '❌'} Database:{' '}
                  {checking ? 'Checking...' : dbConnected ? 'Connected' : 'Failed'}
                </p>
                <p>
                  {isAuthenticated ? '✅' : authLoading ? '⏳' : '❌'} Auth:{' '}
                  {authLoading ? 'Loading...' : isAuthenticated ? 'Authenticated' : 'Not authenticated'}
                </p>
              </div>
            </div>

            {user && (
              <div className="p-3 bg-primary-50 rounded">
                <h3 className="font-semibold text-sm mb-2">User Profile</h3>
                <div className="space-y-1 text-xs font-mono">
                  <p className="truncate">Wallet: {user.wallet}</p>
                  <p>Created: {new Date(user.created_at).toLocaleDateString()}</p>
                  <p>Last Seen: {new Date(user.last_seen_at).toLocaleTimeString()}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
```

**5.2 Test Checklist**

Manual Testing:
1. ✅ Verify Supabase connection (database status shows "Connected")
2. ✅ Connect wallet → User profile created in database
3. ✅ Disconnect wallet → Auth state clears
4. ✅ Reconnect wallet → User profile retrieved
5. ✅ Check last_seen_at updates in database
6. ✅ Verify TypeScript types work (autocomplete)

---

## 🔗 Dependencies

**Requires:**
- ✅ Day 16 complete (Wallet integration)
- ✅ Supabase project created with schema deployed
- ✅ Database tables exist (users, markets, discussions, etc.)
- ✅ Supabase credentials available

**Provides:**
- Type-safe database access
- Wallet-based authentication
- User profile management
- Foundation for all data fetching

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
- [ ] STORY-3.3.md updated with completion notes

---

## 🧪 Test Cases

### Manual Testing

1. **Database Connection**:
   - Start dev server
   - Check console for connection errors
   - ✅ Verify: No database errors

2. **User Creation**:
   - Connect wallet (new wallet address)
   - Check Supabase dashboard → users table
   - ✅ Verify: New user row created

3. **User Retrieval**:
   - Connect wallet (existing user)
   - Check console for user data
   - ✅ Verify: User profile loaded

4. **Last Seen Update**:
   - Connect wallet
   - Wait 5+ minutes
   - Check users table in Supabase
   - ✅ Verify: last_seen_at updated

5. **Type Safety**:
   - Write a database query
   - Check autocomplete for table names
   - ✅ Verify: Types work correctly

6. **Error Handling**:
   - Use invalid Supabase URL
   - Check error message
   - ✅ Verify: Clear error displayed

---

## 🔍 Technical Notes

### Wallet-Based Authentication

**No traditional auth** - We use wallet signatures for identity:
- User's wallet address is their unique ID
- No email, no password, no session cookies
- Supabase RLS policies use wallet address for authorization

**Flow**:
1. User connects wallet → Get public key
2. Call `upsertUser(wallet)` → Create/update user profile
3. Store user in local state (React context or Zustand)
4. All queries automatically scoped by wallet address (via RLS)

### Type Generation

**Why generate types?**
- Ensures frontend types match database schema
- Autocomplete for table/column names
- Compile-time errors if schema changes

**When to regenerate:**
- After database migrations
- When schema changes in Supabase dashboard
- Before each major feature implementation

### Supabase Client Configuration

**persistSession: true** - Keeps session in localStorage
**autoRefreshToken: true** - Auto-refreshes when expired

**Note**: For wallet-based auth, we don't actually use Supabase sessions. We use wallet signatures. But keeping these enabled doesn't hurt.

---

## 🚨 Anti-Pattern Prevention

**Pattern #2 (Scope Creep):**
- ✅ No advanced auth features (OAuth, etc.)
- ✅ No user profile editing (defer to v2)
- ✅ Just basic user creation and retrieval

**Pattern #3 (Reactive Crisis Loop):**
- ✅ Types generated upfront
- ✅ Error handling planned
- ✅ Connection testing before features

**Pattern #6 (Security Afterthought):**
- ✅ Service role key never exposed
- ✅ RLS policies enforced
- ✅ Wallet-only auth (no passwords to leak)

---

## 📝 Story Completion Checklist

- [ ] All acceptance criteria met (5 requirements)
- [ ] All Tier 2 DoD items complete (8 criteria)
- [ ] Manual tests passing (6 test cases)
- [ ] Types generated from schema
- [ ] Database connection verified
- [ ] Code committed with proper message
- [ ] Story marked COMPLETE in git commit
- [ ] Day 17 marked complete in TODO_CHECKLIST.md
- [ ] STORY-3.4.md ready to start (Day 18)

---

**Story Points:** 4-6 hours
**Complexity:** Medium
**Risk Level:** Low (standard Supabase integration)
**Dependencies:** Day 16 complete ✅, Supabase project ready
