// ============================================================
// Market Event Writer
// ============================================================
// Purpose: Write market lifecycle events to Supabase database
// Story: Week 1, Days 3-7 - Event Indexer Implementation
//
// Handles:
// - MarketProposed → INSERT markets table
// - MarketApproved → UPDATE markets (state, approval votes)
// - MarketActivated → UPDATE markets (state, activated_at)
// - MarketResolved → UPDATE markets (state, proposed_outcome, resolver)
// - DisputeInitiated → UPDATE markets (state, dispute timing)
// - MarketFinalized → UPDATE markets (state, final_outcome)
// - MarketCancelled → UPDATE markets (is_cancelled)

import { SupabaseClient } from "@supabase/supabase-js";
import { Logger } from "winston";
import {
  MarketProposedEvent,
  MarketApprovedEvent,
  MarketActivatedEvent,
  MarketResolvedEvent,
  DisputeInitiatedEvent,
  MarketFinalizedEvent,
  MarketCancelledEvent,
  WriteResult,
  EventType,
} from "../types/events";

export class MarketEventWriter {
  constructor(
    private supabase: SupabaseClient,
    private logger: Logger
  ) {}

  /**
   * Handle MarketProposed event
   * Creates new market record in database
   */
  async writeMarketProposed(event: MarketProposedEvent): Promise<WriteResult> {
    const startTime = Date.now();
    try {
      const { data, error } = await this.supabase.from("markets").insert({
        id: event.marketId,
        on_chain_address: event.marketId, // Will be replaced with actual PDA
        question: event.question,
        category: event.category,
        creator_wallet: event.creator,
        state: "PROPOSED",
        b_parameter: event.bParameter,
        initial_liquidity: event.initialLiquidity,
        current_liquidity: event.initialLiquidity,
        shares_yes: "0",
        shares_no: "0",
        current_price_yes: 0.5, // Start at 50/50
        current_price_no: 0.5,
        total_volume: "0",
        created_at: new Date(event.blockTime * 1000).toISOString(),
      });

      if (error) {
        // Check if duplicate (already indexed)
        if (error.code === "23505") {
          this.logger.debug(
            `[MarketWriter] Market ${event.marketId} already exists (tx: ${event.txSignature})`
          );
          return {
            success: true,
            eventType: EventType.MARKET_PROPOSED,
            txSignature: event.txSignature,
            processingTime: Date.now() - startTime,
          };
        }

        throw error;
      }

      this.logger.info(
        `[MarketWriter] Created market ${event.marketId} (tx: ${event.txSignature})`
      );

      return {
        success: true,
        eventType: EventType.MARKET_PROPOSED,
        txSignature: event.txSignature,
        processingTime: Date.now() - startTime,
      };
    } catch (error) {
      this.logger.error(`[MarketWriter] Error writing MarketProposed:`, error);
      return {
        success: false,
        eventType: EventType.MARKET_PROPOSED,
        txSignature: event.txSignature,
        processingTime: Date.now() - startTime,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Handle MarketApproved event
   * Updates market state to APPROVED and records approval votes
   */
  async writeMarketApproved(event: MarketApprovedEvent): Promise<WriteResult> {
    const startTime = Date.now();
    try {
      const { data, error} = await this.supabase
        .from("markets")
        .update({
          state: "APPROVED",
          approved_at: new Date(event.blockTime * 1000).toISOString(),
          proposal_likes: event.proposalLikes,
          proposal_dislikes: event.proposalDislikes,
          updated_at: new Date().toISOString(),
        })
        .eq("id", event.marketId);

      if (error) throw error;

      this.logger.info(
        `[MarketWriter] Approved market ${event.marketId} (${event.proposalLikes}/${event.proposalDislikes} votes, tx: ${event.txSignature})`
      );

      return {
        success: true,
        eventType: EventType.MARKET_APPROVED,
        txSignature: event.txSignature,
        processingTime: Date.now() - startTime,
      };
    } catch (error) {
      this.logger.error(`[MarketWriter] Error writing MarketApproved:`, error);
      return {
        success: false,
        eventType: EventType.MARKET_APPROVED,
        txSignature: event.txSignature,
        processingTime: Date.now() - startTime,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Handle MarketActivated event
   * Updates market state to ACTIVE
   */
  async writeMarketActivated(event: MarketActivatedEvent): Promise<WriteResult> {
    const startTime = Date.now();
    try {
      const { data, error } = await this.supabase
        .from("markets")
        .update({
          state: "ACTIVE",
          activated_at: new Date(event.blockTime * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", event.marketId);

      if (error) throw error;

      this.logger.info(
        `[MarketWriter] Activated market ${event.marketId} (tx: ${event.txSignature})`
      );

      return {
        success: true,
        eventType: EventType.MARKET_ACTIVATED,
        txSignature: event.txSignature,
        processingTime: Date.now() - startTime,
      };
    } catch (error) {
      this.logger.error(`[MarketWriter] Error writing MarketActivated:`, error);
      return {
        success: false,
        eventType: EventType.MARKET_ACTIVATED,
        txSignature: event.txSignature,
        processingTime: Date.now() - startTime,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Handle MarketResolved event
   * Updates market state to RESOLVING and records proposed outcome
   */
  async writeMarketResolved(event: MarketResolvedEvent): Promise<WriteResult> {
    const startTime = Date.now();
    try {
      const { data, error } = await this.supabase
        .from("markets")
        .update({
          state: "RESOLVING",
          proposed_outcome: event.proposedOutcome,
          resolver_wallet: event.resolver,
          ipfs_evidence_hash: event.ipfsEvidenceHash,
          resolution_proposed_at: new Date(event.blockTime * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", event.marketId);

      if (error) throw error;

      this.logger.info(
        `[MarketWriter] Resolved market ${event.marketId} (outcome: ${event.proposedOutcome ? "YES" : "NO"}, tx: ${event.txSignature})`
      );

      return {
        success: true,
        eventType: EventType.MARKET_RESOLVED,
        txSignature: event.txSignature,
        processingTime: Date.now() - startTime,
      };
    } catch (error) {
      this.logger.error(`[MarketWriter] Error writing MarketResolved:`, error);
      return {
        success: false,
        eventType: EventType.MARKET_RESOLVED,
        txSignature: event.txSignature,
        processingTime: Date.now() - startTime,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Handle DisputeInitiated event
   * Updates market state to DISPUTED
   */
  async writeDisputeInitiated(event: DisputeInitiatedEvent): Promise<WriteResult> {
    const startTime = Date.now();
    try {
      const { data, error } = await this.supabase
        .from("markets")
        .update({
          state: "DISPUTED",
          updated_at: new Date().toISOString(),
        })
        .eq("id", event.marketId);

      if (error) throw error;

      this.logger.info(
        `[MarketWriter] Dispute initiated for market ${event.marketId} (tx: ${event.txSignature})`
      );

      return {
        success: true,
        eventType: EventType.DISPUTE_INITIATED,
        txSignature: event.txSignature,
        processingTime: Date.now() - startTime,
      };
    } catch (error) {
      this.logger.error(`[MarketWriter] Error writing DisputeInitiated:`, error);
      return {
        success: false,
        eventType: EventType.DISPUTE_INITIATED,
        txSignature: event.txSignature,
        processingTime: Date.now() - startTime,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Handle MarketFinalized event
   * Updates market state to FINALIZED and records final outcome
   */
  async writeMarketFinalized(event: MarketFinalizedEvent): Promise<WriteResult> {
    const startTime = Date.now();
    try {
      const { data, error } = await this.supabase
        .from("markets")
        .update({
          state: "FINALIZED",
          final_outcome: event.finalOutcome,
          dispute_agree: event.disputeAgreeVotes,
          dispute_disagree: event.disputeDisagreeVotes,
          finalized_at: new Date(event.blockTime * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", event.marketId);

      if (error) throw error;

      this.logger.info(
        `[MarketWriter] Finalized market ${event.marketId} (outcome: ${event.finalOutcome ? "YES" : "NO"}, tx: ${event.txSignature})`
      );

      return {
        success: true,
        eventType: EventType.MARKET_FINALIZED,
        txSignature: event.txSignature,
        processingTime: Date.now() - startTime,
      };
    } catch (error) {
      this.logger.error(`[MarketWriter] Error writing MarketFinalized:`, error);
      return {
        success: false,
        eventType: EventType.MARKET_FINALIZED,
        txSignature: event.txSignature,
        processingTime: Date.now() - startTime,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Handle MarketCancelled event
   * Marks market as cancelled
   */
  async writeMarketCancelled(event: MarketCancelledEvent): Promise<WriteResult> {
    const startTime = Date.now();
    try {
      const { data, error } = await this.supabase
        .from("markets")
        .update({
          is_cancelled: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", event.marketId);

      if (error) throw error;

      this.logger.info(
        `[MarketWriter] Cancelled market ${event.marketId} (reason: ${event.reason}, tx: ${event.txSignature})`
      );

      return {
        success: true,
        eventType: EventType.MARKET_CANCELLED,
        txSignature: event.txSignature,
        processingTime: Date.now() - startTime,
      };
    } catch (error) {
      this.logger.error(`[MarketWriter] Error writing MarketCancelled:`, error);
      return {
        success: false,
        eventType: EventType.MARKET_CANCELLED,
        txSignature: event.txSignature,
        processingTime: Date.now() - startTime,
        error: (error as Error).message,
      };
    }
  }
}
