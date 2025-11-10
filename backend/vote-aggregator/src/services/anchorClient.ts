/**
 * Anchor Client for ZMART Core Program
 *
 * Handles all on-chain interactions with the zmart-core Anchor program.
 * Provides typed interfaces for vote aggregation instructions.
 */

import { AnchorProvider, Program, Wallet, Idl } from '@coral-xyz/anchor';
import { Connection, Keypair, PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js';
import type { ZmartCore } from '../../../../target/types/zmart_core';
import idl from '../../../../target/idl/zmart_core.json';
import { logger } from '../utils/logger';

/**
 * Result of an on-chain aggregation transaction
 */
export interface AggregationTxResult {
  signature: string;
  success: boolean;
  error?: string;
}

/**
 * Anchor client for zmart-core program interactions
 */
export class AnchorClient {
  private program: Program<ZmartCore>;
  private provider: AnchorProvider;
  private globalConfigPda: PublicKey;
  private programId: PublicKey;

  constructor(
    connection: Connection,
    payerKeypair: Keypair,
    programId: string
  ) {
    this.programId = new PublicKey(programId);

    // Create wallet from keypair
    const wallet: Wallet = {
      publicKey: payerKeypair.publicKey,
      signTransaction: async <T extends Transaction | VersionedTransaction>(tx: T): Promise<T> => {
        if (tx instanceof Transaction) {
          tx.partialSign(payerKeypair);
        }
        return tx;
      },
      signAllTransactions: async <T extends Transaction | VersionedTransaction>(txs: T[]): Promise<T[]> => {
        txs.forEach((tx) => {
          if (tx instanceof Transaction) {
            tx.partialSign(payerKeypair);
          }
        });
        return txs;
      },
      payer: payerKeypair,
    };

    // Create provider
    this.provider = new AnchorProvider(
      connection,
      wallet,
      {
        commitment: 'confirmed',
        preflightCommitment: 'confirmed',
      }
    );

    // Initialize program with IDL
    try {
      logger.info('Attempting to create Anchor Program', {
        programId: this.programId.toBase58(),
        idlAddress: (idl as any).address,
        idlName: (idl as any).metadata?.name,
        idlVersion: (idl as any).metadata?.version,
      });

      // Use raw IDL JSON, Anchor will handle type inference
      this.program = new Program(
        idl as any,
        this.provider
      ) as Program<ZmartCore>;

      logger.info('Anchor Program created successfully', {
        programId: this.program.programId.toBase58(),
      });
    } catch (error) {
      logger.error('Failed to create Anchor Program', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        programId: this.programId.toBase58(),
      });
      throw error;
    }

    // Derive GlobalConfig PDA
    const [globalConfigPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('global_config')],
      this.programId
    );
    this.globalConfigPda = globalConfigPda;

    logger.info('AnchorClient initialized', {
      programId: this.programId.toBase58(),
      globalConfig: this.globalConfigPda.toBase58(),
      payer: payerKeypair.publicKey.toBase58(),
    });
  }

  /**
   * Aggregate proposal votes on-chain
   *
   * Calls the aggregate_proposal_votes instruction with the given vote counts.
   * If approval threshold (70%) is met, market transitions PROPOSED → APPROVED.
   *
   * @param marketPubkey - Public key of the market account
   * @param finalLikes - Total number of "like" votes
   * @param finalDislikes - Total number of "dislike" votes
   * @returns Transaction signature if successful
   */
  async aggregateProposalVotes(
    marketPubkey: PublicKey,
    finalLikes: number,
    finalDislikes: number
  ): Promise<AggregationTxResult> {
    try {
      logger.info('Aggregating proposal votes on-chain', {
        market: marketPubkey.toBase58(),
        likes: finalLikes,
        dislikes: finalDislikes,
        total: finalLikes + finalDislikes,
      });

      // Call aggregate_proposal_votes instruction
      // Note: Account names must match IDL (snake_case: global_config, backend_authority)
      const tx = await this.program.methods
        .aggregateProposalVotes(finalLikes, finalDislikes)
        .accounts({
          market: marketPubkey,
          global_config: this.globalConfigPda,
          backend_authority: this.provider.wallet.publicKey,
        } as any)
        .rpc();

      logger.info('Proposal votes aggregated successfully', {
        market: marketPubkey.toBase58(),
        signature: tx,
        likes: finalLikes,
        dislikes: finalDislikes,
      });

      return {
        signature: tx,
        success: true,
      };
    } catch (error) {
      // Parse Anchor errors for better diagnostics
      const errorMessage = this.parseAnchorError(error);

      logger.error('Failed to aggregate proposal votes', {
        market: marketPubkey.toBase58(),
        likes: finalLikes,
        dislikes: finalDislikes,
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
      });

      return {
        signature: '',
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Aggregate dispute votes on-chain
   *
   * Calls the aggregate_dispute_votes instruction with the given vote counts.
   * If dispute threshold (60%) is met, market returns to RESOLVING state.
   * Otherwise, market transitions to FINALIZED with original resolution.
   *
   * @param marketPubkey - Public key of the market account
   * @param finalAgrees - Total number of "agree with dispute" votes
   * @param finalDisagrees - Total number of "disagree with dispute" votes
   * @returns Transaction signature if successful
   */
  async aggregateDisputeVotes(
    marketPubkey: PublicKey,
    finalAgrees: number,
    finalDisagrees: number
  ): Promise<AggregationTxResult> {
    try {
      logger.info('Aggregating dispute votes on-chain', {
        market: marketPubkey.toBase58(),
        agrees: finalAgrees,
        disagrees: finalDisagrees,
        total: finalAgrees + finalDisagrees,
      });

      // Call aggregate_dispute_votes instruction
      // Note: Account names must match IDL (snake_case: global_config, backend_authority)
      const tx = await this.program.methods
        .aggregateDisputeVotes(finalAgrees, finalDisagrees)
        .accounts({
          market: marketPubkey,
          global_config: this.globalConfigPda,
          backend_authority: this.provider.wallet.publicKey,
        } as any)
        .rpc();

      logger.info('Dispute votes aggregated successfully', {
        market: marketPubkey.toBase58(),
        signature: tx,
        agrees: finalAgrees,
        disagrees: finalDisagrees,
      });

      return {
        signature: tx,
        success: true,
      };
    } catch (error) {
      // Parse Anchor errors for better diagnostics
      const errorMessage = this.parseAnchorError(error);

      logger.error('Failed to aggregate dispute votes', {
        market: marketPubkey.toBase58(),
        agrees: finalAgrees,
        disagrees: finalDisagrees,
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
      });

      return {
        signature: '',
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Parse Anchor error for human-readable message
   *
   * Anchor errors can be:
   * - Program errors (custom error codes)
   * - Simulation errors (account not found, etc.)
   * - RPC errors (network issues)
   *
   * @param error - The error object from Anchor
   * @returns Human-readable error message
   */
  private parseAnchorError(error: any): string {
    // Check for Anchor program error codes
    if (error?.error?.errorCode) {
      const code = error.error.errorCode;
      return `Program error: ${code.code} - ${code.message}`;
    }

    // Check for simulation errors
    if (error?.logs) {
      const logs = error.logs as string[];
      const errorLog = logs.find((log) => log.includes('Error'));
      if (errorLog) {
        return `Simulation error: ${errorLog}`;
      }
    }

    // Check for common error patterns
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (errorMessage.includes('Account does not exist')) {
      return 'Market account not found (invalid PDA or market not created)';
    }

    if (errorMessage.includes('InvalidStateForVoting')) {
      return 'Market not in correct state for vote aggregation';
    }

    if (errorMessage.includes('Unauthorized')) {
      return 'Backend authority does not match global config';
    }

    if (errorMessage.includes('429')) {
      return 'RPC rate limit exceeded (will retry)';
    }

    if (errorMessage.includes('timeout')) {
      return 'RPC request timeout (will retry)';
    }

    // Return generic error message
    return errorMessage;
  }

  /**
   * Get program ID
   */
  getProgramId(): PublicKey {
    return this.programId;
  }

  /**
   * Get GlobalConfig PDA
   */
  getGlobalConfigPda(): PublicKey {
    return this.globalConfigPda;
  }

  /**
   * Get provider (for advanced usage)
   */
  getProvider(): AnchorProvider {
    return this.provider;
  }

  /**
   * Get program instance (for advanced usage)
   */
  getProgram(): Program<ZmartCore> {
    return this.program;
  }
}
