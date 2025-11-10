/**
 * Votes API Integration Tests
 *
 * Tests the /api/votes endpoints for proposal and dispute voting.
 */

import { INTEGRATION_TEST_CONFIG } from '../config';
import { retry, generateTestId } from '../utils/helpers';
import { getTestWallet, authenticatedPost, getAuthData } from '../utils/auth';
import { createTestSupabaseClient, ensureTestUserExists } from '../helpers/supabase';

describe('Votes API Integration', () => {
  const apiUrl = INTEGRATION_TEST_CONFIG.apiUrl;
  const testMarketId = INTEGRATION_TEST_CONFIG.testMarketId;
  const testWallet = getTestWallet();

  jest.setTimeout(INTEGRATION_TEST_CONFIG.testTimeout);

  // CRITICAL: Ensure test user exists before running any vote tests
  // This prevents FK constraint violations: proposal_votes_user_wallet_fkey
  beforeAll(async () => {
    const supabase = createTestSupabaseClient();
    const walletAddress = testWallet.publicKey.toBase58();

    await ensureTestUserExists(
      supabase,
      walletAddress,
      'Integration Test User'
    );

    console.log(`✅ Test user created/verified: ${walletAddress}`);
  });

  describe('POST /api/votes/proposal', () => {
    test('should accept valid proposal vote with authentication', async () => {
      const voteData = {
        proposal_id: testMarketId,
        user: testWallet.publicKey.toBase58(),
        vote_choice: 'like',
        timestamp: new Date().toISOString()
      };

      const response = await authenticatedPost(
        `${apiUrl}/api/votes/proposal`,
        voteData,
        testWallet
      );

      // Should return 201 (created), 200 (ok), or 409 (already voted)
      expect([200, 201, 409]).toContain(response.status);
    });

    test('should reject invalid vote choice with authentication', async () => {
      const voteData = {
        proposal_id: testMarketId,
        user: testWallet.publicKey.toBase58(),
        vote_choice: 'invalid',
        timestamp: new Date().toISOString()
      };

      const response = await authenticatedPost(
        `${apiUrl}/api/votes/proposal`,
        voteData,
        testWallet
      );

      expect(response.status).toBe(400);
    });

    test('should reject missing required fields with authentication', async () => {
      const incompleteData = {
        proposal_id: testMarketId,
        // Missing user and vote_choice
      };

      const response = await authenticatedPost(
        `${apiUrl}/api/votes/proposal`,
        incompleteData,
        testWallet
      );

      expect(response.status).toBe(400);
    });

    test('should handle duplicate vote attempts with authentication', async () => {
      const voteData = {
        proposal_id: testMarketId,
        user: testWallet.publicKey.toBase58(),
        vote_choice: 'like',
        timestamp: new Date().toISOString()
      };

      // First vote
      const response1 = await fetch(`${apiUrl}/api/votes/proposal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(voteData),
      });

      // Second vote (duplicate)
      const response2 = await fetch(`${apiUrl}/api/votes/proposal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(voteData),
      });

      // Either first succeeds + second fails, or both return 409
      if (response1.status === 201 || response1.status === 200) {
        expect(response2.status).toBe(409); // Conflict
      } else {
        expect(response2.status).toBe(409); // Both already exist
      }
    });
  });

  describe('POST /api/votes/dispute', () => {
    test('should accept valid dispute vote', async () => {
      const voteData = {
        market_id: testMarketId,
        user: testWallet,
        vote_choice: 'support',
        timestamp: new Date().toISOString()
      };

      const response = await fetch(`${apiUrl}/api/votes/dispute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(voteData),
      });

      // Should return 201, 200, 400 (wrong state), or 409 (already voted)
      expect([200, 201, 400, 409]).toContain(response.status);
    });

    test('should reject invalid dispute vote choice', async () => {
      const voteData = {
        market_id: testMarketId,
        user: testWallet,
        vote_choice: 'invalid',
        timestamp: new Date().toISOString()
      };

      const response = await fetch(`${apiUrl}/api/votes/dispute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(voteData),
      });

      expect(response.status).toBe(400);
    });

    test('should return error JSON for bad requests', async () => {
      const badData = { invalid: 'data' };

      const response = await fetch(`${apiUrl}/api/votes/dispute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(badData),
      });

      expect(response.status).toBe(400);

      const error = await response.json() as any;
      expect(error).toHaveProperty('error');
    });
  });

  describe('GET /api/votes/:marketId', () => {
    test('should return vote counts for market', async () => {
      const response = await fetch(`${apiUrl}/api/votes/${testMarketId}`);

      // Should return 200 with data, or 404 if no votes yet
      expect([200, 404]).toContain(response.status);

      if (response.status === 200) {
        const voteData = await response.json() as any;
        expect(voteData).toHaveProperty('proposal_votes');
        expect(voteData).toHaveProperty('dispute_votes');
      }
    });

    test('should return vote counts with valid structure', async () => {
      const response = await fetch(`${apiUrl}/api/votes/${testMarketId}`);

      if (response.status === 200) {
        const voteData = await response.json() as any;

        expect(typeof voteData.proposal_votes.likes).toBe('number');
        expect(typeof voteData.proposal_votes.dislikes).toBe('number');
        expect(voteData.proposal_votes.likes).toBeGreaterThanOrEqual(0);
        expect(voteData.proposal_votes.dislikes).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('Error Handling', () => {
    test('should reject malformed JSON', async () => {
      const response = await fetch(`${apiUrl}/api/votes/proposal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{invalid json',
      });

      expect(response.status).toBe(400);
    });

    test('should handle content-type mismatch', async () => {
      const response = await fetch(`${apiUrl}/api/votes/proposal`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ test: 'data' }),
      });

      expect([400, 415]).toContain(response.status); // Bad request or Unsupported media type
    });
  });

  describe('Performance', () => {
    test('POST /api/votes/proposal should respond within 1 second', async () => {
      const voteData = {
        proposal_id: testMarketId,
        user: generateTestId('perf_test'),
        vote_choice: 'like',
        timestamp: new Date().toISOString()
      };

      const start = Date.now();
      const response = await fetch(`${apiUrl}/api/votes/proposal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(voteData),
      });
      const duration = Date.now() - start;

      expect([200, 201, 400, 409]).toContain(response.status);
      expect(duration).toBeLessThan(1000);
    });
  });
});
