import { useQuery } from '@tanstack/react-query';
import { getMarkets } from '@/lib/supabase/database';
import type { Market, MarketFilters } from '@/types/market';

/**
 * Hook to fetch markets with filtering and caching
 * Uses React Query for state management and automatic refetching
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
    queryFn: () => getMarkets(filters),
    staleTime: 30 * 1000, // 30 seconds - data stays fresh for this duration
    refetchOnWindowFocus: true, // Refetch when user returns to tab
  });
}
