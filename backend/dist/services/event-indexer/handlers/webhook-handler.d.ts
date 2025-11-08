import { Request, Response, NextFunction } from 'express';
import { Logger } from 'winston';
import { EventParser } from '../parsers/event-parser';
import { MarketEventWriter } from '../writers/market-writer';
import { TradeEventWriter } from '../writers/trade-writer';
import { VoteEventWriter } from '../writers/vote-writer';
import { AdminEventWriter } from '../writers/admin-writer';
export declare class WebhookHandler {
    private eventParser;
    private marketWriter;
    private tradeWriter;
    private voteWriter;
    private adminWriter;
    private logger;
    private webhookSecret?;
    constructor(eventParser: EventParser, marketWriter: MarketEventWriter, tradeWriter: TradeEventWriter, voteWriter: VoteEventWriter, adminWriter: AdminEventWriter, logger: Logger, webhookSecret?: string | undefined);
    /**
     * Main webhook handler
     *
     * Flow:
     * 1. Verify HMAC signature (if webhookSecret provided)
     * 2. Parse webhook payload
     * 3. Extract events from transactions
     * 4. Route each event to appropriate writer
     * 5. Return success/failure response
     */
    handle: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    /**
     * Process a single transaction
     *
     * Extracts all events from transaction logs and routes to writers
     */
    private processTransaction;
    /**
     * Route event to appropriate writer based on event type
     */
    private routeEvent;
    /**
     * Verify Helius webhook signature using HMAC-SHA256
     */
    private verifySignature;
}
//# sourceMappingURL=webhook-handler.d.ts.map