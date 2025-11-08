/**
 * Performance Monitoring for E2E Tests
 *
 * Tracks timing, browser metrics, and performance degradation
 * Helps identify bottlenecks and performance regressions
 */

import { Page } from '@playwright/test';

/**
 * Timing tracker for measuring operation duration
 */
export class TimingTracker {
  private timings: Map<string, number> = new Map();
  private completedTimings: Map<string, number> = new Map();

  /**
   * Start timing an operation
   */
  start(label: string): void {
    this.timings.set(label, Date.now());
    console.log(`⏱️  Started: ${label}`);
  }

  /**
   * End timing an operation
   * Returns the duration in milliseconds
   */
  end(label: string): number {
    const startTime = this.timings.get(label);
    if (!startTime) {
      console.warn(`⚠️  No start time found for: ${label}`);
      return 0;
    }

    const duration = Date.now() - startTime;
    this.completedTimings.set(label, duration);
    this.timings.delete(label);

    // Log with color coding based on duration
    const icon = duration < 1000 ? '⚡' : duration < 3000 ? '⚠️' : '🐌';
    console.log(`${icon} Completed: ${label} (${duration}ms)`);

    return duration;
  }

  /**
   * Get duration of a completed operation
   */
  getDuration(label: string): number | undefined {
    return this.completedTimings.get(label);
  }

  /**
   * Get all completed timings
   */
  getBreakdown(): Record<string, number> {
    return Object.fromEntries(this.completedTimings);
  }

  /**
   * Get timing statistics
   */
  getStats(): {
    total: number;
    average: number;
    min: number;
    max: number;
    slowest: { label: string; duration: number } | null;
    fastest: { label: string; duration: number } | null;
  } {
    const durations = Array.from(this.completedTimings.values());
    const entries = Array.from(this.completedTimings.entries());

    if (durations.length === 0) {
      return {
        total: 0,
        average: 0,
        min: 0,
        max: 0,
        slowest: null,
        fastest: null,
      };
    }

    const total = durations.reduce((a, b) => a + b, 0);
    const average = total / durations.length;
    const min = Math.min(...durations);
    const max = Math.max(...durations);

    const sorted = [...entries].sort((a, b) => b[1] - a[1]);

    return {
      total,
      average,
      min,
      max,
      slowest: sorted[0] ? { label: sorted[0][0], duration: sorted[0][1] } : null,
      fastest: sorted[sorted.length - 1]
        ? { label: sorted[sorted.length - 1][0], duration: sorted[sorted.length - 1][1] }
        : null,
    };
  }

  /**
   * Print timing summary to console
   */
  printSummary(): void {
    const stats = this.getStats();

    console.log('\n⏱️  Timing Summary:');
    console.log(`  Total Time: ${stats.total}ms`);
    console.log(`  Average: ${stats.average.toFixed(0)}ms`);
    console.log(`  Min: ${stats.min}ms`);
    console.log(`  Max: ${stats.max}ms`);

    if (stats.slowest) {
      console.log(`  Slowest: ${stats.slowest.label} (${stats.slowest.duration}ms)`);
    }

    if (stats.fastest) {
      console.log(`  Fastest: ${stats.fastest.label} (${stats.fastest.duration}ms)`);
    }

    console.log('\n  Breakdown:');
    const breakdown = this.getBreakdown();
    Object.entries(breakdown)
      .sort((a, b) => b[1] - a[1])
      .forEach(([label, duration]) => {
        const percentage = (duration / stats.total) * 100;
        console.log(`    ${label}: ${duration}ms (${percentage.toFixed(1)}%)`);
      });
  }

  /**
   * Reset all timings
   */
  reset(): void {
    this.timings.clear();
    this.completedTimings.clear();
  }
}

/**
 * Browser performance metrics
 */
export interface BrowserMetrics {
  timestamp: string;
  memory?: {
    usedJSHeapSize: number; // bytes
    totalJSHeapSize: number; // bytes
    jsHeapSizeLimit: number; // bytes
    usedPercentage: number; // 0-100
  };
  timing?: {
    navigationStart: number;
    domContentLoaded: number;
    loadComplete: number;
    domInteractive: number;
    firstPaint?: number;
    firstContentfulPaint?: number;
  };
  resources?: {
    totalRequests: number;
    totalSize: number; // bytes
    avgDuration: number; // milliseconds
  };
}

/**
 * Capture browser performance metrics
 */
export async function captureBrowserMetrics(page: Page): Promise<BrowserMetrics> {
  try {
    const metrics = await page.evaluate(() => {
      const result: any = {
        timestamp: new Date().toISOString(),
      };

      // Memory metrics (Chrome only)
      const memory = (performance as any).memory;
      if (memory) {
        result.memory = {
          usedJSHeapSize: memory.usedJSHeapSize,
          totalJSHeapSize: memory.totalJSHeapSize,
          jsHeapSizeLimit: memory.jsHeapSizeLimit,
          usedPercentage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100,
        };
      }

      // Navigation timing
      const navigation = performance.getEntriesByType('navigation')[0] as any;
      if (navigation) {
        result.timing = {
          navigationStart: navigation.startTime || 0,
          domContentLoaded: navigation.domContentLoadedEventEnd || 0,
          loadComplete: navigation.loadEventEnd || 0,
          domInteractive: navigation.domInteractive || 0,
        };
      }

      // Paint timing
      const paintEntries = performance.getEntriesByType('paint');
      const firstPaint = paintEntries.find((e) => e.name === 'first-paint');
      const fcp = paintEntries.find((e) => e.name === 'first-contentful-paint');

      if (result.timing) {
        if (firstPaint) result.timing.firstPaint = firstPaint.startTime;
        if (fcp) result.timing.firstContentfulPaint = fcp.startTime;
      }

      // Resource timing
      const resources = performance.getEntriesByType('resource');
      if (resources.length > 0) {
        const totalSize = resources.reduce(
          (sum, r: any) => sum + (r.transferSize || 0),
          0
        );
        const totalDuration = resources.reduce(
          (sum, r) => sum + r.duration,
          0
        );

        result.resources = {
          totalRequests: resources.length,
          totalSize,
          avgDuration: totalDuration / resources.length,
        };
      }

      return result;
    });

    return metrics;
  } catch (error) {
    console.warn('⚠️  Failed to capture browser metrics:', error);
    return {
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Print browser metrics summary
 */
export function printBrowserMetrics(metrics: BrowserMetrics): void {
  console.log('\n🖥️  Browser Metrics:');

  if (metrics.memory) {
    const { usedJSHeapSize, totalJSHeapSize, jsHeapSizeLimit, usedPercentage } = metrics.memory;
    console.log('  Memory:');
    console.log(`    Used: ${(usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`    Total: ${(totalJSHeapSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`    Limit: ${(jsHeapSizeLimit / 1024 / 1024).toFixed(2)} MB`);
    console.log(`    Usage: ${usedPercentage.toFixed(1)}%`);
  }

  if (metrics.timing) {
    console.log('  Page Load Timing:');
    if (metrics.timing.firstPaint) {
      console.log(`    First Paint: ${metrics.timing.firstPaint.toFixed(0)}ms`);
    }
    if (metrics.timing.firstContentfulPaint) {
      console.log(`    First Contentful Paint: ${metrics.timing.firstContentfulPaint.toFixed(0)}ms`);
    }
    console.log(`    DOM Interactive: ${metrics.timing.domInteractive.toFixed(0)}ms`);
    console.log(`    DOM Content Loaded: ${metrics.timing.domContentLoaded.toFixed(0)}ms`);
    console.log(`    Load Complete: ${metrics.timing.loadComplete.toFixed(0)}ms`);
  }

  if (metrics.resources) {
    console.log('  Resources:');
    console.log(`    Total Requests: ${metrics.resources.totalRequests}`);
    console.log(`    Total Size: ${(metrics.resources.totalSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`    Avg Duration: ${metrics.resources.avgDuration.toFixed(0)}ms`);
  }
}

/**
 * Monitor for performance degradation
 * Compares current metrics to baseline
 */
export interface PerformanceComparison {
  metric: string;
  baseline: number;
  current: number;
  delta: number; // absolute difference
  deltaPercentage: number; // percentage change
  degraded: boolean; // true if performance got worse
  threshold: number; // threshold for degradation
}

export function comparePerformance(
  baseline: BrowserMetrics,
  current: BrowserMetrics,
  thresholdPercentage: number = 20 // 20% degradation threshold
): PerformanceComparison[] {
  const comparisons: PerformanceComparison[] = [];

  // Compare memory usage
  if (baseline.memory && current.memory) {
    const baselineUsed = baseline.memory.usedJSHeapSize;
    const currentUsed = current.memory.usedJSHeapSize;
    const delta = currentUsed - baselineUsed;
    const deltaPercentage = (delta / baselineUsed) * 100;

    comparisons.push({
      metric: 'memory.usedJSHeapSize',
      baseline: baselineUsed,
      current: currentUsed,
      delta,
      deltaPercentage,
      degraded: deltaPercentage > thresholdPercentage,
      threshold: thresholdPercentage,
    });
  }

  // Compare load times
  if (baseline.timing && current.timing) {
    const metrics = [
      'domContentLoaded',
      'loadComplete',
      'domInteractive',
      'firstPaint',
      'firstContentfulPaint',
    ];

    for (const metric of metrics) {
      const baselineValue = (baseline.timing as any)[metric];
      const currentValue = (current.timing as any)[metric];

      if (baselineValue && currentValue) {
        const delta = currentValue - baselineValue;
        const deltaPercentage = (delta / baselineValue) * 100;

        comparisons.push({
          metric: `timing.${metric}`,
          baseline: baselineValue,
          current: currentValue,
          delta,
          deltaPercentage,
          degraded: deltaPercentage > thresholdPercentage,
          threshold: thresholdPercentage,
        });
      }
    }
  }

  return comparisons;
}

/**
 * Print performance comparison
 */
export function printPerformanceComparison(comparisons: PerformanceComparison[]): void {
  const degraded = comparisons.filter((c) => c.degraded);

  if (degraded.length === 0) {
    console.log('✅ No performance degradation detected');
    return;
  }

  console.log(`\n⚠️  Performance Degradation Detected (${degraded.length} metrics):`);

  degraded.forEach((c) => {
    const sign = c.delta > 0 ? '+' : '';
    console.log(`  ${c.metric}:`);
    console.log(`    Baseline: ${c.baseline.toFixed(0)}`);
    console.log(`    Current: ${c.current.toFixed(0)}`);
    console.log(`    Change: ${sign}${c.delta.toFixed(0)} (${sign}${c.deltaPercentage.toFixed(1)}%)`);
  });
}

/**
 * Global timing tracker instance
 */
export const globalTimingTracker = new TimingTracker();
