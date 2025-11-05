// ============================================================
// Express API Server
// ============================================================
// Purpose: REST API gateway for ZMART prediction market
// Story: 2.4 (Day 12)

import express, { Express, Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import morgan from "morgan";
import logger from "../utils/logger";
import { config } from "../config";

// Import routes
import marketRoutes from "./routes/markets";
import tradeRoutes from "./routes/trades";
import voteRoutes from "./routes/votes";
import discussionRoutes from "./routes/discussions";
import userRoutes from "./routes/users";

// Import middleware
import { errorHandler } from "./middleware/error-handler";

/**
 * Create and configure Express application
 */
export function createApp(): Express {
  const app = express();

  // Security middleware
  app.use(helmet());

  // CORS configuration
  const corsOptions = {
    origin: config.api.corsOrigins, // From env: ["http://localhost:3000", "https://app.zmart.io"]
    credentials: true,
    optionsSuccessStatus: 200,
  };
  app.use(cors(corsOptions));

  // Body parsing
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));

  // HTTP request logging
  app.use(
    morgan("combined", {
      stream: {
        write: (message: string) => logger.http(message.trim()),
      },
    })
  );

  // Rate limiting (100 requests per 15 minutes per IP)
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: {
      error: "Too many requests from this IP, please try again later.",
      status: 429,
    },
    standardHeaders: true, // Return rate limit info in RateLimit-* headers
    legacyHeaders: false, // Disable X-RateLimit-* headers
  });
  app.use("/api/", limiter);

  // Health check endpoint
  app.get("/health", (req: Request, res: Response) => {
    res.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || "development",
    });
  });

  // API routes
  app.use("/api/markets", marketRoutes);
  app.use("/api/trades", tradeRoutes);
  app.use("/api/votes", voteRoutes);
  app.use("/api/discussions", discussionRoutes);
  app.use("/api/users", userRoutes);

  // 404 handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      error: "Not Found",
      message: `Route ${req.method} ${req.path} not found`,
      status: 404,
      timestamp: new Date().toISOString(),
    });
  });

  // Error handling middleware (must be last)
  app.use(errorHandler);

  return app;
}

/**
 * Start the Express server
 */
export async function startServer(): Promise<void> {
  const app = createApp();
  const port = config.api.port;

  const server = app.listen(port, () => {
    logger.info(`[API Server] Started on port ${port}`);
    logger.info(`[API Server] Health check: http://localhost:${port}/health`);
    logger.info(`[API Server] API base URL: http://localhost:${port}/api`);
    logger.info(`[API Server] Environment: ${process.env.NODE_ENV || "development"}`);
  });

  // Graceful shutdown
  process.on("SIGTERM", () => {
    logger.info("[API Server] SIGTERM received, shutting down gracefully...");
    server.close(() => {
      logger.info("[API Server] Server closed");
      process.exit(0);
    });
  });

  process.on("SIGINT", () => {
    logger.info("[API Server] SIGINT received, shutting down gracefully...");
    server.close(() => {
      logger.info("[API Server] Server closed");
      process.exit(0);
    });
  });
}
