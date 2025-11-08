"use strict";
// ============================================================
// Event Indexer Service
// ============================================================
// Purpose: Main orchestrator for Solana event indexing
// Story: Week 1, Days 3-7 - Event Indexer Implementation
//
// Architecture:
// Helius Webhooks → Webhook Handler → Event Parser → Writers → Supabase
//
// Components:
// - EventParser: Extract events from transaction logs
// - MarketEventWriter: Market lifecycle events (7 events)
// - TradeEventWriter: Trading events (4 events)
// - VoteEventWriter: Voting events (2 events)
// - AdminEventWriter: Admin events (3 events)
// - WebhookHandler: Express route for Helius webhooks
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebhookHandler = exports.AdminEventWriter = exports.VoteEventWriter = exports.TradeEventWriter = exports.MarketEventWriter = exports.EventParser = exports.EventIndexerService = void 0;
const express_1 = __importDefault(require("express"));
const supabase_js_1 = require("@supabase/supabase-js");
const winston_1 = __importDefault(require("winston"));
const event_parser_1 = require("./parsers/event-parser");
const market_writer_1 = require("./writers/market-writer");
const trade_writer_1 = require("./writers/trade-writer");
const vote_writer_1 = require("./writers/vote-writer");
const admin_writer_1 = require("./writers/admin-writer");
const webhook_handler_1 = require("./handlers/webhook-handler");
class EventIndexerService {
    config;
    app;
    supabase;
    logger;
    eventParser;
    marketWriter;
    tradeWriter;
    voteWriter;
    adminWriter;
    webhookHandler;
    server;
    constructor(config) {
        this.config = config;
        this.app = (0, express_1.default)();
        this.app.use(express_1.default.json());
    }
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
    async initialize() {
        // Setup logger
        this.logger = winston_1.default.createLogger({
            level: this.config.logLevel || 'info',
            format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.json()),
            transports: [
                new winston_1.default.transports.Console({
                    format: winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.simple()),
                }),
            ],
        });
        this.logger.info('Initializing Event Indexer Service');
        // Setup Supabase client
        this.supabase = (0, supabase_js_1.createClient)(this.config.supabaseUrl, this.config.supabaseKey);
        // Initialize event parser
        // TODO: Get actual program ID from environment
        const programId = process.env.ZMART_PROGRAM_ID || 'PROGRAM_ID_PLACEHOLDER';
        this.eventParser = new event_parser_1.EventParser(programId, this.logger);
        // Initialize writers
        this.marketWriter = new market_writer_1.MarketEventWriter(this.supabase, this.logger);
        this.tradeWriter = new trade_writer_1.TradeEventWriter(this.supabase, this.logger);
        this.voteWriter = new vote_writer_1.VoteEventWriter(this.supabase, this.logger);
        this.adminWriter = new admin_writer_1.AdminEventWriter(this.supabase, this.logger);
        // Initialize webhook handler
        this.webhookHandler = new webhook_handler_1.WebhookHandler(this.eventParser, this.marketWriter, this.tradeWriter, this.voteWriter, this.adminWriter, this.logger, this.config.heliusWebhookSecret);
        this.logger.info('Event Indexer Service initialized');
    }
    /**
     * Start the webhook server
     *
     * Sets up Express routes and starts listening for webhooks
     */
    async start() {
        const port = this.config.port || 3001;
        // Setup webhook route
        this.app.post('/api/events/webhook', this.webhookHandler.handle);
        // Health check endpoint
        this.app.get('/health', (req, res) => {
            res.json({
                status: 'ok',
                service: 'event-indexer',
                timestamp: new Date().toISOString(),
            });
        });
        // Start server
        this.server = this.app.listen(port, () => {
            this.logger.info(`Event Indexer Service listening on port ${port}`);
        });
    }
    /**
     * Stop the webhook server
     *
     * Gracefully shuts down Express server
     */
    async stop() {
        if (this.server) {
            await new Promise((resolve, reject) => {
                this.server.close((err) => {
                    if (err) {
                        this.logger.error('Error stopping server', { error: err });
                        reject(err);
                    }
                    else {
                        this.logger.info('Event Indexer Service stopped');
                        resolve();
                    }
                });
            });
        }
    }
}
exports.EventIndexerService = EventIndexerService;
// Export all components for external use
var event_parser_2 = require("./parsers/event-parser");
Object.defineProperty(exports, "EventParser", { enumerable: true, get: function () { return event_parser_2.EventParser; } });
var market_writer_2 = require("./writers/market-writer");
Object.defineProperty(exports, "MarketEventWriter", { enumerable: true, get: function () { return market_writer_2.MarketEventWriter; } });
var trade_writer_2 = require("./writers/trade-writer");
Object.defineProperty(exports, "TradeEventWriter", { enumerable: true, get: function () { return trade_writer_2.TradeEventWriter; } });
var vote_writer_2 = require("./writers/vote-writer");
Object.defineProperty(exports, "VoteEventWriter", { enumerable: true, get: function () { return vote_writer_2.VoteEventWriter; } });
var admin_writer_2 = require("./writers/admin-writer");
Object.defineProperty(exports, "AdminEventWriter", { enumerable: true, get: function () { return admin_writer_2.AdminEventWriter; } });
var webhook_handler_2 = require("./handlers/webhook-handler");
Object.defineProperty(exports, "WebhookHandler", { enumerable: true, get: function () { return webhook_handler_2.WebhookHandler; } });
__exportStar(require("./types/events"), exports);
//# sourceMappingURL=index.js.map