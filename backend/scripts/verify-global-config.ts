import { Connection, PublicKey } from '@solana/web3.js';

const PROGRAM_ID = new PublicKey('7h3gXfBfYFueFVLYyfL5Qo1QGsf4GQUfW96FKVgnUsJS');
const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

async function verifyGlobalConfig() {
  console.log('🔍 Verifying GlobalConfig...\n');

  // Derive PDA
  const [globalConfigPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('global-config')],
    PROGRAM_ID
  );

  console.log('GlobalConfig PDA:', globalConfigPda.toString());

  // Fetch account
  const accountInfo = await connection.getAccountInfo(globalConfigPda);

  if (!accountInfo) {
    console.log('❌ GlobalConfig not initialized');
    return;
  }

  console.log('✅ GlobalConfig exists\n');
  console.log('Account Info:');
  console.log('- Owner:', accountInfo.owner.toString());
  console.log('- Data Length:', accountInfo.data.length, 'bytes (expected: 206)');
  console.log('- Lamports:', accountInfo.lamports / 1e9, 'SOL');
  console.log('- Executable:', accountInfo.executable);

  // Parse account data
  if (accountInfo.data.length === 206) {
    console.log('\n📊 GlobalConfig Data:');

    // Skip 8-byte discriminator, read fields
    let offset = 8;

    const admin = new PublicKey(accountInfo.data.slice(offset, offset + 32));
    offset += 32;
    console.log('- Admin:', admin.toString());

    const backendAuthority = new PublicKey(accountInfo.data.slice(offset, offset + 32));
    offset += 32;
    console.log('- Backend Authority:', backendAuthority.toString());

    const protocolFeeWallet = new PublicKey(accountInfo.data.slice(offset, offset + 32));
    offset += 32;
    console.log('- Protocol Fee Wallet:', protocolFeeWallet.toString());

    const protocolFeeBps = accountInfo.data.readUInt16LE(offset);
    offset += 2;
    const resolverRewardBps = accountInfo.data.readUInt16LE(offset);
    offset += 2;
    const lpFeeBps = accountInfo.data.readUInt16LE(offset);
    offset += 2;
    console.log(`\n💰 Fee Configuration:`);
    console.log(`- Protocol Fee: ${protocolFeeBps/100}% (${protocolFeeBps} bps)`);
    console.log(`- Resolver Reward: ${resolverRewardBps/100}% (${resolverRewardBps} bps)`);
    console.log(`- LP Fee: ${lpFeeBps/100}% (${lpFeeBps} bps)`);
    console.log(`- Total: ${(protocolFeeBps + resolverRewardBps + lpFeeBps)/100}% ✓`);

    const proposalThreshold = accountInfo.data.readUInt16LE(offset);
    offset += 2;
    const disputeThreshold = accountInfo.data.readUInt16LE(offset);
    offset += 2;
    console.log(`\n🗳️  Voting Thresholds:`);
    console.log(`- Proposal Approval: ${proposalThreshold/100}% (${proposalThreshold} bps)`);
    console.log(`- Dispute Success: ${disputeThreshold/100}% (${disputeThreshold} bps)`);

    const minResolutionDelay = accountInfo.data.readBigInt64LE(offset);
    offset += 8;
    const disputePeriod = accountInfo.data.readBigInt64LE(offset);
    offset += 8;
    console.log(`\n⏱️  Time Limits:`);
    console.log(`- Min Resolution Delay: ${minResolutionDelay} seconds (${Number(minResolutionDelay)/3600} hours)`);
    console.log(`- Dispute Period: ${disputePeriod} seconds (${Number(disputePeriod)/3600} hours)`);

    const minResolverReputation = accountInfo.data.readUInt16LE(offset);
    offset += 2;
    console.log(`\n👤 Resolver Requirements:`);
    console.log(`- Min Reputation: ${minResolverReputation/100}% (${minResolverReputation} bps)`);

    const isPaused = accountInfo.data.readUInt8(offset) !== 0;
    offset += 1;
    console.log(`\n🔒 Protocol State:`);
    console.log(`- Is Paused: ${isPaused ? '🔴 YES' : '🟢 NO'}`);

    // Skip reserved (64 bytes)
    offset += 64;

    const bump = accountInfo.data.readUInt8(offset);
    console.log(`- Bump: ${bump}`);

    // Validation
    console.log('\n✅ Validation Checks:');
    const checks = [
      { name: 'Account size', pass: accountInfo.data.length === 206 },
      { name: 'Total fees ≤ 100%', pass: (protocolFeeBps + resolverRewardBps + lpFeeBps) <= 10000 },
      { name: 'Proposal threshold ≤ 100%', pass: proposalThreshold <= 10000 },
      { name: 'Dispute threshold ≤ 100%', pass: disputeThreshold <= 10000 },
      { name: 'Min reputation ≤ 100%', pass: minResolverReputation <= 10000 },
      { name: 'Min resolution delay > 0', pass: minResolutionDelay > 0n },
      { name: 'Dispute period > 0', pass: disputePeriod > 0n },
      { name: 'Not paused', pass: !isPaused },
    ];

    checks.forEach(check => {
      console.log(`  ${check.pass ? '✅' : '❌'} ${check.name}`);
    });

    const allPassed = checks.every(c => c.pass);
    console.log(`\n${allPassed ? '🎉' : '⚠️'} Overall: ${allPassed ? 'ALL CHECKS PASSED' : 'SOME CHECKS FAILED'}`);
  } else {
    console.log('⚠️ Unexpected account size:', accountInfo.data.length);
  }
}

verifyGlobalConfig().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
