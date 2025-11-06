import { useWallet as useSolanaWallet } from '@solana/wallet-adapter-react';
import { useWalletStore } from '@/stores/wallet-store';
import { useEffect } from 'react';

export function useWallet() {
  const solanaWallet = useSolanaWallet();
  const { setConnected, setPublicKey } = useWalletStore();

  useEffect(() => {
    setConnected(solanaWallet.connected);
    setPublicKey(solanaWallet.publicKey?.toString() || null);
  }, [solanaWallet.connected, solanaWallet.publicKey, setConnected, setPublicKey]);

  return {
    ...solanaWallet,
    isConnected: solanaWallet.connected,
  };
}
