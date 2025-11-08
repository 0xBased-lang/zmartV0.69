#!/bin/bash

# E2E Test Runner for ZMART
# Runs Playwright tests with proper configuration

echo "====================================================================="
echo "ZMART E2E Test Suite - Automated Web3 Testing"
echo "====================================================================="
echo ""

# Check prerequisites
echo "📋 Checking prerequisites..."

# 1. Check devnet SOL balance
echo "  💰 Checking wallet balance..."
BALANCE=$(solana balance --url devnet 2>/dev/null | awk '{print $1}')
if [ -z "$BALANCE" ]; then
  echo "  ❌ Cannot check wallet balance"
  exit 1
fi
echo "  ✅ Wallet balance: $BALANCE SOL"

if (( $(echo "$BALANCE < 1" | bc -l) )); then
  echo "  ❌ Insufficient balance! Need at least 1 SOL"
  exit 1
fi

# 2. Check frontend server
echo "  🌐 Checking frontend server..."
if curl -s http://localhost:3000 > /dev/null; then
  echo "  ✅ Frontend server running"
else
  echo "  ❌ Frontend server not running!"
  echo "  Run: cd frontend && npm run dev"
  exit 1
fi

# 3. Check program is deployed
echo "  🔧 Checking program deployment..."
PROGRAM_ID="7h3gXfBfYFueFVLYyfL5Qo1QGsf4GQUfW96FKVgnUsJS"
if solana program show $PROGRAM_ID --url devnet > /dev/null 2>&1; then
  echo "  ✅ Program deployed to devnet"
else
  echo "  ❌ Program not found on devnet!"
  exit 1
fi

echo ""
echo "====================================================================="
echo "Running Playwright Tests"
echo "====================================================================="
echo ""

# Run tests with proper node modules path
export NODE_PATH="./node_modules"
pnpx playwright test --config=playwright.config.ts --reporter=list

EXIT_CODE=$?

echo ""
echo "====================================================================="
echo "Test Results"
echo "====================================================================="
echo ""

if [ $EXIT_CODE -eq 0 ]; then
  echo "✅ All tests passed!"
  echo "📸 Screenshots saved in: test-results/"
  echo "📊 HTML report: playwright-report/index.html"
else
  echo "❌ Some tests failed (exit code: $EXIT_CODE)"
  echo "📋 Check logs above for details"
  echo "📸 Screenshots: test-results/"
fi

echo ""
exit $EXIT_CODE
