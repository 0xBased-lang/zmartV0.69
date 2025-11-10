#!/usr/bin/env ts-node
/**
 * Test Event Indexer Webhook
 *
 * Simulates a Helius webhook to test the Event Indexer end-to-end flow.
 */
import axios from 'axios';
import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const EVENT_INDEXER_URL = 'http://localhost:4002';
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/**
 * Sample Helius webhook payload for a market creation event
 */
const sampleMarketCreationPayload = {
  accountData: [
    {
      account: '7h3gXfBfYFueFVLYyfL5Qo1QGsf4GQUfW96FKVgnUsJS',
      nativeBalanceChange: 0,
      tokenBalanceChanges: []
    }
  ],
  description: 'Test market creation transaction',
  type: 'UNKNOWN',
  source: 'SYSTEM_PROGRAM',
  fee: 5000,
  feePayer: '4MkybTASDtmzQnfUWztHmfgyHgBREw74eTKipVADqQLA',
  signature: 'test-signature-' + Date.now(),
  slot: 123456789,
  timestamp: Math.floor(Date.now() / 1000),
  nativeTransfers: [],
  tokenTransfers: [],
  transactionError: null,
  instructions: [
    {
      accounts: [],
      data: 'test-instruction-data',
      programId: '7h3gXfBfYFueFVLYyfL5Qo1QGsf4GQUfW96FKVgnUsJS',
      innerInstructions: []
    }
  ],
  events: {}
};

async function testHealthCheck() {
  console.log('\n🔍 Testing Event Indexer Health Check...\n');

  try {
    const response = await axios.get(`${EVENT_INDEXER_URL}/health`);
    console.log('✅ Health Check Response:');
    console.log(JSON.stringify(response.data, null, 2));
    return true;
  } catch (error: any) {
    console.error('❌ Health check failed:', error.message);
    return false;
  }
}

async function testWebhookEndpoint() {
  console.log('\n📨 Testing Webhook Endpoint...\n');

  try {
    const response = await axios.post(
      `${EVENT_INDEXER_URL}/api/webhooks/helius`,
      [sampleMarketCreationPayload], // Helius sends array of transactions
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ Webhook Response:');
    console.log(`Status: ${response.status}`);
    console.log(JSON.stringify(response.data, null, 2));
    return true;
  } catch (error: any) {
    if (axios.isAxiosError(error)) {
      console.error('❌ Webhook request failed:');
      console.error(`Status: ${error.response?.status}`);
      console.error(`Error: ${JSON.stringify(error.response?.data, null, 2)}`);
    } else {
      console.error('❌ Unexpected error:', error.message);
    }
    return false;
  }
}

async function verifyDatabaseUpdates() {
  console.log('\n🔍 Verifying Database Updates...\n');

  try {
    // Check markets table
    const { data: markets, error: marketsError } = await supabase
      .from('markets')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (marketsError) {
      console.error('❌ Error querying markets:', marketsError.message);
    } else {
      console.log(`✅ Found ${markets?.length || 0} recent markets`);
      if (markets && markets.length > 0) {
        console.log('Latest market:', {
          id: markets[0].id,
          market_identifier: markets[0].market_identifier,
          state: markets[0].state,
          created_at: markets[0].created_at
        });
      }
    }

    // Check trades table
    const { data: trades, error: tradesError } = await supabase
      .from('trades')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (tradesError) {
      console.error('❌ Error querying trades:', tradesError.message);
    } else {
      console.log(`✅ Found ${trades?.length || 0} recent trades`);
    }

    return true;
  } catch (error: any) {
    console.error('❌ Database verification failed:', error.message);
    return false;
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('ZMART Event Indexer End-to-End Test');
  console.log('='.repeat(60));

  // Test 1: Health Check
  const healthOk = await testHealthCheck();
  if (!healthOk) {
    console.error('\n❌ Health check failed. Make sure Event Indexer is running:');
    console.error('   npm run dev');
    process.exit(1);
  }

  // Test 2: Webhook Endpoint
  const webhookOk = await testWebhookEndpoint();
  if (!webhookOk) {
    console.error('\n❌ Webhook test failed');
    // Continue anyway to check database
  }

  // Test 3: Database Verification
  await verifyDatabaseUpdates();

  console.log('\n' + '='.repeat(60));
  console.log('Test Complete');
  console.log('='.repeat(60));

  if (healthOk && webhookOk) {
    console.log('\n✅ All tests passed!');
    console.log('\nNext steps:');
    console.log('1. Register Helius webhook (when rate limit clears)');
    console.log('2. Create a real market on devnet');
    console.log('3. Verify real events flow through the system');
  } else {
    console.log('\n⚠️  Some tests failed. Check logs above.');
  }
}

main().catch((error) => {
  console.error('\n❌ Test failed:', error);
  process.exit(1);
});
