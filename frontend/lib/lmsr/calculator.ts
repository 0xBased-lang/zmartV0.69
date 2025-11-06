/**
 * LMSR (Logarithmic Market Scoring Rule) Calculator
 *
 * Implements cost function, price calculation, and fee distribution
 * exactly matching the Rust program implementation.
 *
 * Mathematical foundations:
 * - Cost function: C(q) = b * ln(e^(q_yes/b) + e^(q_no/b))
 * - Buy cost: Cost = C(q + Δq) - C(q)
 * - Sell proceeds: Proceeds = C(q) - C(q - Δq)
 * - Price: P(YES) = e^(q_yes/b) / (e^(q_yes/b) + e^(q_no/b))
 *
 * See: docs/05_LMSR_MATHEMATICS.md for detailed mathematics
 */

import {
  SCALE,
  FEE_PROTOCOL_BPS,
  FEE_CREATOR_BPS,
  FEE_STAKER_BPS,
  FEE_TOTAL_BPS,
  MIN_PRICE,
  MAX_PRICE,
  Outcome,
  TradeAction,
  type MarketState,
  type TradeParams,
  type TradeResult,
  type PriceResult,
  LMSRError,
} from './types';

import {
  toFixedPoint,
  fromFixedPoint,
  mulFixedPoint,
  divFixedPoint,
  lnFixedPoint,
  expFixedPoint,
  safeAdd,
  safeSub,
  calculateBps,
} from './fixed-point';

/**
 * Calculate LMSR cost function: C(q) = b * ln(e^(q_yes/b) + e^(q_no/b))
 *
 * This is the core LMSR formula that determines the cost of outstanding shares.
 *
 * @param qYes - Number of YES shares outstanding
 * @param qNo - Number of NO shares outstanding
 * @param liquidity - Liquidity parameter 'b'
 * @returns Cost function value
 */
export function calculateCostFunction(
  qYes: bigint,
  qNo: bigint,
  liquidity: bigint
): bigint {
  if (liquidity <= 0n) {
    throw new LMSRError('Liquidity must be positive');
  }

  // Calculate q_yes / b
  const qYesOverB = divFixedPoint(qYes, liquidity);

  // Calculate q_no / b
  const qNoOverB = divFixedPoint(qNo, liquidity);

  // Calculate e^(q_yes/b)
  const expYes = expFixedPoint(qYesOverB);

  // Calculate e^(q_no/b)
  const expNo = expFixedPoint(qNoOverB);

  // Sum: e^(q_yes/b) + e^(q_no/b)
  const sum = safeAdd(expYes, expNo);

  // Calculate ln(sum)
  const lnSum = lnFixedPoint(sum);

  // Multiply by b: b * ln(sum)
  const cost = mulFixedPoint(liquidity, lnSum);

  return cost;
}

/**
 * Calculate buy cost for purchasing shares
 *
 * Cost = C(q + Δq) - C(q)
 *
 * @param quantity - Number of shares to buy
 * @param outcome - Outcome to buy (YES or NO)
 * @param marketState - Current market state
 * @returns Base cost (before fees)
 */
export function calculateBuyCost(
  quantity: bigint,
  outcome: Outcome,
  marketState: MarketState
): bigint {
  if (quantity <= 0n) {
    throw new LMSRError('Quantity must be positive');
  }

  const { qYes, qNo, liquidity } = marketState;

  // Calculate current cost: C(q_yes, q_no)
  const currentCost = calculateCostFunction(qYes, qNo, liquidity);

  // Calculate new quantities after purchase
  const newQYes = outcome === Outcome.YES ? safeAdd(qYes, quantity) : qYes;
  const newQNo = outcome === Outcome.NO ? safeAdd(qNo, quantity) : qNo;

  // Calculate new cost: C(q_yes + Δq, q_no) or C(q_yes, q_no + Δq)
  const newCost = calculateCostFunction(newQYes, newQNo, liquidity);

  // Buy cost = new cost - current cost
  const cost = safeSub(newCost, currentCost);

  if (cost <= 0n) {
    throw new LMSRError('Buy cost must be positive');
  }

  return cost;
}

/**
 * Calculate sell proceeds for selling shares
 *
 * Proceeds = C(q) - C(q - Δq)
 *
 * @param quantity - Number of shares to sell
 * @param outcome - Outcome to sell (YES or NO)
 * @param marketState - Current market state
 * @returns Base proceeds (before fees)
 */
export function calculateSellProceeds(
  quantity: bigint,
  outcome: Outcome,
  marketState: MarketState
): bigint {
  if (quantity <= 0n) {
    throw new LMSRError('Quantity must be positive');
  }

  const { qYes, qNo, liquidity } = marketState;

  // Check user has enough shares to sell
  const currentQuantity = outcome === Outcome.YES ? qYes : qNo;
  if (quantity > currentQuantity) {
    throw new LMSRError('Insufficient shares to sell');
  }

  // Calculate current cost: C(q_yes, q_no)
  const currentCost = calculateCostFunction(qYes, qNo, liquidity);

  // Calculate new quantities after sale
  const newQYes = outcome === Outcome.YES ? safeSub(qYes, quantity) : qYes;
  const newQNo = outcome === Outcome.NO ? safeSub(qNo, quantity) : qNo;

  // Calculate new cost: C(q_yes - Δq, q_no) or C(q_yes, q_no - Δq)
  const newCost = calculateCostFunction(newQYes, newQNo, liquidity);

  // Sell proceeds = current cost - new cost
  const proceeds = safeSub(currentCost, newCost);

  if (proceeds <= 0n) {
    throw new LMSRError('Sell proceeds must be positive');
  }

  return proceeds;
}

/**
 * Calculate current market prices for YES and NO outcomes
 *
 * Price formula: P(YES) = e^(q_yes/b) / (e^(q_yes/b) + e^(q_no/b))
 *                P(NO) = e^(q_no/b) / (e^(q_yes/b) + e^(q_no/b))
 *
 * Prices are returned as percentages (0-100)
 *
 * @param marketState - Current market state
 * @returns Price result with YES and NO prices
 */
export function calculatePrices(marketState: MarketState): PriceResult {
  const { qYes, qNo, liquidity } = marketState;

  if (liquidity <= 0n) {
    throw new LMSRError('Liquidity must be positive');
  }

  // Calculate q_yes / b
  const qYesOverB = divFixedPoint(qYes, liquidity);

  // Calculate q_no / b
  const qNoOverB = divFixedPoint(qNo, liquidity);

  // Calculate e^(q_yes/b)
  const expYes = expFixedPoint(qYesOverB);

  // Calculate e^(q_no/b)
  const expNo = expFixedPoint(qNoOverB);

  // Sum: e^(q_yes/b) + e^(q_no/b)
  const sum = safeAdd(expYes, expNo);

  // P(YES) = e^(q_yes/b) / sum
  const yesPrice = divFixedPoint(expYes, sum);

  // P(NO) = e^(q_no/b) / sum
  const noPrice = divFixedPoint(expNo, sum);

  // Convert to percentages (0-100)
  const yesPricePercent = fromFixedPoint(yesPrice) * 100;
  const noPricePercent = fromFixedPoint(noPrice) * 100;

  // Clamp to valid range (1% - 99%)
  const clampedYesPrice = Math.max(MIN_PRICE * 100, Math.min(MAX_PRICE * 100, yesPricePercent));
  const clampedNoPrice = Math.max(MIN_PRICE * 100, Math.min(MAX_PRICE * 100, noPricePercent));

  return {
    yesPrice: clampedYesPrice,
    noPrice: clampedNoPrice,
    probabilitySum: yesPricePercent + noPricePercent,
  };
}

/**
 * Calculate fee breakdown for a trade
 *
 * Fee structure:
 * - Protocol: 3% (300 bps)
 * - Creator: 2% (200 bps)
 * - Staker: 5% (500 bps)
 * - Total: 10% (1000 bps)
 *
 * @param baseCost - Base cost before fees
 * @returns Fee breakdown
 */
export function calculateFees(baseCost: bigint): {
  protocolFee: bigint;
  creatorFee: bigint;
  stakerFee: bigint;
  totalFee: bigint;
} {
  const protocolFee = calculateBps(baseCost, FEE_PROTOCOL_BPS);
  const creatorFee = calculateBps(baseCost, FEE_CREATOR_BPS);
  const stakerFee = calculateBps(baseCost, FEE_STAKER_BPS);
  const totalFee = safeAdd(safeAdd(protocolFee, creatorFee), stakerFee);

  return {
    protocolFee,
    creatorFee,
    stakerFee,
    totalFee,
  };
}

/**
 * Calculate price impact of a trade
 *
 * Price impact = (new price - current price) / current price
 *
 * @param currentPrice - Current price (0-100)
 * @param newPrice - New price after trade (0-100)
 * @returns Price impact as percentage
 */
export function calculatePriceImpact(currentPrice: number, newPrice: number): number {
  if (currentPrice === 0) {
    throw new LMSRError('Current price cannot be zero');
  }

  return ((newPrice - currentPrice) / currentPrice) * 100;
}

/**
 * Execute complete trade calculation with all details
 *
 * Returns complete trade result including:
 * - Shares to be received/sold
 * - Base cost/proceeds
 * - Fee breakdown
 * - Final amount (cost + fees or proceeds - fees)
 * - New price after trade
 * - Price impact
 *
 * @param params - Trade parameters
 * @returns Complete trade result
 */
export function calculateTrade(params: TradeParams): TradeResult {
  const { action, outcome, quantity, marketState } = params;

  // Calculate current prices
  const currentPrices = calculatePrices(marketState);
  const currentPrice = outcome === Outcome.YES ? currentPrices.yesPrice : currentPrices.noPrice;

  // Calculate base cost or proceeds
  let baseCost: bigint;
  if (action === TradeAction.BUY) {
    baseCost = calculateBuyCost(quantity, outcome, marketState);
  } else {
    baseCost = calculateSellProceeds(quantity, outcome, marketState);
  }

  // Calculate fees
  const fees = calculateFees(baseCost);

  // Calculate final amount
  let finalAmount: bigint;
  if (action === TradeAction.BUY) {
    // For buy: final amount = base cost + fees
    finalAmount = safeAdd(baseCost, fees.totalFee);
  } else {
    // For sell: final amount = base proceeds - fees
    finalAmount = safeSub(baseCost, fees.totalFee);
  }

  // Calculate new market state after trade
  const { qYes, qNo } = marketState;
  const newQYes =
    action === TradeAction.BUY && outcome === Outcome.YES
      ? safeAdd(qYes, quantity)
      : action === TradeAction.SELL && outcome === Outcome.YES
        ? safeSub(qYes, quantity)
        : qYes;

  const newQNo =
    action === TradeAction.BUY && outcome === Outcome.NO
      ? safeAdd(qNo, quantity)
      : action === TradeAction.SELL && outcome === Outcome.NO
        ? safeSub(qNo, quantity)
        : qNo;

  const newMarketState: MarketState = {
    qYes: newQYes,
    qNo: newQNo,
    liquidity: marketState.liquidity,
  };

  // Calculate new prices
  const newPrices = calculatePrices(newMarketState);
  const newPrice = outcome === Outcome.YES ? newPrices.yesPrice : newPrices.noPrice;

  // Calculate price impact
  const priceImpact = calculatePriceImpact(currentPrice, newPrice);

  return {
    shares: quantity,
    baseCost,
    protocolFee: fees.protocolFee,
    creatorFee: fees.creatorFee,
    stakerFee: fees.stakerFee,
    totalFee: fees.totalFee,
    finalAmount,
    newPrice,
    priceImpact,
  };
}

/**
 * Validate market state
 *
 * Checks:
 * - All values are non-negative
 * - Liquidity is positive
 * - Shares are within bounds
 *
 * @param marketState - Market state to validate
 * @throws LMSRError if validation fails
 */
export function validateMarketState(marketState: MarketState): void {
  const { qYes, qNo, liquidity } = marketState;

  if (qYes < 0n) {
    throw new LMSRError('YES shares cannot be negative');
  }

  if (qNo < 0n) {
    throw new LMSRError('NO shares cannot be negative');
  }

  if (liquidity <= 0n) {
    throw new LMSRError('Liquidity must be positive');
  }
}

/**
 * Validate trade parameters
 *
 * Checks:
 * - Quantity is positive
 * - Market state is valid
 * - Action and outcome are valid
 *
 * @param params - Trade parameters to validate
 * @throws LMSRError if validation fails
 */
export function validateTradeParams(params: TradeParams): void {
  const { quantity, marketState } = params;

  if (quantity <= 0n) {
    throw new LMSRError('Quantity must be positive');
  }

  validateMarketState(marketState);
}
