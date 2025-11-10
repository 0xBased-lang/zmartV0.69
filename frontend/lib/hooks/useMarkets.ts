import { useQuery } from '@tanstack/react-query';
import { getAPIClient } from '@/lib/services/api';
import type { Market, MarketFilters } from '@/types/market';

/**
 * Hook to fetch markets with filtering and caching
 * Uses React Query for state management and automatic refetching
 * Now integrated with backend API instead of direct Supabase access
 *
 * @param filters - Optional filters for state and sorting
 * @returns Query result with markets data, loading, and error states
 *
 * @example
 * const { data: markets, isLoading, error } = useMarkets({
 *   state: MarketState.ACTIVE,
 *   sortBy: 'volume'
 * });
 */
export function useMarkets(filters?: MarketFilters) {
  return useQuery<Market[], Error>({
    queryKey: ['markets', filters],
    queryFn: async () => {
      const api = getAPIClient();

      // Map frontend filters to API parameters
      const params: any = {};

      if (filters?.state) {
        params.state = filters.state;
      }

      if (filters?.category) {
        params.category = filters.category;
      }

      // Note: sortBy is handled client-side for now
      // Backend doesn't have sortBy parameter yet

      const response = await api.getMarkets(params);

      // Transform backend response to frontend Market type
      const markets = response.markets?.map((m: any) => ({
        market_id: m.id,
        title: m.question,
        description: m.description,
        state: m.state,
        created_at: m.created_at,
        expires_at: m.resolution_proposed_at || m.activated_at,
        q_yes: String(m.shares_yes || 0),
        q_no: String(m.shares_no || 0),
        liquidity_parameter: String(m.b_parameter || 0),
        total_volume: String(m.total_volume || 0),
        creator: m.creator_wallet,
      })) || [];

      // Apply client-side sorting if needed
      if (filters?.sortBy) {
        markets.sort((a, b) => {
          switch (filters.sortBy) {
            case 'newest':
              return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            case 'volume':
              return Number(b.total_volume) - Number(a.total_volume);
            case 'ending_soon':
              return new Date(a.expires_at).getTime() - new Date(b.expires_at).getTime();
            default:
              return 0;
          }
        });
      }

      return markets;
    },
    staleTime: 30 * 1000, // 30 seconds - data stays fresh for this duration
    refetchOnWindowFocus: true, // Refetch when user returns to tab
  });
}
