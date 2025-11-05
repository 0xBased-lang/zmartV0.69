// ============================================================
// WebSocket Server
// ============================================================
// Purpose: Real-time updates for markets, trades, votes, discussions
// Story: 2.5 (Day 13)

import WebSocket from "ws";
import { IncomingMessage } from "http";
import logger from "../../utils/logger";
import { config } from "../../config";

/**
 * WebSocket event types
 */
export type EventType = "market_state" | "trade" | "vote" | "discussion" | "error" | "welcome";

/**
 * WebSocket event message
 */
export interface WebSocketEvent {
  type: EventType;
  market_id?: string;
  timestamp: string;
  data: any;
}

/**
 * Client message (from frontend)
 */
export interface ClientMessage {
  action: "subscribe" | "unsubscribe" | "pong";
  market_id?: string;
}

/**
 * Extended WebSocket with metadata
 */
interface ExtendedWebSocket extends WebSocket {
  isAlive: boolean;
  subscriptions: Set<string>;
  clientId: string;
}

/**
 * WebSocketServer
 *
 * Responsibilities:
 * 1. Manage WebSocket connections
 * 2. Handle market subscriptions
 * 3. Broadcast events to subscribers
 * 4. Maintain connection health (heartbeat)
 * 5. Clean up on disconnect
 */
export class WebSocketServer {
  private wss: WebSocket.Server;
  private clients: Map<string, ExtendedWebSocket>; // clientId -> WebSocket
  private marketSubscribers: Map<string, Set<string>>; // marketId -> Set<clientId>
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;

  constructor(private port: number = config.websocket.port) {
    this.clients = new Map();
    this.marketSubscribers = new Map();

    // Create WebSocket server
    this.wss = new WebSocket.Server({
      port: this.port,
      perMessageDeflate: false, // Disable compression for lower latency
    });

    logger.info(`[WebSocketServer] Initialized on port ${this.port}`);
  }

  /**
   * Start the WebSocket server
   */
  start(): void {
    if (this.isRunning) {
      logger.warn("[WebSocketServer] Already running");
      return;
    }

    this.isRunning = true;

    // Set up connection handler
    this.wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
      this.handleConnection(ws as ExtendedWebSocket, req);
    });

    // Start heartbeat
    this.startHeartbeat();

    logger.info(`[WebSocketServer] Started on port ${this.port}`);
  }

  /**
   * Stop the WebSocket server
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    // Stop heartbeat
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    // Close all connections
    this.clients.forEach((client) => {
      client.close(1000, "Server shutting down");
    });

    // Close server
    this.wss.close(() => {
      logger.info("[WebSocketServer] Stopped");
    });
  }

  /**
   * Handle new WebSocket connection
   */
  private handleConnection(ws: ExtendedWebSocket, req: IncomingMessage): void {
    // Generate unique client ID
    const clientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    ws.clientId = clientId;
    ws.isAlive = true;
    ws.subscriptions = new Set();

    // Store client
    this.clients.set(clientId, ws);

    const clientIP = req.socket.remoteAddress;
    logger.info(`[WebSocketServer] New connection: ${clientId} from ${clientIP}`);

    // Send welcome message
    this.sendToClient(ws, {
      type: "welcome",
      timestamp: new Date().toISOString(),
      data: {
        client_id: clientId,
        message: "Connected to ZMART WebSocket server",
      },
    });

    // Set up message handler
    ws.on("message", (data: WebSocket.Data) => {
      this.handleMessage(ws, data);
    });

    // Set up pong handler (for heartbeat)
    ws.on("pong", () => {
      ws.isAlive = true;
    });

    // Set up close handler
    ws.on("close", (code: number, reason: Buffer) => {
      this.handleDisconnect(ws, code, reason.toString());
    });

    // Set up error handler
    ws.on("error", (error: Error) => {
      logger.error(`[WebSocketServer] Client ${clientId} error:`, error);
    });
  }

  /**
   * Handle incoming message from client
   */
  private handleMessage(ws: ExtendedWebSocket, data: WebSocket.Data): void {
    try {
      const message: ClientMessage = JSON.parse(data.toString());

      switch (message.action) {
        case "subscribe":
          if (message.market_id) {
            this.subscribe(ws, message.market_id);
          } else {
            this.sendError(ws, "market_id required for subscribe action");
          }
          break;

        case "unsubscribe":
          if (message.market_id) {
            this.unsubscribe(ws, message.market_id);
          } else {
            this.sendError(ws, "market_id required for unsubscribe action");
          }
          break;

        case "pong":
          // Heartbeat response (already handled by 'pong' event)
          ws.isAlive = true;
          break;

        default:
          this.sendError(ws, `Unknown action: ${(message as any).action}`);
      }
    } catch (error) {
      logger.error(`[WebSocketServer] Error parsing message from ${ws.clientId}:`, error);
      this.sendError(ws, "Invalid message format");
    }
  }

  /**
   * Subscribe client to market updates
   */
  private subscribe(ws: ExtendedWebSocket, marketId: string): void {
    // Add to client subscriptions
    ws.subscriptions.add(marketId);

    // Add to market subscribers
    if (!this.marketSubscribers.has(marketId)) {
      this.marketSubscribers.set(marketId, new Set());
    }
    this.marketSubscribers.get(marketId)!.add(ws.clientId);

    logger.debug(`[WebSocketServer] Client ${ws.clientId} subscribed to market ${marketId}`);

    // Send confirmation
    this.sendToClient(ws, {
      type: "market_state",
      market_id: marketId,
      timestamp: new Date().toISOString(),
      data: {
        message: `Subscribed to market ${marketId}`,
        subscriptions: Array.from(ws.subscriptions),
      },
    });
  }

  /**
   * Unsubscribe client from market updates
   */
  private unsubscribe(ws: ExtendedWebSocket, marketId: string): void {
    // Remove from client subscriptions
    ws.subscriptions.delete(marketId);

    // Remove from market subscribers
    const subscribers = this.marketSubscribers.get(marketId);
    if (subscribers) {
      subscribers.delete(ws.clientId);

      // Clean up empty subscriber sets
      if (subscribers.size === 0) {
        this.marketSubscribers.delete(marketId);
      }
    }

    logger.debug(`[WebSocketServer] Client ${ws.clientId} unsubscribed from market ${marketId}`);

    // Send confirmation
    this.sendToClient(ws, {
      type: "market_state",
      market_id: marketId,
      timestamp: new Date().toISOString(),
      data: {
        message: `Unsubscribed from market ${marketId}`,
        subscriptions: Array.from(ws.subscriptions),
      },
    });
  }

  /**
   * Handle client disconnect
   */
  private handleDisconnect(ws: ExtendedWebSocket, code: number, reason: string): void {
    logger.info(
      `[WebSocketServer] Client ${ws.clientId} disconnected (code: ${code}, reason: ${reason || "none"})`
    );

    // Remove from all market subscriptions
    ws.subscriptions.forEach((marketId) => {
      const subscribers = this.marketSubscribers.get(marketId);
      if (subscribers) {
        subscribers.delete(ws.clientId);
        if (subscribers.size === 0) {
          this.marketSubscribers.delete(marketId);
        }
      }
    });

    // Remove from clients map
    this.clients.delete(ws.clientId);
  }

  /**
   * Broadcast event to all subscribers of a market
   */
  broadcast(marketId: string, event: Omit<WebSocketEvent, "timestamp">): void {
    const subscribers = this.marketSubscribers.get(marketId);

    if (!subscribers || subscribers.size === 0) {
      logger.debug(`[WebSocketServer] No subscribers for market ${marketId}`);
      return;
    }

    const fullEvent: WebSocketEvent = {
      ...event,
      timestamp: new Date().toISOString(),
    };

    const message = JSON.stringify(fullEvent);
    let sentCount = 0;

    subscribers.forEach((clientId) => {
      const client = this.clients.get(clientId);
      if (client && client.readyState === WebSocket.OPEN) {
        client.send(message);
        sentCount++;
      }
    });

    logger.debug(
      `[WebSocketServer] Broadcast ${event.type} to ${sentCount}/${subscribers.size} subscribers of market ${marketId}`
    );
  }

  /**
   * Send message to specific client
   */
  private sendToClient(ws: ExtendedWebSocket, event: WebSocketEvent): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(event));
    }
  }

  /**
   * Send error to client
   */
  private sendError(ws: ExtendedWebSocket, error: string): void {
    this.sendToClient(ws, {
      type: "error",
      timestamp: new Date().toISOString(),
      data: { error },
    });
  }

  /**
   * Start heartbeat to detect stale connections
   */
  private startHeartbeat(): void {
    const heartbeatInterval = 30000; // 30 seconds

    this.heartbeatInterval = setInterval(() => {
      this.clients.forEach((client, clientId) => {
        if (!client.isAlive) {
          // Client didn't respond to last ping, terminate
          logger.warn(`[WebSocketServer] Terminating stale connection: ${clientId}`);
          client.terminate();
          return;
        }

        // Mark as not alive and send ping
        client.isAlive = false;
        client.ping();
      });
    }, heartbeatInterval);

    logger.info(`[WebSocketServer] Heartbeat started (interval: ${heartbeatInterval}ms)`);
  }

  /**
   * Get server status
   */
  getStatus(): {
    isRunning: boolean;
    port: number;
    connectedClients: number;
    activeMarkets: number;
    subscriptions: number;
  } {
    let totalSubscriptions = 0;
    this.marketSubscribers.forEach((subscribers) => {
      totalSubscriptions += subscribers.size;
    });

    return {
      isRunning: this.isRunning,
      port: this.port,
      connectedClients: this.clients.size,
      activeMarkets: this.marketSubscribers.size,
      subscriptions: totalSubscriptions,
    };
  }
}
