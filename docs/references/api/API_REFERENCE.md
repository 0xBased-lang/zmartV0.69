# API_REFERENCE.md - Complete API Endpoint Reference

**Category:** API Reference
**Tags:** [api, rest, websocket, endpoints, http]
**Last Updated:** 2025-11-09 01:30 PST

---

## Quick Links

- ⬆️ [Back to CLAUDE.md](../../../CLAUDE.md)
- 🔗 [Integration Map](../architecture/INTEGRATION_MAP.md)
- 🔄 [Data Flow](../architecture/DATA_FLOW.md)
- 🔧 [Backend Reference](../components/BACKEND_REFERENCE.md)

---

## 🎯 Purpose

**Complete reference for all API endpoints** - REST, WebSocket, authentication, rate limits, and error codes.

---

## 🌐 REST API Endpoints

### Base URL

```
Development: http://localhost:4000
Production: https://api.zmart.io (future)
```

### Authentication

**Method:** JWT Bearer Token (SIWE - Sign-In with Ethereum)

**Headers:**
```http
Authorization: Bearer {jwt_token}
Content-Type: application/json
```

**Token Lifetime:** 1 hour
**Refresh:** Automatic silent refresh before expiry

---

### Markets API

#### GET /api/markets

**Description:** List all markets with pagination

**Authentication:** Optional (public data)

**Query Parameters:**
```typescript
{
  page?: number;        // Default: 1
  limit?: number;       // Default: 20, Max: 100
  state?: string;       // Filter: PROPOSED, APPROVED, ACTIVE, RESOLVING, DISPUTED, FINALIZED
  sort?: string;        // Default: created_at, Options: created_at, end_time, liquidity
  order?: string;       // Default: desc, Options: asc, desc
}
```

**Response 200:**
```json
{
  "data": [
    {
      "market_id": "7h3gXfBfYFueFVLYyfL5Qo1QGsf4GQUfW96FKVgnUsJS",
      "creator": "5KQwnSGLt4kxGRDY8pLmGz7LbUGJH5rZ9Y4vCx3PqJK2",
      "question": "Will Bitcoin reach $100k by end of 2025?",
      "description": "Market resolves YES if...",
      "end_time": "2025-12-31T23:59:59Z",
      "state": "ACTIVE",
      "shares_yes": 69300000000,
      "shares_no": 69300000000,
      "liquidity": 100000000000,
      "liquidity_parameter": 100000000000,
      "price_yes": 0.50,
      "price_no": 0.50,
      "total_trades": 0,
      "total_volume": 0,
      "created_at": "2025-11-09T00:00:00Z",
      "updated_at": "2025-11-09T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 42,
    "pages": 3
  }
}
```

**Error Responses:**
- 400: Invalid query parameters
- 500: Server error

---

#### GET /api/markets/:id

**Description:** Get single market details

**Authentication:** Optional

**Path Parameters:**
```typescript
{
  id: string; // Market public key (base58)
}
```

**Response 200:**
```json
{
  "market_id": "7h3g...",
  "creator": "5KQw...",
  "question": "Will Bitcoin reach $100k by end of 2025?",
  "description": "Full description...",
  "end_time": "2025-12-31T23:59:59Z",
  "state": "ACTIVE",
  "shares_yes": 69300000000,
  "shares_no": 69300000000,
  "liquidity": 100000000000,
  "liquidity_parameter": 100000000000,
  "price_yes": 0.50,
  "price_no": 0.50,
  "total_trades": 0,
  "total_volume": 0,
  "total_fees_collected": 0,
  "protocol_fees": 0,
  "creator_fees": 0,
  "staker_fees": 0,
  "final_result": null,
  "result_submitted_at": null,
  "resolution_start": null,
  "finalized_at": null,
  "claims_enabled": false,
  "total_claimed": 0,
  "claims_processed": 0,
  "created_at": "2025-11-09T00:00:00Z",
  "updated_at": "2025-11-09T00:00:00Z",
  "transaction_signature": "5j7s8k9l..."
}
```

**Error Responses:**
- 404: Market not found
- 500: Server error

---

### Trades API

#### GET /api/trades/:marketId

**Description:** Get trade history for market

**Authentication:** Optional

**Path Parameters:**
```typescript
{
  marketId: string; // Market public key
}
```

**Query Parameters:**
```typescript
{
  page?: number;    // Default: 1
  limit?: number;   // Default: 50, Max: 200
  outcome?: string; // Filter: YES, NO
}
```

**Response 200:**
```json
{
  "data": [
    {
      "trade_id": "uuid-v4",
      "market_id": "7h3g...",
      "trader": "5KQw...",
      "outcome": "YES",
      "shares_amount": 10000000000,
      "cost": 595358023,
      "fees": 54123456,
      "price": 0.53,
      "transaction_signature": "3a5b...",
      "created_at": "2025-11-09T00:05:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 237,
    "pages": 5
  }
}
```

**Error Responses:**
- 404: Market not found
- 500: Server error

---

### Votes API

#### POST /api/votes/proposal

**Description:** Submit proposal vote (off-chain)

**Authentication:** Required

**Request Body:**
```json
{
  "market_id": "7h3g...",
  "vote_type": "like" | "dislike"
}
```

**Response 201:**
```json
{
  "success": true,
  "vote_id": "uuid-v4",
  "aggregated": false,
  "next_aggregation": "2025-11-09T01:00:00Z"
}
```

**Error Responses:**
- 400: Invalid request body
- 401: Unauthorized (missing/invalid token)
- 403: Already voted
- 404: Market not found
- 500: Server error

---

#### POST /api/votes/dispute

**Description:** Submit dispute vote (off-chain)

**Authentication:** Required

**Request Body:**
```json
{
  "market_id": "7h3g...",
  "vote_type": "like" | "dislike"
}
```

**Response 201:**
```json
{
  "success": true,
  "vote_id": "uuid-v4",
  "aggregated": false,
  "next_aggregation": "2025-11-09T01:05:00Z"
}
```

**Error Responses:**
- 400: Invalid request body
- 401: Unauthorized
- 403: Already voted or market not in DISPUTED state
- 404: Market not found
- 500: Server error

---

### Positions API

#### GET /api/positions/:walletId

**Description:** Get user's positions across all markets

**Authentication:** Optional (but returns only public data if unauthenticated)

**Path Parameters:**
```typescript
{
  walletId: string; // Wallet public key
}
```

**Response 200:**
```json
{
  "data": [
    {
      "position_id": "pda-address",
      "market_id": "7h3g...",
      "user": "5KQw...",
      "shares_yes": 10000000000,
      "shares_no": 0,
      "total_invested": 595358023,
      "trade_count": 1,
      "claimed": false,
      "payout_amount": null,
      "claimed_at": null,
      "market": {
        "question": "Will Bitcoin reach $100k?",
        "state": "ACTIVE",
        "price_yes": 0.53
      }
    }
  ],
  "summary": {
    "total_markets": 1,
    "total_invested": 0.595358023,
    "active_positions": 1,
    "claimed_positions": 0,
    "total_winnings": 0
  }
}
```

**Error Responses:**
- 404: Wallet has no positions
- 500: Server error

---

### Discussions API

#### GET /api/discussions/:marketId

**Description:** Get discussion thread for market

**Authentication:** Optional

**Path Parameters:**
```typescript
{
  marketId: string;
}
```

**Query Parameters:**
```typescript
{
  page?: number;    // Default: 1
  limit?: number;   // Default: 50, Max: 100
  sort?: string;    // Default: created_at, Options: created_at, likes
}
```

**Response 200:**
```json
{
  "data": [
    {
      "discussion_id": "uuid-v4",
      "market_id": "7h3g...",
      "author": "5KQw...",
      "content": "I think YES because...",
      "likes": 5,
      "created_at": "2025-11-09T00:10:00Z",
      "updated_at": "2025-11-09T00:10:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 23,
    "pages": 1
  }
}
```

**Error Responses:**
- 404: Market not found
- 500: Server error

---

#### POST /api/discussions

**Description:** Create discussion post

**Authentication:** Required

**Request Body:**
```json
{
  "market_id": "7h3g...",
  "content": "I think YES because..."
}
```

**Response 201:**
```json
{
  "discussion_id": "uuid-v4",
  "market_id": "7h3g...",
  "author": "5KQw...",
  "content": "I think YES because...",
  "likes": 0,
  "created_at": "2025-11-09T00:15:00Z"
}
```

**Error Responses:**
- 400: Invalid content (empty, too long >1000 chars)
- 401: Unauthorized
- 404: Market not found
- 429: Rate limit exceeded (max 10 posts/hour)
- 500: Server error

---

### Users API

#### GET /api/users/:walletId

**Description:** Get user profile

**Authentication:** Optional

**Path Parameters:**
```typescript
{
  walletId: string;
}
```

**Response 200:**
```json
{
  "wallet_address": "5KQw...",
  "created_at": "2025-11-01T00:00:00Z",
  "total_markets_created": 2,
  "total_trades": 15,
  "total_volume": 10.5,
  "total_winnings": 5.2,
  "active_positions": 3
}
```

**Error Responses:**
- 404: User not found
- 500: Server error

---

## 🔌 WebSocket API

### Connection

**URL:** `ws://localhost:4001` (dev) or `wss://ws.zmart.io` (prod)

**Protocol:** Socket.IO

**Authentication:** Optional (connect without auth, limited events)

**Connection Example:**
```typescript
import io from 'socket.io-client';

const socket = io('ws://localhost:4001', {
  auth: {
    token: 'jwt_token' // Optional
  }
});
```

---

### Client → Server Events

#### subscribe:market

**Description:** Subscribe to market updates

**Payload:**
```json
{
  "marketId": "7h3g..."
}
```

**Acknowledgment:**
```json
{
  "success": true,
  "marketId": "7h3g..."
}
```

---

#### subscribe:trades

**Description:** Subscribe to trade feed for market

**Payload:**
```json
{
  "marketId": "7h3g..."
}
```

**Acknowledgment:**
```json
{
  "success": true,
  "marketId": "7h3g..."
}
```

---

#### unsubscribe:market

**Description:** Unsubscribe from market updates

**Payload:**
```json
{
  "marketId": "7h3g..."
}
```

**Acknowledgment:**
```json
{
  "success": true
}
```

---

### Server → Client Events

#### market:created

**Description:** New market created

**Payload:**
```json
{
  "type": "market:created",
  "marketId": "7h3g...",
  "question": "Will Bitcoin reach $100k?",
  "creator": "5KQw...",
  "endTime": "2025-12-31T23:59:59Z",
  "state": "PROPOSED"
}
```

---

#### market:updated

**Description:** Market data changed (price, liquidity, state)

**Payload:**
```json
{
  "type": "market:updated",
  "marketId": "7h3g...",
  "priceYes": 0.53,
  "priceNo": 0.47,
  "liquidity": 100.595,
  "state": "ACTIVE"
}
```

---

#### trade:executed

**Description:** New trade executed

**Payload:**
```json
{
  "type": "trade:executed",
  "marketId": "7h3g...",
  "trader": "5KQw...",
  "outcome": "YES",
  "shares": 10,
  "cost": 0.595,
  "priceAfter": 0.53
}
```

---

#### position:updated

**Description:** User position changed (authenticated users only)

**Payload:**
```json
{
  "type": "position:updated",
  "userId": "5KQw...",
  "marketId": "7h3g...",
  "sharesYes": 10,
  "sharesNo": 0,
  "totalInvested": 0.595
}
```

---

#### market:resolving

**Description:** Market entering resolution phase

**Payload:**
```json
{
  "type": "market:resolving",
  "marketId": "7h3g...",
  "resolutionStart": "2026-01-01T00:05:00Z"
}
```

---

#### market:finalized

**Description:** Market finalized, claims enabled

**Payload:**
```json
{
  "type": "market:finalized",
  "marketId": "7h3g...",
  "finalResult": "YES",
  "finalizedAt": "2026-01-03T00:10:00Z"
}
```

---

#### proposal:approved

**Description:** Proposal voting passed

**Payload:**
```json
{
  "type": "proposal:approved",
  "marketId": "7h3g...",
  "totalVotes": 100,
  "approvalRate": 0.73
}
```

---

#### discussion:new

**Description:** New discussion post

**Payload:**
```json
{
  "type": "discussion:new",
  "marketId": "7h3g...",
  "author": "5KQw...",
  "content": "I think YES because...",
  "createdAt": "2025-11-09T00:15:00Z"
}
```

---

## 🔒 Authentication Flow

### 1. Sign-In with Ethereum (SIWE)

**Step 1: Request Nonce**

```http
GET /api/auth/nonce
```

**Response:**
```json
{
  "nonce": "random-nonce-string"
}
```

---

**Step 2: Sign Message**

Client signs SIWE message with wallet:
```
zmart.io wants you to sign in with your Ethereum account:
5KQwnSGLt4kxGRDY8pLmGz7LbUGJH5rZ9Y4vCx3PqJK2

I accept the ZMART Terms of Service: https://zmart.io/tos

URI: https://zmart.io
Version: 1
Chain ID: 1
Nonce: random-nonce-string
Issued At: 2025-11-09T00:00:00Z
```

---

**Step 3: Verify Signature**

```http
POST /api/auth/verify
Content-Type: application/json

{
  "message": "signed_message",
  "signature": "0x..."
}
```

**Response 200:**
```json
{
  "token": "jwt_token_here",
  "expiresIn": 3600,
  "user": {
    "wallet_address": "5KQw..."
  }
}
```

**Error Responses:**
- 400: Invalid signature
- 401: Signature verification failed
- 500: Server error

---

### 2. Using JWT Token

**Include in requests:**
```http
Authorization: Bearer {jwt_token}
```

**Token Lifetime:** 1 hour

**Refresh:** Call `/api/auth/refresh` before expiry

```http
POST /api/auth/refresh
Authorization: Bearer {old_token}
```

**Response 200:**
```json
{
  "token": "new_jwt_token",
  "expiresIn": 3600
}
```

---

## ⚡ Rate Limiting

### Global Rate Limits

```
Endpoint: /api/*
Limit: 100 requests per 15 minutes per IP
Window: Sliding
Headers:
  X-RateLimit-Limit: 100
  X-RateLimit-Remaining: 95
  X-RateLimit-Reset: 1699564800
```

**Response 429:**
```json
{
  "error": "Too many requests from this IP, please try again later.",
  "status": 429,
  "retryAfter": 900
}
```

---

### Endpoint-Specific Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| POST /api/votes/* | 50 requests | 15 min |
| POST /api/discussions | 10 posts | 1 hour |
| GET /api/markets | 200 requests | 15 min |
| WebSocket connections | 10 concurrent | Per IP |

---

## ❌ Error Response Format

### Standard Error Schema

```json
{
  "error": "Error message",
  "status": 400,
  "code": "INVALID_INPUT",
  "details": {
    "field": "market_id",
    "reason": "Invalid public key format"
  },
  "timestamp": "2025-11-09T00:00:00Z"
}
```

---

### Common Error Codes

| Code | Status | Description |
|------|--------|-------------|
| INVALID_INPUT | 400 | Request body validation failed |
| UNAUTHORIZED | 401 | Missing or invalid token |
| FORBIDDEN | 403 | Valid token but insufficient permissions |
| NOT_FOUND | 404 | Resource not found |
| ALREADY_EXISTS | 409 | Duplicate resource (e.g., already voted) |
| RATE_LIMIT | 429 | Too many requests |
| SERVER_ERROR | 500 | Internal server error |
| SERVICE_UNAVAILABLE | 503 | Service temporarily unavailable |

---

## 🔗 Related Documentation

- [BACKEND_REFERENCE.md](../components/BACKEND_REFERENCE.md) - Backend service details
- [INTEGRATION_MAP.md](../architecture/INTEGRATION_MAP.md) - How API fits in architecture
- [DATA_FLOW.md](../architecture/DATA_FLOW.md) - API request/response flows
- [COMMANDS_REFERENCE.md](../commands/COMMANDS_REFERENCE.md) - Test API with curl

---

**Last Updated:** 2025-11-09 01:30 PST
**API Version:** v1
**Maintained By:** Backend Team

---
