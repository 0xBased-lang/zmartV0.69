import * as anchor from '@coral-xyz/anchor';
import { Connection, Keypair, PublicKey, SystemProgram } from '@solana/web3.js';
import fs from 'fs';
import path from 'path';

async function main() {
  console.log('🚀 Initializing GlobalConfig...\n');

  // Setup connection
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

  // Load wallet
  const walletPath = path.join(process.env.HOME!, '.config/solana/id.json');
  const walletKeypair = Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(fs.readFileSync(walletPath, 'utf-8')))
  );

  console.log('Admin:', walletKeypair.publicKey.toString());

  // Load IDL
  const idl = JSON.parse(fs.readFileSync('./zmart_core_idl.json', 'utf-8'));
  const programId = new PublicKey(idl.address);

  console.log('Program ID:', programId.toString());

  // Setup provider
  const wallet = new anchor.Wallet(walletKeypair);
  const provider = new anchor.AnchorProvider(connection, wallet, {
    commitment: 'confirmed',
  });
  anchor.setProvider(provider);

  // Create program instance
  // @ts-ignore - IDL types
  const program = new anchor.Program(idl, programId, provider);

  // Derive GlobalConfig PDA
  const [globalConfigPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('global-config')],
    programId
  );

  console.log('GlobalConfig PDA:', globalConfigPda.toString());
  console.log('');

  // Check if already initialized
  try {
    // @ts-ignore - account type
    const account = await program.account.globalConfig.fetch(globalConfigPda);
    console.log('✅ Already initialized!');
    console.log('Admin:', (account as any).admin.toString());
    return;
  } catch (e) {
    console.log('Not initialized, creating...\n');
  }

  // Initialize GlobalConfig
  try {
    const tx = await program.methods
      .initializeGlobalConfig()
      .accounts({
        admin: walletKeypair.publicKey,
        globalConfig: globalConfigPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    await connection.confirmTransaction(tx, 'confirmed');

    console.log('✅ GlobalConfig initialized!');
    console.log('TX:', tx);

    // Verify
    // @ts-ignore - account type
    const account = await program.account.globalConfig.fetch(globalConfigPda);
    console.log('\n📋 Verification:');
    console.log('Admin:', (account as any).admin.toString());
    console.log('Backend Authority:', (account as any).backendAuthority.toString());
    console.log('Is Paused:', (account as any).isPaused);

  } catch (error: any) {
    console.error('❌ Initialization failed:', error.message);
    if (error.logs) {
      console.error('\nLogs:', error.logs);
    }
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
