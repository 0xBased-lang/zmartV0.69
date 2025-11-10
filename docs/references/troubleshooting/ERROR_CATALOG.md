# ERROR_CATALOG.md - Complete Error Reference

**Category:** Troubleshooting Reference
**Tags:** [errors, troubleshooting, debugging, solutions]
**Last Updated:** 2025-11-09 01:45 PST

---

## 🎯 Purpose

**Complete catalog of all errors** with solutions, causes, and prevention strategies.

---

## 🔴 On-Chain Errors (Programs)

### Error Code Range: 6000-6999

#### 6000: InvalidMarketState
**Message:** "Market is not in the correct state for this operation"
**Cause:** Instruction called when market in wrong state
**Solution:**
```bash
# Check market state
solana account {market_id} --url devnet | grep state

# Wait for state transition or call transition instruction
```
**Prevention:** Validate market.state before calling instruction

---

#### 6001: MarketExpired
**Message:** "Market has already ended"
**Cause:** Trying to trade after end_time
**Solution:** Cannot trade after expiry, wait for resolution
**Prevention:** Check `end_time` before submitting trade

---

#### 6002: MarketNotExpired
**Message:** "Market has not ended yet"
**Cause:** Trying to resolve market before end_time
**Solution:** Wait until `now() >= end_time`
**Prevention:** Check `end_time` before calling transition

---

#### 6003: SlippageExceeded
**Message:** "Actual cost exceeds max_cost (slippage protection)"
**Cause:** Price moved unfavorably between preview and execution
**Solution:**
```typescript
// Increase slippage tolerance
const maxCost = estimatedCost * 1.05; // 5% slippage
```
**Prevention:** Use higher slippage for volatile markets

---

#### 6004: InsufficientShares
**Message:** "User does not have enough shares to sell"
**Cause:** Trying to sell more shares than owned
**Solution:** Query position first, sell only available shares
**Prevention:**
```rust
let available_shares = position.shares_yes;
assert!(amount <= available_shares);
```

---

#### 6005: InvalidOutcome
**Message:** "Outcome must be YES (0) or NO (1)"
**Cause:** Invalid outcome parameter
**Solution:** Use `0` for YES, `1` for NO
**Prevention:** Use enum instead of raw numbers

---

#### 6006: Unauthorized
**Message:** "Signer is not authorized for this operation"
**Cause:** Wrong wallet signing transaction
**Solution:** Use correct wallet (creator, admin, or authority)
**Prevention:**
```rust
#[account(mut, has_one = creator @ ErrorCode::Unauthorized)]
```

---

#### 6007: AlreadyClaimed
**Message:** "Winnings have already been claimed"
**Cause:** Calling claim_winnings twice
**Solution:** Check `position.claimed` before claiming
**Prevention:**
```rust
assert!(!position.claimed, ErrorCode::AlreadyClaimed);
```

---

#### 6008: NoWinnings
**Message:** "User has no winnings to claim"
**Cause:** User bet on losing outcome
**Solution:** Accept loss, cannot claim
**Prevention:** Check `market.final_result` matches user's outcome

---

#### 6009: DisputeWindowExpired
**Message:** "48-hour dispute window has passed"
**Cause:** Trying to raise dispute after deadline
**Solution:** Cannot dispute, accept result
**Prevention:** Raise disputes within 48 hours of result submission

---

#### 6010: ThresholdNotMet
**Message:** "Approval threshold (70%) not met"
**Cause:** Insufficient votes for approval
**Solution:** More votes needed or proposal fails
**Prevention:** Check `approval_rate >= 0.70`

---

## 🌐 Backend Errors (API)

### HTTP Status Codes

#### 400: Bad Request

**INVALID_INPUT**
```json
{
  "error": "Invalid request body",
  "code": "INVALID_INPUT",
  "details": { "field": "market_id", "reason": "Invalid public key format" }
}
```
**Solution:** Check request body format, validate inputs
**Common Causes:**
- Invalid public key (not base58)
- Missing required fields
- Wrong data type

---

**INVALID_PAGINATION**
```json
{
  "error": "Invalid pagination parameters",
  "details": { "limit": "Max 100" }
}
```
**Solution:** Use `limit <= 100`, `page >= 1`

---

#### 401: Unauthorized

**NO_TOKEN**
```json
{
  "error": "Authorization header missing",
  "code": "UNAUTHORIZED"
}
```
**Solution:** Include `Authorization: Bearer {token}` header
**Fix:**
```typescript
const response = await fetch('/api/votes/proposal', {
  headers: {
    'Authorization': `Bearer ${jwt_token}`,
    'Content-Type': 'application/json'
  }
});
```

---

**INVALID_TOKEN**
```json
{
  "error": "JWT verification failed",
  "code": "INVALID_TOKEN"
}
```
**Solution:** Token expired or malformed, re-authenticate
**Fix:** Call `/api/auth/verify` again with wallet signature

---

#### 403: Forbidden

**ALREADY_VOTED**
```json
{
  "error": "User has already voted on this proposal",
  "code": "ALREADY_VOTED"
}
```
**Solution:** Cannot vote twice, query current vote if needed
**Prevention:** Check if user voted before showing vote UI

---

#### 404: Not Found

**MARKET_NOT_FOUND**
```json
{
  "error": "Market not found",
  "code": "NOT_FOUND"
}
```
**Solution:** Verify market_id is correct, may not be indexed yet
**Debug:**
```bash
# Check if market exists on-chain
solana account {market_id} --url devnet
```

---

#### 429: Rate Limit Exceeded

**RATE_LIMIT_EXCEEDED**
```json
{
  "error": "Too many requests",
  "status": 429,
  "retryAfter": 900
}
```
**Solution:** Wait `retryAfter` seconds before retrying
**Prevention:** Implement client-side rate limiting

---

#### 500: Internal Server Error

**DATABASE_ERROR**
```json
{
  "error": "Database connection failed",
  "code": "SERVER_ERROR"
}
```
**Solution:** Retry request, if persists contact support
**Debugging:** Check Supabase status, backend logs

---

#### 503: Service Unavailable

**SERVICE_UNAVAILABLE**
```json
{
  "error": "Service temporarily unavailable",
  "status": 503
}
```
**Solution:** Service restarting, wait 30-60 seconds
**Check:**
```bash
pm2 status
pm2 logs api-gateway
```

---

## 🔌 WebSocket Errors

### Connection Errors

**CONNECTION_FAILED**
**Cause:** WebSocket server down or network issue
**Solution:**
```typescript
socket.on('connect_error', (error) => {
  console.error('WS connection failed:', error);
  // Fallback to polling
  startPolling();
});
```

---

**RECONNECTION_FAILED**
**Cause:** Max reconnection attempts exceeded
**Solution:** Show "Real-time updates unavailable" message
**Fallback:** Poll `/api/markets/:id` every 5 seconds

---

### Subscription Errors

**INVALID_MARKET_ID**
```json
{
  "error": "Invalid market ID in subscription",
  "marketId": "invalid"
}
```
**Solution:** Verify market_id format before subscribing

---

## 🗄️ Database Errors

### Supabase Errors

**DUPLICATE_KEY**
**Cause:** Trying to insert duplicate record (e.g., vote twice)
**Solution:** Expected behavior (idempotent), ignore error
**Example:**
```sql
INSERT INTO votes ... ON CONFLICT DO NOTHING;
```

---

**RLS_POLICY_VIOLATION**
**Cause:** Row-Level Security blocked write
**Solution:** User not authorized, check RLS policies
**Debug:**
```sql
-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'votes';
```

---

**CONNECTION_TIMEOUT**
**Cause:** Database overloaded or network issue
**Solution:** Retry with exponential backoff
**Prevention:** Use connection pooling (already implemented)

---

## 🔗 Integration Errors

### Helius RPC Errors

**RPC_REQUEST_FAILED**
**Cause:** Helius RPC unavailable or rate limited
**Solution:** Retry with exponential backoff
**Fallback:** Use public Solana RPC (slower)

---

**TRANSACTION_SIMULATION_FAILED**
**Cause:** Transaction would fail on-chain
**Solution:** Check error logs, fix transaction parameters
**Debug:**
```bash
solana confirm -v {transaction_signature}
```

---

### Helius Webhook Errors

**WEBHOOK_DELIVERY_FAILED**
**Cause:** Event Indexer down or unreachable
**Solution:** Helius retries automatically (5 attempts)
**Recovery:** Events queued, will be delivered when service recovers

---

**WEBHOOK_SIGNATURE_INVALID**
**Cause:** HMAC verification failed
**Solution:** Verify HELIUS_WEBHOOK_SECRET is correct
**Debug:**
```typescript
const isValid = verifyWebhookSignature(payload, signature, secret);
console.log('Signature valid:', isValid);
```

---

## 🛠️ Common Issues & Solutions

### Issue 1: "Transaction Keeps Failing"

**Symptoms:** All transactions fail with various errors

**Debugging Steps:**
1. Check wallet has sufficient SOL
   ```bash
   solana balance --url devnet
   ```
2. Check market state is correct
   ```bash
   solana account {market_id} --url devnet
   ```
3. Simulate transaction first
   ```bash
   # Use Anchor test to simulate
   anchor test --skip-deploy
   ```
4. Check program logs
   ```bash
   solana logs {program_id} --url devnet
   ```

---

### Issue 2: "Events Not Appearing in Database"

**Symptoms:** Blockchain confirms transaction, but database not updated

**Debugging Steps:**
1. Check Event Indexer running
   ```bash
   pm2 status event-indexer
   pm2 logs event-indexer
   ```
2. Check webhook delivery
   ```bash
   # Check Helius dashboard for failed webhooks
   # Or check Event Indexer logs for incoming webhooks
   grep "POST /api/webhooks" logs/event-indexer-combined.log
   ```
3. Check Supabase connection
   ```bash
   npx ts-node backend/scripts/test-db-connection.ts
   ```
4. Manual re-index if needed
   ```bash
   npx ts-node backend/scripts/reindex-transaction.ts {tx_signature}
   ```

---

### Issue 3: "Real-Time Updates Not Working"

**Symptoms:** UI doesn't update when events occur

**Debugging Steps:**
1. Check WebSocket connection
   ```typescript
   socket.on('connect', () => console.log('Connected'));
   socket.on('disconnect', () => console.log('Disconnected'));
   ```
2. Verify subscription
   ```typescript
   socket.emit('subscribe:market', { marketId }, (ack) => {
     console.log('Subscription ack:', ack);
   });
   ```
3. Check WebSocket server running
   ```bash
   pm2 status websocket-server
   ```
4. Fallback to polling if needed
   ```typescript
   if (!socket.connected) {
     setInterval(() => fetchMarket(), 5000);
   }
   ```

---

### Issue 4: "Vote Not Counted"

**Symptoms:** User votes but count doesn't change

**Debugging Steps:**
1. Check vote recorded in database
   ```sql
   SELECT * FROM votes WHERE market_id = '...' AND voter = '...';
   ```
2. Check vote not aggregated yet (up to 5 min delay)
   ```sql
   SELECT aggregated, aggregated_at FROM votes WHERE id = '...';
   ```
3. Check Vote Aggregator running
   ```bash
   pm2 status vote-aggregator
   pm2 logs vote-aggregator
   ```
4. Manual aggregation if needed
   ```bash
   npx ts-node backend/src/services/vote-aggregator/index.ts
   ```

---

## 📊 Error Prevention Best Practices

### Frontend

1. **Validate Before Submit**
   ```typescript
   if (!isValidPublicKey(marketId)) {
     showError('Invalid market ID');
     return;
   }
   ```

2. **Handle All States**
   ```typescript
   try {
     await buyShares();
   } catch (error) {
     if (error.code === 6003) {
       showError('Price moved. Increase slippage.');
     } else {
       showError('Transaction failed. Please retry.');
     }
   }
   ```

3. **Implement Retry Logic**
   ```typescript
   async function retryWithBackoff(fn, maxRetries = 3) {
     for (let i = 0; i < maxRetries; i++) {
       try {
         return await fn();
       } catch (error) {
         if (i === maxRetries - 1) throw error;
         await sleep(2 ** i * 1000); // Exponential backoff
       }
     }
   }
   ```

---

### Backend

1. **Validate Inputs**
   ```typescript
   const schema = z.object({
     market_id: z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/),
     vote_type: z.enum(['like', 'dislike'])
   });
   ```

2. **Handle Database Errors**
   ```typescript
   try {
     await supabase.from('votes').insert(data);
   } catch (error) {
     if (error.code === '23505') { // Duplicate key
       return { success: true }; // Idempotent
     }
     throw error;
   }
   ```

3. **Implement Circuit Breaker**
   ```typescript
   if (consecutiveFailures > 5) {
     return { error: 'Service temporarily unavailable' };
   }
   ```

---

### Programs

1. **Comprehensive Validation**
   ```rust
   require!(market.state == MarketState::Active, ErrorCode::InvalidMarketState);
   require!(Clock::get()?.unix_timestamp < market.end_time, ErrorCode::MarketExpired);
   ```

2. **Checked Arithmetic**
   ```rust
   let total = cost.checked_add(fees).ok_or(ErrorCode::Overflow)?;
   ```

3. **Meaningful Error Messages**
   ```rust
   #[error_code]
   pub enum ErrorCode {
     #[msg("Market has expired. Trading is no longer allowed.")]
     MarketExpired,
   }
   ```

---

## 🔗 Related Documentation

- [TROUBLESHOOTING_REFERENCE.md](./TROUBLESHOOTING_REFERENCE.md) - Diagnostic procedures
- [PROGRAMS_REFERENCE.md](../components/PROGRAMS_REFERENCE.md) - All error codes
- [BACKEND_REFERENCE.md](../components/BACKEND_REFERENCE.md) - Service troubleshooting
- [API_REFERENCE.md](../api/API_REFERENCE.md) - API error responses

---

**Last Updated:** 2025-11-09 01:45 PST
**Maintained By:** Development Team

---
