import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletStore } from '@/stores/wallet-store';
import { useEffect } from 'react';

export function useWalletConnection() {
  const wallet = useWallet();
  const { setConnected, setPublicKey } = useWalletStore();

  useEffect(() => {
    setConnected(wallet.connected);
    setPublicKey(wallet.publicKey?.toString() || null);
  }, [wallet.connected, wallet.publicKey, setConnected, setPublicKey]);

  return {
    ...wallet,
    isConnected: wallet.connected,
  };
}
