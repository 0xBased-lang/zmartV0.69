/**
 * Authentication Helper for Integration Tests
 *
 * Provides wallet signature generation for authenticated API calls.
 * Uses Solana wallet signature verification (similar to SIWE).
 */

import { Keypair } from '@solana/web3.js';
import nacl from 'tweetnacl';
import bs58 from 'bs58';

/**
 * Test wallet keypair (generated fresh for each test run)
 * In production, this would come from a secure wallet
 */
let testKeypair: Keypair | null = null;

/**
 * Get or create test wallet keypair
 */
export function getTestWallet(): Keypair {
  if (!testKeypair) {
    testKeypair = Keypair.generate();
  }
  return testKeypair;
}

/**
 * Create authentication message
 * Format MUST match backend auth.ts middleware expectations:
 * "Sign this message to authenticate with ZMART: {timestamp}"
 */
export function createAuthMessage(wallet: string): string {
  const timestamp = Date.now();

  // IMPORTANT: This format must match backend/src/api/middleware/auth.ts line 110
  return `Sign this message to authenticate with ZMART: ${timestamp}`;
}

/**
 * Sign message with wallet
 */
export function signMessage(message: string, keypair: Keypair): string {
  const messageBytes = new TextEncoder().encode(message);
  const signature = nacl.sign.detached(messageBytes, keypair.secretKey);
  return bs58.encode(signature);
}

/**
 * Get authentication data for API requests
 * Returns message, signature, and wallet for request body
 */
export interface AuthData {
  message: string;
  signature: string;
  wallet: string;
}

export function getAuthData(keypair?: Keypair): AuthData {
  const wallet = keypair || getTestWallet();
  const walletAddress = wallet.publicKey.toBase58();
  const message = createAuthMessage(walletAddress);
  const signature = signMessage(message, wallet);

  return {
    message,
    signature,
    wallet: walletAddress,
  };
}

/**
 * Make authenticated POST request
 * Automatically includes wallet signature in request body
 */
export async function authenticatedPost<T = any>(
  url: string,
  data: any,
  keypair?: Keypair
): Promise<Response> {
  const authData = getAuthData(keypair);

  return fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...data,
      ...authData, // Add message, signature, wallet
    }),
  });
}

/**
 * Make authenticated GET request with auth header
 * (For future JWT implementation)
 */
export async function authenticatedGet(
  url: string,
  keypair?: Keypair
): Promise<Response> {
  // For now, GET requests don't need auth (read-only)
  // In future, could add JWT token in Authorization header
  return fetch(url);
}

/**
 * Verify signature locally (for testing)
 * Same logic as backend auth middleware
 */
export function verifySignature(
  message: string,
  signature: string,
  wallet: string
): boolean {
  try {
    const messageBytes = new TextEncoder().encode(message);
    const signatureBytes = bs58.decode(signature);
    const walletBytes = bs58.decode(wallet);

    return nacl.sign.detached.verify(messageBytes, signatureBytes, walletBytes);
  } catch (error) {
    return false;
  }
}

/**
 * Create test wallet with optional SOL airdrop
 * (For future on-chain test integration)
 */
export async function createTestWalletWithFunds(
  solAmount: number = 1
): Promise<Keypair> {
  const keypair = Keypair.generate();

  // TODO: Add devnet airdrop when running on-chain tests
  // const connection = new Connection(clusterApiUrl('devnet'));
  // await connection.requestAirdrop(keypair.publicKey, solAmount * LAMPORTS_PER_SOL);

  return keypair;
}
