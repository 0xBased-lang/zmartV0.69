# Backend Service Implementation Template

**Purpose**: Step-by-step guide for implementing backend services (Vote Aggregator, Market Monitor, IPFS Service, API Gateway)
**Time**: 6-10 hours per service (broken into 18 micro-steps of 20-40 min each)
**Usage**: Follow this template for EVERY backend service you implement

---

## 📋 Prerequisites

Before starting, ensure you have:
- [ ] Story file created: `docs/stories/STORY-X.Y.md`
- [ ] Feature branch: `feature/story-X-Y-service-name`
- [ ] Anchor programs deployed to devnet
- [ ] Reference docs open:
  - `docs/07_ON_CHAIN_OFF_CHAIN_INTEGRATION.md` (architecture)
  - `docs/08_DATABASE_SCHEMA.md` (database schema)
  - `docs/VERIFICATION_SUMMARY.md` (vote aggregation logic)

---

## 🎯 PHASE 1: Planning & Setup (45 min total)

### Step 1.1: Understand Service Purpose (15 min)

```
□ Read service specification in 07_ON_CHAIN_OFF_CHAIN_INTEGRATION.md
  - What is the service responsible for?
  - What triggers its execution?
  - What are inputs/outputs?

□ Identify integration points
  - Which Solana programs does it call?
  - Which database tables does it read/write?
  - Which external APIs does it use?

□ Document in story file
  - Write 2-3 sentence summary
  - List key workflows
  - Note dependencies
```

**Validation**: Can you draw a simple flowchart of the service?

---

### Step 1.2: Setup Service Structure (30 min)

```bash
# Create service directory
cd backend/src/services
mkdir [service-name]
cd [service-name]

# Create service files
touch index.ts         # Main service class
touch types.ts         # TypeScript types
touch config.ts        # Service configuration
touch utils.ts         # Helper functions
```

**File Structure**:
```
backend/src/services/[service-name]/
├── index.ts           # Main service class
├── types.ts           # TypeScript interfaces/types
├── config.ts          # Configuration constants
├── utils.ts           # Helper functions
└── __tests__/         # Test directory
    └── [service-name].test.ts
```

**Checklist**:
```
□ Directory created
□ All files created
□ Imported in backend/src/services/index.ts
□ TypeScript compiles (npm run build)
```

---

## 🏗️ PHASE 2: Type Definitions (45 min total)

### Step 2.1: Define Service Configuration (15 min)

**File**: `backend/src/services/[service-name]/config.ts`

```typescript
/**
 * Configuration for [Service Name]
 */
export const SERVICE_CONFIG = {
  // Timing
  POLL_INTERVAL_MS: 5 * 60 * 1000, // 5 minutes
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY_MS: 10_000, // 10 seconds

  // Thresholds
  MIN_VOTES_REQUIRED: 10,
  APPROVAL_THRESHOLD: 0.7, // 70%

  // Batch sizes
  MAX_BATCH_SIZE: 100,
  CONCURRENCY_LIMIT: 5,

  // RPC
  RPC_ENDPOINT: process.env.SOLANA_RPC_ENDPOINT || '',
  COMMITMENT: 'confirmed' as const,
} as const;

// Validate configuration
if (!SERVICE_CONFIG.RPC_ENDPOINT) {
  throw new Error('[Service Name]: RPC_ENDPOINT not configured');
}
```

**Checklist**:
```
□ All timing constants defined
□ All thresholds from spec included
□ Environment variables referenced
□ Configuration validation included
□ Exported as const
```

---

### Step 2.2: Define TypeScript Types (30 min)

**File**: `backend/src/services/[service-name]/types.ts`

```typescript
import { PublicKey } from '@solana/web3.js';

/**
 * Service state interface
 */
export interface ServiceState {
  isRunning: boolean;
  lastRun: Date | null;
  totalProcessed: number;
  errors: number;
}

/**
 * Input data structure
 */
export interface VoteData {
  marketId: string;
  userWallet: string;
  vote: boolean;
  votedAt: Date;
  signature: string;
}

/**
 * Aggregation result
 */
export interface AggregationResult {
  marketId: string;
  totalLikes: number;
  totalDislikes: number;
  approvalRate: number;
  shouldApprove: boolean;
}

/**
 * Service error types
 */
export class ServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ServiceError';
  }
}

/**
 * Service configuration interface
 */
export interface ServiceConfig {
  pollIntervalMs: number;
  retryAttempts: number;
  maxBatchSize: number;
  // ... other config fields
}
```

**Checklist**:
```
□ All data structures defined as interfaces
□ Custom error class for service errors
□ Configuration interface matches config.ts
□ JSDoc comments for all types
□ Exported for use in main service
```

---

## 💻 PHASE 3: Core Service Implementation (180-240 min total)

### Step 3.1: Create Service Class Structure (30 min)

**File**: `backend/src/services/[service-name]/index.ts`

```typescript
import { Connection, PublicKey } from '@solana/web3.js';
import { Program, AnchorProvider } from '@coral-xyz/anchor';
import { createClient } from '@supabase/supabase-js';
import { SERVICE_CONFIG } from './config';
import { ServiceState, VoteData, AggregationResult } from './types';
import { Logger } from '../../utils/logger';

/**
 * [Service Name] - Handles [service purpose]
 */
export class ServiceName {
  private state: ServiceState;
  private connection: Connection;
  private program: Program;
  private supabase: ReturnType<typeof createClient>;
  private intervalId: NodeJS.Timeout | null = null;
  private logger: Logger;

  constructor(
    connection: Connection,
    program: Program,
    supabase: ReturnType<typeof createClient>
  ) {
    this.connection = connection;
    this.program = program;
    this.supabase = supabase;
    this.logger = new Logger('[Service Name]');

    this.state = {
      isRunning: false,
      lastRun: null,
      totalProcessed: 0,
      errors: 0,
    };
  }

  /**
   * Start the service
   */
  async start(): Promise<void> {
    if (this.state.isRunning) {
      this.logger.warn('Service already running');
      return;
    }

    this.logger.info('Starting service...');
    this.state.isRunning = true;

    // Run immediately on start
    await this.run();

    // Schedule periodic runs
    this.intervalId = setInterval(
      () => this.run(),
      SERVICE_CONFIG.POLL_INTERVAL_MS
    );

    this.logger.info('Service started successfully');
  }

  /**
   * Stop the service
   */
  async stop(): Promise<void> {
    if (!this.state.isRunning) {
      return;
    }

    this.logger.info('Stopping service...');

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.state.isRunning = false;
    this.logger.info('Service stopped');
  }

  /**
   * Main service execution logic
   */
  private async run(): Promise<void> {
    // Implemented in next steps
  }

  /**
   * Get service state
   */
  getState(): ServiceState {
    return { ...this.state };
  }
}
```

**Checklist**:
```
□ Class structure defined
□ Dependencies injected via constructor
□ State management in place
□ start() and stop() methods
□ Logging setup
□ TypeScript compiles
```

---

### Step 3.2: Implement Data Fetching (40 min)

```typescript
/**
 * Fetch data to process
 */
private async fetchPendingData(): Promise<VoteData[]> {
  try {
    // Example: Fetch proposal votes from Supabase
    const { data, error } = await this.supabase
      .from('proposal_votes')
      .select('market_id, user_wallet, vote, voted_at, signature')
      .eq('aggregated', false) // Only unprocessed votes
      .order('voted_at', { ascending: true })
      .limit(SERVICE_CONFIG.MAX_BATCH_SIZE);

    if (error) {
      throw new ServiceError(
        'Failed to fetch votes',
        'FETCH_ERROR',
        error
      );
    }

    this.logger.info(`Fetched ${data?.length || 0} pending votes`);

    return (data || []).map(row => ({
      marketId: row.market_id,
      userWallet: row.user_wallet,
      vote: row.vote,
      votedAt: new Date(row.voted_at),
      signature: row.signature,
    }));
  } catch (error) {
    this.logger.error('Error fetching pending data:', error);
    throw error;
  }
}
```

**Checklist**:
```
□ Database query correct (matches schema)
□ Filtering logic in place (only unprocessed)
□ Pagination/limits applied
□ Error handling
□ Logging
□ Data transformation to TypeScript types
```

---

### Step 3.3: Implement Aggregation Logic (60 min)

```typescript
/**
 * Aggregate votes per market
 */
private aggregateVotes(votes: VoteData[]): Map<string, AggregationResult> {
  const results = new Map<string, AggregationResult>();

  // Group votes by market
  const votesByMarket = votes.reduce((acc, vote) => {
    if (!acc.has(vote.marketId)) {
      acc.set(vote.marketId, []);
    }
    acc.get(vote.marketId)!.push(vote);
    return acc;
  }, new Map<string, VoteData[]>());

  // Aggregate per market
  for (const [marketId, marketVotes] of votesByMarket.entries()) {
    const likes = marketVotes.filter(v => v.vote === true).length;
    const dislikes = marketVotes.filter(v => v.vote === false).length;
    const total = likes + dislikes;

    if (total === 0) continue;

    const approvalRate = likes / total;
    const shouldApprove =
      approvalRate >= SERVICE_CONFIG.APPROVAL_THRESHOLD &&
      total >= SERVICE_CONFIG.MIN_VOTES_REQUIRED;

    results.set(marketId, {
      marketId,
      totalLikes: likes,
      totalDislikes: dislikes,
      approvalRate,
      shouldApprove,
    });

    this.logger.debug(
      `Market ${marketId}: ${likes}/${total} (${(approvalRate * 100).toFixed(1)}%)`
    );
  }

  return results;
}
```

**Checklist**:
```
□ Grouping logic correct
□ Aggregation logic matches VERIFICATION_SUMMARY.md
□ Thresholds from config applied
□ Logging for debugging
□ Handles edge cases (zero votes)
```

---

### Step 3.4: Implement On-Chain Submission (60 min)

```typescript
/**
 * Submit aggregation result to on-chain program
 */
private async submitToChain(
  result: AggregationResult
): Promise<string> {
  try {
    const marketPda = new PublicKey(result.marketId);

    // Call approve_market instruction
    const tx = await this.program.methods
      .approveMarket(result.totalLikes, result.totalDislikes)
      .accounts({
        market: marketPda,
        backend: this.program.provider.wallet.publicKey,
        globalConfig: await this.getConfigPda(),
      })
      .rpc();

    this.logger.info(
      `Market ${result.marketId} approved on-chain: ${tx}`
    );

    return tx;
  } catch (error) {
    this.logger.error(
      `Failed to submit market ${result.marketId} to chain:`,
      error
    );
    throw new ServiceError(
      'On-chain submission failed',
      'CHAIN_ERROR',
      error
    );
  }
}

/**
 * Get GlobalConfig PDA
 */
private async getConfigPda(): Promise<PublicKey> {
  const [pda] = await PublicKey.findProgramAddress(
    [Buffer.from('config')],
    this.program.programId
  );
  return pda;
}
```

**Checklist**:
```
□ PDA derivation correct
□ Instruction accounts correct
□ Parameters match on-chain expectations
□ Transaction signature returned
□ Error handling
□ Logging
```

---

### Step 3.5: Implement Database Update (30 min)

```typescript
/**
 * Mark votes as aggregated in database
 */
private async markVotesAggregated(
  votes: VoteData[],
  txSignature: string
): Promise<void> {
  try {
    const signatures = votes.map(v => v.signature);

    const { error } = await this.supabase
      .from('proposal_votes')
      .update({
        aggregated: true,
        aggregated_at: new Date().toISOString(),
        tx_signature: txSignature,
      })
      .in('signature', signatures);

    if (error) {
      throw new ServiceError(
        'Failed to update database',
        'DB_UPDATE_ERROR',
        error
      );
    }

    this.logger.info(`Marked ${votes.length} votes as aggregated`);
  } catch (error) {
    this.logger.error('Error updating database:', error);
    throw error;
  }
}
```

**Checklist**:
```
□ Update query correct
□ All relevant votes updated
□ Transaction signature recorded
□ Timestamp recorded
□ Error handling
□ Logging
```

---

### Step 3.6: Orchestrate Full Workflow (30 min)

```typescript
/**
 * Main service execution logic
 */
private async run(): Promise<void> {
  try {
    this.logger.info('Starting service run...');

    // 1. Fetch pending data
    const votes = await this.fetchPendingData();

    if (votes.length === 0) {
      this.logger.info('No pending votes to process');
      this.state.lastRun = new Date();
      return;
    }

    // 2. Aggregate votes
    const results = this.aggregateVotes(votes);

    // 3. Process each market that should be approved
    for (const [marketId, result] of results.entries()) {
      if (!result.shouldApprove) {
        this.logger.info(
          `Market ${marketId} not ready for approval ` +
          `(${result.approvalRate * 100}% approval)`
        );
        continue;
      }

      try {
        // 4. Submit to chain
        const txSignature = await this.submitToChain(result);

        // 5. Update database
        const marketVotes = votes.filter(v => v.marketId === marketId);
        await this.markVotesAggregated(marketVotes, txSignature);

        // 6. Update metrics
        this.state.totalProcessed += marketVotes.length;

        this.logger.info(
          `Successfully processed market ${marketId} ` +
          `(${marketVotes.length} votes)`
        );
      } catch (error) {
        this.logger.error(
          `Failed to process market ${marketId}:`,
          error
        );
        this.state.errors++;
        // Continue with next market (don't fail entire run)
      }
    }

    this.state.lastRun = new Date();
    this.logger.info('Service run completed');
  } catch (error) {
    this.logger.error('Service run failed:', error);
    this.state.errors++;
  }
}
```

**Checklist**:
```
□ All steps orchestrated correctly
□ Error handling per step
□ Continue on error (don't fail entire run)
□ Metrics updated
□ Logging at each step
□ State updated
```

---

## 🧪 PHASE 4: Testing (90-120 min total)

### Step 4.1: Write Test Setup (30 min)

**File**: `backend/src/services/[service-name]/__tests__/[service-name].test.ts`

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { AnchorProvider, Program } from '@coral-xyz/anchor';
import { createClient } from '@supabase/supabase-js';
import { ServiceName } from '../index';

describe('ServiceName', () => {
  let service: ServiceName;
  let mockConnection: Connection;
  let mockProgram: Program;
  let mockSupabase: ReturnType<typeof createClient>;

  beforeEach(() => {
    // Setup mocks
    mockConnection = {} as Connection;
    mockProgram = {
      methods: {
        approveMarket: vi.fn().mockReturnValue({
          accounts: vi.fn().mockReturnValue({
            rpc: vi.fn().mockResolvedValue('mock-tx-signature'),
          }),
        }),
      },
      programId: new PublicKey('11111111111111111111111111111111'),
    } as any;

    mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [], error: null }),
        update: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ error: null }),
      }),
    } as any;

    // Create service instance
    service = new ServiceName(mockConnection, mockProgram, mockSupabase);
  });

  afterEach(async () => {
    await service.stop();
  });

  // Tests here...
});
```

**Checklist**:
```
□ Test framework setup (Vitest)
□ Mocks for all dependencies
□ beforeEach creates fresh service
□ afterEach cleans up
□ TypeScript compiles
```

---

### Step 4.2: Test Happy Path (40 min)

```typescript
it('should aggregate votes and approve market', async () => {
  // Arrange: Mock pending votes
  const mockVotes = [
    { market_id: 'market-1', user_wallet: 'user-1', vote: true, voted_at: new Date(), signature: 'sig-1' },
    { market_id: 'market-1', user_wallet: 'user-2', vote: true, voted_at: new Date(), signature: 'sig-2' },
    { market_id: 'market-1', user_wallet: 'user-3', vote: false, voted_at: new Date(), signature: 'sig-3' },
  ];

  mockSupabase.from = vi.fn().mockReturnValue({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({ data: mockVotes, error: null }),
  });

  // Act: Run service
  await service.start();
  await new Promise(resolve => setTimeout(resolve, 100)); // Let it process
  await service.stop();

  // Assert: Verify on-chain call made
  expect(mockProgram.methods.approveMarket).toHaveBeenCalledWith(2, 1);

  // Assert: Verify database updated
  expect(mockSupabase.from).toHaveBeenCalledWith('proposal_votes');

  // Assert: Verify metrics
  const state = service.getState();
  expect(state.totalProcessed).toBe(3);
  expect(state.errors).toBe(0);
});
```

**Checklist**:
```
□ Arrange: Mock data setup
□ Act: Service executed
□ Assert: On-chain call verified
□ Assert: Database update verified
□ Assert: Metrics updated
□ Test passes
```

---

### Step 4.3: Test Edge Cases (50 min)

```typescript
it('should skip market with insufficient votes', async () => {
  const mockVotes = [
    { market_id: 'market-1', user_wallet: 'user-1', vote: true, voted_at: new Date(), signature: 'sig-1' },
    // Only 1 vote, needs 10
  ];

  mockSupabase.from = vi.fn().mockReturnValue({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({ data: mockVotes, error: null }),
  });

  await service.start();
  await new Promise(resolve => setTimeout(resolve, 100));
  await service.stop();

  // Should NOT call on-chain (insufficient votes)
  expect(mockProgram.methods.approveMarket).not.toHaveBeenCalled();
});

it('should skip market below approval threshold', async () => {
  const mockVotes = [
    ...Array(5).fill({ vote: true }),
    ...Array(6).fill({ vote: false }), // 45% approval (need 70%)
  ].map((v, i) => ({
    market_id: 'market-1',
    user_wallet: `user-${i}`,
    ...v,
    voted_at: new Date(),
    signature: `sig-${i}`,
  }));

  mockSupabase.from = vi.fn().mockReturnValue({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({ data: mockVotes, error: null }),
  });

  await service.start();
  await new Promise(resolve => setTimeout(resolve, 100));
  await service.stop();

  expect(mockProgram.methods.approveMarket).not.toHaveBeenCalled();
});

it('should handle on-chain errors gracefully', async () => {
  mockProgram.methods.approveMarket = vi.fn().mockReturnValue({
    accounts: vi.fn().mockReturnValue({
      rpc: vi.fn().mockRejectedValue(new Error('RPC error')),
    }),
  });

  const mockVotes = [
    ...Array(10).fill({ vote: true }),
  ].map((v, i) => ({
    market_id: 'market-1',
    user_wallet: `user-${i}`,
    ...v,
    voted_at: new Date(),
    signature: `sig-${i}`,
  }));

  mockSupabase.from = vi.fn().mockReturnValue({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({ data: mockVotes, error: null }),
  });

  await service.start();
  await new Promise(resolve => setTimeout(resolve, 100));
  await service.stop();

  const state = service.getState();
  expect(state.errors).toBeGreaterThan(0);
});
```

**Checklist**:
```
□ Test insufficient votes
□ Test below threshold
□ Test on-chain errors
□ Test database errors
□ Test empty data
□ All tests pass
```

---

## 📝 PHASE 5: Integration & Documentation (45 min total)

### Step 5.1: Integrate into Main Server (20 min)

**File**: `backend/src/index.ts`

```typescript
import { ServiceName } from './services/service-name';

// Initialize services
const voteAggregator = new ServiceName(connection, program, supabase);

// Start services
await voteAggregator.start();

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down services...');
  await voteAggregator.stop();
  process.exit(0);
});
```

**Checklist**:
```
□ Service instantiated
□ Started in main server
□ Graceful shutdown handled
□ Logging configured
□ Health check endpoint added
```

---

### Step 5.2: Add Documentation (25 min)

**Update story file** with:
```markdown
## Implementation Notes

### [Service Name]

**Implementation Time**: X hours
**Challenges**:
- [Challenge 1]
- [Challenge 2]

**Key Decisions**:
- [Decision 1]
- [Decision 2]

**Configuration**:
- Poll interval: 5 minutes
- Approval threshold: 70%
- Min votes: 10

**Testing**:
- 8 test cases
- Coverage: 90%
- All tests passing

**Integration**:
- Integrated with main server
- Health check at /health/vote-aggregator
- Logs to Winston logger
```

**Checklist**:
```
□ Service purpose documented
□ Configuration documented
□ Integration points documented
□ Test results documented
□ Story file updated
```

---

## ✅ Completion Checklist

Before marking service as COMPLETE:

```
□ Service compiles without errors
□ All methods implemented
□ Error handling comprehensive
□ Logging at all key points
□ Configuration externalized
□ 5-10 tests written and passing
□ Test coverage >80%
□ Integrated into main server
□ Health check endpoint added
□ Documentation complete
□ Story file updated
□ Committed and pushed
□ Running on devnet (if applicable)
□ Monitoring alerts configured
```

---

## 📚 Related Templates

- [Anchor Instruction Template](./anchor-instruction-template.md)
- [Frontend Component Template](./frontend-component-template.md)
- [Testing Template](./testing-template.md)

---

**Last Updated**: November 5, 2025
**Version**: 1.0
**Status**: ✅ READY FOR USE

**Remember**: Backend services must be BULLETPROOF. They run 24/7 with no human oversight. Test thoroughly! 🚀
