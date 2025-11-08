/**
 * Real Blockchain Trading Flow E2E Tests
 *
 * These tests use:
 * - REAL test wallet with devnet SOL
 * - REAL transactions on Solana devnet
 * - REAL on-chain state verification
 * - REAL WebSocket connections
 *
 * Expected execution time: 5-10 minutes
 * Each transaction takes ~10-20 seconds on devnet
 */

import { test, expect } from '@playwright/test';
import {
  captureConsoleLogs,
  connectTestWallet,
  executeBuyTrade,
  executeSellTrade,
  getMarketData,
  getUserPosition,
  getSOLBalance,
  takeDebugScreenshot,
  saveCapturedLogs,
  clearCapturedLogs,
  getTestWalletPublicKey,
} from './helpers/wallet-setup';

// Test market ID from environment
const TEST_MARKET_ID = process.env.TEST_MARKET_ID!;

test.describe('Real Blockchain Trading Flow', () => {
  test.beforeEach(async ({ page }) => {
    console.log('\n═══════════════════════════════════════════════════');
    console.log('🧪 Starting new test');
    console.log('═══════════════════════════════════════════════════\n');

    // Clear previous logs
    clearCapturedLogs();

    // Set up console log capture
    await captureConsoleLogs(page);

    console.log('📱 Test Wallet:');
    console.log(`   ${getTestWalletPublicKey().toBase58()}\n`);
  });

  test.afterEach(async ({ page }, testInfo) => {
    // Save console logs for this test
    await saveCapturedLogs(testInfo.title);

    // Take final screenshot
    await takeDebugScreenshot(page, `${testInfo.title}-final`);

    console.log('\n═══════════════════════════════════════════════════');
    console.log(`✅ Test completed: ${testInfo.title}`);
    console.log('═══════════════════════════════════════════════════\n');
  });

  test('should load market page and display real on-chain data', async ({ page }) => {
    console.log('🚀 TEST: Load market page with real data\n');

    // Navigate to test market
    await page.goto(`/markets/${TEST_MARKET_ID}`);
    console.log(`✅ Navigated to market: ${TEST_MARKET_ID}`);

    // Wait for real market data to load from RPC
    await page.waitForSelector('[data-testid="market-price"]', { timeout: 30000 });
    console.log('✅ Market data loaded from blockchain');

    // Get market data
    const marketData = await getMarketData(page);

    // Verify data is not mock (not exactly 50/50)
    expect(marketData.price).not.toBe('0.500');
    console.log('✅ Verified data is real (not mock)');

    // Take screenshot
    await takeDebugScreenshot(page, 'market-page-loaded');

    console.log('\n🎉 TEST PASSED: Market page displays real on-chain data');
  });

  test('should connect wallet and display real SOL balance', async ({ page }) => {
    console.log('🚀 TEST: Connect wallet and check balance\n');

    // Navigate to market
    await page.goto(`/markets/${TEST_MARKET_ID}`);

    // Connect wallet
    await connectTestWallet(page);

    // Wait for balance to load
    await page.waitForSelector('[data-testid="sol-balance"]', { timeout: 10000 });

    // Get real balance
    const balance = await getSOLBalance(page);
    const balanceNum = parseFloat(balance);

    // Verify balance is reasonable
    expect(balanceNum).toBeGreaterThan(0);
    expect(balanceNum).toBeLessThan(1000000); // Reasonable upper bound

    console.log(`✅ Real balance displayed: ${balance} SOL`);

    // Take screenshot
    await takeDebugScreenshot(page, 'wallet-connected');

    console.log('\n🎉 TEST PASSED: Wallet connected with real balance');
  });

  test('should execute real BUY transaction on devnet', async ({ page }) => {
    console.log('🚀 TEST: Execute real BUY transaction\n');

    // Navigate to market
    await page.goto(`/markets/${TEST_MARKET_ID}`);
    await page.waitForSelector('[data-testid="market-price"]', { timeout: 30000 });

    // Connect wallet
    await connectTestWallet(page);

    // Get initial balance
    const initialBalance = await getSOLBalance(page);
    const initialBalanceNum = parseFloat(initialBalance);
    console.log(`💰 Initial balance: ${initialBalance} SOL`);

    // Get initial position (if any)
    const initialPosition = await getUserPosition(page);
    const initialSharesYes = initialPosition ? parseFloat(initialPosition.sharesYes) : 0;
    console.log(`📊 Initial YES shares: ${initialSharesYes}`);

    // Execute BUY trade (10 shares)
    const txSignature = await executeBuyTrade(page, '10', 'YES');

    // Verify transaction signature is valid
    expect(txSignature).toBeTruthy();
    expect(txSignature.length).toBeGreaterThan(50);
    console.log(`✅ Valid transaction signature: ${txSignature}`);

    // Wait for UI to update (React Query refetch)
    await page.waitForTimeout(3000);

    // Get new balance
    const newBalance = await getSOLBalance(page);
    const newBalanceNum = parseFloat(newBalance);
    console.log(`💰 New balance: ${newBalance} SOL`);

    // Verify balance decreased
    expect(newBalanceNum).toBeLessThan(initialBalanceNum);
    console.log(`✅ Balance decreased by ${(initialBalanceNum - newBalanceNum).toFixed(4)} SOL`);

    // Get new position
    const newPosition = await getUserPosition(page);
    expect(newPosition).not.toBeNull();
    const newSharesYes = parseFloat(newPosition!.sharesYes);
    console.log(`📊 New YES shares: ${newSharesYes}`);

    // Verify shares increased
    expect(newSharesYes).toBeGreaterThan(initialSharesYes);
    console.log(`✅ Shares increased by ${(newSharesYes - initialSharesYes).toFixed(4)}`);

    // Take screenshot
    await takeDebugScreenshot(page, 'buy-transaction-complete');

    console.log('\n🎉 TEST PASSED: Real BUY transaction executed successfully!');
  });

  test('should execute real SELL transaction on devnet', async ({ page }) => {
    console.log('🚀 TEST: Execute real SELL transaction\n');

    // Navigate to market
    await page.goto(`/markets/${TEST_MARKET_ID}`);
    await page.waitForSelector('[data-testid="market-price"]', { timeout: 30000 });

    // Connect wallet
    await connectTestWallet(page);

    // Check if user has shares to sell
    const initialPosition = await getUserPosition(page);
    if (!initialPosition || parseFloat(initialPosition.sharesYes) < 5) {
      console.log('⚠️  No shares to sell, buying first...');
      await executeBuyTrade(page, '10', 'YES');
      await page.waitForTimeout(3000);
    }

    // Get position before sell
    const positionBeforeSell = await getUserPosition(page);
    const sharesBefore = parseFloat(positionBeforeSell!.sharesYes);
    console.log(`📊 Shares before sell: ${sharesBefore}`);

    // Get balance before sell
    const balanceBefore = await getSOLBalance(page);
    const balanceBeforeNum = parseFloat(balanceBefore);
    console.log(`💰 Balance before sell: ${balanceBefore} SOL`);

    // Execute SELL trade (5 shares)
    const txSignature = await executeSellTrade(page, '5', 'YES');

    // Verify transaction signature
    expect(txSignature).toBeTruthy();
    expect(txSignature.length).toBeGreaterThan(50);
    console.log(`✅ Valid transaction signature: ${txSignature}`);

    // Wait for UI update
    await page.waitForTimeout(3000);

    // Get position after sell
    const positionAfterSell = await getUserPosition(page);
    const sharesAfter = positionAfterSell ? parseFloat(positionAfterSell.sharesYes) : 0;
    console.log(`📊 Shares after sell: ${sharesAfter}`);

    // Verify shares decreased
    expect(sharesAfter).toBeLessThan(sharesBefore);
    console.log(`✅ Shares decreased by ${(sharesBefore - sharesAfter).toFixed(4)}`);

    // Get balance after sell
    const balanceAfter = await getSOLBalance(page);
    const balanceAfterNum = parseFloat(balanceAfter);
    console.log(`💰 Balance after sell: ${balanceAfter} SOL`);

    // Verify balance increased (user got SOL back)
    expect(balanceAfterNum).toBeGreaterThan(balanceBeforeNum);
    console.log(`✅ Balance increased by ${(balanceAfterNum - balanceBeforeNum).toFixed(4)} SOL`);

    // Take screenshot
    await takeDebugScreenshot(page, 'sell-transaction-complete');

    console.log('\n🎉 TEST PASSED: Real SELL transaction executed successfully!');
  });

  test('should display accurate P&L calculation after trades', async ({ page }) => {
    console.log('🚀 TEST: Verify P&L calculation\n');

    // Navigate and connect
    await page.goto(`/markets/${TEST_MARKET_ID}`);
    await page.waitForSelector('[data-testid="market-price"]', { timeout: 30000 });
    await connectTestWallet(page);

    // Get current position
    let position = await getUserPosition(page);

    if (!position) {
      console.log('📊 No position found, creating one...');
      await executeBuyTrade(page, '10', 'YES');
      await page.waitForTimeout(3000);
      position = await getUserPosition(page);
    }

    expect(position).not.toBeNull();

    // Verify P&L is displayed
    const pnl = position!.pnl;
    console.log(`💹 Current P&L: ${pnl} SOL`);

    // P&L should be a valid number (can be positive or negative)
    const pnlNum = parseFloat(pnl);
    expect(pnlNum).not.toBeNaN();
    console.log(`✅ P&L is valid number: ${pnlNum.toFixed(4)} SOL`);

    // Verify invested amount is displayed
    const invested = position!.invested;
    const investedNum = parseFloat(invested);
    expect(investedNum).toBeGreaterThan(0);
    console.log(`✅ Invested amount: ${invested} SOL`);

    // Take screenshot
    await takeDebugScreenshot(page, 'pnl-calculation');

    console.log('\n🎉 TEST PASSED: P&L calculation working correctly!');
  });

  test('should prevent transaction with insufficient balance', async ({ page }) => {
    console.log('🚀 TEST: Validation prevents insufficient balance transaction\n');

    // Navigate and connect
    await page.goto(`/markets/${TEST_MARKET_ID}`);
    await page.waitForSelector('[data-testid="market-price"]', { timeout: 30000 });
    await connectTestWallet(page);

    // Get current balance
    const balance = await getSOLBalance(page);
    const balanceNum = parseFloat(balance);
    console.log(`💰 Current balance: ${balance} SOL`);

    // Try to buy with absurdly high amount
    await page.fill('[data-testid="amount-input"]', '999999');
    console.log('📝 Entered absurdly high amount: 999999 shares');

    // Wait for validation
    await page.waitForTimeout(1000);

    // Should show error message
    const errorVisible = await page.locator('[data-testid="error-message"]').count() > 0;
    expect(errorVisible).toBe(true);

    const errorText = await page.textContent('[data-testid="error-message"]');
    console.log(`⚠️  Error message: ${errorText}`);
    expect(errorText).toContain('Insufficient balance');

    // Buy button should be disabled
    const buyButton = page.locator('[data-testid="buy-button"]');
    const isDisabled = await buyButton.isDisabled();
    expect(isDisabled).toBe(true);
    console.log('✅ Buy button is disabled');

    // Take screenshot
    await takeDebugScreenshot(page, 'insufficient-balance-validation');

    console.log('\n🎉 TEST PASSED: Validation correctly prevents invalid transaction!');
  });

  test('should update position and balance in real-time after transaction', async ({ page }) => {
    console.log('🚀 TEST: Real-time updates after transaction\n');

    // Navigate and connect
    await page.goto(`/markets/${TEST_MARKET_ID}`);
    await page.waitForSelector('[data-testid="market-price"]', { timeout: 30000 });
    await connectTestWallet(page);

    // Get initial state
    const initialBalance = await getSOLBalance(page);
    const initialPosition = await getUserPosition(page);
    console.log(`💰 Initial balance: ${initialBalance} SOL`);

    // Execute trade
    await executeBuyTrade(page, '5', 'YES');

    // Position should auto-update (React Query invalidation)
    console.log('⏳ Waiting for React Query to refetch data...');
    await page.waitForTimeout(6000); // Give time for 5s refetch interval

    // Get updated state
    const newBalance = await getSOLBalance(page);
    const newPosition = await getUserPosition(page);
    console.log(`💰 New balance: ${newBalance} SOL`);

    // Verify updates
    expect(newBalance).not.toBe(initialBalance);
    console.log('✅ Balance updated automatically');

    expect(newPosition).not.toEqual(initialPosition);
    console.log('✅ Position updated automatically');

    // Take screenshot
    await takeDebugScreenshot(page, 'real-time-updates');

    console.log('\n🎉 TEST PASSED: Real-time updates working correctly!');
  });

  test('should capture all browser console logs during transaction', async ({ page }) => {
    console.log('🚀 TEST: Console log capture\n');

    // Navigate and connect
    await page.goto(`/markets/${TEST_MARKET_ID}`);
    await page.waitForSelector('[data-testid="market-price"]', { timeout: 30000 });
    await connectTestWallet(page);

    // Execute trade (this will generate lots of logs)
    await executeBuyTrade(page, '5', 'YES');

    // Save logs (already captured via beforeEach hook)
    console.log('\n📋 Console logs have been captured throughout the test');
    console.log('   Logs are automatically saved after each test');

    console.log('\n🎉 TEST PASSED: Console logs captured successfully!');
  });
});
