/**
 * Network Traffic Logger for E2E Tests
 *
 * Captures all HTTP requests and responses for debugging and analysis
 * Filters sensitive data (auth tokens, private keys)
 * Tracks timing, status codes, and response sizes
 */

import { Page, Request, Response } from '@playwright/test';

export interface NetworkRequest {
  timestamp: string;
  index: number;
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: any;
  size: number;
}

export interface NetworkResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body?: any;
  size: number;
  duration: number;
}

export interface NetworkTraffic {
  timestamp: string;
  method: string;
  url: string;
  request: NetworkRequest;
  response?: NetworkResponse;
  error?: string;
}

const capturedTraffic: NetworkTraffic[] = [];
let requestIndex = 0;

/**
 * Filter sensitive data from headers
 */
function sanitizeHeaders(headers: Record<string, string>): Record<string, string> {
  const sanitized = { ...headers };
  const sensitiveKeys = ['authorization', 'cookie', 'x-api-key', 'x-auth-token'];

  for (const key of sensitiveKeys) {
    if (sanitized[key]) {
      sanitized[key] = '[REDACTED]';
    }
  }

  return sanitized;
}

/**
 * Check if request should be logged
 */
function shouldLogRequest(url: string): boolean {
  // Skip common assets that bloat logs
  const skipPatterns = [
    /\.(png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf)$/i,
    /_next\/static\//,
    /webpack/,
  ];

  return !skipPatterns.some(pattern => pattern.test(url));
}

/**
 * Extract request body safely
 */
async function extractRequestBody(request: Request): Promise<any> {
  try {
    const postData = request.postData();
    if (!postData) return null;

    // Try to parse as JSON
    try {
      return JSON.parse(postData);
    } catch {
      // Return as text if not JSON
      return postData.length > 1000 ? `[Text: ${postData.length} chars]` : postData;
    }
  } catch {
    return null;
  }
}

/**
 * Extract response body safely
 */
async function extractResponseBody(response: Response): Promise<any> {
  try {
    const contentType = response.headers()['content-type'] || '';

    // Only capture JSON responses
    if (!contentType.includes('json')) {
      return `[${contentType}]`;
    }

    const body = await response.body();
    const text = body.toString('utf-8');

    // Limit response body size
    if (text.length > 10000) {
      return `[JSON: ${text.length} chars, truncated]`;
    }

    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  } catch (error) {
    return `[Error extracting body: ${error instanceof Error ? error.message : String(error)}]`;
  }
}

/**
 * Set up network traffic capture for a page
 */
export async function captureNetworkTraffic(page: Page): Promise<void> {
  console.log('🌐 Network traffic capture enabled');

  // Capture requests
  page.on('request', async (request: Request) => {
    if (!shouldLogRequest(request.url())) {
      return;
    }

    const index = requestIndex++;
    const timestamp = new Date().toISOString();

    const networkRequest: NetworkRequest = {
      timestamp,
      index,
      method: request.method(),
      url: request.url(),
      headers: sanitizeHeaders(request.headers()),
      body: await extractRequestBody(request),
      size: request.postDataBuffer()?.length || 0,
    };

    const traffic: NetworkTraffic = {
      timestamp,
      method: request.method(),
      url: request.url(),
      request: networkRequest,
    };

    capturedTraffic.push(traffic);

    console.log(`📤 ${request.method()} ${request.url()}`);
  });

  // Capture responses
  page.on('response', async (response: Response) => {
    if (!shouldLogRequest(response.url())) {
      return;
    }

    const request = response.request();
    const startTime = Date.now();

    // Find corresponding request in captured traffic
    const traffic = capturedTraffic.find(
      t => t.url === response.url() && !t.response
    );

    if (traffic) {
      const duration = Date.now() - new Date(traffic.timestamp).getTime();

      traffic.response = {
        status: response.status(),
        statusText: response.statusText(),
        headers: sanitizeHeaders(response.headers()),
        body: await extractResponseBody(response),
        size: parseInt(response.headers()['content-length'] || '0', 10),
        duration,
      };

      const statusEmoji = response.status() < 400 ? '✅' : '❌';
      console.log(`📥 ${statusEmoji} ${response.status()} ${response.url()} (${duration}ms)`);
    }
  });

  // Capture failed requests
  page.on('requestfailed', (request: Request) => {
    const traffic = capturedTraffic.find(
      t => t.url === request.url() && !t.response && !t.error
    );

    if (traffic) {
      traffic.error = request.failure()?.errorText || 'Unknown error';
      console.error(`❌ Request failed: ${request.url()} - ${traffic.error}`);
    }
  });
}

/**
 * Get all captured network traffic
 */
export function getCapturedTraffic(): NetworkTraffic[] {
  return [...capturedTraffic];
}

/**
 * Clear captured traffic (useful between tests)
 */
export function clearCapturedTraffic(): void {
  capturedTraffic.length = 0;
  requestIndex = 0;
  console.log('🧹 Network traffic cleared');
}

/**
 * Get traffic summary statistics
 */
export function getTrafficSummary(): {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  totalDataTransferred: number;
} {
  const successful = capturedTraffic.filter(t => t.response && t.response.status < 400);
  const failed = capturedTraffic.filter(t => t.error || (t.response && t.response.status >= 400));

  const responseTimes = capturedTraffic
    .filter(t => t.response?.duration)
    .map(t => t.response!.duration);

  const averageResponseTime = responseTimes.length > 0
    ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
    : 0;

  const totalDataTransferred = capturedTraffic.reduce(
    (total, t) => total + (t.response?.size || 0),
    0
  );

  return {
    totalRequests: capturedTraffic.length,
    successfulRequests: successful.length,
    failedRequests: failed.length,
    averageResponseTime: Math.round(averageResponseTime),
    totalDataTransferred,
  };
}

/**
 * Filter traffic by criteria
 */
export function filterTraffic(criteria: {
  method?: string;
  statusCode?: number;
  urlPattern?: RegExp;
  hasError?: boolean;
}): NetworkTraffic[] {
  return capturedTraffic.filter(traffic => {
    if (criteria.method && traffic.method !== criteria.method) {
      return false;
    }

    if (criteria.statusCode && traffic.response?.status !== criteria.statusCode) {
      return false;
    }

    if (criteria.urlPattern && !criteria.urlPattern.test(traffic.url)) {
      return false;
    }

    if (criteria.hasError !== undefined) {
      const hasError = !!traffic.error || (traffic.response?.status || 0) >= 400;
      if (criteria.hasError !== hasError) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Get slow requests (>1000ms)
 */
export function getSlowRequests(thresholdMs: number = 1000): NetworkTraffic[] {
  return capturedTraffic.filter(
    t => t.response && t.response.duration > thresholdMs
  );
}

/**
 * Get failed requests
 */
export function getFailedRequests(): NetworkTraffic[] {
  return capturedTraffic.filter(
    t => t.error || (t.response && t.response.status >= 400)
  );
}
