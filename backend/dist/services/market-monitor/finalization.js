"use strict";
// ============================================================
// Market Monitor - Finalization Service
// ============================================================
// Purpose: Build and send finalize_market transactions for markets with no disputes
// Pattern Prevention: #3 (Reactive Crisis) - Proactive error handling with retry
// Blueprint: CORE_LOGIC_INVARIANTS.md - Resolution Process Step 6 (Finalization)
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.finalizeMarket = finalizeMarket;
exports.deriveGlobalConfigPda = deriveGlobalConfigPda;
exports.deriveMarketPda = deriveMarketPda;
exports.loadBackendKeypair = loadBackendKeypair;
exports.validateBackendAuthority = validateBackendAuthority;
exports.estimateTransactionCost = estimateTransactionCost;
const web3_js_1 = require("@solana/web3.js");
const bs58_1 = __importDefault(require("bs58"));
const fs_1 = __importDefault(require("fs"));
const logger_1 = __importDefault(require("../../utils/logger"));
const retry_1 = require("../../utils/retry");
const config_1 = __importDefault(require("./config"));
const env_1 = require("../../config/env");
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
async function finalizeMarket(program, connection, marketAddress, backendKeypair, globalConfigPda) {
    const startTime = Date.now();
    logger_1.default.info(`[MarketMonitor] Finalizing market ${marketAddress.toBase58()}...`);
    // Build and send transaction with retry
    const signature = await (0, retry_1.withRetry)(async () => {
        return await sendFinalizeTransaction(program, connection, marketAddress, backendKeypair, globalConfigPda);
    }, {
        maxAttempts: config_1.default.MAX_RETRIES,
        initialDelay: config_1.default.RETRY_INITIAL_DELAY_MS,
        maxDelay: config_1.default.RETRY_MAX_DELAY_MS,
        backoffFactor: config_1.default.RETRY_BACKOFF_FACTOR,
        onRetry: (error, attempt) => {
            logger_1.default.warn(`[MarketMonitor] Finalization attempt ${attempt} failed for ${marketAddress.toBase58()}: ${error.message}`);
        },
    });
    // Wait for confirmation
    await confirmTransaction(connection, signature);
    const confirmationTime = Date.now() - startTime;
    logger_1.default.info(`[MarketMonitor] Market ${marketAddress.toBase58()} finalized successfully ` +
        `(signature: ${signature}, time: ${confirmationTime}ms)`);
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
async function sendFinalizeTransaction(program, connection, marketAddress, backendKeypair, globalConfigPda) {
    if (config_1.default.DRY_RUN) {
        logger_1.default.warn(`[MarketMonitor] DRY RUN mode - Would finalize ${marketAddress.toBase58()}`);
        return 'dry-run-signature';
    }
    if (config_1.default.DEBUG_MODE) {
        logger_1.default.debug(`[MarketMonitor] Building finalize_market transaction`, {
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
            commitment: config_1.default.COMMITMENT,
            skipPreflight: false,
        });
        if (config_1.default.DEBUG_MODE) {
            logger_1.default.debug(`[MarketMonitor] Transaction sent: ${signature}`);
        }
        return signature;
    }
    catch (error) {
        // Enhance error message with context
        const enhancedError = new Error(`Failed to send finalize_market transaction for ${marketAddress.toBase58()}: ${error.message}`);
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
async function confirmTransaction(connection, signature) {
    if (config_1.default.DRY_RUN) {
        logger_1.default.warn(`[MarketMonitor] DRY RUN mode - Would confirm ${signature}`);
        return;
    }
    const startTime = Date.now();
    const timeout = config_1.default.CONFIRMATION_TIMEOUT_MS;
    if (config_1.default.DEBUG_MODE) {
        logger_1.default.debug(`[MarketMonitor] Confirming transaction ${signature}...`);
    }
    try {
        // Use confirmTransaction with timeout
        const confirmation = await Promise.race([
            connection.confirmTransaction(signature, config_1.default.COMMITMENT),
            (0, retry_1.sleep)(timeout).then(() => {
                throw new Error(`Transaction confirmation timeout after ${timeout}ms`);
            }),
        ]);
        // Check for transaction errors
        if (confirmation.value.err) {
            throw new Error(`Transaction failed on-chain: ${JSON.stringify(confirmation.value.err)}`);
        }
        const confirmTime = Date.now() - startTime;
        if (config_1.default.DEBUG_MODE) {
            logger_1.default.debug(`[MarketMonitor] Transaction confirmed in ${confirmTime}ms (slot: ${confirmation.context.slot})`);
        }
    }
    catch (error) {
        // Enhance error with confirmation context
        const enhancedError = new Error(`Transaction confirmation failed for ${signature}: ${error.message}`);
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
function deriveGlobalConfigPda(programId) {
    const [pda, bump] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from('global-config')], programId);
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
function deriveMarketPda(programId, marketId) {
    const [pda, bump] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from('market'), marketId], programId);
    return [pda, bump];
}
/**
 * Load backend authority keypair from centralized config
 *
 * Supports two loading methods (from centralized config):
 * 1. BACKEND_AUTHORITY_PRIVATE_KEY: Base58-encoded private key (production)
 * 2. BACKEND_KEYPAIR_PATH: Path to keypair JSON file (development)
 *
 * @returns Backend authority keypair
 * @throws Error if keypair cannot be loaded
 */
function loadBackendKeypair() {
    // Method 1: Load from base58 private key (preferred for production)
    const privateKeyBase58 = env_1.config.solana.backendAuthorityPrivateKey;
    if (privateKeyBase58) {
        try {
            const privateKeyBytes = bs58_1.default.decode(privateKeyBase58);
            if (privateKeyBytes.length !== 64) {
                throw new Error(`Invalid private key length: expected 64 bytes, got ${privateKeyBytes.length}`);
            }
            return web3_js_1.Keypair.fromSecretKey(privateKeyBytes);
        }
        catch (error) {
            throw new Error(`Failed to load backend authority keypair from BACKEND_AUTHORITY_PRIVATE_KEY: ${error.message}. ` +
                'Ensure it is a valid base58-encoded private key.');
        }
    }
    // Method 2: Load from file path (fallback for development)
    const keypairPath = env_1.config.solana.backendKeypairPath;
    if (keypairPath) {
        try {
            const keypairData = JSON.parse(fs_1.default.readFileSync(keypairPath, 'utf-8'));
            return web3_js_1.Keypair.fromSecretKey(new Uint8Array(keypairData));
        }
        catch (error) {
            throw new Error(`Failed to load backend authority keypair from ${keypairPath}: ${error.message}. ` +
                'Ensure the file exists and contains a valid Solana keypair.');
        }
    }
    // Should never reach here due to validation in config/env.ts
    throw new Error('Backend keypair configuration missing. ' +
        'Must provide either BACKEND_AUTHORITY_PRIVATE_KEY or BACKEND_KEYPAIR_PATH.');
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
async function validateBackendAuthority(program, globalConfigPda, backendKeypair) {
    try {
        // Fetch global config from chain
        // @ts-ignore - IDL types not generated yet
        const globalConfig = await program.account.globalConfig.fetch(globalConfigPda);
        // Check if backend authority matches
        const onChainAuthority = globalConfig.backendAuthority;
        const localAuthority = backendKeypair.publicKey;
        if (!onChainAuthority.equals(localAuthority)) {
            throw new Error(`Backend authority mismatch:\n` +
                `  On-chain: ${onChainAuthority.toBase58()}\n` +
                `  Local:    ${localAuthority.toBase58()}\n` +
                'Please use the correct backend authority keypair.');
        }
        logger_1.default.info(`[MarketMonitor] Backend authority validated: ${localAuthority.toBase58()}`);
    }
    catch (error) {
        if (error.message.includes('Account does not exist')) {
            throw new Error(`Global config account not found at ${globalConfigPda.toBase58()}. ` +
                'Please initialize the global config first.');
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
async function estimateTransactionCost(connection) {
    // Solana transaction fee is typically 5000 lamports per signature
    // finalize_market transaction has 1 signature (backend authority)
    // Return fixed estimate for simplicity
    const TYPICAL_SIGNATURE_FEE = 5000; // lamports
    return TYPICAL_SIGNATURE_FEE;
}
//# sourceMappingURL=finalization.js.map