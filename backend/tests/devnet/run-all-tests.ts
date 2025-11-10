/**
 * Master Test Runner
 *
 * Runs all devnet test suites in sequence and reports overall results
 */

import { execSync } from 'child_process';
import path from 'path';

interface TestResult {
  suite: string;
  passed: boolean;
  duration: number;
  error?: string;
}

function printBanner(text: string) {
  const line = '='.repeat(80);
  console.log('\n' + line);
  console.log(`  ${text}`);
  console.log(line + '\n');
}

function printTestResult(result: TestResult) {
  const symbol = result.passed ? '✅' : '❌';
  const status = result.passed ? 'PASSED' : 'FAILED';
  console.log(`${symbol} ${result.suite}: ${status} (${result.duration.toFixed(2)}s)`);
  if (result.error) {
    console.log(`   Error: ${result.error}`);
  }
}

async function runTest(testFile: string, suiteName: string): Promise<TestResult> {
  const startTime = Date.now();

  try {
    console.log(`\n🧪 Running ${suiteName}...\n`);

    const testPath = path.join(__dirname, testFile);
    execSync(`npx ts-node ${testPath}`, {
      stdio: 'inherit',
      cwd: path.join(__dirname, '../..'),
    });

    const duration = (Date.now() - startTime) / 1000;
    return {
      suite: suiteName,
      passed: true,
      duration,
    };
  } catch (error: any) {
    const duration = (Date.now() - startTime) / 1000;
    return {
      suite: suiteName,
      passed: false,
      duration,
      error: error.message,
    };
  }
}

async function runAllTests() {
  printBanner('DEVNET TEST SUITE - COMPREHENSIVE VALIDATION');

  console.log('Running all test suites in sequence...');
  console.log('This will take approximately 3-4 minutes.');
  console.log('');

  const testSuites = [
    { file: '1-market-lifecycle.test.ts', name: 'Market Lifecycle Tests' },
    { file: '2-lmsr-validation.test.ts', name: 'LMSR Validation Tests' },
    { file: '3-fee-distribution.test.ts', name: 'Fee Distribution Tests' },
  ];

  const results: TestResult[] = [];
  const startTime = Date.now();

  for (const suite of testSuites) {
    const result = await runTest(suite.file, suite.name);
    results.push(result);

    if (!result.passed) {
      console.log(`\n⚠️  ${suite.name} failed. Continuing with remaining tests...\n`);
    }
  }

  const totalDuration = (Date.now() - startTime) / 1000;

  // Print summary
  printBanner('TEST SUMMARY');

  console.log('Individual Test Results:');
  results.forEach(result => printTestResult(result));

  console.log('');
  console.log('Overall Statistics:');
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const passRate = (passed / results.length) * 100;

  console.log(`- Total Suites: ${results.length}`);
  console.log(`- Passed: ${passed}`);
  console.log(`- Failed: ${failed}`);
  console.log(`- Pass Rate: ${passRate.toFixed(1)}%`);
  console.log(`- Total Duration: ${totalDuration.toFixed(2)}s`);
  console.log('');

  if (failed === 0) {
    printBanner('🎉 ALL TESTS PASSED! 🎉');
    console.log('✅ Market lifecycle validated');
    console.log('✅ LMSR calculations correct');
    console.log('✅ Fee distribution working');
    console.log('');
    console.log('Program is ready for:');
    console.log('  1. Backend service integration');
    console.log('  2. Frontend development');
    console.log('  3. E2E testing');
    console.log('  4. Security audit');
    console.log('');
    process.exit(0);
  } else {
    printBanner('❌ SOME TESTS FAILED');
    console.log('Please review the errors above and:');
    console.log('  1. Check program deployment status');
    console.log('  2. Verify GlobalConfig initialization');
    console.log('  3. Ensure sufficient devnet SOL');
    console.log('  4. Review program logs for errors');
    console.log('');
    process.exit(1);
  }
}

// Run all tests
runAllTests().catch(err => {
  console.error('\n❌ Test runner failed:', err);
  process.exit(1);
});
