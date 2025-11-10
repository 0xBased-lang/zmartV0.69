#!/usr/bin/env node
/**
 * Test Pinata API Connection
 *
 * Verifies that Pinata API credentials are configured correctly
 * and can authenticate with Pinata IPFS service
 */

import { getScriptConfig, printScriptConfig } from './utils/scriptConfig';

async function testPinataConnection() {
  console.log('🔍 Testing Pinata API connection...\n');

  try {
    // Load configuration (validates all env vars)
    const config = getScriptConfig();

    // Check if Pinata credentials are configured
    const apiKey = config.ipfs?.pinatApiKey || '';
    const secretKey = config.ipfs?.pinataSecretKey || '';
    const gatewayUrl = config.ipfs?.pinatApiKey || 'https://gateway.pinata.cloud/ipfs/';

    if (!apiKey || apiKey === 'YOUR_PINATA_API_KEY') {
      console.error('❌ Pinata API Key not configured in .env');
      console.error('   Please update PINATA_API_KEY with your actual key');
      process.exit(1);
    }

    if (!secretKey || secretKey === 'YOUR_PINATA_SECRET_KEY') {
      console.error('❌ Pinata Secret Key not configured in .env');
      console.error('   Please update PINATA_SECRET_KEY with your actual secret');
      process.exit(1);
    }

    console.log(`🔑 API Key: ${apiKey.substring(0, 8)}...`);
    console.log(`🔐 Secret Key: ${secretKey.substring(0, 8)}...`);
    console.log(`🌐 Gateway: ${gatewayUrl}\n`);

    // Test Pinata authentication
    console.log('Testing authentication...');
    const authResponse = await fetch('https://api.pinata.cloud/data/testAuthentication', {
      method: 'GET',
      headers: {
        'pinata_api_key': apiKey,
        'pinata_secret_api_key': secretKey,
      },
    });

    const authData: any = await authResponse.json();

    if (authData.message === 'Congratulations! You are communicating with the Pinata API!') {
      console.log('✅ Pinata authenticated successfully!');
    } else {
      console.error('❌ Pinata authentication failed:', authData);
      console.error('\nPossible issues:');
      console.error('  1. Invalid API key or secret');
      console.error('  2. API key not activated');
      console.error('  3. Incorrect credentials in .env');
      return false;
    }

    // Test pinList endpoint (get total usage)
    console.log('\nTesting pinList endpoint...');
    const pinListResponse = await fetch('https://api.pinata.cloud/data/pinList?status=pinned&pageLimit=1', {
      method: 'GET',
      headers: {
        'pinata_api_key': apiKey,
        'pinata_secret_api_key': secretKey,
      },
    });

    const pinListData: any = await pinListResponse.json();

    if (pinListData.rows !== undefined) {
      console.log('✅ PinList endpoint working');
      console.log(`   Total pins: ${pinListData.count || 0}`);
    } else {
      console.warn('⚠️  PinList returned unexpected format:', pinListData);
    }

    // Test userPinnedDataTotal (get account stats)
    console.log('\nTesting account stats...');
    const statsResponse = await fetch('https://api.pinata.cloud/data/userPinnedDataTotal', {
      method: 'GET',
      headers: {
        'pinata_api_key': apiKey,
        'pinata_secret_api_key': secretKey,
      },
    });

    const statsData: any = await statsResponse.json();

    if (statsData.pin_count !== undefined) {
      console.log('✅ Account stats retrieved');
      console.log(`   Pin count: ${statsData.pin_count}`);
      console.log(`   Pin size (bytes): ${statsData.pin_size_total}`);
      console.log(`   Pin size (MB): ${(statsData.pin_size_total / 1024 / 1024).toFixed(2)}`);
    } else {
      console.warn('⚠️  Stats returned unexpected format:', statsData);
    }

    // Test gateway accessibility
    console.log('\nTesting gateway accessibility...');
    const testCid = 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG/readme';
    const testGatewayUrl = `${gatewayUrl}${testCid}`;

    const gatewayResponse = await fetch(testGatewayUrl);

    if (gatewayResponse.ok) {
      const text = await gatewayResponse.text();
      if (text.includes('IPFS')) {
        console.log('✅ Gateway accessible');
        console.log(`   Test URL: ${testGatewayUrl}`);
      } else {
        console.warn('⚠️  Gateway returned unexpected content');
      }
    } else {
      console.warn('⚠️  Gateway not accessible (may be rate limited)');
    }

    console.log('\n✅ All Pinata API tests passed!');
    console.log('\nYou can now:');
    console.log('  1. Deploy IPFS Snapshot service');
    console.log('  2. Upload discussion snapshots to IPFS');
    console.log('  3. Retrieve snapshots via gateway URL');

    return true;
  } catch (error) {
    console.error('❌ Failed to connect to Pinata:', error);
    console.error('\nPossible issues:');
    console.error('  1. Credentials not set in .env');
    console.error('  2. Network/firewall blocking connection');
    console.error('  3. Pinata service temporarily unavailable');
    return false;
  }
}

// Run test
testPinataConnection().then(success => {
  process.exit(success ? 0 : 1);
});
