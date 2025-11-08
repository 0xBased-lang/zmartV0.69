"use strict";
// ============================================================
// Event Indexer Types
// ============================================================
// Purpose: Type definitions for all Solana program events
// Story: Week 1, Days 3-7 - Event Indexer Implementation
//
// Event Types (16 total):
// - Market Lifecycle (7): Proposed, Approved, Activated, Resolved, Disputed, Finalized, Cancelled
// - Trading (4): SharesBought, SharesSold, WinningsClaimed, LiquidityWithdrawn
// - Voting (2): ProposalVoteSubmitted, DisputeVoteSubmitted
// - Admin (3): ConfigInitialized, ConfigUpdated, EmergencyPauseToggled
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventType = void 0;
// ============================================================
// Base Types
// ============================================================
var EventType;
(function (EventType) {
    // Market Lifecycle
    EventType["MARKET_PROPOSED"] = "MarketProposed";
    EventType["MARKET_APPROVED"] = "MarketApproved";
    EventType["MARKET_ACTIVATED"] = "MarketActivated";
    EventType["MARKET_RESOLVED"] = "MarketResolved";
    EventType["DISPUTE_INITIATED"] = "DisputeInitiated";
    EventType["MARKET_FINALIZED"] = "MarketFinalized";
    EventType["MARKET_CANCELLED"] = "MarketCancelled";
    // Trading
    EventType["SHARES_BOUGHT"] = "SharesBought";
    EventType["SHARES_SOLD"] = "SharesSold";
    EventType["WINNINGS_CLAIMED"] = "WinningsClaimed";
    EventType["LIQUIDITY_WITHDRAWN"] = "LiquidityWithdrawn";
    // Voting
    EventType["PROPOSAL_VOTE_SUBMITTED"] = "ProposalVoteSubmitted";
    EventType["DISPUTE_VOTE_SUBMITTED"] = "DisputeVoteSubmitted";
    // Admin
    EventType["CONFIG_INITIALIZED"] = "ConfigInitialized";
    EventType["CONFIG_UPDATED"] = "ConfigUpdated";
    EventType["EMERGENCY_PAUSE_TOGGLED"] = "EmergencyPauseToggled";
})(EventType || (exports.EventType = EventType = {}));
//# sourceMappingURL=events.js.map