/**
 * Enhanced Tracking System - Main Export
 *
 * Centralized export for all enhanced tracking utilities
 * Import from this file to access all tracking capabilities
 *
 * Usage:
 *   import {
 *     captureNetworkTraffic,
 *     trackRPCCalls,
 *     captureComprehensiveState,
 *     TimingTracker,
 *     TestDataManager,
 *   } from './helpers/enhanced-tracking';
 */

// Network Traffic Tracking
export {
  captureNetworkTraffic,
  clearCapturedTraffic,
  getCapturedTraffic,
  getSlowRequests,
  getFailedRequests,
  filterTraffic,
  getTrafficSummary,
  printTrafficSummary,
  type NetworkRequest,
  type TrafficFilter,
  type TrafficSummary,
} from './network-logger';

// RPC Call Tracking
export {
  trackRPCCalls,
  clearCapturedRPCCalls,
  getCapturedRPCCalls,
  getSlowRPCCalls,
  getFailedRPCCalls,
  getRPCCallsByMethod,
  getRPCCallStats,
  filterRPCCalls,
  printRPCCallSummary,
  exportRPCCallsToJSON,
  type RPCCall,
  type RPCCallStats,
  type RPCCallFilter,
} from './rpc-tracker';

// Application State Capture
export {
  captureReactQueryCache,
  captureWalletState,
  captureBrowserStorage,
  captureOnChainState,
  captureTransactionDetails,
  captureComprehensiveState,
  compareStates,
  printStateComparison,
  type ReactQueryCache,
  type WalletState,
  type BrowserStorage,
  type OnChainState,
  type TransactionDetails,
  type ComprehensiveState,
  type StateComparison,
} from './state-capture';

// Performance Monitoring
export {
  TimingTracker,
  captureBrowserMetrics,
  comparePerformance,
  printBrowserMetrics,
  printPerformanceComparison,
  globalTimingTracker,
  type BrowserMetrics,
  type PerformanceComparison,
} from './performance-monitor';

// Enhanced Error Logging
export {
  captureEnhancedError,
  type EnhancedError,
} from './wallet-setup';

// Data Management
export {
  TestDataManager,
  getGlobalDataManager,
  resetGlobalDataManager,
  type TestRunMetadata,
  type TestSummary,
  type EnvironmentSnapshot,
} from './data-manager';

// WebSocket Tracking
export {
  trackWebSocketConnections,
  clearWebSocketTracking,
  getCapturedWebSocketConnections,
  getCapturedWebSocketMessages,
  getCapturedWebSocketStateChanges,
  getCapturedWebSocketErrors,
  getWebSocketStats,
  filterWebSocketMessages,
  getMessagesByEvent,
  getLatestMessage,
  waitForWebSocketEvent,
  isWebSocketConnected,
  getConnectionUptime,
  printWebSocketSummary,
  getWebSocketDataForSaving,
  type WebSocketConnection,
  type WebSocketMessage,
  type WebSocketStateChange,
  type WebSocketStats,
} from './websocket-tracker';

/**
 * Initialize all enhanced tracking on a page
 *
 * Convenience function to enable all tracking at once
 *
 * @param page - Playwright page instance
 * @param testName - Name of the test (for data organization)
 * @returns Test data manager instance
 */
import { Page } from '@playwright/test';
import { captureNetworkTraffic } from './network-logger';
import { trackRPCCalls } from './rpc-tracker';
import { trackWebSocketConnections } from './websocket-tracker';
import { TestDataManager } from './data-manager';

export async function initializeEnhancedTracking(
  page: Page,
  testName: string
): Promise<TestDataManager> {
  console.log('\n🔍 Initializing Enhanced Tracking System (+ WebSocket)...');

  // Create data manager
  const dataManager = new TestDataManager(testName);

  // Enable network tracking
  await captureNetworkTraffic(page);

  // Enable RPC tracking
  await trackRPCCalls(page);

  // Enable WebSocket tracking
  await trackWebSocketConnections(page);

  // Save environment snapshot
  await dataManager.saveEnvironment();

  console.log('✅ Enhanced Tracking Initialized (Network + RPC + WebSocket)\n');

  return dataManager;
}

/**
 * Save all captured tracking data to disk
 *
 * Call this at the end of a test to persist all tracking data
 *
 * @param dataManager - Test data manager instance
 */
export async function saveAllTrackingData(dataManager: TestDataManager): Promise<void> {
  console.log('\n💾 Saving All Tracking Data...');

  const { getCapturedTraffic, getTrafficSummary } = await import('./network-logger');
  const { getCapturedRPCCalls, getRPCCallStats } = await import('./rpc-tracker');
  const { getWebSocketDataForSaving } = await import('./websocket-tracker');

  // Save network traffic
  try {
    const traffic = getCapturedTraffic();
    const trafficSummary = getTrafficSummary();

    await dataManager.saveData('network-traffic', traffic);
    await dataManager.saveData('network-summary', trafficSummary);
    console.log(`   ✅ Network traffic saved (${traffic.length} requests)`);
  } catch (error) {
    console.error('   ❌ Failed to save network traffic:', error);
  }

  // Save RPC calls
  try {
    const rpcCalls = getCapturedRPCCalls();
    const rpcStats = getRPCCallStats();

    await dataManager.saveData('rpc-calls', rpcCalls);
    await dataManager.saveData('rpc-stats', rpcStats);
    console.log(`   ✅ RPC calls saved (${rpcCalls.length} calls)`);
  } catch (error) {
    console.error('   ❌ Failed to save RPC calls:', error);
  }

  // Save WebSocket data
  try {
    const wsData = getWebSocketDataForSaving();

    await dataManager.saveData('websocket-connections', wsData.connections);
    await dataManager.saveData('websocket-messages', wsData.messages);
    await dataManager.saveData('websocket-state-changes', wsData.stateChanges);
    await dataManager.saveData('websocket-stats', wsData.stats);
    console.log(`   ✅ WebSocket data saved (${wsData.messages.length} messages)`);
  } catch (error) {
    console.error('   ❌ Failed to save WebSocket data:', error);
  }

  console.log(`✅ All tracking data saved to: ${dataManager.getDataPath()}\n`);
}

/**
 * Print summary of all captured tracking data
 *
 * Useful for quick debugging in console output
 */
export async function printTrackingSummary(): Promise<void> {
  console.log('\n📊 === TRACKING SUMMARY ===\n');

  const { printTrafficSummary } = await import('./network-logger');
  const { printRPCCallSummary } = await import('./rpc-tracker');
  const { printWebSocketSummary } = await import('./websocket-tracker');

  try {
    printTrafficSummary();
  } catch (error) {
    console.error('Failed to print traffic summary:', error);
  }

  try {
    printRPCCallSummary();
  } catch (error) {
    console.error('Failed to print RPC summary:', error);
  }

  try {
    printWebSocketSummary();
  } catch (error) {
    console.error('Failed to print WebSocket summary:', error);
  }

  console.log('\n📊 === END SUMMARY ===\n');
}
