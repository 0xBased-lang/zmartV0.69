/**
 * Create Test Wallets
 * Creates and funds 11 test wallets on devnet:
 * - 1 admin wallet (5 SOL)
 * - 10 user wallets (2 SOL each)
 */

import { Keypair, Connection, LAMPORTS_PER_SOL } from '@solana/web3.js';
import * as fs from 'fs';
import * as path from 'path';

const RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
const TEST_WALLETS_DIR = path.join(__dirname, '../fixtures/wallets');

async function createTestWallets() {
  const connection = new Connection(RPC_URL, 'confirmed');

  // Ensure wallets directory exists
  if (!fs.existsSync(TEST_WALLETS_DIR)) {
    fs.mkdirSync(TEST_WALLETS_DIR, { recursive: true });
  }

  console.log('🔑 Creating test wallets...\n');

  // Create admin wallet
  console.log('Creating admin wallet...');
  const admin = Keypair.generate();
  const adminPath = path.join(TEST_WALLETS_DIR, 'admin.json');
  fs.writeFileSync(adminPath, JSON.stringify(Array.from(admin.secretKey)));

  // Fund admin
  console.log(`Requesting 5 SOL airdrop for admin...`);
  const adminAirdrop = await connection.requestAirdrop(admin.publicKey, 5 * LAMPORTS_PER_SOL);
  await connection.confirmTransaction(adminAirdrop);

  console.log(`✅ Admin wallet: ${admin.publicKey.toBase58()}`);
  console.log(`   Saved to: ${adminPath}\n`);

  // Create 10 user wallets (user1.json through user10.json)
  for (let i = 1; i <= 10; i++) {
    console.log(`Creating user${i} wallet...`);
    const user = Keypair.generate();
    const userPath = path.join(TEST_WALLETS_DIR, `user${i}.json`);
    fs.writeFileSync(userPath, JSON.stringify(Array.from(user.secretKey)));

    // Fund user
    console.log(`Requesting 2 SOL airdrop for user${i}...`);
    try {
      const userAirdrop = await connection.requestAirdrop(user.publicKey, 2 * LAMPORTS_PER_SOL);
      await connection.confirmTransaction(userAirdrop);
      console.log(`✅ User ${i} wallet: ${user.publicKey.toBase58()}`);
      console.log(`   Saved to: ${userPath}\n`);
    } catch (error) {
      console.error(`⚠️ Failed to airdrop to user ${i}:`, error);
      console.log(`   Wallet created but not funded. You may need to fund manually.\n`);
    }

    // Rate limit (devnet airdrop throttling)
    if (i < 9) {
      console.log('Waiting 2s for rate limit...');
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  console.log('\n✅ All test wallets created!');
  console.log(`📂 Wallets saved to: ${TEST_WALLETS_DIR}`);
  console.log('\n📋 Summary:');
  console.log(`   - 1 admin wallet (5 SOL)`);
  console.log(`   - 10 user wallets (2 SOL each)`);
  console.log(`   - Total: 11 wallets, 25 SOL\n`);
}

// Run if executed directly
if (require.main === module) {
  createTestWallets()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Error creating test wallets:', error);
      process.exit(1);
    });
}

export { createTestWallets };
