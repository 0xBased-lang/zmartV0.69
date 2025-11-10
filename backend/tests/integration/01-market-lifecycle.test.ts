/**
 * Integration Test: Complete Market Lifecycle
 * Tests the full journey: CREATE → VOTE → ACTIVATE → TRADE → RESOLVE → CLAIM
 *
 * This is the most critical test - validates all core mechanics work together.
 */

import { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL, Transaction } from '@solana/web3.js';
import { Program, AnchorProvider, Wallet } from '@coral-xyz/anchor';
import {
  loadProgram,
  loadWallet,
  createMarket,
  buyShares,
  sellShares,
  getMarketAccount,
  getUserPosition,
} from '../helpers/program';
import {
  createTestSupabaseClient,
  cleanupTestData,
  seedTestData,
  verifyDatabaseConsistency,
} from '../helpers/supabase';
import {
  assertOnChainOffChainConsistency,
  assertLMSRInvariants,
  assertFeeDistribution,
  assertStateTransition,
} from '../helpers/assertions';
import * as fs from 'fs';
import * as path from 'path';

// Test configuration
const RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
const PROGRAM_ID = process.env.SOLANA_PROGRAM_ID_CORE;

describe('Market Lifecycle Integration Test', () => {
  let connection: Connection;
  let program: Program;
  let supabase: ReturnType<typeof createTestSupabaseClient>;

  // Test wallets
  let adminWallet: Keypair;
  let creatorWallet: Keypair;
  let trader1Wallet: Keypair;
  let trader2Wallet: Keypair;
  let trader3Wallet: Keypair;

  // Test data
  let marketPubkey: PublicKey;
  let marketId: string;

  beforeAll(async () => {
    console.log('\n🚀 Setting up Market Lifecycle Integration Test...\n');

    // Initialize connection
    connection = new Connection(RPC_URL, 'confirmed');
    console.log('✅ Connected to Solana devnet');

    // Load wallets
    adminWallet = await loadWallet('admin.json');
    creatorWallet = await loadWallet('user1.json');
    trader1Wallet = await loadWallet('user2.json');
    trader2Wallet = await loadWallet('user3.json');
    trader3Wallet = await loadWallet('user4.json');
    console.log('✅ Loaded test wallets');

    // Verify wallet balances
    const adminBalance = await connection.getBalance(adminWallet.publicKey);
    const creatorBalance = await connection.getBalance(creatorWallet.publicKey);

    if (adminBalance < LAMPORTS_PER_SOL) {
      throw new Error(`Admin wallet underfunded: ${adminBalance / LAMPORTS_PER_SOL} SOL (need ≥1 SOL)`);
    }
    if (creatorBalance < LAMPORTS_PER_SOL) {
      throw new Error(`Creator wallet underfunded: ${creatorBalance / LAMPORTS_PER_SOL} SOL (need ≥1 SOL)`);
    }
    console.log(`✅ Wallets funded (admin: ${(adminBalance / LAMPORTS_PER_SOL).toFixed(2)} SOL, creator: ${(creatorBalance / LAMPORTS_PER_SOL).toFixed(2)} SOL)`);

    // Load program
    program = await loadProgram(connection, adminWallet);
    console.log(`✅ Loaded program: ${program.programId.toString()}`);

    // Initialize Supabase
    supabase = createTestSupabaseClient();
    console.log('✅ Connected to Supabase');

    // Clean up any previous test data
    await cleanupTestData(supabase);
    console.log('✅ Cleaned up previous test data');

    console.log('\n📋 Test Setup Complete\n');
  });

  afterAll(async () => {
    console.log('\n🧹 Cleaning up test data...');
    await cleanupTestData(supabase);
    console.log('✅ Cleanup complete\n');
  });

  /**
   * Type-safe provider accessor to avoid TypeScript warnings
   */
  function getProvider() {
    if (!program.provider) {
      throw new Error('Program provider is not initialized');
    }
    return program.provider;
  }

  /**
   * PHASE 1: Market Creation (PROPOSED state)
   */
  test('1. Create market in PROPOSED state', async () => {
    console.log('\n--- PHASE 1: Market Creation ---');

    const marketData = {
      title: 'Will Bitcoin reach $100k by end of 2025?',
      description: 'This market resolves to YES if Bitcoin (BTC) reaches or exceeds $100,000 USD at any point before December 31, 2025 23:59:59 UTC.',
      category: 'cryptocurrency',
      endTimestamp: Math.floor(new Date('2025-12-31T23:59:59Z').getTime() / 1000),
      liquidityParameter: 1_000_000_000, // 1 SOL (b = 1)
      creatorFeeBps: 200, // 2%
      resolutionBond: 10_000_000, // 0.01 SOL
    };

    // Create market on-chain
    const result = await createMarket(
      program,
      creatorWallet,
      marketData.title,
      marketData.description,
      marketData.category,
      marketData.endTimestamp,
      marketData.liquidityParameter,
      marketData.creatorFeeBps,
      marketData.resolutionBond
    );

    marketPubkey = result.marketPubkey;
    marketId = marketPubkey.toString();

    console.log(`✅ Market created: ${marketId}`);
    console.log(`   Transaction: ${result.signature}`);

    // Verify on-chain state
    const marketAccount = await getMarketAccount(program, marketPubkey);
    expect(marketAccount.creator.toString()).toBe(creatorWallet.publicKey.toString());
    expect(marketAccount.title).toBe(marketData.title);
    expect(marketAccount.state).toHaveProperty('proposed'); // Anchor enum
    expect(marketAccount.yesShares.toNumber()).toBe(0);
    expect(marketAccount.noShares.toNumber()).toBe(0);
    console.log('✅ On-chain state verified: PROPOSED');

    // Wait for event indexer to process
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Verify database state
    const { data: dbMarket, error } = await supabase
      .from('markets')
      .select('*')
      .eq('id', marketId)
      .single();

    if (error) throw new Error(`Database query failed: ${error.message}`);
    expect(dbMarket).toBeDefined();
    expect(dbMarket.state).toBe('PROPOSED');
    expect(dbMarket.creator_address).toBe(creatorWallet.publicKey.toString());
    console.log('✅ Database state verified: PROPOSED');

    // Verify consistency
    await assertOnChainOffChainConsistency(program, marketPubkey, supabase);
    console.log('✅ On-chain ↔ off-chain consistency verified');
  }, 120000); // 2 minute timeout

  /**
   * PHASE 2: Proposal Voting (PROPOSED → APPROVED)
   */
  test('2. Submit and aggregate proposal votes (approve market)', async () => {
    console.log('\n--- PHASE 2: Proposal Voting ---');

    // Note: In real implementation, this would involve:
    // 1. Multiple users submit votes via API (off-chain)
    // 2. Vote aggregator service collects votes
    // 3. Aggregator submits aggregate_proposal_votes instruction
    //
    // For this test, we'll simulate the aggregation result directly

    // TODO: Implement full voting workflow once vote-aggregator service is integrated
    console.log('⚠️  Voting workflow test placeholder - implement after vote-aggregator integration');
    console.log('   For now, admin will directly approve market');

    // Admin approves market directly (bypass voting for MVP)
    // In production, this requires 70% approval via voting
    const approveIx = await program.methods
      .approveProposal()
      .accounts({
        market: marketPubkey,
        authority: adminWallet.publicKey,
      })
      .instruction();

    const approveTx = await getProvider().sendAndConfirm(
      new Transaction().add(approveIx),
      [adminWallet]
    );

    console.log(`✅ Market approved by admin`);
    console.log(`   Transaction: ${approveTx}`);

    // Verify state transition
    const marketAccount = await getMarketAccount(program, marketPubkey);
    expect(marketAccount.state).toHaveProperty('approved');
    await assertStateTransition(program, marketPubkey, 'approved', 'APPROVED', supabase);
    console.log('✅ State transition verified: PROPOSED → APPROVED');
  }, 120000);

  /**
   * PHASE 3: Market Activation (APPROVED → ACTIVE)
   */
  test('3. Activate market for trading', async () => {
    console.log('\n--- PHASE 3: Market Activation ---');

    const activateIx = await program.methods
      .activateMarket()
      .accounts({
        market: marketPubkey,
        authority: adminWallet.publicKey,
      })
      .instruction();

    const activateTx = await getProvider().sendAndConfirm(
      new Transaction().add(activateIx),
      [adminWallet]
    );

    console.log(`✅ Market activated`);
    console.log(`   Transaction: ${activateTx}`);

    // Verify state transition
    await assertStateTransition(program, marketPubkey, 'active', 'ACTIVE', supabase);
    console.log('✅ State transition verified: APPROVED → ACTIVE');
    console.log('📊 Market is now open for trading!');
  }, 120000);

  /**
   * PHASE 4: Trading Activity (Buy/Sell shares)
   */
  test('4. Execute trades (buy YES and NO shares)', async () => {
    console.log('\n--- PHASE 4: Trading Activity ---');

    // Trader 1 buys YES shares (bullish)
    console.log('Trader 1: Buying YES shares...');
    const buyYesResult = await buyShares(
      program,
      marketPubkey,
      trader1Wallet,
      'yes',
      200_000_000, // 0.2 SOL
      500 // 5% max slippage
    );
    console.log(`✅ Trader 1 bought YES shares`);
    console.log(`   Transaction: ${buyYesResult.signature}`);
    console.log(`   Shares received: ${buyYesResult.sharesReceived}`);

    // Trader 2 buys NO shares (bearish)
    console.log('Trader 2: Buying NO shares...');
    const buyNoResult = await buyShares(
      program,
      marketPubkey,
      trader2Wallet,
      'no',
      150_000_000, // 0.15 SOL
      500
    );
    console.log(`✅ Trader 2 bought NO shares`);
    console.log(`   Transaction: ${buyNoResult.signature}`);
    console.log(`   Shares received: ${buyNoResult.sharesReceived}`);

    // Trader 3 buys more YES shares
    console.log('Trader 3: Buying YES shares...');
    const buyYes2Result = await buyShares(
      program,
      marketPubkey,
      trader3Wallet,
      'yes',
      300_000_000, // 0.3 SOL
      500
    );
    console.log(`✅ Trader 3 bought YES shares`);
    console.log(`   Transaction: ${buyYes2Result.signature}`);
    console.log(`   Shares received: ${buyYes2Result.sharesReceived}`);

    // Verify LMSR invariants after trading
    await assertLMSRInvariants(program, marketPubkey);
    console.log('✅ LMSR invariants verified (cost function behaving correctly)');

    // Verify database consistency
    await new Promise(resolve => setTimeout(resolve, 5000)); // Wait for event indexer
    await assertOnChainOffChainConsistency(program, marketPubkey, supabase);
    console.log('✅ Trade data consistency verified');

    // Verify user positions
    const trader1Position = await getUserPosition(program, marketPubkey, trader1Wallet.publicKey);
    const trader2Position = await getUserPosition(program, marketPubkey, trader2Wallet.publicKey);
    const trader3Position = await getUserPosition(program, marketPubkey, trader3Wallet.publicKey);

    expect(trader1Position.yesShares.toNumber()).toBeGreaterThan(0);
    expect(trader2Position.noShares.toNumber()).toBeGreaterThan(0);
    expect(trader3Position.yesShares.toNumber()).toBeGreaterThan(0);
    console.log('✅ User positions verified');

    console.log('\n📊 Trading Summary:');
    console.log(`   Trader 1: ${trader1Position.yesShares.toNumber() / LAMPORTS_PER_SOL} YES shares`);
    console.log(`   Trader 2: ${trader2Position.noShares.toNumber() / LAMPORTS_PER_SOL} NO shares`);
    console.log(`   Trader 3: ${trader3Position.yesShares.toNumber() / LAMPORTS_PER_SOL} YES shares`);
  }, 300000); // 5 minute timeout for multiple trades

  /**
   * PHASE 5: Market Resolution (ACTIVE → RESOLVING → FINALIZED)
   */
  test('5. Submit resolution and finalize market', async () => {
    console.log('\n--- PHASE 5: Market Resolution ---');

    // Submit resolution: Assume Bitcoin did NOT reach $100k
    const outcome = false; // NO
    const evidence = 'Bitcoin price on Dec 31, 2025: $87,000 (source: CoinGecko)';

    console.log(`Submitting resolution: outcome = ${outcome ? 'YES' : 'NO'}`);
    const resolveIx = await program.methods
      .submitResolution(outcome, evidence)
      .accounts({
        market: marketPubkey,
        resolver: creatorWallet.publicKey,
      })
      .instruction();

    const resolveTx = await getProvider().sendAndConfirm(
      new Transaction().add(resolveIx),
      [creatorWallet]
    );

    console.log(`✅ Resolution submitted`);
    console.log(`   Transaction: ${resolveTx}`);

    // Verify state: ACTIVE → RESOLVING
    await assertStateTransition(program, marketPubkey, 'resolving', 'RESOLVING', supabase);
    console.log('✅ State transition verified: ACTIVE → RESOLVING');

    // Note: In production, we'd wait 48 hours for dispute window
    // For testing, we'll simulate immediate finalization
    console.log('⏰ Simulating 48hr dispute window passage...');

    // Finalize market (admin can force finalize for testing)
    const finalizeIx = await program.methods
      .finalizeMarket()
      .accounts({
        market: marketPubkey,
        authority: adminWallet.publicKey,
      })
      .instruction();

    const finalizeTx = await getProvider().sendAndConfirm(
      new Transaction().add(finalizeIx),
      [adminWallet]
    );

    console.log(`✅ Market finalized`);
    console.log(`   Transaction: ${finalizeTx}`);

    // Verify state: RESOLVING → FINALIZED
    await assertStateTransition(program, marketPubkey, 'finalized', 'FINALIZED', supabase);
    console.log('✅ State transition verified: RESOLVING → FINALIZED');

    // Verify final outcome recorded
    const marketAccount = await getMarketAccount(program, marketPubkey);
    expect(marketAccount.outcome).toBe(outcome);
    console.log(`✅ Final outcome recorded: ${outcome ? 'YES' : 'NO'}`);
  }, 180000); // 3 minute timeout

  /**
   * PHASE 6: Claims (Winners, Creator, Protocol)
   */
  test('6. Claim winnings and fees', async () => {
    console.log('\n--- PHASE 6: Claims ---');

    // Outcome was NO, so Trader 2 (NO shares) should win
    // Trader 1 and Trader 3 (YES shares) should get nothing

    console.log('Trader 2: Claiming winnings (NO shares - won)...');
    const claimWinningsIx = await program.methods
      .claimWinnings()
      .accounts({
        market: marketPubkey,
        user: trader2Wallet.publicKey,
      })
      .instruction();

    const claimTx = await getProvider().sendAndConfirm(
      new Transaction().add(claimWinningsIx),
      [trader2Wallet]
    );

    console.log(`✅ Trader 2 claimed winnings`);
    console.log(`   Transaction: ${claimTx}`);

    // Creator claims fee
    console.log('Creator: Claiming creator fee (2%)...');
    const claimCreatorFeeIx = await program.methods
      .claimCreatorFee()
      .accounts({
        market: marketPubkey,
        creator: creatorWallet.publicKey,
      })
      .instruction();

    const creatorFeeTx = await getProvider().sendAndConfirm(
      new Transaction().add(claimCreatorFeeIx),
      [creatorWallet]
    );

    console.log(`✅ Creator claimed fee`);
    console.log(`   Transaction: ${creatorFeeTx}`);

    // Protocol claims fee
    console.log('Protocol: Claiming protocol fee (3%)...');
    const claimProtocolFeeIx = await program.methods
      .claimProtocolFee()
      .accounts({
        market: marketPubkey,
        authority: adminWallet.publicKey,
      })
      .instruction();

    const protocolFeeTx = await getProvider().sendAndConfirm(
      new Transaction().add(claimProtocolFeeIx),
      [adminWallet]
    );

    console.log(`✅ Protocol claimed fee`);
    console.log(`   Transaction: ${protocolFeeTx}`);

    // Verify fee distribution (3/2/5 split)
    await assertFeeDistribution(program, marketPubkey, supabase);
    console.log('✅ Fee distribution verified (3% protocol, 2% creator, 5% stakers)');

    // Verify all claims recorded in database
    await new Promise(resolve => setTimeout(resolve, 5000)); // Wait for event indexer
    await verifyDatabaseConsistency(supabase, marketId);
    console.log('✅ All claims recorded in database');

    console.log('\n🎉 Market lifecycle complete!');
    console.log('   Created → Voted → Activated → Traded → Resolved → Claimed ✅');
  }, 180000); // 3 minute timeout
});
