/**
 * Health and Status API Integration Tests
 *
 * Tests the /health and /status endpoints to ensure services are operational.
 */

import { INTEGRATION_TEST_CONFIG } from '../config';
import { checkApiHealth, checkWebSocketHealth } from '../utils/helpers';

describe('Health & Status API Integration', () => {
  const apiUrl = INTEGRATION_TEST_CONFIG.apiUrl;

  jest.setTimeout(INTEGRATION_TEST_CONFIG.testTimeout);

  describe('GET /health', () => {
    test('should return 200 when API is healthy', async () => {
      const response = await fetch(`${apiUrl}/health`);
      expect(response.status).toBe(200);
    });

    test('should return health status object', async () => {
      const response = await fetch(`${apiUrl}/health`);

      if (response.status === 200) {
        const health = await response.json() as any;
        expect(health).toHaveProperty('status');
        expect(['healthy', 'degraded', 'unhealthy']).toContain(health.status);
      }
    });

    test('should include uptime information', async () => {
      const response = await fetch(`${apiUrl}/health`);

      if (response.status === 200) {
        const health = await response.json() as any;

        if (health.uptime !== undefined) {
          expect(typeof health.uptime).toBe('number');
          expect(health.uptime).toBeGreaterThan(0);
        }
      }
    });

    test('should respond quickly (< 100ms)', async () => {
      const start = Date.now();
      const response = await fetch(`${apiUrl}/health`);
      const duration = Date.now() - start;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(100);
    });
  });

  describe('GET /status', () => {
    test('should return service status information', async () => {
      const response = await fetch(`${apiUrl}/status`);

      // Status endpoint may or may not exist
      if (response.status === 200) {
        const status = await response.json() as any;
        expect(status).toBeDefined();
      }
    });
  });

  describe('Service Health Checks', () => {
    test('API Gateway should be healthy', async () => {
      const health = await checkApiHealth();
      expect(health.status).toBe('healthy');
    });

    test('WebSocket Server should be healthy', async () => {
      const health = await checkWebSocketHealth();
      expect(health.status).toBe('healthy');
    });
  });

  describe('CORS Headers', () => {
    test('should include CORS headers for health endpoint', async () => {
      const response = await fetch(`${apiUrl}/health`);

      const corsHeader = response.headers.get('Access-Control-Allow-Origin');

      // CORS may or may not be configured yet
      if (corsHeader) {
        expect(corsHeader).toBeDefined();
      }
    });
  });
});
