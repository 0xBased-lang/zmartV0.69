// ============================================================
// Market Monitor - Finalization Service
// ============================================================
// Purpose: Build and send finalize_market transactions for markets with no disputes
// Pattern Prevention: #3 (Reactive Crisis) - Proactive error handling with retry
// Blueprint: CORE_LOGIC_INVARIANTS.md - Resolution Process Step 6 (Finalization)

import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { Program } from '@coral-xyz/anchor';
import bs58 from 'bs58';
import logger from '../../utils/logger';
import { withRetry, sleep } from '../../utils/retry';
import MARKET_MONITOR_CONFIG from './config';

/**
 * Finalization result returned after successful transaction
 */
export interface FinalizationResult {
  signature: string;
  marketAddress: string;
  timestamp: number;
  confirmationTime: number; // milliseconds
}

/**
 * Build and send finalize_market transaction for RESOLVING market (no dispute)
 *
 * Blueprint Context:
 * - Market in RESOLVING state
 * - 48 hours elapsed since resolution_proposed_at
 * - No dispute occurred
 * - Backend authority calls finalize_market with (null, null) for no-dispute case
 *
 * @param program Anchor program instance
 * @param connection Solana connection
 * @param marketAddress Market PDA address
 * @param backendKeypair Backend authority keypair
 * @param globalConfigPda Global config PDA address
 * @returns Transaction signature and metadata
 */
export async function finalizeMarket(
  program: Program,
  connection: Connection,
  marketAddress: PublicKey,
  backendKeypair: Keypair,
  globalConfigPda: PublicKey
): Promise<FinalizationResult> {
  const startTime = Date.now();

  logger.info(`[MarketMonitor] Finalizing market ${marketAddress.toBase58()}...`);

  // Build and send transaction with retry
  const signature = await withRetry(
    async () => {
      return await sendFinalizeTransaction(
        program,
        connection,
        marketAddress,
        backendKeypair,
        globalConfigPda
      );
    },
    {
      maxAttempts: MARKET_MONITOR_CONFIG.MAX_RETRIES,
      initialDelay: MARKET_MONITOR_CONFIG.RETRY_INITIAL_DELAY_MS,
      maxDelay: MARKET_MONITOR_CONFIG.RETRY_MAX_DELAY_MS,
      backoffFactor: MARKET_MONITOR_CONFIG.RETRY_BACKOFF_FACTOR,
      onRetry: (error, attempt) => {
        logger.warn(
          `[MarketMonitor] Finalization attempt ${attempt} failed for ${marketAddress.toBase58()}: ${error.message}`
        );
      },
    }
  );

  // Wait for confirmation
  await confirmTransaction(connection, signature);

  const confirmationTime = Date.now() - startTime;

  logger.info(
    `[MarketMonitor] Market ${marketAddress.toBase58()} finalized successfully ` +
    `(signature: ${signature}, time: ${confirmationTime}ms)`
  );

  return {
    signature,
    marketAddress: marketAddress.toBase58(),
    timestamp: Date.now(),
    confirmationTime,
  };
}

/**
 * Build and send finalize_market transaction
 *
 * Instruction Parameters (from finalize_market.rs):
 * - dispute_agree: Option<u32> = None (no dispute occurred)
 * - dispute_disagree: Option<u32> = None (no dispute occurred)
 *
 * Accounts Required:
 * 1. global_config: GlobalConfig PDA
 * 2. market: MarketAccount PDA
 * 3. backend_authority: Signer (must match global_config.backend_authority)
 *
 * @returns Transaction signature
 */
async function sendFinalizeTransaction(
  program: Program,
  connection: Connection,
  marketAddress: PublicKey,
  backendKeypair: Keypair,
  globalConfigPda: PublicKey
): Promise<string> {
  if (MARKET_MONITOR_CONFIG.DRY_RUN) {
    logger.warn(`[MarketMonitor] DRY RUN mode - Would finalize ${marketAddress.toBase58()}`);
    return 'dry-run-signature';
  }

  if (MARKET_MONITOR_CONFIG.DEBUG_MODE) {
    logger.debug(`[MarketMonitor] Building finalize_market transaction`, {
      market: marketAddress.toBase58(),
      globalConfig: globalConfigPda.toBase58(),
      backendAuthority: backendKeypair.publicKey.toBase58(),
    });
  }

  try {
    // Build transaction using Anchor
    // Note: Pass null for both dispute_agree and dispute_disagree (no dispute case)
    const signature = await program.methods
      .finalizeMarket(null, null)
      .accounts({
        globalConfig: globalConfigPda,
        market: marketAddress,
        backendAuthority: backendKeypair.publicKey,
      })
      .signers([backendKeypair])
      .rpc({
        commitment: MARKET_MONITOR_CONFIG.COMMITMENT,
        skipPreflight: false,
      });

    if (MARKET_MONITOR_CONFIG.DEBUG_MODE) {
      logger.debug(`[MarketMonitor] Transaction sent: ${signature}`);
    }

    return signature;
  } catch (error: any) {
    // Enhance error message with context
    const enhancedError = new Error(
      `Failed to send finalize_market transaction for ${marketAddress.toBase58()}: ${error.message}`
    );
    enhancedError.stack = error.stack;
    throw enhancedError;
  }
}

/**
 * Confirm transaction with timeout
 *
 * @param connection Solana connection
 * @param signature Transaction signature
 * @throws Error if transaction fails or times out
 */
async function confirmTransaction(
  connection: Connection,
  signature: string
): Promise<void> {
  if (MARKET_MONITOR_CONFIG.DRY_RUN) {
    logger.warn(`[MarketMonitor] DRY RUN mode - Would confirm ${signature}`);
    return;
  }

  const startTime = Date.now();
  const timeout = MARKET_MONITOR_CONFIG.CONFIRMATION_TIMEOUT_MS;

  if (MARKET_MONITOR_CONFIG.DEBUG_MODE) {
    logger.debug(`[MarketMonitor] Confirming transaction ${signature}...`);
  }

  try {
    // Use confirmTransaction with timeout
    const confirmation = await Promise.race([
      connection.confirmTransaction(signature, MARKET_MONITOR_CONFIG.COMMITMENT),
      sleep(timeout).then(() => {
        throw new Error(`Transaction confirmation timeout after ${timeout}ms`);
      }),
    ]);

    // Check for transaction errors
    if (confirmation.value.err) {
      throw new Error(
        `Transaction failed on-chain: ${JSON.stringify(confirmation.value.err)}`
      );
    }

    const confirmTime = Date.now() - startTime;

    if (MARKET_MONITOR_CONFIG.DEBUG_MODE) {
      logger.debug(
        `[MarketMonitor] Transaction confirmed in ${confirmTime}ms (slot: ${confirmation.context.slot})`
      );
    }
  } catch (error: any) {
    // Enhance error with confirmation context
    const enhancedError = new Error(
      `Transaction confirmation failed for ${signature}: ${error.message}`
    );
    enhancedError.stack = error.stack;
    throw enhancedError;
  }
}

/**
 * Derive global config PDA
 *
 * Seeds: [b"global-config"]
 * Program: zmart-core
 *
 * @param programId Program ID
 * @returns Global config PDA and bump
 */
export function deriveGlobalConfigPda(programId: PublicKey): [PublicKey, number] {
  const [pda, bump] = PublicKey.findProgramAddressSync(
    [Buffer.from('global-config')],
    programId
  );
  return [pda, bump];
}

/**
 * Derive market PDA
 *
 * Seeds: [b"market", market_id]
 * Program: zmart-core
 *
 * @param programId Program ID
 * @param marketId Market ID (32 bytes)
 * @returns Market PDA and bump
 */
export function deriveMarketPda(
  programId: PublicKey,
  marketId: Buffer
): [PublicKey, number] {
  const [pda, bump] = PublicKey.findProgramAddressSync(
    [Buffer.from('market'), marketId],
    programId
  );
  return [pda, bump];
}

/**
 * Load backend authority keypair from environment variable
 *
 * Environment Variable: BACKEND_AUTHORITY_PRIVATE_KEY
 * Format: Base58-encoded private key (64 bytes)
 *
 * @returns Backend authority keypair
 * @throws Error if environment variable not found or invalid
 */
export function loadBackendKeypair(): Keypair {
  const privateKeyBase58 = process.env.BACKEND_AUTHORITY_PRIVATE_KEY;

  if (!privateKeyBase58) {
    throw new Error(
      'BACKEND_AUTHORITY_PRIVATE_KEY environment variable not found. ' +
      'Please set this to your backend authority keypair in base58 format.'
    );
  }

  try {
    const privateKeyBytes = bs58.decode(privateKeyBase58);

    if (privateKeyBytes.length !== 64) {
      throw new Error(
        `Invalid private key length: expected 64 bytes, got ${privateKeyBytes.length}`
      );
    }

    return Keypair.fromSecretKey(privateKeyBytes);
  } catch (error: any) {
    throw new Error(
      `Failed to load backend authority keypair: ${error.message}. ` +
      'Ensure BACKEND_AUTHORITY_PRIVATE_KEY is a valid base58-encoded private key.'
    );
  }
}

/**
 * Validate backend authority matches global config
 *
 * Security Check: Ensure backend keypair public key matches
 * the backend_authority stored in global_config on-chain.
 *
 * @param program Anchor program instance
 * @param globalConfigPda Global config PDA
 * @param backendKeypair Backend authority keypair
 * @throws Error if authority doesn't match
 */
export async function validateBackendAuthority(
  program: Program,
  globalConfigPda: PublicKey,
  backendKeypair: Keypair
): Promise<void> {
  try {
    // Fetch global config from chain
    // @ts-ignore - IDL types not generated yet
    const globalConfig = await program.account.globalConfig.fetch(globalConfigPda);

    // Check if backend authority matches
    const onChainAuthority = globalConfig.backendAuthority as PublicKey;
    const localAuthority = backendKeypair.publicKey;

    if (!onChainAuthority.equals(localAuthority)) {
      throw new Error(
        `Backend authority mismatch:\n` +
        `  On-chain: ${onChainAuthority.toBase58()}\n` +
        `  Local:    ${localAuthority.toBase58()}\n` +
        'Please use the correct backend authority keypair.'
      );
    }

    logger.info(
      `[MarketMonitor] Backend authority validated: ${localAuthority.toBase58()}`
    );
  } catch (error: any) {
    if (error.message.includes('Account does not exist')) {
      throw new Error(
        `Global config account not found at ${globalConfigPda.toBase58()}. ` +
        'Please initialize the global config first.'
      );
    }
    throw error;
  }
}

/**
 * Estimate transaction cost (for monitoring/alerting)
 *
 * @param connection Solana connection
 * @returns Estimated cost in lamports
 */
export async function estimateTransactionCost(
  connection: Connection
): Promise<number> {
  // Solana transaction fee is typically 5000 lamports per signature
  // finalize_market transaction has 1 signature (backend authority)
  // Return fixed estimate for simplicity
  const TYPICAL_SIGNATURE_FEE = 5000; // lamports
  return TYPICAL_SIGNATURE_FEE;
}
