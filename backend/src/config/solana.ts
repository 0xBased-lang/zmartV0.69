// ============================================================
// Solana Configuration
// ============================================================
// Purpose: Initialize Solana connection and load backend keypair
// Pattern Prevention: #6 (Security Afterthought) - Secure keypair handling

import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { AnchorProvider, Program, Wallet } from "@coral-xyz/anchor";
import { config } from "./env";
import logger from "../utils/logger";
import fs from "fs";

// Singleton instances
let connection: Connection | null = null;
let backendKeypair: Keypair | null = null;
let provider: AnchorProvider | null = null;

/**
 * Get or create Solana connection
 * @returns Solana connection instance
 */
export function getConnection(): Connection {
  if (!connection) {
    logger.info("Initializing Solana connection", {
      rpcUrl: config.solana.rpcUrl,
    });

    connection = new Connection(config.solana.rpcUrl, {
      commitment: "confirmed",
      confirmTransactionInitialTimeout: 60000,
    });

    logger.info("Solana connection initialized successfully");
  }

  return connection;
}

/**
 * Load backend authority keypair from file
 * @returns Backend keypair
 */
export function getBackendKeypair(): Keypair {
  if (!backendKeypair) {
    try {
      logger.info("Loading backend keypair", {
        path: config.solana.backendKeypairPath,
      });

      const keypairData = fs.readFileSync(
        config.solana.backendKeypairPath,
        "utf-8"
      );
      const secretKey = Uint8Array.from(JSON.parse(keypairData));
      backendKeypair = Keypair.fromSecretKey(secretKey);

      logger.info("Backend keypair loaded successfully", {
        publicKey: backendKeypair.publicKey.toBase58(),
      });
    } catch (error) {
      logger.error("Failed to load backend keypair", { error });
      throw new Error(
        `Failed to load backend keypair from ${config.solana.backendKeypairPath}`
      );
    }
  }

  return backendKeypair;
}

/**
 * Get Anchor provider
 * @returns Anchor provider instance
 */
export function getProvider(): AnchorProvider {
  if (!provider) {
    const conn = getConnection();
    const keypair = getBackendKeypair();

    const wallet = {
      publicKey: keypair.publicKey,
      signTransaction: async (tx: any) => {
        tx.sign([keypair]);
        return tx;
      },
      signAllTransactions: async (txs: any[]) => {
        return txs.map((tx) => {
          tx.sign([keypair]);
          return tx;
        });
      },
    } as Wallet;

    provider = new AnchorProvider(conn, wallet, {
      commitment: "confirmed",
      preflightCommitment: "confirmed",
    });

    logger.info("Anchor provider initialized successfully");
  }

  return provider;
}

/**
 * Get program IDs
 * @returns Program IDs for core and proposal programs
 */
export function getProgramIds() {
  return {
    core: new PublicKey(config.solana.programIds.core),
    proposal: new PublicKey(config.solana.programIds.proposal),
  };
}

/**
 * Test Solana connection
 * @returns True if connection successful
 */
export async function testSolanaConnection(): Promise<boolean> {
  try {
    const conn = getConnection();

    // Get slot to test connection
    const slot = await conn.getSlot();

    logger.info("Solana connection test successful", { slot });
    return true;
  } catch (error) {
    logger.error("Solana connection test failed", { error });
    return false;
  }
}

/**
 * Check backend keypair balance
 * @returns Balance in lamports
 */
export async function getBackendBalance(): Promise<number> {
  try {
    const conn = getConnection();
    const keypair = getBackendKeypair();

    const balance = await conn.getBalance(keypair.publicKey);

    logger.info("Backend balance retrieved", {
      balance,
      sol: balance / 1e9,
    });

    return balance;
  } catch (error) {
    logger.error("Failed to get backend balance", { error });
    throw error;
  }
}

export default {
  getConnection,
  getBackendKeypair,
  getProvider,
  getProgramIds,
  testSolanaConnection,
  getBackendBalance,
};
