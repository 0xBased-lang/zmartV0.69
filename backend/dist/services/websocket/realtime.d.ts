import { SupabaseClient } from "@supabase/supabase-js";
import { WebSocketServer } from "./server";
/**
 * RealtimeEventBroadcaster
 *
 * Responsibilities:
 * 1. Subscribe to Supabase realtime channels
 * 2. Listen for database changes (markets, trades, votes, discussions)
 * 3. Broadcast changes to WebSocket clients
 * 4. Handle connection lifecycle
 */
export declare class RealtimeEventBroadcaster {
    private supabase;
    private wsServer;
    private channels;
    private isRunning;
    constructor(supabase: SupabaseClient, wsServer: WebSocketServer);
    /**
     * Start listening to database changes
     */
    start(): void;
    /**
     * Stop listening to database changes
     */
    stop(): void;
    /**
     * Subscribe to markets table changes
     */
    private subscribeToMarkets;
    /**
     * Subscribe to trades table changes
     */
    private subscribeToTrades;
    /**
     * Subscribe to proposal_votes table changes
     */
    private subscribeToProposalVotes;
    /**
     * Subscribe to dispute_votes table changes
     */
    private subscribeToDisputeVotes;
    /**
     * Subscribe to discussions table changes
     */
    private subscribeToDiscussions;
    /**
     * Get broadcaster status
     */
    getStatus(): {
        isRunning: boolean;
        activeChannels: number;
    };
}
//# sourceMappingURL=realtime.d.ts.map