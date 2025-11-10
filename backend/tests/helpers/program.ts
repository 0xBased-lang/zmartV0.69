/**
 * Program Helper - Solana/Anchor Program Utilities for Testing
 */

import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { Program, AnchorProvider, Wallet } from '@coral-xyz/anchor';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Get Solana RPC URL from environment
 */
export function getSolanaRpcUrl(): string {
  const rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
  return rpcUrl;
}

/**
 * Load keypair from file
 */
export function loadKeypair(name: string): Keypair {
  const walletDir = process.env.TEST_WALLET_DIR || './tests/fixtures/wallets';
  const keypairPath = path.join(__dirname, '../../', walletDir, `${name}.json`);

  if (!fs.existsSync(keypairPath)) {
    throw new Error(`Keypair file not found: ${keypairPath}`);
  }

  const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf-8'));
  return Keypair.fromSecretKey(new Uint8Array(keypairData));
}

/**
 * Load program IDL
 */
export function loadIDL(programName: string): any {
  const idlPath = path.join(
    __dirname,
    '../../../programs/',
    programName,
    'target/idl',
    `${programName}.json`
  );

  if (!fs.existsSync(idlPath)) {
    throw new Error(`IDL file not found: ${idlPath}`);
  }

  return JSON.parse(fs.readFileSync(idlPath, 'utf-8'));
}

/**
 * Load program ID from environment
 */
export function loadProgramId(envVar: string): PublicKey {
  const programId = process.env[envVar];

  if (!programId) {
    throw new Error(`Environment variable ${envVar} not set`);
  }

  return new PublicKey(programId);
}

/**
 * Create Anchor provider
 */
export function createProvider(connection: Connection, wallet: Keypair): AnchorProvider {
  return new AnchorProvider(
    connection,
    new Wallet(wallet),
    { commitment: 'confirmed' }
  );
}

/**
 * Initialize program instance
 */
export function initializeProgram(
  connection: Connection,
  wallet: Keypair,
  programName: string,
  programIdEnvVar: string
): Program {
  const provider = createProvider(connection, wallet);
  const idl = loadIDL(programName);
  const programId = loadProgramId(programIdEnvVar);

  return new Program(idl, provider);
}

/**
 * Get GlobalConfig PDA
 */
export function getGlobalConfigPda(programId: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('global-config')],
    programId
  );
}

/**
 * Get Market PDA
 */
export function getMarketPda(marketId: Buffer, programId: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('market'), marketId],
    programId
  );
}

/**
 * Get UserPosition PDA
 */
export function getUserPositionPda(
  marketPda: PublicKey,
  user: PublicKey,
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('user_position'), marketPda.toBuffer(), user.toBuffer()],
    programId
  );
}

/**
 * Get VoteRecord PDA
 */
export function getVoteRecordPda(
  marketPda: PublicKey,
  voter: PublicKey,
  voteType: 'proposal' | 'dispute',
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from('vote_record'),
      marketPda.toBuffer(),
      voter.toBuffer(),
      Buffer.from(voteType),
    ],
    programId
  );
}

/**
 * Convenience aliases for test readability
 */
export const loadWallet = loadKeypair;

export async function loadProgram(connection: Connection, wallet: Keypair): Promise<Program> {
  return initializeProgram(
    connection,
    wallet,
    'zmart-prediction-market',
    'SOLANA_PROGRAM_ID_CORE'
  );
}

/**
 * Create a new market (wrapper for create_market instruction)
 */
export async function createMarket(
  program: Program,
  creator: Keypair,
  title: string,
  description: string,
  category: string,
  endTimestamp: number,
  liquidityParameter: number,
  creatorFeeBps: number,
  resolutionBond: number
): Promise<{ marketPubkey: PublicKey; signature: string }> {
  // Generate unique market ID
  const marketId = Keypair.generate().publicKey.toBuffer().slice(0, 32);
  const [marketPda] = getMarketPda(marketId, program.programId);
  const [globalConfigPda] = getGlobalConfigPda(program.programId);

  const tx = await program.methods
    .createMarket(
      Array.from(marketId),
      title,
      description,
      category,
      endTimestamp,
      liquidityParameter,
      creatorFeeBps,
      resolutionBond
    )
    .accounts({
      market: marketPda,
      creator: creator.publicKey,
      globalConfig: globalConfigPda,
    })
    .signers([creator])
    .rpc();

  return {
    marketPubkey: marketPda,
    signature: tx,
  };
}

/**
 * Buy shares in a market
 */
export async function buyShares(
  program: Program,
  marketPubkey: PublicKey,
  user: Keypair,
  outcome: 'yes' | 'no',
  amountLamports: number,
  maxSlippageBps: number
): Promise<{ signature: string; sharesReceived: number }> {
  const [userPositionPda] = getUserPositionPda(marketPubkey, user.publicKey, program.programId);
  const [globalConfigPda] = getGlobalConfigPda(program.programId);

  const tx = await program.methods
    .buyShares(outcome === 'yes', amountLamports, maxSlippageBps)
    .accounts({
      market: marketPubkey,
      user: user.publicKey,
      userPosition: userPositionPda,
      globalConfig: globalConfigPda,
    })
    .signers([user])
    .rpc();

  // Fetch updated position to get shares received
  const position = await program.account.userPosition.fetch(userPositionPda);
  const sharesReceived = outcome === 'yes'
    ? position.yesShares.toNumber()
    : position.noShares.toNumber();

  return {
    signature: tx,
    sharesReceived,
  };
}

/**
 * Sell shares in a market
 */
export async function sellShares(
  program: Program,
  marketPubkey: PublicKey,
  user: Keypair,
  outcome: 'yes' | 'no',
  sharesToSell: number,
  minProceedsLamports: number
): Promise<{ signature: string; proceedsReceived: number }> {
  const [userPositionPda] = getUserPositionPda(marketPubkey, user.publicKey, program.programId);
  const [globalConfigPda] = getGlobalConfigPda(program.programId);

  const userBalanceBefore = await program.provider.connection.getBalance(user.publicKey);

  const tx = await program.methods
    .sellShares(outcome === 'yes', sharesToSell, minProceedsLamports)
    .accounts({
      market: marketPubkey,
      user: user.publicKey,
      userPosition: userPositionPda,
      globalConfig: globalConfigPda,
    })
    .signers([user])
    .rpc();

  const userBalanceAfter = await program.provider.connection.getBalance(user.publicKey);
  const proceedsReceived = userBalanceAfter - userBalanceBefore;

  return {
    signature: tx,
    proceedsReceived,
  };
}

/**
 * Get market account data
 */
export async function getMarketAccount(program: Program, marketPubkey: PublicKey): Promise<any> {
  return await program.account.market.fetch(marketPubkey);
}

/**
 * Get user position account data
 */
export async function getUserPosition(
  program: Program,
  marketPubkey: PublicKey,
  userPubkey: PublicKey
): Promise<any> {
  const [userPositionPda] = getUserPositionPda(marketPubkey, userPubkey, program.programId);
  return await program.account.userPosition.fetch(userPositionPda);
}
