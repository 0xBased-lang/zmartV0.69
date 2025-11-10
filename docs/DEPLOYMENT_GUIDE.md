# Deployment Guide - ZMART V0.69

## Overview

This guide explains how to deploy ZMART's backend services to the VPS and frontend to Vercel across Development, Staging, and Production environments.

---

## Deployment Strategy

### Three Environments

```
┌──────────────┬───────────────┬────────────────┬───────────────┐
│ Environment  │ Frontend      │ Backend        │ Database      │
├──────────────┼───────────────┼────────────────┼───────────────┤
│ Development  │ Local         │ Local OR VPS   │ Supabase Free │
│ Staging      │ Vercel Free   │ VPS            │ Supabase Free │
│ Production   │ Vercel Pro    │ VPS Upgraded   │ Supabase Pro  │
└──────────────┴───────────────┴────────────────┴───────────────┘
```

**Key Points**:
- ✅ ONE Supabase project for all environments
- ✅ ONE VPS for backend (staging + production can coexist)
- ✅ Frontend on Vercel (better CDN than VPS)
- ✅ Blockchain: Devnet for dev/staging, Mainnet for production

---

## Development Environment (Current)

### Frontend (Local)

```bash
# Terminal 1: Run frontend locally
cd /Users/seman/Desktop/zmartV0.69/frontend
npm run dev
# Open http://localhost:3000
```

**Features**:
- Hot reload for instant changes
- Local debugging with browser DevTools
- Connected to VPS backend OR local backend

### Backend (Local OR VPS)

**Option A: Run Locally**
```bash
# Terminal 2: Run backend services locally
cd /Users/seman/Desktop/zmartV0.69/backend
npm run build
pm2 start ecosystem.config.js
pm2 logs
```

**Option B: Use VPS**
```bash
# VPS services already running (api-gateway on port 4000)
# Frontend connects to: http://185.202.236.71:4000
```

**Trade-Off**:
- Local: Faster iteration, easier debugging, full control
- VPS: Closer to production environment, shared testing with team

### Database (Supabase Cloud)

- **URL**: `https://tkkqqxepelibqjjhxxct.supabase.co`
- **Tier**: Free (500MB, 50K API requests/day)
- **Shared**: Both local and VPS connect to same database

---

## Staging Environment (Future - Week 10)

### Frontend (Vercel Free)

```bash
# Deploy frontend to Vercel
cd /Users/seman/Desktop/zmartV0.69/frontend
vercel --prod

# Automatic deployment on git push (if linked to GitHub)
git push origin main
```

**Vercel Configuration**:
```bash
# .env.production (Vercel environment variables)
NEXT_PUBLIC_SUPABASE_URL=https://tkkqqxepelibqjjhxxct.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
NEXT_PUBLIC_API_URL=http://185.202.236.71:4000
NEXT_PUBLIC_WS_URL=ws://185.202.236.71:4001
```

**Features**:
- ✅ CDN for fast global access
- ✅ Automatic SSL (HTTPS)
- ✅ Preview deployments for PRs
- ✅ Zero cost (free tier)

### Backend (VPS - Staging Mode)

**Deploy Code to VPS**:
```bash
# Option 1: Manual deployment
ssh kek
cd /var/www/zmart/backend
git pull origin main
npm run build
pm2 restart all

# Option 2: Automated script (see scripts/deploy-to-vps.sh)
./scripts/deploy-to-vps.sh
```

**VPS Configuration**:
- Services run on same VPS as development
- Use separate PM2 instances OR different ports (4100-4104)
- Environment variables in `/var/www/zmart/backend/backend/.env.staging`

### Database (Supabase Cloud)

- Same Supabase project as development
- Use `TEST_` prefix for staging data
- Regular cleanup to prevent data collision

---

## Production Environment (Future - Week 14)

### Prerequisites

- [ ] All 150+ tests passing (95%+ coverage)
- [ ] Security audit complete (no critical issues)
- [ ] Mainnet programs deployed and verified
- [ ] Load testing passed (100+ concurrent users)
- [ ] Backup/rollback procedures tested

### Frontend (Vercel Pro - $20/month)

```bash
# Upgrade Vercel project to Pro
vercel upgrade

# Deploy to production domain
vercel --prod
```

**Vercel Pro Features**:
- ✅ Custom domain (zmart.io)
- ✅ Advanced analytics
- ✅ Priority support
- ✅ Faster builds
- ✅ Team collaboration features

**Production Environment Variables**:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://tkkqqxepelibqjjhxxct.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
NEXT_PUBLIC_API_URL=https://api.zmart.io  # Use domain, not IP
NEXT_PUBLIC_WS_URL=wss://ws.zmart.io
NEXT_PUBLIC_SOLANA_NETWORK=mainnet-beta
```

### Backend (VPS Upgraded - $40-80/month)

**Upgrade VPS Resources**:
```bash
# Upgrade to larger VPS plan
# Recommended: 4 vCPU, 8GB RAM, 160GB SSD
# Hetzner CX31: €9.35/month (~$10)
# OR Contabo VPS M: $6.99/month
```

**Production Deployment**:
```bash
# SSH to VPS
ssh kek

# Pull production branch
cd /var/www/zmart/backend
git checkout main
git pull origin main

# Update dependencies
npm install --production

# Build production bundle
npm run build

# Update environment to mainnet
nano /var/www/zmart/backend/backend/.env
# Change SOLANA_RPC_URL to mainnet

# Restart with zero downtime
pm2 reload ecosystem.config.js
```

**Production Environment Variables**:
```bash
# Network (MAINNET)
SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=<key>

# Database (same Supabase, upgraded to Pro)
SUPABASE_URL=https://tkkqqxepelibqjjhxxct.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<secret>

# API Configuration
API_PORT=4000
WS_PORT=4001
NODE_ENV=production
```

### Database (Supabase Pro - $25/month)

**Upgrade Supabase Project**:
```bash
# Go to Supabase dashboard
https://supabase.com/dashboard/project/tkkqqxepelibqjjhxxct

# Settings → Billing → Upgrade to Pro
# Zero downtime, automatic migration
```

**What Changes**:
- ✅ 8GB database storage
- ✅ Unlimited API requests
- ✅ Daily backups for 7 days
- ✅ Point-in-time recovery
- ✅ Email support

### Blockchain (Solana Mainnet)

**Deploy Programs to Mainnet**:
```bash
# Build programs
cd /Users/seman/Desktop/zmartV0.69/programs
anchor build

# Deploy to mainnet (requires SOL for rent)
solana config set --url mainnet-beta
anchor deploy --provider.cluster mainnet

# Update program IDs in frontend
# frontend/src/config/program-ids.ts
```

**Mainnet Costs**:
- Program deployment: ~5 SOL (~$500 at $100/SOL)
- Rent for accounts: ~0.5 SOL per market
- Transaction fees: ~0.00001 SOL per transaction

---

## Deployment Workflows

### Daily Development Workflow

```bash
# 1. Make changes locally
cd /Users/seman/Desktop/zmartV0.69
git checkout -b feature/my-feature
# ... make changes ...

# 2. Test locally
npm run test
npm run build

# 3. Commit and push
git add .
git commit -m "feat: Add my feature"
git push origin feature/my-feature

# 4. Create PR, get review, merge to main

# 5. Deploy to VPS (manual OR automatic via CI/CD)
./scripts/deploy-to-vps.sh
```

### Weekly Staging Deployment

```bash
# Every Friday: Deploy to staging for team testing
git checkout main
git pull origin main
./scripts/deploy-to-staging.sh

# Team tests over weekend
# Fix bugs on Monday if needed
```

### Monthly Production Deployment

```bash
# After thorough testing in staging
git checkout main
git pull origin main

# Tag release
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0

# Deploy to production
./scripts/deploy-to-production.sh

# Monitor for 24h
pm2 logs
# Check error rates in Supabase dashboard
# Monitor user reports
```

---

## Rollback Procedures

### Rollback Frontend (Vercel)

```bash
# Vercel keeps last 100 deployments
# Go to: https://vercel.com/your-project/deployments

# Click on previous working deployment
# Click "Promote to Production"

# OR via CLI
vercel rollback
```

### Rollback Backend (VPS)

```bash
ssh kek
cd /var/www/zmart/backend

# Option 1: Git rollback
git log --oneline | head -5  # Find last working commit
git reset --hard <commit-hash>
npm run build
pm2 restart all

# Option 2: Use backup
cp -r /var/www/zmart/backend.backup.20251110/* /var/www/zmart/backend/
npm run build
pm2 restart all
```

### Rollback Database (Supabase)

```bash
# Supabase Pro: Point-in-time recovery
# Dashboard → Database → Backups → Restore to timestamp

# Manual rollback
supabase db reset
psql $DATABASE_URL < backup_20251110.sql
```

---

## Monitoring

### Health Checks

```bash
# API Gateway
curl https://api.zmart.io/health
# Expected: {"status":"healthy","uptime":12345}

# WebSocket Server
wscat -c wss://ws.zmart.io
# Expected: Connection established

# Database
curl https://tkkqqxepelibqjjhxxct.supabase.co/rest/v1/markets?limit=1 \
  -H "apikey: <anon-key>"
# Expected: [{"market_id":"..."}]
```

### PM2 Monitoring

```bash
ssh kek

# Check all services
pm2 list

# View logs
pm2 logs --lines 100

# Monitor resources
pm2 monit
```

### Supabase Monitoring

```bash
# Dashboard → Logs → Postgres Logs
# Check slow queries, errors, connection count

# Dashboard → Database → Replication
# Check real-time subscriber count
```

---

## Automation Scripts

### deploy-to-vps.sh

```bash
#!/bin/bash
echo "Deploying backend to VPS..."

# Commit current changes
git add .
git commit -m "Deploy $(date)"
git push origin main

# Deploy to VPS
ssh kek "cd /var/www/zmart/backend && git pull && npm run build && pm2 restart all"

echo "✅ Deployment complete!"
```

### health-check.sh

```bash
#!/bin/bash
echo "Checking all services..."

echo "=== LOCAL ==="
pm2 list

echo "=== VPS ==="
ssh kek "pm2 list"

echo "=== SUPABASE ==="
curl -s https://tkkqqxepelibqjjhxxct.supabase.co/rest/v1/markets?limit=1

echo "✅ Health check complete!"
```

### backup.sh

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/zmart/$(date +%Y%m%d)"
ssh kek "mkdir -p $BACKUP_DIR"

# Backup code
ssh kek "tar -czf $BACKUP_DIR/backend.tar.gz /var/www/zmart/backend"

# Backup database
supabase db dump -f $BACKUP_DIR/database.sql

echo "✅ Backup created: $BACKUP_DIR"
```

---

## CI/CD Integration (Future)

### GitHub Actions Workflow

```yaml
# .github/workflows/deploy.yml
name: Deploy to VPS

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2

      - name: Run tests
        run: npm test

      - name: Deploy to VPS
        run: |
          ssh-add - <<< "${{ secrets.VPS_SSH_KEY }}"
          ssh kek "cd /var/www/zmart/backend && git pull && npm run build && pm2 restart all"
```

**Secrets to Add**:
- `VPS_SSH_KEY`: Private SSH key for VPS access
- `SUPABASE_SERVICE_ROLE_KEY`: For database migrations

---

## Disaster Recovery

### Complete System Failure

**Recovery Time Objective (RTO)**: 4 hours
**Recovery Point Objective (RPO)**: 24 hours (daily backups)

**Recovery Steps**:

1. **Provision New VPS** (30 min)
   ```bash
   # Spin up new VPS with same specs
   # Update DNS to point to new IP
   ```

2. **Restore Code** (15 min)
   ```bash
   git clone <repo>
   npm install
   npm run build
   ```

3. **Restore Database** (2 hours)
   ```bash
   # Supabase Pro: Point-in-time recovery
   # OR: Restore from backup
   psql $DATABASE_URL < latest_backup.sql
   ```

4. **Restart Services** (15 min)
   ```bash
   pm2 start ecosystem.config.js
   pm2 save
   ```

5. **Verify** (1 hour)
   ```bash
   # Run health checks
   # Test critical user flows
   # Monitor error rates
   ```

---

## Cost Summary

### Development (Current)
- VPS: $20/month
- Supabase: $0 (free tier)
- **Total: $20/month**

### Staging (Week 10)
- VPS: $20/month (same server)
- Supabase: $0 (same project)
- Vercel: $0 (free tier)
- **Total: $20/month**

### Production (Week 14)
- VPS Upgraded: $40-80/month
- Supabase Pro: $25/month
- Vercel Pro: $20/month
- **Total: $85-125/month**

**Future Scaling (1000+ users)**:
- VPS: $150/month (dedicated server)
- Supabase: $50/month (team plan)
- Vercel: $20/month (pro)
- **Total: $220/month**

---

## Related Documentation

- [VPS_ARCHITECTURE.md](./VPS_ARCHITECTURE.md) - VPS service details
- [SUPABASE_INTEGRATION.md](./SUPABASE_INTEGRATION.md) - Database integration
- [IMPLEMENTATION_PHASES.md](./IMPLEMENTATION_PHASES.md) - Development timeline

---

*Last Updated: November 10, 2025 | Status: Production-Ready*
