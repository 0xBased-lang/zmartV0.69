/**
 * Markets API Integration Tests
 *
 * Tests the /api/markets endpoints to ensure they return correct data
 * and handle errors appropriately.
 */

import { INTEGRATION_TEST_CONFIG } from '../config';
import { retry, validateResponseSchema } from '../utils/helpers';

describe('Markets API Integration', () => {
  const apiUrl = INTEGRATION_TEST_CONFIG.apiUrl;
  const testMarketId = INTEGRATION_TEST_CONFIG.testMarketId;

  // Increase timeout for integration tests
  jest.setTimeout(INTEGRATION_TEST_CONFIG.testTimeout);

  describe('GET /api/markets', () => {
    test('should return array of markets with wrapper format', async () => {
      const response = await retry(async () => {
        const res = await fetch(`${apiUrl}/api/markets`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res;
      });

      expect(response.status).toBe(200);

      const data = await response.json() as any;

      // STANDARDIZED: Expect wrapper object format { markets: [], count, offset, limit }
      expect(data).toHaveProperty('markets');
      expect(data).toHaveProperty('count');
      expect(Array.isArray(data.markets)).toBe(true);
    });

    test('should return markets with required fields', async () => {
      const response = await fetch(`${apiUrl}/api/markets`);
      const data = await response.json() as any;

      // STANDARDIZED: Access markets from wrapper object
      const markets = data.markets || [];

      if (markets.length > 0) {
        const market = markets[0];
        const requiredFields = [
          'id',
          'question',
          'description',
          'state',
          'created_at'
        ];

        const validation = validateResponseSchema(market, requiredFields);
        expect(validation.valid).toBe(true);

        if (!validation.valid) {
          console.error('Missing fields:', validation.missing);
        }
      }
    });

    test('should return markets in correct date order', async () => {
      const response = await fetch(`${apiUrl}/api/markets`);
      const data = await response.json() as any;

      // STANDARDIZED: Access markets from wrapper object
      const markets = data.markets || [];

      if (markets.length > 1) {
        const dates = markets.map((m: any) => new Date(m.created_at).getTime());
        const isSorted = dates.every((date: number, i: number) => {
          return i === 0 || date <= dates[i - 1];
        });

        expect(isSorted).toBe(true);
      }
    });

    test('should handle empty results gracefully', async () => {
      // This tests the endpoint doesn't crash on empty results
      const response = await fetch(`${apiUrl}/api/markets?limit=0`);

      // Should still return 200 even if no results
      expect([200, 404]).toContain(response.status);
    });
  });

  describe('GET /api/markets/:id', () => {
    test('should return specific market by ID', async () => {
      const response = await fetch(`${apiUrl}/api/markets/${testMarketId}`);
      expect(response.status).toBe(200);

      const market = await response.json() as any;
      expect(market.id).toBe(testMarketId);
    });

    test('should return market with complete data', async () => {
      const response = await fetch(`${apiUrl}/api/markets/${testMarketId}`);
      const market = await response.json() as any;

      const requiredFields = [
        'id',
        'question',
        'description',
        'state',
        'creator',
        'created_at',
        'ends_at',
        'liquidity_parameter',
        'total_yes_shares',
        'total_no_shares'
      ];

      const validation = validateResponseSchema(market, requiredFields);
      expect(validation.valid).toBe(true);

      if (!validation.valid) {
        console.error('Missing fields:', validation.missing);
      }
    });

    test('should return 404 for non-existent market', async () => {
      const fakeId = 'nonexistent123456789012345678901234567890';
      const response = await fetch(`${apiUrl}/api/markets/${fakeId}`);

      expect(response.status).toBe(404);
    });

    test('should handle invalid market ID format', async () => {
      const invalidId = 'invalid-id';
      const response = await fetch(`${apiUrl}/api/markets/${invalidId}`);

      // Should return 400 (bad request) or 404 (not found)
      expect([400, 404]).toContain(response.status);
    });

    test('should return market state as valid enum', async () => {
      const response = await fetch(`${apiUrl}/api/markets/${testMarketId}`);
      const market = await response.json() as any;

      const validStates = [
        'PROPOSED',
        'APPROVED',
        'ACTIVE',
        'RESOLVING',
        'DISPUTED',
        'FINALIZED'
      ];

      expect(validStates).toContain(market.state);
    });
  });

  describe('GET /api/markets/:id/trades', () => {
    test('should return trades for specific market with wrapper format', async () => {
      const response = await fetch(`${apiUrl}/api/markets/${testMarketId}/trades`);

      // 200 with wrapper object, or 404 if no trades yet
      expect([200, 404]).toContain(response.status);

      if (response.status === 200) {
        const data = await response.json() as any;

        // STANDARDIZED: Expect wrapper object format { trades: [], count, market_id }
        expect(data).toHaveProperty('trades');
        expect(data).toHaveProperty('count');
        expect(data).toHaveProperty('market_id');
        expect(Array.isArray(data.trades)).toBe(true);
      }
    });

    test('should return trades with required fields', async () => {
      const response = await fetch(`${apiUrl}/api/markets/${testMarketId}/trades`);

      if (response.status === 200) {
        const data = await response.json() as any;

        // STANDARDIZED: Access trades from wrapper object
        const trades = data.trades || [];

        if (trades.length > 0) {
          const trade = trades[0];
          const requiredFields = [
            'id',
            'market_id',
            'user',
            'outcome',
            'shares',
            'cost',
            'timestamp'
          ];

          const validation = validateResponseSchema(trade, requiredFields);
          expect(validation.valid).toBe(true);
        }
      }
    });

    test('should return trades in chronological order', async () => {
      const response = await fetch(`${apiUrl}/api/markets/${testMarketId}/trades`);

      if (response.status === 200) {
        const data = await response.json() as any;

        // STANDARDIZED: Access trades from wrapper object
        const trades = data.trades || [];

        if (trades.length > 1) {
          const timestamps = trades.map((t: any) => new Date(t.timestamp).getTime());
          const isSorted = timestamps.every((ts: number, i: number) => {
            return i === 0 || ts >= timestamps[i - 1];
          });

          expect(isSorted).toBe(true);
        }
      }
    });

    test('should handle pagination parameters', async () => {
      const response = await fetch(
        `${apiUrl}/api/markets/${testMarketId}/trades?limit=10&offset=0`
      );

      expect([200, 404]).toContain(response.status);

      if (response.status === 200) {
        const data = await response.json() as any;

        // STANDARDIZED: Access trades from wrapper object
        const trades = data.trades || [];
        expect(trades.length).toBeLessThanOrEqual(10);
      }
    });
  });

  describe('Error Handling', () => {
    test('should return JSON error for server errors', async () => {
      // Try to trigger a server error (this may not work if API is robust)
      const response = await fetch(`${apiUrl}/api/markets/trigger-error-test`);

      if (response.status >= 500) {
        const contentType = response.headers.get('content-type');
        expect(contentType).toContain('application/json');

        const error = await response.json() as any;
        expect(error).toHaveProperty('error');
      }
    });

    test('should handle API timeout gracefully', async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 100); // 100ms timeout

      try {
        await fetch(`${apiUrl}/api/markets`, {
          signal: controller.signal
        });
        clearTimeout(timeoutId);
      } catch (error: any) {
        expect(error.name).toBe('AbortError');
      }
    });
  });

  describe('Performance', () => {
    test('GET /api/markets should respond within 1 second', async () => {
      const start = Date.now();
      const response = await fetch(`${apiUrl}/api/markets`);
      const duration = Date.now() - start;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(1000); // <1 second
    });

    test('GET /api/markets/:id should respond within 500ms', async () => {
      const start = Date.now();
      const response = await fetch(`${apiUrl}/api/markets/${testMarketId}`);
      const duration = Date.now() - start;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(500); // <500ms
    });
  });
});
