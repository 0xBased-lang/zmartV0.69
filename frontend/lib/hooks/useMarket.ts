import { useQuery } from '@tanstack/react-query';
import { getAPIClient } from '@/lib/services/api';
import type { Market } from '@/types/market';

/**
 * Hook to fetch a single market by ID
 * Uses React Query for state management and caching
 * Now integrated with backend API instead of direct Supabase access
 *
 * @param marketId - The market ID to fetch
 * @returns Query result with market data, loading, and error states
 */
export function useMarket(marketId: string) {
  return useQuery<Market, Error>({
    queryKey: ['market', marketId],
    queryFn: async () => {
      const api = getAPIClient();

      // Fetch market from backend API
      const response = await api.getMarket(marketId);

      // Transform backend response to frontend Market type
      const market: Market = {
        market_id: response.id,
        title: response.question,
        description: response.description,
        state: response.state,
        created_at: response.created_at,
        expires_at: response.resolution_proposed_at || response.activated_at, // Use resolution time or activated time
        q_yes: String(response.shares_yes || 0),
        q_no: String(response.shares_no || 0),
        liquidity_parameter: String(response.b_parameter || 0),
        total_volume: String(response.total_volume || 0),
        creator: response.creator_wallet,
      };

      return market;
    },
    staleTime: 30 * 1000, // 30 seconds - data stays fresh for this duration
    refetchOnWindowFocus: true, // Refetch when user returns to tab
    enabled: !!marketId, // Only run query if marketId is provided
  });
}
