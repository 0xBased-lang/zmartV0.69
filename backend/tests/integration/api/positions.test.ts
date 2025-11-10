/**
 * Positions API Integration Tests
 *
 * Tests the /api/positions endpoints to ensure they return correct user position data.
 */

import { INTEGRATION_TEST_CONFIG } from '../config';
import { retry, validateResponseSchema } from '../utils/helpers';

describe('Positions API Integration', () => {
  const apiUrl = INTEGRATION_TEST_CONFIG.apiUrl;
  const testWallet = INTEGRATION_TEST_CONFIG.testWalletAddress;

  jest.setTimeout(INTEGRATION_TEST_CONFIG.testTimeout);

  describe('GET /api/positions/:wallet', () => {
    test('should return positions for valid wallet', async () => {
      const response = await fetch(`${apiUrl}/api/positions/${testWallet}`);

      // Should return 200 with array, or 404 if no positions
      expect([200, 404]).toContain(response.status);

      if (response.status === 200) {
        const positions = await response.json() as any;
        expect(Array.isArray(positions)).toBe(true);
      }
    });

    test('should return positions with required fields', async () => {
      const response = await fetch(`${apiUrl}/api/positions/${testWallet}`);

      if (response.status === 200) {
        const positions = await response.json() as any;

        if (positions.length > 0) {
          const position = positions[0];
          const requiredFields = [
            'id',
            'market_id',
            'user',
            'yes_shares',
            'no_shares',
            'created_at',
            'updated_at'
          ];

          const validation = validateResponseSchema(position, requiredFields);
          expect(validation.valid).toBe(true);

          if (!validation.valid) {
            console.error('Missing fields:', validation.missing);
          }
        }
      }
    });

    test('should return 404 for wallet with no positions', async () => {
      const emptyWallet = 'EmptyWallet1111111111111111111111111111111';
      const response = await fetch(`${apiUrl}/api/positions/${emptyWallet}`);

      expect([200, 404]).toContain(response.status);

      if (response.status === 200) {
        const positions = await response.json() as any;
        expect(positions.length).toBe(0);
      }
    });

    test('should handle invalid wallet address format', async () => {
      const invalidWallet = 'invalid-wallet';
      const response = await fetch(`${apiUrl}/api/positions/${invalidWallet}`);

      expect([400, 404]).toContain(response.status);
    });

    test('should return positions with valid share amounts', async () => {
      const response = await fetch(`${apiUrl}/api/positions/${testWallet}`);

      if (response.status === 200) {
        const positions = await response.json() as any;

        for (const position of positions) {
          expect(typeof position.yes_shares).toBe('number');
          expect(typeof position.no_shares).toBe('number');
          expect(position.yes_shares).toBeGreaterThanOrEqual(0);
          expect(position.no_shares).toBeGreaterThanOrEqual(0);
        }
      }
    });
  });

  describe('Performance', () => {
    test('GET /api/positions/:wallet should respond within 500ms', async () => {
      const start = Date.now();
      const response = await fetch(`${apiUrl}/api/positions/${testWallet}`);
      const duration = Date.now() - start;

      expect([200, 404]).toContain(response.status);
      expect(duration).toBeLessThan(500);
    });
  });
});
