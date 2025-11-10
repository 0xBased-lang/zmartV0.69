import { setupTestContext } from '../tests/devnet/setup';

async function main() {
  console.log('🚀 Initializing GlobalConfig...\n');

  const ctx = await setupTestContext();

  try {
    // @ts-ignore
    await ctx.program.account.globalConfig.fetch(ctx.globalConfigPda);
    console.log('✅ Already initialized!');
    return;
  } catch (e) {
    console.log('Not initialized, creating...\n');
  }

  const tx = await (ctx.program.methods as any)
    .initializeGlobalConfig()
    .accounts({
      admin: ctx.payer.publicKey,
      globalConfig: ctx.globalConfigPda,
      systemProgram: require('@coral-xyz/anchor').web3.SystemProgram.programId,
    })
    .signers([ctx.payer])
    .rpc();

  await ctx.connection.confirmTransaction(tx, 'confirmed');
  console.log('✅ Initialized!');
  console.log('TX:', tx);
}

main().catch(console.error);
