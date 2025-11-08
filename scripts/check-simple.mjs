import { Connection, PublicKey } from '@solana/web3.js';

const PROGRAM_ID = '7h3gXfBfYFueFVLYyfL5Qo1QGsf4GQUfW96FKVgnUsJS';
const RPC = 'https://api.devnet.solana.com';

async function main() {
  const connection = new Connection(RPC, 'confirmed');

  console.log('='.repeat(60));
  console.log('Devnet Quick Status Check');
  console.log('='.repeat(60));

  // Check program
  console.log('\n1. Program Status:');
  try {
    const programId = new PublicKey(PROGRAM_ID);
    const info = await connection.getAccountInfo(programId);
    if (info) {
      console.log(`   ✅ Program deployed: ${PROGRAM_ID}`);
      console.log(`   Balance: ${(info.lamports / 1e9).toFixed(2)} SOL`);
    } else {
      console.log(`   ❌ Program not found`);
    }
  } catch (e) {
    console.log(`   ❌ Error: ${e.message}`);
  }

  // Try to derive global config PDA
  console.log('\n2. Global Config PDA:');
  try {
    const programId = new PublicKey(PROGRAM_ID);
    const [globalConfigPDA, bump] = PublicKey.findProgramAddressSync(
      [Buffer.from('global_config')],
      programId
    );

    console.log(`   PDA: ${globalConfigPDA.toString()}`);
    console.log(`   Bump: ${bump}`);

    const configInfo = await connection.getAccountInfo(globalConfigPDA);
    if (configInfo) {
      console.log(`   ✅ Global Config exists`);
      console.log(`   Size: ${configInfo.data.length} bytes`);
      console.log(`   Owner: ${configInfo.owner.toString()}`);
    } else {
      console.log(`   ❌ Global Config not initialized`);
      console.log(`   Action: Run initialization script first`);
    }
  } catch (e) {
    console.log(`   ❌ Error: ${e.message}`);
  }

  // Check for market accounts
  console.log('\n3. Market Accounts:');
  try {
    const programId = new PublicKey(PROGRAM_ID);
    const accounts = await connection.getProgramAccounts(programId);

    console.log(`   Found ${accounts.length} program accounts total`);

    if (accounts.length > 0) {
      console.log(`\n   First 3 accounts:`);
      for (let i = 0; i < Math.min(3, accounts.length); i++) {
        const acc = accounts[i];
        console.log(`   ${i+1}. ${acc.pubkey.toString()}`);
        console.log(`      Size: ${acc.account.data.length} bytes`);
      }
    }
  } catch (e) {
    console.log(`   ❌ Error: ${e.message}`);
  }

  console.log('\n' + '='.repeat(60));
}

main().catch(console.error);
