#!/usr/bin/env ts-node
/**
 * Test Wallet Farm Setup Script
 *
 * Generates 10 test wallets and funds them with devnet SOL
 * for comprehensive E2E testing including multi-user scenarios
 *
 * Usage: ts-node scripts/setup-test-wallet-farm.ts
 */

import { Keypair, Connection, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import * as fs from 'fs';
import * as path from 'path';

const RPC_URL = 'https://api.devnet.solana.com';
const connection = new Connection(RPC_URL, 'confirmed');

const NUM_WALLETS = 10;
const SOL_PER_WALLET = 5; // 5 SOL per wallet for testing

interface TestWallet {
  id: number;
  privateKey: number[];
  publicKey: string;
  balance?: number;
}

/**
 * Generate a single test wallet
 */
function generateWallet(id: number): TestWallet {
  const keypair = Keypair.generate();

  return {
    id,
    privateKey: Array.from(keypair.secretKey),
    publicKey: keypair.publicKey.toBase58(),
  };
}

/**
 * Request airdrop with retry logic
 */
async function requestAirdrop(publicKey: PublicKey, lamports: number, retries = 3): Promise<boolean> {
  for (let i = 0; i < retries; i++) {
    try {
      console.log(`      Requesting ${lamports / LAMPORTS_PER_SOL} SOL... (attempt ${i + 1}/${retries})`);

      const signature = await connection.requestAirdrop(publicKey, lamports);
      await connection.confirmTransaction(signature, 'confirmed');

      const balance = await connection.getBalance(publicKey);
      console.log(`      ✅ Airdrop successful! Balance: ${balance / LAMPORTS_PER_SOL} SOL`);

      return true;
    } catch (error) {
      console.error(`      ❌ Airdrop attempt ${i + 1} failed:`, error instanceof Error ? error.message : String(error));

      if (i < retries - 1) {
        console.log(`      ⏳ Waiting 5s before retry...`);
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
  }

  return false;
}

/**
 * Check balance of a wallet
 */
async function checkBalance(publicKey: PublicKey): Promise<number> {
  const balance = await connection.getBalance(publicKey);
  return balance / LAMPORTS_PER_SOL;
}

/**
 * Main execution
 */
async function main() {
  console.log('\n🏦 ZMART Test Wallet Farm Setup');
  console.log('================================\n');

  console.log(`📋 Configuration:`);
  console.log(`   Number of wallets: ${NUM_WALLETS}`);
  console.log(`   SOL per wallet: ${SOL_PER_WALLET}`);
  console.log(`   RPC URL: ${RPC_URL}\n`);

  // Step 1: Generate wallets
  console.log('🔑 Step 1: Generating wallets...\n');

  const wallets: TestWallet[] = [];
  for (let i = 0; i < NUM_WALLETS; i++) {
    const wallet = generateWallet(i + 1);
    wallets.push(wallet);
    console.log(`   Wallet ${i + 1}:`);
    console.log(`      Public Key: ${wallet.publicKey}`);
  }

  console.log(`\n✅ Generated ${wallets.length} wallets\n`);

  // Step 2: Fund wallets with airdrop
  console.log('💰 Step 2: Funding wallets with devnet SOL...\n');

  let successCount = 0;
  let failCount = 0;

  for (const wallet of wallets) {
    console.log(`   Funding Wallet ${wallet.id} (${wallet.publicKey})...`);

    const publicKey = new PublicKey(wallet.publicKey);
    const success = await requestAirdrop(publicKey, SOL_PER_WALLET * LAMPORTS_PER_SOL);

    if (success) {
      wallet.balance = await checkBalance(publicKey);
      successCount++;
    } else {
      console.error(`      ❌ Failed to fund wallet ${wallet.id}`);
      wallet.balance = 0;
      failCount++;
    }

    // Rate limit: wait between airdrops
    if (wallet.id < NUM_WALLETS) {
      console.log(`      ⏳ Waiting 3s before next airdrop...\n`);
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }

  console.log(`\n✅ Funding complete: ${successCount} successful, ${failCount} failed\n`);

  // Step 3: Save to .env.test
  console.log('💾 Step 3: Saving wallet configuration...\n');

  const envContent = generateEnvFile(wallets);
  const envPath = path.resolve(__dirname, '../.env.test');

  // Backup existing .env.test
  if (fs.existsSync(envPath)) {
    const backupPath = `${envPath}.backup.${Date.now()}`;
    fs.copyFileSync(envPath, backupPath);
    console.log(`   📋 Backed up existing .env.test to: ${backupPath}`);
  }

  fs.writeFileSync(envPath, envContent);
  console.log(`   ✅ Saved wallet configuration to: ${envPath}\n`);

  // Step 4: Save wallet details to JSON for programmatic access
  const walletsJsonPath = path.resolve(__dirname, '../test-wallets.json');
  fs.writeFileSync(walletsJsonPath, JSON.stringify(wallets, null, 2));
  console.log(`   ✅ Saved wallet details to: ${walletsJsonPath}\n`);

  // Summary
  console.log('📊 Summary:');
  console.log('===========\n');

  console.log('Wallet Balances:');
  for (const wallet of wallets) {
    const status = (wallet.balance || 0) >= 1 ? '✅' : '⚠️';
    console.log(`   ${status} Wallet ${wallet.id}: ${(wallet.balance || 0).toFixed(2)} SOL`);
  }

  console.log('\n🎉 Test wallet farm setup complete!');
  console.log('\nNext steps:');
  console.log('  1. Update wallet-setup.ts to support multiple wallets');
  console.log('  2. Create test fixtures for different market states');
  console.log('  3. Run comprehensive E2E tests\n');
}

/**
 * Generate .env.test file content
 */
function generateEnvFile(wallets: TestWallet[]): string {
  const timestamp = new Date().toISOString();

  let content = `# ZMART Real Blockchain E2E Testing Configuration
# Generated by setup-test-wallet-farm.ts on ${timestamp}
# NEVER commit this file to git!

# ==============================================================================
# TEST WALLET CONFIGURATION
# ==============================================================================

# Primary test wallet (Wallet 1)
TEST_WALLET_PRIVATE_KEY='${JSON.stringify(wallets[0].privateKey)}'
TEST_WALLET_PUBLIC_KEY='${wallets[0].publicKey}'

`;

  // Add all wallets
  for (let i = 0; i < wallets.length; i++) {
    const wallet = wallets[i];
    content += `# Wallet ${i + 1}
TEST_WALLET_${i + 1}_PRIVATE_KEY='${JSON.stringify(wallet.privateKey)}'
TEST_WALLET_${i + 1}_PUBLIC_KEY='${wallet.publicKey}'

`;
  }

  content += `# ==============================================================================
# SOLANA CONFIGURATION
# ==============================================================================
SOLANA_CLUSTER='devnet'
SOLANA_RPC_URL='https://api.devnet.solana.com'

# ==============================================================================
# ZMART PROGRAM IDS
# ==============================================================================
ZMART_PROGRAM_ID='6s8bbbCS7oNYNnTUHgrPDHG4jqaSrD6MSxQSPVR1rxw'

# ==============================================================================
# TESTING CONFIGURATION
# ==============================================================================
TEST_TIMEOUT=60000
TEST_RETRIES=3
TEST_DATA_RETENTION_DAYS=90
`;

  return content;
}

// Execute if run directly
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('\n❌ Error:', error);
      process.exit(1);
    });
}

export { generateWallet, requestAirdrop, checkBalance };
