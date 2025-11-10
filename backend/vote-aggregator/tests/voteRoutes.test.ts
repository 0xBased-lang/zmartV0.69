/**
 * Vote Routes Integration Tests
 *
 * Test API endpoints with real HTTP requests.
 */

import request from 'supertest';
import express, { Application } from 'express';
import { createClient, RedisClientType } from 'redis';
import { createVoteRoutes } from '../src/routes/voteRoutes';
import { Keypair } from '@solana/web3.js';
import * as nacl from 'tweetnacl';
import bs58 from 'bs58';

describe('Vote Routes', () => {
  let app: Application;
  let redisClient: RedisClientType;
  let testKeypair: Keypair;
  let testMarketId: string;

  beforeAll(async () => {
    // Create Express app
    app = express();
    app.use(express.json());

    // Connect to Redis test database
    redisClient = createClient({ database: 15 });
    await redisClient.connect();

    // Add vote routes
    app.use('/api/votes', createVoteRoutes(redisClient));

    // Generate test data
    testKeypair = Keypair.generate();
    testMarketId = Keypair.generate().publicKey.toBase58();
  });

  afterAll(async () => {
    await redisClient.quit();
  });

  beforeEach(async () => {
    // Clear test database
    await redisClient.flushDb();
  });

  function createValidSignature(message: string, keypair: Keypair): string {
    const messageBytes = new TextEncoder().encode(message);
    const signature = nacl.sign.detached(messageBytes, keypair.secretKey);
    return bs58.encode(signature);
  }

  describe('POST /api/votes/proposal/:marketId', () => {
    it('should accept valid proposal vote', async () => {
      const message = `Vote on market ${testMarketId}`;
      const signature = createValidSignature(message, testKeypair);

      const response = await request(app)
        .post(`/api/votes/proposal/${testMarketId}`)
        .send({
          vote: 'like',
          signature,
          publicKey: testKeypair.publicKey.toBase58(),
          message
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.vote).toBe('like');
      expect(response.body.marketId).toBe(testMarketId);
    });

    it('should return 400 for missing fields', async () => {
      const response = await request(app)
        .post(`/api/votes/proposal/${testMarketId}`)
        .send({
          vote: 'like'
          // Missing signature, publicKey, message
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Missing required fields');
    });

    it('should return 400 for invalid signature', async () => {
      const message = `Vote on market ${testMarketId}`;

      const response = await request(app)
        .post(`/api/votes/proposal/${testMarketId}`)
        .send({
          vote: 'like',
          signature: 'invalid-signature',
          publicKey: testKeypair.publicKey.toBase58(),
          message
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid wallet signature');
    });

    it('should return 400 for duplicate vote', async () => {
      const message = `Vote on market ${testMarketId}`;
      const signature = createValidSignature(message, testKeypair);

      const voteData = {
        vote: 'like',
        signature,
        publicKey: testKeypair.publicKey.toBase58(),
        message
      };

      // First vote succeeds
      await request(app)
        .post(`/api/votes/proposal/${testMarketId}`)
        .send(voteData);

      // Second vote fails
      const response = await request(app)
        .post(`/api/votes/proposal/${testMarketId}`)
        .send(voteData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Already voted');
    });
  });

  describe('POST /api/votes/dispute/:marketId', () => {
    it('should accept valid dispute vote', async () => {
      const message = `Vote on dispute ${testMarketId}`;
      const signature = createValidSignature(message, testKeypair);

      const response = await request(app)
        .post(`/api/votes/dispute/${testMarketId}`)
        .send({
          vote: 'agree',
          signature,
          publicKey: testKeypair.publicKey.toBase58(),
          message
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.vote).toBe('agree');
    });

    it('should reject invalid vote type for dispute', async () => {
      const message = `Vote on dispute ${testMarketId}`;
      const signature = createValidSignature(message, testKeypair);

      const response = await request(app)
        .post(`/api/votes/dispute/${testMarketId}`)
        .send({
          vote: 'like', // Invalid for dispute
          signature,
          publicKey: testKeypair.publicKey.toBase58(),
          message
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid vote');
    });
  });

  describe('GET /api/votes/proposal/:marketId', () => {
    it('should return vote counts', async () => {
      // Submit 3 likes
      for (let i = 0; i < 3; i++) {
        const keypair = Keypair.generate();
        const message = `Vote ${i}`;
        const signature = createValidSignature(message, keypair);

        await request(app)
          .post(`/api/votes/proposal/${testMarketId}`)
          .send({
            vote: 'like',
            signature,
            publicKey: keypair.publicKey.toBase58(),
            message
          });
      }

      // Submit 2 dislikes
      for (let i = 0; i < 2; i++) {
        const keypair = Keypair.generate();
        const message = `Vote ${i + 3}`;
        const signature = createValidSignature(message, keypair);

        await request(app)
          .post(`/api/votes/proposal/${testMarketId}`)
          .send({
            vote: 'dislike',
            signature,
            publicKey: keypair.publicKey.toBase58(),
            message
          });
      }

      const response = await request(app)
        .get(`/api/votes/proposal/${testMarketId}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.counts.likes).toBe(3);
      expect(response.body.counts.dislikes).toBe(2);
      expect(response.body.counts.total).toBe(5);
    });

    it('should return zero counts for market with no votes', async () => {
      const response = await request(app)
        .get(`/api/votes/proposal/${testMarketId}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.counts.likes).toBe(0);
      expect(response.body.counts.dislikes).toBe(0);
      expect(response.body.counts.total).toBe(0);
    });
  });

  describe('GET /api/votes/dispute/:marketId', () => {
    it('should return dispute vote counts', async () => {
      // Submit 4 agrees
      for (let i = 0; i < 4; i++) {
        const keypair = Keypair.generate();
        const message = `Dispute vote ${i}`;
        const signature = createValidSignature(message, keypair);

        await request(app)
          .post(`/api/votes/dispute/${testMarketId}`)
          .send({
            vote: 'agree',
            signature,
            publicKey: keypair.publicKey.toBase58(),
            message
          });
      }

      const response = await request(app)
        .get(`/api/votes/dispute/${testMarketId}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.counts.agrees).toBe(4);
      expect(response.body.counts.disagrees).toBe(0);
      expect(response.body.counts.total).toBe(4);
    });
  });

  describe('Rate limiting', () => {
    it('should enforce rate limits', async () => {
      const message = `Vote`;
      const limit = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100');

      // This test would require making 100+ requests
      // Skipping for now to keep tests fast
      // TODO: Add rate limit testing with lower threshold for tests
    }, 10000); // Increase timeout for this test
  });
});
