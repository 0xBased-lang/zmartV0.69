// ============================================================
// Supabase Realtime Integration
// ============================================================
// Purpose: Listen to database changes and broadcast via WebSocket
// Story: 2.5 (Day 13)

import { SupabaseClient, RealtimeChannel } from "@supabase/supabase-js";
import { WebSocketServer, EventType } from "./server";
import logger from "../../utils/logger";

/**
 * RealtimeEventBroadcaster
 *
 * Responsibilities:
 * 1. Subscribe to Supabase realtime channels
 * 2. Listen for database changes (markets, trades, votes, discussions)
 * 3. Broadcast changes to WebSocket clients
 * 4. Handle connection lifecycle
 */
export class RealtimeEventBroadcaster {
  private channels: RealtimeChannel[] = [];
  private isRunning: boolean = false;

  constructor(
    private supabase: SupabaseClient,
    private wsServer: WebSocketServer
  ) {}

  /**
   * Start listening to database changes
   */
  start(): void {
    if (this.isRunning) {
      logger.warn("[RealtimeEventBroadcaster] Already running");
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

    logger.info("[RealtimeEventBroadcaster] Started listening to database changes");
  }

  /**
   * Stop listening to database changes
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    // Unsubscribe from all channels
    this.channels.forEach((channel) => {
      this.supabase.removeChannel(channel);
    });

    this.channels = [];
    logger.info("[RealtimeEventBroadcaster] Stopped");
  }

  /**
   * Subscribe to markets table changes
   */
  private subscribeToMarkets(): void {
    const channel = this.supabase
      .channel("markets_changes")
      .on(
        "postgres_changes",
        {
          event: "*", // INSERT, UPDATE, DELETE
          schema: "public",
          table: "markets",
        },
        (payload) => {
          logger.debug("[RealtimeEventBroadcaster] Markets change:", payload.eventType);

          const marketId = (payload.new as any)?.id || (payload.old as any)?.id;

          if (!marketId) {
            logger.warn("[RealtimeEventBroadcaster] Markets change without market ID");
            return;
          }

          // Determine event data based on event type
          let eventData: any;
          let eventType: EventType = "market_state";

          if (payload.eventType === "INSERT") {
            eventData = {
              action: "created",
              market: payload.new,
            };
          } else if (payload.eventType === "UPDATE") {
            eventData = {
              action: "updated",
              old_state: (payload.old as any)?.state,
              new_state: (payload.new as any)?.state,
              market: payload.new,
            };
          } else if (payload.eventType === "DELETE") {
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
        }
      )
      .subscribe((status) => {
        logger.info(`[RealtimeEventBroadcaster] Markets channel: ${status}`);
      });

    this.channels.push(channel);
  }

  /**
   * Subscribe to trades table changes
   */
  private subscribeToTrades(): void {
    const channel = this.supabase
      .channel("trades_changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT", // Only new trades
          schema: "public",
          table: "trades",
        },
        (payload) => {
          logger.debug("[RealtimeEventBroadcaster] New trade:", payload.new.id);

          const marketId = (payload.new as any)?.market_id;

          if (!marketId) {
            logger.warn("[RealtimeEventBroadcaster] Trade without market ID");
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
        }
      )
      .subscribe((status) => {
        logger.info(`[RealtimeEventBroadcaster] Trades channel: ${status}`);
      });

    this.channels.push(channel);
  }

  /**
   * Subscribe to proposal_votes table changes
   */
  private subscribeToProposalVotes(): void {
    const channel = this.supabase
      .channel("proposal_votes_changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT", // Only new votes
          schema: "public",
          table: "proposal_votes",
        },
        (payload) => {
          logger.debug("[RealtimeEventBroadcaster] New proposal vote:", payload.new.id);

          const marketId = (payload.new as any)?.market_id;

          if (!marketId) {
            logger.warn("[RealtimeEventBroadcaster] Proposal vote without market ID");
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
        }
      )
      .subscribe((status) => {
        logger.info(`[RealtimeEventBroadcaster] Proposal votes channel: ${status}`);
      });

    this.channels.push(channel);
  }

  /**
   * Subscribe to dispute_votes table changes
   */
  private subscribeToDisputeVotes(): void {
    const channel = this.supabase
      .channel("dispute_votes_changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT", // Only new votes
          schema: "public",
          table: "dispute_votes",
        },
        (payload) => {
          logger.debug("[RealtimeEventBroadcaster] New dispute vote:", payload.new.id);

          const marketId = (payload.new as any)?.market_id;

          if (!marketId) {
            logger.warn("[RealtimeEventBroadcaster] Dispute vote without market ID");
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
        }
      )
      .subscribe((status) => {
        logger.info(`[RealtimeEventBroadcaster] Dispute votes channel: ${status}`);
      });

    this.channels.push(channel);
  }

  /**
   * Subscribe to discussions table changes
   */
  private subscribeToDiscussions(): void {
    const channel = this.supabase
      .channel("discussions_changes")
      .on(
        "postgres_changes",
        {
          event: "*", // INSERT, UPDATE (for soft delete)
          schema: "public",
          table: "discussions",
        },
        (payload) => {
          logger.debug("[RealtimeEventBroadcaster] Discussion change:", payload.eventType);

          const marketId = (payload.new as any)?.market_id || (payload.old as any)?.market_id;

          if (!marketId) {
            logger.warn("[RealtimeEventBroadcaster] Discussion without market ID");
            return;
          }

          let eventData: any;

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
          } else if (payload.eventType === "UPDATE" && (payload.new as any)?.deleted_at) {
            // Soft delete
            eventData = {
              action: "deleted",
              discussion: {
                id: payload.new.id,
                deleted_at: payload.new.deleted_at,
              },
            };
          } else {
            // Other updates (ignore for now)
            return;
          }

          // Broadcast discussion event
          this.wsServer.broadcast(marketId, {
            type: "discussion",
            market_id: marketId,
            data: eventData,
          });
        }
      )
      .subscribe((status) => {
        logger.info(`[RealtimeEventBroadcaster] Discussions channel: ${status}`);
      });

    this.channels.push(channel);
  }

  /**
   * Get broadcaster status
   */
  getStatus(): {
    isRunning: boolean;
    activeChannels: number;
  } {
    return {
      isRunning: this.isRunning,
      activeChannels: this.channels.length,
    };
  }
}
