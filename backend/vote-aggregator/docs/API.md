# Vote Aggregator API Documentation

**Version:** 1.0.0
**Base URL:** `http://localhost:3001` (development) | `https://api.zmart.io` (production)
**Last Updated:** November 8, 2025

---

## Overview

The Vote Aggregator Service collects off-chain votes and aggregates them for on-chain submission. It provides REST API endpoints for vote submission and retrieval, with Redis caching for performance.

**Architecture**:
- Vote Collection → Redis Storage → Aggregation Cron → On-Chain Submission
- Real-time vote counting with atomic Redis operations
- 7-day TTL on vote data (auto-cleanup)

---

## Authentication

**Method:** Wallet signature verification (Sign-In With Ethereum - SIWE)

**Headers**:
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**Token Acquisition**:
1. GET `/auth/message` → receive message to sign
2. Sign message with wallet
3. POST `/auth/verify` with signature → receive JWT
4. Use JWT for subsequent API calls (1-hour expiry)

---

## Endpoints

### 1. Submit Proposal Vote

**POST** `/votes/proposal`

Submit a vote on a market proposal (like/dislike).

**Request Body**:
```json
{
  "marketPubkey": "HFaHHLFukTcA15khhvssYa7fTFmkzxTDsLih2LGVWCrM",
  "walletAddress": "4MkybTASDtmzQnfUWztHmfgyHgBREw74eTKipVADqQLA",
  "vote": true
}
```

**Parameters**:
- `marketPubkey` (string, required): Market public key (base58)
- `walletAddress` (string, required): Voter wallet address (base58)
- `vote` (boolean, required): `true` for like, `false` for dislike

**Response** (201 Created):
```json
{
  "success": true,
  "message": "Vote recorded successfully",
  "data": {
    "marketPubkey": "HFaHHLFukTcA15khhvssYa7fTFmkzxTDsLih2LGVWCrM",
    "walletAddress": "4MkybTASDtmzQnfUWztHmfgyHgBREw74eTKipVADqQLA",
    "vote": true,
    "timestamp": "2025-11-08T12:34:56.789Z"
  }
}
```

**Error Responses**:

400 Bad Request - Invalid parameters
```json
{
  "success": false,
  "error": "Invalid market pubkey format",
  "code": "INVALID_PUBKEY"
}
```

409 Conflict - User already voted
```json
{
  "success": false,
  "error": "User has already voted on this proposal",
  "code": "DUPLICATE_VOTE"
}
```

500 Internal Server Error
```json
{
  "success": false,
  "error": "Failed to record vote",
  "code": "REDIS_ERROR"
}
```

**cURL Example**:
```bash
curl -X POST http://localhost:3001/votes/proposal \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "marketPubkey": "HFaHHLFukTcA15khhvssYa7fTFmkzxTDsLih2LGVWCrM",
    "walletAddress": "4MkybTASDtmzQnfUWztHmfgyHgBREw74eTKipVADqQLA",
    "vote": true
  }'
```

---

### 2. Get Proposal Votes

**GET** `/votes/proposal/:marketPubkey`

Retrieve current vote counts for a market proposal.

**Path Parameters**:
- `marketPubkey` (string, required): Market public key (base58)

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "marketPubkey": "HFaHHLFukTcA15khhvssYa7fTFmkzxTDsLih2LGVWCrM",
    "likes": 7,
    "dislikes": 3,
    "totalVotes": 10,
    "approvalPercentage": 70.0,
    "threshold": 70.0,
    "meetsThreshold": true,
    "timestamp": "2025-11-08T12:34:56.789Z"
  }
}
```

**Error Responses**:

404 Not Found - No votes for market
```json
{
  "success": false,
  "error": "No votes found for this market",
  "code": "NO_VOTES"
}
```

**cURL Example**:
```bash
curl -X GET http://localhost:3001/votes/proposal/HFaHHLFukTcA15khhvssYa7fTFmkzxTDsLih2LGVWCrM \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

### 3. Submit Dispute Vote

**POST** `/votes/dispute`

Submit a vote on a market dispute (agree/disagree with dispute).

**Request Body**:
```json
{
  "marketPubkey": "HFaHHLFukTcA15khhvssYa7fTFmkzxTDsLih2LGVWCrM",
  "walletAddress": "4MkybTASDtmzQnfUWztHmfgyHgBREw74eTKipVADqQLA",
  "vote": true
}
```

**Parameters**:
- `marketPubkey` (string, required): Market public key (base58)
- `walletAddress` (string, required): Voter wallet address (base58)
- `vote` (boolean, required): `true` for agree with dispute, `false` for disagree

**Response** (201 Created):
```json
{
  "success": true,
  "message": "Dispute vote recorded successfully",
  "data": {
    "marketPubkey": "HFaHHLFukTcA15khhvssYa7fTFmkzxTDsLih2LGVWCrM",
    "walletAddress": "4MkybTASDtmzQnfUWztHmfgyHgBREw74eTKipVADqQLA",
    "vote": true,
    "timestamp": "2025-11-08T12:34:56.789Z"
  }
}
```

**Error Responses**: Same as proposal vote

**cURL Example**:
```bash
curl -X POST http://localhost:3001/votes/dispute \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "marketPubkey": "HFaHHLFukTcA15khhvssYa7fTFmkzxTDsLih2LGVWCrM",
    "walletAddress": "4MkybTASDtmzQnfUWztHmfgyHgBREw74eTKipVADqQLA",
    "vote": true
  }'
```

---

### 4. Get Dispute Votes

**GET** `/votes/dispute/:marketPubkey`

Retrieve current vote counts for a market dispute.

**Path Parameters**:
- `marketPubkey` (string, required): Market public key (base58)

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "marketPubkey": "HFaHHLFukTcA15khhvssYa7fTFmkzxTDsLih2LGVWCrM",
    "agrees": 4,
    "disagrees": 6,
    "totalVotes": 10,
    "agreePercentage": 40.0,
    "threshold": 60.0,
    "meetsThreshold": false,
    "timestamp": "2025-11-08T12:34:56.789Z"
  }
}
```

**cURL Example**:
```bash
curl -X GET http://localhost:3001/votes/dispute/HFaHHLFukTcA15khhvssYa7fTFmkzxTDsLih2LGVWCrM \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

### 5. Aggregate Proposal Votes (Admin Only)

**POST** `/aggregate/proposal`

Trigger on-chain aggregation of proposal votes. **Restricted to backend authority.**

**Request Body**:
```json
{
  "marketPubkey": "HFaHHLFukTcA15khhvssYa7fTFmkzxTDsLih2LGVWCrM"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Votes aggregated successfully",
  "data": {
    "marketPubkey": "HFaHHLFukTcA15khhvssYa7fTFmkzxTDsLih2LGVWCrM",
    "likes": 7,
    "dislikes": 3,
    "signature": "5J7G...xyz",
    "slot": 419760378,
    "approvalPercentage": 70.0,
    "stateTransition": "PROPOSED → APPROVED"
  }
}
```

**Error Responses**:

403 Forbidden - Not authorized
```json
{
  "success": false,
  "error": "Unauthorized to aggregate votes",
  "code": "UNAUTHORIZED"
}
```

500 Internal Server Error - On-chain transaction failed
```json
{
  "success": false,
  "error": "Failed to submit aggregation transaction",
  "code": "TRANSACTION_FAILED",
  "details": {
    "programError": "Account in wrong state for voting"
  }
}
```

**cURL Example**:
```bash
curl -X POST http://localhost:3001/aggregate/proposal \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN" \
  -d '{
    "marketPubkey": "HFaHHLFukTcA15khhvssYa7fTFmkzxTDsLih2LGVWCrM"
  }'
```

---

### 6. Aggregate Dispute Votes (Admin Only)

**POST** `/aggregate/dispute`

Trigger on-chain aggregation of dispute votes. **Restricted to backend authority.**

**Request Body**:
```json
{
  "marketPubkey": "HFaHHLFukTcA15khhvssYa7fTFmkzxTDsLih2LGVWCrM"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Dispute votes aggregated successfully",
  "data": {
    "marketPubkey": "HFaHHLFukTcA15khhvssYa7fTFmkzxTDsLih2LGVWCrM",
    "agrees": 6,
    "disagrees": 4,
    "signature": "3K9M...abc",
    "slot": 419760459,
    "agreePercentage": 60.0,
    "stateTransition": "DISPUTED → RESOLVING",
    "outcomeFlipped": true
  }
}
```

**cURL Example**:
```bash
curl -X POST http://localhost:3001/aggregate/dispute \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN" \
  -d '{
    "marketPubkey": "HFaHHLFukTcA15khhvssYa7fTFmkzxTDsLih2LGVWCrM"
  }'
```

---

## Data Models

### Vote Record (Redis)

**Proposal Votes**:
```
Key Pattern: proposal:{marketPubkey}:likes
Type: SET
Members: [walletAddress1, walletAddress2, ...]

Key Pattern: proposal:{marketPubkey}:dislikes
Type: SET
Members: [walletAddress1, walletAddress2, ...]

TTL: 7 days
```

**Dispute Votes**:
```
Key Pattern: dispute:{marketPubkey}:agrees
Type: SET
Members: [walletAddress1, walletAddress2, ...]

Key Pattern: dispute:{marketPubkey}:disagrees
Type: SET
Members: [walletAddress1, walletAddress2, ...]

TTL: 7 days
```

---

## Rate Limiting

**Global Rate Limit**: 100 requests/minute per IP
**Vote Submission**: 10 votes/minute per wallet address
**Aggregation**: 5 aggregations/minute (admin only)

**Rate Limit Response** (429 Too Many Requests):
```json
{
  "success": false,
  "error": "Rate limit exceeded",
  "code": "RATE_LIMIT",
  "retryAfter": 45
}
```

---

## Error Codes Reference

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_PUBKEY` | 400 | Invalid public key format |
| `INVALID_VOTE` | 400 | Invalid vote value (must be boolean) |
| `DUPLICATE_VOTE` | 409 | User already voted |
| `NO_VOTES` | 404 | No votes found for market |
| `UNAUTHORIZED` | 403 | Not authorized for this action |
| `REDIS_ERROR` | 500 | Redis connection/operation failed |
| `TRANSACTION_FAILED` | 500 | On-chain transaction failed |
| `RATE_LIMIT` | 429 | Rate limit exceeded |

---

## WebSocket Events (Future)

**Connection**: `ws://localhost:3001/ws`

**Events**:
```json
// New vote submitted
{
  "event": "vote:submitted",
  "data": {
    "marketPubkey": "...",
    "vote": true,
    "totalVotes": 11
  }
}

// Votes aggregated
{
  "event": "vote:aggregated",
  "data": {
    "marketPubkey": "...",
    "signature": "...",
    "stateTransition": "PROPOSED → APPROVED"
  }
}
```

---

## Testing

**Health Check**:
```bash
curl http://localhost:3001/health
```

**Response**:
```json
{
  "status": "healthy",
  "services": {
    "redis": "connected",
    "solana": "connected"
  },
  "version": "1.0.0"
}
```

---

## Support

**Documentation**: `/docs/VOTE_AGGREGATOR_ULTRA_DEEP_ANALYSIS.md`
**Issues**: GitHub Issues
**API Version**: 1.0.0
**Last Updated**: November 8, 2025
