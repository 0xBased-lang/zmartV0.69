import { create } from 'zustand';

interface Market {
  id: string;
  title: string;
  // Add more fields as needed
}

interface MarketState {
  markets: Market[];
  loading: boolean;
  error: string | null;
  fetchMarkets: () => Promise<void>;
}

export const useMarketStore = create<MarketState>((set) => ({
  markets: [],
  loading: false,
  error: null,
  fetchMarkets: async () => {
    set({ loading: true, error: null });
    try {
      // TODO: Implement actual API call
      set({ markets: [], loading: false });
    } catch (error) {
      set({ error: String(error), loading: false });
    }
  },
}));
