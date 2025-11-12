/**
 * Centralized Debug Logger for ZMART Frontend
 *
 * Provides comprehensive logging for:
 * - Component lifecycle events
 * - API requests/responses
 * - Web3 transactions
 * - Real-time updates
 * - Error tracking
 *
 * Usage:
 * ```typescript
 * import { createLogger } from '@/lib/utils/debug-logger';
 *
 * const log = createLogger('ComponentName');
 * log.info('Component mounted');
 * log.debug('Fetching data', { url: '/api/markets' });
 * log.error('Failed to fetch', error);
 * ```
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  levelName: string;
  component: string;
  message: string;
  data?: any;
  error?: Error;
}

class DebugLogger {
  private logs: LogEntry[] = [];
  private maxLogs = 1000; // Keep last 1000 logs
  private listeners: Array<(entry: LogEntry) => void> = [];
  private minLevel: LogLevel = LogLevel.DEBUG;

  constructor() {
    // Set log level from environment
    if (typeof window !== 'undefined') {
      const envLevel = process.env.NEXT_PUBLIC_LOG_LEVEL;
      if (envLevel) {
        this.minLevel = LogLevel[envLevel as keyof typeof LogLevel] ?? LogLevel.DEBUG;
      }
    }
  }

  /**
   * Create a logger for a specific component
   */
  createLogger(component: string) {
    return {
      debug: (message: string, data?: any) => this.log(LogLevel.DEBUG, component, message, data),
      info: (message: string, data?: any) => this.log(LogLevel.INFO, component, message, data),
      warn: (message: string, data?: any) => this.log(LogLevel.WARN, component, message, data),
      error: (message: string, error?: Error | any, data?: any) => {
        this.log(LogLevel.ERROR, component, message, data, error);
      },
    };
  }

  /**
   * Log an entry
   */
  private log(
    level: LogLevel,
    component: string,
    message: string,
    data?: any,
    error?: Error | any
  ) {
    // Skip if below minimum level
    if (level < this.minLevel) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      levelName: LogLevel[level],
      component,
      message,
      data,
      error: error instanceof Error ? error : undefined,
    };

    // Add to log buffer
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift(); // Remove oldest
    }

    // Notify listeners
    this.listeners.forEach((listener) => listener(entry));

    // Console output (with color coding)
    this.consoleLog(entry);
  }

  /**
   * Output to browser console with color coding
   */
  private consoleLog(entry: LogEntry) {
    const timestamp = new Date(entry.timestamp).toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3,
    });

    const prefix = `[${timestamp}] [${entry.component}] [${entry.levelName}]`;
    const message = entry.message;
    const data = entry.data ? entry.data : '';

    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(`${prefix} ${message}`, data);
        break;
      case LogLevel.INFO:
        console.info(`${prefix} ${message}`, data);
        break;
      case LogLevel.WARN:
        console.warn(`${prefix} ${message}`, data);
        break;
      case LogLevel.ERROR:
        if (entry.error) {
          console.error(`${prefix} ${message}`, entry.error, data);
        } else {
          console.error(`${prefix} ${message}`, data);
        }
        break;
    }
  }

  /**
   * Subscribe to log entries
   */
  subscribe(listener: (entry: LogEntry) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  /**
   * Get all logs
   */
  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  /**
   * Get logs filtered by component
   */
  getLogsByComponent(component: string): LogEntry[] {
    return this.logs.filter((log) => log.component === component);
  }

  /**
   * Get logs filtered by level
   */
  getLogsByLevel(minLevel: LogLevel): LogEntry[] {
    return this.logs.filter((log) => log.level >= minLevel);
  }

  /**
   * Clear all logs
   */
  clear() {
    this.logs = [];
  }

  /**
   * Export logs to JSON
   */
  exportToJSON(): string {
    return JSON.stringify(
      {
        exported: new Date().toISOString(),
        count: this.logs.length,
        logs: this.logs.map((log) => ({
          ...log,
          error: log.error
            ? {
                name: log.error.name,
                message: log.error.message,
                stack: log.error.stack,
              }
            : undefined,
        })),
      },
      null,
      2
    );
  }

  /**
   * Download logs as JSON file
   */
  downloadLogs(filename?: string) {
    const json = this.exportToJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `zmart-logs-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Set minimum log level
   */
  setLevel(level: LogLevel) {
    this.minLevel = level;
  }

  /**
   * Get current log level
   */
  getLevel(): LogLevel {
    return this.minLevel;
  }
}

// Singleton instance
const debugLogger = new DebugLogger();

/**
 * Create a logger for a component
 */
export function createLogger(component: string) {
  return debugLogger.createLogger(component);
}

/**
 * Get the global logger instance
 */
export function getLogger() {
  return debugLogger;
}

/**
 * Export default for convenience
 */
export default debugLogger;
