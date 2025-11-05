// ============================================================
// Logger Utility
// ============================================================
// Purpose: Winston-based logging with structured output
// Pattern Prevention: #5 (Documentation Explosion) - Structured logging

import winston from "winston";
import path from "path";

// Get log level from environment (will be set by config/env.ts)
const logLevel = process.env.LOG_LEVEL || "info";
const isDevelopment = process.env.NODE_ENV === "development";

// Custom format for development
const devFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: "HH:mm:ss" }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : "";
    return `[${timestamp}] ${level}: ${message} ${metaStr}`;
  })
);

// Custom format for production
const prodFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create logger instance
const logger = winston.createLogger({
  level: logLevel,
  format: isDevelopment ? devFormat : prodFormat,
  defaultMeta: { service: "zmart-backend" },
  transports: [
    // Console output
    new winston.transports.Console({
      stderrLevels: ["error"],
    }),

    // File outputs (production only)
    ...(isDevelopment
      ? []
      : [
          new winston.transports.File({
            filename: path.join(process.cwd(), "logs", "error.log"),
            level: "error",
            maxsize: 5242880, // 5MB
            maxFiles: 5,
          }),
          new winston.transports.File({
            filename: path.join(process.cwd(), "logs", "combined.log"),
            maxsize: 5242880, // 5MB
            maxFiles: 5,
          }),
        ]),
  ],
  exitOnError: false,
});

// Add stream for Morgan (Express logging)
export const loggerStream = {
  write: (message: string) => {
    logger.info(message.trim());
  },
};

export default logger;
