/**
 * Market Lifecycle Test Suite
 *
 * Tests the complete lifecycle of a prediction market:
 * 1. Market Creation (PROPOSED state)
 * 2. Proposal Voting & Approval (APPROVED state)
 * 3. Market Activation (ACTIVE state)
 * 4. Trading (Buy/Sell shares)
 * 5. Resolution (RESOLVING state)
 * 6. Dispute (optional DISPUTED state)
 * 7. Finalization (FINALIZED state)
 * 8. Claiming Winnings
 * 9. Liquidity Withdrawal
 */

import * as anchor from '@coral-xyz/anchor';
import { PublicKey, SystemProgram, Keypair } from '@solana/web3.js';
import {
  setupTestContext,
  generateMarketId,
  deriveMarketPda,
  deriveUserPositionPda,
  createIpfsHash,
  lamportsToSol,
  solToLamports,
  sleep,
  printSection,
  printResult,
  assert,
  TestContext,
} from './setup';

async function runMarketLifecycleTests() {
  printSection('MARKET LIFECYCLE TEST SUITE');

  let ctx: TestContext;
  let marketId: number[];
  let marketPda: PublicKey;
  let creatorPositionPda: PublicKey;
  let trader1: Keypair;
  let trader1PositionPda: PublicKey;

  try {
    // Setup
    ctx = await setupTestContext();

    // Create test traders
    trader1 = Keypair.generate();
    console.log('Trader1:', trader1.publicKey.toString());

    // Airdrop to trader1
    console.log('💰 Airdropping SOL to trader1...');
    const airdropSig = await ctx.connection.requestAirdrop(
      trader1.publicKey,
      2e9 // 2 SOL
    );
    await ctx.connection.confirmTransaction(airdropSig, 'confirmed');
    console.log('✅ Airdrop confirmed\n');

    // Generate market ID
    marketId = generateMarketId();
    [marketPda] = deriveMarketPda(ctx.program.programId, marketId);
    [creatorPositionPda] = deriveUserPositionPda(
      ctx.program.programId,
      marketPda,
      ctx.payer.publicKey
    );
    [trader1PositionPda] = deriveUserPositionPda(
      ctx.program.programId,
      marketPda,
      trader1.publicKey
    );

    console.log('Market PDA:', marketPda.toString());
    console.log('Creator Position PDA:', creatorPositionPda.toString());
    console.log('Trader1 Position PDA:', trader1PositionPda.toString());
    console.log('');

    // ========================================================================
    // TEST 1: Create Market
    // ========================================================================
    printSection('TEST 1: Create Market');

    const bParameter = new anchor.BN(1_000_000_000_000); // 1,000 SOL
    const initialLiquidity = new anchor.BN(100_000_000); // 0.1 SOL
    const ipfsQuestionHash = createIpfsHash('Will BTC reach $100k by 2025?');

    console.log('Creating market...');
    console.log('- B Parameter:', lamportsToSol(bParameter.toNumber()), 'SOL');
    console.log('- Initial Liquidity:', lamportsToSol(initialLiquidity.toNumber()), 'SOL');

    try {
      const createTx = await ctx.program.methods
        .createMarket(marketId, bParameter, initialLiquidity, ipfsQuestionHash)
        .accounts({
          creator: ctx.payer.publicKey,
          market: marketPda,
          globalConfig: ctx.globalConfigPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      await ctx.connection.confirmTransaction(createTx, 'confirmed');
      console.log('✅ Market created:', createTx);

      // Verify market state
      const marketAccount = await ctx.program.account.market.fetch(marketPda);
      assert(
        (marketAccount as any).creator.equals(ctx.payer.publicKey),
        'Creator should match payer'
      );
      assert(
        (marketAccount as any).state.proposed !== undefined,
        'Market should be in PROPOSED state'
      );

      printResult('Create Market', true, `State: PROPOSED, TX: ${createTx.slice(0, 8)}...`);
    } catch (error: any) {
      printResult('Create Market', false, error.message);
      throw error;
    }

    await sleep(1000);

    // ========================================================================
    // TEST 2: Approve Proposal (Admin Only)
    // ========================================================================
    printSection('TEST 2: Approve Proposal');

    console.log('Note: In production, this requires proposal voting to reach 70% approval.');
    console.log('For testing, we skip voting and directly approve as admin.\n');

    try {
      const approveTx = await ctx.program.methods
        .approveProposal()
        .accounts({
          admin: ctx.payer.publicKey,
          market: marketPda,
          globalConfig: ctx.globalConfigPda,
        })
        .rpc();

      await ctx.connection.confirmTransaction(approveTx, 'confirmed');
      console.log('✅ Proposal approved:', approveTx);

      // Verify state transition
      const marketAccount = await ctx.program.account.market.fetch(marketPda);
      assert(
        (marketAccount as any).state.approved !== undefined,
        'Market should be in APPROVED state'
      );

      printResult('Approve Proposal', true, `State: APPROVED, TX: ${approveTx.slice(0, 8)}...`);
    } catch (error: any) {
      printResult('Approve Proposal', false, error.message);
      throw error;
    }

    await sleep(1000);

    // ========================================================================
    // TEST 3: Activate Market
    // ========================================================================
    printSection('TEST 3: Activate Market');

    try {
      const activateTx = await ctx.program.methods
        .activateMarket()
        .accounts({
          authority: ctx.payer.publicKey,
          market: marketPda,
          globalConfig: ctx.globalConfigPda,
        })
        .rpc();

      await ctx.connection.confirmTransaction(activateTx, 'confirmed');
      console.log('✅ Market activated:', activateTx);

      // Verify state transition
      const marketAccount = await ctx.program.account.market.fetch(marketPda);
      assert(
        (marketAccount as any).state.active !== undefined,
        'Market should be in ACTIVE state'
      );

      printResult('Activate Market', true, `State: ACTIVE, TX: ${activateTx.slice(0, 8)}...`);
    } catch (error: any) {
      printResult('Activate Market', false, error.message);
      throw error;
    }

    await sleep(1000);

    // ========================================================================
    // TEST 4: Buy YES Shares (Trader 1)
    // ========================================================================
    printSection('TEST 4: Buy YES Shares');

    const targetCost = new anchor.BN(50_000_000); // 0.05 SOL

    console.log('Trader1 buying YES shares...');
    console.log('- Target Cost:', lamportsToSol(targetCost.toNumber()), 'SOL');

    try {
      const buyTx = await ctx.program.methods
        .buyShares(true, targetCost) // true = YES
        .accounts({
          user: trader1.publicKey,
          market: marketPda,
          userPosition: trader1PositionPda,
          globalConfig: ctx.globalConfigPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([trader1])
        .rpc();

      await ctx.connection.confirmTransaction(buyTx, 'confirmed');
      console.log('✅ YES shares purchased:', buyTx);

      // Verify position created
      const position = await ctx.program.account.userPosition.fetch(trader1PositionPda);
      console.log('\nPosition Details:');
      console.log('- YES Shares:', (position as any).yesShares.toString());
      console.log('- NO Shares:', (position as any).noShares.toString());

      assert(
        (position as any).yesShares.gt(new anchor.BN(0)),
        'Should have YES shares'
      );

      printResult('Buy YES Shares', true, `Shares: ${(position as any).yesShares.toString()}, TX: ${buyTx.slice(0, 8)}...`);
    } catch (error: any) {
      printResult('Buy YES Shares', false, error.message);
      throw error;
    }

    await sleep(1000);

    // ========================================================================
    // TEST 5: Buy NO Shares (Creator)
    // ========================================================================
    printSection('TEST 5: Buy NO Shares');

    const targetCost2 = new anchor.BN(30_000_000); // 0.03 SOL

    console.log('Creator buying NO shares...');
    console.log('- Target Cost:', lamportsToSol(targetCost2.toNumber()), 'SOL');

    try {
      const buyTx = await ctx.program.methods
        .buyShares(false, targetCost2) // false = NO
        .accounts({
          user: ctx.payer.publicKey,
          market: marketPda,
          userPosition: creatorPositionPda,
          globalConfig: ctx.globalConfigPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      await ctx.connection.confirmTransaction(buyTx, 'confirmed');
      console.log('✅ NO shares purchased:', buyTx);

      // Verify position
      const position = await ctx.program.account.userPosition.fetch(creatorPositionPda);
      console.log('\nPosition Details:');
      console.log('- YES Shares:', (position as any).yesShares.toString());
      console.log('- NO Shares:', (position as any).noShares.toString());

      assert(
        (position as any).noShares.gt(new anchor.BN(0)),
        'Should have NO shares'
      );

      printResult('Buy NO Shares', true, `Shares: ${(position as any).noShares.toString()}, TX: ${buyTx.slice(0, 8)}...`);
    } catch (error: any) {
      printResult('Buy NO Shares', false, error.message);
      throw error;
    }

    await sleep(1000);

    // ========================================================================
    // TEST 6: Resolve Market (YES wins)
    // ========================================================================
    printSection('TEST 6: Resolve Market');

    const ipfsEvidenceHash = createIpfsHash('Evidence: BTC reached $100k');

    console.log('Resolving market with outcome: YES');

    try {
      const resolveTx = await ctx.program.methods
        .resolveMarket(true, ipfsEvidenceHash) // true = YES outcome
        .accounts({
          resolver: ctx.payer.publicKey,
          market: marketPda,
          globalConfig: ctx.globalConfigPda,
        })
        .rpc();

      await ctx.connection.confirmTransaction(resolveTx, 'confirmed');
      console.log('✅ Market resolved:', resolveTx);

      // Verify state transition
      const marketAccount = await ctx.program.account.market.fetch(marketPda);
      assert(
        (marketAccount as any).state.resolving !== undefined,
        'Market should be in RESOLVING state'
      );
      assert(
        (marketAccount as any).proposedOutcome === true,
        'Proposed outcome should be YES'
      );

      printResult('Resolve Market', true, `Outcome: YES, State: RESOLVING, TX: ${resolveTx.slice(0, 8)}...`);
    } catch (error: any) {
      printResult('Resolve Market', false, error.message);
      throw error;
    }

    await sleep(1000);

    // ========================================================================
    // TEST 7: Finalize Market (No Dispute)
    // ========================================================================
    printSection('TEST 7: Finalize Market');

    console.log('Finalizing market (no dispute)...');
    console.log('Note: In production, must wait 48 hours before finalization.\n');

    try {
      const finalizeTx = await ctx.program.methods
        .finalizeMarket(null, null) // No dispute votes
        .accounts({
          backendAuthority: ctx.payer.publicKey,
          market: marketPda,
          globalConfig: ctx.globalConfigPda,
        })
        .rpc();

      await ctx.connection.confirmTransaction(finalizeTx, 'confirmed');
      console.log('✅ Market finalized:', finalizeTx);

      // Verify state transition
      const marketAccount = await ctx.program.account.market.fetch(marketPda);
      assert(
        (marketAccount as any).state.finalized !== undefined,
        'Market should be in FINALIZED state'
      );
      assert(
        (marketAccount as any).finalOutcome === true,
        'Final outcome should be YES'
      );

      printResult('Finalize Market', true, `Final Outcome: YES, State: FINALIZED, TX: ${finalizeTx.slice(0, 8)}...`);
    } catch (error: any) {
      printResult('Finalize Market', false, error.message);
      throw error;
    }

    await sleep(1000);

    // ========================================================================
    // TEST 8: Claim Winnings (Trader1 wins)
    // ========================================================================
    printSection('TEST 8: Claim Winnings');

    console.log('Trader1 claiming winnings (YES holder)...');

    const trader1BalanceBefore = await ctx.connection.getBalance(trader1.publicKey);
    console.log('Balance before claim:', lamportsToSol(trader1BalanceBefore), 'SOL');

    try {
      const claimTx = await ctx.program.methods
        .claimWinnings()
        .accounts({
          user: trader1.publicKey,
          market: marketPda,
          userPosition: trader1PositionPda,
          globalConfig: ctx.globalConfigPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([trader1])
        .rpc();

      await ctx.connection.confirmTransaction(claimTx, 'confirmed');
      console.log('✅ Winnings claimed:', claimTx);

      const trader1BalanceAfter = await ctx.connection.getBalance(trader1.publicKey);
      const winnings = trader1BalanceAfter - trader1BalanceBefore;

      console.log('Balance after claim:', lamportsToSol(trader1BalanceAfter), 'SOL');
      console.log('Winnings:', lamportsToSol(winnings), 'SOL');

      assert(winnings > 0, 'Should receive winnings');

      printResult('Claim Winnings', true, `Winnings: ${lamportsToSol(winnings)} SOL, TX: ${claimTx.slice(0, 8)}...`);
    } catch (error: any) {
      printResult('Claim Winnings', false, error.message);
      throw error;
    }

    await sleep(1000);

    // ========================================================================
    // TEST 9: Withdraw Liquidity (Creator)
    // ========================================================================
    printSection('TEST 9: Withdraw Liquidity');

    console.log('Creator withdrawing remaining liquidity...');

    const creatorBalanceBefore = await ctx.connection.getBalance(ctx.payer.publicKey);

    try {
      const withdrawTx = await ctx.program.methods
        .withdrawLiquidity()
        .accounts({
          creator: ctx.payer.publicKey,
          market: marketPda,
          globalConfig: ctx.globalConfigPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      await ctx.connection.confirmTransaction(withdrawTx, 'confirmed');
      console.log('✅ Liquidity withdrawn:', withdrawTx);

      const creatorBalanceAfter = await ctx.connection.getBalance(ctx.payer.publicKey);
      const withdrawn = creatorBalanceAfter - creatorBalanceBefore;

      console.log('Withdrawn amount:', lamportsToSol(withdrawn), 'SOL');

      printResult('Withdraw Liquidity', true, `Amount: ${lamportsToSol(withdrawn)} SOL, TX: ${withdrawTx.slice(0, 8)}...`);
    } catch (error: any) {
      printResult('Withdraw Liquidity', false, error.message);
      throw error;
    }

    // ========================================================================
    // Summary
    // ========================================================================
    printSection('TEST SUMMARY');
    console.log('✅ All market lifecycle tests passed!');
    console.log('');
    console.log('Market Lifecycle Completed:');
    console.log('  1. ✅ Market Created (PROPOSED)');
    console.log('  2. ✅ Proposal Approved (APPROVED)');
    console.log('  3. ✅ Market Activated (ACTIVE)');
    console.log('  4. ✅ YES Shares Purchased');
    console.log('  5. ✅ NO Shares Purchased');
    console.log('  6. ✅ Market Resolved (RESOLVING → YES)');
    console.log('  7. ✅ Market Finalized (FINALIZED)');
    console.log('  8. ✅ Winnings Claimed');
    console.log('  9. ✅ Liquidity Withdrawn');
    console.log('');

  } catch (error) {
    console.error('\n❌ Test suite failed:', error);
    process.exit(1);
  }
}

// Run tests
runMarketLifecycleTests().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
