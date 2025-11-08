/**
 * useUserPosition Hook
 *
 * Fetches user's position (share holdings) for a specific market from Solana blockchain
 *
 * Returns:
 * - sharesYes: BigInt (YES shares held, 9 decimals)
 * - sharesNo: BigInt (NO shares held, 9 decimals)
 * - totalInvested: BigInt (total cost basis in lamports)
 * - tradesCount: number
 * - lastTradeAt: number (timestamp)
 * - hasClaimed: boolean
 * - claimedAmount: BigInt (amount claimed in lamports)
 *
 * @module lib/hooks/useUserPosition
 */

import { useQuery } from '@tanstack/react-query';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { getProgram, deriveMarketPDA, derivePositionPDA } from '@/lib/solana/transactions';
import { PROGRAM_ID } from '@/config/constants';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * User position data from on-chain account
 */
export interface UserPosition {
  /** YES shares held (fixed-point, 9 decimals) */
  sharesYes: bigint;
  /** NO shares held (fixed-point, 9 decimals) */
  sharesNo: bigint;
  /** Total amount invested - cost basis (lamports) */
  totalInvested: bigint;
  /** Number of trades executed */
  tradesCount: number;
  /** Timestamp of last trade */
  lastTradeAt: number;
  /** Whether winnings have been claimed */
  hasClaimed: boolean;
  /** Amount claimed (lamports) */
  claimedAmount: bigint;
  /** Market PDA */
  market: PublicKey;
  /** User wallet */
  user: PublicKey;
}

/**
 * Hook options
 */
export interface UseUserPositionOptions {
  /** Refetch interval in milliseconds (default: 5000ms = 5s) */
  refetchInterval?: number;
  /** Stale time in milliseconds (default: 3000ms = 3s) */
  staleTime?: number;
  /** Enable/disable query (default: true) */
  enabled?: boolean;
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Fetch user's position from Solana blockchain
 *
 * @param marketId - Market ID (hex string without 0x prefix)
 * @param options - Query options (refetch interval, stale time, enabled)
 * @returns React Query result with position data
 *
 * @example
 * ```tsx
 * const { publicKey } = useWallet();
 * const { data: position, isLoading } = useUserPosition('abc123...');
 *
 * if (!publicKey) return <ConnectWallet />;
 * if (isLoading) return <Loading />;
 * if (!position) return <NoPosition />;
 *
 * return (
 *   <div>
 *     <p>YES: {position.sharesYes} shares</p>
 *     <p>NO: {position.sharesNo} shares</p>
 *   </div>
 * );
 * ```
 */
export function useUserPosition(
  marketId: string | undefined,
  options: UseUserPositionOptions = {}
) {
  const { connection } = useConnection();
  const { publicKey } = useWallet();

  const {
    refetchInterval = 5000, // 5 seconds (more frequent than market state)
    staleTime = 3000,        // 3 seconds
    enabled = true,
  } = options;

  return useQuery({
    queryKey: ['user-position', marketId, publicKey?.toBase58()],
    queryFn: async (): Promise<UserPosition | null> => {
      if (!marketId || !publicKey) {
        return null;
      }

      // Derive PDAs
      const programId = new PublicKey(PROGRAM_ID);
      const [marketPDA] = deriveMarketPDA(programId, marketId);
      const [positionPDA] = derivePositionPDA(programId, marketPDA, publicKey);

      // Create dummy wallet for read-only operations
      const dummyWallet = {
        publicKey: PublicKey.default,
        signTransaction: async <T,>(tx: T): Promise<T> => tx,
        signAllTransactions: async <T,>(txs: T[]): Promise<T[]> => txs,
      };

      // Get program instance
      const program = getProgram(connection, dummyWallet);

      try {
        // Fetch position account
        const positionAccount = await program.account.userPosition.fetch(positionPDA);

        // Convert BN to BigInt and extract relevant fields
        return {
          sharesYes: BigInt(positionAccount.sharesYes.toString()),
          sharesNo: BigInt(positionAccount.sharesNo.toString()),
          totalInvested: BigInt(positionAccount.totalInvested.toString()),
          tradesCount: Number(positionAccount.tradesCount),
          lastTradeAt: Number(positionAccount.lastTradeAt.toString()),
          hasClaimed: positionAccount.hasClaimed,
          claimedAmount: BigInt(positionAccount.claimedAmount.toString()),
          market: positionAccount.market,
          user: positionAccount.user,
        };
      } catch (error: any) {
        // Position account doesn't exist yet (user hasn't traded)
        if (error.message?.includes('Account does not exist')) {
          return null;
        }
        throw error;
      }
    },
    staleTime,
    refetchInterval,
    refetchOnWindowFocus: true,
    enabled: enabled && !!marketId && !!publicKey,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });
}

// ============================================================================
// Helper Hooks
// ============================================================================

/**
 * Get user position with convenient boolean flags
 *
 * @param marketId - Market ID (hex string without 0x prefix)
 * @returns Object with position data and status booleans
 *
 * @example
 * ```tsx
 * const { position, hasPosition, isLoading, totalShares } = useUserPositionWithStatus('abc123...');
 *
 * if (isLoading) return <Skeleton />;
 * if (!hasPosition) return <EmptyState message="No position yet" />;
 *
 * return <PositionCard position={position!} totalShares={totalShares} />;
 * ```
 */
export function useUserPositionWithStatus(marketId: string | undefined) {
  const query = useUserPosition(marketId);
  const { publicKey } = useWallet();

  const totalShares = query.data
    ? query.data.sharesYes + query.data.sharesNo
    : 0n;

  return {
    position: query.data,
    hasPosition: query.data !== null && totalShares > 0n,
    isLoading: query.isLoading,
    isError: query.isError && !query.isLoading,
    totalShares,
    isWalletConnected: !!publicKey,
    refetch: query.refetch,
  };
}

/**
 * Calculate position value and P&L
 *
 * @param position - User position data
 * @param currentYesPrice - Current YES price (0-1 range)
 * @param currentNoPrice - Current NO price (0-1 range)
 * @returns Position value, unrealized P&L, and ROI
 *
 * @example
 * ```tsx
 * const { data: position } = useUserPosition('abc123...');
 * const prices = calculatePrices(marketState);
 *
 * if (position) {
 *   const pnl = calculatePositionPnL(position, prices.yesPrice / 100, prices.noPrice / 100);
 *   console.log('Current value:', pnl.currentValue);
 *   console.log('Unrealized P&L:', pnl.unrealizedPnL);
 *   console.log('ROI:', pnl.roi);
 * }
 * ```
 */
export function calculatePositionPnL(
  position: UserPosition,
  currentYesPrice: number, // 0-1 range
  currentNoPrice: number   // 0-1 range
): {
  currentValue: bigint;
  unrealizedPnL: bigint;
  roi: number;
} {
  // Convert shares from fixed-point to float for price calculation
  const DECIMALS = 1_000_000_000n; // 9 decimals
  const sharesYesFloat = Number(position.sharesYes) / Number(DECIMALS);
  const sharesNoFloat = Number(position.sharesNo) / Number(DECIMALS);

  // Calculate current value (shares * price, converted back to lamports)
  const yesValue = sharesYesFloat * currentYesPrice * 1_000_000_000; // SOL to lamports
  const noValue = sharesNoFloat * currentNoPrice * 1_000_000_000;
  const currentValue = BigInt(Math.floor(yesValue + noValue));

  // Calculate P&L
  const unrealizedPnL = currentValue - position.totalInvested;

  // Calculate ROI (return on investment)
  const roi = position.totalInvested > 0n
    ? (Number(unrealizedPnL) / Number(position.totalInvested)) * 100
    : 0;

  return {
    currentValue,
    unrealizedPnL,
    roi,
  };
}

/**
 * Format position for display
 *
 * @param position - User position data
 * @returns Formatted strings for UI display
 *
 * @example
 * ```tsx
 * const { data: position } = useUserPosition('abc123...');
 * if (position) {
 *   const formatted = formatPosition(position);
 *   return (
 *     <div>
 *       <p>YES: {formatted.sharesYes}</p>
 *       <p>NO: {formatted.sharesNo}</p>
 *       <p>Invested: {formatted.totalInvested}</p>
 *     </div>
 *   );
 * }
 * ```
 */
export function formatPosition(position: UserPosition): {
  sharesYes: string;
  sharesNo: string;
  totalInvested: string;
  totalShares: string;
} {
  const DECIMALS = 1_000_000_000n; // 9 decimals

  // Convert from fixed-point
  const sharesYes = Number(position.sharesYes) / Number(DECIMALS);
  const sharesNo = Number(position.sharesNo) / Number(DECIMALS);
  const totalShares = sharesYes + sharesNo;

  // Convert lamports to SOL
  const totalInvestedSOL = Number(position.totalInvested) / 1_000_000_000;

  return {
    sharesYes: sharesYes.toFixed(2),
    sharesNo: sharesNo.toFixed(2),
    totalShares: totalShares.toFixed(2),
    totalInvested: totalInvestedSOL.toFixed(4),
  };
}
