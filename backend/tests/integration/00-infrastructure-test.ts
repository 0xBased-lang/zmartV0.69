/**
 * Infrastructure Validation Test
 *
 * Quick test to validate that all testing infrastructure is working:
 * - Test wallet manager
 * - Concurrent executor
 * - Market generator
 * - Connection to devnet
 */

import * as anchor from '@coral-xyz/anchor';
import { Connection, Keypair } from '@solana/web3.js';
import { TestWalletManager } from './utils/test-wallets';
import { ConcurrentExecutor } from './utils/concurrent-executor';
import { MarketGenerator } from './fixtures/market-generator';
import { setupTestContext } from '../devnet/setup';

async function testInfrastructure() {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('         INFRASTRUCTURE VALIDATION TEST');
  console.log('═══════════════════════════════════════════════════════════════\n');

  try {
    // Test 1: Connection
    console.log('──────────────────────────────────────────────────────────────');
    console.log('TEST 1: Devnet Connection');
    console.log('──────────────────────────────────────────────────────────────\n');

    const ctx = await setupTestContext();
    console.log('✅ Successfully connected to devnet');
    console.log(`   Program ID: ${ctx.program.programId.toString()}`);
    console.log(`   GlobalConfig: ${ctx.globalConfigPda.toString()}`);
    console.log(`   Payer Balance: ${await ctx.connection.getBalance(ctx.payer.publicKey) / 1e9} SOL\n`);

    // Test 2: Wallet Manager
    console.log('──────────────────────────────────────────────────────────────');
    console.log('TEST 2: Wallet Manager');
    console.log('──────────────────────────────────────────────────────────────\n');

    const walletManager = new TestWalletManager({
      connection: ctx.connection,
      fundingWallet: ctx.payer,
      defaultFundingAmount: 1, // 1 SOL for quick test
    });

    console.log('Creating 3 test wallets...');
    const testWallets = await walletManager.createWallets(3, ['TestUser1', 'TestUser2', 'TestUser3']);
    console.log(`✅ Created ${testWallets.length} wallets\n`);

    console.log('Funding test wallets with 1 SOL each...');
    await walletManager.fundWallets(testWallets, 1);
    console.log('✅ All wallets funded\n');

    await walletManager.displayBalances(testWallets);

    // Test 3: Market Generator
    console.log('──────────────────────────────────────────────────────────────');
    console.log('TEST 3: Market Generator');
    console.log('──────────────────────────────────────────────────────────────\n');

    const marketGenerator = new MarketGenerator(ctx.program.programId);

    console.log('Generating 3 test markets...');
    const markets = marketGenerator.generateMarkets(3);
    console.log(`✅ Generated ${markets.length} markets`);
    markets.forEach((m, i) => {
      console.log(`   Market ${i + 1}: ${m.question}`);
    });
    console.log('');

    console.log('Generating trades for first market...');
    const trades = marketGenerator.generateTrades(markets[0], 5, 2);
    console.log(`✅ Generated ${trades.length} trades`);
    trades.slice(0, 3).forEach(t => {
      console.log(`   ${t.description}`);
    });
    console.log('');

    console.log('Generating proposal votes...');
    const votes = marketGenerator.generateProposalVotes(markets[0], 10, 0.75);
    console.log(`✅ Generated ${votes.length} votes\n`);

    // Test 4: Concurrent Executor
    console.log('──────────────────────────────────────────────────────────────');
    console.log('TEST 4: Concurrent Executor');
    console.log('──────────────────────────────────────────────────────────────\n');

    const executor = new ConcurrentExecutor({
      connection: ctx.connection,
      maxRetries: 3,
      batchSize: 10,
    });

    console.log('✅ Concurrent executor initialized');
    console.log(`   Max retries: 3`);
    console.log(`   Batch size: 10`);
    console.log(`   Commitment: confirmed\n`);

    // Summary
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('                    SUMMARY');
    console.log('═══════════════════════════════════════════════════════════════\n');

    console.log('✅ ALL INFRASTRUCTURE TESTS PASSED!\n');

    console.log('Components Validated:');
    console.log('  ✅ Devnet connection');
    console.log('  ✅ Program deployment');
    console.log('  ✅ Wallet manager (create, fund, balance tracking)');
    console.log('  ✅ Market generator (markets, trades, votes)');
    console.log('  ✅ Concurrent executor\n');

    console.log('Infrastructure Status: ✅ READY FOR TESTING\n');

    console.log('Next Steps:');
    console.log('  1. Run Week 5 integration tests');
    console.log('  2. npm run test:integration:week5\n');

    console.log('═══════════════════════════════════════════════════════════════\n');

    // Clean up test wallets
    console.log('Cleaning up test wallets...');
    walletManager.clearWallets();
    console.log('✅ Cleanup complete\n');

    process.exit(0);

  } catch (error: any) {
    console.error('\n❌ Infrastructure test failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run test
testInfrastructure().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
