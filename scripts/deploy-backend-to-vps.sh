#!/bin/bash
# Deploy backend to VPS (185.202.236.71)
# Usage: ./scripts/deploy-backend-to-vps.sh

set -e  # Exit on error

echo "🚀 Deploying ZMART backend to VPS..."
echo ""

# Change to project root
cd "$(dirname "$0")/.."

# 1. Build locally first (catch errors early)
echo "📦 Building locally..."
cd backend
if ! pnpm build; then
  echo "❌ Local build failed! Fix errors before deploying."
  exit 1
fi
cd ..

# 2. Sync files to VPS (excluding node_modules, logs, .env)
echo ""
echo "📤 Syncing files to VPS..."
rsync -avz \
  --exclude 'node_modules' \
  --exclude 'logs' \
  --exclude '.env' \
  --exclude 'dist' \
  --exclude '*.log' \
  backend/ kek:/var/www/zmart/backend/

# 3. Rebuild on VPS (with VPS node_modules and environment)
echo ""
echo "🔨 Rebuilding on VPS..."
ssh kek "cd /var/www/zmart/backend && pnpm install --frozen-lockfile && pnpm build"

# 4. Restart services
echo ""
echo "♻️  Restarting PM2 services..."
ssh kek "pm2 restart api-gateway websocket-server event-indexer market-monitor"

# 5. Wait for services to start
echo ""
echo "⏳ Waiting for services to start..."
sleep 5

# 6. Health check
echo ""
echo "🏥 Running health checks..."
echo ""
echo "API Gateway (port 4000):"
ssh kek "curl -s http://localhost:4000/health | jq ."

echo ""
echo "PM2 Status:"
ssh kek "pm2 list | grep -E 'api-gateway|websocket-server|event-indexer|market-monitor'"

echo ""
echo "✅ Deployment complete!"
echo ""
echo "🔗 VPS Backend URL: http://185.202.236.71:4000"
echo "🔗 WebSocket URL: ws://185.202.236.71:4001"
