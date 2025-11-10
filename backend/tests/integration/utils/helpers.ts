/**
 * Integration Test Helpers
 *
 * Shared utility functions for integration tests.
 */

import { INTEGRATION_TEST_CONFIG, ServiceHealth } from '../config';

/**
 * Wait for a specified duration
 */
export async function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  maxRetries = INTEGRATION_TEST_CONFIG.maxRetries,
  delay = INTEGRATION_TEST_CONFIG.retryDelay
): Promise<T> {
  let lastError: Error | undefined;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (i < maxRetries - 1) {
        await wait(delay * Math.pow(2, i)); // Exponential backoff
      }
    }
  }

  throw lastError || new Error('Retry failed');
}

/**
 * Check if API Gateway is healthy
 */
export async function checkApiHealth(): Promise<ServiceHealth> {
  try {
    const response = await fetch(`${INTEGRATION_TEST_CONFIG.apiUrl}/health`, {
      signal: AbortSignal.timeout(INTEGRATION_TEST_CONFIG.apiTimeout)
    });

    return {
      name: 'API Gateway',
      status: response.ok ? 'healthy' : 'unhealthy',
      lastCheck: new Date(),
    };
  } catch (error) {
    return {
      name: 'API Gateway',
      status: 'unhealthy',
      lastCheck: new Date(),
      error: (error as Error).message,
    };
  }
}

/**
 * Check if WebSocket server is healthy
 */
export async function checkWebSocketHealth(): Promise<ServiceHealth> {
  return new Promise((resolve) => {
    const ws = new WebSocket(INTEGRATION_TEST_CONFIG.wsUrl);
    const timeout = setTimeout(() => {
      ws.close();
      resolve({
        name: 'WebSocket Server',
        status: 'unhealthy',
        lastCheck: new Date(),
        error: 'Connection timeout',
      });
    }, INTEGRATION_TEST_CONFIG.wsTimeout);

    ws.onopen = () => {
      clearTimeout(timeout);
      ws.close();
      resolve({
        name: 'WebSocket Server',
        status: 'healthy',
        lastCheck: new Date(),
      });
    };

    ws.onerror = (error) => {
      clearTimeout(timeout);
      resolve({
        name: 'WebSocket Server',
        status: 'unhealthy',
        lastCheck: new Date(),
        error: 'Connection failed',
      });
    };
  });
}

/**
 * Validate response structure matches expected schema
 */
export function validateResponseSchema(
  data: any,
  expectedFields: string[]
): { valid: boolean; missing: string[] } {
  const missing: string[] = [];

  for (const field of expectedFields) {
    if (!(field in data)) {
      missing.push(field);
    }
  }

  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Generate random test data
 */
export function generateTestId(prefix: string = 'test'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}

/**
 * Clean up test data (to be implemented per test type)
 */
export async function cleanupTestData(testId: string): Promise<void> {
  // Implementation depends on what needs cleaning
  // For now, just a placeholder
  console.log(`Cleanup test data: ${testId}`);
}
