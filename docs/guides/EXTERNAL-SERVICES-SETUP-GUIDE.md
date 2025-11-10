# External Services Setup Guide

**Time Required:** 45 minutes total
- Helius Setup: 15 minutes
- Pinata Setup: 15 minutes
- Service Deployment: 15 minutes

**Status:** Ready to execute
**Pre-requisites:** All backend infrastructure ready ✅

---

## 🎯 OVERVIEW

This guide will walk you through:
1. Creating a Helius account for Solana event monitoring
2. Creating a Pinata account for IPFS storage
3. Deploying the Event Indexer service
4. Deploying the IPFS Snapshot service
5. Verifying all 6 services are running

---

## 📋 PART 1: HELIUS SETUP (15 minutes)

### What is Helius?
Helius provides enhanced Solana RPC endpoints and webhooks that let us monitor on-chain events in real-time without polling.

### Step 1: Create Helius Account (5 min)

1. **Go to Helius Website**
   ```
   https://www.helius.dev/
   ```

2. **Click "Get Started" or "Sign Up"**
   - Top right corner of the page
   - You'll see a prominent button

3. **Sign Up Options**
   - **Option A:** Sign up with GitHub (fastest)
   - **Option B:** Sign up with Google
   - **Option C:** Use email + password

4. **Complete Registration**
   - Verify email if using email signup
   - You'll be redirected to the Helius dashboard

### Step 2: Create API Key (3 min)

1. **Navigate to Dashboard**
   - You'll see "API Keys" in the left sidebar
   - Click "API Keys"

2. **Create New API Key**
   - Click "Create API Key" button
   - **Name:** `ZMART Devnet Backend`
   - **Network:** Select `Devnet` (important!)
   - **Rate Limit:** Free tier (100 requests/second is fine)

3. **Copy API Key**
   - Click "Create"
   - **IMMEDIATELY COPY THE API KEY**
   - It looks like: `a1b2c3d4-e5f6-7890-abcd-ef1234567890`
   - Save it somewhere safe (you'll paste it into .env soon)

### Step 3: Configure Webhook (7 min)

1. **Navigate to Webhooks**
   - In left sidebar, click "Webhooks"
   - Click "Create Webhook"

2. **Webhook Configuration**

   **Basic Settings:**
   - **Name:** `ZMART Market Events`
   - **Network:** `Devnet`
   - **Type:** `Enhanced Transactions`

   **Program Addresses to Monitor:**
   ```
   7h3gXfBfYFueFVLYyfL5Qo1QGsf4GQUfW96FKVgnUsJS
   ```
   - This is your zmart-core program ID
   - Paste it into the "Program IDs" field

   **Webhook URL:**
   ```
   http://your-server-ip:3001/api/events/webhook
   ```
   - Replace `your-server-ip` with your actual server IP
   - For local development: `http://localhost:3001/api/events/webhook`
   - Port 3001 is where Event Indexer runs (different from API Gateway on 4000)

   **Transaction Types:**
   - Select ALL transaction types:
     - [x] Successful
     - [x] Failed
   - We want to track both for debugging

   **Authentication:**
   - **Webhook Secret:** Click "Generate Secret"
   - Copy the generated secret
   - Save it (you'll need this for .env)

3. **Save Webhook**
   - Click "Create Webhook"
   - Status should show "Active"

4. **Test Webhook (Optional but Recommended)**
   - Click "Send Test Event"
   - Check that no errors appear
   - Event Indexer doesn't need to be running yet for this test

### Step 4: Update .env File (2 min)

```bash
cd /Users/seman/Desktop/zmartV0.69/backend
nano .env  # or use your preferred editor
```

**Find these lines:**
```bash
HELIUS_RPC_URL=https://devnet.helius-rpc.com/?api-key=YOUR_HELIUS_API_KEY
HELIUS_WEBHOOK_SECRET=YOUR_WEBHOOK_SECRET_HERE
```

**Replace with your actual values:**
```bash
HELIUS_RPC_URL=https://devnet.helius-rpc.com/?api-key=a1b2c3d4-e5f6-7890-abcd-ef1234567890
HELIUS_WEBHOOK_SECRET=whsec_abcdef1234567890abcdef1234567890
```

**Save and close** (`Ctrl+O`, `Enter`, `Ctrl+X` in nano)

### ✅ Helius Setup Complete!

**Verification:**
```bash
# Test that env var loaded
node -e "require('dotenv').config(); console.log('Helius API Key:', process.env.HELIUS_RPC_URL.split('api-key=')[1])"
```

Should output your API key without errors.

---

## 📦 PART 2: PINATA SETUP (15 minutes)

### What is Pinata?
Pinata is a pinning service for IPFS (InterPlanetary File System) that makes it easy to upload and retrieve files from IPFS without running your own node.

### Step 1: Create Pinata Account (5 min)

1. **Go to Pinata Website**
   ```
   https://www.pinata.cloud/
   ```

2. **Click "Sign Up" or "Get Started"**
   - Top right corner

3. **Sign Up Options**
   - **Option A:** Sign up with email (recommended)
   - Fill in:
     - Email address
     - Password (strong password)
     - Confirm password

4. **Verify Email**
   - Check your email inbox
   - Click verification link
   - Return to Pinata dashboard

5. **Choose Plan**
   - **Free Tier:** 1 GB storage, 100 MB/month bandwidth
   - This is perfect for development!
   - Click "Start Free"

### Step 2: Create API Key (5 min)

1. **Navigate to API Keys**
   - In top navigation, click "API Keys"
   - Or go directly: https://app.pinata.cloud/keys

2. **Create New API Key**
   - Click "+ New Key" button

3. **Configure API Key Permissions**

   **Admin Settings:**
   - Give it a name: `ZMART Backend Service`

   **Permissions:**
   - [x] `pinFileToIPFS` - Upload files to IPFS
   - [x] `pinJSONToIPFS` - Upload JSON to IPFS (we use this!)
   - [x] `unpin` - Delete old files (for cleanup)
   - [x] `pinList` - List pinned files
   - [x] `userPinnedDataTotal` - Get usage stats

   **Max Uses:** Leave blank (unlimited)

4. **Generate Key**
   - Click "Create Key"
   - **CRITICAL:** You'll see this screen ONCE:
     ```
     API Key: 1234567890abcdef1234567890abcdef
     API Secret: abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890
     JWT: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
     ```

5. **IMMEDIATELY COPY AND SAVE:**
   - API Key (32 characters)
   - API Secret (64 characters)
   - **You CANNOT retrieve these again!**
   - Save to a secure note or password manager

### Step 3: Get Gateway URL (2 min)

1. **Check Your Gateway**
   - In Pinata dashboard, click "Gateways" (left sidebar)
   - You'll see: `https://gateway.pinata.cloud`
   - This is your default gateway

2. **Test Gateway (Optional)**
   - Try accessing a public IPFS file:
   ```
   https://gateway.pinata.cloud/ipfs/QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG/readme
   ```
   - Should show "Welcome to IPFS" message

### Step 4: Update .env File (3 min)

```bash
cd /Users/seman/Desktop/zmartV0.69/backend
nano .env
```

**Find these lines:**
```bash
PINATA_API_KEY=YOUR_PINATA_API_KEY
PINATA_SECRET_KEY=YOUR_PINATA_SECRET_KEY
PINATA_GATEWAY_URL=https://gateway.pinata.cloud/ipfs/
```

**Replace with your actual values:**
```bash
PINATA_API_KEY=1234567890abcdef1234567890abcdef
PINATA_SECRET_KEY=abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890
PINATA_GATEWAY_URL=https://gateway.pinata.cloud/ipfs/
```

**Save and close** (`Ctrl+O`, `Enter`, `Ctrl+X`)

### ✅ Pinata Setup Complete!

**Verification:**
```bash
# Test that env vars loaded
node -e "require('dotenv').config(); console.log('Pinata API Key:', process.env.PINATA_API_KEY.substring(0, 8) + '...')"
```

Should output first 8 characters of your API key.

---

## 🚀 PART 3: SERVICE DEPLOYMENT (15 minutes)

### Prerequisites Check

```bash
# Verify environment variables loaded
cd /Users/seman/Desktop/zmartV0.69/backend
node -e "
require('dotenv').config();
console.log('✅ Helius RPC:', process.env.HELIUS_RPC_URL ? 'Configured' : '❌ Missing');
console.log('✅ Helius Secret:', process.env.HELIUS_WEBHOOK_SECRET ? 'Configured' : '❌ Missing');
console.log('✅ Pinata API Key:', process.env.PINATA_API_KEY ? 'Configured' : '❌ Missing');
console.log('✅ Pinata Secret:', process.env.PINATA_SECRET_KEY ? 'Configured' : '❌ Missing');
"
```

All 4 should show "Configured" ✅

### Step 1: Create Test Scripts (5 min)

Create verification scripts to test connections:

**Create: `scripts/test-helius-connection.ts`**
```typescript
import { config } from '../src/config';
import fetch from 'node-fetch';

async function testHeliusConnection() {
  console.log('Testing Helius RPC connection...');

  try {
    // Test RPC endpoint
    const response = await fetch(config.solana.rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getSlot',
      }),
    });

    const data = await response.json();

    if (data.result) {
      console.log('✅ Helius RPC connected successfully!');
      console.log(`   Current slot: ${data.result}`);
      return true;
    } else {
      console.error('❌ Helius RPC error:', data.error);
      return false;
    }
  } catch (error) {
    console.error('❌ Failed to connect to Helius:', error);
    return false;
  }
}

testHeliusConnection();
```

**Create: `scripts/test-pinata-connection.ts`**
```typescript
import { config } from '../src/config';
import fetch from 'node-fetch';

async function testPinataConnection() {
  console.log('Testing Pinata API connection...');

  try {
    // Test Pinata API with authentication
    const response = await fetch('https://api.pinata.cloud/data/testAuthentication', {
      method: 'GET',
      headers: {
        'pinata_api_key': config.ipfs.pinataApiKey!,
        'pinata_secret_api_key': config.ipfs.pinataSecretKey!,
      },
    });

    const data = await response.json();

    if (data.message === 'Congratulations! You are communicating with the Pinata API!') {
      console.log('✅ Pinata authenticated successfully!');
      return true;
    } else {
      console.error('❌ Pinata authentication failed:', data);
      return false;
    }
  } catch (error) {
    console.error('❌ Failed to connect to Pinata:', error);
    return false;
  }
}

testPinataConnection();
```

**Run tests:**
```bash
npm install node-fetch
npm run build
node dist/scripts/test-helius-connection.js
node dist/scripts/test-pinata-connection.js
```

### Step 2: Update Ecosystem Config (2 min)

The ecosystem config already has placeholders. Let me check if they need to be uncommented:

```bash
grep -A 20 "event-indexer\|ipfs-snapshot" ecosystem.config.js
```

If commented out, uncomment them. The config should include:

```javascript
// Service 5: Event Indexer (port 3001)
{
  name: 'event-indexer',
  script: './dist/services/event-indexer/index.js',
  cwd: '/Users/seman/Desktop/zmartV0.69/backend',
  exec_mode: 'fork',
  instances: 1,
  autorestart: true,
  watch: false,
  max_memory_restart: '500M',
  env: {
    NODE_ENV: 'development',
    PORT: 3001,
  },
  error_file: './logs/event-indexer-error.log',
  out_file: './logs/event-indexer-out.log',
  log_file: './logs/event-indexer-combined.log',
  time: true,
},

// Service 6: IPFS Snapshot (cron job)
{
  name: 'ipfs-snapshot',
  script: './dist/services/ipfs/index.js',
  cwd: '/Users/seman/Desktop/zmartV0.69/backend',
  exec_mode: 'fork',
  instances: 1,
  autorestart: true,
  watch: false,
  max_memory_restart: '500M',
  env: {
    NODE_ENV: 'development',
  },
  error_file: './logs/ipfs-snapshot-error.log',
  out_file: './logs/ipfs-snapshot-out.log',
  log_file: './logs/ipfs-snapshot-combined.log',
  time: true,
},
```

### Step 3: Create Service Entry Points (3 min)

The services need standalone entry points for PM2:

**Create: `src/services/event-indexer/standalone.ts`**
```typescript
import { EventIndexerService } from './index';
import { config } from '../../config';

async function main() {
  const service = new EventIndexerService({
    supabaseUrl: config.supabase.url,
    supabaseKey: config.supabase.serviceRoleKey,
    heliusWebhookSecret: process.env.HELIUS_WEBHOOK_SECRET,
    port: 3001,
    logLevel: config.logLevel,
  });

  await service.initialize();
  await service.start();

  console.log('Event Indexer Service started on port 3001');
}

main().catch(console.error);
```

**Create: `src/services/ipfs/standalone.ts`**
```typescript
import { IPFSSnapshotScheduler } from './index';
import { supabase } from '../../db/client';
import { config } from '../../config';

async function main() {
  const scheduler = new IPFSSnapshotScheduler(
    supabase,
    config.services.ipfsSnapshotCron
  );

  // Test connection first
  const connected = await scheduler.testConnection();
  if (!connected) {
    console.error('Failed to connect to IPFS service');
    process.exit(1);
  }

  scheduler.start();
  console.log('IPFS Snapshot Scheduler started');
  console.log('Schedule:', config.services.ipfsSnapshotCron);

  // Keep process alive
  process.on('SIGINT', () => {
    console.log('Stopping IPFS Snapshot Scheduler...');
    scheduler.stop();
    process.exit(0);
  });
}

main().catch(console.error);
```

### Step 4: Rebuild Backend (1 min)

```bash
cd /Users/seman/Desktop/zmartV0.69/backend
npm run build
```

### Step 5: Deploy Event Indexer (2 min)

```bash
# Deploy Event Indexer
pm2 start ecosystem.config.js --only event-indexer

# Wait 10 seconds for startup
sleep 10

# Check status
pm2 list

# Check logs for errors
pm2 logs event-indexer --lines 20 --nostream

# Test health endpoint
curl http://localhost:3001/health | jq .
```

**Expected output:**
```json
{
  "status": "ok",
  "service": "event-indexer",
  "timestamp": "2025-11-07T..."
}
```

### Step 6: Deploy IPFS Snapshot (2 min)

```bash
# Deploy IPFS Snapshot
pm2 start ecosystem.config.js --only ipfs-snapshot

# Wait 10 seconds for startup
sleep 10

# Check status
pm2 list

# Check logs for errors
pm2 logs ipfs-snapshot --lines 20 --nostream
```

**Expected log output:**
```
[IPFSSnapshotScheduler] Starting scheduler with cron: 0 0 * * *
[IPFSSnapshotScheduler] Scheduler started successfully:
  - Snapshots: 0 0 * * * (midnight UTC)
  - Pruning: 30 0 * * * (12:30 AM UTC)
```

### Step 7: Save PM2 Configuration (1 min)

```bash
# Save all services
pm2 save

# Verify save
pm2 list
```

You should now see all 6 services:
```
┌────┬─────────────────────┬─────────┬────────┬───────────┬──────────┬──────────┐
│ id │ name                │ mode    │ uptime │ status    │ cpu      │ mem      │
├────┼─────────────────────┼─────────┼────────┼───────────┼──────────┼──────────┤
│ 0  │ api-gateway         │ fork    │ 1h     │ ✅ online │ 0%       │ 132mb    │
│ 1  │ websocket-server    │ cluster │ 1h     │ ✅ online │ 0%       │ 71mb     │
│ 2  │ vote-aggregator     │ cluster │ 1h     │ ✅ online │ 0%       │ 63mb     │
│ 3  │ market-monitor      │ cluster │ 1h     │ ✅ online │ 0%       │ 68mb     │
│ 4  │ event-indexer       │ fork    │ 5m     │ ✅ online │ 0%       │ 55mb     │
│ 5  │ ipfs-snapshot       │ fork    │ 5m     │ ✅ online │ 0%       │ 48mb     │
└────┴─────────────────────┴─────────┴────────┴───────────┴──────────┴──────────┘
```

---

## ✅ VERIFICATION & TESTING

### Test 1: All Services Running

```bash
pm2 list
```

All 6 services should show "online" ✅

### Test 2: API Gateway Health

```bash
curl http://localhost:4000/health | jq .
```

Expected: `{"status":"healthy",...}`

### Test 3: WebSocket Server

```bash
# Install wscat if not installed
npm install -g wscat

# Connect to WebSocket
wscat -c ws://localhost:4001

# You should see:
# Connected (press CTRL+C to quit)
```

### Test 4: Event Indexer Health

```bash
curl http://localhost:3001/health | jq .
```

Expected: `{"status":"ok","service":"event-indexer",...}`

### Test 5: Vote Aggregator Logs

```bash
pm2 logs vote-aggregator --lines 10 --nostream
```

Should show cron job running every 5 minutes.

### Test 6: Market Monitor Logs

```bash
pm2 logs market-monitor --lines 10 --nostream
```

Should show monitoring activity.

### Test 7: IPFS Snapshot Status

```bash
pm2 logs ipfs-snapshot --lines 10 --nostream
```

Should show scheduler started successfully.

### Test 8: Memory Usage

```bash
pm2 monit
```

Total memory usage should be <500MB for all 6 services.

---

## 🎉 SUCCESS CRITERIA

All of the following should be true:

- [x] Helius account created with API key
- [x] Helius webhook configured for program address
- [x] Pinata account created with API credentials
- [x] All 6 services showing "online" in `pm2 list`
- [x] API Gateway responding on port 4000
- [x] WebSocket Server responding on port 4001
- [x] Event Indexer responding on port 3001
- [x] Vote Aggregator cron running every 5 minutes
- [x] Market Monitor checking for finalizations
- [x] IPFS Snapshot scheduled for midnight UTC
- [x] Total memory usage <500MB
- [x] No errors in any service logs

---

## 🐛 TROUBLESHOOTING

### Event Indexer Fails to Start

**Error:** `Cannot find module 'express'`
```bash
cd /Users/seman/Desktop/zmartV0.69/backend
npm install express @types/express
npm run build
pm2 restart event-indexer
```

**Error:** `Port 3001 already in use`
```bash
lsof -i :3001
kill $(lsof -t -i:3001)
pm2 restart event-indexer
```

**Error:** `Helius webhook authentication failed`
- Check that `HELIUS_WEBHOOK_SECRET` in .env matches Helius dashboard
- Restart service after changing .env: `pm2 restart event-indexer --update-env`

### IPFS Snapshot Fails to Start

**Error:** `Pinata authentication failed`
```bash
# Test Pinata credentials manually
node scripts/test-pinata-connection.js

# If fails, verify credentials in .env
nano .env  # Check PINATA_API_KEY and PINATA_SECRET_KEY

# Restart with updated env
pm2 restart ipfs-snapshot --update-env
```

**Error:** `Cannot find module 'node-cron'`
```bash
npm install node-cron @types/node-cron
npm run build
pm2 restart ipfs-snapshot
```

### General Service Failures

```bash
# View detailed error logs
pm2 logs <service-name> --err --lines 50

# Restart specific service
pm2 restart <service-name>

# Restart all services
pm2 restart all

# Delete and recreate service
pm2 delete <service-name>
pm2 start ecosystem.config.js --only <service-name>

# Reset PM2 completely (nuclear option)
pm2 delete all
pm2 start ecosystem.config.js
pm2 save
```

---

## 📚 ADDITIONAL RESOURCES

**Helius:**
- Dashboard: https://dashboard.helius.dev/
- Documentation: https://docs.helius.dev/
- Webhooks Guide: https://docs.helius.dev/webhooks-and-websockets/webhooks

**Pinata:**
- Dashboard: https://app.pinata.cloud/
- Documentation: https://docs.pinata.cloud/
- API Reference: https://docs.pinata.cloud/api-reference

**PM2:**
- Documentation: https://pm2.keymetrics.io/docs/
- Monitoring Guide: https://pm2.keymetrics.io/docs/usage/monitoring/

---

## 🎊 COMPLETION CHECKLIST

After completing this guide, you should have:

- ✅ Helius account with API key and webhook configured
- ✅ Pinata account with API credentials
- ✅ 6/6 services running via PM2
- ✅ Event Indexer listening for blockchain events
- ✅ IPFS Snapshot scheduler running (executes at midnight UTC)
- ✅ All services configured with proper authentication
- ✅ PM2 configuration saved for persistence
- ✅ Full backend operational at 100%

**Total Time:** ~45 minutes
**Services Running:** 6/6 (100%)
**Deployment Status:** ✅ COMPLETE

---

**Next Steps:**
1. Integration testing with frontend
2. Monitor services for 24 hours to ensure stability
3. Test full market lifecycle with event indexing
4. Verify IPFS snapshots created at midnight

**Questions?** Check logs with `pm2 logs <service-name>` or `pm2 monit`
