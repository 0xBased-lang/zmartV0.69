/**
 * WebSocket Client Service for ZMART V0.69
 *
 * Handles real-time updates for:
 * - Market prices (LMSR calculations)
 * - Trade executions
 * - Discussion posts
 * - User positions
 *
 * Features:
 * - Automatic reconnection with exponential backoff
 * - Fallback to polling after 5 failed reconnections
 * - Type-safe event handling
 * - Connection state management
 */

import { io, Socket } from 'socket.io-client';

// WebSocket event types
export type WSEvent =
  | 'market:update'
  | 'trade:executed'
  | 'discussion:new'
  | 'position:update'
  | 'market:state_change';

export interface MarketUpdateEvent {
  marketId: string;
  priceYes: number;
  priceNo: number;
  totalShares: number;
  timestamp: number;
}

export interface TradeExecutedEvent {
  tradeId: string;
  marketId: string;
  trader: string;
  outcome: 'YES' | 'NO';
  shares: number;
  cost: number;
  timestamp: number;
}

export interface DiscussionEvent {
  postId: string;
  marketId: string;
  author: string;
  content: string;
  parentId?: string;
  timestamp: number;
}

export interface PositionUpdateEvent {
  userId: string;
  marketId: string;
  sharesYes: number;
  sharesNo: number;
  totalCost: number;
  unrealizedPnL: number;
}

export interface MarketStateChangeEvent {
  marketId: string;
  oldState: string;
  newState: string;
  timestamp: number;
}

type WSEventData =
  | MarketUpdateEvent
  | TradeExecutedEvent
  | DiscussionEvent
  | PositionUpdateEvent
  | MarketStateChangeEvent;

type EventCallback = (data: WSEventData) => void;

interface WSConfig {
  url: string;
  autoConnect?: boolean;
  maxReconnectAttempts?: number;
  reconnectDelay?: number;
  maxReconnectDelay?: number;
}

export class WebSocketClient {
  private socket: Socket | null = null;
  private config: WSConfig;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second
  private maxReconnectDelay = 30000; // Max 30 seconds
  private listeners: Map<WSEvent, Set<EventCallback>> = new Map();
  private connectionState: 'disconnected' | 'connecting' | 'connected' | 'error' = 'disconnected';
  private fallbackToPolling = false;

  constructor(config: WSConfig) {
    this.config = {
      autoConnect: true,
      maxReconnectAttempts: 5,
      reconnectDelay: 1000,
      maxReconnectDelay: 30000,
      ...config,
    };

    if (this.config.maxReconnectAttempts) {
      this.maxReconnectAttempts = this.config.maxReconnectAttempts;
    }
    if (this.config.reconnectDelay) {
      this.reconnectDelay = this.config.reconnectDelay;
    }
    if (this.config.maxReconnectDelay) {
      this.maxReconnectDelay = this.config.maxReconnectDelay;
    }

    if (this.config.autoConnect) {
      this.connect();
    }
  }

  /**
   * Establish WebSocket connection
   */
  connect(): void {
    if (this.socket?.connected) {
      console.log('[WebSocket] Already connected');
      return;
    }

    console.log('[WebSocket] Connecting to', this.config.url);
    this.connectionState = 'connecting';

    this.socket = io(this.config.url, {
      transports: ['websocket', 'polling'],
      reconnection: false, // We handle reconnection manually
    });

    this.setupEventHandlers();
  }

  /**
   * Disconnect WebSocket
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connectionState = 'disconnected';
      console.log('[WebSocket] Disconnected');
    }
  }

  /**
   * Subscribe to WebSocket events
   */
  on(event: WSEvent, callback: EventCallback): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }

    this.listeners.get(event)!.add(callback);

    // Return unsubscribe function
    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  /**
   * Emit event to all listeners
   */
  private emit(event: WSEvent, data: WSEventData): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => callback(data));
    }
  }

  /**
   * Get current connection state
   */
  getState(): typeof this.connectionState {
    return this.connectionState;
  }

  /**
   * Check if should fallback to polling
   */
  shouldFallbackToPolling(): boolean {
    return this.fallbackToPolling;
  }

  /**
   * Setup Socket.IO event handlers
   */
  private setupEventHandlers(): void {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      console.log('[WebSocket] Connected');
      this.connectionState = 'connected';
      this.reconnectAttempts = 0;
      this.reconnectDelay = this.config.reconnectDelay!;
      this.fallbackToPolling = false;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[WebSocket] Disconnected:', reason);
      this.connectionState = 'disconnected';

      // Auto-reconnect if not manual disconnect
      if (reason !== 'io client disconnect') {
        this.handleReconnection();
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('[WebSocket] Connection error:', error);
      this.connectionState = 'error';
      this.handleReconnection();
    });

    // Application events
    this.socket.on('market:update', (data: MarketUpdateEvent) => {
      this.emit('market:update', data);
    });

    this.socket.on('trade:executed', (data: TradeExecutedEvent) => {
      this.emit('trade:executed', data);
    });

    this.socket.on('discussion:new', (data: DiscussionEvent) => {
      this.emit('discussion:new', data);
    });

    this.socket.on('position:update', (data: PositionUpdateEvent) => {
      this.emit('position:update', data);
    });

    this.socket.on('market:state_change', (data: MarketStateChangeEvent) => {
      this.emit('market:state_change', data);
    });
  }

  /**
   * Handle reconnection with exponential backoff
   */
  private handleReconnection(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.warn('[WebSocket] Max reconnection attempts reached. Falling back to polling.');
      this.fallbackToPolling = true;
      this.connectionState = 'error';
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(
      this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
      this.maxReconnectDelay
    );

    console.log(
      `[WebSocket] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`
    );

    setTimeout(() => {
      this.connect();
    }, delay);
  }
}

// Singleton instance
let wsClient: WebSocketClient | null = null;

/**
 * Get or create WebSocket client instance
 */
export function getWebSocketClient(): WebSocketClient {
  if (!wsClient) {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';
    wsClient = new WebSocketClient({
      url: wsUrl,
      autoConnect: true,
      maxReconnectAttempts: 5,
      reconnectDelay: 1000,
      maxReconnectDelay: 30000,
    });
  }
  return wsClient;
}

/**
 * Cleanup WebSocket client (call on app unmount)
 */
export function cleanupWebSocket(): void {
  if (wsClient) {
    wsClient.disconnect();
    wsClient = null;
  }
}
