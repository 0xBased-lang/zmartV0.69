#!/bin/bash

# Script to deploy frontend to Vercel via GitHub Actions
# Requires GitHub secrets to be configured first

set -e

REPO="0xBased-lang/zmartV0.69"
WORKFLOW="deploy-vercel.yml"

echo "🚀 Deploying to Vercel"
echo "====================="
echo ""

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) not installed"
    exit 1
fi

# Verify secrets are set
echo "🔍 Checking GitHub secrets..."
echo ""

SECRETS=$(gh secret list --repo "$REPO")

if ! echo "$SECRETS" | grep -q "VERCEL_TOKEN"; then
    echo "❌ Error: VERCEL_TOKEN not set"
    echo "   Run: ./scripts/setup-vercel-secrets.sh"
    exit 1
fi

if ! echo "$SECRETS" | grep -q "VERCEL_ORG_ID"; then
    echo "❌ Error: VERCEL_ORG_ID not set"
    echo "   Run: ./scripts/setup-vercel-secrets.sh"
    exit 1
fi

if ! echo "$SECRETS" | grep -q "VERCEL_PROJECT_ID"; then
    echo "❌ Error: VERCEL_PROJECT_ID not set"
    echo "   Run: ./scripts/setup-vercel-secrets.sh"
    exit 1
fi

echo "✅ All required secrets are configured"
echo ""

# Option 1: Trigger workflow manually
echo "📋 Deployment Options:"
echo "  1. Trigger workflow manually (faster)"
echo "  2. Push to main branch (also triggers workflow)"
echo ""
read -p "Choose option (1 or 2): " OPTION

case $OPTION in
  1)
    echo ""
    echo "🔄 Triggering deploy-vercel.yml workflow..."
    gh workflow run "$WORKFLOW" --repo "$REPO"
    echo "✅ Workflow triggered!"
    ;;
  2)
    echo ""
    echo "📤 Pushing to main branch..."
    git push origin main
    echo "✅ Pushed! GitHub Actions will deploy automatically."
    ;;
  *)
    echo "❌ Invalid option"
    exit 1
    ;;
esac

echo ""
echo "📊 Monitoring Deployment"
echo "========================"
echo ""
echo "View workflow runs:"
echo "  gh run list --repo $REPO -w $WORKFLOW"
echo ""
echo "View specific run logs:"
echo "  gh run view <run-number> --repo $REPO --log"
echo ""
echo "Watch in real-time (requires 'gh' extension):"
echo "  gh run watch --repo $REPO"
echo ""

# Offer to monitor
read -p "Would you like to monitor the deployment now? (y/n): " MONITOR

if [ "$MONITOR" = "y" ] || [ "$MONITOR" = "Y" ]; then
    echo ""
    echo "🔍 Fetching latest workflow run..."
    sleep 2

    RUN=$(gh run list --repo "$REPO" -w "$WORKFLOW" --json databaseId --jq '.[0].databaseId' 2>/dev/null || echo "")

    if [ -z "$RUN" ]; then
        echo "⏳ Workflow starting... Check back in a moment:"
        echo "   gh run list --repo $REPO -w $WORKFLOW"
    else
        echo "📋 Workflow Run: $RUN"
        echo ""
        echo "Checking status..."
        gh run view "$RUN" --repo "$REPO" --json status,conclusion --jq '.[] | "\(.status) - \(.conclusion)"' || true
    fi
fi
