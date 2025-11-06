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
