// ============================================================
// Scripts Configuration Module
// ============================================================
// Purpose: Validate and provide configuration for deployment/test scripts
// Pattern Prevention: #3 (Reactive Crisis) - Fail-fast validation
// Reference: docs/ENVIRONMENT_VALIDATION_ARCHITECTURE.md - Layer 2

import Joi from 'joi';
import dotenv from 'dotenv';
import path from 'path';
import { PublicKey } from '@solana/web3.js';

/**
 * Script configuration schema
 * Different from backend services - scripts have different requirements
 */
const scriptEnvSchema = Joi.object({
  // Node Environment
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development')
    .description('Node environment'),

  // Solana Configuration
  SOLANA_RPC_URL: Joi.string()
    .uri()
    .default('https://api.devnet.solana.com')
    .description('Solana RPC endpoint'),

  SOLANA_PROGRAM_ID_CORE: Joi.string()
    .required()
    .description('zmart-core program ID'),

  SOLANA_PROGRAM_ID_PROPOSAL: Joi.string()
    .optional()
    .description('zmart-proposal program ID (optional for some scripts)'),

  BACKEND_KEYPAIR_PATH: Joi.string()
    .optional()
    .description('Path to backend authority keypair (optional for read-only scripts)'),

  // Supabase Configuration (optional for scripts that don't need DB)
  SUPABASE_URL: Joi.string()
    .uri()
    .optional()
    .description('Supabase project URL'),

  SUPABASE_ANON_KEY: Joi.string()
    .optional()
    .description('Supabase anonymous key'),

  SUPABASE_SERVICE_ROLE_KEY: Joi.string()
    .optional()
    .description('Supabase service role key'),

  // Redis Configuration (optional)
  REDIS_URL: Joi.string()
    .uri()
    .optional()
    .description('Redis connection URL'),

  // IPFS Configuration (optional)
  IPFS_PROJECT_ID: Joi.string()
    .optional()
    .description('Infura IPFS project ID'),

  IPFS_PROJECT_SECRET: Joi.string()
    .optional()
    .description('Infura IPFS project secret'),

  PINATA_API_KEY: Joi.string()
    .optional()
    .description('Pinata API key'),

  PINATA_SECRET_KEY: Joi.string()
    .optional()
    .description('Pinata secret key'),

  // Helius Configuration (optional)
  HELIUS_RPC_URL: Joi.string()
    .uri()
    .optional()
    .description('Helius RPC URL'),

  HELIUS_WEBHOOK_SECRET: Joi.string()
    .optional()
    .description('Helius webhook secret'),

  // Script-Specific Flags
  DRY_RUN: Joi.boolean()
    .default(false)
    .description('Dry run mode (no actual transactions)'),

  VERBOSE: Joi.boolean()
    .default(false)
    .description('Verbose logging'),

  SKIP_VALIDATION: Joi.boolean()
    .default(false)
    .description('Skip validation checks (dangerous!)'),

  FORCE: Joi.boolean()
    .default(false)
    .description('Force operation without confirmation'),

  // Logging
  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'info', 'debug')
    .default('info')
    .description('Logging level'),

  // Allow other environment variables
}).unknown(true);

/**
 * Validated script configuration
 */
export interface ScriptConfig {
  node: {
    env: 'development' | 'test' | 'production';
    isDevelopment: boolean;
    isProduction: boolean;
    isTest: boolean;
  };
  solana: {
    rpcUrl: string;
    programIds: {
      core: string;
      proposal?: string;
    };
    backendKeypairPath?: string;
  };
  supabase?: {
    url: string;
    anonKey: string;
    serviceRoleKey: string;
  };
  redis?: {
    url: string;
  };
  ipfs?: {
    projectId?: string;
    projectSecret?: string;
    pinatApiKey?: string;
    pinataSecretKey?: string;
  };
  helius?: {
    rpcUrl?: string;
    webhookSecret?: string;
  };
  flags: {
    dryRun: boolean;
    verbose: boolean;
    skipValidation: boolean;
    force: boolean;
  };
  logging: {
    level: 'error' | 'warn' | 'info' | 'debug';
  };
}

/**
 * Cached configuration (singleton pattern)
 */
let cachedConfig: ScriptConfig | null = null;

/**
 * Get validated script configuration
 * Validates environment variables and returns type-safe config object
 *
 * @returns Validated configuration
 * @throws Error if validation fails
 *
 * @example
 * const config = getScriptConfig();
 * const programId = new PublicKey(config.solana.programIds.core);
 */
export function getScriptConfig(): ScriptConfig {
  // Return cached config if available
  if (cachedConfig) {
    return cachedConfig;
  }

  // Load .env file from backend directory
  dotenv.config({ path: path.join(__dirname, '../../.env') });

  // Validate environment variables
  const { error, value: envVars } = scriptEnvSchema.validate(process.env);

  if (error) {
    console.error('\n❌ Script configuration validation failed:\n');
    console.error(`   ${error.message}\n`);
    console.error('💡 Please check your .env file or environment variables.\n');
    console.error('📖 See .env.example for required variables.\n');
    process.exit(1);
  }

  // Build type-safe config object
  cachedConfig = {
    node: {
      env: envVars.NODE_ENV as 'development' | 'test' | 'production',
      isDevelopment: envVars.NODE_ENV === 'development',
      isProduction: envVars.NODE_ENV === 'production',
      isTest: envVars.NODE_ENV === 'test',
    },
    solana: {
      rpcUrl: envVars.SOLANA_RPC_URL as string,
      programIds: {
        core: envVars.SOLANA_PROGRAM_ID_CORE as string,
        proposal: envVars.SOLANA_PROGRAM_ID_PROPOSAL as string | undefined,
      },
      backendKeypairPath: envVars.BACKEND_KEYPAIR_PATH as string | undefined,
    },
    supabase: envVars.SUPABASE_URL ? {
      url: envVars.SUPABASE_URL as string,
      anonKey: envVars.SUPABASE_ANON_KEY as string,
      serviceRoleKey: envVars.SUPABASE_SERVICE_ROLE_KEY as string,
    } : undefined,
    redis: envVars.REDIS_URL ? {
      url: envVars.REDIS_URL as string,
    } : undefined,
    ipfs: (envVars.IPFS_PROJECT_ID || envVars.PINATA_API_KEY) ? {
      projectId: envVars.IPFS_PROJECT_ID as string | undefined,
      projectSecret: envVars.IPFS_PROJECT_SECRET as string | undefined,
      pinatApiKey: envVars.PINATA_API_KEY as string | undefined,
      pinataSecretKey: envVars.PINATA_SECRET_KEY as string | undefined,
    } : undefined,
    helius: envVars.HELIUS_RPC_URL ? {
      rpcUrl: envVars.HELIUS_RPC_URL as string,
      webhookSecret: envVars.HELIUS_WEBHOOK_SECRET as string | undefined,
    } : undefined,
    flags: {
      dryRun: envVars.DRY_RUN as boolean,
      verbose: envVars.VERBOSE as boolean,
      skipValidation: envVars.SKIP_VALIDATION as boolean,
      force: envVars.FORCE as boolean,
    },
    logging: {
      level: envVars.LOG_LEVEL as 'error' | 'warn' | 'info' | 'debug',
    },
  };

  return cachedConfig;
}

/**
 * Validate specific requirements for a script
 * Throws error if required config is missing
 *
 * @param requirements - Required config sections
 * @throws Error if requirements not met
 *
 * @example
 * validateScriptRequirements(['supabase', 'solana.backendKeypairPath']);
 */
export function validateScriptRequirements(requirements: string[]): void {
  const config = getScriptConfig();

  const missing: string[] = [];

  requirements.forEach((requirement) => {
    // Handle nested requirements (e.g., 'solana.backendKeypairPath')
    const parts = requirement.split('.');
    let current: any = config;

    for (const part of parts) {
      if (current && part in current) {
        current = current[part];
      } else {
        missing.push(requirement);
        break;
      }
    }

    // Check if final value is undefined
    if (current === undefined) {
      missing.push(requirement);
    }
  });

  if (missing.length > 0) {
    console.error('\n❌ Script requirements not met:\n');
    missing.forEach((req) => {
      console.error(`   • Missing: ${req}`);
    });
    console.error('\n💡 This script requires additional configuration.\n');
    console.error('📖 See .env.example for required variables.\n');
    process.exit(1);
  }
}

/**
 * Print script configuration (for debugging)
 * Hides sensitive values
 */
export function printScriptConfig(): void {
  const config = getScriptConfig();

  console.log('\n📋 Script Configuration:\n');
  console.log(`   Environment: ${config.node.env}`);
  console.log(`   Solana RPC: ${config.solana.rpcUrl}`);
  console.log(`   Core Program: ${config.solana.programIds.core}`);

  if (config.solana.programIds.proposal) {
    console.log(`   Proposal Program: ${config.solana.programIds.proposal}`);
  }

  if (config.solana.backendKeypairPath) {
    console.log(`   Backend Keypair: ${config.solana.backendKeypairPath}`);
  }

  if (config.supabase) {
    console.log(`   Supabase: ${config.supabase.url}`);
  }

  if (config.redis) {
    console.log(`   Redis: ${config.redis.url}`);
  }

  console.log(`\n   Flags:`);
  console.log(`     Dry Run: ${config.flags.dryRun}`);
  console.log(`     Verbose: ${config.flags.verbose}`);
  console.log(`     Skip Validation: ${config.flags.skipValidation}`);
  console.log(`     Force: ${config.flags.force}`);

  console.log(`   Log Level: ${config.logging.level}\n`);
}

/**
 * Ask for user confirmation before running script
 * Skipped if FORCE=true or DRY_RUN=true
 *
 * @param message - Confirmation message
 * @returns True if confirmed, false otherwise
 */
export async function confirmScriptExecution(message: string): Promise<boolean> {
  const config = getScriptConfig();

  // Skip confirmation if force flag set
  if (config.flags.force) {
    console.log(`⚡ Force mode enabled, skipping confirmation\n`);
    return true;
  }

  // Skip confirmation in dry run mode
  if (config.flags.dryRun) {
    console.log(`🔍 Dry run mode, skipping confirmation\n`);
    return true;
  }

  // Ask for confirmation
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`\n⚠️  ${message}\n\n   Continue? (yes/no): `, (answer: string) => {
      rl.close();
      const confirmed = answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y';
      resolve(confirmed);
    });
  });
}

/**
 * Clear cached configuration (useful for testing)
 */
export function clearConfigCache(): void {
  cachedConfig = null;
}

/**
 * Re-export utility functions from config.ts for convenience
 */
export {
  loadKeypair,
  loadIDL,
  validateEnvVars,
  loadProgramId,
  getSolanaRpcUrl,
} from './config';
