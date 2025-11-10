/**
 * Integration Test Configuration
 *
 * Centralized configuration for all integration tests.
 * Tests validate backend services are working correctly end-to-end.
 */

export const INTEGRATION_TEST_CONFIG = {
  // API Gateway
  apiUrl: process.env.API_URL || 'http://localhost:4000',

  // WebSocket Server
  wsUrl: process.env.WS_URL || 'ws://localhost:4001',

  // Supabase Database
  dbUrl: process.env.SUPABASE_URL || 'https://tkkqqxepelibqjjhxxct.supabase.co',
  dbAnonKey: process.env.SUPABASE_ANON_KEY,
  dbServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,

  // Test Data
  testMarketId: process.env.TEST_MARKET_ID || 'F6fBnfJwVeLBkp1TFfwetG7Q7ffnYUuLc4awdyYWnnoT',
  testWalletAddress: process.env.TEST_WALLET_PUBLIC_KEY || '4WQwPjKHu3x7dHBEehBDgxXHJQoDuBvj6Xhu6C1jjTye',

  // Test Timeouts
  testTimeout: 30000, // 30 seconds
  apiTimeout: 10000,  // 10 seconds for API calls
  wsTimeout: 5000,    // 5 seconds for WebSocket operations

  // Retry Configuration
  maxRetries: 3,
  retryDelay: 1000, // 1 second
};

/**
 * Test Categories
 * Used for organizing and filtering tests
 */
export enum TestCategory {
  API = 'api',
  DATABASE = 'database',
  EVENTS = 'events',
  WEBSOCKET = 'websocket',
}

/**
 * Service Health Status
 */
export interface ServiceHealth {
  name: string;
  status: 'healthy' | 'unhealthy' | 'unknown';
  uptime?: number;
  lastCheck?: Date;
  error?: string;
}
