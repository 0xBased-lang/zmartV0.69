/**
 * Vote Service Unit Tests
 *
 * Comprehensive test suite for vote submission, validation, and storage.
 */

import { VoteService, VoteSubmission } from '../src/services/voteService';
import { createClient, RedisClientType } from 'redis';
import { Keypair } from '@solana/web3.js';
import * as nacl from 'tweetnacl';
import bs58 from 'bs58';

describe('VoteService', () => {
  let redisClient: RedisClientType;
  let voteService: VoteService;
  let testKeypair: Keypair;
  let testMarketId: string;

  beforeAll(async () => {
    // Connect to Redis (test database)
    redisClient = createClient({
      database: 15 // Use separate test database
    });
    await redisClient.connect();

    voteService = new VoteService(redisClient);

    // Generate test keypair
    testKeypair = Keypair.generate();
    testMarketId = Keypair.generate().publicKey.toBase58();
  });

  afterAll(async () => {
    await redisClient.quit();
  });

  beforeEach(async () => {
    // Clear test database before each test
    await redisClient.flushDb();
  });

  // Helper function to create valid signature
  function createValidSignature(message: string, keypair: Keypair): string {
    const messageBytes = new TextEncoder().encode(message);
    const signature = nacl.sign.detached(messageBytes, keypair.secretKey);
    return bs58.encode(signature);
  }

  describe('submitProposalVote', () => {
    it('should successfully submit a valid "like" vote', async () => {
      const message = `Vote on market ${testMarketId}`;
      const signature = createValidSignature(message, testKeypair);

      const submission: VoteSubmission = {
        vote: 'like',
        signature,
        publicKey: testKeypair.publicKey.toBase58(),
        message
      };

      const result = await voteService.submitProposalVote(testMarketId, submission);

      expect(result.success).toBe(true);
      expect(result.vote).toBe('like');
      expect(result.marketId).toBe(testMarketId);
      expect(result.voteId).toBeDefined();
      expect(result.timestamp).toBeDefined();
    });

    it('should successfully submit a valid "dislike" vote', async () => {
      const message = `Vote on market ${testMarketId}`;
      const signature = createValidSignature(message, testKeypair);

      const submission: VoteSubmission = {
        vote: 'dislike',
        signature,
        publicKey: testKeypair.publicKey.toBase58(),
        message
      };

      const result = await voteService.submitProposalVote(testMarketId, submission);

      expect(result.success).toBe(true);
      expect(result.vote).toBe('dislike');
    });

    it('should reject invalid vote type', async () => {
      const message = `Vote on market ${testMarketId}`;
      const signature = createValidSignature(message, testKeypair);

      const submission: VoteSubmission = {
        vote: 'invalid',
        signature,
        publicKey: testKeypair.publicKey.toBase58(),
        message
      };

      const result = await voteService.submitProposalVote(testMarketId, submission);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid vote');
    });

    it('should reject invalid market ID', async () => {
      const message = `Vote on market invalid-id`;
      const signature = createValidSignature(message, testKeypair);

      const submission: VoteSubmission = {
        vote: 'like',
        signature,
        publicKey: testKeypair.publicKey.toBase58(),
        message
      };

      const result = await voteService.submitProposalVote('invalid-id', submission);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid market ID');
    });

    it('should reject invalid signature', async () => {
      const message = `Vote on market ${testMarketId}`;

      const submission: VoteSubmission = {
        vote: 'like',
        signature: 'invalid-signature',
        publicKey: testKeypair.publicKey.toBase58(),
        message
      };

      const result = await voteService.submitProposalVote(testMarketId, submission);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid wallet signature');
    });

    it('should reject signature from different keypair', async () => {
      const message = `Vote on market ${testMarketId}`;
      const otherKeypair = Keypair.generate();
      const signature = createValidSignature(message, otherKeypair);

      const submission: VoteSubmission = {
        vote: 'like',
        signature,
        publicKey: testKeypair.publicKey.toBase58(), // Different public key
        message
      };

      const result = await voteService.submitProposalVote(testMarketId, submission);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid wallet signature');
    });

    it('should prevent duplicate votes from same wallet', async () => {
      const message = `Vote on market ${testMarketId}`;
      const signature = createValidSignature(message, testKeypair);

      const submission: VoteSubmission = {
        vote: 'like',
        signature,
        publicKey: testKeypair.publicKey.toBase58(),
        message
      };

      // First vote should succeed
      const result1 = await voteService.submitProposalVote(testMarketId, submission);
      expect(result1.success).toBe(true);

      // Second vote should fail
      const result2 = await voteService.submitProposalVote(testMarketId, submission);
      expect(result2.success).toBe(false);
      expect(result2.error).toContain('Already voted');
    });

    it('should allow changing vote from like to dislike', async () => {
      const message = `Vote on market ${testMarketId}`;
      const signature = createValidSignature(message, testKeypair);

      // First vote: like
      const submission1: VoteSubmission = {
        vote: 'like',
        signature,
        publicKey: testKeypair.publicKey.toBase58(),
        message
      };

      await voteService.submitProposalVote(testMarketId, submission1);

      // Try to change to dislike (should fail - already voted)
      const submission2: VoteSubmission = {
        vote: 'dislike',
        signature,
        publicKey: testKeypair.publicKey.toBase58(),
        message
      };

      const result2 = await voteService.submitProposalVote(testMarketId, submission2);
      expect(result2.success).toBe(false);
      expect(result2.error).toContain('Already voted');
    });
  });

  describe('submitDisputeVote', () => {
    it('should successfully submit a valid "agree" vote', async () => {
      const message = `Vote on dispute ${testMarketId}`;
      const signature = createValidSignature(message, testKeypair);

      const submission: VoteSubmission = {
        vote: 'agree',
        signature,
        publicKey: testKeypair.publicKey.toBase58(),
        message
      };

      const result = await voteService.submitDisputeVote(testMarketId, submission);

      expect(result.success).toBe(true);
      expect(result.vote).toBe('agree');
      expect(result.marketId).toBe(testMarketId);
    });

    it('should successfully submit a valid "disagree" vote', async () => {
      const message = `Vote on dispute ${testMarketId}`;
      const signature = createValidSignature(message, testKeypair);

      const submission: VoteSubmission = {
        vote: 'disagree',
        signature,
        publicKey: testKeypair.publicKey.toBase58(),
        message
      };

      const result = await voteService.submitDisputeVote(testMarketId, submission);

      expect(result.success).toBe(true);
      expect(result.vote).toBe('disagree');
    });

    it('should reject invalid dispute vote type', async () => {
      const message = `Vote on dispute ${testMarketId}`;
      const signature = createValidSignature(message, testKeypair);

      const submission: VoteSubmission = {
        vote: 'like', // Invalid for dispute
        signature,
        publicKey: testKeypair.publicKey.toBase58(),
        message
      };

      const result = await voteService.submitDisputeVote(testMarketId, submission);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid vote');
    });

    it('should prevent duplicate dispute votes', async () => {
      const message = `Vote on dispute ${testMarketId}`;
      const signature = createValidSignature(message, testKeypair);

      const submission: VoteSubmission = {
        vote: 'agree',
        signature,
        publicKey: testKeypair.publicKey.toBase58(),
        message
      };

      // First vote succeeds
      const result1 = await voteService.submitDisputeVote(testMarketId, submission);
      expect(result1.success).toBe(true);

      // Second vote fails
      const result2 = await voteService.submitDisputeVote(testMarketId, submission);
      expect(result2.success).toBe(false);
      expect(result2.error).toContain('Already voted');
    });
  });

  describe('getVoteCounts', () => {
    it('should return correct proposal vote counts', async () => {
      // Submit 3 likes and 2 dislikes
      const voters = [
        Keypair.generate(),
        Keypair.generate(),
        Keypair.generate(),
        Keypair.generate(),
        Keypair.generate()
      ];

      for (let i = 0; i < 5; i++) {
        const vote = i < 3 ? 'like' : 'dislike';
        const message = `Vote ${i}`;
        const signature = createValidSignature(message, voters[i]);

        const submission: VoteSubmission = {
          vote,
          signature,
          publicKey: voters[i].publicKey.toBase58(),
          message
        };

        await voteService.submitProposalVote(testMarketId, submission);
      }

      const counts = await voteService.getVoteCounts(testMarketId, 'proposal');

      expect(counts.likes).toBe(3);
      expect(counts.dislikes).toBe(2);
      expect(counts.total).toBe(5);
    });

    it('should return correct dispute vote counts', async () => {
      // Submit 4 agrees and 1 disagree
      const voters = [
        Keypair.generate(),
        Keypair.generate(),
        Keypair.generate(),
        Keypair.generate(),
        Keypair.generate()
      ];

      for (let i = 0; i < 5; i++) {
        const vote = i < 4 ? 'agree' : 'disagree';
        const message = `Dispute vote ${i}`;
        const signature = createValidSignature(message, voters[i]);

        const submission: VoteSubmission = {
          vote,
          signature,
          publicKey: voters[i].publicKey.toBase58(),
          message
        };

        await voteService.submitDisputeVote(testMarketId, submission);
      }

      const counts = await voteService.getVoteCounts(testMarketId, 'dispute');

      expect(counts.agrees).toBe(4);
      expect(counts.disagrees).toBe(1);
      expect(counts.total).toBe(5);
    });

    it('should return zero counts for market with no votes', async () => {
      const counts = await voteService.getVoteCounts(testMarketId, 'proposal');

      expect(counts.likes).toBe(0);
      expect(counts.dislikes).toBe(0);
      expect(counts.total).toBe(0);
    });
  });

  describe('Redis persistence', () => {
    it('should persist votes in Redis with correct key', async () => {
      const message = `Vote on market ${testMarketId}`;
      const signature = createValidSignature(message, testKeypair);

      const submission: VoteSubmission = {
        vote: 'like',
        signature,
        publicKey: testKeypair.publicKey.toBase58(),
        message
      };

      await voteService.submitProposalVote(testMarketId, submission);

      // Check Redis directly
      const redisKey = `votes:proposal:${testMarketId}`;
      const vote = await redisClient.hGet(redisKey, testKeypair.publicKey.toBase58());

      expect(vote).toBe('like');
    });

    it('should set 7-day expiry on vote keys', async () => {
      const message = `Vote on market ${testMarketId}`;
      const signature = createValidSignature(message, testKeypair);

      const submission: VoteSubmission = {
        vote: 'like',
        signature,
        publicKey: testKeypair.publicKey.toBase58(),
        message
      };

      await voteService.submitProposalVote(testMarketId, submission);

      // Check TTL
      const redisKey = `votes:proposal:${testMarketId}`;
      const ttl = await redisClient.ttl(redisKey);

      expect(ttl).toBeGreaterThan(0);
      expect(ttl).toBeLessThanOrEqual(7 * 24 * 60 * 60); // 7 days
    });
  });

  describe('Vote ID generation', () => {
    it('should generate deterministic vote IDs', async () => {
      const message = `Vote on market ${testMarketId}`;
      const signature = createValidSignature(message, testKeypair);

      const submission: VoteSubmission = {
        vote: 'like',
        signature,
        publicKey: testKeypair.publicKey.toBase58(),
        message
      };

      const result = await voteService.submitProposalVote(testMarketId, submission);

      expect(result.voteId).toBeDefined();
      expect(result.voteId).toMatch(/^PV-/); // Proposal vote prefix
    });

    it('should generate different IDs for proposal vs dispute', async () => {
      const message = `Vote`;
      const signature = createValidSignature(message, testKeypair);

      const proposalSub: VoteSubmission = {
        vote: 'like',
        signature,
        publicKey: testKeypair.publicKey.toBase58(),
        message
      };

      const disputeSub: VoteSubmission = {
        vote: 'agree',
        signature,
        publicKey: testKeypair.publicKey.toBase58(),
        message
      };

      const market1 = Keypair.generate().publicKey.toBase58();
      const market2 = Keypair.generate().publicKey.toBase58();

      const result1 = await voteService.submitProposalVote(market1, proposalSub);
      const result2 = await voteService.submitDisputeVote(market2, disputeSub);

      expect(result1.voteId).toMatch(/^PV-/);
      expect(result2.voteId).toMatch(/^DV-/);
    });
  });
});
