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
 * WebSocketServer
 *
 * Responsibilities:
 * 1. Manage WebSocket connections
 * 2. Handle market subscriptions
 * 3. Broadcast events to subscribers
 * 4. Maintain connection health (heartbeat)
 * 5. Clean up on disconnect
 */
export declare class WebSocketServer {
    private port;
    private wss;
    private clients;
    private marketSubscribers;
    private heartbeatInterval;
    private isRunning;
    constructor(port?: number);
    /**
     * Start the WebSocket server
     */
    start(): void;
    /**
     * Stop the WebSocket server
     */
    stop(): void;
    /**
     * Handle new WebSocket connection
     */
    private handleConnection;
    /**
     * Handle incoming message from client
     */
    private handleMessage;
    /**
     * Subscribe client to market updates
     */
    private subscribe;
    /**
     * Unsubscribe client from market updates
     */
    private unsubscribe;
    /**
     * Handle client disconnect
     */
    private handleDisconnect;
    /**
     * Broadcast event to all subscribers of a market
     */
    broadcast(marketId: string, event: Omit<WebSocketEvent, "timestamp">): void;
    /**
     * Send message to specific client
     */
    private sendToClient;
    /**
     * Send error to client
     */
    private sendError;
    /**
     * Start heartbeat to detect stale connections
     */
    private startHeartbeat;
    /**
     * Get server status
     */
    getStatus(): {
        isRunning: boolean;
        port: number;
        connectedClients: number;
        activeMarkets: number;
        subscriptions: number;
    };
}
//# sourceMappingURL=server.d.ts.map