// ============================================================
// Market Monitor Deployment Script for Devnet
// ============================================================
// Purpose: Deploy and test Market Monitor service on devnet
// Features:
//   1. Create test market in RESOLVING state (backdated 48+ hours)
//   2. Run Market Monitor service
//   3. Validate finalization works end-to-end
// Usage: ts-node scripts/deploy-market-monitor.ts

import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { Program, AnchorProvider, Wallet } from "@coral-xyz/anchor";
import { createClient } from "@supabase/supabase-js";
import { MarketMonitor } from "../src/services/market-monitor/monitor";
import dotenv from "dotenv";
import path from "path";
import { readFileSync } from "fs";

// Load environment variables
dotenv.config({ path: path.join(__dirname, "../.env") });

// ============================================================
// Configuration
// ============================================================

const RPC_URL = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";
const PROGRAM_ID = new PublicKey(process.env.SOLANA_PROGRAM_ID_CORE!);
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Load backend keypair
function loadKeypair(): Keypair {
  const keypairPath =
    process.env.BACKEND_KEYPAIR_PATH ||
    path.join(process.env.HOME!, ".config/solana/id.json");
  const keypairData = JSON.parse(readFileSync(keypairPath, "utf-8"));
  return Keypair.fromSecretKey(new Uint8Array(keypairData));
}

// Load IDL
function loadIDL(): any {
  const idlPath = path.join(__dirname, "../../target/idl/zmart_core.json");
  try {
    return JSON.parse(readFileSync(idlPath, "utf-8"));
  } catch (error) {
    console.error("❌ Failed to load IDL. Make sure program is built:");
    console.error("   cd programs/zmart-core && anchor build");
    throw error;
  }
}

// ============================================================
// Main Deployment Flow
// ============================================================

async function main() {
  console.log("=".repeat(70));
  console.log(" Market Monitor Deployment - Devnet Testing");
  console.log("=".repeat(70));
  console.log("\n🎯 Objective: Test Market Monitor end-to-end on devnet");
  console.log("📋 Steps:");
  console.log("   1. Verify environment setup");
  console.log("   2. Create test market in RESOLVING state (backdated 48+ hours)");
  console.log("   3. Run Market Monitor service");
  console.log("   4. Validate finalization transaction");
  console.log("   5. Verify state update in database");
  console.log("");

  try {
    // ========================================
    // Step 1: Verify Environment Setup
    // ========================================
    console.log("━".repeat(70));
    console.log("[1/5] Verifying Environment Setup");
    console.log("━".repeat(70));

    // Check environment variables
    const requiredEnvVars = [
      "SOLANA_RPC_URL",
      "SOLANA_PROGRAM_ID_CORE",
      "BACKEND_KEYPAIR_PATH",
      "SUPABASE_URL",
      "SUPABASE_SERVICE_ROLE_KEY",
    ];

    console.log("\n📝 Environment Variables:");
    for (const envVar of requiredEnvVars) {
      const value = process.env[envVar];
      if (!value) {
        console.error(`   ❌ ${envVar}: MISSING`);
        throw new Error(`Missing required environment variable: ${envVar}`);
      }
      // Truncate sensitive values
      const displayValue =
        envVar.includes("KEY") || envVar.includes("SECRET")
          ? `${value.slice(0, 10)}...`
          : value;
      console.log(`   ✅ ${envVar}: ${displayValue}`);
    }

    // Setup connection
    const connection = new Connection(RPC_URL, "confirmed");
    const keypair = loadKeypair();
    const wallet = new Wallet(keypair);
    const provider = new AnchorProvider(connection, wallet, {
      commitment: "confirmed",
      preflightCommitment: "confirmed",
    });

    console.log("\n🔗 Solana Connection:");
    console.log(`   RPC URL: ${RPC_URL}`);
    console.log(`   Backend Wallet: ${keypair.publicKey.toBase58()}`);

    // Check wallet balance
    const balance = await connection.getBalance(keypair.publicKey);
    const balanceSOL = balance / 1e9;
    console.log(`   Balance: ${balanceSOL.toFixed(4)} SOL`);

    if (balanceSOL < 0.1) {
      console.warn("   ⚠️  Low balance! Recommend at least 0.1 SOL for testing");
      console.log(`   Get devnet SOL: solana airdrop 1 ${keypair.publicKey.toBase58()} --url devnet`);
    }

    // Load program
    const idl = loadIDL();
    const program = new Program(idl, provider);
    console.log(`\n📦 Program:`);
    console.log(`   Program ID: ${program.programId.toBase58()}`);

    // Derive Global Config PDA
    const [globalConfigPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("global-config")],
      program.programId
    );
    console.log(`   Global Config PDA: ${globalConfigPda.toBase58()}`);

    // Check if global config exists
    try {
      const globalConfigAccount = await connection.getAccountInfo(globalConfigPda);
      if (globalConfigAccount) {
        console.log(`   ✅ Global Config exists (${globalConfigAccount.data.length} bytes)`);
      } else {
        console.error("   ❌ Global Config not found. Initialize program first:");
        console.error("      ts-node scripts/initialize-program.ts");
        throw new Error("Global Config not initialized");
      }
    } catch (error) {
      console.error("   ❌ Failed to fetch Global Config:", error);
      throw error;
    }

    // Setup Supabase
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    console.log(`\n🗄️  Supabase:`);
    console.log(`   URL: ${SUPABASE_URL}`);

    // Test database connection
    const { data: testQuery, error: testError } = await supabase
      .from("markets")
      .select("count")
      .limit(1);

    if (testError) {
      console.error("   ❌ Database connection failed:", testError.message);
      throw testError;
    }
    console.log("   ✅ Database connection successful");

    console.log("\n✅ Environment setup verified!");

    // ========================================
    // Step 2: Create Test Market
    // ========================================
    console.log("\n" + "━".repeat(70));
    console.log("[2/5] Creating Test Market");
    console.log("━".repeat(70));

    // Generate test market data
    const marketId = `test-market-${Date.now()}`;
    const onChainAddress = Keypair.generate().publicKey.toBase58(); // Fake address for testing
    const creatorWallet = keypair.publicKey.toBase58();

    // Create market 50 hours ago (past the 48-hour dispute window)
    const marketCreatedAt = new Date(Date.now() - 50 * 60 * 60 * 1000);
    const resolutionProposedAt = new Date(marketCreatedAt.getTime() + 60 * 60 * 1000); // 1 hour after creation

    console.log("\n📊 Market Details:");
    console.log(`   Market ID: ${marketId}`);
    console.log(`   On-Chain Address: ${onChainAddress}`);
    console.log(`   Creator: ${creatorWallet.slice(0, 8)}...`);
    console.log(`   Created At: ${marketCreatedAt.toISOString()}`);
    console.log(`   Resolution Proposed: ${resolutionProposedAt.toISOString()}`);
    console.log(`   Hours Since Resolution: ${((Date.now() - resolutionProposedAt.getTime()) / (60 * 60 * 1000)).toFixed(1)}h`);
    console.log(`   State: RESOLVING (ready to finalize)`);

    // Insert market into database
    const { data: market, error: marketError } = await supabase
      .from("markets")
      .insert({
        id: marketId,
        on_chain_address: onChainAddress,
        market_id: marketId,
        question: "TEST MARKET: Will this market finalize successfully?",
        description: "Test market for Market Monitor deployment validation",
        category: "crypto",
        creator_wallet: creatorWallet,
        state: "RESOLVING",
        b_parameter: "1000000000", // 1 SOL
        initial_liquidity: "1000000000",
        current_liquidity: "1000000000",
        shares_yes: "100000000", // 0.1 shares
        shares_no: "100000000",
        total_volume: "200000000",
        proposed_outcome: "YES",
        resolution_proposed_at: resolutionProposedAt.toISOString(),
        resolution_proposed_by: creatorWallet,
        proposal_likes: 0,
        proposal_dislikes: 0,
        dispute_agree: 0,
        dispute_disagree: 0,
        created_at: marketCreatedAt.toISOString(),
        is_cancelled: false,
      })
      .select()
      .single();

    if (marketError) {
      console.error("\n❌ Failed to create market:", marketError.message);
      throw marketError;
    }

    console.log("\n✅ Test market created successfully!");
    console.log(`   Database ID: ${market.id}`);
    console.log(`   Ready for finalization: YES (${((Date.now() - new Date(market.resolution_proposed_at).getTime()) / (60 * 60 * 1000)).toFixed(1)}h > 48h)`);

    // ========================================
    // Step 3: Run Market Monitor
    // ========================================
    console.log("\n" + "━".repeat(70));
    console.log("[3/5] Running Market Monitor Service");
    console.log("━".repeat(70));

    console.log("\n⚙️  Initializing Market Monitor...");

    const monitor = new MarketMonitor(
      program,
      connection,
      keypair,
      supabase,
      globalConfigPda
    );

    console.log("   ✅ Market Monitor initialized");
    console.log("\n🔄 Running monitoring cycle...");
    console.log("   (This will query database, check eligibility, and attempt finalization)");

    const summary = await monitor.run();

    // ========================================
    // Step 4: Analyze Results
    // ========================================
    console.log("\n" + "━".repeat(70));
    console.log("[4/5] Analyzing Results");
    console.log("━".repeat(70));

    console.log("\n📊 Execution Summary:");
    console.log(`   Start Time: ${new Date(summary.startTime).toISOString()}`);
    console.log(`   End Time: ${new Date(summary.endTime).toISOString()}`);
    console.log(`   Duration: ${summary.duration}ms`);
    console.log(`   Markets Found: ${summary.marketsFound}`);
    console.log(`   Success Count: ${summary.successCount}`);
    console.log(`   Fail Count: ${summary.failCount}`);

    // Display attempt details
    if (summary.attempts.length > 0) {
      console.log("\n🔍 Finalization Attempts:");
      for (const attempt of summary.attempts) {
        console.log(`\n   Market: ${attempt.marketId.slice(0, 16)}...`);
        console.log(`   Status: ${attempt.success ? "✅ SUCCESS" : "❌ FAILED"}`);
        console.log(`   Processing Time: ${attempt.processingTime}ms`);

        if (attempt.signature) {
          console.log(`   Transaction: ${attempt.signature}`);
          console.log(`   Explorer: https://explorer.solana.com/tx/${attempt.signature}?cluster=devnet`);
        }

        if (attempt.error) {
          console.log(`   Error: ${attempt.error}`);
        }
      }
    } else {
      console.log("\n   ⚠️  No finalization attempts made");
      console.log("   Possible reasons:");
      console.log("      - No markets found in RESOLVING state");
      console.log("      - Markets not yet eligible (< 48 hours)");
      console.log("      - Database query failed");
    }

    // ========================================
    // Step 5: Validate State Updates
    // ========================================
    console.log("\n" + "━".repeat(70));
    console.log("[5/5] Validating State Updates");
    console.log("━".repeat(70));

    // Check if market state was updated
    const { data: updatedMarket, error: fetchError } = await supabase
      .from("markets")
      .select("*")
      .eq("id", marketId)
      .single();

    if (fetchError) {
      console.error("\n❌ Failed to fetch updated market:", fetchError.message);
    } else {
      console.log("\n📊 Updated Market State:");
      console.log(`   Market ID: ${updatedMarket.id}`);
      console.log(`   State: ${updatedMarket.state}`);
      console.log(`   Proposed Outcome: ${updatedMarket.proposed_outcome || "N/A"}`);
      console.log(`   Resolution Finalized At: ${updatedMarket.resolution_finalized_at || "N/A"}`);

      if (updatedMarket.state === "FINALIZED") {
        console.log("\n✅ SUCCESS! Market was finalized");
        console.log("   ✅ Market Monitor detected market");
        console.log("   ✅ Finalization transaction succeeded");
        console.log("   ✅ Database state updated");
      } else if (updatedMarket.state === "RESOLVING") {
        console.log("\n⚠️  Market still in RESOLVING state");
        console.log("   Possible reasons:");
        console.log("      - Transaction failed (check logs above)");
        console.log("      - Insufficient balance for transaction");
        console.log("      - Program error (check on-chain logs)");
      }
    }

    // ========================================
    // Final Summary
    // ========================================
    console.log("\n" + "=".repeat(70));
    console.log(" Deployment Test Complete");
    console.log("=".repeat(70));

    if (summary.successCount > 0) {
      console.log("\n✅ DEPLOYMENT SUCCESSFUL!");
      console.log("\n🎉 Market Monitor is working correctly on devnet!");
      console.log("\nValidation Results:");
      console.log("   ✅ Environment configuration correct");
      console.log("   ✅ Database connection working");
      console.log("   ✅ Market detection logic working");
      console.log("   ✅ Finalization transaction successful");
      console.log("   ✅ State updates propagated");
    } else {
      console.log("\n⚠️  DEPLOYMENT VALIDATION INCOMPLETE");
      console.log("\nTroubleshooting:");
      console.log("   1. Check program is deployed: solana program show " + program.programId.toBase58());
      console.log("   2. Check global config initialized: anchor idl fetch " + program.programId.toBase58());
      console.log("   3. Check wallet balance: solana balance " + keypair.publicKey.toBase58());
      console.log("   4. Review error logs above");
    }

    console.log("\nNext Steps:");
    console.log("   1. Review logs above for any errors");
    console.log("   2. Check Solana Explorer for transaction details");
    console.log("   3. Run integration tests: npm run test:integration");
    console.log("   4. Set up automated monitoring: configure cron job");
    console.log("\n" + "=".repeat(70));

  } catch (error: any) {
    console.error("\n" + "=".repeat(70));
    console.error("❌ Deployment Failed");
    console.error("=".repeat(70));
    console.error("\nError:", error.message);
    if (error.stack) {
      console.error("\nStack Trace:");
      console.error(error.stack);
    }
    console.error("\n" + "=".repeat(70));
    process.exit(1);
  }
}

// Run main function
main();
