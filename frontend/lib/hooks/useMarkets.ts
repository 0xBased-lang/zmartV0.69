import { useEffect } from 'react';
import { useMarketStore } from '@/stores/market-store';

export function useMarkets() {
  const { markets, loading, error, fetchMarkets } = useMarketStore();

  useEffect(() => {
    fetchMarkets();
  }, [fetchMarkets]);

  return {
    markets,
    loading,
    error,
    refetch: fetchMarkets,
  };
}
