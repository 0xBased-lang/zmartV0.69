import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { Program } from '@coral-xyz/anchor';
/**
 * Finalization result returned after successful transaction
 */
export interface FinalizationResult {
    signature: string;
    marketAddress: string;
    timestamp: number;
    confirmationTime: number;
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
export declare function finalizeMarket(program: Program, connection: Connection, marketAddress: PublicKey, backendKeypair: Keypair, globalConfigPda: PublicKey): Promise<FinalizationResult>;
/**
 * Derive global config PDA
 *
 * Seeds: [b"global-config"]
 * Program: zmart-core
 *
 * @param programId Program ID
 * @returns Global config PDA and bump
 */
export declare function deriveGlobalConfigPda(programId: PublicKey): [PublicKey, number];
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
export declare function deriveMarketPda(programId: PublicKey, marketId: Buffer): [PublicKey, number];
/**
 * Load backend authority keypair from environment variable
 *
 * Environment Variable: BACKEND_AUTHORITY_PRIVATE_KEY
 * Format: Base58-encoded private key (64 bytes)
 *
 * @returns Backend authority keypair
 * @throws Error if environment variable not found or invalid
 */
export declare function loadBackendKeypair(): Keypair;
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
export declare function validateBackendAuthority(program: Program, globalConfigPda: PublicKey, backendKeypair: Keypair): Promise<void>;
/**
 * Estimate transaction cost (for monitoring/alerting)
 *
 * @param connection Solana connection
 * @returns Estimated cost in lamports
 */
export declare function estimateTransactionCost(connection: Connection): Promise<number>;
//# sourceMappingURL=finalization.d.ts.map