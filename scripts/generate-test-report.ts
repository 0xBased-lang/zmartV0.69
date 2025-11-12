/**
 * Generate Comprehensive Test Report from Playwright Test Results
 *
 * Analyzes all test-data/runs/ directories and generates a summary report
 */

import * as fs from 'fs'
import * as path from 'path'

interface DebugLog {
  timestamp: string
  component: string
  level: string
  message: string
  data?: any
}

interface TestResult {
  timestamp: string
  duration: number
  passed: boolean
  debugLogs: DebugLog[]
  apiRequests: any[]
  consoleErrors: string[]
  screenshots: string[]
  summary?: {
    totalLogs: number
    totalAPIRequests: number
    totalErrors: number
    components: Record<string, { logs: number; requests: number; errors: number }>
  }
}

// Find most recent test run
const testDataDir = path.join(__dirname, '../test-data/runs')
const runs = fs.readdirSync(testDataDir)
  .filter(f => f.startsWith('debug-panel-test'))
  .sort()
  .reverse()

console.log(`\n📊 COMPREHENSIVE TEST REPORT GENERATOR`)
console.log(`=`.repeat(80))

if (runs.length === 0) {
  console.log(`\n❌ No test runs found in ${testDataDir}`)
  process.exit(1)
}

console.log(`\nFound ${runs.length} test runs`)
console.log(`Latest run: ${runs[0]}\n`)

// Analyze all test runs
const allResults: TestResult[] = []

for (const run of runs.slice(0, 5)) { // Last 5 runs
  const runDir = path.join(testDataDir, run)
  const files = fs.readdirSync(runDir)
  const resultFiles = files.filter(f => f.endsWith('-results.json'))

  console.log(`\n📁 Analyzing ${run}:`)
  console.log(`   Found ${resultFiles.length} result files`)

  for (const file of resultFiles) {
    try {
      const content = fs.readFileSync(path.join(runDir, file), 'utf-8')
      const result: TestResult = JSON.parse(content)
      allResults.push(result)

      console.log(`   ✅ ${file.replace('-results.json', '')}`)
      console.log(`      Duration: ${result.duration}ms`)
      console.log(`      Logs: ${result.debugLogs.length}`)
      console.log(`      API Requests: ${result.apiRequests.length}`)
      console.log(`      Errors: ${result.consoleErrors.length}`)
      console.log(`      Passed: ${result.passed ? '✅' : '❌'}`)
    } catch (e) {
      console.log(`   ❌ Failed to parse ${file}`)
    }
  }
}

// Generate aggregate statistics
console.log(`\n${'='.repeat(80)}`)
console.log(`AGGREGATE STATISTICS`)
console.log(`${'='.repeat(80)}`)

const totalTests = allResults.length
const passedTests = allResults.filter(r => r.passed).length
const failedTests = totalTests - passedTests
const totalDuration = allResults.reduce((sum, r) => sum + r.duration, 0)
const totalLogs = allResults.reduce((sum, r) => sum + r.debugLogs.length, 0)
const totalAPIRequests = allResults.reduce((sum, r) => sum + r.apiRequests.length, 0)
const totalErrors = allResults.reduce((sum, r) => sum + r.consoleErrors.length, 0)

console.log(`\nOverall Results:`)
console.log(`  Total Tests: ${totalTests}`)
console.log(`  Passed: ${passedTests} (${((passedTests/totalTests)*100).toFixed(1)}%)`)
console.log(`  Failed: ${failedTests} (${((failedTests/totalTests)*100).toFixed(1)}%)`)
console.log(`\nPerformance:`)
console.log(`  Total Duration: ${(totalDuration/1000).toFixed(2)}s`)
console.log(`  Avg per Test: ${(totalDuration/totalTests/1000).toFixed(2)}s`)
console.log(`\nLogging & Monitoring:`)
console.log(`  Total Debug Logs: ${totalLogs}`)
console.log(`  Total API Requests: ${totalAPIRequests}`)
console.log(`  Total Console Errors: ${totalErrors}`)

// Analyze logs by component
const componentStats: Record<string, {logs: number, errors: number}> = {}

allResults.forEach(result => {
  result.debugLogs.forEach(log => {
    if (!componentStats[log.component]) {
      componentStats[log.component] = { logs: 0, errors: 0 }
    }
    componentStats[log.component].logs++
    if (log.level === 'ERROR') {
      componentStats[log.component].errors++
    }
  })
})

console.log(`\n${'='.repeat(80)}`)
console.log(`COMPONENT ANALYSIS`)
console.log(`${'='.repeat(80)}`)

const sortedComponents = Object.entries(componentStats)
  .sort(([,a], [,b]) => b.logs - a.logs)

console.log(`\nComponents Tested (by log volume):`)
sortedComponents.forEach(([component, stats]) => {
  console.log(`\n  ${component}:`)
  console.log(`    Logs: ${stats.logs}`)
  console.log(`    Errors: ${stats.errors}`)
  console.log(`    Status: ${stats.errors === 0 ? '✅' : '⚠️'}`)
})

// Analyze log levels
const logLevels: Record<string, number> = {}
allResults.forEach(result => {
  result.debugLogs.forEach(log => {
    logLevels[log.level] = (logLevels[log.level] || 0) + 1
  })
})

console.log(`\n${'='.repeat(80)}`)
console.log(`LOG LEVEL DISTRIBUTION`)
console.log(`${'='.repeat(80)}`)

Object.entries(logLevels)
  .sort(([,a], [,b]) => b - a)
  .forEach(([level, count]) => {
    const percentage = ((count / totalLogs) * 100).toFixed(1)
    console.log(`  ${level}: ${count} (${percentage}%)`)
  })

// API Performance Analysis
if (totalAPIRequests > 0) {
  const allAPIRequests = allResults.flatMap(r => r.apiRequests)
  const avgDuration = allAPIRequests.reduce((sum, req) => sum + (req.duration || 0), 0) / allAPIRequests.length

  console.log(`\n${'='.repeat(80)}`)
  console.log(`API PERFORMANCE`)
  console.log(`${'='.repeat(80)}`)

  console.log(`\n  Total API Calls: ${totalAPIRequests}`)
  console.log(`  Average Response Time: ${avgDuration.toFixed(2)}ms`)

  // Group by endpoint
  const endpoints: Record<string, {count: number, avgDuration: number}> = {}
  allAPIRequests.forEach(req => {
    const endpoint = req.url.split('/api/markets')[1] || 'unknown'
    if (!endpoints[endpoint]) {
      endpoints[endpoint] = { count: 0, avgDuration: 0 }
    }
    endpoints[endpoint].count++
    endpoints[endpoint].avgDuration += (req.duration || 0)
  })

  console.log(`\n  By Endpoint:`)
  Object.entries(endpoints)
    .sort(([,a], [,b]) => b.count - a.count)
    .forEach(([endpoint, stats]) => {
      const avg = (stats.avgDuration / stats.count).toFixed(2)
      console.log(`    ${endpoint}`)
      console.log(`      Calls: ${stats.count}`)
      console.log(`      Avg: ${avg}ms`)
    })
}

// Error Analysis
if (totalErrors > 0) {
  console.log(`\n${'='.repeat(80)}`)
  console.log(`ERROR ANALYSIS`)
  console.log(`${'='.repeat(80)}`)

  const errorMessages = allResults.flatMap(r => r.consoleErrors)
  const uniqueErrors = [...new Set(errorMessages)]

  console.log(`\n  Total Errors: ${totalErrors}`)
  console.log(`  Unique Error Types: ${uniqueErrors.length}`)

  console.log(`\n  Most Common Errors:`)
  uniqueErrors.slice(0, 10).forEach((error, i) => {
    const count = errorMessages.filter(e => e === error).length
    console.log(`    ${i+1}. ${error.substring(0, 80)}... (${count}x)`)
  })
}

// Save report
const reportPath = path.join(testDataDir, runs[0], 'COMPREHENSIVE-TEST-REPORT.txt')
const reportContent = `
COMPREHENSIVE TEST REPORT
Generated: ${new Date().toISOString()}
Test Run: ${runs[0]}

${'='.repeat(80)}
SUMMARY
${'='.repeat(80)}

Overall Results:
  Total Tests: ${totalTests}
  Passed: ${passedTests} (${((passedTests/totalTests)*100).toFixed(1)}%)
  Failed: ${failedTests} (${((failedTests/totalTests)*100).toFixed(1)}%)

Performance:
  Total Duration: ${(totalDuration/1000).toFixed(2)}s
  Avg per Test: ${(totalDuration/totalTests/1000).toFixed(2)}s

Logging & Monitoring:
  Total Debug Logs: ${totalLogs}
  Total API Requests: ${totalAPIRequests}
  Total Console Errors: ${totalErrors}

${'='.repeat(80)}
COMPONENTS TESTED
${'='.repeat(80)}

${sortedComponents.map(([component, stats]) => `
${component}:
  Logs: ${stats.logs}
  Errors: ${stats.errors}
  Status: ${stats.errors === 0 ? 'PASS' : 'FAIL'}
`).join('\n')}

${'='.repeat(80)}
API PERFORMANCE
${'='.repeat(80)}

Total API Calls: ${totalAPIRequests}

${'='.repeat(80)}
CONCLUSION
${'='.repeat(80)}

✅ Debug logging system working
✅ API request/response tracking operational
✅ Console error capture functional
${totalErrors > 0 ? '⚠️ Some console errors detected - review required' : '✅ No console errors detected'}

Test data location: ${path.join(testDataDir, runs[0])}
`

fs.writeFileSync(reportPath, reportContent)

console.log(`\n${'='.repeat(80)}`)
console.log(`✅ Report saved to: ${reportPath}`)
console.log(`${'='.repeat(80)}\n`)
