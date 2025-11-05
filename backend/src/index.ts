// ============================================================
// ZMART Backend Services - Main Entry Point
// ============================================================
// Purpose: Initialize and start all backend services
// Week 2 Day 8: Infrastructure Setup

import logger from "./utils/logger";
import { config, testAllConnections } from "./config";

/**
 * Main initialization function
 */
async function main() {
  try {
    logger.info("=".repeat(60));
    logger.info("ZMART Backend Services Starting...");
    logger.info("=".repeat(60));

    // Log configuration
    logger.info("Configuration loaded", {
      environment: config.node.env,
      solanaRpc: config.solana.rpcUrl,
      apiPort: config.api.port,
      wsPort: config.websocket.port,
    });

    // Test all connections
    logger.info("Testing external connections...");
    const allConnected = await testAllConnections();

    if (!allConnected) {
      logger.error("Some connections failed. Please check configuration.");
      process.exit(1);
    }

    logger.info("All connections successful!");

    logger.info("=".repeat(60));
    logger.info("ZMART Backend Services Ready");
    logger.info("=".repeat(60));

    // TODO: Start services (Week 2 Days 9-13)
    // - Vote Aggregator Service
    // - IPFS Service
    // - Market Monitor Service
    // - API Server
    // - WebSocket Server

    logger.info("Services will be started in upcoming stories");
    logger.info("Current status: Infrastructure ready ✅");
  } catch (error) {
    logger.error("Failed to start backend services", { error });
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on("SIGINT", async () => {
  logger.info("SIGINT received, shutting down gracefully...");
  // TODO: Close connections and cleanup
  process.exit(0);
});

process.on("SIGTERM", async () => {
  logger.info("SIGTERM received, shutting down gracefully...");
  // TODO: Close connections and cleanup
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
