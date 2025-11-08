/**
 * Event Types
 *
 * TypeScript definitions for all Solana program events.
 */

export type MarketState = 'PROPOSED' | 'APPROVED' | 'ACTIVE' | 'RESOLVING' | 'DISPUTED' | 'FINALIZED';
export type Outcome = 'YES' | 'NO' | 'INVALID';
export type TradeSide = 'BUY' | 'SELL';

/**
 * Base event interface
 */
export interface BaseEvent {
  txSignature: string;
  slot: number;
  timestamp: number;
  blockTime: number;
}

/**
 * MarketCreated event
 */
export interface MarketCreatedEvent extends BaseEvent {
  type: 'MarketCreated';
  marketPubkey: string;
  creator: string;
  question: string;
  description?: string;
  liquidity: string;  // bigint as string
  initialSharesYes: string;
  initialSharesNo: string;
}

/**
 * TradeExecuted event
 */
export interface TradeExecutedEvent extends BaseEvent {
  type: 'TradeExecuted';
  marketPubkey: string;
  trader: string;
  side: TradeSide;
  outcome: Outcome;
  shares: string;
  cost: string;
  priceBefore: string;
  priceAfter: string;
  feeProtocol: string;
  feeCreator: string;
  feeStakers: string;
}

/**
 * MarketStateChanged event
 */
export interface MarketStateChangedEvent extends BaseEvent {
  type: 'MarketStateChanged';
  marketPubkey: string;
  oldState: MarketState;
  newState: MarketState;
}

/**
 * MarketResolved event
 */
export interface MarketResolvedEvent extends BaseEvent {
  type: 'MarketResolved';
  marketPubkey: string;
  resolver: string;
  outcome: Outcome;
  resolvingAt: number;
  disputeDeadline: number;
}

/**
 * DisputeRaised event
 */
export interface DisputeRaisedEvent extends BaseEvent {
  type: 'DisputeRaised';
  marketPubkey: string;
  disputer: string;
  originalOutcome: Outcome;
}

/**
 * DisputeResolved event
 */
export interface DisputeResolvedEvent extends BaseEvent {
  type: 'DisputeResolved';
  marketPubkey: string;
  outcomeChanged: boolean;
  newOutcome?: Outcome;
  supportVotes: number;
  rejectVotes: number;
}

/**
 * VoteSubmitted event (for on-chain votes after aggregation)
 */
export interface VoteSubmittedEvent extends BaseEvent {
  type: 'VoteSubmitted';
  voteType: 'PROPOSAL' | 'DISPUTE';
  proposalId?: string;
  marketPubkey?: string;
  voter: string;
  choice: string;
  weight: number;
}

/**
 * ProposalApproved event
 */
export interface ProposalApprovedEvent extends BaseEvent {
  type: 'ProposalApproved';
  proposalId: string;
  likes: number;
  dislikes: number;
  totalVotes: number;
}

/**
 * WinningsClaimed event
 */
export interface WinningsClaimedEvent extends BaseEvent {
  type: 'WinningsClaimed';
  marketPubkey: string;
  user: string;
  amount: string;
  sharesYes: string;
  sharesNo: string;
}

/**
 * Union type of all events
 */
export type ProgramEvent =
  | MarketCreatedEvent
  | TradeExecutedEvent
  | MarketStateChangedEvent
  | MarketResolvedEvent
  | DisputeRaisedEvent
  | DisputeResolvedEvent
  | VoteSubmittedEvent
  | ProposalApprovedEvent
  | WinningsClaimedEvent;

/**
 * Helius webhook payload
 */
export interface HeliusWebhookPayload {
  accountData: Array<{
    account: string;
    nativeBalanceChange: number;
    tokenBalanceChanges: any[];
  }>;
  description: string;
  events: {
    nft?: any;
    swap?: any;
    compressed?: any;
  };
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
  transactionError: any;
  type: string;
}
