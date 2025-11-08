/**
 * Global setup for Playwright E2E tests
 * Loads test environment variables and validates test wallet configuration
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

// Load .env.test file
const envTestPath = path.resolve(__dirname, '../../.env.test');

if (!fs.existsSync(envTestPath)) {
  console.error('❌ ERROR: .env.test file not found!');
  console.error('Please run: ./scripts/setup-test-wallet.sh');
  process.exit(1);
}

dotenv.config({ path: envTestPath });

export default async function globalSetup() {
  console.log('\n🚀 ZMART E2E Test Global Setup');
  console.log('═══════════════════════════════════════════════════\n');

  // Validate required environment variables
  const requiredEnvVars = [
    'TEST_WALLET_PRIVATE_KEY',
    'TEST_WALLET_PUBLIC_KEY',
    'SOLANA_CLUSTER',
    'SOLANA_RPC_URL',
    'ZMART_PROGRAM_ID',
    'TEST_MARKET_ID',
  ];

  const missingVars: string[] = [];
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      missingVars.push(envVar);
    }
  }

  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables in .env.test:');
    missingVars.forEach(v => console.error(`   - ${v}`));
    console.error('\nPlease run: ./scripts/setup-test-wallet.sh');
    process.exit(1);
  }

  console.log('✅ Environment variables loaded');
  console.log(`   Cluster: ${process.env.SOLANA_CLUSTER}`);
  console.log(`   RPC URL: ${process.env.SOLANA_RPC_URL}`);
  console.log(`   Program ID: ${process.env.ZMART_PROGRAM_ID}`);
  console.log(`   Test Market: ${process.env.TEST_MARKET_ID}`);
  console.log('');

  // Validate test wallet has sufficient balance
  try {
    const connection = new Connection(process.env.SOLANA_RPC_URL!, 'confirmed');
    const testWalletPubkey = new PublicKey(process.env.TEST_WALLET_PUBLIC_KEY!);

    console.log('💰 Checking test wallet balance...');
    console.log(`   Public Key: ${testWalletPubkey.toBase58()}`);

    const balance = await connection.getBalance(testWalletPubkey);
    const balanceSOL = balance / LAMPORTS_PER_SOL;

    console.log(`   Balance: ${balanceSOL.toFixed(4)} SOL`);

    if (balanceSOL < 0.1) {
      console.error('\n❌ ERROR: Insufficient devnet SOL balance!');
      console.error(`   Current: ${balanceSOL.toFixed(4)} SOL`);
      console.error(`   Required: At least 0.1 SOL`);
      console.error(`   Recommended: 10+ SOL for comprehensive testing`);
      console.error('\nPlease fund your test wallet:');
      console.error(`   1. Visit https://faucet.solana.com`);
      console.error(`   2. Or run: solana airdrop 5 ${testWalletPubkey.toBase58()} --url devnet`);
      process.exit(1);
    } else if (balanceSOL < 1) {
      console.warn('\n⚠️  WARNING: Low devnet SOL balance!');
      console.warn(`   Current: ${balanceSOL.toFixed(4)} SOL`);
      console.warn(`   Recommended: 10+ SOL for comprehensive testing`);
      console.warn('   Some tests may fail due to insufficient balance.\n');
    } else {
      console.log('✅ Sufficient balance for testing\n');
    }
  } catch (error) {
    console.error('\n❌ ERROR: Failed to check wallet balance');
    console.error(`   ${error instanceof Error ? error.message : String(error)}`);
    console.error('\nPlease check:');
    console.error('   1. RPC URL is correct and accessible');
    console.error('   2. Test wallet public key is valid');
    console.error('   3. Network connection is stable');
    process.exit(1);
  }

  // Validate test market exists
  try {
    const connection = new Connection(process.env.SOLANA_RPC_URL!, 'confirmed');
    const testMarketPubkey = new PublicKey(process.env.TEST_MARKET_ID!);

    console.log('🏪 Validating test market...');
    console.log(`   Market ID: ${testMarketPubkey.toBase58()}`);

    const accountInfo = await connection.getAccountInfo(testMarketPubkey);

    if (!accountInfo) {
      console.error('\n❌ ERROR: Test market account not found!');
      console.error(`   Market ID: ${testMarketPubkey.toBase58()}`);
      console.error('\nPlease:');
      console.error('   1. Create a test market on devnet');
      console.error('   2. Update TEST_MARKET_ID in .env.test');
      process.exit(1);
    }

    console.log('✅ Test market exists on-chain\n');
  } catch (error) {
    console.error('\n❌ ERROR: Failed to validate test market');
    console.error(`   ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }

  console.log('═══════════════════════════════════════════════════');
  console.log('✅ Global setup complete - Ready to run tests!');
  console.log('═══════════════════════════════════════════════════\n');
}
