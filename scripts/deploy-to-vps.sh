#!/bin/bash
# ZMART V0.69 - Deploy Backend to VPS
# Usage: ./scripts/deploy-to-vps.sh

set -e  # Exit on error

echo "======================================"
echo "ZMART V0.69 - VPS Deployment"
echo "======================================"
echo ""

# Configuration
VPS_HOST="kek"
VPS_PATH="/var/www/zmart/backend"
BRANCH="main"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Check local changes
echo -e "${YELLOW}[1/6] Checking local repository...${NC}"
if [[ -n $(git status -s) ]]; then
  echo -e "${RED}⚠️  Uncommitted changes detected!${NC}"
  git status -s
  read -p "Commit and push? (y/n) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    git add .
    git commit -m "deploy: $(date +'%Y-%m-%d %H:%M:%S')"
    git push origin $BRANCH
  else
    echo -e "${RED}❌ Deployment cancelled${NC}"
    exit 1
  fi
fi
echo -e "${GREEN}✅ Local repository clean${NC}"
echo ""

# Step 2: Test SSH connection
echo -e "${YELLOW}[2/6] Testing VPS connection...${NC}"
if ! ssh -q $VPS_HOST exit; then
  echo -e "${RED}❌ Cannot connect to VPS${NC}"
  exit 1
fi
echo -e "${GREEN}✅ VPS connection successful${NC}"
echo ""

# Step 3: Pull latest code on VPS
echo -e "${YELLOW}[3/6] Pulling latest code on VPS...${NC}"
ssh $VPS_HOST "cd $VPS_PATH && git fetch origin && git reset --hard origin/$BRANCH"
echo -e "${GREEN}✅ Code updated on VPS${NC}"
echo ""

# Step 4: Install dependencies (if package.json changed)
echo -e "${YELLOW}[4/6] Checking dependencies...${NC}"
LOCAL_PACKAGE_HASH=$(md5sum backend/package.json | awk '{print $1}')
VPS_PACKAGE_HASH=$(ssh $VPS_HOST "md5sum $VPS_PATH/backend/package.json | awk '{print \$1}'")

if [[ "$LOCAL_PACKAGE_HASH" != "$VPS_PACKAGE_HASH" ]]; then
  echo "Dependencies changed, running npm install..."
  ssh $VPS_HOST "cd $VPS_PATH/backend && npm install --production"
  echo -e "${GREEN}✅ Dependencies updated${NC}"
else
  echo -e "${GREEN}✅ Dependencies up to date${NC}"
fi
echo ""

# Step 5: Build backend
echo -e "${YELLOW}[5/6] Building backend...${NC}"
ssh $VPS_HOST "cd $VPS_PATH/backend && npm run build"
echo -e "${GREEN}✅ Backend built successfully${NC}"
echo ""

# Step 6: Restart PM2 services
echo -e "${YELLOW}[6/6] Restarting services...${NC}"
ssh $VPS_HOST "cd $VPS_PATH/backend && pm2 restart all --update-env"
sleep 3
ssh $VPS_HOST "pm2 list"
echo ""

# Final health check
echo -e "${YELLOW}Running health check...${NC}"
VPS_IP="185.202.236.71"
HEALTH_RESPONSE=$(curl -s http://$VPS_IP:4000/health || echo "ERROR")

if [[ "$HEALTH_RESPONSE" == *"healthy"* ]]; then
  echo -e "${GREEN}✅ API Gateway is healthy${NC}"
else
  echo -e "${RED}⚠️  API Gateway health check failed${NC}"
  echo "Response: $HEALTH_RESPONSE"
fi

echo ""
echo "======================================"
echo -e "${GREEN}✅ Deployment Complete!${NC}"
echo "======================================"
echo ""
echo "Services:"
echo "  API Gateway:  http://$VPS_IP:4000"
echo "  WebSocket:    ws://$VPS_IP:4001"
echo "  Event Indexer: http://$VPS_IP:4002"
echo ""
echo "Monitor logs: ssh $VPS_HOST 'pm2 logs'"
echo ""
