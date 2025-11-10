/**
 * Application State Capture for E2E Tests
 *
 * Captures React Query cache, wallet state, browser storage
 * Provides before/after snapshots for debugging state changes
 */

import { Page } from '@playwright/test';
import { Connection, PublicKey } from '@solana/web3.js';

/**
 * React Query cache snapshot
 */
export interface ReactQueryCache {
  timestamp: string;
  queries: Array<{
    queryKey: any[];
    state: {
      data?: any;
      error?: any;
      status: 'idle' | 'loading' | 'error' | 'success';
      dataUpdatedAt: number;
      errorUpdatedAt: number;
    };
  }>;
  mutations: Array<{
    mutationKey: any[];
    state: {
      status: 'idle' | 'loading' | 'error' | 'success';
      data?: any;
      error?: any;
    };
  }>;
}

/**
 * Wallet state snapshot
 */
export interface WalletState {
  timestamp: string;
  connected: boolean;
  publicKey: string | null;
  walletName?: string;
  // Never capture private keys or signatures
}

/**
 * Browser storage snapshot
 */
export interface BrowserStorage {
  timestamp: string;
  localStorage: Record<string, string>;
  sessionStorage: Record<string, string>;
}

/**
 * WebSocket connection state snapshot
 */
export interface WebSocketState {
  timestamp: string;
  connected: boolean;
  url: string | null;
  readyState: 'CONNECTING' | 'OPEN' | 'CLOSING' | 'CLOSED' | 'NONE';
  totalConnections: number;
  activeConnections: number;
  messagesSent: number;
  messagesReceived: number;
  avgLatency: number;
  reconnectionCount: number;
  errorCount: number;
  totalDataTransferred: number;
}

/**
 * On-chain account state
 */
export interface OnChainState {
  timestamp: string;
  label: string;
  address: string;
  owner: string;
  lamports: number;
  executable: boolean;
  rentEpoch: number;
  dataLength: number;
  // Data stored as base64 to preserve binary data
  data?: string;
}

/**
 * Transaction details from blockchain
 */
export interface TransactionDetails {
  timestamp: string;
  signature: string;
  slot?: number;
  blockTime?: number | null;
  confirmations?: number | null;
  err?: any;
  fee?: number;
  computeUnitsConsumed?: number;
  logs?: string[];
  preBalances?: number[];
  postBalances?: number[];
  preTokenBalances?: any[];
  postTokenBalances?: any[];
}

/**
 * Capture React Query cache state
 *
 * NOTE: This requires React Query DevTools to expose cache data
 * If cache is not accessible, returns empty snapshot
 */
export async function captureReactQueryCache(page: Page): Promise<ReactQueryCache> {
  try {
    const cache = await page.evaluate(() => {
      // Try to access React Query cache via window object
      // This works if React Query DevTools is enabled or cache is exposed
      const win = window as any;

      // Try different methods to access cache
      const queryClient =
        win.__REACT_QUERY_CLIENT__ ||
        win.queryClient ||
        win.__REACT_QUERY_DEVTOOLS_CACHE__;

      if (!queryClient) {
        return null;
      }

      // Extract queries
      const queries = queryClient.getQueryCache?.()?.getAll?.() || [];
      const mutations = queryClient.getMutationCache?.()?.getAll?.() || [];

      return {
        queries: queries.map((query: any) => ({
          queryKey: query.queryKey,
          state: {
            data: query.state.data,
            error: query.state.error,
            status: query.state.status,
            dataUpdatedAt: query.state.dataUpdatedAt,
            errorUpdatedAt: query.state.errorUpdatedAt,
          },
        })),
        mutations: mutations.map((mutation: any) => ({
          mutationKey: mutation.options?.mutationKey || [],
          state: {
            status: mutation.state.status,
            data: mutation.state.data,
            error: mutation.state.error,
          },
        })),
      };
    });

    return {
      timestamp: new Date().toISOString(),
      queries: cache?.queries || [],
      mutations: cache?.mutations || [],
    };
  } catch (error) {
    console.warn('⚠️  Failed to capture React Query cache:', error);
    return {
      timestamp: new Date().toISOString(),
      queries: [],
      mutations: [],
    };
  }
}

/**
 * Capture wallet connection state
 *
 * SECURITY: Never captures private keys or transaction signatures
 */
export async function captureWalletState(page: Page): Promise<WalletState> {
  try {
    const walletState = await page.evaluate(() => {
      const win = window as any;

      // Try to access wallet adapter
      const solana = win.solana;
      const phantom = win.phantom?.solana;
      const backpack = win.backpack;

      // Get active wallet
      let wallet = solana || phantom || backpack;

      return {
        connected: !!wallet?.isConnected || !!wallet?.connected,
        publicKey: wallet?.publicKey?.toString() || null,
        walletName: wallet?.isPhantom ? 'Phantom' :
                     wallet?.isBackpack ? 'Backpack' :
                     wallet ? 'Unknown' : null,
      };
    });

    return {
      timestamp: new Date().toISOString(),
      ...walletState,
    };
  } catch (error) {
    console.warn('⚠️  Failed to capture wallet state:', error);
    return {
      timestamp: new Date().toISOString(),
      connected: false,
      publicKey: null,
    };
  }
}

/**
 * Capture browser storage (localStorage + sessionStorage)
 *
 * Filters out sensitive data like private keys
 */
export async function captureBrowserStorage(page: Page): Promise<BrowserStorage> {
  try {
    const storage = await page.evaluate(() => {
      const sensitiveKeys = ['privateKey', 'secretKey', 'mnemonic', 'seed'];

      // Helper to filter storage
      const filterStorage = (storage: Storage): Record<string, string> => {
        const filtered: Record<string, string> = {};
        for (let i = 0; i < storage.length; i++) {
          const key = storage.key(i);
          if (!key) continue;

          // Skip sensitive keys
          if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
            filtered[key] = '[REDACTED]';
            continue;
          }

          const value = storage.getItem(key);
          if (value !== null) {
            filtered[key] = value;
          }
        }
        return filtered;
      };

      return {
        localStorage: filterStorage(window.localStorage),
        sessionStorage: filterStorage(window.sessionStorage),
      };
    });

    return {
      timestamp: new Date().toISOString(),
      ...storage,
    };
  } catch (error) {
    console.warn('⚠️  Failed to capture browser storage:', error);
    return {
      timestamp: new Date().toISOString(),
      localStorage: {},
      sessionStorage: {},
    };
  }
}

/**
 * Capture WebSocket connection state
 *
 * Uses enhanced tracking to get WebSocket stats if available
 */
export async function captureWebSocketState(): Promise<WebSocketState> {
  try {
    // Import dynamically to avoid circular dependencies
    const { getWebSocketStats, isWebSocketConnected } = await import('./websocket-tracker');

    const stats = getWebSocketStats();
    const connected = isWebSocketConnected();

    // Determine readyState
    let readyState: WebSocketState['readyState'] = 'NONE';
    if (stats.totalConnections > 0) {
      if (connected) {
        readyState = 'OPEN';
      } else if (stats.activeConnections === 0 && stats.totalConnections > 0) {
        readyState = 'CLOSED';
      }
    }

    return {
      timestamp: new Date().toISOString(),
      connected,
      url: connected ? 'ws://localhost:4001' : null, // From env
      readyState,
      totalConnections: stats.totalConnections,
      activeConnections: stats.activeConnections,
      messagesSent: stats.messagesSent,
      messagesReceived: stats.messagesReceived,
      avgLatency: stats.avgLatency,
      reconnectionCount: stats.reconnectionCount,
      errorCount: stats.errorCount,
      totalDataTransferred: stats.totalDataTransferred,
    };
  } catch (error) {
    // WebSocket tracking may not be initialized
    return {
      timestamp: new Date().toISOString(),
      connected: false,
      url: null,
      readyState: 'NONE',
      totalConnections: 0,
      activeConnections: 0,
      messagesSent: 0,
      messagesReceived: 0,
      avgLatency: 0,
      reconnectionCount: 0,
      errorCount: 0,
      totalDataTransferred: 0,
    };
  }
}

/**
 * Capture on-chain account state
 *
 * @param connection - Solana connection instance
 * @param accountAddress - Account public key
 * @param label - Description of what this account is
 */
export async function captureOnChainState(
  connection: Connection,
  accountAddress: PublicKey,
  label: string
): Promise<OnChainState> {
  try {
    const accountInfo = await connection.getAccountInfo(accountAddress);

    if (!accountInfo) {
      return {
        timestamp: new Date().toISOString(),
        label,
        address: accountAddress.toBase58(),
        owner: 'N/A',
        lamports: 0,
        executable: false,
        rentEpoch: 0,
        dataLength: 0,
      };
    }

    return {
      timestamp: new Date().toISOString(),
      label,
      address: accountAddress.toBase58(),
      owner: accountInfo.owner.toBase58(),
      lamports: accountInfo.lamports,
      executable: accountInfo.executable,
      rentEpoch: accountInfo.rentEpoch,
      dataLength: accountInfo.data.length,
      // Store data as base64 for JSON serialization
      data: accountInfo.data.toString('base64'),
    };
  } catch (error) {
    console.error(`❌ Failed to capture on-chain state for ${label}:`, error);
    throw error;
  }
}

/**
 * Capture transaction details from blockchain
 *
 * @param connection - Solana connection instance
 * @param signature - Transaction signature
 */
export async function captureTransactionDetails(
  connection: Connection,
  signature: string
): Promise<TransactionDetails> {
  try {
    const tx = await connection.getTransaction(signature, {
      maxSupportedTransactionVersion: 0,
    });

    if (!tx) {
      return {
        timestamp: new Date().toISOString(),
        signature,
      };
    }

    return {
      timestamp: new Date().toISOString(),
      signature,
      slot: tx.slot,
      blockTime: tx.blockTime,
      confirmations: tx.confirmations,
      err: tx.meta?.err,
      fee: tx.meta?.fee,
      computeUnitsConsumed: tx.meta?.computeUnitsConsumed,
      logs: tx.meta?.logMessages || [],
      preBalances: tx.meta?.preBalances || [],
      postBalances: tx.meta?.postBalances || [],
      preTokenBalances: tx.meta?.preTokenBalances || [],
      postTokenBalances: tx.meta?.postTokenBalances || [],
    };
  } catch (error) {
    console.error(`❌ Failed to capture transaction details for ${signature}:`, error);
    throw error;
  }
}

/**
 * Capture comprehensive application state
 * Combines all state capture methods into one snapshot
 */
export interface ComprehensiveState {
  timestamp: string;
  reactQuery: ReactQueryCache;
  wallet: WalletState;
  storage: BrowserStorage;
  websocket: WebSocketState;
}

export async function captureComprehensiveState(page: Page): Promise<ComprehensiveState> {
  console.log('📸 Capturing comprehensive application state (+ WebSocket)...');

  const [reactQuery, wallet, storage, websocket] = await Promise.all([
    captureReactQueryCache(page),
    captureWalletState(page),
    captureBrowserStorage(page),
    captureWebSocketState(),
  ]);

  return {
    timestamp: new Date().toISOString(),
    reactQuery,
    wallet,
    storage,
    websocket,
  };
}

/**
 * Compare two state snapshots
 * Identifies what changed between before/after
 */
export interface StateComparison {
  field: string;
  path: string;
  before: any;
  after: any;
  changed: boolean;
  type: 'added' | 'removed' | 'modified' | 'unchanged';
}

export function compareStates(
  before: any,
  after: any,
  path: string = ''
): StateComparison[] {
  const comparisons: StateComparison[] = [];

  // Handle null/undefined
  if (before === null || before === undefined || after === null || after === undefined) {
    if (before !== after) {
      comparisons.push({
        field: path,
        path,
        before,
        after,
        changed: true,
        type: before === null || before === undefined ? 'added' : 'removed',
      });
    }
    return comparisons;
  }

  // Handle primitives
  if (typeof before !== 'object' || typeof after !== 'object') {
    comparisons.push({
      field: path,
      path,
      before,
      after,
      changed: before !== after,
      type: before !== after ? 'modified' : 'unchanged',
    });
    return comparisons;
  }

  // Handle objects/arrays
  const beforeKeys = Object.keys(before);
  const afterKeys = Object.keys(after);
  const allKeys = new Set([...beforeKeys, ...afterKeys]);

  for (const key of allKeys) {
    const newPath = path ? `${path}.${key}` : key;
    const beforeValue = before[key];
    const afterValue = after[key];

    if (!(key in after)) {
      comparisons.push({
        field: key,
        path: newPath,
        before: beforeValue,
        after: undefined,
        changed: true,
        type: 'removed',
      });
    } else if (!(key in before)) {
      comparisons.push({
        field: key,
        path: newPath,
        before: undefined,
        after: afterValue,
        changed: true,
        type: 'added',
      });
    } else if (typeof beforeValue === 'object' && typeof afterValue === 'object') {
      // Recursively compare nested objects
      comparisons.push(...compareStates(beforeValue, afterValue, newPath));
    } else {
      comparisons.push({
        field: key,
        path: newPath,
        before: beforeValue,
        after: afterValue,
        changed: beforeValue !== afterValue,
        type: beforeValue !== afterValue ? 'modified' : 'unchanged',
      });
    }
  }

  return comparisons;
}

/**
 * Print state comparison summary
 */
export function printStateComparison(comparisons: StateComparison[]): void {
  const changed = comparisons.filter(c => c.changed);

  if (changed.length === 0) {
    console.log('✅ No state changes detected');
    return;
  }

  console.log(`\n📊 State Changes (${changed.length} changes):`);

  const added = changed.filter(c => c.type === 'added');
  const removed = changed.filter(c => c.type === 'removed');
  const modified = changed.filter(c => c.type === 'modified');

  if (added.length > 0) {
    console.log(`\n  ➕ Added (${added.length}):`);
    added.forEach(c => {
      console.log(`    ${c.path} = ${JSON.stringify(c.after)}`);
    });
  }

  if (removed.length > 0) {
    console.log(`\n  ➖ Removed (${removed.length}):`);
    removed.forEach(c => {
      console.log(`    ${c.path} (was: ${JSON.stringify(c.before)})`);
    });
  }

  if (modified.length > 0) {
    console.log(`\n  🔄 Modified (${modified.length}):`);
    modified.forEach(c => {
      console.log(`    ${c.path}: ${JSON.stringify(c.before)} → ${JSON.stringify(c.after)}`);
    });
  }
}
