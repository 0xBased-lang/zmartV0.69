/**
 * Shared Configuration Utilities
 *
 * Cross-platform utilities for loading configuration, keypairs, and IDL files.
 * Handles environment validation and provides consistent error handling.
 */

import { homedir } from 'os';
import path from 'path';
import fs from 'fs';
import { Keypair, PublicKey } from '@solana/web3.js';

/**
 * Load a Solana keypair from file system
 *
 * @param envPath - Optional path from environment variable
 * @returns Keypair object
 * @throws Error if keypair cannot be loaded
 */
export function loadKeypair(envPath?: string): Keypair {
  // Priority order: explicit path > env variable > default location
  const keypairPath = envPath ||
    process.env.BACKEND_KEYPAIR_PATH ||
    path.join(homedir(), '.config', 'solana', 'id.json');

  // Check file exists
  if (!fs.existsSync(keypairPath)) {
    throw new Error(
      `Keypair file not found at: ${keypairPath}\n` +
      'Please ensure you have a valid Solana keypair at this location.\n' +
      'You can generate one with: solana-keygen new'
    );
  }

  try {
    // Read and parse keypair file
    const keypairData = fs.readFileSync(keypairPath, 'utf-8');
    const keypairArray = JSON.parse(keypairData);

    // Validate it's an array of numbers
    if (!Array.isArray(keypairArray) || !keypairArray.every(n => typeof n === 'number')) {
      throw new Error('Invalid keypair format - expected array of numbers');
    }

    return Keypair.fromSecretKey(new Uint8Array(keypairArray));
  } catch (error) {
    throw new Error(
      `Failed to load keypair from ${keypairPath}: ${error instanceof Error ? error.message : 'Unknown error'}\n` +
      'Please ensure the file contains a valid Solana keypair'
    );
  }
}

/**
 * Load an Anchor IDL file
 *
 * @param programName - Name of the program (e.g., 'zmart_prediction_market')
 * @param customPath - Optional custom path to IDL file
 * @returns Parsed IDL object
 * @throws Error if IDL cannot be loaded
 */
export function loadIDL(programName: string, customPath?: string): any {
  // Default to standard Anchor IDL location
  const idlPath = customPath ||
    path.join(__dirname, '..', '..', '..', 'target', 'idl', `${programName}.json`);

  // Check file exists
  if (!fs.existsSync(idlPath)) {
    throw new Error(
      `IDL file not found at: ${idlPath}\n` +
      `Please ensure you have built the program with: anchor build\n` +
      `Or provide a custom path to the IDL file`
    );
  }

  try {
    // Read and parse IDL file
    const idlData = fs.readFileSync(idlPath, 'utf-8');
    const idl = JSON.parse(idlData);

    // Basic validation - check it has expected structure
    // Support both old format (version, name) and new Anchor 0.30+ format (metadata, address)
    const hasOldFormat = idl.version && idl.name && idl.instructions;
    const hasNewFormat = idl.metadata && idl.address && idl.instructions;

    if (!hasOldFormat && !hasNewFormat) {
      throw new Error('Invalid IDL format - missing required fields. Expected either (version, name, instructions) or (metadata, address, instructions)');
    }

    return idl;
  } catch (error) {
    throw new Error(
      `Failed to load IDL from ${idlPath}: ${error instanceof Error ? error.message : 'Unknown error'}\n` +
      'Please ensure the file contains a valid Anchor IDL'
    );
  }
}

/**
 * Validate required environment variables
 *
 * @param required - Array of required environment variable names
 * @throws Error if any required variables are missing
 */
export function validateEnvVars(required: string[]): void {
  const missing: string[] = [];

  for (const varName of required) {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables:\n` +
      missing.map(v => `  - ${v}`).join('\n') + '\n\n' +
      'Please set these in your .env file or environment.\n' +
      'See .env.example.safe for documentation.'
    );
  }
}

/**
 * Load and validate a program ID from environment
 *
 * @param envVarName - Name of the environment variable
 * @returns PublicKey object
 * @throws Error if program ID is invalid
 */
export function loadProgramId(envVarName: string): PublicKey {
  const programIdStr = process.env[envVarName];

  if (!programIdStr) {
    throw new Error(
      `Missing required environment variable: ${envVarName}\n` +
      'Please set this to your deployed program ID'
    );
  }

  try {
    return new PublicKey(programIdStr);
  } catch (error) {
    throw new Error(
      `Invalid program ID in ${envVarName}: ${programIdStr}\n` +
      'Please ensure this is a valid Solana public key (base58 encoded)'
    );
  }
}

/**
 * Get Solana RPC URL with fallback to devnet
 *
 * @returns RPC URL string
 */
export function getSolanaRpcUrl(): string {
  const rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';

  // Validate it's a valid URL
  try {
    new URL(rpcUrl);
  } catch {
    throw new Error(
      `Invalid SOLANA_RPC_URL: ${rpcUrl}\n` +
      'Please provide a valid URL'
    );
  }

  return rpcUrl;
}

/**
 * Parse and validate a port number from environment
 *
 * @param envVarName - Name of the environment variable
 * @param defaultValue - Default port if not set
 * @returns Valid port number
 * @throws Error if port is invalid
 */
export function parsePort(envVarName: string, defaultValue: number): number {
  const portStr = process.env[envVarName];

  if (!portStr) {
    return defaultValue;
  }

  const port = parseInt(portStr, 10);

  if (isNaN(port) || port < 1 || port > 65535) {
    throw new Error(
      `Invalid port number in ${envVarName}: ${portStr}\n` +
      'Port must be a number between 1 and 65535'
    );
  }

  return port;
}

/**
 * Parse and validate a database number from environment
 *
 * @param envVarName - Name of the environment variable
 * @param defaultValue - Default value if not set
 * @returns Valid database number
 * @throws Error if value is invalid
 */
export function parseDbNumber(envVarName: string, defaultValue: number): number {
  const dbStr = process.env[envVarName];

  if (!dbStr) {
    return defaultValue;
  }

  const db = parseInt(dbStr, 10);

  if (isNaN(db) || db < 0) {
    throw new Error(
      `Invalid database number in ${envVarName}: ${dbStr}\n` +
      'Database number must be a non-negative integer'
    );
  }

  return db;
}

/**
 * Check if running in production mode
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

/**
 * Check if running in development mode
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development';
}

/**
 * Get safe hostname from URL (for logging)
 * Strips credentials, path, query, and hash
 *
 * @param url - URL string
 * @returns Safe hostname or 'unknown' if parsing fails
 */
export function getSafeHostname(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname;
  } catch {
    // If URL parsing fails, return safe default
    return 'unknown';
  }
}

/**
 * Create directory if it doesn't exist
 *
 * @param dirPath - Directory path to create
 */
export function ensureDirectory(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}