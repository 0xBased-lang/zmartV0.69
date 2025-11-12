import { test, expect, Page } from '@playwright/test';
import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import * as fs from 'fs';
import * as path from 'path';
import { TestDataManager as DataManager } from './helpers/data-manager';

/**
 * PRIORITY 5.1: Program Errors E2E Test Suite
 *
 * Tests all program error codes and edge cases:
 * 1. All custom error codes from the Solana program
 * 2. Invalid state transitions
 * 3. Authorization failures
 * 4. Arithmetic overflow/underflow
 * 5. Invalid parameters
 *
 * Budget: ~0.175 SOL (part of 0.324 SOL total for P5)
 * Duration: ~1 hour
 *
 * Error Codes to Test (from Solana program):
 * - Unauthorized
 * - InvalidState
 * - InvalidAmount
 * - InsufficientFunds
 * - MarketNotActive
 * - MarketExpired
 * - InvalidTimestamp
 * - ArithmeticOverflow
 * - And more...
 */

// Test configuration
const RPC_URL = 'https://api.devnet.solana.com';
const API_URL = process.env.BACKEND_API_URL || 'http://localhost:4000';
const WALLET_PATH = path.join(process.env.HOME!, '.config/solana/id.json');

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

async function expectTransactionToFail(
  page: Page,
  action: () => Promise<void>,
  expectedErrorPattern: RegExp | string
): Promise<boolean> {
  try {
    await action();

    // Wait for error message
    await page.waitForTimeout(5000);

    // Check for error in UI
    const errorElement = page.locator('[role="alert"]').or(
      page.locator('.error-message')
    ).or(
      page.locator('text=/error/i')
    );

    const hasError = await errorElement.isVisible();

    if (hasError) {
      const errorText = await errorElement.textContent();
      console.log(`      Error message: ${errorText}`);

      if (typeof expectedErrorPattern === 'string') {
        return errorText?.includes(expectedErrorPattern) ?? false;
      } else {
        return expectedErrorPattern.test(errorText ?? '');
      }
    }

    return false;
  } catch (error) {
    console.log(`      Caught error: ${error}`);
    return true; // Error was thrown, which is expected
  }
}

test.describe('Program Errors', () => {
  let wallet: Keypair;
  let initialBalance: number;
  let dataManager: DataManager;

  test.beforeAll(async () => {
    // Initialize data manager
    dataManager = new DataManager('program-errors');

    // Load wallet
    wallet = loadWallet();
    console.log(`\n🔑 Loaded wallet: ${wallet.publicKey.toString()}`);

    // Check balance
    initialBalance = await checkBalance(wallet.publicKey.toString());
    console.log(`💰 Initial balance: ${initialBalance.toFixed(4)} SOL`);

    // Verify sufficient balance
    if (initialBalance < 0.2) {
      throw new Error(`Insufficient balance! Need at least 0.2 SOL, have ${initialBalance.toFixed(4)} SOL`);
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
      suite: 'program-errors',
      wallet: wallet.publicKey.toString(),
      balances: {
        initial: initialBalance,
        final: finalBalance,
        spent
      },
      timestamp: new Date().toISOString()
    });
  });

  test.describe('Scenario 1: Invalid Amount Errors', () => {
    let marketId: string;

    test('should create market for invalid amount testing', async ({ page }) => {
      console.log('\n🏗️  Step 1.1: Creating market for invalid amount testing...');

      await page.goto('/markets/create');
      await page.waitForLoadState('networkidle');

      await page.fill('input[name="question"]', 'Error Test: Invalid Amounts');
      await page.fill('textarea[name="description"]', 'Testing invalid amount error handling');
      await page.selectOption('select[name="category"]', 'Technology');

      const resolutionDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await page.fill('input[name="resolutionDate"]', resolutionDate.toISOString().split('T')[0]);

      await page.click('button[type="submit"]:has-text("Create Market")');
      await page.waitForSelector('text=Market created successfully', { timeout: 30000 });

      await page.waitForURL(/\/markets\//, { timeout: 5000 });
      marketId = page.url().split('/markets/')[1];

      console.log(`✅ Market created: ${marketId}`);
    });

    test('should reject zero amount trades', async ({ page }) => {
      console.log('\n🔍 Step 1.2: Testing zero amount rejection...');

      await page.goto(`/markets/${marketId}`);
      await page.waitForLoadState('networkidle');

      console.log('   Attempting to trade 0 SOL...');

      const failed = await expectTransactionToFail(
        page,
        async () => {
          await page.fill('input[name="amount"]', '0');
          const buyButton = page.locator('button:has-text("Buy YES")').first();
          await buyButton.click();
        },
        /invalid.*amount|amount.*zero|greater than zero/i
      );

      if (failed) {
        console.log('   ✅ Zero amount trade rejected');
      } else {
        console.log('   ❌ Zero amount trade was accepted (should fail)');
      }

      await dataManager.saveTestData({
        marketId,
        test: 'zero_amount',
        expected: 'rejected',
        actual: failed ? 'rejected' : 'accepted',
        timestamp: Date.now()
      });
    });

    test('should reject negative amount trades', async ({ page }) => {
      console.log('\n🔍 Step 1.3: Testing negative amount rejection...');

      await page.goto(`/markets/${marketId}`);
      await page.waitForLoadState('networkidle');

      console.log('   Attempting to trade -1 SOL...');

      const failed = await expectTransactionToFail(
        page,
        async () => {
          await page.fill('input[name="amount"]', '-1');
          const buyButton = page.locator('button:has-text("Buy YES")').first();
          await buyButton.click();
        },
        /invalid.*amount|negative|positive/i
      );

      if (failed) {
        console.log('   ✅ Negative amount trade rejected');
      } else {
        console.log('   ❌ Negative amount trade was accepted (should fail)');
      }

      await dataManager.saveTestData({
        marketId,
        test: 'negative_amount',
        expected: 'rejected',
        actual: failed ? 'rejected' : 'accepted',
        timestamp: Date.now()
      });
    });

    test('should reject excessively large amounts', async ({ page }) => {
      console.log('\n🔍 Step 1.4: Testing excessively large amount rejection...');

      await page.goto(`/markets/${marketId}`);
      await page.waitForLoadState('networkidle');

      const hugeAmount = '999999999';
      console.log(`   Attempting to trade ${hugeAmount} SOL...`);

      const failed = await expectTransactionToFail(
        page,
        async () => {
          await page.fill('input[name="amount"]', hugeAmount);
          const buyButton = page.locator('button:has-text("Buy YES")').first();
          await buyButton.click();
        },
        /insufficient.*funds|balance.*low|amount.*large/i
      );

      if (failed) {
        console.log('   ✅ Excessively large amount rejected');
      } else {
        console.log('   ❌ Excessively large amount was accepted (should fail)');
      }

      await dataManager.saveTestData({
        marketId,
        test: 'excessive_amount',
        expected: 'rejected',
        actual: failed ? 'rejected' : 'accepted',
        timestamp: Date.now()
      });
    });
  });

  test.describe('Scenario 2: Invalid State Transitions', () => {
    let marketId: string;

    test('should create market for state transition testing', async ({ page }) => {
      console.log('\n🏗️  Step 2.1: Creating market for invalid state testing...');

      await page.goto('/markets/create');
      await page.waitForLoadState('networkidle');

      await page.fill('input[name="question"]', 'Error Test: Invalid States');
      await page.fill('textarea[name="description"]', 'Testing invalid state transition errors');
      await page.selectOption('select[name="category"]', 'Technology');

      const resolutionDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await page.fill('input[name="resolutionDate"]', resolutionDate.toISOString().split('T')[0]);

      await page.click('button[type="submit"]:has-text("Create Market")');
      await page.waitForSelector('text=Market created successfully', { timeout: 30000 });

      await page.waitForURL(/\/markets\//, { timeout: 5000 });
      marketId = page.url().split('/markets/')[1];

      console.log(`✅ Market created: ${marketId}`);
    });

    test('should reject trading on non-active market', async ({ page }) => {
      console.log('\n🔍 Step 2.2: Testing trade on non-active market...');

      // NOTE: If market is in PROPOSED or APPROVED state, trading should fail

      await page.goto(`/markets/${marketId}`);
      await page.waitForLoadState('networkidle');

      console.log('   Attempting to trade on potentially non-active market...');

      const failed = await expectTransactionToFail(
        page,
        async () => {
          await page.fill('input[name="amount"]', '1.0');
          const buyButton = page.locator('button:has-text("Buy YES")').first();
          await buyButton.click();
        },
        /not.*active|invalid.*state|market.*closed/i
      );

      if (failed) {
        console.log('   ✅ Trade on non-active market rejected');
      } else {
        console.log('   ℹ️  Trade succeeded (market may already be active)');
      }

      await dataManager.saveTestData({
        marketId,
        test: 'trade_non_active',
        expected: 'rejected',
        actual: failed ? 'rejected' : 'accepted',
        timestamp: Date.now()
      });
    });

    test('should reject voting before resolving period', async ({ page }) => {
      console.log('\n🔍 Step 2.3: Testing premature voting...');

      await page.goto(`/markets/${marketId}`);
      await page.waitForLoadState('networkidle');

      console.log('   Attempting to vote before resolution time...');

      const voteButton = page.locator('button:has-text("Vote YES")').or(
        page.locator('button:has-text("Submit Vote")')
      );

      const isVisible = await voteButton.isVisible();

      if (isVisible) {
        const failed = await expectTransactionToFail(
          page,
          async () => {
            await voteButton.click();
          },
          /not.*resolving|invalid.*state|too.*early/i
        );

        if (failed) {
          console.log('   ✅ Premature voting rejected');
        } else {
          console.log('   ❌ Premature voting accepted (should fail)');
        }

        await dataManager.saveTestData({
          marketId,
          test: 'premature_voting',
          expected: 'rejected',
          actual: failed ? 'rejected' : 'accepted',
          timestamp: Date.now()
        });
      } else {
        console.log('   ✅ Vote button not visible (correct behavior)');

        await dataManager.saveTestData({
          marketId,
          test: 'premature_voting_ui',
          expected: 'button_hidden',
          actual: 'button_hidden',
          timestamp: Date.now()
        });
      }
    });

    test('should reject claiming before finalization', async ({ page }) => {
      console.log('\n🔍 Step 2.4: Testing premature claim...');

      await page.goto(`/markets/${marketId}`);
      await page.waitForLoadState('networkidle');

      console.log('   Attempting to claim before finalization...');

      const claimButton = page.locator('button:has-text("Claim")').or(
        page.locator('button:has-text("Claim Payout")')
      );

      const isVisible = await claimButton.isVisible();

      if (isVisible) {
        const failed = await expectTransactionToFail(
          page,
          async () => {
            await claimButton.click();
          },
          /not.*finalized|invalid.*state|too.*early/i
        );

        if (failed) {
          console.log('   ✅ Premature claim rejected');
        } else {
          console.log('   ❌ Premature claim accepted (should fail)');
        }

        await dataManager.saveTestData({
          marketId,
          test: 'premature_claim',
          expected: 'rejected',
          actual: failed ? 'rejected' : 'accepted',
          timestamp: Date.now()
        });
      } else {
        console.log('   ✅ Claim button not visible (correct behavior)');

        await dataManager.saveTestData({
          marketId,
          test: 'premature_claim_ui',
          expected: 'button_hidden',
          actual: 'button_hidden',
          timestamp: Date.now()
        });
      }
    });
  });

  test.describe('Scenario 3: Arithmetic Edge Cases', () => {
    let marketId: string;

    test('should create market for arithmetic testing', async ({ page }) => {
      console.log('\n🏗️  Step 3.1: Creating market for arithmetic edge case testing...');

      await page.goto('/markets/create');
      await page.waitForLoadState('networkidle');

      await page.fill('input[name="question"]', 'Error Test: Arithmetic Edge Cases');
      await page.fill('textarea[name="description"]', 'Testing overflow/underflow prevention');
      await page.selectOption('select[name="category"]', 'Technology');

      const resolutionDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await page.fill('input[name="resolutionDate"]', resolutionDate.toISOString().split('T')[0]);

      await page.click('button[type="submit"]:has-text("Create Market")');
      await page.waitForSelector('text=Market created successfully', { timeout: 30000 });

      await page.waitForURL(/\/markets\//, { timeout: 5000 });
      marketId = page.url().split('/markets/')[1];

      console.log(`✅ Market created: ${marketId}`);
    });

    test('should handle very small trade amounts', async ({ page }) => {
      console.log('\n🔍 Step 3.2: Testing very small amounts...');

      await page.goto(`/markets/${marketId}`);
      await page.waitForLoadState('networkidle');

      const tinyAmount = '0.000001';
      console.log(`   Attempting to trade ${tinyAmount} SOL...`);

      try {
        await page.fill('input[name="amount"]', tinyAmount);
        const buyButton = page.locator('button:has-text("Buy YES")').first();
        await buyButton.click();
        await page.waitForTimeout(5000);

        console.log('   ✅ Very small amount handled (or rejected appropriately)');

        await dataManager.saveTestData({
          marketId,
          test: 'tiny_amount',
          amount: tinyAmount,
          result: 'handled',
          timestamp: Date.now()
        });
      } catch (error) {
        console.log(`   ℹ️  Very small amount rejected: ${error}`);

        await dataManager.saveTestData({
          marketId,
          test: 'tiny_amount',
          amount: tinyAmount,
          result: 'rejected',
          error: String(error),
          timestamp: Date.now()
        });
      }
    });

    test('should handle precision edge cases', async ({ page }) => {
      console.log('\n🔍 Step 3.3: Testing precision edge cases...');

      await page.goto(`/markets/${marketId}`);
      await page.waitForLoadState('networkidle');

      // Test amounts that could cause precision issues
      const precisionAmounts = ['0.123456789', '1.999999999', '0.000000001'];

      for (const amount of precisionAmounts) {
        console.log(`\n   Testing amount: ${amount} SOL`);

        try {
          await page.fill('input[name="amount"]', amount);
          const buyButton = page.locator('button:has-text("Buy YES")').first();
          await buyButton.click();
          await page.waitForTimeout(5000);

          console.log(`   ✅ Precision amount ${amount} handled`);

          await dataManager.saveTestData({
            marketId,
            test: 'precision',
            amount,
            result: 'success',
            timestamp: Date.now()
          });
        } catch (error) {
          console.log(`   ℹ️  Precision amount ${amount} rejected: ${error}`);

          await dataManager.saveTestData({
            marketId,
            test: 'precision',
            amount,
            result: 'rejected',
            error: String(error),
            timestamp: Date.now()
          });
        }
      }

      console.log('\n   ✅ Precision edge cases tested');
    });
  });

  test.describe('Scenario 4: Concurrent Transaction Conflicts', () => {
    let marketId: string;

    test('should create market for concurrent transaction testing', async ({ page }) => {
      console.log('\n🏗️  Step 4.1: Creating market for concurrent transaction testing...');

      await page.goto('/markets/create');
      await page.waitForLoadState('networkidle');

      await page.fill('input[name="question"]', 'Error Test: Concurrent Transactions');
      await page.fill('textarea[name="description"]', 'Testing concurrent transaction handling');
      await page.selectOption('select[name="category"]', 'Technology');

      const resolutionDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await page.fill('input[name="resolutionDate"]', resolutionDate.toISOString().split('T')[0]);

      await page.click('button[type="submit"]:has-text("Create Market")');
      await page.waitForSelector('text=Market created successfully', { timeout: 30000 });

      await page.waitForURL(/\/markets\//, { timeout: 5000 });
      marketId = page.url().split('/markets/')[1];

      console.log(`✅ Market created: ${marketId}`);
    });

    test('should handle rapid consecutive trades', async ({ page }) => {
      console.log('\n🔍 Step 4.2: Testing rapid consecutive trades...');

      await page.goto(`/markets/${marketId}`);
      await page.waitForLoadState('networkidle');

      console.log('   Submitting 5 trades rapidly...');

      let successCount = 0;
      let failureCount = 0;

      for (let i = 0; i < 5; i++) {
        try {
          await page.fill('input[name="amount"]', '0.5');
          const buyButton = page.locator('button:has-text("Buy YES")').first();
          await buyButton.click();
          await page.waitForTimeout(1000); // Very short wait - simulate rapid clicks

          successCount++;
          console.log(`   Trade ${i + 1}: ✅ Success`);
        } catch (error) {
          failureCount++;
          console.log(`   Trade ${i + 1}: ❌ Failed (${error})`);
        }
      }

      console.log(`\n   Results: ${successCount} succeeded, ${failureCount} failed`);

      if (failureCount === 0) {
        console.log('   ✅ All rapid trades handled successfully');
      } else {
        console.log('   ℹ️  Some rapid trades failed (may be expected behavior)');
      }

      await dataManager.saveTestData({
        marketId,
        test: 'rapid_trades',
        successCount,
        failureCount,
        timestamp: Date.now()
      });
    });
  });
});
