import * as anchor from '@coral-xyz/anchor';
import { Program, AnchorProvider, Wallet } from '@coral-xyz/anchor';
import { PublicKey, Keypair, SystemProgram, Connection } from '@solana/web3.js';
import fs from 'fs';
import crypto from 'crypto';

// Load IDL
const idl = JSON.parse(fs.readFileSync('./zmart_core_idl.json', 'utf-8'));

const PROGRAM_ID = new PublicKey('7h3gXfBfYFueFVLYyfL5Qo1QGsf4GQUfW96FKVgnUsJS');

async function testMarketWithIDL() {
  console.log('🧪 Testing market creation using Anchor SDK...\n');

  // Set up connection
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

  // Load wallet
  const walletPath = `${process.env.HOME}/.config/solana/id.json`;
  const walletKeypair = Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(fs.readFileSync(walletPath, 'utf-8')))
  );

  const wallet = new Wallet(walletKeypair);

  // Set up provider
  const provider = new AnchorProvider(connection, wallet, { commitment: 'confirmed' });
  anchor.setProvider(provider);

  // Create program instance
  const program = new Program(idl, provider);

  console.log('Program ID:', program.programId.toString());
  console.log('Creator wallet:', wallet.publicKey.toString());

  // Check balance
  const balance = await connection.getBalance(wallet.publicKey);
  console.log('Balance:', balance / 1e9, 'SOL\n');

  if (balance < 0.5 * 1e9) {
    throw new Error('Insufficient balance. Need at least 0.5 SOL');
  }

  // Generate unique market ID
  const marketId = Array.from(crypto.randomBytes(32));
  console.log('Market ID:', Buffer.from(marketId).toString('hex'));

  // Derive Market PDA
  const [marketPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('market'), Buffer.from(marketId)],
    program.programId
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
    program.programId
  );
  console.log('GlobalConfig PDA:', globalConfigPda.toString());

  // Market parameters
  const bParameter = new anchor.BN(1_000_000_000_000); // 1,000 SOL
  const initialLiquidity = new anchor.BN(100_000_000); // 0.1 SOL
  const ipfsQuestionHash = Array.from(Buffer.alloc(46, 0));
  Buffer.from(ipfsQuestionHash).write('QmTest', 0);

  console.log('\nMarket Parameters:');
  console.log('- B Parameter:', bParameter.toNumber() / 1e9, 'SOL');
  console.log('- Initial Liquidity:', initialLiquidity.toNumber() / 1e9, 'SOL');
  console.log('- IPFS Hash:', Buffer.from(ipfsQuestionHash).toString('utf-8').slice(0, 10) + '...');

  try {
    // Call create_market instruction
    console.log('\n📝 Sending transaction...');
    const tx = await program.methods
      .createMarket(marketId, bParameter, initialLiquidity, ipfsQuestionHash)
      .accounts({
        creator: wallet.publicKey,
        market: marketPda,
        globalConfig: globalConfigPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log('\n✅ Market created successfully!');
    console.log('Transaction signature:', tx);
    console.log(`View on Solana Explorer: https://explorer.solana.com/tx/${tx}?cluster=devnet`);

    // Wait for confirmation
    await connection.confirmTransaction(tx, 'confirmed');

    // Verify market creation
    console.log('\n🔍 Verifying market account...');
    const marketAccount = await program.account.market.fetch(marketPda);
    console.log('\n✅ Market Account Data:');
    console.log('- Creator:', (marketAccount as any).creator.toString());
    console.log('- B Parameter:', (marketAccount as any).bParameter.toString());
    console.log('- Initial Liquidity:', (marketAccount as any).initialLiquidity.toString());
    console.log('- State:', (marketAccount as any).state);

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

testMarketWithIDL().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
