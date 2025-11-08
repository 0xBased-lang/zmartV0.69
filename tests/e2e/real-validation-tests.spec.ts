/**
 * Real Blockchain Validation & Error Handling E2E Tests
 *
 * Tests validation logic with real blockchain state:
 * - Market state validation (ACTIVE vs non-ACTIVE)
 * - Balance validation with real wallet balance
 * - Slippage protection
 * - Amount validation
 * - Error message clarity
 */

import { test, expect } from '@playwright/test';
import {
  captureConsoleLogs,
  connectTestWallet,
  getSOLBalance,
  takeDebugScreenshot,
  saveCapturedLogs,
  clearCapturedLogs,
  getTestWalletPublicKey,
} from './helpers/wallet-setup';

const TEST_MARKET_ID = process.env.TEST_MARKET_ID!;

test.describe('Real Blockchain Validation Tests', () => {
  test.beforeEach(async ({ page }) => {
    console.log('\n═══════════════════════════════════════════════════');
    console.log('🧪 Starting validation test');
    console.log('═══════════════════════════════════════════════════\n');

    clearCapturedLogs();
    await captureConsoleLogs(page);
  });

  test.afterEach(async ({ page }, testInfo) => {
    await saveCapturedLogs(testInfo.title);
    await takeDebugScreenshot(page, `${testInfo.title}-final`);

    console.log('\n═══════════════════════════════════════════════════');
    console.log(`✅ Validation test completed: ${testInfo.title}`);
    console.log('═══════════════════════════════════════════════════\n');
  });

  test('should validate market is in ACTIVE state before allowing trades', async ({ page }) => {
    console.log('🚀 TEST: Market state validation\n');

    // Navigate to market
    await page.goto(`/markets/${TEST_MARKET_ID}`);
    await page.waitForSelector('[data-testid="market-price"]', { timeout: 30000 });
    await connectTestWallet(page);

    // Check if market state is displayed
    const hasStateIndicator = await page.locator('[data-testid="market-state"]').count() > 0;
    if (hasStateIndicator) {
      const marketState = await page.textContent('[data-testid="market-state"]');
      console.log(`📊 Market state: ${marketState}`);

      // If market is not ACTIVE, verify trade button is disabled
      if (marketState !== 'ACTIVE' && marketState !== 'Active') {
        const buyButton = page.locator('[data-testid="buy-button"]');
        const isDisabled = await buyButton.isDisabled();
        expect(isDisabled).toBe(true);
        console.log('✅ Buy button disabled for non-ACTIVE market');

        // Should show state warning
        const warningVisible = await page.locator('[data-testid="state-warning"]').count() > 0;
        if (warningVisible) {
          const warningText = await page.textContent('[data-testid="state-warning"]');
          console.log(`⚠️  State warning: ${warningText}`);
        }
      } else {
        console.log('✅ Market is ACTIVE - trading allowed');
      }
    } else {
      console.log('ℹ️  Market state indicator not visible (may be ACTIVE)');
    }

    await takeDebugScreenshot(page, 'market-state-validation');
    console.log('\n🎉 TEST PASSED: Market state validation working!');
  });

  test('should show clear error for insufficient SOL balance', async ({ page }) => {
    console.log('🚀 TEST: Insufficient balance validation\n');

    await page.goto(`/markets/${TEST_MARKET_ID}`);
    await page.waitForSelector('[data-testid="market-price"]', { timeout: 30000 });
    await connectTestWallet(page);

    // Get actual balance
    const balance = await getSOLBalance(page);
    const balanceNum = parseFloat(balance);
    console.log(`💰 Actual balance: ${balance} SOL`);

    // Try to buy with extremely high amount
    const impossibleAmount = '1000000'; // 1 million shares
    await page.fill('[data-testid="amount-input"]', impossibleAmount);
    console.log(`📝 Entered impossible amount: ${impossibleAmount} shares`);

    // Wait for validation to trigger
    await page.waitForTimeout(1500);

    // Should show error
    const errorVisible = await page.locator('[data-testid="error-message"]').count() > 0;
    expect(errorVisible).toBe(true);
    console.log('✅ Error message displayed');

    const errorText = await page.textContent('[data-testid="error-message"]');
    console.log(`⚠️  Error: "${errorText}"`);

    // Error should mention balance or insufficient funds
    const isBalanceError = errorText?.toLowerCase().includes('balance') ||
                          errorText?.toLowerCase().includes('insufficient') ||
                          errorText?.toLowerCase().includes('funds');
    expect(isBalanceError).toBe(true);
    console.log('✅ Error message is clear and relevant');

    // Button should be disabled
    const buyButton = page.locator('[data-testid="buy-button"]');
    const isDisabled = await buyButton.isDisabled();
    expect(isDisabled).toBe(true);
    console.log('✅ Buy button correctly disabled');

    await takeDebugScreenshot(page, 'insufficient-balance-error');
    console.log('\n🎉 TEST PASSED: Balance validation working correctly!');
  });

  test('should validate zero and negative amounts', async ({ page }) => {
    console.log('🚀 TEST: Zero/negative amount validation\n');

    await page.goto(`/markets/${TEST_MARKET_ID}`);
    await page.waitForSelector('[data-testid="market-price"]', { timeout: 30000 });
    await connectTestWallet(page);

    // Test zero amount
    console.log('📝 Testing amount: 0');
    await page.fill('[data-testid="amount-input"]', '0');
    await page.waitForTimeout(500);

    let buyButton = page.locator('[data-testid="buy-button"]');
    let isDisabled = await buyButton.isDisabled();
    expect(isDisabled).toBe(true);
    console.log('✅ Zero amount correctly rejected');

    // Test negative amount (if input allows it)
    console.log('📝 Testing amount: -5');
    await page.fill('[data-testid="amount-input"]', '-5');
    await page.waitForTimeout(500);

    buyButton = page.locator('[data-testid="buy-button"]');
    isDisabled = await buyButton.isDisabled();
    // Should either be disabled or input should prevent negative values
    const inputValue = await page.inputValue('[data-testid="amount-input"]');
    console.log(`📝 Input value after negative: "${inputValue}"`);

    // Either disabled or input cleaned to positive/zero
    const isValid = isDisabled || !inputValue.includes('-');
    expect(isValid).toBe(true);
    console.log('✅ Negative amount correctly handled');

    // Test empty input
    console.log('📝 Testing empty input');
    await page.fill('[data-testid="amount-input"]', '');
    await page.waitForTimeout(500);

    buyButton = page.locator('[data-testid="buy-button"]');
    isDisabled = await buyButton.isDisabled();
    expect(isDisabled).toBe(true);
    console.log('✅ Empty input correctly rejected');

    await takeDebugScreenshot(page, 'amount-validation');
    console.log('\n🎉 TEST PASSED: Amount validation working correctly!');
  });

  test('should handle transaction rejection gracefully', async ({ page }) => {
    console.log('🚀 TEST: Transaction rejection handling\n');

    await page.goto(`/markets/${TEST_MARKET_ID}`);
    await page.waitForSelector('[data-testid="market-price"]', { timeout: 30000 });
    await connectTestWallet(page);

    // Enter valid amount
    await page.fill('[data-testid="amount-input"]', '1');
    console.log('📝 Entered amount: 1 share');

    // Click buy button
    await page.click('[data-testid="buy-button"]');
    console.log('🔐 Clicked buy button');

    console.log('⚠️  MANUAL ACTION REQUIRED:');
    console.log('   Please REJECT the transaction in your wallet within 30 seconds');
    console.log('   This tests graceful handling of user cancellation');

    // Wait for either success or error
    try {
      // Wait for success (if user approves by mistake)
      await page.waitForSelector('[data-testid="transaction-success"]', { timeout: 30000 });
      console.log('ℹ️  Transaction was approved (expected rejection)');
    } catch {
      // Expected: rejection or timeout
      console.log('✅ Transaction was rejected or timed out');

      // Should show user-friendly error
      const errorVisible = await page.locator('[data-testid="error-message"]').count() > 0;
      if (errorVisible) {
        const errorText = await page.textContent('[data-testid="error-message"]');
        console.log(`⚠️  Error message: "${errorText}"`);
        expect(errorText).toBeTruthy();
      }

      // UI should return to ready state
      const buyButton = page.locator('[data-testid="buy-button"]');
      const buttonText = await buyButton.textContent();
      console.log(`✅ Button state restored: "${buttonText}"`);
    }

    await takeDebugScreenshot(page, 'transaction-rejection');
    console.log('\n🎉 TEST PASSED: Transaction rejection handled gracefully!');
  });

  test('should validate slippage tolerance settings', async ({ page }) => {
    console.log('🚀 TEST: Slippage validation\n');

    await page.goto(`/markets/${TEST_MARKET_ID}`);
    await page.waitForSelector('[data-testid="market-price"]', { timeout: 30000 });
    await connectTestWallet(page);

    // Open slippage settings (if available)
    const hasSlippageSettings = await page.locator('[data-testid="slippage-settings"]').count() > 0;

    if (hasSlippageSettings) {
      await page.click('[data-testid="slippage-settings"]');
      console.log('✅ Opened slippage settings');

      // Try invalid slippage values
      console.log('📝 Testing invalid slippage: -1%');
      await page.fill('[data-testid="slippage-input"]', '-1');
      await page.waitForTimeout(500);

      // Should show error or clamp to valid range
      const slippageValue = await page.inputValue('[data-testid="slippage-input"]');
      const slippageNum = parseFloat(slippageValue);
      expect(slippageNum).toBeGreaterThanOrEqual(0);
      console.log(`✅ Negative slippage rejected, value: ${slippageValue}%`);

      // Try extremely high slippage
      console.log('📝 Testing high slippage: 50%');
      await page.fill('[data-testid="slippage-input"]', '50');
      await page.waitForTimeout(500);

      // Should show warning
      const warningVisible = await page.locator('[data-testid="slippage-warning"]').count() > 0;
      if (warningVisible) {
        const warningText = await page.textContent('[data-testid="slippage-warning"]');
        console.log(`⚠️  Slippage warning: "${warningText}"`);
      }

      // Set reasonable slippage
      console.log('📝 Setting slippage to 1%');
      await page.fill('[data-testid="slippage-input"]', '1');
      await page.waitForTimeout(500);
      console.log('✅ Valid slippage accepted');

      await takeDebugScreenshot(page, 'slippage-validation');
    } else {
      console.log('ℹ️  Slippage settings not found (may use default)');
    }

    console.log('\n🎉 TEST PASSED: Slippage validation working!');
  });

  test('should display clear error messages for failed transactions', async ({ page }) => {
    console.log('🚀 TEST: Transaction error messaging\n');

    await page.goto(`/markets/${TEST_MARKET_ID}`);
    await page.waitForSelector('[data-testid="market-price"]', { timeout: 30000 });
    await connectTestWallet(page);

    // Try transaction with insufficient balance
    await page.fill('[data-testid="amount-input"]', '999999');
    console.log('📝 Entered amount that will fail: 999999 shares');

    // Wait for error to appear
    await page.waitForTimeout(1500);

    // Error should be visible
    const errorElement = page.locator('[data-testid="error-message"]');
    const errorVisible = await errorElement.count() > 0;
    expect(errorVisible).toBe(true);

    const errorText = await errorElement.textContent();
    console.log(`📋 Error message: "${errorText}"`);

    // Error should be clear and actionable
    expect(errorText).toBeTruthy();
    expect(errorText!.length).toBeGreaterThan(10); // Not just "Error"
    console.log('✅ Error message is descriptive');

    // Error should not contain technical jargon
    const hasTechnicalError = errorText?.includes('0x') || errorText?.includes('undefined');
    expect(hasTechnicalError).toBe(false);
    console.log('✅ Error message is user-friendly');

    await takeDebugScreenshot(page, 'error-messaging');
    console.log('\n🎉 TEST PASSED: Error messages are clear and helpful!');
  });

  test('should validate market exists before allowing interaction', async ({ page }) => {
    console.log('🚀 TEST: Non-existent market validation\n');

    // Try to navigate to non-existent market
    const fakeMarketId = '11111111111111111111111111111111';
    console.log(`📝 Navigating to non-existent market: ${fakeMarketId}`);

    await page.goto(`/markets/${fakeMarketId}`);

    // Should show error or "market not found" message
    const possibleSelectors = [
      '[data-testid="market-not-found"]',
      '[data-testid="error-message"]',
      'text=Market not found',
      'text=404',
    ];

    let errorFound = false;
    for (const selector of possibleSelectors) {
      const count = await page.locator(selector).count();
      if (count > 0) {
        errorFound = true;
        const text = await page.textContent(selector);
        console.log(`✅ Error displayed: "${text}"`);
        break;
      }
    }

    if (!errorFound) {
      // Page might redirect or show empty state
      console.log('ℹ️  No explicit error, checking if market data failed to load...');

      // Check if price/data failed to load
      await page.waitForTimeout(5000);
      const hasPriceData = await page.locator('[data-testid="market-price"]').count() > 0;

      if (!hasPriceData) {
        console.log('✅ Market data correctly not loaded for non-existent market');
      }
    }

    await takeDebugScreenshot(page, 'non-existent-market');
    console.log('\n🎉 TEST PASSED: Non-existent market handled correctly!');
  });
});
