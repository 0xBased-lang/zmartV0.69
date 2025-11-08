export declare enum EventType {
    MARKET_PROPOSED = "MarketProposed",
    MARKET_APPROVED = "MarketApproved",
    MARKET_ACTIVATED = "MarketActivated",
    MARKET_RESOLVED = "MarketResolved",
    DISPUTE_INITIATED = "DisputeInitiated",
    MARKET_FINALIZED = "MarketFinalized",
    MARKET_CANCELLED = "MarketCancelled",
    SHARES_BOUGHT = "SharesBought",
    SHARES_SOLD = "SharesSold",
    WINNINGS_CLAIMED = "WinningsClaimed",
    LIQUIDITY_WITHDRAWN = "LiquidityWithdrawn",
    PROPOSAL_VOTE_SUBMITTED = "ProposalVoteSubmitted",
    DISPUTE_VOTE_SUBMITTED = "DisputeVoteSubmitted",
    CONFIG_INITIALIZED = "ConfigInitialized",
    CONFIG_UPDATED = "ConfigUpdated",
    EMERGENCY_PAUSE_TOGGLED = "EmergencyPauseToggled"
}
export interface BaseEvent {
    type: EventType;
    timestamp: number;
    txSignature: string;
    blockTime: number;
    slot: number;
}
export interface MarketProposedEvent extends BaseEvent {
    type: EventType.MARKET_PROPOSED;
    marketId: string;
    creator: string;
    question: string;
    category: string;
    bParameter: string;
    initialLiquidity: string;
}
export interface MarketApprovedEvent extends BaseEvent {
    type: EventType.MARKET_APPROVED;
    marketId: string;
    approvedBy: string;
    proposalLikes: number;
    proposalDislikes: number;
    approvalRate: number;
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
    proposedOutcome: boolean;
    ipfsEvidenceHash: string | null;
}
export interface DisputeInitiatedEvent extends BaseEvent {
    type: EventType.DISPUTE_INITIATED;
    marketId: string;
    disputeInitiator: string;
    originalOutcome: boolean;
    disputePeriodEnd: number;
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
export interface SharesBoughtEvent extends BaseEvent {
    type: EventType.SHARES_BOUGHT;
    marketId: string;
    user: string;
    outcome: boolean;
    shares: string;
    cost: string;
    newPrice: string;
}
export interface SharesSoldEvent extends BaseEvent {
    type: EventType.SHARES_SOLD;
    marketId: string;
    user: string;
    outcome: boolean;
    shares: string;
    proceeds: string;
    newPrice: string;
}
export interface WinningsClaimedEvent extends BaseEvent {
    type: EventType.WINNINGS_CLAIMED;
    marketId: string;
    user: string;
    payout: string;
    shares: string;
}
export interface LiquidityWithdrawnEvent extends BaseEvent {
    type: EventType.LIQUIDITY_WITHDRAWN;
    marketId: string;
    creator: string;
    amount: string;
}
export interface ProposalVoteSubmittedEvent extends BaseEvent {
    type: EventType.PROPOSAL_VOTE_SUBMITTED;
    marketAddress: string;
    voter: string;
    vote: boolean;
    weight: number;
}
export interface DisputeVoteSubmittedEvent extends BaseEvent {
    type: EventType.DISPUTE_VOTE_SUBMITTED;
    marketAddress: string;
    voter: string;
    vote: boolean;
    weight: number;
    disputeRound: number;
}
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
export type ProgramEvent = MarketProposedEvent | MarketApprovedEvent | MarketActivatedEvent | MarketResolvedEvent | DisputeInitiatedEvent | MarketFinalizedEvent | MarketCancelledEvent | SharesBoughtEvent | SharesSoldEvent | WinningsClaimedEvent | LiquidityWithdrawnEvent | ProposalVoteSubmittedEvent | DisputeVoteSubmittedEvent | ConfigInitializedEvent | ConfigUpdatedEvent | EmergencyPauseToggledEvent;
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
//# sourceMappingURL=events.d.ts.map