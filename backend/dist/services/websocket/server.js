"use strict";
// ============================================================
// WebSocket Server
// ============================================================
// Purpose: Real-time updates for markets, trades, votes, discussions
// Story: 2.5 (Day 13)
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebSocketServer = void 0;
const ws_1 = __importDefault(require("ws"));
const logger_1 = __importDefault(require("../../utils/logger"));
const config_1 = require("../../config");
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
class WebSocketServer {
    port;
    wss;
    clients; // clientId -> WebSocket
    marketSubscribers; // marketId -> Set<clientId>
    heartbeatInterval = null;
    isRunning = false;
    constructor(port = config_1.config.websocket.port) {
        this.port = port;
        this.clients = new Map();
        this.marketSubscribers = new Map();
        // Create WebSocket server
        this.wss = new ws_1.default.Server({
            port: this.port,
            perMessageDeflate: false, // Disable compression for lower latency
        });
        logger_1.default.info(`[WebSocketServer] Initialized on port ${this.port}`);
    }
    /**
     * Start the WebSocket server
     */
    start() {
        if (this.isRunning) {
            logger_1.default.warn("[WebSocketServer] Already running");
            return;
        }
        this.isRunning = true;
        // Set up connection handler
        this.wss.on("connection", (ws, req) => {
            this.handleConnection(ws, req);
        });
        // Start heartbeat
        this.startHeartbeat();
        logger_1.default.info(`[WebSocketServer] Started on port ${this.port}`);
    }
    /**
     * Stop the WebSocket server
     */
    stop() {
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
            logger_1.default.info("[WebSocketServer] Stopped");
        });
    }
    /**
     * Handle new WebSocket connection
     */
    handleConnection(ws, req) {
        // Generate unique client ID
        const clientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        ws.clientId = clientId;
        ws.isAlive = true;
        ws.subscriptions = new Set();
        // Store client
        this.clients.set(clientId, ws);
        const clientIP = req.socket.remoteAddress;
        logger_1.default.info(`[WebSocketServer] New connection: ${clientId} from ${clientIP}`);
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
        ws.on("message", (data) => {
            this.handleMessage(ws, data);
        });
        // Set up pong handler (for heartbeat)
        ws.on("pong", () => {
            ws.isAlive = true;
        });
        // Set up close handler
        ws.on("close", (code, reason) => {
            this.handleDisconnect(ws, code, reason.toString());
        });
        // Set up error handler
        ws.on("error", (error) => {
            logger_1.default.error(`[WebSocketServer] Client ${clientId} error:`, error);
        });
    }
    /**
     * Handle incoming message from client
     */
    handleMessage(ws, data) {
        try {
            const message = JSON.parse(data.toString());
            switch (message.action) {
                case "subscribe":
                    if (message.market_id) {
                        this.subscribe(ws, message.market_id);
                    }
                    else {
                        this.sendError(ws, "market_id required for subscribe action");
                    }
                    break;
                case "unsubscribe":
                    if (message.market_id) {
                        this.unsubscribe(ws, message.market_id);
                    }
                    else {
                        this.sendError(ws, "market_id required for unsubscribe action");
                    }
                    break;
                case "pong":
                    // Heartbeat response (already handled by 'pong' event)
                    ws.isAlive = true;
                    break;
                default:
                    this.sendError(ws, `Unknown action: ${message.action}`);
            }
        }
        catch (error) {
            logger_1.default.error(`[WebSocketServer] Error parsing message from ${ws.clientId}:`, error);
            this.sendError(ws, "Invalid message format");
        }
    }
    /**
     * Subscribe client to market updates
     */
    subscribe(ws, marketId) {
        // Add to client subscriptions
        ws.subscriptions.add(marketId);
        // Add to market subscribers
        if (!this.marketSubscribers.has(marketId)) {
            this.marketSubscribers.set(marketId, new Set());
        }
        this.marketSubscribers.get(marketId).add(ws.clientId);
        logger_1.default.debug(`[WebSocketServer] Client ${ws.clientId} subscribed to market ${marketId}`);
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
    unsubscribe(ws, marketId) {
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
        logger_1.default.debug(`[WebSocketServer] Client ${ws.clientId} unsubscribed from market ${marketId}`);
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
    handleDisconnect(ws, code, reason) {
        logger_1.default.info(`[WebSocketServer] Client ${ws.clientId} disconnected (code: ${code}, reason: ${reason || "none"})`);
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
    broadcast(marketId, event) {
        const subscribers = this.marketSubscribers.get(marketId);
        if (!subscribers || subscribers.size === 0) {
            logger_1.default.debug(`[WebSocketServer] No subscribers for market ${marketId}`);
            return;
        }
        const fullEvent = {
            ...event,
            timestamp: new Date().toISOString(),
        };
        const message = JSON.stringify(fullEvent);
        let sentCount = 0;
        subscribers.forEach((clientId) => {
            const client = this.clients.get(clientId);
            if (client && client.readyState === ws_1.default.OPEN) {
                client.send(message);
                sentCount++;
            }
        });
        logger_1.default.debug(`[WebSocketServer] Broadcast ${event.type} to ${sentCount}/${subscribers.size} subscribers of market ${marketId}`);
    }
    /**
     * Send message to specific client
     */
    sendToClient(ws, event) {
        if (ws.readyState === ws_1.default.OPEN) {
            ws.send(JSON.stringify(event));
        }
    }
    /**
     * Send error to client
     */
    sendError(ws, error) {
        this.sendToClient(ws, {
            type: "error",
            timestamp: new Date().toISOString(),
            data: { error },
        });
    }
    /**
     * Start heartbeat to detect stale connections
     */
    startHeartbeat() {
        const heartbeatInterval = 30000; // 30 seconds
        this.heartbeatInterval = setInterval(() => {
            this.clients.forEach((client, clientId) => {
                if (!client.isAlive) {
                    // Client didn't respond to last ping, terminate
                    logger_1.default.warn(`[WebSocketServer] Terminating stale connection: ${clientId}`);
                    client.terminate();
                    return;
                }
                // Mark as not alive and send ping
                client.isAlive = false;
                client.ping();
            });
        }, heartbeatInterval);
        logger_1.default.info(`[WebSocketServer] Heartbeat started (interval: ${heartbeatInterval}ms)`);
    }
    /**
     * Get server status
     */
    getStatus() {
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
exports.WebSocketServer = WebSocketServer;
//# sourceMappingURL=server.js.map