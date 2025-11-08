// ============================================================
// Trade Event Writer
// ============================================================
// Purpose: Write trading events to Supabase database
// Story: Week 1, Days 3-7 - Event Indexer Implementation
//
// Handles:
// - SharesBought → INSERT trades, UPDATE markets (shares, volume, price)
// - SharesSold → INSERT trades, UPDATE markets (shares, volume, price)
// - WinningsClaimed → INSERT trades (type: claim), UPDATE positions
// - LiquidityWithdrawn → UPDATE markets (liquidity)

import { SupabaseClient } from "@supabase/supabase-js";
import { Logger } from "winston";
import {
  SharesBoughtEvent,
  SharesSoldEvent,
  WinningsClaimedEvent,
  LiquidityWithdrawnEvent,
  WriteResult,
  EventType,
} from "../types/events";

export class TradeEventWriter {
  constructor(
    private supabase: SupabaseClient,
    private logger: Logger
  ) {}

  /**
   * Handle SharesBought event
   * Inserts trade record and updates market state
   */
  async writeSharesBought(event: SharesBoughtEvent): Promise<WriteResult> {
    const startTime = Date.now();
    try {
      // 1. Insert trade record
      const { data: tradeData, error: tradeError } = await this.supabase
        .from("trades")
        .insert({
          market_id: event.marketId,
          user_wallet: event.user,
          trade_type: "buy",
          outcome: event.outcome,
          shares: event.shares,
          cost: event.cost,
          price_after: this.fixedPointToDecimal(event.newPrice),
          tx_signature: event.txSignature,
          block_time: new Date(event.blockTime * 1000).toISOString(),
        });

      if (tradeError) {
        // Check for duplicate transaction
        if (tradeError.code === "23505") {
          this.logger.debug(
            `[TradeWriter] Trade already indexed (tx: ${event.txSignature})`
          );
          return {
            success: true,
            eventType: EventType.SHARES_BOUGHT,
            txSignature: event.txSignature,
            processingTime: Date.now() - startTime,
          };
        }
        throw tradeError;
      }

      // 2. Update market state (shares, volume, price)
      const { data: marketData, error: marketError } = await this.supabase.rpc(
        "update_market_after_buy",
        {
          p_market_id: event.marketId,
          p_outcome: event.outcome,
          p_shares: event.shares,
          p_cost: event.cost,
          p_new_price_yes: this.fixedPointToDecimal(event.newPrice),
          p_new_price_no: 1 - this.fixedPointToDecimal(event.newPrice),
        }
      );

      // If RPC function doesn't exist yet, fall back to direct update
      if (marketError && marketError.code === "42883") {
        await this.updateMarketAfterBuy(event);
      } else if (marketError) {
        throw marketError;
      }

      this.logger.info(
        `[TradeWriter] SharesBought: ${event.user} bought ${event.shares} ${event.outcome ? "YES" : "NO"} shares for ${event.cost} (tx: ${event.txSignature})`
      );

      return {
        success: true,
        eventType: EventType.SHARES_BOUGHT,
        txSignature: event.txSignature,
        processingTime: Date.now() - startTime,
      };
    } catch (error) {
      this.logger.error(`[TradeWriter] Error writing SharesBought:`, error);
      return {
        success: false,
        eventType: EventType.SHARES_BOUGHT,
        txSignature: event.txSignature,
        processingTime: Date.now() - startTime,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Handle SharesSold event
   * Inserts trade record and updates market state
   */
  async writeSharesSold(event: SharesSoldEvent): Promise<WriteResult> {
    const startTime = Date.now();
    try {
      // 1. Insert trade record
      const { data: tradeData, error: tradeError } = await this.supabase
        .from("trades")
        .insert({
          market_id: event.marketId,
          user_wallet: event.user,
          trade_type: "sell",
          outcome: event.outcome,
          shares: event.shares,
          cost: event.proceeds, // For sell, this is proceeds
          price_after: this.fixedPointToDecimal(event.newPrice),
          tx_signature: event.txSignature,
          block_time: new Date(event.blockTime * 1000).toISOString(),
        });

      if (tradeError) {
        if (tradeError.code === "23505") {
          this.logger.debug(
            `[TradeWriter] Trade already indexed (tx: ${event.txSignature})`
          );
          return {
            success: true,
            eventType: EventType.SHARES_SOLD,
            txSignature: event.txSignature,
            processingTime: Date.now() - startTime,
          };
        }
        throw tradeError;
      }

      // 2. Update market state
      await this.updateMarketAfterSell(event);

      this.logger.info(
        `[TradeWriter] SharesSold: ${event.user} sold ${event.shares} ${event.outcome ? "YES" : "NO"} shares for ${event.proceeds} (tx: ${event.txSignature})`
      );

      return {
        success: true,
        eventType: EventType.SHARES_SOLD,
        txSignature: event.txSignature,
        processingTime: Date.now() - startTime,
      };
    } catch (error) {
      this.logger.error(`[TradeWriter] Error writing SharesSold:`, error);
      return {
        success: false,
        eventType: EventType.SHARES_SOLD,
        txSignature: event.txSignature,
        processingTime: Date.now() - startTime,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Handle WinningsClaimed event
   * Records claim and updates positions
   */
  async writeWinningsClaimed(event: WinningsClaimedEvent): Promise<WriteResult> {
    const startTime = Date.now();
    try {
      // Insert claim record as a special trade type
      const { data, error } = await this.supabase.from("trades").insert({
        market_id: event.marketId,
        user_wallet: event.user,
        trade_type: "claim",
        outcome: true, // Placeholder
        shares: event.shares,
        cost: event.payout,
        price_after: 1.0, // Market is finalized
        tx_signature: event.txSignature,
        block_time: new Date(event.blockTime * 1000).toISOString(),
      });

      if (error) {
        if (error.code === "23505") {
          this.logger.debug(
            `[TradeWriter] Claim already indexed (tx: ${event.txSignature})`
          );
          return {
            success: true,
            eventType: EventType.WINNINGS_CLAIMED,
            txSignature: event.txSignature,
            processingTime: Date.now() - startTime,
          };
        }
        throw error;
      }

      this.logger.info(
        `[TradeWriter] WinningsClaimed: ${event.user} claimed ${event.payout} from market ${event.marketId} (tx: ${event.txSignature})`
      );

      return {
        success: true,
        eventType: EventType.WINNINGS_CLAIMED,
        txSignature: event.txSignature,
        processingTime: Date.now() - startTime,
      };
    } catch (error) {
      this.logger.error(`[TradeWriter] Error writing WinningsClaimed:`, error);
      return {
        success: false,
        eventType: EventType.WINNINGS_CLAIMED,
        txSignature: event.txSignature,
        processingTime: Date.now() - startTime,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Handle LiquidityWithdrawn event
   * Updates market liquidity
   */
  async writeLiquidityWithdrawn(event: LiquidityWithdrawnEvent): Promise<WriteResult> {
    const startTime = Date.now();
    try {
      const { data, error } = await this.supabase
        .from("markets")
        .update({
          current_liquidity: this.supabase.rpc("current_liquidity - ?", [
            event.amount,
          ]),
          updated_at: new Date().toISOString(),
        })
        .eq("id", event.marketId);

      if (error) throw error;

      this.logger.info(
        `[TradeWriter] LiquidityWithdrawn: ${event.creator} withdrew ${event.amount} from market ${event.marketId} (tx: ${event.txSignature})`
      );

      return {
        success: true,
        eventType: EventType.LIQUIDITY_WITHDRAWN,
        txSignature: event.txSignature,
        processingTime: Date.now() - startTime,
      };
    } catch (error) {
      this.logger.error(`[TradeWriter] Error writing LiquidityWithdrawn:`, error);
      return {
        success: false,
        eventType: EventType.LIQUIDITY_WITHDRAWN,
        txSignature: event.txSignature,
        processingTime: Date.now() - startTime,
        error: (error as Error).message,
      };
    }
  }

  // ============================================================
  // Helper Methods
  // ============================================================

  /**
   * Convert fixed-point price (9 decimals) to decimal
   */
  private fixedPointToDecimal(fixedPoint: string): number {
    return parseInt(fixedPoint) / 1_000_000_000;
  }

  /**
   * Update market state after buy trade
   * Fallback for when RPC function doesn't exist
   */
  private async updateMarketAfterBuy(event: SharesBoughtEvent): Promise<void> {
    // Fetch current market state
    const { data: market, error: fetchError } = await this.supabase
      .from("markets")
      .select("shares_yes, shares_no, total_volume")
      .eq("id", event.marketId)
      .single();

    if (fetchError) throw fetchError;

    // Calculate new shares
    const newSharesYes = event.outcome
      ? BigInt(market.shares_yes) + BigInt(event.shares)
      : BigInt(market.shares_yes);
    const newSharesNo = !event.outcome
      ? BigInt(market.shares_no) + BigInt(event.shares)
      : BigInt(market.shares_no);

    // Calculate new volume
    const newVolume = BigInt(market.total_volume) + BigInt(event.cost);

    // Update market
    const { error: updateError } = await this.supabase
      .from("markets")
      .update({
        shares_yes: newSharesYes.toString(),
        shares_no: newSharesNo.toString(),
        total_volume: newVolume.toString(),
        current_price_yes: this.fixedPointToDecimal(event.newPrice),
        current_price_no: 1 - this.fixedPointToDecimal(event.newPrice),
        updated_at: new Date().toISOString(),
      })
      .eq("id", event.marketId);

    if (updateError) throw updateError;
  }

  /**
   * Update market state after sell trade
   */
  private async updateMarketAfterSell(event: SharesSoldEvent): Promise<void> {
    const { data: market, error: fetchError } = await this.supabase
      .from("markets")
      .select("shares_yes, shares_no, total_volume")
      .eq("id", event.marketId)
      .single();

    if (fetchError) throw fetchError;

    // Calculate new shares (subtract sold shares)
    const newSharesYes = event.outcome
      ? BigInt(market.shares_yes) - BigInt(event.shares)
      : BigInt(market.shares_yes);
    const newSharesNo = !event.outcome
      ? BigInt(market.shares_no) - BigInt(event.shares)
      : BigInt(market.shares_no);

    // Volume increases even on sells (total turnover)
    const newVolume = BigInt(market.total_volume) + BigInt(event.proceeds);

    const { error: updateError } = await this.supabase
      .from("markets")
      .update({
        shares_yes: newSharesYes.toString(),
        shares_no: newSharesNo.toString(),
        total_volume: newVolume.toString(),
        current_price_yes: this.fixedPointToDecimal(event.newPrice),
        current_price_no: 1 - this.fixedPointToDecimal(event.newPrice),
        updated_at: new Date().toISOString(),
      })
      .eq("id", event.marketId);

    if (updateError) throw updateError;
  }
}
