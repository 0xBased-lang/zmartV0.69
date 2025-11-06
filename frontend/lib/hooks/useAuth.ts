import { useWallet } from '@solana/wallet-adapter-react';
import { useEffect, useState } from 'react';
import { upsertUser, updateLastSeen } from '@/lib/supabase/auth';
import type { User } from '@/types/database';

export function useAuth() {
  const { publicKey, connected } = useWallet();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!connected || !publicKey) {
      setUser(null);
      return;
    }

    const wallet = publicKey.toString();

    const initUser = async () => {
      setLoading(true);
      try {
        // Upsert user (create if new, update last_seen if exists)
        const userData = await upsertUser(wallet);
        setUser(userData);

        // Update last seen every 5 minutes
        const interval = setInterval(() => {
          updateLastSeen(wallet);
        }, 5 * 60 * 1000);

        return () => clearInterval(interval);
      } catch (error) {
        console.error('Failed to initialize user:', error);
      } finally {
        setLoading(false);
      }
    };

    initUser();
  }, [connected, publicKey]);

  return {
    user,
    loading,
    isAuthenticated: !!user,
  };
}
