/**
 * Supabase Schema Deployment Script
 *
 * Deploys migrations to remote Supabase project using Management API.
 *
 * Usage:
 *   npm run deploy:supabase
 *
 * Prerequisites:
 *   - SUPABASE_ACCESS_TOKEN in .env
 *   - SUPABASE_PROJECT_REF in .env
 *
 * Get your access token from: https://app.supabase.com/account/tokens
 */

import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env.local') });

const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const SUPABASE_PROJECT_REF = process.env.SUPABASE_PROJECT_REF;
const MIGRATION_DIR = path.join(__dirname, '../../supabase/migrations');

interface MigrationFile {
  name: string;
  path: string;
  sql: string;
}

/**
 * Get all migration files in chronological order
 */
function getMigrationFiles(): MigrationFile[] {
  const files = fs.readdirSync(MIGRATION_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort(); // Already sorted by timestamp prefix

  return files.map(name => ({
    name,
    path: path.join(MIGRATION_DIR, name),
    sql: fs.readFileSync(path.join(MIGRATION_DIR, name), 'utf-8')
  }));
}

/**
 * Execute SQL on remote Supabase database
 */
async function executeSql(sql: string): Promise<void> {
  const url = `https://api.supabase.com/v1/projects/${SUPABASE_PROJECT_REF}/database/query`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to execute SQL: ${response.status} ${error}`);
  }

  const result = await response.json();
  console.log('✅ SQL executed successfully');
  return result;
}

/**
 * Check if migration has already been applied
 */
async function isMigrationApplied(migrationName: string): Promise<boolean> {
  const checkSql = `
    SELECT EXISTS (
      SELECT 1 FROM schema_version
      WHERE version = '${migrationName.replace('.sql', '')}'
    ) as applied;
  `;

  try {
    const result = await executeSql(checkSql);
    return result[0]?.applied === true;
  } catch (error) {
    // If schema_version table doesn't exist, no migrations have been applied
    return false;
  }
}

/**
 * Record migration in schema_version table
 */
async function recordMigration(migrationName: string, description: string): Promise<void> {
  const insertSql = `
    INSERT INTO schema_version (version, description)
    VALUES (
      '${migrationName.replace('.sql', '')}',
      '${description.replace(/'/g, "''")}'
    )
    ON CONFLICT (version) DO NOTHING;
  `;

  await executeSql(insertSql);
}

/**
 * Main deployment function
 */
async function deploySchema(): Promise<void> {
  console.log('🚀 Starting Supabase Schema Deployment\n');

  // Validate environment
  if (!SUPABASE_ACCESS_TOKEN) {
    console.error('❌ SUPABASE_ACCESS_TOKEN not set in .env.local');
    console.error('   Get your token from: https://app.supabase.com/account/tokens');
    process.exit(1);
  }

  if (!SUPABASE_PROJECT_REF) {
    console.error('❌ SUPABASE_PROJECT_REF not set in .env.local');
    console.error('   Find your project ref in: https://app.supabase.com/project/_/settings/general');
    process.exit(1);
  }

  console.log(`📦 Project: ${SUPABASE_PROJECT_REF}`);
  console.log(`📁 Migration Directory: ${MIGRATION_DIR}\n`);

  // Get migration files
  const migrations = getMigrationFiles();
  console.log(`Found ${migrations.length} migration files:\n`);

  migrations.forEach((m, i) => {
    console.log(`  ${i + 1}. ${m.name}`);
  });

  console.log('\n🔍 Checking which migrations need to be applied...\n');

  // Apply each migration
  let appliedCount = 0;
  let skippedCount = 0;

  for (const migration of migrations) {
    const isApplied = await isMigrationApplied(migration.name);

    if (isApplied) {
      console.log(`⏭️  Skipping ${migration.name} (already applied)`);
      skippedCount++;
      continue;
    }

    console.log(`\n📝 Applying ${migration.name}...`);

    try {
      // Execute migration SQL
      await executeSql(migration.sql);

      // Record in schema_version
      const description = extractDescription(migration.sql);
      await recordMigration(migration.name, description);

      console.log(`✅ Applied ${migration.name}`);
      appliedCount++;
    } catch (error) {
      console.error(`\n❌ Failed to apply ${migration.name}:`);
      console.error(error);
      console.error('\n⚠️  Deployment stopped. Fix the error and re-run.\n');
      process.exit(1);
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Deployment Summary');
  console.log('='.repeat(60));
  console.log(`✅ Applied: ${appliedCount}`);
  console.log(`⏭️  Skipped: ${skippedCount}`);
  console.log(`📁 Total: ${migrations.length}`);
  console.log('='.repeat(60));

  if (appliedCount > 0) {
    console.log('\n✅ Schema deployment successful!');
    console.log('\n🔍 Verifying deployment...\n');

    // Verify schema_version table
    const verifySql = 'SELECT * FROM schema_version ORDER BY applied_at DESC LIMIT 5;';
    const versions = await executeSql(verifySql);

    console.log('Latest migrations:');
    versions.forEach((v: any) => {
      console.log(`  - ${v.version} (${new Date(v.applied_at).toLocaleString()})`);
    });
  } else {
    console.log('\n✅ All migrations already applied - schema is up to date!');
  }

  console.log('\n🎉 Deployment complete!\n');
}

/**
 * Extract description from migration SQL comments
 */
function extractDescription(sql: string): string {
  const match = sql.match(/-- Description: (.+)/);
  if (match) {
    return match[1].trim();
  }

  // Fallback: use first non-empty comment line
  const lines = sql.split('\n');
  for (const line of lines) {
    if (line.trim().startsWith('--') && line.length > 3) {
      return line.replace(/^--\s*/, '').trim();
    }
  }

  return 'Migration';
}

// Run deployment
deploySchema().catch(error => {
  console.error('\n❌ Deployment failed:');
  console.error(error);
  process.exit(1);
});
