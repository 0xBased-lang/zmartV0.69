"use strict";
// ============================================================
// Supabase Database Configuration
// ============================================================
// Purpose: Initialize Supabase client for database operations
// Pattern Prevention: #4 (Schema Drift) - Type-safe database client
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSupabaseClient = getSupabaseClient;
exports.testDatabaseConnection = testDatabaseConnection;
const supabase_js_1 = require("@supabase/supabase-js");
const env_1 = require("./env");
const logger_1 = __importDefault(require("../utils/logger"));
// Singleton Supabase client
let supabaseClient = null;
/**
 * Get or create Supabase client instance
 * @returns Supabase client
 */
function getSupabaseClient() {
    if (!supabaseClient) {
        logger_1.default.info("Initializing Supabase client", {
            url: env_1.config.supabase.url,
        });
        supabaseClient = (0, supabase_js_1.createClient)(env_1.config.supabase.url, env_1.config.supabase.serviceRoleKey, // Use service role for backend operations
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        });
        logger_1.default.info("Supabase client initialized successfully");
    }
    return supabaseClient;
}
/**
 * Test database connection
 * @returns True if connection successful
 */
async function testDatabaseConnection() {
    try {
        const client = getSupabaseClient();
        // Simple query to test connection
        const { error } = await client.from("markets").select("count").limit(1);
        if (error) {
            logger_1.default.error("Database connection test failed", { error: error.message });
            return false;
        }
        logger_1.default.info("Database connection test successful");
        return true;
    }
    catch (error) {
        logger_1.default.error("Database connection test failed", { error });
        return false;
    }
}
exports.default = getSupabaseClient;
//# sourceMappingURL=database.js.map