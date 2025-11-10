import { Connection, PublicKey } from '@solana/web3.js';

const PROGRAM_ID = new PublicKey('7h3gXfBfYFueFVLYyfL5Qo1QGsf4GQUfW96FKVgnUsJS');
const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

async function checkGlobalConfig() {
  try {
    // Derive GlobalConfig PDA
    const [globalConfigPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('global_config')],
      PROGRAM_ID
    );

    console.log('GlobalConfig PDA:', globalConfigPda.toString());

    // Check if account exists
    const accountInfo = await connection.getAccountInfo(globalConfigPda);

    if (accountInfo) {
      console.log('✅ GlobalConfig exists');
      console.log('Data length:', accountInfo.data.length, 'bytes');
      console.log('Owner:', accountInfo.owner.toString());
      console.log('Lamports:', accountInfo.lamports / 1e9, 'SOL');
    } else {
      console.log('❌ GlobalConfig NOT initialized');
      console.log('Need to initialize GlobalConfig account');
    }
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

checkGlobalConfig();
