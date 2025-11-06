import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { useEffect, useState } from 'react';

export function useWalletBalance() {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!publicKey) {
      setBalance(0);
      setLoading(false);
      return;
    }

    let subscriptionId: number;

    const fetchBalance = async () => {
      try {
        const bal = await connection.getBalance(publicKey);
        setBalance(bal / LAMPORTS_PER_SOL);
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch balance:', error);
        setBalance(0);
        setLoading(false);
      }
    };

    // Subscribe to balance changes
    subscriptionId = connection.onAccountChange(
      publicKey,
      (accountInfo) => {
        setBalance(accountInfo.lamports / LAMPORTS_PER_SOL);
      },
      'confirmed'
    );

    fetchBalance();

    return () => {
      if (subscriptionId) {
        connection.removeAccountChangeListener(subscriptionId);
      }
    };
  }, [publicKey, connection]);

  return { balance, loading };
}
