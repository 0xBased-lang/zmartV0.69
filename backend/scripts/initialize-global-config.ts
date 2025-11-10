import * as anchor from '@coral-xyz/anchor';
import { PublicKey, Keypair, SystemProgram } from '@solana/web3.js';
import fs from 'fs';

const PROGRAM_ID = new PublicKey('7h3gXfBfYFueFVLYyfL5Qo1QGsf4GQUfW96FKVgnUsJS');

async function initializeGlobalConfig() {
  console.log('🚀 Initializing GlobalConfig on devnet...\n');

  // Set up connection
  const connection = new anchor.web3.Connection('https://api.devnet.solana.com', 'confirmed');

  // Load wallet
  const walletPath = `${process.env.HOME}/.config/solana/id.json`;
  const wallet = Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(fs.readFileSync(walletPath, 'utf-8')))
  );
  console.log('Admin wallet:', wallet.publicKey.toString());

  // Check balance
  const balance = await connection.getBalance(wallet.publicKey);
  console.log('Balance:', balance / 1e9, 'SOL');

  if (balance < 0.1 * 1e9) {
    throw new Error('Insufficient balance. Need at least 0.1 SOL');
  }

  // Derive GlobalConfig PDA
  const [globalConfigPda, bump] = PublicKey.findProgramAddressSync(
    [Buffer.from('global-config')], // Note: using hyphen as per initialize_global_config.rs
    PROGRAM_ID
  );
  console.log('GlobalConfig PDA:', globalConfigPda.toString());
  console.log('Bump:', bump);

  // Check if already initialized
  const existingAccount = await connection.getAccountInfo(globalConfigPda);
  if (existingAccount) {
    console.log('\n❌ GlobalConfig already initialized!');
    console.log('Account data length:', existingAccount.data.length, 'bytes');
    console.log('Owner:', existingAccount.owner.toString());
    return;
  }

  // Backend authority (can be the same as admin for now, or a separate keypair)
  // For production, this would be the backend service's public key
  const backendAuthority = wallet.publicKey; // Using admin as backend authority initially

  // Protocol fee wallet (where 3% protocol fees go)
  // For production, this would be the protocol treasury
  const protocolFeeWallet = wallet.publicKey; // Using admin wallet initially

  console.log('\nBackend Authority:', backendAuthority.toString());
  console.log('Protocol Fee Wallet:', protocolFeeWallet.toString());

  // Create instruction data
  const instructionData = Buffer.concat([
    // Instruction discriminator for initialize_global_config
    // This is the first 8 bytes of SHA256("global:initialize_global_config")
    Buffer.from([0x8d, 0x3d, 0x1f, 0x87, 0x11, 0x9c, 0x7c, 0x89]),
    // backend_authority (32 bytes)
    backendAuthority.toBuffer(),
  ]);

  // Create instruction
  const instruction = new anchor.web3.TransactionInstruction({
    keys: [
      { pubkey: wallet.publicKey, isSigner: true, isWritable: true }, // admin
      { pubkey: globalConfigPda, isSigner: false, isWritable: true }, // global_config
      { pubkey: protocolFeeWallet, isSigner: false, isWritable: false }, // protocol_fee_wallet
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }, // system_program
    ],
    programId: PROGRAM_ID,
    data: instructionData,
  });

  try {
    // Send transaction
    console.log('\n📝 Sending initialization transaction...');
    const tx = new anchor.web3.Transaction().add(instruction);
    const signature = await anchor.web3.sendAndConfirmTransaction(connection, tx, [wallet], {
      commitment: 'confirmed',
    });

    console.log('\n✅ GlobalConfig initialized successfully!');
    console.log('Transaction signature:', signature);
    console.log(`View on Solana Explorer: https://explorer.solana.com/tx/${signature}?cluster=devnet`);

    // Verify initialization
    console.log('\n🔍 Verifying initialization...');
    const accountInfo = await connection.getAccountInfo(globalConfigPda);
    if (accountInfo) {
      console.log('✅ Account created');
      console.log('Data length:', accountInfo.data.length, 'bytes (expected: 206)');
      console.log('Owner:', accountInfo.owner.toString());
      console.log('Lamports:', accountInfo.lamports / 1e9, 'SOL');

      // Try to deserialize (basic check)
      if (accountInfo.data.length === 206) {
        console.log('\n📊 GlobalConfig Details:');
        console.log('- Admin:', new PublicKey(accountInfo.data.slice(8, 40)).toString());
        console.log('- Backend Authority:', new PublicKey(accountInfo.data.slice(40, 72)).toString());
        console.log('- Protocol Fee Wallet:', new PublicKey(accountInfo.data.slice(72, 104)).toString());

        // Read fee configuration (u16 values, little-endian)
        const protocolFeeBps = accountInfo.data.readUInt16LE(104);
        const resolverRewardBps = accountInfo.data.readUInt16LE(106);
        const lpFeeBps = accountInfo.data.readUInt16LE(108);
        console.log(`- Fees: ${protocolFeeBps/100}% protocol, ${resolverRewardBps/100}% resolver, ${lpFeeBps/100}% LP`);

        // Read thresholds
        const proposalThreshold = accountInfo.data.readUInt16LE(110);
        const disputeThreshold = accountInfo.data.readUInt16LE(112);
        console.log(`- Voting: ${proposalThreshold/100}% proposal approval, ${disputeThreshold/100}% dispute success`);
      }
    } else {
      console.log('❌ Account not found after initialization!');
    }
  } catch (error: any) {
    console.error('\n❌ Initialization failed:');
    console.error(error.message);
    if (error.logs) {
      console.error('\nProgram logs:');
      error.logs.forEach((log: string) => console.error(log));
    }
    throw error;
  }
}

initializeGlobalConfig().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
