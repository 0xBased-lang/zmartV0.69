/**
 * API Request/Response Logger
 *
 * Axios interceptor for comprehensive API call logging
 * Tracks timing, payloads, responses, and errors
 */

import { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { createLogger } from '@/lib/utils/debug-logger';

const log = createLogger('API');

export interface APILogEntry {
  id: string;
  method: string;
  url: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  status?: number;
  requestHeaders?: Record<string, string>;
  requestBody?: any;
  responseHeaders?: Record<string, string>;
  responseBody?: any;
  error?: any;
}

class APILogger {
  private requests: Map<string, APILogEntry> = new Map();
  private requestCounter = 0;

  /**
   * Setup interceptors on an Axios instance
   */
  setupInterceptors(axiosInstance: AxiosInstance) {
    // Request interceptor
    axiosInstance.interceptors.request.use(
      (config) => this.logRequest(config),
      (error) => this.logRequestError(error)
    );

    // Response interceptor
    axiosInstance.interceptors.response.use(
      (response) => this.logResponse(response),
      (error) => this.logResponseError(error)
    );
  }

  /**
   * Log outgoing request
   */
  private logRequest(config: AxiosRequestConfig): AxiosRequestConfig {
    const id = `req-${++this.requestCounter}-${Date.now()}`;
    const method = (config.method || 'GET').toUpperCase();
    const url = this.getFullUrl(config);

    const entry: APILogEntry = {
      id,
      method,
      url,
      startTime: Date.now(),
      requestHeaders: this.sanitizeHeaders(config.headers as Record<string, string>),
      requestBody: this.sanitizeBody(config.data),
    };

    this.requests.set(id, entry);

    // Attach ID to config for response matching
    (config as any).__requestId = id;

    log.debug(`${method} ${url}`, {
      headers: entry.requestHeaders,
      body: entry.requestBody,
    });

    return config;
  }

  /**
   * Log successful response
   */
  private logResponse(response: AxiosResponse): AxiosResponse {
    const id = (response.config as any).__requestId;
    const entry = this.requests.get(id);

    if (entry) {
      entry.endTime = Date.now();
      entry.duration = entry.endTime - entry.startTime;
      entry.status = response.status;
      entry.responseHeaders = this.sanitizeHeaders(response.headers as Record<string, string>);
      entry.responseBody = this.sanitizeBody(response.data);

      const statusColor = response.status < 400 ? 'success' : 'warning';
      log.info(
        `${entry.method} ${entry.url} → ${response.status} (${entry.duration}ms)`,
        {
          status: response.status,
          duration: entry.duration,
          data: entry.responseBody,
        }
      );

      // Clean up old requests (keep last 100)
      if (this.requests.size > 100) {
        const firstKey = this.requests.keys().next().value;
        this.requests.delete(firstKey);
      }
    }

    return response;
  }

  /**
   * Log request error
   */
  private logRequestError(error: any): Promise<never> {
    log.error('Request setup failed', error);
    return Promise.reject(error);
  }

  /**
   * Log response error
   */
  private logResponseError(error: AxiosError): Promise<never> {
    const id = (error.config as any)?.__requestId;
    const entry = this.requests.get(id);

    if (entry) {
      entry.endTime = Date.now();
      entry.duration = entry.endTime - entry.startTime;
      entry.status = error.response?.status;
      entry.responseHeaders = this.sanitizeHeaders(error.response?.headers as Record<string, string>);
      entry.responseBody = this.sanitizeBody(error.response?.data);
      entry.error = {
        message: error.message,
        code: error.code,
        status: error.response?.status,
      };

      log.error(
        `${entry.method} ${entry.url} → ${entry.status || 'FAILED'} (${entry.duration}ms)`,
        error,
        {
          status: entry.status,
          data: entry.responseBody,
          errorMessage: error.message,
        }
      );
    } else {
      log.error('API request failed', error, {
        url: error.config?.url,
        method: error.config?.method,
      });
    }

    return Promise.reject(error);
  }

  /**
   * Get full URL from config
   */
  private getFullUrl(config: AxiosRequestConfig): string {
    const baseURL = config.baseURL || '';
    const url = config.url || '';
    const fullUrl = baseURL + url;

    // Add query params
    if (config.params) {
      const params = new URLSearchParams(config.params).toString();
      return params ? `${fullUrl}?${params}` : fullUrl;
    }

    return fullUrl;
  }

  /**
   * Sanitize headers (remove sensitive data)
   */
  private sanitizeHeaders(headers?: Record<string, string>): Record<string, string> | undefined {
    if (!headers) return undefined;

    const sanitized: Record<string, string> = {};
    const sensitiveKeys = ['authorization', 'cookie', 'x-wallet-signature'];

    for (const [key, value] of Object.entries(headers)) {
      if (sensitiveKeys.some((sk) => key.toLowerCase().includes(sk))) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Sanitize body (remove sensitive data, truncate large payloads)
   */
  private sanitizeBody(body: any): any {
    if (!body) return undefined;

    try {
      // Clone to avoid mutating original
      const cloned = typeof body === 'string' ? JSON.parse(body) : JSON.parse(JSON.stringify(body));

      // Remove sensitive fields
      const sensitiveFields = ['privateKey', 'password', 'secret', 'token'];
      const sanitize = (obj: any): any => {
        if (typeof obj !== 'object' || obj === null) return obj;

        if (Array.isArray(obj)) {
          return obj.map(sanitize);
        }

        const result: any = {};
        for (const [key, value] of Object.entries(obj)) {
          if (sensitiveFields.some((sf) => key.toLowerCase().includes(sf))) {
            result[key] = '[REDACTED]';
          } else {
            result[key] = sanitize(value);
          }
        }
        return result;
      };

      const sanitized = sanitize(cloned);

      // Truncate if too large (> 1KB)
      const stringified = JSON.stringify(sanitized);
      if (stringified.length > 1024) {
        return {
          ...sanitized,
          _truncated: true,
          _originalSize: stringified.length,
        };
      }

      return sanitized;
    } catch (e) {
      // If we can't parse/sanitize, return string representation
      return typeof body === 'string' ? body.substring(0, 200) : '[Complex Object]';
    }
  }

  /**
   * Get all logged requests
   */
  getRequests(): APILogEntry[] {
    return Array.from(this.requests.values());
  }

  /**
   * Get request by ID
   */
  getRequest(id: string): APILogEntry | undefined {
    return this.requests.get(id);
  }

  /**
   * Clear all logged requests
   */
  clear() {
    this.requests.clear();
  }

  /**
   * Export requests to JSON
   */
  exportToJSON(): string {
    return JSON.stringify(
      {
        exported: new Date().toISOString(),
        count: this.requests.size,
        requests: Array.from(this.requests.values()),
      },
      null,
      2
    );
  }
}

// Singleton instance
const apiLogger = new APILogger();

export default apiLogger;
