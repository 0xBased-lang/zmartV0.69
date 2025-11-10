/**
 * WebSocket Connection Tracker for E2E Tests
 *
 * Captures WebSocket connections, messages, and state changes during tests.
 * Provides analysis and filtering capabilities for WebSocket traffic.
 *
 * Usage:
 * ```typescript
 * await trackWebSocketConnections(page);
 * // ... perform test actions ...
 * const stats = getWebSocketStats();
 * const messages = getCapturedWebSocketMessages();
 * ```
 */

import { Page, WebSocket } from '@playwright/test';

// ============================================================
// Type Definitions
// ============================================================

export interface WebSocketConnection {
  id: number;
  timestamp: string;
  url: string;
  readyState: number;
  protocol?: string;
}

export interface WebSocketMessage {
  id: number;
  timestamp: string;
  connectionId: number;
  direction: 'sent' | 'received';
  event?: string;
  data: any;
  size: number;
}

export interface WebSocketStateChange {
  id: number;
  timestamp: string;
  connectionId: number;
  previousState: number;
  newState: number;
  reason?: string;
}

export interface WebSocketStats {
  totalConnections: number;
  activeConnections: number;
  messagesSent: number;
  messagesReceived: number;
  avgMessageSize: number;
  totalDataTransferred: number;
  reconnectionCount: number;
  avgLatency: number;
  errorCount: number;
}

// ============================================================
// Global Storage
// ============================================================

const connections: WebSocketConnection[] = [];
const messages: WebSocketMessage[] = [];
const stateChanges: WebSocketStateChange[] = [];
const errors: Array<{ timestamp: string; connectionId: number; error: string }> = [];

// ============================================================
// Core Tracking Functions
// ============================================================

/**
 * Enable WebSocket tracking on a page
 * Intercepts all WebSocket connections and logs messages
 */
export async function trackWebSocketConnections(page: Page): Promise<void> {
  page.on('websocket', (ws: WebSocket) => {
    const connectionId = connections.length + 1;

    connections.push({
      id: connectionId,
      timestamp: new Date().toISOString(),
      url: ws.url(),
      readyState: 0, // CONNECTING
    });

    console.log(`\n🔌 WebSocket #${connectionId} connecting to: ${ws.url()}`);

    // Track messages sent
    ws.on('framesent', (event) => {
      try {
        const payload = event.payload;
        const data = typeof payload === 'string' ? JSON.parse(payload) : payload;

        const message: WebSocketMessage = {
          id: messages.length + 1,
          timestamp: new Date().toISOString(),
          connectionId,
          direction: 'sent',
          data,
          size: JSON.stringify(data).length,
        };

        messages.push(message);
        console.log(`📤 WS #${connectionId} sent [${message.id}]:`, JSON.stringify(data).slice(0, 100));
      } catch (error) {
        console.error(`❌ Failed to parse sent message:`, error);
      }
    });

    // Track messages received
    ws.on('framereceived', (event) => {
      try {
        const payload = event.payload;
        const data = typeof payload === 'string' ? JSON.parse(payload) : payload;

        const message: WebSocketMessage = {
          id: messages.length + 1,
          timestamp: new Date().toISOString(),
          connectionId,
          direction: 'received',
          event: data.event || data.type,
          data,
          size: JSON.stringify(data).length,
        };

        messages.push(message);
        console.log(`📥 WS #${connectionId} received [${message.id}]:`, JSON.stringify(data).slice(0, 100));
      } catch (error) {
        console.error(`❌ Failed to parse received message:`, error);
      }
    });

    // Track connection open
    ws.on('open', () => {
      stateChanges.push({
        id: stateChanges.length + 1,
        timestamp: new Date().toISOString(),
        connectionId,
        previousState: 0, // CONNECTING
        newState: 1, // OPEN
      });
      console.log(`✅ WS #${connectionId} connected successfully`);
    });

    // Track connection close
    ws.on('close', () => {
      stateChanges.push({
        id: stateChanges.length + 1,
        timestamp: new Date().toISOString(),
        connectionId,
        previousState: 1, // OPEN
        newState: 3, // CLOSED
      });
      console.log(`🔌 WS #${connectionId} closed`);
    });

    // Track errors
    ws.on('socketerror', (error) => {
      errors.push({
        timestamp: new Date().toISOString(),
        connectionId,
        error: String(error),
      });
      console.error(`❌ WS #${connectionId} error:`, error);
    });
  });

  console.log('✅ WebSocket tracking enabled\n');
}

// ============================================================
// Data Retrieval Functions
// ============================================================

/**
 * Get all captured WebSocket connections
 */
export function getCapturedWebSocketConnections(): WebSocketConnection[] {
  return [...connections];
}

/**
 * Get all captured WebSocket messages
 */
export function getCapturedWebSocketMessages(): WebSocketMessage[] {
  return [...messages];
}

/**
 * Get all WebSocket state changes
 */
export function getCapturedWebSocketStateChanges(): WebSocketStateChange[] {
  return [...stateChanges];
}

/**
 * Get all WebSocket errors
 */
export function getCapturedWebSocketErrors(): Array<{ timestamp: string; connectionId: number; error: string }> {
  return [...errors];
}

/**
 * Clear all captured WebSocket data
 */
export function clearWebSocketTracking(): void {
  connections.length = 0;
  messages.length = 0;
  stateChanges.length = 0;
  errors.length = 0;
  console.log('🧹 WebSocket tracking cleared');
}

// ============================================================
// Analysis Functions
// ============================================================

/**
 * Get WebSocket statistics
 */
export function getWebSocketStats(): WebSocketStats {
  const sent = messages.filter(m => m.direction === 'sent');
  const received = messages.filter(m => m.direction === 'received');

  const totalSize = messages.reduce((sum, m) => sum + m.size, 0);
  const avgSize = messages.length > 0 ? totalSize / messages.length : 0;

  const reconnections = stateChanges.filter(
    sc => sc.previousState === 3 && sc.newState === 0
  );

  // Calculate average latency (simplistic: time between sent/received pairs)
  let totalLatency = 0;
  let latencyCount = 0;
  for (let i = 0; i < messages.length - 1; i++) {
    if (messages[i].direction === 'sent' && messages[i + 1].direction === 'received') {
      const latency =
        new Date(messages[i + 1].timestamp).getTime() -
        new Date(messages[i].timestamp).getTime();
      totalLatency += latency;
      latencyCount++;
    }
  }
  const avgLatency = latencyCount > 0 ? totalLatency / latencyCount : 0;

  return {
    totalConnections: connections.length,
    activeConnections: connections.filter(c => c.readyState === 1).length,
    messagesSent: sent.length,
    messagesReceived: received.length,
    avgMessageSize: avgSize,
    totalDataTransferred: totalSize,
    reconnectionCount: reconnections.length,
    avgLatency,
    errorCount: errors.length,
  };
}

/**
 * Filter WebSocket messages by criteria
 */
export function filterWebSocketMessages(criteria: {
  direction?: 'sent' | 'received';
  connectionId?: number;
  event?: string;
  since?: Date;
}): WebSocketMessage[] {
  return messages.filter(msg => {
    if (criteria.direction && msg.direction !== criteria.direction) return false;
    if (criteria.connectionId && msg.connectionId !== criteria.connectionId) return false;
    if (criteria.event && msg.event !== criteria.event) return false;
    if (criteria.since && new Date(msg.timestamp) < criteria.since) return false;
    return true;
  });
}

/**
 * Get messages for a specific event type
 */
export function getMessagesByEvent(event: string): WebSocketMessage[] {
  return messages.filter(m => m.event === event);
}

/**
 * Get latest message of a specific event type
 */
export function getLatestMessage(event?: string): WebSocketMessage | null {
  const filtered = event ? messages.filter(m => m.event === event) : messages;
  return filtered.length > 0 ? filtered[filtered.length - 1] : null;
}

/**
 * Wait for a specific WebSocket event
 */
export async function waitForWebSocketEvent(
  event: string,
  timeoutMs = 5000
): Promise<WebSocketMessage> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    const message = getLatestMessage(event);
    if (message && new Date(message.timestamp).getTime() > startTime) {
      return message;
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  throw new Error(`Timeout waiting for WebSocket event: ${event}`);
}

/**
 * Check if WebSocket is currently connected
 */
export function isWebSocketConnected(): boolean {
  const latestConnection = connections[connections.length - 1];
  if (!latestConnection) return false;

  const latestState = stateChanges
    .filter(sc => sc.connectionId === latestConnection.id)
    .pop();

  return latestState ? latestState.newState === 1 : false;
}

/**
 * Get connection uptime in milliseconds
 */
export function getConnectionUptime(connectionId?: number): number {
  const id = connectionId || connections.length;
  const conn = connections.find(c => c.id === id);
  if (!conn) return 0;

  const openEvent = stateChanges.find(
    sc => sc.connectionId === id && sc.newState === 1
  );

  const closeEvent = stateChanges.find(
    sc => sc.connectionId === id && sc.newState === 3
  );

  if (!openEvent) return 0;

  const endTime = closeEvent
    ? new Date(closeEvent.timestamp)
    : new Date();

  return endTime.getTime() - new Date(openEvent.timestamp).getTime();
}

// ============================================================
// Utility Functions
// ============================================================

/**
 * Print WebSocket summary to console
 */
export function printWebSocketSummary(): void {
  const stats = getWebSocketStats();

  console.log('\n═══════════════════════════════════════════');
  console.log('🔌 WebSocket Traffic Summary');
  console.log('═══════════════════════════════════════════');
  console.log(`  Total Connections:     ${stats.totalConnections}`);
  console.log(`  Active Connections:    ${stats.activeConnections}`);
  console.log(`  Messages Sent:         ${stats.messagesSent}`);
  console.log(`  Messages Received:     ${stats.messagesReceived}`);
  console.log(`  Avg Message Size:      ${stats.avgMessageSize.toFixed(0)} bytes`);
  console.log(`  Total Data:            ${(stats.totalDataTransferred / 1024).toFixed(2)} KB`);
  console.log(`  Avg Latency:           ${stats.avgLatency.toFixed(0)} ms`);
  console.log(`  Reconnections:         ${stats.reconnectionCount}`);
  console.log(`  Errors:                ${stats.errorCount}`);
  console.log('═══════════════════════════════════════════\n');
}

/**
 * Save WebSocket data to test data manager
 */
export function getWebSocketDataForSaving(): {
  connections: WebSocketConnection[];
  messages: WebSocketMessage[];
  stateChanges: WebSocketStateChange[];
  errors: Array<{ timestamp: string; connectionId: number; error: string }>;
  stats: WebSocketStats;
} {
  return {
    connections: getCapturedWebSocketConnections(),
    messages: getCapturedWebSocketMessages(),
    stateChanges: getCapturedWebSocketStateChanges(),
    errors: getCapturedWebSocketErrors(),
    stats: getWebSocketStats(),
  };
}
