# TESTING_MASTER.md - Complete Testing Orchestration Hub

**Category:** Testing & Validation
**Tags:** [qa, developer, phase-3, critical, comprehensive]
**Last Updated:** 2025-11-08 23:15 PST

---

## Quick Links
- ⬆️ [Back to CLAUDE.md](../../../CLAUDE.md)
- 📚 [All Testing References](./README.md)
- 🔗 Related: [VALIDATION_MASTER](../validation/VALIDATION_MASTER.md) | [STATE_TESTING](../state/STATE_TESTING.md)

---

## 📋 OVERVIEW

This document serves as the **complete testing orchestration hub** for ZMART V0.69. It consolidates all testing knowledge, provides clear paths for every test type, and ensures no testing capability is overlooked.

**Purpose:** Central navigation for all testing activities across unit, integration, E2E, on-chain, performance, and security testing.

**Current Testing Status:**
- ✅ On-chain testing system ready (3,273 lines, 123KB)
- ✅ Unit tests complete (124 program tests, 95%+ coverage)
- ✅ Test infrastructure built (Jest, Playwright, helpers)
- ⏳ Integration tests ready to execute
- ⏳ E2E tests configured, not executed
- ❌ Performance tests designed, not run
- ❌ Security tests planned, not executed

---

## 🎯 TESTING STRATEGY OVERVIEW

### Four-Layer Testing Pyramid

```
         /\
        /  \  E2E Tests (Playwright)
       /────\  - User flows
      /      \  - Cross-browser
     /  🌐   \  - Visual regression
    /──────────\
   /            \  Integration Tests (Jest)
  /  🔗         \  - Component integration
 /──────────────\ - API contracts
/                \ - Data consistency
/────────────────\
│  ⚙️  Unit Tests │ - LMSR calculations
│  (Rust + Jest)  │ - State transitions
│                  │ - Business logic
└──────────────────┘
```

### Test Coverage Targets

| Test Type | Current | Target | Priority |
|-----------|---------|--------|----------|
| **Unit Tests** | 87% | 95%+ | ✅ MET |
| **Integration Tests** | 0% | 90%+ | 🚨 PRIORITY 1 |
| **E2E Tests** | 0% | 80%+ | ⚠️ PRIORITY 2 |
| **Performance Tests** | 0% | 5 benchmarks | ⚠️ PRIORITY 3 |
| **Security Tests** | 0% | OWASP Top 10 | ⏳ PRIORITY 4 |

---

## 🗺️ TESTING NAVIGATION MAP

### By Test Type

**1. Unit Testing**
- [TESTING_UNIT.md](./TESTING_UNIT.md) - Unit test guide
- Programs: 124 tests, 95%+ coverage ✅
- Backend: Partial coverage, expanding
- Quick Start: `anchor test` or `npm test`

**2. Integration Testing** ⭐ CURRENT PHASE
- [TESTING_INTEGRATION.md](./TESTING_INTEGRATION.md) - Integration test guide
- Status: Infrastructure ready, execution pending
- Quick Start: `npm run test:integration`
- **START HERE for Phase 3**

**3. On-Chain Testing** ⭐ UNIQUE STRENGTH
- [TESTING_ON_CHAIN.md](./TESTING_ON_CHAIN.md) - Real blockchain testing
- Infrastructure: 3,273 lines, 123KB documentation
- Quick Start: `npx ts-node backend/scripts/on-chain-test-voting-system.ts`
- **Comprehensive documentation system**

**4. End-to-End Testing**
- [TESTING_E2E.md](./TESTING_E2E.md) - Playwright E2E guide
- Status: Configured, not executed
- Quick Start: `pnpm test:e2e`
- Focus: User workflows, cross-browser

**5. Performance Testing**
- [TESTING_PERFORMANCE.md](./TESTING_PERFORMANCE.md) - Load & stress testing
- Status: Planned, not executed
- Targets: 100 users, 1,000 trades, >5 tx/sec
- **Upcoming in Phase 3**

**6. Security Testing**
- [TESTING_SECURITY.md](./TESTING_SECURITY.md) - Security validation
- Status: Planned for Phase 5
- Focus: OWASP Top 10, smart contract audits
- Tools: Soteria, Sec3, manual audits

### By Component

**Programs (Rust/Anchor)**
- Unit tests: `anchor test`
- Coverage: 95%+
- Location: `programs/zmart-core/tests/`
- [TESTING_PROGRAMS.md](./TESTING_PROGRAMS.md)

**Backend Services (TypeScript)**
- Unit tests: `npm test`
- Integration tests: `npm run test:integration`
- Location: `backend/tests/`, `backend/vote-aggregator/tests/`, `backend/event-indexer/tests/`
- [TESTING_BACKEND.md](./TESTING_BACKEND.md)

**Frontend (Next.js + Playwright)**
- E2E tests: `pnpm test:e2e`
- Visual tests: `pnpm test:e2e:ui`
- Location: `frontend/tests/`
- [TESTING_FRONTEND.md](./TESTING_FRONTEND.md)

### By Phase

**Phase 1 (Programs)** - ✅ COMPLETE
- Unit tests: 124 passing
- Coverage: 95%+
- Quality gate: MET

**Phase 2 (Backend)** - ✅ COMPLETE
- Service tests: Partial
- API tests: Basic
- Quality gate: MET (services operational)

**Phase 3 (Integration)** - ⏳ IN PROGRESS
- Integration tests: TO DO
- On-chain tests: TO DO
- E2E tests: TO DO
- Performance tests: TO DO
- **Quality gate:** >90% integration coverage, 0 critical bugs

**Phase 4 (Frontend)** - ❌ PENDING
- Component tests: Pending
- E2E user flows: Pending
- Accessibility tests: Pending

**Phase 5 (Security)** - ❌ PENDING
- Security audit: Pending
- Penetration tests: Pending
- Production validation: Pending

---

## ⚡ QUICK START GUIDES

### I Want To... → Do This

**...run quick validation**
```bash
# 1. Validate programs (30 sec)
anchor test

# 2. Check backend health (10 sec)
npm run test:db
curl http://localhost:4000/health

# 3. Run unit tests (2 min)
npm test
```

**...start Phase 3 integration testing** ⭐
```bash
# Step 1: Run on-chain voting test (5-10 min)
npx ts-node backend/scripts/on-chain-test-voting-system.ts

# Step 2: Review results
ls -lt docs/on-chain-testing/03-TEST-RESULTS/ | head -5

# Step 3: Run integration test suite (30 min)
npm run test:integration

# Step 4: Analyze and fix issues
npx ts-node backend/scripts/check-test-results.ts
```

**Full Path:** [PATH_TO_INTEGRATION_TESTING.md](../paths/PATH_TO_INTEGRATION_TESTING.md)

**...test a specific component**
```bash
# Programs
anchor test --skip-deploy

# Backend API
npm test -- tests/api/

# Vote Aggregator
cd backend/vote-aggregator && npm test

# Event Indexer
cd backend/event-indexer && npm test
```

**...run performance tests**
```bash
# Load test (100 users, 1,000 trades)
npx ts-node backend/scripts/load-test.ts

# Benchmark API endpoints
npx ts-node backend/scripts/benchmark-api.ts
```

**...debug a failing test**
1. Check [ERROR_CATALOG.md](../troubleshooting/ERROR_CATALOG.md)
2. Review [TROUBLESHOOTING_TESTING.md](../troubleshooting/TROUBLESHOOTING_TESTING.md)
3. Run test in debug mode: `npm test -- --debug`

---

## 🧪 EXISTING TEST INFRASTRUCTURE

### On-Chain Testing System ⭐ COMPREHENSIVE

**Location:** `docs/on-chain-testing/`
**Size:** 3,273+ lines, 123KB
**Status:** Production-ready, well-documented

**Key Documents:**
1. [INDEX.md](../../on-chain-testing/INDEX.md) - Complete navigation
2. [QUICK-START-VOTING-TEST.md](../../on-chain-testing/QUICK-START-VOTING-TEST.md) - 5-10 min test
3. [01-TEST-SCENARIOS.md](../../on-chain-testing/01-TEST-SCENARIOS.md) - 100+ test cases
4. [02-TEST-DATA.md](../../on-chain-testing/02-TEST-DATA.md) - Test wallets & fixtures
5. [03-TEST-RESULTS/](../../on-chain-testing/03-TEST-RESULTS/) - Historical results
6. [04-DEBUGGING-GUIDE.md](../../on-chain-testing/04-DEBUGGING-GUIDE.md) - Troubleshooting
7. [05-PERFORMANCE-BENCHMARKS.md](../../on-chain-testing/05-PERFORMANCE-BENCHMARKS.md) - Performance data
8. [TRANSACTION-DOCUMENTATION-TEMPLATE.md](../../on-chain-testing/TRANSACTION-DOCUMENTATION-TEMPLATE.md) - Standard template
9. [COMPREHENSIVE-TESTING-SYSTEM-SUMMARY.md](../../on-chain-testing/COMPREHENSIVE-TESTING-SYSTEM-SUMMARY.md) - System overview

**Test Categories (100+ scenarios):**
- Market lifecycle (8 tests)
- Trading operations (10 tests)
- Voting workflows (6 tests)
- Resolution process (8 tests)
- State transitions (15 tests)
- LMSR mathematics (12 tests)
- Fee distribution (5 tests)
- Authorization checks (8 tests)
- Edge cases (10 tests)
- Load tests (5 tests)
- Security tests (10 tests)
- Error handling (8 tests)

**Automated Test Documentation:**
The system automatically generates comprehensive JSON documentation for every test run, capturing:
- Transaction signatures & compute units
- On-chain state snapshots (before/after)
- Database state changes
- Performance metrics
- Test evidence (logs, screenshots)

**Quick Start:**
```bash
# Run automated voting test with full documentation
npx ts-node backend/scripts/on-chain-test-voting-system.ts

# View latest results
cat docs/on-chain-testing/03-TEST-RESULTS/$(ls -t docs/on-chain-testing/03-TEST-RESULTS/ | head -1)/TEST-*.json | jq
```

---

### Backend Test Scripts (19 Scripts)

**Location:** `backend/scripts/`

**Testing & Validation Scripts:**
1. `on-chain-test-voting-system.ts` ⭐ (658 lines) - Automated voting workflow test
2. `test-api-lifecycle.ts` - Complete API workflow test
3. `test-integration.ts` - Service integration test
4. `test-db-connection.ts` - Database connectivity test
5. `test-helius-connection.ts` - Helius RPC test
6. `test-pinata-connection.ts` - IPFS/Pinata test
7. `test-http-endpoints.ts` - API endpoint test
8. `test-event-indexer-webhook.ts` - Event indexer test
9. `check-test-results.ts` - Test result analysis
10. `validate-week2-simple.ts` - Backend validation
11. `validate-week2.ts` - Comprehensive validation

**Utility Scripts:**
12. `create-test-data.ts` - Generate test data
13. `create-market-onchain.ts` - Create test market
14. `run-voting-test.sh` - Shell wrapper for voting test

**Usage Examples:**
```bash
# Run automated voting test
npx ts-node backend/scripts/on-chain-test-voting-system.ts

# Test complete API lifecycle
npx ts-node backend/scripts/test-api-lifecycle.ts

# Validate backend services
npm run validate:week2

# Create test market
npx ts-node backend/scripts/create-market-onchain.ts

# Analyze test results
npx ts-node backend/scripts/check-test-results.ts
```

**Full Reference:** [BACKEND_SCRIPTS_REFERENCE.md](../../BACKEND_SCRIPTS_REFERENCE.md)

---

### Jest Integration Tests

**Location:** `backend/tests/integration/`

**Test Files:**
1. `01-market-lifecycle.test.ts` - Complete lifecycle (CREATE → CLAIM)
2. `02-multi-user-trading.test.ts` - Concurrent users (10 traders)
3. `03-voting-workflow.test.ts` - Proposal & dispute voting
4. `04-resolution-workflow.test.ts` - Resolution & finalization
5. `05-claims-workflow.test.ts` - Winner & fee claims
6. `06-admin-operations.test.ts` - Admin instructions
7. `07-edge-cases.test.ts` - Zero trades, max slippage, etc.
8. `08-performance.test.ts` - Load testing (100 users, 1,000 trades)

**Test Helpers:**
- `tests/helpers/program.ts` - Program interaction helpers
- `tests/helpers/supabase.ts` - Database helpers
- `tests/helpers/assertions.ts` - Custom validation functions

**Configuration:**
- `jest.config.js` - Jest configuration
- `tests/setup/global-setup.ts` - Global test setup
- `tests/setup/create-test-wallets.ts` - Test wallet creation
- `tests/setup/cleanup-test-data.ts` - Test data cleanup

**Run Tests:**
```bash
# All integration tests
npm run test:integration

# Specific test file
npm test tests/integration/01-market-lifecycle.test.ts

# With coverage
npm run test:coverage

# Setup (one-time)
npm run test:setup-wallets
```

---

### Service-Specific Tests

**Vote Aggregator Tests:**
```bash
cd backend/vote-aggregator
npm test

# Test files:
# - tests/voteService.test.ts
# - tests/voteRoutes.test.ts
# - tests/aggregationService.test.ts
# - tests/cronService.test.ts
```

**Event Indexer Tests:**
```bash
cd backend/event-indexer
npm test

# Test files:
# - tests/eventParser.test.ts
# - tests/schema-validation.test.ts
```

---

### Playwright E2E Tests

**Location:** `frontend/tests/`
**Status:** Configured, not yet executed

**Test Categories:**
- User authentication (wallet connection)
- Market browsing & filtering
- Trading workflows (buy/sell shares)
- Voting interactions (proposal/dispute)
- Claims workflows (winnings, fees)
- Real-time updates (WebSocket)
- Cross-browser compatibility

**Run Tests:**
```bash
cd frontend

# All E2E tests
pnpm test:e2e

# Specific test
pnpm test:e2e -- tests/trading.spec.ts

# UI mode (debugging)
pnpm test:e2e:ui

# Specific browser
pnpm test:e2e -- --project=chromium
```

**Configuration:** `frontend/playwright.config.ts`

---

## 📊 TEST COVERAGE MATRIX

### What Tests Cover What

| Component | Unit | Integration | E2E | On-Chain | Performance | Security |
|-----------|------|-------------|-----|----------|-------------|----------|
| **Programs** | ✅ 95% | ⏳ Pending | N/A | ✅ Ready | ⏳ Planned | ⏳ Phase 5 |
| **Backend API** | 🟡 70% | ⏳ Pending | ⏳ Pending | ✅ Ready | ⏳ Planned | ⏳ Phase 5 |
| **Event Indexer** | ✅ 80% | ⏳ Pending | N/A | ✅ Ready | ⏳ Planned | ⏳ Phase 5 |
| **Vote Aggregator** | ✅ 85% | ⏳ Pending | N/A | ✅ Ready | ⏳ Planned | ⏳ Phase 5 |
| **Market Monitor** | 🟡 60% | ⏳ Pending | N/A | ⏳ Planned | ⏳ Planned | ⏳ Phase 5 |
| **WebSocket Server** | 🟡 50% | ⏳ Pending | ⏳ Pending | N/A | ⏳ Planned | ⏳ Phase 5 |
| **Frontend** | ❌ 0% | N/A | ⏳ Pending | N/A | ⏳ Planned | ⏳ Phase 5 |
| **Integration Points** | N/A | ⏳ Pending | ⏳ Pending | ✅ Ready | ⏳ Planned | ⏳ Phase 5 |

**Gap Analysis:**
- 🚨 **Critical Gap:** Integration tests not executed (Phase 3 blocker)
- ⚠️ **Important Gap:** E2E tests not run (Phase 4 prerequisite)
- ⏳ **Future Gap:** Performance tests planned but not run
- ⏳ **Future Gap:** Security tests awaiting Phase 5

---

## 🎯 PHASE 3 TESTING ROADMAP

### Week 1: Core Integration Testing (10-20 hours)

**Day 1: On-Chain Validation** (3-4 hours)
```bash
# Run automated voting test
npx ts-node backend/scripts/on-chain-test-voting-system.ts

# Review generated documentation
cat docs/on-chain-testing/03-TEST-RESULTS/$(ls -t docs/on-chain-testing/03-TEST-RESULTS/ | head -1)/TEST-*.json | jq

# Document any issues
# Expected: Clean test run, full documentation generated
```

**Day 2: Integration Test Suite** (4-6 hours)
```bash
# Create test wallets (one-time)
npm run test:setup-wallets

# Run complete integration suite
npm run test:integration

# Expected: >90% pass rate, identify failures
```

**Day 3: Multi-User Scenarios** (2-3 hours)
```bash
# Run multi-user trading test
npm test tests/integration/02-multi-user-trading.test.ts

# Run concurrent vote aggregation test
npm test tests/integration/03-voting-workflow.test.ts

# Expected: No race conditions, data consistency maintained
```

**Day 4: Edge Cases & Performance** (3-5 hours)
```bash
# Edge case testing
npm test tests/integration/07-edge-cases.test.ts

# Performance benchmarks
npm test tests/integration/08-performance.test.ts

# Expected: Edge cases handled gracefully, >5 tx/sec throughput
```

**Day 5: Bug Fixes & Validation** (2-4 hours)
- Fix critical bugs (P0/P1)
- Re-run failed tests
- Update ERROR_CATALOG.md
- Verify all quality gates met

**Success Criteria:**
- ✅ >90% integration test pass rate
- ✅ All critical bugs fixed
- ✅ Data consistency validated
- ✅ Performance benchmarks met (>5 tx/sec, <200ms API)
- ✅ Zero P0/P1 bugs remaining

---

## 🔍 TEST DATA MANAGEMENT

### Test Wallets

**Location:** Multiple locations (consolidated in [RESOURCE_WALLETS.md](../resources/RESOURCE_WALLETS.md))

**Main Wallets:**
1. `~/.config/solana/backend-authority.json` (5 SOL)
2. `~/.config/solana/zmart-test-wallet.json` (10 SOL)
3. `~/.config/solana/id.json` (Default CLI wallet)

**Integration Test Wallets:**
- Location: `backend/tests/fixtures/wallets/`
- Setup: `npm run test:setup-wallets`
- Wallets: 11 (1 admin + 10 users)
- Funding: Automated via airdrop

**Check Balances:**
```bash
# Main wallets
solana balance ~/.config/solana/backend-authority.json --url devnet
solana balance ~/.config/solana/zmart-test-wallet.json --url devnet

# Test wallet balances
for wallet in backend/tests/fixtures/wallets/*.json; do
  echo "$wallet: $(solana balance $wallet --url devnet) SOL"
done
```

### Test Data Fixtures

**Location:** `backend/tests/fixtures/`

**Files:**
- `markets.json` - Test market scenarios (3 markets)
- `users.json` - Test user profiles (11 users)
- `trade-scenarios.json` - Trading test cases (6 scenarios)

**Usage:**
```typescript
import markets from '../fixtures/markets.json';
import users from '../fixtures/users.json';
import tradeScenarios from '../fixtures/trade-scenarios.json';
```

### Test Data Cleanup

```bash
# Clean up all test data from database
npm run test:cleanup

# Clean up specific test run
npx ts-node tests/setup/cleanup-test-data.ts --run-id [timestamp]
```

**Full Guide:** [TESTING_DATA_MANAGEMENT.md](./TESTING_DATA_MANAGEMENT.md)

---

## 📈 TEST RESULT TRACKING

### Historical Test Results

**Location:** `docs/on-chain-testing/03-TEST-RESULTS/`

**Structure:**
```
03-TEST-RESULTS/
├── 2025-11-08/
│   ├── TEST-voting-system-2025-11-08-12-30-45.json
│   ├── TEST-api-lifecycle-2025-11-08-14-15-30.json
│   └── ...
├── 2025-11-07/
│   └── ...
└── ...
```

**View Latest Results:**
```bash
# List recent test runs
ls -lt docs/on-chain-testing/03-TEST-RESULTS/*/*.json | head -10

# View specific result
cat docs/on-chain-testing/03-TEST-RESULTS/2025-11-08/TEST-voting-system-*.json | jq

# Analyze test results
npx ts-node backend/scripts/check-test-results.ts
```

### Test Metrics Tracking

**Track Over Time:**
- Test pass rate (target: >95%)
- Test execution time (track regression)
- Coverage percentage (target: 90%+)
- Defect detection rate
- Mean time to resolution (MTTR)

**Full Tracking:** [TESTING_RESULTS_TRACKER.md](./TESTING_RESULTS_TRACKER.md)

---

## 🚨 TROUBLESHOOTING TESTS

### Common Test Issues

**Test Failing: "Account not initialized"**
- Cause: Program account not set up
- Solution: Run `npx ts-node backend/scripts/initialize-program.ts`
- Reference: [ERROR_CATALOG.md](../troubleshooting/ERROR_CATALOG.md#account-not-initialized)

**Test Failing: "Insufficient balance"**
- Cause: Test wallet underfunded
- Solution: Airdrop SOL: `solana airdrop 2 [wallet] --url devnet`
- Reference: [TROUBLESHOOTING_TESTING.md](../troubleshooting/TROUBLESHOOTING_TESTING.md)

**Test Timeout**
- Cause: Network latency or compute limits
- Solution: Increase timeout in jest.config.js (currently 5 min)
- Adjust: `testTimeout: 600000` (10 min)

**Database Connection Failed**
- Cause: Supabase credentials incorrect or RLS policies blocking
- Solution: Check `.env` file, verify `SUPABASE_SERVICE_ROLE_KEY`
- Test: `npm run test:db`

**Full Troubleshooting:** [TROUBLESHOOTING_TESTING.md](../troubleshooting/TROUBLESHOOTING_TESTING.md)

---

## 🤖 TEST AUTOMATION

### Continuous Integration (CI)

**GitHub Actions:** `.github/workflows/ci.yml`

**Automated Testing:**
- On PR: Run unit tests + linting
- On main: Run full test suite
- Nightly: Run integration + performance tests

**CI Configuration:**
```yaml
test:
  runs-on: ubuntu-latest
  steps:
    - Run unit tests
    - Run integration tests (if on main)
    - Upload coverage reports
    - Fail if coverage <80%
```

**Full Automation:** [TESTING_AUTOMATION_MAP.md](./TESTING_AUTOMATION_MAP.md)

### Local Automation

**Pre-Commit Hooks:**
```bash
# Run before every commit
- npm run lint
- npm test (unit tests only)
- anchor test --skip-deploy
```

**Scheduled Tests:**
```bash
# Daily integration tests (cron)
0 2 * * * cd /path/to/project && npm run test:integration

# Weekly performance tests
0 3 * * 0 cd /path/to/project && npm run test:performance
```

---

## 📚 TESTING REFERENCE LIBRARY

### By Test Type

1. [TESTING_UNIT.md](./TESTING_UNIT.md) - Unit testing guide
2. [TESTING_INTEGRATION.md](./TESTING_INTEGRATION.md) - Integration testing guide ⭐
3. [TESTING_E2E.md](./TESTING_E2E.md) - End-to-end testing guide
4. [TESTING_ON_CHAIN.md](./TESTING_ON_CHAIN.md) - On-chain testing guide ⭐
5. [TESTING_PERFORMANCE.md](./TESTING_PERFORMANCE.md) - Performance testing guide
6. [TESTING_SECURITY.md](./TESTING_SECURITY.md) - Security testing guide

### By Component

7. [TESTING_PROGRAMS.md](./TESTING_PROGRAMS.md) - Program testing
8. [TESTING_BACKEND.md](./TESTING_BACKEND.md) - Backend service testing
9. [TESTING_FRONTEND.md](./TESTING_FRONTEND.md) - Frontend testing

### Supporting Documents

10. [TESTING_DATA_MANAGEMENT.md](./TESTING_DATA_MANAGEMENT.md) - Test data handling
11. [TESTING_RESULTS_TRACKER.md](./TESTING_RESULTS_TRACKER.md) - Results tracking
12. [TESTING_AUTOMATION_MAP.md](./TESTING_AUTOMATION_MAP.md) - Automation coverage
13. [TESTING_MATRIX.md](./TESTING_MATRIX.md) - Coverage matrix

---

## 🎯 NEXT STEPS

### If you want to start Phase 3 integration testing:
→ Start with [TESTING_ON_CHAIN.md](./TESTING_ON_CHAIN.md) and run the automated voting test

### If you need to write new tests:
→ Check [TESTING_INTEGRATION.md](./TESTING_INTEGRATION.md) for integration test patterns

### If tests are failing:
→ Review [TROUBLESHOOTING_TESTING.md](../troubleshooting/TROUBLESHOOTING_TESTING.md)

### If you need test data:
→ See [TESTING_DATA_MANAGEMENT.md](./TESTING_DATA_MANAGEMENT.md)

---

## 🔗 RELATED RESOURCES

**Validation:**
- [VALIDATION_MASTER.md](../validation/VALIDATION_MASTER.md)
- [VALIDATION_PROGRAMS.md](../validation/VALIDATION_PROGRAMS.md)
- [PATH_TO_VALIDATION.md](../paths/PATH_TO_VALIDATION.md)

**Workflows:**
- [WORKFLOW_TESTING.md](../workflows/WORKFLOW_TESTING.md)
- [WORKFLOW_DEBUGGING.md](../workflows/WORKFLOW_DEBUGGING.md)

**Troubleshooting:**
- [TROUBLESHOOTING_MASTER.md](../troubleshooting/TROUBLESHOOTING_MASTER.md)
- [ERROR_CATALOG.md](../troubleshooting/ERROR_CATALOG.md)

**Progress:**
- [STATE_TESTING.md](../state/STATE_TESTING.md)
- [PROGRESS_MASTER.md](../progress/PROGRESS_MASTER.md)

---

**Maintained By:** QA Team & Development Team
**Review Frequency:** Weekly
**Next Review:** 2025-11-15 (after Phase 3 execution)
