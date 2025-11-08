/**
 * Winston Logger Configuration
 *
 * Structured JSON logging for production-ready monitoring.
 */
import winston from 'winston';

const logLevel = process.env.LOG_LEVEL || 'info';
const logFormat = process.env.LOG_FORMAT || 'json';

const formats = [
  winston.format.timestamp(),
  winston.format.errors({ stack: true })
];

if (logFormat === 'json') {
  formats.push(winston.format.json());
} else {
  formats.push(
    winston.format.colorize(),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      return `${timestamp} [${level}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
    })
  );
}

export const logger = winston.createLogger({
  level: logLevel,
  format: winston.format.combine(...formats),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

// Create logs directory if it doesn't exist
import fs from 'fs';
import path from 'path';

const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}
