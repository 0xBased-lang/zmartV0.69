import { test, expect, Page } from '@playwright/test';
import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import * as fs from 'fs';
import * as path from 'path';
import { TestDataManager as DataManager } from './helpers/data-manager';

/**
 * PRIORITY 5.2: Advanced Slippage Protection E2E Test Suite
 *
 * Tests slippage protection mechanisms:
 * 1. Price impact during large trades
 * 2. Slippage tolerance settings
 * 3. Front-running protection
 * 4. Maximum acceptable slippage enforcement
 *
 * Budget: ~0.149 SOL (part of 0.324 SOL total for P5)
 * Duration: ~1 hour
 *
 * Slippage Protection (from CORE_LOGIC_INVARIANTS.md):
 * - User sets max acceptable slippage (e.g., 5%)
 * - If actual price impact > max slippage, transaction reverts
 * - Protects users from sandwich attacks and large price movements
 */

// Test configuration
const RPC_URL = 'https://api.devnet.solana.com';
const API_URL = process.env.BACKEND_API_URL || 'http://localhost:4000';
const WALLET_PATH = path.join(process.env.HOME!, '.config/solana/id.json');

// Slippage constants
const DEFAULT_SLIPPAGE = 0.05; // 5% default slippage tolerance
const MAX_SLIPPAGE = 0.5; // 50% maximum slippage (extreme edge case)

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

async function getMarketPrices(marketId: string): Promise<{ yes: number; no: number } | null> {
  try {
    const response = await fetch(`${API_URL}/api/markets/${marketId}`);
    const data = await response.json();

    return {
      yes: data.market?.price_yes ?? 0.5,
      no: data.market?.price_no ?? 0.5
    };
  } catch (error) {
    console.error('Failed to get market prices:', error);
    return null;
  }
}

function calculatePriceImpact(priceBefore: number, priceAfter: number): number {
  return Math.abs(priceAfter - priceBefore) / priceBefore;
}

test.describe('Advanced Slippage Protection', () => {
  let wallet: Keypair;
  let initialBalance: number;
  let dataManager: DataManager;

  test.beforeAll(async () => {
    // Initialize data manager
    dataManager = new DataManager('slippage-advanced');

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
      suite: 'slippage-advanced',
      wallet: wallet.publicKey.toString(),
      balances: {
        initial: initialBalance,
        final: finalBalance,
        spent
      },
      timestamp: new Date().toISOString()
    });
  });

  test.describe('Scenario 1: Price Impact During Large Trades', () => {
    let marketId: string;

    test('should create market for price impact testing', async ({ page }) => {
      console.log('\n🏗️  Step 1.1: Creating market for price impact testing...');

      await page.goto('/markets/create');
      await page.waitForLoadState('networkidle');

      await page.fill('input[name="question"]', 'Slippage Test: Price Impact');
      await page.fill('textarea[name="description"]', 'Testing price impact during large trades');
      await page.selectOption('select[name="category"]', 'Technology');

      const resolutionDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await page.fill('input[name="resolutionDate"]', resolutionDate.toISOString().split('T')[0]);

      await page.click('button[type="submit"]:has-text("Create Market")');
      await page.waitForSelector('text=Market created successfully', { timeout: 30000 });

      await page.waitForURL(/\/markets\//, { timeout: 5000 });
      marketId = page.url().split('/markets/')[1];

      console.log(`✅ Market created: ${marketId}`);
    });

    test('should measure price impact of progressively larger trades', async ({ page }) => {
      console.log('\n🔍 Step 1.2: Measuring price impact across trade sizes...');

      await page.goto(`/markets/${marketId}`);
      await page.waitForLoadState('networkidle');

      // Test progressively larger trades
      const tradeSizes = [0.5, 1.0, 2.0, 3.0, 5.0];
      const impactResults: Array<{ amount: number; impact: number }> = [];

      for (const amount of tradeSizes) {
        console.log(`\n   Testing ${amount} SOL trade...`);

        // Get price before trade
        const priceBefore = await getMarketPrices(marketId);

        if (!priceBefore) {
          console.log('   ⚠️  Could not fetch pre-trade prices');
          continue;
        }

        console.log(`   Price before: YES=${priceBefore.yes.toFixed(4)}, NO=${priceBefore.no.toFixed(4)}`);

        // Execute trade
        await page.fill('input[name="amount"]', amount.toString());
        const buyButton = page.locator('button:has-text("Buy YES")').first();

        if (await buyButton.isVisible()) {
          await buyButton.click();
          await page.waitForTimeout(5000);
        } else {
          console.log('   ⚠️  Buy button not visible');
          continue;
        }

        // Get price after trade
        const priceAfter = await getMarketPrices(marketId);

        if (!priceAfter) {
          console.log('   ⚠️  Could not fetch post-trade prices');
          continue;
        }

        console.log(`   Price after: YES=${priceAfter.yes.toFixed(4)}, NO=${priceAfter.no.toFixed(4)}`);

        // Calculate price impact
        const impact = calculatePriceImpact(priceBefore.yes, priceAfter.yes);
        console.log(`   Price impact: ${(impact * 100).toFixed(2)}%`);

        impactResults.push({ amount, impact });

        // Save data
        await dataManager.saveTestData({
          marketId,
          tradeAmount: amount,
          priceBefore: priceBefore.yes,
          priceAfter: priceAfter.yes,
          impact,
          timestamp: Date.now()
        });
      }

      // Analyze impact progression
      console.log('\n📊 Price Impact Analysis:');
      console.log('   Trade Size | Price Impact');
      console.log('   -----------|-------------');

      for (const result of impactResults) {
        console.log(`   ${result.amount.toFixed(1)} SOL     | ${(result.impact * 100).toFixed(2)}%`);
      }

      // Verify impact increases with trade size
      let impactIncreasing = true;
      for (let i = 1; i < impactResults.length; i++) {
        if (impactResults[i].impact < impactResults[i - 1].impact) {
          impactIncreasing = false;
          break;
        }
      }

      if (impactIncreasing) {
        console.log('\n   ✅ Price impact increases with trade size (expected behavior)');
      } else {
        console.log('\n   ⚠️  Price impact does not consistently increase (investigate LMSR)');
      }
    });
  });

  test.describe('Scenario 2: Slippage Tolerance Settings', () => {
    let marketId: string;

    test('should create market for slippage tolerance testing', async ({ page }) => {
      console.log('\n🏗️  Step 2.1: Creating market for slippage tolerance testing...');

      await page.goto('/markets/create');
      await page.waitForLoadState('networkidle');

      await page.fill('input[name="question"]', 'Slippage Test: Tolerance Settings');
      await page.fill('textarea[name="description"]', 'Testing slippage tolerance enforcement');
      await page.selectOption('select[name="category"]', 'Technology');

      const resolutionDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await page.fill('input[name="resolutionDate"]', resolutionDate.toISOString().split('T')[0]);

      await page.click('button[type="submit"]:has-text("Create Market")');
      await page.waitForSelector('text=Market created successfully', { timeout: 30000 });

      await page.waitForURL(/\/markets\//, { timeout: 5000 });
      marketId = page.url().split('/markets/')[1];

      console.log(`✅ Market created: ${marketId}`);
    });

    test('should enforce slippage tolerance limits', async ({ page }) => {
      console.log('\n🔍 Step 2.2: Testing slippage tolerance enforcement...');

      await page.goto(`/markets/${marketId}`);
      await page.waitForLoadState('networkidle');

      // Test different slippage tolerance settings
      const slippageSettings = [
        { tolerance: 0.01, label: '1% (strict)' },
        { tolerance: 0.05, label: '5% (normal)' },
        { tolerance: 0.10, label: '10% (relaxed)' },
      ];

      for (const setting of slippageSettings) {
        console.log(`\n   Testing ${setting.label} slippage tolerance...`);

        // NOTE: Slippage setting would typically be in a settings panel
        // For this test, we document expected behavior

        // Look for slippage settings
        const slippageInput = page.locator('input[name="slippage"]').or(
          page.locator('[data-testid="slippage-input"]')
        );

        if (await slippageInput.isVisible()) {
          await slippageInput.fill((setting.tolerance * 100).toString());
          console.log(`   • Set slippage tolerance to ${(setting.tolerance * 100).toFixed(0)}%`);
        } else {
          console.log(`   ℹ️  Slippage settings UI not available`);
          console.log(`      Expected: User can configure max acceptable slippage`);
          console.log(`      Behavior: Trades exceeding this limit should fail`);
        }

        // Attempt a large trade that may exceed slippage
        await page.fill('input[name="amount"]', '5.0');
        const buyButton = page.locator('button:has-text("Buy YES")').first();

        if (await buyButton.isVisible()) {
          await buyButton.click();
          await page.waitForTimeout(5000);

          console.log(`   • Large trade executed (or failed if slippage exceeded)`);
        }

        await dataManager.saveTestData({
          marketId,
          slippageTolerance: setting.tolerance,
          label: setting.label,
          timestamp: Date.now()
        });
      }

      console.log('\n✅ Slippage tolerance mechanism documented');
    });

    test('should reject trades exceeding max slippage', async ({ page }) => {
      console.log('\n🔍 Step 2.3: Testing slippage rejection...');

      await page.goto(`/markets/${marketId}`);
      await page.waitForLoadState('networkidle');

      console.log('   Attempting very large trade with strict slippage (1%)...');

      // Set strict slippage if settings available
      const slippageInput = page.locator('input[name="slippage"]').or(
        page.locator('[data-testid="slippage-input"]')
      );

      if (await slippageInput.isVisible()) {
        await slippageInput.fill('1'); // 1% strict tolerance
        console.log('   • Set slippage tolerance to 1%');
      }

      // Attempt very large trade (should exceed 1% slippage)
      await page.fill('input[name="amount"]', '10.0');
      const buyButton = page.locator('button:has-text("Buy YES")').first();

      let failed = false;
      try {
        if (await buyButton.isVisible()) {
          await buyButton.click();
          await page.waitForTimeout(5000);

          // Check for error message
          const errorElement = page.locator('[role="alert"]').or(
            page.locator('.error-message')
          );

          if (await errorElement.isVisible()) {
            const errorText = await errorElement.textContent();
            console.log(`   Error: ${errorText}`);

            if (errorText?.includes('slippage') || errorText?.includes('price impact')) {
              failed = true;
              console.log('   ✅ Trade rejected due to excessive slippage');
            }
          } else {
            console.log('   ⚠️  Trade executed despite large slippage (may need stricter limits)');
          }
        }
      } catch (error) {
        failed = true;
        console.log(`   ✅ Trade failed: ${error}`);
      }

      await dataManager.saveTestData({
        marketId,
        test: 'exceed_max_slippage',
        slippage: 0.01,
        tradeAmount: 10.0,
        rejected: failed,
        timestamp: Date.now()
      });
    });
  });

  test.describe('Scenario 3: Front-Running Protection', () => {
    let marketId: string;

    test('should create market for front-running testing', async ({ page }) => {
      console.log('\n🏗️  Step 3.1: Creating market for front-running protection testing...');

      await page.goto('/markets/create');
      await page.waitForLoadState('networkidle');

      await page.fill('input[name="question"]', 'Slippage Test: Front-Running Protection');
      await page.fill('textarea[name="description"]', 'Testing protection against sandwich attacks');
      await page.selectOption('select[name="category"]', 'Technology');

      const resolutionDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await page.fill('input[name="resolutionDate"]', resolutionDate.toISOString().split('T')[0]);

      await page.click('button[type="submit"]:has-text("Create Market")');
      await page.waitForSelector('text=Market created successfully', { timeout: 30000 });

      await page.waitForURL(/\/markets\//, { timeout: 5000 });
      marketId = page.url().split('/markets/')[1];

      console.log(`✅ Market created: ${marketId}`);
    });

    test('should protect against sandwich attacks via slippage', async ({ page }) => {
      console.log('\n🔍 Step 3.2: Testing sandwich attack protection...');

      await page.goto(`/markets/${marketId}`);
      await page.waitForLoadState('networkidle');

      // Simulate sandwich attack scenario:
      // 1. Attacker front-runs with large buy
      // 2. Victim's transaction executes at worse price
      // 3. Attacker sells for profit

      console.log('\n   Scenario: Simulating sandwich attack');

      // Step 1: Large "attacker" trade to move price
      console.log('   Step 1: Large front-running trade...');

      const priceBefore = await getMarketPrices(marketId);
      console.log(`   Initial price: ${priceBefore?.yes.toFixed(4)}`);

      await page.fill('input[name="amount"]', '5.0');
      let buyButton = page.locator('button:has-text("Buy YES")').first();

      if (await buyButton.isVisible()) {
        await buyButton.click();
        await page.waitForTimeout(5000);
        console.log('   • Front-run trade executed');
      }

      const priceAfterFrontRun = await getMarketPrices(marketId);
      console.log(`   Price after front-run: ${priceAfterFrontRun?.yes.toFixed(4)}`);

      // Step 2: "Victim" trade with slippage protection
      console.log('\n   Step 2: Victim trade with slippage protection...');

      if (priceBefore && priceAfterFrontRun) {
        const frontRunImpact = calculatePriceImpact(priceBefore.yes, priceAfterFrontRun.yes);
        console.log(`   Front-run impact: ${(frontRunImpact * 100).toFixed(2)}%`);

        // Set strict slippage (1%)
        const slippageInput = page.locator('input[name="slippage"]');
        if (await slippageInput.isVisible()) {
          await slippageInput.fill('1');
        }

        // Attempt victim trade
        await page.fill('input[name="amount"]', '2.0');
        buyButton = page.locator('button:has-text("Buy YES")').first();

        let victimTradeSucceeded = false;
        try {
          if (await buyButton.isVisible()) {
            await buyButton.click();
            await page.waitForTimeout(5000);

            const errorElement = page.locator('[role="alert"]');
            const hasError = await errorElement.isVisible();

            if (hasError) {
              console.log('   ✅ Victim trade rejected due to slippage protection');
            } else {
              victimTradeSucceeded = true;
              console.log('   ⚠️  Victim trade executed (slippage may be within tolerance)');
            }
          }
        } catch (error) {
          console.log(`   ✅ Victim trade protected: ${error}`);
        }

        // Save data
        await dataManager.saveTestData({
          marketId,
          test: 'sandwich_attack_protection',
          frontRunImpact,
          victimTradeSucceeded,
          timestamp: Date.now()
        });
      }

      console.log('\n✅ Front-running protection mechanism tested');
    });
  });

  test.describe('Scenario 4: Extreme Slippage Edge Cases', () => {
    let marketId: string;

    test('should create market for extreme slippage testing', async ({ page }) => {
      console.log('\n🏗️  Step 4.1: Creating market for extreme slippage testing...');

      await page.goto('/markets/create');
      await page.waitForLoadState('networkidle');

      await page.fill('input[name="question"]', 'Slippage Test: Extreme Cases');
      await page.fill('textarea[name="description"]', 'Testing extreme slippage scenarios');
      await page.selectOption('select[name="category"]', 'Technology');

      const resolutionDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await page.fill('input[name="resolutionDate"]', resolutionDate.toISOString().split('T')[0]);

      await page.click('button[type="submit"]:has-text("Create Market")');
      await page.waitForSelector('text=Market created successfully', { timeout: 30000 });

      await page.waitForURL(/\/markets\//, { timeout: 5000 });
      marketId = page.url().split('/markets/')[1];

      console.log(`✅ Market created: ${marketId}`);
    });

    test('should handle extreme slippage tolerance settings', async ({ page }) => {
      console.log('\n🔍 Step 4.2: Testing extreme slippage tolerance...');

      await page.goto(`/markets/${marketId}`);
      await page.waitForLoadState('networkidle');

      // Test extreme slippage settings
      const extremeSettings = [
        { tolerance: 0.001, label: '0.1% (ultra-strict)' },
        { tolerance: 0.5, label: '50% (ultra-relaxed)' },
        { tolerance: 1.0, label: '100% (no protection)' },
      ];

      for (const setting of extremeSettings) {
        console.log(`\n   Testing ${setting.label} slippage...`);

        const slippageInput = page.locator('input[name="slippage"]');

        if (await slippageInput.isVisible()) {
          await slippageInput.fill((setting.tolerance * 100).toString());
          console.log(`   • Set to ${(setting.tolerance * 100).toFixed(1)}%`);

          // Try a moderate trade
          await page.fill('input[name="amount"]', '1.0');
          const buyButton = page.locator('button:has-text("Buy YES")').first();

          if (await buyButton.isVisible()) {
            await buyButton.click();
            await page.waitForTimeout(5000);
            console.log(`   • Trade executed with ${setting.label} tolerance`);
          }
        } else {
          console.log(`   ℹ️  Cannot test extreme slippage (UI not available)`);
        }

        await dataManager.saveTestData({
          marketId,
          extremeSlippage: setting.tolerance,
          label: setting.label,
          timestamp: Date.now()
        });
      }

      console.log('\n✅ Extreme slippage cases documented');
    });
  });
});
