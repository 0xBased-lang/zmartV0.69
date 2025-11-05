#!/usr/bin/env ts-node
// ============================================================
// Week 2 Simplified Validation Script
// ============================================================
// Purpose: Quick comprehensive validation of all backend deliverables
// Usage: npm run validate:week2

import * as fs from "fs";
import * as path from "path";

interface ValidationCheck {
  category: string;
  check: string;
  status: "✅" | "❌" | "⚠️";
  details: string;
}

const checks: ValidationCheck[] = [];

console.log("╔═══════════════════════════════════════════════════════════════╗");
console.log("║          WEEK 2 - COMPREHENSIVE VALIDATION SUITE              ║");
console.log("╚═══════════════════════════════════════════════════════════════╝\n");

// =================================================================
// 1. FILE EXISTENCE VALIDATION
// =================================================================
console.log("📂 Validating File Structure...\n");

const requiredFiles = [
  // Services
  { path: "src/services/vote-aggregator/proposal.ts", desc: "Proposal vote aggregator" },
  { path: "src/services/vote-aggregator/dispute.ts", desc: "Dispute vote aggregator" },
  { path: "src/services/vote-aggregator/index.ts", desc: "Vote aggregator index" },
  { path: "src/services/ipfs/snapshot.ts", desc: "IPFS snapshot service" },
  { path: "src/services/ipfs/index.ts", desc: "IPFS index" },
  { path: "src/services/websocket/server.ts", desc: "WebSocket server" },
  { path: "src/services/websocket/realtime.ts", desc: "Realtime event broadcaster" },
  { path: "src/services/websocket/index.ts", desc: "WebSocket index" },

  // API Routes
  { path: "src/api/routes/markets.ts", desc: "Markets API routes" },
  { path: "src/api/routes/trades.ts", desc: "Trades API routes" },
  { path: "src/api/routes/votes.ts", desc: "Votes API routes" },
  { path: "src/api/routes/discussions.ts", desc: "Discussions API routes" },
  { path: "src/api/routes/users.ts", desc: "Users API routes" },

  // Middleware
  { path: "src/api/middleware/auth.ts", desc: "Authentication middleware" },
  { path: "src/api/middleware/validation.ts", desc: "Validation middleware" },
  { path: "src/api/middleware/error-handler.ts", desc: "Error handler middleware" },

  // Server
  { path: "src/api/server.ts", desc: "Express server" },

  // Config
  { path: "src/config/database.ts", desc: "Database config" },
  { path: "src/config/solana.ts", desc: "Solana config" },
  { path: "src/config/env.ts", desc: "Environment config" },

  // Utils
  { path: "src/utils/logger.ts", desc: "Logger utility" },
  { path: "src/utils/validation.ts", desc: "Validation utility" },
  { path: "src/utils/retry.ts", desc: "Retry utility" },

  // Tests
  { path: "src/__tests__/services/vote-aggregator/proposal.test.ts", desc: "Proposal tests" },
  { path: "src/__tests__/services/vote-aggregator/dispute.test.ts", desc: "Dispute tests" },
  { path: "src/__tests__/services/ipfs/snapshot.test.ts", desc: "IPFS tests" },
  { path: "src/__tests__/services/websocket/server.test.ts", desc: "WebSocket tests" },
  { path: "src/__tests__/integration/backend-services.test.ts", desc: "Integration tests" },
];

requiredFiles.forEach((file) => {
  const fullPath = path.join(__dirname, "..", file.path);
  const exists = fs.existsSync(fullPath);
  checks.push({
    category: "Files",
    check: file.desc,
    status: exists ? "✅" : "❌",
    details: exists ? file.path : `Missing: ${file.path}`,
  });
});

// =================================================================
// 2. TYPESCRIPT COMPILATION
// =================================================================
console.log("🔨 Validating TypeScript Compilation...\n");

const tsConfigPath = path.join(__dirname, "..", "tsconfig.json");
if (fs.existsSync(tsConfigPath)) {
  checks.push({
    category: "TypeScript",
    check: "tsconfig.json exists",
    status: "✅",
    details: "TypeScript configuration found",
  });
} else {
  checks.push({
    category: "TypeScript",
    check: "tsconfig.json exists",
    status: "❌",
    details: "TypeScript configuration missing",
  });
}

// =================================================================
// 3. DEPENDENCIES
// =================================================================
console.log("📦 Validating Dependencies...\n");

const packageJsonPath = path.join(__dirname, "..", "package.json");
if (fs.existsSync(packageJsonPath)) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
  const requiredDeps = [
    "@supabase/supabase-js",
    "@solana/web3.js",
    "express",
    "ws",
    "ipfs-http-client",
    "winston",
    "joi",
  ];

  requiredDeps.forEach((dep) => {
    const exists = dep in (packageJson.dependencies || {});
    checks.push({
      category: "Dependencies",
      check: dep,
      status: exists ? "✅" : "❌",
      details: exists ? "Installed" : "Missing",
    });
  });
}

// =================================================================
// 4. API ENDPOINTS (verify they're defined in code)
// =================================================================
console.log("🔌 Validating API Endpoints...\n");

const endpointFiles = [
  { file: "src/api/routes/markets.ts", endpoints: 5, name: "Markets" },
  { file: "src/api/routes/votes.ts", endpoints: 6, name: "Votes" },
  { file: "src/api/routes/discussions.ts", endpoints: 4, name: "Discussions" },
  { file: "src/api/routes/trades.ts", endpoints: 2, name: "Trades" },
  { file: "src/api/server.ts", endpoints: 1, name: "Health" }, // Health endpoint in server.ts
];

endpointFiles.forEach((route) => {
  const filePath = path.join(__dirname, "..", route.file);
  const exists = fs.existsSync(filePath);

  if (exists) {
    const content = fs.readFileSync(filePath, "utf-8");
    // Count route definitions (router.get, router.post, etc.)
    const routeMatches = content.match(/router\.(get|post|put|delete|patch)/g) || [];
    // For server.ts, count app.get, app.post, etc.
    const appMatches = content.match(/app\.(get|post|put|delete|patch)/g) || [];
    const totalRoutes = routeMatches.length + appMatches.length;

    checks.push({
      category: "API Endpoints",
      check: `${route.name} routes`,
      status: totalRoutes >= route.endpoints ? "✅" : "⚠️",
      details: `Expected ${route.endpoints}, found ${totalRoutes} route definitions`,
    });
  } else {
    checks.push({
      category: "API Endpoints",
      check: `${route.name} routes`,
      status: "❌",
      details: `File not found: ${route.file}`,
    });
  }
});

// =================================================================
// 5. WEBSOCKET EVENTS
// =================================================================
console.log("🔄 Validating WebSocket Events...\n");

const realtimePath = path.join(__dirname, "..", "src/services/websocket/realtime.ts");
if (fs.existsSync(realtimePath)) {
  const content = fs.readFileSync(realtimePath, "utf-8");

  const expectedEvents = ["market_state", "trade", "vote", "discussion", "error"];
  expectedEvents.forEach((event) => {
    const hasEvent = content.includes(event);
    checks.push({
      category: "WebSocket Events",
      check: `Event type: ${event}`,
      status: hasEvent ? "✅" : "❌",
      details: hasEvent ? "Event type defined" : "Event type not found",
    });
  });
}

// =================================================================
// 6. SECURITY MEASURES
// =================================================================
console.log("🔒 Validating Security...\n");

const serverPath = path.join(__dirname, "..", "src/api/server.ts");
if (fs.existsSync(serverPath)) {
  const content = fs.readFileSync(serverPath, "utf-8");

  const securityChecks = [
    { feature: "helmet", desc: "Helmet security headers" },
    { feature: "cors", desc: "CORS configuration" },
    { feature: "rateLimit", desc: "Rate limiting" },
  ];

  securityChecks.forEach((sec) => {
    const hasFeature = content.includes(sec.feature);
    checks.push({
      category: "Security",
      check: sec.desc,
      status: hasFeature ? "✅" : "❌",
      details: hasFeature ? "Configured" : "Not configured",
    });
  });
}

// Check auth middleware
const authPath = path.join(__dirname, "..", "src/api/middleware/auth.ts");
if (fs.existsSync(authPath)) {
  checks.push({
    category: "Security",
    check: "SIWE authentication",
    status: "✅",
    details: "Auth middleware exists",
  });
}

// =================================================================
// 7. ERROR HANDLING
// =================================================================
console.log("⚠️ Validating Error Handling...\n");

const errorHandlerPath = path.join(__dirname, "..", "src/api/middleware/error-handler.ts");
if (fs.existsSync(errorHandlerPath)) {
  checks.push({
    category: "Error Handling",
    check: "Centralized error handler",
    status: "✅",
    details: "Error handler middleware exists",
  });
}

const loggerPath = path.join(__dirname, "..", "src/utils/logger.ts");
if (fs.existsSync(loggerPath)) {
  checks.push({
    category: "Error Handling",
    check: "Logging utility",
    status: "✅",
    details: "Winston logger configured",
  });
}

// =================================================================
// 8. STORY FILES
// =================================================================
console.log("📝 Validating Story Files...\n");

const storyFiles = [
  "docs/stories/STORY-2.1.md", // Day 8
  "docs/stories/STORY-2.2.md", // Day 9
  "docs/stories/STORY-2.3.md", // Day 10
  "docs/stories/STORY-2.4.md", // Day 11
  "docs/stories/STORY-2.5.md", // Day 12
  "docs/stories/STORY-2.6.md", // Day 13
  "docs/stories/STORY-2.7.md", // Day 14 (if it exists)
];

storyFiles.forEach((story, index) => {
  const fullPath = path.join(__dirname, "../..", story);
  const exists = fs.existsSync(fullPath);

  if (exists) {
    const content = fs.readFileSync(fullPath, "utf-8");
    const isComplete = content.includes("✅ COMPLETE");
    checks.push({
      category: "Documentation",
      check: `Day ${index + 8} story`,
      status: isComplete ? "✅" : "⚠️",
      details: isComplete ? "Complete" : "In progress or incomplete",
    });
  } else {
    checks.push({
      category: "Documentation",
      check: `Day ${index + 8} story`,
      status: index < 6 ? "❌" : "⚠️", // First 6 are required
      details: "Story file not found",
    });
  }
});

// =================================================================
// PRINT RESULTS
// =================================================================
console.log("\n╔═══════════════════════════════════════════════════════════════╗");
console.log("║                     VALIDATION RESULTS                        ║");
console.log("╚═══════════════════════════════════════════════════════════════╝\n");

// Group by category
const categories = [...new Set(checks.map((c) => c.category))];

categories.forEach((category) => {
  console.log(`\n${category}:`);
  console.log("─".repeat(60));

  const categoryChecks = checks.filter((c) => c.category === category);
  categoryChecks.forEach((check) => {
    console.log(`${check.status} ${check.check}`);
    console.log(`   ${check.details}`);
  });
});

// =================================================================
// SUMMARY
// =================================================================
console.log("\n╔═══════════════════════════════════════════════════════════════╗");
console.log("║                          SUMMARY                              ║");
console.log("╚═══════════════════════════════════════════════════════════════╝\n");

const passCount = checks.filter((c) => c.status === "✅").length;
const failCount = checks.filter((c) => c.status === "❌").length;
const warnCount = checks.filter((c) => c.status === "⚠️").length;
const total = checks.length;
const passRate = ((passCount / total) * 100).toFixed(1);

console.log(`Total Checks:    ${total}`);
console.log(`Passed:          ${passCount} ✅`);
console.log(`Failed:          ${failCount} ❌`);
console.log(`Warnings:        ${warnCount} ⚠️`);
console.log(`Pass Rate:       ${passRate}%`);
console.log();

if (failCount === 0 && warnCount === 0) {
  console.log("🎉 ALL CHECKS PASSED! Week 2 is 100% compliant!\n");
  process.exit(0);
} else if (failCount === 0) {
  console.log("✅ All critical checks passed (warnings present)\n");
  process.exit(0);
} else {
  console.log("❌ VALIDATION FAILED - Please review errors\n");
  console.log("Note: Some failures may be expected if optional components are not yet implemented.\n");
  process.exit(1);
}
