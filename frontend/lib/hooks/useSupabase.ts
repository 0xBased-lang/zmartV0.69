import { supabase } from '@/lib/supabase/client';
import { useState, useEffect } from 'react';

/**
 * Generic hook for Supabase queries with loading/error states
 */
export function useSupabase<T>(
  query: () => Promise<T>,
  deps: React.DependencyList = []
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await query();
      setData(result);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, error, refetch: fetchData };
}

/**
 * Hook to check Supabase connection status
 */
export function useSupabaseStatus() {
  const [connected, setConnected] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkConnection = async () => {
      try {
        // Simple query to test connection
        const { error } = await supabase.from('users').select('count').limit(1);
        setConnected(!error);
      } catch {
        setConnected(false);
      } finally {
        setChecking(false);
      }
    };

    checkConnection();
  }, []);

  return { connected, checking };
}
