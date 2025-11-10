import * as anchor from '@coral-xyz/anchor';
import { PublicKey, Keypair, SystemProgram } from '@solana/web3.js';
import fs from 'fs';
import crypto from 'crypto';

const PROGRAM_ID = new PublicKey('7h3gXfBfYFueFVLYyfL5Qo1QGsf4GQUfW96FKVgnUsJS');

async function testMarketCreation() {
  console.log('🧪 Testing market creation on devnet...\n');

  // Set up connection
  const connection = new anchor.web3.Connection('https://api.devnet.solana.com', 'confirmed');

  // Load wallet
  const walletPath = `${process.env.HOME}/.config/solana/id.json`;
  const wallet = Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(fs.readFileSync(walletPath, 'utf-8')))
  );
  console.log('Creator wallet:', wallet.publicKey.toString());

  // Check balance
  const balance = await connection.getBalance(wallet.publicKey);
  console.log('Balance:', balance / 1e9, 'SOL\n');

  if (balance < 0.5 * 1e9) {
    throw new Error('Insufficient balance. Need at least 0.5 SOL');
  }

  // Generate unique market ID
  const marketId = crypto.randomBytes(32);
  console.log('Market ID:', Buffer.from(marketId).toString('hex'));

  // Derive Market PDA
  const [marketPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('market'), marketId],
    PROGRAM_ID
  );
  console.log('Market PDA:', marketPda.toString());

  // Check if market already exists
  const existingMarket = await connection.getAccountInfo(marketPda);
  if (existingMarket) {
    console.log('❌ Market with this ID already exists!');
    return;
  }

  // Derive GlobalConfig PDA
  const [globalConfigPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('global-config')],
    PROGRAM_ID
  );
  console.log('GlobalConfig PDA:', globalConfigPda.toString());

  // Market parameters
  const bParameter = 1_000_000_000_000; // 1,000 SOL liquidity sensitivity
  const initialLiquidity = 100_000_000; // 0.1 SOL initial liquidity
  const ipfsQuestionHash = Buffer.alloc(46, 0); // Placeholder IPFS hash
  // Set first bytes to 'Qm' for valid IPFS CIDv0 prefix
  ipfsQuestionHash.write('QmTest', 0);

  console.log('\nMarket Parameters:');
  console.log('- B Parameter:', bParameter / 1e9, 'SOL');
  console.log('- Initial Liquidity:', initialLiquidity / 1e9, 'SOL');
  console.log('- IPFS Question Hash:', ipfsQuestionHash.toString('utf-8').slice(0, 10) + '...');

  // Create instruction data
  // Discriminator for create_market: SHA256("global:create_market")[0..8]
  const discriminator = Buffer.from([0x8a, 0x1c, 0x8c, 0xe4, 0x8e, 0x0f, 0x24, 0x4a]);

  const instructionData = Buffer.concat([
    discriminator,
    marketId, // 32 bytes
    Buffer.from(new anchor.BN(bParameter).toArray('le', 8)), // 8 bytes
    Buffer.from(new anchor.BN(initialLiquidity).toArray('le', 8)), // 8 bytes
    ipfsQuestionHash, // 46 bytes
  ]);

  console.log('\nInstruction data length:', instructionData.length, 'bytes');

  // Create instruction
  const instruction = new anchor.web3.TransactionInstruction({
    keys: [
      { pubkey: wallet.publicKey, isSigner: true, isWritable: true }, // creator
      { pubkey: marketPda, isSigner: false, isWritable: true }, // market
      { pubkey: globalConfigPda, isSigner: false, isWritable: false }, // global_config
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }, // system_program
    ],
    programId: PROGRAM_ID,
    data: instructionData,
  });

  try {
    // Send transaction
    console.log('\n📝 Sending market creation transaction...');
    const tx = new anchor.web3.Transaction().add(instruction);
    const signature = await anchor.web3.sendAndConfirmTransaction(connection, tx, [wallet], {
      commitment: 'confirmed',
      skipPreflight: false,
    });

    console.log('\n✅ Market created successfully!');
    console.log('Transaction signature:', signature);
    console.log(`View on Solana Explorer: https://explorer.solana.com/tx/${signature}?cluster=devnet`);

    // Verify market creation
    console.log('\n🔍 Verifying market account...');
    const marketInfo = await connection.getAccountInfo(marketPda);
    if (marketInfo) {
      console.log('✅ Market account created');
      console.log('Data length:', marketInfo.data.length, 'bytes');
      console.log('Owner:', marketInfo.owner.toString());
      console.log('Lamports:', marketInfo.lamports / 1e9, 'SOL');

      // Parse basic market data
      if (marketInfo.data.length >= 40) {
        const creator = new PublicKey(marketInfo.data.slice(8, 40));
        console.log('Creator (from account):', creator.toString());
        console.log('Matches wallet:', creator.equals(wallet.publicKey) ? '✅' : '❌');
      }
    } else {
      console.log('❌ Market account not found after creation!');
    }

    console.log('\n🎉 Test completed successfully!');
  } catch (error: any) {
    console.error('\n❌ Market creation failed:');
    console.error('Error:', error.message);
    if (error.logs) {
      console.error('\nProgram logs:');
      error.logs.forEach((log: string) => console.error(log));
    }
    throw error;
  }
}

testMarketCreation().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
