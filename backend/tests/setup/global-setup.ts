/**
 * Jest Global Setup
 * Runs once before all tests
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env.test configuration
const envPath = path.join(__dirname, '../../.env.test');
dotenv.config({ path: envPath });

console.log('🧪 Global test setup complete');
console.log(`📍 Environment: ${process.env.NODE_ENV}`);
console.log(`🔗 RPC URL: ${process.env.SOLANA_RPC_URL}`);
console.log(`📦 Program ID: ${process.env.SOLANA_PROGRAM_ID_CORE}`);

// Extend Jest matchers if needed
expect.extend({
  // Custom matchers can be added here
});
