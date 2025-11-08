const { defineConfig, devices } = require('./node_modules/.pnpm/@playwright+test@1.56.1/node_modules/@playwright/test');

/**
 * Playwright configuration for ZMART E2E testing
 * Configured for Web3 wallet automation on Solana devnet
 *
 * REAL BLOCKCHAIN TESTING MODE:
 * - Uses actual test wallet with devnet SOL
 * - Sends real transactions to Solana devnet
 * - Captures all browser console logs
 * - Records videos and screenshots for debugging
 */
module.exports = defineConfig({
  testDir: './tests/e2e',

  // Run tests in files in parallel
  fullyParallel: false, // Run sequentially for Web3 state consistency

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Opt out of parallel tests on CI
  workers: 1, // Single worker for consistent blockchain state

  // Reporter to use
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['list'], // Console output with colored results
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }]
  ],

  // Shared settings for all the projects below
  use: {
    // Base URL to use in actions like `await page.goto('/')`
    baseURL: 'http://localhost:3001',

    // ALWAYS collect trace for debugging real transactions
    trace: 'on', // Changed from 'on-first-retry' to always capture

    // Take screenshots only on failures (save disk space, reduce noise)
    screenshot: 'only-on-failure', // Important actions captured manually in tests

    // NO video recording (overkill, screenshots are sufficient)
    video: 'off', // Disabled - saves 50-200 MB per test, screenshots are enough

    // Timeout for each action (e.g., click, fill)
    actionTimeout: 30000, // 30s for wallet interactions

    // Timeout for navigation
    navigationTimeout: 60000, // 60s for blockchain operations

    // Context options for capturing console logs
    contextOptions: {
      recordVideo: {
        dir: 'test-videos/',
        size: { width: 1920, height: 1080 }
      },
    },
  },

  // Timeout for each test (longer for real blockchain confirmations)
  timeout: 180000, // 3 minutes for blockchain confirmations

  // Configure projects for major browsers
  projects: [
    {
      name: 'real-blockchain-chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Use test environment variables
        storageState: undefined, // No pre-saved state, will connect wallet in tests

        // Viewport for desktop testing
        viewport: { width: 1920, height: 1080 },

        // Launch options for console log capture
        launchOptions: {
          args: [
            '--disable-blink-features=AutomationControlled', // Hide automation
            '--disable-web-security', // Allow CORS for local testing
          ],
          // Keep browser open on failure for debugging
          devtools: false,
        },
      },
    },
  ],

  // Run your local dev server before starting the tests
  webServer: {
    command: 'cd frontend && PORT=3001 pnpm dev',
    url: 'http://localhost:3001',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    // Use real devnet environment
    env: {
      NEXT_PUBLIC_SOLANA_CLUSTER: 'devnet',
      NEXT_PUBLIC_SOLANA_RPC_URL: 'https://api.devnet.solana.com',
    },
  },

  // Global setup for test environment
  globalSetup: require.resolve('./tests/e2e/global-setup.ts'),
});
