# Testing Implementation Template

**Purpose**: Step-by-step guide for all testing types (Unit, Integration, E2E, Load, Security)
**Time**: Varies by test type (15 min - 4 hours)
**Usage**: Reference this template for ALL testing work
**Coverage Target**: 95%+ for programs, 80%+ for backend/frontend

---

## 📋 Test Type Selection

**Choose the appropriate section**:
- [Unit Tests](#unit-tests-anchor-programs) - Individual functions (15-30 min each)
- [Integration Tests](#integration-tests) - Cross-component workflows (60-120 min)
- [E2E Tests](#e2e-tests-playwright) - Full user flows (30-60 min each)
- [Load Tests](#load-tests) - Performance under load (2-4 hours)
- [Security Tests](#security-tests) - Vulnerability scanning (2-4 hours)

---

## 🧪 Unit Tests (Anchor Programs)

### Setup (One-time, 15 min)

**File**: `programs/zmart-core/tests/setup.ts`

```typescript
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { ZmartCore } from "../target/types/zmart_core";

export class TestHelper {
  program: Program<ZmartCore>;
  provider: anchor.AnchorProvider;

  constructor() {
    this.provider = anchor.AnchorProvider.env();
    anchor.setProvider(this.provider);
    this.program = anchor.workspace.ZmartCore as Program<ZmartCore>;
  }

  async airdrop(publicKey: anchor.web3.PublicKey, amount: number) {
    const sig = await this.provider.connection.requestAirdrop(
      publicKey,
      amount * anchor.web3.LAMPORTS_PER_SOL
    );
    await this.provider.connection.confirmTransaction(sig);
  }

  async createGlobalConfig() {
    const config = anchor.web3.Keypair.generate();
    // Initialize logic...
    return config.publicKey;
  }

  async createMarket() {
    const market = anchor.web3.Keypair.generate();
    // Create logic...
    return market.publicKey;
  }
}
```

---

### Writing Tests (20-30 min per test file)

**File**: `programs/zmart-core/tests/[instruction-name].ts`

```typescript
import * as anchor from "@coral-xyz/anchor";
import { expect } from "chai";
import { TestHelper } from "./setup";

describe("[instruction-name]", () => {
  const helper = new TestHelper();
  let globalConfig: anchor.web3.PublicKey;
  let market: anchor.web3.PublicKey;
  let user: anchor.web3.Keypair;

  before(async () => {
    // Setup test accounts
    globalConfig = await helper.createGlobalConfig();
    market = await helper.createMarket();

    user = anchor.web3.Keypair.generate();
    await helper.airdrop(user.publicKey, 10);
  });

  describe("Happy Path", () => {
    it("should execute successfully with valid inputs", async () => {
      // Arrange
      const amount = new anchor.BN(1_000_000_000); // 1 SOL

      // Get initial state
      const marketBefore = await helper.program.account.marketAccount.fetch(market);

      // Act
      const tx = await helper.program.methods
        .buyShares(true, amount, new anchor.BN(0))
        .accounts({
          market,
          user: user.publicKey,
          config: globalConfig,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([user])
        .rpc();

      // Assert
      const marketAfter = await helper.program.account.marketAccount.fetch(market);

      // Verify state changes
      expect(marketAfter.sharesYes.gt(marketBefore.sharesYes)).to.be.true;
      expect(marketAfter.currentLiquidity.gt(marketBefore.currentLiquidity)).to.be.true;

      // Verify fees collected
      expect(marketAfter.accumulatedProtocolFees.toNumber()).to.be.greaterThan(0);
      expect(marketAfter.accumulatedResolverFees.toNumber()).to.be.greaterThan(0);
      expect(marketAfter.accumulatedLpFees.toNumber()).to.be.greaterThan(0);

      // Verify trade count incremented
      expect(marketAfter.tradeCount).to.equal(marketBefore.tradeCount + 1);
    });
  });

  describe("Error Cases", () => {
    it("should reject amount below minimum", async () => {
      const tooSmall = new anchor.BN(1_000_000); // 0.001 SOL

      try {
        await helper.program.methods
          .buyShares(true, tooSmall, new anchor.BN(0))
          .accounts({ /* ... */ })
          .signers([user])
          .rpc();

        expect.fail("Expected error was not thrown");
      } catch (err: any) {
        expect(err.error.errorCode.code).to.equal("AmountBelowMinimum");
      }
    });

    it("should reject when market not active", async () => {
      // Test implementation...
    });

    it("should reject with invalid signer", async () => {
      // Test implementation...
    });
  });

  describe("Edge Cases", () => {
    it("should handle maximum amount correctly", async () => {
      const maxAmount = new anchor.BN(100_000_000_000); // 100 SOL
      // Test implementation...
    });

    it("should handle precision edge cases", async () => {
      // Test with amounts that test fixed-point boundaries
      // Test implementation...
    });
  });
});
```

**Checklist**:
```
□ 1-2 happy path tests
□ 3-5 error tests (one per error code)
□ 2-3 edge case tests
□ All assertions verify state changes
□ All assertions verify fees
□ Transaction signatures logged
□ Tests independent (can run in any order)
□ Tests pass consistently
```

**Run tests**:
```bash
# All tests
anchor test

# Specific file
anchor test --skip-build -- --grep "[instruction-name]"

# With coverage
anchor test --coverage
```

---

## 🔗 Integration Tests

### Purpose
Test cross-instruction workflows and program interactions.

### Setup (30 min)

**File**: `tests/integration/market-lifecycle.test.ts`

```typescript
import { TestHelper } from "../programs/zmart-core/tests/setup";
import { expect } from "chai";

describe("Full Market Lifecycle", () => {
  const helper = new TestHelper();

  it("should complete full lifecycle: create → trade → resolve → claim", async () => {
    // PHASE 1: Market Creation
    const creator = anchor.web3.Keypair.generate();
    await helper.airdrop(creator.publicKey, 100);

    const market = await helper.program.methods
      .proposeMarket(/* params */)
      .accounts({ creator: creator.publicKey, /* ... */ })
      .signers([creator])
      .rpc();

    let marketData = await helper.program.account.marketAccount.fetch(market);
    expect(marketData.state).to.equal(0); // PROPOSED

    // PHASE 2: Approval (simulate voting)
    await helper.program.methods
      .approveMarket(70, 30) // 70% approval
      .accounts({ market, /* ... */ })
      .rpc();

    marketData = await helper.program.account.marketAccount.fetch(market);
    expect(marketData.state).to.equal(1); // APPROVED

    // PHASE 3: Activation
    await helper.program.methods
      .activateMarket()
      .accounts({ market, creator: creator.publicKey, /* ... */ })
      .signers([creator])
      .rpc();

    marketData = await helper.program.account.marketAccount.fetch(market);
    expect(marketData.state).to.equal(2); // ACTIVE

    // PHASE 4: Trading
    const trader1 = anchor.web3.Keypair.generate();
    const trader2 = anchor.web3.Keypair.generate();
    await helper.airdrop(trader1.publicKey, 10);
    await helper.airdrop(trader2.publicKey, 10);

    // Trader 1 buys YES
    await helper.program.methods
      .buyShares(true, new anchor.BN(5_000_000_000), new anchor.BN(0))
      .accounts({ market, user: trader1.publicKey, /* ... */ })
      .signers([trader1])
      .rpc();

    // Trader 2 buys NO
    await helper.program.methods
      .buyShares(false, new anchor.BN(3_000_000_000), new anchor.BN(0))
      .accounts({ market, user: trader2.publicKey, /* ... */ })
      .signers([trader2])
      .rpc();

    marketData = await helper.program.account.marketAccount.fetch(market);
    expect(marketData.sharesYes.toNumber()).to.be.greaterThan(0);
    expect(marketData.sharesNo.toNumber()).to.be.greaterThan(0);

    // PHASE 5: Resolution
    const resolver = anchor.web3.Keypair.generate();
    await helper.airdrop(resolver.publicKey, 1);

    await helper.program.methods
      .resolveMarket(true, Buffer.from("ipfs-hash")) // YES wins
      .accounts({ market, resolver: resolver.publicKey, /* ... */ })
      .signers([resolver])
      .rpc();

    marketData = await helper.program.account.marketAccount.fetch(market);
    expect(marketData.state).to.equal(3); // RESOLVING

    // Wait dispute period (mock time or use smaller period for test)
    // ...

    // PHASE 6: Finalization
    await helper.program.methods
      .finalizeMarket(null, null) // No dispute
      .accounts({ market, /* ... */ })
      .rpc();

    marketData = await helper.program.account.marketAccount.fetch(market);
    expect(marketData.state).to.equal(5); // FINALIZED
    expect(marketData.finalOutcome).to.equal(true); // YES

    // PHASE 7: Claims
    const balanceBefore = await helper.provider.connection.getBalance(trader1.publicKey);

    await helper.program.methods
      .claimWinnings()
      .accounts({ market, user: trader1.publicKey, /* ... */ })
      .signers([trader1])
      .rpc();

    const balanceAfter = await helper.provider.connection.getBalance(trader1.publicKey);

    // Trader 1 (YES holder) should receive payout
    expect(balanceAfter).to.be.greaterThan(balanceBefore);

    // Trader 2 (NO holder) should receive nothing
    // (Test implementation...)
  });
});
```

**Checklist**:
```
□ Tests full workflow end-to-end
□ Verifies state at each step
□ Tests multiple user interactions
□ Tests fee distribution
□ Tests payout calculations
□ Runs in <2 minutes
□ Passes consistently
```

---

## 🎭 E2E Tests (Playwright)

### Setup (One-time, 20 min)

```bash
npm install -D @playwright/test
npx playwright install
```

**File**: `playwright.config.ts`

```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    { name: 'firefox', use: { browserName: 'firefox' } },
    { name: 'webkit', use: { browserName: 'webkit' } },
  ],
});
```

---

### Writing E2E Tests (30-60 min per test)

**File**: `tests/e2e/market-trading.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Market Trading Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to market page
    await page.goto('/markets/test-market-id');

    // Mock wallet connection (or use real devnet wallet)
    await page.evaluate(() => {
      window.solana = {
        isPhantom: true,
        publicKey: { toString: () => 'mock-wallet-address' },
        connect: async () => ({}),
        signTransaction: async (tx) => tx,
      };
    });

    // Connect wallet
    await page.click('button:has-text("Connect Wallet")');
  });

  test('should place YES bet successfully', async ({ page }) => {
    // Click YES button
    await page.click('button:has-text("YES")');

    // Enter amount
    await page.fill('input[type="number"]', '5');

    // Submit
    await page.click('button:has-text("Place Bet")');

    // Wait for success toast
    await expect(page.locator('.toast-success')).toBeVisible({ timeout: 10000 });

    // Verify transaction in history
    await page.goto('/portfolio');
    await expect(page.locator('text=test-market-id')).toBeVisible();
  });

  test('should show validation error for invalid amount', async ({ page }) => {
    await page.fill('input[type="number"]', '0.001');
    await page.click('button:has-text("Place Bet")');

    await expect(page.locator('text=Minimum 0.01 SOL')).toBeVisible();
  });

  test('should display correct price updates', async ({ page }) => {
    // Get initial price
    const initialPrice = await page.locator('[data-testid="yes-price"]').textContent();

    // Place bet
    await page.click('button:has-text("YES")');
    await page.fill('input[type="number"]', '10');
    await page.click('button:has-text("Place Bet")');

    // Wait for price update
    await page.waitForTimeout(2000);

    // Price should have changed
    const newPrice = await page.locator('[data-testid="yes-price"]').textContent();
    expect(newPrice).not.toBe(initialPrice);
  });

  test('should work on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    // All elements should be visible and usable
    await expect(page.locator('button:has-text("YES")')).toBeVisible();
    await expect(page.locator('button:has-text("NO")')).toBeVisible();
    await expect(page.locator('input[type="number"]')).toBeVisible();

    // Can complete flow on mobile
    await page.click('button:has-text("YES")');
    await page.fill('input[type="number"]', '1');
    await page.click('button:has-text("Place Bet")');

    await expect(page.locator('.toast-success')).toBeVisible({ timeout: 10000 });
  });
});
```

**Checklist**:
```
□ Test happy path user flow
□ Test validation errors
□ Test loading states
□ Test error recovery
□ Test responsive design
□ Test across browsers (Chrome, Firefox, Safari)
□ Test on mobile viewport
□ Screenshots on failure
□ Videos on failure
```

**Run tests**:
```bash
# All E2E tests
npx playwright test

# Specific test
npx playwright test market-trading

# Headed mode (see browser)
npx playwright test --headed

# Debug mode
npx playwright test --debug
```

---

## ⚡ Load Tests

### Purpose
Test system performance under load (1000+ concurrent users).

### Setup (30 min)

```bash
npm install -D k6
```

**File**: `tests/load/concurrent-trading.js`

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '2m', target: 100 },    // Ramp up to 100 users
    { duration: '5m', target: 100 },    // Stay at 100
    { duration: '2m', target: 500 },    // Ramp to 500
    { duration: '5m', target: 500 },    // Stay at 500
    { duration: '2m', target: 1000 },   // Ramp to 1000
    { duration: '5m', target: 1000 },   // Stay at 1000 (peak load)
    { duration: '3m', target: 0 },      // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],  // 95% of requests under 2s
    http_req_failed: ['rate<0.01'],     // Less than 1% errors
    errors: ['rate<0.05'],              // Less than 5% business logic errors
  },
};

export default function () {
  // 1. List markets
  const listRes = http.get('https://api.zmart.io/api/markets');
  check(listRes, {
    'list markets status 200': (r) => r.status === 200,
    'list markets response time OK': (r) => r.timings.duration < 500,
  }) || errorRate.add(1);

  sleep(1);

  // 2. Get specific market
  const marketId = 'test-market-123';
  const getRes = http.get(`https://api.zmart.io/api/markets/${marketId}`);
  check(getRes, {
    'get market status 200': (r) => r.status === 200,
    'market data present': (r) => JSON.parse(r.body).question !== undefined,
  }) || errorRate.add(1);

  sleep(1);

  // 3. Place bet (simulated)
  const betPayload = JSON.stringify({
    outcome: true,
    amount: 1,
  });

  const betRes = http.post(
    `https://api.zmart.io/api/markets/${marketId}/bet`,
    betPayload,
    { headers: { 'Content-Type': 'application/json' } }
  );

  check(betRes, {
    'place bet accepted': (r) => r.status === 200 || r.status === 202,
    'bet response time OK': (r) => r.timings.duration < 2000,
  }) || errorRate.add(1);

  sleep(2);
}
```

**Run test**:
```bash
k6 run tests/load/concurrent-trading.js

# With results upload
k6 run --out json=results.json tests/load/concurrent-trading.js
```

**Checklist**:
```
□ Ramps up gradually (no shock loading)
□ Tests peak load (1000+ users)
□ Tests API response times
□ Tests error rates
□ Tests database performance
□ Tests Solana RPC performance
□ All thresholds met
□ No crashes or hangs
□ Results documented
```

---

## 🔒 Security Tests

### Setup (20 min)

```bash
# Anchor audit
cargo install anchor-audit

# Cargo audit (vulnerability scanning)
cargo install cargo-audit
```

---

### Running Security Tests (2-4 hours)

#### 1. Anchor Audit (15 min)

```bash
cd programs/zmart-core
anchor audit
```

**Check for**:
- Missing account validation
- Missing signer checks
- Integer overflow/underflow
- Reentrancy vulnerabilities
- PDA derivation issues

---

#### 2. Cargo Audit (10 min)

```bash
cargo audit

# Fix vulnerabilities
cargo update
cargo audit --fix
```

---

#### 3. Manual Security Review (2-3 hours)

**Checklist**:

**Account Validation**:
```
□ All accounts have owner checks
□ All PDAs verified with correct seeds
□ All signers validated
□ No unchecked account data
□ has_one constraints used where needed
```

**Arithmetic Safety**:
```
□ All additions use checked_add
□ All subtractions use checked_sub
□ All multiplications use checked_mul
□ All divisions use checked_div
□ No unwrap() on arithmetic operations
```

**State Management**:
```
□ State transitions validated
□ State updates before external calls
□ No reentrancy vulnerabilities
□ Immutable fields enforced
```

**Access Control**:
```
□ Role-based access implemented
□ Creator permissions checked
□ Admin permissions checked
□ Resolver permissions checked
□ Backend authority secured
```

**Token Transfers**:
```
□ All transfers use invoke_signed for PDAs
□ Transfer amounts validated
□ No unchecked transfers
□ Slippage protection implemented
```

**Fee Distribution**:
```
□ Fee percentages sum to 100%
□ Fee calculations use checked math
□ Fee distribution tested
□ No fee manipulation possible
```

**Economic Attacks**:
```
□ LMSR bounded loss enforced
□ Max bet limits enforced
□ Min bet limits enforced
□ Front-running mitigated (slippage)
□ Flash loan attacks considered
```

---

#### 4. Penetration Testing (1-2 hours)

**Test scenarios**:

```typescript
// Test 1: Try to manipulate state
describe("Security: State Manipulation", () => {
  it("should reject direct state modification", async () => {
    // Try to call instruction with wrong state
    // Should fail with InvalidStateTransition
  });

  it("should reject unauthorized resolver", async () => {
    // Non-resolver tries to resolve market
    // Should fail with Unauthorized
  });
});

// Test 2: Try to steal funds
describe("Security: Fund Theft", () => {
  it("should reject claim from non-winner", async () => {
    // User with losing shares tries to claim
    // Should fail with NoWinningShares
  });

  it("should reject double-claim", async () => {
    // User claims once, tries again
    // Should fail with AlreadyClaimed
  });
});

// Test 3: Try integer overflow
describe("Security: Integer Overflow", () => {
  it("should reject amounts causing overflow", async () => {
    // Try to buy shares with u64::MAX
    // Should fail with OverflowError
  });
});

// Test 4: Try to bypass fees
describe("Security: Fee Bypass", () => {
  it("should always collect fees", async () => {
    // Place bet, verify fees collected
    // Verify fee distribution percentages
  });
});
```

---

## ✅ Overall Testing Checklist

**Before marking testing phase as COMPLETE**:

```
□ Unit tests: 95%+ coverage for programs
□ Unit tests: 80%+ coverage for backend
□ Unit tests: 80%+ coverage for frontend
□ Integration tests: All workflows tested
□ E2E tests: All user flows tested
□ E2E tests: Tested in 3+ browsers
□ E2E tests: Tested on mobile
□ Load tests: 1000+ concurrent users tested
□ Load tests: All thresholds met
□ Security audit: anchor audit passed
□ Security audit: cargo audit passed
□ Security audit: Manual review complete
□ Penetration tests: All attack vectors tested
□ All tests passing consistently
□ Test results documented
□ Known issues documented
```

---

## 📚 Related Templates

- [Anchor Instruction Template](./anchor-instruction-template.md)
- [Backend Service Template](./backend-service-template.md)
- [Frontend Component Template](./frontend-component-template.md)

---

**Last Updated**: November 5, 2025
**Version**: 1.0
**Status**: ✅ READY FOR USE

**Remember**: Tests are your safety net. Don't skip them! 🚀
