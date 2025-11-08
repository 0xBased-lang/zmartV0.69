/**
 * Verify Global Config Account
 * Fetches and displays the global configuration
 */

import { Connection, PublicKey } from '@solana/web3.js';
import * as borsh from 'borsh';

// Constants
const PROGRAM_ID = new PublicKey('7h3gXfBfYFueFVLYyfL5Qo1QGsf4GQUfW96FKVgnUsJS');
const RPC_URL = 'https://api.devnet.solana.com';

// GlobalConfig account schema
class GlobalConfig {
  constructor(fields) {
    Object.assign(this, fields);
  }
}

const schema = new Map([
  [GlobalConfig, {
    kind: 'struct',
    fields: [
      ['admin', [32]], // Pubkey (32 bytes)
      ['backendAuthority', [32]], // Pubkey (32 bytes)
      ['protocolFeeWallet', [32]], // Pubkey (32 bytes)
      ['protocolFeeBps', 'u16'],
      ['resolverRewardBps', 'u16'],
      ['liquidityProviderFeeBps', 'u16'],
      ['proposalApprovalThreshold', 'u16'],
      ['disputeSuccessThreshold', 'u16'],
      ['minResolutionDelay', 'i64'],
      ['disputePeriod', 'i64'],
      ['minResolverReputation', 'u16'],
      ['isPaused', 'u8'], // bool
      ['reserved', [64]], // [u8; 64]
      ['bump', 'u8'],
    ]
  }]
]);

async function main() {
  console.log('='.repeat(60));
  console.log('Global Config Verification');
  console.log('='.repeat(60));

  const connection = new Connection(RPC_URL, 'confirmed');

  // Derive PDA
  const [globalConfigPDA, bump] = PublicKey.findProgramAddressSync(
    [Buffer.from('global-config')],
    PROGRAM_ID
  );

  console.log(`\nProgram ID: ${PROGRAM_ID.toString()}`);
  console.log(`Global Config PDA: ${globalConfigPDA.toString()}`);
  console.log(`Expected Bump: ${bump}`);

  try {
    // Fetch account
    const accountInfo = await connection.getAccountInfo(globalConfigPDA);

    if (!accountInfo) {
      console.log(`\n❌ Global Config not found!`);
      console.log(`   PDA: ${globalConfigPDA.toString()}`);
      console.log(`   Action: Run initialization script first`);
      return;
    }

    console.log(`\n✅ Account Found!`);
    console.log(`   Owner: ${accountInfo.owner.toString()}`);
    console.log(`   Size: ${accountInfo.data.length} bytes (expected 206)`);
    console.log(`   Rent: ${(accountInfo.lamports / 1e9).toFixed(6)} SOL`);

    // Skip discriminator (first 8 bytes)
    const data = accountInfo.data.slice(8);

    console.log(`\n📋 Raw Data (first 100 bytes):`);
    console.log(`   ${data.slice(0, 100).toString('hex')}`);

    // Parse the data manually
    let offset = 0;

    const admin = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;

    const backendAuthority = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;

    const protocolFeeWallet = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;

    const protocolFeeBps = data.readUInt16LE(offset);
    offset += 2;

    const resolverRewardBps = data.readUInt16LE(offset);
    offset += 2;

    const liquidityProviderFeeBps = data.readUInt16LE(offset);
    offset += 2;

    const proposalApprovalThreshold = data.readUInt16LE(offset);
    offset += 2;

    const disputeSuccessThreshold = data.readUInt16LE(offset);
    offset += 2;

    const minResolutionDelay = data.readBigInt64LE(offset);
    offset += 8;

    const disputePeriod = data.readBigInt64LE(offset);
    offset += 8;

    const minResolverReputation = data.readUInt16LE(offset);
    offset += 2;

    const isPaused = data.readUInt8(offset);
    offset += 1;

    // Skip reserved (64 bytes)
    offset += 64;

    const storedBump = data.readUInt8(offset);

    console.log(`\n${'='.repeat(60)}`);
    console.log(`Global Configuration Details`);
    console.log(`${'='.repeat(60)}`);

    console.log(`\n👤 Authorities:`);
    console.log(`   Admin: ${admin.toString()}`);
    console.log(`   Backend: ${backendAuthority.toString()}`);
    console.log(`   Protocol Fee Wallet: ${protocolFeeWallet.toString()}`);

    console.log(`\n💰 Fee Structure:`);
    console.log(`   Protocol Fee: ${protocolFeeBps} bps (${protocolFeeBps / 100}%)`);
    console.log(`   Resolver Reward: ${resolverRewardBps} bps (${resolverRewardBps / 100}%)`);
    console.log(`   LP Fee: ${liquidityProviderFeeBps} bps (${liquidityProviderFeeBps / 100}%)`);

    const totalFee = protocolFeeBps + resolverRewardBps + liquidityProviderFeeBps;
    console.log(`   Total Trading Fee: ${totalFee} bps (${totalFee / 100}%)`);

    console.log(`\n🗳️  Voting Thresholds:`);
    console.log(`   Proposal Approval: ${proposalApprovalThreshold} bps (${proposalApprovalThreshold / 100}%)`);
    console.log(`   Dispute Success: ${disputeSuccessThreshold} bps (${disputeSuccessThreshold / 100}%)`);

    console.log(`\n⏱️  Time Limits:`);
    console.log(`   Min Resolution Delay: ${minResolutionDelay}s (${Number(minResolutionDelay) / 3600}h)`);
    console.log(`   Dispute Period: ${disputePeriod}s (${Number(disputePeriod) / 86400}d)`);

    console.log(`\n⭐ Reputation:`);
    console.log(`   Min Resolver: ${minResolverReputation} bps (${minResolverReputation / 100}%)`);

    console.log(`\n🔐 State:`);
    console.log(`   Paused: ${isPaused === 1 ? 'YES' : 'NO'}`);
    console.log(`   PDA Bump: ${storedBump} (expected: ${bump})`);

    // Validate configuration
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Validation`);
    console.log(`${'='.repeat(60)}`);

    const checks = [];

    checks.push({
      name: 'Fee structure (should be 3/2/5 = 10%)',
      pass: protocolFeeBps === 300 && resolverRewardBps === 200 && liquidityProviderFeeBps === 500,
      expected: '300/200/500 bps',
      actual: `${protocolFeeBps}/${resolverRewardBps}/${liquidityProviderFeeBps} bps`
    });

    checks.push({
      name: 'Total fee (should be ≤ 10%)',
      pass: totalFee <= 1000,
      expected: '≤1000 bps',
      actual: `${totalFee} bps`
    });

    checks.push({
      name: 'Proposal threshold (should be 70%)',
      pass: proposalApprovalThreshold === 7000,
      expected: '7000 bps',
      actual: `${proposalApprovalThreshold} bps`
    });

    checks.push({
      name: 'Dispute threshold (should be 60%)',
      pass: disputeSuccessThreshold === 6000,
      expected: '6000 bps',
      actual: `${disputeSuccessThreshold} bps`
    });

    checks.push({
      name: 'Min resolution delay (should be 24h)',
      pass: minResolutionDelay === 86400n,
      expected: '86400s',
      actual: `${minResolutionDelay}s`
    });

    checks.push({
      name: 'Dispute period (should be 3d)',
      pass: disputePeriod === 259200n,
      expected: '259200s',
      actual: `${disputePeriod}s`
    });

    checks.push({
      name: 'PDA bump match',
      pass: storedBump === bump,
      expected: bump.toString(),
      actual: storedBump.toString()
    });

    checks.push({
      name: 'Not paused initially',
      pass: isPaused === 0,
      expected: 'false',
      actual: isPaused === 0 ? 'false' : 'true'
    });

    let passed = 0;
    let failed = 0;

    checks.forEach(check => {
      const status = check.pass ? '✅ PASS' : '❌ FAIL';
      console.log(`\n${status} ${check.name}`);
      if (!check.pass) {
        console.log(`   Expected: ${check.expected}`);
        console.log(`   Actual: ${check.actual}`);
        failed++;
      } else {
        passed++;
      }
    });

    console.log(`\n${'='.repeat(60)}`);
    console.log(`Summary: ${passed}/${checks.length} checks passed`);

    if (failed === 0) {
      console.log(`\n✅ All validations passed!`);
      console.log(`🎉 Global Config is properly initialized and ready for use!`);
    } else {
      console.log(`\n⚠️  Some validations failed - review configuration`);
    }

    console.log(`${'='.repeat(60)}\n`);

  } catch (error) {
    console.error(`\n❌ Error:`, error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main().catch(console.error);
