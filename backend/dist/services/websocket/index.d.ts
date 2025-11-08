import { SupabaseClient } from "@supabase/supabase-js";
import { WebSocketServer } from "./server";
import { RealtimeEventBroadcaster } from "./realtime";
export { WebSocketServer, WebSocketEvent, EventType, ClientMessage } from "./server";
export { RealtimeEventBroadcaster } from "./realtime";
/**
 * Initialize and start WebSocket service with Supabase realtime
 */
export declare function startWebSocketService(supabase: SupabaseClient, port?: number): Promise<{
    wsServer: WebSocketServer;
    broadcaster: RealtimeEventBroadcaster;
}>;
//# sourceMappingURL=index.d.ts.map