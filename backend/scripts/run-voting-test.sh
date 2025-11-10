#!/bin/bash

# Run comprehensive voting system test with full documentation
# This script executes the on-chain test and saves all results

set -e

echo "================================================================================"
echo "ZMART V0.69 - COMPREHENSIVE VOTING SYSTEM TEST"
echo "================================================================================"
echo ""
echo "This test will:"
echo "  1. Initialize GlobalConfig (if needed)"
echo "  2. Create a test market"
echo "  3. Submit 10 proposal votes (7 like, 3 dislike)"
echo "  4. Aggregate votes"
echo "  5. Verify market state = APPROVED"
echo ""
echo "All transactions will be documented in detail."
echo ""

# Check Solana CLI
if ! command -v solana &> /dev/null; then
    echo "❌ Error: Solana CLI not found. Please install it first."
    exit 1
fi

# Check network configuration
echo "Checking Solana configuration..."
solana config get

echo ""
echo "Checking devnet balance..."
BALANCE=$(solana balance --url devnet)
echo "Balance: $BALANCE"

if (( $(echo "$BALANCE < 1" | bc -l) )); then
    echo "⚠️  Warning: Low balance. Requesting airdrop..."
    solana airdrop 2 --url devnet
    sleep 5
fi

echo ""
echo "================================================================================"
echo "RUNNING TEST"
echo "================================================================================"
echo ""

# Change to project root
cd "$(dirname "$0")/../.."

# Run the test using Anchor test framework
echo "Compiling TypeScript test..."
npx ts-node backend/scripts/on-chain-test-voting-system.ts

echo ""
echo "================================================================================"
echo "TEST COMPLETE"
echo "================================================================================"
echo ""
echo "Check docs/on-chain-testing/03-TEST-RESULTS/ for detailed results"
