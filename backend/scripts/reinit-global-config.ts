import * as anchor from '@coral-xyz/anchor';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import fs from 'fs';

// Constants
const PROGRAM_ID = new PublicKey('7h3gXfBfYFueFVLYyfL5Qo1QGsf4GQUfW96FKVgnUsJS');
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
    [Buffer.from('global_config')],
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
        new anchor.BN(300),           // trading_fee_bps = 3%
        new anchor.BN(200),           // creator_fee_bps = 2%
        new anchor.BN(500),           // staker_fee_bps = 5%
        new anchor.BN(6_000),         // min_b_parameter = 6000 (0.000006 SOL)
        new anchor.BN(100_000_000),   // max_b_parameter = 100 SOL
        new anchor.BN(100_000_000),   // max_initial_liquidity = 100 SOL
        new anchor.BN(172_800),       // resolution_delay = 48h
        new anchor.BN(86_400),        // dispute_period = 24h
        new anchor.BN(1),             // min_liquidity_ratio (not used yet)
        new anchor.BN(1),             // max_slippage_bps (not used yet)
        new anchor.BN(8_000),         // min_proposal_votes = 80%
        false                         // paused = false
      )
      .accounts({
        globalConfig: globalConfigPda,
        admin: payer.publicKey,
        protocolFeeWallet: payer.publicKey,
        voteAggregator: payer.publicKey,
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
