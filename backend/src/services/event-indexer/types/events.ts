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

import { PublicKey } from "@solana/web3.js";

// ============================================================
// Base Types
// ============================================================

export enum EventType {
  // Market Lifecycle
  MARKET_PROPOSED = "MarketProposed",
  MARKET_APPROVED = "MarketApproved",
  MARKET_ACTIVATED = "MarketActivated",
  MARKET_RESOLVED = "MarketResolved",
  DISPUTE_INITIATED = "DisputeInitiated",
  MARKET_FINALIZED = "MarketFinalized",
  MARKET_CANCELLED = "MarketCancelled",

  // Trading
  SHARES_BOUGHT = "SharesBought",
  SHARES_SOLD = "SharesSold",
  WINNINGS_CLAIMED = "WinningsClaimed",
  LIQUIDITY_WITHDRAWN = "LiquidityWithdrawn",

  // Voting
  PROPOSAL_VOTE_SUBMITTED = "ProposalVoteSubmitted",
  DISPUTE_VOTE_SUBMITTED = "DisputeVoteSubmitted",

  // Admin
  CONFIG_INITIALIZED = "ConfigInitialized",
  CONFIG_UPDATED = "ConfigUpdated",
  EMERGENCY_PAUSE_TOGGLED = "EmergencyPauseToggled",
}

export interface BaseEvent {
  type: EventType;
  timestamp: number;
  txSignature: string;
  blockTime: number;
  slot: number;
}

// ============================================================
// Market Lifecycle Events
// ============================================================

export interface MarketProposedEvent extends BaseEvent {
  type: EventType.MARKET_PROPOSED;
  marketId: string;
  creator: string;
  question: string;
  category: string;
  bParameter: string; // u64 as string
  initialLiquidity: string; // u64 as string
}

export interface MarketApprovedEvent extends BaseEvent {
  type: EventType.MARKET_APPROVED;
  marketId: string;
  approvedBy: string;
  proposalLikes: number;
  proposalDislikes: number;
  approvalRate: number; // 0-10000 (basis points)
}

export interface MarketActivatedEvent extends BaseEvent {
  type: EventType.MARKET_ACTIVATED;
  marketId: string;
  activatedBy: string;
}

export interface MarketResolvedEvent extends BaseEvent {
  type: EventType.MARKET_RESOLVED;
  marketId: string;
  resolver: string;
  proposedOutcome: boolean; // true=YES, false=NO
  ipfsEvidenceHash: string | null;
}

export interface DisputeInitiatedEvent extends BaseEvent {
  type: EventType.DISPUTE_INITIATED;
  marketId: string;
  disputeInitiator: string;
  originalOutcome: boolean;
  disputePeriodEnd: number; // Unix timestamp
}

export interface MarketFinalizedEvent extends BaseEvent {
  type: EventType.MARKET_FINALIZED;
  marketId: string;
  finalOutcome: boolean;
  disputeAgreeVotes: number | null;
  disputeDisagreeVotes: number | null;
}

export interface MarketCancelledEvent extends BaseEvent {
  type: EventType.MARKET_CANCELLED;
  marketId: string;
  cancelledBy: string;
  reason: string;
}

// ============================================================
// Trading Events
// ============================================================

export interface SharesBoughtEvent extends BaseEvent {
  type: EventType.SHARES_BOUGHT;
  marketId: string;
  user: string;
  outcome: boolean; // true=YES, false=NO
  shares: string; // u64 as string
  cost: string; // u64 as string (includes fees)
  newPrice: string; // Fixed-point price (9 decimals)
}

export interface SharesSoldEvent extends BaseEvent {
  type: EventType.SHARES_SOLD;
  marketId: string;
  user: string;
  outcome: boolean; // true=YES, false=NO
  shares: string; // u64 as string
  proceeds: string; // u64 as string (after fees)
  newPrice: string; // Fixed-point price (9 decimals)
}

export interface WinningsClaimedEvent extends BaseEvent {
  type: EventType.WINNINGS_CLAIMED;
  marketId: string;
  user: string;
  payout: string; // u64 as string
  shares: string; // u64 as string
}

export interface LiquidityWithdrawnEvent extends BaseEvent {
  type: EventType.LIQUIDITY_WITHDRAWN;
  marketId: string;
  creator: string;
  amount: string; // u64 as string
}

// ============================================================
// Voting Events
// ============================================================

export interface ProposalVoteSubmittedEvent extends BaseEvent {
  type: EventType.PROPOSAL_VOTE_SUBMITTED;
  marketAddress: string;
  voter: string;
  vote: boolean; // true=like, false=dislike
  weight: number;
}

export interface DisputeVoteSubmittedEvent extends BaseEvent {
  type: EventType.DISPUTE_VOTE_SUBMITTED;
  marketAddress: string;
  voter: string;
  vote: boolean; // true=agree with dispute, false=disagree
  weight: number;
  disputeRound: number;
}

// ============================================================
// Admin Events
// ============================================================

export interface ConfigInitializedEvent extends BaseEvent {
  type: EventType.CONFIG_INITIALIZED;
  authority: string;
  backendAuthority: string;
  protocolFeeWallet: string;
  proposalApprovalThreshold: number;
  minLiquidityRequired: string;
  platformFeePercentage: number;
  creatorFeePercentage: number;
  stakerFeePercentage: number;
}

export interface ConfigUpdatedEvent extends BaseEvent {
  type: EventType.CONFIG_UPDATED;
  authority: string;
  field: string;
  oldValue: any;
  newValue: any;
}

export interface EmergencyPauseToggledEvent extends BaseEvent {
  type: EventType.EMERGENCY_PAUSE_TOGGLED;
  authority: string;
  isPaused: boolean;
}

// ============================================================
// Union Type
// ============================================================

export type ProgramEvent =
  | MarketProposedEvent
  | MarketApprovedEvent
  | MarketActivatedEvent
  | MarketResolvedEvent
  | DisputeInitiatedEvent
  | MarketFinalizedEvent
  | MarketCancelledEvent
  | SharesBoughtEvent
  | SharesSoldEvent
  | WinningsClaimedEvent
  | LiquidityWithdrawnEvent
  | ProposalVoteSubmittedEvent
  | DisputeVoteSubmittedEvent
  | ConfigInitializedEvent
  | ConfigUpdatedEvent
  | EmergencyPauseToggledEvent;

// ============================================================
// Helius Webhook Payload
// ============================================================

export interface HeliusTransaction {
  accountData: Array<{
    account: string;
    nativeBalanceChange: number;
    tokenBalanceChanges: any[];
  }>;
  description: string;
  events: Record<string, any>;
  fee: number;
  feePayer: string;
  instructions: Array<{
    accounts: string[];
    data: string;
    programId: string;
    innerInstructions: any[];
  }>;
  nativeTransfers: any[];
  signature: string;
  slot: number;
  source: string;
  timestamp: number;
  tokenTransfers: any[];
  transactionError: string | null;
  type: string;
}

export type HeliusWebhookPayload = HeliusTransaction[];

// ============================================================
// Database Write Results
// ============================================================

export interface WriteResult {
  success: boolean;
  eventType: string;
  txSignature: string;
  processingTime: number;
  error?: string;
}

export interface BatchWriteResult {
  total: number;
  successful: number;
  failed: number;
  results: WriteResult[];
}
