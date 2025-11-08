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

import { PublicKey } from "@solana/web3.js";
import {
  EventType,
  ProgramEvent,
  HeliusWebhookPayload,
  MarketProposedEvent,
  MarketApprovedEvent,
  MarketActivatedEvent,
  MarketResolvedEvent,
  DisputeInitiatedEvent,
  MarketFinalizedEvent,
  MarketCancelledEvent,
  SharesBoughtEvent,
  SharesSoldEvent,
  WinningsClaimedEvent,
  LiquidityWithdrawnEvent,
  ProposalVoteSubmittedEvent,
  DisputeVoteSubmittedEvent,
  ConfigInitializedEvent,
  ConfigUpdatedEvent,
  EmergencyPauseToggledEvent,
} from "../types/events";

// ============================================================
// Event Discriminators (First 8 bytes of event name hash)
// ============================================================
// These are computed as: base64(sha256("event:EventName")[0..8])
//
// NOTE: Actual discriminators will come from IDL after program deployment.
// For now, we use placeholder detection based on log patterns.

const EVENT_DISCRIMINATORS: Record<string, EventType> = {
  // Market Lifecycle
  "market_proposed": EventType.MARKET_PROPOSED,
  "market_approved": EventType.MARKET_APPROVED,
  "market_activated": EventType.MARKET_ACTIVATED,
  "market_resolved": EventType.MARKET_RESOLVED,
  "dispute_initiated": EventType.DISPUTE_INITIATED,
  "market_finalized": EventType.MARKET_FINALIZED,
  "market_cancelled": EventType.MARKET_CANCELLED,

  // Trading
  "shares_bought": EventType.SHARES_BOUGHT,
  "shares_sold": EventType.SHARES_SOLD,
  "winnings_claimed": EventType.WINNINGS_CLAIMED,
  "liquidity_withdrawn": EventType.LIQUIDITY_WITHDRAWN,

  // Voting
  "proposal_vote_submitted": EventType.PROPOSAL_VOTE_SUBMITTED,
  "dispute_vote_submitted": EventType.DISPUTE_VOTE_SUBMITTED,

  // Admin
  "config_initialized": EventType.CONFIG_INITIALIZED,
  "config_updated": EventType.CONFIG_UPDATED,
  "emergency_pause_toggled": EventType.EMERGENCY_PAUSE_TOGGLED,
};

// ============================================================
// Event Parser Class
// ============================================================

export class EventParser {
  private programId: PublicKey;
  private logger: any;

  constructor(programId: string, logger: any) {
    this.programId = new PublicKey(programId);
    this.logger = logger;
  }

  /**
   * Parse events from a single transaction
   */
  parseTransaction(transaction: any): ProgramEvent[] {
    try {
      const events: ProgramEvent[] = [];

      // Extract transaction metadata
      const txSignature = transaction.signature;
      const blockTime = transaction.timestamp;
      const slot = transaction.slot;

      // Find instructions from our program
      const programInstructions = transaction.instructions?.filter(
        (ix: any) => ix.programId === this.programId.toString()
      ) || [];

      if (programInstructions.length === 0) {
        return events;
      }

      // TODO: Extract events from program logs
      // Anchor emits events as: "Program log: EVENT_NAME: {base64_data}"
      // For now, return empty array (will be implemented with real IDL)

      return events;
    } catch (error) {
      this.logger.error('[EventParser] Error parsing transaction', { error });
      return [];
    }
  }

  /**
   * Parse all events from a Helius webhook payload (array of transactions)
   */
  parseWebhookPayload(payload: HeliusWebhookPayload): ProgramEvent[] {
    try {
      const allEvents: ProgramEvent[] = [];

      // Process each transaction in the payload
      for (const transaction of payload) {
        const events = this.parseTransaction(transaction);
        allEvents.push(...events);
      }

      return allEvents;
    } catch (error) {
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
  private parseEventFromLog(
    logEntry: string,
    txSignature: string,
    blockTime: number,
    slot: number
  ): ProgramEvent | null {
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
    } catch (error) {
      this.logger.error(`[EventParser] Error parsing event from log:`, error);
      return null;
    }
  }

  /**
   * Parse event data based on event type
   */
  private parseEvent(
    eventType: EventType,
    eventData: Buffer,
    txSignature: string,
    blockTime: number,
    slot: number
  ): ProgramEvent | null {
    const baseEvent = {
      timestamp: Date.now(),
      txSignature,
      blockTime,
      slot,
    };

    try {
      switch (eventType) {
        // Market Lifecycle Events
        case EventType.MARKET_PROPOSED:
          return this.parseMarketProposed(eventData, baseEvent);
        case EventType.MARKET_APPROVED:
          return this.parseMarketApproved(eventData, baseEvent);
        case EventType.MARKET_ACTIVATED:
          return this.parseMarketActivated(eventData, baseEvent);
        case EventType.MARKET_RESOLVED:
          return this.parseMarketResolved(eventData, baseEvent);
        case EventType.DISPUTE_INITIATED:
          return this.parseDisputeInitiated(eventData, baseEvent);
        case EventType.MARKET_FINALIZED:
          return this.parseMarketFinalized(eventData, baseEvent);
        case EventType.MARKET_CANCELLED:
          return this.parseMarketCancelled(eventData, baseEvent);

        // Trading Events
        case EventType.SHARES_BOUGHT:
          return this.parseSharesBought(eventData, baseEvent);
        case EventType.SHARES_SOLD:
          return this.parseSharesSold(eventData, baseEvent);
        case EventType.WINNINGS_CLAIMED:
          return this.parseWinningsClaimed(eventData, baseEvent);
        case EventType.LIQUIDITY_WITHDRAWN:
          return this.parseLiquidityWithdrawn(eventData, baseEvent);

        // Voting Events
        case EventType.PROPOSAL_VOTE_SUBMITTED:
          return this.parseProposalVoteSubmitted(eventData, baseEvent);
        case EventType.DISPUTE_VOTE_SUBMITTED:
          return this.parseDisputeVoteSubmitted(eventData, baseEvent);

        // Admin Events
        case EventType.CONFIG_INITIALIZED:
          return this.parseConfigInitialized(eventData, baseEvent);
        case EventType.CONFIG_UPDATED:
          return this.parseConfigUpdated(eventData, baseEvent);
        case EventType.EMERGENCY_PAUSE_TOGGLED:
          return this.parseEmergencyPauseToggled(eventData, baseEvent);

        default:
          this.logger.warn(`[EventParser] Unhandled event type: ${eventType}`);
          return null;
      }
    } catch (error) {
      this.logger.error(`[EventParser] Error parsing ${eventType}:`, error);
      return null;
    }
  }

  // ============================================================
  // Individual Event Parsers (Placeholder implementations)
  // ============================================================
  // TODO: Implement Borsh deserialization once IDL is available
  // For now, these are placeholders that extract basic fields

  private parseMarketProposed(data: Buffer, base: any): MarketProposedEvent {
    // TODO: Implement actual Borsh deserialization
    return {
      ...base,
      type: EventType.MARKET_PROPOSED,
      marketId: "placeholder",
      creator: "placeholder",
      question: "placeholder",
      category: "crypto",
      bParameter: "1000000000",
      initialLiquidity: "10000000000",
    };
  }

  private parseMarketApproved(data: Buffer, base: any): MarketApprovedEvent {
    return {
      ...base,
      type: EventType.MARKET_APPROVED,
      marketId: "placeholder",
      approvedBy: "placeholder",
      proposalLikes: 0,
      proposalDislikes: 0,
      approvalRate: 0,
    };
  }

  private parseMarketActivated(data: Buffer, base: any): MarketActivatedEvent {
    return {
      ...base,
      type: EventType.MARKET_ACTIVATED,
      marketId: "placeholder",
      activatedBy: "placeholder",
    };
  }

  private parseMarketResolved(data: Buffer, base: any): MarketResolvedEvent {
    return {
      ...base,
      type: EventType.MARKET_RESOLVED,
      marketId: "placeholder",
      resolver: "placeholder",
      proposedOutcome: true,
      ipfsEvidenceHash: null,
    };
  }

  private parseDisputeInitiated(data: Buffer, base: any): DisputeInitiatedEvent {
    return {
      ...base,
      type: EventType.DISPUTE_INITIATED,
      marketId: "placeholder",
      disputeInitiator: "placeholder",
      originalOutcome: true,
      disputePeriodEnd: Date.now() + 259200000, // +3 days
    };
  }

  private parseMarketFinalized(data: Buffer, base: any): MarketFinalizedEvent {
    return {
      ...base,
      type: EventType.MARKET_FINALIZED,
      marketId: "placeholder",
      finalOutcome: true,
      disputeAgreeVotes: null,
      disputeDisagreeVotes: null,
    };
  }

  private parseMarketCancelled(data: Buffer, base: any): MarketCancelledEvent {
    return {
      ...base,
      type: EventType.MARKET_CANCELLED,
      marketId: "placeholder",
      cancelledBy: "placeholder",
      reason: "Emergency cancellation",
    };
  }

  private parseSharesBought(data: Buffer, base: any): SharesBoughtEvent {
    return {
      ...base,
      type: EventType.SHARES_BOUGHT,
      marketId: "placeholder",
      user: "placeholder",
      outcome: true,
      shares: "1000000000",
      cost: "500000000",
      newPrice: "500000000", // 0.5 with 9 decimals
    };
  }

  private parseSharesSold(data: Buffer, base: any): SharesSoldEvent {
    return {
      ...base,
      type: EventType.SHARES_SOLD,
      marketId: "placeholder",
      user: "placeholder",
      outcome: true,
      shares: "1000000000",
      proceeds: "450000000",
      newPrice: "450000000",
    };
  }

  private parseWinningsClaimed(data: Buffer, base: any): WinningsClaimedEvent {
    return {
      ...base,
      type: EventType.WINNINGS_CLAIMED,
      marketId: "placeholder",
      user: "placeholder",
      payout: "1000000000",
      shares: "2000000000",
    };
  }

  private parseLiquidityWithdrawn(data: Buffer, base: any): LiquidityWithdrawnEvent {
    return {
      ...base,
      type: EventType.LIQUIDITY_WITHDRAWN,
      marketId: "placeholder",
      creator: "placeholder",
      amount: "500000000",
    };
  }

  private parseProposalVoteSubmitted(data: Buffer, base: any): ProposalVoteSubmittedEvent {
    return {
      ...base,
      type: EventType.PROPOSAL_VOTE_SUBMITTED,
      marketId: "placeholder",
      user: "placeholder",
      vote: true,
    };
  }

  private parseDisputeVoteSubmitted(data: Buffer, base: any): DisputeVoteSubmittedEvent {
    return {
      ...base,
      type: EventType.DISPUTE_VOTE_SUBMITTED,
      marketId: "placeholder",
      user: "placeholder",
      vote: true,
    };
  }

  private parseConfigInitialized(data: Buffer, base: any): ConfigInitializedEvent {
    return {
      ...base,
      type: EventType.CONFIG_INITIALIZED,
      admin: "placeholder",
      backendAuthority: "placeholder",
      protocolFeeWallet: "placeholder",
    };
  }

  private parseConfigUpdated(data: Buffer, base: any): ConfigUpdatedEvent {
    return {
      ...base,
      type: EventType.CONFIG_UPDATED,
      updatedBy: "placeholder",
      changes: {},
    };
  }

  private parseEmergencyPauseToggled(data: Buffer, base: any): EmergencyPauseToggledEvent {
    return {
      ...base,
      type: EventType.EMERGENCY_PAUSE_TOGGLED,
      toggledBy: "placeholder",
      isPaused: true,
    };
  }
}

// ============================================================
// Helper Functions
// ============================================================

/**
 * Convert u64 (BN) to string for storage
 */
function u64ToString(value: any): string {
  return value.toString();
}

/**
 * Convert PublicKey to string
 */
function pubkeyToString(pubkey: PublicKey): string {
  return pubkey.toString();
}

/**
 * Convert fixed-point price (u64 with 9 decimals) to string
 */
function priceToString(value: any): string {
  return value.toString();
}
