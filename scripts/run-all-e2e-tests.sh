#!/bin/bash
# Run All E2E Tests and Collect Results
# This script runs all comprehensive E2E tests and generates a gap analysis report

set -e  # Exit on error

echo "🚀 COMPREHENSIVE E2E TEST EXECUTION"
echo "═══════════════════════════════════════════════════════════════"
echo "Starting Time: $(date)"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Array of test files
tests=(
    "tests/e2e/market-lifecycle-complete.spec.ts"
    "tests/e2e/lmsr-validation.spec.ts"
    "tests/e2e/fee-distribution.spec.ts"
    "tests/e2e/resolution-payout.spec.ts"
    "tests/e2e/program-errors.spec.ts"
    "tests/e2e/slippage-advanced.spec.ts"
    "tests/e2e/performance-benchmarks.spec.ts"
    "tests/e2e/concurrent-trading.spec.ts"
)

test_names=(
    "P1: Market Lifecycle"
    "P2: LMSR Validation"
    "P3: Fee Distribution"
    "P4: Resolution & Payout"
    "P5.1: Program Errors"
    "P5.2: Slippage Protection"
    "P6: Performance Benchmarks"
    "P7: Concurrent Trading"
)

# Check starting SOL balance
echo "💰 Checking starting balance..."
WALLET="4WQwPjKHu3x7dHBEehBDgxXHJQoDuBvj6Xhu6C1jjTye"
START_BALANCE=$(solana balance $WALLET --url devnet 2>/dev/null | awk '{print $1}')
echo "   Wallet: $WALLET"
echo "   Balance: $START_BALANCE SOL"
echo ""

# Create results directory
RESULTS_DIR="test-results-$(date +%Y-%m-%d-%H%M%S)"
mkdir -p "$RESULTS_DIR"

echo "📁 Results will be saved to: $RESULTS_DIR"
echo ""

# Run each test and collect results
for i in "${!tests[@]}"; do
    test_file="${tests[$i]}"
    test_name="${test_names[$i]}"

    echo "═══════════════════════════════════════════════════════════════"
    echo "🧪 Running: $test_name"
    echo "   File: $test_file"
    echo "   Time: $(date)"
    echo "═══════════════════════════════════════════════════════════════"

    # Run test and capture output
    log_file="$RESULTS_DIR/$(basename $test_file .spec.ts).log"

    if pnpm exec playwright test "$test_file" \
        --project=real-blockchain-chromium \
        --timeout=120000 \
        2>&1 | tee "$log_file"; then
        echo "✅ PASSED: $test_name"
    else
        echo "❌ FAILED: $test_name (expected - documenting gaps)"
    fi

    echo ""
    echo "📊 Quick Stats:"
    grep -E "(passed|failed|tests)" "$log_file" | tail -5 || echo "   (stats not available)"
    echo ""

    # Small delay between tests
    sleep 2
done

# Check ending balance
echo "═══════════════════════════════════════════════════════════════"
echo "💰 Final Balance Check"
echo "═══════════════════════════════════════════════════════════════"
END_BALANCE=$(solana balance $WALLET --url devnet 2>/dev/null | awk '{print $1}')
SOL_SPENT=$(echo "$START_BALANCE - $END_BALANCE" | bc)
echo "   Starting: $START_BALANCE SOL"
echo "   Ending:   $END_BALANCE SOL"
echo "   Spent:    $SOL_SPENT SOL"
echo ""

# Generate summary
echo "═══════════════════════════════════════════════════════════════"
echo "📊 TEST EXECUTION SUMMARY"
echo "═══════════════════════════════════════════════════════════════"
echo "Completion Time: $(date)"
echo ""
echo "Results saved in: $RESULTS_DIR/"
echo ""
echo "Next Steps:"
echo "1. Review logs in $RESULTS_DIR/"
echo "2. Read COMPREHENSIVE_GAP_ANALYSIS.md (generated next)"
echo "3. Start implementation based on documented gaps"
echo "═══════════════════════════════════════════════════════════════"

# Generate gap analysis (will be created by separate script)
echo ""
echo "📝 Generating comprehensive gap analysis..."
echo "   (Run: node scripts/generate-gap-analysis.js)"
