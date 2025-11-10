# Helius Webhook Setup Guide

**Service:** ZMART V0.69 Event Indexer
**Last Updated:** November 8, 2025
**Purpose:** Configure Helius webhooks to receive Solana program events

---

## Overview

Helius webhooks allow us to receive real-time notifications when transactions occur on our Solana program. This eliminates the need for polling and provides instant event indexing.

**Flow:**
```
Solana Transaction → Helius Enhanced API → Webhook → Event Indexer → Supabase
```

---

## Prerequisites

### 1. Helius Account

1. Go to https://www.helius.dev
2. Sign up for free account
3. Verify email
4. Navigate to Dashboard

### 2. Get API Key

1. Dashboard → API Keys
2. Click "Create API Key"
3. Name: `zmart-event-indexer`
4. Network: `devnet` (for testing) or `mainnet-beta` (for production)
5. Copy API key

Expected format: `<random-string>`

### 3. Generate Webhook Secret

```bash
# Generate a random secret for webhook signature verification
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output and save it as `HELIUS_WEBHOOK_SECRET`

---

## Environment Setup

### Update `.env` File

```bash
# Add to backend/.env
HELIUS_API_KEY=your_helius_api_key_from_dashboard
HELIUS_WEBHOOK_URL=https://your-production-domain.com/api/webhooks/helius
HELIUS_WEBHOOK_SECRET=your_generated_secret_from_step_3
```

**Important:**
- `HELIUS_WEBHOOK_URL` must be publicly accessible HTTPS endpoint
- For local testing, use ngrok or similar tunneling service
- Helius does NOT support `localhost` URLs

### Local Development with ngrok

If testing locally:

```bash
# Install ngrok
brew install ngrok

# Start ngrok tunnel
ngrok http 3002

# Copy the HTTPS URL (e.g., https://abc123.ngrok.io)
# Add to .env:
HELIUS_WEBHOOK_URL=https://abc123.ngrok.io/api/webhooks/helius
```

---

## Webhook Registration

### Method 1: Automated Script (Recommended)

```bash
cd backend

# Install dependencies
npm install axios

# Register webhook
npm run script:register-helius-webhook register

# Expected output:
# ✅ Helius Webhook Registered Successfully
#
# Webhook ID: webhook_abc123xyz
# Webhook URL: https://your-domain.com/api/webhooks/helius
# Program ID: 7h3gXfBfYFueFVLYyfL5Qo1QGsf4GQUfW96FKVgnUsJS
# Webhook Type: enhanced
#
# Add this to your .env file:
# HELIUS_WEBHOOK_ID=webhook_abc123xyz
```

Add the webhook ID to your `.env`:
```bash
HELIUS_WEBHOOK_ID=webhook_abc123xyz
```

### Method 2: Manual Registration (Via Helius Dashboard)

1. Dashboard → Webhooks → Create Webhook
2. Configuration:
   - **Webhook URL:** `https://your-domain.com/api/webhooks/helius`
   - **Webhook Type:** Enhanced
   - **Transaction Types:** Any
   - **Account Addresses:** Your program ID (`7h3gXfBfYFueFVLYyfL5Qo1QGsf4GQUfW96FKVgnUsJS`)
   - **Auth Header:** Your `HELIUS_WEBHOOK_SECRET` (optional but recommended)
3. Click "Create Webhook"
4. Copy Webhook ID to `.env`

### Method 3: cURL Request

```bash
curl -X POST "https://api.helius.xyz/v0/webhooks?api-key=YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "webhookURL": "https://your-domain.com/api/webhooks/helius",
    "transactionTypes": ["Any"],
    "accountAddresses": ["7h3gXfBfYFueFVLYyfL5Qo1QGsf4GQUfW96FKVgnUsJS"],
    "webhookType": "enhanced",
    "authHeader": "YOUR_WEBHOOK_SECRET"
  }'
```

---

## Webhook Management

### List Existing Webhooks

```bash
npm run script:register-helius-webhook list

# Output:
# 📋 Existing Helius Webhooks:
#
# 1. Webhook ID: webhook_abc123xyz
#    URL: https://your-domain.com/api/webhooks/helius
#    Type: enhanced
#    Accounts: 7h3gXfBfYFueFVLYyfL5Qo1QGsf4GQUfW96FKVgnUsJS
```

### Delete Webhook

```bash
npm run script:register-helius-webhook delete webhook_abc123xyz

# Output:
# ✅ Webhook webhook_abc123xyz deleted successfully
```

---

## Testing Webhook Delivery

### Step 1: Start Event Indexer

```bash
cd backend/event-indexer
npm run dev

# Expected output:
# Event Indexer Service started
# port: 3002
# webhookEndpoint: http://localhost:3002/api/webhooks/helius
```

### Step 2: Create Test Transaction on Devnet

```bash
cd programs/zmart-prediction-market

# Deploy program to devnet (if not already)
anchor build
anchor deploy --provider.cluster devnet

# Create a test market
anchor run create-market-devnet
```

### Step 3: Verify Webhook Received

Check event-indexer logs:

```bash
# You should see:
# [INFO] Webhook received {
#   signature: "5FzR...",
#   programId: "7h3g...",
#   eventType: "MarketCreated"
# }
#
# [INFO] Event processed successfully {
#   type: "MarketCreated",
#   signature: "5FzR..."
# }
```

Check Supabase database:

```bash
# Query events table
supabase db remote exec "SELECT * FROM events ORDER BY created_at DESC LIMIT 5;"

# Expected output:
#  id   | event_type     | tx_signature | processed |        created_at
# ------+----------------+--------------+-----------+---------------------------
#  ...  | MarketCreated  | 5FzR...      | true      | 2025-11-08 19:00:00+00:00
```

---

## Webhook Security

### Signature Verification

The event indexer automatically verifies webhook signatures using HMAC-SHA256:

1. Helius sends signature in `x-helius-signature` header
2. Event indexer computes expected signature using `HELIUS_WEBHOOK_SECRET`
3. Compares signatures using constant-time comparison
4. Rejects requests with invalid signatures

**Implementation:** `backend/event-indexer/src/middleware/verifyHelius.ts`

### Rate Limiting

Webhooks are rate-limited to prevent abuse:
- **Limit:** 100 requests per minute per IP
- **Headers:** `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`
- **Response:** `429 Too Many Requests` if exceeded

**Implementation:** `rateLimitWebhooks()` in `verifyHelius.ts`

---

## Troubleshooting

### Issue 1: Webhook Not Receiving Events

**Symptoms:** No logs in event-indexer, events table empty

**Diagnosis:**
```bash
# Check webhook status
npm run script:register-helius-webhook list

# Check if program ID matches
echo $SOLANA_PROGRAM_ID

# Check Helius dashboard for webhook errors
```

**Solutions:**
- Verify webhook URL is publicly accessible (test with curl)
- Ensure program ID is correct
- Check firewall/load balancer allows incoming requests
- Verify event-indexer is running on correct port

### Issue 2: 401 Unauthorized

**Symptoms:** `Invalid webhook signature` in logs

**Diagnosis:**
```bash
# Check environment variables
echo $HELIUS_WEBHOOK_SECRET

# Check if secret matches Helius dashboard
```

**Solutions:**
- Ensure `HELIUS_WEBHOOK_SECRET` is set correctly
- Verify secret matches the one configured in Helius
- Restart event-indexer after updating .env

### Issue 3: Events Not Saved to Database

**Symptoms:** Webhook received but events table empty

**Diagnosis:**
```bash
# Check database connection
curl http://localhost:3002/health

# Check Supabase credentials
echo $SUPABASE_SERVICE_ROLE_KEY

# Check event processor logs
```

**Solutions:**
- Verify Supabase connection in health check
- Check `SUPABASE_SERVICE_ROLE_KEY` is correct
- Ensure all migrations applied successfully
- Check event processor logs for errors

### Issue 4: Duplicate Events

**Symptoms:** Same event inserted multiple times

**Diagnosis:**
```bash
# Check for duplicates
supabase db remote exec "
  SELECT tx_signature, event_type, COUNT(*)
  FROM events
  GROUP BY tx_signature, event_type
  HAVING COUNT(*) > 1;
"
```

**Solutions:**
- Events table has unique constraint on (tx_signature, event_type)
- If duplicates exist, migrations may not have been applied
- Run: `supabase db push` to ensure constraints exist

---

## Production Deployment

### Checklist

- [ ] Helius account created and verified
- [ ] API key generated for mainnet-beta
- [ ] Webhook secret generated (32+ bytes)
- [ ] Production domain configured with HTTPS
- [ ] Webhook registered via script or dashboard
- [ ] Webhook ID saved to production .env
- [ ] Signature verification enabled
- [ ] Rate limiting configured
- [ ] Test transaction sent and verified
- [ ] Monitoring set up (Helius dashboard + event-indexer logs)

### Monitoring

**Helius Dashboard:**
- Navigate to Webhooks → Your Webhook
- Monitor:
  - Delivery success rate
  - Failed deliveries
  - Average response time
  - Total events processed

**Event Indexer Metrics:**
```bash
# Count events processed
supabase db remote exec "
  SELECT
    event_type,
    COUNT(*) as total,
    SUM(CASE WHEN processed THEN 1 ELSE 0 END) as processed,
    SUM(CASE WHEN error IS NOT NULL THEN 1 ELSE 0 END) as errors
  FROM events
  GROUP BY event_type;
"
```

**Expected Output:**
```
 event_type       | total | processed | errors
------------------+-------+-----------+--------
 MarketCreated    |   150 |       150 |      0
 TradeExecuted    |  1200 |      1198 |      2
 MarketResolved   |    75 |        75 |      0
 ...
```

### Alerts

Set up alerts for:
- Webhook delivery failure rate >1%
- Event processing error rate >0.1%
- Database connection failures
- Rate limit exceeded warnings

---

## Next Steps

After webhook setup:
1. ✅ Webhooks registered and receiving events
2. ⏳ Day 3: End-to-end testing (all 9 event types)
3. ⏳ Day 4-5: Performance optimization
4. ⏳ Day 6-7: Integration tests and documentation

---

## Support

- **Helius Docs:** https://docs.helius.dev/webhooks
- **Helius Discord:** https://discord.gg/helius
- **ZMART Docs:** `/docs/07_ON_CHAIN_OFF_CHAIN_INTEGRATION.md`
- **Event Indexer Code:** `/backend/event-indexer/`

---

**Setup Status:** ✅ Ready to configure
**Tested On:** Devnet
**Last Verification:** November 8, 2025
