"use strict";
// ============================================================
// Supabase Realtime Integration
// ============================================================
// Purpose: Listen to database changes and broadcast via WebSocket
// Story: 2.5 (Day 13)
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RealtimeEventBroadcaster = void 0;
const logger_1 = __importDefault(require("../../utils/logger"));
/**
 * RealtimeEventBroadcaster
 *
 * Responsibilities:
 * 1. Subscribe to Supabase realtime channels
 * 2. Listen for database changes (markets, trades, votes, discussions)
 * 3. Broadcast changes to WebSocket clients
 * 4. Handle connection lifecycle
 */
class RealtimeEventBroadcaster {
    supabase;
    wsServer;
    channels = [];
    isRunning = false;
    constructor(supabase, wsServer) {
        this.supabase = supabase;
        this.wsServer = wsServer;
    }
    /**
     * Start listening to database changes
     */
    start() {
        if (this.isRunning) {
            logger_1.default.warn("[RealtimeEventBroadcaster] Already running");
            return;
        }
        this.isRunning = true;
        // Listen to markets table
        this.subscribeToMarkets();
        // Listen to trades table
        this.subscribeToTrades();
        // Listen to proposal_votes table
        this.subscribeToProposalVotes();
        // Listen to dispute_votes table
        this.subscribeToDisputeVotes();
        // Listen to discussions table
        this.subscribeToDiscussions();
        logger_1.default.info("[RealtimeEventBroadcaster] Started listening to database changes");
    }
    /**
     * Stop listening to database changes
     */
    stop() {
        if (!this.isRunning) {
            return;
        }
        this.isRunning = false;
        // Unsubscribe from all channels
        this.channels.forEach((channel) => {
            this.supabase.removeChannel(channel);
        });
        this.channels = [];
        logger_1.default.info("[RealtimeEventBroadcaster] Stopped");
    }
    /**
     * Subscribe to markets table changes
     */
    subscribeToMarkets() {
        const channel = this.supabase
            .channel("markets_changes")
            .on("postgres_changes", {
            event: "*", // INSERT, UPDATE, DELETE
            schema: "public",
            table: "markets",
        }, (payload) => {
            logger_1.default.debug("[RealtimeEventBroadcaster] Markets change:", payload.eventType);
            const marketId = payload.new?.id || payload.old?.id;
            if (!marketId) {
                logger_1.default.warn("[RealtimeEventBroadcaster] Markets change without market ID");
                return;
            }
            // Determine event data based on event type
            let eventData;
            let eventType = "market_state";
            if (payload.eventType === "INSERT") {
                eventData = {
                    action: "created",
                    market: payload.new,
                };
            }
            else if (payload.eventType === "UPDATE") {
                eventData = {
                    action: "updated",
                    old_state: payload.old?.state,
                    new_state: payload.new?.state,
                    market: payload.new,
                };
            }
            else if (payload.eventType === "DELETE") {
                eventData = {
                    action: "deleted",
                    market: payload.old,
                };
            }
            // Broadcast to WebSocket subscribers
            this.wsServer.broadcast(marketId, {
                type: eventType,
                market_id: marketId,
                data: eventData,
            });
        })
            .subscribe((status) => {
            logger_1.default.info(`[RealtimeEventBroadcaster] Markets channel: ${status}`);
        });
        this.channels.push(channel);
    }
    /**
     * Subscribe to trades table changes
     */
    subscribeToTrades() {
        const channel = this.supabase
            .channel("trades_changes")
            .on("postgres_changes", {
            event: "INSERT", // Only new trades
            schema: "public",
            table: "trades",
        }, (payload) => {
            logger_1.default.debug("[RealtimeEventBroadcaster] New trade:", payload.new.id);
            const marketId = payload.new?.market_id;
            if (!marketId) {
                logger_1.default.warn("[RealtimeEventBroadcaster] Trade without market ID");
                return;
            }
            // Broadcast trade event
            this.wsServer.broadcast(marketId, {
                type: "trade",
                market_id: marketId,
                data: {
                    trade_type: payload.new.trade_type,
                    outcome: payload.new.outcome,
                    shares: payload.new.shares,
                    cost: payload.new.cost,
                    user_wallet: payload.new.user_wallet,
                    created_at: payload.new.created_at,
                },
            });
        })
            .subscribe((status) => {
            logger_1.default.info(`[RealtimeEventBroadcaster] Trades channel: ${status}`);
        });
        this.channels.push(channel);
    }
    /**
     * Subscribe to proposal_votes table changes
     */
    subscribeToProposalVotes() {
        const channel = this.supabase
            .channel("proposal_votes_changes")
            .on("postgres_changes", {
            event: "INSERT", // Only new votes
            schema: "public",
            table: "proposal_votes",
        }, (payload) => {
            logger_1.default.debug("[RealtimeEventBroadcaster] New proposal vote:", payload.new.id);
            const marketId = payload.new?.market_id;
            if (!marketId) {
                logger_1.default.warn("[RealtimeEventBroadcaster] Proposal vote without market ID");
                return;
            }
            // Broadcast vote event
            this.wsServer.broadcast(marketId, {
                type: "vote",
                market_id: marketId,
                data: {
                    vote_type: "proposal",
                    vote: payload.new.vote,
                    user_wallet: payload.new.user_wallet,
                    created_at: payload.new.created_at,
                },
            });
        })
            .subscribe((status) => {
            logger_1.default.info(`[RealtimeEventBroadcaster] Proposal votes channel: ${status}`);
        });
        this.channels.push(channel);
    }
    /**
     * Subscribe to dispute_votes table changes
     */
    subscribeToDisputeVotes() {
        const channel = this.supabase
            .channel("dispute_votes_changes")
            .on("postgres_changes", {
            event: "INSERT", // Only new votes
            schema: "public",
            table: "dispute_votes",
        }, (payload) => {
            logger_1.default.debug("[RealtimeEventBroadcaster] New dispute vote:", payload.new.id);
            const marketId = payload.new?.market_id;
            if (!marketId) {
                logger_1.default.warn("[RealtimeEventBroadcaster] Dispute vote without market ID");
                return;
            }
            // Broadcast vote event
            this.wsServer.broadcast(marketId, {
                type: "vote",
                market_id: marketId,
                data: {
                    vote_type: "dispute",
                    vote: payload.new.vote,
                    user_wallet: payload.new.user_wallet,
                    created_at: payload.new.created_at,
                },
            });
        })
            .subscribe((status) => {
            logger_1.default.info(`[RealtimeEventBroadcaster] Dispute votes channel: ${status}`);
        });
        this.channels.push(channel);
    }
    /**
     * Subscribe to discussions table changes
     */
    subscribeToDiscussions() {
        const channel = this.supabase
            .channel("discussions_changes")
            .on("postgres_changes", {
            event: "*", // INSERT, UPDATE (for soft delete)
            schema: "public",
            table: "discussions",
        }, (payload) => {
            logger_1.default.debug("[RealtimeEventBroadcaster] Discussion change:", payload.eventType);
            const marketId = payload.new?.market_id || payload.old?.market_id;
            if (!marketId) {
                logger_1.default.warn("[RealtimeEventBroadcaster] Discussion without market ID");
                return;
            }
            let eventData;
            if (payload.eventType === "INSERT") {
                eventData = {
                    action: "created",
                    discussion: {
                        id: payload.new.id,
                        user_wallet: payload.new.user_wallet,
                        content: payload.new.content,
                        created_at: payload.new.created_at,
                    },
                };
            }
            else if (payload.eventType === "UPDATE" && payload.new?.deleted_at) {
                // Soft delete
                eventData = {
                    action: "deleted",
                    discussion: {
                        id: payload.new.id,
                        deleted_at: payload.new.deleted_at,
                    },
                };
            }
            else {
                // Other updates (ignore for now)
                return;
            }
            // Broadcast discussion event
            this.wsServer.broadcast(marketId, {
                type: "discussion",
                market_id: marketId,
                data: eventData,
            });
        })
            .subscribe((status) => {
            logger_1.default.info(`[RealtimeEventBroadcaster] Discussions channel: ${status}`);
        });
        this.channels.push(channel);
    }
    /**
     * Get broadcaster status
     */
    getStatus() {
        return {
            isRunning: this.isRunning,
            activeChannels: this.channels.length,
        };
    }
}
exports.RealtimeEventBroadcaster = RealtimeEventBroadcaster;
//# sourceMappingURL=realtime.js.map