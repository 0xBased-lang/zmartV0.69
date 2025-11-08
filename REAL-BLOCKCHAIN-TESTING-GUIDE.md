# 🚀 Real Blockchain E2E Testing Guide

Complete guide for running automated tests with **REAL transactions** on Solana devnet.

---

## 📋 Overview

This test suite uses:
- ✅ **Real test wallet** with actual devnet SOL
- ✅ **Real transactions** on Solana devnet
- ✅ **Real on-chain state** verification
- ✅ **Real WebSocket connections**
- ✅ **Complete browser console log capture**

**Expected execution time:** 5-10 minutes for full suite
**Expected transaction time:** 10-20 seconds per transaction on devnet

---

## 🔧 Prerequisites

### 1. Solana CLI Installed

```bash
# Check if installed
solana --version

# If not installed
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
```

### 2. Devnet SOL in Test Wallet

**Required:** At least 0.1 SOL
**Recommended:** 10+ SOL for comprehensive testing

### 3. Playwright Installed

```bash
# Already installed in the project
pnpm list @playwright/test

# If needed
pnpm add -D @playwright/test
pnpm exec playwright install chromium
```

---

## ⚙️ Setup (One-Time)

### Step 1: Generate Test Wallet

Run the automated setup script:

```bash
./scripts/setup-test-wallet.sh
```

This will:
1. Generate a new test wallet
2. Save it to `~/.config/solana/zmart-test-wallet.json`
3. Create `.env.test` with wallet configuration
4. Attempt to airdrop 2 SOL from devnet faucet

**Output example:**
```
🔑 ZMART Test Wallet Setup
================================
✅ Solana CLI found
Generating new test wallet...
✅ Test wallet ready
📋 Public Key: 7xYz...ABC
💰 Checking devnet SOL balance...
Current balance: 2 SOL
✅ Created .env.test
🎉 Test Wallet Setup Complete!
```

### Step 2: Fund Test Wallet (if needed)

If airdrop failed due to rate limits:

```bash
# Get your test wallet public key
cat .env.test | grep TEST_WALLET_PUBLIC_KEY

# Manual airdrop (repeat 20 times for 100 SOL)
solana airdrop 5 YOUR_PUBLIC_KEY --url devnet

# Or visit the faucet
# https://faucet.solana.com
```

### Step 3: Verify Setup

```bash
# Check wallet balance
solana balance $(grep TEST_WALLET_PUBLIC_KEY .env.test | cut -d'=' -f2 | tr -d "'") --url devnet

# Should show: 10+ SOL (recommended)
```

### Step 4: Update Supabase Credentials (Optional)

If you want to test discussions integration:

```bash
# Edit .env.test
nano .env.test

# Update these lines:
NEXT_PUBLIC_SUPABASE_URL='https://your-project.supabase.co'
NEXT_PUBLIC_SUPABASE_ANON_KEY='your-anon-key'
```

---

## 🧪 Running Tests

### Quick Start (All Tests)

```bash
pnpm test:e2e:real
```

This runs the complete test suite:
- 8 trading flow tests
- 7 validation tests
- 8 real-time update tests

**Expected duration:** 5-10 minutes

---

### Run Specific Test Suites

#### 1. Trading Flow Tests Only

```bash
pnpm test:e2e:real:trading
```

**Tests:**
- Load market page with real data
- Connect wallet and display balance
- Execute real BUY transaction
- Execute real SELL transaction
- Display accurate P&L calculation
- Prevent insufficient balance transactions
- Real-time position/balance updates
- Capture console logs

**Duration:** 3-4 minutes

---

#### 2. Validation Tests Only

```bash
pnpm test:e2e:real:validation
```

**Tests:**
- Market state validation (ACTIVE check)
- Insufficient balance error messages
- Zero/negative amount validation
- Transaction rejection handling
- Slippage tolerance validation
- Clear error messaging
- Non-existent market handling

**Duration:** 1-2 minutes

---

#### 3. Real-Time Updates Tests Only

```bash
pnpm test:e2e:real:realtime
```

**Tests:**
- Market data refetch (10s interval)
- Position refetch (5s interval)
- Balance refetch (10s interval)
- Immediate query invalidation after transaction
- Concurrent refetch handling
- Navigation data consistency
- Window focus refetch
- Network interruption handling

**Duration:** 2-3 minutes

---

### Interactive UI Mode

Visual debugging with Playwright UI:

```bash
pnpm test:e2e:real:ui
```

**Features:**
- Visual test progress
- Step-through debugging
- Screenshot gallery
- Console log viewer
- Video playback

---

### Run Individual Test

```bash
# Run specific test by name
pnpm exec playwright test --project=real-blockchain-chromium -g "should execute real BUY transaction"

# Run with debug mode
DEBUG=pw:api pnpm test:e2e:real:trading
```

---

## 📊 Understanding Test Output

### Console Output Example

```
🚀 ZMART E2E Test Global Setup
═══════════════════════════════════════════════════
✅ Environment variables loaded
   Cluster: devnet
   RPC URL: https://api.devnet.solana.com
   Program ID: 7h3gXfBfYFueFVLYyfL5Qo1QGsf4GQUfW96FKVgnUsJS
   Test Market: HFaHHLFukTcA15khhvssYa7fTFmkzxTDsLih2LGVWCrM

💰 Checking test wallet balance...
   Public Key: 7xYzABC...
   Balance: 98.4523 SOL
✅ Sufficient balance for testing

🏪 Validating test market...
   Market ID: HFaHHLFukTcA15khhvssYa7fTFmkzxTDsLih2LGVWCrM
✅ Test market exists on-chain

═══════════════════════════════════════════════════
✅ Global setup complete - Ready to run tests!
═══════════════════════════════════════════════════

Running 8 tests using 1 worker

🚀 TEST: Execute real BUY transaction
🔌 Connecting test wallet...
   Wallet: 7xYzABC...
✅ Wallet connected successfully!
💰 Initial balance: 98.4523 SOL
📊 Initial YES shares: 0
🛒 Executing BUY trade: 10 YES shares
📝 Entered amount: 10
💵 Estimated cost: 5.23 SOL
✅ Clicked BUY button
⏳ Waiting for transaction: Buy 10 YES shares
   This may take 10-20 seconds on devnet...
   ⏱️  5s elapsed...
   ⏱️  10s elapsed...
   ⏱️  15s elapsed...
✅ Transaction confirmed in 17.3s
📝 Transaction signature: 3Kx7Y2fE9vH8pQmN1sT6uR4wA5bC2dG7hJ9iK0lL
🔍 View on Solscan: https://solscan.io/tx/3Kx7Y2fE9vH8pQmN1sT6uR4wA5bC2dG7hJ9iK0lL?cluster=devnet
💰 New balance: 93.2223 SOL
✅ Balance decreased by 5.2300 SOL
📊 New YES shares: 10.0000
✅ Shares increased by 10.0000
🎉 TEST PASSED: Real BUY transaction executed successfully!

  ✓ should execute real BUY transaction on devnet (23s)
```

### Browser Console Logs

All browser console messages are captured:

```
[BROWSER LOG  ] useMarketState: Fetching market state...
[BROWSER LOG  ] Market state loaded: ACTIVE
[BROWSER LOG  ] useUserPosition: Fetching position...
[BROWSER LOG  ] Building buy transaction...
[BROWSER LOG  ] Transaction built successfully
[BROWSER LOG  ] Requesting wallet signature...
[BROWSER LOG  ] Transaction signed
[BROWSER LOG  ] Submitting to devnet...
[BROWSER LOG  ] Transaction sent: 3Kx7Y2...
[BROWSER LOG  ] Confirming transaction...
[BROWSER LOG  ] Transaction confirmed!
[BROWSER LOG  ] React Query: Invalidating market queries
[BROWSER LOG  ] React Query: Invalidating position queries
[BROWSER LOG  ] useMarketState: Refetching...
[BROWSER LOG  ] useUserPosition: Refetching...
```

Logs are saved to: `test-results/console-logs/`

---

## 📸 Artifacts

### Screenshots

Automatically captured and saved to `test-screenshots/`:

- `market-page-loaded-{timestamp}.png`
- `wallet-connected-{timestamp}.png`
- `buy-transaction-complete-{timestamp}.png`
- `sell-transaction-complete-{timestamp}.png`
- `{test-name}-final-{timestamp}.png`

### Videos

Full test recordings saved to `test-videos/`:

- `test-{timestamp}.webm`

### HTML Report

```bash
# Generate and open HTML report
pnpm test:e2e:report
```

Shows:
- Test results summary
- Screenshots gallery
- Video recordings
- Console logs
- Trace viewer

---

## 🐛 Troubleshooting

### Issue: "TEST_WALLET_PRIVATE_KEY not set"

**Solution:**
```bash
# Run setup script
./scripts/setup-test-wallet.sh

# Or manually create .env.test from template
cp .env.test.example .env.test
# Then edit .env.test with your wallet info
```

---

### Issue: "Insufficient devnet SOL balance"

**Solution:**
```bash
# Check current balance
solana balance $(grep TEST_WALLET_PUBLIC_KEY .env.test | cut -d'=' -f2 | tr -d "'") --url devnet

# If balance < 0.1 SOL, fund wallet
solana airdrop 5 YOUR_PUBLIC_KEY --url devnet

# Or visit: https://faucet.solana.com
```

---

### Issue: "Test market account not found"

**Solution:**

The test market may have been closed or doesn't exist. Create a new one:

```bash
# Use the backend API to create a test market
cd backend
pnpm run create-test-market

# Or update TEST_MARKET_ID in .env.test with an active market
```

---

### Issue: "Transaction timeout"

**Possible causes:**
1. Devnet congestion (normal, will retry)
2. Insufficient balance
3. Market not in ACTIVE state
4. RPC issues

**Solution:**
```bash
# Check devnet status
solana cluster-version --url devnet

# Try different RPC (update .env.test)
SOLANA_RPC_URL='https://devnet.helius-rpc.com/?api-key=YOUR_KEY'

# Or wait a few minutes and retry
```

---

### Issue: "Wallet connection failed"

**Note:** The current tests assume you'll manually connect Phantom wallet in the browser. For fully automated testing, you would need:

1. Phantom extension automation (complex)
2. Or use direct Keypair signing (bypassing wallet UI)

**Workaround:**
- Tests will prompt you to connect wallet
- Have Phantom installed and unlocked
- Click "Connect" when prompted

---

### Issue: Tests are slow

**This is normal!** Real blockchain tests are inherently slower because:
- Each transaction takes 10-20 seconds on devnet
- Network latency varies
- Blockchain confirmations can't be rushed

**Optimization:**
- Use local validator for faster tests (different setup)
- Run specific test suites instead of all tests
- Use `--workers=1` (already configured)

---

## 📈 Success Metrics

### Expected Pass Rate

**Target:** 100% pass rate (all 23 tests)

**If tests fail:**
1. Check devnet status: `solana cluster-version --url devnet`
2. Verify wallet balance: >0.1 SOL
3. Check market exists and is ACTIVE
4. Review console logs in test output
5. Check screenshots in `test-screenshots/`

### Performance Benchmarks

| Test Suite | Expected Duration |
|------------|-------------------|
| Trading Flow | 3-4 minutes |
| Validation | 1-2 minutes |
| Real-Time Updates | 2-3 minutes |
| **Full Suite** | **5-10 minutes** |

### Coverage

**Critical Path:** 100% covered
- Wallet connection ✅
- Buy transactions ✅
- Sell transactions ✅
- Balance validation ✅
- State validation ✅
- P&L calculation ✅
- Real-time updates ✅
- Error handling ✅

---

## 🔒 Security

### Never Commit These Files

Already in `.gitignore`:
- `.env.test` - Contains private key!
- `~/.config/solana/zmart-test-wallet.json` - Private key!
- `test-screenshots/` - May contain sensitive info
- `test-videos/` - May contain wallet addresses

### Test Wallet Safety

- **Only use for devnet testing**
- Never send mainnet SOL to test wallet
- Keep private key secure
- Regenerate periodically

---

## 🚀 CI/CD Integration

### GitHub Actions Example

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - name: Install dependencies
        run: pnpm install
      - name: Install Playwright
        run: pnpm exec playwright install --with-deps chromium
      - name: Setup test wallet
        env:
          TEST_WALLET_PRIVATE_KEY: ${{ secrets.TEST_WALLET_PRIVATE_KEY }}
          TEST_WALLET_PUBLIC_KEY: ${{ secrets.TEST_WALLET_PUBLIC_KEY }}
        run: |
          echo "TEST_WALLET_PRIVATE_KEY='$TEST_WALLET_PRIVATE_KEY'" > .env.test
          echo "TEST_WALLET_PUBLIC_KEY='$TEST_WALLET_PUBLIC_KEY'" >> .env.test
          # ... add other env vars
      - name: Run E2E tests
        run: pnpm test:e2e:real
      - name: Upload artifacts
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
```

---

## 📚 Additional Resources

### Documentation

- [Playwright Documentation](https://playwright.dev)
- [Solana Web3.js](https://solana-labs.github.io/solana-web3.js/)
- [Anchor Framework](https://www.anchor-lang.com/)

### Test Files

- `tests/e2e/real-trading-flow.spec.ts` - Main trading tests
- `tests/e2e/real-validation-tests.spec.ts` - Validation tests
- `tests/e2e/real-time-updates.spec.ts` - Real-time tests
- `tests/e2e/helpers/wallet-setup.ts` - Helper functions
- `tests/e2e/global-setup.ts` - Global test setup

### Scripts

- `./scripts/setup-test-wallet.sh` - One-time wallet setup
- `pnpm test:e2e:real` - Run all real blockchain tests
- `pnpm test:e2e:real:ui` - Run with interactive UI

---

## ❓ FAQ

**Q: Can I run tests on mainnet?**
A: **NO!** These tests send real transactions. Only use devnet.

**Q: How much SOL do I need?**
A: Minimum 0.1 SOL, recommended 10+ SOL for full suite.

**Q: Why are tests so slow?**
A: Real blockchain transactions take 10-20 seconds to confirm.

**Q: Can I run tests in parallel?**
A: No, tests run sequentially to avoid blockchain state conflicts.

**Q: Do I need Phantom installed?**
A: Yes, for wallet connection. Tests simulate user connecting wallet.

**Q: What if my test fails?**
A: Check console logs, screenshots, and video recordings in test artifacts.

**Q: Can I debug a single test?**
A: Yes! Use `pnpm test:e2e:real:ui` for visual debugging.

**Q: Are my test transactions permanent?**
A: Yes, they're on devnet. But devnet can be reset by Solana Labs.

---

## 🎉 Success!

If all tests pass, you should see:

```
Running 23 tests using 1 worker
  ✓ real-trading-flow.spec.ts (8 tests) - 3m 45s
  ✓ real-validation-tests.spec.ts (7 tests) - 1m 23s
  ✓ real-time-updates.spec.ts (8 tests) - 2m 18s

23 passed (7m 26s)

To open last HTML report run:
  pnpm test:e2e:report
```

**Your frontend is production-ready for real trading! 🚀**

---

*Last updated: November 7, 2025*
*ZMART v0.69 - Real Blockchain Testing Guide*
