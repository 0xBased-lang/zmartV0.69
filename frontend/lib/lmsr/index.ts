/**
 * LMSR (Logarithmic Market Scoring Rule) Library
 *
 * Complete LMSR implementation for prediction market price calculation
 * matching Rust program with fixed-point arithmetic.
 *
 * Usage:
 * ```typescript
 * import { calculateTrade, toFixedPoint, Outcome, TradeAction } from '@/lib/lmsr';
 *
 * const marketState = {
 *   qYes: toFixedPoint(100),
 *   qNo: toFixedPoint(100),
 *   liquidity: toFixedPoint(1000)
 * };
 *
 * const result = calculateTrade({
 *   action: TradeAction.BUY,
 *   outcome: Outcome.YES,
 *   quantity: toFixedPoint(10),
 *   marketState
 * });
 *
 * console.log('Cost:', fromFixedPoint(result.finalAmount), 'SOL');
 * console.log('New Price:', result.newPrice, '%');
 * ```
 */

// Export all types
export type { MarketState, TradeParams, TradeResult, PriceResult } from './types';

export {
  DECIMALS,
  SCALE,
  FEE_PROTOCOL_BPS,
  FEE_CREATOR_BPS,
  FEE_STAKER_BPS,
  FEE_TOTAL_BPS,
  BPS_DENOMINATOR,
  MIN_TRADE_SIZE,
  MAX_TRADE_SIZE,
  MAX_SHARES,
  MIN_LIQUIDITY,
  MAX_LIQUIDITY,
  MIN_PRICE,
  MAX_PRICE,
  Outcome,
  TradeAction,
  LMSRError,
} from './types';

// Export fixed-point utilities
export {
  toFixedPoint,
  fromFixedPoint,
  formatFixedPoint,
  mulFixedPoint,
  divFixedPoint,
  lnFixedPoint,
  expFixedPoint,
  safeAdd,
  safeSub,
  safeMul,
  calculateBps,
  roundFixedPoint,
  maxFixedPoint,
  minFixedPoint,
  absFixedPoint,
} from './fixed-point';

// Export calculator functions
export {
  calculateCostFunction,
  calculateBuyCost,
  calculateSellProceeds,
  calculatePrices,
  calculateFees,
  calculatePriceImpact,
  calculateTrade,
  validateMarketState,
  validateTradeParams,
} from './calculator';
