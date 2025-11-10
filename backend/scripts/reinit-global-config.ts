import * as anchor from '@coral-xyz/anchor';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import fs from 'fs';

// Constants
const PROGRAM_ID = new PublicKey('AFFtXXBKgTbSjFFikKG2jQ7qKvLt9mswvhTFSizJyFoH');
const RPC_URL = 'https://api.devnet.solana.com';

async function reinitializeGlobalConfig() {
  console.log('🔄 Re-initializing GlobalConfig with current wallet as admin...\n');

  // Load wallet
  const walletPath = `${process.env.HOME}/.config/solana/id.json`;
  const keypairData = JSON.parse(fs.readFileSync(walletPath, 'utf-8'));
  const payer = Keypair.fromSecretKey(new Uint8Array(keypairData));

  console.log('Wallet:', payer.publicKey.toString());
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

  // Derive PDAs
  const [globalConfigPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('global-config')],
    PROGRAM_ID
  );

  console.log('GlobalConfig PDA:', globalConfigPda.toString());
  console.log('');

  // Check if already initialized
  const accountInfo = await connection.getAccountInfo(globalConfigPda);
  if (accountInfo) {
    console.log('⚠️  GlobalConfig already exists at this PDA!');
    console.log('Account owner:', accountInfo.owner.toString());
    console.log('');

    // Decode current admin
    const data = accountInfo.data;
    const currentAdmin = new PublicKey(data.slice(8, 40));
    console.log('Current Admin:', currentAdmin.toString());
    console.log('New Admin (you):', payer.publicKey.toString());
    console.log('');

    if (currentAdmin.equals(payer.publicKey)) {
      console.log('✅ You are already the admin! No changes needed.');
      return;
    }

    console.log('❌ Cannot re-initialize - account already exists with different admin');
    console.log('');
    console.log('Solutions:');
    console.log('1. Get the keypair for the current admin wallet');
    console.log('2. Use update_global_config instruction with current admin signature');
    console.log('3. Close the account and create new one (requires current admin)');
    return;
  }

  // Initialize GlobalConfig
  console.log('📝 Initializing GlobalConfig...');

  try {
    const tx = await program.methods
      .initializeGlobalConfig(
        payer.publicKey  // backend_authority (only argument now)
      )
      .accounts({
        admin: payer.publicKey,
        globalConfig: globalConfigPda,
        protocolFeeWallet: payer.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([payer])
      .rpc();

    await connection.confirmTransaction(tx, 'confirmed');

    console.log('✅ GlobalConfig initialized!');
    console.log('Transaction:', tx);
    console.log('');
    console.log('Configuration:');
    console.log('  Admin:', payer.publicKey.toString());
    console.log('  Protocol Fee Wallet:', payer.publicKey.toString());
    console.log('  Vote Aggregator:', payer.publicKey.toString());
    console.log('  Trading Fee: 3%');
    console.log('  Creator Fee: 2%');
    console.log('  Staker Fee: 5%');
    console.log('  Resolution Delay: 48 hours');
    console.log('  Dispute Period: 24 hours');
    console.log('  Min Proposal Votes: 80%');
    console.log('  Paused: false');
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.logs) {
      console.error('\nProgram logs:');
      error.logs.forEach((log: string) => console.error(log));
    }
    throw error;
  }
}

reinitializeGlobalConfig().catch(console.error);
