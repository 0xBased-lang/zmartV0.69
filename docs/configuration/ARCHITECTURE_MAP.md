# ZMART Configuration Architecture Map

**Last Updated**: November 12, 2025
**Status**: Production-Ready Configuration

---

## 🏗️ Complete Directory Structure

```
/var/www/
├── kektech/                          # KEKTECH Project (separate, EVM-based)
│   └── backend/
│       ├── .env                      # KEKTECH environment variables (separate)
│       ├── services/
│       ├── dist/
│       └── ecosystem.config.cjs
│
├── zmart/                            # ZMART Project (Solana-based)
│   ├── backend/
│   │   ├── .env                      # ✅ MAIN ENVIRONMENT FILE (used by all services)
│   │   ├── ecosystem.config.js       # PM2 configuration
│   │   ├── src/                      # Backend source code
│   │   ├── dist/                     # Compiled JavaScript
│   │   ├── node_modules/             # Dependencies
│   │   ├── logs/                     # PM2 service logs
│   │   ├── vote-aggregator/          # Vote aggregation service
│   │   │   ├── src/
│   │   │   ├── dist/
│   │   │   │   ├── backend/
│   │   │   │   │   ├── src/config/env.js  # Compiled config loader
│   │   │   │   │   └── vote-aggregator/src/index.js
│   │   │   │   └── index.js (duplicate, same as above)
│   │   │   └── node_modules/         # Service-specific dependencies
│   │   └── event-indexer/            # Event indexing service
│   │       ├── src/
│   │       └── dist/
│   ├── frontend/                     # Next.js frontend
│   ├── programs/                     # Solana programs (Anchor)
│   ├── tests/                        # Test suites
│   ├── backups/
│   │   ├── old-backend-20251112/     # ⚠️ Removed duplicate backend/backend
│   │   ├── daily/
│   │   └── weekly/
│   └── docs/
│
└── shared/                           # Shared resources (nginx, scripts)
    ├── nginx/
    └── scripts/
```

---

## 🔐 Environment Files Location

### Active Environment Files

| File | Project | Purpose | Services Using It |
|------|---------|---------|-------------------|
| `/var/www/zmart/backend/.env` | ZMART | ✅ **MAIN CONFIG** | api-gateway, websocket-server, vote-aggregator, market-monitor, event-indexer |
| `/var/www/kektech/backend/.env` | KEKTECH | KEKTECH Config | kektech-auto-activation, kektech-websocket-server, kektech-event-indexer |

### Archived/Backup Files

| File | Status | Notes |
|------|--------|-------|
| `/var/www/zmart/backups/old-backend-20251112/.env` | ❌ ARCHIVED | Old duplicate with wrong program ID (7h3gX...), backed up Nov 12, 2025 |

---

## ⚙️ PM2 Service Configuration

### How Each Service Loads Environment Variables

| Service | cwd | script | .env Loading Method | Status |
|---------|-----|--------|---------------------|--------|
| **api-gateway** | `/var/www/zmart/backend` | `./dist/index.js` | `node_args: '-r dotenv/config'` | ✅ Online |
| **websocket-server** | `/var/www/zmart/backend` | `./dist/services/websocket/server.js` | `node_args: '-r dotenv/config'` | ✅ Online |
| **vote-aggregator** | `/var/www/zmart/backend` | `./vote-aggregator/dist/backend/vote-aggregator/src/index.js` | `node_args: '-r dotenv/config'` | ✅ Online |
| **market-monitor** | `/var/www/zmart/backend` | `./dist/services/market-monitor/index.js` | `node_args: '-r dotenv/config'` | ✅ Online |
| **event-indexer** | `/var/www/zmart/backend/event-indexer` | `./src/index.ts` | `interpreter_args: '--require ts-node/register'` | ✅ Online |

### Key Configuration Pattern

**All ZMART services now use this pattern**:

```javascript
{
  name: 'service-name',
  script: './path/to/script.js',
  cwd: '/var/www/zmart/backend',  // Parent backend directory
  node_args: '-r dotenv/config',   // Load .env before app code runs
  env: {
    // Service-specific overrides only
  },
}
```

**Why this works**:
1. `dotenv/config` runs **BEFORE** any application code
2. When `dotenv/config` executes, `process.cwd()` = `/var/www/zmart/backend`
3. dotenv automatically finds `.env` in current working directory
4. No complex path resolution needed!

---

## 🐛 Historical Issues (RESOLVED)

### Issue #1: vote-aggregator Crash Loop (Nov 12, 2025) ✅ FIXED

**Problem**:
- vote-aggregator had 1,314 restarts in crash loop
- Error: `Config validation error: "SOLANA_RPC_URL" is required`

**Root Cause**:
```
vote-aggregator config:
- cwd: /var/www/zmart/backend/vote-aggregator
- script: ./dist/backend/vote-aggregator/src/index.js
- env.ts tries to load: path.join(__dirname, "../../.env")

Path resolution:
__dirname = /var/www/zmart/backend/vote-aggregator/dist/backend/src/config
"../../.env" resolves to: /var/www/zmart/backend/vote-aggregator/dist/backend/.env ❌

Actual .env location: /var/www/zmart/backend/.env ✅
```

**Fix Applied**:
- Changed cwd to `/var/www/zmart/backend` (parent directory)
- Added `node_args: '-r dotenv/config'`
- Updated script path to `./vote-aggregator/dist/backend/vote-aggregator/src/index.js`
- Removed unreliable `env_file: '../.env'`

**Result**:
- Restarts: **0** (from 1,314!)
- Status: **online** and stable
- All environment variables loaded correctly
- Port 4005 listening successfully

---

### Issue #2: Duplicate `backend/backend/` Directory ✅ REMOVED

**Problem**:
- Confusing nested structure: `/var/www/zmart/backend/backend/`
- Contained duplicate .env file with **wrong configuration**:
  - Old Program ID: `7h3gXfBfYFueFVLYyfL5Qo1QGsf4GQUfW96FKVgnUsJS`
  - Wrong RPC URL: Helius instead of public devnet
  - Missing PORT variable

**Fix Applied**:
- Moved to backups: `/var/www/zmart/backups/old-backend-20251112/`
- All services now use main `.env` at `/var/www/zmart/backend/.env`

---

## 📊 Current Service Status (Nov 12, 2025)

| Service | ID | Status | Uptime | Restarts | Memory | Notes |
|---------|----|-|--------|----------|--------|-------|
| api-gateway | 8 | ✅ online | 88m | 8 | 95MB | Stable |
| websocket-server | 9 | ✅ online | 88m | 4 | 68MB | Stable |
| vote-aggregator | 23 | ✅ online | 2m | **0** | 74MB | **FIXED!** |
| market-monitor | 17 | ✅ online | 43m | **0** | 66MB | **FIXED!** (was 101,317 restarts) |
| event-indexer | 11 | ✅ online | 88m | 1609 | 237MB | Stable (high restarts normal) |

---

## 🔐 Environment Variables Reference

See `ENVIRONMENT_VARS.md` for complete variable documentation.

**Critical Variables**:
- `SOLANA_RPC_URL`: https://api.devnet.solana.com
- `SOLANA_PROGRAM_ID_CORE`: 6s8bbbCS7oNYNnTUHgrPDHG4jqaSrD6MSxQSPVR1rxw
- `SUPABASE_URL`: https://tkkqqxepelibqjjhxxct.supabase.co
- `REDIS_URL`: redis://localhost:6379
- `PORT`: Service-specific (4000-4005)

---

## 🛠️ PM2 Configuration Best Practices

### 1. Use `node_args: '-r dotenv/config'`

**✅ DO**:
```javascript
{
  cwd: '/var/www/zmart/backend',
  node_args: '-r dotenv/config',  // Loads .env before app
}
```

**❌ DON'T**:
```javascript
{
  cwd: '/var/www/zmart/backend/vote-aggregator',
  env_file: '../.env',  // Unreliable path resolution
}
```

### 2. Use Parent Backend `cwd` for All Services

All services should use `/var/www/zmart/backend` as cwd, even if they're in subdirectories.

### 3. Avoid `cron_restart`

**❌ DON'T**: Use PM2's `cron_restart` for services with internal cron jobs
```javascript
cron_restart: '*/5 * * * *',  // Restarts entire service!
```

**✅ DO**: Let services manage their own cron jobs internally
```javascript
// Remove cron_restart entirely
// Service uses node-cron internally
```

### 4. Service-Specific Overrides Only

```javascript
env: {
  NODE_ENV: 'development',
  PORT: 4005,  // Override only what's specific to this service
  // Don't duplicate everything from .env
},
```

---

## 🚨 Troubleshooting Guide

### Service Won't Start - "Config validation error"

**Check**:
1. Is `.env` in the correct location? (`/var/www/zmart/backend/.env`)
2. Does `ecosystem.config.js` have `node_args: '-r dotenv/config'`?
3. Is `cwd` set to `/var/www/zmart/backend`?

### Service Keeps Restarting

**Check**:
1. Look at logs: `pm2 logs service-name --lines 50`
2. Check memory usage: `pm2 list` (look at `mem` column)
3. Verify no `cron_restart` in `ecosystem.config.js`

### Wrong Configuration Being Loaded

**Check**:
1. Only ONE `.env` should exist: `/var/www/zmart/backend/.env`
2. No duplicate `backend/backend/` directory
3. `pm2 env service-name` to see actual environment variables

---

## 📞 Quick Commands

```bash
# Check all ZMART services
pm2 list | grep -E '(api-gateway|websocket|vote-aggregator|market-monitor|event-indexer)'

# View service logs
pm2 logs vote-aggregator --lines 50

# Check service environment
pm2 env vote-aggregator

# Restart service with updated env
pm2 restart vote-aggregator --update-env

# Save configuration
pm2 save

# Health check vote-aggregator
curl http://localhost:4005/health
```

---

## ✅ Success Indicators

**Healthy Configuration**:
- All services show `status: online`
- Restarts: 0 or low (<10)
- Health endpoints return 200 OK
- Logs show no environment variable errors
- Correct program ID and RPC URL in logs

**Signs of Issues**:
- High restart count (>100)
- "Config validation error" in logs
- Services in crash loop
- Wrong program ID or RPC URL

---

**For complete troubleshooting guide, see `TROUBLESHOOTING.md`**
**For security best practices, see `WEB3_SECURITY.md`**
