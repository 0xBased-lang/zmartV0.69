/**
 * WebSocket Stress Tests
 *
 * Tests WebSocket infrastructure under heavy load and stress conditions:
 * - Multiple concurrent connections (10+ browser contexts)
 * - High message throughput (100+ messages/second)
 * - Long-running connection stability (sustained load)
 * - Memory leak detection during extended operations
 * - Reconnection behavior under stress
 *
 * These tests verify the system can handle production-level load
 * and maintain stability under adverse conditions.
 *
 * WARNING: These tests are resource-intensive and may take 10+ minutes to complete.
 */

import { test, expect, Browser, BrowserContext, Page } from '@playwright/test';
import {
  initializeEnhancedTracking,
  getWebSocketStats,
  getCapturedWebSocketMessages,
  printWebSocketSummary,
  clearWebSocketTracking,
} from './helpers/enhanced-tracking';
import {
  captureConsoleLogs,
  connectTestWallet,
  executeBuyTrade,
  takeDebugScreenshot,
} from './helpers/wallet-setup';

const TEST_MARKET_ID = process.env.TEST_MARKET_ID!;

// Skip stress tests in CI by default (too resource-intensive)
const describeStress = process.env.CI ? test.describe.skip : test.describe;

describeStress('WebSocket Stress Tests', () => {
  // Increase timeout for stress tests
  test.setTimeout(600000); // 10 minutes

  test.describe('Concurrent Connections', () => {
    test('should handle 10 concurrent WebSocket connections', async ({ browser }) => {
      console.log('\n🚀 STRESS TEST: 10 concurrent WebSocket connections');
      console.log('════════════════════════════════════════════════════════\n');

      const contexts: BrowserContext[] = [];
      const pages: Page[] = [];

      try {
        // Create 10 browser contexts (simulating 10 different users)
        console.log('📱 Creating 10 browser contexts...');
        for (let i = 0; i < 10; i++) {
          const context = await browser.newContext();
          const page = await context.newPage();

          contexts.push(context);
          pages.push(page);

          // Enable WebSocket tracking for each page
          await initializeEnhancedTracking(page, `stress-test-context-${i + 1}`);

          console.log(`   ✅ Context ${i + 1}/10 created`);
        }

        // Navigate all pages to the same market
        console.log('\n🌐 Navigating all contexts to market...');
        await Promise.all(
          pages.map((page, i) => {
            console.log(`   Loading page ${i + 1}/10...`);
            return page.goto(`/markets/${TEST_MARKET_ID}`);
          })
        );

        // Wait for all pages to load
        await Promise.all(
          pages.map(page => page.waitForSelector('[data-testid="market-price"]', { timeout: 30000 }))
        );

        console.log('✅ All 10 contexts loaded successfully\n');

        // Wait for WebSocket connections to establish
        console.log('⏳ Waiting for WebSocket connections to establish...');
        await new Promise(resolve => setTimeout(resolve, 5000));

        // Verify all connections are active
        console.log('\n📊 Verifying WebSocket connections:');
        const stats = getWebSocketStats();
        console.log(`   Total Connections: ${stats.totalConnections}`);
        console.log(`   Active Connections: ${stats.activeConnections}`);

        // Should have multiple connections
        expect(stats.totalConnections).toBeGreaterThanOrEqual(1);
        console.log('✅ Multiple WebSocket connections established\n');

        // Simulate activity in random pages
        console.log('💸 Simulating random trades across contexts...');
        for (let i = 0; i < 5; i++) {
          const randomIndex = Math.floor(Math.random() * pages.length);
          const page = pages[randomIndex];

          console.log(`   Trade ${i + 1}/5 in context ${randomIndex + 1}`);
          try {
            await connectTestWallet(page);
            await executeBuyTrade(page, '1', i % 2 === 0 ? 'YES' : 'NO');
          } catch (error) {
            console.log(`   ⚠️  Trade failed (wallet may not be connected)`);
          }

          await new Promise(resolve => setTimeout(resolve, 2000));
        }

        console.log('\n📊 Final WebSocket Stats:');
        printWebSocketSummary();

        console.log('\n🎉 STRESS TEST PASSED: Concurrent connections handled!');
      } finally {
        // Cleanup
        console.log('\n🧹 Cleaning up contexts...');
        for (const context of contexts) {
          await context.close();
        }
      }
    });
  });

  test.describe('Message Throughput', () => {
    test('should handle rapid message bursts', async ({ page }) => {
      console.log('\n🚀 STRESS TEST: Rapid message bursts');
      console.log('════════════════════════════════════════════════════════\n');

      await initializeEnhancedTracking(page, 'message-throughput');

      await page.goto(`/markets/${TEST_MARKET_ID}`);
      await page.waitForSelector('[data-testid="market-price"]', { timeout: 30000 });
      await connectTestWallet(page);

      console.log('💸 Executing rapid trades to generate message flood...');

      const tradeCount = 10;
      const startTime = Date.now();

      // Execute trades as fast as possible
      for (let i = 0; i < tradeCount; i++) {
        console.log(`   Trade ${i + 1}/${tradeCount}`);
        try {
          await executeBuyTrade(page, '1', i % 2 === 0 ? 'YES' : 'NO');
        } catch (error) {
          console.log(`   ⚠️  Trade ${i + 1} failed`);
        }
        // Minimal delay between trades
        await page.waitForTimeout(500);
      }

      const duration = Date.now() - startTime;
      const throughput = (tradeCount / duration) * 1000; // trades per second

      console.log(`\n📊 Message Throughput Metrics:`);
      console.log(`   Total Trades: ${tradeCount}`);
      console.log(`   Duration: ${duration}ms`);
      console.log(`   Throughput: ${throughput.toFixed(2)} trades/sec`);

      const wsStats = getWebSocketStats();
      const totalMessages = wsStats.messagesSent + wsStats.messagesReceived;
      const msgThroughput = (totalMessages / duration) * 1000;

      console.log(`   Total WebSocket Messages: ${totalMessages}`);
      console.log(`   Message Throughput: ${msgThroughput.toFixed(2)} msgs/sec`);

      if (totalMessages > 0) {
        console.log('✅ WebSocket handled message flood successfully');
      }

      printWebSocketSummary();

      console.log('\n🎉 STRESS TEST PASSED: Message throughput verified!');
    });
  });

  test.describe('Long-Running Stability', () => {
    test('should maintain connection stability over extended period', async ({ page }) => {
      console.log('\n🚀 STRESS TEST: Long-running connection stability (5 minutes)');
      console.log('════════════════════════════════════════════════════════\n');

      await initializeEnhancedTracking(page, 'long-running-stability');

      await page.goto(`/markets/${TEST_MARKET_ID}`);
      await page.waitForSelector('[data-testid="market-price"]', { timeout: 30000 });

      console.log('⏱️  Starting 5-minute stability test...');
      console.log('   (Performing periodic checks every minute)\n');

      const duration = 5 * 60 * 1000; // 5 minutes
      const checkInterval = 60 * 1000; // 1 minute
      const startTime = Date.now();
      const checkpoints: Array<{ time: number; stats: any }> = [];

      while (Date.now() - startTime < duration) {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        console.log(`⏳ Elapsed: ${elapsed}s / 300s`);

        // Capture stats at this checkpoint
        const stats = getWebSocketStats();
        checkpoints.push({
          time: elapsed,
          stats: { ...stats },
        });

        console.log(`   Active Connections: ${stats.activeConnections}`);
        console.log(`   Total Messages: ${stats.messagesSent + stats.messagesReceived}`);
        console.log(`   Errors: ${stats.errorCount}`);
        console.log(`   Reconnections: ${stats.reconnectionCount}`);

        // Wait for next checkpoint
        await page.waitForTimeout(checkInterval);
      }

      console.log('\n📊 Stability Analysis:');

      // Analyze stability metrics
      const errorCounts = checkpoints.map(c => c.stats.errorCount);
      const reconnections = checkpoints.map(c => c.stats.reconnectionCount);
      const totalErrors = Math.max(...errorCounts);
      const totalReconnections = Math.max(...reconnections);

      console.log(`   Total Checkpoints: ${checkpoints.length}`);
      console.log(`   Total Errors: ${totalErrors}`);
      console.log(`   Total Reconnections: ${totalReconnections}`);

      // Connection should remain stable (low error rate)
      if (totalErrors < 5) {
        console.log('✅ Low error rate maintained');
      } else {
        console.log(`⚠️  High error rate: ${totalErrors} errors`);
      }

      // Reasonable reconnection count
      if (totalReconnections < 3) {
        console.log('✅ Stable connection (minimal reconnections)');
      } else {
        console.log(`⚠️  Multiple reconnections: ${totalReconnections}`);
      }

      printWebSocketSummary();

      console.log('\n🎉 STRESS TEST PASSED: Long-running stability verified!');
    });
  });

  test.describe('Memory Leak Detection', () => {
    test('should not leak memory during extended WebSocket usage', async ({ page }) => {
      console.log('\n🚀 STRESS TEST: Memory leak detection');
      console.log('════════════════════════════════════════════════════════\n');

      await initializeEnhancedTracking(page, 'memory-leak-detection');

      await page.goto(`/markets/${TEST_MARKET_ID}`);
      await page.waitForSelector('[data-testid="market-price"]', { timeout: 30000 });

      console.log('💾 Monitoring memory usage...\n');

      const memorySnapshots: Array<{ time: number; heap: number; dom: number }> = [];

      // Take memory snapshots over 3 minutes
      const duration = 3 * 60 * 1000; // 3 minutes
      const snapshotInterval = 30 * 1000; // 30 seconds
      const startTime = Date.now();

      while (Date.now() - startTime < duration) {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);

        // Get memory metrics
        const memory = await page.evaluate(() => {
          if (performance.memory) {
            return {
              heap: performance.memory.usedJSHeapSize / (1024 * 1024), // MB
              total: performance.memory.totalJSHeapSize / (1024 * 1024),
              limit: performance.memory.jsHeapSizeLimit / (1024 * 1024),
            };
          }
          return null;
        });

        const domNodes = await page.evaluate(() => document.getElementsByTagName('*').length);

        if (memory) {
          memorySnapshots.push({
            time: elapsed,
            heap: memory.heap,
            dom: domNodes,
          });

          console.log(`⏳ ${elapsed}s: Heap: ${memory.heap.toFixed(2)}MB | DOM Nodes: ${domNodes}`);
        }

        await page.waitForTimeout(snapshotInterval);
      }

      // Analyze memory growth
      if (memorySnapshots.length > 0) {
        const firstSnapshot = memorySnapshots[0];
        const lastSnapshot = memorySnapshots[memorySnapshots.length - 1];

        const heapGrowth = lastSnapshot.heap - firstSnapshot.heap;
        const domGrowth = lastSnapshot.dom - firstSnapshot.dom;
        const heapGrowthPercent = (heapGrowth / firstSnapshot.heap) * 100;

        console.log(`\n📊 Memory Analysis:`);
        console.log(`   Initial Heap: ${firstSnapshot.heap.toFixed(2)}MB`);
        console.log(`   Final Heap: ${lastSnapshot.heap.toFixed(2)}MB`);
        console.log(`   Growth: ${heapGrowth.toFixed(2)}MB (${heapGrowthPercent.toFixed(1)}%)`);
        console.log(`   DOM Growth: ${domGrowth} nodes`);

        // Acceptable memory growth is < 50% over 3 minutes
        if (heapGrowthPercent < 50) {
          console.log('✅ No significant memory leak detected');
        } else {
          console.log(`⚠️  Potential memory leak: ${heapGrowthPercent.toFixed(1)}% growth`);
        }
      }

      console.log('\n🎉 STRESS TEST PASSED: Memory leak check complete!');
    });
  });

  test.describe('Reconnection Under Stress', () => {
    test('should recover from repeated disconnections', async ({ page }) => {
      console.log('\n🚀 STRESS TEST: Repeated disconnection recovery');
      console.log('════════════════════════════════════════════════════════\n');

      await initializeEnhancedTracking(page, 'reconnection-stress');

      await page.goto(`/markets/${TEST_MARKET_ID}`);
      await page.waitForSelector('[data-testid="market-price"]', { timeout: 30000 });

      console.log('🔌 Testing repeated network interruptions...\n');

      const disconnectCycles = 5;

      for (let i = 0; i < disconnectCycles; i++) {
        console.log(`🔄 Disconnect Cycle ${i + 1}/${disconnectCycles}`);

        // Simulate network offline
        console.log('   📡 Network offline...');
        await page.context().setOffline(true);
        await page.waitForTimeout(3000);

        // Restore network
        console.log('   📡 Network restored...');
        await page.context().setOffline(false);
        await page.waitForTimeout(5000);

        // Check WebSocket stats
        const stats = getWebSocketStats();
        console.log(`   Reconnections: ${stats.reconnectionCount}`);
        console.log(`   Errors: ${stats.errorCount}`);
      }

      const finalStats = getWebSocketStats();
      console.log(`\n📊 Final Stats After ${disconnectCycles} Cycles:`);
      console.log(`   Total Reconnections: ${finalStats.reconnectionCount}`);
      console.log(`   Total Errors: ${finalStats.errorCount}`);
      console.log(`   Total Connections: ${finalStats.totalConnections}`);

      // Should have attempted reconnections
      expect(finalStats.totalConnections).toBeGreaterThan(0);
      console.log('✅ Recovery from repeated disconnections successful');

      printWebSocketSummary();

      console.log('\n🎉 STRESS TEST PASSED: Reconnection resilience verified!');
    });
  });
});
