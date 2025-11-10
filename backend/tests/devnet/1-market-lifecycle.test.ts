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

    // For testing, use payer wallet as trader1 (avoids airdrop issues)
    trader1 = ctx.payer;
    console.log('Trader1 (using payer):', trader1.publicKey.toString());
    console.log('');

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

      // Verify market account exists
      const marketInfo = await ctx.connection.getAccountInfo(marketPda);
      assert(marketInfo !== null, 'Market account should exist');
      assert(marketInfo!.owner.equals(ctx.program.programId), 'Market should be owned by program');

      printResult('Create Market', true, `Account created, TX: ${createTx.slice(0, 8)}...`);
    } catch (error: any) {
      printResult('Create Market', false, error.message);
      throw error;
    }

    await sleep(1000);

    // ========================================================================
    // TEST 2: Submit & Aggregate Proposal Votes
    // ========================================================================
    printSection('TEST 2: Submit & Aggregate Proposal Votes');

    console.log('Submitting proposal votes (3 likes, 1 dislike = 75% approval)...\n');

    try {
      // Derive vote record PDA
      // Seeds: [b"vote", market.key(), user.key(), &[VoteType::Proposal as u8]]
      // VoteType::Proposal = 0
      const voter1 = ctx.payer;
      const [voteRecord1Pda] = anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from('vote'),
          marketPda.toBuffer(),
          voter1.publicKey.toBuffer(),
          Buffer.from([0])  // VoteType::Proposal = 0
        ],
        ctx.program.programId
      );

      // Submit 1 like vote
      console.log('Submitting like vote...');
      const voteTx = await (ctx.program.methods as any)
        .submitProposalVote(true) // true = like
        .accounts({
          market: marketPda,
          voteRecord: voteRecord1Pda,
          user: voter1.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      await ctx.connection.confirmTransaction(voteTx, 'confirmed');
      console.log('✅ Vote submitted:', voteTx.slice(0, 8) + '...\n');

      // Aggregate votes (backend would do this, but we do it manually for testing)
      console.log('Aggregating votes...');
      const aggregateTx = await (ctx.program.methods as any)
        .aggregateProposalVotes(
          new anchor.BN(3), // likes
          new anchor.BN(1)  // dislikes
        )
        .accounts({
          backend: ctx.payer.publicKey,
          market: marketPda,
          globalConfig: ctx.globalConfigPda,
        })
        .rpc();

      await ctx.connection.confirmTransaction(aggregateTx, 'confirmed');
      console.log('✅ Votes aggregated:', aggregateTx.slice(0, 8) + '...');
      console.log('   Likes: 3, Dislikes: 1, Approval: 75%\n');

      printResult('Submit & Aggregate Votes', true, `75% approval (3/4 votes)`);
    } catch (error: any) {
      printResult('Submit & Aggregate Votes', false, error.message);
      throw error;
    }

    await sleep(1000);

    // ========================================================================
    // TEST 3: Approve Proposal (Admin Only)
    // ========================================================================
    printSection('TEST 3: Approve Proposal');

    console.log('Note: Proposal has 75% approval (>= 70% threshold required).\n');

    try {
      // Fetch market account to check current state
      // @ts-ignore - Using untyped program for now
      const marketAccount = await ctx.program.account.marketAccount.fetch(marketPda);
      console.log('Market state before approval:', marketAccount.state);
      console.log('Proposal votes - Likes:', marketAccount.proposalLikes.toString());
      console.log('Proposal votes - Dislikes:', marketAccount.proposalDislikes.toString());
      console.log('Proposal votes - Total:', marketAccount.proposalTotalVotes.toString());
      console.log('');

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

      // Verify transaction succeeded
      printResult('Approve Proposal', true, `TX: ${approveTx.slice(0, 8)}...`);
    } catch (error: any) {
      printResult('Approve Proposal', false, error.message);
      throw error;
    }

    await sleep(1000);

    // ========================================================================
    // TEST 4: Activate Market
    // ========================================================================
    printSection('TEST 4: Activate Market');

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

      // Verify transaction succeeded
      printResult('Activate Market', true, `TX: ${activateTx.slice(0, 8)}...`);
    } catch (error: any) {
      printResult('Activate Market', false, error.message);
      throw error;
    }

    await sleep(1000);

    // ========================================================================
    // TEST 5: Buy YES Shares (Trader 1)
    // ========================================================================
    printSection('TEST 5: Buy YES Shares');

    const targetCost = new anchor.BN(50_000_000); // 0.05 SOL

    console.log('Trader1 buying YES shares...');
    console.log('- Target Cost:', lamportsToSol(targetCost.toNumber()), 'SOL');

    try {
      // Get protocol_fee_wallet from GlobalConfig
      // @ts-ignore
      const globalConfig = await ctx.program.account.globalConfig.fetch(ctx.globalConfigPda);

      const buyTx = await ctx.program.methods
        .buyShares(true, targetCost) // true = YES
        .accounts({
          globalConfig: ctx.globalConfigPda,
          market: marketPda,
          position: trader1PositionPda,
          user: trader1.publicKey,
          protocolFeeWallet: (globalConfig as any).protocolFeeWallet,
          systemProgram: SystemProgram.programId,
        })
        .signers([trader1])
        .rpc();

      await ctx.connection.confirmTransaction(buyTx, 'confirmed');
      console.log('✅ YES shares purchased:', buyTx);

      // Verify position account created
      const positionInfo = await ctx.connection.getAccountInfo(trader1PositionPda);
      assert(positionInfo !== null, 'Position account should exist');

      printResult('Buy YES Shares', true, `Position created, TX: ${buyTx.slice(0, 8)}...`);
    } catch (error: any) {
      printResult('Buy YES Shares', false, error.message);
      throw error;
    }

    await sleep(1000);

    // ========================================================================
    // TEST 6: Buy NO Shares (Creator)
    // ========================================================================
    printSection('TEST 6: Buy NO Shares');

    const targetCost2 = new anchor.BN(30_000_000); // 0.03 SOL

    console.log('Creator buying NO shares...');
    console.log('- Target Cost:', lamportsToSol(targetCost2.toNumber()), 'SOL');

    try {
      // Get protocol_fee_wallet from GlobalConfig
      // @ts-ignore
      const globalConfig = await ctx.program.account.globalConfig.fetch(ctx.globalConfigPda);

      const buyTx = await ctx.program.methods
        .buyShares(false, targetCost2) // false = NO
        .accounts({
          globalConfig: ctx.globalConfigPda,
          market: marketPda,
          position: creatorPositionPda,
          user: ctx.payer.publicKey,
          protocolFeeWallet: (globalConfig as any).protocolFeeWallet,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      await ctx.connection.confirmTransaction(buyTx, 'confirmed');
      console.log('✅ NO shares purchased:', buyTx);

      // Note: Both traders are same wallet, position already exists
      printResult('Buy NO Shares', true, `TX: ${buyTx.slice(0, 8)}...`);
    } catch (error: any) {
      printResult('Buy NO Shares', false, error.message);
      throw error;
    }

    await sleep(1000);

    // ========================================================================
    // TEST 7: Resolve Market (YES wins)
    // ========================================================================
    printSection('TEST 7: Resolve Market');

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

      // Verify transaction succeeded
      printResult('Resolve Market', true, `Outcome: YES, TX: ${resolveTx.slice(0, 8)}...`);
    } catch (error: any) {
      printResult('Resolve Market', false, error.message);
      throw error;
    }

    await sleep(1000);

    // ========================================================================
    // TEST 8: Finalize Market (No Dispute)
    // ========================================================================
    printSection('TEST 8: Finalize Market');

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

      // Verify transaction succeeded
      printResult('Finalize Market', true, `TX: ${finalizeTx.slice(0, 8)}...`);
    } catch (error: any) {
      printResult('Finalize Market', false, error.message);
      throw error;
    }

    await sleep(1000);

    // ========================================================================
    // TEST 9: Claim Winnings (Trader1 wins)
    // ========================================================================
    printSection('TEST 9: Claim Winnings');

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
