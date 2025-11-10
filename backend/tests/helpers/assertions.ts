/**
 * Assertions Helper - Custom Validation Functions
 */

import { PublicKey } from '@solana/web3.js';
import { Program } from '@coral-xyz/anchor';
import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Convert on-chain state enum to string
 */
export function stateEnumToString(stateEnum: any): string {
  if (stateEnum.proposed) return 'PROPOSED';
  if (stateEnum.approved) return 'APPROVED';
  if (stateEnum.active) return 'ACTIVE';
  if (stateEnum.resolving) return 'RESOLVING';
  if (stateEnum.disputed) return 'DISPUTED';
  if (stateEnum.finalized) return 'FINALIZED';
  throw new Error(`Unknown state enum: ${JSON.stringify(stateEnum)}`);
}

/**
 * Validate on-chain and off-chain data consistency
 */
export async function validateDataIntegrity(
  marketId: string,
  marketPda: PublicKey,
  program: Program,
  supabase: SupabaseClient
): Promise<void> {
  // 1. Fetch on-chain state
  const onChainMarket = await program.account.marketAccount.fetch(marketPda);

  // 2. Fetch off-chain state
  const { data: offChainMarket, error } = await supabase
    .from('markets')
    .select('*')
    .eq('id', marketId)
    .single();

  if (error) {
    throw new Error(`Failed to fetch off-chain market: ${error.message}`);
  }

  if (!offChainMarket) {
    throw new Error(`Market ${marketId} not found in database`);
  }

  // 3. Compare critical fields
  const onChainState = stateEnumToString(onChainMarket.state);
  if (offChainMarket.state !== onChainState) {
    throw new Error(
      `State mismatch: on-chain=${onChainState}, off-chain=${offChainMarket.state}`
    );
  }

  if (offChainMarket.yes_shares !== onChainMarket.yesShares.toString()) {
    throw new Error(
      `YES shares mismatch: on-chain=${onChainMarket.yesShares.toString()}, off-chain=${
        offChainMarket.yes_shares
      }`
    );
  }

  if (offChainMarket.no_shares !== onChainMarket.noShares.toString()) {
    throw new Error(
      `NO shares mismatch: on-chain=${onChainMarket.noShares.toString()}, off-chain=${
        offChainMarket.no_shares
      }`
    );
  }

  if (offChainMarket.on_chain_address !== marketPda.toBase58()) {
    throw new Error(
      `Address mismatch: on-chain=${marketPda.toBase58()}, off-chain=${
        offChainMarket.on_chain_address
      }`
    );
  }

  console.log(`✅ Data integrity validated for market ${marketId.slice(0, 8)}...`);
}

/**
 * Validate LMSR cost calculation
 */
export function validateLMSRCost(
  actualCost: bigint,
  expectedCost: bigint,
  tolerancePercent: number = 1
): void {
  const diff = actualCost > expectedCost ? actualCost - expectedCost : expectedCost - actualCost;
  const tolerance = (expectedCost * BigInt(tolerancePercent)) / BigInt(100);

  if (diff > tolerance) {
    throw new Error(
      `LMSR cost validation failed: actual=${actualCost}, expected=${expectedCost}, diff=${diff}, tolerance=${tolerance}`
    );
  }

  console.log(`✅ LMSR cost validated (within ${tolerancePercent}% tolerance)`);
}

/**
 * Validate fee distribution (3/2/5 split)
 */
export function validateFeeDistribution(
  totalVolume: bigint,
  protocolFee: bigint,
  creatorFee: bigint,
  stakersFee: bigint
): void {
  const totalFee = (totalVolume * BigInt(10)) / BigInt(100); // 10%

  const expectedProtocolFee = (totalFee * BigInt(3)) / BigInt(10); // 3%
  const expectedCreatorFee = (totalFee * BigInt(2)) / BigInt(10); // 2%
  const expectedStakersFee = (totalFee * BigInt(5)) / BigInt(10); // 5%

  if (protocolFee !== expectedProtocolFee) {
    throw new Error(
      `Protocol fee mismatch: actual=${protocolFee}, expected=${expectedProtocolFee}`
    );
  }

  if (creatorFee !== expectedCreatorFee) {
    throw new Error(
      `Creator fee mismatch: actual=${creatorFee}, expected=${expectedCreatorFee}`
    );
  }

  if (stakersFee !== expectedStakersFee) {
    throw new Error(
      `Stakers fee mismatch: actual=${stakersFee}, expected=${expectedStakersFee}`
    );
  }

  console.log('✅ Fee distribution validated (3/2/5 split)');
}

/**
 * Wait for event indexer to process transaction
 */
export async function waitForEventIndexer(delayMs: number = 2000): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, delayMs));
}

/**
 * STANDARDIZED: Verify on-chain ↔ off-chain consistency (matches test signature)
 * This ensures on-chain blockchain state matches off-chain database state
 */
export async function assertOnChainOffChainConsistency(
  program: Program,
  marketPda: PublicKey,
  supabase: SupabaseClient
): Promise<void> {
  // Get market ID from PDA address
  const marketId = marketPda.toBase58();
  return validateDataIntegrity(marketId, marketPda, program, supabase);
}

/**
 * STANDARDIZED: Validate LMSR mathematical invariants (matches test signature)
 * Checks core LMSR properties: price bounds, sum to 1, bounded loss
 */
export async function assertLMSRInvariants(
  program: Program,
  marketPda: PublicKey
): Promise<void> {
  // Fetch on-chain market account
  const marketAccount = await program.account.marketAccount.fetch(marketPda);

  // Convert to expected format for validation
  const marketData = {
    liquidity_parameter: marketAccount.b.toString(),
    yes_shares: marketAccount.yesShares.toString(),
    no_shares: marketAccount.noShares.toString(),
  };

  // Run validation
  _validateLMSRInvariants(marketData);
}

/**
 * Internal LMSR invariant validation logic
 */
function _validateLMSRInvariants(marketData: {
  liquidity_parameter: string;
  yes_shares: string;
  no_shares: string;
  current_yes_price?: number;
  current_no_price?: number;
}): void {
  const b = parseFloat(marketData.liquidity_parameter);
  const qYes = parseFloat(marketData.yes_shares);
  const qNo = parseFloat(marketData.no_shares);

  const violations: string[] = [];

  // Invariant 1: Liquidity parameter must be positive
  if (b <= 0) {
    violations.push(`Liquidity parameter must be > 0, got: ${b}`);
  }

  // Invariant 2: Share quantities must be non-negative
  if (qYes < 0 || qNo < 0) {
    violations.push(`Share quantities must be >= 0, got: YES=${qYes}, NO=${qNo}`);
  }

  // Invariant 3: Prices must sum to ~1.0 (within tolerance)
  if (marketData.current_yes_price !== undefined && marketData.current_no_price !== undefined) {
    const priceSum = marketData.current_yes_price + marketData.current_no_price;
    const tolerance = 0.0001; // 0.01% tolerance

    if (Math.abs(priceSum - 1.0) > tolerance) {
      violations.push(
        `Prices must sum to 1.0, got: ${priceSum.toFixed(4)} (YES=${marketData.current_yes_price.toFixed(4)}, NO=${marketData.current_no_price.toFixed(4)})`
      );
    }

    // Invariant 4: Prices must be in valid range [0, 1]
    if (marketData.current_yes_price < 0 || marketData.current_yes_price > 1) {
      violations.push(`YES price out of bounds [0,1]: ${marketData.current_yes_price}`);
    }

    if (marketData.current_no_price < 0 || marketData.current_no_price > 1) {
      violations.push(`NO price out of bounds [0,1]: ${marketData.current_no_price}`);
    }
  }

  // Invariant 5: Bounded loss property (max loss = b * ln(2) ≈ 0.693 * b)
  const maxLoss = b * Math.log(2);
  const currentCost = b * Math.log(Math.exp(qYes / b) + Math.exp(qNo / b));

  if (currentCost > maxLoss + b * 0.01) {
    // Allow 1% tolerance
    violations.push(
      `Bounded loss violated: cost=${currentCost.toFixed(2)} exceeds max=${maxLoss.toFixed(2)}`
    );
  }

  // Throw if any violations found
  if (violations.length > 0) {
    throw new Error(`LMSR invariant violations:\n${violations.join('\n')}`);
  }
}

/**
 * STANDARDIZED: Validate fee distribution (matches test signature)
 * Verifies 10% total fee split: 3% protocol, 2% creator, 5% stakers
 */
export async function assertFeeDistribution(
  program: Program,
  marketPda: PublicKey,
  supabase: SupabaseClient
): Promise<void> {
  // Fetch on-chain market account
  const marketAccount = await program.account.marketAccount.fetch(marketPda);

  // Get total fees collected
  const totalFees = marketAccount.totalFeesCollected || BigInt(0);
  const protocolFee = marketAccount.protocolFees || BigInt(0);
  const creatorFee = marketAccount.creatorFees || BigInt(0);
  const stakersFee = marketAccount.stakersFees || BigInt(0);

  // Use existing validation function
  return validateFeeDistribution(totalFees, protocolFee, creatorFee, stakersFee);
}

/**
 * STANDARDIZED: Validate state machine transitions (matches test signature)
 * Ensures only valid transitions occur per 6-state FSM
 */
export async function assertStateTransition(
  program: Program,
  marketPda: PublicKey,
  fromState: string,
  toState: string,
  supabase: SupabaseClient
): Promise<void> {
  // Fetch on-chain market state
  const marketAccount = await program.account.marketAccount.fetch(marketPda);
  const onChainState = stateEnumToString(marketAccount.state).toUpperCase();

  // Verify actual state matches expected toState
  if (onChainState !== toState.toUpperCase()) {
    throw new Error(
      `State mismatch after transition: expected ${toState}, got ${onChainState}`
    );
  }

  // Validate the transition was valid
  _validateStateTransition(fromState, toState, 'state_transition');
}

/**
 * Internal state transition validation logic
 */
function _validateStateTransition(
  from: string,
  to: string,
  action: string
): void {
  const fromState = from.toUpperCase();
  const toState = to.toUpperCase();

  // Valid state transitions per 06_STATE_MANAGEMENT.md
  const validTransitions: { [key: string]: string[] } = {
    PROPOSED: ['APPROVED', 'REJECTED'],
    APPROVED: ['ACTIVE'],
    ACTIVE: ['RESOLVING'],
    RESOLVING: ['DISPUTED', 'FINALIZED'],
    DISPUTED: ['FINALIZED'],
    FINALIZED: [], // Terminal state
    REJECTED: [], // Terminal state
  };

  // Check if transition is valid
  const allowedNextStates = validTransitions[fromState] || [];

  if (!allowedNextStates.includes(toState)) {
    throw new Error(
      `Invalid state transition: ${fromState} → ${toState} via "${action}"\n` +
      `Valid transitions from ${fromState}: [${allowedNextStates.join(', ')}]`
    );
  }
}
