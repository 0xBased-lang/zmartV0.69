# Phase 2 Implementation Checklist: Detailed Week-by-Week Tasks

**Purpose:** Actionable task list for Phase 2 (Weeks 4-7) backend services implementation
**Status:** Ready for team assignments
**Last Updated:** November 7, 2025

---

## Week 4: Vote Aggregator Service

### Day 1-2: Design & Architecture

#### Architecture Design
- [ ] Create `/backend/src/services/vote-aggregator/` directory structure
- [ ] Define TypeScript interfaces for vote types:
  ```typescript
  interface ProposalVote {
    market_id: string;
    user_pubkey: string;
    vote: boolean; // true = like, false = dislike
    timestamp: number;
  }

  interface DisputeVote {
    market_id: string;
    user_pubkey: string;
    vote: boolean; // true = support, false = reject
    weight: u64;   // position size
    timestamp: number;
  }

  interface AggregationResult {
    market_id: string;
    type: 'proposal' | 'dispute';
    yes_votes: number;
    no_votes: number;
    percentage_bps: number; // 0-10000
    threshold_met: boolean;
    threshold_bps: number;
    timestamp: number;
  }
  ```

#### Redis Schema Planning
- [ ] Define Redis key structure:
  ```
  vote_tally:{market_id}:proposal:yes  → integer
  vote_tally:{market_id}:proposal:no   → integer
  vote_tally:{market_id}:dispute:yes   → integer (actually support)
  vote_tally:{market_id}:dispute:no    → integer (actually reject)

  vote_set:{market_id}  → set of user_pubkeys (dedup check)

  aggregation_lock:{market_id}  → lock for cron job
  ```

#### Database Schema Review
- [ ] Review `vote_records` table (should have: id, market_id, user_pubkey, vote, timestamp)
- [ ] Review `aggregation_results` table (should track: market_id, vote_type, counts, timestamp)
- [ ] Add indexes:
  ```sql
  CREATE INDEX idx_vote_records_market_user ON vote_records(market_id, user_pubkey);
  CREATE INDEX idx_aggregation_market_type ON aggregation_results(market_id, type);
  ```

#### Cron Job Design
- [ ] Design cron schedule: "*/5 * * * *" (every 5 minutes)
- [ ] Design job timeout: 4 minutes (must complete before next run)
- [ ] Design job isolation: One job per market (distributed lock)
- [ ] Design retry logic: Exponential backoff (5m → 10m → 20m)

---

### Day 3-4: Core Implementation

#### Vote Collection API

**Endpoint: POST /api/votes/proposal**
```typescript
interface CreateProposalVoteRequest {
  market_id: string;  // UUID
  vote: 'like' | 'dislike';
}

interface CreateProposalVoteResponse {
  success: boolean;
  vote_id: string;
  vote_count: {
    likes: number;
    dislikes: number;
  };
}
```

- [ ] Create controller: `/backend/src/controllers/votes.ts`
- [ ] Implement endpoint handler:
  ```typescript
  POST /api/votes/proposal
  1. Extract user_pubkey from SIWE auth token
  2. Validate market exists and is in PROPOSED state
  3. Check user hasn't already voted (query vote_records)
  4. Store vote in database (vote_records table)
  5. Update Redis cache (vote_tally)
  6. Return response with vote counts
  ```

**Endpoint: POST /api/votes/dispute**
```typescript
interface CreateDisputeVoteRequest {
  market_id: string;
  vote: 'support' | 'reject';  // support = agree with dispute
}
```

- [ ] Implement endpoint handler:
  ```typescript
  POST /api/votes/dispute
  1. Extract user_pubkey from auth
  2. Validate market is in DISPUTED state
  3. Check user has position in market
  4. Calculate vote weight from position size
  5. Check user hasn't already voted
  6. Store vote in database
  7. Update Redis cache (weighted)
  8. Return response with vote counts
  ```

#### Validation Service
- [ ] Create `/backend/src/services/vote-aggregator/validation.ts`
- [ ] Implement validation functions:
  ```typescript
  async validateProposalVote(marketId, userPubkey): Promise<{
    valid: boolean;
    reason?: string;  // if invalid
  }>

  async validateDisputeVote(marketId, userPubkey): Promise<{
    valid: boolean;
    reason?: string;
    weight?: u64;  // position size
  }>

  async hasAlreadyVoted(marketId, userPubkey, voteType): Promise<boolean>
  ```

- [ ] Implement checks:
  - ✅ Market exists
  - ✅ User wallet is valid Solana address
  - ✅ Market in correct state (PROPOSED or DISPUTED)
  - ✅ User has no previous vote on this market
  - ✅ For dispute: User has position (can fetch from on-chain or database)
  - ✅ Rate limit: Max 10 votes per user per market (prevent spam)

#### Redis Integration
- [ ] Install redis library: `npm install redis`
- [ ] Create `/backend/src/services/vote-aggregator/redis.ts`
- [ ] Implement functions:
  ```typescript
  async cacheProposalVote(marketId: string, vote: 'yes' | 'no'): Promise<void>
  async cacheDisputeVote(marketId: string, vote: 'yes' | 'no', weight: u64): Promise<void>
  async getVoteCounts(marketId: string, type: 'proposal' | 'dispute'): Promise<{yes: number, no: number}>
  async clearVoteCache(marketId: string): Promise<void>
  ```

#### Deduplication Service
- [ ] Create `/backend/src/services/vote-aggregator/dedup.ts`
- [ ] Use database as source of truth:
  ```typescript
  async hasVoted(marketId: string, userPubkey: string, voteType: string): Promise<boolean> {
    const result = await db.voteRecords.findOne({
      where: {
        market_id: marketId,
        user_pubkey: userPubkey,
        vote_type: voteType
      }
    });
    return !!result;
  }
  ```

---

### Day 5: Aggregation Logic

#### Vote Counting Algorithm
- [ ] Create `/backend/src/services/vote-aggregator/calculator.ts`
- [ ] Implement:
  ```typescript
  function calculateProposalPercentage(likes: number, dislikes: number): number {
    const total = likes + dislikes;
    if (total === 0) return 0;
    // Return in basis points (0-10000)
    return Math.floor((likes * 10000) / total);
  }

  function calculateDisputePercentage(support: number, reject: number): number {
    const total = support + reject;
    if (total === 0) return 0;
    return Math.floor((support * 10000) / total);
  }

  function meetsThreshold(percentageBps: number, thresholdBps: number): boolean {
    return percentageBps >= thresholdBps;
  }
  ```

#### Cron Job Implementation
- [ ] Create `/backend/src/jobs/vote-aggregator-cron.ts`
- [ ] Use node-cron library: `npm install node-cron`
- [ ] Implement:
  ```typescript
  import cron from 'node-cron';

  const job = cron.schedule('*/5 * * * *', async () => {
    console.log('Starting vote aggregation');

    const markets = await db.markets.findAll({
      where: {
        state: {$in: ['PROPOSED', 'DISPUTED']}
      }
    });

    for (const market of markets) {
      const lockAcquired = await acquireDistributedLock(
        `vote_agg:${market.id}`,
        60000  // 60 second lock timeout
      );

      if (!lockAcquired) {
        console.log(`Skipping ${market.id} - aggregation in progress`);
        continue;
      }

      try {
        await aggregateMarketVotes(market);
      } catch (error) {
        console.error(`Error aggregating ${market.id}:`, error);
        await alertOperations('vote_aggregation_error', {market: market.id, error});
      } finally {
        await releaseDistributedLock(`vote_agg:${market.id}`);
      }
    }
  });

  // Handle job errors
  job.on('error', (error) => {
    console.error('Cron job error:', error);
    alertOperations('cron_job_failure', {error});
  });
  ```

#### On-Chain Aggregation Call
- [ ] Create `/backend/src/services/vote-aggregator/on-chain.ts`
- [ ] Implement:
  ```typescript
  async function aggregateProposalVotes(
    marketId: string,
    likes: number,
    dislikes: number
  ): Promise<TransactionSignature> {
    const market = await getMarketAccount(marketId); // Fetch on-chain account

    const tx = await program.methods
      .aggregateProposalVotes(
        new BN(likes),
        new BN(dislikes)
      )
      .accounts({
        market: market.pubkey,
        globalConfig: GLOBAL_CONFIG_PDA,
        backendAuthority: backend_authority  // Signer
      })
      .signers([backendAuthorityKeypair])
      .rpc({commitment: 'confirmed'});

    return tx;
  }

  async function aggregateDisputeVotes(
    marketId: string,
    agree: number,
    disagree: number
  ): Promise<TransactionSignature> {
    const market = await getMarketAccount(marketId);

    const tx = await program.methods
      .aggregateDisputeVotes(
        new BN(agree),
        new BN(disagree)
      )
      .accounts({
        market: market.pubkey,
        globalConfig: GLOBAL_CONFIG_PDA,
        backendAuthority: backend_authority
      })
      .signers([backendAuthorityKeypair])
      .rpc({commitment: 'confirmed'});

    return tx;
  }
  ```

#### Aggregation Result Recording
- [ ] Record result in database:
  ```typescript
  async function recordAggregationResult(
    marketId: string,
    result: AggregationResult,
    txSignature: string
  ): Promise<void> {
    await db.aggregationResults.create({
      market_id: marketId,
      type: result.type,
      yes_votes: result.yes_votes,
      no_votes: result.no_votes,
      percentage_bps: result.percentage_bps,
      threshold_met: result.threshold_met,
      threshold_bps: result.threshold_bps,
      transaction_signature: txSignature,
      timestamp: new Date(),
      success: true
    });

    // Update market cache if threshold met
    if (result.threshold_met) {
      const newState = result.type === 'proposal' ? 'APPROVED' : 'FINALIZED';
      await db.markets.update(marketId, {state: newState});
    }
  }
  ```

---

### Day 6-7: Testing & Deployment

#### Unit Tests
- [ ] Create `/backend/tests/unit/vote-aggregator.test.ts`
- [ ] Test vote validation:
  - ✅ Valid proposal vote accepted
  - ✅ Valid dispute vote accepted
  - ✅ Duplicate vote rejected
  - ✅ Invalid market rejected
  - ✅ Invalid state rejected

- [ ] Test vote counting:
  - ✅ 70% exactly = approved (proposal)
  - ✅ 69.99% not approved
  - ✅ 60% exactly = approved (dispute)
  - ✅ 59.99% not approved
  - ✅ Zero votes = 0%

- [ ] Test aggregation:
  - ✅ Cron job triggers every 5 minutes
  - ✅ On-chain call succeeds
  - ✅ Result recorded in database
  - ✅ Distributed lock prevents concurrent runs

#### Integration Tests
- [ ] Create `/backend/tests/integration/vote-aggregation-flow.test.ts`
- [ ] Test end-to-end flow:
  1. Create market (via create_market instruction)
  2. Submit 7 proposal votes (7 like, 3 dislike)
  3. Wait for cron job (5 min)
  4. Verify market transitioned to APPROVED
  5. Verify aggregation_results recorded
  6. Verify on-chain state matches database

#### Deployment
- [ ] Deploy to staging environment
- [ ] Run live test against devnet:
  1. Create test market
  2. Submit votes
  3. Wait for cron aggregation
  4. Verify on-chain state change
  5. Verify database state matches

#### Success Criteria
- ✅ 100+ unit tests passing
- ✅ 20+ integration tests passing
- ✅ Cron job running on schedule
- ✅ Vote aggregation threshold exact (70%, 60%)
- ✅ No errors in production logs

---

## Week 5: Event Indexer Infrastructure

### Day 1-2: Helius Webhook Setup

#### Helius Configuration
- [ ] Create Helius account (if not done)
- [ ] Navigate to Dashboard → Webhooks
- [ ] Create new webhook:
  ```
  Webhook Name: zmart-core-events
  Program Address: 7h3gXfBfYFueFVLYyfL5Qo1QGsf4GQUfW96FKVgnUsJS
  Transaction Type: All
  Encoding: JSON
  Webhook URL: https://api.zmart.dev/webhooks/events
  Cluster: Devnet
  ```

- [ ] Copy webhook signature secret (needed for verification)

#### Webhook Receiver Endpoint
- [ ] Create `/backend/src/routes/webhooks.ts`
- [ ] Implement POST /webhooks/events:
  ```typescript
  interface HeliusWebhookPayload {
    transaction: {
      signature: string;
      slot: number;
      timestamp: number;
      blockTime: number;
      instructions: any[];
      logs: string[];
    };
    accountData: any[];
    nativeTransfers: any[];
    tokenTransfers: any[];
  }

  POST /webhooks/events
  1. Verify webhook signature (Helius library)
  2. Parse transaction data
  3. Extract program events
  4. Check idempotency (event hash already processed?)
  5. Write events to database
  6. Trigger state synchronization
  7. Return 200 OK immediately (async processing)
  ```

#### Signature Verification
- [ ] Install Helius library: `npm install @helius/webhooks`
- [ ] Implement verification:
  ```typescript
  import { verifyWebhookSignature } from '@helius/webhooks';

  function verifyWebhook(req: Request): boolean {
    const signature = req.headers['x-helius-signature'] as string;
    const payload = JSON.stringify(req.body);

    return verifyWebhookSignature(
      payload,
      signature,
      process.env.HELIUS_WEBHOOK_SECRET
    );
  }

  app.post('/webhooks/events', (req, res) => {
    if (!verifyWebhook(req)) {
      return res.status(401).json({error: 'Invalid signature'});
    }

    // Process webhook
    processWebhook(req.body).catch(error => {
      console.error('Webhook processing error:', error);
      alertOperations('webhook_error', {error});
    });

    res.status(200).json({success: true});
  });
  ```

#### Idempotency Implementation
- [ ] Create `/backend/src/services/event-indexer/idempotency.ts`
- [ ] Use transaction signature as idempotency key:
  ```typescript
  async function isEventProcessed(txSignature: string): Promise<boolean> {
    const result = await db.eventLogs.findOne({
      where: {transaction_signature: txSignature}
    });
    return !!result;
  }

  async function markEventProcessed(txSignature: string): Promise<void> {
    const eventHash = crypto
      .createHash('sha256')
      .update(txSignature)
      .digest('hex');

    await db.eventIdempotency.create({
      event_hash: eventHash,
      transaction_signature: txSignature,
      processed_at: new Date()
    });
  }
  ```

---

### Day 3-4: Event Parser

#### Event Type Definitions
- [ ] Create `/backend/src/types/events.ts`
- [ ] Define all event types (interface for each):
  ```typescript
  interface ProposalAggregatedEvent {
    type: 'ProposalAggregated';
    market_id: Pubkey;
    proposal_likes: number;
    proposal_dislikes: number;
    new_state: 'PROPOSED' | 'APPROVED';
  }

  interface MarketStateChangedEvent {
    type: 'MarketStateChanged';
    market_id: Pubkey;
    old_state: string;
    new_state: string;
  }

  // ... more event types
  ```

#### Event Parser Service
- [ ] Create `/backend/src/services/event-indexer/parser.ts`
- [ ] Implement parser:
  ```typescript
  function parseEvent(instruction: any): Event | null {
    // Extract program name
    const program = instruction.program;

    if (program !== 'zmart_core') return null;

    // Discriminate by instruction name or event data
    const eventType = determineEventType(instruction.data);

    switch (eventType) {
      case 'ProposalAggregated':
        return parseProposalAggregated(instruction);
      case 'DisputeAggregated':
        return parseDisputeAggregated(instruction);
      case 'MarketStateChanged':
        return parseMarketStateChanged(instruction);
      // ... more cases
      default:
        return null;
    }
  }
  ```

#### Event Extraction from Logs
- [ ] Parse event logs (program-generated log entries):
  ```typescript
  function extractEventsFromLogs(logs: string[]): RawEvent[] {
    const events: RawEvent[] = [];

    for (const log of logs) {
      // Look for log patterns (program-specific format)
      // Example: "Program data: ..."
      if (log.startsWith('Program data:')) {
        const data = parseBase64Data(log);
        events.push(data);
      }
    }

    return events;
  }
  ```

#### Event Storage
- [ ] Create database schema for event_logs:
  ```sql
  CREATE TABLE event_logs (
    id SERIAL PRIMARY KEY,
    transaction_signature TEXT NOT NULL UNIQUE,
    block_slot BIGINT NOT NULL,
    block_time TIMESTAMP NOT NULL,
    event_type TEXT NOT NULL,  -- ProposalAggregated, etc
    market_id TEXT,
    event_data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    INDEX idx_market_id (market_id),
    INDEX idx_event_type (event_type),
    INDEX idx_block_slot (block_slot)
  );
  ```

#### Event Type Routing
- [ ] Create `/backend/src/services/event-indexer/router.ts`
- [ ] Route events to appropriate handlers:
  ```typescript
  async function routeEvent(event: ParsedEvent): Promise<void> {
    switch (event.type) {
      case 'ProposalAggregated':
        return handleProposalAggregated(event);
      case 'MarketStateChanged':
        return handleMarketStateChanged(event);
      case 'WinningsClaimed':
        return handleWinningsClaimed(event);
      // ... more cases
      default:
        console.warn(`Unknown event type: ${event.type}`);
    }
  }
  ```

---

### Day 5: Event Storage & Query API

#### Batch Event Storage
- [ ] Implement efficient batch writes:
  ```typescript
  async function storeEvents(events: ParsedEvent[]): Promise<void> {
    const records = events.map(e => ({
      transaction_signature: e.txSignature,
      block_slot: e.slot,
      block_time: new Date(e.blockTime * 1000),
      event_type: e.type,
      market_id: e.data?.market_id,
      event_data: JSON.stringify(e.data),
      created_at: new Date()
    }));

    // Batch insert
    await db.eventLogs.bulkCreate(records, {
      ignoreDuplicates: true  // Idempotency
    });
  }
  ```

#### Event Query API
- [ ] Implement GET /api/events/{market_id}:
  ```typescript
  GET /api/events/Ey3Cm2...?limit=100&offset=0

  Returns:
  {
    events: [
      {
        transaction_signature: "...",
        block_slot: 419800000,
        event_type: "ProposalAggregated",
        event_data: {...},
        timestamp: "2025-11-07T10:00:00Z"
      }
    ],
    total_count: 150,
    has_more: true
  }
  ```

- [ ] Implement GET /api/events?event_type=ProposalAggregated:
  ```typescript
  // Filter by event type, market, date range, etc
  ```

#### Event Search Endpoints
- [ ] GET /api/events/search?q=market_id&limit=20
- [ ] GET /api/events/by-type/{event_type}
- [ ] GET /api/events/by-date?from=...&to=...

---

### Day 6-7: State Synchronization & Deployment

#### Market State Updater
- [ ] Create `/backend/src/services/event-indexer/state-sync.ts`
- [ ] Implement state synchronization:
  ```typescript
  async function syncMarketState(event: MarketStateChangedEvent): Promise<void> {
    // Trust on-chain state (source of truth)
    await db.markets.update(event.market_id, {
      state: event.new_state,
      last_state_change: new Date(),
      last_state_change_tx: event.txSignature
    });

    // Broadcast WebSocket update
    broadcastToClients({
      type: 'MARKET_STATE_CHANGED',
      market_id: event.market_id,
      new_state: event.new_state
    });
  }
  ```

#### Reconciliation Check
- [ ] Create `/backend/src/jobs/event-reconciliation.ts`
- [ ] Run every 10 minutes:
  ```typescript
  const job = cron.schedule('*/10 * * * *', async () => {
    const markets = await db.markets.findAll();

    for (const dbMarket of markets) {
      // Fetch on-chain state
      const onChainMarket = await getMarketAccount(dbMarket.market_id);

      // Compare
      if (dbMarket.state !== onChainMarket.state) {
        // Log discrepancy
        await db.discrepancies.create({
          market_id: dbMarket.market_id,
          db_state: dbMarket.state,
          on_chain_state: onChainMarket.state,
          detected_at: new Date()
        });

        // Fix: Trust on-chain
        await db.markets.update(dbMarket.market_id, {
          state: onChainMarket.state
        });

        // Alert
        alertOperations('state_discrepancy', {
          market_id: dbMarket.market_id,
          expected: onChainMarket.state,
          got: dbMarket.state
        });
      }
    }
  });
  ```

#### Deployment
- [ ] Deploy event indexer to staging
- [ ] Configure Helius webhook to point to staging
- [ ] Test end-to-end:
  1. Submit transaction on devnet
  2. Wait for webhook (usually <5 seconds)
  3. Verify event stored in database
  4. Verify market state synchronized
  5. Verify discrepancy check finds matches

#### Success Criteria
- ✅ 100% of on-chain events captured
- ✅ Zero event loss or duplication
- ✅ <10 second state synchronization latency
- ✅ Reconciliation check detecting mismatches
- ✅ No false positive discrepancies

---

## Week 6: API Gateway Upgrades

### Day 1-2: WebSocket Infrastructure

#### WebSocket Server Setup
- [ ] Install ws library: `npm install ws`
- [ ] Create `/backend/src/websocket/server.ts`:
  ```typescript
  import express from 'express';
  import { WebSocketServer } from 'ws';
  import http from 'http';

  const app = express();
  const server = http.createServer(app);
  const wss = new WebSocketServer({server});

  // Connection handling
  wss.on('connection', (ws: WebSocket, req: Request) => {
    // Authenticate
    const token = extractToken(req);
    const user = verifyToken(token);
    if (!user) {
      ws.close(4001, 'Unauthorized');
      return;
    }

    // Subscribe to channels
    const channels = extractChannels(req.url);
    subscribeToChannels(ws, user, channels);

    // Message handling
    ws.on('message', (data: Buffer) => {
      handleClientMessage(ws, user, JSON.parse(data.toString()));
    });

    // Disconnect
    ws.on('close', () => {
      unsubscribeFromChannels(ws, user);
    });

    // Heartbeat (keep-alive)
    ws.isAlive = true;
    ws.on('pong', () => {
      ws.isAlive = true;
    });
  });

  // Ping clients every 30 seconds
  setInterval(() => {
    wss.clients.forEach((ws) => {
      if (!ws.isAlive) {
        return ws.terminate();
      }
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  server.listen(3001);
  ```

#### Subscription Management
- [ ] Create `/backend/src/websocket/subscriptions.ts`:
  ```typescript
  interface Subscription {
    ws: WebSocket;
    user_pubkey: string;
    channels: string[]; // market_{id}, votes_{id}, etc
    subscribed_at: Date;
  }

  const subscriptions = new Map<WebSocket, Subscription>();

  function subscribeToChannels(
    ws: WebSocket,
    user: User,
    channels: string[]
  ): void {
    // Store subscription
    subscriptions.set(ws, {
      ws,
      user_pubkey: user.pubkey,
      channels,
      subscribed_at: new Date()
    });

    // Send subscription confirmation
    ws.send(JSON.stringify({
      type: 'SUBSCRIPTION_CONFIRMED',
      channels
    }));
  }

  function unsubscribeFromChannels(ws: WebSocket, user: User): void {
    subscriptions.delete(ws);
  }

  function broadcastToChannel(channel: string, message: any): void {
    const payload = JSON.stringify(message);

    subscriptions.forEach((sub, ws) => {
      if (sub.channels.includes(channel) && ws.readyState === WebSocket.OPEN) {
        ws.send(payload);
      }
    });
  }
  ```

#### Authentication for WebSockets
- [ ] Validate SIWE token on connection:
  ```typescript
  function extractToken(req: Request): string | null {
    // From query params or headers
    const url = new URL(req.url, `http://${req.headers.host}`);
    return url.searchParams.get('token') ||
           req.headers['authorization']?.split(' ')[1];
  }

  function verifyToken(token: string): User | null {
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      return {
        pubkey: payload.sub,  // SIWE signer
        wallet: payload.wallet
      };
    } catch {
      return null;
    }
  }
  ```

---

### Day 3-4: Real-Time Updates

#### PostgreSQL Triggers
- [ ] Create database trigger for vote updates:
  ```sql
  CREATE FUNCTION notify_vote_update() RETURNS trigger AS $$
  BEGIN
    PERFORM pg_notify(
      'market_' || NEW.market_id,
      json_build_object(
        'type', 'VOTE_UPDATE',
        'market_id', NEW.market_id,
        'likes', (SELECT COUNT(*) FROM vote_records WHERE market_id = NEW.market_id AND vote = true),
        'dislikes', (SELECT COUNT(*) FROM vote_records WHERE market_id = NEW.market_id AND vote = false),
        'timestamp', NEW.created_at
      )::text
    );
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;

  CREATE TRIGGER vote_record_update AFTER INSERT ON vote_records
  FOR EACH ROW EXECUTE FUNCTION notify_vote_update();
  ```

- [ ] Create trigger for market state changes:
  ```sql
  CREATE FUNCTION notify_market_state_change() RETURNS trigger AS $$
  BEGIN
    IF NEW.state != OLD.state THEN
      PERFORM pg_notify(
        'market_' || NEW.id,
        json_build_object(
          'type', 'STATE_CHANGED',
          'market_id', NEW.id,
          'old_state', OLD.state,
          'new_state', NEW.state,
          'timestamp', NOW()
        )::text
      );
    END IF;
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;

  CREATE TRIGGER market_state_change AFTER UPDATE ON markets
  FOR EACH ROW EXECUTE FUNCTION notify_market_state_change();
  ```

#### Notification Listener
- [ ] Create `/backend/src/services/websocket/notifier.ts`:
  ```typescript
  import { Client } from 'pg';

  const pgClient = new Client(DATABASE_URL);
  await pgClient.connect();

  // Listen to all channels
  await pgClient.query('LISTEN market_*');
  await pgClient.query('LISTEN position_*');
  await pgClient.query('LISTEN vote_*');

  pgClient.on('notification', (msg) => {
    const channel = msg.channel;
    const payload = JSON.parse(msg.payload);

    // Broadcast to subscribed WebSocket clients
    broadcastToChannel(channel, payload);

    console.log(`Notified ${channel}:`, payload);
  });
  ```

#### Market State Broadcast
- [ ] Implement market state change handler:
  ```typescript
  async function handleMarketStateChange(event: MarketStateChangedEvent): Promise<void> {
    // Also broadcast to WebSocket
    broadcastToChannel(`market_${event.market_id}`, {
      type: 'STATE_CHANGED',
      market_id: event.market_id,
      new_state: event.new_state,
      timestamp: new Date()
    });
  }
  ```

#### Position Update Broadcasts
- [ ] Implement position update notifications:
  ```typescript
  async function handleTradeCreated(trade: Trade): Promise<void> {
    // Broadcast to user's position channel
    broadcastToChannel(`user_${trade.user_pubkey}_positions`, {
      type: 'POSITION_UPDATE',
      market_id: trade.market_id,
      shares_yes: trade.shares_yes,
      shares_no: trade.shares_no,
      total_invested: trade.total_invested
    });
  }
  ```

#### Voting Progress Tracking
- [ ] WebSocket endpoint: `ws://api.zmart.dev/markets/{market_id}/voting`
  ```typescript
  // Receives periodic updates with vote counts:
  {
    type: 'VOTING_PROGRESS',
    market_id: "Ey3Cm2...",
    likes: 42,
    dislikes: 8,
    total: 50,
    percentage_bps: 8400,  // 84% = 8400 bps
    threshold_bps: 7000,   // 70% threshold
    time_remaining_seconds: 300,  // Until next aggregation
    timestamp: "2025-11-07T10:05:00Z"
  }
  ```

---

### Day 5: Rate Limiting & Circuit Breaker

#### Tiered Rate Limiting
- [ ] Create `/backend/src/middleware/rate-limit.ts`:
  ```typescript
  const rateLimiters = {
    unauthenticated: rateLimit({
      windowMs: 60000,
      maxRequests: 100,
      keyGenerator: (req) => req.ip
    }),
    authenticated: rateLimit({
      windowMs: 60000,
      maxRequests: 1000,
      keyGenerator: (req) => req.user?.pubkey || req.ip
    }),
    internal: rateLimit({
      windowMs: 60000,
      maxRequests: 10000,
      keyGenerator: (req) => req.headers['x-service-key']
    })
  };

  // Apply based on auth
  app.use((req, res, next) => {
    if (req.user) {
      return rateLimiters.authenticated(req, res, next);
    }
    rateLimiters.unauthenticated(req, res, next);
  });
  ```

#### Circuit Breaker Pattern
- [ ] Create `/backend/src/middleware/circuit-breaker.ts`:
  ```typescript
  class CircuitBreaker {
    state = 'CLOSED';
    failureCount = 0;
    nextRetryTime = null;

    async execute(fn, fallback) {
      if (this.state === 'OPEN') {
        if (Date.now() < this.nextRetryTime) {
          return fallback?.() || {status: 503, error: 'Service Unavailable'};
        }
        this.state = 'HALF_OPEN';
      }

      try {
        const result = await fn();
        if (this.state === 'HALF_OPEN') {
          this.state = 'CLOSED';
          this.failureCount = 0;
        }
        return result;
      } catch (error) {
        this.failureCount++;
        if (this.failureCount >= 5) {
          this.state = 'OPEN';
          this.nextRetryTime = Date.now() + 60000; // 1 min
        }
        throw error;
      }
    }
  }

  const breaker = new CircuitBreaker();
  ```

#### Health Check Endpoint
- [ ] Implement GET /health:
  ```typescript
  GET /health

  Returns:
  {
    status: 'healthy' | 'degraded' | 'unhealthy',
    services: {
      database: 'ok' | 'error',
      redis: 'ok' | 'error',
      solana_rpc: 'ok' | 'error',
      event_indexer: 'ok' | 'error'
    },
    metrics: {
      uptime_seconds: 86400,
      active_connections: 42,
      requests_per_minute: 1200,
      error_rate: 0.2
    }
  }
  ```

---

### Day 6-7: Testing & Deployment

#### WebSocket Load Tests
- [ ] Create `/backend/tests/load/websocket.test.ts`:
  ```typescript
  // Test: 1000+ concurrent WebSocket connections
  // Test: Real-time message delivery <100ms latency
  // Test: Reconnection handling
  // Test: Memory usage stability over time
  ```

#### Integration Tests
- [ ] Test API gateway with WebSocket:
  1. Connect WebSocket
  2. Subscribe to market channel
  3. Submit vote (triggers broadcast)
  4. Verify WebSocket receives update
  5. Disconnect and reconnect
  6. Verify state synchronized on reconnect

#### Rate Limit Testing
- [ ] Test rate limiting:
  1. Exceed unauthenticated limit
  2. Verify 429 Too Many Requests
  3. Authenticate
  4. Verify higher limit applies

#### Deployment
- [ ] Deploy API gateway to staging
- [ ] Run load tests
- [ ] Verify metrics in monitoring dashboard

#### Success Criteria
- ✅ WebSocket: 1000+ concurrent connections
- ✅ Real-time latency: <100ms p99
- ✅ Rate limiting: Correctly limiting traffic
- ✅ Circuit breaker: Activating on failures
- ✅ Health check: All services green

---

## Week 7: Market Monitor Service

### Day 1-2: State Transition Scheduler

#### FSM Implementation
- [ ] Create `/backend/src/services/market-monitor/fsm.ts`
- [ ] Define state transitions:
  ```typescript
  type MarketState = 'PROPOSED' | 'APPROVED' | 'ACTIVE' | 'RESOLVING' | 'DISPUTED' | 'FINALIZED' | 'CANCELLED';

  interface StateTransition {
    from: MarketState;
    to: MarketState;
    trigger: 'time' | 'vote_threshold' | 'manual' | 'admin';
    condition?: (market: Market) => boolean;
  }

  const allowedTransitions: StateTransition[] = [
    // Automatic transitions
    {from: 'RESOLVING', to: 'FINALIZED', trigger: 'time', condition: (m) => now - m.resolution_proposed_at >= 48*3600},
    {from: 'DISPUTED', to: 'FINALIZED', trigger: 'time', condition: (m) => now - m.dispute_initiated_at >= 3*24*3600},

    // Manual/vote-based transitions
    {from: 'PROPOSED', to: 'APPROVED', trigger: 'vote_threshold'},
    {from: 'APPROVED', to: 'ACTIVE', trigger: 'manual'},

    // Admin-only
    {from: 'PROPOSED', to: 'CANCELLED', trigger: 'admin'},
    {from: 'APPROVED', to: 'CANCELLED', trigger: 'admin'},
  ];
  ```

#### Cron Scheduler
- [ ] Create `/backend/src/jobs/market-monitor-cron.ts`:
  ```typescript
  const job = cron.schedule('* * * * *', async () => {  // Every minute
    console.log('Market monitor check starting');

    const markets = await db.markets.findAll({
      where: {state: {$notIn: ['FINALIZED', 'CANCELLED']}}
    });

    for (const market of markets) {
      const now = Date.now() / 1000;  // Unix timestamp

      // Check RESOLVING timeout
      if (market.state === 'RESOLVING') {
        const resolvingDuration = now - market.resolution_proposed_at;
        if (resolvingDuration >= 48 * 3600) {  // 48 hours
          await transitionMarketState(market, 'FINALIZED');
        }
      }

      // Check DISPUTED timeout
      if (market.state === 'DISPUTED') {
        const disputeDuration = now - market.dispute_initiated_at;
        if (disputeDuration >= 3 * 24 * 3600) {  // 3 days
          await transitionMarketState(market, 'FINALIZED');
        }
      }

      // Check for stuck markets
      const lastActivity = Math.max(
        market.created_at,
        market.approved_at,
        market.activated_at,
        market.resolution_proposed_at,
        market.dispute_initiated_at
      );
      const inactivityDuration = now - lastActivity;
      if (inactivityDuration > 30 * 24 * 3600) {  // 30 days
        await alertOperations('stuck_market', {market_id: market.id});
      }
    }
  });
  ```

#### State Transition Executor
- [ ] Create `/backend/src/services/market-monitor/executor.ts`:
  ```typescript
  async function transitionMarketState(
    market: Market,
    newState: MarketState
  ): Promise<void> {
    // Validate transition
    const transition = allowedTransitions.find(
      t => t.from === market.state && t.to === newState
    );
    if (!transition) {
      throw new Error(`Invalid transition: ${market.state} → ${newState}`);
    }

    // Call on-chain if needed
    if (newState === 'FINALIZED') {
      await callFinalizeMarketOnChain(market);
    }

    // Update database
    await db.markets.update(market.id, {
      state: newState,
      [`${newState.toLowerCase()}_at`]: new Date(),
      last_action: 'auto_transition'
    });

    // Broadcast update
    broadcastToChannel(`market_${market.id}`, {
      type: 'STATE_CHANGED',
      market_id: market.id,
      new_state: newState,
      automatic: true
    });

    console.log(`Transitioned ${market.id} from ${market.state} to ${newState}`);
  }
  ```

---

### Day 3-4: Automatic Transitions

#### RESOLVING Auto-Trigger
- [ ] Implement automatic resolve finalization:
  ```typescript
  // After 48h in RESOLVING state, automatically transition to FINALIZED
  if (market.state === 'RESOLVING') {
    const resolvingDuration = now - market.resolution_proposed_at;
    if (resolvingDuration >= 48 * 3600) {
      const votes = await getDisputeVotes(market.id);
      const agreed = votes.support >= votes.reject;  // >= 60%

      // Call finalize_market on-chain
      const tx = await program.methods
        .finalizeMarket(
          agreed ? market.proposed_outcome : !market.proposed_outcome,
          null  // No dispute votes for direct resolution
        )
        .accounts({market: market.pubkey, backendAuthority: authority})
        .rpc({commitment: 'confirmed'});

      // Update state
      await transitionMarketState(market, 'FINALIZED');
    }
  }
  ```

#### DISPUTED → FINALIZED
- [ ] Implement dispute resolution:
  ```typescript
  if (market.state === 'DISPUTED') {
    const disputeDuration = now - market.dispute_initiated_at;
    if (disputeDuration >= 3 * 24 * 3600 || disputeVotesCounted) {
      const {support, reject} = await countDisputeVotes(market.id);
      const supportPercent = (support * 10000) / (support + reject);

      const outcomeFlipped = supportPercent >= 6000;  // 60%

      // Call finalize_market on-chain
      const tx = await program.methods
        .finalizeMarket(
          outcomeFlipped ? !market.proposed_outcome : market.proposed_outcome,
          { agree: support, disagree: reject }
        )
        .accounts({market: market.pubkey})
        .rpc({commitment: 'confirmed'});

      await transitionMarketState(market, 'FINALIZED');
    }
  }
  ```

#### Enable Claims Automatically
- [ ] After market FINALIZED:
  ```typescript
  async function handleMarketFinalized(market: Market): Promise<void> {
    // Set claims_enabled flag
    await db.markets.update(market.id, {
      claims_enabled: true,
      claims_available_at: new Date()
    });

    // Notify users
    broadcastToChannel(`market_${market.id}`, {
      type: 'CLAIMS_ENABLED',
      market_id: market.id,
      outcome: market.final_outcome
    });
  }
  ```

---

### Day 5: Circuit Breaker & Alerts

#### Circuit Breaker for State Transitions
- [ ] Implement circuit breaker for on-chain calls:
  ```typescript
  class TransitionCircuitBreaker {
    state = 'CLOSED';
    consecutiveFailures = 0;
    nextRetryTime = null;

    async transition(market: Market, newState: MarketState): Promise<void> {
      if (this.state === 'OPEN') {
        if (Date.now() < this.nextRetryTime) {
          throw new Error('Circuit breaker open, retrying later');
        }
        this.state = 'HALF_OPEN';
      }

      try {
        await transitionMarketState(market, newState);
        this.state = 'CLOSED';
        this.consecutiveFailures = 0;
      } catch (error) {
        this.consecutiveFailures++;
        if (this.consecutiveFailures >= 3) {
          this.state = 'OPEN';
          this.nextRetryTime = Date.now() + 5 * 60000;  // 5 min

          // Escalate to manual review
          await alertOperations('state_transition_failure', {
            market_id: market.id,
            target_state: newState,
            error: error.message,
            action: 'manual_review_required'
          });
        }
        throw error;
      }
    }
  }
  ```

#### Alert System
- [ ] Create `/backend/src/services/alerts/notifier.ts`:
  ```typescript
  enum AlertSeverity {
    CRITICAL = 'CRITICAL',
    HIGH = 'HIGH',
    MEDIUM = 'MEDIUM',
    LOW = 'LOW'
  }

  async function alertOperations(
    alert_type: string,
    data: any,
    severity: AlertSeverity = AlertSeverity.HIGH
  ): Promise<void> {
    // Store in database
    await db.alerts.create({
      alert_type,
      severity,
      data,
      created_at: new Date()
    });

    // Send notifications based on severity
    if (severity === AlertSeverity.CRITICAL) {
      await sendSlackMessage(`🚨 CRITICAL: ${alert_type}`);
      await sendEmail(ops_team, `Critical Alert: ${alert_type}`);
      await createPageOnCallIncident(alert_type);
    } else if (severity === AlertSeverity.HIGH) {
      await sendSlackMessage(`⚠️ HIGH: ${alert_type}`);
    } else {
      await logToDatabase(alert_type, data);
    }
  }
  ```

#### Slack Integration
- [ ] Create `/backend/src/services/alerts/slack.ts`:
  ```typescript
  async function sendSlackMessage(message: string): Promise<void> {
    const webhook = process.env.SLACK_WEBHOOK_URL;
    await fetch(webhook, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        text: message,
        username: 'ZMART Alert Bot',
        icon_emoji: ':robot_face:'
      })
    });
  }
  ```

#### Stuck Market Detection
- [ ] Detect markets with no progress for 30 days:
  ```typescript
  async function detectStuckMarkets(): Promise<void> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600000);

    const stuckMarkets = await db.markets.findAll({
      where: {
        state: {$notIn: ['FINALIZED', 'CANCELLED']},
        updated_at: {$lt: thirtyDaysAgo}
      }
    });

    for (const market of stuckMarkets) {
      await alertOperations('stuck_market', {
        market_id: market.id,
        state: market.state,
        last_update: market.updated_at
      }, AlertSeverity.MEDIUM);
    }
  }
  ```

---

### Day 6-7: Testing & Deployment

#### State Transition Tests
- [ ] Create `/backend/tests/integration/market-transitions.test.ts`:
  - ✅ RESOLVING → FINALIZED (after 48h)
  - ✅ DISPUTED → FINALIZED (after 3d with vote)
  - ✅ Manual transitions
  - ✅ Invalid transitions rejected

#### Circuit Breaker Tests
- [ ] Test circuit breaker activation:
  1. Trigger 3 failures
  2. Verify circuit opens
  3. Verify subsequent calls return immediately
  4. Wait for retry window
  5. Verify circuit Half-Open state
  6. Verify circuit closes on success

#### Stuck Market Detection
- [ ] Simulate 30-day inactive market
- [ ] Verify alert triggered
- [ ] Verify alert sent to Slack

#### Load & Stress Tests
- [ ] Monitor 100+ markets simultaneously
- [ ] Verify monitor keeps up with state changes
- [ ] Verify no missed transitions

#### Deployment
- [ ] Deploy market monitor to staging
- [ ] Configure Slack webhook
- [ ] Run end-to-end test:
  1. Create market on devnet
  2. Activate market
  3. Wait for auto-RESOLVING trigger
  4. Verify state transition
  5. Verify Slack notification

#### Success Criteria
- ✅ 100% of due transitions completed
- ✅ Zero stuck markets undetected
- ✅ Circuit breaker preventing cascade
- ✅ Alerts properly routed
- ✅ 99.9% uptime

---

## End of Week 7 Verification

### Phase 2 Completion Checklist

**Week 4 (Vote Aggregator):**
- [ ] Vote collection API working
- [ ] Cron job aggregating every 5 min
- [ ] On-chain state changes reflecting correctly
- [ ] 100+ tests passing
- [ ] Deployed to staging

**Week 5 (Event Indexer):**
- [ ] Helius webhooks receiving events
- [ ] Events stored with deduplication
- [ ] Market state synchronizing <10s
- [ ] Reconciliation detecting mismatches
- [ ] Deployed to staging

**Week 6 (API Gateway):**
- [ ] WebSocket accepting 1000+ connections
- [ ] Real-time updates <100ms latency
- [ ] Rate limiting enforced
- [ ] Circuit breaker activating
- [ ] Deployed to staging

**Week 7 (Market Monitor):**
- [ ] Automatic state transitions working
- [ ] Stuck market detection functioning
- [ ] Alerts reaching ops team
- [ ] Circuit breaker preventing failures
- [ ] Deployed to staging

### Phase 2 Success Metrics

| Metric | Target | Status |
|--------|--------|--------|
| Vote Aggregation Success Rate | 100% | ✅/❌ |
| Vote Aggregation Latency | <5 min | ✅/❌ |
| Event Indexing Latency | <10 sec | ✅/❌ |
| WebSocket Connections | 1000+ | ✅/❌ |
| Message Latency | <100ms p99 | ✅/❌ |
| API Uptime | 99.9% | ✅/❌ |
| Data Consistency | 100% | ✅/❌ |
| Alert Accuracy | 99%+ | ✅/❌ |

### Ready for Phase 3?

Phase 2 is complete when:
- ✅ All 4 services deployed to staging
- ✅ All services running stably for 24+ hours
- ✅ All success metrics met or exceeded
- ✅ Zero critical bugs in logs
- ✅ All team members trained on ops procedures

---

**Total Phase 2 Effort:** ~320 engineer-hours (2 engineers × 4 weeks)
**Ready Date:** End of Week 7 (December 2, 2025)

