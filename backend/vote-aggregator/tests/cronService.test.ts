/**
 * Cron Service Unit Tests
 *
 * Test cron job scheduling and execution.
 */

import { CronService } from '../src/services/cronService';
import { AggregationService } from '../src/services/aggregationService';
import { createClient, RedisClientType } from 'redis';
import { Connection, Keypair } from '@solana/web3.js';

describe('CronService', () => {
  let redis: RedisClientType;
  let aggregationService: AggregationService;
  let cronService: CronService;
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

    // Initialize aggregation service
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

    // Initialize cron service
    cronService = new CronService(aggregationService);
  });

  afterAll(async () => {
    cronService.stop();
    await redis.quit();
  });

  beforeEach(async () => {
    // Clear all vote keys
    const keys = await redis.keys('votes:*');
    if (keys.length > 0) {
      await redis.del(keys);
    }
  });

  describe('Cron Service Lifecycle', () => {
    it('should start cron service successfully', () => {
      cronService.start();

      const status = cronService.getStatus();
      expect(status.isRunning).toBe(true);
      expect(status.proposalTaskRunning).toBe(true);
      expect(status.disputeTaskRunning).toBe(true);
    });

    it('should stop cron service successfully', () => {
      cronService.start();
      cronService.stop();

      const status = cronService.getStatus();
      expect(status.isRunning).toBe(false);
      expect(status.proposalTaskRunning).toBe(false);
      expect(status.disputeTaskRunning).toBe(false);
    });

    it('should not start if already running', () => {
      cronService.start();
      cronService.start(); // Try to start again

      const status = cronService.getStatus();
      expect(status.isRunning).toBe(true);

      cronService.stop();
    });

    it('should not stop if not running', () => {
      const status = cronService.getStatus();
      expect(status.isRunning).toBe(false);

      cronService.stop(); // Try to stop when not running

      const newStatus = cronService.getStatus();
      expect(newStatus.isRunning).toBe(false);
    });
  });

  describe('Manual Aggregation Trigger', () => {
    it('should trigger immediate aggregation for proposals', async () => {
      // Add test proposal votes
      const proposalId = 'trigger-test-proposal';
      const key = `votes:proposal:${proposalId}`;

      for (let i = 1; i <= 15; i++) {
        const choice = i <= 12 ? 'like' : 'dislike'; // 80% likes
        await redis.hSet(key, `voter${i}`, choice);
      }

      const results = await cronService.triggerImmediateAggregation();

      expect(results.proposalResults).toBeDefined();
      expect(results.disputeResults).toBeDefined();

      const proposalResult = results.proposalResults.find(
        r => r.proposalId === proposalId
      );

      expect(proposalResult).toBeDefined();
      expect(proposalResult?.thresholdMet).toBe(true);
      expect(proposalResult?.success).toBe(true);
    });

    it('should trigger immediate aggregation for disputes', async () => {
      // Add test dispute votes
      const marketPubkey = 'trigger-test-market';
      const key = `votes:dispute:${marketPubkey}`;

      for (let i = 1; i <= 15; i++) {
        const choice = i <= 10 ? 'support' : 'reject'; // 66.67% support
        await redis.hSet(key, `voter${i}`, choice);
      }

      const results = await cronService.triggerImmediateAggregation();

      expect(results.proposalResults).toBeDefined();
      expect(results.disputeResults).toBeDefined();

      const disputeResult = results.disputeResults.find(
        r => r.marketPubkey === marketPubkey
      );

      expect(disputeResult).toBeDefined();
      expect(disputeResult?.thresholdMet).toBe(true);
      expect(disputeResult?.success).toBe(true);
    });

    it('should handle empty vote sets in manual trigger', async () => {
      const results = await cronService.triggerImmediateAggregation();

      expect(results.proposalResults).toEqual([]);
      expect(results.disputeResults).toEqual([]);
    });
  });

  describe('Automated Aggregation', () => {
    it('should run aggregation on startup', async () => {
      // Add test votes
      const proposalId = 'startup-test';
      const key = `votes:proposal:${proposalId}`;

      for (let i = 1; i <= 12; i++) {
        await redis.hSet(key, `voter${i}`, 'like');
      }

      // Start cron (runs immediately on startup)
      cronService.start();

      // Wait for startup aggregation (runs after 1 second)
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Check that votes were processed (cleared from Redis)
      const exists = await redis.exists(key);
      expect(exists).toBe(0);

      cronService.stop();
    }, 10000); // Increase timeout for this test

    it('should handle errors in cron jobs gracefully', async () => {
      // Create invalid vote entry
      await redis.hSet('votes:proposal:error-test', 'voter1', 'invalid');

      // Start cron
      cronService.start();

      // Wait for execution
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Service should still be running despite error
      const status = cronService.getStatus();
      expect(status.isRunning).toBe(true);

      cronService.stop();
    }, 10000);
  });

  describe('Cron Status Reporting', () => {
    it('should report status correctly when stopped', () => {
      const status = cronService.getStatus();

      expect(status).toEqual({
        isRunning: false,
        proposalTaskRunning: false,
        disputeTaskRunning: false
      });
    });

    it('should report status correctly when running', () => {
      cronService.start();

      const status = cronService.getStatus();

      expect(status).toEqual({
        isRunning: true,
        proposalTaskRunning: true,
        disputeTaskRunning: true
      });

      cronService.stop();
    });
  });
});
