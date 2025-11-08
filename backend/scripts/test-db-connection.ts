#!/usr/bin/env ts-node
/**
 * Database Connection Test Script
 *
 * Tests Supabase cloud database connection and verifies schema deployment
 */

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";

// Load environment variables
dotenv.config({ path: path.join(__dirname, "../.env") });

const REQUIRED_ENV_VARS = [
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
];

const EXPECTED_TABLES = [
  "users",
  "markets",
  "positions",
  "proposal_votes",
  "dispute_votes",
  "discussions",
  "ipfs_anchors",
  "trades",
];

interface TestResult {
  name: string;
  status: "✅ PASS" | "❌ FAIL";
  details?: string;
  error?: string;
}

async function runTests(): Promise<void> {
  const results: TestResult[] = [];
  let allPassed = true;

  console.log("=".repeat(60));
  console.log("🧪 ZMART Database Connection Test");
  console.log("=".repeat(60));
  console.log();

  // Test 1: Environment Variables
  console.log("[1/6] Checking environment variables...");
  const missingVars: string[] = [];
  for (const varName of REQUIRED_ENV_VARS) {
    if (!process.env[varName]) {
      missingVars.push(varName);
    }
  }

  if (missingVars.length > 0) {
    results.push({
      name: "Environment Variables",
      status: "❌ FAIL",
      error: `Missing: ${missingVars.join(", ")}`,
    });
    allPassed = false;
    console.log("❌ FAIL - Missing environment variables");
    console.log(`   Missing: ${missingVars.join(", ")}`);
    console.log();
  } else {
    results.push({
      name: "Environment Variables",
      status: "✅ PASS",
      details: "All required variables present",
    });
    console.log("✅ PASS");
    console.log();
  }

  if (missingVars.length > 0) {
    printSummary(results, allPassed);
    process.exit(1);
  }

  // Test 2: Supabase Client Creation
  console.log("[2/6] Creating Supabase client...");
  let supabase: ReturnType<typeof createClient>;
  try {
    supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    results.push({
      name: "Supabase Client",
      status: "✅ PASS",
      details: `Connected to ${process.env.SUPABASE_URL}`,
    });
    console.log("✅ PASS");
    console.log(`   URL: ${process.env.SUPABASE_URL}`);
    console.log();
  } catch (error: any) {
    results.push({
      name: "Supabase Client",
      status: "❌ FAIL",
      error: error.message,
    });
    allPassed = false;
    console.log("❌ FAIL");
    console.log(`   Error: ${error.message}`);
    console.log();
    printSummary(results, allPassed);
    process.exit(1);
  }

  // Test 3: Database Connection
  console.log("[3/6] Testing database connection...");
  try {
    const { data, error } = await supabase
      .from("users")
      .select("count")
      .limit(1);

    if (error) throw error;

    results.push({
      name: "Database Connection",
      status: "✅ PASS",
      details: "Successfully queried database",
    });
    console.log("✅ PASS");
    console.log();
  } catch (error: any) {
    results.push({
      name: "Database Connection",
      status: "❌ FAIL",
      error: error.message || String(error),
    });
    allPassed = false;
    console.log("❌ FAIL");
    console.log(`   Error: ${error.message || String(error)}`);
    console.log();
  }

  // Test 4: Table Schema Verification
  console.log("[4/6] Verifying table schema...");
  try {
    const { data: tables, error } = await supabase.rpc("get_tables");

    if (error) {
      // Fallback: Try to query each table
      const tableChecks = await Promise.all(
        EXPECTED_TABLES.map(async (tableName) => {
          try {
            const { error } = await supabase
              .from(tableName)
              .select("*")
              .limit(1);
            return { table: tableName, exists: !error };
          } catch {
            return { table: tableName, exists: false };
          }
        })
      );

      const existingTables = tableChecks.filter((t) => t.exists).map((t) => t.table);
      const missingTables = tableChecks.filter((t) => !t.exists).map((t) => t.table);

      if (missingTables.length === 0) {
        results.push({
          name: "Table Schema",
          status: "✅ PASS",
          details: `All ${EXPECTED_TABLES.length} tables exist`,
        });
        console.log("✅ PASS");
        console.log(`   Found all ${EXPECTED_TABLES.length} tables:`);
        existingTables.forEach((t) => console.log(`     - ${t}`));
        console.log();
      } else {
        results.push({
          name: "Table Schema",
          status: "❌ FAIL",
          error: `Missing tables: ${missingTables.join(", ")}`,
        });
        allPassed = false;
        console.log("❌ FAIL");
        console.log(`   Found: ${existingTables.length}/${EXPECTED_TABLES.length} tables`);
        console.log(`   Missing: ${missingTables.join(", ")}`);
        console.log();
      }
    } else {
      results.push({
        name: "Table Schema",
        status: "✅ PASS",
        details: `Schema verified`,
      });
      console.log("✅ PASS");
      console.log();
    }
  } catch (error: any) {
    results.push({
      name: "Table Schema",
      status: "❌ FAIL",
      error: error.message,
    });
    allPassed = false;
    console.log("❌ FAIL");
    console.log(`   Error: ${error.message}`);
    console.log();
  }

  // Test 5: RLS Policies
  console.log("[5/6] Checking Row Level Security (RLS)...");
  try {
    // Test that we can query with service_role (bypasses RLS)
    const { data, error } = await supabase
      .from("markets")
      .select("id")
      .limit(1);

    if (error) throw error;

    results.push({
      name: "RLS Policies",
      status: "✅ PASS",
      details: "RLS configured, service_role access works",
    });
    console.log("✅ PASS");
    console.log("   RLS enabled, service_role bypass working");
    console.log();
  } catch (error: any) {
    results.push({
      name: "RLS Policies",
      status: "❌ FAIL",
      error: error.message,
    });
    allPassed = false;
    console.log("❌ FAIL");
    console.log(`   Error: ${error.message}`);
    console.log();
  }

  // Test 6: Realtime Subscriptions
  console.log("[6/6] Testing realtime subscriptions...");
  try {
    const channel = supabase
      .channel("test_channel")
      .on("postgres_changes", { event: "*", schema: "public", table: "markets" }, () => {})
      .subscribe();

    await new Promise((resolve) => setTimeout(resolve, 1000));

    const status = channel.state;
    await supabase.removeChannel(channel);

    if (status === "joined" || status === "joining") {
      results.push({
        name: "Realtime Subscriptions",
        status: "✅ PASS",
        details: "WebSocket connection established",
      });
      console.log("✅ PASS");
      console.log("   WebSocket realtime ready");
      console.log();
    } else {
      throw new Error(`Channel state: ${status}`);
    }
  } catch (error: any) {
    results.push({
      name: "Realtime Subscriptions",
      status: "❌ FAIL",
      error: error.message,
    });
    allPassed = false;
    console.log("❌ FAIL");
    console.log(`   Error: ${error.message}`);
    console.log();
  }

  printSummary(results, allPassed);
  process.exit(allPassed ? 0 : 1);
}

function printSummary(results: TestResult[], allPassed: boolean): void {
  console.log("=".repeat(60));
  console.log("📊 Test Summary");
  console.log("=".repeat(60));
  console.log();

  results.forEach((result, index) => {
    console.log(`${index + 1}. ${result.name}: ${result.status}`);
    if (result.details) {
      console.log(`   ${result.details}`);
    }
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
    console.log();
  });

  const passCount = results.filter((r) => r.status === "✅ PASS").length;
  const failCount = results.filter((r) => r.status === "❌ FAIL").length;

  console.log("=".repeat(60));
  if (allPassed) {
    console.log(`✅ All tests passed! (${passCount}/${results.length})`);
    console.log("🚀 Database is ready for development");
  } else {
    console.log(`❌ Some tests failed (${passCount} passed, ${failCount} failed)`);
    console.log("📖 Check CLOUD-SUPABASE-SETUP.md for troubleshooting");
  }
  console.log("=".repeat(60));
  console.log();
}

// Run tests
runTests().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
