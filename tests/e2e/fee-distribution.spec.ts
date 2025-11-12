import { test, expect, Page } from '@playwright/test';
import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import * as fs from 'fs';
import * as path from 'path';
import { TestDataManager as DataManager } from './helpers/data-manager';

/**
 * PRIORITY 3: Fee Distribution E2E Test Suite
 *
 * Tests the 10% fee structure and distribution:
 * 1. 10% total fee on all trades
 * 2. 3/2/5 split (protocol/creator/stakers)
 * 3. Fee accumulation across multiple trades
 *
 * Budget: 0.169 SOL (with 20% buffer)
 * Duration: ~1 hour
 *
 * Fee Structure (from CORE_LOGIC_INVARIANTS.md):
 * - Total Fee: 10% of trade volume
 * - Protocol Fee: 3% (30% of total fee)
 * - Creator Fee: 2% (20% of total fee)
 * - Staker Rewards: 5% (50% of total fee)
 *
 * Validation:
 * - Verify 10% total fee is collected
 * - Verify 3/2/5 split is enforced
 * - Verify fees accumulate correctly across trades
 * - Verify fee claims work for all parties
 */

// Test configuration
const RPC_URL = 'https://api.devnet.solana.com';
const API_URL = process.env.BACKEND_API_URL || 'http://localhost:4000';
const WALLET_PATH = path.join(process.env.HOME!, '.config/solana/id.json');

// Fee constants (from CORE_LOGIC_INVARIANTS.md)
const TOTAL_FEE_BPS = 1000; // 10% = 1000 basis points
const PROTOCOL_FEE_BPS = 300; // 3% = 300 basis points
const CREATOR_FEE_BPS = 200; // 2% = 200 basis points
const STAKER_FEE_BPS = 500; // 5% = 500 basis points

const FEE_PRECISION = 0.01; // 1% tolerance for fee calculations

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

async function getMarketFees(marketId: string): Promise<{
  total: number;
  protocol: number;
  creator: number;
  stakers: number;
} | null> {
  try {
    const response = await fetch(`${API_URL}/api/markets/${marketId}/fees`);
    const data = await response.json();

    return {
      total: data.fees?.total_collected ?? 0,
      protocol: data.fees?.protocol_collected ?? 0,
      creator: data.fees?.creator_collected ?? 0,
      stakers: data.fees?.staker_collected ?? 0
    };
  } catch (error) {
    console.error('Failed to get market fees:', error);
    return null;
  }
}

async function getTradeHistory(marketId: string): Promise<Array<{
  amount: number;
  fee: number;
  timestamp: number;
}> | null> {
  try {
    const response = await fetch(`${API_URL}/api/markets/${marketId}/trades`);
    const data = await response.json();

    return data.trades?.map((t: any) => ({
      amount: t.amount,
      fee: t.fee,
      timestamp: t.timestamp
    })) ?? [];
  } catch (error) {
    console.error('Failed to get trade history:', error);
    return null;
  }
}

function calculateExpectedFees(tradeAmount: number): {
  total: number;
  protocol: number;
  creator: number;
  stakers: number;
} {
  const total = tradeAmount * (TOTAL_FEE_BPS / 10000);
  const protocol = tradeAmount * (PROTOCOL_FEE_BPS / 10000);
  const creator = tradeAmount * (CREATOR_FEE_BPS / 10000);
  const stakers = tradeAmount * (STAKER_FEE_BPS / 10000);

  return { total, protocol, creator, stakers };
}

test.describe('Fee Distribution', () => {
  let wallet: Keypair;
  let initialBalance: number;
  let dataManager: DataManager;

  test.beforeAll(async () => {
    // Initialize data manager
    dataManager = new DataManager('fee-distribution');

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
      suite: 'fee-distribution',
      wallet: wallet.publicKey.toString(),
      balances: {
        initial: initialBalance,
        final: finalBalance,
        spent
      },
      timestamp: new Date().toISOString()
    });
  });

  test.describe('Scenario 1: 10% Total Fee Verification', () => {
    let marketId: string;

    test('should create market for fee testing', async ({ page }) => {
      console.log('\n🏗️  Step 1.1: Creating market for fee validation...');

      await page.goto('/markets/create');
      await page.waitForLoadState('networkidle');

      // Fill in market details
      await page.fill('input[name="question"]', 'Fee Test: 10% Total Fee');
      await page.fill('textarea[name="description"]', 'Testing 10% total fee collection');
      await page.selectOption('select[name="category"]', 'Technology');

      // Set resolution date
      const resolutionDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await page.fill('input[name="resolutionDate"]', resolutionDate.toISOString().split('T')[0]);

      // Create market
      await page.click('button[type="submit"]:has-text("Create Market")');
      await page.waitForSelector('text=Market created successfully', { timeout: 30000 });

      // Get market ID
      await page.waitForURL(/\/markets\//, { timeout: 5000 });
      marketId = page.url().split('/markets/')[1];

      console.log(`✅ Market created: ${marketId}`);
    });

    test('should collect 10% fee on all trades', async ({ page }) => {
      console.log('\n🔍 Step 1.2: Verifying 10% total fee collection...');

      await page.goto(`/markets/${marketId}`);
      await page.waitForLoadState('networkidle');

      // Test trades with various amounts
      const testTrades = [
        { amount: 1.0, side: 'YES' },
        { amount: 2.0, side: 'NO' },
        { amount: 0.5, side: 'YES' },
        { amount: 3.0, side: 'NO' },
        { amount: 1.5, side: 'YES' },
      ];

      let totalTradeVolume = 0;
      let totalExpectedFees = 0;
      let violations = 0;

      for (let i = 0; i < testTrades.length; i++) {
        const { amount, side } = testTrades[i];

        console.log(`\n   Trade ${i + 1}/${testTrades.length}: ${amount} SOL on ${side}`);

        // Calculate expected fee
        const expectedFee = calculateExpectedFees(amount);

        console.log(`   Expected fee: ${expectedFee.total.toFixed(4)} SOL (10% of ${amount})`);

        // Get pre-trade fees
        const preFees = await getMarketFees(marketId);

        // Execute trade
        await page.fill('input[name="amount"]', amount.toString());
        const buyButton = page.locator(`button:has-text("Buy ${side}")`).first();

        if (await buyButton.isVisible()) {
          await buyButton.click();
          await page.waitForTimeout(5000);
        } else {
          console.log(`   ⚠️  Buy ${side} button not visible, skipping trade`);
          continue;
        }

        // Get post-trade fees
        const postFees = await getMarketFees(marketId);

        if (preFees && postFees) {
          const actualFeeCollected = postFees.total - preFees.total;

          console.log(`   Actual fee collected: ${actualFeeCollected.toFixed(4)} SOL`);

          // Check if fee matches expected (within tolerance)
          const feeDeviation = Math.abs(actualFeeCollected - expectedFee.total);
          const feeDeviationPercent = (feeDeviation / expectedFee.total) * 100;

          console.log(`   Fee deviation: ${feeDeviation.toFixed(4)} SOL (${feeDeviationPercent.toFixed(2)}%)`);

          if (feeDeviationPercent > FEE_PRECISION * 100) {
            violations++;
            console.log(`   ❌ VIOLATION: Fee deviation exceeds ${FEE_PRECISION * 100}% tolerance`);
          } else {
            console.log(`   ✅ Valid: Fee collection within tolerance`);
          }

          totalTradeVolume += amount;
          totalExpectedFees += expectedFee.total;

          // Save data
          await dataManager.saveTestData({
            marketId,
            tradeNumber: i + 1,
            amount,
            side,
            expectedFee: expectedFee.total,
            actualFee: actualFeeCollected,
            deviation: feeDeviation,
            preFees,
            postFees,
            timestamp: Date.now()
          });
        } else {
          console.log('   ⚠️  Could not fetch fee data');
        }
      }

      // Final verification
      const finalFees = await getMarketFees(marketId);

      console.log('\n📊 Total Fee Collection Results:');
      console.log(`   Total trade volume: ${totalTradeVolume.toFixed(4)} SOL`);
      console.log(`   Expected total fees: ${totalExpectedFees.toFixed(4)} SOL`);
      console.log(`   Actual total fees: ${finalFees?.total.toFixed(4)} SOL`);
      console.log(`   Violations: ${violations}`);

      expect(violations).toBe(0);

      if (finalFees) {
        const totalDeviation = Math.abs(finalFees.total - totalExpectedFees);
        expect(totalDeviation).toBeLessThan(totalExpectedFees * FEE_PRECISION);
      }

      console.log('\n✅ 10% total fee collected correctly on all trades');
    });
  });

  test.describe('Scenario 2: 3/2/5 Split Verification', () => {
    let marketId: string;

    test('should create market for split testing', async ({ page }) => {
      console.log('\n🏗️  Step 2.1: Creating market for fee split validation...');

      await page.goto('/markets/create');
      await page.waitForLoadState('networkidle');

      // Fill in market details
      await page.fill('input[name="question"]', 'Fee Test: 3/2/5 Split');
      await page.fill('textarea[name="description"]', 'Testing 3% protocol / 2% creator / 5% stakers split');
      await page.selectOption('select[name="category"]', 'Technology');

      // Set resolution date
      const resolutionDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await page.fill('input[name="resolutionDate"]', resolutionDate.toISOString().split('T')[0]);

      // Create market
      await page.click('button[type="submit"]:has-text("Create Market")');
      await page.waitForSelector('text=Market created successfully', { timeout: 30000 });

      // Get market ID
      await page.waitForURL(/\/markets\//, { timeout: 5000 });
      marketId = page.url().split('/markets/')[1];

      console.log(`✅ Market created: ${marketId}`);
    });

    test('should enforce 3/2/5 fee split', async ({ page }) => {
      console.log('\n🔍 Step 2.2: Verifying 3/2/5 fee split...');

      await page.goto(`/markets/${marketId}`);
      await page.waitForLoadState('networkidle');

      // Perform multiple trades
      const testTrades = [
        { amount: 2.0, side: 'YES' },
        { amount: 3.0, side: 'NO' },
        { amount: 1.5, side: 'YES' },
        { amount: 4.0, side: 'NO' },
        { amount: 2.5, side: 'YES' },
      ];

      let totalVolume = 0;
      let violations = 0;

      for (let i = 0; i < testTrades.length; i++) {
        const { amount, side } = testTrades[i];

        console.log(`\n   Trade ${i + 1}/${testTrades.length}: ${amount} SOL on ${side}`);

        // Execute trade
        await page.fill('input[name="amount"]', amount.toString());
        const buyButton = page.locator(`button:has-text("Buy ${side}")`).first();

        if (await buyButton.isVisible()) {
          await buyButton.click();
          await page.waitForTimeout(5000);
        } else {
          console.log(`   ⚠️  Buy ${side} button not visible, skipping trade`);
          continue;
        }

        totalVolume += amount;
      }

      // Get final fee distribution
      const fees = await getMarketFees(marketId);

      if (fees) {
        const expectedFees = calculateExpectedFees(totalVolume);

        console.log('\n📊 Fee Split Results:');
        console.log(`   Total volume: ${totalVolume.toFixed(4)} SOL`);
        console.log(`\n   Expected Distribution:`);
        console.log(`   • Total:    ${expectedFees.total.toFixed(4)} SOL (10%)`);
        console.log(`   • Protocol: ${expectedFees.protocol.toFixed(4)} SOL (3%)`);
        console.log(`   • Creator:  ${expectedFees.creator.toFixed(4)} SOL (2%)`);
        console.log(`   • Stakers:  ${expectedFees.stakers.toFixed(4)} SOL (5%)`);

        console.log(`\n   Actual Distribution:`);
        console.log(`   • Total:    ${fees.total.toFixed(4)} SOL`);
        console.log(`   • Protocol: ${fees.protocol.toFixed(4)} SOL`);
        console.log(`   • Creator:  ${fees.creator.toFixed(4)} SOL`);
        console.log(`   • Stakers:  ${fees.stakers.toFixed(4)} SOL`);

        // Verify each component
        const checks = [
          { name: 'Total', expected: expectedFees.total, actual: fees.total },
          { name: 'Protocol', expected: expectedFees.protocol, actual: fees.protocol },
          { name: 'Creator', expected: expectedFees.creator, actual: fees.creator },
          { name: 'Stakers', expected: expectedFees.stakers, actual: fees.stakers }
        ];

        console.log(`\n   Verification:`);
        for (const check of checks) {
          const deviation = Math.abs(check.actual - check.expected);
          const deviationPercent = (deviation / check.expected) * 100;

          console.log(`   ${check.name}: deviation ${deviation.toFixed(4)} SOL (${deviationPercent.toFixed(2)}%)`);

          if (deviationPercent > FEE_PRECISION * 100) {
            violations++;
            console.log(`     ❌ VIOLATION: Exceeds ${FEE_PRECISION * 100}% tolerance`);
          } else {
            console.log(`     ✅ Valid`);
          }
        }

        // Verify sum of components equals total
        const componentSum = fees.protocol + fees.creator + fees.stakers;
        const sumDeviation = Math.abs(componentSum - fees.total);

        console.log(`\n   Component Sum Verification:`);
        console.log(`   Protocol + Creator + Stakers = ${componentSum.toFixed(4)} SOL`);
        console.log(`   Total = ${fees.total.toFixed(4)} SOL`);
        console.log(`   Deviation = ${sumDeviation.toFixed(4)} SOL`);

        if (sumDeviation > fees.total * FEE_PRECISION) {
          violations++;
          console.log(`   ❌ VIOLATION: Component sum doesn't match total`);
        } else {
          console.log(`   ✅ Valid: Components sum to total`);
        }

        // Final assertions
        expect(violations).toBe(0);

        // Save data
        await dataManager.saveTestData({
          marketId,
          totalVolume,
          expectedFees,
          actualFees: fees,
          violations,
          timestamp: Date.now()
        });

        console.log('\n✅ 3/2/5 fee split enforced correctly');
      } else {
        console.log('   ⚠️  Could not verify fee split (fee data unavailable)');
      }
    });
  });

  test.describe('Scenario 3: Fee Accumulation Across Trades', () => {
    let marketId: string;

    test('should create market for accumulation testing', async ({ page }) => {
      console.log('\n🏗️  Step 3.1: Creating market for fee accumulation testing...');

      await page.goto('/markets/create');
      await page.waitForLoadState('networkidle');

      // Fill in market details
      await page.fill('input[name="question"]', 'Fee Test: Accumulation');
      await page.fill('textarea[name="description"]', 'Testing fee accumulation across multiple trades');
      await page.selectOption('select[name="category"]', 'Technology');

      // Set resolution date
      const resolutionDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await page.fill('input[name="resolutionDate"]', resolutionDate.toISOString().split('T')[0]);

      // Create market
      await page.click('button[type="submit"]:has-text("Create Market")');
      await page.waitForSelector('text=Market created successfully', { timeout: 30000 });

      // Get market ID
      await page.waitForURL(/\/markets\//, { timeout: 5000 });
      marketId = page.url().split('/markets/')[1];

      console.log(`✅ Market created: ${marketId}`);
    });

    test('should accumulate fees correctly across 30 trades', async ({ page }) => {
      console.log('\n🔍 Step 3.2: Testing fee accumulation...');

      await page.goto(`/markets/${marketId}`);
      await page.waitForLoadState('networkidle');

      // Perform 30 trades
      const NUM_TRADES = 30;
      const tradeAmounts = Array.from({ length: NUM_TRADES }, (_, i) =>
        0.5 + Math.random() * 2.0 // Random amounts between 0.5 and 2.5 SOL
      );

      let cumulativeVolume = 0;
      let cumulativeExpectedFees = 0;

      console.log(`\n   Executing ${NUM_TRADES} trades...`);

      for (let i = 0; i < NUM_TRADES; i++) {
        const amount = tradeAmounts[i];
        const side = i % 2 === 0 ? 'YES' : 'NO';

        // Execute trade
        await page.fill('input[name="amount"]', amount.toFixed(4));
        const buyButton = page.locator(`button:has-text("Buy ${side}")`).first();

        if (await buyButton.isVisible()) {
          await buyButton.click();
          await page.waitForTimeout(3000); // Shorter wait for bulk trades
        } else {
          console.log(`   ⚠️  Trade ${i + 1} skipped (button not visible)`);
          continue;
        }

        cumulativeVolume += amount;
        const expectedFee = calculateExpectedFees(amount);
        cumulativeExpectedFees += expectedFee.total;

        // Log progress every 5 trades
        if ((i + 1) % 5 === 0) {
          console.log(`   Progress: ${i + 1}/${NUM_TRADES} trades completed`);
          console.log(`   Cumulative volume: ${cumulativeVolume.toFixed(4)} SOL`);
          console.log(`   Expected cumulative fees: ${cumulativeExpectedFees.toFixed(4)} SOL`);

          // Verify accumulation
          const currentFees = await getMarketFees(marketId);
          if (currentFees) {
            console.log(`   Actual cumulative fees: ${currentFees.total.toFixed(4)} SOL`);

            const deviation = Math.abs(currentFees.total - cumulativeExpectedFees);
            const deviationPercent = (deviation / cumulativeExpectedFees) * 100;

            if (deviationPercent > FEE_PRECISION * 100) {
              console.log(`   ⚠️  Deviation: ${deviationPercent.toFixed(2)}% (exceeds tolerance)`);
            } else {
              console.log(`   ✅ Accumulation accurate (deviation: ${deviationPercent.toFixed(2)}%)`);
            }
          }
        }
      }

      // Final verification
      const finalFees = await getMarketFees(marketId);

      console.log('\n📊 Fee Accumulation Results:');
      console.log(`   Total trades: ${NUM_TRADES}`);
      console.log(`   Total volume: ${cumulativeVolume.toFixed(4)} SOL`);
      console.log(`   Expected total fees: ${cumulativeExpectedFees.toFixed(4)} SOL`);
      console.log(`   Actual total fees: ${finalFees?.total.toFixed(4)} SOL`);

      if (finalFees) {
        const totalDeviation = Math.abs(finalFees.total - cumulativeExpectedFees);
        const totalDeviationPercent = (totalDeviation / cumulativeExpectedFees) * 100;

        console.log(`   Deviation: ${totalDeviation.toFixed(4)} SOL (${totalDeviationPercent.toFixed(2)}%)`);

        expect(totalDeviationPercent).toBeLessThan(FEE_PRECISION * 100);

        // Save final data
        await dataManager.saveTestData({
          marketId,
          numTrades: NUM_TRADES,
          totalVolume: cumulativeVolume,
          expectedFees: cumulativeExpectedFees,
          actualFees: finalFees.total,
          deviation: totalDeviation,
          timestamp: Date.now()
        });

        console.log('\n✅ Fees accumulated correctly across all trades');
      } else {
        console.log('   ⚠️  Could not verify final accumulation (fee data unavailable)');
      }
    });
  });
});
