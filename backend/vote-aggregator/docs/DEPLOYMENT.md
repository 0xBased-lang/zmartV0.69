# Vote Aggregator Service - Deployment Guide

**Version:** 1.0.0
**Target Environment:** Ubuntu 22.04 LTS / Debian 11+
**Last Updated:** November 8, 2025

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Redis Setup](#redis-setup)
3. [Environment Configuration](#environment-configuration)
4. [Service Deployment](#service-deployment)
5. [PM2 Process Management](#pm2-process-management)
6. [Monitoring & Logging](#monitoring--logging)
7. [Troubleshooting](#troubleshooting)
8. [Backup & Recovery](#backup--recovery)

---

## Prerequisites

### System Requirements

- **OS**: Ubuntu 22.04 LTS (recommended) or Debian 11+
- **RAM**: 2GB minimum, 4GB recommended
- **CPU**: 2 cores minimum
- **Storage**: 20GB minimum
- **Network**: Stable internet connection (low latency to Solana devnet/mainnet)

### Software Requirements

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18.x (LTS)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version  # Should be v18.x.x
npm --version   # Should be 9.x.x or higher

# Install build tools
sudo apt install -y build-essential git
```

---

## Redis Setup

### Installation

```bash
# Install Redis
sudo apt install -y redis-server

# Start Redis service
sudo systemctl start redis-server

# Enable Redis on boot
sudo systemctl enable redis-server

# Verify Redis is running
sudo systemctl status redis-server
redis-cli ping  # Should return "PONG"
```

### Configuration

Edit Redis configuration for production:

```bash
sudo nano /etc/redis/redis.conf
```

**Recommended Settings**:

```conf
# Bind to localhost only (security)
bind 127.0.0.1 ::1

# Enable persistence
save 900 1        # Save after 900s if 1 key changed
save 300 10       # Save after 300s if 10 keys changed
save 60 10000     # Save after 60s if 10000 keys changed

# Set max memory (adjust based on your RAM)
maxmemory 1gb
maxmemory-policy allkeys-lru  # Evict least recently used keys

# Enable AOF (Append Only File) for durability
appendonly yes
appendfilename "appendonly.aof"

# Logging
loglevel notice
logfile /var/log/redis/redis-server.log

# Password protection (IMPORTANT for production)
requirepass YOUR_STRONG_REDIS_PASSWORD_HERE
```

**Restart Redis to apply changes**:
```bash
sudo systemctl restart redis-server
```

**Test Redis with password**:
```bash
redis-cli -a YOUR_STRONG_REDIS_PASSWORD_HERE ping  # Should return "PONG"
```

### Redis Security Checklist

- [ ] Bind to localhost only (not 0.0.0.0)
- [ ] Set strong password in redis.conf
- [ ] Enable firewall (ufw) to block external Redis access
- [ ] Regularly backup Redis dump.rdb and appendonly.aof
- [ ] Monitor Redis memory usage
- [ ] Set up Redis Sentinel for high availability (production)

---

## Environment Configuration

### Clone Repository

```bash
cd /var/www
sudo mkdir -p zmart
sudo chown -R $USER:$USER zmart
cd zmart

git clone https://github.com/your-org/zmartV0.69.git
cd zmartV0.69/backend/vote-aggregator
```

### Environment Variables

Create `.env` file:

```bash
nano .env
```

**Production Configuration**:

```bash
# ============================================================
# SERVER CONFIGURATION
# ============================================================

NODE_ENV=production
PORT=3001

# ============================================================
# SOLANA CONFIGURATION
# ============================================================

# Network (devnet or mainnet-beta)
SOLANA_NETWORK=devnet
SOLANA_RPC_URL=https://api.devnet.solana.com

# Program ID
PROGRAM_ID=7h3gXfBfYFueFVLYyfL5Qo1QGsf4GQUfW96FKVgnUsJS

# Backend authority wallet path
BACKEND_AUTHORITY_KEYPAIR_PATH=/var/www/zmart/keys/backend-authority.json

# ============================================================
# REDIS CONFIGURATION
# ============================================================

REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=YOUR_STRONG_REDIS_PASSWORD_HERE

# Redis data TTL (7 days = 604800 seconds)
REDIS_TTL=604800

# ============================================================
# VOTE AGGREGATION CONFIGURATION
# ============================================================

# Approval thresholds (basis points: 7000 = 70%)
PROPOSAL_APPROVAL_THRESHOLD=7000
DISPUTE_SUCCESS_THRESHOLD=6000

# Cron schedule (every 5 minutes)
AGGREGATION_CRON_SCHEDULE=*/5 * * * *

# ============================================================
# LOGGING
# ============================================================

LOG_LEVEL=info
LOG_FILE=/var/log/zmart/vote-aggregator.log

# ============================================================
# SECURITY
# ============================================================

# JWT secret for authentication
JWT_SECRET=YOUR_VERY_STRONG_JWT_SECRET_HERE

# JWT token expiry (1 hour)
JWT_EXPIRY=3600

# Rate limiting
RATE_LIMIT_WINDOW_MS=60000  # 1 minute
RATE_LIMIT_MAX_REQUESTS=100

# ============================================================
# MONITORING (Optional)
# ============================================================

# Sentry DSN for error tracking
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id

# Enable metrics
ENABLE_METRICS=true
METRICS_PORT=9090
```

**Security: Protect .env file**:
```bash
chmod 600 .env
```

### Wallet Setup

**Create backend authority wallet** (if not exists):

```bash
# Create keys directory
sudo mkdir -p /var/www/zmart/keys
sudo chown $USER:$USER /var/www/zmart/keys
chmod 700 /var/www/zmart/keys

# Generate keypair (or copy existing)
solana-keygen new --outfile /var/www/zmart/keys/backend-authority.json

# Secure the keypair
chmod 600 /var/www/zmart/keys/backend-authority.json

# Fund with devnet SOL
solana airdrop 2 --keypair /var/www/zmart/keys/backend-authority.json --url devnet

# Verify balance
solana balance --keypair /var/www/zmart/keys/backend-authority.json --url devnet
```

**IMPORTANT**: For mainnet, use hardware wallet or multi-sig for backend authority!

---

## Service Deployment

### Install Dependencies

```bash
cd /var/www/zmart/zmartV0.69/backend/vote-aggregator

# Install production dependencies
npm install --production

# Or with pnpm (faster)
npm install -g pnpm
pnpm install --prod
```

### Build TypeScript

```bash
npm run build
```

Verify `dist/` directory created with compiled JavaScript.

### Test Service Locally

```bash
# Start service
npm start

# Check health endpoint
curl http://localhost:3001/health

# Expected response:
# {"status":"healthy","services":{"redis":"connected","solana":"connected"},"version":"1.0.0"}

# Stop service (Ctrl+C)
```

---

## PM2 Process Management

### Install PM2

```bash
sudo npm install -g pm2
```

### PM2 Configuration

Create `ecosystem.config.js`:

```bash
nano ecosystem.config.js
```

**Configuration**:

```javascript
module.exports = {
  apps: [
    {
      name: 'vote-aggregator',
      script: 'dist/index.js',
      instances: 1,  // Single instance (stateful due to cron)
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
      },
      error_file: '/var/log/zmart/vote-aggregator-error.log',
      out_file: '/var/log/zmart/vote-aggregator-out.log',
      log_file: '/var/log/zmart/vote-aggregator-combined.log',
      time: true,
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
  ],
};
```

### Create Log Directory

```bash
sudo mkdir -p /var/log/zmart
sudo chown $USER:$USER /var/log/zmart
```

### Start Service with PM2

```bash
# Start service
pm2 start ecosystem.config.js

# View status
pm2 status

# View logs
pm2 logs vote-aggregator

# Monitor in real-time
pm2 monit
```

### PM2 Auto-Startup

**Enable PM2 on system boot**:

```bash
# Generate startup script
pm2 startup

# Copy and run the command it outputs (requires sudo)
# Example: sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp /home/$USER

# Save current PM2 process list
pm2 save

# Verify startup script
sudo systemctl status pm2-$USER
```

### PM2 Commands Reference

```bash
# Start service
pm2 start vote-aggregator

# Stop service
pm2 stop vote-aggregator

# Restart service
pm2 restart vote-aggregator

# Reload service (zero-downtime)
pm2 reload vote-aggregator

# Delete service
pm2 delete vote-aggregator

# View logs
pm2 logs vote-aggregator --lines 100

# View metrics
pm2 monit

# List all processes
pm2 list

# Save process list
pm2 save

# Resurrect saved processes
pm2 resurrect
```

---

## Monitoring & Logging

### Health Checks

**Set up automated health checks** (cron):

```bash
crontab -e
```

Add:
```cron
# Health check every 5 minutes
*/5 * * * * curl -f http://localhost:3001/health || pm2 restart vote-aggregator
```

### Log Rotation

**Install logrotate**:

```bash
sudo nano /etc/logrotate.d/zmart-vote-aggregator
```

**Configuration**:
```
/var/log/zmart/vote-aggregator*.log {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
    create 0640 $USER $USER
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}
```

### Monitoring with PM2 Plus (Optional)

**Free tier for up to 4 servers**:

```bash
# Link to PM2 Plus
pm2 link YOUR_PM2_PLUS_SECRET_KEY YOUR_PM2_PLUS_PUBLIC_KEY

# Metrics will be available at https://app.pm2.io
```

### Metrics Endpoint (Prometheus)

**Enable in .env**:
```bash
ENABLE_METRICS=true
METRICS_PORT=9090
```

**Access metrics**:
```bash
curl http://localhost:9090/metrics
```

---

## Troubleshooting

### Service Won't Start

**Check logs**:
```bash
pm2 logs vote-aggregator --err --lines 50
```

**Common issues**:

1. **Port already in use**:
   ```bash
   # Find process using port 3001
   sudo lsof -i :3001

   # Kill process
   kill -9 <PID>

   # Or change PORT in .env
   ```

2. **Redis connection failed**:
   ```bash
   # Check Redis is running
   sudo systemctl status redis-server

   # Test Redis connection
   redis-cli -a YOUR_PASSWORD ping

   # Check Redis logs
   sudo tail -f /var/log/redis/redis-server.log
   ```

3. **Solana RPC connection failed**:
   ```bash
   # Test RPC endpoint
   curl https://api.devnet.solana.com -X POST -H "Content-Type: application/json" \
     -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}'

   # Try alternative RPC
   # Update SOLANA_RPC_URL in .env
   ```

4. **Backend authority not authorized**:
   ```bash
   # Verify backend authority matches GlobalConfig
   solana-keygen pubkey /var/www/zmart/keys/backend-authority.json

   # Check GlobalConfig on-chain
   # (Use Solana Explorer or anchor program)
   ```

### High Memory Usage

```bash
# Check memory usage
pm2 monit

# Restart if needed
pm2 restart vote-aggregator

# Reduce max memory in ecosystem.config.js
max_memory_restart: '512M'
```

### Redis Out of Memory

```bash
# Check Redis memory
redis-cli -a YOUR_PASSWORD INFO memory

# Clear all vote data (CAUTION!)
redis-cli -a YOUR_PASSWORD FLUSHDB

# Or increase maxmemory in redis.conf
```

---

## Backup & Recovery

### Redis Backup

**Manual backup**:
```bash
# Trigger save
redis-cli -a YOUR_PASSWORD SAVE

# Copy dump file
sudo cp /var/lib/redis/dump.rdb /backup/redis-dump-$(date +%Y%m%d).rdb
```

**Automated daily backup** (cron):
```bash
crontab -e
```

Add:
```cron
# Daily Redis backup at 2 AM
0 2 * * * redis-cli -a YOUR_PASSWORD SAVE && cp /var/lib/redis/dump.rdb /backup/redis-dump-$(date +\%Y\%m\%d).rdb
```

### Service Restoration

```bash
# Pull latest code
cd /var/www/zmart/zmartV0.69
git pull origin main

# Rebuild
cd backend/vote-aggregator
npm run build

# Restart service
pm2 restart vote-aggregator

# Verify
curl http://localhost:3001/health
```

---

## Security Checklist

- [ ] `.env` file has 600 permissions (read-only by owner)
- [ ] Backend authority keypair has 600 permissions
- [ ] Redis has strong password set
- [ ] Redis only bound to localhost
- [ ] Firewall (ufw) configured to block external access to Redis/API
- [ ] PM2 logs rotated to prevent disk fill
- [ ] Sentry or error tracking configured
- [ ] Automated health checks in place
- [ ] SSL/TLS for production API (use Nginx reverse proxy)
- [ ] Rate limiting enabled
- [ ] Regular backups scheduled

---

## Production Deployment (Mainnet)

### Additional Steps for Mainnet

1. **Use Hardware Wallet for Backend Authority**
   - Never store mainnet authority keypair on server
   - Use multi-sig (Squads Protocol) for critical operations
   - Implement approval workflow for aggregations

2. **High Availability**
   - Deploy Redis Sentinel for automatic failover
   - Use load balancer for API (Nginx, HAProxy)
   - Deploy multiple API instances across regions

3. **Enhanced Monitoring**
   - Set up alerts for:
     - Service downtime (>1 minute)
     - High error rates (>5% of requests)
     - Redis memory >80%
     - Failed aggregation transactions
   - Use Datadog, New Relic, or Grafana

4. **DDoS Protection**
   - Use Cloudflare or similar CDN
   - Implement stricter rate limiting
   - Set up IP whitelisting for aggregation endpoints

5. **Compliance**
   - Ensure SOC 2 compliance for data handling
   - Implement audit logging for all aggregations
   - Set up incident response procedures

---

## Support

**Documentation**: See `/docs/VOTE_AGGREGATOR_ULTRA_DEEP_ANALYSIS.md` for technical deep dive
**Issues**: GitHub Issues
**Contact**: team@zmart.io

---

**Deployment Guide Version**: 1.0.0
**Last Updated**: November 8, 2025
**Maintainer**: ZMART Development Team
