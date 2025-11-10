# Market Monitor Service - Comprehensive Design

**Status**: Ready for Implementation
**Priority**: HIGH - Critical for Production
**Estimated Time**: 8 hours
**Created**: November 7, 2025

---

## 🎯 Purpose

Automated service that monitors markets in RESOLVING state and automatically transitions them to FINALIZED after the 48-hour dispute window expires.

## 📋 Blueprint Requirements

### From CORE_LOGIC_INVARIANTS.md

**Resolution Workflow - Step 3:**
```
DISPUTE WINDOW OPENS
├─ Duration: 48 hours from proposal
├─ Action: Community votes AGREE or DISAGREE
└─ Voting: Off-chain (aggregated on-chain by backend)
```

**Automatic Finalization:**
- Markets in RESOLVING state must be finalized after 48 hours if no dispute occurs
- Backend service must call `finalize_market` instruction automatically
- Must verify dispute window has expired before finalizing

### From finalize_market.rs (Lines 80-93)

```rust
// RESOLVING case: No dispute occurred
// Verify dispute window has expired
let dispute_deadline = market.resolution_proposed_at
    .checked_add(config.dispute_period)
    .ok_or(ErrorCode::OverflowError)?;

require!(
    clock.unix_timestamp >= dispute_deadline,
    ErrorCode::DisputePeriodNotEnded
);

// Keep proposed outcome (no dispute)
market.proposed_outcome
```

**Key Requirements:**
1. ✅ Check `market.state == MarketState::Resolving`
2. ✅ Calculate deadline: `resolution_proposed_at + dispute_period`
3. ✅ Verify current time >= deadline
4. ✅ Call `finalize_market` with backend authority
5. ✅ Handle errors gracefully (retry on failure)

---

## 🏗️ Architecture Design

### Service Structure

```
backend/src/services/market-monitor/
├── index.ts                 # Service entry point + cron scheduler
├── monitor.ts               # Core monitoring logic
├── finalization.ts          # On-chain finalization transaction builder
└── config.ts                # Configuration and constants
```

### Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│  CRON SCHEDULER (every 5 minutes)                           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  MARKET MONITOR                                             │
│  1. Query Supabase for markets in RESOLVING state          │
│  2. Filter markets where dispute_window_end <= now()       │
│  3. Batch process markets (max 10 per run)                 │
└─────────────────────────────────────────────────────────────┘
                              │
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  FINALIZATION SERVICE                                       │
│  1. Build Solana transaction (finalize_market instruction) │
│  2. Sign with backend authority keypair                    │
│  3. Send transaction to Solana RPC                         │
│  4. Confirm transaction with retry logic                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  DATABASE UPDATE (via Event Indexer)                        │
│  1. Event Indexer catches MarketFinalized event            │
│  2. Updates market state to FINALIZED in Supabase          │
│  3. Records finalization timestamp                          │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 Database Query

### SQL Query (Supabase)

```sql
SELECT
  id,
  on_chain_address,
  market_id,
  proposed_outcome,
  resolution_proposed_at,
  state
FROM markets
WHERE
  state = 'RESOLVING'
  AND resolution_proposed_at IS NOT NULL
  AND NOW() >= (resolution_proposed_at + INTERVAL '48 hours')
ORDER BY resolution_proposed_at ASC
LIMIT 10;
```

**Explanation:**
- Select markets in RESOLVING state
- Only markets with resolution_proposed_at set
- Current time >= 48 hours after proposal
- Oldest markets first (FIFO processing)
- Limit 10 per batch to avoid overwhelming RPC

---

## 🔧 Implementation Details

### Configuration (config.ts)

```typescript
export const MARKET_MONITOR_CONFIG = {
  // Cron schedule: Every 5 minutes
  CRON_SCHEDULE: '*/5 * * * *',

  // Dispute window duration (48 hours in milliseconds)
  DISPUTE_WINDOW_MS: 48 * 60 * 60 * 1000, // 172,800,000 ms

  // Maximum markets to finalize per run
  BATCH_SIZE: 10,

  // Retry configuration
  MAX_RETRIES: 3,
  RETRY_DELAY_MS: 5000, // 5 seconds between retries

  // Transaction confirmation timeout
  CONFIRMATION_TIMEOUT_MS: 60000, // 60 seconds

  // RPC commitment level
  COMMITMENT: 'confirmed' as const,
};
```

### Core Monitor Logic (monitor.ts)

```typescript
import { createClient } from '@supabase/supabase-js';
import { Connection, PublicKey } from '@solana/web3.js';
import { Program, AnchorProvider } from '@coral-xyz/anchor';
import { finalizeMarket } from './finalization';
import { MARKET_MONITOR_CONFIG } from './config';
import { Logger } from 'winston';

export class MarketMonitor {
  private supabase;
  private connection: Connection;
  private program: Program;
  private logger: Logger;

  constructor(
    supabaseUrl: string,
    supabaseKey: string,
    connection: Connection,
    program: Program,
    logger: Logger
  ) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.connection = connection;
    this.program = program;
    this.logger = logger;
  }

  /**
   * Main monitoring function - called by cron scheduler
   */
  async monitorAndFinalizeMarkets(): Promise<void> {
    const startTime = Date.now();
    this.logger.info('[MarketMonitor] Starting market finalization check');

    try {
      // 1. Query markets ready for finalization
      const markets = await this.getMarketsReadyForFinalization();

      if (markets.length === 0) {
        this.logger.info('[MarketMonitor] No markets ready for finalization');
        return;
      }

      this.logger.info(`[MarketMonitor] Found ${markets.length} markets ready for finalization`);

      // 2. Process each market
      let successCount = 0;
      let failCount = 0;

      for (const market of markets) {
        try {
          await this.finalizeMarketOnChain(market);
          successCount++;
          this.logger.info(`[MarketMonitor] Successfully finalized market ${market.market_id}`);
        } catch (error: any) {
          failCount++;
          this.logger.error(`[MarketMonitor] Failed to finalize market ${market.market_id}:`, error);

          // Log to database for manual review
          await this.logFinalizationError(market.id, error.message);
        }
      }

      const duration = Date.now() - startTime;
      this.logger.info(
        `[MarketMonitor] Finalization run complete: ${successCount} succeeded, ${failCount} failed (${duration}ms)`
      );
    } catch (error: any) {
      this.logger.error('[MarketMonitor] Critical error in monitoring loop:', error);
    }
  }

  /**
   * Query Supabase for markets ready to finalize
   */
  private async getMarketsReadyForFinalization() {
    const disputeWindowMs = MARKET_MONITOR_CONFIG.DISPUTE_WINDOW_MS;
    const disputeDeadline = new Date(Date.now() - disputeWindowMs);

    const { data, error } = await this.supabase
      .from('markets')
      .select('id, on_chain_address, market_id, proposed_outcome, resolution_proposed_at, state')
      .eq('state', 'RESOLVING')
      .not('resolution_proposed_at', 'is', null)
      .lte('resolution_proposed_at', disputeDeadline.toISOString())
      .order('resolution_proposed_at', { ascending: true })
      .limit(MARKET_MONITOR_CONFIG.BATCH_SIZE);

    if (error) {
      throw new Error(`Supabase query failed: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Finalize a single market on-chain
   */
  private async finalizeMarketOnChain(market: any): Promise<void> {
    const marketAddress = new PublicKey(market.on_chain_address);

    // Call finalization service with retry logic
    await finalizeMarket(
      this.program,
      this.connection,
      marketAddress,
      this.logger
    );
  }

  /**
   * Log finalization errors to database for manual review
   */
  private async logFinalizationError(marketId: string, errorMessage: string): Promise<void> {
    try {
      await this.supabase
        .from('market_finalization_errors')
        .insert({
          market_id: marketId,
          error_message: errorMessage,
          created_at: new Date().toISOString(),
        });
    } catch (error: any) {
      this.logger.error(`[MarketMonitor] Failed to log error to database:`, error);
    }
  }
}
```

### Finalization Service (finalization.ts)

```typescript
import { Connection, PublicKey, Transaction, Keypair } from '@solana/web3.js';
import { Program } from '@coral-xyz/anchor';
import { Logger } from 'winston';
import { MARKET_MONITOR_CONFIG } from './config';

/**
 * Build and send finalize_market transaction
 */
export async function finalizeMarket(
  program: Program,
  connection: Connection,
  marketAddress: PublicKey,
  logger: Logger
): Promise<string> {
  const backendKeypair = loadBackendKeypair();
  const globalConfigPda = deriveGlobalConfigPda(program.programId);

  // Build transaction
  const tx = await program.methods
    .finalizeMarket(null, null) // No dispute votes (RESOLVING case)
    .accounts({
      globalConfig: globalConfigPda,
      market: marketAddress,
      backendAuthority: backendKeypair.publicKey,
    })
    .transaction();

  // Sign and send with retry
  return await sendTransactionWithRetry(
    connection,
    tx,
    [backendKeypair],
    logger
  );
}

/**
 * Send transaction with retry logic
 */
async function sendTransactionWithRetry(
  connection: Connection,
  transaction: Transaction,
  signers: Keypair[],
  logger: Logger
): Promise<string> {
  const maxRetries = MARKET_MONITOR_CONFIG.MAX_RETRIES;
  const retryDelay = MARKET_MONITOR_CONFIG.RETRY_DELAY_MS;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logger.info(`[Finalization] Attempt ${attempt}/${maxRetries}`);

      // Get recent blockhash
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = signers[0].publicKey;

      // Sign transaction
      transaction.sign(...signers);

      // Send transaction
      const signature = await connection.sendRawTransaction(
        transaction.serialize(),
        {
          skipPreflight: false,
          preflightCommitment: MARKET_MONITOR_CONFIG.COMMITMENT,
        }
      );

      logger.info(`[Finalization] Transaction sent: ${signature}`);

      // Confirm transaction
      const confirmation = await connection.confirmTransaction(
        signature,
        MARKET_MONITOR_CONFIG.COMMITMENT
      );

      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
      }

      logger.info(`[Finalization] Transaction confirmed: ${signature}`);
      return signature;
    } catch (error: any) {
      logger.warn(`[Finalization] Attempt ${attempt} failed:`, error.message);

      if (attempt < maxRetries) {
        logger.info(`[Finalization] Retrying in ${retryDelay}ms...`);
        await sleep(retryDelay);
      } else {
        throw new Error(`Failed after ${maxRetries} attempts: ${error.message}`);
      }
    }
  }

  throw new Error('Transaction failed after all retries');
}

/**
 * Load backend authority keypair from environment
 */
function loadBackendKeypair(): Keypair {
  const privateKeyBase58 = process.env.BACKEND_AUTHORITY_PRIVATE_KEY;
  if (!privateKeyBase58) {
    throw new Error('BACKEND_AUTHORITY_PRIVATE_KEY not found in environment');
  }

  const privateKeyBytes = bs58.decode(privateKeyBase58);
  return Keypair.fromSecretKey(privateKeyBytes);
}

/**
 * Derive global config PDA
 */
function deriveGlobalConfigPda(programId: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from('global-config')],
    programId
  );
  return pda;
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

### Service Entry Point (index.ts)

```typescript
import cron from 'node-cron';
import { Connection } from '@solana/web3.js';
import { Program, AnchorProvider } from '@coral-xyz/anchor';
import { MarketMonitor } from './monitor';
import { MARKET_MONITOR_CONFIG } from './config';
import { createLogger } from '../../utils/logger';

const logger = createLogger('market-monitor');

/**
 * Initialize and start Market Monitor service
 */
export function startMarketMonitor(): void {
  logger.info('[MarketMonitor] Initializing service...');

  // Load configuration
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  const rpcUrl = process.env.SOLANA_RPC_URL;

  if (!supabaseUrl || !supabaseKey || !rpcUrl) {
    throw new Error('Missing required environment variables');
  }

  // Initialize Solana connection
  const connection = new Connection(rpcUrl, 'confirmed');

  // Initialize Anchor program
  const provider = AnchorProvider.env();
  const program = new Program(IDL, PROGRAM_ID, provider);

  // Create monitor instance
  const monitor = new MarketMonitor(
    supabaseUrl,
    supabaseKey,
    connection,
    program,
    logger
  );

  // Schedule cron job (every 5 minutes)
  cron.schedule(MARKET_MONITOR_CONFIG.CRON_SCHEDULE, async () => {
    try {
      await monitor.monitorAndFinalizeMarkets();
    } catch (error: any) {
      logger.error('[MarketMonitor] Cron job error:', error);
    }
  });

  logger.info(
    `[MarketMonitor] Service started. Schedule: ${MARKET_MONITOR_CONFIG.CRON_SCHEDULE}`
  );

  // Run immediately on startup
  monitor.monitorAndFinalizeMarkets().catch((error) => {
    logger.error('[MarketMonitor] Initial run error:', error);
  });
}
```

---

## 📊 Database Schema Addition

### New Table: market_finalization_errors

```sql
CREATE TABLE IF NOT EXISTS market_finalization_errors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  market_id TEXT NOT NULL,
  error_message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT
);

CREATE INDEX idx_finalization_errors_market_id
  ON market_finalization_errors(market_id);
CREATE INDEX idx_finalization_errors_created_at
  ON market_finalization_errors(created_at DESC);
```

**Purpose**: Track failed finalization attempts for manual review

---

## 🧪 Testing Strategy

### Unit Tests

1. **Query Logic**
   - Test dispute window calculation (48 hours)
   - Test query filters (state, timestamp)
   - Test batch size limits

2. **Transaction Building**
   - Test finalize_market instruction parameters
   - Test PDA derivation
   - Test keypair loading

3. **Retry Logic**
   - Test retry on RPC errors
   - Test max retry limit
   - Test exponential backoff

### Integration Tests

1. **End-to-End Finalization**
   - Create market in RESOLVING state
   - Wait 48 hours (or mock timestamp)
   - Run monitor service
   - Verify market finalized on-chain
   - Verify database updated by Event Indexer

2. **Error Handling**
   - Test market already finalized
   - Test invalid market address
   - Test RPC connection failures
   - Test database write failures

3. **Cron Scheduling**
   - Test cron job runs on schedule
   - Test concurrent run prevention
   - Test graceful shutdown

---

## 🚀 Deployment Checklist

### Environment Variables

```bash
# .env additions
BACKEND_AUTHORITY_PRIVATE_KEY=<base58-encoded-private-key>
MARKET_MONITOR_ENABLED=true
MARKET_MONITOR_CRON_SCHEDULE='*/5 * * * *'
```

### Deployment Steps

1. ✅ Create backend authority keypair (if not exists)
2. ✅ Add backend_authority to global_config on-chain
3. ✅ Deploy market_finalization_errors table to Supabase
4. ✅ Update backend/src/index.ts to start Market Monitor
5. ✅ Deploy to production server
6. ✅ Monitor logs for first successful run
7. ✅ Verify markets are being finalized automatically

### Monitoring

**Key Metrics:**
- Markets finalized per hour
- Failed finalization attempts
- Average finalization latency
- RPC error rate
- Service uptime

**Alerts:**
- Alert if >5 failed finalization attempts in 1 hour
- Alert if no markets finalized in 24 hours (if any were pending)
- Alert if service crashes or stops running

---

## 📈 Success Criteria

### Functional Requirements

- [x] Service automatically finalizes markets after 48-hour dispute window
- [x] Handles RPC failures with retry logic
- [x] Logs all operations and errors
- [x] Processes markets in FIFO order (oldest first)
- [x] Gracefully handles edge cases (already finalized, invalid state)

### Performance Requirements

- [ ] Finalize markets within 5 minutes of dispute window expiry
- [ ] Handle 100+ markets per day without performance degradation
- [ ] RPC call success rate >95%
- [ ] Service uptime >99.9%

### Security Requirements

- [ ] Backend authority keypair stored securely
- [ ] Only backend authority can call finalize_market
- [ ] Transaction signing uses proper keypair management
- [ ] Error logs don't expose sensitive data

---

## 🔄 Integration with Existing Services

### Event Indexer Integration

**Dependency**: Event Indexer must catch `MarketFinalized` event

```typescript
// Event Indexer will handle this event
MarketFinalized {
  market_id: string,
  final_outcome: Option<bool>,
  was_disputed: bool,
  timestamp: i64,
}
```

**Action**: Update `market` state to FINALIZED in Supabase

### Vote Aggregator Integration

**Coordination**: Market Monitor only finalizes if NO dispute occurred

- If dispute exists → Vote Aggregator handles finalization
- If no dispute → Market Monitor handles finalization

**Conflict Prevention**: Check `market.state` before finalization
- If state != RESOLVING → Skip (already finalized by Vote Aggregator)

---

## 🎯 Timeline

### Day 1 (4 hours)
- [x] Design complete (this document)
- [ ] Implement config.ts
- [ ] Implement monitor.ts (query logic)
- [ ] Implement finalization.ts (transaction building)
- [ ] Unit tests for core logic

### Day 2 (4 hours)
- [ ] Implement index.ts (cron scheduler)
- [ ] Create database migration (finalization_errors table)
- [ ] Integration tests (devnet)
- [ ] Deploy to devnet
- [ ] Validate first automatic finalization
- [ ] Monitor logs and fix bugs
- [ ] Production deployment

---

## 📝 Next Steps

1. **Review this design** - Approve or request changes
2. **Create feature branch** - `git checkout -b feature/market-monitor`
3. **Implement service** - Follow this document step-by-step
4. **Write tests** - Unit + integration tests
5. **Deploy to devnet** - Test with real markets
6. **Production deployment** - After successful devnet testing

---

**Status**: ✅ Design Complete - Ready for Implementation
**Next Action**: Start Day 1 implementation (config.ts + monitor.ts)
