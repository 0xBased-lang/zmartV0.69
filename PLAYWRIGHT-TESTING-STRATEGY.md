# Playwright Testing Strategy - Complete Approach

**Date:** November 7, 2025
**Compliance:** Aligned with IMPLEMENTATION_PHASES.md Week 6-9
**Philosophy:** Progressive complexity, document everything, build learning database

---

## 🎯 Core Strategy: 4-Tier Testing Pyramid

```
         ┌─────────────────────────────────┐
         │  Tier 4: Manual Smoke Tests     │  Weekly, pre-deployment
         │  Real wallet + Real txns        │  30-60 min
         └─────────────────────────────────┘
                    ▲
         ┌─────────────────────────────────┐
         │  Tier 3: Transaction Tests      │  Manual, documented
         │  Real wallet in Brave           │  Week 8-9
         └─────────────────────────────────┘
                    ▲
         ┌─────────────────────────────────┐
         │  Tier 2: Wallet Integration     │  Semi-automated
         │  Mock wallet in Chromium        │  Week 7
         └─────────────────────────────────┐
                    ▲                       │
    ┌───────────────────────────────────────┐
    │  Tier 1: UI/RPC Tests (NO WALLET)     │  Fully automated
    │  Chromium headless                     │  Week 6 ← START HERE
    └───────────────────────────────────────┘
```

**Automation Coverage:**
- Tier 1: 100% automated (CI/CD)
- Tier 2: 80% automated (wallet mock)
- Tier 3: 0% automated (manual protocol)
- Tier 4: 0% automated (checklist-driven)

---

## 📋 Tier 1: UI & RPC Tests (Week 6 Day 6-7)

### Goal
Validate frontend renders correctly and communicates with Solana RPC **WITHOUT needing wallet**

### Browser Setup
**Chromium (Playwright built-in)** - Headless or headed mode

### Test Scope

#### 1.1 Page Load Tests
```typescript
// tests/e2e/tier1/01-page-load.spec.ts
test('Market page loads without 404', async ({ page }) => {
  await page.goto('/markets/HFaHHLFukTcA15khhvssYa7fTFmkzxTDsLih2LGVWCrM');
  await expect(page).not.toHaveURL(/404/);
});

test('Page renders within 3 seconds', async ({ page }) => {
  const startTime = Date.now();
  await page.goto('/markets/HFaHHLFukTcA15khhvssYa7fTFmkzxTDsLih2LGVWCrM');
  const loadTime = Date.now() - startTime;
  expect(loadTime).toBeLessThan(3000);
});
```

**Documentation Targets:**
- Page load time
- Network requests made
- Console errors
- Missing assets
- Layout issues

#### 1.2 Market Data Display Tests
```typescript
// tests/e2e/tier1/02-market-data.spec.ts
test('Market title renders', async ({ page }) => {
  await page.goto('/markets/HFaHHLFukTcA15khhvssYa7fTFmkzxTDsLih2LGVWCrM');

  // Wait for potential loading state
  await page.waitForTimeout(2000);

  const heading = page.locator('h1, h2').first();
  await expect(heading).toBeVisible();

  // Document what we found
  const headingText = await heading.textContent();
  console.log('[LEARNING] Market title:', headingText);
});

test('Current price displays', async ({ page }) => {
  await page.goto('/markets/HFaHHLFukTcA15khhvssYa7fTFmkzxTDsLih2LGVWCrM');

  // Look for price-related elements
  const priceElement = page.locator('[data-testid="current-price"]');
  // Document if missing
  const exists = await priceElement.count() > 0;
  console.log('[LEARNING] Price element exists:', exists);
});
```

**Documentation Targets:**
- Market data structure
- Element selectors that work/fail
- Data fetching patterns
- Loading states

#### 1.3 RPC Communication Tests
```typescript
// tests/e2e/tier1/03-rpc-calls.spec.ts
test('Frontend makes Solana RPC calls', async ({ page }) => {
  const rpcCalls: string[] = [];

  page.on('request', request => {
    if (request.url().includes('solana') || request.url().includes('rpc')) {
      rpcCalls.push(request.url());
      console.log('[RPC REQUEST]', request.url());
    }
  });

  page.on('response', response => {
    if (response.url().includes('solana') || response.url().includes('rpc')) {
      console.log('[RPC RESPONSE]', response.status(), response.url());
    }
  });

  await page.goto('/markets/HFaHHLFukTcA15khhvssYa7fTFmkzxTDsLih2LGVWCrM');
  await page.waitForTimeout(3000);

  expect(rpcCalls.length).toBeGreaterThan(0);

  // Document all RPC endpoints used
  console.log('[LEARNING] RPC endpoints:', rpcCalls);
});
```

**Documentation Targets:**
- RPC endpoints used
- Request/response patterns
- Error responses
- Rate limiting issues

#### 1.4 Form Validation Tests
```typescript
// tests/e2e/tier1/04-form-validation.spec.ts
test('Trading form elements render', async ({ page }) => {
  await page.goto('/markets/HFaHHLFukTcA15khhvssYa7fTFmkzxTDsLih2LGVWCrM');

  // Check for amount input
  const amountInput = page.locator('input[type="number"]');
  const hasInput = await amountInput.count() > 0;
  console.log('[LEARNING] Amount input found:', hasInput);

  if (hasInput) {
    await amountInput.fill('10');
    const value = await amountInput.inputValue();
    expect(value).toBe('10');
  }
});

test('Submit button exists but is disabled without wallet', async ({ page }) => {
  await page.goto('/markets/HFaHHLFukTcA15khhvssYa7fTFmkzxTDsLih2LGVWCrM');

  const submitButton = page.locator('button:has-text("Buy"), button:has-text("Trade")');
  const exists = await submitButton.count() > 0;
  console.log('[LEARNING] Submit button found:', exists);

  if (exists) {
    const isDisabled = await submitButton.first().isDisabled();
    console.log('[LEARNING] Submit button disabled:', isDisabled);
  }
});
```

**Documentation Targets:**
- Form structure
- Validation logic
- Error messages
- Submit button states

### Execution Plan

**Run Command:**
```bash
# Headless mode (fast, CI-friendly)
pnpm exec playwright test tests/e2e/tier1 --reporter=list

# Headed mode (watch browser)
pnpm exec playwright test tests/e2e/tier1 --headed --reporter=list

# Single test with debugging
pnpm exec playwright test tests/e2e/tier1/01-page-load.spec.ts --headed --debug
```

**Success Criteria:**
- ✅ All tests run without crashes
- ✅ Page loads successfully
- ✅ RPC calls detected
- ✅ Forms render correctly
- ✅ All issues documented in `E2E-TESTING-LEARNINGS.md`

**Time Budget:** 2-3 hours to write + document

---

## 🔗 Tier 2: Wallet Integration Tests (Week 7 Day 1-2)

### Goal
Test wallet connection UI and state management **WITHOUT real transactions**

### Browser Setup
**Chromium with mocked wallet provider**

### Approach: Mock Wallet Provider

```typescript
// tests/e2e/tier2/wallet-mock.ts
export class MockWallet {
  publicKey = new PublicKey('11111111111111111111111111111111');
  connected = false;

  async connect() {
    this.connected = true;
    return { publicKey: this.publicKey };
  }

  async disconnect() {
    this.connected = false;
  }
}

// Inject into page context
await page.addInitScript(() => {
  window.solana = new MockWallet();
});
```

### Test Scope

#### 2.1 Wallet Modal Tests
```typescript
test('Wallet modal opens when clicking connect', async ({ page }) => {
  await page.goto('/markets/...');

  const connectButton = page.locator('button:has-text("Connect")');
  await connectButton.click();

  const modal = page.locator('[role="dialog"]');
  await expect(modal).toBeVisible();
});
```

#### 2.2 Mock Connection Tests
```typescript
test('Wallet connects with mocked provider', async ({ page }) => {
  // Inject mock wallet
  await page.addInitScript(() => {
    window.solana = { /* mock */ };
  });

  await page.goto('/markets/...');
  // Test connection flow
});
```

**Documentation Targets:**
- Wallet provider detection
- Connection state management
- UI updates after connection
- Account display format

**Success Criteria:**
- ✅ Wallet modal opens/closes
- ✅ Mock wallet connects
- ✅ UI shows connected state
- ✅ Account address displays

**Time Budget:** 3-4 hours

---

## 💰 Tier 3: Transaction Tests (Week 8-9)

### Goal
Validate REAL transaction flow with REAL wallet and REAL devnet SOL

### Browser Setup
**Brave (your browser) OR Chromium with Phantom extension installed**

### Approach: Manual Testing with Full Documentation

**Why Manual?**
- Wallet extensions (Phantom, Solflare) cannot be automated
- Transaction approval requires human interaction
- Security feature of wallet providers
- Focus on documentation over automation

### Setup Requirements

#### A. Browser Choice: Brave vs Chromium

**Option A: Brave (RECOMMENDED for manual testing)**
- ✅ Your wallet already installed and configured
- ✅ Real user environment
- ✅ Faster setup
- ❌ Can't run automated scripts

**Option B: Chromium with Phantom Extension**
- ✅ Can use Playwright to navigate pages
- ✅ Consistent with Tier 1/2 tests
- ❌ Must install Phantom manually
- ❌ Must configure wallet manually
- ❌ Still can't automate wallet approvals

**RECOMMENDATION: Use Brave for manual testing, document with Playwright screenshots**

#### B. Wallet Setup Checklist

```markdown
### Pre-Test Setup

- [ ] Wallet has 5+ SOL on devnet
  - Get devnet SOL: `solana airdrop 5 <YOUR_ADDRESS> --url devnet`
- [ ] Program deployed to devnet (verify with `solana program show`)
- [ ] Market exists on-chain (verify with Solana Explorer)
- [ ] Frontend dev server running (`pnpm dev`)
- [ ] Screen recording software ready (QuickTime, OBS, etc.)
- [ ] `MANUAL-TESTING-LOG.md` ready to document
```

### Transaction Test Protocol

#### Test 3.1: Buy Shares Transaction

**File:** `MANUAL-TESTING-LOG.md` (to be created)

```markdown
## Test 3.1: Buy YES Shares

**Date:** [DATE]
**Tester:** [NAME]
**Wallet:** [PUBLIC_KEY]
**Market:** HFaHHLFukTcA15khhvssYa7fTFmkzxTDsLih2LGVWCrM

### Pre-Test State
- Devnet SOL balance: _____ SOL
- Current YES position: _____ shares
- Current market price (YES): _____
- Current market liquidity: _____

### Step-by-Step Execution

1. **Navigate to market page**
   - URL: http://localhost:3000/markets/HFaHHLFukTcA15khhvssYa7fTFmkzxTDsLih2LGVWCrM
   - Screenshot: `screenshots/buy-test-01-page-load.png`
   - Result: ✅ / ❌
   - Notes: _______________

2. **Connect wallet**
   - Click "Connect Wallet" button
   - Select Phantom/Solflare from modal
   - Approve connection
   - Screenshot: `screenshots/buy-test-02-wallet-connected.png`
   - Result: ✅ / ❌
   - Notes: _______________

3. **Enter buy amount**
   - Amount: 10 shares
   - Outcome: YES
   - Estimated cost: _____ SOL
   - Screenshot: `screenshots/buy-test-03-amount-entered.png`
   - Result: ✅ / ❌
   - Notes: _______________

4. **Review transaction details**
   - Cost breakdown visible: ✅ / ❌
   - Slippage warning: ✅ / ❌
   - Fee breakdown: ✅ / ❌
   - Screenshot: `screenshots/buy-test-04-review.png`

5. **Submit transaction**
   - Click "Buy" button
   - Wallet approval popup appears: ✅ / ❌
   - Transaction details in wallet: _______________
   - Screenshot: `screenshots/buy-test-05-wallet-approval.png`

6. **Approve transaction in wallet**
   - Click "Approve" in Phantom
   - Transaction hash: _______________
   - Screenshot: `screenshots/buy-test-06-approved.png`

7. **Wait for confirmation**
   - Loading state shown: ✅ / ❌
   - Time to confirm: _____ seconds
   - Success message: ✅ / ❌
   - Screenshot: `screenshots/buy-test-07-confirmed.png`

8. **Verify on-chain state**
   - Solana Explorer: https://explorer.solana.com/tx/[TX_HASH]?cluster=devnet
   - Transaction successful: ✅ / ❌
   - Screenshot: `screenshots/buy-test-08-explorer.png`

9. **Verify frontend updates**
   - Position updated: ✅ / ❌
   - Balance updated: ✅ / ❌
   - Market price changed: ✅ / ❌
   - Screenshot: `screenshots/buy-test-09-ui-updated.png`

### Post-Test State
- Devnet SOL balance: _____ SOL (change: _____)
- Current YES position: _____ shares (change: _____)
- Current market price (YES): _____ (change: _____)

### Issues Found
1. [Issue description]
   - Severity: Critical / High / Medium / Low
   - Steps to reproduce: _______________
   - Expected behavior: _______________
   - Actual behavior: _______________

### Test Result
- ✅ PASS: Transaction completed successfully
- ❌ FAIL: [Reason]

### Video Recording
- File: `recordings/buy-test-[DATE].mp4`
- Duration: _____ min
```

#### Test 3.2: Sell Shares Transaction
[Similar detailed protocol]

#### Test 3.3: Claim Winnings
[Similar detailed protocol]

### Execution Frequency

**During Development (Week 8-9):**
- Run after each major feature completion
- Document every issue found
- Create video for successful flows

**Post-Development:**
- Weekly smoke test before deployments
- Full regression test before mainnet

### Documentation Outputs

1. **MANUAL-TESTING-LOG.md** - Step-by-step results
2. **screenshots/** - Visual evidence
3. **recordings/** - Video walkthroughs
4. **TRANSACTION-ISSUES.md** - Issue tracker

**Time Budget:** 30-60 min per full test cycle

---

## 🚨 Tier 4: Pre-Deployment Smoke Tests

### Goal
Final validation before mainnet deployment

### Execution
**Manual checklist** - Critical paths only

### Checklist Template

```markdown
## Pre-Deployment Smoke Test

**Date:** _____
**Environment:** Devnet / Mainnet-Beta
**Tester:** _____
**Wallet:** _____

### Critical Path 1: New User Journey
- [ ] Homepage loads
- [ ] Market list displays
- [ ] Click market
- [ ] Connect wallet (fresh wallet)
- [ ] Buy shares (small amount)
- [ ] Position displays correctly
- [ ] Disconnect wallet

### Critical Path 2: Active Trader Journey
- [ ] Connect wallet (existing user)
- [ ] View positions
- [ ] Sell some shares
- [ ] Buy more shares
- [ ] Check transaction history

### Critical Path 3: Resolution Flow
- [ ] Navigate to resolved market
- [ ] Verify outcome shown
- [ ] Claim winnings
- [ ] Verify balance update

### Security Checks
- [ ] No exposed private keys in console
- [ ] HTTPS only
- [ ] No suspicious network requests
- [ ] Wallet disconnects properly

### Performance Checks
- [ ] Page load <3s
- [ ] Transaction confirms <30s
- [ ] No memory leaks (check DevTools)
- [ ] Mobile responsive

### PASS/FAIL: _____
```

**Frequency:** Before every mainnet deployment

---

## 📚 Documentation System

### Four Living Documents

#### 1. E2E-TESTING-LEARNINGS.md (CREATED ✅)
**Purpose:** Discovery log during Tier 1-2 development

**Updated:** During test development
**Sections:**
- Issues found
- Solutions implemented
- Patterns learned
- Metrics

#### 2. PLAYWRIGHT-TESTING-STRATEGY.md (THIS FILE)
**Purpose:** Complete testing approach and philosophy

**Updated:** When strategy evolves
**Sections:**
- Tier breakdown
- Test protocols
- Execution instructions
- Success criteria

#### 3. MANUAL-TESTING-LOG.md (TO CREATE)
**Purpose:** Transaction test results and evidence

**Updated:** After each manual test
**Sections:**
- Test execution logs
- Screenshots
- Video links
- Issue discoveries

#### 4. TESTING-ISSUE-TRACKER.md (TO CREATE)
**Purpose:** Central issue database

**Updated:** When issues found/fixed
**Sections:**
- Issue list with severity
- Root cause analysis
- Fix implementation
- Prevention strategies

### Issue Tracking Template

```markdown
## Issue #[NUMBER]: [Title]

**Discovered:** [Date] during [Tier X Test Y]
**Severity:** Critical / High / Medium / Low
**Status:** Open / In Progress / Fixed / Won't Fix

### Description
[What we found]

### Steps to Reproduce
1. [Step 1]
2. [Step 2]
3. [Result]

### Expected Behavior
[What should happen]

### Actual Behavior
[What actually happens]

### Root Cause
[Why it happens - fill after investigation]

### Solution Implemented
[How we fixed it - fill after fix]

### Prevention Strategy
[How to avoid in future]

### Evidence
- Screenshot: `screenshots/issue-[NUMBER].png`
- Console log: `logs/issue-[NUMBER].txt`
- Video: `recordings/issue-[NUMBER].mp4`

### Related Issues
- #[NUMBER] (similar pattern)
```

---

## 🎯 Recommended Execution Plan

### TODAY (Week 6 Day 6) - Foundation

**Step 1: Create Documentation Suite** (30 min)
```bash
# Already have E2E-TESTING-LEARNINGS.md ✅
# Need:
touch MANUAL-TESTING-LOG.md
touch TESTING-ISSUE-TRACKER.md
mkdir -p screenshots recordings logs
```

**Step 2: Write Tier 1 Tests** (2 hours)
```bash
mkdir -p tests/e2e/tier1
# Create 01-page-load.spec.ts
# Create 02-market-data.spec.ts
# Create 03-rpc-calls.spec.ts
# Create 04-form-validation.spec.ts
```

**Step 3: Run Tier 1 Tests & Document** (1 hour)
```bash
pnpm exec playwright test tests/e2e/tier1 --headed --reporter=list
# Document every issue in E2E-TESTING-LEARNINGS.md
# Update TESTING-ISSUE-TRACKER.md with findings
```

**Step 4: Manual Validation in Brave** (30 min)
```bash
# Open Brave
# Navigate to market page
# Connect Phantom wallet
# Document user experience
# Take screenshots
```

**Total Time:** 4 hours

### TOMORROW (Week 6 Day 7) - Wallet Testing

**Step 1: Write Tier 2 Tests** (3 hours)
- Mock wallet provider
- Connection flow tests
- UI state tests

**Step 2: Run Tier 2 Tests** (1 hour)
- Document wallet integration issues
- Verify connection flow

**Total Time:** 4 hours

### WEEK 7 (Days 1-2) - Transaction Protocol

**Step 1: Create Transaction Test Protocol** (2 hours)
- Write detailed manual test steps
- Create checklist templates
- Set up recording environment

**Step 2: First Manual Transaction Test** (1 hour)
- Execute buy shares flow
- Record video
- Document in MANUAL-TESTING-LOG.md

**Total Time:** 3 hours

---

## 🎯 Success Metrics

### Tier 1 (Week 6)
- ✅ 15+ automated tests
- ✅ 100% test execution success
- ✅ All UI issues documented
- ✅ <5 min total test run time

### Tier 2 (Week 7)
- ✅ Wallet connection tested
- ✅ Mock wallet provider working
- ✅ Connection flow validated
- ✅ UI state management verified

### Tier 3 (Week 8-9)
- ✅ Buy transaction completed
- ✅ Sell transaction completed
- ✅ Claim transaction completed
- ✅ All flows video recorded
- ✅ Complete manual test protocol

### Documentation Quality
- ✅ Every issue has screenshot
- ✅ Every issue has root cause
- ✅ Every issue has solution
- ✅ Prevention strategies documented

---

## 🚀 Why This Approach Works

### 1. Progressive Complexity
Start simple (page loads), build up to complex (real transactions)

### 2. Maximize Automation
Automate what's automatable (UI), manual test what requires it (wallet)

### 3. Documentation-First
Every test creates learning, every issue adds to knowledge base

### 4. Compliant with Project Methodology
- Week 6: UI testing (Tier 1)
- Week 7: Wallet testing (Tier 2)
- Week 8-9: Transaction testing (Tier 3)
- Aligns with IMPLEMENTATION_PHASES.md

### 5. Realistic About Wallet Limitations
Wallet extensions can't be automated - embrace manual testing with great documentation

### 6. Builds CI/CD Foundation
Tier 1 tests run on every commit, catch regressions early

### 7. Creates Learning Database
Issue tracker becomes project knowledge base, prevents repeated mistakes

---

## 📊 Testing Dashboard (To Track)

```markdown
## Testing Progress

### Tier 1: UI/RPC (Automated)
- Tests Written: 0 / 15
- Tests Passing: 0 / 15
- Issues Found: 0
- Coverage: 0%

### Tier 2: Wallet Integration (Semi-Automated)
- Tests Written: 0 / 8
- Tests Passing: 0 / 8
- Issues Found: 0
- Coverage: 0%

### Tier 3: Transactions (Manual)
- Protocols Created: 0 / 4
- Tests Executed: 0 / 12
- Videos Recorded: 0 / 4
- Issues Found: 0

### Documentation
- E2E-TESTING-LEARNINGS.md: ✅ Created
- PLAYWRIGHT-TESTING-STRATEGY.md: ✅ Created
- MANUAL-TESTING-LOG.md: ❌ Not created
- TESTING-ISSUE-TRACKER.md: ❌ Not created

### Issue Resolution
- Total Issues: 0
- Critical: 0
- High: 0
- Medium: 0
- Low: 0
- Fixed: 0
- Open: 0
```

---

**Next Action:** Create remaining documentation files, then start writing Tier 1 tests

**Estimated Time to Full Coverage:** 12-15 hours over 2 weeks (Week 6-7)

**Compliance:** 100% aligned with IMPLEMENTATION_PHASES.md
