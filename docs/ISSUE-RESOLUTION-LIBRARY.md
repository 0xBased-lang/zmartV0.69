# ZMART V0.69 - Issue Resolution Library

**Purpose:** Comprehensive reference library for all issues, inconsistencies, and their resolutions.
**Scope:** On-chain transactions, frontend-backend integration, deployment, testing, and general development.
**Maintained By:** ZMART Development Team
**Last Updated:** November 8, 2025

---

## Table of Contents

1. [On-Chain Transaction Issues](#on-chain-transaction-issues)
2. [Frontend-Backend Integration Issues](#frontend-backend-integration-issues)
3. [State Management Issues](#state-management-issues)
4. [LMSR Mathematics Issues](#lmsr-mathematics-issues)
5. [Voting System Issues](#voting-system-issues)
6. [Resolution Process Issues](#resolution-process-issues)
7. [Database and API Issues](#database-and-api-issues)
8. [Deployment Issues](#deployment-issues)
9. [Testing Issues](#testing-issues)
10. [Performance Issues](#performance-issues)
11. [Security Issues](#security-issues)
12. [General Development Issues](#general-development-issues)

---

## On-Chain Transaction Issues

### ISSUE-001: Transaction Timeout on Devnet

**Severity:** Medium
**Category:** On-Chain Transaction
**First Occurrence:** November 8, 2025
**Frequency:** Occasional (5-10% of transactions)

**Symptoms:**
- Transaction submitted successfully
- No confirmation after 60 seconds
- Eventually times out with "Transaction not confirmed"

**Root Cause:**
- Devnet network congestion
- Default commitment level ("confirmed") may be too aggressive
- Insufficient priority fees during peak times

**Diagnosis Steps:**
1. Check transaction signature on Solana Explorer
2. Verify transaction actually reached the blockchain
3. Check network status: `solana cluster-version --url devnet`
4. Monitor slot progression: `solana block-height --url devnet`

**Resolution:**
```typescript
// Solution 1: Use 'processed' commitment for faster confirmation
const connection = new Connection(DEVNET_RPC, 'processed');

// Solution 2: Add priority fee
const priorityFee = ComputeBudgetProgram.setComputeUnitPrice({
  microLamports: 1000 // Increase during congestion
});

// Solution 3: Increase timeout
await connection.confirmTransaction(signature, {
  commitment: 'confirmed',
  timeout: 120000 // 2 minutes instead of default 60s
});
```

**Prevention:**
- Always use priority fees for time-sensitive transactions
- Implement exponential backoff retry logic
- Monitor network health before submitting critical transactions

**Related Documentation:**
- [Solana Transaction Confirmation](https://docs.solana.com/developing/clients/jsonrpc-api#confirmtransaction)
- [Compute Budget Program](https://docs.solana.com/developing/programming-model/runtime#compute-budget)

---

### ISSUE-002: "Account Already Exists" Error on Vote Submission

**Severity:** Low
**Category:** On-Chain Transaction
**First Occurrence:** November 8, 2025
**Frequency:** Reproducible (occurs when user votes twice)

**Symptoms:**
- `submit_proposal_vote` instruction fails
- Error: "Account Already Exists" or similar Anchor error
- VoteRecord PDA already initialized

**Root Cause:**
- User attempting to vote twice on same market proposal
- VoteRecord PDA is used for duplicate prevention
- Anchor's `init` constraint creates account, fails if exists

**Diagnosis Steps:**
1. Check if VoteRecord PDA exists: `solana account <VOTE_RECORD_PDA> --url devnet`
2. Verify voter pubkey and market pubkey in PDA seeds
3. Check if vote was already recorded on-chain

**Resolution:**
```typescript
// Solution: Check if user already voted before submitting
const [voteRecordPDA] = PublicKey.findProgramAddressSync(
  [
    Buffer.from("vote_record"),
    marketPDA.toBuffer(),
    voter.publicKey.toBuffer(),
    Buffer.from("proposal"),
  ],
  PROGRAM_ID
);

const voteRecordInfo = await connection.getAccountInfo(voteRecordPDA);

if (voteRecordInfo) {
  throw new Error("User has already voted on this proposal");
}

// Proceed with vote submission
const tx = await program.methods.submitProposalVote(vote).accounts({...}).rpc();
```

**Prevention:**
- Frontend: Disable vote button after user votes
- Frontend: Check VoteRecord exists before rendering vote UI
- Backend: Validate vote uniqueness before broadcasting transaction
- UI: Show "You have already voted" message

**Related Code:**
- `programs/zmart-core/src/instructions/submit_proposal_vote.rs`
- Frontend vote component (when implemented)

---

### ISSUE-003: "Unauthorized" Error on Vote Aggregation

**Severity:** High
**Category:** On-Chain Transaction / Authorization
**First Occurrence:** November 8, 2025
**Frequency:** Reproducible (occurs with wrong authority)

**Symptoms:**
- `aggregate_proposal_votes` instruction fails
- Error: "Unauthorized" or ErrorCode::Unauthorized
- Backend authority check failing

**Root Cause:**
- Transaction signer is not the `backend_authority` set in GlobalConfig
- GlobalConfig.backend_authority does not match transaction signer

**Diagnosis Steps:**
1. Fetch GlobalConfig account:
   ```bash
   solana account <GLOBAL_CONFIG_PDA> --url devnet
   ```
2. Parse backend_authority field from account data
3. Compare with current transaction signer pubkey
4. Verify signer has correct keypair loaded

**Resolution:**
```typescript
// Solution 1: Verify backend authority matches
const globalConfig = await program.account.globalConfig.fetch(globalConfigPDA);
const backendAuthority = globalConfig.backendAuthority;

console.log("Expected backend authority:", backendAuthority.toBase58());
console.log("Current signer:", wallet.publicKey.toBase58());

if (!backendAuthority.equals(wallet.publicKey)) {
  throw new Error("Signer does not match backend authority in GlobalConfig");
}

// Solution 2: Use correct wallet
const backendWallet = new Wallet(
  Keypair.fromSecretKey(/* correct backend authority keypair */)
);

// Proceed with aggregation
const tx = await program.methods
  .aggregateProposalVotes(likes, dislikes)
  .accounts({
    market: marketPDA,
    globalConfig: globalConfigPDA,
    backendAuthority: backendWallet.publicKey, // Must match
  })
  .signers([backendWallet.payer]) // Use correct signer
  .rpc();
```

**Prevention:**
- Store backend authority pubkey in environment variables
- Validate authority on backend service startup
- Log authority mismatches for debugging
- Use consistent wallet across all backend services

**Related Code:**
- `programs/zmart-core/src/instructions/aggregate_proposal_votes.rs:23-25`
- `backend/vote-aggregator/src/services/aggregationService.ts`

---

### ISSUE-004: LMSR Cost Calculation Precision Loss

**Severity:** Medium
**Category:** LMSR Mathematics
**First Occurrence:** November 6, 2025
**Frequency:** Rare (< 1% of trades)

**Symptoms:**
- Calculated cost differs from expected by > 0.1%
- User sees unexpected trading cost
- Slippage protection triggers unexpectedly

**Root Cause:**
- Fixed-point arithmetic precision limitations (9 decimals)
- Logarithm approximation errors in edge cases
- Rounding errors in intermediate calculations

**Diagnosis Steps:**
1. Log all LMSR parameters: b, q_yes, q_no, target_cost
2. Calculate expected cost using reference implementation
3. Compare with on-chain cost function output
4. Check if logarithm approximation is causing error

**Resolution:**
```rust
// Solution: Use higher precision intermediate calculations
pub fn calculate_cost_function(
    q_yes: u64,
    q_no: u64,
    b: u64,
) -> Result<u64> {
    // Validate inputs are not too large
    require!(
        q_yes < 1_000_000_000_000_000, // 1M with 9 decimals
        ErrorCode::OverflowError
    );

    // Use checked arithmetic throughout
    let exp_yes = exp_fixed(q_yes.checked_div(b).ok_or(ErrorCode::DivisionByZero)?)?;
    let exp_no = exp_fixed(q_no.checked_div(b).ok_or(ErrorCode::DivisionByZero)?)?;

    let sum = exp_yes.checked_add(exp_no).ok_or(ErrorCode::OverflowError)?;
    let ln_sum = ln_fixed(sum)?;

    // Multiply b by ln(sum)
    b.checked_mul(ln_sum).ok_or(ErrorCode::OverflowError)
}
```

**Prevention:**
- Test LMSR calculations with extreme values
- Add precision validation tests (within 0.01%)
- Use wider slippage tolerance (1-2% instead of 0.5%)
- Document precision limitations in user-facing docs

**Related Code:**
- `programs/zmart-core/src/math/lmsr.rs`
- `docs/05_LMSR_MATHEMATICS.md`

---

## Frontend-Backend Integration Issues

### ISSUE-101: WebSocket Connection Drops After 5 Minutes

**Severity:** Medium
**Category:** Frontend-Backend Integration / Real-Time
**First Occurrence:** TBD (Phase 4)
**Frequency:** Reproducible (occurs after 5 min idle)

**Symptoms:**
- WebSocket connection established successfully
- After ~5 minutes of inactivity, connection closes
- No automatic reconnection
- Real-time price updates stop

**Root Cause:**
- Backend WebSocket server timeout (default 5 min)
- No heartbeat/ping mechanism
- Frontend not implementing reconnection logic

**Diagnosis Steps:**
1. Check WebSocket connection status in browser DevTools
2. Monitor backend logs for connection close events
3. Verify ping/pong frames in network inspector
4. Check server-side timeout configuration

**Resolution:**
```typescript
// Backend: Implement ping/pong heartbeat
// backend/src/services/websocket-server.ts
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  // Send ping every 30 seconds
  const pingInterval = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.ping();
    }
  }, 30000);

  ws.on('pong', () => {
    // Client is alive
  });

  ws.on('close', () => {
    clearInterval(pingInterval);
  });
});

// Frontend: Implement auto-reconnect
// frontend/hooks/useWebSocket.ts
const useWebSocket = (url: string) => {
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);

  const connect = useCallback(() => {
    const ws = new WebSocket(url);

    ws.onopen = () => {
      setConnected(true);
      reconnectAttemptsRef.current = 0;
    };

    ws.onclose = () => {
      setConnected(false);

      // Exponential backoff reconnection
      const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
      reconnectAttemptsRef.current++;

      setTimeout(() => {
        if (reconnectAttemptsRef.current < 5) {
          connect();
        } else {
          // Fallback to polling after 5 failed attempts
          console.warn("WebSocket failed after 5 attempts, falling back to polling");
        }
      }, delay);
    };

    wsRef.current = ws;
  }, [url]);

  useEffect(() => {
    connect();
    return () => wsRef.current?.close();
  }, [connect]);

  return { connected, ws: wsRef.current };
};
```

**Prevention:**
- Implement ping/pong heartbeat from day 1
- Add connection status indicator in UI
- Automatic fallback to HTTP polling after N failures
- Monitor WebSocket connection health metrics

**Related Documentation:**
- [docs/FRONTEND_IMPLEMENTATION_PLAN.md - Week 2 Day 6](../FRONTEND_IMPLEMENTATION_PLAN.md)
- Backend WebSocket server implementation (Phase 2)

---

### ISSUE-102: API Token Expiry During Long Trading Session

**Severity:** Low
**Category:** Frontend-Backend Integration / Authentication
**First Occurrence:** TBD (Phase 4)
**Frequency:** Reproducible (occurs after 1 hour)

**Symptoms:**
- User authenticated successfully
- After 1 hour, API calls return 401 Unauthorized
- User not automatically prompted to re-sign
- Trading operations fail silently

**Root Cause:**
- JWT token expires after 1 hour (by design)
- Frontend not implementing silent refresh
- No token expiry detection before API calls

**Diagnosis Steps:**
1. Check JWT expiry time in token payload (decode with jwt.io)
2. Verify API returns 401 with "Token expired" message
3. Check if refresh token is being used
4. Monitor browser localStorage for token updates

**Resolution:**
```typescript
// Frontend: Implement silent token refresh
// frontend/lib/auth.ts
const TOKEN_EXPIRY_BUFFER = 5 * 60 * 1000; // 5 minutes

export const getValidToken = async (): Promise<string> => {
  const token = localStorage.getItem('auth_token');
  if (!token) {
    throw new Error("Not authenticated");
  }

  const decoded = jwtDecode(token);
  const expiryTime = decoded.exp * 1000; // Convert to milliseconds
  const now = Date.now();

  // If token expires in < 5 minutes, refresh it
  if (expiryTime - now < TOKEN_EXPIRY_BUFFER) {
    console.log("Token expiring soon, refreshing...");
    return await refreshToken();
  }

  return token;
};

export const refreshToken = async (): Promise<string> => {
  const wallet = useWallet();

  if (!wallet.connected || !wallet.signMessage) {
    throw new Error("Wallet not connected");
  }

  // Request new message to sign
  const { data: { message } } = await fetch('/api/auth/message', {
    method: 'POST',
    body: JSON.stringify({ publicKey: wallet.publicKey.toBase58() }),
  }).then(r => r.json());

  // Sign message
  const signature = await wallet.signMessage(new TextEncoder().encode(message));

  // Get new token
  const { data: { token } } = await fetch('/api/auth/verify', {
    method: 'POST',
    body: JSON.stringify({
      publicKey: wallet.publicKey.toBase58(),
      signature: bs58.encode(signature),
    }),
  }).then(r => r.json());

  // Store new token
  localStorage.setItem('auth_token', token);

  return token;
};

// Use in API client
// frontend/lib/api-client.ts
export const apiClient = {
  async post(url: string, data: any) {
    const token = await getValidToken(); // Auto-refreshes if needed

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (response.status === 401) {
      // Token refresh failed, force re-authentication
      localStorage.removeItem('auth_token');
      throw new Error("Authentication failed, please sign message again");
    }

    return response.json();
  },
};
```

**Prevention:**
- Use 1-hour token cache per FRONTEND_SCOPE_V1.md
- Implement automatic silent refresh
- Show clear messaging when re-sign is needed
- Log token refresh events for debugging

**Related Documentation:**
- [docs/FRONTEND_SCOPE_V1.md - Token Caching](../FRONTEND_SCOPE_V1.md#key-ux-decisions)

---

## State Management Issues

### ISSUE-201: Market State Transition Validation Failed

**Severity:** High
**Category:** State Management / On-Chain
**First Occurrence:** November 6, 2025
**Frequency:** Rare (edge case)

**Symptoms:**
- Instruction succeeds but state doesn't change as expected
- Market remains in wrong state after valid transition
- State transition event emitted but state field not updated

**Root Cause:**
- State transition logic bug in program
- Missing state update after validation passes
- Race condition in concurrent state transitions

**Diagnosis Steps:**
1. Fetch market account and check current state
2. Review transaction logs for state transition events
3. Verify all state transition constraints were met
4. Check if account was modified in transaction

**Resolution:**
```rust
// Solution: Ensure state is updated after all validations
pub fn activate_market(ctx: Context<ActivateMarket>) -> Result<()> {
    let market = &mut ctx.accounts.market;

    // Validate current state
    require!(
        matches!(market.state, MarketState::Approved),
        ErrorCode::InvalidStateTransition
    );

    // ALL validations BEFORE state change
    require!(
        market.initial_liquidity > 0,
        ErrorCode::InsufficientLiquidity
    );

    // Update state (CRITICAL: don't forget this!)
    market.state = MarketState::Active;
    market.activated_at = Clock::get()?.unix_timestamp;

    // Emit event
    emit!(MarketActivated {
        market: ctx.accounts.market.key(),
        activated_at: market.activated_at,
    });

    Ok(())
}
```

**Prevention:**
- Add integration tests for all state transitions
- Test all valid and invalid transition paths
- Use state machine diagram for reference
- Log state before and after every instruction

**Related Code:**
- `programs/zmart-core/src/state.rs`
- `docs/06_STATE_MANAGEMENT.md`

---

## Voting System Issues

### ISSUE-301: Vote Count Mismatch After Aggregation

**Severity:** High
**Category:** Voting System / Data Integrity
**First Occurrence:** TBD
**Frequency:** Rare

**Symptoms:**
- Backend counts X votes off-chain
- aggregate_proposal_votes called with X likes, Y dislikes
- On-chain, market shows different vote counts
- Approval calculation incorrect

**Root Cause:**
- Race condition between vote submission and aggregation
- Off-chain indexer missing some votes
- Duplicate vote prevention not working

**Diagnosis Steps:**
1. Query all VoteRecord PDAs for market
2. Count manually: how many have vote=true vs vote=false
3. Compare with market.proposal_likes and market.proposal_dislikes
4. Check backend aggregation logs for missed votes

**Resolution:**
```typescript
// Solution: Re-index all votes before aggregation
async function aggregateProposalVotes(marketPubkey: PublicKey) {
  // Get all VoteRecord PDAs for this market
  const voteRecords = await connection.getProgramAccounts(PROGRAM_ID, {
    filters: [
      { dataSize: VOTE_RECORD_SIZE },
      {
        memcmp: {
          offset: 8, // After discriminator
          bytes: marketPubkey.toBase58(),
        },
      },
      {
        memcmp: {
          offset: 8 + 32 + 32, // After discriminator + market + voter
          bytes: bs58.encode(Buffer.from("proposal")),
        },
      },
    ],
  });

  // Parse and count votes
  let likes = 0;
  let dislikes = 0;

  for (const { account } of voteRecords) {
    const voteRecord = deserializeVoteRecord(account.data);
    if (voteRecord.vote) {
      likes++;
    } else {
      dislikes++;
    }
  }

  console.log(`Found ${likes} likes, ${dislikes} dislikes on-chain`);

  // Call aggregate with verified counts
  const tx = await program.methods
    .aggregateProposalVotes(likes, dislikes)
    .accounts({...})
    .rpc();

  return { likes, dislikes, signature: tx };
}
```

**Prevention:**
- Always verify vote counts on-chain before aggregating
- Log discrepancies between off-chain and on-chain counts
- Implement vote reconciliation cron job
- Add alerts for vote count mismatches

**Related Code:**
- `backend/vote-aggregator/src/services/aggregationService.ts`
- `programs/zmart-core/src/instructions/aggregate_proposal_votes.rs`

---

## Database and API Issues

### ISSUE-401: Supabase RLS Policy Blocking Legitimate Reads

**Severity:** Medium
**Category:** Database / Security
**First Occurrence:** TBD (Phase 2)
**Frequency:** Reproducible

**Symptoms:**
- User can't fetch their own data
- API returns empty array instead of expected data
- Supabase logs show "row-level security policy violation"

**Root Cause:**
- RLS policy too restrictive
- JWT token missing required claims
- Policy using wrong user identification

**Diagnosis Steps:**
1. Check Supabase logs for RLS violations
2. Inspect JWT token claims (user ID, wallet address)
3. Test query with `postgres` role (bypasses RLS)
4. Review RLS policy definition in database

**Resolution:**
```sql
-- Solution: Fix RLS policy to use correct user identification
-- backend/supabase/migrations/001_rls_policies.sql

-- BEFORE (broken):
CREATE POLICY "Users can read own positions"
ON user_positions FOR SELECT
USING (auth.uid() = user_id); -- auth.uid() may be null

-- AFTER (fixed):
CREATE POLICY "Users can read own positions"
ON user_positions FOR SELECT
USING (
  auth.jwt() ->> 'wallet_address' = wallet_address
  OR auth.role() = 'admin'
);
```

**Prevention:**
- Test RLS policies with different user roles
- Document RLS policy requirements
- Use Supabase policy simulator
- Log RLS violations for debugging

**Related Documentation:**
- `docs/08_DATABASE_SCHEMA.md`
- Supabase RLS documentation

---

## Performance Issues

### ISSUE-501: Slow Market List Load (> 3 seconds)

**Severity:** Medium
**Category:** Performance / Database
**First Occurrence:** TBD (Phase 4)
**Frequency:** Reproducible

**Symptoms:**
- Market list page takes > 3 seconds to load
- Users see loading spinner for extended time
- High database query time in logs

**Root Cause:**
- Missing database indexes on frequently queried columns
- N+1 query problem (fetching related data separately)
- Not using pagination

**Diagnosis Steps:**
1. Check `EXPLAIN ANALYZE` for slow queries
2. Monitor database slow query logs
3. Measure frontend render time vs data fetch time
4. Check if indexes exist on filter columns

**Resolution:**
```sql
-- Solution 1: Add indexes
CREATE INDEX idx_markets_state ON markets(state);
CREATE INDEX idx_markets_created_at ON markets(created_at DESC);
CREATE INDEX idx_markets_category ON markets(category);

-- Solution 2: Use single query with JOINs instead of N+1
SELECT
  m.*,
  COUNT(DISTINCT tp.wallet_address) as total_traders,
  SUM(tp.yes_shares + tp.no_shares) as total_volume
FROM markets m
LEFT JOIN trading_positions tp ON tp.market_pubkey = m.pubkey
WHERE m.state = 'ACTIVE'
GROUP BY m.id
ORDER BY m.created_at DESC
LIMIT 20;

-- Solution 3: Add materialized view for frequently accessed data
CREATE MATERIALIZED VIEW market_list_view AS
SELECT
  m.*,
  COUNT(DISTINCT tp.wallet_address) as total_traders,
  SUM(tp.yes_shares + tp.no_shares) as total_volume
FROM markets m
LEFT JOIN trading_positions tp ON tp.market_pubkey = m.pubkey
GROUP BY m.id;

CREATE UNIQUE INDEX idx_market_list_view_id ON market_list_view(id);

-- Refresh every 5 minutes via cron
```

```typescript
// Frontend: Implement pagination and infinite scroll
const { data, fetchNextPage } = useInfiniteQuery({
  queryKey: ['markets'],
  queryFn: ({ pageParam = 0 }) =>
    apiClient.get(`/markets?limit=20&offset=${pageParam}`),
  getNextPageParam: (lastPage) => lastPage.nextOffset,
});
```

**Prevention:**
- Add indexes during schema design
- Use `EXPLAIN ANALYZE` before deploying queries
- Implement pagination from day 1
- Monitor query performance in production

**Related Code:**
- `backend/src/api/market-routes.ts`
- `docs/08_DATABASE_SCHEMA.md`

---

## Security Issues

### ISSUE-601: SQL Injection Vulnerability in Search

**Severity:** Critical
**Category:** Security / Database
**First Occurrence:** Never (caught in code review)
**Frequency:** N/A (prevented)

**Symptoms:**
- Search query allows arbitrary SQL execution
- Attacker can read/modify database
- Supabase logs show malformed queries

**Root Cause:**
- Using string concatenation for SQL queries
- Not using parameterized queries
- Not sanitizing user input

**Diagnosis Steps:**
1. Review all database query code
2. Test with SQL injection payloads: `' OR 1=1 --`
3. Check if parameterized queries are used
4. Run static analysis tools (sqlmap, semgrep)

**Resolution:**
```typescript
// VULNERABLE CODE (DON'T USE):
const searchMarkets = async (query: string) => {
  const { data } = await supabase
    .from('markets')
    .select('*')
    .where(`title LIKE '%${query}%'`); // DANGEROUS!
  return data;
};

// SECURE CODE (USE THIS):
const searchMarkets = async (query: string) => {
  // Use parameterized query
  const { data } = await supabase
    .from('markets')
    .select('*')
    .ilike('title', `%${query}%`); // Supabase sanitizes automatically

  return data;
};

// For raw SQL, use parameterized queries:
const { data } = await supabase.rpc('search_markets', {
  search_term: query, // Passed as parameter, not concatenated
});
```

**Prevention:**
- **NEVER** concatenate user input into SQL queries
- Always use parameterized queries / prepared statements
- Use ORMs/query builders (Supabase client, Prisma)
- Run automated security scans in CI/CD
- Code review all database query code

**Related Documentation:**
- [OWASP SQL Injection](https://owasp.org/www-community/attacks/SQL_Injection)
- Supabase security best practices

---

## Deployment Issues

### ISSUE-701: Program Upgrade Failed - Account Data Mismatch

**Severity:** Critical
**Category:** Deployment / Program Upgrade
**First Occurrence:** TBD
**Frequency:** Rare (during upgrades)

**Symptoms:**
- `anchor upgrade` command fails
- Error: "Account data is incompatible with program"
- Existing PDAs can't be deserialized after upgrade

**Root Cause:**
- Program upgrade changed account structure
- Existing accounts have old data format
- No migration logic implemented

**Diagnosis Steps:**
1. Compare old and new account structures
2. Check if account sizes changed
3. Verify if field order changed
4. Test upgrade on localnet first

**Resolution:**
```rust
// Solution 1: Add version field to accounts
#[account]
pub struct MarketAccount {
    pub version: u8, // Add version field
    pub state: MarketState,
    // ... rest of fields
}

// Solution 2: Write migration instruction
pub fn migrate_market_v1_to_v2(ctx: Context<MigrateMarket>) -> Result<()> {
    let market = &mut ctx.accounts.market;

    // Check version
    require!(market.version == 1, ErrorCode::AlreadyMigrated);

    // Migrate data
    // (reallocate if needed, copy old fields to new structure)

    // Update version
    market.version = 2;

    Ok(())
}

// Solution 3: Deploy new program instead of upgrading (if incompatible)
// Keep old program running, deploy new program with new address
// Migrate users gradually
```

**Prevention:**
- Version all account structures
- Test upgrades on devnet before mainnet
- Write migration instructions for breaking changes
- Document upgrade process in deployment guide

**Related Documentation:**
- [Anchor Program Upgrades](https://www.anchor-lang.com/docs/upgrading-programs)
- `docs/DEPLOYMENT_GUIDE.md` (when created)

---

## General Development Issues

### ISSUE-801: TypeScript Type Mismatch with Anchor IDL

**Severity:** Low
**Category:** Development / Type Safety
**First Occurrence:** Ongoing
**Frequency:** Common

**Symptoms:**
- TypeScript errors in Anchor client code
- IDL types don't match actual program types
- "Property X does not exist on type Y"

**Root Cause:**
- IDL not regenerated after program changes
- TypeScript types manually defined instead of generated from IDL
- IDL cached in node_modules

**Diagnosis Steps:**
1. Compare IDL file with program code
2. Check last modification time of target/idl/zmart_core.json
3. Verify TypeScript types match IDL types
4. Check if types are imported from correct location

**Resolution:**
```bash
# Solution 1: Regenerate IDL and types
anchor build
anchor idl parse -f programs/zmart-core/src/lib.rs -o target/idl/zmart_core.json

# Solution 2: Clear cached types
rm -rf node_modules/@coral-xyz
rm -rf target/types
npm install

# Solution 3: Use generated types instead of manual types
# BEFORE (manual types):
type MarketAccount = {
  state: string; // Wrong!
  creator: string;
};

# AFTER (generated types):
import { ZmartCore } from "../target/types/zmart_core";
type MarketAccount = IdlAccounts<ZmartCore>["marketAccount"];
```

**Prevention:**
- Always regenerate types after program changes
- Use generated types instead of manual definitions
- Add pre-commit hook to check type consistency
- Document type generation in README

**Related Code:**
- `target/types/zmart_core.ts`
- `target/idl/zmart_core.json`

---

## Issue Tracking Guidelines

### How to Document a New Issue

1. **Create Issue Entry** using this template:

```markdown
### ISSUE-XXX: [Short descriptive title]

**Severity:** Critical | High | Medium | Low
**Category:** [Category from ToC]
**First Occurrence:** [Date]
**Frequency:** Reproducible | Occasional | Rare

**Symptoms:**
- [Symptom 1]
- [Symptom 2]

**Root Cause:**
[Explanation of why this happens]

**Diagnosis Steps:**
1. [Step 1]
2. [Step 2]

**Resolution:**
[Code example or step-by-step fix]

**Prevention:**
- [Prevention measure 1]
- [Prevention measure 2]

**Related Documentation:**
- [Link 1]
- [Link 2]
```

2. **Assign Sequential ID**
- On-Chain: ISSUE-001 to ISSUE-099
- Frontend-Backend: ISSUE-101 to ISSUE-199
- State Management: ISSUE-201 to ISSUE-299
- Voting System: ISSUE-301 to ISSUE-399
- Database/API: ISSUE-401 to ISSUE-499
- Performance: ISSUE-501 to ISSUE-599
- Security: ISSUE-601 to ISSUE-699
- Deployment: ISSUE-701 to ISSUE-799
- General Dev: ISSUE-801 to ISSUE-899

3. **Update Index**
Add to appropriate section in Table of Contents

4. **Cross-Reference**
Link related issues, documentation, and code

---

## Quick Search Index

**Common Symptoms → Issue IDs:**

- "Transaction timeout" → ISSUE-001
- "Account already exists" → ISSUE-002
- "Unauthorized" → ISSUE-003
- "WebSocket disconnects" → ISSUE-101
- "Token expired" → ISSUE-102
- "State not changed" → ISSUE-201
- "Vote count mismatch" → ISSUE-301
- "RLS policy denied" → ISSUE-401
- "Slow page load" → ISSUE-501
- "Program upgrade failed" → ISSUE-701
- "Type mismatch" → ISSUE-801

**Quick Fixes:**

- Transaction timeout → Add priority fee + increase timeout
- Unauthorized → Verify backend authority matches GlobalConfig
- WebSocket drops → Add ping/pong heartbeat
- Slow query → Add database indexes + pagination
- Type errors → Regenerate IDL and types

---

## Contributing

**Adding New Issues:**
1. Use template above
2. Assign sequential ID
3. Include code examples
4. Link related documentation
5. Update index

**Updating Existing Issues:**
1. Add occurrence date to history
2. Update frequency if changed
3. Add new symptoms if discovered
4. Improve resolution if better fix found

---

**Maintained By:** ZMART Development Team
**Version:** 1.0.0
**Last Updated:** November 8, 2025

**Questions or Additions?** Create PR or issue in GitHub repository.
