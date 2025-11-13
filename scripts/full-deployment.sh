#!/bin/bash

# Master deployment script - orchestrates entire Vercel + DNS setup
# Run this script to deploy tinfoil-terminal.xyz step by step

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "╔════════════════════════════════════════════════════════════╗"
echo "║     ZMART VERCEL DEPLOYMENT & DNS SETUP ORCHESTRATOR      ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check prerequisites
check_prerequisites() {
    echo -e "${BLUE}🔍 Checking prerequisites...${NC}"
    echo ""

    local MISSING=0

    # Check git
    if ! command -v git &> /dev/null; then
        echo -e "${RED}❌ git not installed${NC}"
        MISSING=1
    else
        echo -e "${GREEN}✅ git${NC}"
    fi

    # Check gh
    if ! command -v gh &> /dev/null; then
        echo -e "${RED}❌ GitHub CLI (gh) not installed${NC}"
        echo "   Install: brew install gh (macOS) or https://cli.github.com/"
        MISSING=1
    else
        echo -e "${GREEN}✅ GitHub CLI (gh)${NC}"
    fi

    # Check pnpm
    if ! command -v pnpm &> /dev/null; then
        echo -e "${RED}❌ pnpm not installed${NC}"
        MISSING=1
    else
        echo -e "${GREEN}✅ pnpm${NC}"
    fi

    # Check dig
    if ! command -v dig &> /dev/null; then
        echo -e "${YELLOW}⚠️  dig not installed (optional, for verification)${NC}"
    else
        echo -e "${GREEN}✅ dig${NC}"
    fi

    echo ""

    if [ $MISSING -eq 1 ]; then
        echo -e "${RED}❌ Please install missing tools and try again${NC}"
        exit 1
    fi

    echo -e "${GREEN}✅ All prerequisites met${NC}"
    echo ""
}

# Step 1: Setup GitHub Secrets
step_1_setup_secrets() {
    echo ""
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║ STEP 1: Setup GitHub Secrets for Vercel Deployment       ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo ""
    echo "This step requires:"
    echo "  - Vercel API token (from https://vercel.com/account/tokens)"
    echo "  - GitHub CLI authenticated (gh auth status)"
    echo ""

    read -p "Continue with STEP 1? (y/n): " -n 1 -r
    echo ""

    if [[ $REPLY =~ ^[Yy]$ ]]; then
        "$SCRIPT_DIR/setup-vercel-secrets.sh"
        echo ""
        echo -e "${GREEN}✅ STEP 1 Complete: GitHub secrets configured${NC}"
    else
        echo "Skipping STEP 1..."
    fi

    echo ""
}

# Step 2: Deploy to Vercel
step_2_deploy_vercel() {
    echo ""
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║ STEP 2: Deploy Frontend to Vercel                         ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo ""

    read -p "Continue with STEP 2? (y/n): " -n 1 -r
    echo ""

    if [[ $REPLY =~ ^[Yy]$ ]]; then
        "$SCRIPT_DIR/deploy-to-vercel.sh"
        echo ""
        echo -e "${GREEN}✅ STEP 2 Complete: Deployment triggered${NC}"
        echo ""
        echo "⏳ Wait for deployment to complete before proceeding..."
        read -p "Press Enter when deployment is finished: "
    else
        echo "Skipping STEP 2..."
    fi

    echo ""
}

# Step 3: Setup Cloudflare DNS
step_3_setup_dns() {
    echo ""
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║ STEP 3: Configure Cloudflare DNS Records                  ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo ""
    echo "This step requires:"
    echo "  - Vercel IP address (from deployment)"
    echo "  - Cloudflare API token (from https://dash.cloudflare.com/)"
    echo ""

    read -p "Continue with STEP 3? (y/n): " -n 1 -r
    echo ""

    if [[ $REPLY =~ ^[Yy]$ ]]; then
        "$SCRIPT_DIR/setup-cloudflare-dns.sh"
        echo ""
        echo -e "${GREEN}✅ STEP 3 Complete: DNS records configured${NC}"
    else
        echo "Skipping STEP 3..."
    fi

    echo ""
}

# Step 4: Verify DNS & SSL
step_4_verify() {
    echo ""
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║ STEP 4: Verify DNS & SSL Configuration                    ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo ""

    read -p "Continue with STEP 4? (y/n): " -n 1 -r
    echo ""

    if [[ $REPLY =~ ^[Yy]$ ]]; then
        "$SCRIPT_DIR/verify-dns.sh"
        echo ""
        echo -e "${GREEN}✅ STEP 4 Complete: Verification finished${NC}"
    else
        echo "Skipping STEP 4..."
    fi

    echo ""
}

# Step 5: Final Testing
step_5_test() {
    echo ""
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║ STEP 5: Final Production Testing                          ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo ""

    DOMAIN="tinfoil-terminal.xyz"

    read -p "Continue with STEP 5 testing? (y/n): " -n 1 -r
    echo ""

    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${BLUE}Testing production endpoints...${NC}"
        echo ""

        # Test homepage
        echo "1️⃣  Testing homepage..."
        if curl -s -o /dev/null -w "%{http_code}" "https://$DOMAIN" | grep -q "200"; then
            echo -e "   ${GREEN}✅ Homepage loads (200 OK)${NC}"
        else
            echo -e "   ${RED}❌ Homepage not responding${NC}"
        fi

        # Test API proxy
        echo "2️⃣  Testing API proxy..."
        API_RESPONSE=$(curl -s -w "%{http_code}" -o /tmp/api_response "https://$DOMAIN/api/proxy/api/health" 2>/dev/null || echo "000")

        if [ "$API_RESPONSE" = "200" ]; then
            echo -e "   ${GREEN}✅ API proxy working${NC}"
        else
            echo -e "   ${YELLOW}⚠️  API proxy returned: $API_RESPONSE${NC}"
        fi

        # Test Solana RPC
        echo "3️⃣  Testing Solana RPC..."
        if grep -q "devnet.helius-rpc.com" /tmp/api_response 2>/dev/null; then
            echo -e "   ${GREEN}✅ Helius RPC configured${NC}"
        else
            echo -e "   ${YELLOW}⚠️  Helius RPC status unknown${NC}"
        fi

        echo ""
        echo -e "${GREEN}✅ STEP 5 Complete: Production testing finished${NC}"
    else
        echo "Skipping STEP 5..."
    fi

    echo ""
}

# Main execution
main() {
    check_prerequisites
    step_1_setup_secrets
    step_2_deploy_vercel
    step_3_setup_dns
    step_4_verify
    step_5_test

    echo ""
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║                    🎉 DEPLOYMENT COMPLETE 🎉              ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo ""
    echo "Your site is now live at:"
    echo -e "  ${GREEN}https://tinfoil-terminal.xyz${NC}"
    echo ""
    echo "Quick commands:"
    echo "  • View logs: gh run list --repo 0xBased-lang/zmartV0.69 -w deploy-vercel.yml"
    echo "  • Test site: curl -I https://tinfoil-terminal.xyz"
    echo "  • View metrics: https://vercel.com/kektech1/frontend/analytics"
    echo ""
}

# Run main function
main
