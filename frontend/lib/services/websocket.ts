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
 * - Native WebSocket API (browser standard)
 * - Automatic reconnection with exponential backoff
 * - Fallback to polling after 5 failed reconnections
 * - Type-safe event handling
 * - Connection state management
 */

// WebSocket event types (matches backend protocol)
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

/**
 * Backend message types (received from server)
 */
interface BackendMessage {
  type: 'welcome' | 'market_state' | 'trade' | 'vote' | 'discussion' | 'error';
  market_id?: string;
  timestamp: string;
  data: any;
}

/**
 * Client message types (sent to server)
 */
interface ClientMessage {
  action: 'subscribe' | 'unsubscribe' | 'pong';
  market_id?: string;
}

export class WebSocketClient {
  private socket: WebSocket | null = null;
  private config: WSConfig;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second
  private maxReconnectDelay = 30000; // Max 30 seconds
  private listeners: Map<WSEvent, Set<EventCallback>> = new Map();
  private connectionState: 'disconnected' | 'connecting' | 'connected' | 'error' = 'disconnected';
  private fallbackToPolling = false;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;

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
    if (this.socket?.readyState === WebSocket.OPEN) {
      console.log('[WebSocket] Already connected');
      return;
    }

    // Clean up any existing connection
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }

    console.log('[WebSocket] Connecting to', this.config.url);
    this.connectionState = 'connecting';

    try {
      // Create native WebSocket connection
      this.socket = new WebSocket(this.config.url);
      this.setupEventHandlers();
    } catch (error) {
      console.error('[WebSocket] Failed to create connection:', error);
      this.connectionState = 'error';
      this.handleReconnection();
    }
  }

  /**
   * Disconnect WebSocket
   */
  disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.socket) {
      this.socket.close();
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
   * Subscribe to a market (for real-time updates)
   */
  subscribeToMarket(marketId: string): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      const message: ClientMessage = {
        action: 'subscribe',
        market_id: marketId,
      };
      this.socket.send(JSON.stringify(message));
      console.log('[WebSocket] Subscribed to market:', marketId);
    } else {
      console.warn('[WebSocket] Cannot subscribe - not connected');
    }
  }

  /**
   * Unsubscribe from a market
   */
  unsubscribeFromMarket(marketId: string): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      const message: ClientMessage = {
        action: 'unsubscribe',
        market_id: marketId,
      };
      this.socket.send(JSON.stringify(message));
      console.log('[WebSocket] Unsubscribed from market:', marketId);
    }
  }

  /**
   * Setup native WebSocket event handlers
   */
  private setupEventHandlers(): void {
    if (!this.socket) return;

    // Connection opened
    this.socket.onopen = () => {
      console.log('[WebSocket] Connected to', this.config.url);
      this.connectionState = 'connected';
      this.reconnectAttempts = 0;
      this.reconnectDelay = this.config.reconnectDelay!;
      this.fallbackToPolling = false;

      // Start heartbeat
      this.startHeartbeat();
    };

    // Message received
    this.socket.onmessage = (event) => {
      try {
        const message: BackendMessage = JSON.parse(event.data);
        this.handleBackendMessage(message);
      } catch (error) {
        console.error('[WebSocket] Failed to parse message:', error);
      }
    };

    // Connection closed
    this.socket.onclose = (event) => {
      console.log('[WebSocket] Disconnected:', event.code, event.reason);
      this.connectionState = 'disconnected';

      // Stop heartbeat
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = null;
      }

      // Auto-reconnect if not clean close
      if (event.code !== 1000) {
        this.handleReconnection();
      }
    };

    // Connection error
    this.socket.onerror = (error) => {
      console.error('[WebSocket] Connection error:', error);
      this.connectionState = 'error';
      // onclose will be called after onerror, which triggers reconnection
    };
  }

  /**
   * Handle messages from backend
   */
  private handleBackendMessage(message: BackendMessage): void {
    switch (message.type) {
      case 'welcome':
        console.log('[WebSocket] Welcome:', message.data);
        break;

      case 'market_state':
        // Map backend 'market_state' to frontend 'market:update'
        if (message.data && message.market_id) {
          this.emit('market:update', {
            marketId: message.market_id,
            priceYes: message.data.priceYes || 0,
            priceNo: message.data.priceNo || 0,
            totalShares: message.data.totalShares || 0,
            timestamp: new Date(message.timestamp).getTime(),
          });
        }
        break;

      case 'trade':
        // Map backend 'trade' to frontend 'trade:executed'
        if (message.data) {
          this.emit('trade:executed', {
            tradeId: message.data.tradeId || message.data.id,
            marketId: message.market_id || message.data.marketId,
            trader: message.data.trader || message.data.user,
            outcome: message.data.outcome,
            shares: message.data.shares || message.data.amount,
            cost: message.data.cost || message.data.price,
            timestamp: new Date(message.timestamp).getTime(),
          });
        }
        break;

      case 'discussion':
        // Map backend 'discussion' to frontend 'discussion:new'
        if (message.data) {
          this.emit('discussion:new', {
            postId: message.data.postId || message.data.id,
            marketId: message.market_id || message.data.marketId,
            author: message.data.author || message.data.user,
            content: message.data.content || message.data.text,
            parentId: message.data.parentId,
            timestamp: new Date(message.timestamp).getTime(),
          });
        }
        break;

      case 'error':
        console.error('[WebSocket] Server error:', message.data);
        break;

      default:
        console.log('[WebSocket] Unhandled message type:', message.type);
    }
  }

  /**
   * Start heartbeat (ping-pong)
   */
  private startHeartbeat(): void {
    // Send pong every 30 seconds to keep connection alive
    this.heartbeatInterval = setInterval(() => {
      if (this.socket?.readyState === WebSocket.OPEN) {
        const message: ClientMessage = { action: 'pong' };
        this.socket.send(JSON.stringify(message));
      }
    }, 30000);
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

    this.reconnectTimeout = setTimeout(() => {
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
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:4001';
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
