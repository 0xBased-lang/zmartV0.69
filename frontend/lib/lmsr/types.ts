/**
 * LMSR (Logarithmic Market Scoring Rule) Type Definitions
 *
 * Matches Rust program implementation with fixed-point arithmetic
 * See: docs/05_LMSR_MATHEMATICS.md for mathematical foundations
 */

/**
 * Fixed-point decimal places (matching Solana's lamports)
 * 1 SOL = 1_000_000_000 base units (9 decimals)
 */
export const DECIMALS = 9;
export const SCALE = 10n ** BigInt(DECIMALS);

/**
 * Fee structure (10% total)
 * - Protocol: 3%
 * - Creator: 2%
 * - Staker: 5%
 */
export const FEE_PROTOCOL_BPS = 300; // 3% in basis points
export const FEE_CREATOR_BPS = 200; // 2%
export const FEE_STAKER_BPS = 500; // 5%
export const FEE_TOTAL_BPS = 1000; // 10%
export const BPS_DENOMINATOR = 10_000; // Basis points denominator

/**
 * Trading constraints
 */
export const MIN_TRADE_SIZE = 0.01; // Minimum 0.01 SOL
export const MAX_TRADE_SIZE = 1_000_000; // Maximum 1M SOL
export const MAX_SHARES = 1_000_000_000; // Maximum shares per outcome
export const MIN_LIQUIDITY = 1; // Minimum liquidity parameter (b)
export const MAX_LIQUIDITY = 1_000_000; // Maximum liquidity parameter

/**
 * Price bounds
 */
export const MIN_PRICE = 0.01; // 1%
export const MAX_PRICE = 0.99; // 99%

/**
 * Market outcome
 */
export enum Outcome {
  YES = 'YES',
  NO = 'NO',
}

/**
 * Trade action
 */
export enum TradeAction {
  BUY = 'BUY',
  SELL = 'SELL',
}

/**
 * Market state for LMSR calculations
 */
export interface MarketState {
  /** Number of YES shares outstanding (fixed-point u64) */
  qYes: bigint;
  /** Number of NO shares outstanding (fixed-point u64) */
  qNo: bigint;
  /** Liquidity parameter 'b' (fixed-point u64) */
  liquidity: bigint;
}

/**
 * Trade parameters
 */
export interface TradeParams {
  /** Trade action (buy or sell) */
  action: TradeAction;
  /** Outcome to trade (YES or NO) */
  outcome: Outcome;
  /** Number of shares (fixed-point u64) */
  quantity: bigint;
  /** Current market state */
  marketState: MarketState;
}

/**
 * Trade result with cost breakdown
 */
export interface TradeResult {
  /** Shares to be received/sold */
  shares: bigint;
  /** Base cost (before fees for buy, before deducting fees for sell) */
  baseCost: bigint;
  /** Protocol fee (3%) */
  protocolFee: bigint;
  /** Creator fee (2%) */
  creatorFee: bigint;
  /** Staker fee (5%) */
  stakerFee: bigint;
  /** Total fees */
  totalFee: bigint;
  /** Final amount (cost + fees for buy, proceeds - fees for sell) */
  finalAmount: bigint;
  /** New price after trade (0-100) */
  newPrice: number;
  /** Price impact (% change) */
  priceImpact: number;
}

/**
 * Price calculation result
 */
export interface PriceResult {
  /** YES price (0-100) */
  yesPrice: number;
  /** NO price (0-100) */
  noPrice: number;
  /** Implied probability sum (should be ~100) */
  probabilitySum: number;
}

/**
 * LMSR calculation error
 */
export class LMSRError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LMSRError';
  }
}
