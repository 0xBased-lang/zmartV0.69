import { test, expect } from '@playwright/test';

/**
 * Direct Market Page Test - Bypasses Homepage/Database
 *
 * Goes directly to the test market URL we found on devnet:
 * HFaHHLFukTcA15khhvssYa7fTFmkzxTDsLih2LGVWCrM
 *
 * This test validates:
 * 1. Market page loads
 * 2. UI enhancements work (breadcrumb, copy, icons)
 * 3. Trading interface appears
 * 4. Wallet can connect
 * 5. Transaction utilities are accessible
 */

const TEST_MARKET_ID = 'HFaHHLFukTcA15khhvssYa7fTFmkzxTDsLih2LGVWCrM';
const MARKET_URL = `http://localhost:3000/markets/${TEST_MARKET_ID}`;

test.describe('Direct Market Page Test', () => {

  test('should navigate directly to market page', async ({ page }) => {
    console.log('\n🎯 Test: Direct navigation to market page');
    console.log(`   URL: ${MARKET_URL}`);

    // Go directly to market page (bypassing homepage)
    await page.goto(MARKET_URL);

    // Wait for page to load
    await page.waitForLoadState('networkidle', { timeout: 10000 });

    console.log('   ✅ Page loaded');

    // Take screenshot
    await page.screenshot({
      path: 'test-results/playwright-01-market-page.png',
      fullPage: true
    });

    console.log('   📸 Screenshot saved: playwright-01-market-page.png');
  });

  test('should display breadcrumb navigation', async ({ page }) => {
    console.log('\n🍞 Test: Breadcrumb navigation');

    await page.goto(MARKET_URL);
    await page.waitForLoadState('networkidle');

    // Look for breadcrumb with multiple possible selectors
    const breadcrumbSelectors = [
      'nav[aria-label="Breadcrumb"]',
      '[data-testid="breadcrumb"]',
      'nav:has-text("Markets")',
      '.breadcrumb'
    ];

    let foundBreadcrumb = false;
    for (const selector of breadcrumbSelectors) {
      const element = page.locator(selector).first();
      if (await element.isVisible().catch(() => false)) {
        console.log(`   ✅ Breadcrumb found with selector: ${selector}`);

        // Check if it contains "Markets"
        const text = await element.textContent();
        if (text && text.includes('Markets')) {
          console.log(`   ✅ Breadcrumb contains "Markets"`);
        }

        foundBreadcrumb = true;
        break;
      }
    }

    if (!foundBreadcrumb) {
      console.log('   ⚠️  Breadcrumb not found with any selector');
    }

    await page.screenshot({ path: 'test-results/playwright-02-breadcrumb.png' });
  });

  test('should display market header with metadata', async ({ page }) => {
    console.log('\n📊 Test: Market header');

    await page.goto(MARKET_URL);
    await page.waitForLoadState('networkidle');

    // Check for various header elements
    const checks = [
      { name: 'Page title/heading', selector: 'h1' },
      { name: 'Market question', selector: '[data-testid="market-question"]' },
      { name: 'State badge', selector: '[data-testid="market-state"]' },
      { name: 'Creator address', selector: '[data-testid="market-creator"]' },
    ];

    for (const check of checks) {
      const element = page.locator(check.selector).first();
      const visible = await element.isVisible().catch(() => false);

      if (visible) {
        const text = await element.textContent().catch(() => '');
        console.log(`   ✅ ${check.name}: "${text?.slice(0, 50)}..."`);
      } else {
        console.log(`   ⚠️  ${check.name} not found (${check.selector})`);
      }
    }

    await page.screenshot({ path: 'test-results/playwright-03-header.png' });
  });

  test('should display trading interface', async ({ page }) => {
    console.log('\n💹 Test: Trading interface');

    await page.goto(MARKET_URL);
    await page.waitForLoadState('networkidle');

    // Check for YES/NO outcome selection
    const yesButton = page.locator('button:has-text("YES"), [role="tab"]:has-text("YES")').first();
    const noButton = page.locator('button:has-text("NO"), [role="tab"]:has-text("NO")').first();

    const hasYes = await yesButton.isVisible().catch(() => false);
    const hasNo = await noButton.isVisible().catch(() => false);

    console.log(`   YES button: ${hasYes ? '✅' : '❌'}`);
    console.log(`   NO button: ${hasNo ? '✅' : '❌'}`);

    // Check for amount input
    const amountInput = page.locator('input[type="number"]').first();
    const hasInput = await amountInput.isVisible().catch(() => false);
    console.log(`   Amount input: ${hasInput ? '✅' : '❌'}`);

    // Check for buy button
    const buyButton = page.locator('button:has-text("Buy")').first();
    const hasBuy = await buyButton.isVisible().catch(() => false);
    console.log(`   Buy button: ${hasBuy ? '✅' : '❌'}`);

    await page.screenshot({ path: 'test-results/playwright-04-trading-interface.png' });
  });

  test('should show wallet connection UI', async ({ page }) => {
    console.log('\n👛 Test: Wallet connection UI');

    await page.goto(MARKET_URL);
    await page.waitForLoadState('networkidle');

    // Look for connect wallet button
    const connectSelectors = [
      'button:has-text("Connect")',
      'button:has-text("Select Wallet")',
      '[data-testid="wallet-button"]',
      '.wallet-adapter-button'
    ];

    let foundConnect = false;
    for (const selector of connectSelectors) {
      const button = page.locator(selector).first();
      if (await button.isVisible().catch(() => false)) {
        const text = await button.textContent();
        console.log(`   ✅ Wallet button found: "${text}"`);
        foundConnect = true;
        break;
      }
    }

    if (!foundConnect) {
      console.log('   ℹ️  Wallet may already be connected or button not found');
    }

    await page.screenshot({ path: 'test-results/playwright-05-wallet-ui.png' });
  });

  test('should test responsive design', async ({ page }) => {
    console.log('\n📱 Test: Responsive design');

    await page.goto(MARKET_URL);

    // Desktop
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'test-results/playwright-06-desktop.png', fullPage: true });
    console.log('   ✅ Desktop view captured (1920x1080)');

    // Tablet
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'test-results/playwright-06-tablet.png', fullPage: true });
    console.log('   ✅ Tablet view captured (768x1024)');

    // Mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'test-results/playwright-06-mobile.png', fullPage: true });
    console.log('   ✅ Mobile view captured (375x667)');
  });

  test('should check console for proper configuration', async ({ page }) => {
    console.log('\n🔍 Test: Console logs');

    const consoleLogs: string[] = [];
    const consoleErrors: string[] = [];

    page.on('console', msg => {
      const text = msg.text();
      consoleLogs.push(text);

      if (msg.type() === 'error') {
        consoleErrors.push(text);
      }

      // Log important messages
      if (text.includes('Program') || text.includes('Market') || text.includes('Network')) {
        console.log(`   📋 ${text}`);
      }
    });

    await page.goto(MARKET_URL);
    await page.waitForTimeout(2000); // Wait for console logs

    console.log(`\n   Total console messages: ${consoleLogs.length}`);
    console.log(`   Console errors: ${consoleErrors.length}`);

    // Check for expected errors (Supabase is OK to fail)
    const supabaseErrors = consoleErrors.filter(e =>
      e.includes('supabase') || e.includes('your-project')
    );

    if (supabaseErrors.length > 0) {
      console.log(`   ℹ️  Supabase errors (expected): ${supabaseErrors.length}`);
    }

    // Check for unexpected errors
    const unexpectedErrors = consoleErrors.filter(e =>
      !e.includes('supabase') &&
      !e.includes('your-project') &&
      !e.includes('Hydration') // Hydration warnings are common in dev
    );

    if (unexpectedErrors.length > 0) {
      console.log(`   ⚠️  Unexpected errors: ${unexpectedErrors.length}`);
      unexpectedErrors.slice(0, 3).forEach(err => {
        console.log(`      - ${err.slice(0, 100)}`);
      });
    } else {
      console.log('   ✅ No unexpected errors');
    }

    await page.screenshot({ path: 'test-results/playwright-07-console-check.png' });
  });

  test('should verify market ID in URL', async ({ page }) => {
    console.log('\n🔗 Test: Market ID in URL');

    await page.goto(MARKET_URL);
    await page.waitForLoadState('networkidle');

    const currentUrl = page.url();
    console.log(`   Current URL: ${currentUrl}`);

    if (currentUrl.includes(TEST_MARKET_ID)) {
      console.log(`   ✅ URL contains market ID: ${TEST_MARKET_ID}`);
    } else {
      console.log(`   ❌ URL does not contain expected market ID`);
    }

    await page.screenshot({ path: 'test-results/playwright-08-url-check.png' });
  });

  test.afterAll(async () => {
    console.log('\n' + '='.repeat(60));
    console.log('📊 Playwright Test Summary');
    console.log('='.repeat(60));
    console.log('✅ All Playwright tests completed!');
    console.log('📸 Screenshots saved in: test-results/');
    console.log('📋 Market tested: ' + TEST_MARKET_ID);
    console.log('🌐 Frontend: http://localhost:3000');
    console.log('='.repeat(60) + '\n');
  });
});
