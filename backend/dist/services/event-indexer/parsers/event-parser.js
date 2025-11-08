"use strict";
// ============================================================
// Event Parser
// ============================================================
// Purpose: Parse Solana transaction logs to extract program events
// Story: Week 1, Days 3-7 - Event Indexer Implementation
//
// Architecture:
// 1. Extract program logs from transaction
// 2. Decode base64 event data
// 3. Parse event discriminator (first 8 bytes)
// 4. Deserialize event fields using Borsh
// 5. Transform to TypeScript event objects
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventParser = void 0;
const web3_js_1 = require("@solana/web3.js");
const events_1 = require("../types/events");
// ============================================================
// Event Discriminators (First 8 bytes of event name hash)
// ============================================================
// These are computed as: base64(sha256("event:EventName")[0..8])
//
// NOTE: Actual discriminators will come from IDL after program deployment.
// For now, we use placeholder detection based on log patterns.
const EVENT_DISCRIMINATORS = {
    // Market Lifecycle
    "market_proposed": events_1.EventType.MARKET_PROPOSED,
    "market_approved": events_1.EventType.MARKET_APPROVED,
    "market_activated": events_1.EventType.MARKET_ACTIVATED,
    "market_resolved": events_1.EventType.MARKET_RESOLVED,
    "dispute_initiated": events_1.EventType.DISPUTE_INITIATED,
    "market_finalized": events_1.EventType.MARKET_FINALIZED,
    "market_cancelled": events_1.EventType.MARKET_CANCELLED,
    // Trading
    "shares_bought": events_1.EventType.SHARES_BOUGHT,
    "shares_sold": events_1.EventType.SHARES_SOLD,
    "winnings_claimed": events_1.EventType.WINNINGS_CLAIMED,
    "liquidity_withdrawn": events_1.EventType.LIQUIDITY_WITHDRAWN,
    // Voting
    "proposal_vote_submitted": events_1.EventType.PROPOSAL_VOTE_SUBMITTED,
    "dispute_vote_submitted": events_1.EventType.DISPUTE_VOTE_SUBMITTED,
    // Admin
    "config_initialized": events_1.EventType.CONFIG_INITIALIZED,
    "config_updated": events_1.EventType.CONFIG_UPDATED,
    "emergency_pause_toggled": events_1.EventType.EMERGENCY_PAUSE_TOGGLED,
};
// ============================================================
// Event Parser Class
// ============================================================
class EventParser {
    programId;
    logger;
    constructor(programId, logger) {
        this.programId = new web3_js_1.PublicKey(programId);
        this.logger = logger;
    }
    /**
     * Parse events from a single transaction
     */
    parseTransaction(transaction) {
        try {
            const events = [];
            // Extract transaction metadata
            const txSignature = transaction.signature;
            const blockTime = transaction.timestamp;
            const slot = transaction.slot;
            // Find instructions from our program
            const programInstructions = transaction.instructions?.filter((ix) => ix.programId === this.programId.toString()) || [];
            if (programInstructions.length === 0) {
                return events;
            }
            // TODO: Extract events from program logs
            // Anchor emits events as: "Program log: EVENT_NAME: {base64_data}"
            // For now, return empty array (will be implemented with real IDL)
            return events;
        }
        catch (error) {
            this.logger.error('[EventParser] Error parsing transaction', { error });
            return [];
        }
    }
    /**
     * Parse all events from a Helius webhook payload (array of transactions)
     */
    parseWebhookPayload(payload) {
        try {
            const allEvents = [];
            // Process each transaction in the payload
            for (const transaction of payload) {
                const events = this.parseTransaction(transaction);
                allEvents.push(...events);
            }
            return allEvents;
        }
        catch (error) {
            this.logger.error("[EventParser] Error parsing webhook payload:", error);
            return [];
        }
    }
    /**
     * Parse a single event from program logs
     * @param logEntry - Program log entry containing event data
     * @param txSignature - Transaction signature for correlation
     * @param blockTime - Block timestamp
     * @param slot - Slot number
     */
    parseEventFromLog(logEntry, txSignature, blockTime, slot) {
        try {
            // Anchor event format: "Program log: EventName: {base64_data}"
            const eventMatch = logEntry.match(/Program log: (\w+): (.+)/);
            if (!eventMatch) {
                return null;
            }
            const [, eventNameRaw, eventDataBase64] = eventMatch;
            const eventName = eventNameRaw.toLowerCase();
            // Check if this is a known event
            const eventType = EVENT_DISCRIMINATORS[eventName];
            if (!eventType) {
                this.logger.debug(`[EventParser] Unknown event: ${eventNameRaw}`);
                return null;
            }
            // Decode base64 data
            const eventData = Buffer.from(eventDataBase64, "base64");
            // Parse event based on type
            return this.parseEvent(eventType, eventData, txSignature, blockTime, slot);
        }
        catch (error) {
            this.logger.error(`[EventParser] Error parsing event from log:`, error);
            return null;
        }
    }
    /**
     * Parse event data based on event type
     */
    parseEvent(eventType, eventData, txSignature, blockTime, slot) {
        const baseEvent = {
            timestamp: Date.now(),
            txSignature,
            blockTime,
            slot,
        };
        try {
            switch (eventType) {
                // Market Lifecycle Events
                case events_1.EventType.MARKET_PROPOSED:
                    return this.parseMarketProposed(eventData, baseEvent);
                case events_1.EventType.MARKET_APPROVED:
                    return this.parseMarketApproved(eventData, baseEvent);
                case events_1.EventType.MARKET_ACTIVATED:
                    return this.parseMarketActivated(eventData, baseEvent);
                case events_1.EventType.MARKET_RESOLVED:
                    return this.parseMarketResolved(eventData, baseEvent);
                case events_1.EventType.DISPUTE_INITIATED:
                    return this.parseDisputeInitiated(eventData, baseEvent);
                case events_1.EventType.MARKET_FINALIZED:
                    return this.parseMarketFinalized(eventData, baseEvent);
                case events_1.EventType.MARKET_CANCELLED:
                    return this.parseMarketCancelled(eventData, baseEvent);
                // Trading Events
                case events_1.EventType.SHARES_BOUGHT:
                    return this.parseSharesBought(eventData, baseEvent);
                case events_1.EventType.SHARES_SOLD:
                    return this.parseSharesSold(eventData, baseEvent);
                case events_1.EventType.WINNINGS_CLAIMED:
                    return this.parseWinningsClaimed(eventData, baseEvent);
                case events_1.EventType.LIQUIDITY_WITHDRAWN:
                    return this.parseLiquidityWithdrawn(eventData, baseEvent);
                // Voting Events
                case events_1.EventType.PROPOSAL_VOTE_SUBMITTED:
                    return this.parseProposalVoteSubmitted(eventData, baseEvent);
                case events_1.EventType.DISPUTE_VOTE_SUBMITTED:
                    return this.parseDisputeVoteSubmitted(eventData, baseEvent);
                // Admin Events
                case events_1.EventType.CONFIG_INITIALIZED:
                    return this.parseConfigInitialized(eventData, baseEvent);
                case events_1.EventType.CONFIG_UPDATED:
                    return this.parseConfigUpdated(eventData, baseEvent);
                case events_1.EventType.EMERGENCY_PAUSE_TOGGLED:
                    return this.parseEmergencyPauseToggled(eventData, baseEvent);
                default:
                    this.logger.warn(`[EventParser] Unhandled event type: ${eventType}`);
                    return null;
            }
        }
        catch (error) {
            this.logger.error(`[EventParser] Error parsing ${eventType}:`, error);
            return null;
        }
    }
    // ============================================================
    // Individual Event Parsers (Placeholder implementations)
    // ============================================================
    // TODO: Implement Borsh deserialization once IDL is available
    // For now, these are placeholders that extract basic fields
    parseMarketProposed(data, base) {
        // TODO: Implement actual Borsh deserialization
        return {
            ...base,
            type: events_1.EventType.MARKET_PROPOSED,
            marketId: "placeholder",
            creator: "placeholder",
            question: "placeholder",
            category: "crypto",
            bParameter: "1000000000",
            initialLiquidity: "10000000000",
        };
    }
    parseMarketApproved(data, base) {
        return {
            ...base,
            type: events_1.EventType.MARKET_APPROVED,
            marketId: "placeholder",
            approvedBy: "placeholder",
            proposalLikes: 0,
            proposalDislikes: 0,
            approvalRate: 0,
        };
    }
    parseMarketActivated(data, base) {
        return {
            ...base,
            type: events_1.EventType.MARKET_ACTIVATED,
            marketId: "placeholder",
            activatedBy: "placeholder",
        };
    }
    parseMarketResolved(data, base) {
        return {
            ...base,
            type: events_1.EventType.MARKET_RESOLVED,
            marketId: "placeholder",
            resolver: "placeholder",
            proposedOutcome: true,
            ipfsEvidenceHash: null,
        };
    }
    parseDisputeInitiated(data, base) {
        return {
            ...base,
            type: events_1.EventType.DISPUTE_INITIATED,
            marketId: "placeholder",
            disputeInitiator: "placeholder",
            originalOutcome: true,
            disputePeriodEnd: Date.now() + 259200000, // +3 days
        };
    }
    parseMarketFinalized(data, base) {
        return {
            ...base,
            type: events_1.EventType.MARKET_FINALIZED,
            marketId: "placeholder",
            finalOutcome: true,
            disputeAgreeVotes: null,
            disputeDisagreeVotes: null,
        };
    }
    parseMarketCancelled(data, base) {
        return {
            ...base,
            type: events_1.EventType.MARKET_CANCELLED,
            marketId: "placeholder",
            cancelledBy: "placeholder",
            reason: "Emergency cancellation",
        };
    }
    parseSharesBought(data, base) {
        return {
            ...base,
            type: events_1.EventType.SHARES_BOUGHT,
            marketId: "placeholder",
            user: "placeholder",
            outcome: true,
            shares: "1000000000",
            cost: "500000000",
            newPrice: "500000000", // 0.5 with 9 decimals
        };
    }
    parseSharesSold(data, base) {
        return {
            ...base,
            type: events_1.EventType.SHARES_SOLD,
            marketId: "placeholder",
            user: "placeholder",
            outcome: true,
            shares: "1000000000",
            proceeds: "450000000",
            newPrice: "450000000",
        };
    }
    parseWinningsClaimed(data, base) {
        return {
            ...base,
            type: events_1.EventType.WINNINGS_CLAIMED,
            marketId: "placeholder",
            user: "placeholder",
            payout: "1000000000",
            shares: "2000000000",
        };
    }
    parseLiquidityWithdrawn(data, base) {
        return {
            ...base,
            type: events_1.EventType.LIQUIDITY_WITHDRAWN,
            marketId: "placeholder",
            creator: "placeholder",
            amount: "500000000",
        };
    }
    parseProposalVoteSubmitted(data, base) {
        return {
            ...base,
            type: events_1.EventType.PROPOSAL_VOTE_SUBMITTED,
            marketId: "placeholder",
            user: "placeholder",
            vote: true,
        };
    }
    parseDisputeVoteSubmitted(data, base) {
        return {
            ...base,
            type: events_1.EventType.DISPUTE_VOTE_SUBMITTED,
            marketId: "placeholder",
            user: "placeholder",
            vote: true,
        };
    }
    parseConfigInitialized(data, base) {
        return {
            ...base,
            type: events_1.EventType.CONFIG_INITIALIZED,
            admin: "placeholder",
            backendAuthority: "placeholder",
            protocolFeeWallet: "placeholder",
        };
    }
    parseConfigUpdated(data, base) {
        return {
            ...base,
            type: events_1.EventType.CONFIG_UPDATED,
            updatedBy: "placeholder",
            changes: {},
        };
    }
    parseEmergencyPauseToggled(data, base) {
        return {
            ...base,
            type: events_1.EventType.EMERGENCY_PAUSE_TOGGLED,
            toggledBy: "placeholder",
            isPaused: true,
        };
    }
}
exports.EventParser = EventParser;
// ============================================================
// Helper Functions
// ============================================================
/**
 * Convert u64 (BN) to string for storage
 */
function u64ToString(value) {
    return value.toString();
}
/**
 * Convert PublicKey to string
 */
function pubkeyToString(pubkey) {
    return pubkey.toString();
}
/**
 * Convert fixed-point price (u64 with 9 decimals) to string
 */
function priceToString(value) {
    return value.toString();
}
//# sourceMappingURL=event-parser.js.map