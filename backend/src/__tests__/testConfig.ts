// ============================================================
// Test Configuration Module
// ============================================================
// Purpose: Provide mock configurations and utilities for testing
// Pattern Prevention: #4 (Schema Drift) - Type-safe test mocking
// Reference: docs/ENVIRONMENT_VALIDATION_ARCHITECTURE.md - Layer 3

import { config as baseConfig } from '../config/env';

/**
 * Create mock config for testing
 * Merges base config with test-specific overrides
 *
 * @param overrides - Partial config to override defaults
 * @returns Complete config object for testing
 *
 * @example
 * const testConfig = createTestConfig({
 *   solana: { rpcUrl: 'http://localhost:8899' }
 * });
 */
export function createTestConfig(overrides: Partial<typeof baseConfig> = {}) {
  return {
    ...baseConfig,
    ...overrides,
    node: {
      ...baseConfig.node,
      ...overrides.node,
      env: 'test',
      isTest: true,
      isDevelopment: false,
      isProduction: false,
    },
    solana: {
      ...baseConfig.solana,
      ...overrides.solana,
    },
    supabase: {
      ...baseConfig.supabase,
      ...overrides.supabase,
    },
    redis: {
      ...baseConfig.redis,
      ...overrides.redis,
    },
    api: {
      ...baseConfig.api,
      ...overrides.api,
    },
    websocket: {
      ...baseConfig.websocket,
      ...overrides.websocket,
    },
    services: {
      ...baseConfig.services,
      ...overrides.services,
    },
    logging: {
      ...baseConfig.logging,
      ...overrides.logging,
    },
  };
}

/**
 * Mock environment variables for testing
 * Temporarily replaces process.env with test values
 *
 * @param vars - Environment variables to mock
 * @returns Cleanup function to restore original environment
 *
 * @example
 * const restore = mockEnvVars({
 *   SOLANA_RPC_URL: 'http://localhost:8899',
 *   NODE_ENV: 'test'
 * });
 *
 * // Run tests...
 *
 * restore(); // Restore original environment
 */
export function mockEnvVars(vars: Record<string, string>): () => void {
  const originalEnv = { ...process.env };

  // Set mock environment variables
  Object.entries(vars).forEach(([key, value]) => {
    process.env[key] = value;
  });

  // Return cleanup function
  return () => {
    // Restore original environment
    Object.keys(vars).forEach((key) => {
      if (originalEnv[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = originalEnv[key];
      }
    });
  };
}

/**
 * Common test fixtures for consistent testing
 */
export const TEST_FIXTURES = {
  /**
   * Localhost Solana validator configuration
   */
  solana: {
    localValidator: {
      rpcUrl: 'http://localhost:8899',
      commitment: 'confirmed',
    },
    devnet: {
      rpcUrl: 'https://api.devnet.solana.com',
      commitment: 'confirmed',
    },
    programIds: {
      core: 'CoreProgram1111111111111111111111111111111',
      proposal: 'ProposalProgram111111111111111111111111',
    },
    keypairs: {
      backend: '~/.config/solana/id.json',
      test: '/tmp/test-keypair.json',
    },
  },

  /**
   * Local Supabase configuration
   */
  supabase: {
    local: {
      url: 'http://localhost:54321',
      anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test-anon-key',
      serviceRoleKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test-service-key',
    },
    test: {
      url: 'https://test-project.supabase.co',
      anonKey: 'test-anon-key-12345',
      serviceRoleKey: 'test-service-key-12345',
    },
  },

  /**
   * Local Redis configuration
   */
  redis: {
    local: {
      url: 'redis://localhost:6379',
    },
    test: {
      url: 'redis://localhost:6380', // Different port for test
    },
  },

  /**
   * API server configuration
   */
  api: {
    local: {
      port: 3000,
      host: 'localhost',
      corsOrigins: ['http://localhost:3001'],
    },
    test: {
      port: 3002, // Different port for test
      host: 'localhost',
      corsOrigins: ['http://localhost:3003'],
    },
  },

  /**
   * WebSocket server configuration
   */
  websocket: {
    local: {
      port: 3001,
    },
    test: {
      port: 3003, // Different port for test
    },
  },

  /**
   * Service configuration
   */
  services: {
    test: {
      voteAggregationInterval: 1000, // 1 second for faster tests
      ipfsSnapshotCron: '*/5 * * * *', // Every 5 minutes
      minProposalVotes: 3, // Lower threshold for testing
      proposalApprovalThreshold: 0.7,
      disputeThreshold: 0.6,
    },
  },

  /**
   * Logging configuration
   */
  logging: {
    test: {
      level: 'error', // Only errors in tests (less noise)
    },
    debug: {
      level: 'debug', // Full logging for debugging tests
    },
  },
};

/**
 * Pre-configured test configs for common scenarios
 */
export const TEST_CONFIGS = {
  /**
   * Minimal config for unit tests (no external dependencies)
   */
  minimal: createTestConfig({
    solana: {
      rpcUrl: TEST_FIXTURES.solana.localValidator.rpcUrl,
      programIds: TEST_FIXTURES.solana.programIds,
      backendKeypairPath: TEST_FIXTURES.solana.keypairs.test,
      backendAuthorityPrivateKey: undefined,
    },
    supabase: TEST_FIXTURES.supabase.local,
    redis: TEST_FIXTURES.redis.local,
    api: TEST_FIXTURES.api.test,
    websocket: TEST_FIXTURES.websocket.test,
    services: TEST_FIXTURES.services.test,
    logging: TEST_FIXTURES.logging.test,
  }),

  /**
   * Integration test config (requires local services)
   */
  integration: createTestConfig({
    solana: {
      rpcUrl: TEST_FIXTURES.solana.localValidator.rpcUrl,
      programIds: TEST_FIXTURES.solana.programIds,
      backendKeypairPath: TEST_FIXTURES.solana.keypairs.backend,
      backendAuthorityPrivateKey: undefined,
    },
    supabase: TEST_FIXTURES.supabase.local,
    redis: TEST_FIXTURES.redis.local,
    api: TEST_FIXTURES.api.local,
    websocket: TEST_FIXTURES.websocket.local,
    services: TEST_FIXTURES.services.test,
    logging: TEST_FIXTURES.logging.test,
  }),

  /**
   * E2E test config (requires all services)
   */
  e2e: createTestConfig({
    solana: {
      rpcUrl: TEST_FIXTURES.solana.devnet.rpcUrl,
      programIds: TEST_FIXTURES.solana.programIds,
      backendKeypairPath: TEST_FIXTURES.solana.keypairs.backend,
      backendAuthorityPrivateKey: undefined,
    },
    supabase: TEST_FIXTURES.supabase.test,
    redis: TEST_FIXTURES.redis.test,
    api: TEST_FIXTURES.api.test,
    websocket: TEST_FIXTURES.websocket.test,
    services: TEST_FIXTURES.services.test,
    logging: TEST_FIXTURES.logging.debug, // More logging for E2E
  }),
};

/**
 * Environment variable sets for different test scenarios
 */
export const TEST_ENV_VARS = {
  /**
   * Minimal environment variables for unit tests
   */
  minimal: {
    NODE_ENV: 'test',
    SOLANA_RPC_URL: TEST_FIXTURES.solana.localValidator.rpcUrl,
    SOLANA_PROGRAM_ID_CORE: TEST_FIXTURES.solana.programIds.core,
    SOLANA_PROGRAM_ID_PROPOSAL: TEST_FIXTURES.solana.programIds.proposal,
    BACKEND_KEYPAIR_PATH: TEST_FIXTURES.solana.keypairs.test,
    SUPABASE_URL: TEST_FIXTURES.supabase.local.url,
    SUPABASE_ANON_KEY: TEST_FIXTURES.supabase.local.anonKey,
    SUPABASE_SERVICE_ROLE_KEY: TEST_FIXTURES.supabase.local.serviceRoleKey,
    REDIS_URL: TEST_FIXTURES.redis.local.url,
    API_PORT: TEST_FIXTURES.api.test.port.toString(),
    WS_PORT: TEST_FIXTURES.websocket.test.port.toString(),
    LOG_LEVEL: TEST_FIXTURES.logging.test.level,
  },

  /**
   * Integration test environment variables
   */
  integration: {
    NODE_ENV: 'test',
    SOLANA_RPC_URL: TEST_FIXTURES.solana.localValidator.rpcUrl,
    SOLANA_PROGRAM_ID_CORE: TEST_FIXTURES.solana.programIds.core,
    SOLANA_PROGRAM_ID_PROPOSAL: TEST_FIXTURES.solana.programIds.proposal,
    BACKEND_KEYPAIR_PATH: TEST_FIXTURES.solana.keypairs.backend,
    SUPABASE_URL: TEST_FIXTURES.supabase.local.url,
    SUPABASE_ANON_KEY: TEST_FIXTURES.supabase.local.anonKey,
    SUPABASE_SERVICE_ROLE_KEY: TEST_FIXTURES.supabase.local.serviceRoleKey,
    REDIS_URL: TEST_FIXTURES.redis.local.url,
    API_PORT: TEST_FIXTURES.api.local.port.toString(),
    WS_PORT: TEST_FIXTURES.websocket.local.port.toString(),
    LOG_LEVEL: TEST_FIXTURES.logging.test.level,
  },
};

/**
 * Helper to setup test environment before tests
 *
 * @param scenario - Test scenario name ('minimal' | 'integration' | 'e2e')
 * @returns Cleanup function
 *
 * @example
 * describe('My Test Suite', () => {
 *   const cleanup = setupTestEnvironment('minimal');
 *   afterAll(cleanup);
 *
 *   it('should work', () => {
 *     // Test code using mocked environment
 *   });
 * });
 */
export function setupTestEnvironment(scenario: 'minimal' | 'integration' | 'e2e' = 'minimal'): () => void {
  const envVars = TEST_ENV_VARS[scenario === 'e2e' ? 'integration' : scenario];
  return mockEnvVars(envVars);
}

/**
 * Helper to validate config in tests
 * Ensures config has all required fields
 *
 * @param config - Config to validate
 * @throws Error if config is invalid
 */
export function validateTestConfig(config: typeof baseConfig): void {
  const requiredFields = [
    'node',
    'solana',
    'supabase',
    'redis',
    'api',
    'websocket',
    'services',
    'logging',
  ];

  requiredFields.forEach((field) => {
    if (!(field in config)) {
      throw new Error(`Test config missing required field: ${field}`);
    }
  });
}
