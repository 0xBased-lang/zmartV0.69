/**
 * WebSocket React Hooks for ZMART V0.69
 *
 * Real-time data hooks:
 * - useMarketUpdates: Subscribe to market price changes
 * - useTradeUpdates: Subscribe to trade executions
 * - useDiscussionUpdates: Subscribe to new discussion posts
 * - usePositionUpdates: Subscribe to user position changes
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  getWebSocketClient,
  MarketUpdateEvent,
  TradeExecutedEvent,
  DiscussionEvent,
  PositionUpdateEvent,
  MarketStateChangeEvent,
} from '@/lib/services/websocket';

/**
 * Hook to track WebSocket connection state
 */
export function useWebSocketConnection() {
  const [state, setState] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>(
    'disconnected'
  );
  const [shouldFallbackToPolling, setShouldFallbackToPolling] = useState(false);

  useEffect(() => {
    const ws = getWebSocketClient();

    // Poll connection state every 2 seconds
    const interval = setInterval(() => {
      setState(ws.getState());
      setShouldFallbackToPolling(ws.shouldFallbackToPolling());
    }, 2000);

    // Initial state
    setState(ws.getState());
    setShouldFallbackToPolling(ws.shouldFallbackToPolling());

    return () => clearInterval(interval);
  }, []);

  return { state, shouldFallbackToPolling };
}

/**
 * Hook to subscribe to market price updates
 */
export function useMarketUpdates(marketId?: string) {
  const [updates, setUpdates] = useState<MarketUpdateEvent[]>([]);
  const [latestUpdate, setLatestUpdate] = useState<MarketUpdateEvent | null>(null);

  useEffect(() => {
    const ws = getWebSocketClient();

    const unsubscribe = ws.on('market:update', (data) => {
      const update = data as MarketUpdateEvent;

      // Filter by marketId if provided
      if (!marketId || update.marketId === marketId) {
        setLatestUpdate(update);
        setUpdates((prev) => [update, ...prev].slice(0, 100)); // Keep last 100 updates
      }
    });

    return () => unsubscribe();
  }, [marketId]);

  return { updates, latestUpdate };
}

/**
 * Hook to subscribe to trade executions
 */
export function useTradeUpdates(marketId?: string) {
  const [trades, setTrades] = useState<TradeExecutedEvent[]>([]);
  const [latestTrade, setLatestTrade] = useState<TradeExecutedEvent | null>(null);

  useEffect(() => {
    const ws = getWebSocketClient();

    const unsubscribe = ws.on('trade:executed', (data) => {
      const trade = data as TradeExecutedEvent;

      // Filter by marketId if provided
      if (!marketId || trade.marketId === marketId) {
        setLatestTrade(trade);
        setTrades((prev) => [trade, ...prev].slice(0, 100)); // Keep last 100 trades
      }
    });

    return () => unsubscribe();
  }, [marketId]);

  return { trades, latestTrade };
}

/**
 * Hook to subscribe to new discussion posts
 */
export function useDiscussionUpdates(marketId?: string) {
  const [discussions, setDiscussions] = useState<DiscussionEvent[]>([]);
  const [latestPost, setLatestPost] = useState<DiscussionEvent | null>(null);

  useEffect(() => {
    const ws = getWebSocketClient();

    const unsubscribe = ws.on('discussion:new', (data) => {
      const post = data as DiscussionEvent;

      // Filter by marketId if provided
      if (!marketId || post.marketId === marketId) {
        setLatestPost(post);
        setDiscussions((prev) => [post, ...prev].slice(0, 50)); // Keep last 50 posts
      }
    });

    return () => unsubscribe();
  }, [marketId]);

  return { discussions, latestPost };
}

/**
 * Hook to subscribe to user position updates
 */
export function usePositionUpdates(userId?: string, marketId?: string) {
  const [positions, setPositions] = useState<Map<string, PositionUpdateEvent>>(new Map());
  const [latestUpdate, setLatestUpdate] = useState<PositionUpdateEvent | null>(null);

  useEffect(() => {
    const ws = getWebSocketClient();

    const unsubscribe = ws.on('position:update', (data) => {
      const update = data as PositionUpdateEvent;

      // Filter by userId and/or marketId if provided
      if (
        (!userId || update.userId === userId) &&
        (!marketId || update.marketId === marketId)
      ) {
        setLatestUpdate(update);
        setPositions((prev) => {
          const newMap = new Map(prev);
          newMap.set(update.marketId, update);
          return newMap;
        });
      }
    });

    return () => unsubscribe();
  }, [userId, marketId]);

  return { positions, latestUpdate };
}

/**
 * Hook to subscribe to market state changes
 */
export function useMarketStateChanges(marketId?: string) {
  const [stateChanges, setStateChanges] = useState<MarketStateChangeEvent[]>([]);
  const [latestChange, setLatestChange] = useState<MarketStateChangeEvent | null>(null);

  useEffect(() => {
    const ws = getWebSocketClient();

    const unsubscribe = ws.on('market:state_change', (data) => {
      const change = data as MarketStateChangeEvent;

      // Filter by marketId if provided
      if (!marketId || change.marketId === marketId) {
        setLatestChange(change);
        setStateChanges((prev) => [change, ...prev].slice(0, 50));
      }
    });

    return () => unsubscribe();
  }, [marketId]);

  return { stateChanges, latestChange };
}

/**
 * Hook for optimistic UI updates
 *
 * Usage:
 * ```tsx
 * const { optimisticUpdate, rollback } = useOptimisticUpdate();
 *
 * const handleTrade = async () => {
 *   const id = optimisticUpdate({ ...newTrade });
 *   try {
 *     await executeTrade();
 *   } catch (error) {
 *     rollback(id);
 *   }
 * };
 * ```
 */
export function useOptimisticUpdate<T extends { id: string }>() {
  const [optimisticItems, setOptimisticItems] = useState<Map<string, T>>(new Map());
  const pendingIds = useRef<Set<string>>(new Set());

  const optimisticUpdate = useCallback((item: T) => {
    const id = `optimistic-${Date.now()}-${Math.random()}`;
    pendingIds.current.add(id);

    setOptimisticItems((prev) => {
      const newMap = new Map(prev);
      newMap.set(id, { ...item, id });
      return newMap;
    });

    return id;
  }, []);

  const confirm = useCallback((optimisticId: string, confirmedItem: T) => {
    pendingIds.current.delete(optimisticId);

    setOptimisticItems((prev) => {
      const newMap = new Map(prev);
      newMap.delete(optimisticId);
      return newMap;
    });
  }, []);

  const rollback = useCallback((optimisticId: string) => {
    pendingIds.current.delete(optimisticId);

    setOptimisticItems((prev) => {
      const newMap = new Map(prev);
      newMap.delete(optimisticId);
      return newMap;
    });
  }, []);

  const clearAll = useCallback(() => {
    pendingIds.current.clear();
    setOptimisticItems(new Map());
  }, []);

  return {
    optimisticItems: Array.from(optimisticItems.values()),
    optimisticUpdate,
    confirm,
    rollback,
    clearAll,
    isPending: (id: string) => pendingIds.current.has(id),
  };
}

/**
 * Hook for polling fallback when WebSocket fails
 *
 * Automatically polls API when WebSocket connection fails 5 times
 */
export function usePollingFallback<T>(
  fetchFn: () => Promise<T>,
  interval = 5000,
  enabled = true
) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { shouldFallbackToPolling } = useWebSocketConnection();

  useEffect(() => {
    if (!enabled || !shouldFallbackToPolling) {
      return;
    }

    const poll = async () => {
      setIsLoading(true);
      try {
        const result = await fetchFn();
        setData(result);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Polling failed'));
      } finally {
        setIsLoading(false);
      }
    };

    // Initial fetch
    poll();

    // Poll at interval
    const intervalId = setInterval(poll, interval);

    return () => clearInterval(intervalId);
  }, [fetchFn, interval, enabled, shouldFallbackToPolling]);

  return { data, error, isLoading };
}
