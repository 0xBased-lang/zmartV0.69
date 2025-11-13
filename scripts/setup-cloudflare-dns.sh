#!/bin/bash

# Script to configure Cloudflare DNS records for tinfoil-terminal.xyz
# Requires Vercel deployment to be successful first

set -e

DOMAIN="tinfoil-terminal.xyz"
VERCEL_ORG="kektech1"
VERCEL_PROJECT="frontend"

echo "🌐 Cloudflare DNS Configuration"
echo "================================"
echo ""
echo "Domain: $DOMAIN"
echo ""

# Check if wrangler is available
if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm not installed"
    exit 1
fi

echo "📋 Setup Steps:"
echo "==============="
echo ""
echo "STEP 1: Get Vercel IP Address"
echo "-----------------------------"
echo "1. Open: https://vercel.com/$VERCEL_ORG/$VERCEL_PROJECT/settings/domains"
echo "2. Click on: $DOMAIN"
echo "3. Look for the IP address in 'DNS Configuration'"
echo "4. Copy the IP address (format: 76.76.19.xxx)"
echo ""
read -p "Paste the Vercel IP address: " VERCEL_IP

if [ -z "$VERCEL_IP" ]; then
    echo "❌ Error: IP cannot be empty"
    exit 1
fi

echo ""
echo "✅ Vercel IP: $VERCEL_IP"
echo ""

# Check for Cloudflare token
echo "STEP 2: Cloudflare Authentication"
echo "---------------------------------"

if [ -z "$CLOUDFLARE_API_TOKEN" ]; then
    echo "⚠️  CLOUDFLARE_API_TOKEN not set in environment"
    echo ""
    echo "To get your Cloudflare API token:"
    echo "  1. Login: https://dash.cloudflare.com/"
    echo "  2. Go to: My Profile → API Tokens"
    echo "  3. Click: 'Create Token'"
    echo "  4. Use template: 'Edit zone DNS'"
    echo "  5. Copy the token"
    echo ""
    read -sp "Paste your Cloudflare API token: " CLOUDFLARE_API_TOKEN
    echo ""
fi

export CLOUDFLARE_API_TOKEN

if [ -z "$CLOUDFLARE_API_TOKEN" ]; then
    echo "❌ Error: Cloudflare token cannot be empty"
    exit 1
fi

echo "✅ Cloudflare token configured"
echo ""

# Add DNS records
echo "STEP 3: Adding DNS Records"
echo "--------------------------"
echo ""

echo "📝 Adding A record for apex domain..."
pnpm dlx wrangler dns records create "$DOMAIN" \
  --type A \
  --name @ \
  --content "$VERCEL_IP" \
  --proxied false

if [ $? -eq 0 ]; then
    echo "✅ A record created: @ → $VERCEL_IP"
else
    echo "⚠️  A record may already exist (that's OK)"
fi

echo ""
echo "📝 Adding CNAME record for www..."
pnpm dlx wrangler dns records create "$DOMAIN" \
  --type CNAME \
  --name www \
  --content cname.vercel-dns.com \
  --proxied false

if [ $? -eq 0 ]; then
    echo "✅ CNAME record created: www → cname.vercel-dns.com"
else
    echo "⚠️  CNAME record may already exist (that's OK)"
fi

echo ""
echo "✨ DNS Configuration Complete"
echo "============================="
echo ""
echo "Next steps:"
echo "  1. Wait 5-15 minutes for DNS propagation"
echo "  2. Verify DNS: ./scripts/verify-dns.sh"
echo "  3. Check SSL: curl -I https://$DOMAIN"
echo ""
