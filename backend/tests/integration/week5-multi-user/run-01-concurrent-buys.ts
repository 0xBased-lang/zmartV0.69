/**
 * Week 5 Integration Test: Concurrent Buys
 *
 * Standalone runner for testing 5 users buying shares simultaneously
 * (Reduced from 10 users due to devnet funding constraints)
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
} from '../../devnet/setup';

async function runConcurrentBuysTest() {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('         WEEK 5: CONCURRENT BUYS INTEGRATION TEST');
  console.log('═══════════════════════════════════════════════════════════════\n');

  let ctx: TestContext;
  let walletManager: TestWalletManager;
  let executor: ConcurrentExecutor;
  let marketGenerator: MarketGenerator;
  let testUsers: WalletInfo[];
  let market: MarketData;
  let marketPda: PublicKey;

  try {
    // ========================================================================
    // SETUP
    // ========================================================================
    console.log('🔧 Initializing test infrastructure...\n');

    ctx = await setupTestContext();

    walletManager = new TestWalletManager({
      connection: ctx.connection,
      fundingWallet: ctx.payer,
      defaultFundingAmount: 0.5, // 0.5 SOL per user (enough for testing)
    });

    executor = new ConcurrentExecutor({
      connection: ctx.connection,
      commitment: 'confirmed',
      maxRetries: 3,
      retryDelay: 1000,
      batchSize: 25,
    });

    marketGenerator = new MarketGenerator(ctx.program.programId);

    console.log('✅ Test infrastructure initialized\n');

    // ========================================================================
    // STEP 1: Create and Fund Test Users
    // ========================================================================
    console.log('──────────────────────────────────────────────────────────────');
    console.log('STEP 1: Create and Fund Test Users');
    console.log('──────────────────────────────────────────────────────────────\n');

    // Using 5 users instead of 10 due to devnet funding constraints
    const labels = Array.from({ length: 5 }, (_, i) => `TestUser${i + 1}`);
    testUsers = await walletManager.createWallets(5, labels);
    await walletManager.fundWallets(testUsers, 0.2); // 0.2 SOL each (1 SOL total)
    await walletManager.displayBalances(testUsers);

    // Verify all users funded
    const balances = await walletManager.getBalances(testUsers);
    balances.forEach((balance, i) => {
      if (balance < 0.15) { // Allow some SOL for transaction fees
        throw new Error(`User ${i + 1} insufficient balance: ${balance} SOL`);
      }
    });

    console.log('✅ All 5 users created and funded successfully\n');

    // ========================================================================
    // STEP 2: Create and Activate Market
    // ========================================================================
    console.log('──────────────────────────────────────────────────────────────');
    console.log('STEP 2: Create and Activate Market');
    console.log('──────────────────────────────────────────────────────────────\n');

    // Generate unique market ID using timestamp to avoid account collisions
    const uniqueMarketId = new Array(32).fill(0);
    const timestamp = Date.now();
    uniqueMarketId[0] = (timestamp >> 24) & 0xFF;
    uniqueMarketId[1] = (timestamp >> 16) & 0xFF;
    uniqueMarketId[2] = (timestamp >> 8) & 0xFF;
    uniqueMarketId[3] = timestamp & 0xFF;
    uniqueMarketId[4] = Math.floor(Math.random() * 256);

    market = marketGenerator.generateMarket({
      bParameter: new anchor.BN(100_000_000_000), // 100 SOL
      initialLiquidity: new anchor.BN(100_000_000), // 0.1 SOL
      question: 'Will 5 users buy shares concurrently without conflicts?',
    });

    // Override the market ID and PDA with unique values
    market.id = uniqueMarketId;
    const [uniqueMarketPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('market'), Buffer.from(uniqueMarketId)],
      ctx.program.programId
    );
    market.pda = uniqueMarketPda;
    marketPda = uniqueMarketPda;

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

    // Submit proposal votes (need 70% approval to proceed)
    // Each user can only vote once (unique vote record PDA per voter)
    // With 5 users: 4 likes (80%) > 70% threshold ✅
    console.log('Submitting proposal votes (4 likes, 1 dislike)...');

    // Submit 4 likes from first 4 test users (80% approval)
    for (let i = 0; i < 4; i++) {
      // PDA seeds: ["vote", market_key, user_key, [VoteType::Proposal as u8]]
      // VoteType::Proposal = 0
      const [voteRecordPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from('vote'),
          marketPda.toBuffer(),
          testUsers[i].publicKey.toBuffer(),
          Buffer.from([0]), // VoteType::Proposal = 0
        ],
        ctx.program.programId
      );

      await ctx.program.methods
        .submitProposalVote(true) // true = like
        .accounts({
          user: testUsers[i].publicKey, // Account name is "user", not "voter"
          market: marketPda,
          voteRecord: voteRecordPda, // Anchor uses camelCase in TypeScript
          systemProgram: SystemProgram.programId,
        })
        .signers([testUsers[i].keypair])
        .rpc();

      console.log(`  ✅ ${testUsers[i].label} voted LIKE`);
    }

    // Submit 1 dislike from 5th test user (20% disapproval)
    const [voteRecordPda5] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from('vote'),
        marketPda.toBuffer(),
        testUsers[4].publicKey.toBuffer(),
        Buffer.from([0]), // VoteType::Proposal = 0
      ],
      ctx.program.programId
    );

    await ctx.program.methods
      .submitProposalVote(false) // false = dislike
      .accounts({
        user: testUsers[4].publicKey, // Account name is "user"
        market: marketPda,
        voteRecord: voteRecordPda5, // Anchor uses camelCase in TypeScript
        systemProgram: SystemProgram.programId,
      })
      .signers([testUsers[4].keypair])
      .rpc();

    console.log(`  ✅ ${testUsers[4].label} voted DISLIKE`);
    console.log('✅ Votes submitted (4 likes, 1 dislike = 80%)\n');

    // Aggregate votes
    console.log('Aggregating proposal votes...');
    const aggregateTx = await ctx.program.methods
      .aggregateProposalVotes(4, 1) // final_likes: 4, final_dislikes: 1 (80% approval)
      .accounts({
        authority: ctx.payer.publicKey,
        market: marketPda,
        globalConfig: ctx.globalConfigPda,
      })
      .rpc();

    await ctx.connection.confirmTransaction(aggregateTx, 'confirmed');
    console.log('✅ Votes aggregated (4 likes, 1 dislike):', aggregateTx.slice(0, 8) + '...\n');

    // Approve proposal
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

    // Anchor enums are objects like { active: {} }, not numbers
    // MarketState enum: Proposed (0), Approved (1), Active (2), etc.
    const isActive = marketAccount.state.active !== undefined ||
                     (typeof marketAccount.state === 'number' && marketAccount.state === 2);

    if (!isActive) {
      console.log('Actual state:', JSON.stringify(marketAccount.state, null, 2));
      throw new Error(`Market not in ACTIVE state: ${JSON.stringify(marketAccount.state)}`);
    }

    console.log('✅ Market ready for trading\n');

    // ========================================================================
    // STEP 3: Execute Concurrent Buy Transactions
    // ========================================================================
    console.log('──────────────────────────────────────────────────────────────');
    console.log('STEP 3: Execute Concurrent Buy Transactions');
    console.log('──────────────────────────────────────────────────────────────\n');

    // Get protocol fee wallet
    // @ts-ignore
    const globalConfig = await ctx.program.account.globalConfig.fetch(ctx.globalConfigPda);

    // Build transaction tasks
    const tasks: TransactionTask[] = [];

    for (let i = 0; i < testUsers.length; i++) {
      const user = testUsers[i];
      const [positionPda] = deriveUserPositionPda(
        ctx.program.programId,
        marketPda,
        user.publicKey
      );

      // Each user buys 0.1 SOL worth of YES shares (0.1% of b parameter)
      const targetCost = new anchor.BN(100_000_000); // 0.1 SOL

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
        description: `${user.label} buys YES shares (0.1 SOL)`,
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
    console.log(`- Failed: ${failureCount}/${results.length}\n`);

    // List failures if any
    if (failureCount > 0) {
      console.log('Failed Transactions:');
      results.filter(r => !r.success).forEach(r => {
        console.log(`  ❌ ${r.id}: ${r.error?.message || 'Unknown error'}`);
      });
      console.log('');
    }

    // Validate metrics
    const metricsValid = executor.validateMetrics(
      0.95, // 95% success rate
      5000, // 5 second average latency
      10000 // 10 second P95 latency
    );

    if (!metricsValid) {
      throw new Error('Metrics validation failed: Did not meet 95% success rate threshold');
    }

    console.log('✅ All metrics passed validation thresholds\n');

    // ========================================================================
    // STEP 4: Verify User Positions
    // ========================================================================
    console.log('──────────────────────────────────────────────────────────────');
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
        // @ts-ignore
        const position = await ctx.program.account.userPosition.fetch(positionPda);

        console.log(`${user.label}:`);
        console.log(`  YES Shares: ${position.sharesYes.toString()}`);
        console.log(`  NO Shares: ${position.sharesNo.toString()}`);
        console.log(`  Total Invested: ${(position.totalInvested.toNumber() / 1e9).toFixed(4)} SOL`);
        console.log(`  Has Claimed: ${position.hasClaimed}`);

        if (position.sharesYes.lte(new anchor.BN(0))) {
          console.log(`  ⚠️  Warning: ${user.label} has 0 YES shares\n`);
        } else {
          console.log(`  ✅ Position verified!\n`);
          successfulPositions++;
        }

      } catch (error: any) {
        console.log(`  ❌ Position not found for ${user.label}`);
        console.log(`     Error: ${error.message}\n`);
      }
    }

    console.log(`✅ Verified ${successfulPositions}/${testUsers.length} positions\n`);

    // Expect at least 4/5 positions (80% success rate - accounting for dev constraints)
    if (successfulPositions < 4) {
      throw new Error(`Only ${successfulPositions}/5 positions created successfully`);
    }

    // ========================================================================
    // STEP 5: Verify Market State
    // ========================================================================
    console.log('──────────────────────────────────────────────────────────────');
    console.log('STEP 5: Verify Market State Consistency');
    console.log('──────────────────────────────────────────────────────────────\n');

    // @ts-ignore
    const finalMarketAccount = await ctx.program.account.marketAccount.fetch(marketPda);

    console.log('Market State After Concurrent Trades:');
    console.log(`- State: ${JSON.stringify(finalMarketAccount.state)} ✅`);
    console.log(`- Shares YES: ${finalMarketAccount.sharesYes.toString()}`);
    console.log(`- Shares NO: ${finalMarketAccount.sharesNo.toString()}`);
    console.log(`- Current Liquidity: ${(finalMarketAccount.currentLiquidity.toNumber() / 1e9).toFixed(4)} SOL`);
    console.log(`- Total Volume: ${(finalMarketAccount.totalVolume.toNumber() / 1e9).toFixed(4)} SOL\n`);

    // Check if market is still ACTIVE after trades
    const isStillActive = finalMarketAccount.state.active !== undefined ||
                           (typeof finalMarketAccount.state === 'number' && finalMarketAccount.state === 2);

    if (!isStillActive) {
      throw new Error(`Market not in ACTIVE state after trades: ${JSON.stringify(finalMarketAccount.state)}`);
    }

    if (finalMarketAccount.sharesYes.lte(new anchor.BN(0))) {
      throw new Error('Shares YES should be > 0 after buys');
    }

    if (finalMarketAccount.currentLiquidity.lte(market.initialLiquidity)) {
      throw new Error('Liquidity should increase after trades');
    }

    console.log('✅ Market state is consistent\n');

    // ========================================================================
    // SUMMARY
    // ========================================================================
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('                    TEST SUMMARY');
    console.log('═══════════════════════════════════════════════════════════════\n');

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

    // Display final balances
    await walletManager.displayBalances(testUsers);

    console.log('═══════════════════════════════════════════════════════════════\n');

    console.log('🎉 TEST COMPLETE - ALL OBJECTIVES MET!\n');

    process.exit(0);

  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run test
runConcurrentBuysTest().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
