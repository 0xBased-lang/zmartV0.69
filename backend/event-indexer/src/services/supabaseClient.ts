/**
 * Supabase Client
 *
 * Singleton client for Supabase database operations.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { logger } from '../utils/logger';

let supabaseClient: SupabaseClient | null = null;

/**
 * Initialize Supabase client
 */
export function initSupabase(): SupabaseClient {
  if (supabaseClient) {
    return supabaseClient;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  }

  supabaseClient = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  logger.info('Supabase client initialized', {
    url: supabaseUrl,
    keyType: 'service_role'
  });

  return supabaseClient;
}

/**
 * Get Supabase client instance
 */
export function getSupabase(): SupabaseClient {
  if (!supabaseClient) {
    return initSupabase();
  }
  return supabaseClient;
}

/**
 * Test database connection
 */
export async function testConnection(): Promise<boolean> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('schema_version')
      .select('version')
      .limit(1);

    if (error) {
      logger.error('Database connection test failed', { error: error.message });
      return false;
    }

    logger.info('Database connection successful', { schemaVersion: data?.[0]?.version });
    return true;
  } catch (error) {
    logger.error('Database connection test error', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return false;
  }
}
