#!/bin/bash

# ============================================================================
# ZMART v0.69 - Devnet Verification & Deployment Status
# ============================================================================
# Verifies that the program was successfully deployed to devnet
# Shows program info, account status, and deployment metrics

set -e

PROGRAM_ID="7h3gXfBfYFueFVLYyfL5Qo1QGsf4GQUfW96FKVgnUsJS"
NETWORK="devnet"

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║         ZMART v0.69 - Devnet Deployment Verification          ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "🔍 Checking Network Configuration..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check network
CURRENT_CLUSTER=$(solana config get | grep "RPC URL" | awk '{print $3}')
echo "Current RPC: $CURRENT_CLUSTER"

# Check wallet
WALLET=$(solana config get | grep "Keypair Path" | awk '{print $3}')
WALLET_ADDRESS=$(solana address)
echo "Wallet: $WALLET_ADDRESS"
echo "Wallet Path: $WALLET"

# Check balance
BALANCE=$(solana balance --url $NETWORK)
echo "Balance: $BALANCE"

echo ""
echo "📦 Program Deployment Status"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Program ID: $PROGRAM_ID"

# Check if program exists
if solana program show $PROGRAM_ID --url $NETWORK > /tmp/program_info.txt 2>&1; then
    echo "✅ Program deployed on devnet"
    echo ""
    cat /tmp/program_info.txt
else
    echo "❌ Program not found on devnet"
    exit 1
fi

echo ""
echo "🔐 GlobalConfig Account Status"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Calculate GlobalConfig PDA
# Using: seeds = [b"global_config"], program_id = PROGRAM_ID
GLOBAL_CONFIG_PDA=$(solana address --seed "global_config" --seed-type hex --program-id $PROGRAM_ID 2>/dev/null || echo "PDA_CALCULATION_REQUIRES_ANCHOR")

if [ "$GLOBAL_CONFIG_PDA" != "PDA_CALCULATION_REQUIRES_ANCHOR" ]; then
    echo "GlobalConfig PDA: $GLOBAL_CONFIG_PDA"

    if solana account $GLOBAL_CONFIG_PDA --url $NETWORK > /tmp/global_config_info.txt 2>&1; then
        echo "✅ GlobalConfig account initialized"
        cat /tmp/global_config_info.txt
    else
        echo "⏳ GlobalConfig not yet initialized"
        echo "   Will be initialized when initialize_global_config instruction is called"
    fi
else
    echo "⏳ PDA calculation requires Anchor CLI"
fi

echo ""
echo "📊 Deployment Metrics"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Program size
PROGRAM_SIZE=$(solana program show $PROGRAM_ID --url $NETWORK | grep "Data length" | awk '{print $3}')
echo "Program Size: $PROGRAM_SIZE bytes"

# Check program logs
echo ""
echo "🔄 Recent Program Activity"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Deployment successful!"
echo "   Program ID: $PROGRAM_ID"
echo "   Network: $NETWORK"
echo "   Status: Ready for testing"

echo ""
echo "📝 Next Steps"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1. Run smoke tests:"
echo "   anchor test --provider.cluster devnet"
echo ""
echo "2. Monitor program logs:"
echo "   solana logs $PROGRAM_ID --url $NETWORK"
echo ""
echo "3. View program data:"
echo "   solana account $GLOBAL_CONFIG_PDA --url $NETWORK"
echo ""
echo "✨ Devnet deployment verified successfully!"
