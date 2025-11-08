// ============================================================
// HTTP API Endpoint Test Script
// ============================================================
// Purpose: Test all API endpoints via HTTP
// Usage: ts-node scripts/test-http-endpoints.ts

import axios from "axios";

const API_BASE_URL = "http://localhost:4000/api";

interface TestResult {
  endpoint: string;
  method: string;
  status: "✅ PASS" | "❌ FAIL" | "⚠️  SKIP";
  statusCode?: number;
  duration: number;
  error?: string;
  data?: any;
}

const results: TestResult[] = [];

async function testEndpoint(
  method: string,
  endpoint: string,
  data?: any,
  requiresAuth: boolean = false
): Promise<TestResult> {
  const startTime = Date.now();
  const fullUrl = `${API_BASE_URL}${endpoint}`;

  try {
    let response;
    const headers: any = { "Content-Type": "application/json" };

    if (requiresAuth) {
      // Skip auth-required endpoints for now
      return {
        endpoint: fullUrl,
        method,
        status: "⚠️  SKIP",
        duration: Date.now() - startTime,
        error: "Authentication required (skipped for now)",
      };
    }

    if (method === "GET") {
      response = await axios.get(fullUrl, { headers });
    } else if (method === "POST") {
      response = await axios.post(fullUrl, data, { headers });
    }

    return {
      endpoint: fullUrl,
      method,
      status: "✅ PASS",
      statusCode: response!.status,
      duration: Date.now() - startTime,
      data: response!.data,
    };
  } catch (error: any) {
    return {
      endpoint: fullUrl,
      method,
      status: "❌ FAIL",
      statusCode: error.response?.status,
      duration: Date.now() - startTime,
      error: error.response?.data?.message || error.message,
      data: error.response?.data,
    };
  }
}

async function main() {
  console.log("=".repeat(60));
  console.log("HTTP API ENDPOINT TESTS");
  console.log("=".repeat(60));
  console.log(`Base URL: ${API_BASE_URL}\n`);

  // ============================================================
  // Test 1: Health Check
  // ============================================================
  console.log("[1/9] Testing Health Check...");
  const healthResponse = await axios.get("http://localhost:4000/health");
  console.log(`✅ Health: ${healthResponse.data.status} (uptime: ${healthResponse.data.uptime.toFixed(2)}s)\n`);

  // ============================================================
  // Test 2: GET /api/markets
  // ============================================================
  console.log("[2/9] Testing GET /api/markets...");
  const test1 = await testEndpoint("GET", "/markets");
  results.push(test1);
  console.log(`${test1.status} ${test1.statusCode} - ${test1.duration}ms`);
  if (test1.status === "✅ PASS") {
    console.log(`   Found ${test1.data.count} markets\n`);
  } else {
    console.log(`   Error: ${test1.error}\n`);
  }

  // Get a market ID for further tests
  let marketId: string | null = null;
  if (test1.status === "✅ PASS" && test1.data.markets.length > 0) {
    marketId = test1.data.markets[0].id;
    console.log(`Using market ID for tests: ${marketId}\n`);
  }

  // ============================================================
  // Test 3: GET /api/markets/:id
  // ============================================================
  if (marketId) {
    console.log("[3/9] Testing GET /api/markets/:id...");
    const test2 = await testEndpoint("GET", `/markets/${marketId}`);
    results.push(test2);
    console.log(`${test2.status} ${test2.statusCode} - ${test2.duration}ms`);
    if (test2.status === "✅ PASS") {
      console.log(`   Market: ${test2.data.question}`);
      console.log(`   State: ${test2.data.state}`);
      console.log(`   Category: ${test2.data.category}\n`);
    } else {
      console.log(`   Error: ${test2.error}\n`);
    }
  } else {
    console.log("[3/9] SKIP - No market ID available\n");
  }

  // ============================================================
  // Test 4: GET /api/markets/:id/trades
  // ============================================================
  if (marketId) {
    console.log("[4/9] Testing GET /api/markets/:id/trades...");
    const test3 = await testEndpoint("GET", `/markets/${marketId}/trades`);
    results.push(test3);
    console.log(`${test3.status} ${test3.statusCode} - ${test3.duration}ms`);
    if (test3.status === "✅ PASS") {
      console.log(`   Trades found: ${test3.data.count}\n`);
    } else {
      console.log(`   Error: ${test3.error}\n`);
    }
  } else {
    console.log("[4/9] SKIP - No market ID available\n");
  }

  // ============================================================
  // Test 5: GET /api/markets/:id/votes
  // ============================================================
  if (marketId) {
    console.log("[5/9] Testing GET /api/markets/:id/votes...");
    const test4 = await testEndpoint("GET", `/markets/${marketId}/votes`);
    results.push(test4);
    console.log(`${test4.status} ${test4.statusCode} - ${test4.duration}ms`);
    if (test4.status === "✅ PASS") {
      console.log(`   Votes: ${test4.data.stats.total} (${test4.data.stats.approval_rate}% approval)\n`);
    } else {
      console.log(`   Error: ${test4.error}\n`);
    }
  } else {
    console.log("[5/9] SKIP - No market ID available\n");
  }

  // ============================================================
  // Test 6: GET /api/markets/:id/stats
  // ============================================================
  if (marketId) {
    console.log("[6/9] Testing GET /api/markets/:id/stats...");
    const test5 = await testEndpoint("GET", `/markets/${marketId}/stats`);
    results.push(test5);
    console.log(`${test5.status} ${test5.statusCode} - ${test5.duration}ms`);
    if (test5.status === "✅ PASS") {
      console.log(`   Total volume: ${test5.data.stats.total_volume}`);
      console.log(`   Total trades: ${test5.data.stats.total_trades}`);
      console.log(`   Unique traders: ${test5.data.stats.unique_traders}\n`);
    } else {
      console.log(`   Error: ${test5.error}\n`);
    }
  } else {
    console.log("[6/9] SKIP - No market ID available\n");
  }

  // ============================================================
  // Test 7-9: POST endpoints (require authentication - skipped)
  // ============================================================
  console.log("[7/9] Testing POST /api/markets...");
  const test6 = await testEndpoint("POST", "/markets", {}, true);
  results.push(test6);
  console.log(`${test6.status} - ${test6.error}\n`);

  console.log("[8/9] Testing POST /api/trades/buy...");
  const test7 = await testEndpoint("POST", "/trades/buy", {}, true);
  results.push(test7);
  console.log(`${test7.status} - ${test7.error}\n`);

  console.log("[9/9] Testing POST /api/trades/sell...");
  const test8 = await testEndpoint("POST", "/trades/sell", {}, true);
  results.push(test8);
  console.log(`${test8.status} - ${test8.error}\n`);

  // ============================================================
  // Summary
  // ============================================================
  console.log("=".repeat(60));
  console.log("TEST SUMMARY");
  console.log("=".repeat(60));

  const passed = results.filter((r) => r.status === "✅ PASS").length;
  const failed = results.filter((r) => r.status === "❌ FAIL").length;
  const skipped = results.filter((r) => r.status === "⚠️  SKIP").length;
  const total = results.length;

  console.log(`\nTotal Tests: ${total}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⚠️  Skipped: ${skipped}`);
  console.log(`\nSuccess Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);

  console.log(`\n${"=".repeat(60)}`);
  console.log("DETAILED RESULTS");
  console.log("=".repeat(60));

  results.forEach((r, i) => {
    console.log(`\n[${i + 1}] ${r.method} ${r.endpoint}`);
    console.log(`    Status: ${r.status}`);
    console.log(`    Duration: ${r.duration}ms`);
    if (r.statusCode) {
      console.log(`    HTTP Status: ${r.statusCode}`);
    }
    if (r.error) {
      console.log(`    Error: ${r.error}`);
    }
  });

  console.log(`\n${"=".repeat(60)}\n`);

  if (failed === 0 && passed > 0) {
    console.log("🎉 ALL TESTED ENDPOINTS WORKING!");
    process.exit(0);
  } else if (failed > 0) {
    console.log("⚠️  SOME ENDPOINTS FAILED");
    process.exit(1);
  } else {
    console.log("ℹ️  No endpoints tested");
    process.exit(0);
  }
}

// Run tests
main();
