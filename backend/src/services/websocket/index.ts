// ============================================================
// WebSocket Service - Main Entry Point
// ============================================================
// Purpose: Export WebSocket server and realtime broadcaster
// Story: 2.5 (Day 13)

import { SupabaseClient } from "@supabase/supabase-js";
import { WebSocketServer } from "./server";
import { RealtimeEventBroadcaster } from "./realtime";
import logger from "../../utils/logger";

// Export types and classes
export { WebSocketServer, WebSocketEvent, EventType, ClientMessage } from "./server";
export { RealtimeEventBroadcaster } from "./realtime";

/**
 * Initialize and start WebSocket service with Supabase realtime
 */
export async function startWebSocketService(
  supabase: SupabaseClient,
  port?: number
): Promise<{ wsServer: WebSocketServer; broadcaster: RealtimeEventBroadcaster }> {
  // Create WebSocket server
  const wsServer = new WebSocketServer(port);
  wsServer.start();

  // Create and start realtime broadcaster
  const broadcaster = new RealtimeEventBroadcaster(supabase, wsServer);
  broadcaster.start();

  logger.info("[WebSocket Service] Started successfully");

  // Graceful shutdown handlers
  process.on("SIGTERM", () => {
    logger.info("[WebSocket Service] SIGTERM received, shutting down...");
    broadcaster.stop();
    wsServer.stop();
  });

  process.on("SIGINT", () => {
    logger.info("[WebSocket Service] SIGINT received, shutting down...");
    broadcaster.stop();
    wsServer.stop();
  });

  return { wsServer, broadcaster };
}
