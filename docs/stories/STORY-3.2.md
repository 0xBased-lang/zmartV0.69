# STORY-3.2: Wallet Connection & Authentication (Day 16)

**Status:** 📋 READY TO START
**Created:** November 6, 2025
**Tier:** Tier 3 (Medium - Full DoD)
**Estimated:** 6-8 hours
**Owner:** Frontend Team
**Priority:** P0 Critical

---

## 📋 User Story

**As a** user visiting ZMART
**I want** to connect my Solana wallet
**So that** I can trade in prediction markets and interact with the platform

---

## 🎯 Acceptance Criteria

### Functional Requirements

1. **GIVEN** I am on the ZMART homepage
   **WHEN** I click the "Connect Wallet" button
   **THEN** I see a modal with available wallet options (Phantom, Solflare, etc.)

2. **GIVEN** I have selected a wallet
   **WHEN** I approve the connection in my wallet
   **THEN** The wallet connects and I see my address displayed

3. **GIVEN** My wallet is connected
   **WHEN** I view the navigation bar
   **THEN** I see my wallet address (truncated) and SOL balance

4. **GIVEN** My wallet is connected
   **WHEN** I click the "Disconnect" button
   **THEN** My wallet disconnects and I return to the "Connect Wallet" state

5. **GIVEN** My wallet connection fails
   **WHEN** The connection is rejected or errors
   **THEN** I see a clear error message explaining what went wrong

### Non-Functional Requirements

□ **Performance**: Wallet connection <2s on fast network
□ **Security**: No private keys stored, connection state secure
□ **UX**: Clear feedback for all connection states (connecting, connected, error)
□ **Browser Support**: Chrome, Firefox, Safari (Phantom, Solflare wallets)

---

## 🏗️ Technical Implementation

### Definition of Done Tier

**Selected Tier**: Tier 3 (Medium Changes - 15 criteria)

**Rationale**: This is a core feature with significant state management, UI components, error handling, and testing requirements. Not just configuration (Tier 2) but a complete feature implementation.

### Files to Create

**Providers** (2 files):
- `app/providers.tsx` - Root providers wrapper
- `lib/solana/wallet-provider.tsx` - Wallet adapter configuration

**Components** (4 files):
- `components/wallet/WalletMultiButton.tsx` - Main wallet button
- `components/wallet/WalletModal.tsx` - Wallet selection modal
- `components/wallet/WalletBalance.tsx` - Display SOL balance
- `components/wallet/WalletAddress.tsx` - Display truncated address

**Hooks** (2 files):
- `lib/hooks/useWalletConnection.ts` - Wallet connection logic
- `lib/hooks/useWalletBalance.ts` - Fetch wallet balance

**Utils** (1 file):
- `lib/utils/wallet.ts` - Wallet utilities (truncate address, etc.)

### Files to Modify

- `app/layout.tsx` - Wrap with wallet providers
- `components/layout/Header.tsx` - Add wallet button
- `stores/wallet-store.ts` - Enhance wallet state

---

## 📐 Implementation Plan

### Phase 1: Wallet Provider Setup (2 hours)

**1.1 Create Wallet Provider Configuration**

Create `lib/solana/wallet-provider.tsx`:
```typescript
'use client';

import { useMemo } from 'react';
import {
  ConnectionProvider,
  WalletProvider,
} from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  TorusWalletAdapter,
} from '@solana/wallet-adapter-wallets';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';
import { SOLANA_NETWORK, SOLANA_RPC_URL } from '@/config/constants';

// Import wallet adapter CSS
import '@solana/wallet-adapter-react-ui/styles.css';

export function SolanaWalletProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // Network configuration
  const network = SOLANA_NETWORK as WalletAdapterNetwork;
  const endpoint = useMemo(() => SOLANA_RPC_URL || clusterApiUrl(network), [network]);

  // Wallet adapters
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
      new TorusWalletAdapter(),
    ],
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
```

**1.2 Create Providers Wrapper**

Create `app/providers.tsx`:
```typescript
'use client';

import { SolanaWalletProvider } from '@/lib/solana/wallet-provider';

export function Providers({ children }: { children: React.ReactNode }) {
  return <SolanaWalletProvider>{children}</SolanaWalletProvider>;
}
```

**1.3 Update Root Layout**

Update `app/layout.tsx`:
```typescript
import { Providers } from './providers';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.variable}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
```

---

### Phase 2: Wallet Connection Components (2 hours)

**2.1 Create Wallet Button Component**

Update `components/wallet/WalletButton.tsx`:
```typescript
'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Button } from '@/components/ui/button';
import { WalletAddress } from './WalletAddress';
import { WalletBalance } from './WalletBalance';

export function WalletButton() {
  const { connected, publicKey } = useWallet();

  if (!connected) {
    return <WalletMultiButton className="!bg-primary hover:!bg-primary-600" />;
  }

  return (
    <div className="flex items-center gap-2">
      <WalletBalance />
      <WalletAddress address={publicKey?.toString() || ''} />
      <WalletMultiButton className="!bg-primary hover:!bg-primary-600" />
    </div>
  );
}
```

**2.2 Create Wallet Address Display**

Update `components/wallet/WalletAddress.tsx`:
```typescript
'use client';

import { truncateAddress } from '@/lib/utils/wallet';

interface WalletAddressProps {
  address: string;
}

export function WalletAddress({ address }: WalletAddressProps) {
  if (!address) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-md">
      <div className="w-2 h-2 rounded-full bg-green-500" />
      <span className="text-sm font-mono">{truncateAddress(address)}</span>
    </div>
  );
}
```

**2.3 Create Wallet Balance Component**

Create `components/wallet/WalletBalance.tsx`:
```typescript
'use client';

import { useWalletBalance } from '@/lib/hooks/useWalletBalance';
import { Skeleton } from '@/components/ui/skeleton';

export function WalletBalance() {
  const { balance, loading } = useWalletBalance();

  if (loading) {
    return <Skeleton className="w-20 h-8" />;
  }

  return (
    <div className="px-3 py-2 bg-primary-50 rounded-md">
      <span className="text-sm font-semibold text-primary">
        {balance.toFixed(2)} SOL
      </span>
    </div>
  );
}
```

---

### Phase 3: Custom Hooks (1.5 hours)

**3.1 Create Wallet Connection Hook**

Create `lib/hooks/useWalletConnection.ts`:
```typescript
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletStore } from '@/stores/wallet-store';
import { useEffect } from 'react';

export function useWalletConnection() {
  const wallet = useWallet();
  const { setConnected, setPublicKey, setError } = useWalletStore();

  useEffect(() => {
    setConnected(wallet.connected);
    setPublicKey(wallet.publicKey?.toString() || null);
  }, [wallet.connected, wallet.publicKey, setConnected, setPublicKey]);

  // Handle connection errors
  useEffect(() => {
    if (wallet.error) {
      setError(wallet.error.message);
    }
  }, [wallet.error, setError]);

  return {
    ...wallet,
    isConnected: wallet.connected,
  };
}
```

**3.2 Create Wallet Balance Hook**

Create `lib/hooks/useWalletBalance.ts`:
```typescript
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { useEffect, useState } from 'react';

export function useWalletBalance() {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!publicKey) {
      setBalance(0);
      setLoading(false);
      return;
    }

    let subscriptionId: number;

    const fetchBalance = async () => {
      try {
        const bal = await connection.getBalance(publicKey);
        setBalance(bal / LAMPORTS_PER_SOL);
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch balance:', error);
        setBalance(0);
        setLoading(false);
      }
    };

    // Subscribe to balance changes
    subscriptionId = connection.onAccountChange(
      publicKey,
      (accountInfo) => {
        setBalance(accountInfo.lamports / LAMPORTS_PER_SOL);
      },
      'confirmed'
    );

    fetchBalance();

    return () => {
      if (subscriptionId) {
        connection.removeAccountChangeListener(subscriptionId);
      }
    };
  }, [publicKey, connection]);

  return { balance, loading };
}
```

---

### Phase 4: Utilities (30 min)

**4.1 Create Wallet Utilities**

Create `lib/utils/wallet.ts`:
```typescript
/**
 * Truncate Solana address for display
 * @param address - Full Solana address
 * @param chars - Number of chars to show on each side (default: 4)
 * @returns Truncated address (e.g., "5XaB...nK2p")
 */
export function truncateAddress(address: string, chars: number = 4): string {
  if (!address) return '';
  if (address.length <= chars * 2 + 3) return address;

  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

/**
 * Validate Solana address format
 * @param address - Address to validate
 * @returns true if valid Solana address
 */
export function isValidSolanaAddress(address: string): boolean {
  // Solana addresses are 32-44 characters, base58 encoded
  const solanaAddressRegex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
  return solanaAddressRegex.test(address);
}

/**
 * Format SOL amount for display
 * @param lamports - Amount in lamports
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted SOL string
 */
export function formatSOL(lamports: number, decimals: number = 2): string {
  const sol = lamports / 1_000_000_000;
  return sol.toFixed(decimals);
}
```

---

### Phase 5: Update Header Component (30 min)

**5.1 Update Header with Wallet Button**

Update `components/layout/Header.tsx`:
```typescript
'use client';

import { WalletButton } from '@/components/wallet/WalletButton';

export function Header() {
  return (
    <header className="border-b bg-white">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary">ZMART</h1>
          <p className="text-xs text-gray-500">Decentralized Prediction Markets</p>
        </div>
        <WalletButton />
      </div>
    </header>
  );
}
```

**5.2 Update Home Page to Include Header**

Update `app/page.tsx`:
```typescript
import { Header } from '@/components/layout/Header';

export default function Home() {
  return (
    <>
      <Header />
      <div className="min-h-screen flex items-center justify-center bg-primary-50">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md">
          <h1 className="text-4xl font-bold text-primary">ZMART v0.69</h1>
          <p className="text-gray-600 mt-2">Connect your wallet to get started!</p>
          <div className="mt-4 space-y-2 text-sm text-gray-500">
            <p>✅ Wallet integration working</p>
            <p>✅ Balance display</p>
            <p>✅ Connection state management</p>
          </div>
        </div>
      </div>
    </>
  );
}
```

---

### Phase 6: Enhanced Wallet Store (30 min)

**6.1 Update Wallet Store with Error Handling**

Update `stores/wallet-store.ts`:
```typescript
import { create } from 'zustand';

interface WalletState {
  connected: boolean;
  publicKey: string | null;
  error: string | null;
  setConnected: (connected: boolean) => void;
  setPublicKey: (publicKey: string | null) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

export const useWalletStore = create<WalletState>((set) => ({
  connected: false,
  publicKey: null,
  error: null,
  setConnected: (connected) => set({ connected }),
  setPublicKey: (publicKey) => set({ publicKey }),
  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),
}));
```

---

## 🔗 Dependencies

**Requires:**
- ✅ Day 15 complete (STORY-3.1) - Frontend project setup
- ✅ @solana/wallet-adapter-* packages installed
- ✅ Devnet SOL for testing (get from faucet)

**Provides:**
- Wallet connection capability
- Foundation for all blockchain interactions
- User authentication via wallet
- Prerequisite for Day 17+ features

---

## 📊 Definition of Done (Tier 3 - Medium)

### Functional Completion (4/4) ✅
- [ ] User can connect wallet from homepage
- [ ] Wallet address displayed correctly (truncated)
- [ ] SOL balance displayed and updates
- [ ] User can disconnect wallet

### Code Quality (4/4) ✅
- [ ] TypeScript strict mode, zero errors
- [ ] ESLint passes, zero warnings
- [ ] Code reviewed (self-review for solo)
- [ ] No console errors/warnings

### Testing (3/3) ✅
- [ ] Manual test: Connect Phantom wallet
- [ ] Manual test: Connect Solflare wallet
- [ ] Manual test: Disconnect wallet
- [ ] Tested on Chrome + Firefox

### Production Readiness (2/2) ✅
- [ ] `pnpm build` succeeds
- [ ] Dev server runs with wallet working
- [ ] No blockchain errors in console

### Documentation (2/2) ✅
- [ ] STORY-3.2.md marked complete
- [ ] Comments added for complex wallet logic

---

## 🧪 Test Cases

### Manual Testing

1. **Wallet Connection (Phantom)**:
   - Open http://localhost:3000
   - Click "Connect Wallet"
   - Select Phantom from modal
   - Approve connection in Phantom
   - ✅ Verify: Address displayed, balance shown

2. **Wallet Connection (Solflare)**:
   - Disconnect current wallet
   - Click "Connect Wallet"
   - Select Solflare
   - Approve connection
   - ✅ Verify: Connection works with different wallet

3. **Wallet Disconnection**:
   - Click wallet button dropdown
   - Click "Disconnect"
   - ✅ Verify: Returns to "Connect Wallet" state

4. **Error Handling**:
   - Click "Connect Wallet"
   - Reject connection in wallet
   - ✅ Verify: Clear error message shown

5. **Balance Updates**:
   - Connect wallet
   - Note current balance
   - Send SOL to/from wallet externally
   - ✅ Verify: Balance updates automatically

6. **Page Refresh**:
   - Connect wallet
   - Refresh page
   - ✅ Verify: Wallet auto-reconnects (if autoConnect enabled)

---

## 🔍 Technical Notes

### Wallet Adapter Architecture

**@solana/wallet-adapter-react**: React hooks and context
**@solana/wallet-adapter-react-ui**: Pre-built UI components
**@solana/wallet-adapter-wallets**: Wallet adapter implementations

**Connection Flow**:
1. User clicks "Connect Wallet"
2. WalletModalProvider shows available wallets
3. User selects wallet (e.g., Phantom)
4. Wallet extension prompts for approval
5. On approval, `publicKey` becomes available
6. Balance fetched via `connection.getBalance()`

### Auto-Connect Behavior

**Enabled** (`autoConnect={true}`):
- Wallet reconnects automatically on page load
- Better UX for returning users
- Uses localStorage to remember connection

**Disabled**:
- User must connect manually each time
- More privacy-conscious

**Recommendation**: Enable for v1 (better UX)

### Balance Subscription

**Why subscribe instead of polling?**
- Real-time updates when balance changes
- More efficient than polling every few seconds
- Uses WebSocket connection to Solana RPC

**Cleanup**:
- Always remove subscription on unmount
- Prevents memory leaks

---

## 🚨 Anti-Pattern Prevention

**Pattern #2 (Scope Creep):**
- ✅ No "add wallet history" feature (defer to v2)
- ✅ No "multi-wallet management" (defer to v2)
- ✅ Stick to basic connect/disconnect only

**Pattern #3 (Reactive Crisis Loop):**
- ✅ Error handling planned upfront
- ✅ Loading states designed before coding
- ✅ No last-minute panic features

**Pattern #6 (Security Afterthought):**
- ✅ No private key exposure
- ✅ Connection state validated
- ✅ Wallet permissions scoped correctly

---

## 📝 Story Completion Checklist

- [ ] All acceptance criteria met (5 functional requirements)
- [ ] All Tier 3 DoD items complete (15 criteria)
- [ ] Manual tests passing (6 test cases)
- [ ] Code committed with proper message
- [ ] Story marked COMPLETE in git commit
- [ ] Day 16 marked complete in TODO_CHECKLIST.md
- [ ] STORY-3.3.md ready to start (Day 17)

---

**Story Points:** 6-8 hours
**Complexity:** Medium
**Risk Level:** Low (well-documented Solana wallet integration)
**Dependencies:** Day 15 complete ✅
