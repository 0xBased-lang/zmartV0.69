#!/usr/bin/env ts-node
/**
 * Apply Missing Tables Migration
 *
 * This script applies the 20251108000000_add_missing_tables.sql migration
 * to add tables required by the event indexer.
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment');
  process.exit(1);
}

// Create Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function applyMigration() {
  console.log('============================================================');
  console.log('🚀 Applying Missing Tables Migration');
  console.log('============================================================');
  console.log(`📦 Project: ${SUPABASE_URL}`);
  console.log(`📅 Date: ${new Date().toLocaleString()}`);
  console.log('');

  try {
    // Read migration file
    const migrationPath = path.join(__dirname, '../../supabase/migrations/20251108000000_add_missing_tables.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    console.log('📝 Migration file loaded:');
    console.log('   20251108000000_add_missing_tables.sql');
    console.log('   Size: ' + (migrationSQL.length / 1024).toFixed(2) + ' KB');
    console.log('');

    // Parse and execute SQL statements
    // Split by semicolon but be careful with statements inside strings
    const statements = migrationSQL
      .split(/;(?=(?:[^']*'[^']*')*[^']*$)/)
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`📊 Found ${statements.length} SQL statements to execute`);
    console.log('');

    let successCount = 0;
    let errorCount = 0;

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];

      // Skip pure comment lines
      if (statement.startsWith('--')) continue;

      // Extract first line for logging (remove comments)
      const firstLine = statement.split('\n')[0].replace(/--.*/, '').trim();
      const shortDesc = firstLine.substring(0, 60) + (firstLine.length > 60 ? '...' : '');

      process.stdout.write(`[${i+1}/${statements.length}] ${shortDesc} ... `);

      // Execute via raw SQL using the Supabase Management API
      const { data, error } = await supabase.rpc('exec_sql', {
        query: statement
      }).single();

      if (error && !error.message.includes('exec_sql')) {
        // Try direct execution via raw query
        try {
          // Use fetch to call Supabase's SQL endpoint directly
          const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/`, {
            method: 'POST',
            headers: {
              'apikey': SUPABASE_SERVICE_ROLE_KEY,
              'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=minimal'
            },
            body: JSON.stringify({
              query: statement
            })
          });

          if (response.ok) {
            console.log('✅');
            successCount++;
          } else {
            // If RPC doesn't exist, execute as direct SQL
            // We'll use pg-query endpoint if available
            console.log('⚠️ (RPC unavailable, statement may need manual execution)');
            errorCount++;
          }
        } catch (e) {
          console.log('❌');
          console.error(`   Error: ${e}`);
          errorCount++;
        }
      } else if (error) {
        console.log('❌');
        console.error(`   Error: ${error.message}`);
        errorCount++;
      } else {
        console.log('✅');
        successCount++;
      }
    }

    console.log('');
    console.log('============================================================');
    console.log('📊 Migration Summary');
    console.log('============================================================');
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Failed: ${errorCount}`);
    console.log(`📁 Total: ${statements.length}`);
    console.log('============================================================');

    // Since direct SQL execution via RPC might not be available,
    // let's use a different approach - test if tables were created
    console.log('\n🔍 Verifying migration results...\n');

    // Check if new tables exist
    const tablesToCheck = ['schema_version', 'events', 'resolutions', 'disputes', 'proposals'];
    let tablesCreated = 0;

    for (const tableName of tablesToCheck) {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(0); // Just check if table exists

      if (!error || error.code === 'PGRST116') { // PGRST116 = no rows returned (table exists but empty)
        console.log(`  ✅ Table '${tableName}' exists`);
        tablesCreated++;
      } else if (error.code === 'PGRST204' || error.code === 'PGRST205') {
        console.log(`  ❌ Table '${tableName}' not found`);
      } else {
        console.log(`  ⚠️ Table '${tableName}' status unknown:`, error.code);
      }
    }

    console.log('');
    console.log(`Tables verified: ${tablesCreated}/${tablesToCheck.length}`);

    if (tablesCreated === 0) {
      console.log('\n⚠️ IMPORTANT: Tables were not created automatically.');
      console.log('This might be because Supabase RPC method is not available.');
      console.log('\n📋 Manual Steps Required:');
      console.log('1. Go to: https://app.supabase.com/project/tkkqqxepelibqjjhxxct/editor');
      console.log('2. Click "SQL Editor" in the left sidebar');
      console.log('3. Click "New query"');
      console.log('4. Copy and paste the contents of:');
      console.log('   supabase/migrations/20251108000000_add_missing_tables.sql');
      console.log('5. Click "Run" to execute the migration');
      console.log('\nThe migration file adds these tables:');
      console.log('  - schema_version (for tracking migrations)');
      console.log('  - events (audit log for all blockchain events)');
      console.log('  - resolutions (market resolution tracking)');
      console.log('  - disputes (dispute tracking)');
      console.log('  - proposals (proposal tracking)');
      console.log('  - Plus missing columns in trades, positions, and users tables');
    } else if (tablesCreated === tablesToCheck.length) {
      console.log('\n✅ Migration completed successfully!');
      console.log('All tables have been created.');
    } else {
      console.log('\n⚠️ Partial migration detected.');
      console.log('Some tables were created but not all.');
      console.log('Please check the Supabase dashboard for details.');
    }

    console.log('\n============================================================');
    console.log('✅ Migration script completed');
    console.log('============================================================\n');

  } catch (error) {
    console.error('\n❌ Migration failed:');
    console.error(error);
    process.exit(1);
  }
}

// Run the migration
applyMigration();