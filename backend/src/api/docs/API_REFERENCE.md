# API Reference

**Version**: 0.69.0
**Last Updated**: November 9, 2025
**Base URL**: `http://localhost:4000` (development) | `https://api.yourdomain.com` (production)

Complete reference documentation for the ZMART API Gateway. All endpoints, request/response formats, error codes, and integration examples.

---

## Table of Contents

- [Authentication](#authentication)
- [Error Responses](#error-responses)
- [Markets API](#markets-api)
- [Trades API](#trades-api)
- [Votes API](#votes-api)
- [Users API](#users-api)
- [Discussions API](#discussions-api)
- [TypeScript Interfaces](#typescript-interfaces)

---

## Authentication

All authenticated endpoints require a **wallet signature** in the request.

### Authentication Header Format

```
Authorization: Signature message=<urlencoded-message>&signature=<base58-signature>&wallet=<wallet-address>
```

### Example

```typescript
const message = `Sign in to ZMART\nTimestamp: ${Date.now()}`;
const signature = await signMessage(messageBytes); // From wallet
const signatureBase58 = bs58.encode(signature);

fetch('/api/trades/buy', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Signature message=${encodeURIComponent(message)}&signature=${signatureBase58}&wallet=${publicKey.toBase58()}`
  },
  body: JSON.stringify({ ... })
});
```

### Alternative: Body Authentication

For POST requests, you can include authentication in the request body:

```json
{
  "marketId": "market-123",
  "shares": 10,
  "_auth": {
    "message": "Sign in to ZMART\nTimestamp: 1699564800",
    "signature": "5YNmS1R9nNSCDzi...",
    "wallet": "4WQwPjKHu3x7dHBE..."
  }
}
```

---

## Error Responses

All errors follow this format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": {}
  }
}
```

### HTTP Status Codes

| Code | Description | When |
|------|-------------|------|
| **200** | OK | Successful GET/DELETE |
| **201** | Created | Successful POST |
| **400** | Bad Request | Invalid input, validation failure |
| **401** | Unauthorized | Missing/invalid authentication |
| **403** | Forbidden | Authenticated but not authorized |
| **404** | Not Found | Resource doesn't exist |
| **409** | Conflict | Resource state conflict |
| **429** | Too Many Requests | Rate limit exceeded |
| **500** | Internal Server Error | Server error |
| **503** | Service Unavailable | Temporary unavailable |

---

## Rate Limits

**🔥 GAP 6 FIX**: All endpoints have rate limits to prevent abuse.

### Rate Limit Rules

| Endpoint Pattern | Limit | Window | Scope |
|-----------------|-------|--------|-------|
| `GET /api/markets` | 100 req | 1 minute | Per IP |
| `GET /api/markets/:id` | 200 req | 1 minute | Per IP |
| `GET /api/markets/:id/prices` | 200 req | 1 minute | Per IP |
| `POST /api/markets` | 10 req | 1 hour | Per wallet |
| `POST /api/trades/buy` | 20 req | 1 minute | Per wallet |
| `POST /api/trades/sell` | 20 req | 1 minute | Per wallet |
| `GET /api/trades/estimate` | 100 req | 1 minute | Per IP |
| `GET /api/trades/history` | 50 req | 1 minute | Per wallet |
| `POST /api/votes/proposal` | 10 req | 1 hour | Per wallet |
| `POST /api/votes/dispute` | 10 req | 1 hour | Per wallet |
| `GET /api/users/me` | 100 req | 1 minute | Per wallet |
| `GET /api/users/:wallet/positions` | 100 req | 1 minute | Per IP |
| `GET /api/discussions/:marketId` | 100 req | 1 minute | Per IP |
| `POST /api/discussions/:marketId` | 5 req | 1 hour | Per wallet |

### Rate Limit Headers

Every response includes rate limit headers:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1699565400
```

| Header | Description |
|--------|-------------|
| `X-RateLimit-Limit` | Maximum requests allowed in window |
| `X-RateLimit-Remaining` | Requests remaining in current window |
| `X-RateLimit-Reset` | Unix timestamp when window resets |

### 429 Too Many Requests

When rate limit is exceeded:

**Response** (429):
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Try again in 45 seconds.",
    "details": {
      "limit": 100,
      "remaining": 0,
      "resetAt": 1699565400,
      "retryAfter": 45
    }
  }
}
```

**Headers**:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1699565400
Retry-After: 45
```

### Handling Rate Limits

**Recommended Strategy**:

```typescript
async function apiRequestWithRetry(url: string, options: RequestInit, maxRetries = 3): Promise<Response> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const response = await fetch(url, options);

    if (response.status === 429) {
      const retryAfter = parseInt(response.headers.get('Retry-After') || '60', 10);
      console.log(`[API] Rate limited, retrying in ${retryAfter}s`);

      // Wait and retry
      await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
      continue;
    }

    return response;
  }

  throw new Error('Max retries exceeded');
}
```

### Best Practices

1. **Cache responses**: Don't re-fetch unchanging data
2. **Batch requests**: Use list endpoints instead of individual fetches
3. **Respect Retry-After**: Wait the specified time before retry
4. **Monitor headers**: Track remaining requests
5. **Use WebSocket**: For real-time updates instead of polling

---

## Markets API

Endpoints for creating and managing prediction markets.

---

### GET /api/markets

**List all markets** with optional filtering.

**Authentication**: None (public endpoint)

**Query Parameters**:
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `state` | string | - | Filter by market state (`PROPOSED`, `APPROVED`, `ACTIVE`, `RESOLVING`, `DISPUTED`, `FINALIZED`) |
| `category` | string | - | Filter by category (`politics`, `sports`, `crypto`, etc.) |
| `limit` | number | 20 | Max results to return (1-100) |
| `offset` | number | 0 | Pagination offset |

**Request Example**:
```bash
curl "http://localhost:4000/api/markets?state=ACTIVE&limit=10&offset=0"
```

**Response** (200 OK):
```json
{
  "markets": [
    {
      "id": "market-123",
      "on_chain_address": "7h3gXfBfYFueFVLYyfL5Qo1QGsf4GQUfW96FKVgnUsJS",
      "question": "Will Bitcoin reach $100k by end of 2025?",
      "description": "Market resolves YES if BTC >= $100k on Dec 31, 2025.",
      "category": "crypto",
      "state": "ACTIVE",
      "creator_wallet": "4WQwPjKHu3x7dHBEehBDgxXHJQoDuBvj6Xhu6C1jjTye",
      "b_parameter": 1000,
      "yes_shares": 500,
      "no_shares": 500,
      "total_volume": 10000,
      "created_at": "2025-11-01T00:00:00Z",
      "activated_at": "2025-11-02T00:00:00Z",
      "resolution_proposed_at": null,
      "finalized_at": null,
      "proposed_outcome": null,
      "final_outcome": null
    }
  ],
  "count": 10,
  "offset": 0,
  "limit": 10
}
```

**JavaScript Example**:
```typescript
const response = await fetch('http://localhost:4000/api/markets?state=ACTIVE&limit=10');
const { markets, count } = await response.json();
console.log(`Found ${count} active markets`);
```

**Errors**:
- `500 INTERNAL_SERVER_ERROR` - Database query failed

---

### GET /api/markets/:id

**Get market details** by ID.

**Authentication**: None (public endpoint)

**Path Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Market ID (UUID or on-chain address) |

**Request Example**:
```bash
curl "http://localhost:4000/api/markets/market-123"
```

**Response** (200 OK):
```json
{
  "id": "market-123",
  "on_chain_address": "7h3gXfBfYFueFVLYyfL5Qo1QGsf4GQUfW96FKVgnUsJS",
  "question": "Will Bitcoin reach $100k by end of 2025?",
  "description": "Market resolves YES if BTC >= $100k on Dec 31, 2025 UTC.",
  "category": "crypto",
  "state": "ACTIVE",
  "creator_wallet": "4WQwPjKHu3x7dHBEehBDgxXHJQoDuBvj6Xhu6C1jjTye",
  "b_parameter": 1000,
  "yes_shares": 520,
  "no_shares": 480,
  "total_volume": 15000,
  "created_at": "2025-11-01T00:00:00Z",
  "activated_at": "2025-11-02T00:00:00Z"
}
```

**JavaScript Example**:
```typescript
const response = await fetch(`http://localhost:4000/api/markets/${marketId}`);
const market = await response.json();
console.log(market.question);
```

**Errors**:
- `404 NOT_FOUND` - Market doesn't exist
- `500 INTERNAL_SERVER_ERROR` - Database query failed

---

### GET /api/markets/:id/prices

**Get current LMSR prices** for YES and NO shares.

**Authentication**: None (public endpoint)

**Path Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Market ID |

**Request Example**:
```bash
curl "http://localhost:4000/api/markets/market-123/prices"
```

**Response** (200 OK):
```json
{
  "marketId": "market-123",
  "priceYes": 0.52,
  "priceNo": 0.48,
  "totalShares": 1000,
  "bParameter": 1000,
  "timestamp": "2025-11-09T12:00:00Z"
}
```

**Calculation**:
```
P(YES) = e^(q_yes/b) / (e^(q_yes/b) + e^(q_no/b))
P(NO) = 1 - P(YES)
```

**JavaScript Example**:
```typescript
const response = await fetch(`http://localhost:4000/api/markets/${marketId}/prices`);
const { priceYes, priceNo } = await response.json();
console.log(`YES: ${(priceYes * 100).toFixed(1)}%, NO: ${(priceNo * 100).toFixed(1)}%`);
```

**Errors**:
- `404 NOT_FOUND` - Market doesn't exist

---

### POST /api/markets

**Create a new market** (proposal).

**Authentication**: **Required**

**Request Body**:
```json
{
  "question": "Will Bitcoin reach $100k by end of 2025?",
  "description": "Market resolves YES if BTC >= $100k on Dec 31, 2025 UTC.",
  "category": "crypto",
  "b_parameter": 1000
}
```

**Request Example**:
```bash
curl -X POST "http://localhost:4000/api/markets" \
  -H "Content-Type: application/json" \
  -H "Authorization: Signature message=...&signature=...&wallet=..." \
  -d '{
    "question": "Will Bitcoin reach $100k by end of 2025?",
    "description": "Market resolves YES if BTC >= $100k on Dec 31, 2025 UTC.",
    "category": "crypto",
    "b_parameter": 1000
  }'
```

**Response** (201 Created):
```json
{
  "message": "Market created successfully",
  "market": {
    "id": "market-456",
    "on_chain_address": "9h4gXfBfYFueFVLYyfL5Qo1QGsf4GQUfW96FKVgnXyZt",
    "question": "Will Bitcoin reach $100k by end of 2025?",
    "description": "Market resolves YES if BTC >= $100k on Dec 31, 2025 UTC.",
    "category": "crypto",
    "state": "PROPOSED",
    "creator_wallet": "4WQwPjKHu3x7dHBEehBDgxXHJQoDuBvj6Xhu6C1jjTye",
    "b_parameter": 1000,
    "created_at": "2025-11-09T12:00:00Z"
  },
  "transactionSignature": "5YNmS1R9nNSCDzivdhG4t4JZxKS6yhZBbHf3z6FVMnVPmZJrPG7..."
}
```

**JavaScript Example**:
```typescript
const response = await fetch('http://localhost:4000/api/markets', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': authHeader
  },
  body: JSON.stringify({
    question: 'Will Bitcoin reach $100k by end of 2025?',
    description: 'Market resolves YES if BTC >= $100k on Dec 31, 2025 UTC.',
    category: 'crypto',
    b_parameter: 1000
  })
});
const { market, transactionSignature } = await response.json();
```

**Validation Rules**:
- `question`: Required, 10-200 characters
- `description`: Required, 50-2000 characters
- `category`: Required, one of: `politics`, `sports`, `crypto`, `technology`, `entertainment`, `other`
- `b_parameter`: Required, number > 0 (liquidity parameter)

**Errors**:
- `400 VALIDATION_ERROR` - Invalid input
- `401 UNAUTHORIZED` - Missing authentication
- `500 INTERNAL_SERVER_ERROR` - On-chain transaction failed

---

## Trades API

Execute buy/sell trades on active markets.

---

### POST /api/trades/buy

**Buy shares** on an active market (on-chain transaction).

**Authentication**: **Required**

**Request Body**:
```json
{
  "market_id": "market-123",
  "outcome": true,
  "shares": 10,
  "max_cost": 52000000
}
```

**Field Descriptions**:
| Field | Type | Description |
|-------|------|-------------|
| `market_id` | string | Market ID |
| `outcome` | boolean | `true` for YES, `false` for NO |
| `shares` | number | Number of shares to buy (integer > 0) |
| `max_cost` | number | Maximum lamports willing to pay (slippage protection) |

**Request Example**:
```bash
curl -X POST "http://localhost:4000/api/trades/buy" \
  -H "Content-Type: application/json" \
  -H "Authorization: Signature ..." \
  -d '{
    "market_id": "market-123",
    "outcome": true,
    "shares": 10,
    "max_cost": 52000000
  }'
```

**Response** (201 Created):
```json
{
  "message": "Buy trade executed successfully",
  "trade": {
    "id": "trade-789",
    "market_id": "market-123",
    "user_wallet": "4WQwPjKHu3x7dHBEehBDgxXHJQoDuBvj6Xhu6C1jjTye",
    "trade_type": "buy",
    "outcome": true,
    "shares": "10",
    "cost": "50000000",
    "created_at": "2025-11-09T12:00:00Z"
  },
  "transactionSignature": "3ZNmS1R9nNSCDzivdhG4t4JZxKS6yhZBbHf3z6FVMnVPmZJrPG8..."
}
```

**JavaScript Example**:
```typescript
const response = await fetch('http://localhost:4000/api/trades/buy', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': authHeader
  },
  body: JSON.stringify({
    market_id: 'market-123',
    outcome: true,
    shares: 10,
    max_cost: 52000000 // 0.052 SOL in lamports
  })
});
const { trade, transactionSignature } = await response.json();
```

**Errors**:
- `400 VALIDATION_ERROR` - Invalid shares or max_cost
- `400 BAD_REQUEST` - Market not ACTIVE
- `401 UNAUTHORIZED` - Missing authentication
- `404 NOT_FOUND` - Market doesn't exist
- `500 INTERNAL_SERVER_ERROR` - On-chain transaction failed

---

### POST /api/trades/sell

**Sell shares** on an active market (on-chain transaction).

**Authentication**: **Required**

**Request Body**:
```json
{
  "market_id": "market-123",
  "outcome": true,
  "shares": 5,
  "min_payout": 48000000
}
```

**Field Descriptions**:
| Field | Type | Description |
|-------|------|-------------|
| `market_id` | string | Market ID |
| `outcome` | boolean | `true` for YES shares, `false` for NO shares |
| `shares` | number | Number of shares to sell (integer > 0) |
| `min_payout` | number | Minimum lamports to receive (slippage protection) |

**Request Example**:
```bash
curl -X POST "http://localhost:4000/api/trades/sell" \
  -H "Content-Type: application/json" \
  -H "Authorization: Signature ..." \
  -d '{
    "market_id": "market-123",
    "outcome": true,
    "shares": 5,
    "min_payout": 48000000
  }'
```

**Response** (201 Created):
```json
{
  "message": "Sell trade executed successfully",
  "trade": {
    "id": "trade-790",
    "market_id": "market-123",
    "user_wallet": "4WQwPjKHu3x7dHBEehBDgxXHJQoDuBvj6Xhu6C1jjTye",
    "trade_type": "sell",
    "outcome": true,
    "shares": "5",
    "payout": "49000000",
    "created_at": "2025-11-09T12:05:00Z"
  },
  "transactionSignature": "4ANmS1R9nNSCDzivdhG4t4JZxKS6yhZBbHf3z6FVMnVPmZJrPG9..."
}
```

**JavaScript Example**:
```typescript
const response = await fetch('http://localhost:4000/api/trades/sell', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': authHeader
  },
  body: JSON.stringify({
    market_id: 'market-123',
    outcome: true,
    shares: 5,
    min_payout: 48000000 // 0.048 SOL in lamports
  })
});
const { trade, transactionSignature } = await response.json();
```

**Errors**:
- `400 VALIDATION_ERROR` - Invalid shares or min_payout
- `400 BAD_REQUEST` - Market not ACTIVE or insufficient shares
- `401 UNAUTHORIZED` - Missing authentication
- `404 NOT_FOUND` - Market doesn't exist
- `500 INTERNAL_SERVER_ERROR` - On-chain transaction failed

---

### GET /api/trades/estimate

**Estimate trade cost** before execution (dry-run).

**Authentication**: None (public endpoint)

**Query Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `market_id` | string | Market ID |
| `trade_type` | string | `buy` or `sell` |
| `outcome` | boolean | `true` for YES, `false` for NO |
| `shares` | number | Number of shares |

**Request Example**:
```bash
curl "http://localhost:4000/api/trades/estimate?market_id=market-123&trade_type=buy&outcome=true&shares=10"
```

**Response** (200 OK):
```json
{
  "marketId": "market-123",
  "tradeType": "buy",
  "outcome": true,
  "shares": 10,
  "estimatedCost": 50123456,
  "pricePerShare": 5012345,
  "newPriceYes": 0.525,
  "newPriceNo": 0.475,
  "priceImpact": 0.005,
  "timestamp": "2025-11-09T12:00:00Z"
}
```

**JavaScript Example**:
```typescript
const params = new URLSearchParams({
  market_id: 'market-123',
  trade_type: 'buy',
  outcome: 'true',
  shares: '10'
});

const response = await fetch(`http://localhost:4000/api/trades/estimate?${params}`);
const { estimatedCost, priceImpact } = await response.json();
console.log(`Cost: ${estimatedCost} lamports, Impact: ${(priceImpact * 100).toFixed(2)}%`);
```

**Errors**:
- `400 VALIDATION_ERROR` - Invalid parameters
- `404 NOT_FOUND` - Market doesn't exist

---

### GET /api/trades/history

**Get user's trade history**.

**Authentication**: **Required**

**Query Parameters**:
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `market_id` | string | - | Filter by market (optional) |
| `limit` | number | 20 | Max results (1-100) |
| `offset` | number | 0 | Pagination offset |

**Request Example**:
```bash
curl "http://localhost:4000/api/trades/history?limit=10" \
  -H "Authorization: Signature ..."
```

**Response** (200 OK):
```json
{
  "trades": [
    {
      "id": "trade-789",
      "market_id": "market-123",
      "trade_type": "buy",
      "outcome": true,
      "shares": "10",
      "cost": "50000000",
      "created_at": "2025-11-09T12:00:00Z"
    },
    {
      "id": "trade-790",
      "market_id": "market-123",
      "trade_type": "sell",
      "outcome": true,
      "shares": "5",
      "payout": "49000000",
      "created_at": "2025-11-09T12:05:00Z"
    }
  ],
  "count": 2,
  "offset": 0,
  "limit": 10
}
```

**JavaScript Example**:
```typescript
const response = await fetch('http://localhost:4000/api/trades/history?limit=10', {
  headers: { 'Authorization': authHeader }
});
const { trades, count } = await response.json();
```

**Errors**:
- `401 UNAUTHORIZED` - Missing authentication

---

## Votes API

Submit proposal and dispute votes.

---

### POST /api/votes/proposal

**Submit proposal vote** (like/dislike).

**Authentication**: **Required**

**Request Body**:
```json
{
  "market_id": "market-123",
  "vote": true
}
```

**Field Descriptions**:
| Field | Type | Description |
|-------|------|-------------|
| `market_id` | string | Market ID (must be in PROPOSED state) |
| `vote` | boolean | `true` = like (approve), `false` = dislike (reject) |

**Request Example**:
```bash
curl -X POST "http://localhost:4000/api/votes/proposal" \
  -H "Content-Type: application/json" \
  -H "Authorization: Signature ..." \
  -d '{
    "market_id": "market-123",
    "vote": true
  }'
```

**Response** (201 Created):
```json
{
  "message": "Proposal vote submitted successfully",
  "vote": {
    "id": "vote-456",
    "market_id": "market-123",
    "user_wallet": "4WQwPjKHu3x7dHBEehBDgxXHJQoDuBvj6Xhu6C1jjTye",
    "vote": true,
    "created_at": "2025-11-09T12:00:00Z"
  }
}
```

**JavaScript Example**:
```typescript
const response = await fetch('http://localhost:4000/api/votes/proposal', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': authHeader
  },
  body: JSON.stringify({
    market_id: 'market-123',
    vote: true // Like = approve market
  })
});
```

**Errors**:
- `400 VALIDATION_ERROR` - Invalid vote
- `400 BAD_REQUEST` - Already voted or market not in PROPOSED state
- `401 UNAUTHORIZED` - Missing authentication
- `404 NOT_FOUND` - Market doesn't exist

---

### POST /api/votes/dispute

**Submit dispute vote** (agree/disagree with proposed outcome).

**Authentication**: **Required**

**Request Body**:
```json
{
  "market_id": "market-123",
  "vote": true
}
```

**Field Descriptions**:
| Field | Type | Description |
|-------|------|-------------|
| `market_id` | string | Market ID (must be in DISPUTED state) |
| `vote` | boolean | `true` = agree with dispute (overturn outcome), `false` = disagree (keep original) |

**Request Example**:
```bash
curl -X POST "http://localhost:4000/api/votes/dispute" \
  -H "Content-Type: application/json" \
  -H "Authorization: Signature ..." \
  -d '{
    "market_id": "market-123",
    "vote": true
  }'
```

**Response** (201 Created):
```json
{
  "message": "Dispute vote submitted successfully",
  "vote": {
    "id": "vote-457",
    "market_id": "market-123",
    "user_wallet": "4WQwPjKHu3x7dHBEehBDgxXHJQoDuBvj6Xhu6C1jjTye",
    "vote": true,
    "created_at": "2025-11-09T12:00:00Z"
  }
}
```

**JavaScript Example**:
```typescript
const response = await fetch('http://localhost:4000/api/votes/dispute', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': authHeader
  },
  body: JSON.stringify({
    market_id: 'market-123',
    vote: true // Agree with dispute = overturn original outcome
  })
});
```

**Errors**:
- `400 VALIDATION_ERROR` - Invalid vote
- `400 BAD_REQUEST` - Already voted or market not in DISPUTED state
- `401 UNAUTHORIZED` - Missing authentication
- `404 NOT_FOUND` - Market doesn't exist

---

## Users API

User profiles and positions.

---

### GET /api/users/me

**Get current user profile**.

**Authentication**: **Required**

**Request Example**:
```bash
curl "http://localhost:4000/api/users/me" \
  -H "Authorization: Signature ..."
```

**Response** (200 OK):
```json
{
  "wallet": "4WQwPjKHu3x7dHBEehBDgxXHJQoDuBvj6Xhu6C1jjTye",
  "created_at": "2025-11-01T00:00:00Z",
  "total_trades": 25,
  "total_volume": 1500000000,
  "markets_created": 3,
  "markets_won": 5,
  "reputation_score": 85
}
```

**JavaScript Example**:
```typescript
const response = await fetch('http://localhost:4000/api/users/me', {
  headers: { 'Authorization': authHeader }
});
const user = await response.json();
console.log(`Reputation: ${user.reputation_score}`);
```

**Errors**:
- `401 UNAUTHORIZED` - Missing authentication

---

### GET /api/users/:wallet/positions

**Get user's positions** across all markets.

**Authentication**: None (public endpoint)

**Path Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `wallet` | string | User wallet address |

**Query Parameters**:
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `market_id` | string | - | Filter by market (optional) |
| `limit` | number | 20 | Max results |
| `offset` | number | 0 | Pagination offset |

**Request Example**:
```bash
curl "http://localhost:4000/api/users/4WQwPjKHu3x7dHBEehBDgxXHJQoDuBvj6Xhu6C1jjTye/positions"
```

**Response** (200 OK):
```json
{
  "positions": [
    {
      "market_id": "market-123",
      "user_wallet": "4WQwPjKHu3x7dHBEehBDgxXHJQoDuBvj6Xhu6C1jjTye",
      "yes_shares": "15",
      "no_shares": "0",
      "total_invested": "750000000",
      "current_value": "780000000",
      "profit_loss": "30000000",
      "last_updated": "2025-11-09T12:00:00Z"
    }
  ],
  "count": 1,
  "offset": 0,
  "limit": 20
}
```

**JavaScript Example**:
```typescript
const wallet = publicKey.toBase58();
const response = await fetch(`http://localhost:4000/api/users/${wallet}/positions`);
const { positions } = await response.json();
```

**Errors**:
- `404 NOT_FOUND` - User has no positions

---

## Discussions API

Market comment threads.

---

### GET /api/discussions/:marketId

**Get discussion comments** for a market.

**Authentication**: None (public endpoint)

**Path Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `marketId` | string | Market ID |

**Query Parameters**:
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | number | 50 | Max comments to return |
| `offset` | number | 0 | Pagination offset |

**Request Example**:
```bash
curl "http://localhost:4000/api/discussions/market-123?limit=20"
```

**Response** (200 OK):
```json
{
  "comments": [
    {
      "id": "comment-789",
      "market_id": "market-123",
      "user_wallet": "4WQwPjKHu3x7dHBEehBDgxXHJQoDuBvj6Xhu6C1jjTye",
      "content": "This market seems overvalued based on current trends.",
      "created_at": "2025-11-09T12:00:00Z",
      "updated_at": "2025-11-09T12:00:00Z"
    }
  ],
  "count": 1,
  "offset": 0,
  "limit": 20
}
```

**JavaScript Example**:
```typescript
const response = await fetch(`http://localhost:4000/api/discussions/${marketId}?limit=20`);
const { comments, count } = await response.json();
```

**Errors**:
- `404 NOT_FOUND` - Market doesn't exist

---

### POST /api/discussions/:marketId

**Post a comment** on a market.

**Authentication**: **Required**

**Path Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `marketId` | string | Market ID |

**Request Body**:
```json
{
  "content": "This market seems overvalued based on current trends."
}
```

**Field Descriptions**:
| Field | Type | Description |
|-------|------|-------------|
| `content` | string | Comment content (10-1000 characters) |

**Request Example**:
```bash
curl -X POST "http://localhost:4000/api/discussions/market-123" \
  -H "Content-Type: application/json" \
  -H "Authorization: Signature ..." \
  -d '{
    "content": "This market seems overvalued based on current trends."
  }'
```

**Response** (201 Created):
```json
{
  "message": "Comment posted successfully",
  "comment": {
    "id": "comment-789",
    "market_id": "market-123",
    "user_wallet": "4WQwPjKHu3x7dHBEehBDgxXHJQoDuBvj6Xhu6C1jjTye",
    "content": "This market seems overvalued based on current trends.",
    "created_at": "2025-11-09T12:00:00Z"
  }
}
```

**JavaScript Example**:
```typescript
const response = await fetch(`http://localhost:4000/api/discussions/${marketId}`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': authHeader
  },
  body: JSON.stringify({
    content: 'This market seems overvalued based on current trends.'
  })
});
```

**Validation Rules**:
- `content`: Required, 10-1000 characters
- Rate limit: 10 comments/hour per user

**Errors**:
- `400 VALIDATION_ERROR` - Invalid content
- `401 UNAUTHORIZED` - Missing authentication
- `404 NOT_FOUND` - Market doesn't exist
- `429 RATE_LIMIT_EXCEEDED` - Too many comments

---

## Events API (Polling Fallback)

**🔥 GAP 8 FIX**: Fallback endpoint when WebSocket unavailable.

---

### GET /api/events/latest

**Get latest events** for polling fallback when WebSocket is unavailable or unreliable.

**Authentication**: None (public endpoint)

**Query Parameters**:
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `market_id` | string | - | Filter events by specific market (optional) |
| `since` | number | - | Unix timestamp in milliseconds (get events after this time) |
| `limit` | number | 50 | Max events to return (1-100) |
| `types` | string | - | Comma-separated event types: `trade,vote,market_state,discussion` |

**Request Example**:
```bash
# Get all recent events
curl "http://localhost:4000/api/events/latest?limit=20"

# Get events for specific market since timestamp
curl "http://localhost:4000/api/events/latest?market_id=market-123&since=1699564800000"

# Get only trade events
curl "http://localhost:4000/api/events/latest?types=trade&limit=10"
```

**Response** (200 OK):
```json
{
  "events": [
    {
      "type": "trade",
      "market_id": "market-123",
      "timestamp": "2025-11-09T12:05:00Z",
      "data": {
        "trade_type": "buy",
        "outcome": true,
        "shares": "10",
        "cost": "50000000",
        "user_wallet": "4WQwPjKHu3x7dHBEehBDgxXHJQoDuBvj6Xhu6C1jjTye"
      }
    },
    {
      "type": "vote",
      "market_id": "market-123",
      "timestamp": "2025-11-09T12:03:00Z",
      "data": {
        "vote_type": "proposal",
        "vote": true,
        "user_wallet": "5XQwPjKHu3x7dHBEehBDgxXHJQoDuBvj6Xhu6C1jjUzF"
      }
    }
  ],
  "count": 2,
  "since": 1699564800000,
  "limit": 50,
  "timestamp": 1699565100000
}
```

**Event Types**:
- `trade`: Buy/sell trade executed
- `vote`: Proposal or dispute vote submitted
- `market_state`: Market state changed
- `discussion`: New comment posted

**JavaScript Example (Polling Strategy)**:
```typescript
class EventPoller {
  private lastTimestamp: number = Date.now();
  private intervalId: NodeJS.Timeout | null = null;

  start(marketId: string, pollInterval: number = 5000) {
    this.intervalId = setInterval(async () => {
      try {
        const params = new URLSearchParams({
          market_id: marketId,
          since: this.lastTimestamp.toString(),
          limit: '50',
        });

        const response = await fetch(`http://localhost:4000/api/events/latest?${params}`);
        const { events, timestamp } = await response.json();

        if (events.length > 0) {
          console.log('New events:', events);
          this.handleEvents(events);
        }

        // Update last timestamp
        this.lastTimestamp = timestamp;
      } catch (error) {
        console.error('Polling failed:', error);
      }
    }, pollInterval);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private handleEvents(events: any[]) {
    events.forEach(event => {
      switch (event.type) {
        case 'trade':
          console.log('New trade:', event.data);
          break;
        case 'vote':
          console.log('New vote:', event.data);
          break;
        // ... handle other event types
      }
    });
  }
}

// Usage
const poller = new EventPoller();
poller.start('market-123', 5000); // Poll every 5 seconds

// Stop when component unmounts
poller.stop();
```

**React Hook (WebSocket with Polling Fallback)**:
```typescript
import { useEffect, useState } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';

function useEventsWithFallback(marketId: string) {
  const { isConnected, error } = useWebSocket();
  const [events, setEvents] = useState<any[]>([]);
  const [usingFallback, setUsingFallback] = useState(false);

  useEffect(() => {
    // Use WebSocket if connected
    if (isConnected) {
      setUsingFallback(false);
      return;
    }

    // Fall back to polling if WebSocket unavailable
    if (error) {
      console.log('[Events] WebSocket unavailable, using polling fallback');
      setUsingFallback(true);

      let lastTimestamp = Date.now();

      const interval = setInterval(async () => {
        try {
          const params = new URLSearchParams({
            market_id: marketId,
            since: lastTimestamp.toString(),
          });

          const response = await fetch(`/api/events/latest?${params}`);
          const { events: newEvents, timestamp } = await response.json();

          if (newEvents.length > 0) {
            setEvents(prev => [...newEvents, ...prev].slice(0, 100));
          }

          lastTimestamp = timestamp;
        } catch (err) {
          console.error('[Events] Polling failed:', err);
        }
      }, 5000); // Poll every 5 seconds

      return () => clearInterval(interval);
    }
  }, [isConnected, error, marketId]);

  return { events, usingFallback };
}
```

**Performance Comparison**:
| Method | Latency | Server Load | Recommended |
|--------|---------|-------------|-------------|
| **WebSocket** | <100ms | Low | ✅ Primary |
| **Polling (5s)** | ~2.5s avg | Medium | ⚠️ Fallback only |
| **Polling (30s)** | ~15s avg | Low | ❌ Too slow |

**Best Practices**:
1. **Use WebSocket first** - Only fall back to polling if WebSocket fails
2. **Poll every 5-10 seconds** - Balance between latency and server load
3. **Stop polling when WebSocket reconnects** - Avoid duplicate events
4. **Limit event history** - Only keep last 100 events in memory
5. **Handle duplicates** - Events may appear in both WebSocket and polling

**Errors**:
- `400 VALIDATION_ERROR` - Invalid parameters
- `404 NOT_FOUND` - Market doesn't exist
- `500 INTERNAL_SERVER_ERROR` - Database query failed

---

## TypeScript Interfaces

### 🔥 GAP 7 FIX: Field Type Consistency Rules

**Why Some Fields Are Strings:**

| Field Type | Data Type | Reason |
|-----------|-----------|--------|
| **Trade amounts** (`shares`, `cost`, `payout`) | `string` (BigInt) | Can exceed `Number.MAX_SAFE_INTEGER` (2^53-1) |
| **Position amounts** (`total_invested`, `current_value`, `profit_loss`) | `string` (BigInt) | Large cumulative values |
| **Market totals** (`yes_shares`, `no_shares`, `total_volume`) | `number` | Aggregate values always < 2^53 |
| **Parameters** (`b_parameter`, `limit`, `offset`) | `number` | Configuration values, always small |
| **Prices** (`priceYes`, `priceNo`) | `number` (0-1) | Probabilities, always between 0 and 1 |

**Rule of Thumb**:
- **String**: Individual trade/position amounts (can be huge)
- **Number**: Aggregated totals, prices, parameters (always safe)

**Example**:
```typescript
interface Trade {
  shares: string;  // ✅ String: "999999999999999999" (can be massive)
  cost: string;    // ✅ String: On-chain uses u64 (BigInt)
}

interface Market {
  yes_shares: number;  // ✅ Number: Sum of all trades (< 2^53 in practice)
  no_shares: number;   // ✅ Number: Always fits in safe integer range
}
```

**Converting String to Number**:
```typescript
import { parseLamports } from '@/utils/solana';

const trade = { shares: "999999999999" };
const sharesNum = parseLamports(trade.shares); // Safe conversion with warning if needed
```

### Market

```typescript
interface Market {
  id: string;
  on_chain_address: string;
  question: string;
  description: string;
  category: 'politics' | 'sports' | 'crypto' | 'technology' | 'entertainment' | 'other';
  state: 'PROPOSED' | 'APPROVED' | 'ACTIVE' | 'RESOLVING' | 'DISPUTED' | 'FINALIZED';
  creator_wallet: string;
  b_parameter: number;
  yes_shares: number;
  no_shares: number;
  total_volume: number;
  created_at: string; // ISO 8601
  activated_at: string | null;
  resolution_proposed_at: string | null;
  finalized_at: string | null;
  proposed_outcome: boolean | null;
  final_outcome: boolean | null;
}
```

### Trade

```typescript
interface Trade {
  id: string;
  market_id: string;
  user_wallet: string;
  trade_type: 'buy' | 'sell';
  outcome: boolean;
  shares: string; // BigInt as string
  cost?: string; // For buy trades
  payout?: string; // For sell trades
  created_at: string;
}
```

### Vote

```typescript
interface ProposalVote {
  id: string;
  market_id: string;
  user_wallet: string;
  vote: boolean; // true = like, false = dislike
  created_at: string;
}

interface DisputeVote {
  id: string;
  market_id: string;
  user_wallet: string;
  vote: boolean; // true = agree, false = disagree
  created_at: string;
}
```

### User

```typescript
interface User {
  wallet: string;
  created_at: string;
  total_trades: number;
  total_volume: number;
  markets_created: number;
  markets_won: number;
  reputation_score: number;
}
```

### Position

```typescript
interface Position {
  market_id: string;
  user_wallet: string;
  yes_shares: string;
  no_shares: string;
  total_invested: string;
  current_value: string;
  profit_loss: string;
  last_updated: string;
}
```

### Comment

```typescript
interface Comment {
  id: string;
  market_id: string;
  user_wallet: string;
  content: string;
  created_at: string;
  updated_at: string;
}
```

### Error Response

```typescript
interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
}
```

---

## Complete Integration Example

```typescript
// 1. Setup
import { useWallet } from '@solana/wallet-adapter-react';
import bs58 from 'bs58';

const API_BASE = 'http://localhost:4000';

// 2. Authentication Helper
async function getAuthHeader(publicKey, signMessage) {
  const message = `Sign in to ZMART\nTimestamp: ${Date.now()}`;
  const messageBytes = new TextEncoder().encode(message);
  const signature = await signMessage(messageBytes);
  const signatureBase58 = bs58.encode(signature);

  return `Signature message=${encodeURIComponent(message)}&signature=${signatureBase58}&wallet=${publicKey.toBase58()}`;
}

// 3. List Active Markets
async function listActiveMarkets() {
  const response = await fetch(`${API_BASE}/api/markets?state=ACTIVE&limit=10`);
  const { markets } = await response.json();
  return markets;
}

// 4. Buy Shares
async function buyShares(marketId, shares, maxCost, authHeader) {
  const response = await fetch(`${API_BASE}/api/trades/buy`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': authHeader
    },
    body: JSON.stringify({
      market_id: marketId,
      outcome: true,
      shares,
      max_cost: maxCost
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error.message);
  }

  return await response.json();
}

// 5. Submit Proposal Vote
async function voteOnProposal(marketId, vote, authHeader) {
  const response = await fetch(`${API_BASE}/api/votes/proposal`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': authHeader
    },
    body: JSON.stringify({
      market_id: marketId,
      vote
    })
  });

  return await response.json();
}

// 6. Get User Positions
async function getUserPositions(wallet) {
  const response = await fetch(`${API_BASE}/api/users/${wallet}/positions`);
  const { positions } = await response.json();
  return positions;
}
```

---

**Last Updated**: November 9, 2025
**Version**: 0.69.0
**Base URL**: `http://localhost:4000` (development)
**Status**: Production Ready
