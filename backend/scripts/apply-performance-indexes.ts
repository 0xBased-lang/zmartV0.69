/**
 * Apply Performance Indexes to Supabase
 *
 * This script creates database indexes to improve query performance.
 * Target: Reduce GET /api/markets from 2.9s to <1s
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import path from 'path';

async function applyIndexes() {
  console.log('🚀 Applying performance indexes to Supabase...\n');

  // Load environment variables
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }

  // Create Supabase client with service role (admin access)
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  console.log(`✅ Connected to Supabase: ${supabaseUrl}\n`);

  // Read migration SQL
  const sqlPath = path.join(__dirname, '../migrations/002_performance_indexes.sql');
  const sql = readFileSync(sqlPath, 'utf-8');

  console.log('📄 Migration SQL loaded:\n');
  console.log(sql);
  console.log('\n---\n');

  // Execute SQL via Supabase RPC
  // Note: Supabase doesn't allow direct SQL execution via the client API
  // We need to use the REST API or pg client instead
  console.log('⚠️  Direct SQL execution via Supabase client is not supported.');
  console.log('   Please apply the migration manually via Supabase Dashboard:\n');
  console.log('   1. Go to https://supabase.com/dashboard/project/tkkqqxepelibqjjhxxct/sql/new');
  console.log('   2. Paste the SQL from backend/migrations/002_performance_indexes.sql');
  console.log('   3. Click "Run" to apply the indexes\n');
  console.log('   Or use psql with direct connection (not pooler):\n');
  console.log('   psql "postgresql://postgres:[PASSWORD]@db.tkkqqxepelibqjjhxxct.supabase.co:5432/postgres" -f migrations/002_performance_indexes.sql\n');
}

applyIndexes().catch((error) => {
  console.error('❌ Error applying indexes:', error);
  process.exit(1);
});
