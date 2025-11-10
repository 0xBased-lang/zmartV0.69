/**
 * Shared Utilities for Backend Scripts
 *
 * Provides common functionality for all backend scripts including:
 * - Configuration loading
 * - Keypair management
 * - Environment validation
 * - Cross-platform path handling
 */

export {
  loadKeypair,
  loadIDL,
  validateEnvVars,
  loadProgramId,
  getSolanaRpcUrl,
  parsePort,
  parseDbNumber,
  isProduction,
  isDevelopment,
  getSafeHostname,
  ensureDirectory
} from './config';

// Re-export types for convenience
export type { Keypair, PublicKey } from '@solana/web3.js';