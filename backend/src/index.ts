// ============================================================
// ZMART Backend Services - Main Entry Point
// ============================================================
// Purpose: Initialize and start all backend services
// Updated: November 7, 2025 - Phase 2 Week 1 Day 1

import logger from "./utils/logger";
import { config, testAllConnections, getSupabaseClient, getConnection, getBackendKeypair, getProvider, getProgramIds } from "./config";
import { startServer as startAPIServer } from "./api/server";
import { startWebSocketService } from "./services/websocket";
import { VoteAggregatorScheduler } from "./services/vote-aggregator";
// Temporarily disabled due to ipfs-http-client package issue
// import { IPFSSnapshotScheduler } from "./services/ipfs";
import { PublicKey } from "@solana/web3.js";
import { Program, AnchorProvider } from "@coral-xyz/anchor";
import fs from "fs";
import path from "path";

// Store service instances for graceful shutdown
let voteAggregatorScheduler: VoteAggregatorScheduler | null = null;
// let ipfsScheduler: IPFSSnapshotScheduler | null = null;
let wsServer: any = null;

/**
 * Main initialization function
 */
async function main() {
  try {
    logger.info("=".repeat(60));
    logger.info("ZMART Backend Services Starting...");
    logger.info("=".repeat(60));

    // Initialize config instances
    const connection = getConnection();
    const backendKeypair = getBackendKeypair();
    const supabase = getSupabaseClient();

    // Log configuration
    logger.info("Configuration loaded", {
      environment: config.node.env,
      solanaRpc: config.solana.rpcUrl,
      apiPort: config.api.port,
      wsPort: config.websocket.port,
      backendWallet: backendKeypair.publicKey.toBase58(),
    });

    // Test all connections
    logger.info("Testing external connections...");
    const allConnected = await testAllConnections();

    if (!allConnected) {
      logger.warn("Some connections failed. Continuing with available services...");
    } else {
      logger.info("All connections successful!");
    }

    // ============================================================
    // START SERVICES
    // ============================================================

    logger.info("=".repeat(60));
    logger.info("Starting Backend Services...");
    logger.info("=".repeat(60));

    // 1. Start API Server
    logger.info("[1/4] Starting API Server...");
    await startAPIServer();
    logger.info(`[1/4] ✅ API Server running on port ${config.api.port}`);

    // 2. Start WebSocket Service
    logger.info("[2/4] Starting WebSocket Service...");
    const { wsServer: ws, broadcaster } = await startWebSocketService(
      supabase,
      config.websocket.port
    );
    wsServer = ws;
    logger.info(`[2/4] ✅ WebSocket Server running on port ${config.websocket.port}`);

    // 3. Start Vote Aggregator Service (if program IDL available)
    logger.info("[3/4] Starting Vote Aggregator Service...");
    try {
      // Check if IDL exists (relative path works in both dev and production)
      const idlPath = path.join(__dirname, '../target/idl/zmart_core.json');
      if (fs.existsSync(idlPath)) {
        const idl = JSON.parse(fs.readFileSync(idlPath, "utf-8"));
        const provider = getProvider();
        const program = new Program(idl, provider);

        // Derive Global Config PDA
        const [globalConfigPda] = PublicKey.findProgramAddressSync(
          [Buffer.from("global_config")],
          program.programId
        );

        voteAggregatorScheduler = new VoteAggregatorScheduler(
          program,
          backendKeypair,
          supabase,
          globalConfigPda,
          "*/5 * * * *" // Run every 5 minutes
        );
        voteAggregatorScheduler.start();
        logger.info("[3/4] ✅ Vote Aggregator running (every 5 min)");
      } else {
        logger.warn("[3/4] ⚠️  Vote Aggregator SKIPPED (program IDL not found)");
        logger.warn("  → Build Anchor program first: anchor build");
        logger.warn("  → Then restart backend services");
      }
    } catch (error) {
      logger.error("[3/4] ❌ Vote Aggregator failed to start:", error);
      logger.warn("  → Continuing without vote aggregation");
    }

    // 4. IPFS Snapshot Service (temporarily disabled)
    logger.info("[4/4] IPFS Snapshot Service...");
    logger.warn("[4/4] ⚠️  IPFS Snapshot SKIPPED (ipfs-http-client package issue)");
    logger.warn("  → Will be re-enabled once package compatibility is resolved");
    // try {
    //   ipfsScheduler = new IPFSSnapshotScheduler(
    //     supabase,
    //     config.services.ipfsSnapshotCron // Default: "0 0 * * *" (midnight UTC)
    //   );
    //   ipfsScheduler.start();
    //   logger.info("[4/4] ✅ IPFS Snapshot running (daily at midnight UTC)");
    // } catch (error) {
    //   logger.error("[4/4] ❌ IPFS Snapshot failed to start:", error);
    //   logger.warn("  → Continuing without IPFS snapshots");
    // }

    logger.info("=".repeat(60));
    logger.info("🚀 ZMART Backend Services READY");
    logger.info("=".repeat(60));
    logger.info(`API Server: http://localhost:${config.api.port}`);
    logger.info(`WebSocket: ws://localhost:${config.websocket.port}`);
    logger.info(`Health Check: http://localhost:${config.api.port}/health`);
    logger.info(`Backend Wallet: ${backendKeypair.publicKey.toBase58()}`);
    logger.info("=".repeat(60));
  } catch (error) {
    logger.error("Failed to start backend services", { error });
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on("SIGINT", async () => {
  logger.info("SIGINT received, shutting down gracefully...");

  // Stop vote aggregator
  if (voteAggregatorScheduler) {
    voteAggregatorScheduler.stop();
    logger.info("Vote aggregator stopped");
  }

  // Stop IPFS scheduler
  // if (ipfsScheduler) {
  //   ipfsScheduler.stop();
  //   logger.info("IPFS scheduler stopped");
  // }

  // WebSocket server handles its own shutdown via startWebSocketService

  logger.info("Graceful shutdown complete");
  process.exit(0);
});

process.on("SIGTERM", async () => {
  logger.info("SIGTERM received, shutting down gracefully...");

  // Stop vote aggregator
  if (voteAggregatorScheduler) {
    voteAggregatorScheduler.stop();
  }

  // Stop IPFS scheduler
  // if (ipfsScheduler) {
  //   ipfsScheduler.stop();
  // }

  logger.info("Graceful shutdown complete");
  process.exit(0);
});

// Handle unhandled rejections
process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection at:", { promise, reason });
});

process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception:", { error });
  process.exit(1);
});

// Start application
main();
