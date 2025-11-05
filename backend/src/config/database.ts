// ============================================================
// Supabase Database Configuration
// ============================================================
// Purpose: Initialize Supabase client for database operations
// Pattern Prevention: #4 (Schema Drift) - Type-safe database client

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { config } from "./env";
import logger from "../utils/logger";

// Singleton Supabase client
let supabaseClient: SupabaseClient | null = null;

/**
 * Get or create Supabase client instance
 * @returns Supabase client
 */
export function getSupabaseClient(): SupabaseClient {
  if (!supabaseClient) {
    logger.info("Initializing Supabase client", {
      url: config.supabase.url,
    });

    supabaseClient = createClient(
      config.supabase.url,
      config.supabase.serviceRoleKey, // Use service role for backend operations
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    logger.info("Supabase client initialized successfully");
  }

  return supabaseClient;
}

/**
 * Test database connection
 * @returns True if connection successful
 */
export async function testDatabaseConnection(): Promise<boolean> {
  try {
    const client = getSupabaseClient();

    // Simple query to test connection
    const { error } = await client.from("markets").select("count").limit(1);

    if (error) {
      logger.error("Database connection test failed", { error: error.message });
      return false;
    }

    logger.info("Database connection test successful");
    return true;
  } catch (error) {
    logger.error("Database connection test failed", { error });
    return false;
  }
}

export default getSupabaseClient;
