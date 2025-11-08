/**
 * useMarketState Hook
 *
 * Fetches real-time market state from Solana blockchain
 *
 * Returns:
 * - qYes: BigInt (YES shares outstanding, 9 decimals)
 * - qNo: BigInt (NO shares outstanding, 9 decimals)
 * - liquidity: BigInt (LMSR b parameter, 9 decimals)
 * - state: MarketState enum
 * - currentLiquidity: BigInt (current pool liquidity in lamports)
 * - totalVolume: BigInt (cumulative trading volume in lamports)
 *
 * @module lib/hooks/useMarketState
 */

import { useQuery } from '@tanstack/react-query';
import { useConnection } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { getProgram, deriveMarketPDA } from '@/lib/solana/transactions';
import { PROGRAM_ID } from '@/config/constants';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Market state returned from on-chain account
 */
export interface MarketState {
  /** YES shares outstanding (fixed-point, 9 decimals) */
  qYes: bigint;
  /** NO shares outstanding (fixed-point, 9 decimals) */
  qNo: bigint;
  /** LMSR liquidity parameter (fixed-point, 9 decimals) */
  liquidity: bigint;
  /** Current market state (0=PROPOSED, 1=APPROVED, 2=ACTIVE, etc.) */
  state: number;
  /** Current pool liquidity (lamports) */
  currentLiquidity: bigint;
  /** Cumulative trading volume (lamports) */
  totalVolume: bigint;
  /** Market creator address */
  creator: PublicKey;
  /** Market creation timestamp */
  createdAt: number;
}

/**
 * Hook options
 */
export interface UseMarketStateOptions {
  /** Refetch interval in milliseconds (default: 10000ms = 10s) */
  refetchInterval?: number;
  /** Stale time in milliseconds (default: 5000ms = 5s) */
  staleTime?: number;
  /** Enable/disable query (default: true) */
  enabled?: boolean;
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Fetch market state from Solana blockchain
 *
 * @param marketId - Market ID (hex string without 0x prefix)
 * @param options - Query options (refetch interval, stale time, enabled)
 * @returns React Query result with market state data
 *
 * @example
 * ```tsx
 * const { data: marketState, isLoading, error } = useMarketState('abc123...');
 *
 * if (isLoading) return <LoadingState />;
 * if (error) return <ErrorState error={error} />;
 * if (!marketState) return <NotFoundState />;
 *
 * // Use real market state for LMSR calculations
 * const prices = calculatePrices(marketState);
 * ```
 */
export function useMarketState(
  marketId: string | undefined,
  options: UseMarketStateOptions = {}
) {
  const { connection } = useConnection();

  const {
    refetchInterval = 10000, // 10 seconds
    staleTime = 5000,         // 5 seconds
    enabled = true,
  } = options;

  return useQuery({
    queryKey: ['market-state', marketId],
    queryFn: async (): Promise<MarketState> => {
      if (!marketId) {
        throw new Error('Market ID is required');
      }

      // Derive market PDA
      const programId = new PublicKey(PROGRAM_ID);
      const [marketPDA] = deriveMarketPDA(programId, marketId);

      // Create dummy wallet for read-only operations
      // (getProgram requires wallet interface but we only need connection)
      const dummyWallet = {
        publicKey: PublicKey.default,
        signTransaction: async <T,>(tx: T): Promise<T> => tx,
        signAllTransactions: async <T,>(txs: T[]): Promise<T[]> => txs,
      };

      // Get program instance
      const program = getProgram(connection, dummyWallet);

      // Fetch market account
      const marketAccount = await program.account.marketAccount.fetch(marketPDA);

      // Convert BN to BigInt and extract relevant fields
      return {
        qYes: BigInt(marketAccount.sharesYes.toString()),
        qNo: BigInt(marketAccount.sharesNo.toString()),
        liquidity: BigInt(marketAccount.bParameter.toString()),
        state: marketAccount.state as any, // MarketState enum (u8)
        currentLiquidity: BigInt(marketAccount.currentLiquidity.toString()),
        totalVolume: BigInt(marketAccount.totalVolume.toString()),
        creator: marketAccount.creator,
        createdAt: Number(marketAccount.createdAt.toString()),
      };
    },
    staleTime,
    refetchInterval,
    refetchOnWindowFocus: true,
    enabled: enabled && !!marketId,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

// ============================================================================
// Helper Hook: Market State with Loading/Error States
// ============================================================================

/**
 * Get market state with convenient loading/error/notFound states
 *
 * @param marketId - Market ID (hex string without 0x prefix)
 * @returns Object with data, loading, error, notFound booleans
 *
 * @example
 * ```tsx
 * const { data, isLoading, isError, isNotFound } = useMarketStateWithStatus('abc123...');
 *
 * if (isLoading) return <Skeleton />;
 * if (isNotFound) return <NotFound />;
 * if (isError) return <Error />;
 *
 * // data is guaranteed to exist here
 * return <MarketDetails state={data} />;
 * ```
 */
export function useMarketStateWithStatus(marketId: string | undefined) {
  const query = useMarketState(marketId);

  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError && !query.isLoading,
    isNotFound: query.error?.message?.includes('Account does not exist') ||
                query.error?.message?.includes('not found'),
    error: query.error,
    refetch: query.refetch,
  };
}
