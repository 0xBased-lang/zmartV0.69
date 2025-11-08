/**
 * Solana Transaction Utilities for ZMART V0.69
 *
 * Builds and executes transactions for the ZMART prediction market program.
 *
 * Key Features:
 * - PDA derivation for market, position, and global config accounts
 * - Transaction builders for buy_shares, sell_shares, claim_winnings
 * - Compute budget management (200,000 units for LMSR calculations)
 * - Type-safe with Anchor IDL
 * - Error handling with user-friendly messages
 *
 * @module lib/solana/transactions
 */

import {
  PublicKey,
  Transaction,
  SystemProgram,
  ComputeBudgetProgram,
  Connection,
} from '@solana/web3.js';
import { AnchorProvider, Program, BN } from '@coral-xyz/anchor';
import { PROGRAM_ID } from '@/config/constants';
import type { ZmartCore } from '@/types/zmart_core';
import idl from '@/../target/idl/zmart_core.json';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Parameters for buying shares
 */
export interface BuySharesParams {
  /** Market ID (hex string without 0x prefix) */
  marketId: string;
  /** true = YES, false = NO */
  outcome: boolean;
  /** Maximum willing to pay in lamports (before fees, slippage protection) */
  targetCost: bigint;
}

/**
 * Parameters for selling shares
 */
export interface SellSharesParams {
  /** Market ID (hex string without 0x prefix) */
  marketId: string;
  /** true = YES, false = NO */
  outcome: boolean;
  /** Shares to sell (fixed-point, 9 decimals) */
  sharesToSell: bigint;
  /** Minimum proceeds in lamports (slippage protection) */
  minProceeds: bigint;
}

/**
 * Parameters for claiming winnings
 */
export interface ClaimWinningsParams {
  /** Market ID (hex string without 0x prefix) */
  marketId: string;
}

/**
 * Transaction build result
 */
export interface TransactionBuildResult {
  /** Built transaction ready for signing */
  transaction: Transaction;
  /** Market PDA used in transaction */
  marketPDA: PublicKey;
  /** Position PDA used in transaction */
  positionPDA: PublicKey;
}

// ============================================================================
// Constants
// ============================================================================

/** Compute units needed for LMSR calculations (tested in program) */
const COMPUTE_UNITS = 200_000;

/** Priority fee in micro-lamports (optional, for faster confirmation) */
const PRIORITY_FEE_MICRO_LAMPORTS = 1;

/** PDA seed constants from IDL */
const MARKET_SEED = 'market';
const POSITION_SEED = 'position';
const GLOBAL_CONFIG_SEED = 'global-config';

// ============================================================================
// PDA Derivation Functions
// ============================================================================

/**
 * Derive Market PDA
 *
 * Seeds: ["market", market_id]
 *
 * @param programId - ZMART program ID
 * @param marketId - Market ID (hex string without 0x prefix)
 * @returns [PDA address, bump seed]
 */
export function deriveMarketPDA(
  programId: PublicKey,
  marketId: string
): [PublicKey, number] {
  // Convert market ID to buffer (hex string → bytes)
  const marketIdBuffer = Buffer.from(marketId, 'hex');

  const [pda, bump] = PublicKey.findProgramAddressSync(
    [Buffer.from(MARKET_SEED), marketIdBuffer],
    programId
  );

  return [pda, bump];
}

/**
 * Derive Position PDA
 *
 * Seeds: ["position", market_key, user_key]
 *
 * @param programId - ZMART program ID
 * @param market - Market account public key
 * @param user - User wallet public key
 * @returns [PDA address, bump seed]
 */
export function derivePositionPDA(
  programId: PublicKey,
  market: PublicKey,
  user: PublicKey
): [PublicKey, number] {
  const [pda, bump] = PublicKey.findProgramAddressSync(
    [Buffer.from(POSITION_SEED), market.toBuffer(), user.toBuffer()],
    programId
  );

  return [pda, bump];
}

/**
 * Derive Global Config PDA
 *
 * Seeds: ["global-config"]
 *
 * @param programId - ZMART program ID
 * @returns [PDA address, bump seed]
 */
export function deriveGlobalConfigPDA(programId: PublicKey): [PublicKey, number] {
  const [pda, bump] = PublicKey.findProgramAddressSync(
    [Buffer.from(GLOBAL_CONFIG_SEED)],
    programId
  );

  return [pda, bump];
}

// ============================================================================
// Program Instance Helper
// ============================================================================

/**
 * Get Anchor program instance
 *
 * @param connection - Solana connection
 * @param wallet - Wallet adapter (must have signTransaction method)
 * @returns Anchor program instance
 */
export function getProgram(
  connection: Connection,
  wallet: {
    publicKey: PublicKey;
    signTransaction: <T extends Transaction>(tx: T) => Promise<T>;
    signAllTransactions?: <T extends Transaction>(txs: T[]) => Promise<T[]>;
  }
): Program<ZmartCore> {
  // Create Anchor provider from wallet adapter
  const provider = new AnchorProvider(
    connection,
    {
      publicKey: wallet.publicKey,
      signTransaction: wallet.signTransaction,
      signAllTransactions: wallet.signAllTransactions || (async () => {
        throw new Error('Batch signing not supported');
      }),
    },
    {
      commitment: 'confirmed',
      preflightCommitment: 'confirmed',
    }
  );

  // Create program instance
  const programId = new PublicKey(PROGRAM_ID);
  const program = new Program<ZmartCore>(idl as any, programId, provider);

  return program;
}

// ============================================================================
// Transaction Builders
// ============================================================================

/**
 * Build Buy Shares Transaction
 *
 * Instruction: buy_shares(outcome: bool, target_cost: u64)
 *
 * Accounts:
 * - global_config (PDA)
 * - market (writable)
 * - position (PDA, writable)
 * - user (signer, writable)
 * - protocol_fee_wallet (writable)
 * - system_program
 *
 * @param program - Anchor program instance
 * @param wallet - User wallet public key
 * @param params - Buy shares parameters
 * @returns Built transaction ready for signing
 */
export async function buildBuySharesTransaction(
  program: Program<ZmartCore>,
  wallet: PublicKey,
  params: BuySharesParams
): Promise<TransactionBuildResult> {
  // Derive PDAs
  const [marketPDA] = deriveMarketPDA(program.programId, params.marketId);
  const [positionPDA] = derivePositionPDA(program.programId, marketPDA, wallet);
  const [globalConfigPDA] = deriveGlobalConfigPDA(program.programId);

  // Fetch global config to get protocol_fee_wallet
  const globalConfig = await program.account.globalConfig.fetch(globalConfigPDA);

  // Build buy_shares instruction
  const ix = await program.methods
    .buyShares(params.outcome, new BN(params.targetCost.toString()))
    .accounts({
      globalConfig: globalConfigPDA,
      market: marketPDA,
      position: positionPDA,
      user: wallet,
      protocolFeeWallet: globalConfig.protocolFeeWallet,
      systemProgram: SystemProgram.programId,
    })
    .instruction();

  // Create transaction with compute budget
  const transaction = new Transaction();

  // Add compute units (LMSR needs 200k units)
  transaction.add(
    ComputeBudgetProgram.setComputeUnitLimit({ units: COMPUTE_UNITS })
  );

  // Add priority fee (optional, for faster confirmation)
  transaction.add(
    ComputeBudgetProgram.setComputeUnitPrice({
      microLamports: PRIORITY_FEE_MICRO_LAMPORTS,
    })
  );

  // Add main instruction
  transaction.add(ix);

  // Get recent blockhash
  const connection = program.provider.connection;
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash(
    'confirmed'
  );
  transaction.recentBlockhash = blockhash;
  transaction.lastValidBlockHeight = lastValidBlockHeight;
  transaction.feePayer = wallet;

  return { transaction, marketPDA, positionPDA };
}

/**
 * Build Sell Shares Transaction
 *
 * Instruction: sell_shares(outcome: bool, shares_to_sell: u64, min_proceeds: u64)
 *
 * Accounts:
 * - global_config (PDA)
 * - market (writable)
 * - position (PDA, writable)
 * - user (signer, writable)
 * - protocol_fee_wallet (writable)
 *
 * @param program - Anchor program instance
 * @param wallet - User wallet public key
 * @param params - Sell shares parameters
 * @returns Built transaction ready for signing
 */
export async function buildSellSharesTransaction(
  program: Program<ZmartCore>,
  wallet: PublicKey,
  params: SellSharesParams
): Promise<TransactionBuildResult> {
  // Derive PDAs
  const [marketPDA] = deriveMarketPDA(program.programId, params.marketId);
  const [positionPDA] = derivePositionPDA(program.programId, marketPDA, wallet);
  const [globalConfigPDA] = deriveGlobalConfigPDA(program.programId);

  // Fetch global config to get protocol_fee_wallet
  const globalConfig = await program.account.globalConfig.fetch(globalConfigPDA);

  // Build sell_shares instruction
  const ix = await program.methods
    .sellShares(
      params.outcome,
      new BN(params.sharesToSell.toString()),
      new BN(params.minProceeds.toString())
    )
    .accounts({
      globalConfig: globalConfigPDA,
      market: marketPDA,
      position: positionPDA,
      user: wallet,
      protocolFeeWallet: globalConfig.protocolFeeWallet,
    })
    .instruction();

  // Create transaction with compute budget
  const transaction = new Transaction();

  // Add compute units
  transaction.add(
    ComputeBudgetProgram.setComputeUnitLimit({ units: COMPUTE_UNITS })
  );

  // Add priority fee
  transaction.add(
    ComputeBudgetProgram.setComputeUnitPrice({
      microLamports: PRIORITY_FEE_MICRO_LAMPORTS,
    })
  );

  // Add main instruction
  transaction.add(ix);

  // Get recent blockhash
  const connection = program.provider.connection;
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash(
    'confirmed'
  );
  transaction.recentBlockhash = blockhash;
  transaction.lastValidBlockHeight = lastValidBlockHeight;
  transaction.feePayer = wallet;

  return { transaction, marketPDA, positionPDA };
}

/**
 * Build Claim Winnings Transaction
 *
 * Instruction: claim_winnings()
 *
 * Accounts:
 * - global_config (PDA)
 * - market (writable)
 * - position (PDA, writable)
 * - user (signer, writable)
 * - resolver (writable - gets accumulated fees if outcome valid)
 *
 * @param program - Anchor program instance
 * @param wallet - User wallet public key
 * @param params - Claim winnings parameters
 * @returns Built transaction ready for signing
 */
export async function buildClaimWinningsTransaction(
  program: Program<ZmartCore>,
  wallet: PublicKey,
  params: ClaimWinningsParams
): Promise<TransactionBuildResult> {
  // Derive PDAs
  const [marketPDA] = deriveMarketPDA(program.programId, params.marketId);
  const [positionPDA] = derivePositionPDA(program.programId, marketPDA, wallet);
  const [globalConfigPDA] = deriveGlobalConfigPDA(program.programId);

  // Fetch market to get resolver address
  const market = await program.account.marketAccount.fetch(marketPDA);

  // Build claim_winnings instruction
  const ix = await program.methods
    .claimWinnings()
    .accounts({
      globalConfig: globalConfigPDA,
      market: marketPDA,
      position: positionPDA,
      user: wallet,
      resolver: market.resolver,
    })
    .instruction();

  // Create transaction (no compute budget needed for claims)
  const transaction = new Transaction();

  // Add priority fee for faster confirmation
  transaction.add(
    ComputeBudgetProgram.setComputeUnitPrice({
      microLamports: PRIORITY_FEE_MICRO_LAMPORTS,
    })
  );

  // Add main instruction
  transaction.add(ix);

  // Get recent blockhash
  const connection = program.provider.connection;
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash(
    'confirmed'
  );
  transaction.recentBlockhash = blockhash;
  transaction.lastValidBlockHeight = lastValidBlockHeight;
  transaction.feePayer = wallet;

  return { transaction, marketPDA, positionPDA };
}

// ============================================================================
// Error Handling
// ============================================================================

/**
 * Parse Solana errors for user-friendly messages
 *
 * @param error - Error from Solana transaction
 * @returns User-friendly error message
 */
export function parseSolanaError(error: unknown): string {
  if (!(error instanceof Error)) return 'Unknown error occurred';

  const message = error.message.toLowerCase();

  // Common Solana errors
  if (message.includes('insufficient funds')) {
    return 'Insufficient SOL balance to complete transaction';
  }
  if (message.includes('blockhash not found')) {
    return 'Transaction expired. Please try again.';
  }
  if (message.includes('account not found')) {
    return 'Market account not found. Market may be closed.';
  }
  if (message.includes('user rejected')) {
    return 'Transaction cancelled by user';
  }

  // Program-specific errors (extract error code if possible)
  const customErrorMatch = message.match(/custom program error: 0x(\w+)/);
  if (customErrorMatch) {
    const errorCode = parseInt(customErrorMatch[1], 16);
    return getErrorMessage(errorCode);
  }

  // Return original message if no match
  return error.message;
}

/**
 * Get error message from ZMART program error code
 *
 * Error codes from IDL (lines 1665-1891)
 *
 * @param code - Error code number
 * @returns User-friendly error message
 */
export function getErrorMessage(code: number): string {
  const errors: Record<number, string> = {
    // State errors
    6000: 'Unauthorized: Admin signature required',
    6001: 'Unauthorized: Market creator required',
    6002: 'Unauthorized: Resolver signature required',
    6003: 'Unauthorized: Backend authority required',
    6007: 'Market not in required state for this operation',
    6008: 'Invalid market state transition',
    6009: 'Protocol is paused - trading disabled',

    // Trading errors
    6011: 'Market is not active - trading not allowed',
    6012: 'Trading amount must be greater than zero',
    6013: 'Insufficient shares to sell',
    6014: 'Slippage tolerance exceeded - price changed too much',
    6015: 'Outcome already resolved - no more trading allowed',

    // Math errors
    6020: 'Arithmetic overflow in calculation',
    6021: 'Arithmetic underflow in calculation',
    6022: 'Division by zero',
    6023: 'LMSR calculation failed',
    6024: 'Invalid liquidity parameter',

    // Resolution errors
    6030: 'Resolution window has not started yet',
    6031: 'Resolution window has expired',
    6032: 'Proposal voting threshold not met',
    6033: 'Dispute voting threshold not met',
    6034: 'Invalid outcome value',

    // Account errors
    6040: 'Position account already initialized',
    6041: 'Global config not initialized',
    6042: 'Invalid protocol fee wallet',
    6043: 'Market ID mismatch',
  };

  return errors[code] || `Program error: ${code}`;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Estimate transaction fee
 *
 * @param transaction - Built transaction
 * @param connection - Solana connection
 * @returns Estimated fee in lamports
 */
export async function estimateTransactionFee(
  transaction: Transaction,
  connection: Connection
): Promise<number> {
  const { value: fee } = await connection.getFeeForMessage(
    transaction.compileMessage(),
    'confirmed'
  );

  return fee || 5000; // Default to 5000 lamports if estimation fails
}

/**
 * Convert lamports to SOL
 *
 * @param lamports - Amount in lamports
 * @returns Amount in SOL
 */
export function lamportsToSol(lamports: number | bigint): number {
  return Number(lamports) / 1_000_000_000;
}

/**
 * Convert SOL to lamports
 *
 * @param sol - Amount in SOL
 * @returns Amount in lamports
 */
export function solToLamports(sol: number): bigint {
  return BigInt(Math.floor(sol * 1_000_000_000));
}
