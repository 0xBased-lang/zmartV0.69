# Authentication Guide

**Version**: 0.69.0
**Last Updated**: November 9, 2025
**Protocol**: Sign-In with Ethereum (SIWE) adapted for Solana

Complete guide for implementing wallet-based authentication in ZMART with token caching, expiry handling, and production-ready patterns.

---

## Table of Contents

- [Authentication Flow](#authentication-flow)
- [Token Lifetime](#token-lifetime)
- [Frontend Integration](#frontend-integration)
- [Backend Validation](#backend-validation)
- [Security Best Practices](#security-best-practices)
- [Troubleshooting](#troubleshooting)

---

## Authentication Flow

### How It Works

1. **User connects wallet** (Phantom, Solflare, Backpack)
2. **Frontend generates message** with timestamp
3. **User signs message** with wallet private key
4. **Frontend sends signature** in Authorization header
5. **Backend validates signature** and extracts wallet address
6. **Token cached** for 1 hour to avoid re-signing

```
┌─────────┐         ┌──────────┐         ┌─────────┐
│ Wallet  │         │ Frontend │         │ Backend │
└────┬────┘         └─────┬────┘         └────┬────┘
     │                    │                   │
     │  1. Connect        │                   │
     │<───────────────────┤                   │
     │                    │                   │
     │  2. Sign message   │                   │
     │<───────────────────┤                   │
     │  (timestamp)       │                   │
     │                    │                   │
     │  3. Signature      │                   │
     ├───────────────────>│                   │
     │                    │                   │
     │                    │  4. API request   │
     │                    │  + Authorization  │
     │                    ├──────────────────>│
     │                    │                   │
     │                    │  5. Validate sig  │
     │                    │  Extract wallet   │
     │                    │<──────────────────┤
     │                    │  200 OK + data    │
```

---

## Token Lifetime

### Expiry Rules

| Parameter | Value | Reason |
|-----------|-------|--------|
| **Signature Validity** | 1 hour (3600 seconds) | Balance security vs UX |
| **Timestamp Window** | ±5 minutes | Allow clock skew |
| **Cache Strategy** | Client-side | Reduce wallet signing prompts |
| **Refresh Before Expiry** | 5 minutes | Seamless experience |

### Why 1 Hour?

- ✅ **Security**: Limits replay attack window
- ✅ **UX**: Doesn't annoy users with constant signing
- ✅ **Mobile**: Accounts for app backgrounding
- ❌ **Not 24h**: Too long, security risk
- ❌ **Not 5min**: Too short, poor UX

---

## Frontend Integration

### TypeScript Utility (Copy-Paste Ready)

Create `frontend/utils/auth.ts`:

```typescript
import { PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';

/**
 * Authentication manager with automatic token caching and refresh
 */
export class AuthManager {
  private cachedAuth: {
    header: string;
    message: string;
    signature: string;
    wallet: string;
    expiresAt: number;
  } | null = null;

  private readonly TOKEN_LIFETIME_MS = 3600000; // 1 hour
  private readonly REFRESH_BEFORE_MS = 300000; // 5 minutes

  /**
   * Get valid auth header (cached or new)
   * @param publicKey - User's wallet public key
   * @param signMessage - Wallet adapter's signMessage function
   * @returns Authorization header string
   */
  async getAuthHeader(
    publicKey: PublicKey,
    signMessage: (message: Uint8Array) => Promise<Uint8Array>
  ): Promise<string> {
    const now = Date.now();

    // Check if cached token is still valid
    if (this.cachedAuth && this.cachedAuth.expiresAt > now + this.REFRESH_BEFORE_MS) {
      console.log('[Auth] Using cached token (expires in', Math.floor((this.cachedAuth.expiresAt - now) / 1000), 'seconds)');
      return this.cachedAuth.header;
    }

    // Generate new signature
    console.log('[Auth] Generating new signature');
    const timestamp = now;
    const message = `Sign in to ZMART\nTimestamp: ${timestamp}`;
    const messageBytes = new TextEncoder().encode(message);

    try {
      const signature = await signMessage(messageBytes);
      const signatureBase58 = bs58.encode(signature);
      const wallet = publicKey.toBase58();

      const header = `Signature message=${encodeURIComponent(message)}&signature=${signatureBase58}&wallet=${wallet}`;

      // Cache for reuse
      this.cachedAuth = {
        header,
        message,
        signature: signatureBase58,
        wallet,
        expiresAt: timestamp + this.TOKEN_LIFETIME_MS,
      };

      console.log('[Auth] New token cached (expires at', new Date(this.cachedAuth.expiresAt).toISOString() + ')');
      return header;
    } catch (error) {
      console.error('[Auth] Failed to sign message:', error);
      throw new Error('Failed to authenticate: User rejected signature');
    }
  }

  /**
   * Get auth data for request body (alternative to header)
   */
  async getAuthBody(
    publicKey: PublicKey,
    signMessage: (message: Uint8Array) => Promise<Uint8Array>
  ): Promise<{ message: string; signature: string; wallet: string }> {
    await this.getAuthHeader(publicKey, signMessage); // Ensure fresh token

    if (!this.cachedAuth) {
      throw new Error('No cached authentication');
    }

    return {
      message: this.cachedAuth.message,
      signature: this.cachedAuth.signature,
      wallet: this.cachedAuth.wallet,
    };
  }

  /**
   * Check if current token is expired
   */
  isExpired(): boolean {
    if (!this.cachedAuth) return true;
    return Date.now() >= this.cachedAuth.expiresAt;
  }

  /**
   * Force clear cached token
   */
  clear(): void {
    console.log('[Auth] Clearing cached token');
    this.cachedAuth = null;
  }

  /**
   * Get remaining time until expiry (in seconds)
   */
  getTimeToExpiry(): number | null {
    if (!this.cachedAuth) return null;
    return Math.max(0, Math.floor((this.cachedAuth.expiresAt - Date.now()) / 1000));
  }
}

// Singleton instance
export const authManager = new AuthManager();
```

### React Hook Integration

Create `frontend/hooks/useAuth.ts`:

```typescript
import { useWallet } from '@solana/wallet-adapter-react';
import { useState, useCallback, useEffect } from 'react';
import { authManager } from '@/utils/auth';

export function useAuth() {
  const { publicKey, signMessage } = useWallet();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authHeader, setAuthHeader] = useState<string | null>(null);
  const [timeToExpiry, setTimeToExpiry] = useState<number | null>(null);

  // Update expiry countdown
  useEffect(() => {
    const interval = setInterval(() => {
      const time = authManager.getTimeToExpiry();
      setTimeToExpiry(time);

      if (time === 0) {
        setIsAuthenticated(false);
        setAuthHeader(null);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  /**
   * Authenticate user (sign message)
   */
  const authenticate = useCallback(async () => {
    if (!publicKey || !signMessage) {
      throw new Error('Wallet not connected');
    }

    try {
      const header = await authManager.getAuthHeader(publicKey, signMessage);
      setAuthHeader(header);
      setIsAuthenticated(true);
      return header;
    } catch (error) {
      console.error('[useAuth] Authentication failed:', error);
      throw error;
    }
  }, [publicKey, signMessage]);

  /**
   * Get current auth header (cached or new)
   */
  const getAuthHeader = useCallback(async (): Promise<string> => {
    if (!publicKey || !signMessage) {
      throw new Error('Wallet not connected');
    }

    const header = await authManager.getAuthHeader(publicKey, signMessage);
    setAuthHeader(header);
    setIsAuthenticated(true);
    return header;
  }, [publicKey, signMessage]);

  /**
   * Sign out (clear cached token)
   */
  const signOut = useCallback(() => {
    authManager.clear();
    setAuthHeader(null);
    setIsAuthenticated(false);
  }, []);

  return {
    isAuthenticated,
    authHeader,
    timeToExpiry,
    authenticate,
    getAuthHeader,
    signOut,
  };
}
```

### Usage Example

```typescript
// In a trading component
import { useAuth } from '@/hooks/useAuth';

function TradingInterface({ marketId }: { marketId: string }) {
  const { getAuthHeader } = useAuth();
  const { publicKey } = useWallet();

  async function buyShares(shares: number) {
    try {
      // Get auth header (cached or prompt signature)
      const authHeader = await getAuthHeader();

      const response = await fetch('http://localhost:4000/api/trades/buy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader,
        },
        body: JSON.stringify({
          market_id: marketId,
          outcome: true,
          shares,
          max_cost: 52000000,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error.message);
      }

      const result = await response.json();
      console.log('Trade successful:', result);
    } catch (error) {
      console.error('Trade failed:', error);
    }
  }

  return (
    <button onClick={() => buyShares(10)}>
      Buy 10 YES Shares
    </button>
  );
}
```

### Auth Status Display

```typescript
// Show auth status and expiry countdown
import { useAuth } from '@/hooks/useAuth';

function AuthStatus() {
  const { isAuthenticated, timeToExpiry, authenticate, signOut } = useAuth();
  const { connected } = useWallet();

  if (!connected) {
    return <div className="text-gray-500">Wallet not connected</div>;
  }

  if (!isAuthenticated) {
    return (
      <button onClick={authenticate} className="btn btn-primary">
        Sign In
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-green-600">✓ Authenticated</span>
      {timeToExpiry !== null && timeToExpiry < 300 && (
        <span className="text-yellow-600">
          (expires in {Math.floor(timeToExpiry / 60)}m {timeToExpiry % 60}s)
        </span>
      )}
      <button onClick={signOut} className="btn btn-sm">
        Sign Out
      </button>
    </div>
  );
}
```

---

## Backend Validation

### Signature Verification (Already Implemented)

Backend middleware validates:

1. **Timestamp freshness** (±5 minutes)
2. **Signature authenticity** (cryptographic verification)
3. **Wallet extraction** (from signature)

```typescript
// From backend/src/api/middleware/auth.ts
export async function verifyAuth(message: string, signature: string, wallet: string): Promise<boolean> {
  // 1. Parse timestamp from message
  const timestampMatch = message.match(/Timestamp: (\d+)/);
  if (!timestampMatch) return false;

  const timestamp = parseInt(timestampMatch[1], 10);
  const now = Date.now();

  // 2. Check timestamp is within 5 minutes
  if (Math.abs(now - timestamp) > 300000) {
    console.log('[Auth] Timestamp expired');
    return false;
  }

  // 3. Verify signature
  const messageBytes = new TextEncoder().encode(message);
  const signatureBytes = bs58.decode(signature);
  const publicKey = new PublicKey(wallet);

  const isValid = nacl.sign.detached.verify(messageBytes, signatureBytes, publicKey.toBytes());

  return isValid;
}
```

### Token Expiry Enforcement

Backend checks timestamp, NOT client-side "expires_at". Client caching is optimization only.

**Why?** Backend must not trust client timestamps for security.

---

## Security Best Practices

### Do's ✅

1. **Always verify timestamp** on backend (±5 min window)
2. **Cache tokens on client** (reduce signing friction)
3. **Use HTTPS/WSS** in production (prevent MITM)
4. **Clear tokens on wallet disconnect** (prevent token reuse)
5. **Log auth failures** (detect attacks)

### Don'ts ❌

1. **Don't trust client expiry** - Always validate timestamp on backend
2. **Don't skip signature verification** - Cryptographic proof required
3. **Don't extend timestamp window** - 5 minutes is maximum safe window
4. **Don't store private keys** - Never, ever, under any circumstances
5. **Don't reuse old signatures** - Each request should use fresh timestamp

### Threat Model

| Attack | Mitigation |
|--------|------------|
| **Replay Attack** | Timestamp validation (5-min window) |
| **MITM Attack** | HTTPS/WSS only in production |
| **Token Theft** | Signatures tied to specific message/timestamp |
| **Impersonation** | Cryptographic signature verification |

---

## Troubleshooting

### Issue: "Timestamp expired" error

**Cause**: Clock skew or cached token used after 1 hour

**Solution**:
```typescript
// Clear cache and re-authenticate
authManager.clear();
const newHeader = await getAuthHeader();
```

### Issue: User keeps seeing signing prompts

**Cause**: Auth not being cached

**Solution**: Verify AuthManager is singleton instance:
```typescript
// ✅ Correct - Import singleton
import { authManager } from '@/utils/auth';

// ❌ Wrong - Creating new instances
const authManager = new AuthManager(); // Don't do this!
```

### Issue: "Invalid signature" error

**Cause**: Message format mismatch

**Solution**: Ensure exact message format:
```typescript
// ✅ Correct
const message = `Sign in to ZMART\nTimestamp: ${timestamp}`;

// ❌ Wrong - Extra spaces, different format
const message = `Sign in to ZMART Timestamp:${timestamp}`;
```

### Issue: Auth fails in production

**Cause**: Using `ws://` instead of `wss://`

**Solution**: Update environment variables:
```bash
# ✅ Production
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_WS_URL=wss://ws.yourdomain.com

# ❌ Development only
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_WS_URL=ws://localhost:4001
```

---

## API Reference

### Authentication Header Format

```
Authorization: Signature message=<urlencoded-message>&signature=<base58-signature>&wallet=<wallet-address>
```

**Example**:
```
Authorization: Signature message=Sign%20in%20to%20ZMART%0ATimestamp%3A%201699564800000&signature=5YNmS1R9nNSCDzivdhG4t4JZxKS6yhZBbHf3z6FVMnVPmZJrPG7...&wallet=4WQwPjKHu3x7dHBEehBDgxXHJQoDuBvj6Xhu6C1jjTye
```

### Request Body Authentication (Alternative)

For POST requests, can include auth in body:

```json
{
  "market_id": "market-123",
  "shares": 10,
  "_auth": {
    "message": "Sign in to ZMART\nTimestamp: 1699564800000",
    "signature": "5YNmS1R9nNSCDzi...",
    "wallet": "4WQwPjKHu3x7dHBE..."
  }
}
```

**Note**: Header method preferred for cleaner separation.

---

## Complete Integration Example

```typescript
import { useWallet } from '@solana/wallet-adapter-react';
import { useAuth } from '@/hooks/useAuth';
import { useState } from 'react';

function CompleteAuthExample() {
  const { connected, publicKey } = useWallet();
  const { isAuthenticated, timeToExpiry, authenticate, getAuthHeader, signOut } = useAuth();
  const [status, setStatus] = useState('');

  async function authenticatedAction() {
    try {
      setStatus('Getting auth...');
      const authHeader = await getAuthHeader(); // Auto-caches for 1 hour

      setStatus('Making API call...');
      const response = await fetch('http://localhost:4000/api/markets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader,
        },
        body: JSON.stringify({
          question: 'Will Bitcoin reach $100k by end of 2025?',
          description: 'Market resolves YES if BTC >= $100k on Dec 31, 2025 UTC.',
          category: 'crypto',
          b_parameter: 1000,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error.message);
      }

      const result = await response.json();
      setStatus(`Success! Market created: ${result.market.id}`);
    } catch (error: any) {
      setStatus(`Error: ${error.message}`);
    }
  }

  if (!connected) {
    return <div>Please connect wallet first</div>;
  }

  return (
    <div className="p-4 border rounded">
      <h3 className="text-lg font-bold mb-2">Authentication Status</h3>

      {isAuthenticated ? (
        <div className="text-green-600 mb-2">
          ✓ Authenticated
          {timeToExpiry !== null && (
            <span className="ml-2 text-sm">
              (expires in {Math.floor(timeToExpiry / 60)}m {timeToExpiry % 60}s)
            </span>
          )}
        </div>
      ) : (
        <div className="text-gray-500 mb-2">Not authenticated</div>
      )}

      <div className="flex gap-2 mb-4">
        {!isAuthenticated && (
          <button onClick={authenticate} className="btn btn-primary">
            Sign In
          </button>
        )}

        {isAuthenticated && (
          <>
            <button onClick={authenticatedAction} className="btn btn-success">
              Create Market (Authenticated Action)
            </button>
            <button onClick={signOut} className="btn btn-secondary">
              Sign Out
            </button>
          </>
        )}
      </div>

      {status && (
        <div className="p-2 bg-gray-100 rounded text-sm">
          {status}
        </div>
      )}
    </div>
  );
}
```

---

**Last Updated**: November 9, 2025
**Version**: 0.69.0
**Token Lifetime**: 1 hour
**Status**: Production Ready
