#!/usr/bin/env node
/**
 * Test Helius RPC Connection
 *
 * Verifies that Helius API key is configured correctly
 * and can connect to Solana devnet
 */

import { config } from '../src/config';

async function testHeliusConnection() {
  console.log('🔍 Testing Helius RPC connection...\n');

  try {
    // Check if RPC URL is configured
    if (!config.solana.rpcUrl || config.solana.rpcUrl.includes('YOUR_HELIUS_API_KEY')) {
      console.error('❌ Helius RPC URL not configured in .env');
      console.error('   Please update HELIUS_RPC_URL with your actual API key');
      process.exit(1);
    }

    console.log(`📡 RPC URL: ${config.solana.rpcUrl.replace(/api-key=.+/, 'api-key=***')}`);

    // Test RPC endpoint with getSlot
    const response = await fetch(config.solana.rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getSlot',
      }),
    });

    const data: any = await response.json();

    if (data.result !== undefined) {
      console.log('✅ Helius RPC connected successfully!');
      console.log(`   Current slot: ${data.result}`);
      console.log(`   Network: Devnet`);

      // Test getVersion
      const versionResponse = await fetch(config.solana.rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 2,
          method: 'getVersion',
        }),
      });

      const versionData: any = await versionResponse.json();

      if (versionData.result) {
        console.log(`   Solana version: ${versionData.result['solana-core']}`);
      }

      console.log('\n✅ All Helius RPC tests passed!');
      return true;
    } else {
      console.error('❌ Helius RPC error:', data.error);
      console.error('\nPossible issues:');
      console.error('  1. Invalid API key');
      console.error('  2. API key not activated');
      console.error('  3. Network connectivity issue');
      return false;
    }
  } catch (error) {
    console.error('❌ Failed to connect to Helius:', error);
    console.error('\nPossible issues:');
    console.error('  1. API key not set in .env');
    console.error('  2. Network/firewall blocking connection');
    console.error('  3. Helius service temporarily unavailable');
    return false;
  }
}

// Run test
testHeliusConnection().then(success => {
  process.exit(success ? 0 : 1);
});
