import * as anchor from '@coral-xyz/anchor';
import { Program, AnchorProvider, Wallet } from '@coral-xyz/anchor';
import { PublicKey, Keypair, Connection, LAMPORTS_PER_SOL } from '@solana/web3.js';
import fs from 'fs';
import path from 'path';

export const PROGRAM_ID = new PublicKey('3rQhUrqQhHxYCkj3RqTHL1PTrHSnUShMe3z4KdHaHjkz');
export const DEVNET_URL = 'https://api.devnet.solana.com';

// Load IDL
const idlPath = path.join(__dirname, '../../zmart_core_idl.json');
const idl = JSON.parse(fs.readFileSync(idlPath, 'utf-8'));

export interface TestContext {
  connection: Connection;
  program: Program;
  provider: AnchorProvider;
  payer: Keypair;
  globalConfigPda: PublicKey;
}

/**
 * Initialize test context with connection, program, and accounts
 */
export async function setupTestContext(): Promise<TestContext> {
  console.log('🔧 Setting up test context...\n');

  // Create connection
  const connection = new Connection(DEVNET_URL, 'confirmed');

  // Load payer wallet
  const walletPath = `${process.env.HOME}/.config/solana/id.json`;
  const payerKeypair = Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(fs.readFileSync(walletPath, 'utf-8')))
  );

  console.log('Payer:', payerKeypair.publicKey.toString());

  // Check balance
  const balance = await connection.getBalance(payerKeypair.publicKey);
  console.log('Balance:', balance / LAMPORTS_PER_SOL, 'SOL');

  if (balance < 0.5 * LAMPORTS_PER_SOL) {
    throw new Error('Insufficient balance. Need at least 0.5 SOL for testing');
  }

  // Set up provider
  const wallet = new Wallet(payerKeypair);
  const provider = new AnchorProvider(connection, wallet, { commitment: 'confirmed' });
  anchor.setProvider(provider);

  // Create program instance
  const program = new Program(idl, provider);

  // Derive GlobalConfig PDA
  const [globalConfigPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('global-config')],
    program.programId
  );

  console.log('Program ID:', program.programId.toString());
  console.log('GlobalConfig:', globalConfigPda.toString());
  console.log('');

  return {
    connection,
    program,
    provider,
    payer: payerKeypair,
    globalConfigPda,
  };
}

/**
 * Request airdrop if balance is low
 */
export async function ensureSufficientBalance(
  connection: Connection,
  pubkey: PublicKey,
  minBalance: number = 1 * LAMPORTS_PER_SOL
): Promise<void> {
  const balance = await connection.getBalance(pubkey);

  if (balance < minBalance) {
    console.log(`💰 Requesting airdrop for ${pubkey.toString()}`);
    const signature = await connection.requestAirdrop(pubkey, 2 * LAMPORTS_PER_SOL);
    await connection.confirmTransaction(signature, 'confirmed');
    console.log('✅ Airdrop confirmed\n');
  }
}

/**
 * Generate unique market ID
 */
export function generateMarketId(): number[] {
  const crypto = require('crypto');
  return Array.from(crypto.randomBytes(32));
}

/**
 * Derive Market PDA
 */
export function deriveMarketPda(
  programId: PublicKey,
  marketId: number[]
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('market'), Buffer.from(marketId)],
    programId
  );
}

/**
 * Derive UserPosition PDA
 */
export function deriveUserPositionPda(
  programId: PublicKey,
  marketPda: PublicKey,
  userPubkey: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('position'), marketPda.toBuffer(), userPubkey.toBuffer()],
    programId
  );
}

/**
 * Create placeholder IPFS hash (46 bytes)
 */
export function createIpfsHash(content: string): number[] {
  const hash = Buffer.alloc(46, 0);
  hash.write('Qm' + content.slice(0, 44), 0); // CIDv0 prefix
  return Array.from(hash);
}

/**
 * Format lamports to SOL
 */
export function lamportsToSol(lamports: number | bigint): number {
  return Number(lamports) / LAMPORTS_PER_SOL;
}

/**
 * Format SOL to lamports
 */
export function solToLamports(sol: number): bigint {
  return BigInt(Math.floor(sol * LAMPORTS_PER_SOL));
}

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Print test section header
 */
export function printSection(title: string): void {
  console.log('\n' + '='.repeat(80));
  console.log(`  ${title}`);
  console.log('='.repeat(80) + '\n');
}

/**
 * Print test result
 */
export function printResult(testName: string, passed: boolean, details?: string): void {
  const symbol = passed ? '✅' : '❌';
  console.log(`${symbol} ${testName}`);
  if (details) {
    console.log(`   ${details}`);
  }
}

/**
 * Assert with custom error message
 */
export function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

/**
 * Assert approximately equal (for floating point comparisons)
 */
export function assertApprox(
  actual: number,
  expected: number,
  tolerance: number,
  message: string
): void {
  const diff = Math.abs(actual - expected);
  if (diff > tolerance) {
    throw new Error(
      `${message}\nExpected: ${expected}\nActual: ${actual}\nDiff: ${diff}\nTolerance: ${tolerance}`
    );
  }
}
