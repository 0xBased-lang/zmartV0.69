/**
 * Cleanup Test Data
 * Removes all test data from database
 */

import { createTestSupabaseClient, cleanupTestData } from '../helpers/supabase';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load test environment
const envPath = path.join(__dirname, '../../.env.test');
dotenv.config({ path: envPath });

async function cleanup() {
  console.log('🧹 Cleaning up test data from database...\n');

  const supabase = createTestSupabaseClient();

  try {
    await cleanupTestData(supabase);
    console.log('\n✅ Test data cleanup complete!');
  } catch (error) {
    console.error('❌ Error cleaning up test data:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  cleanup()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Error:', error);
      process.exit(1);
    });
}

export { cleanup };
