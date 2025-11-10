/**
 * Aggregation Service Unit Tests
 *
 * Test vote aggregation, threshold checking, and on-chain submission logic.
 */

import { AggregationService } from '../src/services/aggregationService';
import { createClient, RedisClientType } from 'redis';
import { Connection, Keypair } from '@solana/web3.js';

describe('AggregationService', () => {
  let redis: RedisClientType;
  let aggregationService: AggregationService;
  let connection: Connection;
  let testKeypair: Keypair;

  const PROGRAM_ID = '7h3gXfBfYFueFVLYyfL5Qo1QGsf4GQUfW96FKVgnUsJS';

  beforeAll(async () => {
    // Create Redis client
    redis = createClient({
      socket: {
        host: 'localhost',
        port: 6379
      }
    });

    await redis.connect();

    // Create Solana connection
    connection = new Connection('https://api.devnet.solana.com', 'confirmed');

    // Create test keypair
    testKeypair = Keypair.generate();

    // Initialize service
    aggregationService = new AggregationService(
      redis,
      connection,
      PROGRAM_ID,
      testKeypair,
      {
        proposalThreshold: 70,
        disputeThreshold: 60,
        minVotesRequired: 10
      }
    );
  });

  afterAll(async () => {
    await redis.quit();
  });

  beforeEach(async () => {
    // Clear all vote keys
    const keys = await redis.keys('votes:*');
    if (keys.length > 0) {
      await redis.del(keys);
    }
  });

  describe('Proposal Vote Aggregation', () => {
    it('should tally proposal votes correctly', async () => {
      const proposalId = 'test-proposal-1';
      const key = `votes:proposal:${proposalId}`;

      // Add test votes
      await redis.hSet(key, 'voter1', 'like');
      await redis.hSet(key, 'voter2', 'like');
      await redis.hSet(key, 'voter3', 'like');
      await redis.hSet(key, 'voter4', 'like');
      await redis.hSet(key, 'voter5', 'like');
      await redis.hSet(key, 'voter6', 'like');
      await redis.hSet(key, 'voter7', 'like');
      await redis.hSet(key, 'voter8', 'dislike');
      await redis.hSet(key, 'voter9', 'dislike');
      await redis.hSet(key, 'voter10', 'dislike');

      const results = await aggregationService.processProposalVotes();

      expect(results.length).toBeGreaterThan(0);

      const result = results.find(r => r.proposalId === proposalId);
      expect(result).toBeDefined();
      expect(result?.tally.totalVotes).toBe(10);
      expect(result?.tally.likes).toBe(7);
      expect(result?.tally.dislikes).toBe(3);
      expect(result?.tally.likePercentage).toBe(70);
    });

    it('should approve proposal when threshold met (70% likes)', async () => {
      const proposalId = 'test-proposal-2';
      const key = `votes:proposal:${proposalId}`;

      // Add votes: 12 likes (75%), 4 dislikes (25%)
      for (let i = 1; i <= 12; i++) {
        await redis.hSet(key, `voter${i}`, 'like');
      }
      for (let i = 13; i <= 16; i++) {
        await redis.hSet(key, `voter${i}`, 'dislike');
      }

      const results = await aggregationService.processProposalVotes();

      const result = results.find(r => r.proposalId === proposalId);
      expect(result).toBeDefined();
      expect(result?.thresholdMet).toBe(true);
      expect(result?.actionTaken).toBe('proposal_approved');
      expect(result?.success).toBe(true);
      expect(result?.txSignature).toBeDefined();
    });

    it('should not approve proposal when threshold not met (< 70% likes)', async () => {
      const proposalId = 'test-proposal-3';
      const key = `votes:proposal:${proposalId}`;

      // Add votes: 6 likes (60%), 4 dislikes (40%)
      for (let i = 1; i <= 6; i++) {
        await redis.hSet(key, `voter${i}`, 'like');
      }
      for (let i = 7; i <= 10; i++) {
        await redis.hSet(key, `voter${i}`, 'dislike');
      }

      const results = await aggregationService.processProposalVotes();

      const result = results.find(r => r.proposalId === proposalId);
      expect(result).toBeDefined();
      expect(result?.thresholdMet).toBe(false);
      expect(result?.actionTaken).toBe('no_action');
    });

    it('should not process proposal with insufficient votes', async () => {
      const proposalId = 'test-proposal-4';
      const key = `votes:proposal:${proposalId}`;

      // Add only 5 votes (min required: 10)
      for (let i = 1; i <= 5; i++) {
        await redis.hSet(key, `voter${i}`, 'like');
      }

      const results = await aggregationService.processProposalVotes();

      const result = results.find(r => r.proposalId === proposalId);
      expect(result).toBeDefined();
      expect(result?.thresholdMet).toBe(false);
      expect(result?.actionTaken).toBe('no_action');
      expect(result?.tally.totalVotes).toBe(5);
    });

    it('should clear Redis votes after successful aggregation', async () => {
      const proposalId = 'test-proposal-5';
      const key = `votes:proposal:${proposalId}`;

      // Add votes above threshold
      for (let i = 1; i <= 15; i++) {
        await redis.hSet(key, `voter${i}`, 'like');
      }

      await aggregationService.processProposalVotes();

      // Check that votes were cleared
      const exists = await redis.exists(key);
      expect(exists).toBe(0);
    });
  });

  describe('Dispute Vote Aggregation', () => {
    it('should tally dispute votes correctly', async () => {
      const marketPubkey = 'test-market-1';
      const key = `votes:dispute:${marketPubkey}`;

      // Add test votes
      await redis.hSet(key, 'voter1', 'support');
      await redis.hSet(key, 'voter2', 'support');
      await redis.hSet(key, 'voter3', 'support');
      await redis.hSet(key, 'voter4', 'support');
      await redis.hSet(key, 'voter5', 'support');
      await redis.hSet(key, 'voter6', 'support');
      await redis.hSet(key, 'voter7', 'reject');
      await redis.hSet(key, 'voter8', 'reject');
      await redis.hSet(key, 'voter9', 'reject');
      await redis.hSet(key, 'voter10', 'reject');

      const results = await aggregationService.processDisputeVotes();

      expect(results.length).toBeGreaterThan(0);

      const result = results.find(r => r.marketPubkey === marketPubkey);
      expect(result).toBeDefined();
      expect(result?.tally.totalVotes).toBe(10);
      expect(result?.tally.supportVotes).toBe(6);
      expect(result?.tally.rejectVotes).toBe(4);
      expect(result?.tally.supportPercentage).toBe(60);
    });

    it('should resolve dispute when threshold met (60% support)', async () => {
      const marketPubkey = 'test-market-2';
      const key = `votes:dispute:${marketPubkey}`;

      // Add votes: 10 support (66.67%), 5 reject (33.33%)
      for (let i = 1; i <= 10; i++) {
        await redis.hSet(key, `voter${i}`, 'support');
      }
      for (let i = 11; i <= 15; i++) {
        await redis.hSet(key, `voter${i}`, 'reject');
      }

      const results = await aggregationService.processDisputeVotes();

      const result = results.find(r => r.marketPubkey === marketPubkey);
      expect(result).toBeDefined();
      expect(result?.thresholdMet).toBe(true);
      expect(result?.actionTaken).toBe('dispute_resolved');
      expect(result?.success).toBe(true);
      expect(result?.txSignature).toBeDefined();
    });

    it('should not resolve dispute when threshold not met (< 60% support)', async () => {
      const marketPubkey = 'test-market-3';
      const key = `votes:dispute:${marketPubkey}`;

      // Add votes: 5 support (50%), 5 reject (50%)
      for (let i = 1; i <= 5; i++) {
        await redis.hSet(key, `voter${i}`, 'support');
      }
      for (let i = 6; i <= 10; i++) {
        await redis.hSet(key, `voter${i}`, 'reject');
      }

      const results = await aggregationService.processDisputeVotes();

      const result = results.find(r => r.marketPubkey === marketPubkey);
      expect(result).toBeDefined();
      expect(result?.thresholdMet).toBe(false);
      expect(result?.actionTaken).toBe('no_action');
    });

    it('should not process dispute with insufficient votes', async () => {
      const marketPubkey = 'test-market-4';
      const key = `votes:dispute:${marketPubkey}`;

      // Add only 7 votes (min required: 10)
      for (let i = 1; i <= 7; i++) {
        await redis.hSet(key, `voter${i}`, 'support');
      }

      const results = await aggregationService.processDisputeVotes();

      const result = results.find(r => r.marketPubkey === marketPubkey);
      expect(result).toBeDefined();
      expect(result?.thresholdMet).toBe(false);
      expect(result?.actionTaken).toBe('no_action');
      expect(result?.tally.totalVotes).toBe(7);
    });

    it('should clear Redis votes after successful dispute resolution', async () => {
      const marketPubkey = 'test-market-5';
      const key = `votes:dispute:${marketPubkey}`;

      // Add votes above threshold
      for (let i = 1; i <= 15; i++) {
        await redis.hSet(key, `voter${i}`, 'support');
      }

      await aggregationService.processDisputeVotes();

      // Check that votes were cleared
      const exists = await redis.exists(key);
      expect(exists).toBe(0);
    });
  });

  describe('Aggregation Statistics', () => {
    it('should return correct stats for pending votes', async () => {
      // Add proposal votes
      await redis.hSet('votes:proposal:prop1', 'voter1', 'like');
      await redis.hSet('votes:proposal:prop1', 'voter2', 'like');
      await redis.hSet('votes:proposal:prop2', 'voter3', 'dislike');

      // Add dispute votes
      await redis.hSet('votes:dispute:market1', 'voter1', 'support');
      await redis.hSet('votes:dispute:market1', 'voter2', 'support');
      await redis.hSet('votes:dispute:market1', 'voter3', 'reject');
      await redis.hSet('votes:dispute:market2', 'voter4', 'support');

      const stats = await aggregationService.getStats();

      expect(stats.proposalVoteSets).toBe(2);
      expect(stats.disputeVoteSets).toBe(2);
      expect(stats.totalPendingVotes).toBe(7);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid proposal ID gracefully', async () => {
      // Create invalid vote entry
      await redis.hSet('votes:proposal:invalid', 'voter1', 'invalid_choice');

      const results = await aggregationService.processProposalVotes();

      // Should not crash, should process successfully
      expect(results).toBeDefined();
    });

    it('should handle empty vote sets', async () => {
      const results = await aggregationService.processProposalVotes();

      expect(results).toEqual([]);
    });

    it('should handle Redis connection errors gracefully', async () => {
      // Close Redis connection
      await redis.quit();

      // Attempt aggregation (should handle error)
      await expect(aggregationService.processProposalVotes()).rejects.toThrow();

      // Reconnect for cleanup
      await redis.connect();
    });
  });

  describe('Performance Tests', () => {
    it('should handle 100+ proposal votes efficiently', async () => {
      const proposalId = 'perf-test-proposal';
      const key = `votes:proposal:${proposalId}`;

      // Add 100 votes
      for (let i = 1; i <= 100; i++) {
        const choice = i <= 75 ? 'like' : 'dislike'; // 75% likes
        await redis.hSet(key, `voter${i}`, choice);
      }

      const startTime = Date.now();
      const results = await aggregationService.processProposalVotes();
      const duration = Date.now() - startTime;

      const result = results.find(r => r.proposalId === proposalId);
      expect(result).toBeDefined();
      expect(result?.tally.totalVotes).toBe(100);
      expect(result?.thresholdMet).toBe(true);

      // Should complete in under 5 seconds
      expect(duration).toBeLessThan(5000);
    });

    it('should handle multiple proposals simultaneously', async () => {
      // Create 10 proposals with 15 votes each
      for (let p = 1; p <= 10; p++) {
        const key = `votes:proposal:proposal-${p}`;

        for (let v = 1; v <= 15; v++) {
          const choice = v <= 12 ? 'like' : 'dislike';
          await redis.hSet(key, `voter${v}`, choice);
        }
      }

      const startTime = Date.now();
      const results = await aggregationService.processProposalVotes();
      const duration = Date.now() - startTime;

      expect(results.length).toBe(10);

      // All should meet threshold
      const successful = results.filter(r => r.thresholdMet);
      expect(successful.length).toBe(10);

      // Should complete in under 10 seconds
      expect(duration).toBeLessThan(10000);
    });
  });
});
