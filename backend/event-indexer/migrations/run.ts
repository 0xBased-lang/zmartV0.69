#!/usr/bin/env ts-node
/**
 * Migration Runner
 *
 * Applies database migrations to Supabase.
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

async function runMigrations() {
  console.log('🚀 Starting database migrations...\n');

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Read migration file
  const migrationPath = path.join(__dirname, '001_initial_schema.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');

  console.log('📄 Running migration: 001_initial_schema.sql\n');

  // Split into individual statements
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  console.log(`   Found ${statements.length} SQL statements\n`);

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];

    try {
      // Execute via Supabase RPC
      const { error } = await supabase.rpc('exec_sql', {
        sql_string: statement + ';'
      });

      if (error) {
        // Try direct execution for statements that don't work via RPC
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`
          },
          body: JSON.stringify({ sql_string: statement + ';' })
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${await response.text()}`);
        }
      }

      successCount++;
      process.stdout.write(`   ✅ Statement ${i + 1}/${statements.length}\r`);

    } catch (error) {
      errorCount++;
      console.log(`\n   ❌ Statement ${i + 1} failed:`);
      console.log(`      ${statement.substring(0, 100)}...`);
      console.log(`      Error: ${error instanceof Error ? error.message : 'Unknown error'}\n`);
    }
  }

  console.log(`\n\n📊 Migration Results:`);
  console.log(`   ✅ Success: ${successCount}`);
  console.log(`   ❌ Errors: ${errorCount}`);

  if (errorCount === 0) {
    console.log('\n🎉 All migrations completed successfully!\n');

    // Verify schema
    console.log('🔍 Verifying schema...\n');

    const { data: tables, error: tablesError } = await supabase
      .from('pg_tables')
      .select('tablename')
      .eq('schemaname', 'public');

    if (tablesError) {
      console.error('   ❌ Could not verify tables');
    } else {
      console.log(`   Found ${tables?.length || 0} tables:`);
      tables?.forEach(t => console.log(`      - ${t.tablename}`));
    }

    const { data: version } = await supabase
      .from('schema_version')
      .select('version')
      .single();

    console.log(`\n   Schema version: ${version?.version || 'unknown'}\n`);

  } else {
    console.log('\n⚠️  Some migrations failed. Please check errors above.\n');
    process.exit(1);
  }
}

runMigrations().catch(error => {
  console.error('❌ Migration failed:', error);
  process.exit(1);
});
