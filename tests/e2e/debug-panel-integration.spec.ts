/**
 * Debug Panel & Component Integration Test
 *
 * Comprehensive automated testing of:
 * - Debug panel functionality
 * - All 7 API-integrated components
 * - Real-time log capture
 * - API endpoint validation
 * - Performance metrics
 * - Error handling
 *
 * Test Coverage:
 * 1. Debug Panel UI and functionality
 * 2. RecentActivity component (API + logging)
 * 3. TrendingMarkets component (API + logging)
 * 4. HotTopics component (API + logging)
 * 5. RelatedMarkets component (API + logging)
 * 6. PriceChart component (API + logging)
 * 7. OrderBook component (API + logging)
 * 8. DiscussionSection component (API + logging)
 */

import { test, expect, Page } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'

// Test data storage
const TEST_DATA_DIR = path.join(__dirname, '../../test-data/runs')
const TIMESTAMP = new Date().toISOString().replace(/:/g, '-').split('.')[0]
const RUN_DIR = path.join(TEST_DATA_DIR, `debug-panel-test-${TIMESTAMP}`)

interface DebugLog {
  timestamp: string
  component: string
  level: string
  message: string
  data?: any
}

interface APIRequest {
  url: string
  method: string
  status: number
  duration: number
  timestamp: string
}

interface TestResults {
  timestamp: string
  duration: number
  passed: boolean
  debugLogs: DebugLog[]
  apiRequests: APIRequest[]
  consoleErrors: string[]
  screenshots: string[]
  summary: {
    totalLogs: number
    totalAPIRequests: number
    totalErrors: number
    components: Record<string, { logs: number; requests: number; errors: number }>
  }
}

// Helper to capture console logs
class LogCapture {
  private logs: DebugLog[] = []
  private apiRequests: APIRequest[] = []
  private consoleErrors: string[] = []

  setupConsoleListeners(page: Page) {
    // Capture all console messages
    page.on('console', (msg) => {
      const type = msg.type()
      const text = msg.text()

      // Parse structured debug logs
      if (text.includes('[DEBUG]') || text.includes('[INFO]') || text.includes('[WARN]') || text.includes('[ERROR]')) {
        try {
          // Extract log details from format: [timestamp] [Component] [LEVEL] message
          const match = text.match(/\[([\d:.-]+)\]\s+\[([\w-]+)\]\s+\[(\w+)\]\s+(.+)/)
          if (match) {
            this.logs.push({
              timestamp: match[1],
              component: match[2],
              level: match[3],
              message: match[4],
            })
          }
        } catch (e) {
          // Fallback: just store the raw text
          this.logs.push({
            timestamp: new Date().toISOString(),
            component: 'Unknown',
            level: type.toUpperCase(),
            message: text,
          })
        }
      }

      // Capture console errors
      if (type === 'error') {
        this.consoleErrors.push(text)
      }
    })

    // Capture network requests (API calls)
    page.on('response', async (response) => {
      const url = response.url()
      const request = response.request()

      // Only track API calls to our backend
      if (url.includes('/api/markets')) {
        try {
          const timing = response.timing()
          this.apiRequests.push({
            url: url,
            method: request.method(),
            status: response.status(),
            duration: timing.responseEnd - timing.requestStart,
            timestamp: new Date().toISOString(),
          })
        } catch (e) {
          // Timing not available
        }
      }
    })
  }

  getLogs(): DebugLog[] {
    return this.logs
  }

  getAPIRequests(): APIRequest[] {
    return this.apiRequests
  }

  getConsoleErrors(): string[] {
    return this.consoleErrors
  }

  clear() {
    this.logs = []
    this.apiRequests = []
    this.consoleErrors = []
  }
}

// Helper to interact with debug panel
class DebugPanelHelper {
  constructor(private page: Page) {}

  async open() {
    // Look for "Debug Logs" button
    const button = this.page.locator('button:has-text("Debug Logs")')
    await expect(button).toBeVisible({ timeout: 10000 })
    await button.click()
    await this.page.waitForTimeout(1000)
  }

  async isOpen() {
    // Check if panel is visible
    const panel = this.page.locator('[class*="debug-panel"]').first()
    return await panel.isVisible()
  }

  async getLogCount() {
    await this.open()
    const countText = await this.page.locator('text=/\\d+ logs/').first().textContent()
    const match = countText?.match(/(\d+)/)
    return match ? parseInt(match[1]) : 0
  }

  async filterByComponent(componentName: string) {
    await this.open()
    const input = this.page.locator('input[placeholder*="component"]').first()
    await input.fill(componentName)
    await this.page.waitForTimeout(500)
  }

  async filterByLevel(level: string) {
    await this.open()
    const select = this.page.locator('select').first()
    await select.selectOption(level)
    await this.page.waitForTimeout(500)
  }

  async search(term: string) {
    await this.open()
    const input = this.page.locator('input[placeholder*="Search"]').first()
    await input.fill(term)
    await this.page.waitForTimeout(500)
  }

  async downloadLogs(): Promise<string> {
    await this.open()
    const downloadButton = this.page.locator('button:has-text("Download")')

    // Wait for download
    const [download] = await Promise.all([
      this.page.waitForEvent('download'),
      downloadButton.click(),
    ])

    // Save to test data directory
    const filename = `debug-logs-${Date.now()}.json`
    const filepath = path.join(RUN_DIR, filename)
    await download.saveAs(filepath)

    return filepath
  }

  async clearLogs() {
    await this.open()
    const clearButton = this.page.locator('button:has-text("Clear")')
    await clearButton.click()
    await this.page.waitForTimeout(500)
  }

  async close() {
    const button = this.page.locator('button:has-text("Debug Logs")')
    await button.click()
    await this.page.waitForTimeout(500)
  }
}

test.describe('Debug Panel & Component Integration Tests', () => {
  let logCapture: LogCapture
  let debugPanel: DebugPanelHelper
  let testResults: TestResults
  let startTime: number

  test.beforeAll(() => {
    // Create test data directory
    if (!fs.existsSync(RUN_DIR)) {
      fs.mkdirSync(RUN_DIR, { recursive: true })
    }
  })

  test.beforeEach(async ({ page }) => {
    startTime = Date.now()
    logCapture = new LogCapture()
    debugPanel = new DebugPanelHelper(page)

    // Setup console and network listeners
    logCapture.setupConsoleListeners(page)

    // Initialize test results
    testResults = {
      timestamp: new Date().toISOString(),
      duration: 0,
      passed: false,
      debugLogs: [],
      apiRequests: [],
      consoleErrors: [],
      screenshots: [],
      summary: {
        totalLogs: 0,
        totalAPIRequests: 0,
        totalErrors: 0,
        components: {},
      },
    }
  })

  test.afterEach(async ({ page }, testInfo) => {
    // Calculate duration
    testResults.duration = Date.now() - startTime
    testResults.passed = testInfo.status === 'passed'

    // Capture final state
    testResults.debugLogs = logCapture.getLogs()
    testResults.apiRequests = logCapture.getAPIRequests()
    testResults.consoleErrors = logCapture.getConsoleErrors()

    // Generate summary statistics
    testResults.summary.totalLogs = testResults.debugLogs.length
    testResults.summary.totalAPIRequests = testResults.apiRequests.length
    testResults.summary.totalErrors = testResults.consoleErrors.length

    // Group by component
    testResults.debugLogs.forEach((log) => {
      if (!testResults.summary.components[log.component]) {
        testResults.summary.components[log.component] = { logs: 0, requests: 0, errors: 0 }
      }
      testResults.summary.components[log.component].logs++
      if (log.level === 'ERROR') {
        testResults.summary.components[log.component].errors++
      }
    })

    // Take final screenshot
    const screenshotPath = path.join(RUN_DIR, `${testInfo.title.replace(/\s+/g, '-')}-final.png`)
    await page.screenshot({ path: screenshotPath, fullPage: true })
    testResults.screenshots.push(screenshotPath)

    // Save test results
    const resultsPath = path.join(RUN_DIR, `${testInfo.title.replace(/\s+/g, '-')}-results.json`)
    fs.writeFileSync(resultsPath, JSON.stringify(testResults, null, 2))

    console.log(`\n📊 Test Results Summary:`)
    console.log(`  Duration: ${testResults.duration}ms`)
    console.log(`  Debug Logs: ${testResults.summary.totalLogs}`)
    console.log(`  API Requests: ${testResults.summary.totalAPIRequests}`)
    console.log(`  Errors: ${testResults.summary.totalErrors}`)
    console.log(`  Results saved to: ${resultsPath}\n`)
  })

  test('1. Debug Panel - UI and Basic Functionality', async ({ page }) => {
    console.log('\n🧪 Testing Debug Panel UI...')

    // Navigate to homepage
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Wait for debug panel button to appear
    const debugButton = page.locator('button:has-text("Debug Logs")')
    await expect(debugButton).toBeVisible({ timeout: 10000 })

    // Capture state before opening
    const screenshotBefore = path.join(RUN_DIR, 'debug-panel-closed.png')
    await page.screenshot({ path: screenshotBefore, fullPage: true })

    // Open debug panel
    await debugPanel.open()
    expect(await debugPanel.isOpen()).toBe(true)

    // Capture state after opening
    const screenshotOpen = path.join(RUN_DIR, 'debug-panel-open.png')
    await page.screenshot({ path: screenshotOpen, fullPage: true })

    // Wait for logs to accumulate
    await page.waitForTimeout(3000)

    // Get log count
    const logCount = await debugPanel.getLogCount()
    console.log(`  ✅ Debug panel has ${logCount} logs`)
    expect(logCount).toBeGreaterThan(0)

    // Test filtering by level
    await debugPanel.filterByLevel('INFO')
    await page.waitForTimeout(1000)
    const screenshotFilterLevel = path.join(RUN_DIR, 'debug-panel-filter-level.png')
    await page.screenshot({ path: screenshotFilterLevel, fullPage: true })

    // Test filtering by component
    await debugPanel.filterByComponent('RecentActivity')
    await page.waitForTimeout(1000)
    const screenshotFilterComponent = path.join(RUN_DIR, 'debug-panel-filter-component.png')
    await page.screenshot({ path: screenshotFilterComponent, fullPage: true })

    // Test search
    await debugPanel.search('fetching')
    await page.waitForTimeout(1000)
    const screenshotSearch = path.join(RUN_DIR, 'debug-panel-search.png')
    await page.screenshot({ path: screenshotSearch, fullPage: true })

    // Test download logs
    const downloadPath = await debugPanel.downloadLogs()
    expect(fs.existsSync(downloadPath)).toBe(true)
    console.log(`  ✅ Logs downloaded to: ${downloadPath}`)

    // Verify downloaded log structure
    const downloadedLogs = JSON.parse(fs.readFileSync(downloadPath, 'utf-8'))
    expect(Array.isArray(downloadedLogs)).toBe(true)
    expect(downloadedLogs.length).toBeGreaterThan(0)

    // Test clear logs
    await debugPanel.clearLogs()
    await page.waitForTimeout(1000)
    const logCountAfterClear = await debugPanel.getLogCount()
    expect(logCountAfterClear).toBe(0)
    console.log(`  ✅ Logs cleared successfully`)

    // Close panel
    await debugPanel.close()
    expect(await debugPanel.isOpen()).toBe(false)
  })

  test('2. RecentActivity Component - API Integration & Logging', async ({ page }) => {
    console.log('\n🧪 Testing RecentActivity Component...')

    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Wait for component to mount and fetch data
    await page.waitForTimeout(3000)

    // Open debug panel to check logs
    await debugPanel.open()

    // Filter logs for RecentActivity component
    await debugPanel.filterByComponent('RecentActivity')
    await page.waitForTimeout(1000)

    // Capture state
    const screenshot = path.join(RUN_DIR, 'recent-activity-test.png')
    await page.screenshot({ path: screenshot, fullPage: true })

    // Verify component-specific logs
    const logs = logCapture.getLogs().filter((log) => log.component === 'RecentActivity')
    expect(logs.length).toBeGreaterThan(0)
    console.log(`  ✅ RecentActivity generated ${logs.length} logs`)

    // Check for expected log messages
    const hasMountLog = logs.some((log) => log.message.includes('mounted'))
    const hasFetchLog = logs.some((log) => log.message.includes('Fetching activity'))
    const hasDataLog = logs.some((log) => log.message.includes('Received'))

    expect(hasMountLog).toBe(true)
    expect(hasFetchLog).toBe(true)
    expect(hasDataLog).toBe(true)

    console.log(`  ✅ Component mounted: ${hasMountLog}`)
    console.log(`  ✅ Data fetched: ${hasFetchLog}`)
    console.log(`  ✅ Data received: ${hasDataLog}`)

    // Check API requests
    const apiRequests = logCapture.getAPIRequests().filter((req) => req.url.includes('/activity'))
    expect(apiRequests.length).toBeGreaterThan(0)
    expect(apiRequests[0].status).toBe(200)
    console.log(`  ✅ API request succeeded (${apiRequests[0].duration}ms)`)

    // Check for errors
    const errors = logs.filter((log) => log.level === 'ERROR')
    expect(errors.length).toBe(0)
    console.log(`  ✅ No errors detected`)
  })

  test('3. Test All 7 Components - Comprehensive Check', async ({ page }) => {
    console.log('\n🧪 Testing All 7 API-Integrated Components...')

    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Wait for all components to mount and fetch data
    await page.waitForTimeout(5000)

    // Open debug panel
    await debugPanel.open()
    await page.waitForTimeout(2000)

    // Capture full page state
    const screenshot = path.join(RUN_DIR, 'all-components-test.png')
    await page.screenshot({ path: screenshot, fullPage: true })

    const components = [
      'RecentActivity',
      'TrendingMarkets',
      'HotTopics',
      'RelatedMarkets',
      'PriceChart',
      'OrderBook',
      'DiscussionSection',
    ]

    console.log('\n  Component Summary:')
    for (const component of components) {
      const logs = logCapture.getLogs().filter((log) => log.component === component)
      const requests = logCapture.getAPIRequests().filter((req) => req.url.includes(component.toLowerCase()))
      const errors = logs.filter((log) => log.level === 'ERROR')

      console.log(`\n  ${component}:`)
      console.log(`    Logs: ${logs.length}`)
      console.log(`    API Requests: ${requests.length}`)
      console.log(`    Errors: ${errors.length}`)

      // Store in summary
      testResults.summary.components[component] = {
        logs: logs.length,
        requests: requests.length,
        errors: errors.length,
      }
    }

    // Overall validation
    const totalLogs = logCapture.getLogs().length
    const totalRequests = logCapture.getAPIRequests().length
    const totalErrors = logCapture.getConsoleErrors().length

    console.log(`\n  Overall:`)
    console.log(`    Total Logs: ${totalLogs}`)
    console.log(`    Total API Requests: ${totalRequests}`)
    console.log(`    Total Errors: ${totalErrors}`)

    expect(totalLogs).toBeGreaterThan(0)
    expect(totalRequests).toBeGreaterThan(0)
    expect(totalErrors).toBe(0)
  })

  test('4. API Performance Metrics', async ({ page }) => {
    console.log('\n🧪 Testing API Performance Metrics...')

    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(5000)

    const apiRequests = logCapture.getAPIRequests()

    console.log('\n  API Performance:')
    for (const req of apiRequests) {
      const endpoint = req.url.split('/api/markets')[1] || 'unknown'
      console.log(`    ${req.method} ${endpoint}`)
      console.log(`      Status: ${req.status}`)
      console.log(`      Duration: ${req.duration}ms`)
    }

    // Validate performance
    apiRequests.forEach((req) => {
      expect(req.status).toBe(200)
      expect(req.duration).toBeLessThan(5000) // 5s max
    })

    // Calculate average
    const avgDuration = apiRequests.reduce((sum, req) => sum + req.duration, 0) / apiRequests.length
    console.log(`\n  Average Response Time: ${avgDuration.toFixed(2)}ms`)
    expect(avgDuration).toBeLessThan(3000) // 3s average max
  })

  test('5. Error Handling and Edge Cases', async ({ page }) => {
    console.log('\n🧪 Testing Error Handling...')

    // Test with invalid market ID (should handle gracefully)
    await page.goto('/markets/invalid-market-id-12345')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(3000)

    // Check for error logs
    const errorLogs = logCapture.getLogs().filter((log) => log.level === 'ERROR')
    console.log(`  Found ${errorLogs.length} error logs`)

    // Errors should be logged, but app should not crash
    const isAppResponsive = await page.locator('body').isVisible()
    expect(isAppResponsive).toBe(true)
    console.log(`  ✅ App remained responsive after error`)

    // Capture error state
    const screenshot = path.join(RUN_DIR, 'error-handling-test.png')
    await page.screenshot({ path: screenshot, fullPage: true })
  })

  test('6. Real-Time Updates and Auto-Refresh', async ({ page }) => {
    console.log('\n🧪 Testing Real-Time Updates...')

    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Initial log count
    await page.waitForTimeout(2000)
    const initialLogCount = logCapture.getLogs().length
    console.log(`  Initial logs: ${initialLogCount}`)

    // Wait for auto-refresh (RecentActivity refreshes every 30s)
    console.log(`  Waiting for auto-refresh...`)
    await page.waitForTimeout(35000) // Wait 35s

    // Check for new logs
    const finalLogCount = logCapture.getLogs().length
    console.log(`  Final logs: ${finalLogCount}`)

    // Should have new logs from auto-refresh
    expect(finalLogCount).toBeGreaterThan(initialLogCount)
    console.log(`  ✅ Auto-refresh generated ${finalLogCount - initialLogCount} new logs`)

    // Check for auto-refresh log messages
    const autoRefreshLogs = logCapture.getLogs().filter((log) => log.message.includes('Auto-refresh'))
    expect(autoRefreshLogs.length).toBeGreaterThan(0)
    console.log(`  ✅ Found ${autoRefreshLogs.length} auto-refresh triggers`)
  })

  test('7. Debug Panel Export and Analysis', async ({ page }) => {
    console.log('\n🧪 Testing Debug Panel Export...')

    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(5000)

    // Download logs
    const downloadPath = await debugPanel.downloadLogs()
    expect(fs.existsSync(downloadPath)).toBe(true)

    // Parse and analyze
    const logs = JSON.parse(fs.readFileSync(downloadPath, 'utf-8'))

    // Group by component
    const byComponent: Record<string, number> = {}
    logs.forEach((log: DebugLog) => {
      byComponent[log.component] = (byComponent[log.component] || 0) + 1
    })

    console.log('\n  Logs by Component:')
    Object.entries(byComponent)
      .sort(([, a], [, b]) => b - a)
      .forEach(([component, count]) => {
        console.log(`    ${component}: ${count}`)
      })

    // Group by level
    const byLevel: Record<string, number> = {}
    logs.forEach((log: DebugLog) => {
      byLevel[log.level] = (byLevel[log.level] || 0) + 1
    })

    console.log('\n  Logs by Level:')
    Object.entries(byLevel).forEach(([level, count]) => {
      console.log(`    ${level}: ${count}`)
    })

    // Validate structure
    expect(logs.length).toBeGreaterThan(0)
    expect(Object.keys(byComponent).length).toBeGreaterThan(0)
    expect(Object.keys(byLevel).length).toBeGreaterThan(0)
  })
})

test.describe('Final Summary Report', () => {
  test('Generate Comprehensive Test Report', async () => {
    console.log('\n📊 Generating Comprehensive Test Report...')

    // Read all test results from this run
    const files = fs.readdirSync(RUN_DIR)
    const resultFiles = files.filter((f) => f.endsWith('-results.json'))

    const allResults = resultFiles.map((f) => {
      return JSON.parse(fs.readFileSync(path.join(RUN_DIR, f), 'utf-8'))
    })

    // Aggregate statistics
    const summary = {
      totalTests: allResults.length,
      passed: allResults.filter((r) => r.passed).length,
      failed: allResults.filter((r) => r.passed === false).length,
      totalDuration: allResults.reduce((sum, r) => sum + r.duration, 0),
      totalLogs: allResults.reduce((sum, r) => sum + r.summary.totalLogs, 0),
      totalAPIRequests: allResults.reduce((sum, r) => sum + r.summary.totalAPIRequests, 0),
      totalErrors: allResults.reduce((sum, r) => sum + r.summary.totalErrors, 0),
      components: {} as Record<string, { logs: number; requests: number; errors: number }>,
    }

    // Merge component stats
    allResults.forEach((result) => {
      Object.entries(result.summary.components).forEach(([component, stats]) => {
        if (!summary.components[component]) {
          summary.components[component] = { logs: 0, requests: 0, errors: 0 }
        }
        summary.components[component].logs += (stats as any).logs
        summary.components[component].requests += (stats as any).requests
        summary.components[component].errors += (stats as any).errors
      })
    })

    // Generate report
    const report = {
      timestamp: new Date().toISOString(),
      runDirectory: RUN_DIR,
      summary,
      details: allResults,
    }

    // Save report
    const reportPath = path.join(RUN_DIR, 'COMPREHENSIVE-TEST-REPORT.json')
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))

    // Print summary
    console.log('\n' + '='.repeat(80))
    console.log('COMPREHENSIVE TEST REPORT')
    console.log('='.repeat(80))
    console.log(`\nTest Run: ${TIMESTAMP}`)
    console.log(`Report: ${reportPath}`)
    console.log(`\nResults:`)
    console.log(`  Total Tests: ${summary.totalTests}`)
    console.log(`  Passed: ${summary.passed}`)
    console.log(`  Failed: ${summary.failed}`)
    console.log(`  Success Rate: ${((summary.passed / summary.totalTests) * 100).toFixed(1)}%`)
    console.log(`\nPerformance:`)
    console.log(`  Total Duration: ${(summary.totalDuration / 1000).toFixed(2)}s`)
    console.log(`  Avg per Test: ${(summary.totalDuration / summary.totalTests / 1000).toFixed(2)}s`)
    console.log(`\nLogging:`)
    console.log(`  Total Debug Logs: ${summary.totalLogs}`)
    console.log(`  Total API Requests: ${summary.totalAPIRequests}`)
    console.log(`  Total Errors: ${summary.totalErrors}`)
    console.log(`\nComponents Tested:`)
    Object.entries(summary.components)
      .sort(([, a], [, b]) => b.logs - a.logs)
      .forEach(([component, stats]) => {
        console.log(`  ${component}:`)
        console.log(`    Logs: ${stats.logs}`)
        console.log(`    API Requests: ${stats.requests}`)
        console.log(`    Errors: ${stats.errors}`)
      })
    console.log('\n' + '='.repeat(80))

    // Validate overall success
    expect(summary.passed).toBe(summary.totalTests)
    expect(summary.totalErrors).toBe(0)
  })
})
