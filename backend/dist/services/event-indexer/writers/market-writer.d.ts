import { SupabaseClient } from "@supabase/supabase-js";
import { Logger } from "winston";
import { MarketProposedEvent, MarketApprovedEvent, MarketActivatedEvent, MarketResolvedEvent, DisputeInitiatedEvent, MarketFinalizedEvent, MarketCancelledEvent, WriteResult } from "../types/events";
export declare class MarketEventWriter {
    private supabase;
    private logger;
    constructor(supabase: SupabaseClient, logger: Logger);
    /**
     * Handle MarketProposed event
     * Creates new market record in database
     */
    writeMarketProposed(event: MarketProposedEvent): Promise<WriteResult>;
    /**
     * Handle MarketApproved event
     * Updates market state to APPROVED and records approval votes
     */
    writeMarketApproved(event: MarketApprovedEvent): Promise<WriteResult>;
    /**
     * Handle MarketActivated event
     * Updates market state to ACTIVE
     */
    writeMarketActivated(event: MarketActivatedEvent): Promise<WriteResult>;
    /**
     * Handle MarketResolved event
     * Updates market state to RESOLVING and records proposed outcome
     */
    writeMarketResolved(event: MarketResolvedEvent): Promise<WriteResult>;
    /**
     * Handle DisputeInitiated event
     * Updates market state to DISPUTED
     */
    writeDisputeInitiated(event: DisputeInitiatedEvent): Promise<WriteResult>;
    /**
     * Handle MarketFinalized event
     * Updates market state to FINALIZED and records final outcome
     */
    writeMarketFinalized(event: MarketFinalizedEvent): Promise<WriteResult>;
    /**
     * Handle MarketCancelled event
     * Marks market as cancelled
     */
    writeMarketCancelled(event: MarketCancelledEvent): Promise<WriteResult>;
}
//# sourceMappingURL=market-writer.d.ts.map