/**
 * Wallet Setup Helpers for Real Blockchain E2E Testing
 *
 * Provides utilities for:
 * - Connecting test wallet to the application
 * - Capturing all browser console logs
 * - Managing transaction signatures
 * - Taking screenshots and videos
 */

import { Page, ConsoleMessage } from '@playwright/test';
import { Keypair, PublicKey } from '@solana/web3.js';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Console log capture for debugging
 */
export interface CapturedLog {
  type: string;
  text: string;
  timestamp: Date;
  location?: string;
}

const capturedLogs: CapturedLog[] = [];

/**
 * Set up comprehensive console log capture
 * Captures all browser console messages for debugging
 */
export async function captureConsoleLogs(page: Page): Promise<void> {
  console.log('📋 Setting up console log capture...');

  // Capture console messages
  page.on('console', (msg: ConsoleMessage) => {
    const log: CapturedLog = {
      type: msg.type(),
      text: msg.text(),
      timestamp: new Date(),
      location: msg.location().url,
    };

    capturedLogs.push(log);

    // Print to test console with color coding
    const prefix = getLogPrefix(msg.type());
    console.log(`${prefix} ${msg.text()}`);
  });

  // Capture page errors
  page.on('pageerror', (error) => {
    const log: CapturedLog = {
      type: 'pageerror',
      text: error.message,
      timestamp: new Date(),
    };

    capturedLogs.push(log);
    console.error(`[PAGE ERROR] ${error.message}`);
    console.error(error.stack);
  });

  // Capture network failures
  page.on('requestfailed', (request) => {
    const log: CapturedLog = {
      type: 'requestfailed',
      text: `${request.method()} ${request.url()} - ${request.failure()?.errorText}`,
      timestamp: new Date(),
    };

    capturedLogs.push(log);
    console.error(`[NETWORK FAILED] ${request.method()} ${request.url()}`);
    console.error(`   Reason: ${request.failure()?.errorText}`);
  });

  // Capture dialog boxes (alerts, confirms, prompts)
  page.on('dialog', async (dialog) => {
    console.log(`[DIALOG ${dialog.type().toUpperCase()}] ${dialog.message()}`);
    await dialog.accept(); // Auto-accept all dialogs
  });

  console.log('✅ Console log capture active');
}

/**
 * Get color-coded prefix for log type
 */
function getLogPrefix(type: string): string {
  switch (type) {
    case 'error':
      return '[BROWSER ERROR]';
    case 'warning':
      return '[BROWSER WARN ]';
    case 'info':
      return '[BROWSER INFO ]';
    case 'log':
      return '[BROWSER LOG  ]';
    case 'debug':
      return '[BROWSER DEBUG]';
    default:
      return `[BROWSER ${type.toUpperCase()}]`;
  }
}

/**
 * Get all captured logs since the start of the test
 */
export function getCapturedLogs(): CapturedLog[] {
  return [...capturedLogs];
}

/**
 * Clear captured logs (useful between tests)
 */
export function clearCapturedLogs(): void {
  capturedLogs.length = 0;
}

/**
 * Save captured logs to file
 */
export async function saveCapturedLogs(testName: string): Promise<void> {
  const logsDir = path.resolve(__dirname, '../../../test-results/console-logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  const filename = `${testName.replace(/[^a-z0-9]/gi, '-')}-${Date.now()}.json`;
  const filepath = path.join(logsDir, filename);

  fs.writeFileSync(filepath, JSON.stringify(capturedLogs, null, 2));
  console.log(`📝 Console logs saved to: ${filepath}`);
}

/**
 * Load test wallet from environment
 */
export function getTestWallet(): Keypair {
  const privateKeyString = process.env.TEST_WALLET_PRIVATE_KEY;
  if (!privateKeyString) {
    throw new Error('TEST_WALLET_PRIVATE_KEY not set in .env.test');
  }

  try {
    const privateKeyArray = JSON.parse(privateKeyString);
    return Keypair.fromSecretKey(new Uint8Array(privateKeyArray));
  } catch (error) {
    throw new Error(`Failed to parse test wallet private key: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Get test wallet public key
 */
export function getTestWalletPublicKey(): PublicKey {
  const publicKeyString = process.env.TEST_WALLET_PUBLIC_KEY;
  if (!publicKeyString) {
    throw new Error('TEST_WALLET_PUBLIC_KEY not set in .env.test');
  }

  try {
    return new PublicKey(publicKeyString);
  } catch (error) {
    throw new Error(`Invalid test wallet public key: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Connect wallet to the application
 * This simulates a user connecting their Phantom wallet
 */
export async function connectTestWallet(page: Page): Promise<void> {
  console.log('\n🔌 Connecting test wallet...');
  console.log(`   Wallet: ${getTestWalletPublicKey().toBase58()}`);

  // Click "Connect Wallet" button
  await page.click('button:has-text("Connect Wallet")', { timeout: 10000 });
  console.log('✅ Clicked "Connect Wallet" button');

  // Wait for wallet selector modal
  await page.waitForSelector('[data-testid="wallet-adapter-modal"]', { timeout: 5000 });
  console.log('✅ Wallet selector modal opened');

  // For real blockchain testing, we'll use Phantom wallet
  // In a real setup, you would need to install Phantom extension and automate it
  // For now, we'll click the first available wallet option
  await page.click('button:has-text("Phantom")', { timeout: 5000 });
  console.log('✅ Selected Phantom wallet');

  // Wait for connection to complete
  await page.waitForSelector('[data-testid="wallet-connected"]', { timeout: 30000 });
  console.log('✅ Wallet connected successfully!');

  // Verify the connected wallet address
  const connectedAddress = await page.textContent('[data-testid="wallet-address"]');
  console.log(`   Connected address: ${connectedAddress}`);
}

/**
 * Wait for transaction confirmation with progress logging
 */
export async function waitForTransactionConfirmation(
  page: Page,
  actionDescription: string,
  timeout: number = 60000
): Promise<string> {
  console.log(`\n⏳ Waiting for transaction: ${actionDescription}`);
  console.log('   This may take 10-20 seconds on devnet...');

  const startTime = Date.now();
  let lastLog = startTime;

  // Progress indicator
  const progressInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    console.log(`   ⏱️  ${elapsed}s elapsed...`);
  }, 5000);

  try {
    // Wait for success message
    await page.waitForSelector('[data-testid="transaction-success"]', { timeout });
    clearInterval(progressInterval);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`✅ Transaction confirmed in ${elapsed}s`);

    // Get transaction signature
    const txSignature = await page.textContent('[data-testid="tx-signature"]');
    if (txSignature) {
      console.log(`📝 Transaction signature: ${txSignature}`);
      console.log(`🔍 View on Solscan: https://solscan.io/tx/${txSignature}?cluster=devnet`);
      return txSignature;
    }

    return '';
  } catch (error) {
    clearInterval(progressInterval);
    console.error('❌ Transaction confirmation timeout or failed');
    throw error;
  }
}

/**
 * Take a labeled screenshot for debugging
 * @param page - Playwright page object
 * @param label - Description of what screenshot captures
 * @param force - If true, always take screenshot. If false, only on test failure
 */
export async function takeDebugScreenshot(
  page: Page,
  label: string,
  force: boolean = false
): Promise<void> {
  // Only take screenshot if explicitly forced (for important actions)
  // Playwright automatically captures screenshots on test failures
  if (!force) {
    console.log(`📸 Screenshot skipped (not forced): ${label}`);
    return;
  }

  const screenshotsDir = path.resolve(__dirname, '../../../test-screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  const filename = `${label.replace(/[^a-z0-9]/gi, '-')}-${Date.now()}.png`;
  const filepath = path.join(screenshotsDir, filename);

  await page.screenshot({ path: filepath, fullPage: true });
  console.log(`📸 Screenshot saved: ${filepath}`);
}

/**
 * Get market data from the page
 */
export async function getMarketData(page: Page): Promise<{
  price: string;
  liquidity: string;
  volume: string;
}> {
  console.log('📊 Fetching market data from page...');

  const price = await page.textContent('[data-testid="market-price"]') || '0';
  const liquidity = await page.textContent('[data-testid="market-liquidity"]') || '0';
  const volume = await page.textContent('[data-testid="market-volume"]') || '0';

  console.log(`   Price: ${price}`);
  console.log(`   Liquidity: ${liquidity}`);
  console.log(`   Volume: ${volume}`);

  return { price, liquidity, volume };
}

/**
 * Get user position from the page
 */
export async function getUserPosition(page: Page): Promise<{
  sharesYes: string;
  sharesNo: string;
  invested: string;
  pnl: string;
} | null> {
  console.log('📈 Fetching user position from page...');

  // Check if position exists
  const hasPosition = await page.locator('[data-testid="user-position"]').count() > 0;
  if (!hasPosition) {
    console.log('   No position found');
    return null;
  }

  const sharesYes = await page.textContent('[data-testid="position-shares-yes"]') || '0';
  const sharesNo = await page.textContent('[data-testid="position-shares-no"]') || '0';
  const invested = await page.textContent('[data-testid="position-invested"]') || '0';
  const pnl = await page.textContent('[data-testid="position-pnl"]') || '0';

  console.log(`   YES shares: ${sharesYes}`);
  console.log(`   NO shares: ${sharesNo}`);
  console.log(`   Invested: ${invested} SOL`);
  console.log(`   P&L: ${pnl} SOL`);

  return { sharesYes, sharesNo, invested, pnl };
}

/**
 * Get SOL balance from the page
 */
export async function getSOLBalance(page: Page): Promise<string> {
  console.log('💰 Fetching SOL balance from page...');
  const balance = await page.textContent('[data-testid="sol-balance"]') || '0';
  console.log(`   Balance: ${balance} SOL`);
  return balance;
}

/**
 * Execute a buy trade with real transaction
 */
export async function executeBuyTrade(
  page: Page,
  amount: string,
  outcome: 'YES' | 'NO' = 'YES'
): Promise<string> {
  console.log(`\n🛒 Executing BUY trade: ${amount} ${outcome} shares`);

  // Select outcome tab
  if (outcome === 'NO') {
    await page.click('[data-testid="no-tab"]');
    console.log('✅ Selected NO outcome');
  } else {
    await page.click('[data-testid="yes-tab"]');
    console.log('✅ Selected YES outcome');
  }

  // Enter amount
  await page.fill('[data-testid="amount-input"]', amount);
  console.log(`✅ Entered amount: ${amount}`);

  // Get estimated cost
  const cost = await page.textContent('[data-testid="estimated-cost"]');
  console.log(`💵 Estimated cost: ${cost}`);

  // Click buy button
  await page.click('[data-testid="buy-button"]');
  console.log('✅ Clicked BUY button');

  // Wait for transaction confirmation
  const txSignature = await waitForTransactionConfirmation(page, `Buy ${amount} ${outcome} shares`);

  console.log('🎉 Buy trade completed successfully!');
  return txSignature;
}

/**
 * Execute a sell trade with real transaction
 */
export async function executeSellTrade(
  page: Page,
  amount: string,
  outcome: 'YES' | 'NO' = 'YES'
): Promise<string> {
  console.log(`\n💸 Executing SELL trade: ${amount} ${outcome} shares`);

  // Select outcome tab
  if (outcome === 'NO') {
    await page.click('[data-testid="no-tab"]');
    console.log('✅ Selected NO outcome');
  } else {
    await page.click('[data-testid="yes-tab"]');
    console.log('✅ Selected YES outcome');
  }

  // Click sell tab
  await page.click('[data-testid="sell-tab"]');
  console.log('✅ Selected SELL tab');

  // Enter amount
  await page.fill('[data-testid="amount-input"]', amount);
  console.log(`✅ Entered amount: ${amount}`);

  // Get estimated proceeds
  const proceeds = await page.textContent('[data-testid="estimated-proceeds"]');
  console.log(`💵 Estimated proceeds: ${proceeds}`);

  // Click sell button
  await page.click('[data-testid="sell-button"]');
  console.log('✅ Clicked SELL button');

  // Wait for transaction confirmation
  const txSignature = await waitForTransactionConfirmation(page, `Sell ${amount} ${outcome} shares`);

  console.log('🎉 Sell trade completed successfully!');
  return txSignature;
}

/**
 * Enhanced error with full context for debugging
 */
export interface EnhancedError {
  message: string;
  code?: string;
  stack?: string;
  context: {
    operation: string;
    userInput?: any;
    systemState?: any;
    timestamp: string;
    testName?: string;
  };
  recovery?: {
    suggested: string;
    automatic: boolean;
  };
}

/**
 * Capture enhanced error with full context
 *
 * @param error - Original error object
 * @param context - Additional context about the operation
 */
export function captureEnhancedError(
  error: Error,
  context: {
    operation: string;
    userInput?: any;
    systemState?: any;
    testName?: string;
  }
): EnhancedError {
  const enhancedError: EnhancedError = {
    message: error.message,
    code: (error as any).code,
    stack: error.stack,
    context: {
      ...context,
      timestamp: new Date().toISOString(),
    },
    recovery: {
      suggested: inferRecoverySuggestion(error),
      automatic: false,
    },
  };

  console.error('\n❌ ENHANCED ERROR:');
  console.error(`   Message: ${enhancedError.message}`);
  console.error(`   Operation: ${context.operation}`);
  if (enhancedError.recovery) {
    console.error(`   Suggested Fix: ${enhancedError.recovery.suggested}`);
  }

  return enhancedError;
}

/**
 * Infer recovery suggestion based on error message
 */
function inferRecoverySuggestion(error: Error): string {
  const message = error.message.toLowerCase();

  if (message.includes('balance') || message.includes('insufficient funds')) {
    return 'Add more SOL to wallet (airdrop or transfer)';
  }

  if (message.includes('slippage')) {
    return 'Increase slippage tolerance in transaction settings';
  }

  if (message.includes('timeout') || message.includes('timed out')) {
    return 'Retry operation - network may be congested';
  }

  if (message.includes('wallet') || message.includes('not connected')) {
    return 'Reconnect wallet and try again';
  }

  if (message.includes('signature') || message.includes('rejected')) {
    return 'User rejected transaction - approve in wallet';
  }

  if (message.includes('network') || message.includes('fetch')) {
    return 'Check network connection and RPC endpoint';
  }

  if (message.includes('account') || message.includes('not found')) {
    return 'Ensure account is initialized and exists on-chain';
  }

  if (message.includes('blockhash') || message.includes('recent')) {
    return 'Fetch fresh blockhash and retry transaction';
  }

  return 'Retry operation or check console logs for details';
}
