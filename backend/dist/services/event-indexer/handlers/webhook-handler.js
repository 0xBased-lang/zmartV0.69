"use strict";
// ============================================================
// Webhook Handler
// ============================================================
// Purpose: Handle Helius webhook events and route to appropriate writers
// Story: Week 1, Days 3-7 - Event Indexer Implementation
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebhookHandler = void 0;
const crypto_1 = __importDefault(require("crypto"));
class WebhookHandler {
    eventParser;
    marketWriter;
    tradeWriter;
    voteWriter;
    adminWriter;
    logger;
    webhookSecret;
    constructor(eventParser, marketWriter, tradeWriter, voteWriter, adminWriter, logger, webhookSecret) {
        this.eventParser = eventParser;
        this.marketWriter = marketWriter;
        this.tradeWriter = tradeWriter;
        this.voteWriter = voteWriter;
        this.adminWriter = adminWriter;
        this.logger = logger;
        this.webhookSecret = webhookSecret;
    }
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
    handle = async (req, res, next) => {
        const startTime = Date.now();
        try {
            // Verify webhook signature
            if (this.webhookSecret) {
                const signature = req.headers['x-helius-signature'];
                if (!this.verifySignature(req.body, signature)) {
                    this.logger.warn('Invalid webhook signature', {
                        headers: req.headers,
                    });
                    res.status(401).json({ error: 'Invalid signature' });
                    return;
                }
            }
            const payload = req.body;
            this.logger.info('Received webhook', {
                transactionCount: payload.length,
            });
            // Process each transaction
            const results = await Promise.allSettled(payload.map((tx) => this.processTransaction(tx)));
            // Count successes and failures
            const successes = results.filter((r) => r.status === 'fulfilled').length;
            const failures = results.filter((r) => r.status === 'rejected').length;
            this.logger.info('Webhook processing complete', {
                total: payload.length,
                successes,
                failures,
                processingTime: Date.now() - startTime,
            });
            res.status(200).json({
                success: true,
                processed: successes,
                failed: failures,
                processingTime: Date.now() - startTime,
            });
        }
        catch (error) {
            this.logger.error('Webhook handler error', { error });
            next(error);
        }
    };
    /**
     * Process a single transaction
     *
     * Extracts all events from transaction logs and routes to writers
     */
    async processTransaction(transaction) {
        try {
            const events = this.eventParser.parseTransaction(transaction);
            if (events.length === 0) {
                this.logger.debug('No events found in transaction', {
                    signature: transaction.signature,
                });
                return;
            }
            this.logger.info('Extracted events from transaction', {
                signature: transaction.signature,
                eventCount: events.length,
                eventTypes: events.map((e) => e.type),
            });
            // Process each event
            for (const event of events) {
                await this.routeEvent(event);
            }
        }
        catch (error) {
            this.logger.error('Error processing transaction', {
                error,
                signature: transaction.signature,
            });
            throw error;
        }
    }
    /**
     * Route event to appropriate writer based on event type
     */
    async routeEvent(event) {
        try {
            let result;
            switch (event.type) {
                // Market lifecycle events
                case 'MarketProposed':
                    result = await this.marketWriter.writeMarketProposed(event);
                    break;
                case 'MarketApproved':
                    result = await this.marketWriter.writeMarketApproved(event);
                    break;
                case 'MarketActivated':
                    result = await this.marketWriter.writeMarketActivated(event);
                    break;
                case 'MarketResolved':
                    result = await this.marketWriter.writeMarketResolved(event);
                    break;
                case 'DisputeInitiated':
                    result = await this.marketWriter.writeDisputeInitiated(event);
                    break;
                case 'MarketFinalized':
                    result = await this.marketWriter.writeMarketFinalized(event);
                    break;
                case 'MarketCancelled':
                    result = await this.marketWriter.writeMarketCancelled(event);
                    break;
                // Trading events
                case 'SharesBought':
                    result = await this.tradeWriter.writeSharesBought(event);
                    break;
                case 'SharesSold':
                    result = await this.tradeWriter.writeSharesSold(event);
                    break;
                case 'WinningsClaimed':
                    result = await this.tradeWriter.writeWinningsClaimed(event);
                    break;
                case 'LiquidityWithdrawn':
                    result = await this.tradeWriter.writeLiquidityWithdrawn(event);
                    break;
                // Voting events
                case 'ProposalVoteSubmitted':
                    result = await this.voteWriter.writeProposalVote(event);
                    break;
                case 'DisputeVoteSubmitted':
                    result = await this.voteWriter.writeDisputeVote(event);
                    break;
                // Admin events
                case 'ConfigInitialized':
                    result = await this.adminWriter.writeConfigInitialized(event);
                    break;
                case 'ConfigUpdated':
                    result = await this.adminWriter.writeConfigUpdated(event);
                    break;
                case 'EmergencyPauseToggled':
                    result = await this.adminWriter.writeEmergencyPauseToggled(event);
                    break;
                default:
                    this.logger.warn('Unknown event type', { eventType: event.type });
                    return;
            }
            if (result && !result.success) {
                this.logger.error('Event write failed', {
                    eventType: event.type,
                    txSignature: event.txSignature,
                    error: result.error,
                });
            }
        }
        catch (error) {
            this.logger.error('Error routing event', {
                error,
                eventType: event.type,
            });
            throw error;
        }
    }
    /**
     * Verify Helius webhook signature using HMAC-SHA256
     */
    verifySignature(payload, signature) {
        if (!this.webhookSecret || !signature) {
            return false;
        }
        const hmac = crypto_1.default.createHmac('sha256', this.webhookSecret);
        const digest = hmac.update(JSON.stringify(payload)).digest('hex');
        return crypto_1.default.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
    }
}
exports.WebhookHandler = WebhookHandler;
//# sourceMappingURL=webhook-handler.js.map