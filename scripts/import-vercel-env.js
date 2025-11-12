#!/usr/bin/env node

/**
 * ==============================================================================
 * Vercel Environment Variables Import Script (Node.js)
 * ==============================================================================
 * This script uses Vercel CLI to programmatically import environment variables
 * from .env.vercel file to Vercel project
 * ==============================================================================
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const ENV_FILE = path.join(__dirname, '../frontend/.env.vercel');
const PROJECT_DIR = path.join(__dirname, '../frontend');
const ENVIRONMENTS = ['production', 'preview', 'development'];

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function header(message) {
  console.log('');
  log('='.repeat(80), colors.blue);
  log(`  ${message}`, colors.blue);
  log('='.repeat(80), colors.blue);
  console.log('');
}

// Check if file exists
function checkFile() {
  if (!fs.existsSync(ENV_FILE)) {
    log('❌ Error: .env.vercel file not found', colors.red);
    log(`   Expected: ${ENV_FILE}`, colors.yellow);
    process.exit(1);
  }
  log(`✅ Found environment file: ${ENV_FILE}`, colors.green);
}

// Check if Vercel CLI is installed
function checkVercelCLI() {
  try {
    execSync('vercel --version', { stdio: 'ignore' });
    log('✅ Vercel CLI is installed', colors.green);
  } catch (error) {
    log('❌ Error: Vercel CLI is not installed', colors.red);
    log('   Install with: npm i -g vercel', colors.yellow);
    process.exit(1);
  }
}

// Check if authenticated
function checkAuth() {
  try {
    const whoami = execSync('vercel whoami', { encoding: 'utf8' }).trim();
    log(`✅ Authenticated as: ${whoami}`, colors.green);
  } catch (error) {
    log('❌ Error: Not logged in to Vercel', colors.red);
    log('   Run: vercel login', colors.yellow);
    process.exit(1);
  }
}

// Parse environment file
function parseEnvFile() {
  const content = fs.readFileSync(ENV_FILE, 'utf8');
  const lines = content.split('\n');
  const variables = [];

  for (const line of lines) {
    // Skip comments and empty lines
    if (line.trim().startsWith('#') || line.trim() === '') {
      continue;
    }

    // Parse KEY=VALUE
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const [, key, value] = match;
      variables.push({ key: key.trim(), value: value.trim() });
    }
  }

  return variables;
}

// Add environment variable to Vercel (one environment at a time)
function addEnvVarSingleEnv(key, value, environment) {
  return new Promise((resolve, reject) => {
    // Create child process for vercel env add
    const child = spawn('vercel', [
      'env',
      'add',
      key,
      environment,
      '--cwd',
      PROJECT_DIR
    ], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    // Send the value when prompted
    child.stdin.write(value + '\n');
    child.stdin.end();

    let output = '';
    let errorOutput = '';

    child.stdout.on('data', (data) => {
      output += data.toString();
    });

    child.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true, output });
      } else {
        reject({ success: false, error: errorOutput || output });
      }
    });

    child.on('error', (error) => {
      reject({ success: false, error: error.message });
    });
  });
}

// Add environment variable to all environments
async function addEnvVar(key, value, environments) {
  const results = [];
  for (const env of environments) {
    try {
      await addEnvVarSingleEnv(key, value, env);
      results.push({ env, success: true });
    } catch (error) {
      results.push({ env, success: false, error });
    }
  }

  // Check if all succeeded
  const allSucceeded = results.every(r => r.success);
  if (allSucceeded) {
    return { success: true, results };
  } else {
    const failedEnvs = results.filter(r => !r.success).map(r => r.env);
    throw { success: false, error: `Failed for: ${failedEnvs.join(', ')}` };
  }
}

// Remove existing environment variable
async function removeEnvVar(key, environments) {
  for (const env of environments) {
    try {
      execSync(`vercel env rm ${key} ${env} --yes --cwd ${PROJECT_DIR}`, {
        stdio: 'ignore'
      });
    } catch (error) {
      // Ignore errors (variable might not exist)
    }
  }
  return true;
}

// Main function
async function main() {
  header('VERCEL ENVIRONMENT VARIABLES IMPORT');

  // Pre-flight checks
  log('Running pre-flight checks...', colors.blue);
  console.log('');
  checkFile();
  checkVercelCLI();
  checkAuth();
  console.log('');

  // Parse environment file
  log('Parsing environment variables...', colors.blue);
  const variables = parseEnvFile();
  log(`Found ${variables.length} environment variables`, colors.yellow);
  console.log('');

  // Show what will be imported
  log('Variables to import:', colors.blue);
  variables.forEach((v, i) => {
    const preview = v.value.length > 50 ? v.value.substring(0, 50) + '...' : v.value;
    console.log(`  ${i + 1}. ${v.key} = ${preview}`);
  });
  console.log('');

  // Confirm
  log(`This will add ${variables.length} variables to: ${ENVIRONMENTS.join(', ')}`, colors.yellow);
  log('Press Ctrl+C to cancel, or wait 5 seconds to continue...', colors.yellow);

  await new Promise(resolve => setTimeout(resolve, 5000));

  header('IMPORTING ENVIRONMENT VARIABLES');

  let success = 0;
  let failed = 0;

  // Process each variable
  for (let i = 0; i < variables.length; i++) {
    const { key, value } = variables[i];
    const progress = `[${i + 1}/${variables.length}]`;

    log(`${progress} Processing: ${key}`, colors.blue);

    try {
      // Remove existing variable first
      await removeEnvVar(key, ENVIRONMENTS);

      // Add new variable
      await addEnvVar(key, value, ENVIRONMENTS);

      log(`  ✅ Added successfully`, colors.green);
      success++;
    } catch (error) {
      log(`  ❌ Failed: ${error.error || error.message}`, colors.red);
      failed++;
    }

    console.log('');
  }

  // Summary
  header('IMPORT COMPLETE');

  log(`Total variables: ${variables.length}`, colors.yellow);
  log(`Successfully added: ${success}`, colors.green);
  log(`Failed: ${failed}`, colors.red);
  console.log('');

  if (failed === 0) {
    log('🎉 All environment variables imported successfully!', colors.green);
    console.log('');
    log('Next steps:', colors.yellow);
    log('  1. Verify variables in Vercel dashboard', colors.reset);
    log('  2. Trigger new deployment: vercel --prod', colors.blue);
    console.log('');
  } else {
    log('⚠️  Some variables failed to import', colors.red);
    log('Please check the errors above and try again', colors.yellow);
    console.log('');
  }
}

// Run main function
main().catch((error) => {
  log('❌ Fatal error:', colors.red);
  console.error(error);
  process.exit(1);
});
