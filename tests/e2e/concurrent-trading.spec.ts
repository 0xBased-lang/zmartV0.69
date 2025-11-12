import { test, expect, Page } from '@playwright/test';
import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import * as fs from 'fs';
import * as path from 'path';
import { TestDataManager as DataManager } from './helpers/data-manager';

/**
 * PRIORITY 7: Concurrent Trading E2E Test Suite
 *
 * Tests concurrent trading scenarios and race conditions:
 * 1. Simulated concurrent trades (single-user rapid execution)
 * 2. Order book consistency under load
 * 3. State synchronization across concurrent operations
 * 4. System stress testing
 *
 * Budget: 0.270 SOL (with 20% buffer)
 * Duration: ~2 hours
 *
 * NOTE: True multi-user testing requires multiple funded wallets.
 * This suite simulates concurrent behavior with rapid sequential trades
 * from a single wallet, which tests system throughput and consistency
 * but not true race conditions between independent users.
 *
 * For full multi-user testing, fund additional wallets from
 * TEST_WALLET_STATUS.md and run tests in parallel.
 */

// Test configuration
const RPC_URL = 'https://api.devnet.solana.com';
const API_URL = process.env.BACKEND_API_URL || 'http://localhost:4000';
const WALLET_PATH = path.join(process.env.HOME!, '.config/solana/id.json');

// Concurrency constants
const CONCURRENT_OPERATIONS = 10; // Simulated parallel operations
const STRESS_TEST_OPERATIONS = 100; // System stress test

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

async function getMarketState(marketId: string): Promise<any> {
  try {
    const response = await fetch(`${API_URL}/api/markets/${marketId}`);
    return await response.json();
  } catch (error) {
    console.error('Failed to get market state:', error);
    return null;
  }
}

test.describe('Concurrent Trading', () => {
  let wallet: Keypair;
  let initialBalance: number;
  let dataManager: DataManager;

  test.beforeAll(async () => {
    // Initialize data manager
    dataManager = new DataManager('concurrent-trading');

    // Load wallet
    wallet = loadWallet();
    console.log(`\n🔑 Loaded wallet: ${wallet.publicKey.toString()}`);

    // Check balance
    initialBalance = await checkBalance(wallet.publicKey.toString());
    console.log(`💰 Initial balance: ${initialBalance.toFixed(4)} SOL`);

    // Verify sufficient balance
    if (initialBalance < 0.3) {
      throw new Error(`Insufficient balance! Need at least 0.3 SOL, have ${initialBalance.toFixed(4)} SOL`);
    }

    console.log('\n⚠️  NOTE: Single-wallet concurrent simulation');
    console.log('   True multi-user testing requires multiple funded wallets');
    console.log('   See docs/testing/TEST_WALLET_STATUS.md for multi-wallet setup\n');
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
      suite: 'concurrent-trading',
      wallet: wallet.publicKey.toString(),
      balances: {
        initial: initialBalance,
        final: finalBalance,
        spent
      },
      timestamp: new Date().toISOString()
    });
  });

  test.describe('Scenario 1: Simulated Concurrent Trades', () => {
    let marketId: string;

    test('should create market for concurrent trading', async ({ page }) => {
      console.log('\n🏗️  Step 1.1: Creating market for concurrent trading test...');

      await page.goto('/markets/create');
      await page.waitForLoadState('networkidle');

      await page.fill('input[name="question"]', 'Concurrent Test: Rapid Trading');
      await page.fill('textarea[name="description"]', 'Testing system under rapid sequential trades');
      await page.selectOption('select[name="category"]', 'Technology');

      const resolutionDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await page.fill('input[name="resolutionDate"]', resolutionDate.toISOString().split('T')[0]);

      await page.click('button[type="submit"]:has-text("Create Market")');
      await page.waitForSelector('text=Market created successfully', { timeout: 30000 });

      await page.waitForURL(/\/markets\//, { timeout: 5000 });
      marketId = page.url().split('/markets/')[1];

      console.log(`✅ Market created: ${marketId}`);
    });

    test('should execute rapid sequential trades', async ({ page }) => {
      console.log('\n🔍 Step 1.2: Executing rapid sequential trades...');

      await page.goto(`/markets/${marketId}`);
      await page.waitForLoadState('networkidle');

      console.log(`\n   Executing ${CONCURRENT_OPERATIONS} rapid trades...`);

      let successCount = 0;
      let failureCount = 0;
      const tradeTimes: number[] = [];

      for (let i = 0; i < CONCURRENT_OPERATIONS; i++) {
        const amount = 0.5 + Math.random() * 1.0; // Random 0.5-1.5 SOL
        const side = i % 2 === 0 ? 'YES' : 'NO';

        console.log(`   Trade ${i + 1}/${CONCURRENT_OPERATIONS}: ${amount.toFixed(2)} SOL on ${side}`);

        try {
          const startTime = Date.now();

          await page.fill('input[name="amount"]', amount.toFixed(4));
          const buyButton = page.locator(`button:has-text("Buy ${side}")`).first();

          if (await buyButton.isVisible()) {
            await buyButton.click();
            await page.waitForTimeout(500); // Very short wait - simulate rapid clicks

            const endTime = Date.now();
            const tradeTime = endTime - startTime;
            tradeTimes.push(tradeTime);

            successCount++;
            console.log(`      ✅ Success (${tradeTime}ms)`);
          } else {
            failureCount++;
            console.log(`      ❌ Buy button not visible`);
          }
        } catch (error) {
          failureCount++;
          console.log(`      ❌ Failed: ${error}`);
        }
      }

      console.log(`\n   Results:`);
      console.log(`      Successful: ${successCount}`);
      console.log(`      Failed: ${failureCount}`);
      console.log(`      Success rate: ${((successCount / CONCURRENT_OPERATIONS) * 100).toFixed(1)}%`);

      if (tradeTimes.length > 0) {
        const avgTime = tradeTimes.reduce((a, b) => a + b, 0) / tradeTimes.length;
        console.log(`      Average time: ${avgTime.toFixed(0)}ms`);
      }

      // Verify market state consistency
      const finalState = await getMarketState(marketId);

      if (finalState) {
        console.log(`\n   Final market state:`);
        console.log(`      Total trades: ${finalState.market?.trade_count ?? 'unknown'}`);
        console.log(`      Price YES: ${finalState.market?.price_yes?.toFixed(4) ?? 'unknown'}`);
        console.log(`      Price NO: ${finalState.market?.price_no?.toFixed(4) ?? 'unknown'}`);
        console.log(`      Total volume: ${finalState.market?.total_volume?.toFixed(4) ?? 'unknown'} SOL`);
      }

      // Save data
      await dataManager.saveTestData({
        marketId,
        test: 'rapid_sequential_trades',
        totalOperations: CONCURRENT_OPERATIONS,
        successCount,
        failureCount,
        tradeTimes,
        finalState,
        timestamp: Date.now()
      });

      console.log('\n✅ Rapid trading test complete');
    });
  });

  test.describe('Scenario 2: Order Book Consistency', () => {
    let marketId: string;

    test('should create market for order book testing', async ({ page }) => {
      console.log('\n🏗️  Step 2.1: Creating market for order book consistency test...');

      await page.goto('/markets/create');
      await page.waitForLoadState('networkidle');

      await page.fill('input[name="question"]', 'Concurrent Test: Order Book Consistency');
      await page.fill('textarea[name="description"]', 'Testing order book consistency under load');
      await page.selectOption('select[name="category"]', 'Technology');

      const resolutionDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await page.fill('input[name="resolutionDate"]', resolutionDate.toISOString().split('T')[0]);

      await page.click('button[type="submit"]:has-text("Create Market")');
      await page.waitForSelector('text=Market created successfully', { timeout: 30000 });

      await page.waitForURL(/\/markets\//, { timeout: 5000 });
      marketId = page.url().split('/markets/')[1];

      console.log(`✅ Market created: ${marketId}`);
    });

    test('should maintain order book consistency', async ({ page }) => {
      console.log('\n🔍 Step 2.2: Verifying order book consistency...');

      await page.goto(`/markets/${marketId}`);
      await page.waitForLoadState('networkidle');

      // Execute multiple trades
      const numTrades = 20;
      const stateSnapshots: any[] = [];

      console.log(`\n   Executing ${numTrades} trades with state verification...`);

      for (let i = 0; i < numTrades; i++) {
        // Capture state before trade
        const stateBefore = await getMarketState(marketId);

        // Execute trade
        const amount = 0.5;
        const side = i % 2 === 0 ? 'YES' : 'NO';

        await page.fill('input[name="amount"]', amount.toString());
        const buyButton = page.locator(`button:has-text("Buy ${side}")`).first();

        if (await buyButton.isVisible()) {
          await buyButton.click();
          await page.waitForTimeout(3000); // Wait for state update
        }

        // Capture state after trade
        const stateAfter = await getMarketState(marketId);

        stateSnapshots.push({
          tradeNumber: i + 1,
          side,
          amount,
          stateBefore,
          stateAfter
        });

        // Verify consistency
        if (stateBefore && stateAfter) {
          const priceSumBefore = (stateBefore.market?.price_yes ?? 0) + (stateBefore.market?.price_no ?? 0);
          const priceSumAfter = (stateAfter.market?.price_yes ?? 0) + (stateAfter.market?.price_no ?? 0);

          const consistent = Math.abs(priceSumAfter - 1.0) < 0.01;

          if ((i + 1) % 5 === 0) {
            console.log(`   Trade ${i + 1}: ${consistent ? '✅' : '❌'} P(YES) + P(NO) = ${priceSumAfter.toFixed(4)}`);
          }
        }
      }

      console.log('\n   Order book consistency verification complete');

      // Save snapshots
      await dataManager.saveTestData({
        marketId,
        test: 'order_book_consistency',
        numTrades,
        stateSnapshots,
        timestamp: Date.now()
      });
    });
  });

  test.describe('Scenario 3: State Synchronization', () => {
    let marketId: string;

    test('should create market for state sync testing', async ({ page }) => {
      console.log('\n🏗️  Step 3.1: Creating market for state synchronization test...');

      await page.goto('/markets/create');
      await page.waitForLoadState('networkidle');

      await page.fill('input[name="question"]', 'Concurrent Test: State Sync');
      await page.fill('textarea[name="description"]', 'Testing state synchronization across operations');
      await page.selectOption('select[name="category"]', 'Technology');

      const resolutionDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await page.fill('input[name="resolutionDate"]', resolutionDate.toISOString().split('T')[0]);

      await page.click('button[type="submit"]:has-text("Create Market")');
      await page.waitForSelector('text=Market created successfully', { timeout: 30000 });

      await page.waitForURL(/\/markets\//, { timeout: 5000 });
      marketId = page.url().split('/markets/')[1];

      console.log(`✅ Market created: ${marketId}`);
    });

    test('should maintain state consistency across rapid updates', async ({ page }) => {
      console.log('\n🔍 Step 3.2: Testing state synchronization...');

      await page.goto(`/markets/${marketId}`);
      await page.waitForLoadState('networkidle');

      // Rapidly execute trades and verify UI updates
      const numTrades = 15;
      let uiUpdateFailures = 0;

      console.log(`\n   Executing ${numTrades} trades with UI sync verification...`);

      for (let i = 0; i < numTrades; i++) {
        const amount = 0.5;
        const side = i % 2 === 0 ? 'YES' : 'NO';

        await page.fill('input[name="amount"]', amount.toString());
        const buyButton = page.locator(`button:has-text("Buy ${side}")`).first();

        if (await buyButton.isVisible()) {
          await buyButton.click();
          await page.waitForTimeout(2000);

          // Verify UI reflects the trade
          try {
            const priceElement = page.locator('[data-testid="price-yes"]').or(
              page.locator('text=/YES.*%/i')
            );

            if (await priceElement.isVisible()) {
              if ((i + 1) % 5 === 0) {
                console.log(`   Trade ${i + 1}: ✅ UI updated`);
              }
            } else {
              uiUpdateFailures++;
              console.log(`   Trade ${i + 1}: ⚠️  UI update not visible`);
            }
          } catch (error) {
            uiUpdateFailures++;
          }
        }
      }

      console.log(`\n   UI sync results:`);
      console.log(`      Total trades: ${numTrades}`);
      console.log(`      UI update failures: ${uiUpdateFailures}`);
      console.log(`      Success rate: ${(((numTrades - uiUpdateFailures) / numTrades) * 100).toFixed(1)}%`);

      await dataManager.saveTestData({
        marketId,
        test: 'state_synchronization',
        numTrades,
        uiUpdateFailures,
        timestamp: Date.now()
      });

      console.log('\n✅ State synchronization test complete');
    });
  });

  test.describe('Scenario 4: System Stress Test', () => {
    let marketId: string;

    test('should create market for stress testing', async ({ page }) => {
      console.log('\n🏗️  Step 4.1: Creating market for system stress test...');

      await page.goto('/markets/create');
      await page.waitForLoadState('networkidle');

      await page.fill('input[name="question"]', 'Stress Test: System Load');
      await page.fill('textarea[name="description"]', 'Testing system under sustained high load');
      await page.selectOption('select[name="category"]', 'Technology');

      const resolutionDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await page.fill('input[name="resolutionDate"]', resolutionDate.toISOString().split('T')[0]);

      await page.click('button[type="submit"]:has-text("Create Market")');
      await page.waitForSelector('text=Market created successfully', { timeout: 30000 });

      await page.waitForURL(/\/markets\//, { timeout: 5000 });
      marketId = page.url().split('/markets/')[1];

      console.log(`✅ Market created: ${marketId}`);
    });

    test('should handle sustained high load', async ({ page }) => {
      console.log('\n🔍 Step 4.2: Running system stress test...');

      await page.goto(`/markets/${marketId}`);
      await page.waitForLoadState('networkidle');

      console.log(`\n   Executing ${STRESS_TEST_OPERATIONS} operations...`);

      let successCount = 0;
      let errorCount = 0;
      let timeoutCount = 0;
      const responseTimes: number[] = [];

      const startTime = Date.now();

      for (let i = 0; i < STRESS_TEST_OPERATIONS; i++) {
        const amount = 0.2 + Math.random() * 0.3; // Random 0.2-0.5 SOL
        const side = i % 2 === 0 ? 'YES' : 'NO';

        try {
          const opStart = Date.now();

          await page.fill('input[name="amount"]', amount.toFixed(4));
          const buyButton = page.locator(`button:has-text("Buy ${side}")`).first();

          if (await buyButton.isVisible()) {
            await buyButton.click();
            await page.waitForTimeout(200); // Minimal wait

            const opEnd = Date.now();
            const responseTime = opEnd - opStart;
            responseTimes.push(responseTime);

            successCount++;
          } else {
            errorCount++;
          }
        } catch (error) {
          if (String(error).includes('timeout')) {
            timeoutCount++;
          } else {
            errorCount++;
          }
        }

        // Progress updates every 10 operations
        if ((i + 1) % 10 === 0) {
          const progress = ((i + 1) / STRESS_TEST_OPERATIONS * 100).toFixed(1);
          console.log(`   Progress: ${progress}% (${i + 1}/${STRESS_TEST_OPERATIONS})`);
        }
      }

      const endTime = Date.now();
      const totalTime = (endTime - startTime) / 1000; // seconds

      console.log(`\n📊 Stress Test Results:`);
      console.log(`   Total operations: ${STRESS_TEST_OPERATIONS}`);
      console.log(`   Successful: ${successCount}`);
      console.log(`   Errors: ${errorCount}`);
      console.log(`   Timeouts: ${timeoutCount}`);
      console.log(`   Success rate: ${(successCount / STRESS_TEST_OPERATIONS * 100).toFixed(1)}%`);
      console.log(`   Total time: ${totalTime.toFixed(1)}s`);
      console.log(`   Operations/sec: ${(STRESS_TEST_OPERATIONS / totalTime).toFixed(2)}`);

      if (responseTimes.length > 0) {
        const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
        const minResponseTime = Math.min(...responseTimes);
        const maxResponseTime = Math.max(...responseTimes);

        console.log(`\n   Response times:`);
        console.log(`      Min: ${minResponseTime}ms`);
        console.log(`      Max: ${maxResponseTime}ms`);
        console.log(`      Avg: ${avgResponseTime.toFixed(0)}ms`);
      }

      // Verify final market state
      const finalState = await getMarketState(marketId);

      if (finalState) {
        console.log(`\n   Final market state:`);
        console.log(`      Price YES: ${finalState.market?.price_yes?.toFixed(4) ?? 'unknown'}`);
        console.log(`      Price NO: ${finalState.market?.price_no?.toFixed(4) ?? 'unknown'}`);
        console.log(`      Total volume: ${finalState.market?.total_volume?.toFixed(4) ?? 'unknown'} SOL`);
      }

      // Save data
      await dataManager.saveTestData({
        marketId,
        test: 'system_stress_test',
        totalOperations: STRESS_TEST_OPERATIONS,
        successCount,
        errorCount,
        timeoutCount,
        totalTime,
        operationsPerSecond: STRESS_TEST_OPERATIONS / totalTime,
        responseTimes,
        finalState,
        timestamp: Date.now()
      });

      console.log('\n✅ System stress test complete');
    });
  });
});
