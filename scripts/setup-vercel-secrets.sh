#!/bin/bash

# Script to set up GitHub secrets for Vercel deployment
# Run this after obtaining the Vercel token from https://vercel.com/account/tokens

set -e

REPO="0xBased-lang/zmartV0.69"
VERCEL_ORG_ID="team_zqPDYGyB2bI1MwE8G5zfVOGB"
VERCEL_PROJECT_ID="prj_lBiJDg677PFu6ZLthbQ3GJENjrKJ"

echo "🔐 Setting up GitHub Secrets for Vercel Deployment"
echo "=================================================="
echo ""

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) not installed. Please install it first:"
    echo "   brew install gh (macOS)"
    echo "   https://cli.github.com/ (other platforms)"
    exit 1
fi

echo "📍 Repository: $REPO"
echo ""

# Prompt for Vercel token
echo "🔑 VERCEL_TOKEN Setup"
echo "-------------------"
echo "⚠️  You need a Vercel API token to proceed."
echo ""
echo "Steps to get your token:"
echo "  1. Open: https://vercel.com/account/tokens"
echo "  2. Click 'Create' button"
echo "  3. Name: 'GitHub Actions Deployment'"
echo "  4. Select: 'Full Access'"
echo "  5. Click 'Create'"
echo "  6. Copy the token (shown only once)"
echo ""
read -sp "Paste your Vercel token here: " VERCEL_TOKEN
echo ""

if [ -z "$VERCEL_TOKEN" ]; then
    echo "❌ Error: Token cannot be empty"
    exit 1
fi

# Set VERCEL_TOKEN
echo "📝 Setting VERCEL_TOKEN..."
echo "$VERCEL_TOKEN" | gh secret set VERCEL_TOKEN --repo "$REPO"
echo "✅ VERCEL_TOKEN set"

# Set VERCEL_ORG_ID
echo "📝 Setting VERCEL_ORG_ID..."
gh secret set VERCEL_ORG_ID --repo "$REPO" --body "$VERCEL_ORG_ID"
echo "✅ VERCEL_ORG_ID set"

# Set VERCEL_PROJECT_ID
echo "📝 Setting VERCEL_PROJECT_ID..."
gh secret set VERCEL_PROJECT_ID --repo "$REPO" --body "$VERCEL_PROJECT_ID"
echo "✅ VERCEL_PROJECT_ID set"

echo ""
echo "✨ Verification"
echo "==============="
gh secret list --repo "$REPO"

echo ""
echo "✅ All secrets configured!"
echo ""
echo "Next steps:"
echo "  1. Deploy: gh workflow run deploy-vercel.yml --repo $REPO"
echo "  2. Monitor: gh run list --repo $REPO -w deploy-vercel.yml"
echo "  3. View logs: gh run view <run-number> --repo $REPO --log"
