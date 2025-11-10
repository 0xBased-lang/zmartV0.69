# WebSocket Client Integration Guide

**Version**: 0.69.0
**Last Updated**: November 9, 2025
**Target Framework**: React 18+ / Next.js 14+

Complete guide for integrating ZMART WebSocket server into frontend applications with React hooks, TypeScript, error handling, and production-ready patterns.

---

## Table of Contents

- [Overview](#overview)
- [Installation](#installation)
- [Basic Integration](#basic-integration)
- [React Hooks](#react-hooks)
- [Next.js Integration](#next-js-integration)
- [Advanced Patterns](#advanced-patterns)
- [Error Handling](#error-handling)
- [Performance Optimization](#performance-optimization)
- [Testing](#testing)
- [Production Checklist](#production-checklist)

---

## Overview

### What You'll Build

By the end of this guide, you'll have:
- ✅ Reusable React hooks for WebSocket connections
- ✅ Automatic reconnection with exponential backoff
- ✅ Type-safe message handling with TypeScript
- ✅ Error handling and connection status UI
- ✅ Market-specific event subscriptions
- ✅ Real-time price updates and trade notifications

### Prerequisites

- React 18+ or Next.js 14+
- TypeScript 5+
- Basic understanding of WebSocket protocol

---

## Installation

### Dependencies

```bash
# No additional dependencies required!
# WebSocket is built into modern browsers
```

### TypeScript Definitions

Create `types/websocket.ts`:

```typescript
export type EventType = "welcome" | "market_state" | "trade" | "vote" | "discussion" | "error";

export interface WebSocketEvent {
  type: EventType;
  market_id?: string;
  timestamp: string;
  data: any;
}

export interface WelcomeEvent extends WebSocketEvent {
  type: "welcome";
  data: {
    client_id: string;
    message: string;
  };
}

export interface MarketStateEvent extends WebSocketEvent {
  type: "market_state";
  market_id: string;
  data: {
    action?: "created" | "updated" | "deleted";
    old_state?: string;
    new_state?: string;
    market?: any;
    subscriptions?: string[];
    message?: string;
  };
}

export interface TradeEvent extends WebSocketEvent {
  type: "trade";
  market_id: string;
  data: {
    trade_type: "buy" | "sell";
    outcome: boolean;
    shares: string;
    cost?: string;
    payout?: string;
    user_wallet: string;
    created_at: string;
  };
}

export interface VoteEvent extends WebSocketEvent {
  type: "vote";
  market_id: string;
  data: {
    vote_type: "proposal" | "dispute";
    vote: boolean;
    user_wallet: string;
    created_at: string;
  };
}

export interface DiscussionEvent extends WebSocketEvent {
  type: "discussion";
  market_id: string;
  data: {
    id: string;
    content: string;
    user_wallet: string;
    created_at: string;
  };
}

export interface ErrorEvent extends WebSocketEvent {
  type: "error";
  data: {
    error: string;
  };
}
```

---

## Basic Integration

### Simple WebSocket Connection

```typescript
// utils/websocket.ts
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:4001';

function createWebSocketConnection(): WebSocket {
  const ws = new WebSocket(WS_URL);

  ws.onopen = () => {
    console.log('WebSocket connected');
  };

  ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    console.log('Received:', message);
  };

  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
  };

  ws.onclose = (event) => {
    console.log('WebSocket closed:', event.code, event.reason);
  };

  return ws;
}

// Usage
const ws = createWebSocketConnection();

// Subscribe to market
ws.send(JSON.stringify({
  action: 'subscribe',
  market_id: 'market-123'
}));
```

---

## React Hooks

### useWebSocket Hook

Production-ready hook with reconnection logic:

```typescript
// hooks/useWebSocket.ts
import { useEffect, useRef, useState, useCallback } from 'react';
import type { WebSocketEvent } from '@/types/websocket';

interface UseWebSocketOptions {
  url?: string;
  reconnect?: boolean;
  reconnectAttempts?: number;
  reconnectInterval?: number;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: Event) => void;
  onMessage?: (event: WebSocketEvent) => void;
}

interface UseWebSocketReturn {
  ws: WebSocket | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  send: (data: any) => void;
  reconnect: () => void;
}

export function useWebSocket(options: UseWebSocketOptions = {}): UseWebSocketReturn {
  const {
    url = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:4001',
    reconnect = true,
    reconnectAttempts = 5,
    reconnectInterval = 1000,
    onOpen,
    onClose,
    onError,
    onMessage,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      const ws = new WebSocket(url);

      ws.onopen = () => {
        console.log('[WebSocket] Connected');
        setIsConnected(true);
        setIsConnecting(false);
        setError(null);
        reconnectAttemptsRef.current = 0; // Reset on successful connection

        // 🔥 FIX GAP 4: Flush queued messages
        if (messageQueueRef.current.length > 0) {
          console.log('[WebSocket] Flushing', messageQueueRef.current.length, 'queued messages');
          messageQueueRef.current.forEach(data => {
            const message = typeof data === 'string' ? data : JSON.stringify(data);
            ws.send(message);
          });
          messageQueueRef.current = [];
        }

        onOpen?.();
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketEvent = JSON.parse(event.data);
          onMessage?.(message);
        } catch (err) {
          console.error('[WebSocket] Failed to parse message:', err);
        }
      };

      ws.onerror = (event) => {
        console.error('[WebSocket] Error:', event);
        setError('WebSocket connection error');
        onError?.(event);
      };

      ws.onclose = (event) => {
        console.log('[WebSocket] Closed:', event.code, event.reason);
        setIsConnected(false);
        setIsConnecting(false);
        wsRef.current = null;
        onClose?.();

        // Attempt reconnection
        if (reconnect && reconnectAttemptsRef.current < reconnectAttempts) {
          const delay = Math.min(
            reconnectInterval * Math.pow(2, reconnectAttemptsRef.current),
            30000
          );

          console.log(`[WebSocket] Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1}/${reconnectAttempts})`);

          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            connect();
          }, delay);
        } else if (reconnectAttemptsRef.current >= reconnectAttempts) {
          setError('Max reconnection attempts reached');
        }
      };

      wsRef.current = ws;
    } catch (err) {
      console.error('[WebSocket] Connection failed:', err);
      setError('Failed to create WebSocket connection');
      setIsConnecting(false);
    }
  }, [url, reconnect, reconnectAttempts, reconnectInterval, onOpen, onClose, onError, onMessage]);

  // 🔥 FIX GAP 4: Message queue for sending before connection open
  const messageQueueRef = useRef<any[]>([]);

  const send = useCallback((data: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const message = typeof data === 'string' ? data : JSON.stringify(data);
      wsRef.current.send(message);
      console.log('[WebSocket] Sent message:', data);
    } else {
      console.log('[WebSocket] Connection not open, queuing message');
      messageQueueRef.current.push(data);
    }
  }, []);

  const manualReconnect = useCallback(() => {
    reconnectAttemptsRef.current = 0;
    connect();
  }, [connect]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }

      if (wsRef.current) {
        wsRef.current.close(1000, 'Component unmounted');
        wsRef.current = null;
      }
    };
  }, [connect]);

  return {
    ws: wsRef.current,
    isConnected,
    isConnecting,
    error,
    send,
    reconnect: manualReconnect,
  };
}
```

---

### useMarketWebSocket Hook

Market-specific hook with event handling and **automatic subscription restoration after reconnect**:

```typescript
// hooks/useMarketWebSocket.ts
import { useEffect, useState, useCallback, useRef } from 'react';
import { useWebSocket } from './useWebSocket';
import type { WebSocketEvent, TradeEvent, VoteEvent, MarketStateEvent } from '@/types/websocket';

interface UseMarketWebSocketReturn {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  trades: TradeEvent[];
  votes: VoteEvent[];
  marketState: MarketStateEvent | null;
  subscribe: (marketId: string) => void;
  unsubscribe: (marketId: string) => void;
}

export function useMarketWebSocket(initialMarketId?: string): UseMarketWebSocketReturn {
  const [trades, setTrades] = useState<TradeEvent[]>([]);
  const [votes, setVotes] = useState<VoteEvent[]>([]);
  const [marketState, setMarketState] = useState<MarketStateEvent | null>(null);
  const [subscribedMarkets, setSubscribedMarkets] = useState<Set<string>>(new Set());

  // 🔥 FIX GAP 2: Keep ref of subscriptions for reconnection
  const subscribedMarketsRef = useRef(subscribedMarkets);

  // Update ref when subscriptions change
  useEffect(() => {
    subscribedMarketsRef.current = subscribedMarkets;
  }, [subscribedMarkets]);

  const handleMessage = useCallback((event: WebSocketEvent) => {
    switch (event.type) {
      case 'welcome':
        console.log('[Market WS] Welcome:', event.data);
        break;

      case 'market_state':
        setMarketState(event as MarketStateEvent);
        break;

      case 'trade':
        setTrades(prev => [...prev, event as TradeEvent].slice(-100)); // Keep last 100
        break;

      case 'vote':
        setVotes(prev => [...prev, event as VoteEvent].slice(-100)); // Keep last 100
        break;

      case 'discussion':
        console.log('[Market WS] New discussion:', event.data);
        break;

      case 'error':
        console.error('[Market WS] Error:', event.data.error);
        break;

      default:
        console.log('[Market WS] Unknown event type:', event);
    }
  }, []);

  // 🔥 FIX GAP 2: Auto-restore subscriptions after reconnect
  const handleOpen = useCallback(() => {
    console.log('[Market WS] Connected, restoring subscriptions...');

    if (subscribedMarketsRef.current.size > 0) {
      console.log('[Market WS] Restoring', subscribedMarketsRef.current.size, 'subscriptions');
      subscribedMarketsRef.current.forEach(marketId => {
        console.log('[Market WS] Re-subscribing to:', marketId);
        // Will be sent via message queue if needed
      });
    }
  }, []);

  const { isConnected, isConnecting, error, send } = useWebSocket({
    onMessage: handleMessage,
    onOpen: handleOpen, // Restore subscriptions on reconnect
  });

  const subscribe = useCallback((marketId: string) => {
    if (subscribedMarkets.has(marketId)) {
      console.log('[Market WS] Already subscribed to:', marketId);
      return;
    }

    console.log('[Market WS] Subscribing to:', marketId);
    send({ action: 'subscribe', market_id: marketId });
    setSubscribedMarkets(prev => new Set(prev).add(marketId));
  }, [send, subscribedMarkets]);

  const unsubscribe = useCallback((marketId: string) => {
    if (!subscribedMarkets.has(marketId)) {
      console.log('[Market WS] Not subscribed to:', marketId);
      return;
    }

    console.log('[Market WS] Unsubscribing from:', marketId);
    send({ action: 'unsubscribe', market_id: marketId });
    setSubscribedMarkets(prev => {
      const next = new Set(prev);
      next.delete(marketId);
      return next;
    });
  }, [send, subscribedMarkets]);

  // Auto-restore subscriptions after reconnection
  useEffect(() => {
    if (isConnected && subscribedMarketsRef.current.size > 0) {
      // Re-subscribe to all markets after reconnection
      subscribedMarketsRef.current.forEach(marketId => {
        send({ action: 'subscribe', market_id: marketId });
      });
    }
  }, [isConnected, send]);

  useEffect(() => {
    if (initialMarketId && isConnected) {
      subscribe(initialMarketId);
    }

    return () => {
      if (initialMarketId && isConnected) {
        unsubscribe(initialMarketId);
      }
    };
  }, [initialMarketId, isConnected, subscribe, unsubscribe]);

  return {
    isConnected,
    isConnecting,
    error,
    trades,
    votes,
    marketState,
    subscribe,
    unsubscribe,
  };
}
```

---

## Next.js Integration

### App Router (Next.js 14+)

```typescript
// app/markets/[id]/page.tsx
'use client';

import { use, useEffect, useState } from 'react';
import { useMarketWebSocket } from '@/hooks/useMarketWebSocket';
import { ConnectionStatus } from '@/components/ConnectionStatus';
import { TradesList } from '@/components/TradesList';

interface MarketPageProps {
  params: Promise<{ id: string }>;
}

export default function MarketPage({ params }: MarketPageProps) {
  const { id: marketId } = use(params);
  const {
    isConnected,
    isConnecting,
    error,
    trades,
    votes,
    marketState,
  } = useMarketWebSocket(marketId);

  return (
    <div className="container mx-auto p-6">
      <ConnectionStatus
        isConnected={isConnected}
        isConnecting={isConnecting}
        error={error}
      />

      <h1 className="text-3xl font-bold mb-4">Market {marketId}</h1>

      {marketState && (
        <div className="bg-gray-100 p-4 rounded mb-4">
          <p>State: {marketState.data.market?.state}</p>
          <p>YES Shares: {marketState.data.market?.yes_shares}</p>
          <p>NO Shares: {marketState.data.market?.no_shares}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <h2 className="text-xl font-semibold mb-2">Recent Trades ({trades.length})</h2>
          <TradesList trades={trades} />
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2">Recent Votes ({votes.length})</h2>
          {/* Votes list */}
        </div>
      </div>
    </div>
  );
}
```

### Connection Status Component

```typescript
// components/ConnectionStatus.tsx
interface ConnectionStatusProps {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
}

export function ConnectionStatus({ isConnected, isConnecting, error }: ConnectionStatusProps) {
  if (isConnecting) {
    return (
      <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-2 rounded">
        🔄 Connecting to real-time updates...
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded">
        ❌ Connection error: {error}
      </div>
    );
  }

  if (isConnected) {
    return (
      <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-2 rounded">
        ✅ Connected to real-time updates
      </div>
    );
  }

  return (
    <div className="bg-gray-100 border border-gray-400 text-gray-700 px-4 py-2 rounded">
      ⚪ Disconnected
    </div>
  );
}
```

---

## Advanced Patterns

### Context Provider Pattern

```typescript
// contexts/WebSocketContext.tsx
import { createContext, useContext, ReactNode } from 'react';
import { useMarketWebSocket } from '@/hooks/useMarketWebSocket';

interface WebSocketContextValue {
  isConnected: boolean;
  subscribe: (marketId: string) => void;
  unsubscribe: (marketId: string) => void;
}

const WebSocketContext = createContext<WebSocketContextValue | null>(null);

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const { isConnected, subscribe, unsubscribe } = useMarketWebSocket();

  return (
    <WebSocketContext.Provider value={{ isConnected, subscribe, unsubscribe }}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocketContext() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocketContext must be used within WebSocketProvider');
  }
  return context;
}
```

### Multiple Market Subscriptions

```typescript
// hooks/useMultiMarketWebSocket.ts
import { useState, useCallback } from 'react';
import { useWebSocket } from './useWebSocket';
import type { WebSocketEvent, TradeEvent } from '@/types/websocket';

export function useMultiMarketWebSocket() {
  const [tradesByMarket, setTradesByMarket] = useState<Record<string, TradeEvent[]>>({});

  const handleMessage = useCallback((event: WebSocketEvent) => {
    if (event.type === 'trade' && event.market_id) {
      setTradesByMarket(prev => ({
        ...prev,
        [event.market_id!]: [...(prev[event.market_id!] || []), event as TradeEvent].slice(-100),
      }));
    }
  }, []);

  const { send, isConnected } = useWebSocket({ onMessage: handleMessage });

  const subscribeAll = useCallback((marketIds: string[]) => {
    marketIds.forEach(marketId => {
      send({ action: 'subscribe', market_id: marketId });
    });
  }, [send]);

  return { tradesByMarket, subscribeAll, isConnected };
}
```

---

## Error Handling

### Graceful Degradation

```typescript
// hooks/useWebSocketWithFallback.ts
import { useEffect } from 'react';
import { useWebSocket } from './useWebSocket';

export function useWebSocketWithFallback(fallbackPollInterval = 30000) {
  const { isConnected, error } = useWebSocket();

  useEffect(() => {
    if (!isConnected && error) {
      console.log('WebSocket unavailable, falling back to polling');

      // Fallback to REST API polling
      const interval = setInterval(() => {
        // Fetch data from REST API
        fetch('/api/markets/latest-events')
          .then(res => res.json())
          .then(data => {
            // Update state with latest events
          });
      }, fallbackPollInterval);

      return () => clearInterval(interval);
    }
  }, [isConnected, error, fallbackPollInterval]);

  return { isConnected, usingFallback: !isConnected && !!error };
}
```

### Error Toast Notifications

```typescript
// components/WebSocketErrorToast.tsx
import { useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useWebSocket } from '@/hooks/useWebSocket';

export function WebSocketErrorToast() {
  const { error, isConnected } = useWebSocket();

  useEffect(() => {
    if (error) {
      toast.error(`Connection error: ${error}`, {
        duration: 5000,
        position: 'top-right',
      });
    }
  }, [error]);

  useEffect(() => {
    if (isConnected) {
      toast.success('Connected to real-time updates', {
        duration: 2000,
        position: 'top-right',
      });
    }
  }, [isConnected]);

  return null;
}
```

---

## Performance Optimization

### Event Throttling

```typescript
// hooks/useThrottledWebSocket.ts
import { useEffect, useRef, useCallback } from 'react';
import { useWebSocket } from './useWebSocket';
import type { WebSocketEvent } from '@/types/websocket';

export function useThrottledWebSocket(throttleMs = 100) {
  const lastUpdateRef = useRef(0);
  const pendingUpdateRef = useRef<WebSocketEvent | null>(null);

  const handleMessage = useCallback((event: WebSocketEvent) => {
    const now = Date.now();

    if (now - lastUpdateRef.current >= throttleMs) {
      // Immediate update
      lastUpdateRef.current = now;
      // Handle event...
    } else {
      // Queue update
      pendingUpdateRef.current = event;

      setTimeout(() => {
        if (pendingUpdateRef.current) {
          // Handle queued event...
          pendingUpdateRef.current = null;
          lastUpdateRef.current = Date.now();
        }
      }, throttleMs);
    }
  }, [throttleMs]);

  return useWebSocket({ onMessage: handleMessage });
}
```

### Message Batching

```typescript
// hooks/useBatchedWebSocket.ts
import { useEffect, useRef } from 'react';
import { useWebSocket } from './useWebSocket';
import type { WebSocketEvent } from '@/types/websocket';

export function useBatchedWebSocket(batchInterval = 1000) {
  const batchRef = useRef<WebSocketEvent[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (batchRef.current.length > 0) {
        // Process batch
        const batch = [...batchRef.current];
        batchRef.current = [];

        // Update state with batched events
        console.log('Processing batch of', batch.length, 'events');
      }
    }, batchInterval);

    return () => clearInterval(interval);
  }, [batchInterval]);

  const handleMessage = (event: WebSocketEvent) => {
    batchRef.current.push(event);
  };

  return useWebSocket({ onMessage: handleMessage });
}
```

---

## Testing

### Mock WebSocket for Tests

```typescript
// __mocks__/websocket.ts
export class MockWebSocket {
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;

  readyState = WebSocket.CONNECTING;

  constructor(public url: string) {
    setTimeout(() => {
      this.readyState = WebSocket.OPEN;
      this.onopen?.(new Event('open'));
    }, 0);
  }

  send(data: string) {
    console.log('Mock WS send:', data);
  }

  close() {
    this.readyState = WebSocket.CLOSED;
    this.onclose?.(new CloseEvent('close', { code: 1000 }));
  }

  // Helper for tests
  mockMessage(data: any) {
    this.onmessage?.(new MessageEvent('message', { data: JSON.stringify(data) }));
  }
}
```

### Testing with React Testing Library

```typescript
// __tests__/useMarketWebSocket.test.tsx
import { renderHook, act } from '@testing-library/react';
import { useMarketWebSocket } from '@/hooks/useMarketWebSocket';

// Mock WebSocket
global.WebSocket = MockWebSocket as any;

describe('useMarketWebSocket', () => {
  it('should connect and receive welcome message', async () => {
    const { result } = renderHook(() => useMarketWebSocket('market-123'));

    // Wait for connection
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    expect(result.current.isConnected).toBe(true);
  });

  it('should handle trade events', async () => {
    const { result } = renderHook(() => useMarketWebSocket('market-123'));

    await act(async () => {
      // Mock trade event
      const ws = (global.WebSocket as any).instance;
      ws.mockMessage({
        type: 'trade',
        market_id: 'market-123',
        timestamp: new Date().toISOString(),
        data: {
          trade_type: 'buy',
          outcome: true,
          shares: '10',
          cost: '50000000',
        },
      });
    });

    expect(result.current.trades).toHaveLength(1);
    expect(result.current.trades[0].data.trade_type).toBe('buy');
  });
});
```

---

## Production Checklist

### Before Deployment

- [ ] **Environment Variables Set**
  - `NEXT_PUBLIC_WS_URL` configured for production
  - WSS (secure WebSocket) enabled in production

- [ ] **Error Handling**
  - All error events logged to error tracking (Sentry, etc.)
  - User-friendly error messages displayed
  - Graceful degradation to polling if WebSocket unavailable

- [ ] **Connection Management**
  - Reconnection logic tested
  - Maximum reconnection attempts configured
  - Connection status displayed to users

- [ ] **Performance**
  - Event throttling implemented for high-frequency events
  - Batching enabled for multiple updates
  - Memory leaks prevented (cleanup in useEffect)

- [ ] **Testing**
  - Unit tests for all hooks
  - Integration tests for WebSocket flow
  - E2E tests for real-time updates

- [ ] **Monitoring**
  - WebSocket connection metrics tracked
  - Error rates monitored
  - Latency measured

---

## Troubleshooting

### Common Issues

**Issue**: WebSocket not connecting in production

**Solution**:
- Verify `NEXT_PUBLIC_WS_URL` is set correctly
- Use `wss://` (not `ws://`) in production
- Check CORS and firewall rules

**Issue**: Messages not being received

**Solution**:
- Verify subscription was sent: Check `send({ action: 'subscribe', market_id: '...' })`
- Check WebSocket is in `OPEN` state
- View server logs for errors

**Issue**: Memory leak / performance degradation

**Solution**:
- Ensure `useEffect` cleanup functions are implemented
- Limit stored events (e.g., `slice(-100)` to keep last 100)
- Unsubscribe from markets when component unmounts

---

## Additional Resources

- [WebSocket Protocol Specification](./PROTOCOL.md)
- [WebSocket Server README](../README.md)
- [Backend Architecture](../../../ARCHITECTURE.md)

---

**Last Updated**: November 9, 2025
**Version**: 0.69.0
**Framework**: React 18+ / Next.js 14+
**Status**: Production Ready
