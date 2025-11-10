#!/bin/bash
# ZMART V0.69 - Comprehensive Health Check
# Usage: ./scripts/health-check.sh

set -e  # Exit on error

echo "======================================"
echo "ZMART V0.69 - Health Check"
echo "======================================"
echo ""

# Configuration
VPS_HOST="kek"
VPS_IP="185.202.236.71"
SUPABASE_URL="https://tkkqqxepelibqjjhxxct.supabase.co"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to check service health
check_service() {
  local name=$1
  local url=$2
  local expected=$3

  echo -ne "${YELLOW}Checking $name...${NC} "
  response=$(curl -s --max-time 5 "$url" 2>&1 || echo "ERROR")

  if [[ "$response" == *"$expected"* ]]; then
    echo -e "${GREEN}✅ Healthy${NC}"
    return 0
  else
    echo -e "${RED}❌ Failed${NC}"
    echo "  Response: $response"
    return 1
  fi
}

# Function to check PM2 service
check_pm2_service() {
  local name=$1
  local location=$2

  echo -ne "${YELLOW}Checking PM2 $name ($location)...${NC} "

  if [[ "$location" == "local" ]]; then
    status=$(pm2 jlist | jq -r ".[] | select(.name==\"$name\") | .pm2_env.status" 2>/dev/null || echo "offline")
  else
    status=$(ssh $VPS_HOST "pm2 jlist | jq -r '.[] | select(.name==\"$name\") | .pm2_env.status'" 2>/dev/null || echo "offline")
  fi

  if [[ "$status" == "online" ]]; then
    echo -e "${GREEN}✅ Online${NC}"
    return 0
  else
    echo -e "${RED}❌ $status${NC}"
    return 1
  fi
}

total_checks=0
passed_checks=0

# ===================================
# LOCAL SERVICES
# ===================================
echo -e "${BLUE}=== LOCAL SERVICES ===${NC}"

# Check if local PM2 is running
if command -v pm2 &> /dev/null; then
  echo ""
  echo "PM2 Status:"
  pm2 list 2>/dev/null || echo "  No PM2 processes running locally"
  echo ""

  # Check local services
  services=("api-gateway" "websocket-server" "vote-aggregator" "market-monitor" "event-indexer")
  for service in "${services[@]}"; do
    if check_pm2_service "$service" "local"; then
      ((passed_checks++))
    fi
    ((total_checks++))
  done
else
  echo "  PM2 not installed or not in PATH"
fi

echo ""

# ===================================
# VPS SERVICES
# ===================================
echo -e "${BLUE}=== VPS SERVICES ===${NC}"

# Check VPS connection
echo -ne "${YELLOW}Checking VPS connection...${NC} "
if ssh -q $VPS_HOST exit 2>/dev/null; then
  echo -e "${GREEN}✅ Connected${NC}"
  ((passed_checks++))
else
  echo -e "${RED}❌ Connection failed${NC}"
fi
((total_checks++))

echo ""
echo "PM2 Status on VPS:"
ssh $VPS_HOST "pm2 list" 2>/dev/null || echo "  Cannot retrieve PM2 status"
echo ""

# Check VPS services
services=("api-gateway" "websocket-server" "vote-aggregator" "market-monitor" "event-indexer")
for service in "${services[@]}"; do
  if check_pm2_service "$service" "vps"; then
    ((passed_checks++))
  fi
  ((total_checks++))
done

echo ""

# ===================================
# HTTP ENDPOINTS
# ===================================
echo -e "${BLUE}=== HTTP ENDPOINTS ===${NC}"

# Local API Gateway (if running)
if check_service "Local API Gateway" "http://localhost:4000/health" "healthy"; then
  ((passed_checks++))
fi
((total_checks++))

# VPS API Gateway
if check_service "VPS API Gateway" "http://$VPS_IP:4000/health" "healthy"; then
  ((passed_checks++))
fi
((total_checks++))

# VPS Event Indexer
if check_service "VPS Event Indexer" "http://$VPS_IP:4002/health" "healthy"; then
  ((passed_checks++))
fi
((total_checks++))

echo ""

# ===================================
# DATABASE
# ===================================
echo -e "${BLUE}=== DATABASE ===${NC}"

# Supabase API
if check_service "Supabase API" "$SUPABASE_URL/rest/v1/markets?limit=1" "market_id"; then
  ((passed_checks++))
fi
((total_checks++))

# Database query performance
echo -ne "${YELLOW}Checking database latency...${NC} "
start_time=$(date +%s%3N)
curl -s "$SUPABASE_URL/rest/v1/markets?limit=1" -H "apikey: ${SUPABASE_ANON_KEY:-dummy}" > /dev/null 2>&1
end_time=$(date +%s%3N)
latency=$((end_time - start_time))

if [[ $latency -lt 200 ]]; then
  echo -e "${GREEN}✅ ${latency}ms (excellent)${NC}"
  ((passed_checks++))
elif [[ $latency -lt 500 ]]; then
  echo -e "${YELLOW}⚠️  ${latency}ms (acceptable)${NC}"
  ((passed_checks++))
else
  echo -e "${RED}❌ ${latency}ms (slow)${NC}"
fi
((total_checks++))

echo ""

# ===================================
# BLOCKCHAIN
# ===================================
echo -e "${BLUE}=== BLOCKCHAIN ===${NC}"

# Solana RPC (Devnet)
echo -ne "${YELLOW}Checking Solana Devnet...${NC} "
solana_response=$(curl -s https://api.devnet.solana.com -X POST -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}' || echo "ERROR")

if [[ "$solana_response" == *"ok"* ]]; then
  echo -e "${GREEN}✅ Healthy${NC}"
  ((passed_checks++))
else
  echo -e "${RED}❌ Failed${NC}"
  echo "  Response: $solana_response"
fi
((total_checks++))

# Helius RPC (if configured)
if [[ -n "${HELIUS_API_KEY}" ]]; then
  echo -ne "${YELLOW}Checking Helius RPC...${NC} "
  helius_response=$(curl -s "https://devnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}" -X POST -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}' || echo "ERROR")

  if [[ "$helius_response" == *"ok"* ]]; then
    echo -e "${GREEN}✅ Healthy${NC}"
    ((passed_checks++))
  else
    echo -e "${RED}❌ Failed${NC}"
  fi
  ((total_checks++))
fi

echo ""

# ===================================
# SUMMARY
# ===================================
echo "======================================"
echo -e "${BLUE}HEALTH CHECK SUMMARY${NC}"
echo "======================================"

success_rate=$((passed_checks * 100 / total_checks))

if [[ $success_rate -ge 90 ]]; then
  echo -e "${GREEN}✅ System Healthy: $passed_checks/$total_checks checks passed ($success_rate%)${NC}"
  exit 0
elif [[ $success_rate -ge 70 ]]; then
  echo -e "${YELLOW}⚠️  System Degraded: $passed_checks/$total_checks checks passed ($success_rate%)${NC}"
  exit 1
else
  echo -e "${RED}❌ System Critical: $passed_checks/$total_checks checks passed ($success_rate%)${NC}"
  exit 2
fi
