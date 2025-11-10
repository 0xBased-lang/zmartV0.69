"use strict";
// ============================================================
// Express API Server
// ============================================================
// Purpose: REST API gateway for ZMART prediction market
// Story: 2.4 (Day 12)
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = createApp;
exports.startServer = startServer;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const morgan_1 = __importDefault(require("morgan"));
const logger_1 = __importDefault(require("../utils/logger"));
const config_1 = require("../config");
// Import routes
const markets_1 = __importDefault(require("./routes/markets"));
const trades_1 = __importDefault(require("./routes/trades"));
const votes_1 = __importDefault(require("./routes/votes"));
const discussions_1 = __importDefault(require("./routes/discussions"));
const users_1 = __importDefault(require("./routes/users"));
// Import middleware
const error_handler_1 = require("./middleware/error-handler");
/**
 * Create and configure Express application
 */
function createApp() {
    const app = (0, express_1.default)();
    // Security middleware
    app.use((0, helmet_1.default)());
    // CORS configuration
    const corsOptions = {
        origin: config_1.config.api.corsOrigins, // From env: ["http://localhost:3000", "https://app.zmart.io"]
        credentials: true,
        optionsSuccessStatus: 200,
    };
    app.use((0, cors_1.default)(corsOptions));
    // Body parsing
    app.use(express_1.default.json({ limit: "10mb" }));
    app.use(express_1.default.urlencoded({ extended: true, limit: "10mb" }));
    // HTTP request logging
    app.use((0, morgan_1.default)("combined", {
        stream: {
            write: (message) => logger_1.default.http(message.trim()),
        },
    }));
    // Rate limiting (100 requests per 15 minutes per IP)
    // Disabled in test environment to allow rapid integration testing
    if (process.env.NODE_ENV !== 'test') {
        const limiter = (0, express_rate_limit_1.default)({
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
    }
    // Health check endpoint
    app.get("/health", (req, res) => {
        res.json({
            status: "healthy",
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            environment: config_1.config.node.env,
        });
    });
    // API routes
    app.use("/api/markets", markets_1.default);
    app.use("/api/trades", trades_1.default);
    app.use("/api/votes", votes_1.default);
    app.use("/api/discussions", discussions_1.default);
    app.use("/api/users", users_1.default);
    // 404 handler
    app.use((req, res) => {
        res.status(404).json({
            error: "Not Found",
            message: `Route ${req.method} ${req.path} not found`,
            status: 404,
            timestamp: new Date().toISOString(),
        });
    });
    // Error handling middleware (must be last)
    app.use(error_handler_1.errorHandler);
    return app;
}
/**
 * Start the Express server
 */
async function startServer() {
    const app = createApp();
    const port = config_1.config.api.port;
    const server = app.listen(port, () => {
        logger_1.default.info(`[API Server] Started on port ${port}`);
        logger_1.default.info(`[API Server] Health check: http://localhost:${port}/health`);
        logger_1.default.info(`[API Server] API base URL: http://localhost:${port}/api`);
        logger_1.default.info(`[API Server] Environment: ${config_1.config.node.env}`);
    });
    // Graceful shutdown
    process.on("SIGTERM", () => {
        logger_1.default.info("[API Server] SIGTERM received, shutting down gracefully...");
        server.close(() => {
            logger_1.default.info("[API Server] Server closed");
            process.exit(0);
        });
    });
    process.on("SIGINT", () => {
        logger_1.default.info("[API Server] SIGINT received, shutting down gracefully...");
        server.close(() => {
            logger_1.default.info("[API Server] Server closed");
            process.exit(0);
        });
    });
}
//# sourceMappingURL=server.js.map