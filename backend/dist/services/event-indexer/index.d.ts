export interface EventIndexerConfig {
    supabaseUrl: string;
    supabaseKey: string;
    heliusWebhookSecret?: string;
    port?: number;
    logLevel?: string;
}
export declare class EventIndexerService {
    private config;
    private app;
    private supabase;
    private logger;
    private eventParser;
    private marketWriter;
    private tradeWriter;
    private voteWriter;
    private adminWriter;
    private webhookHandler;
    private server;
    constructor(config: EventIndexerConfig);
    /**
     * Initialize all service components
     *
     * Sets up:
     * - Logger
     * - Supabase client
     * - Event parser
     * - All event writers (market, trade, vote, admin)
     * - Webhook handler
     */
    initialize(): Promise<void>;
    /**
     * Start the webhook server
     *
     * Sets up Express routes and starts listening for webhooks
     */
    start(): Promise<void>;
    /**
     * Stop the webhook server
     *
     * Gracefully shuts down Express server
     */
    stop(): Promise<void>;
}
export { EventParser } from './parsers/event-parser';
export { MarketEventWriter } from './writers/market-writer';
export { TradeEventWriter } from './writers/trade-writer';
export { VoteEventWriter } from './writers/vote-writer';
export { AdminEventWriter } from './writers/admin-writer';
export { WebhookHandler } from './handlers/webhook-handler';
export * from './types/events';
//# sourceMappingURL=index.d.ts.map