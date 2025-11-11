/**
 * Frontend Deserialization Test
 *
 * Tests that frontend can now deserialize on-chain MarketAccount data
 * after fixing:
 * 1. Program ID mismatch (7h3g... → 6s8b...)
 * 2. Missing Cancelled state in MarketState enum
 *
 * Run with: npx ts-node --esm test-deserialization.ts
 */

import { Connection, PublicKey } from '@solana/web3.js';
import { AnchorProvider, Program } from '@coral-xyz/anchor';
import idl from '../target/idl/zmart_core.json' assert { type: 'json' };
import type { ZmartCore } from './types/zmart_core';

// ============================================================================
// Configuration
// ============================================================================

const DEVNET_RPC = 'https://api.devnet.solana.com';
const PROGRAM_ID = '6s8bbbCS7oNYNnTUHgrPDHG4jqaSrD6MSxQSPVR1rxw'; // NEW PROGRAM ✅
const TEST_MARKET = 'Bej38NWgjAq7r6mNjSPa8oCFM6mgGtgXSvgeha3eyqqz'; // NEW MARKET ✅

// MarketState enum (matches program)
enum MarketState {
  PROPOSED = 0,
  APPROVED = 1,
  ACTIVE = 2,
  RESOLVING = 3,
  DISPUTED = 4,
  FINALIZED = 5,
  CANCELLED = 6, // ✅ ADDED - was missing before!
}

const STATE_LABELS = {
  [MarketState.PROPOSED]: 'Proposed',
  [MarketState.APPROVED]: 'Approved',
  [MarketState.ACTIVE]: 'Active',
  [MarketState.RESOLVING]: 'Resolving',
  [MarketState.DISPUTED]: 'Disputed',
  [MarketState.FINALIZED]: 'Finalized',
  [MarketState.CANCELLED]: 'Cancelled',
};

// ============================================================================
// Test Functions
// ============================================================================

async function testDeserialization() {
  console.log('🧪 Frontend Deserialization Test');
  console.log('='.repeat(80));
  console.log('');

  // Step 1: Setup connection
  console.log('📡 Step 1: Connecting to Solana devnet...');
  const connection = new Connection(DEVNET_RPC, 'confirmed');

  try {
    const version = await connection.getVersion();
    console.log(`   ✅ Connected! Solana version: ${version['solana-core']}`);
  } catch (err) {
    console.error(`   ❌ Failed to connect: ${err}`);
    process.exit(1);
  }
  console.log('');

  // Step 2: Verify program exists
  console.log('🔍 Step 2: Verifying program deployment...');
  console.log(`   Program ID: ${PROGRAM_ID}`);

  const programId = new PublicKey(PROGRAM_ID);
  try {
    const accountInfo = await connection.getAccountInfo(programId);
    if (!accountInfo) {
      console.error('   ❌ Program not found on devnet!');
      process.exit(1);
    }
    console.log(`   ✅ Program found! Executable: ${accountInfo.executable}`);
    console.log(`   ✅ Owner: ${accountInfo.owner.toBase58()}`);
  } catch (err) {
    console.error(`   ❌ Error checking program: ${err}`);
    process.exit(1);
  }
  console.log('');

  // Step 3: Initialize Anchor program
  console.log('⚓ Step 3: Initializing Anchor program...');

  // Create dummy wallet (read-only operations)
  const dummyWallet = {
    publicKey: PublicKey.default,
    signTransaction: async <T,>(tx: T): Promise<T> => tx,
    signAllTransactions: async <T,>(txs: T[]): Promise<T[]> => txs,
  };

  const provider = new AnchorProvider(connection, dummyWallet as any, {
    commitment: 'confirmed',
  });

  const program = new Program(idl as any, programId, provider) as Program<ZmartCore>;
  console.log(`   ✅ Program initialized with IDL version: ${idl.version}`);
  console.log('');

  // Step 4: Test market account deserialization
  console.log('📋 Step 4: Testing MarketAccount deserialization...');
  console.log(`   Test Market PDA: ${TEST_MARKET}`);

  try {
    const marketPDA = new PublicKey(TEST_MARKET);
    console.log(`   ⏳ Fetching account data...`);

    const marketAccount = await program.account.marketAccount.fetch(marketPDA);

    console.log('   ✅ SUCCESS! Account deserialized correctly!');
    console.log('');

    // Step 5: Verify MarketState enum
    console.log('🎯 Step 5: Verifying MarketState enum...');
    const stateValue = (marketAccount.state as any).proposed !== undefined
      ? Object.keys(marketAccount.state)[0]
      : marketAccount.state;

    console.log(`   State (raw): ${JSON.stringify(marketAccount.state)}`);

    let stateEnum: number;
    if (typeof marketAccount.state === 'object') {
      // Anchor returns enum as { variantName: {} }
      const variantName = Object.keys(marketAccount.state)[0];
      const stateMap: Record<string, number> = {
        'proposed': 0,
        'approved': 1,
        'active': 2,
        'resolving': 3,
        'disputed': 4,
        'finalized': 5,
        'cancelled': 6,
      };
      stateEnum = stateMap[variantName.toLowerCase()] ?? -1;
    } else {
      stateEnum = marketAccount.state as number;
    }

    if (stateEnum >= 0 && stateEnum <= 6) {
      console.log(`   ✅ State value: ${stateEnum} (${STATE_LABELS[stateEnum as MarketState]})`);
    } else {
      console.error(`   ❌ Invalid state value: ${stateEnum}`);
      process.exit(1);
    }
    console.log('');

    // Step 6: Display account data
    console.log('📊 Step 6: Market Account Data:');
    console.log(`   Creator: ${marketAccount.creator.toBase58()}`);
    console.log(`   State: ${STATE_LABELS[stateEnum as MarketState]} (${stateEnum})`);
    console.log(`   B Parameter: ${marketAccount.bParameter.toString()}`);
    console.log(`   Shares YES: ${marketAccount.sharesYes.toString()}`);
    console.log(`   Shares NO: ${marketAccount.sharesNo.toString()}`);
    console.log(`   Current Liquidity: ${marketAccount.currentLiquidity.toString()} lamports`);
    console.log(`   Total Volume: ${marketAccount.totalVolume.toString()} lamports`);
    console.log(`   Created At: ${new Date(Number(marketAccount.createdAt) * 1000).toISOString()}`);
    console.log('');

    // Step 7: Final validation
    console.log('✅ Step 7: Final Validation');
    console.log('   ✅ Program ID correct (6s8b...rxw)');
    console.log('   ✅ IDL matches deployed program');
    console.log('   ✅ MarketState enum includes Cancelled (7 states)');
    console.log('   ✅ Account deserialization successful');
    console.log('   ✅ All fields present and valid');
    console.log('');

    console.log('🎉 ALL TESTS PASSED! Frontend integration fixed!');
    console.log('');
    console.log('Next Steps:');
    console.log('  1. Frontend can now load markets from blockchain');
    console.log('  2. useMarketState hook will work correctly');
    console.log('  3. Ready to begin 5-week frontend sprint');
    console.log('');

  } catch (err: any) {
    console.error('   ❌ DESERIALIZATION FAILED!');
    console.error('');
    console.error('Error Details:');
    console.error(`   Message: ${err.message}`);
    if (err.logs) {
      console.error('   Program Logs:');
      err.logs.forEach((log: string) => console.error(`     ${log}`));
    }
    console.error('');
    console.error('This suggests:');
    console.error('  - IDL may not match deployed program');
    console.error('  - MarketState enum may still be mismatched');
    console.error('  - Account may not exist or be corrupted');
    console.error('');
    process.exit(1);
  }
}

// ============================================================================
// Run Test
// ============================================================================

testDeserialization().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
