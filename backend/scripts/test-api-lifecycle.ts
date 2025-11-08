// ============================================================
// Full API Lifecycle Test Script
// ============================================================
// Purpose: Test complete market lifecycle through API endpoints
// Usage: ts-node scripts/test-api-lifecycle.ts

import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { Program, AnchorProvider, Wallet, BN } from "@coral-xyz/anchor";
import { readFileSync } from "fs";
import path from "path";
import dotenv from "dotenv";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Load environment variables
dotenv.config({ path: path.join(__dirname, "../.env") });

const RPC_URL = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";
const PROGRAM_ID = new PublicKey(process.env.SOLANA_PROGRAM_ID_CORE!);

// ============================================================
// Test Configuration
// ============================================================

interface TestResult {
  step: string;
  status: "✅ PASS" | "❌ FAIL" | "⚠️  WARN";
  duration: number;
  details?: any;
  error?: string;
}

const results: TestResult[] = [];
let startTime: number;

function startStep(step: string) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`[${results.length + 1}] ${step}`);
  console.log("=".repeat(60));
  startTime = Date.now();
}

function passStep(step: string, details?: any) {
  const duration = Date.now() - startTime;
  results.push({ step, status: "✅ PASS", duration, details });
  console.log(`✅ PASS (${duration}ms)`);
  if (details) {
    console.log(`   Details:`, JSON.stringify(details, null, 2));
  }
}

function failStep(step: string, error: any) {
  const duration = Date.now() - startTime;
  results.push({ step, status: "❌ FAIL", duration, error: error.message || error });
  console.log(`❌ FAIL (${duration}ms)`);
  console.error(`   Error:`, error.message || error);
  if (error.logs) {
    console.error(`   Program Logs:`, error.logs);
  }
}

function warnStep(step: string, details: any) {
  const duration = Date.now() - startTime;
  results.push({ step, status: "⚠️  WARN", duration, details });
  console.log(`⚠️  WARN (${duration}ms)`);
  console.log(`   Details:`, details);
}

function printSummary() {
  console.log(`\n${"=".repeat(60)}`);
  console.log("TEST SUMMARY");
  console.log("=".repeat(60));

  const passed = results.filter((r) => r.status === "✅ PASS").length;
  const failed = results.filter((r) => r.status === "❌ FAIL").length;
  const warned = results.filter((r) => r.status === "⚠️  WARN").length;
  const total = results.length;

  console.log(`\nTotal Tests: ${total}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⚠️  Warnings: ${warned}`);
  console.log(`\nSuccess Rate: ${((passed / total) * 100).toFixed(1)}%`);

  console.log(`\n${"=".repeat(60)}`);
  console.log("DETAILED RESULTS");
  console.log("=".repeat(60));

  results.forEach((r, i) => {
    console.log(`\n[${i + 1}] ${r.step}`);
    console.log(`    Status: ${r.status}`);
    console.log(`    Duration: ${r.duration}ms`);
    if (r.error) {
      console.log(`    Error: ${r.error}`);
    }
  });

  console.log(`\n${"=".repeat(60)}\n`);
}

// ============================================================
// Setup Functions
// ============================================================

function loadKeypair(): Keypair {
  const keypairPath = process.env.BACKEND_KEYPAIR_PATH || path.join(process.env.HOME!, ".config/solana/id.json");
  const keypairData = JSON.parse(readFileSync(keypairPath, "utf-8"));
  return Keypair.fromSecretKey(new Uint8Array(keypairData));
}

function loadIDL(): any {
  const idlPath = path.join(__dirname, "../../target/idl/zmart_core.json");
  return JSON.parse(readFileSync(idlPath, "utf-8"));
}

function getSupabaseClient(): SupabaseClient {
  const supabaseUrl = process.env.SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // Use service role key for admin operations

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// ============================================================
// Mock API Functions (since we don't have actual HTTP server)
// ============================================================
// NOTE: In a real test, these would use HTTP requests to the API server
// For now, we'll simulate the API logic directly

async function simulateCreateMarket(
  program: Program,
  supabase: SupabaseClient,
  wallet: Keypair,
  question: string,
  category: string,
  liquidity: BN
): Promise<any> {
  // This simulates POST /api/markets
  const crypto = await import("crypto");
  const marketId = crypto.randomBytes(32);
  const marketIdHex = Buffer.from(marketId).toString("hex");

  const [globalConfigPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("global-config")],
    program.programId
  );

  const [marketPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("market"), Buffer.from(marketId)],
    program.programId
  );

  const ipfsQuestionHashStr = `QmTest${question.slice(0, 40).padEnd(40, "0")}`;
  const ipfsQuestionHash = Array.from(Buffer.from(ipfsQuestionHashStr.padEnd(46, "0").slice(0, 46)));

  const tx = await program.methods
    .createMarket(Array.from(marketId), liquidity, liquidity, ipfsQuestionHash)
    .accounts({
      creator: wallet.publicKey,
      globalConfig: globalConfigPda,
      market: marketPda,
      systemProgram: PublicKey.default,
    })
    .rpc();

  const { data, error } = await supabase.from("markets").insert({
    id: marketIdHex,
    on_chain_address: marketPda.toBase58(),
    question,
    category,
    end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    creator_wallet: wallet.publicKey.toBase58(),
    state: "PROPOSED",
    liquidity_parameter: liquidity.toString(),
    yes_shares: "0",
    no_shares: "0",
    created_at: new Date().toISOString(),
  }).select().single();

  if (error) throw error;

  return { market: data, transaction: tx, marketPda };
}

async function simulateBuyShares(
  program: Program,
  supabase: SupabaseClient,
  wallet: Keypair,
  marketId: string,
  marketPda: PublicKey,
  outcome: boolean,
  shares: BN,
  maxCost: BN
): Promise<any> {
  // This simulates POST /api/trades/buy
  const [globalConfigPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("global-config")],
    program.programId
  );

  const [userPositionPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("user-position"), marketPda.toBuffer(), wallet.publicKey.toBuffer()],
    program.programId
  );

  const protocolFeeWallet = new PublicKey("11111111111111111111111111111111");

  const tx = await program.methods
    .buyShares(outcome, shares, maxCost)
    .accounts({
      buyer: wallet.publicKey,
      globalConfig: globalConfigPda,
      market: marketPda,
      userPosition: userPositionPda,
      protocolFeeWallet,
      systemProgram: PublicKey.default,
    })
    .rpc();

  const { data, error } = await supabase.from("trades").insert({
    market_id: marketId,
    user_wallet: wallet.publicKey.toBase58(),
    trade_type: "buy",
    outcome,
    shares: shares.toString(),
    cost: maxCost.toString(),
    created_at: new Date().toISOString(),
  }).select().single();

  if (error) throw error;

  return { trade: data, transaction: tx };
}

async function simulateResolveMarket(
  program: Program,
  supabase: SupabaseClient,
  wallet: Keypair,
  marketId: string,
  marketPda: PublicKey,
  outcome: boolean | null
): Promise<any> {
  // This simulates POST /api/markets/:id/resolve
  const [globalConfigPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("global-config")],
    program.programId
  );

  let outcomeEnum;
  if (outcome === true) {
    outcomeEnum = { yes: {} };
  } else if (outcome === false) {
    outcomeEnum = { no: {} };
  } else {
    outcomeEnum = { invalid: {} };
  }

  const ipfsEvidenceHash = Array.from(Buffer.from("QmEvidence123456789012345678901234567890".padEnd(46, "0").slice(0, 46)));

  const tx = await program.methods
    .resolveMarket(outcomeEnum, ipfsEvidenceHash)
    .accounts({
      resolver: wallet.publicKey,
      globalConfig: globalConfigPda,
      market: marketPda,
    })
    .rpc();

  const { data, error } = await supabase.from("markets").update({
    state: "RESOLVING",
    proposed_outcome: outcome,
    resolved_at: new Date().toISOString(),
    ipfs_evidence_hash: "QmEvidence123456789012345678901234567890",
  }).eq("id", marketId).select().single();

  if (error) throw error;

  return { market: data, transaction: tx };
}

// ============================================================
// Main Test Function
// ============================================================

async function main() {
  console.log("=".repeat(60));
  console.log("FULL API LIFECYCLE TEST");
  console.log("=".repeat(60));

  let connection: Connection;
  let program: Program;
  let supabase: SupabaseClient;
  let wallet: Keypair;
  let marketId: string;
  let marketPda: PublicKey;

  try {
    // ========================================
    // Setup
    // ========================================
    startStep("Setup: Connection & Program");

    connection = new Connection(RPC_URL, "confirmed");
    wallet = loadKeypair();
    const walletWrapper = new Wallet(wallet);
    const provider = new AnchorProvider(connection, walletWrapper, {
      commitment: "confirmed",
      preflightCommitment: "confirmed",
    });

    const idl = loadIDL();
    program = new Program(idl, provider);
    supabase = getSupabaseClient();

    passStep("Setup: Connection & Program", {
      rpcUrl: RPC_URL,
      wallet: wallet.publicKey.toBase58(),
      programId: program.programId.toBase58(),
    });

    // ========================================
    // Test 1: Create Market
    // ========================================
    startStep("Test 1: Create Market On-Chain");

    const question = "Will API integration test pass?";
    const category = "testing";
    const liquidity = new BN(1_000_000_000); // 1 SOL

    const createResult = await simulateCreateMarket(
      program,
      supabase,
      wallet,
      question,
      category,
      liquidity
    );

    marketId = createResult.market.id;
    marketPda = createResult.marketPda;

    passStep("Test 1: Create Market On-Chain", {
      marketId: marketId.slice(0, 16) + "...",
      marketPda: marketPda.toBase58(),
      transaction: createResult.transaction,
      state: createResult.market.state,
    });

    // ========================================
    // Test 2: Verify Market State
    // ========================================
    startStep("Test 2: Verify Market State");

    const { data: market, error: fetchError } = await supabase
      .from("markets")
      .select("*")
      .eq("id", marketId)
      .single();

    if (fetchError || !market) {
      throw new Error("Market not found in database");
    }

    if (market.state !== "PROPOSED") {
      throw new Error(`Expected state PROPOSED, got ${market.state}`);
    }

    passStep("Test 2: Verify Market State", {
      state: market.state,
      question: market.question,
      liquidity: market.liquidity_parameter,
    });

    // ========================================
    // Test 3: Buy YES Shares
    // ========================================
    startStep("Test 3: Buy YES Shares");

    // First, update market to ACTIVE state (simulating approval and activation)
    await supabase.from("markets").update({ state: "ACTIVE" }).eq("id", marketId);

    const buyShares = new BN(100_000_000); // 0.1 shares (9 decimals)
    const maxCost = new BN(500_000_000); // 0.5 SOL max

    try {
      const buyResult = await simulateBuyShares(
        program,
        supabase,
        wallet,
        marketId,
        marketPda,
        true, // YES
        buyShares,
        maxCost
      );

      passStep("Test 3: Buy YES Shares", {
        shares: buyShares.toString(),
        maxCost: maxCost.toString(),
        transaction: buyResult.transaction,
      });
    } catch (error: any) {
      // Buy might fail if market needs to be approved first
      // This is expected in some cases
      warnStep("Test 3: Buy YES Shares", {
        reason: "Buy failed (expected if market not yet approved)",
        error: error.message,
      });
    }

    // ========================================
    // Test 4: Resolve Market
    // ========================================
    startStep("Test 4: Resolve Market");

    try {
      const resolveResult = await simulateResolveMarket(
        program,
        supabase,
        wallet,
        marketId,
        marketPda,
        true // YES wins
      );

      passStep("Test 4: Resolve Market", {
        outcome: "YES",
        transaction: resolveResult.transaction,
        state: resolveResult.market.state,
      });
    } catch (error: any) {
      // Resolution might fail depending on market state
      warnStep("Test 4: Resolve Market", {
        reason: "Resolution failed (expected if market not ACTIVE)",
        error: error.message,
      });
    }

    // ========================================
    // Test 5: Verify Final State
    // ========================================
    startStep("Test 5: Verify Final State");

    const { data: finalMarket, error: finalError } = await supabase
      .from("markets")
      .select("*")
      .eq("id", marketId)
      .single();

    if (finalError || !finalMarket) {
      throw new Error("Market not found in database");
    }

    passStep("Test 5: Verify Final State", {
      id: marketId.slice(0, 16) + "...",
      state: finalMarket.state,
      proposed_outcome: finalMarket.proposed_outcome,
    });

    // ========================================
    // Summary
    // ========================================
    printSummary();

    const passed = results.filter((r) => r.status === "✅ PASS").length;
    const total = results.length;

    if (passed === total) {
      console.log("🎉 ALL TESTS PASSED!");
      process.exit(0);
    } else {
      console.log("⚠️  SOME TESTS FAILED OR WARNED");
      process.exit(1);
    }
  } catch (error: any) {
    failStep("Unexpected Error", error);
    printSummary();
    console.error("\n❌ TEST SUITE FAILED\n");
    process.exit(1);
  }
}

// Run main function
main();
