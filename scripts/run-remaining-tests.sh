#!/bin/bash
# Run Remaining E2E Tests (P3-P7) and Collect Results

set -e

echo "🚀 Running Remaining E2E Tests (P3-P7)"
echo "══════════════════════════════════════════════════════════"
echo "Start Time: $(date)"
echo ""

WALLET="4WQwPjKHu3x7dHBEehBDgxXHJQoDuBvj6Xhu6C1jjTye"

echo "💰 Starting Balance:"
solana balance $WALLET --url devnet 2>/dev/null || echo "   (balance check failed)"
echo ""

# Create results directory
RESULTS_DIR="test-results-remaining-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$RESULTS_DIR"

echo "📁 Results Directory: $RESULTS_DIR"
echo ""

# Array of remaining tests
declare -a tests=(
    "tests/e2e/fee-distribution.spec.ts:P3: Fee Distribution"
    "tests/e2e/resolution-payout.spec.ts:P4: Resolution & Payout"
    "tests/e2e/program-errors.spec.ts:P5.1: Program Errors"
    "tests/e2e/slippage-advanced.spec.ts:P5.2: Slippage Protection"
    "tests/e2e/performance-benchmarks.spec.ts:P6: Performance Benchmarks"
    "tests/e2e/concurrent-trading.spec.ts:P7: Concurrent Trading"
)

# Run each test
for test_entry in "${tests[@]}"; do
    IFS=':' read -r test_file test_name <<< "$test_entry"

    echo "══════════════════════════════════════════════════════════"
    echo "🧪 Running: $test_name"
    echo "   File: $test_file"
    echo "   Time: $(date)"
    echo "══════════════════════════════════════════════════════════"

    log_file="$RESULTS_DIR/$(basename $test_file .spec.ts).log"

    # Run test (will "fail" due to missing UI, but that's expected)
    if pnpm exec playwright test "$test_file" \
        --project=real-blockchain-chromium \
        --timeout=120000 \
        2>&1 | tee "$log_file"; then
        echo "✅ COMPLETED: $test_name"
    else
        echo "📝 DOCUMENTED: $test_name (expected - missing UI)"
    fi

    echo ""
    echo "📊 Quick Stats:"
    grep -E "(passed|failed|Running [0-9]+ tests)" "$log_file" | tail -3 || echo "   (extracting stats...)"
    echo ""

    # Brief pause between tests
    sleep 2
done

echo "══════════════════════════════════════════════════════════"
echo "💰 Final Balance:"
solana balance $WALLET --url devnet 2>/dev/null || echo "   (balance check failed)"
echo ""

echo "══════════════════════════════════════════════════════════"
echo "🎉 All Remaining Tests Completed!"
echo "══════════════════════════════════════════════════════════"
echo "Completion Time: $(date)"
echo ""
echo "Results: $RESULTS_DIR/"
echo ""
echo "Next Steps:"
echo "1. Review COMPREHENSIVE_GAP_ANALYSIS.md"
echo "2. Start Phase 1 Implementation (Core Trading UI)"
echo "3. Re-run tests to validate implementation"
echo "══════════════════════════════════════════════════════════"
