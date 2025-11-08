/**
 * Aggregation Service
 *
 * Processes votes from Redis and triggers on-chain aggregation when thresholds are met.
 * Runs every 5 minutes via cron job.
 */

import { Connection, PublicKey, Transaction, Keypair, SystemProgram } from '@solana/web3.js';
import { RedisClientType } from 'redis';
import { logger } from '../utils/logger';
import { Program, AnchorProvider, web3 } from '@coral-xyz/anchor';
import NodeWallet from '@coral-xyz/anchor/dist/cjs/nodewallet';

/**
 * Vote tally result
 */
export interface VoteTally {
  proposalId?: string;
  marketPubkey?: string;
  likes?: number;
  dislikes?: number;
  totalVotes: number;
  likePercentage?: number;
  dislikePercentage?: number;
  supportVotes?: number;
  rejectVotes?: number;
  supportPercentage?: number;
  rejectPercentage?: number;
  voters: string[];
}

/**
 * Aggregation result
 */
export interface AggregationResult {
  proposalId?: string;
  marketPubkey?: string;
  success: boolean;
  txSignature?: string;
  error?: string;
  tally: VoteTally;
  thresholdMet: boolean;
  actionTaken: 'proposal_approved' | 'proposal_rejected' | 'dispute_resolved' | 'no_action';
}

/**
 * Configuration for aggregation service
 */
export interface AggregationConfig {
  proposalThreshold: number; // Default: 70%
  disputeThreshold: number;  // Default: 60%
  minVotesRequired: number;  // Minimum votes before checking threshold
  retryAttempts: number;     // Max retry attempts for failed transactions
  retryDelay: number;        // Base delay in ms for exponential backoff
}

const DEFAULT_CONFIG: AggregationConfig = {
  proposalThreshold: 70,
  disputeThreshold: 60,
  minVotesRequired: 10,
  retryAttempts: 3,
  retryDelay: 1000
};

export class AggregationService {
  private redis: RedisClientType;
  private connection: Connection;
  private programId: PublicKey;
  private payer: Keypair;
  private config: AggregationConfig;

  constructor(
    redis: RedisClientType,
    connection: Connection,
    programId: string,
    payerKeypair: Keypair,
    config: Partial<AggregationConfig> = {}
  ) {
    this.redis = redis;
    this.connection = connection;
    this.programId = new PublicKey(programId);
    this.payer = payerKeypair;
    this.config = { ...DEFAULT_CONFIG, ...config };

    logger.info('AggregationService initialized', {
      network: connection.rpcEndpoint,
      programId: this.programId.toBase58(),
      payer: this.payer.publicKey.toBase58(),
      config: this.config
    });
  }

  /**
   * Process all pending proposal votes
   */
  async processProposalVotes(): Promise<AggregationResult[]> {
    try {
      logger.info('Starting proposal vote aggregation');

      // Scan all proposal vote keys
      const keys = await this.redis.keys('votes:proposal:*');
      logger.info(`Found ${keys.length} proposal vote sets to process`);

      const results: AggregationResult[] = [];

      for (const key of keys) {
        const proposalId = key.split(':')[2]; // Extract ID from "votes:proposal:{id}"

        try {
          const tally = await this.tallyProposalVotes(proposalId);

          logger.info('Proposal vote tally', {
            proposalId,
            ...tally
          });

          // Check if threshold met and minimum votes reached
          if (tally.totalVotes >= this.config.minVotesRequired) {
            const result = await this.aggregateProposalVotes(proposalId, tally);
            results.push(result);
          } else {
            logger.info('Proposal vote threshold not met yet', {
              proposalId,
              votesNeeded: this.config.minVotesRequired - tally.totalVotes
            });

            results.push({
              proposalId,
              success: false,
              tally,
              thresholdMet: false,
              actionTaken: 'no_action'
            });
          }

        } catch (error) {
          logger.error('Error processing proposal votes', {
            proposalId,
            error: error instanceof Error ? error.message : 'Unknown error'
          });

          results.push({
            proposalId,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            tally: { totalVotes: 0, voters: [] },
            thresholdMet: false,
            actionTaken: 'no_action'
          });
        }
      }

      logger.info('Proposal vote aggregation complete', {
        totalProcessed: keys.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length
      });

      return results;

    } catch (error) {
      logger.error('Fatal error in processProposalVotes', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Process all pending dispute votes
   */
  async processDisputeVotes(): Promise<AggregationResult[]> {
    try {
      logger.info('Starting dispute vote aggregation');

      const keys = await this.redis.keys('votes:dispute:*');
      logger.info(`Found ${keys.length} dispute vote sets to process`);

      const results: AggregationResult[] = [];

      for (const key of keys) {
        const marketPubkey = key.split(':')[2]; // Extract pubkey from "votes:dispute:{pubkey}"

        try {
          const tally = await this.tallyDisputeVotes(marketPubkey);

          logger.info('Dispute vote tally', {
            marketPubkey,
            ...tally
          });

          // Check if threshold met and minimum votes reached
          if (tally.totalVotes >= this.config.minVotesRequired) {
            const result = await this.aggregateDisputeVotes(marketPubkey, tally);
            results.push(result);
          } else {
            logger.info('Dispute vote threshold not met yet', {
              marketPubkey,
              votesNeeded: this.config.minVotesRequired - tally.totalVotes
            });

            results.push({
              marketPubkey,
              success: false,
              tally,
              thresholdMet: false,
              actionTaken: 'no_action'
            });
          }

        } catch (error) {
          logger.error('Error processing dispute votes', {
            marketPubkey,
            error: error instanceof Error ? error.message : 'Unknown error'
          });

          results.push({
            marketPubkey,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            tally: { totalVotes: 0, voters: [] },
            thresholdMet: false,
            actionTaken: 'no_action'
          });
        }
      }

      logger.info('Dispute vote aggregation complete', {
        totalProcessed: keys.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length
      });

      return results;

    } catch (error) {
      logger.error('Fatal error in processDisputeVotes', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Tally proposal votes from Redis
   */
  private async tallyProposalVotes(proposalId: string): Promise<VoteTally> {
    const key = `votes:proposal:${proposalId}`;
    const votes = await this.redis.hGetAll(key);

    let likes = 0;
    let dislikes = 0;

    for (const [voter, choice] of Object.entries(votes)) {
      if (choice === 'like') likes++;
      else if (choice === 'dislike') dislikes++;
    }

    const totalVotes = likes + dislikes;
    const likePercentage = totalVotes > 0 ? (likes / totalVotes) * 100 : 0;
    const dislikePercentage = totalVotes > 0 ? (dislikes / totalVotes) * 100 : 0;

    return {
      proposalId,
      likes,
      dislikes,
      totalVotes,
      likePercentage,
      dislikePercentage,
      voters: Object.keys(votes)
    };
  }

  /**
   * Tally dispute votes from Redis
   */
  private async tallyDisputeVotes(marketPubkey: string): Promise<VoteTally> {
    const key = `votes:dispute:${marketPubkey}`;
    const votes = await this.redis.hGetAll(key);

    let supportVotes = 0;
    let rejectVotes = 0;

    for (const [voter, choice] of Object.entries(votes)) {
      if (choice === 'support') supportVotes++;
      else if (choice === 'reject') rejectVotes++;
    }

    const totalVotes = supportVotes + rejectVotes;
    const supportPercentage = totalVotes > 0 ? (supportVotes / totalVotes) * 100 : 0;
    const rejectPercentage = totalVotes > 0 ? (rejectVotes / totalVotes) * 100 : 0;

    return {
      marketPubkey,
      supportVotes,
      rejectVotes,
      totalVotes,
      supportPercentage,
      rejectPercentage,
      voters: Object.keys(votes)
    };
  }

  /**
   * Aggregate proposal votes on-chain
   */
  private async aggregateProposalVotes(
    proposalId: string,
    tally: VoteTally
  ): Promise<AggregationResult> {
    try {
      const { likePercentage = 0 } = tally;

      // Check if threshold met (70% like rate)
      const thresholdMet = likePercentage >= this.config.proposalThreshold;

      if (!thresholdMet) {
        logger.info('Proposal threshold not met, no action taken', {
          proposalId,
          likePercentage,
          threshold: this.config.proposalThreshold
        });

        return {
          proposalId,
          success: true,
          tally,
          thresholdMet: false,
          actionTaken: 'no_action'
        };
      }

      // Build transaction with retries
      const txSignature = await this.sendTransactionWithRetry(
        () => this.buildProposalAggregationTx(proposalId, tally)
      );

      // Clear votes from Redis after successful aggregation
      await this.redis.del(`votes:proposal:${proposalId}`);

      logger.info('Proposal votes aggregated successfully', {
        proposalId,
        txSignature,
        ...tally
      });

      return {
        proposalId,
        success: true,
        txSignature,
        tally,
        thresholdMet: true,
        actionTaken: 'proposal_approved'
      };

    } catch (error) {
      logger.error('Failed to aggregate proposal votes', {
        proposalId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });

      return {
        proposalId,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        tally,
        thresholdMet: true,
        actionTaken: 'no_action'
      };
    }
  }

  /**
   * Aggregate dispute votes on-chain
   */
  private async aggregateDisputeVotes(
    marketPubkey: string,
    tally: VoteTally
  ): Promise<AggregationResult> {
    try {
      const { supportPercentage = 0 } = tally;

      // Check if threshold met (60% support rate)
      const thresholdMet = supportPercentage >= this.config.disputeThreshold;

      if (!thresholdMet) {
        logger.info('Dispute threshold not met, no action taken', {
          marketPubkey,
          supportPercentage,
          threshold: this.config.disputeThreshold
        });

        return {
          marketPubkey,
          success: true,
          tally,
          thresholdMet: false,
          actionTaken: 'no_action'
        };
      }

      // Build transaction with retries
      const txSignature = await this.sendTransactionWithRetry(
        () => this.buildDisputeAggregationTx(marketPubkey, tally)
      );

      // Clear votes from Redis after successful aggregation
      await this.redis.del(`votes:dispute:${marketPubkey}`);

      logger.info('Dispute votes aggregated successfully', {
        marketPubkey,
        txSignature,
        ...tally
      });

      return {
        marketPubkey,
        success: true,
        txSignature,
        tally,
        thresholdMet: true,
        actionTaken: 'dispute_resolved'
      };

    } catch (error) {
      logger.error('Failed to aggregate dispute votes', {
        marketPubkey,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });

      return {
        marketPubkey,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        tally,
        thresholdMet: true,
        actionTaken: 'no_action'
      };
    }
  }

  /**
   * Build proposal aggregation transaction
   *
   * This will call the aggregate_proposal_votes instruction on the zmart-proposal program
   */
  private async buildProposalAggregationTx(
    proposalId: string,
    tally: VoteTally
  ): Promise<string> {
    // TODO: Implement actual Anchor instruction call
    // For now, return a mock transaction signature

    logger.info('Building proposal aggregation transaction', {
      proposalId,
      likes: tally.likes,
      dislikes: tally.dislikes,
      totalVotes: tally.totalVotes
    });

    // Simulate transaction
    const signature = 'MOCK_TX_' + Date.now();

    return signature;
  }

  /**
   * Build dispute aggregation transaction
   *
   * This will call the aggregate_dispute_votes instruction on the zmart-proposal program
   */
  private async buildDisputeAggregationTx(
    marketPubkey: string,
    tally: VoteTally
  ): Promise<string> {
    // TODO: Implement actual Anchor instruction call
    // For now, return a mock transaction signature

    logger.info('Building dispute aggregation transaction', {
      marketPubkey,
      supportVotes: tally.supportVotes,
      rejectVotes: tally.rejectVotes,
      totalVotes: tally.totalVotes
    });

    // Simulate transaction
    const signature = 'MOCK_TX_' + Date.now();

    return signature;
  }

  /**
   * Send transaction with exponential backoff retry
   */
  private async sendTransactionWithRetry(
    buildTxFn: () => Promise<string>,
    attempt: number = 1
  ): Promise<string> {
    try {
      const signature = await buildTxFn();
      return signature;

    } catch (error) {
      if (attempt >= this.config.retryAttempts) {
        logger.error('Transaction failed after max retries', {
          attempt,
          maxAttempts: this.config.retryAttempts,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        throw error;
      }

      // Exponential backoff: delay = baseDelay * 2^(attempt-1)
      const delay = this.config.retryDelay * Math.pow(2, attempt - 1);

      logger.warn('Transaction failed, retrying', {
        attempt,
        maxAttempts: this.config.retryAttempts,
        delay,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      await this.sleep(delay);
      return this.sendTransactionWithRetry(buildTxFn, attempt + 1);
    }
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get aggregation statistics
   */
  async getStats(): Promise<{
    proposalVoteSets: number;
    disputeVoteSets: number;
    totalPendingVotes: number;
  }> {
    const proposalKeys = await this.redis.keys('votes:proposal:*');
    const disputeKeys = await this.redis.keys('votes:dispute:*');

    let totalPendingVotes = 0;

    // Count all votes
    for (const key of proposalKeys) {
      const votes = await this.redis.hLen(key);
      totalPendingVotes += votes;
    }

    for (const key of disputeKeys) {
      const votes = await this.redis.hLen(key);
      totalPendingVotes += votes;
    }

    return {
      proposalVoteSets: proposalKeys.length,
      disputeVoteSets: disputeKeys.length,
      totalPendingVotes
    };
  }
}
