// ============================================================
// Create Market On-Chain Script
// ============================================================
// Purpose: Create a test prediction market on devnet
// Usage: ts-node scripts/create-market-onchain.ts

import { Connection, PublicKey, SystemProgram } from "@solana/web3.js";
import { Program, AnchorProvider, Wallet, BN } from "@coral-xyz/anchor";
import crypto from "crypto";
import {
  getScriptConfig,
  loadKeypair,
  loadIDL,
  loadProgramId,
  getSolanaRpcUrl
} from "./utils/scriptConfig";

// Load and validate configuration
const config = getScriptConfig();
const RPC_URL = getSolanaRpcUrl();
const PROGRAM_ID = loadProgramId('SOLANA_PROGRAM_ID_CORE');

// ============================================================
// Main Function
// ============================================================

async function main() {
  console.log("=".repeat(60));
  console.log("Creating Test Market on Devnet");
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

    // Load program
    const idl = loadIDL('zmart_core');
    const program = new Program(idl, provider);

    console.log(`\n[Program] Loaded`);
    console.log(`   Program ID: ${program.programId.toBase58()}`);

    // ========================================
    // 1. Derive Global Config PDA
    // ========================================
    console.log("\n[1/5] Deriving PDAs...");

    const [globalConfigPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("global-config")],
      program.programId
    );

    console.log(`   Global Config PDA: ${globalConfigPda.toBase58()}`);

    // Generate unique market ID
    const marketId = crypto.randomBytes(32);
    console.log(`   Market ID: ${Buffer.from(marketId).toString("hex").slice(0, 16)}...`);

    // Derive Market PDA
    const [marketPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("market"), Buffer.from(marketId)],
      program.programId
    );

    console.log(`   Market PDA: ${marketPda.toBase58()}`);

    // ========================================
    // 2. Prepare Market Parameters
    // ========================================
    console.log("\n[2/5] Preparing market parameters...");

    const question = "Will Bitcoin reach $100k by end of 2025?";
    const ipfsQuestionHashStr = "QmTestHash123456789012345678901234567890"; // 46 chars (IPFS CID format)

    // Convert IPFS hash string to byte array [u8; 46]
    const ipfsQuestionHash = Array.from(Buffer.from(ipfsQuestionHashStr.padEnd(46, '0').slice(0, 46)));

    // LMSR parameters
    const bParameter = new BN(1_000_000_000); // 1 SOL (9 decimals)
    const initialLiquidity = new BN(1_000_000_000); // 1 SOL

    console.log(`   Question: ${question}`);
    console.log(`   IPFS Hash: ${ipfsQuestionHashStr}`);
    console.log(`   B Parameter: ${bParameter.toString()} (${bParameter.div(new BN(1e9))} SOL)`);
    console.log(`   Initial Liquidity: ${initialLiquidity.toString()} (${initialLiquidity.div(new BN(1e9))} SOL)`);

    // ========================================
    // 3. Check if market already exists
    // ========================================
    console.log("\n[3/5] Checking if market exists...");

    try {
      const accountInfo = await connection.getAccountInfo(marketPda);
      if (accountInfo) {
        console.log("   ⚠️  Market PDA already exists!");
        console.log("   Using existing market for testing");
        console.log(`\n   Market PDA: ${marketPda.toBase58()}`);
        console.log(`   Explorer: https://explorer.solana.com/address/${marketPda.toBase58()}?cluster=devnet`);
        return;
      }
    } catch (error: any) {
      // Market doesn't exist, continue
    }

    console.log("   Market does not exist. Creating new market...");

    // ========================================
    // 4. Create Market
    // ========================================
    console.log("\n[4/5] Creating market on-chain...");

    const tx = await program.methods
      .createMarket(
        Array.from(marketId), // market_id as number[]
        bParameter,
        initialLiquidity,
        ipfsQuestionHash
      )
      .accounts({
        creator: keypair.publicKey,
        globalConfig: globalConfigPda,
        market: marketPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log(`   ✅ Market created!`);
    console.log(`   Transaction: ${tx}`);
    console.log(`   Explorer: https://explorer.solana.com/tx/${tx}?cluster=devnet`);

    // Wait for confirmation
    await connection.confirmTransaction(tx, "confirmed");

    // ========================================
    // 5. Fetch and Display Market Data
    // ========================================
    console.log("\n[5/5] Fetching market data...");

    // Fetch market account (need to wait a moment for account to be created)
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const marketAccount = await connection.getAccountInfo(marketPda);

    if (marketAccount) {
      console.log(`   ✅ Market account exists`);
      console.log(`   Data Length: ${marketAccount.data.length} bytes`);
      console.log(`   Owner: ${marketAccount.owner.toBase58()}`);
      console.log(`   Lamports: ${marketAccount.lamports}`);
    } else {
      console.log("   ⚠️  Market account not found (may need more time)");
    }

    console.log("\n" + "=".repeat(60));
    console.log("✅ Market Creation Complete!");
    console.log("=".repeat(60));
    console.log(`\nMarket PDA: ${marketPda.toBase58()}`);
    console.log(`Market ID: ${Buffer.from(marketId).toString("hex")}`);
    console.log(`Question: ${question}`);
    console.log(`State: PROPOSED (awaiting votes)`);
    console.log(`Creator: ${keypair.publicKey.toBase58()}`);
    console.log("\nExplorer Links:");
    console.log(`   Market: https://explorer.solana.com/address/${marketPda.toBase58()}?cluster=devnet`);
    console.log(`   Transaction: https://explorer.solana.com/tx/${tx}?cluster=devnet`);
    console.log("\nNext Steps:");
    console.log("1. Submit proposal votes (backend will aggregate)");
    console.log("2. Once 70% approval reached, admin can approve market");
    console.log("3. Market becomes ACTIVE for trading");
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
