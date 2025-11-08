/**
 * Check All Program Accounts on Devnet
 * Identifies account types and displays their data
 */

import { Connection, PublicKey } from '@solana/web3.js';

const PROGRAM_ID = new PublicKey('7h3gXfBfYFueFVLYyfL5Qo1QGsf4GQUfW96FKVgnUsJS');
const RPC = 'https://api.devnet.solana.com';

// Account discriminators (first 8 bytes)
const DISCRIMINATORS = {
  GLOBAL_CONFIG: '00000000000000',  // Will calculate
  MARKET: '00000000000000',  // Will calculate
  POSITION: '00000000000000',  // Will calculate
};

function getDiscriminator(data) {
  if (data.length < 8) return 'too_small';
  return data.slice(0, 8).toString('hex');
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} bytes`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

async function main() {
  const connection = new Connection(RPC, 'confirmed');

  console.log('='.repeat(60));
  console.log('Program Account Analysis');
  console.log('='.repeat(60));
  console.log(`\nProgram ID: ${PROGRAM_ID.toString()}`);

  // Get all program accounts
  console.log(`\n⏳ Fetching all program accounts...`);
  const accounts = await connection.getProgramAccounts(PROGRAM_ID);

  console.log(`\n✅ Found ${accounts.length} total accounts`);

  if (accounts.length === 0) {
    console.log(`\n📝 No accounts found. This means:`);
    console.log(`   - Global config not initialized`);
    console.log(`   - No markets created`);
    console.log(`   - No user positions`);
    return;
  }

  // Group by size to identify account types
  const bySize = {};
  const byDiscriminator = {};

  accounts.forEach(({ pubkey, account }) => {
    const size = account.data.length;
    const disc = getDiscriminator(account.data);

    if (!bySize[size]) bySize[size] = [];
    bySize[size].push({ pubkey, account });

    if (!byDiscriminator[disc]) byDiscriminator[disc] = [];
    byDiscriminator[disc].push({ pubkey, account, size });
  });

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Accounts by Size`);
  console.log(`${'='.repeat(60)}`);

  Object.keys(bySize).sort((a, b) => Number(a) - Number(b)).forEach(size => {
    const accts = bySize[size];
    console.log(`\n📦 ${formatBytes(size)} (${accts.length} account${accts.length > 1 ? 's' : ''})`);

    // Guess account type by size
    let guess = 'Unknown';
    if (size == 206) guess = 'GlobalConfig (198 + 8 discriminator)';
    else if (size == 488) guess = 'Possible UserPosition or small account';
    else if (size > 1000 && size < 20000) guess = 'Possible MarketAccount';

    console.log(`   Type Guess: ${guess}`);

    accts.forEach(({ pubkey }) => {
      console.log(`   - ${pubkey.toString()}`);
    });
  });

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Accounts by Discriminator`);
  console.log(`${'='.repeat(60)}`);

  Object.keys(byDiscriminator).forEach(disc => {
    const accts = byDiscriminator[disc];
    console.log(`\n🔑 Discriminator: ${disc}`);
    console.log(`   Count: ${accts.length}`);
    console.log(`   Sizes: ${[...new Set(accts.map(a => a.size))].join(', ')} bytes`);

    accts.slice(0, 3).forEach(({ pubkey }) => {
      console.log(`   - ${pubkey.toString()}`);
    });

    if (accts.length > 3) {
      console.log(`   ... and ${accts.length - 3} more`);
    }
  });

  // Check for global config specifically
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Global Config Search`);
  console.log(`${'='.repeat(60)}`);

  const [globalConfigPDA, bump] = PublicKey.findProgramAddressSync(
    [Buffer.from('global-config')],
    PROGRAM_ID
  );

  console.log(`\nExpected PDA: ${globalConfigPDA.toString()}`);
  console.log(`Expected Bump: ${bump}`);

  const globalConfigAccount = accounts.find(a => a.pubkey.toString() === globalConfigPDA.toString());

  if (globalConfigAccount) {
    console.log(`\n✅ Global Config FOUND at expected PDA!`);
    console.log(`   Size: ${globalConfigAccount.account.data.length} bytes`);
    console.log(`   Owner: ${globalConfigAccount.account.owner.toString()}`);
  } else {
    console.log(`\n❌ Global Config NOT at expected PDA`);
    console.log(`   Checking for 206-byte accounts (GlobalConfig size)...`);

    const globalConfigs = accounts.filter(a => a.account.data.length === 206);
    if (globalConfigs.length > 0) {
      console.log(`\n   Found ${globalConfigs.length} account(s) with GlobalConfig size:`);
      globalConfigs.forEach(({ pubkey }) => {
        console.log(`   - ${pubkey.toString()}`);
      });
    }
  }

  // Check for markets
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Market Account Search`);
  console.log(`${'='.repeat(60)}`);

  // Markets are typically larger (>1KB) and have specific discriminator
  const potentialMarkets = accounts.filter(a =>
    a.account.data.length > 500 &&
    a.account.data.length < 20000
  );

  if (potentialMarkets.length > 0) {
    console.log(`\n📊 Found ${potentialMarkets.length} potential market account(s):`);

    potentialMarkets.forEach(({ pubkey, account }, i) => {
      console.log(`\n   Market ${i + 1}:`);
      console.log(`      Address: ${pubkey.toString()}`);
      console.log(`      Size: ${formatBytes(account.data.length)}`);
      console.log(`      Discriminator: ${getDiscriminator(account.data)}`);

      // Try to parse question (assuming it's stored as a string after some initial fields)
      // This is a rough heuristic
      try {
        const data = account.data;
        // Skip discriminator (8) + pubkeys + numbers, look for string data
        const offset = 100; // Rough estimate
        const questionBytes = data.slice(offset, offset + 200);
        const question = questionBytes.toString('utf8').replace(/\0/g, '').trim();

        if (question.length > 5 && question.length < 150) {
          console.log(`      Question (guess): "${question.substring(0, 80)}..."`);
        }
      } catch (e) {
        // Ignore parse errors
      }
    });
  } else {
    console.log(`\n❌ No market accounts found`);
    console.log(`   Action: Create a test market first`);
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Summary`);
  console.log(`${'='.repeat(60)}`);
  console.log(`\n📊 Account Breakdown:`);
  console.log(`   Total: ${accounts.length}`);
  console.log(`   Global Configs (206 bytes): ${accounts.filter(a => a.account.data.length === 206).length}`);
  console.log(`   Potential Markets (>500 bytes): ${potentialMarkets.length}`);
  console.log(`   Other Accounts: ${accounts.length - potentialMarkets.length - accounts.filter(a => a.account.data.length === 206).length}`);

  console.log(`\n💡 Next Steps:`);
  if (globalConfigAccount) {
    console.log(`   ✅ Global config ready`);
  } else {
    console.log(`   ⏳ Initialize global config first`);
  }

  if (potentialMarkets.length > 0) {
    console.log(`   ✅ Markets available for testing`);
    console.log(`   → Test frontend with market: ${potentialMarkets[0].pubkey.toString()}`);
  } else {
    console.log(`   ⏳ Create a test market`);
  }

  console.log(`${'='.repeat(60)}\n`);
}

main().catch(console.error);
