// ============================================================
// Configuration Index
// ============================================================
// Purpose: Central export for all configuration modules

export { config, default as env } from "./env";
export { getSupabaseClient, testDatabaseConnection } from "./database";
export {
  getConnection,
  getBackendKeypair,
  getProvider,
  getProgramIds,
  testSolanaConnection,
  getBackendBalance,
} from "./solana";
export { getRedisClient, testRedisConnection, closeRedis } from "./redis";

/**
 * Test all connections
 * @returns True if all connections successful
 */
export async function testAllConnections(): Promise<boolean> {
  const { testDatabaseConnection } = await import("./database");
  const { testSolanaConnection } = await import("./solana");
  const { testRedisConnection } = await import("./redis");

  const results = await Promise.all([
    testDatabaseConnection(),
    testSolanaConnection(),
    testRedisConnection(),
  ]);

  return results.every((r) => r === true);
}
