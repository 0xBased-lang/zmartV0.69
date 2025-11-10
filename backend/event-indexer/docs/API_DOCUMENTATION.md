# Event Indexer API Documentation

**Complete API reference for the Zmart Event Indexer service.**

Version: 1.0.0
Last Updated: January 8, 2025

---

## Base URL

**Development:** `http://localhost:3002`
**Production:** `https://api.zmart.io`

---

## Authentication

### Service Authentication

The Event Indexer uses **Supabase service role authentication** for database writes.

No authentication required for:
- Health check endpoints
- Webhook endpoints (verified via HMAC signature)

---

## Endpoints

### 1. Health Check

Check service health and database connectivity.

**Endpoint:** `GET /health`

**Request:**
```bash
curl http://localhost:3002/health
```

**Response (200 OK):**
```json
{
  "status": "ok",
  "service": "zmart-event-indexer",
  "version": "1.0.0",
  "database": "connected",
  "timestamp": "2025-01-08T12:00:00.000Z"
}
```

**Response (503 Service Unavailable):**
```json
{
  "status": "degraded",
  "service": "zmart-event-indexer",
  "version": "1.0.0",
  "database": "disconnected",
  "timestamp": "2025-01-08T12:00:00.000Z"
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `status` | string | `ok` if healthy, `degraded` if issues |
| `service` | string | Service name |
| `version` | string | Service version |
| `database` | string | `connected` or `disconnected` |
| `timestamp` | string | ISO 8601 timestamp |

---

### 2. Helius Webhook

Receive Solana program events from Helius.

**Endpoint:** `POST /api/webhooks/helius`

**Headers:**
```
Content-Type: application/json
x-helius-signature: <hmac-sha256-signature>
```

**Request Body (Helius Webhook Payload):**
```json
{
  "signature": "5j7s9...",
  "slot": 123456789,
  "timestamp": 1234567890,
  "fee": 5000,
  "feePayer": "creator123...",
  "instructions": [
    {
      "programId": "7h3gXfBfYFueFVLYyfL5Qo1QGsf4GQUfW96FKVgnUsJS",
      "accounts": [
        "creator123...",
        "market456..."
      ],
      "data": "AAsAAABXaWxsIEJUQyByZWFjaCAxMDBrPw==",
      "innerInstructions": []
    }
  ],
  "accountData": [],
  "nativeTransfers": [],
  "tokenTransfers": [],
  "events": {},
  "transactionError": null,
  "type": "UNKNOWN",
  "description": "Unknown",
  "source": "HELIUS"
}
```

**Response (200 OK):**
```json
{
  "received": true,
  "eventsProcessed": 1
}
```

**Response (401 Unauthorized):**
```json
{
  "error": "Invalid signature"
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `received` | boolean | Always `true` if received |
| `eventsProcessed` | number | Number of events extracted |
| `error` | string | Error message if failed |

**Example:**
```bash
curl -X POST http://localhost:3002/api/webhooks/helius \
  -H "Content-Type: application/json" \
  -H "x-helius-signature: abc123..." \
  -d @webhook-payload.json
```

**Notes:**
- Always returns `200 OK` to prevent Helius retries
- Processing happens asynchronously
- Check logs for processing errors
- Idempotent (safe to replay)

---

### 3. Webhook Health

Check webhook endpoint specifically.

**Endpoint:** `GET /api/webhooks/health`

**Request:**
```bash
curl http://localhost:3002/api/webhooks/health
```

**Response (200 OK):**
```json
{
  "status": "ok",
  "service": "event-indexer",
  "endpoint": "webhooks",
  "timestamp": "2025-01-08T12:00:00.000Z"
}
```

---

## Event Types

The service processes **9 event types** from Solana program instructions:

### 1. MarketCreated

**Triggered:** `create_market` instruction

**Discriminator:** `0`

**Database Operations:**
- `INSERT INTO markets`
- `UPSERT INTO users` (creator)

**Data Fields:**
```typescript
{
  type: 'MarketCreated',
  marketPubkey: string,
  creator: string,
  question: string,
  description?: string,
  liquidity: string,
  initialSharesYes: string,
  initialSharesNo: string,
  txSignature: string,
  slot: number,
  timestamp: number
}
```

**Example:**
```json
{
  "type": "MarketCreated",
  "marketPubkey": "market456...",
  "creator": "creator123...",
  "question": "Will BTC reach $100k?",
  "liquidity": "1000000000",
  "initialSharesYes": "0",
  "initialSharesNo": "0",
  "txSignature": "5j7s9...",
  "slot": 123456789,
  "timestamp": 1234567890
}
```

---

### 2. TradeExecuted

**Triggered:** `buy_shares` (discriminator `1`) or `sell_shares` (discriminator `2`)

**Database Operations:**
- `INSERT INTO trades`
- `UPSERT INTO positions`
- `UPDATE users` (stats)
- `UPDATE markets` (shares)

**Data Fields:**
```typescript
{
  type: 'TradeExecuted',
  marketPubkey: string,
  trader: string,
  side: 'BUY' | 'SELL',
  outcome: 'YES' | 'NO',
  shares: string,
  cost: string,
  priceBefore: string,
  priceAfter: string,
  feeProtocol: string,
  feeCreator: string,
  feeStakers: string,
  txSignature: string,
  slot: number,
  timestamp: number
}
```

**Example:**
```json
{
  "type": "TradeExecuted",
  "marketPubkey": "market456...",
  "trader": "trader789...",
  "side": "BUY",
  "outcome": "YES",
  "shares": "10000",
  "cost": "500000000",
  "priceBefore": "450000000",
  "priceAfter": "550000000",
  "feeProtocol": "15000000",
  "feeCreator": "10000000",
  "feeStakers": "25000000",
  "txSignature": "8k3m2...",
  "slot": 123456790,
  "timestamp": 1234567891
}
```

---

### 3. MarketResolved

**Triggered:** `resolve_market` instruction

**Discriminator:** `4`

**Database Operations:**
- `UPDATE markets` (state, outcome)
- `INSERT INTO resolutions`

**Data Fields:**
```typescript
{
  type: 'MarketResolved',
  marketPubkey: string,
  resolver: string,
  outcome: 'YES' | 'NO' | 'INVALID',
  resolvingAt: number,
  disputeDeadline: number,
  txSignature: string,
  slot: number,
  timestamp: number
}
```

---

### 4. DisputeRaised

**Triggered:** `raise_dispute` instruction

**Discriminator:** `5`

**Database Operations:**
- `UPDATE markets` (state = DISPUTED)
- `UPDATE resolutions` (disputed = true)
- `INSERT INTO disputes`

**Data Fields:**
```typescript
{
  type: 'DisputeRaised',
  marketPubkey: string,
  disputer: string,
  originalOutcome: 'YES' | 'NO' | 'INVALID',
  txSignature: string,
  slot: number,
  timestamp: number
}
```

---

### 5. DisputeResolved

**Triggered:** `resolve_dispute` instruction

**Discriminator:** `6`

**Database Operations:**
- `UPDATE markets` (state = FINALIZED)
- `UPDATE resolutions` (finalized)
- `UPDATE disputes` (outcome, votes)

**Data Fields:**
```typescript
{
  type: 'DisputeResolved',
  marketPubkey: string,
  outcomeChanged: boolean,
  newOutcome?: 'YES' | 'NO' | 'INVALID',
  supportVotes: number,
  rejectVotes: number,
  txSignature: string,
  slot: number,
  timestamp: number
}
```

---

### 6. VoteSubmitted

**Triggered:** `aggregate_proposal_votes` (discriminator `8`) or `aggregate_dispute_votes` (discriminator `9`)

**Database Operations:**
- Logged only (no database writes for aggregated votes)

**Data Fields:**
```typescript
{
  type: 'VoteSubmitted',
  voteType: 'PROPOSAL' | 'DISPUTE',
  proposalId?: string,
  marketPubkey?: string,
  voter: string,
  choice: string,
  weight: number,
  txSignature: string,
  slot: number,
  timestamp: number
}
```

---

### 7. ProposalApproved

**Triggered:** `approve_proposal` instruction

**Discriminator:** `3`

**Database Operations:**
- `UPDATE proposals` (status, votes)

**Data Fields:**
```typescript
{
  type: 'ProposalApproved',
  proposalId: string,
  likes: number,
  dislikes: number,
  totalVotes: number,
  txSignature: string,
  slot: number,
  timestamp: number
}
```

---

### 8. WinningsClaimed

**Triggered:** `claim_winnings` instruction

**Discriminator:** `7`

**Database Operations:**
- `UPDATE positions` (claimed, shares)

**Data Fields:**
```typescript
{
  type: 'WinningsClaimed',
  marketPubkey: string,
  user: string,
  amount: string,
  sharesYes: string,
  sharesNo: string,
  txSignature: string,
  slot: number,
  timestamp: number
}
```

---

## Database Schema

### Tables Overview

| Table | Records | Indexed By |
|-------|---------|------------|
| `markets` | Market data | `pubkey`, `state`, `creator` |
| `trades` | Trading history | `tx_signature`, `market_pubkey`, `trader_pubkey` |
| `positions` | User holdings | `(user_pubkey, market_pubkey)` |
| `votes` | Proposal/dispute votes | `voter`, `proposal_id`, `market_pubkey` |
| `resolutions` | Market outcomes | `market_pubkey` |
| `disputes` | Dispute events | `market_pubkey`, `disputer` |
| `users` | User profiles | `wallet_address` |
| `proposals` | Market proposals | `proposal_id`, `status` |
| `events` | Raw event log | `tx_signature`, `event_type` |
| `analytics` | Aggregated metrics | `metric_type`, `metric_key` |

### Querying via Supabase REST API

**Get all active markets:**
```bash
curl "https://your-project.supabase.co/rest/v1/markets?state=eq.ACTIVE" \
  -H "apikey: your-anon-key" \
  -H "Authorization: Bearer your-anon-key"
```

**Get user positions:**
```bash
curl "https://your-project.supabase.co/rest/v1/positions?user_pubkey=eq.user123" \
  -H "apikey: your-anon-key" \
  -H "Authorization: Bearer your-anon-key"
```

**Get market trading history:**
```bash
curl "https://your-project.supabase.co/rest/v1/trades?market_pubkey=eq.market456&order=timestamp.desc&limit=100" \
  -H "apikey: your-anon-key" \
  -H "Authorization: Bearer your-anon-key"
```

---

## Error Handling

### Error Response Format

```json
{
  "error": "Error message",
  "message": "Detailed description (dev only)",
  "path": "/api/path",
  "timestamp": "2025-01-08T12:00:00.000Z"
}
```

### Common Errors

| Status | Error | Cause | Solution |
|--------|-------|-------|----------|
| 401 | Invalid signature | Webhook signature mismatch | Check `HELIUS_WEBHOOK_SECRET` |
| 404 | Not found | Invalid endpoint | Check URL path |
| 500 | Internal error | Server error | Check logs, contact support |
| 503 | Service unavailable | Database disconnected | Check Supabase status |

---

## Rate Limiting

**Current limits:**
- Webhook endpoint: 1000 requests/minute
- Health endpoint: No limit

**Rate limit headers:**
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1234567890
```

**Rate limit exceeded (429):**
```json
{
  "error": "Rate limit exceeded",
  "retryAfter": 60
}
```

---

## Webhook Security

### HMAC Signature Verification

Helius signs each webhook with HMAC SHA256.

**Verify signature:**

```typescript
import crypto from 'crypto';

function verifySignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  return signature === expectedSignature;
}
```

**Example:**
```typescript
const payload = JSON.stringify(req.body);
const signature = req.headers['x-helius-signature'];
const secret = process.env.HELIUS_WEBHOOK_SECRET;

if (!verifySignature(payload, signature, secret)) {
  return res.status(401).json({ error: 'Invalid signature' });
}
```

---

## Performance

### Response Times

| Endpoint | Target | Typical |
|----------|--------|---------|
| GET /health | <500ms | ~50ms |
| POST /api/webhooks/helius | <200ms | ~100ms |
| Database write | <50ms | ~20ms |

### Event Processing

| Metric | Target | Typical |
|--------|--------|---------|
| Webhook → Database | <5s | ~2s |
| Event parsing | <10ms | ~5ms |
| Database upsert | <50ms | ~20ms |

---

## Changelog

### Version 1.0.0 (2025-01-08)

**Added:**
- Initial release
- Health check endpoint
- Helius webhook endpoint
- Support for 9 event types
- Database integration (10 tables)
- HMAC signature verification
- Comprehensive logging
- Error handling

---

## Support

**Documentation:** https://github.com/your-org/zmartV0.69
**Issues:** https://github.com/your-org/zmartV0.69/issues
**Discord:** https://discord.gg/zmart

---

*API Documentation v1.0.0*
