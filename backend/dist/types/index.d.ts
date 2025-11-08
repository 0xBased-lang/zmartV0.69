/**
 * Market state enum (matches Solana program)
 */
export declare enum MarketState {
    PROPOSED = 0,
    APPROVED = 1,
    ACTIVE = 2,
    RESOLVING = 3,
    DISPUTED = 4,
    FINALIZED = 5
}
/**
 * Market data structure
 */
export interface Market {
    id: string;
    onChainAddress: string;
    question: string;
    description?: string;
    category: string;
    creatorWallet: string;
    state: MarketState;
    bParameter: string;
    sharesYes: string;
    sharesNo: string;
    currentPrice: string;
    totalVolume: string;
    createdAt: Date;
    updatedAt: Date;
}
/**
 * Trade data structure
 */
export interface Trade {
    id: string;
    marketId: string;
    userWallet: string;
    tradeType: "buy" | "sell";
    outcome: boolean;
    shares: string;
    cost: string;
    priceAfter: string;
    txSignature: string;
    createdAt: Date;
}
/**
 * Vote data structure
 */
export interface Vote {
    id: string;
    marketId: string;
    userWallet: string;
    voteType: "proposal" | "dispute";
    vote: boolean;
    txSignature: string;
    createdAt: Date;
}
/**
 * Discussion data structure
 */
export interface Discussion {
    id: string;
    marketId: string;
    userWallet: string;
    content: string;
    createdAt: Date;
    updatedAt: Date;
    deletedAt?: Date;
}
/**
 * IPFS snapshot data structure
 */
export interface IPFSSnapshot {
    id: string;
    marketId: string;
    ipfsHash: string;
    discussionsCount: number;
    createdAt: Date;
}
/**
 * Service health status
 */
export interface ServiceHealth {
    service: string;
    status: "healthy" | "degraded" | "unhealthy";
    message?: string;
    lastCheck: Date;
}
/**
 * API response wrapper
 */
export interface APIResponse<T = any> {
    success: boolean;
    data?: T;
    error?: {
        message: string;
        code?: string;
        details?: any;
    };
    meta?: {
        page?: number;
        limit?: number;
        total?: number;
    };
}
/**
 * WebSocket message types
 */
export type WebSocketMessage = {
    type: "subscribe";
    marketId: string;
} | {
    type: "unsubscribe";
    marketId: string;
} | {
    type: "market_state_change";
    marketId: string;
    oldState: MarketState;
    newState: MarketState;
    timestamp: string;
} | {
    type: "trade";
    marketId: string;
    tradeType: "buy" | "sell";
    outcome: boolean;
    shares: string;
    price: string;
    user: string;
    timestamp: string;
} | {
    type: "vote";
    marketId: string;
    voteType: "proposal" | "dispute";
    vote: boolean;
    user: string;
    timestamp: string;
};
declare const _default: {
    MarketState: typeof MarketState;
};
export default _default;
//# sourceMappingURL=index.d.ts.map