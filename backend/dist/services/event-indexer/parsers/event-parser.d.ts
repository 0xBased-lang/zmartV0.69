import { ProgramEvent, HeliusWebhookPayload } from "../types/events";
export declare class EventParser {
    private programId;
    private logger;
    constructor(programId: string, logger: any);
    /**
     * Parse events from a single transaction
     */
    parseTransaction(transaction: any): ProgramEvent[];
    /**
     * Parse all events from a Helius webhook payload (array of transactions)
     */
    parseWebhookPayload(payload: HeliusWebhookPayload): ProgramEvent[];
    /**
     * Parse a single event from program logs
     * @param logEntry - Program log entry containing event data
     * @param txSignature - Transaction signature for correlation
     * @param blockTime - Block timestamp
     * @param slot - Slot number
     */
    private parseEventFromLog;
    /**
     * Parse event data based on event type
     */
    private parseEvent;
    private parseMarketProposed;
    private parseMarketApproved;
    private parseMarketActivated;
    private parseMarketResolved;
    private parseDisputeInitiated;
    private parseMarketFinalized;
    private parseMarketCancelled;
    private parseSharesBought;
    private parseSharesSold;
    private parseWinningsClaimed;
    private parseLiquidityWithdrawn;
    private parseProposalVoteSubmitted;
    private parseDisputeVoteSubmitted;
    private parseConfigInitialized;
    private parseConfigUpdated;
    private parseEmergencyPauseToggled;
}
//# sourceMappingURL=event-parser.d.ts.map