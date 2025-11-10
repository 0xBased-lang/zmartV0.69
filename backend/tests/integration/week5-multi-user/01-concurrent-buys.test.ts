/**
 * Week 5 Integration Test: Concurrent Buys
 *
 * Tests 10 users buying shares simultaneously on the same market.
 * This validates that our program handles concurrent transactions
 * correctly without race conditions or conflicts.
 */

import * as anchor from '@coral-xyz/anchor';
import { PublicKey, SystemProgram, Keypair } from '@solana/web3.js';
import { TestWalletManager, WalletInfo } from '../utils/test-wallets';
import { ConcurrentExecutor, TransactionTask } from '../utils/concurrent-executor';
import { MarketGenerator, MarketData } from '../fixtures/market-generator';
import {
  setupTestContext,
  deriveMarketPda,
  deriveUserPositionPda,
  TestContext,
} from '../devnet/setup';

describe('Week 5: Concurrent Buys Test', () => {
  let ctx: TestContext;
  let walletManager: TestWalletManager;
  let executor: ConcurrentExecutor;
  let marketGenerator: MarketGenerator;

  let testUsers: WalletInfo[];
  let market: MarketData;
  let marketPda: PublicKey;

  before(async () => {
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('         WEEK 5: CONCURRENT BUYS INTEGRATION TEST');
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Setup test context
    ctx = await setupTestContext();

    // Initialize wallet manager
    walletManager = new TestWalletManager({
      connection: ctx.connection,
      fundingWallet: ctx.payer,
      defaultFundingAmount: 10, // 10 SOL per user
    });

    // Initialize concurrent executor
    executor = new ConcurrentExecutor({
      connection: ctx.connection,
      commitment: 'confirmed',
      maxRetries: 3,
      retryDelay: 1000,
      batchSize: 25,
    });

    // Initialize market generator
    marketGenerator = new MarketGenerator(ctx.program.programId);

    console.log('✅ Test infrastructure initialized\n');
  });

  describe('Setup: Create Test Users and Market', () => {
    it('should create and fund 10 test users', async () => {
      console.log('\n──────────────────────────────────────────────────────────────');
      console.log('STEP 1: Create and Fund Test Users');
      console.log('──────────────────────────────────────────────────────────────\n');

      // Generate user labels
      const labels = Array.from({ length: 10 }, (_, i) => `TestUser${i + 1}`);

      // Create wallets
      testUsers = await walletManager.createWallets(10, labels);

      // Fund wallets
      await walletManager.fundWallets(testUsers, 10); // 10 SOL each

      // Display balances
      await walletManager.displayBalances(testUsers);

      // Verify all users funded
      const balances = await walletManager.getBalances(testUsers);
      balances.forEach((balance, i) => {
        if (balance < 9) { // Allow some SOL for transaction fees
          throw new Error(`User ${i + 1} insufficient balance: ${balance} SOL`);
        }
      });

      console.log('✅ All 10 users created and funded successfully\n');
    });

    it('should create and activate a test market', async () => {
      console.log('\n──────────────────────────────────────────────────────────────');
      console.log('STEP 2: Create and Activate Market');
      console.log('──────────────────────────────────────────────────────────────\n');

      // Generate market data
      market = marketGenerator.generateMarket({
        bParameter: new anchor.BN(100_000_000_000), // 100 SOL
        initialLiquidity: new anchor.BN(100_000_000), // 0.1 SOL
        question: 'Will 10 users buy shares concurrently without conflicts?',
      });

      marketPda = market.pda;

      console.log('Market Details:');
      console.log(`- PDA: ${marketPda.toString()}`);
      console.log(`- B Parameter: ${(market.bParameter.toNumber() / 1e9).toFixed(2)} SOL`);
      console.log(`- Initial Liquidity: ${(market.initialLiquidity.toNumber() / 1e9).toFixed(4)} SOL`);
      console.log(`- Question: ${market.question}\n`);

      // Create market
      console.log('Creating market...');
      const createTx = await ctx.program.methods
        .createMarket(market.id, market.bParameter, market.initialLiquidity, market.ipfsHash)
        .accounts({
          creator: ctx.payer.publicKey,
          market: marketPda,
          globalConfig: ctx.globalConfigPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      await ctx.connection.confirmTransaction(createTx, 'confirmed');
      console.log('✅ Market created:', createTx.slice(0, 8) + '...\n');

      // Approve proposal (admin action)
      console.log('Approving proposal...');
      const approveTx = await ctx.program.methods
        .approveProposal()
        .accounts({
          admin: ctx.payer.publicKey,
          market: marketPda,
          globalConfig: ctx.globalConfigPda,
        })
        .rpc();

      await ctx.connection.confirmTransaction(approveTx, 'confirmed');
      console.log('✅ Proposal approved:', approveTx.slice(0, 8) + '...\n');

      // Activate market
      console.log('Activating market...');
      const activateTx = await ctx.program.methods
        .activateMarket()
        .accounts({
          authority: ctx.payer.publicKey,
          market: marketPda,
          globalConfig: ctx.globalConfigPda,
        })
        .rpc();

      await ctx.connection.confirmTransaction(activateTx, 'confirmed');
      console.log('✅ Market activated:', activateTx.slice(0, 8) + '...\n');

      // Verify market state
      // @ts-ignore
      const marketAccount = await ctx.program.account.marketAccount.fetch(marketPda);
      if (marketAccount.state !== 2) { // ACTIVE = 2
        throw new Error(`Market not in ACTIVE state: ${marketAccount.state}`);
      }

      console.log('✅ Market ready for trading\n');
    });
  });

  describe('Test: 10 Users Buy YES Shares Concurrently', () => {
    it('should execute 10 concurrent buy transactions successfully', async () => {
      console.log('\n──────────────────────────────────────────────────────────────');
      console.log('STEP 3: Execute Concurrent Buy Transactions');
      console.log('──────────────────────────────────────────────────────────────\n');

      // Get protocol fee wallet
      // @ts-ignore
      const globalConfig = await ctx.program.account.globalConfig.fetch(ctx.globalConfigPda);

      // Build transaction tasks for all 10 users
      const tasks: TransactionTask[] = [];

      for (let i = 0; i < testUsers.length; i++) {
        const user = testUsers[i];
        const [positionPda] = deriveUserPositionPda(
          ctx.program.programId,
          marketPda,
          user.publicKey
        );

        // Each user buys 1 SOL worth of YES shares (1% of b parameter)
        const targetCost = new anchor.BN(1_000_000_000); // 1 SOL

        // Build instruction
        const instruction = await ctx.program.methods
          .buyShares(true, targetCost) // true = YES
          .accounts({
            globalConfig: ctx.globalConfigPda,
            market: marketPda,
            position: positionPda,
            user: user.publicKey,
            protocolFeeWallet: (globalConfig as any).protocolFeeWallet,
            systemProgram: SystemProgram.programId,
          })
          .instruction();

        tasks.push({
          id: `buy-${i}`,
          instruction,
          signers: [user.keypair],
          description: `${user.label} buys YES shares (1 SOL)`,
        });
      }

      console.log(`Prepared ${tasks.length} buy transactions\n`);

      // Execute all transactions concurrently
      const results = await executor.executeConcurrent(tasks);

      // Display metrics
      executor.displayMetrics(results);

      // Validate results
      const successCount = results.filter(r => r.success).length;
      const failureCount = results.filter(r => !r.success).length;

      console.log('Transaction Results:');
      console.log(`- Successful: ${successCount}/${results.length}`);
      console.log(`- Failed: ${failureCount}/${results.length}`);
      console.log('');

      // List failures if any
      if (failureCount > 0) {
        console.log('Failed Transactions:');
        results.filter(r => !r.success).forEach(r => {
          console.log(`  ❌ ${r.id}: ${r.error?.message || 'Unknown error'}`);
        });
        console.log('');
      }

      // Validate 95% success rate
      const metricsValid = executor.validateMetrics(
        0.95, // 95% success rate
        5000, // 5 second average latency
        10000 // 10 second P95 latency
      );

      if (!metricsValid) {
        throw new Error('Metrics validation failed: Did not meet 95% success rate threshold');
      }

      console.log('✅ All metrics passed validation thresholds\n');
    });

    it('should verify all user positions created correctly', async () => {
      console.log('\n──────────────────────────────────────────────────────────────');
      console.log('STEP 4: Verify User Positions');
      console.log('──────────────────────────────────────────────────────────────\n');

      let successfulPositions = 0;

      for (const user of testUsers) {
        const [positionPda] = deriveUserPositionPda(
          ctx.program.programId,
          marketPda,
          user.publicKey
        );

        try {
          // Fetch position account
          // @ts-ignore
          const position = await ctx.program.account.userPosition.fetch(positionPda);

          console.log(`${user.label}:`);
          console.log(`  YES Shares: ${position.sharesYes.toString()}`);
          console.log(`  NO Shares: ${position.sharesNo.toString()}`);
          console.log(`  Amount Paid: ${(position.amountPaid.toNumber() / 1e9).toFixed(4)} SOL`);
          console.log(`  Claimed: ${position.claimed}`);
          console.log('');

          // Verify position has YES shares
          if (position.sharesYes.lte(new anchor.BN(0))) {
            console.log(`  ⚠️  Warning: ${user.label} has 0 YES shares`);
          } else {
            successfulPositions++;
          }

        } catch (error: any) {
          console.log(`  ❌ Position not found for ${user.label}`);
        }
      }

      console.log(`✅ Verified ${successfulPositions}/${testUsers.length} positions\n`);

      // Expect at least 9/10 positions (95% success rate)
      if (successfulPositions < 9) {
        throw new Error(`Only ${successfulPositions}/10 positions created successfully`);
      }
    });

    it('should verify market state is consistent', async () => {
      console.log('\n──────────────────────────────────────────────────────────────');
      console.log('STEP 5: Verify Market State Consistency');
      console.log('──────────────────────────────────────────────────────────────\n');

      // Fetch market account
      // @ts-ignore
      const marketAccount = await ctx.program.account.marketAccount.fetch(marketPda);

      console.log('Market State After Concurrent Trades:');
      console.log(`- State: ${marketAccount.state} (ACTIVE = 2)`);
      console.log(`- Quantity YES: ${marketAccount.quantityYes.toString()}`);
      console.log(`- Quantity NO: ${marketAccount.quantityNo.toString()}`);
      console.log(`- Liquidity Pool: ${(marketAccount.liquidityPool.toNumber() / 1e9).toFixed(4)} SOL`);
      console.log(`- Total Volume: ${(marketAccount.totalVolume.toNumber() / 1e9).toFixed(4)} SOL`);
      console.log('');

      // Verify market still in ACTIVE state
      if (marketAccount.state !== 2) {
        throw new Error(`Market not in ACTIVE state after trades: ${marketAccount.state}`);
      }

      // Verify quantities increased
      if (marketAccount.quantityYes.lte(new anchor.BN(0))) {
        throw new Error('Quantity YES should be > 0 after buys');
      }

      // Verify liquidity pool increased
      if (marketAccount.liquidityPool.lte(market.initialLiquidity)) {
        throw new Error('Liquidity pool should increase after trades');
      }

      console.log('✅ Market state is consistent\n');
    });
  });

  describe('Summary', () => {
    it('should display final test summary', async () => {
      console.log('\n═══════════════════════════════════════════════════════════════');
      console.log('                    TEST SUMMARY');
      console.log('═══════════════════════════════════════════════════════════════\n');

      // Get final metrics
      const metrics = executor.calculateMetrics();

      console.log('✅ Week 5 Concurrent Buys Test: PASSED\n');

      console.log('Test Results:');
      console.log(`- Test Users Created: ${testUsers.length}`);
      console.log(`- Concurrent Transactions: ${metrics.totalTransactions}`);
      console.log(`- Success Rate: ${(metrics.successRate * 100).toFixed(2)}% (>= 95% required)`);
      console.log(`- Average Latency: ${metrics.averageDuration.toFixed(2)} ms (<= 5000 ms required)`);
      console.log(`- P95 Latency: ${metrics.p95Duration.toFixed(2)} ms (<= 10000 ms required)`);
      console.log(`- Throughput: ${metrics.throughput.toFixed(2)} TPS\n`);

      console.log('Quality Gate Status:');
      const successRatePass = metrics.successRate >= 0.95;
      const avgLatencyPass = metrics.averageDuration <= 5000;
      const p95LatencyPass = metrics.p95Duration <= 10000;

      console.log(`- Success Rate >= 95%: ${successRatePass ? '✅ PASS' : '❌ FAIL'}`);
      console.log(`- Avg Latency <= 5s: ${avgLatencyPass ? '✅ PASS' : '❌ FAIL'}`);
      console.log(`- P95 Latency <= 10s: ${p95LatencyPass ? '✅ PASS' : '❌ FAIL'}\n`);

      if (!successRatePass || !avgLatencyPass || !p95LatencyPass) {
        throw new Error('Week 5 Quality Gate FAILED');
      }

      console.log('✅ Week 5 Quality Gate: PASSED\n');

      // Display final wallet balances
      await walletManager.displayBalances(testUsers);

      console.log('═══════════════════════════════════════════════════════════════\n');
    });
  });
});
