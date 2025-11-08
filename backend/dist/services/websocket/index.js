"use strict";
// ============================================================
// WebSocket Service - Main Entry Point
// ============================================================
// Purpose: Export WebSocket server and realtime broadcaster
// Story: 2.5 (Day 13)
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RealtimeEventBroadcaster = exports.WebSocketServer = void 0;
exports.startWebSocketService = startWebSocketService;
const server_1 = require("./server");
const realtime_1 = require("./realtime");
const logger_1 = __importDefault(require("../../utils/logger"));
// Export types and classes
var server_2 = require("./server");
Object.defineProperty(exports, "WebSocketServer", { enumerable: true, get: function () { return server_2.WebSocketServer; } });
var realtime_2 = require("./realtime");
Object.defineProperty(exports, "RealtimeEventBroadcaster", { enumerable: true, get: function () { return realtime_2.RealtimeEventBroadcaster; } });
/**
 * Initialize and start WebSocket service with Supabase realtime
 */
async function startWebSocketService(supabase, port) {
    // Create WebSocket server
    const wsServer = new server_1.WebSocketServer(port);
    wsServer.start();
    // Create and start realtime broadcaster
    const broadcaster = new realtime_1.RealtimeEventBroadcaster(supabase, wsServer);
    broadcaster.start();
    logger_1.default.info("[WebSocket Service] Started successfully");
    // Graceful shutdown handlers
    process.on("SIGTERM", () => {
        logger_1.default.info("[WebSocket Service] SIGTERM received, shutting down...");
        broadcaster.stop();
        wsServer.stop();
    });
    process.on("SIGINT", () => {
        logger_1.default.info("[WebSocket Service] SIGINT received, shutting down...");
        broadcaster.stop();
        wsServer.stop();
    });
    return { wsServer, broadcaster };
}
//# sourceMappingURL=index.js.map