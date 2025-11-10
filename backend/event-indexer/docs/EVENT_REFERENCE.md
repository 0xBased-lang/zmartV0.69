# Event Reference Guide

**Complete reference for all Solana program events and their database mappings.**

---

## Overview

The Event Indexer processes **9 event types** from the Zmart prediction market program. Each event type corresponds to a specific instruction and triggers specific database operations.

---

## Event Processing Flow

```
Solana Transaction
       ↓
Helius Webhook
       ↓
Parse Instruction (discriminator-based)
       ↓
Create Typed Event
       ↓
Store Raw Event (events table)
       ↓
Process Event Type
       ↓
Update Database Tables
       ↓
Mark Event Processed
       ↓
Log Success/Failure
```

---

## Event Type Matrix

| Event | Instruction | Discriminator | Tables Updated | Idempotent |
|-------|-------------|---------------|----------------|------------|
| MarketCreated | create_market | 0 | markets, users | ✅ |
| TradeExecuted | buy_shares/sell_shares | 1/2 | trades, positions, users, markets | ✅ |
| ProposalApproved | approve_proposal | 3 | proposals | ✅ |
| MarketResolved | resolve_market | 4 | markets, resolutions, users | ✅ |
| DisputeRaised | raise_dispute | 5 | markets, resolutions, disputes, users | ✅ |
| DisputeResolved | resolve_dispute | 6 | markets, resolutions, disputes | ✅ |
| WinningsClaimed | claim_winnings | 7 | positions, users | ✅ |
| VoteSubmitted | aggregate_*_votes | 8/9 | None (logged only) | ✅ |

---

## 1. MarketCreated Event

### Overview

Triggered when a new prediction market is created.

### Instruction Data Format

```
[discriminator(1), question_len(4), question(?), liquidity(8)]
```

### Event Fields

```typescript
interface MarketCreatedEvent {
  type: 'MarketCreated';
  marketPubkey: string;      // Market account address
  creator: string;            // Creator wallet address
  question: string;           // Market question
  description?: string;       // Optional description
  liquidity: string;          // Initial liquidity (b parameter)
  initialSharesYes: string;   // Initial YES shares (always 0)
  initialSharesNo: string;    // Initial NO shares (always 0)
  txSignature: string;        // Transaction signature
  slot: number;               // Slot number
  timestamp: number;          // Unix timestamp
  blockTime: number;          // Block time
}
```

### Database Operations

**1. Insert Market:**
```sql
INSERT INTO markets (
  pubkey, creator, question, description,
  state, liquidity, shares_yes, shares_no, created_at
) VALUES (
  'market456...', 'creator123...', 'Will BTC reach $100k?', NULL,
  'PROPOSED', '1000000000', '0', '0', '2025-01-08 12:00:00'
)
ON CONFLICT (pubkey) DO NOTHING;
```

**2. Ensure Creator Exists:**
```sql
INSERT INTO users (wallet_address)
VALUES ('creator123...')
ON CONFLICT (wallet_address) DO NOTHING;
```

### Example

**Transaction:**
```bash
solana program invoke \
  7h3gXfBfYFueFVLYyfL5Qo1QGsf4GQUfW96FKVgnUsJS \
  create_market \
  --args "Will BTC reach $100k?" 1000000000
```

**Resulting Event:**
```json
{
  "type": "MarketCreated",
  "marketPubkey": "Bxv8...",
  "creator": "CzR9...",
  "question": "Will BTC reach $100k?",
  "liquidity": "1000000000",
  "initialSharesYes": "0",
  "initialSharesNo": "0",
  "txSignature": "5j7s...",
  "slot": 123456789,
  "timestamp": 1704700800
}
```

**Database State:**
```sql
-- markets table
pubkey: Bxv8...
creator: CzR9...
question: Will BTC reach $100k?
state: PROPOSED
liquidity: 1000000000

-- users table
wallet_address: CzR9...
total_trades: 0
total_volume: 0
```

---

## 2. TradeExecuted Event

### Overview

Triggered when shares are bought or sold.

### Instruction Data Format

```
[discriminator(1), outcome(1), shares(8), max_cost(8)]
```

### Event Fields

```typescript
interface TradeExecutedEvent {
  type: 'TradeExecuted';
  marketPubkey: string;      // Market account
  trader: string;             // Trader wallet
  side: 'BUY' | 'SELL';      // Trade direction
  outcome: 'YES' | 'NO';     // Outcome traded
  shares: string;             // Number of shares
  cost: string;               // Trade cost (lamports)
  priceBefore: string;        // Price before trade
  priceAfter: string;         // Price after trade
  feeProtocol: string;        // Protocol fee (3%)
  feeCreator: string;         // Creator fee (2%)
  feeStakers: string;         // Staker fee (5%)
  txSignature: string;
  slot: number;
  timestamp: number;
  blockTime: number;
}
```

### Database Operations

**1. Insert Trade:**
```sql
INSERT INTO trades (
  tx_signature, market_pubkey, trader_pubkey,
  side, outcome, shares, cost,
  price_before, price_after,
  fee_protocol, fee_creator, fee_stakers,
  timestamp, slot
) VALUES (
  '8k3m...', 'market456...', 'trader789...',
  'BUY', 'YES', '10000', '500000000',
  '450000000', '550000000',
  '15000000', '10000000', '25000000',
  '2025-01-08 12:05:00', 123456790
)
ON CONFLICT (tx_signature) DO NOTHING;
```

**2. Update Position:**
```sql
-- Get current position
SELECT shares_yes, shares_no, invested
FROM positions
WHERE user_pubkey = 'trader789...'
  AND market_pubkey = 'market456...';

-- Calculate new values
new_shares_yes = current_shares_yes + 10000 (if BUY YES)
new_invested = current_invested + 500000000

-- Upsert position
INSERT INTO positions (
  user_pubkey, market_pubkey,
  shares_yes, shares_no, invested
) VALUES (
  'trader789...', 'market456...',
  '10000', '0', '500000000'
)
ON CONFLICT (user_pubkey, market_pubkey)
DO UPDATE SET
  shares_yes = EXCLUDED.shares_yes,
  invested = EXCLUDED.invested;
```

**3. Update User Stats:**
```sql
UPDATE users
SET
  total_trades = total_trades + 1,
  total_volume = total_volume + 500000000
WHERE wallet_address = 'trader789...';
```

**4. Update Market Shares:**
```sql
UPDATE markets
SET
  shares_yes = shares_yes + 10000
WHERE pubkey = 'market456...';
```

### Example

**Buy Transaction:**
```bash
solana program invoke \
  7h3gXfBfYFueFVLYyfL5Qo1QGsf4GQUfW96FKVgnUsJS \
  buy_shares \
  --args YES 10000 500000000
```

**Database State After:**
```sql
-- trades table
tx_signature: 8k3m...
side: BUY
outcome: YES
shares: 10000
cost: 500000000

-- positions table
user_pubkey: trader789...
shares_yes: 10000
invested: 500000000

-- users table
total_trades: 1
total_volume: 500000000

-- markets table
shares_yes: 10000
```

---

## 3. MarketResolved Event

### Overview

Triggered when a market is resolved to an outcome.

### Instruction Data Format

```
[discriminator(1), outcome(1)]
```

### Event Fields

```typescript
interface MarketResolvedEvent {
  type: 'MarketResolved';
  marketPubkey: string;
  resolver: string;
  outcome: 'YES' | 'NO' | 'INVALID';
  resolvingAt: number;        // Resolution timestamp
  disputeDeadline: number;    // resolvingAt + 48 hours
  txSignature: string;
  slot: number;
  timestamp: number;
  blockTime: number;
}
```

### Database Operations

**1. Update Market:**
```sql
UPDATE markets
SET
  state = 'RESOLVING',
  outcome = 'YES',
  resolver = 'resolver123...',
  resolving_at = '2025-01-08 12:00:00',
  resolved_at = '2025-01-08 12:00:00'
WHERE pubkey = 'market456...';
```

**2. Insert Resolution:**
```sql
INSERT INTO resolutions (
  market_pubkey, resolver, outcome,
  resolving_at, dispute_deadline,
  disputed, finalized, timestamp
) VALUES (
  'market456...', 'resolver123...', 'YES',
  '2025-01-08 12:00:00', '2025-01-10 12:00:00',
  false, false, '2025-01-08 12:00:00'
)
ON CONFLICT (market_pubkey) DO UPDATE SET
  resolver = EXCLUDED.resolver,
  outcome = EXCLUDED.outcome;
```

---

## 4. DisputeRaised Event

### Overview

Triggered when a market resolution is disputed.

### Database Operations

**1. Update Market:**
```sql
UPDATE markets
SET state = 'DISPUTED'
WHERE pubkey = 'market456...';
```

**2. Update Resolution:**
```sql
UPDATE resolutions
SET disputed = true
WHERE market_pubkey = 'market456...';
```

**3. Insert Dispute:**
```sql
INSERT INTO disputes (
  market_pubkey, disputer, resolved,
  outcome_changed, created_at
) VALUES (
  'market456...', 'disputer789...', false,
  false, '2025-01-09 10:00:00'
);
```

---

## 5. DisputeResolved Event

### Overview

Triggered when a dispute is resolved (outcome may change).

### Database Operations

**1. Update Market (if outcome changed):**
```sql
UPDATE markets
SET
  state = 'FINALIZED',
  outcome = 'NO'  -- if outcome changed
WHERE pubkey = 'market456...';
```

**2. Update Resolution:**
```sql
UPDATE resolutions
SET
  finalized = true,
  finalized_at = '2025-01-11 12:00:00'
WHERE market_pubkey = 'market456...';
```

**3. Update Dispute:**
```sql
UPDATE disputes
SET
  resolved = true,
  outcome_changed = true,
  new_outcome = 'NO',
  support_votes = 120,
  reject_votes = 80,
  total_votes = 200,
  resolved_at = '2025-01-11 12:00:00'
WHERE market_pubkey = 'market456...'
  AND resolved = false;
```

---

## 6. WinningsClaimed Event

### Overview

Triggered when a user claims their winnings.

### Database Operations

**Update Position:**
```sql
UPDATE positions
SET
  claimed = '1500000000',
  shares_yes = '0',
  shares_no = '0'
WHERE user_pubkey = 'user123...'
  AND market_pubkey = 'market456...';
```

---

## Idempotency

All events are **idempotent** - they can be replayed safely without creating duplicates.

### Mechanisms

1. **Unique Constraints:**
   - `trades.tx_signature` (unique)
   - `events(tx_signature, event_type)` (unique)
   - `positions(user_pubkey, market_pubkey)` (unique)

2. **Upsert Operations:**
   ```sql
   INSERT INTO table (...)
   VALUES (...)
   ON CONFLICT (key) DO UPDATE SET ...;
   ```

3. **Conditional Updates:**
   ```sql
   UPDATE disputes SET ...
   WHERE market_pubkey = '...'
     AND resolved = false;  -- Only update unresolved
   ```

---

## Event Ordering

Events must be processed **in order** to maintain consistency.

### Example Sequence

```
1. MarketCreated     (slot 100)
2. TradeExecuted     (slot 101) ← depends on market existing
3. TradeExecuted     (slot 102)
4. MarketResolved    (slot 103) ← depends on trades
5. DisputeRaised     (slot 104) ← depends on resolution
6. DisputeResolved   (slot 150) ← depends on dispute
7. WinningsClaimed   (slot 151) ← depends on finalization
```

### Handling Out-of-Order Events

If events arrive out of order:
1. Store in `events` table with `processed = false`
2. Process when dependencies are met
3. Retry failed events (max 3 attempts)
4. Alert on persistent failures

---

## Error Scenarios

### 1. Event Parsing Fails

**Symptom:** Unknown discriminator or invalid data

**Handling:**
- Log error with full payload
- Store in `events` table with error message
- Return 200 to Helius (prevent retry)
- Alert for manual investigation

### 2. Database Write Fails

**Symptom:** SQL error (constraint violation, connection lost)

**Handling:**
- Log error with stack trace
- Store in `events` table with error
- Retry up to 3 times
- If still fails, alert

### 3. Missing Dependencies

**Symptom:** Trade for non-existent market

**Handling:**
- Create missing records (e.g., user)
- Retry event processing
- Alert if market missing

---

## Performance Considerations

### Batch Processing

For high-volume events, batch database operations:

```typescript
// Instead of individual inserts
for (const trade of trades) {
  await supabase.from('trades').insert(trade);
}

// Batch insert
await supabase.from('trades').insert(trades);
```

### Connection Pooling

Supabase automatically pools connections. Configure:

```typescript
const supabase = createClient(url, key, {
  db: {
    schema: 'public'
  },
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});
```

### Indexes

Critical indexes for performance:

```sql
-- Markets
CREATE INDEX idx_markets_state_active
  ON markets(state) WHERE state = 'ACTIVE';

-- Trades
CREATE INDEX idx_trades_market_timestamp
  ON trades(market_pubkey, timestamp DESC);

-- Positions
CREATE INDEX idx_positions_user_market
  ON positions(user_pubkey, market_pubkey);
```

---

## Monitoring

### Key Metrics

Monitor these per event type:

- **Processing time**: <100ms target
- **Success rate**: >99% target
- **Error rate**: <1% target
- **Retry rate**: <5% target

### Queries

**Events processed per type:**
```sql
SELECT
  event_type,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE processed = true) as processed,
  COUNT(*) FILTER (WHERE error IS NOT NULL) as errors
FROM events
GROUP BY event_type;
```

**Recent failures:**
```sql
SELECT *
FROM events
WHERE error IS NOT NULL
ORDER BY timestamp DESC
LIMIT 10;
```

---

*Event Reference v1.0.0*
