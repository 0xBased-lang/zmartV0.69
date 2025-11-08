"use strict";
// ============================================================
// ZMART Backend Services - Main Entry Point
// ============================================================
// Purpose: Initialize and start all backend services
// Updated: November 7, 2025 - Phase 2 Week 1 Day 1
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const logger_1 = __importDefault(require("./utils/logger"));
const config_1 = require("./config");
const server_1 = require("./api/server");
const websocket_1 = require("./services/websocket");
const vote_aggregator_1 = require("./services/vote-aggregator");
// Temporarily disabled due to ipfs-http-client package issue
// import { IPFSSnapshotScheduler } from "./services/ipfs";
const web3_js_1 = require("@solana/web3.js");
const anchor_1 = require("@coral-xyz/anchor");
const fs_1 = __importDefault(require("fs"));
// Store service instances for graceful shutdown
let voteAggregatorScheduler = null;
// let ipfsScheduler: IPFSSnapshotScheduler | null = null;
let wsServer = null;
/**
 * Main initialization function
 */
async function main() {
    try {
        logger_1.default.info("=".repeat(60));
        logger_1.default.info("ZMART Backend Services Starting...");
        logger_1.default.info("=".repeat(60));
        // Initialize config instances
        const connection = (0, config_1.getConnection)();
        const backendKeypair = (0, config_1.getBackendKeypair)();
        const supabase = (0, config_1.getSupabaseClient)();
        // Log configuration
        logger_1.default.info("Configuration loaded", {
            environment: config_1.config.node.env,
            solanaRpc: config_1.config.solana.rpcUrl,
            apiPort: config_1.config.api.port,
            wsPort: config_1.config.websocket.port,
            backendWallet: backendKeypair.publicKey.toBase58(),
        });
        // Test all connections
        logger_1.default.info("Testing external connections...");
        const allConnected = await (0, config_1.testAllConnections)();
        if (!allConnected) {
            logger_1.default.warn("Some connections failed. Continuing with available services...");
        }
        else {
            logger_1.default.info("All connections successful!");
        }
        // ============================================================
        // START SERVICES
        // ============================================================
        logger_1.default.info("=".repeat(60));
        logger_1.default.info("Starting Backend Services...");
        logger_1.default.info("=".repeat(60));
        // 1. Start API Server
        logger_1.default.info("[1/4] Starting API Server...");
        await (0, server_1.startServer)();
        logger_1.default.info(`[1/4] ✅ API Server running on port ${config_1.config.api.port}`);
        // 2. Start WebSocket Service
        logger_1.default.info("[2/4] Starting WebSocket Service...");
        const { wsServer: ws, broadcaster } = await (0, websocket_1.startWebSocketService)(supabase, config_1.config.websocket.port);
        wsServer = ws;
        logger_1.default.info(`[2/4] ✅ WebSocket Server running on port ${config_1.config.websocket.port}`);
        // 3. Start Vote Aggregator Service (if program IDL available)
        logger_1.default.info("[3/4] Starting Vote Aggregator Service...");
        try {
            // Check if IDL exists
            const idlPath = `/Users/seman/Desktop/zmartV0.69/target/idl/zmart_core.json`;
            if (fs_1.default.existsSync(idlPath)) {
                const idl = JSON.parse(fs_1.default.readFileSync(idlPath, "utf-8"));
                const provider = (0, config_1.getProvider)();
                const program = new anchor_1.Program(idl, provider);
                // Derive Global Config PDA
                const [globalConfigPda] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from("global_config")], program.programId);
                voteAggregatorScheduler = new vote_aggregator_1.VoteAggregatorScheduler(program, backendKeypair, supabase, globalConfigPda, "*/5 * * * *" // Run every 5 minutes
                );
                voteAggregatorScheduler.start();
                logger_1.default.info("[3/4] ✅ Vote Aggregator running (every 5 min)");
            }
            else {
                logger_1.default.warn("[3/4] ⚠️  Vote Aggregator SKIPPED (program IDL not found)");
                logger_1.default.warn("  → Build Anchor program first: anchor build");
                logger_1.default.warn("  → Then restart backend services");
            }
        }
        catch (error) {
            logger_1.default.error("[3/4] ❌ Vote Aggregator failed to start:", error);
            logger_1.default.warn("  → Continuing without vote aggregation");
        }
        // 4. IPFS Snapshot Service (temporarily disabled)
        logger_1.default.info("[4/4] IPFS Snapshot Service...");
        logger_1.default.warn("[4/4] ⚠️  IPFS Snapshot SKIPPED (ipfs-http-client package issue)");
        logger_1.default.warn("  → Will be re-enabled once package compatibility is resolved");
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
        logger_1.default.info("=".repeat(60));
        logger_1.default.info("🚀 ZMART Backend Services READY");
        logger_1.default.info("=".repeat(60));
        logger_1.default.info(`API Server: http://localhost:${config_1.config.api.port}`);
        logger_1.default.info(`WebSocket: ws://localhost:${config_1.config.websocket.port}`);
        logger_1.default.info(`Health Check: http://localhost:${config_1.config.api.port}/health`);
        logger_1.default.info(`Backend Wallet: ${backendKeypair.publicKey.toBase58()}`);
        logger_1.default.info("=".repeat(60));
    }
    catch (error) {
        logger_1.default.error("Failed to start backend services", { error });
        process.exit(1);
    }
}
// Handle graceful shutdown
process.on("SIGINT", async () => {
    logger_1.default.info("SIGINT received, shutting down gracefully...");
    // Stop vote aggregator
    if (voteAggregatorScheduler) {
        voteAggregatorScheduler.stop();
        logger_1.default.info("Vote aggregator stopped");
    }
    // Stop IPFS scheduler
    // if (ipfsScheduler) {
    //   ipfsScheduler.stop();
    //   logger.info("IPFS scheduler stopped");
    // }
    // WebSocket server handles its own shutdown via startWebSocketService
    logger_1.default.info("Graceful shutdown complete");
    process.exit(0);
});
process.on("SIGTERM", async () => {
    logger_1.default.info("SIGTERM received, shutting down gracefully...");
    // Stop vote aggregator
    if (voteAggregatorScheduler) {
        voteAggregatorScheduler.stop();
    }
    // Stop IPFS scheduler
    // if (ipfsScheduler) {
    //   ipfsScheduler.stop();
    // }
    logger_1.default.info("Graceful shutdown complete");
    process.exit(0);
});
// Handle unhandled rejections
process.on("unhandledRejection", (reason, promise) => {
    logger_1.default.error("Unhandled Rejection at:", { promise, reason });
});
process.on("uncaughtException", (error) => {
    logger_1.default.error("Uncaught Exception:", { error });
    process.exit(1);
});
// Start application
main();
//# sourceMappingURL=index.js.map