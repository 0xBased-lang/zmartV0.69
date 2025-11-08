import { SupabaseClient } from "@supabase/supabase-js";
import { Logger } from "winston";
import { SharesBoughtEvent, SharesSoldEvent, WinningsClaimedEvent, LiquidityWithdrawnEvent, WriteResult } from "../types/events";
export declare class TradeEventWriter {
    private supabase;
    private logger;
    constructor(supabase: SupabaseClient, logger: Logger);
    /**
     * Handle SharesBought event
     * Inserts trade record and updates market state
     */
    writeSharesBought(event: SharesBoughtEvent): Promise<WriteResult>;
    /**
     * Handle SharesSold event
     * Inserts trade record and updates market state
     */
    writeSharesSold(event: SharesSoldEvent): Promise<WriteResult>;
    /**
     * Handle WinningsClaimed event
     * Records claim and updates positions
     */
    writeWinningsClaimed(event: WinningsClaimedEvent): Promise<WriteResult>;
    /**
     * Handle LiquidityWithdrawn event
     * Updates market liquidity
     */
    writeLiquidityWithdrawn(event: LiquidityWithdrawnEvent): Promise<WriteResult>;
    /**
     * Convert fixed-point price (9 decimals) to decimal
     */
    private fixedPointToDecimal;
    /**
     * Update market state after buy trade
     * Fallback for when RPC function doesn't exist
     */
    private updateMarketAfterBuy;
    /**
     * Update market state after sell trade
     */
    private updateMarketAfterSell;
}
//# sourceMappingURL=trade-writer.d.ts.map