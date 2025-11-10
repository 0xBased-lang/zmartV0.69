# ZMART V0.69 - Implementation Checklist (HYBRID APPROACH)

**Status:** 🎯 60% Complete | Programs ✅ 100% | Backend 🟡 85% | Frontend 🟡 30% | Testing ❌ 10%
**Last Updated:** November 9, 2025 (Comprehensive Status Analysis)
**Timeline:** 10 weeks to mainnet (January 22, 2026)
**Current Phase:** Week 1 - Stabilization (CRITICAL GATE)
**Strategy:** Fix blockers → Parallel tracks → Converge → Audit → Launch

---

## Quick Navigation

- **10-Week Plan:** See sections below
- **Critical Blockers:** Vote Aggregator + Market Monitor crash loops (42 restarts/81s each)
- **Blockchain Audit:** Week 2-4 (primary discovery) + Week 7 (validation)
- **Project Context:** [CLAUDE.md](../../CLAUDE.md)
- **Core Logic Specs:** [CORE_LOGIC_INVARIANTS.md](../CORE_LOGIC_INVARIANTS.md)
- **Program Design:** [03_SOLANA_PROGRAM_DESIGN.md](../03_SOLANA_PROGRAM_DESIGN.md)

---

## 🚨 CRITICAL FINDINGS (Evidence-Based Analysis)

### Actual Project Status (NOT what documentation claims)

**Component Completion (Evidence-Based):**
- ✅ **Programs:** 100% deployed (7h3gXfBfYFueFVLYyfL5Qo1QGsf4GQUfW96FKVgnUsJS on devnet)
  - All 18 instructions implemented and exported
  - Deployed to devnet (slot 419789990)
  - Program size: 465,608 bytes
  - ⚠️ **CRITICAL GAP:** 0 Rust unit tests found (high mainnet risk)

- 🟡 **Backend:** 85% complete (5/6 services deployed, 2 unstable)
  - ✅ API Gateway: Running (port 4000, stable)
  - ✅ WebSocket Server: Running (port 4001, stable)
  - ✅ Event Indexer: Running (port 4002, stable)
  - 🚨 Vote Aggregator: **CRASH LOOP** (42 restarts in 81 sec)
  - 🚨 Market Monitor: **CRASH LOOP** (42 restarts in 81 sec)
  - ❌ IPFS Service: Disabled (deferred to V2)

- 🟡 **Frontend:** 30% complete (NOT 0% as documented)
  - ✅ UI Components: 90% (79 TSX files, Radix UI + Tailwind)
  - ✅ Wallet Integration: 60% (6 adapters, connection working)
  - 🟡 Transaction Builders: 30% (exist, unclear if UI-connected)
  - ❌ On-Chain Data Fetching: 10% (Supabase-only, not RPC)

- ❌ **Testing:** 10% complete (scaffolding exists, needs execution)
  - ⚠️ Program Tests: 0% (0 Rust tests found)
  - ✅ Backend Tests: 10 test files exist
  - 🟡 Integration Tests: 1 comprehensive test file (execution unclear)
  - ❌ E2E Tests: 0% (frontend E2E missing)

**🎯 Overall:** 60% complete (revised from 50% claimed)

---

### Critical Blockers (Week 1 MUST FIX)

**P0 - CRITICAL (Blocks all progress):**
1. 🚨 **Vote Aggregator Crash Loop**
   - **Symptom:** 42 restarts in 81 seconds
   - **Hypothesis:** Redis connection failure or unhandled promise rejection
   - **Impact:** Vote aggregation non-functional
   - **Fix Timeline:** 8-16 hours (Day 1-2)

2. 🚨 **Market Monitor Crash Loop**
   - **Symptom:** 42 restarts in 81 seconds
   - **Hypothesis:** Unhandled errors in cron job or RPC calls
   - **Impact:** Auto-finalization non-functional
   - **Fix Timeline:** 8-16 hours (Day 3-4)

**P1 - HIGH (Blocks mainnet confidence):**
3. ⚠️ **Zero Program Unit Tests**
   - **Symptom:** 0 Rust test files found in programs/zmart-core/tests/
   - **Risk:** Unknown program behavior, untested vulnerabilities
   - **Impact:** High mainnet deployment risk
   - **Fix Timeline:** 16-24 hours (Week 2-4 Track A)

4. ⚠️ **Frontend Transaction Integration Unclear**
   - **Symptom:** Transaction builders exist but UI connection uncertain
   - **Risk:** Users may not be able to execute transactions
   - **Impact:** Frontend may appear working but non-functional
   - **Fix Timeline:** 8-16 hours (Week 2-4 Track B)

---

### Revised Timeline

**Original Estimate:** 12-14 weeks (pessimistic, outdated)
**Revised Timeline:** 10 weeks (evidence-based, realistic)
**Target Launch:** January 22, 2026 (Wednesday)
**Confidence:** 80% (down from 94% due to stability issues)

**Timeline Savings:** 2-4 weeks due to:
- Frontend 30% complete (not 0%)
- Backend 85% complete (not "ready to start")
- Programs 100% deployed (fully operational)

---

## 10-WEEK HYBRID EXECUTION PLAN

### Strategy Overview

```
HYBRID APPROACH: Fix Blockers → Parallel Tracks → Converge → Audit → Launch

Week 1: STABILIZATION (Blocking Gate) ⛔
  Objective: Fix backend crash loops
  Gate: All services stable 24+ hours
  Duration: 5-7 days (40 hours)

Weeks 2-4: PARALLEL TRACKS (3 independent workstreams)
  Track A: Program Testing + Security Audit (blockchain-tool)
  Track B: Frontend Transaction Integration
  Track C: Integration Test Suite
  Gate: Tests pass, frontend works, security audit complete
  Duration: 21 days (120 hours across 3 tracks)

Weeks 5-6: CONVERGENCE (Merge + validate)
  Objective: Merge tracks, comprehensive testing
  Gate: 150+ tests passing, 0 critical bugs
  Duration: 14 days (80 hours)

Weeks 7-8: SECURITY + BETA
  Week 7: Validation audit (blockchain-tool + manual)
  Week 8: Community beta testing
  Gate: 0 critical security issues, beta success
  Duration: 14 days (80 hours)

Weeks 9-10: MAINNET LAUNCH
  Week 9: Pre-launch preparation
  Week 10: Mainnet deployment + monitoring
  Gate: Successful launch, 0 critical issues
  Duration: 14 days (60 hours)
```

### Weekly Progress Tracker

- [ ] **Week 1:** Stabilization (0% complete)
- [ ] **Weeks 2-4:** Parallel Tracks (0% complete)
  - [ ] Track A: Program Testing + Audit (0%)
  - [ ] Track B: Frontend Integration (0%)
  - [ ] Track C: Integration Tests (0%)
- [ ] **Weeks 5-6:** Convergence (0% complete)
- [ ] **Week 7:** Security Audit (0% complete)
- [ ] **Week 8:** Beta Testing (0% complete)
- [ ] **Weeks 9-10:** Mainnet Launch (0% complete)

---

## WEEK 1: STABILIZATION (BLOCKING GATE) ⛔

**Objective:** Fix critical backend stability before any other work
**Duration:** 5-7 days (40 hours)
**Status:** 0% Complete
**Target Completion:** November 15, 2025

> **CRITICAL:** All other work is BLOCKED until this gate passes. Do NOT proceed to Week 2 until all 5 backend services are stable for 24+ hours with ZERO crashes.

---

### Day 1-2: Debug Vote Aggregator (16 hours)

**Current Status:** Crash loop (42 restarts in 81 sec)

#### Root Cause Investigation
- [ ] **Check PM2 logs:**
  ```bash
  pm2 logs vote-aggregator --lines 100
  pm2 logs vote-aggregator --err --lines 100
  ```
- [ ] **Hypothesis 1:** Redis connection failure
  - [ ] Verify Redis server running (`redis-cli ping`)
  - [ ] Check connection string in backend/.env
  - [ ] Test Redis connection from Node.js

- [ ] **Hypothesis 2:** Unhandled promise rejection
  - [ ] Review aggregationService.ts for try/catch gaps
  - [ ] Check for .catch() on all async operations
  - [ ] Add global unhandled rejection handler

#### Fix Implementation
- [ ] **If Redis issue:**
  - [ ] Add connection retry logic (exponential backoff)
  - [ ] Add error handling for all Redis operations
  - [ ] Test: Verify reconnection after Redis restart

- [ ] **If promise rejection:**
  - [ ] Wrap cron job in try/catch
  - [ ] Add .catch() to all promise chains
  - [ ] Log errors before crash

#### Validation
- [ ] Deploy fix to devnet
- [ ] Monitor for 4 hours (0 crashes expected)
- [ ] Check PM2 status: `pm2 status` (should show 0 restarts)
- [ ] ✅ **Gate:** Vote Aggregator stable 4+ hours

---

### Day 3-4: Debug Market Monitor (16 hours)

**Current Status:** Crash loop (42 restarts in 81 sec)

#### Root Cause Investigation
- [ ] **Check PM2 logs:**
  ```bash
  pm2 logs market-monitor --lines 100
  pm2 logs market-monitor --err --lines 100
  ```
- [ ] **Hypothesis 1:** RPC call failures
  - [ ] Check Solana RPC connection (SOLANA_RPC_URL)
  - [ ] Test RPC health endpoint
  - [ ] Check for rate limiting (429 errors)

- [ ] **Hypothesis 2:** Unhandled errors in cron job
  - [ ] Review finalization.ts for error handling
  - [ ] Check for uncaught exceptions
  - [ ] Verify database query error handling

#### Fix Implementation
- [ ] **If RPC issue:**
  - [ ] Add RPC connection retry logic
  - [ ] Add fallback RPC endpoints
  - [ ] Add rate limiting awareness

- [ ] **If cron error:**
  - [ ] Wrap cron job logic in try/catch
  - [ ] Add graceful degradation (log + continue)
  - [ ] Implement dead letter queue for failed transitions

#### Validation
- [ ] Deploy fix to devnet
- [ ] Monitor for 4 hours (0 crashes expected)
- [ ] Verify cron job runs successfully (check logs)
- [ ] ✅ **Gate:** Market Monitor stable 4+ hours

---

### Day 5: Stability Verification (8 hours)

**Objective:** Ensure all 5 services stable for 24 hours

#### Health Checks
- [ ] **PM2 Ecosystem Status:**
  ```bash
  pm2 status
  # Expected: All services "online" with 0 restarts
  ```

- [ ] **Service-by-Service Validation:**
  - [ ] ✅ **API Gateway:** Port 4000 responding, 0 restarts
  - [ ] ✅ **WebSocket Server:** Port 4001 connected, 0 restarts
  - [ ] ✅ **Event Indexer:** Port 4002 receiving events, 0 restarts
  - [ ] ✅ **Vote Aggregator:** Aggregating votes, 0 restarts (FIXED)
  - [ ] ✅ **Market Monitor:** Auto-finalizing markets, 0 restarts (FIXED)

- [ ] **24-Hour Monitoring:**
  - [ ] All services running continuously (no interruptions)
  - [ ] PM2 restart count = 0 for all services
  - [ ] No errors in logs (check `pm2 logs --err`)
  - [ ] Redis connection stable
  - [ ] RPC calls successful

#### Documentation
- [ ] Document root causes found (WEEK1_DEBUGGING_REPORT.md)
- [ ] Document fixes implemented
- [ ] Update deployment guide with stability improvements

---

### Week 1 Quality Gate ✅

**ALL must be TRUE to proceed to Week 2:**

- [ ] ✅ Vote Aggregator: 0 restarts for 24+ hours
- [ ] ✅ Market Monitor: 0 restarts for 24+ hours
- [ ] ✅ All 5 backend services: "online" status in PM2
- [ ] ✅ Redis connection: stable and working
- [ ] ✅ RPC calls: successful (no 429 rate limit errors)
- [ ] ✅ No error logs in PM2 (pm2 logs --err shows clean)
- [ ] ✅ Cron jobs: running on schedule
- [ ] ✅ Team confidence: HIGH that services are stable

**If ANY gate fails:**
- Continue debugging (do NOT proceed to Week 2)
- Allocate additional time (up to Week 1 + 3 days)
- Escalate if blockers persist >7 days

**Estimated Completion:** November 15, 2025 (Day 5-7)

---

## WEEKS 2-4: PARALLEL EXECUTION

**Objective:** Maximize throughput with 3 independent workstreams
**Duration:** 21 days (120 hours across 3 tracks)
**Status:** 0% Complete
**Target Completion:** December 6, 2025

> **PREREQUISITE:** Week 1 Quality Gate MUST PASS before starting parallel tracks.

---

### TRACK A: Program Testing + Security Audit 🔐

**Owner:** Backend/Rust Engineer
**Duration:** 15 working days (80 hours total)
**Dependencies:** None (fully independent track)
**Status:** 0% Complete

> **CRITICAL:** This track integrates blockchain-tool for comprehensive security audit WHILE writing tests, creating maximum synergy (audit findings → test cases → fixes → validation).

---

#### Week 2: PRIMARY SECURITY AUDIT (blockchain-tool)

##### Day 1 (Monday): Launch Comprehensive Security Audit

**Task:** Run blockchain-tool comprehensive audit
- [ ] 🔐 **Invoke blockchain-tool skill:**
  ```
  Use: blockchain-tool
  Target: programs/zmart-core/src/
  Framework: Anchor (Solana)
  Depth: Comprehensive (all 470+ vulnerability patterns)
  Output: docs/security/PRIMARY_AUDIT_REPORT.md
  ```

- [ ] **Expected Findings:**
  - Critical: 0-5 vulnerabilities (immediate fix required)
  - High: 5-15 vulnerabilities (fix this week)
  - Medium: 10-20 vulnerabilities (fix Week 3-4)
  - Low: 15-30 vulnerabilities (technical debt)
  - Informational: 20-40 findings (code quality)

- [ ] **Vulnerability Categories Analyzed:**
  - ✅ Reentrancy protection
  - ✅ Access control (admin, aggregator, user roles)
  - ✅ Arithmetic safety (checked vs unchecked operations)
  - ✅ Account validation (ownership, signer, PDA derivation)
  - ✅ State transition validation (FSM correctness)
  - ✅ Integer precision (fixed-point LMSR math)
  - ✅ Economic vulnerabilities (front-running, price manipulation)
  - ✅ Oracle manipulation attacks
  - ✅ Fee distribution correctness

- [ ] **Deliverables:**
  - [ ] PRIMARY_AUDIT_REPORT.md (comprehensive vulnerability report)
  - [ ] Severity-categorized findings list
  - [ ] Code location references for each issue

⏱️ **Estimated Time:** 4-6 hours

---

##### Day 2 (Tuesday): Triage & Prioritization

**Task:** Organize findings and create remediation plan

- [ ] **Categorize Findings by Severity:**
  ```
  CRITICAL (Priority 0 - Fix Day 3-5):
  - Unchecked arithmetic leading to overflow/underflow
  - Missing ownership validation (unauthorized access)
  - Reentrancy vulnerabilities
  - Access control bypasses (admin functions)

  HIGH (Priority 1 - Fix Week 3):
  - State transition validation gaps
  - PDA derivation issues
  - Fee calculation errors
  - Position accounting bugs

  MEDIUM (Priority 2 - Fix Week 4):
  - Suboptimal error handling
  - Missing event emissions
  - Code quality issues
  - Documentation gaps

  LOW (Priority 3 - Technical Debt):
  - Code style inconsistencies
  - Unused imports
  - Minor optimizations
  ```

- [ ] **Create REMEDIATION_LOG.md:**
  - [ ] Document structure:
    ```markdown
    # REMEDIATION LOG

    ## Critical Issues
    ### AUDIT-2024-001: Unchecked Arithmetic in buy_shares
    - **File:** programs/zmart-core/src/instructions/buy_shares.rs:127
    - **Severity:** CRITICAL
    - **Description:** Multiplication without overflow check
    - **Fix:** Replace with .checked_mul()
    - **Status:** PENDING
    - **Test:** test_buy_shares_overflow_protection
    - **Assigned:** [Engineer Name]
    ```

- [ ] **Assign Priorities:**
  - [ ] Critical: Fix Day 3-5 (before continuing Track A)
  - [ ] High: Fix Week 3 (Days 6-10)
  - [ ] Medium: Fix Week 4 (Days 11-15)
  - [ ] Low: Document as technical debt

⏱️ **Estimated Time:** 6-8 hours

---

##### Day 3-5 (Wed-Fri): Critical Issue Remediation

**Task:** Fix all CRITICAL severity vulnerabilities

**Process (for EACH critical finding):**

1. **Write Security Test (TDD Approach):**
   ```rust
   // File: tests/security/arithmetic_buy_shares_tests.rs

   #[test]
   fn test_buy_shares_overflow_protection() {
       // Arrange: Create scenario that triggers overflow
       let price = u64::MAX / 2;
       let shares = 10_u64;

       // Act: Attempt to buy shares (should fail)
       let result = buy_shares(
           &mut market,
           &mut position,
           shares,
           price
       );

       // Assert: Should fail with ArithmeticOverflow error
       assert_eq!(
           result.unwrap_err(),
           ErrorCode::ArithmeticOverflow
       );
   }
   ```

2. **Verify Test FAILS (Vulnerability Exists):**
   ```bash
   cargo test test_buy_shares_overflow_protection
   # Expected: FAILED (vulnerability not yet fixed)
   ```

3. **Implement Fix in Program Code:**
   ```rust
   // BEFORE (vulnerable):
   let cost = price * shares;

   // AFTER (fixed):
   let cost = price
       .checked_mul(shares)
       .ok_or(ErrorCode::ArithmeticOverflow)?;
   ```

4. **Verify Test PASSES (Vulnerability Fixed):**
   ```bash
   cargo test test_buy_shares_overflow_protection
   # Expected: PASSED (vulnerability fixed)
   ```

5. **Document in REMEDIATION_LOG.md:**
   ```markdown
   ### AUDIT-2024-001: Unchecked Arithmetic in buy_shares
   - **Status:** ✅ FIXED
   - **Fix Commit:** abc123def
   - **Test Added:** test_buy_shares_overflow_protection
   - **Test Status:** PASSING
   - **Date Fixed:** November 18, 2025
   ```

**Expected Critical Issues (estimate 5-8):**
- [ ] **Issue 1:** Unchecked arithmetic in buy_shares → FIXED + TESTED
- [ ] **Issue 2:** Missing ownership validation in resolve_market → FIXED + TESTED
- [ ] **Issue 3:** Access control bypass in update_global_config → FIXED + TESTED
- [ ] **Issue 4:** Reentrancy in claim_winnings → FIXED + TESTED
- [ ] **Issue 5:** [Additional critical issue] → FIXED + TESTED

⏱️ **Estimated Time:** 20-24 hours (4-6 hours per critical issue)

---

#### Week 3: High Issue Remediation + Unit Tests

##### Day 6-10 (Week 3 Mon-Fri): Fix High-Severity Issues

**Task:** Fix all HIGH severity vulnerabilities

**Same Process as Critical Issues:**
1. Write security test (TDD)
2. Verify test fails (vulnerability exists)
3. Implement fix
4. Verify test passes (vulnerability fixed)
5. Document in REMEDIATION_LOG.md

**Expected High Issues (estimate 10-15):**
- [ ] **State Transition Validation Gaps:**
  - [ ] PROPOSED → FINALIZED blocked (missing validation)
  - [ ] Duplicate state transition prevention

- [ ] **PDA Derivation Issues:**
  - [ ] Market PDA collision prevention
  - [ ] Position PDA uniqueness validation

- [ ] **Fee Calculation Errors:**
  - [ ] Rounding errors in fee distribution
  - [ ] Fee percentage validation (must sum to 10%)

- [ ] **Position Accounting Bugs:**
  - [ ] Share balance tracking accuracy
  - [ ] Cost basis calculation correctness

⏱️ **Estimated Time:** 30-40 hours (2-3 hours per high issue)

---

#### Week 4: Medium Issues + Comprehensive Test Suite

##### Day 11-15 (Week 4 Mon-Fri): Medium Issues + Full Test Coverage

**Tasks:**
1. Fix medium-severity issues (10-20 issues)
2. Write comprehensive functional unit tests (non-security)
3. Achieve >90% code coverage

**Medium Issues (Estimate 10-20):**
- [ ] Suboptimal error handling (generic errors → specific)
- [ ] Missing event emissions (MarketCreated, TradeExecuted)
- [ ] Code quality improvements (dead code removal)
- [ ] Documentation gaps (function doc comments)

**Comprehensive Unit Tests:**
- [ ] **LMSR Calculations (10-15 tests):**
  - [ ] Cost function: C(q) = b * ln(e^(q_yes/b) + e^(q_no/b))
  - [ ] Buy cost calculation
  - [ ] Sell proceeds calculation
  - [ ] Price calculation: P(YES) in [0,1]
  - [ ] Bounded loss: b * ln(2) ≈ 0.693 * b
  - [ ] Edge cases: zero liquidity, max shares

- [ ] **State Transitions (8-12 tests):**
  - [ ] Valid transitions (all 6 states)
  - [ ] Invalid transitions blocked
  - [ ] Time-based transitions (48h RESOLVING → FINALIZED)
  - [ ] Vote-triggered transitions (70% → APPROVED)

- [ ] **Fee Distribution (6-8 tests):**
  - [ ] 10% total fee collection
  - [ ] 3% protocol, 2% creator, 5% stakers split
  - [ ] Fee rounding correctness
  - [ ] Zero-fee edge cases

- [ ] **Access Control (8-10 tests):**
  - [ ] Admin-only functions (update_global_config, emergency_pause)
  - [ ] Aggregator-only functions (aggregate votes)
  - [ ] User restrictions (can't resolve own market)
  - [ ] Role validation on all instructions

**Code Coverage Target:**
- [ ] Run coverage: `cargo tarpaulin --out Html`
- [ ] Target: >90% line coverage
- [ ] Target: >85% branch coverage
- [ ] Identify untested code paths → write tests

⏱️ **Estimated Time:** 30-40 hours

---

#### Track A Deliverables (Week 4 End)

- [ ] ✅ **PRIMARY_AUDIT_REPORT.md** (comprehensive vulnerability report)
- [ ] ✅ **REMEDIATION_LOG.md** (all fixes documented with evidence)
- [ ] ✅ **50-100 Rust tests passing:**
  - 10-20 security tests (critical + high vulnerabilities)
  - 30-80 functional tests (LMSR, states, fees, access)
- [ ] ✅ **Code Coverage:** >90% line, >85% branch
- [ ] ✅ **All Critical Issues:** FIXED and TESTED
- [ ] ✅ **All High Issues:** FIXED and TESTED
- [ ] ✅ **Medium Issues:** 80%+ fixed (remaining documented as tech debt)
- [ ] ✅ **Test Suite:** All passing (`cargo test`)

#### Track A Quality Gate ✅

- [ ] All critical security issues FIXED
- [ ] All high security issues FIXED
- [ ] 50-100 tests passing
- [ ] Code coverage >90%
- [ ] No compilation warnings (`cargo clippy`)
- [ ] Code formatted (`cargo fmt --check`)

**If Gate Fails:** Extend Week 4 by 1 week, complete fixes

---

### TRACK B: Frontend Transaction Integration

**Owner:** Frontend Engineer
**Duration:** 15 working days (60 hours total)
**Dependencies:** None (fully independent track)
**Status:** 0% Complete

**Objective:** Connect existing UI to on-chain transactions, enable real trading

---

#### Week 2-4: Transaction Integration (Days 1-15)

##### Day 1-3: Transaction Builder Integration (16-20 hours)

**Task:** Connect UI components to transaction builders

- [ ] **Review Existing Transaction Builders:**
  - [ ] File: `frontend/lib/solana/transactions.ts` (400+ lines)
  - [ ] Verify all 18 instructions have builders:
    - [ ] buildBuySharesTransaction()
    - [ ] buildSellSharesTransaction()
    - [ ] buildClaimWinningsTransaction()
    - [ ] buildResolveMarketTransaction()
    - [ ] [etc. for all 18 instructions]

- [ ] **Connect Buy/Sell UI:**
  - [ ] File: `frontend/app/markets/[id]/page.tsx`
  - [ ] Import transaction builder
  - [ ] Wire "Buy YES" button:
    ```typescript
    const handleBuyShares = async () => {
      setLoading(true);
      try {
        const tx = await buildBuySharesTransaction(
          wallet.publicKey,
          marketId,
          outcome, // 'YES' or 'NO'
          shares
        );
        // Sign and send (next task)
      } catch (error) {
        toast.error('Failed to build transaction');
      } finally {
        setLoading(false);
      }
    };
    ```
  - [ ] Wire "Sell YES" button (similar)

- [ ] **Connect Claim UI:**
  - [ ] File: `frontend/app/portfolio/page.tsx`
  - [ ] Wire "Claim Winnings" button
  - [ ] Only show for FINALIZED markets
  - [ ] Disable if no winnings (position = 0)

- [ ] **Add Loading States:**
  - [ ] Transaction building: "Preparing transaction..."
  - [ ] Wallet signing: "Confirm in wallet..."
  - [ ] Transaction confirming: "Confirming on blockchain..."
  - [ ] Transaction confirmed: "Success! ✅"

⏱️ **Estimated Time:** 16-20 hours

---

##### Day 4-7: Wallet Signing Flow (16-20 hours)

**Task:** Implement transaction signing with wallet adapters

- [ ] **Implement Transaction Signing:**
  ```typescript
  // File: frontend/lib/solana/transactions.ts

  export async function signAndSendTransaction(
    transaction: Transaction,
    wallet: WalletContextState,
    connection: Connection
  ): Promise<string> {
    // 1. Get recent blockhash
    transaction.recentBlockhash = (
      await connection.getLatestBlockhash()
    ).blockhash;
    transaction.feePayer = wallet.publicKey!;

    // 2. Sign with wallet
    const signed = await wallet.signTransaction!(transaction);

    // 3. Send to network
    const signature = await connection.sendRawTransaction(
      signed.serialize()
    );

    // 4. Confirm transaction
    await connection.confirmTransaction(signature, 'confirmed');

    return signature;
  }
  ```

- [ ] **Add Error Handling:**
  - [ ] User rejected: "Transaction cancelled by user"
  - [ ] Insufficient SOL: "Insufficient SOL for transaction fee"
  - [ ] Simulation failed: "Transaction simulation failed: [reason]"
  - [ ] Network error: "Network error, please retry"

- [ ] **Implement Success/Error Toasts:**
  ```typescript
  try {
    const signature = await signAndSendTransaction(tx, wallet, connection);
    toast.success(
      <div>
        Transaction successful!
        <a href={`https://explorer.solana.com/tx/${signature}?cluster=devnet`}>
          View on Explorer
        </a>
      </div>
    );
  } catch (error) {
    if (error.message.includes('User rejected')) {
      toast.error('Transaction cancelled');
    } else {
      toast.error(`Transaction failed: ${error.message}`);
    }
  }
  ```

- [ ] **Add Transaction Confirmation Polling:**
  - [ ] Poll every 1 second for max 30 seconds
  - [ ] Show progress indicator
  - [ ] Timeout after 30 seconds with retry option

- [ ] **Test with All 6 Wallet Adapters:**
  - [ ] Phantom ✅
  - [ ] Solflare ✅
  - [ ] Backpack ✅
  - [ ] Coinbase Wallet ✅
  - [ ] Trust Wallet ✅
  - [ ] Torus ✅

⏱️ **Estimated Time:** 16-20 hours

---

##### Day 8-12: Real-Time WebSocket Integration (16-20 hours)

**Task:** Connect WebSocket for live price updates

- [ ] **Review Existing WebSocket Client:**
  - [ ] File: `frontend/lib/websocket/client.ts` (318 lines, already implemented)
  - [ ] Auto-reconnect ✅
  - [ ] Fallback to polling after 5 failed reconnections ✅

- [ ] **Connect WebSocket to Backend:**
  - [ ] Update WebSocket URL (once backend stable Week 1)
  - [ ] Test connection: `wsClient.connect()`
  - [ ] Verify messages received

- [ ] **Implement useMarketUpdates() Hook:**
  ```typescript
  // File: frontend/hooks/useMarketUpdates.ts

  export function useMarketUpdates(marketId: string) {
    const [prices, setPrices] = useState({ yes: 0.5, no: 0.5 });

    useEffect(() => {
      // Subscribe to market updates
      wsClient.subscribe(`market:${marketId}`, (data) => {
        setPrices({
          yes: data.priceYes,
          no: data.priceNo
        });
      });

      return () => {
        wsClient.unsubscribe(`market:${marketId}`);
      };
    }, [marketId]);

    return prices;
  }
  ```

- [ ] **Update LMSR Chart Dynamically:**
  - [ ] Connect useMarketUpdates() to chart component
  - [ ] Animate price changes (smooth transition)
  - [ ] Update current price marker on curve

- [ ] **Add Optimistic UI Updates:**
  - [ ] On buy/sell: Immediately update local state
  - [ ] Revert if transaction fails (rollback)
  - [ ] Confirm with WebSocket update (reconciliation)

- [ ] **Implement Trade Feed:**
  - [ ] Show last 5 trades in sidebar
  - [ ] Real-time updates via WebSocket
  - [ ] Format: "User abc...xyz bought 10 YES @ 0.65"

⏱️ **Estimated Time:** 16-20 hours

---

##### Day 13-15: On-Chain Data Fetching (12-16 hours)

**Task:** Replace Supabase-only fetching with RPC queries

- [ ] **Fetch MarketAccount from On-Chain:**
  ```typescript
  // File: frontend/lib/solana/fetchMarketAccount.ts

  import { Program } from '@coral-xyz/anchor';

  export async function fetchMarketAccount(
    marketId: PublicKey,
    program: Program
  ): Promise<MarketAccount> {
    const [marketPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('market'), marketId.toBuffer()],
      program.programId
    );

    const marketAccount = await program.account.marketAccount.fetch(marketPDA);
    return marketAccount;
  }
  ```

- [ ] **Fetch UserPosition from On-Chain:**
  ```typescript
  export async function fetchUserPosition(
    wallet: PublicKey,
    marketId: PublicKey,
    program: Program
  ): Promise<UserPosition | null> {
    const [positionPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('position'), wallet.toBuffer(), marketId.toBuffer()],
      program.programId
    );

    try {
      const position = await program.account.userPosition.fetch(positionPDA);
      return position;
    } catch (error) {
      // Position doesn't exist (user hasn't traded)
      return null;
    }
  }
  ```

- [ ] **Integrate with React Query:**
  ```typescript
  export function useMarketAccount(marketId: string) {
    const { program } = useProgram();

    return useQuery({
      queryKey: ['market', marketId],
      queryFn: () => fetchMarketAccount(new PublicKey(marketId), program),
      staleTime: 60 * 1000, // 1 minute
      refetchOnWindowFocus: true
    });
  }
  ```

- [ ] **Test Data Consistency:**
  - [ ] Compare on-chain data with Supabase
  - [ ] Verify prices match
  - [ ] Verify shares match
  - [ ] Verify state matches
  - [ ] Fix any inconsistencies

- [ ] **Cache Strategy:**
  - [ ] React Query: 1-minute stale time
  - [ ] WebSocket: Invalidate cache on update
  - [ ] Manual refetch button (for debugging)

⏱️ **Estimated Time:** 12-16 hours

---

#### Track B Deliverables (Week 4 End)

- [ ] ✅ **Buy/Sell Buttons:** Execute real on-chain transactions
- [ ] ✅ **Wallet Signing:** Works with all 6 wallet adapters
- [ ] ✅ **Transaction Confirmation:** Polling + success/error toasts
- [ ] ✅ **WebSocket:** Real-time price updates working
- [ ] ✅ **On-Chain Data:** Fetched from RPC (not Supabase-only)
- [ ] ✅ **Optimistic UI:** Instant feedback with rollback on failure
- [ ] ✅ **Testing:** All flows tested on devnet with real SOL

#### Track B Quality Gate ✅

- [ ] Users can buy shares successfully (devnet tested)
- [ ] Users can sell shares successfully (devnet tested)
- [ ] Users can claim winnings (devnet tested)
- [ ] All 6 wallet adapters working
- [ ] WebSocket connection stable
- [ ] On-chain data displayed correctly
- [ ] Transactions confirm within 30 seconds

**If Gate Fails:** Extend Week 4, debug issues

---

### TRACK C: Integration Test Suite

**Owner:** QA/Fullstack Engineer
**Duration:** 15 working days (60 hours total)
**Dependencies:** None (fully independent track)
**Status:** 0% Complete

**Objective:** Build comprehensive end-to-end integration tests

---

#### Week 2-4: Integration Test Development (Days 1-15)

##### Day 1-3: Test Infrastructure Setup (12-16 hours)

**Task:** Prepare test environment and tooling

- [ ] **Review Existing Test Infrastructure:**
  - [ ] Directory: `backend/tests/`
  - [ ] Helpers: `backend/tests/helpers/` (program interaction helpers)
  - [ ] Fixtures: `backend/tests/fixtures/` (test data)

- [ ] **Set Up Test Environment:**
  - [ ] Devnet endpoint configuration
  - [ ] Test wallets (create 20 test wallets for multi-user tests)
    ```bash
    # Already exists: backend/tests/setup/create-test-wallets.sh
    ./backend/tests/setup/create-test-wallets.sh
    ```
  - [ ] Airdrop test SOL (2 SOL per wallet)
  - [ ] Test Supabase project (separate from production)

- [ ] **Create Test Data Fixtures:**
  - [ ] Market fixtures: testMarket1, testMarket2, etc.
  - [ ] User fixtures: testUser1-20
  - [ ] Vote fixtures: testVote1-100
  - [ ] Trade fixtures: testTrade1-50

- [ ] **Configure Jest/Mocha:**
  - [ ] Timeout: 60 seconds (devnet can be slow)
  - [ ] Parallel execution: disabled (sequential for determinism)
  - [ ] Retry failed tests: 2 retries (network flakiness)

⏱️ **Estimated Time:** 12-16 hours

---

##### Day 4-7: Happy Path Test (Full Lifecycle) (16-20 hours)

**Task:** Test complete market lifecycle end-to-end

**Test: Market Creation → Trading → Resolution → Claim**

```typescript
// File: backend/tests/integration/01-market-lifecycle.test.ts

describe('Complete Market Lifecycle', () => {
  it('should complete full lifecycle: create → trade → resolve → claim', async () => {
    // Step 1: Create Market Proposal
    const market = await createMarket({
      question: 'Will ETH reach $5000 by end of 2025?',
      outcomes: ['YES', 'NO'],
      liquidity: 1000_000_000_000, // 1000 SOL (9 decimals)
      resolutionTime: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days
    });
    expect(market.state).toBe(MarketState.PROPOSED);

    // Step 2: Vote for Approval (10 users, 7 like, 3 dislike)
    for (let i = 0; i < 7; i++) {
      await submitProposalVote(market.id, testUsers[i], 'like');
    }
    for (let i = 7; i < 10; i++) {
      await submitProposalVote(market.id, testUsers[i], 'dislike');
    }

    // Step 3: Aggregate Votes (should reach 70% threshold)
    await aggregateProposalVotes(market.id);
    const updatedMarket = await getMarketAccount(market.id);
    expect(updatedMarket.state).toBe(MarketState.APPROVED);

    // Step 4: Admin Activates Market
    await activateMarket(market.id, adminWallet);
    const activeMarket = await getMarketAccount(market.id);
    expect(activeMarket.state).toBe(MarketState.ACTIVE);

    // Step 5: Trading (20 users trade)
    const traders = [];
    for (let i = 0; i < 20; i++) {
      const outcome = i % 2 === 0 ? 'YES' : 'NO';
      const shares = 10_000_000_000; // 10 shares

      const trade = await buyShares(
        market.id,
        testUsers[i],
        outcome,
        shares
      );
      traders.push({ user: testUsers[i], outcome, shares, cost: trade.cost });
    }

    // Step 6: Oracle Resolves Market
    await resolveMarket(market.id, oracleWallet, 'YES');
    const resolvingMarket = await getMarketAccount(market.id);
    expect(resolvingMarket.state).toBe(MarketState.RESOLVING);

    // Step 7: Wait 48 Hours (simulate time passage)
    await simulateTimePassage(48 * 60 * 60); // 48 hours

    // Step 8: Auto-Finalize (Market Monitor should trigger this)
    await finalizeMarket(market.id);
    const finalizedMarket = await getMarketAccount(market.id);
    expect(finalizedMarket.state).toBe(MarketState.FINALIZED);

    // Step 9: Winners Claim Payouts
    const yesTraders = traders.filter(t => t.outcome === 'YES');
    for (const trader of yesTraders) {
      const payout = await claimWinnings(market.id, trader.user);
      expect(payout).toBeGreaterThan(trader.cost); // Profit
    }

    // Step 10: Losers Get Nothing
    const noTraders = traders.filter(t => t.outcome === 'NO');
    for (const trader of noTraders) {
      const result = await claimWinnings(market.id, trader.user);
      expect(result.payout).toBe(0); // Lost shares
    }

    // Validation: Check on-chain/off-chain consistency
    await assertOnChainOffChainConsistency(market.id);
    await assertLMSRInvariants(market.id);
    await assertFeeDistribution(market.id);
  });
});
```

- [ ] Implement test (use existing helpers from backend/tests/helpers/)
- [ ] Run test: `npm run test:integration`
- [ ] Verify 100% pass rate over 10 runs
- [ ] Document test in integration test report

⏱️ **Estimated Time:** 16-20 hours

---

##### Day 8-12: Edge Case & Error Tests (16-20 hours)

**Task:** Test edge cases and error scenarios

**Tests to Implement:**

1. **Dispute Flow Test:**
   ```typescript
   it('should handle dispute and overturn outcome', async () => {
     // 1. Market resolved to YES
     // 2. Users dispute (20 votes: 12 agree, 8 disagree)
     // 3. Outcome overturned to NO
     // 4. New winners claim payouts
   });
   ```

2. **Zero Trades Market:**
   ```typescript
   it('should finalize market with zero trades', async () => {
     // 1. Create and approve market
     // 2. Activate market
     // 3. NO trades executed
     // 4. Resolve and finalize
     // 5. Creator gets liquidity back
   });
   ```

3. **Max Slippage Rejection:**
   ```typescript
   it('should reject trade with >5% slippage', async () => {
     // 1. Large trade that moves price >5%
     // 2. Transaction should fail
     // 3. Error: SlippageExceeded
   });
   ```

4. **Double Claim Rejection:**
   ```typescript
   it('should prevent double claiming', async () => {
     // 1. User claims winnings
     // 2. User tries to claim again
     // 3. Transaction should fail
     // 4. Error: AlreadyClaimed
   });
   ```

5. **Invalid State Transition:**
   ```typescript
   it('should block PROPOSED → FINALIZED transition', async () => {
     // 1. Market in PROPOSED state
     // 2. Try to finalize directly (skip ACTIVE, RESOLVING)
     // 3. Transaction should fail
     // 4. Error: InvalidStateTransition
   });
   ```

- [ ] Implement all 5 edge case tests
- [ ] Verify all tests pass consistently
- [ ] Document edge cases covered

⏱️ **Estimated Time:** 16-20 hours

---

##### Day 13-15: Multi-User & Concurrency Tests (12-16 hours)

**Task:** Test concurrent operations and race conditions

**Tests to Implement:**

1. **Concurrent Trading Test:**
   ```typescript
   it('should handle 10 concurrent users trading', async () => {
     const tradePromises = testUsers.slice(0, 10).map(user =>
       buyShares(market.id, user, 'YES', 10_000_000_000)
     );

     const results = await Promise.all(tradePromises);

     // All trades should succeed
     results.forEach(r => expect(r.success).toBe(true));

     // No race conditions in share counting
     const finalMarket = await getMarketAccount(market.id);
     expect(finalMarket.sharesYes).toBe(100_000_000_000); // 10 users * 10 shares
   });
   ```

2. **High-Volume Trading Test:**
   ```typescript
   it('should process 100 trades without errors', async () => {
     const trades = [];
     for (let i = 0; i < 100; i++) {
       const user = testUsers[i % 20]; // Cycle through 20 users
       const outcome = i % 2 === 0 ? 'YES' : 'NO';
       const trade = await buyShares(market.id, user, outcome, 5_000_000_000);
       trades.push(trade);
     }

     // All trades successful
     expect(trades.every(t => t.success)).toBe(true);

     // LMSR invariants hold
     await assertLMSRInvariants(market.id);
   });
   ```

3. **Vote Aggregation with 100 Votes:**
   ```typescript
   it('should aggregate 100 proposal votes correctly', async () => {
     // 100 users vote (70 like, 30 dislike)
     for (let i = 0; i < 100; i++) {
       const vote = i < 70 ? 'like' : 'dislike';
       await submitProposalVote(market.id, testUsers[i], vote);
     }

     await aggregateProposalVotes(market.id);

     const market = await getMarketAccount(market.id);
     expect(market.state).toBe(MarketState.APPROVED); // 70% threshold met
   });
   ```

- [ ] Implement concurrency tests
- [ ] Run tests with parallelization (stress test)
- [ ] Verify no race conditions
- [ ] Document concurrency safety

⏱️ **Estimated Time:** 12-16 hours

---

#### Track C Deliverables (Week 4 End)

- [ ] ✅ **7-10 Comprehensive Integration Tests:**
  1. Happy path (full lifecycle) ✅
  2. Dispute flow ✅
  3. Zero trades market ✅
  4. Max slippage rejection ✅
  5. Double claim rejection ✅
  6. Invalid state transition ✅
  7. Concurrent trading ✅
  8. High-volume trading ✅
  9. Vote aggregation (100 votes) ✅
  10. [Additional test if needed]

- [ ] ✅ **Test Infrastructure:** Complete and documented
- [ ] ✅ **Test Data:** Fixtures created
- [ ] ✅ **Automation:** All tests automated (`npm run test:integration`)
- [ ] ✅ **Pass Rate:** 100% over 10 consecutive runs

#### Track C Quality Gate ✅

- [ ] All 7-10 integration tests passing
- [ ] Happy path test: 100% success over 10 runs
- [ ] Edge cases covered (5+ scenarios)
- [ ] Concurrency tests passing (no race conditions)
- [ ] Test suite automated
- [ ] Test documentation complete

**If Gate Fails:** Extend Week 4, fix flaky tests

---

### Weeks 2-4 Final Quality Gate (ALL TRACKS)

**MUST ALL BE TRUE to proceed to Week 5:**

#### Track A (Program Testing + Audit)
- [ ] ✅ All critical security issues FIXED
- [ ] ✅ All high security issues FIXED
- [ ] ✅ 50-100 Rust tests passing
- [ ] ✅ Code coverage >90%
- [ ] ✅ PRIMARY_AUDIT_REPORT.md complete
- [ ] ✅ REMEDIATION_LOG.md complete

#### Track B (Frontend Integration)
- [ ] ✅ Buy/sell transactions working on devnet
- [ ] ✅ All 6 wallet adapters tested
- [ ] ✅ WebSocket real-time updates working
- [ ] ✅ On-chain data fetching implemented

#### Track C (Integration Tests)
- [ ] ✅ 7-10 integration tests passing
- [ ] ✅ Happy path 100% reliable
- [ ] ✅ Edge cases covered
- [ ] ✅ Concurrency tests passing

**If ANY gate fails:** Extend Week 4 by up to 1 week to complete

**Target Completion:** December 6, 2025

---

## WEEKS 5-6: CONVERGENCE & TESTING

**Objective:** Merge all tracks, comprehensive validation
**Duration:** 14 days (80 hours)
**Status:** 0% Complete
**Target Completion:** December 20, 2025

> **PREREQUISITE:** Weeks 2-4 Final Quality Gate MUST PASS

---

### Week 5: Integration & Bug Fixing

#### Day 1-2: Merge All Tracks (16 hours)

**Task:** Integrate all parallel work

- [ ] **Git Branch Management:**
  ```bash
  # Merge Track A (tests + security fixes)
  git checkout main
  git pull origin main
  git merge track-a-program-testing --no-ff

  # Merge Track B (frontend transactions)
  git merge track-b-frontend-integration --no-ff

  # Merge Track C (integration tests)
  git merge track-c-integration-tests --no-ff
  ```

- [ ] **Resolve Merge Conflicts:**
  - [ ] Package.json conflicts (dependency versions)
  - [ ] Cargo.toml conflicts (program dependencies)
  - [ ] Shared configuration files

- [ ] **Full Build Verification:**
  ```bash
  # Programs
  cd programs/zmart-core && anchor build

  # Backend
  cd backend && npm install && npm run build

  # Frontend
  cd frontend && npm install && npm run build
  ```

- [ ] **Smoke Test:**
  - [ ] All 18 instructions compile
  - [ ] All backend services start
  - [ ] Frontend builds without errors
  - [ ] No TypeScript compilation errors

---

#### Day 3-5: End-to-End Testing (24 hours)

**Task:** Run all tests across entire system

- [ ] **Run All Test Suites:**
  ```bash
  # Program tests (Track A)
  cd programs/zmart-core && cargo test
  # Expected: 50-100 tests passing

  # Integration tests (Track C)
  cd backend && npm run test:integration
  # Expected: 7-10 tests passing

  # Frontend E2E tests (if implemented)
  cd frontend && npm run test:e2e
  ```

- [ ] **Manual Testing (Full User Flows):**
  1. **Wallet Connection Flow:**
     - Connect Phantom wallet
     - Verify balance displayed
     - Disconnect wallet

  2. **Market Browsing Flow:**
     - Browse market list
     - Filter by state (ACTIVE)
     - Search for market
     - Click market card → detail page

  3. **Trading Flow:**
     - View market detail
     - Enter share quantity (10 YES)
     - Review cost preview
     - Click "Buy Shares"
     - Confirm in wallet
     - Verify transaction success toast
     - Verify shares in portfolio

  4. **Claiming Flow:**
     - Navigate to portfolio
     - View FINALIZED market
     - Click "Claim Winnings"
     - Confirm in wallet
     - Verify payout received

- [ ] **Triage Bugs Found:**
  - [ ] Critical: Blockers preventing core functionality
  - [ ] High: Functionality issues affecting user experience
  - [ ] Medium: UX issues, edge cases
  - [ ] Low: Minor issues, polish

---

#### Day 6-7: Bug Fixing Sprint (16 hours)

**Task:** Fix all critical and high bugs

- [ ] **Fix Critical Bugs (P0):**
  - Example: Transaction signing fails with Phantom
  - Example: Market state not updating after vote aggregation
  - **Process:** Fix → Test → Deploy → Verify
  - **Target:** 0 critical bugs remaining

- [ ] **Fix High Bugs (P1):**
  - Example: WebSocket disconnects after 5 minutes
  - Example: LMSR chart shows incorrect price
  - **Process:** Fix → Test → Deploy → Verify
  - **Target:** 0 high bugs remaining

- [ ] **Document Medium/Low Bugs:**
  - Create issues in GitHub/Linear
  - Label as "technical-debt"
  - Prioritize for V1.1

- [ ] **Regression Testing:**
  ```bash
  # Re-run ALL tests after bug fixes
  cargo test && npm run test:integration && npm run test:e2e
  ```

---

### Week 6: Load Testing & Performance Tuning

#### Day 8-10: Load Testing (24 hours)

**Task:** Stress test system under high load

- [ ] **Design Load Test Scenario:**
  ```javascript
  // File: backend/tests/load/load-test.js (using k6)

  import http from 'k6/http';
  import { check, sleep } from 'k6';

  export let options = {
    stages: [
      { duration: '2m', target: 50 },  // Ramp up to 50 users
      { duration: '5m', target: 100 }, // Stay at 100 users
      { duration: '2m', target: 0 },   // Ramp down
    ],
    thresholds: {
      http_req_duration: ['p(95)<2000'], // 95% < 2s
      http_req_failed: ['rate<0.01'],    // <1% error rate
    },
  };

  export default function () {
    // Simulate user trading
    const marketId = 'test-market-123';
    const buyRes = http.post(
      `${API_URL}/trades/buy`,
      JSON.stringify({
        marketId,
        outcome: 'YES',
        shares: 10_000_000_000
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );

    check(buyRes, {
      'status is 200': (r) => r.status === 200,
      'response time < 2s': (r) => r.timings.duration < 2000,
    });

    sleep(1);
  }
  ```

- [ ] **Execute Load Tests:**
  ```bash
  k6 run backend/tests/load/load-test.js
  ```

- [ ] **Measure Performance:**
  - **Transaction Time:**
    - p50: Target <1s
    - p95: Target <2s
    - p99: Target <5s

  - **API Response Time:**
    - p50: Target <100ms
    - p95: Target <200ms
    - p99: Target <500ms

  - **WebSocket Latency:**
    - Average: Target <500ms
    - p95: Target <1s

  - **Error Rate:**
    - Target: <1% (99%+ success)

- [ ] **Analyze Bottlenecks:**
  - Identify slow RPC calls
  - Identify slow database queries
  - Identify WebSocket bottlenecks
  - Identify memory leaks

---

#### Day 11-14: Performance Tuning (32 hours)

**Task:** Optimize identified bottlenecks

- [ ] **Database Optimization:**
  - [ ] Add indexes:
    ```sql
    CREATE INDEX idx_markets_state ON markets(state);
    CREATE INDEX idx_trades_market_id ON trades(market_id);
    CREATE INDEX idx_positions_wallet ON positions(wallet_address);
    ```
  - [ ] Optimize queries (use EXPLAIN ANALYZE)
  - [ ] Add query result caching (Redis)

- [ ] **RPC Connection Pooling:**
  ```typescript
  // Increase connection pool size
  const connection = new Connection(RPC_URL, {
    commitment: 'confirmed',
    httpHeaders: {
      'Connection': 'keep-alive',
    },
    fetch: (url, init) => {
      return fetch(url, {
        ...init,
        keepalive: true,
        // Connection pooling
        agent: new Agent({ keepAlive: true, maxSockets: 50 })
      });
    }
  });
  ```

- [ ] **WebSocket Optimization:**
  - [ ] Batch messages (send updates every 500ms, not immediately)
  - [ ] Compress messages (gzip)
  - [ ] Implement backpressure (limit message queue size)

- [ ] **Frontend Optimization:**
  - [ ] React.memo() on expensive components (LSMRChart, MarketCard)
  - [ ] Lazy load routes: `const Portfolio = lazy(() => import('./Portfolio'))`
  - [ ] Image optimization: Use next/image
  - [ ] Code splitting: Separate vendor bundle

- [ ] **Re-run Load Tests:**
  - [ ] Verify improvements
  - [ ] Compare before/after metrics
  - [ ] Ensure thresholds met

---

### Weeks 5-6 Quality Gate

**MUST ALL BE TRUE to proceed to Week 7:**

- [ ] ✅ All 150+ tests passing (50-100 Rust + 7-10 integration + E2E)
- [ ] ✅ All critical bugs FIXED (0 remaining)
- [ ] ✅ All high bugs FIXED (0 remaining)
- [ ] ✅ Medium/low bugs documented as technical debt
- [ ] ✅ Load test passes:
  - 100 concurrent users ✅
  - 1000 trades in 10 minutes ✅
  - <1% error rate ✅
- [ ] ✅ Performance benchmarks met:
  - Transaction time <2s (p95) ✅
  - API response <200ms (p95) ✅
  - WebSocket latency <1s ✅
- [ ] ✅ System stable under load (no crashes, no memory leaks)

**If Gate Fails:** Extend Week 6 by up to 1 week

**Target Completion:** December 20, 2025

---

## WEEK 7: VALIDATION SECURITY AUDIT 🔐

**Objective:** Confirm all vulnerabilities fixed, validate mainnet readiness
**Duration:** 7 days (40 hours)
**Status:** 0% Complete
**Target Completion:** December 27, 2025

> **PREREQUISITE:** Weeks 5-6 Quality Gate MUST PASS

---

### Day 1 (Monday): Validation Audit (blockchain-tool)

**Task:** Re-run comprehensive security audit and compare with primary audit

- [ ] 🔐 **Run blockchain-tool Validation Audit:**
  ```
  Use: blockchain-tool
  Target: programs/zmart-core/src/
  Framework: Anchor (Solana)
  Depth: Comprehensive (all 470+ patterns)
  Compare: docs/security/PRIMARY_AUDIT_REPORT.md
  Output: docs/security/VALIDATION_AUDIT_REPORT.md
  ```

- [ ] **Expected Outcome:**
  ```
  📊 VALIDATION AUDIT REPORT
  ==========================

  Comparison: PRIMARY (Week 2) → VALIDATION (Week 7)

  Resolved Issues:
    Critical: 5 → 0 ✅ (100% fixed)
    High: 12 → 0 ✅ (100% fixed)
    Medium: 18 → 3 ⚠️ (83% fixed, 3 accepted as tech debt)
    Low: 25 → 15 ℹ️ (40% fixed, 15 tech debt acceptable)

  New Issues Found: 0 🎉

  Remaining Technical Debt:
    - 3 medium (documented, non-blocking, accepted)
    - 15 low (code quality, deferred to V2)

  Mainnet Readiness: ✅ READY
  ```

- [ ] **Review Validation Report:**
  - [ ] Verify all critical issues resolved (target: 0)
  - [ ] Verify all high issues resolved (target: 0)
  - [ ] Review remaining medium issues (acceptable <5)
  - [ ] Review remaining low issues (acceptable <20)

- [ ] **Document Comparison:**
  - [ ] Create comparison table (PRIMARY vs VALIDATION)
  - [ ] Evidence of fixes (commit hashes, test results)
  - [ ] Rationale for accepted technical debt

⏱️ **Estimated Time:** 4-6 hours

---

### Day 2-3 (Tue-Wed): Complementary Security Tools

**Task:** Run additional security tools for comprehensive coverage

#### Day 2: Soteria + Sec3

- [ ] 🛠️ **Run Soteria (Solana-specific analyzer):**
  ```bash
  # Install Soteria
  cargo install soteria

  # Run analysis
  cd programs/zmart-core
  soteria --target src/ --out ../../docs/security/SOTERIA_REPORT.txt
  ```

- [ ] **Review Soteria Report:**
  - [ ] Check for Solana-specific vulnerabilities
  - [ ] Verify account validation patterns
  - [ ] Check for common Solana anti-patterns
  - [ ] Document findings

- [ ] 🛠️ **Run Sec3 (security scanner):**
  ```bash
  # Install Sec3
  npm install -g sec3

  # Run scan
  sec3 scan programs/zmart-core/src/ --out docs/security/SEC3_REPORT.json
  ```

- [ ] **Review Sec3 Report:**
  - [ ] Check for security vulnerabilities
  - [ ] Review access control patterns
  - [ ] Verify error handling
  - [ ] Document findings

⏱️ **Estimated Time:** 8 hours

---

#### Day 3: Cargo Audit + Dependency Check

- [ ] 🛠️ **Run cargo audit (dependency vulnerabilities):**
  ```bash
  cd programs/zmart-core
  cargo audit
  ```

- [ ] **Review Audit Results:**
  - [ ] Check for vulnerable dependencies
  - [ ] Update vulnerable crates
  - [ ] Document CVEs found (if any)
  - [ ] Verify all dependencies up-to-date

- [ ] **Generate Combined Security Report:**
  - [ ] Consolidate findings from:
    - blockchain-tool ✅
    - Soteria ✅
    - Sec3 ✅
    - cargo audit ✅
  - [ ] Create unified findings list
  - [ ] Categorize by severity
  - [ ] Document remediation status

⏱️ **Estimated Time:** 4 hours

---

### Day 4-5 (Thu-Fri): Manual Security Review

**Task:** Penetration testing and manual code review

#### Manual Penetration Testing Scenarios:

1. **State Transition Attacks:**
   - [ ] Try to skip states (PROPOSED → FINALIZED)
   - [ ] Try invalid transitions (FINALIZED → ACTIVE)
   - [ ] Try to transition without authorization

2. **Access Control Bypass:**
   - [ ] Try admin functions as regular user
   - [ ] Try to resolve market as non-oracle
   - [ ] Try to aggregate votes as non-aggregator

3. **Arithmetic Attacks:**
   - [ ] Try to overflow (buy u64::MAX shares)
   - [ ] Try to underflow (sell more shares than owned)
   - [ ] Try precision loss attacks (LMSR rounding)

4. **Economic Attacks:**
   - [ ] Try front-running (submit large trade before aggregation)
   - [ ] Try price manipulation (large trades to move price)
   - [ ] Try to drain liquidity

5. **Double-Spend Attacks:**
   - [ ] Try to claim winnings twice
   - [ ] Try to vote twice with same wallet
   - [ ] Try to create duplicate positions

**Documentation:**
- [ ] Document each attack scenario
- [ ] Document test results (success/failure)
- [ ] Document defenses validated
- [ ] Create penetration testing report

⏱️ **Estimated Time:** 12-16 hours

---

### Day 6-7 (Weekend): Final Security Report

**Task:** Generate comprehensive final audit report

- [ ] 📄 **Create FINAL_SECURITY_AUDIT_REPORT.md:**

  **Structure:**
  ```markdown
  # ZMART V0.69 - FINAL SECURITY AUDIT REPORT

  ## Executive Summary
  - Audit Date: December 27, 2025
  - Scope: Complete prediction market platform (18 on-chain instructions)
  - Auditor: blockchain-tool + Soteria + Sec3 + manual review
  - Methodology: Automated tools + manual penetration testing
  - Mainnet Readiness: ✅ APPROVED

  ## Audit Methodology
  1. Automated vulnerability scanning (blockchain-tool - 470+ patterns)
  2. Solana-specific analysis (Soteria)
  3. Security scanning (Sec3)
  4. Dependency audit (cargo audit)
  5. Manual penetration testing (15+ attack scenarios)
  6. Code review (access control, state machines, arithmetic)

  ## Findings Summary

  ### Primary Audit (Week 2-4):
  - Total Issues: 60
  - Critical: 5 (ALL FIXED ✅)
  - High: 12 (ALL FIXED ✅)
  - Medium: 18 (15 FIXED, 3 accepted ✅)
  - Low: 25 (10 FIXED, 15 tech debt ℹ️)

  ### Validation Audit (Week 7):
  - Critical: 0 ✅
  - High: 0 ✅
  - Medium: 3 (accepted, documented)
  - Low: 15 (tech debt, non-blocking)
  - New Issues: 0 ✅

  ### Soteria Analysis:
  - Issues Found: [X]
  - Critical: 0 ✅
  - Recommendations: [List]

  ### Sec3 Scan:
  - Issues Found: [X]
  - Critical: 0 ✅
  - Recommendations: [List]

  ### Cargo Audit:
  - Vulnerable Dependencies: 0 ✅
  - All dependencies up-to-date ✅

  ### Manual Penetration Testing:
  - Attack Scenarios Tested: 15
  - Successful Attacks: 0 ✅
  - Defenses Validated: ✅ All

  ## Accepted Technical Debt

  ### Medium Issues (3 items):
  1. [Issue description]
     - Severity: Medium
     - Rationale for acceptance: [Why non-blocking]
     - Planned fix: V1.1

  ### Low Issues (15 items):
  - Code quality improvements
  - Minor optimizations
  - Documentation enhancements

  ## Mainnet Readiness Assessment

  ✅ **APPROVED FOR MAINNET DEPLOYMENT**

  ### Rationale:
  1. Zero critical vulnerabilities ✅
  2. Zero high-severity vulnerabilities ✅
  3. All medium issues reviewed and accepted by team ✅
  4. Comprehensive test coverage (>90%) ✅
  5. 150+ tests passing (all categories) ✅
  6. All fixes validated with automated tests ✅
  7. No new vulnerabilities introduced since primary audit ✅
  8. Manual penetration testing: 0 successful attacks ✅

  ### Security Highlights:
  - ✅ All arithmetic operations use checked math (.checked_mul, etc.)
  - ✅ All account ownership validated
  - ✅ All state transitions validated with FSM
  - ✅ Access control enforced on all admin functions
  - ✅ Reentrancy protection implemented
  - ✅ Economic attacks mitigated (slippage protection, bounded loss)
  - ✅ Oracle manipulation defenses in place

  ## Recommendations

  ### Immediate (Before Mainnet):
  - None (all critical/high issues resolved) ✅

  ### Short-Term (V1.1 - First Month):
  - Address 3 remaining medium issues
  - Implement continuous security monitoring
  - Set up bug bounty program

  ### Long-Term (V2):
  - Address low-severity technical debt
  - Implement additional economic safeguards
  - Enhance monitoring and alerting

  ## Continuous Security

  ### Recommendations:
  1. Monthly re-audits (automated tools)
  2. Annual comprehensive audit (manual + automated)
  3. Bug bounty program (launch with mainnet)
  4. Security monitoring dashboard (Grafana)
  5. Incident response plan (documented and tested)

  ## Conclusion

  ZMART V0.69 prediction market platform has undergone comprehensive security auditing using multiple methodologies. All critical and high-severity vulnerabilities identified in the primary audit (Week 2-4) have been successfully remediated and validated. The validation audit (Week 7) confirms zero critical/high issues remain.

  The platform demonstrates strong security posture with robust defenses against common attack vectors. Remaining technical debt is minimal and non-blocking for mainnet deployment.

  **Recommendation: APPROVED for mainnet deployment.**

  ---

  **Auditor:** Claude Code + blockchain-tool
  **Date:** December 27, 2025
  **Signature:** [Digital signature]
  ```

- [ ] **Team Review & Approval:**
  - [ ] Technical lead review
  - [ ] Security specialist review (if available)
  - [ ] Business stakeholder approval
  - [ ] Document approvals

- [ ] **GO/NO-GO Decision:**
  - [ ] ✅ **GO:** If 0 critical/high issues
  - [ ] ❌ **NO-GO:** If any critical/high issues remain
    - Fix issues before proceeding
    - Re-run validation audit
    - Re-assess mainnet readiness

⏱️ **Estimated Time:** 8-12 hours

---

### Week 7 Deliverables

- [ ] ✅ **VALIDATION_AUDIT_REPORT.md** (blockchain-tool comparison)
- [ ] ✅ **SOTERIA_REPORT.txt** (Solana-specific analysis)
- [ ] ✅ **SEC3_REPORT.json** (security scan results)
- [ ] ✅ **Cargo audit clean** (0 vulnerable dependencies)
- [ ] ✅ **Penetration testing report** (15+ attack scenarios tested)
- [ ] ✅ **FINAL_SECURITY_AUDIT_REPORT.md** (comprehensive)
- [ ] ✅ **Mainnet readiness decision:** GO ✅

### Week 7 Quality Gate

**MUST ALL BE TRUE to proceed to Week 8:**

- [ ] ✅ 0 critical vulnerabilities (validated by multiple tools)
- [ ] ✅ 0 high-severity vulnerabilities (validated by multiple tools)
- [ ] ✅ All medium issues reviewed and accepted (<5 remaining)
- [ ] ✅ Penetration testing: 0 successful attacks
- [ ] ✅ All dependencies up-to-date (cargo audit clean)
- [ ] ✅ FINAL_SECURITY_AUDIT_REPORT.md approved by team
- [ ] ✅ Mainnet readiness: GO decision confirmed

**If Gate Fails:**
- Fix remaining critical/high issues
- Re-run validation audit
- Delay mainnet by 1-2 weeks if needed

**Target Completion:** December 27, 2025

---

## WEEK 8: COMMUNITY BETA TESTING

**Objective:** Test with real users on devnet before mainnet
**Duration:** 7 days (40 hours)
**Status:** 0% Complete
**Target Completion:** January 3, 2026

> **PREREQUISITE:** Week 7 Quality Gate MUST PASS (security audit approved)

---

### Day 1-2: Beta Preparation (16 hours)

**Task:** Prepare devnet environment and recruit beta testers

#### Deploy Final Build to Devnet
- [ ] **Programs:**
  ```bash
  cd programs/zmart-core
  anchor build
  anchor deploy --provider.cluster devnet
  # Verify program ID matches documentation
  ```

- [ ] **Backend Services:**
  ```bash
  # Deploy all 5 services to devnet
  pm2 start ecosystem.config.js --env devnet
  pm2 save

  # Verify all services running:
  # - API Gateway (port 4000)
  # - WebSocket Server (port 4001)
  # - Event Indexer (port 4002)
  # - Vote Aggregator
  # - Market Monitor
  ```

- [ ] **Frontend:**
  ```bash
  cd frontend
  npm run build
  # Deploy to staging.zmart.io (Vercel/Netlify)
  # Point to devnet programs and backend
  ```

#### Recruit Beta Testers
- [ ] **Target:** 10 beta testers
- [ ] **Recruitment Channels:**
  - [ ] Discord community announcement
  - [ ] Twitter call for testers
  - [ ] Direct outreach to interested users

- [ ] **Selection Criteria:**
  - Diverse backgrounds (traders, developers, users)
  - Active in crypto/prediction markets
  - Willing to provide detailed feedback

#### Distribute Test Resources
- [ ] **Test SOL Distribution:**
  ```bash
  # Airdrop 2 SOL to each tester
  for wallet in "${BETA_WALLETS[@]}"; do
    solana airdrop 2 $wallet --url devnet
  done
  ```

- [ ] **Beta Testing Guide:**
  - [ ] Create comprehensive test guide:
    ```markdown
    # ZMART V0.69 - Beta Testing Guide

    ## Welcome Beta Tester!

    Thank you for helping test ZMART prediction markets!

    ## Setup (5 minutes)
    1. Install Phantom wallet (or your preferred Solana wallet)
    2. Switch to Devnet in wallet settings
    3. Visit: https://staging.zmart.io
    4. Connect wallet
    5. Verify you have 2 SOL (test funds)

    ## Testing Goals (20 markets, 100 trades)
    We need your help testing:
    - Market creation and voting
    - Trading (buy/sell shares)
    - Resolution and claiming
    - Real-time updates
    - Overall user experience

    ## Test Scenarios

    ### Scenario 1: Create a Market
    1. Click "Create Market"
    2. Question: "Will [your prediction]?"
    3. Add 10 SOL liquidity
    4. Submit proposal
    5. ✅ Verify market appears in list

    ### Scenario 2: Vote on Proposal
    1. Find market in PROPOSED state
    2. Click "Vote"
    3. Choose Like/Dislike
    4. Submit vote
    5. ✅ Verify vote counted

    ### Scenario 3: Trade Shares
    1. Find ACTIVE market
    2. Click "Trade"
    3. Buy 10 YES shares
    4. Confirm transaction in wallet
    5. ✅ Verify shares in portfolio

    ### Scenario 4: Claim Winnings
    1. Wait for market FINALIZED
    2. Go to Portfolio
    3. Click "Claim Winnings"
    4. Confirm transaction
    5. ✅ Verify SOL received

    ## Feedback Collection
    Please report:
    - 🐛 Bugs (anything broken)
    - 🤔 Confusing UX (anything unclear)
    - 💡 Feature requests (nice-to-haves)
    - ⏱️ Performance issues (slow loading, etc.)

    Submit feedback in #beta-testing Discord channel

    ## Support
    Stuck? Ping @team in Discord
    ```

- [ ] **Feedback Collection Setup:**
  - [ ] Create Discord #beta-testing channel
  - [ ] Create feedback form (Google Forms/Typeform)
  - [ ] Set up error tracking (Sentry configured)

---

### Day 3-4: Active Beta Testing (16 hours)

**Task:** Facilitate testing and monitor for issues

#### Beta Testing Goals:
- [ ] **20 markets created** (2 per tester)
- [ ] **100+ trades executed** (10 per tester average)
- [ ] **50+ votes cast** (5 per tester)
- [ ] **10+ disputes initiated** (edge case testing)
- [ ] **20+ claims processed** (full lifecycle validation)

#### Daily Monitoring:
- [ ] **Watch Error Logs (Sentry):**
  - Check for JavaScript errors
  - Check for transaction failures
  - Check for API errors

- [ ] **Monitor PM2 Services:**
  ```bash
  pm2 monit  # Real-time monitoring
  pm2 logs --err  # Check for errors
  ```

- [ ] **Track Crashes:**
  - Vote Aggregator crashes: 0 expected
  - Market Monitor crashes: 0 expected
  - API Gateway downtime: 0 expected

- [ ] **Monitor Discord #beta-testing:**
  - Respond to user questions (<30 min response time)
  - Collect bug reports
  - Note UX feedback

#### Daily Standups (with beta testers):
- [ ] **Day 3 Standup (Evening):**
  - How many markets created so far?
  - Any bugs encountered?
  - Any confusing UX?
  - Any questions?

- [ ] **Day 4 Standup (Evening):**
  - Trading working smoothly?
  - Any transaction failures?
  - Real-time updates working?
  - Overall experience rating (1-5)?

---

### Day 5: Bug Triage & Fixes (8 hours)

**Task:** Collect and prioritize all beta feedback

#### Collect All Feedback:
- [ ] **Bug Reports:**
  - Compile from Discord
  - Compile from feedback form
  - Compile from Sentry errors
  - Compile from PM2 logs

- [ ] **Categorize Bugs:**
  ```
  CRITICAL (P0 - Fix immediately, blocks mainnet):
  - Transaction failures
  - Wallet connection failures
  - Data corruption
  - Service crashes

  HIGH (P1 - Fix before mainnet):
  - UX issues affecting core flows
  - Performance issues
  - Incorrect calculations
  - Missing error messages

  MEDIUM (P2 - Fix if time permits):
  - Minor UX improvements
  - Edge case bugs
  - Non-critical errors

  LOW (P3 - Defer to V1.1):
  - Polish items
  - Nice-to-have features
  - Minor visual issues
  ```

#### Fix Critical + High Bugs:
- [ ] **Process (for each bug):**
  1. Reproduce bug locally
  2. Write test case (if missing)
  3. Implement fix
  4. Verify test passes
  5. Deploy fix to devnet
  6. Verify with beta tester

- [ ] **Target:**
  - 0 critical bugs remaining
  - 0 high bugs remaining
  - Medium/low documented as tech debt

---

### Day 6-7: Final Validation (16 hours)

**Task:** Verify all feedback addressed, system ready for mainnet

#### Re-Test Fixed Issues:
- [ ] **Ask beta testers to re-test:**
  - Critical fixes verified by users
  - High fixes verified by users
  - Overall experience improved?

#### Final Metrics Check:
- [ ] **Beta Testing Success Metrics:**
  - [ ] ✅ 20+ markets created
  - [ ] ✅ 100+ trades executed
  - [ ] ✅ Transaction success rate: >99%
  - [ ] ✅ 0 service crashes during beta
  - [ ] ✅ Beta tester satisfaction: >4/5 average
  - [ ] ✅ All critical bugs fixed
  - [ ] ✅ All high bugs fixed

#### Regression Testing:
- [ ] **Re-run ALL tests:**
  ```bash
  # Program tests
  cargo test

  # Integration tests
  npm run test:integration

  # Load tests
  k6 run tests/load/load-test.js
  ```

- [ ] **Manual smoke test:**
  - Create market ✅
  - Vote ✅
  - Trade ✅
  - Resolve ✅
  - Claim ✅

#### GO/NO-GO Decision:
- [ ] **Review Checklist:**
  - [ ] ✅ All critical beta bugs fixed
  - [ ] ✅ All high beta bugs fixed
  - [ ] ✅ Beta tester satisfaction >4/5
  - [ ] ✅ Transaction success rate >99%
  - [ ] ✅ 0 service crashes
  - [ ] ✅ All tests passing
  - [ ] ✅ Load test passing
  - [ ] ✅ Security audit approved (Week 7)

- [ ] **Final Decision:**
  - [ ] ✅ **GO for mainnet:** If all criteria met
  - [ ] ❌ **NO-GO:** If any critical issues remain
    - Delay mainnet by 1 week
    - Fix blockers
    - Re-test

---

### Week 8 Deliverables

- [ ] ✅ **Beta Testing Complete:**
  - 20+ markets created ✅
  - 100+ trades executed ✅
  - 10 beta testers participated ✅
  - Comprehensive feedback collected ✅

- [ ] ✅ **Bug Fixes:**
  - All critical bugs FIXED ✅
  - All high bugs FIXED ✅
  - Medium/low documented ✅

- [ ] ✅ **Beta Testing Report:**
  - User feedback summary
  - Bug report (fixed vs deferred)
  - Performance metrics
  - User satisfaction scores
  - Lessons learned

### Week 8 Quality Gate

**MUST ALL BE TRUE to proceed to Weeks 9-10:**

- [ ] ✅ Beta testing successful (20 markets, 100 trades)
- [ ] ✅ All critical beta bugs FIXED
- [ ] ✅ All high beta bugs FIXED
- [ ] ✅ Beta tester satisfaction >4/5 (average rating)
- [ ] ✅ System stable (0 crashes during 7-day beta)
- [ ] ✅ Transaction success rate >99%
- [ ] ✅ All tests passing (regression check)
- [ ] ✅ GO decision confirmed for mainnet

**If Gate Fails:**
- Delay mainnet launch
- Fix remaining blockers
- Consider extended beta (Week 8+)

**Target Completion:** January 3, 2026

---

## WEEKS 9-10: MAINNET LAUNCH 🚀

**Objective:** Deploy to mainnet, monitor launch
**Duration:** 14 days (60 hours)
**Status:** 0% Complete
**Target Completion:** January 22, 2026

> **PREREQUISITE:** Week 8 Quality Gate MUST PASS (beta successful, GO decision)

---

### Week 9: Pre-Launch Preparation

#### Day 1-2: Final Devnet Smoke Tests (16 hours)

**Task:** Verify final build before mainnet

- [ ] **Deploy Final Build to Devnet:**
  - [ ] Programs: Latest build (no changes since beta)
  - [ ] Backend: Latest code (all beta fixes included)
  - [ ] Frontend: Production build

- [ ] **Run Full Smoke Test Suite:**
  ```bash
  # Automated tests
  npm run test:smoke

  # Manual smoke tests:
  1. Create market
  2. Vote on proposal
  3. Trade shares
  4. Resolve market
  5. Claim winnings
  ```

- [ ] **Verify All Features:**
  - [ ] All 18 instructions working
  - [ ] All 5 backend services healthy
  - [ ] Frontend transactions successful
  - [ ] WebSocket real-time updates working
  - [ ] Database queries fast (<200ms)

- [ ] **Document Deployment Procedure:**
  - [ ] Step-by-step mainnet deployment guide
  - [ ] Rollback procedures (if deployment fails)
  - [ ] Incident response plan

---

#### Day 3-4: Mainnet Deployment (Programs) (16 hours)

**Task:** Deploy programs to mainnet-beta

- [ ] **Pre-Deployment Checklist:**
  - [ ] Program built and tested on devnet ✅
  - [ ] Security audit approved ✅
  - [ ] Beta testing successful ✅
  - [ ] Mainnet wallet funded (10 SOL for deployment)

- [ ] **Deploy Programs:**
  ```bash
  # Switch to mainnet
  solana config set --url mainnet-beta

  # Verify wallet
  solana address
  solana balance
  # Expected: >10 SOL

  # Deploy program
  cd programs/zmart-core
  anchor build
  anchor deploy --provider.cluster mainnet

  # CRITICAL: Save program ID
  MAINNET_PROGRAM_ID=$(solana address -k target/deploy/zmart_core-keypair.json)
  echo "Mainnet Program ID: $MAINNET_PROGRAM_ID"

  # Verify deployment
  solana program show $MAINNET_PROGRAM_ID
  ```

- [ ] **Initialize GlobalConfig (Mainnet):**
  ```bash
  # Run initialization script
  npm run initialize:mainnet

  # Verify GlobalConfig created
  # Check admin set correctly
  # Check parameters match production values
  ```

- [ ] **Test Program on Mainnet (Small Test):**
  - [ ] Create 1 test market (minimum liquidity)
  - [ ] Execute 1 buy transaction
  - [ ] Verify transaction successful
  - [ ] Verify state updated correctly

- [ ] **Update Documentation:**
  - [ ] Update CLAUDE.md with mainnet program ID
  - [ ] Update frontend .env with mainnet program ID
  - [ ] Update backend .env with mainnet program ID

---

#### Day 5-6: Mainnet Deployment (Backend + Frontend) (16 hours)

**Task:** Deploy backend services and frontend to production

#### Deploy Backend Services (Production Infrastructure)

- [ ] **Production Infrastructure Setup:**
  - [ ] AWS/GCP account configured
  - [ ] Production database (Supabase production tier)
  - [ ] Production Redis (managed Redis or ElastiCache)
  - [ ] Production RPC (Helius production plan or custom)

- [ ] **Environment Configuration:**
  ```bash
  # Create production .env
  # File: backend/.env.production

  NODE_ENV=production

  # Solana
  SOLANA_CLUSTER=mainnet-beta
  SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
  PROGRAM_ID=[MAINNET_PROGRAM_ID]

  # Database
  DATABASE_URL=[Supabase production URL]

  # Redis
  REDIS_URL=[Production Redis URL]

  # Services
  API_PORT=4000
  WEBSOCKET_PORT=4001
  INDEXER_PORT=4002

  # Helius (production plan)
  HELIUS_API_KEY=[Production API key]
  ```

- [ ] **Deploy Services:**
  ```bash
  # Build backend
  npm run build

  # Deploy to production (PM2 or Docker)
  pm2 start ecosystem.config.js --env production
  pm2 save

  # OR Docker deployment:
  docker-compose -f docker-compose.prod.yml up -d
  ```

- [ ] **Verify Services:**
  - [ ] API Gateway: https://api.zmart.io/health ✅
  - [ ] WebSocket: wss://ws.zmart.io ✅
  - [ ] Event Indexer: Running and receiving events ✅
  - [ ] Vote Aggregator: Stable (0 crashes) ✅
  - [ ] Market Monitor: Stable (0 crashes) ✅

#### Deploy Frontend (Production)

- [ ] **Production Build:**
  ```bash
  cd frontend

  # Update environment variables
  # File: .env.production
  NEXT_PUBLIC_SOLANA_CLUSTER=mainnet-beta
  NEXT_PUBLIC_PROGRAM_ID=[MAINNET_PROGRAM_ID]
  NEXT_PUBLIC_API_URL=https://api.zmart.io
  NEXT_PUBLIC_WS_URL=wss://ws.zmart.io

  # Build for production
  npm run build
  ```

- [ ] **Deploy to Production:**
  ```bash
  # Vercel deployment
  vercel --prod

  # OR Netlify deployment
  netlify deploy --prod

  # OR Custom hosting
  # Upload build/ to production server
  ```

- [ ] **Verify Frontend:**
  - [ ] Site accessible: https://zmart.io ✅
  - [ ] Wallet connection working ✅
  - [ ] Transactions successful ✅
  - [ ] Real-time updates working ✅

---

#### Day 7: Launch Preparation (8 hours)

**Task:** Final checks and launch announcement prep

- [ ] **Set Up Monitoring:**
  - [ ] Grafana dashboards (transaction success rate, uptime, errors)
  - [ ] Alerting (PagerDuty or email for critical issues)
  - [ ] Error tracking (Sentry configured for production)

- [ ] **Prepare Incident Response Plan:**
  ```markdown
  # Incident Response Plan

  ## Severity Levels
  - P0 (Critical): Platform down, cannot trade
  - P1 (High): Degraded performance, some users affected
  - P2 (Medium): Minor issues, workarounds available
  - P3 (Low): Cosmetic issues, no impact

  ## Response Times
  - P0: Immediate (team on-call)
  - P1: <1 hour
  - P2: <4 hours
  - P3: <24 hours

  ## Team On-Call
  - Primary: [Engineer name, phone, email]
  - Backup: [Engineer name, phone, email]
  - Escalation: [Tech lead, phone, email]

  ## Rollback Procedures
  1. Frontend: Revert Vercel deployment
  2. Backend: PM2 restart with previous version
  3. Programs: Cannot rollback (design for forwards compatibility)
  ```

- [ ] **Brief Team:**
  - [ ] Launch timeline (Day 1 at 10am UTC)
  - [ ] Roles and responsibilities
  - [ ] On-call schedule (24-hour watch Days 1-7)
  - [ ] Communication channels (Discord, Slack, email)

- [ ] **Prepare Launch Announcement:**
  ```markdown
  # ZMART V0.69 - Mainnet Launch! 🚀

  We're excited to announce ZMART prediction markets are now LIVE on Solana mainnet!

  🎯 What you can do:
  - Create prediction markets on any topic
  - Trade YES/NO shares with LMSR bonding curve
  - Earn from accurate predictions
  - Participate in decentralized resolution

  🔗 Try it now: https://zmart.io

  🛡️ Security:
  - Comprehensive security audit (blockchain-tool + manual)
  - 7-day community beta (20 markets, 100 trades)
  - 150+ automated tests passing

  🙏 Thank you to our 10 beta testers!

  Questions? Join our Discord: [link]
  ```

---

### Week 10: MAINNET LAUNCH 🚀

#### Day 1 (Launch Day): Go Live (8 hours)

**Objective:** Public launch

- [ ] **Final Health Checks (9:00 AM UTC):**
  - [ ] All backend services: ✅ Online
  - [ ] Frontend: ✅ Accessible
  - [ ] Database: ✅ Connected
  - [ ] Redis: ✅ Connected
  - [ ] RPC: ✅ Responding

- [ ] **Public Announcement (10:00 AM UTC):**
  - [ ] Twitter announcement
  - [ ] Discord announcement
  - [ ] Reddit post (r/solana, r/PredictionMarkets)
  - [ ] Product Hunt launch

- [ ] **Monitor Launch (10:00 AM - 10:00 PM UTC):**
  - [ ] Watch Grafana dashboard
  - [ ] Check error logs every hour
  - [ ] Respond to user questions in Discord
  - [ ] Track key metrics:
    - Markets created
    - Trades executed
    - Unique users
    - Transaction success rate
    - Uptime

- [ ] **Team On-Call:**
  - [ ] Primary engineer: Monitoring full-time
  - [ ] Backup engineer: Available on-call
  - [ ] Tech lead: Available for escalation

---

#### Day 2-7 (Week 10): Launch Monitoring (24 hours/day)

**Objective:** 24-hour watch, rapid incident response

**Daily Monitoring Routine:**

- [ ] **Every 4 Hours:**
  - [ ] Check Grafana dashboard
  - [ ] Review error logs (Sentry)
  - [ ] Check PM2 service status
  - [ ] Verify no crashes

- [ ] **Daily Status Report (End of Day):**
  ```markdown
  # Day [X] Status Report

  ## Metrics
  - Markets Created: [count]
  - Trades Executed: [count]
  - Unique Users: [count]
  - Total Volume: [SOL amount]
  - Transaction Success Rate: [%]
  - Uptime: [%]

  ## Issues
  - Critical: [0] ✅
  - High: [0] ✅
  - Medium: [X]
  - Low: [X]

  ## User Feedback
  - Positive: [summary]
  - Issues: [summary]

  ## Actions Taken
  - [If any hotfixes deployed]

  ## Next Day Plan
  - [Any proactive improvements]
  ```

**Incident Response (If Issues Arise):**

- [ ] **Incident Detection:**
  - Alert from monitoring system
  - User report in Discord
  - Team member discovers issue

- [ ] **Incident Response:**
  1. Acknowledge incident (team notified)
  2. Assess severity (P0/P1/P2/P3)
  3. Mobilize team (on-call engineer + backup if P0/P1)
  4. Diagnose root cause
  5. Implement fix
  6. Deploy fix (frontend/backend rollback or hotfix)
  7. Verify fix (test on production)
  8. Communicate to users (Discord update)
  9. Document incident (postmortem)

---

### Weeks 9-10 Deliverables

- [ ] ✅ **Mainnet Deployment:**
  - Programs deployed to mainnet ✅
  - Backend services running on production infrastructure ✅
  - Frontend deployed to production domain ✅

- [ ] ✅ **Launch Success:**
  - Public announcement made ✅
  - 20+ markets created (first 7 days) ✅
  - 100+ unique users (first 7 days) ✅
  - Transaction success rate >99% ✅
  - Uptime >99.5% (first 7 days) ✅

- [ ] ✅ **Monitoring & Support:**
  - 24-hour team watch (Days 1-7) ✅
  - Incident response plan executed (0 critical incidents) ✅
  - Daily status reports published ✅

### Weeks 9-10 Final Quality Gate (LAUNCH SUCCESS)

**MUST ALL BE TRUE for successful V1 launch:**

#### Technical Metrics (Day 1)
- [ ] ✅ All 18 instructions deployed to mainnet
- [ ] ✅ All 5 backend services running (>99% uptime)
- [ ] ✅ Frontend accessible at https://zmart.io
- [ ] ✅ Transaction success rate >99%
- [ ] ✅ No critical incidents (first 24 hours)

#### Business Metrics (First 7 Days)
- [ ] ✅ 20+ markets created
- [ ] ✅ 100+ trades executed
- [ ] ✅ 100+ unique users
- [ ] ✅ $1,000+ total volume (SOL)
- [ ] ✅ <3% transaction error rate

#### Quality Metrics (First 7 Days)
- [ ] ✅ Uptime >99.5%
- [ ] ✅ 0 critical incidents
- [ ] ✅ Mean time to resolution <4 hours (for P1 incidents)
- [ ] ✅ User satisfaction >4/5 (Discord feedback)

**Target Completion:** January 22, 2026 🎉

---

## SUCCESS METRICS

### V1 Launch Success Criteria

**Technical Metrics (Day 1):**
- [x] Programs: 18/18 instructions deployed ✅ (Already complete - devnet)
- [ ] Backend: 5/5 services running (>99% uptime)
- [ ] Frontend: Accessible and functional
- [ ] Tests: 150+ passing (50-100 Rust + 7-10 integration + E2E)
- [ ] Security: 0 critical vulnerabilities ✅ (Will be validated Week 7)
- [ ] Performance: Transaction time <2s (p95)
- [ ] Performance: API response time <200ms (p95)

**Business Metrics (First 30 Days):**
- [ ] 20+ markets created
- [ ] 200+ trades executed
- [ ] $5,000+ total volume
- [ ] 100+ unique users
- [ ] <3% transaction error rate

**Security Metrics:**
- [ ] PRIMARY_AUDIT complete (Week 2-4) ✅
- [ ] All critical issues FIXED ✅
- [ ] VALIDATION_AUDIT clean (Week 7) ✅
- [ ] Soteria + Sec3 pass ✅
- [ ] Manual penetration testing pass ✅
- [ ] FINAL_SECURITY_AUDIT_REPORT approved ✅

**Quality Metrics:**
- [ ] Rust tests: 50-100 passing
- [ ] Integration tests: 7-10 passing
- [ ] E2E tests: All passing
- [ ] Code coverage: >90%
- [ ] Load test: 100 users, 1000 trades, <1% error
- [ ] Beta testing: >4/5 satisfaction

**Bulletproof Rating:**
- Current: 60/100 (foundation complete, gaps identified)
- After Week 4: 70/100 (tests + security audit complete)
- After Week 7: 85/100 (security validated, beta tested)
- After Mainnet Launch: 90/100 (production-proven)

---

## APPENDIX

### Historical Context (Phase 1 Completion)

**Phase 1 Status (Weeks 1-3): 100% COMPLETE** ✅

Evidence of completed work (November 5-6, 2025):
- [x] All 18 on-chain instructions implemented
- [x] Programs deployed to devnet (7h3gXfBfYFueFVLYyfL5Qo1QGsf4GQUfW96FKVgnUsJS)
- [x] LMSR mathematics complete (fixed-point u64)
- [x] 6-state FSM implemented
- [x] Voting system complete (proposal + dispute)
- [x] Admin instructions implemented
- [x] Backend foundation (5/6 services scaffolded)

This work represents approximately 34% of total project (Phase 1 of 5 phases in original 14-week plan).

With revised analysis showing 60% actual completion, the 10-week hybrid plan is achievable with high confidence (80%).

---

### Daily Update Process

**Format:**
1. Update this checklist daily (mark completed tasks)
2. Note blockers or issues in comments
3. Update week completion percentages
4. Commit changes to git

**Example Daily Entry:**
```
Date: November 12, 2025
Week: Week 1, Day 2
Completed:
- [x] Debugged Vote Aggregator crash loop
- [x] Identified Redis connection issue as root cause
- [x] Implemented connection retry logic
In Progress:
- [ ] Testing Vote Aggregator fix (monitoring for 4 hours)
Blockers:
- None
Next:
- Debug Market Monitor crash loop (Day 3)
- Verify Vote Aggregator stable for 24 hours
```

---

### Emergency Contacts

**On-Call Engineer (Week 1-10):** [Name] - [Phone] - [Email]
**Project Lead:** [Name] - [Phone] - [Email]
**Infrastructure Support:** [Service Provider] - [Support Link]
**Security Escalation:** [Security Lead] - [Email]

---

**Last Updated:** November 9, 2025
**Next Review:** Daily during active development
**Estimated Mainnet Launch:** January 22, 2026 (Wednesday)

**Confidence:** 80% (HIGH) 🎯
