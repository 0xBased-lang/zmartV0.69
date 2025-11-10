import { SupabaseClient } from "@supabase/supabase-js";
/**
 * Get or create Supabase client instance
 * @returns Supabase client
 */
export declare function getSupabaseClient(): SupabaseClient;
/**
 * Test database connection
 * @returns True if connection successful
 */
export declare function testDatabaseConnection(): Promise<boolean>;
export default getSupabaseClient;
//# sourceMappingURL=database.d.ts.map