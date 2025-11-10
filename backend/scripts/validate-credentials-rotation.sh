#!/bin/bash
# Credentials Rotation Validation Script
# Run this AFTER completing credential rotation

set -e

echo "🔐 Validating Credentials Rotation..."
echo "========================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${RED}❌ FAIL: .env file not found${NC}"
    exit 1
fi

# Check if .env is NOT in git
if git ls-files --error-unmatch .env 2>/dev/null; then
    echo -e "${RED}❌ FAIL: .env is still tracked in git${NC}"
    exit 1
else
    echo -e "${GREEN}✅ PASS: .env not tracked in git${NC}"
fi

# Check if .env.backup exists
if [ ! -f .env.backup ]; then
    echo -e "${YELLOW}⚠️  WARN: .env.backup not found (rollback not possible)${NC}"
else
    echo -e "${GREEN}✅ PASS: .env.backup exists${NC}"
fi

# Check if all required variables are present
echo ""
echo "Checking required environment variables..."

REQUIRED_VARS=(
    "SUPABASE_SERVICE_ROLE_KEY"
    "PINATA_API_KEY"
    "PINATA_SECRET_KEY"
    "HELIUS_RPC_URL"
    "BACKEND_AUTHORITY_PRIVATE_KEY"
    "DATABASE_URL"
)

for var in "${REQUIRED_VARS[@]}"; do
    if grep -q "^${var}=" .env; then
        value=$(grep "^${var}=" .env | cut -d '=' -f2-)
        if [ -z "$value" ] || [ "$value" = "your-*" ] || [ "$value" = "<new-*" ]; then
            echo -e "${RED}❌ FAIL: ${var} is empty or placeholder${NC}"
        else
            echo -e "${GREEN}✅ PASS: ${var} is set${NC}"
        fi
    else
        echo -e "${RED}❌ FAIL: ${var} not found in .env${NC}"
    fi
done

# Check PM2 services
echo ""
echo "Checking PM2 services..."

if ! command -v pm2 &> /dev/null; then
    echo -e "${RED}❌ FAIL: PM2 not installed${NC}"
    exit 1
fi

SERVICES=("api-gateway" "event-indexer" "ipfs-service" "market-monitor" "vote-aggregator")

for service in "${SERVICES[@]}"; do
    if pm2 list | grep -q "$service.*online"; then
        echo -e "${GREEN}✅ PASS: ${service} is online${NC}"
    else
        echo -e "${RED}❌ FAIL: ${service} is not online${NC}"
    fi
done

# Check for auth errors in logs
echo ""
echo "Checking logs for auth errors..."

AUTH_ERRORS=$(pm2 logs --lines 50 --nostream 2>&1 | grep -i "unauthorized\|forbidden\|invalid.*key\|authentication.*failed" || true)

if [ -z "$AUTH_ERRORS" ]; then
    echo -e "${GREEN}✅ PASS: No auth errors in recent logs${NC}"
else
    echo -e "${RED}❌ FAIL: Auth errors found in logs:${NC}"
    echo "$AUTH_ERRORS"
fi

# Test API endpoints
echo ""
echo "Testing API endpoints..."

# Health check
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health)
if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅ PASS: API health check (200)${NC}"
else
    echo -e "${RED}❌ FAIL: API health check (HTTP $HTTP_CODE)${NC}"
fi

# Markets endpoint
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/markets)
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "404" ]; then
    echo -e "${GREEN}✅ PASS: Markets endpoint (HTTP $HTTP_CODE)${NC}"
else
    echo -e "${RED}❌ FAIL: Markets endpoint (HTTP $HTTP_CODE)${NC}"
fi

# Vote aggregator stats
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/stats)
if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅ PASS: Vote aggregator stats (HTTP $HTTP_CODE)${NC}"
else
    echo -e "${YELLOW}⚠️  WARN: Vote aggregator stats (HTTP $HTTP_CODE)${NC}"
fi

# Summary
echo ""
echo "========================================"
echo "🔐 Validation Complete"
echo "========================================"
echo ""
echo "Next steps:"
echo "1. Run integration tests: npm run test:integration"
echo "2. Revoke old credentials in dashboards"
echo "3. Document new credentials in secure location"
echo "4. Install pre-commit hook"
echo ""
