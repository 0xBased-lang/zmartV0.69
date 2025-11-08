import { Connection, PublicKey, Keypair, SystemProgram } from '@solana/web3.js';
import pkg from '@coral-xyz/anchor';
const { Program, AnchorProvider, Wallet } = pkg;
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Constants
const PROGRAM_ID = new PublicKey('7h3gXfBfYFueFVLYyfL5Qo1QGsf4GQUfW96FKVgnUsJS');
const RPC_URL = 'https://api.devnet.solana.com';

async function main() {
  console.log('='.repeat(60));
  console.log('Initialize Global Config on Devnet');
  console.log('='.repeat(60));

  // Load wallet
  const walletPath = path.join(process.env.HOME, '.config/solana/id.json');
  const walletKeypair = Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(fs.readFileSync(walletPath, 'utf-8')))
  );

  console.log(`\nAdmin wallet: ${walletKeypair.publicKey.toString()}`);

  // Setup connection and provider
  const connection = new Connection(RPC_URL, 'confirmed');
  const wallet = new Wallet(walletKeypair);
  const provider = new AnchorProvider(connection, wallet, { commitment: 'confirmed' });

  // Load IDL
  const idlPath = path.join(__dirname, '../target/idl/zmart_core.json');
  const idl = JSON.parse(fs.readFileSync(idlPath, 'utf-8'));

  // Create program
  const program = new Program(idl, PROGRAM_ID, provider);

  // Derive global config PDA
  const [globalConfigPDA, bump] = PublicKey.findProgramAddressSync(
    [Buffer.from('global-config')],
    PROGRAM_ID
  );

  console.log(`\nGlobal Config PDA: ${globalConfigPDA.toString()}`);
  console.log(`Bump: ${bump}`);

  // Check if already initialized
  try {
    const existingConfig = await connection.getAccountInfo(globalConfigPDA);
    if (existingConfig) {
      console.log(`\n❌ Global Config already initialized!`);
      console.log(`   Size: ${existingConfig.data.length} bytes`);
      console.log(`   Owner: ${existingConfig.owner.toString()}`);
      console.log(`\nSkipping initialization.`);
      return;
    }
  } catch (e) {
    // Account doesn't exist, continue with initialization
  }

  // Check wallet balance
  const balance = await connection.getBalance(walletKeypair.publicKey);
  console.log(`\nWallet balance: ${(balance / 1e9).toFixed(4)} SOL`);

  if (balance < 0.1 * 1e9) {
    console.log(`\n❌ Insufficient balance! Need at least 0.1 SOL`);
    console.log(`   Run: solana airdrop 2`);
    return;
  }

  // Set backend authority (can be same as admin for now)
  const backendAuthority = walletKeypair.publicKey;

  // Set protocol fee wallet (can be same as admin for now)
  const protocolFeeWallet = walletKeypair.publicKey;

  console.log(`\nInitializing with:`);
  console.log(`   Admin: ${walletKeypair.publicKey.toString()}`);
  console.log(`   Backend Authority: ${backendAuthority.toString()}`);
  console.log(`   Protocol Fee Wallet: ${protocolFeeWallet.toString()}`);
  console.log(`\nFee Structure:`);
  console.log(`   Protocol: 3%`);
  console.log(`   Resolver: 2%`);
  console.log(`   LP: 5%`);
  console.log(`   Total: 10%`);
  console.log(`\nVoting Thresholds:`);
  console.log(`   Proposal Approval: 70%`);
  console.log(`   Dispute Success: 60%`);
  console.log(`\nTime Limits:`);
  console.log(`   Min Resolution Delay: 24 hours`);
  console.log(`   Dispute Period: 3 days`);

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Sending transaction...`);
  console.log(`${'='.repeat(60)}`);

  try {
    const tx = await program.methods
      .initializeGlobalConfig(backendAuthority)
      .accounts({
        admin: walletKeypair.publicKey,
        globalConfig: globalConfigPDA,
        protocolFeeWallet: protocolFeeWallet,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log(`\n✅ Global Config initialized successfully!`);
    console.log(`   Transaction: ${tx}`);
    console.log(`   Explorer: https://explorer.solana.com/tx/${tx}?cluster=devnet`);

    // Fetch and display the initialized config
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Verifying initialization...`);
    console.log(`${'='.repeat(60)}`);

    // Wait a bit for the transaction to be confirmed
    await new Promise(resolve => setTimeout(resolve, 2000));

    const config = await program.account.globalConfig.fetch(globalConfigPDA);

    console.log(`\n✅ Verification successful!`);
    console.log(`\nGlobal Config:`);
    console.log(`   Admin: ${config.admin.toString()}`);
    console.log(`   Backend Authority: ${config.backendAuthority.toString()}`);
    console.log(`   Protocol Fee Wallet: ${config.protocolFeeWallet.toString()}`);
    console.log(`   Protocol Fee: ${config.protocolFeeBps} bps (${config.protocolFeeBps / 100}%)`);
    console.log(`   Resolver Reward: ${config.resolverRewardBps} bps (${config.resolverRewardBps / 100}%)`);
    console.log(`   LP Fee: ${config.liquidityProviderFeeBps} bps (${config.liquidityProviderFeeBps / 100}%)`);
    console.log(`   Proposal Threshold: ${config.proposalApprovalThreshold} bps (${config.proposalApprovalThreshold / 100}%)`);
    console.log(`   Dispute Threshold: ${config.disputeSuccessThreshold} bps (${config.disputeSuccessThreshold / 100}%)`);
    console.log(`   Min Resolution Delay: ${config.minResolutionDelay}s (${config.minResolutionDelay / 3600}h)`);
    console.log(`   Dispute Period: ${config.disputePeriod}s (${config.disputePeriod / 86400}d)`);
    console.log(`   Min Resolver Reputation: ${config.minResolverReputation} bps (${config.minResolverReputation / 100}%)`);
    console.log(`   Paused: ${config.isPaused}`);

    console.log(`\n${'='.repeat(60)}`);
    console.log(`🎉 Initialization complete!`);
    console.log(`${'='.repeat(60)}`);

  } catch (error) {
    console.error(`\n❌ Error initializing global config:`, error);

    if (error.logs) {
      console.log(`\nProgram logs:`);
      error.logs.forEach(log => console.log(`   ${log}`));
    }

    process.exit(1);
  }
}

main().catch(console.error);
