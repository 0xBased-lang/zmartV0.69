#!/usr/bin/env ts-node
/**
 * Verify Supabase Schema
 *
 * This script verifies that all required tables exist in the Supabase database.
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from backend/.env
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing Supabase credentials!');
  console.error('Expected: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in backend/.env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function verifySchema() {
  console.log('🔍 Verifying Supabase Schema...\n');
  console.log(`📍 URL: ${SUPABASE_URL}\n`);

  const requiredTables = [
    'markets',
    'trades',
    'user_positions',
    'vote_records',
    'proposal_votes',
    'dispute_votes',
    'discussions',
    'market_finalization_errors',
    'schema_version'
  ];

  let allTablesExist = true;

  for (const tableName of requiredTables) {
    try {
      const { count, error } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });

      if (error) {
        if (error.message.includes('relation') || error.message.includes('does not exist')) {
          console.log(`⚠️  Table '${tableName}': MISSING`);
          allTablesExist = false;
        } else {
          console.log(`❌ Table '${tableName}': ERROR - ${error.message}`);
          allTablesExist = false;
        }
      } else {
        console.log(`✅ Table '${tableName}': EXISTS (${count ?? 0} rows)`);
      }
    } catch (error: any) {
      console.log(`❌ Table '${tableName}': ERROR - ${error.message}`);
      allTablesExist = false;
    }
  }

  console.log('\n' + '='.repeat(50));

  if (allTablesExist) {
    console.log('✅ All required tables exist!');
    console.log('\n✅ Supabase schema is ready for Event Indexer');
    process.exit(0);
  } else {
    console.log('⚠️  Some tables are missing!');
    console.log('\n⚠️  Run: cd /Users/seman/Desktop/zmartV0.69 && supabase db push --linked');
    process.exit(1);
  }
}

verifySchema().catch((error) => {
  console.error('❌ Verification failed:', error.message);
  process.exit(1);
});
