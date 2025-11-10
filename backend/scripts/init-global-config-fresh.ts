import * as anchor from '@coral-xyz/anchor';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import fs from 'fs';

// New program ID after re-deployment
const PROGRAM_ID = new PublicKey('3rQhUrqQhHxYCkj3RqTHL1PTrHSnUShMe3z4KdHaHjkz');
const RPC_URL = 'https://api.devnet.solana.com';

async function initializeGlobalConfig() {
  console.log('🚀 Initializing GlobalConfig with fresh deployment...\n');

  // Load wallet
  const walletPath = `${process.env.HOME}/.config/solana/id.json`;
  const keypairData = JSON.parse(fs.readFileSync(walletPath, 'utf-8'));
  const payer = Keypair.fromSecretKey(new Uint8Array(keypairData));

  console.log('Admin Wallet:', payer.publicKey.toString());
  console.log('Program ID:', PROGRAM_ID.toString());
  console.log('');

  // Setup connection and provider
  const connection = new Connection(RPC_URL, 'confirmed');
  const wallet = new anchor.Wallet(payer);
  const provider = new anchor.AnchorProvider(connection, wallet, {
    commitment: 'confirmed',
  });
  anchor.setProvider(provider);

  // Load IDL
  const idl = JSON.parse(fs.readFileSync('zmart_core_idl.json', 'utf-8'));
  const program = new anchor.Program(idl as anchor.Idl, provider);

  // Derive GlobalConfig PDA (note: seeds use hyphen, not underscore!)
  const [globalConfigPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('global-config')],
    PROGRAM_ID
  );

  console.log('GlobalConfig PDA:', globalConfigPda.toString());
  console.log('');

  // Check if already initialized
  const accountInfo = await connection.getAccountInfo(globalConfigPda);
  if (accountInfo) {
    console.log('⚠️  GlobalConfig already initialized!');
    console.log('Checking admin...');

    const data = accountInfo.data;
    const currentAdmin = new PublicKey(data.slice(8, 40));
    console.log('Current Admin:', currentAdmin.toString());

    if (currentAdmin.equals(payer.publicKey)) {
      console.log('✅ You are already the admin!');
      return;
    } else {
      console.log('❌ Different admin - cannot re-initialize');
      return;
    }
  }

  // Initialize GlobalConfig
  console.log('📝 Initializing GlobalConfig...');

  try {
    const tx = await (program.methods as any)
      .initializeGlobalConfig(payer.publicKey) // backend_authority arg
      .accounts({
        admin: payer.publicKey,
        globalConfig: globalConfigPda,
        protocolFeeWallet: payer.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    await connection.confirmTransaction(tx, 'confirmed');

    console.log('✅ GlobalConfig initialized successfully!');
    console.log('Transaction:', tx);
    console.log('');
    console.log('Configuration:');
    console.log('  Admin:', payer.publicKey.toString());
    console.log('  Backend Authority:', payer.publicKey.toString());
    console.log('');
    console.log('🔗 View on Explorer:');
    console.log(`https://explorer.solana.com/tx/${tx}?cluster=devnet`);
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.logs) {
      console.error('\nProgram logs:');
      error.logs.forEach((log: string) => console.error(log));
    }
    throw error;
  }
}

initializeGlobalConfig().catch(console.error);
