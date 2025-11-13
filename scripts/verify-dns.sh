#!/bin/bash

# Script to verify DNS configuration and SSL certificate
# Run this after adding DNS records and waiting 5-15 minutes

DOMAIN="tinfoil-terminal.xyz"

echo "✅ DNS & SSL Verification"
echo "========================="
echo ""
echo "Domain: $DOMAIN"
echo ""

# Check if dig is available
if ! command -v dig &> /dev/null; then
    echo "⚠️  'dig' command not found. Installing dnsutils..."
    # For macOS
    if [ "$(uname)" = "Darwin" ]; then
        echo "Please install: brew install bind"
        echo "Then run this script again"
        exit 1
    fi
fi

# Check DNS propagation
echo "🔍 Checking DNS Configuration"
echo "-----------------------------"
echo ""

# Check apex A record
echo "1️⃣  Checking apex domain A record..."
APEX_RESULT=$(dig "$DOMAIN" @1.1.1.1 +short A 2>/dev/null || echo "")

if [ -z "$APEX_RESULT" ]; then
    echo "   ⏳ No A record found yet. DNS still propagating..."
    echo "   Retrying in 30 seconds..."
    sleep 30
    APEX_RESULT=$(dig "$DOMAIN" @1.1.1.1 +short A)
fi

if [ -n "$APEX_RESULT" ]; then
    echo "   ✅ A record found: $APEX_RESULT"
else
    echo "   ❌ A record not found. Check DNS configuration."
fi

echo ""

# Check www CNAME record
echo "2️⃣  Checking www subdomain CNAME record..."
WWW_RESULT=$(dig www."$DOMAIN" @1.1.1.1 +short CNAME 2>/dev/null || echo "")

if [ -z "$WWW_RESULT" ]; then
    echo "   ⏳ No CNAME record found yet. DNS still propagating..."
else
    echo "   ✅ CNAME record found: $WWW_RESULT"
fi

echo ""

# Check SSL certificate
echo "🔐 Checking SSL Certificate"
echo "---------------------------"
echo ""

echo "3️⃣  Checking HTTPS connectivity..."

if curl -I -s -o /dev/null -w "%{http_code}" "https://$DOMAIN" 2>/dev/null | grep -q "200\|301\|302"; then
    echo "   ✅ HTTPS is working!"

    echo ""
    echo "   Certificate details:"
    echo ""

    # Get SSL cert info
    echo | openssl s_client -servername "$DOMAIN" -connect "$DOMAIN:443" 2>/dev/null | \
        openssl x509 -noout -text 2>/dev/null | \
        grep -E "Subject:|Issuer:|Not Before:|Not After:" || echo "   (Could not retrieve cert details)"
else
    echo "   ⏳ HTTPS not yet available. SSL certificate still provisioning..."
    echo "   Wait 5-10 minutes and try again."
fi

echo ""

# Test domain resolution from multiple DNS servers
echo "🌍 Global DNS Resolution Test"
echo "-----------------------------"
echo ""

DNS_SERVERS=(
    "8.8.8.8:Google DNS"
    "1.1.1.1:Cloudflare DNS"
    "208.67.222.222:OpenDNS"
)

for SERVER_PAIR in "${DNS_SERVERS[@]}"; do
    IFS=':' read -r SERVER NAME <<< "$SERVER_PAIR"
    RESULT=$(dig "$DOMAIN" "@$SERVER" +short A 2>/dev/null || echo "")

    if [ -n "$RESULT" ]; then
        echo "✅ $NAME: $RESULT"
    else
        echo "⏳ $NAME: Propagating..."
    fi
done

echo ""
echo "📊 Summary"
echo "=========="
echo ""

# Final verification
if [ -n "$APEX_RESULT" ]; then
    echo "✅ DNS is configured correctly"
    echo "✅ Domain resolves to: $APEX_RESULT"

    if curl -I -s -o /dev/null -w "%{http_code}" "https://$DOMAIN" 2>/dev/null | grep -q "200\|301\|302"; then
        echo "✅ HTTPS is working"
        echo "✅ Everything is ready!"
    else
        echo "⏳ HTTPS still provisioning (wait 5-10 minutes)"
    fi
else
    echo "⏳ Still propagating. Check back in 5-15 minutes"
fi

echo ""
echo "Test your site:"
echo "  Browser: https://$DOMAIN"
echo "  cURL: curl -I https://$DOMAIN"
echo "  API Proxy: curl https://$DOMAIN/api/proxy/api/health"
echo ""
