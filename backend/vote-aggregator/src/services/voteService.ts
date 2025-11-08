/**
 * Vote Service
 *
 * Handles vote submission, validation, and storage.
 * Implements comprehensive security checks and signature verification.
 */

import { PublicKey } from '@solana/web3.js';
import * as nacl from 'tweetnacl';
import bs58 from 'bs58';
import { createClient, RedisClientType } from 'redis';
import { logger } from '../utils/logger';

export type ProposalVote = 'like' | 'dislike';
export type DisputeVote = 'agree' | 'disagree';

export interface VoteSubmission {
  vote: string;
  signature: string;
  publicKey: string;
  message: string;
}

export interface VoteResponse {
  success: boolean;
  voteId?: string;
  marketId?: string;
  vote?: string;
  timestamp?: number;
  error?: string;
}

export class VoteService {
  private redisClient: RedisClientType;
  private readonly VOTE_EXPIRY_SECONDS = 7 * 24 * 60 * 60; // 7 days

  constructor(redisClient: RedisClientType) {
    this.redisClient = redisClient;
  }

  /**
   * Submit a proposal vote (like/dislike)
   */
  async submitProposalVote(
    marketId: string,
    submission: VoteSubmission
  ): Promise<VoteResponse> {
    try {
      // Validate vote type
      if (submission.vote !== 'like' && submission.vote !== 'dislike') {
        return {
          success: false,
          error: 'Invalid vote. Must be "like" or "dislike"'
        };
      }

      // Validate market ID
      if (!this.isValidPublicKey(marketId)) {
        return {
          success: false,
          error: 'Invalid market ID'
        };
      }

      // Verify wallet signature
      const signatureValid = await this.verifySignature(
        submission.message,
        submission.signature,
        submission.publicKey
      );

      if (!signatureValid) {
        return {
          success: false,
          error: 'Invalid wallet signature'
        };
      }

      // Check user eligibility
      const eligible = await this.checkUserEligibility(submission.publicKey, marketId);
      if (!eligible.isEligible) {
        return {
          success: false,
          error: eligible.reason || 'User not eligible to vote'
        };
      }

      // Store vote in Redis
      const redisKey = `votes:proposal:${marketId}`;
      await this.redisClient.hSet(redisKey, submission.publicKey, submission.vote);

      // Set expiry on the hash (7 days)
      await this.redisClient.expire(redisKey, this.VOTE_EXPIRY_SECONDS);

      // Generate vote ID (deterministic: marketId + publicKey)
      const voteId = this.generateVoteId(marketId, submission.publicKey);

      logger.info('Proposal vote submitted', {
        voteId,
        marketId,
        voter: submission.publicKey.slice(0, 8) + '...',
        vote: submission.vote
      });

      return {
        success: true,
        voteId,
        marketId,
        vote: submission.vote,
        timestamp: Date.now()
      };

    } catch (error) {
      logger.error('Error submitting proposal vote', {
        marketId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        error: 'Internal server error'
      };
    }
  }

  /**
   * Submit a dispute vote (agree/disagree)
   */
  async submitDisputeVote(
    marketId: string,
    submission: VoteSubmission
  ): Promise<VoteResponse> {
    try {
      // Validate vote type
      if (submission.vote !== 'agree' && submission.vote !== 'disagree') {
        return {
          success: false,
          error: 'Invalid vote. Must be "agree" or "disagree"'
        };
      }

      // Validate market ID
      if (!this.isValidPublicKey(marketId)) {
        return {
          success: false,
          error: 'Invalid market ID'
        };
      }

      // Verify wallet signature
      const signatureValid = await this.verifySignature(
        submission.message,
        submission.signature,
        submission.publicKey
      );

      if (!signatureValid) {
        return {
          success: false,
          error: 'Invalid wallet signature'
        };
      }

      // Check user eligibility for disputes
      const eligible = await this.checkUserEligibility(submission.publicKey, marketId, true);
      if (!eligible.isEligible) {
        return {
          success: false,
          error: eligible.reason || 'User not eligible to vote on dispute'
        };
      }

      // Store vote in Redis
      const redisKey = `votes:dispute:${marketId}`;
      await this.redisClient.hSet(redisKey, submission.publicKey, submission.vote);

      // Set expiry on the hash (7 days)
      await this.redisClient.expire(redisKey, this.VOTE_EXPIRY_SECONDS);

      // Generate vote ID
      const voteId = this.generateVoteId(marketId, submission.publicKey, true);

      logger.info('Dispute vote submitted', {
        voteId,
        marketId,
        voter: submission.publicKey.slice(0, 8) + '...',
        vote: submission.vote
      });

      return {
        success: true,
        voteId,
        marketId,
        vote: submission.vote,
        timestamp: Date.now()
      };

    } catch (error) {
      logger.error('Error submitting dispute vote', {
        marketId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        error: 'Internal server error'
      };
    }
  }

  /**
   * Get vote counts for a market
   */
  async getVoteCounts(marketId: string, voteType: 'proposal' | 'dispute') {
    try {
      const redisKey = `votes:${voteType}:${marketId}`;
      const votes = await this.redisClient.hGetAll(redisKey);

      if (voteType === 'proposal') {
        const likes = Object.values(votes).filter(v => v === 'like').length;
        const dislikes = Object.values(votes).filter(v => v === 'dislike').length;
        return { likes, dislikes, total: likes + dislikes };
      } else {
        const agrees = Object.values(votes).filter(v => v === 'agree').length;
        const disagrees = Object.values(votes).filter(v => v === 'disagree').length;
        return { agrees, disagrees, total: agrees + disagrees };
      }
    } catch (error) {
      logger.error('Error getting vote counts', {
        marketId,
        voteType,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Verify wallet signature using ed25519
   */
  private async verifySignature(
    message: string,
    signature: string,
    publicKey: string
  ): Promise<boolean> {
    try {
      // Decode the signature from base58
      const signatureBytes = bs58.decode(signature);

      // Decode the public key from base58
      const publicKeyBytes = bs58.decode(publicKey);

      // Convert message to bytes
      const messageBytes = new TextEncoder().encode(message);

      // Verify using ed25519
      const verified = nacl.sign.detached.verify(
        messageBytes,
        signatureBytes,
        publicKeyBytes
      );

      if (!verified) {
        logger.warn('Signature verification failed', {
          publicKey: publicKey.slice(0, 8) + '...'
        });
      }

      return verified;

    } catch (error) {
      logger.error('Error verifying signature', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  /**
   * Check if user is eligible to vote
   *
   * Eligibility criteria:
   * 1. Valid Solana public key
   * 2. Has not already voted on this market
   * 3. (Future) Has minimum token holdings
   * 4. (Future) Account age requirements
   */
  private async checkUserEligibility(
    publicKey: string,
    marketId: string,
    isDispute: boolean = false
  ): Promise<{ isEligible: boolean; reason?: string }> {
    try {
      // Check valid public key
      if (!this.isValidPublicKey(publicKey)) {
        return {
          isEligible: false,
          reason: 'Invalid public key'
        };
      }

      // Check if already voted
      const voteType = isDispute ? 'dispute' : 'proposal';
      const redisKey = `votes:${voteType}:${marketId}`;
      const existingVote = await this.redisClient.hGet(redisKey, publicKey);

      if (existingVote) {
        return {
          isEligible: false,
          reason: `Already voted: ${existingVote}`
        };
      }

      // TODO: Add token holdings check
      // const hasTokens = await this.checkTokenHoldings(publicKey);
      // if (!hasTokens) {
      //   return { isEligible: false, reason: 'Insufficient token holdings' };
      // }

      // TODO: Add account age check
      // const accountAge = await this.getAccountAge(publicKey);
      // if (accountAge < MIN_ACCOUNT_AGE) {
      //   return { isEligible: false, reason: 'Account too new' };
      // }

      return { isEligible: true };

    } catch (error) {
      logger.error('Error checking user eligibility', {
        publicKey: publicKey.slice(0, 8) + '...',
        marketId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        isEligible: false,
        reason: 'Error checking eligibility'
      };
    }
  }

  /**
   * Validate Solana public key format
   */
  private isValidPublicKey(key: string): boolean {
    try {
      new PublicKey(key);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Generate deterministic vote ID
   */
  private generateVoteId(marketId: string, publicKey: string, isDispute: boolean = false): string {
    const prefix = isDispute ? 'DV' : 'PV';
    const hash = `${marketId}-${publicKey}`;
    const shortHash = Buffer.from(hash).toString('base64').slice(0, 16);
    return `${prefix}-${shortHash}`;
  }
}
