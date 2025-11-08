/**
 * RPC Call Tracker for E2E Tests
 *
 * Tracks Solana RPC calls for debugging and performance analysis
 * Identifies slow calls, failed requests, and patterns
 */

import { Page, Request, Response } from '@playwright/test';

export interface RPCCall {
  id: number;
  timestamp: string;
  method: string;
  params: any[];
  commitment?: string;
  response: {
    success: boolean;
    result?: any;
    error?: {
      code: number;
      message: string;
    };
    duration: number; // milliseconds
  };
  endpoint: string;
  cacheHit?: boolean;
}

// Global storage for captured RPC calls
let capturedRPCCalls: RPCCall[] = [];
let rpcCallId = 1;

/**
 * Clear all captured RPC calls
 */
export function clearCapturedRPCCalls(): void {
  capturedRPCCalls = [];
  rpcCallId = 1;
  console.log('🔄 RPC call tracking cleared');
}

/**
 * Enable RPC call tracking on a Playwright page
 *
 * Intercepts network traffic to Solana RPC endpoints
 * Parses JSON-RPC requests and responses
 *
 * @param page - Playwright page instance
 */
export async function trackRPCCalls(page: Page): Promise<void> {
  const requestTimings = new Map<string, number>();

  // Track requests
  page.on('request', (request: Request) => {
    const url = request.url();

    // Only track Solana RPC endpoints
    if (!isRPCEndpoint(url)) {
      return;
    }

    // Store request time
    requestTimings.set(request.url() + request.postDataJSON()?.id, Date.now());
  });

  // Track responses
  page.on('response', async (response: Response) => {
    const url = response.url();

    // Only track Solana RPC endpoints
    if (!isRPCEndpoint(url)) {
      return;
    }

    try {
      const request = response.request();
      const requestBody = request.postDataJSON();

      if (!requestBody || !requestBody.jsonrpc) {
        return; // Not a JSON-RPC request
      }

      // Calculate duration
      const requestKey = url + requestBody.id;
      const startTime = requestTimings.get(requestKey) || Date.now();
      const duration = Date.now() - startTime;
      requestTimings.delete(requestKey);

      // Parse response
      let responseBody;
      try {
        responseBody = await response.json();
      } catch (e) {
        responseBody = { error: { message: 'Failed to parse response' } };
      }

      // Create RPC call record
      const rpcCall: RPCCall = {
        id: rpcCallId++,
        timestamp: new Date().toISOString(),
        method: requestBody.method,
        params: requestBody.params || [],
        commitment: extractCommitment(requestBody.params),
        response: {
          success: !responseBody.error && response.ok(),
          result: responseBody.result,
          error: responseBody.error,
          duration,
        },
        endpoint: url,
      };

      capturedRPCCalls.push(rpcCall);

      // Log to console with status indicator
      const statusIcon = rpcCall.response.success ? '✅' : '❌';
      const durationColor = duration > 1000 ? '🐌' : duration > 500 ? '⚠️' : '⚡';

      console.log(
        `${statusIcon} ${durationColor} RPC [${rpcCall.method}] ${duration}ms` +
        (rpcCall.response.error ? ` - Error: ${rpcCall.response.error.message}` : '')
      );
    } catch (error) {
      console.error('Error tracking RPC call:', error);
    }
  });

  console.log('🔍 RPC call tracking enabled');
}

/**
 * Check if URL is a Solana RPC endpoint
 */
function isRPCEndpoint(url: string): boolean {
  return (
    url.includes('solana.com') ||
    url.includes('rpcpool.com') ||
    url.includes('genesysgo.net') ||
    url.includes('helius-rpc.com') ||
    url.includes('localhost:8899') ||
    url.includes('127.0.0.1:8899')
  );
}

/**
 * Extract commitment level from RPC params
 */
function extractCommitment(params: any[]): string | undefined {
  if (!params || params.length === 0) return undefined;

  // Check last param for commitment
  const lastParam = params[params.length - 1];
  if (typeof lastParam === 'object' && lastParam.commitment) {
    return lastParam.commitment;
  }

  // Check second param for commitment
  if (params.length > 1 && typeof params[1] === 'object' && params[1].commitment) {
    return params[1].commitment;
  }

  return undefined;
}

/**
 * Get all captured RPC calls
 */
export function getCapturedRPCCalls(): RPCCall[] {
  return capturedRPCCalls;
}

/**
 * Get slow RPC calls (duration > threshold)
 *
 * @param thresholdMs - Minimum duration in milliseconds (default: 500ms)
 */
export function getSlowRPCCalls(thresholdMs: number = 500): RPCCall[] {
  return capturedRPCCalls.filter(
    call => call.response.duration > thresholdMs
  );
}

/**
 * Get failed RPC calls
 */
export function getFailedRPCCalls(): RPCCall[] {
  return capturedRPCCalls.filter(
    call => !call.response.success || call.response.error
  );
}

/**
 * Get RPC calls by method
 *
 * @param method - RPC method name (e.g., 'getAccountInfo', 'sendTransaction')
 */
export function getRPCCallsByMethod(method: string): RPCCall[] {
  return capturedRPCCalls.filter(call => call.method === method);
}

/**
 * Get RPC call statistics
 */
export interface RPCCallStats {
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  averageDuration: number;
  slowestCall: RPCCall | null;
  fastestCall: RPCCall | null;
  methodBreakdown: Record<string, number>;
  commitmentBreakdown: Record<string, number>;
}

export function getRPCCallStats(): RPCCallStats {
  if (capturedRPCCalls.length === 0) {
    return {
      totalCalls: 0,
      successfulCalls: 0,
      failedCalls: 0,
      averageDuration: 0,
      slowestCall: null,
      fastestCall: null,
      methodBreakdown: {},
      commitmentBreakdown: {},
    };
  }

  const durations = capturedRPCCalls.map(c => c.response.duration);
  const averageDuration = durations.reduce((a, b) => a + b, 0) / durations.length;

  const sortedByDuration = [...capturedRPCCalls].sort(
    (a, b) => b.response.duration - a.response.duration
  );

  // Method breakdown
  const methodBreakdown: Record<string, number> = {};
  capturedRPCCalls.forEach(call => {
    methodBreakdown[call.method] = (methodBreakdown[call.method] || 0) + 1;
  });

  // Commitment breakdown
  const commitmentBreakdown: Record<string, number> = {};
  capturedRPCCalls.forEach(call => {
    const commitment = call.commitment || 'none';
    commitmentBreakdown[commitment] = (commitmentBreakdown[commitment] || 0) + 1;
  });

  return {
    totalCalls: capturedRPCCalls.length,
    successfulCalls: capturedRPCCalls.filter(c => c.response.success).length,
    failedCalls: capturedRPCCalls.filter(c => !c.response.success).length,
    averageDuration,
    slowestCall: sortedByDuration[0] || null,
    fastestCall: sortedByDuration[sortedByDuration.length - 1] || null,
    methodBreakdown,
    commitmentBreakdown,
  };
}

/**
 * Filter RPC calls by criteria
 */
export interface RPCCallFilter {
  method?: string;
  minDuration?: number;
  maxDuration?: number;
  success?: boolean;
  commitment?: string;
  since?: Date;
}

export function filterRPCCalls(filter: RPCCallFilter): RPCCall[] {
  return capturedRPCCalls.filter(call => {
    // Method filter
    if (filter.method && call.method !== filter.method) {
      return false;
    }

    // Duration filters
    if (filter.minDuration !== undefined && call.response.duration < filter.minDuration) {
      return false;
    }
    if (filter.maxDuration !== undefined && call.response.duration > filter.maxDuration) {
      return false;
    }

    // Success filter
    if (filter.success !== undefined && call.response.success !== filter.success) {
      return false;
    }

    // Commitment filter
    if (filter.commitment && call.commitment !== filter.commitment) {
      return false;
    }

    // Time filter
    if (filter.since && new Date(call.timestamp) < filter.since) {
      return false;
    }

    return true;
  });
}

/**
 * Print RPC call summary to console
 */
export function printRPCCallSummary(): void {
  const stats = getRPCCallStats();

  console.log('\n📊 RPC Call Summary:');
  console.log(`  Total Calls: ${stats.totalCalls}`);
  console.log(`  Successful: ${stats.successfulCalls} (${(stats.successfulCalls / stats.totalCalls * 100).toFixed(1)}%)`);
  console.log(`  Failed: ${stats.failedCalls} (${(stats.failedCalls / stats.totalCalls * 100).toFixed(1)}%)`);
  console.log(`  Average Duration: ${stats.averageDuration.toFixed(0)}ms`);

  if (stats.slowestCall) {
    console.log(`  Slowest: ${stats.slowestCall.method} (${stats.slowestCall.response.duration}ms)`);
  }

  if (stats.fastestCall) {
    console.log(`  Fastest: ${stats.fastestCall.method} (${stats.fastestCall.response.duration}ms)`);
  }

  console.log('\n  Method Breakdown:');
  Object.entries(stats.methodBreakdown)
    .sort((a, b) => b[1] - a[1])
    .forEach(([method, count]) => {
      console.log(`    ${method}: ${count}`);
    });

  const slowCalls = getSlowRPCCalls(1000);
  if (slowCalls.length > 0) {
    console.log(`\n  ⚠️  ${slowCalls.length} slow calls (>1000ms)`);
  }
}

/**
 * Export RPC calls to JSON
 */
export function exportRPCCallsToJSON(): string {
  return JSON.stringify({
    timestamp: new Date().toISOString(),
    calls: capturedRPCCalls,
    stats: getRPCCallStats(),
  }, null, 2);
}
