"use strict";
// ============================================================
// Logger Utility
// ============================================================
// Purpose: Winston-based logging with structured output
// Pattern Prevention: #5 (Documentation Explosion) - Structured logging
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loggerStream = void 0;
const winston_1 = __importDefault(require("winston"));
const path_1 = __importDefault(require("path"));
const env_1 = require("../config/env");
// Get log level from validated config
const logLevel = env_1.config.logging.level;
const isDevelopment = env_1.config.node.isDevelopment;
// Custom format for development
const devFormat = winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.timestamp({ format: "HH:mm:ss" }), winston_1.default.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : "";
    return `[${timestamp}] ${level}: ${message} ${metaStr}`;
}));
// Custom format for production
const prodFormat = winston_1.default.format.combine(winston_1.default.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }), winston_1.default.format.errors({ stack: true }), winston_1.default.format.json());
// Create logger instance
const logger = winston_1.default.createLogger({
    level: logLevel,
    format: isDevelopment ? devFormat : prodFormat,
    defaultMeta: { service: "zmart-backend" },
    transports: [
        // Console output
        new winston_1.default.transports.Console({
            stderrLevels: ["error"],
        }),
        // File outputs (production only)
        ...(isDevelopment
            ? []
            : [
                new winston_1.default.transports.File({
                    filename: path_1.default.join(process.cwd(), "logs", "error.log"),
                    level: "error",
                    maxsize: 5242880, // 5MB
                    maxFiles: 5,
                }),
                new winston_1.default.transports.File({
                    filename: path_1.default.join(process.cwd(), "logs", "combined.log"),
                    maxsize: 5242880, // 5MB
                    maxFiles: 5,
                }),
            ]),
    ],
    exitOnError: false,
});
// Add stream for Morgan (Express logging)
exports.loggerStream = {
    write: (message) => {
        logger.info(message.trim());
    },
};
exports.default = logger;
//# sourceMappingURL=logger.js.map