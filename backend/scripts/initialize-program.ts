// ============================================================
// Initialize Program Script
// ============================================================
// Purpose: Initialize global config on-chain and create test market
// Usage: ts-node scripts/initialize-program.ts

import { Connection, Keypair, PublicKey, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { Program, AnchorProvider, Wallet, BN } from "@coral-xyz/anchor";
import { readFileSync } from "fs";
import path from "path";
import dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: path.join(__dirname, "../.env") });

const RPC_URL = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";
const PROGRAM_ID = new PublicKey(process.env.SOLANA_PROGRAM_ID_CORE!);

// Load backend keypair
function loadKeypair(): Keypair {
  const keypairPath = process.env.BACKEND_KEYPAIR_PATH || path.join(process.env.HOME!, ".config/solana/id.json");
  const keypairData = JSON.parse(readFileSync(keypairPath, "utf-8"));
  return Keypair.fromSecretKey(new Uint8Array(keypairData));
}

// Load IDL
function loadIDL(): any {
  const idlPath = path.join(__dirname, "../../target/idl/zmart_core.json");
  return JSON.parse(readFileSync(idlPath, "utf-8"));
}

// ============================================================
// Main Function
// ============================================================

async function main() {
  console.log("=".repeat(60));
  console.log("Initializing ZMART Program on Devnet");
  console.log("=".repeat(60));

  try {
    // Setup connection and provider
    const connection = new Connection(RPC_URL, "confirmed");
    const keypair = loadKeypair();
    const wallet = new Wallet(keypair);
    const provider = new AnchorProvider(connection, wallet, {
      commitment: "confirmed",
      preflightCommitment: "confirmed",
    });

    console.log("\n[Setup] Connection & Wallet");
    console.log(`   RPC URL: ${RPC_URL}`);
    console.log(`   Wallet: ${keypair.publicKey.toBase58()}`);

    // Check balance
    const balance = await connection.getBalance(keypair.publicKey);
    console.log(`   Balance: ${(balance / LAMPORTS_PER_SOL).toFixed(4)} SOL`);

    if (balance < 0.1 * LAMPORTS_PER_SOL) {
      console.log("\n❌ Insufficient balance. Please airdrop some SOL:");
      console.log(`   solana airdrop 1 ${keypair.publicKey.toBase58()} --url devnet`);
      process.exit(1);
    }

    // Load program
    const idl = loadIDL();
    const program = new Program(idl, provider);

    console.log(`\n[Program] Loaded`);
    console.log(`   Program ID: ${program.programId.toBase58()}`);

    // ========================================
    // 1. Derive Global Config PDA
    // ========================================
    console.log("\n[1/3] Deriving Global Config PDA...");

    const [globalConfigPda, globalConfigBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("global-config")], // Use hyphen, not underscore!
      program.programId
    );

    console.log(`   Global Config PDA: ${globalConfigPda.toBase58()}`);
    console.log(`   Bump: ${globalConfigBump}`);

    // ========================================
    // 2. Check if already initialized
    // ========================================
    console.log("\n[2/3] Checking if already initialized...");

    try {
      const accountInfo = await connection.getAccountInfo(globalConfigPda);
      if (accountInfo) {
        console.log("   ✅ Global Config already initialized!");
        console.log(`   Account exists with ${accountInfo.data.length} bytes`);
        console.log("\n   Skipping initialization (already done)");

        // Display success
        console.log("\n" + "=".repeat(60));
        console.log("✅ Program Initialization Complete!");
        console.log("=".repeat(60));
        console.log(`\nGlobal Config PDA: ${globalConfigPda.toBase58()}`);
        console.log(`Admin Wallet: ${keypair.publicKey.toBase58()}`);
        return;
      }
    } catch (error: any) {
    }

    // Not initialized yet
    console.log("   Global Config NOT initialized. Initializing now...");

    // ========================================
    // 3. Initialize Global Config
    // ========================================
    console.log("\n[3/3] Initializing Global Config...");

    const tx = await program.methods
      .initializeGlobalConfig(
        keypair.publicKey // backend_authority
      )
      .accounts({
        admin: keypair.publicKey,
        globalConfig: globalConfigPda,
        protocolFeeWallet: keypair.publicKey, // Use same wallet for testing
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log(`   ✅ Global Config initialized!`);
    console.log(`   Transaction: ${tx}`);
    console.log(`   Explorer: https://explorer.solana.com/tx/${tx}?cluster=devnet`);

    // Wait for confirmation
    await connection.confirmTransaction(tx, "confirmed");

    console.log("\n   Global Config Details:");
    console.log(`   Protocol Fee: 300 bps (3%)`);
    console.log(`   Creator Fee: 200 bps (2%)`);
    console.log(`   Staker Fee: 500 bps (5%)`);
    console.log(`   Total Fee: 1000 bps (10%)`);
    console.log(`   Admin: ${keypair.publicKey.toBase58()}`)

    console.log("\n" + "=".repeat(60));
    console.log("✅ Program Initialization Complete!");
    console.log("=".repeat(60));
    console.log(`\nGlobal Config PDA: ${globalConfigPda.toBase58()}`);
    console.log(`Admin Wallet: ${keypair.publicKey.toBase58()}`);
    console.log("\nNext Steps:");
    console.log("1. Create a test market:");
    console.log("   ts-node scripts/create-market-onchain.ts");
    console.log("2. Test voting:");
    console.log("   ts-node scripts/test-voting-onchain.ts");
  } catch (error: any) {
    console.error("\n❌ Error:", error.message);
    if (error.logs) {
      console.error("\nProgram Logs:");
      error.logs.forEach((log: string) => console.error(`   ${log}`));
    }
    process.exit(1);
  }
}

// Run main function
main();
