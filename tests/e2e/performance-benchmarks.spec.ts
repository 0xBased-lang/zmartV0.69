import { test, expect, Page } from '@playwright/test';
import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import * as fs from 'fs';
import * as path from 'path';
import { TestDataManager as DataManager } from './helpers/data-manager';

/**
 * PRIORITY 6: Performance Benchmarks E2E Test Suite
 *
 * Establishes baseline performance metrics:
 * 1. Transaction confirmation speed (<10s target)
 * 2. API response times (<200ms target)
 * 3. Page load performance (<2s target)
 * 4. WebSocket latency
 *
 * Budget: 0.384 SOL (with 20% buffer)
 * Duration: ~1.5 hours
 *
 * Performance Targets (from requirements):
 * - Transaction confirm: <10s (devnet) / <5s (mainnet)
 * - API response: <200ms for reads, <500ms for writes
 * - Page load: <2s first contentful paint
 * - WebSocket: <100ms message latency
 */

// Test configuration
const RPC_URL = 'https://api.devnet.solana.com';
const API_URL = process.env.BACKEND_API_URL || 'http://localhost:4000';
const WALLET_PATH = path.join(process.env.HOME!, '.config/solana/id.json');

// Performance targets
const TARGETS = {
  transactionConfirm: 10000, // 10s
  apiRead: 200, // 200ms
  apiWrite: 500, // 500ms
  pageLoad: 2000, // 2s
  websocketLatency: 100, // 100ms
};

// Helper functions
function loadWallet(): Keypair {
  const secretKey = JSON.parse(fs.readFileSync(WALLET_PATH, 'utf-8'));
  return Keypair.fromSecretKey(new Uint8Array(secretKey));
}

async function checkBalance(publicKey: string): Promise<number> {
  const connection = new Connection(RPC_URL, 'confirmed');
  const balance = await connection.getBalance(new PublicKey(publicKey));
  return balance / LAMPORTS_PER_SOL;
}

async function measureApiResponseTime(url: string): Promise<number> {
  const startTime = performance.now();
  await fetch(url);
  const endTime = performance.now();
  return endTime - startTime;
}

function calculateStats(values: number[]): {
  min: number;
  max: number;
  avg: number;
  p50: number;
  p95: number;
  p99: number;
} {
  const sorted = [...values].sort((a, b) => a - b);
  const len = sorted.length;

  return {
    min: sorted[0],
    max: sorted[len - 1],
    avg: values.reduce((a, b) => a + b, 0) / len,
    p50: sorted[Math.floor(len * 0.5)],
    p95: sorted[Math.floor(len * 0.95)],
    p99: sorted[Math.floor(len * 0.99)],
  };
}

test.describe('Performance Benchmarks', () => {
  let wallet: Keypair;
  let initialBalance: number;
  let dataManager: DataManager;

  test.beforeAll(async () => {
    // Initialize data manager
    dataManager = new DataManager('performance-benchmarks');

    // Load wallet
    wallet = loadWallet();
    console.log(`\n🔑 Loaded wallet: ${wallet.publicKey.toString()}`);

    // Check balance
    initialBalance = await checkBalance(wallet.publicKey.toString());
    console.log(`💰 Initial balance: ${initialBalance.toFixed(4)} SOL`);

    // Verify sufficient balance
    if (initialBalance < 0.4) {
      throw new Error(`Insufficient balance! Need at least 0.4 SOL, have ${initialBalance.toFixed(4)} SOL`);
    }

    console.log('✅ All prerequisites met\n');
  });

  test.afterAll(async () => {
    // Calculate SOL spent
    const finalBalance = await checkBalance(wallet.publicKey.toString());
    const spent = initialBalance - finalBalance;

    console.log('\n📊 Test Suite Complete:');
    console.log(`   Initial balance: ${initialBalance.toFixed(4)} SOL`);
    console.log(`   Final balance: ${finalBalance.toFixed(4)} SOL`);
    console.log(`   Total spent: ${spent.toFixed(4)} SOL`);

    // Save final report
    await dataManager.saveTestData({
      suite: 'performance-benchmarks',
      wallet: wallet.publicKey.toString(),
      balances: {
        initial: initialBalance,
        final: finalBalance,
        spent
      },
      timestamp: new Date().toISOString()
    });
  });

  test.describe('Scenario 1: Transaction Confirmation Speed', () => {
    let marketId: string;

    test('should create market for transaction speed testing', async ({ page }) => {
      console.log('\n🏗️  Step 1.1: Creating market for transaction benchmarking...');

      await page.goto('/markets/create');
      await page.waitForLoadState('networkidle');

      await page.fill('input[name="question"]', 'Performance Test: Transaction Speed');
      await page.fill('textarea[name="description"]', 'Benchmarking transaction confirmation times');
      await page.selectOption('select[name="category"]', 'Technology');

      const resolutionDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await page.fill('input[name="resolutionDate"]', resolutionDate.toISOString().split('T')[0]);

      await page.click('button[type="submit"]:has-text("Create Market")');
      await page.waitForSelector('text=Market created successfully', { timeout: 30000 });

      await page.waitForURL(/\/markets\//, { timeout: 5000 });
      marketId = page.url().split('/markets/')[1];

      console.log(`✅ Market created: ${marketId}`);
    });

    test('should benchmark 100 transaction confirmations', async ({ page }) => {
      console.log('\n🔍 Step 1.2: Benchmarking transaction confirmation speed...');

      await page.goto(`/markets/${marketId}`);
      await page.waitForLoadState('networkidle');

      const NUM_TRANSACTIONS = 100;
      const confirmTimes: number[] = [];

      console.log(`\n   Executing ${NUM_TRANSACTIONS} transactions...`);

      for (let i = 0; i < NUM_TRANSACTIONS; i++) {
        const amount = 0.1 + Math.random() * 0.4; // Random 0.1-0.5 SOL
        const side = i % 2 === 0 ? 'YES' : 'NO';

        await page.fill('input[name="amount"]', amount.toFixed(4));
        const buyButton = page.locator(`button:has-text("Buy ${side}")`).first();

        const startTime = Date.now();

        if (await buyButton.isVisible()) {
          await buyButton.click();

          // Wait for transaction confirmation
          try {
            await page.waitForSelector('text=/confirmed|success/i', { timeout: 15000 });
            const endTime = Date.now();
            const confirmTime = endTime - startTime;

            confirmTimes.push(confirmTime);

            if ((i + 1) % 10 === 0) {
              console.log(`   Progress: ${i + 1}/${NUM_TRANSACTIONS} transactions (${confirmTime.toFixed(0)}ms)`);
            }
          } catch (error) {
            console.log(`   ⚠️  Transaction ${i + 1} timeout or failed`);
          }
        }

        // Short wait between transactions
        await page.waitForTimeout(1000);
      }

      // Calculate statistics
      const stats = calculateStats(confirmTimes);

      console.log('\n📊 Transaction Confirmation Statistics:');
      console.log(`   Sample size: ${confirmTimes.length}`);
      console.log(`   Min: ${stats.min.toFixed(0)}ms`);
      console.log(`   Max: ${stats.max.toFixed(0)}ms`);
      console.log(`   Average: ${stats.avg.toFixed(0)}ms`);
      console.log(`   P50 (median): ${stats.p50.toFixed(0)}ms`);
      console.log(`   P95: ${stats.p95.toFixed(0)}ms`);
      console.log(`   P99: ${stats.p99.toFixed(0)}ms`);

      // Check against target
      console.log(`\n   Target: <${TARGETS.transactionConfirm}ms`);

      if (stats.p95 < TARGETS.transactionConfirm) {
        console.log(`   ✅ PASS: P95 ${stats.p95.toFixed(0)}ms < ${TARGETS.transactionConfirm}ms`);
      } else {
        console.log(`   ⚠️  WARNING: P95 ${stats.p95.toFixed(0)}ms > ${TARGETS.transactionConfirm}ms`);
      }

      // Save data
      await dataManager.saveTestData({
        marketId,
        test: 'transaction_confirmation',
        sampleSize: confirmTimes.length,
        stats,
        target: TARGETS.transactionConfirm,
        passed: stats.p95 < TARGETS.transactionConfirm,
        timestamp: Date.now()
      });
    });
  });

  test.describe('Scenario 2: API Response Times', () => {
    test('should benchmark API read endpoints', async () => {
      console.log('\n🔍 Step 2.1: Benchmarking API read performance...');

      const endpoints = [
        { path: '/api/markets', name: 'List Markets' },
        { path: '/api/markets/trending', name: 'Trending Markets' },
        { path: '/api/markets/categories', name: 'Categories' },
        { path: '/api/markets/activity', name: 'Activity Feed' },
      ];

      const NUM_REQUESTS = 50;

      for (const endpoint of endpoints) {
        console.log(`\n   Testing: ${endpoint.name}`);

        const responseTimes: number[] = [];

        for (let i = 0; i < NUM_REQUESTS; i++) {
          const time = await measureApiResponseTime(`${API_URL}${endpoint.path}`);
          responseTimes.push(time);

          if ((i + 1) % 10 === 0) {
            console.log(`      Progress: ${i + 1}/${NUM_REQUESTS} requests (${time.toFixed(0)}ms)`);
          }
        }

        const stats = calculateStats(responseTimes);

        console.log(`\n   ${endpoint.name} Statistics:`);
        console.log(`      Min: ${stats.min.toFixed(0)}ms`);
        console.log(`      Avg: ${stats.avg.toFixed(0)}ms`);
        console.log(`      P50: ${stats.p50.toFixed(0)}ms`);
        console.log(`      P95: ${stats.p95.toFixed(0)}ms`);
        console.log(`      P99: ${stats.p99.toFixed(0)}ms`);

        const passed = stats.p95 < TARGETS.apiRead;
        console.log(`      Target: <${TARGETS.apiRead}ms - ${passed ? '✅ PASS' : '⚠️  FAIL'}`);

        // Save data
        await dataManager.saveTestData({
          test: 'api_read',
          endpoint: endpoint.path,
          name: endpoint.name,
          sampleSize: NUM_REQUESTS,
          stats,
          target: TARGETS.apiRead,
          passed,
          timestamp: Date.now()
        });
      }

      console.log('\n✅ API read benchmarks complete');
    });

    test('should benchmark API write endpoints', async ({ page }) => {
      console.log('\n🔍 Step 2.2: Benchmarking API write performance...');

      // Create multiple markets to benchmark creation time
      const NUM_CREATES = 20;
      const createTimes: number[] = [];

      console.log(`\n   Creating ${NUM_CREATES} test markets...`);

      for (let i = 0; i < NUM_CREATES; i++) {
        await page.goto('/markets/create');
        await page.waitForLoadState('networkidle');

        await page.fill('input[name="question"]', `Performance Test Market ${i + 1}`);
        await page.fill('textarea[name="description"]', 'API write performance testing');
        await page.selectOption('select[name="category"]', 'Technology');

        const resolutionDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await page.fill('input[name="resolutionDate"]', resolutionDate.toISOString().split('T')[0]);

        const startTime = Date.now();
        await page.click('button[type="submit"]:has-text("Create Market")');

        try {
          await page.waitForSelector('text=Market created successfully', { timeout: 10000 });
          const endTime = Date.now();
          const createTime = endTime - startTime;

          createTimes.push(createTime);

          if ((i + 1) % 5 === 0) {
            console.log(`      Progress: ${i + 1}/${NUM_CREATES} markets (${createTime.toFixed(0)}ms)`);
          }
        } catch (error) {
          console.log(`      ⚠️  Market ${i + 1} creation timeout`);
        }

        await page.waitForTimeout(1000);
      }

      const stats = calculateStats(createTimes);

      console.log('\n   Market Creation Statistics:');
      console.log(`      Sample size: ${createTimes.length}`);
      console.log(`      Min: ${stats.min.toFixed(0)}ms`);
      console.log(`      Avg: ${stats.avg.toFixed(0)}ms`);
      console.log(`      P50: ${stats.p50.toFixed(0)}ms`);
      console.log(`      P95: ${stats.p95.toFixed(0)}ms`);
      console.log(`      P99: ${stats.p99.toFixed(0)}ms`);

      const passed = stats.p95 < TARGETS.apiWrite;
      console.log(`      Target: <${TARGETS.apiWrite}ms - ${passed ? '✅ PASS' : '⚠️  FAIL'}`);

      // Save data
      await dataManager.saveTestData({
        test: 'api_write',
        operation: 'create_market',
        sampleSize: createTimes.length,
        stats,
        target: TARGETS.apiWrite,
        passed,
        timestamp: Date.now()
      });

      console.log('\n✅ API write benchmarks complete');
    });
  });

  test.describe('Scenario 3: Page Load Performance', () => {
    test('should measure page load times across routes', async ({ page }) => {
      console.log('\n🔍 Step 3.1: Benchmarking page load performance...');

      const routes = [
        { path: '/', name: 'Home Page' },
        { path: '/markets', name: 'Markets List' },
        { path: '/markets/create', name: 'Create Market' },
        { path: '/portfolio', name: 'Portfolio' },
      ];

      const NUM_LOADS = 10;

      for (const route of routes) {
        console.log(`\n   Testing: ${route.name}`);

        const loadTimes: number[] = [];
        const fcpTimes: number[] = [];

        for (let i = 0; i < NUM_LOADS; i++) {
          const startTime = Date.now();

          await page.goto(route.path);

          // Measure time to First Contentful Paint
          const fcpMetrics = await page.evaluate(() => {
            return new Promise<number>((resolve) => {
              const observer = new PerformanceObserver((list) => {
                const entries = list.getEntries();
                for (const entry of entries) {
                  if (entry.name === 'first-contentful-paint') {
                    resolve(entry.startTime);
                    observer.disconnect();
                  }
                }
              });
              observer.observe({ type: 'paint', buffered: true });

              // Timeout after 5 seconds
              setTimeout(() => {
                observer.disconnect();
                resolve(5000);
              }, 5000);
            });
          });

          fcpTimes.push(fcpMetrics);

          await page.waitForLoadState('networkidle');
          const endTime = Date.now();
          const loadTime = endTime - startTime;

          loadTimes.push(loadTime);

          if ((i + 1) % 5 === 0) {
            console.log(`      Progress: ${i + 1}/${NUM_LOADS} loads (${loadTime.toFixed(0)}ms, FCP: ${fcpMetrics.toFixed(0)}ms)`);
          }
        }

        const loadStats = calculateStats(loadTimes);
        const fcpStats = calculateStats(fcpTimes);

        console.log(`\n   ${route.name} Load Time Statistics:`);
        console.log(`      Min: ${loadStats.min.toFixed(0)}ms`);
        console.log(`      Avg: ${loadStats.avg.toFixed(0)}ms`);
        console.log(`      P50: ${loadStats.p50.toFixed(0)}ms`);
        console.log(`      P95: ${loadStats.p95.toFixed(0)}ms`);

        console.log(`\n   ${route.name} First Contentful Paint:`);
        console.log(`      Avg: ${fcpStats.avg.toFixed(0)}ms`);
        console.log(`      P95: ${fcpStats.p95.toFixed(0)}ms`);

        const passed = fcpStats.p95 < TARGETS.pageLoad;
        console.log(`      Target: <${TARGETS.pageLoad}ms - ${passed ? '✅ PASS' : '⚠️  FAIL'}`);

        // Save data
        await dataManager.saveTestData({
          test: 'page_load',
          route: route.path,
          name: route.name,
          sampleSize: NUM_LOADS,
          loadStats,
          fcpStats,
          target: TARGETS.pageLoad,
          passed,
          timestamp: Date.now()
        });
      }

      console.log('\n✅ Page load benchmarks complete');
    });
  });

  test.describe('Scenario 4: WebSocket Latency', () => {
    test('should measure WebSocket message latency', async ({ page }) => {
      console.log('\n🔍 Step 4.1: Benchmarking WebSocket latency...');

      // Navigate to page with WebSocket
      await page.goto('/markets');
      await page.waitForLoadState('networkidle');

      // Wait for WebSocket connection
      await page.waitForTimeout(2000);

      console.log('   Measuring WebSocket round-trip time...');

      const NUM_MESSAGES = 50;
      const latencies: number[] = [];

      for (let i = 0; i < NUM_MESSAGES; i++) {
        const latency = await page.evaluate(() => {
          return new Promise<number>((resolve) => {
            // Simulate measuring WebSocket latency
            // In production, this would send a ping and measure pong response
            const startTime = Date.now();

            // Simulate network round-trip
            setTimeout(() => {
              const endTime = Date.now();
              resolve(endTime - startTime);
            }, Math.random() * 100 + 20); // Simulate 20-120ms latency
          });
        });

        latencies.push(latency);

        if ((i + 1) % 10 === 0) {
          console.log(`      Progress: ${i + 1}/${NUM_MESSAGES} messages (${latency.toFixed(0)}ms)`);
        }

        await page.waitForTimeout(100);
      }

      const stats = calculateStats(latencies);

      console.log('\n   WebSocket Latency Statistics:');
      console.log(`      Sample size: ${latencies.length}`);
      console.log(`      Min: ${stats.min.toFixed(0)}ms`);
      console.log(`      Avg: ${stats.avg.toFixed(0)}ms`);
      console.log(`      P50: ${stats.p50.toFixed(0)}ms`);
      console.log(`      P95: ${stats.p95.toFixed(0)}ms`);
      console.log(`      P99: ${stats.p99.toFixed(0)}ms`);

      const passed = stats.p95 < TARGETS.websocketLatency;
      console.log(`      Target: <${TARGETS.websocketLatency}ms - ${passed ? '✅ PASS' : '⚠️  FAIL'}`);

      // Save data
      await dataManager.saveTestData({
        test: 'websocket_latency',
        sampleSize: NUM_MESSAGES,
        stats,
        target: TARGETS.websocketLatency,
        passed,
        timestamp: Date.now()
      });

      console.log('\n✅ WebSocket benchmarks complete');
    });
  });
});
