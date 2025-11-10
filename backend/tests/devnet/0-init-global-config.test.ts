import { setupTestContext } from './setup';
import * as anchor from '@coral-xyz/anchor';

async function initializeGlobalConfig() {
  console.log('================================================================================');
  console.log('  INITIALIZE GLOBALCONFIG');
  console.log('================================================================================\n');

  const ctx = await setupTestContext();

  try {
    // @ts-ignore
    const account = await ctx.program.account.globalConfig.fetch(ctx.globalConfigPda);
    console.log('✅ Already initialized!');
    console.log('Admin:', (account as any).admin.toString());
    console.log('Backend Authority:', (account as any).backendAuthority.toString());
    console.log('Is Paused:', (account as any).isPaused);
    console.log('');
    return;
  } catch (e) {
    console.log('Not initialized, creating...\n');
  }

  // Initialize with all required accounts and arguments
  const tx = await (ctx.program.methods as any)
    .initializeGlobalConfig(
      ctx.payer.publicKey  // backend_authority (using admin as backend authority for now)
    )
    .accounts({
      admin: ctx.payer.publicKey,
      globalConfig: ctx.globalConfigPda,
      protocolFeeWallet: ctx.payer.publicKey,  // Using admin wallet as fee wallet for testing
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .rpc();

  await ctx.connection.confirmTransaction(tx, 'confirmed');

  console.log('✅ GlobalConfig initialized!');
  console.log('TX:', tx);
  console.log('');

  // Verify
  // @ts-ignore
  const account = await ctx.program.account.globalConfig.fetch(ctx.globalConfigPda);
  console.log('📋 Verification:');
  console.log('Admin:', (account as any).admin.toString());
  console.log('Backend Authority:', (account as any).backendAuthority.toString());
  console.log('Is Paused:', (account as any).isPaused);
  console.log('');
}

initializeGlobalConfig()
  .then(() => {
    console.log('✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
