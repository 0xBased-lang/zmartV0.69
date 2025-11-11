#!/bin/bash
# Setup Test Wallets for Integration Testing
# Creates 3 test wallets and funds them with devnet SOL

set -e

echo "🔧 Setting up test wallets for integration testing..."
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Create wallets directory
WALLET_DIR="$HOME/.config/solana/test-wallets"
mkdir -p "$WALLET_DIR"

echo -e "${BLUE}📁 Creating test wallets in: $WALLET_DIR${NC}"
echo ""

# Function to create and fund wallet
create_and_fund_wallet() {
    local wallet_name=$1
    local wallet_file="$WALLET_DIR/$wallet_name.json"

    echo -e "${YELLOW}Creating $wallet_name...${NC}"

    # Create wallet if it doesn't exist
    if [ ! -f "$wallet_file" ]; then
        solana-keygen new --no-bip39-passphrase -o "$wallet_file" --force
    else
        echo "  ⚠️  Wallet already exists, skipping creation"
    fi

    # Get public key
    local pubkey=$(solana-keygen pubkey "$wallet_file")
    echo -e "  ${GREEN}✓${NC} Public Key: $pubkey"

    # Fund wallet with devnet SOL
    echo "  💰 Funding with 5 SOL..."
    solana airdrop 5 "$pubkey" --url devnet || echo "  ⚠️  Airdrop may have failed (rate limit?)"

    # Check balance
    local balance=$(solana balance "$pubkey" --url devnet 2>/dev/null || echo "0")
    echo -e "  ${GREEN}✓${NC} Balance: $balance"
    echo ""
}

# Create 3 test wallets
create_and_fund_wallet "market-creator"
create_and_fund_wallet "trader-a"
create_and_fund_wallet "trader-b"

echo -e "${GREEN}✅ Test wallet setup complete!${NC}"
echo ""
echo "📝 Wallet Summary:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Display wallet details
for wallet_name in "market-creator" "trader-a" "trader-b"; do
    wallet_file="$WALLET_DIR/$wallet_name.json"
    pubkey=$(solana-keygen pubkey "$wallet_file")
    balance=$(solana balance "$pubkey" --url devnet 2>/dev/null || echo "0 SOL")

    echo -e "${BLUE}$wallet_name:${NC}"
    echo "  File: $wallet_file"
    echo "  Public Key: $pubkey"
    echo "  Balance: $balance"
    echo ""
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🔑 Import to Browser Wallet:"
echo "  1. Open Phantom/Solflare browser extension"
echo "  2. Go to Settings → Add/Import Wallet"
echo "  3. Select 'Import Private Key'"
echo "  4. Paste contents from wallet JSON files above"
echo "  5. Switch network to Devnet"
echo "  6. Verify balances show up"
echo ""
echo "🚀 You're ready for integration testing!"
echo "   See: docs/testing/INTEGRATION_TESTING_GUIDE.md"
