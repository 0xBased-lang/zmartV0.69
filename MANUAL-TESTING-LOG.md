# Manual Testing Log - Transaction Validation

**Purpose:** Document all manual transaction tests with step-by-step results
**Updated:** After each manual test execution
**Related:** PLAYWRIGHT-TESTING-STRATEGY.md (protocols), TESTING-ISSUE-TRACKER.md (issues)

---

## Test Environment Setup

### Wallet Configuration
- **Wallet Type:** Phantom / Solflare / Backpack
- **Public Key:** [To be filled during setup]
- **Network:** Devnet
- **Initial Balance:** [Check with `solana balance <address> --url devnet`]

### Program Configuration
- **Program ID:** 7h3gXfBfYFueFVLYyfL5Qo1QGsf4GQUfW96FKVgnUsJS
- **Test Market:** HFaHHLFukTcA15khhvssYa7fTFmkzxTDsLih2LGVWCrM
- **Network:** Devnet
- **RPC Endpoint:** https://api.devnet.solana.com

### Frontend Configuration
- **URL:** http://localhost:3000
- **Dev Server:** `pnpm dev` in frontend directory
- **Browser:** Brave (with Phantom) OR Chromium (with Phantom extension)

---

## Pre-Test Checklist

Before starting any transaction test, verify:

- [ ] Wallet has 5+ SOL on devnet
  - Command: `solana airdrop 5 <YOUR_ADDRESS> --url devnet`
  - Verify: `solana balance <YOUR_ADDRESS> --url devnet`

- [ ] Program deployed to devnet
  - Command: `solana program show 7h3gXfBfYFueFVLYyfL5Qo1QGsf4GQUfW96FKVgnUsJS --url devnet`
  - Expected: Program exists with correct deploy slot

- [ ] Market exists on-chain
  - Explorer: https://explorer.solana.com/address/HFaHHLFukTcA15khhvssYa7fTFmkzxTDsLih2LGVWCrM?cluster=devnet
  - Verify: Account exists with data

- [ ] Frontend dev server running
  - Command: `cd frontend && pnpm dev`
  - Verify: http://localhost:3000 loads

- [ ] Screen recording ready
  - Software: QuickTime / OBS / Browser extension
  - Output folder: `recordings/`

- [ ] Screenshots folder ready
  - Folder: `screenshots/`
  - Naming: `test-[NUMBER]-step-[STEP]-[DATE].png`

---

## Test Execution Log

### Test #1: Buy YES Shares

**Date:** _______________
**Tester:** _______________
**Wallet:** _______________
**Market:** HFaHHLFukTcA15khhvssYa7fTFmkzxTDsLih2LGVWCrM

#### Pre-Test State

```markdown
- Devnet SOL balance: _____ SOL
- YES shares owned: _____ shares
- NO shares owned: _____ shares
- Current YES price: _____ (probability)
- Current NO price: _____ (probability)
- Market liquidity parameter (b): _____
```

#### Step-by-Step Execution

**Step 1: Navigate to market page**
- URL: http://localhost:3000/markets/HFaHHLFukTcA15khhvssYa7fTFmkzxTDsLih2LGVWCrM
- Page loads: ✅ / ❌
- Time to load: _____ seconds
- Screenshot: `screenshots/test-001-step-01-page-load.png`
- Notes: _______________

**Step 2: Connect wallet**
- Click "Connect Wallet" button: ✅ / ❌
- Wallet modal opens: ✅ / ❌
- Select wallet (Phantom/Solflare): _______________
- Wallet approval popup: ✅ / ❌
- Connection successful: ✅ / ❌
- Wallet address displayed: ✅ / ❌
- Screenshot: `screenshots/test-001-step-02-wallet-connected.png`
- Notes: _______________

**Step 3: Enter trade details**
- Amount input field visible: ✅ / ❌
- Enter amount: **10 shares**
- Amount accepted: ✅ / ❌
- Select outcome: **YES**
- Outcome selected: ✅ / ❌
- Trade type: **BUY**
- Screenshot: `screenshots/test-001-step-03-trade-details.png`
- Notes: _______________

**Step 4: Review estimated cost**
- Estimated cost displayed: ✅ / ❌
- Estimated cost: _____ SOL
- Fee breakdown shown: ✅ / ❌
  - Protocol fee (3%): _____ SOL
  - Creator fee (2%): _____ SOL
  - Staker fee (5%): _____ SOL
  - Total fee (10%): _____ SOL
- Slippage warning: ✅ / ❌ / N/A
- Screenshot: `screenshots/test-001-step-04-cost-estimate.png`
- Notes: _______________

**Step 5: Submit transaction**
- Click "Buy" button: ✅ / ❌
- Button triggers transaction: ✅ / ❌
- Loading state shown: ✅ / ❌
- Screenshot: `screenshots/test-001-step-05-submit.png`
- Notes: _______________

**Step 6: Approve in wallet**
- Wallet approval popup appears: ✅ / ❌
- Transaction details shown in wallet: ✅ / ❌
- Transaction details correct: ✅ / ❌
- Click "Approve": ✅ / ❌
- Screenshot: `screenshots/test-001-step-06-wallet-approval.png`
- Notes: _______________

**Step 7: Wait for confirmation**
- Transaction submitted: ✅ / ❌
- Transaction hash: _______________
- Loading indicator: ✅ / ❌
- Time to confirm: _____ seconds
- Success message shown: ✅ / ❌
- Screenshot: `screenshots/test-001-step-07-confirmation.png`
- Notes: _______________

**Step 8: Verify on-chain state**
- Solana Explorer link: https://explorer.solana.com/tx/_______________?cluster=devnet
- Transaction status: ✅ Success / ❌ Failed
- Program instruction executed: ✅ / ❌
- Logs show correct instruction: ✅ / ❌
- Screenshot: `screenshots/test-001-step-08-explorer.png`
- Notes: _______________

**Step 9: Verify frontend updates**
- Position updated automatically: ✅ / ❌
- New YES shares: _____ shares
- SOL balance updated: ✅ / ❌
- New SOL balance: _____ SOL
- Market price updated: ✅ / ❌
- New YES price: _____ (probability)
- Screenshot: `screenshots/test-001-step-09-frontend-update.png`
- Notes: _______________

#### Post-Test State

```markdown
- Devnet SOL balance: _____ SOL (change: _____ SOL)
- YES shares owned: _____ shares (change: +_____ shares)
- NO shares owned: _____ shares (no change expected)
- Current YES price: _____ (change: _____)
- Current NO price: _____ (change: _____)
```

#### Cost Analysis

```markdown
- Shares purchased: 10 YES
- Cost before fees: _____ SOL
- Total fees (10%): _____ SOL
- Total cost: _____ SOL
- Effective price per share: _____ SOL

Fee breakdown:
- Protocol (3%): _____ SOL
- Creator (2%): _____ SOL
- Stakers (5%): _____ SOL
```

#### Issues Encountered

**Issue #1:** [Description]
- Severity: Critical / High / Medium / Low
- Screenshot: `screenshots/test-001-issue-01.png`
- Logged in: TESTING-ISSUE-TRACKER.md #[NUMBER]

**Issue #2:** [Description]
[Add more as needed]

#### Test Result

- ✅ **PASS** - Transaction completed successfully
- ❌ **FAIL** - [Reason]: _______________

#### Video Recording

- File: `recordings/test-001-buy-yes-shares-[DATE].mp4`
- Duration: _____ minutes
- Quality: Good / Fair / Poor
- Notes: _______________

---

### Test #2: Sell YES Shares

**Date:** _______________
**Tester:** _______________
**Wallet:** _______________
**Market:** HFaHHLFukTcA15khhvssYa7fTFmkzxTDsLih2LGVWCrM

#### Pre-Test State

```markdown
- Devnet SOL balance: _____ SOL
- YES shares owned: _____ shares (must have shares from previous test)
- NO shares owned: _____ shares
- Current YES price: _____ (probability)
- Current NO price: _____ (probability)
```

#### Step-by-Step Execution

[Follow same structure as Test #1, but with SELL action]

**Step 1: Navigate to market page**
[...]

**Step 2: Connect wallet**
[...]

**Step 3: Enter trade details**
- Amount: **5 shares** (selling half of what we bought)
- Outcome: **YES**
- Trade type: **SELL**
[...]

[Continue with remaining steps...]

#### Post-Test State

```markdown
- Devnet SOL balance: _____ SOL (should increase)
- YES shares owned: _____ shares (should decrease by 5)
- Current YES price: _____ (should decrease slightly)
```

#### Proceeds Analysis

```markdown
- Shares sold: 5 YES
- Proceeds before fees: _____ SOL
- Total fees (10%): _____ SOL
- Net proceeds: _____ SOL
- Effective price per share: _____ SOL

Fee breakdown:
- Protocol (3%): _____ SOL
- Creator (2%): _____ SOL
- Stakers (5%): _____ SOL
```

#### Test Result

- ✅ **PASS** - Transaction completed successfully
- ❌ **FAIL** - [Reason]: _______________

#### Video Recording

- File: `recordings/test-002-sell-yes-shares-[DATE].mp4`
- Duration: _____ minutes

---

### Test #3: Buy NO Shares

**Date:** _______________
**Tester:** _______________
**Wallet:** _______________
**Market:** HFaHHLFukTcA15khhvssYa7fTFmkzxTDsLih2LGVWCrM

#### Pre-Test State

```markdown
- Devnet SOL balance: _____ SOL
- YES shares owned: _____ shares
- NO shares owned: _____ shares (should be 0 before this test)
- Current YES price: _____ (probability)
- Current NO price: _____ (probability)
```

#### Step-by-Step Execution

**Step 3: Enter trade details**
- Amount: **10 shares**
- Outcome: **NO** (opposite of first test)
- Trade type: **BUY**
[...]

[Continue with remaining steps...]

#### Post-Test State

```markdown
- NO shares owned: _____ shares (should be 10)
- Current NO price: _____ (should increase)
- Current YES price: _____ (should decrease - complementary)
```

#### Test Result

- ✅ **PASS**
- ❌ **FAIL** - [Reason]: _______________

---

### Test #4: Claim Winnings (Resolved Market)

**Note:** This test requires a market that has been resolved. May need to wait for resolution or use a different market.

**Date:** _______________
**Tester:** _______________
**Wallet:** _______________
**Market:** _______________

#### Pre-Test State

```markdown
- Market status: **FINALIZED**
- Winning outcome: **YES** / **NO**
- Shares owned (winning): _____ shares
- Shares owned (losing): _____ shares
- Devnet SOL balance: _____ SOL
- Claim available: _____ SOL
```

#### Step-by-Step Execution

**Step 1: Navigate to resolved market**
- Market shows "Resolved" status: ✅ / ❌
- Winning outcome displayed: ✅ / ❌
- Claim button visible: ✅ / ❌
[...]

**Step 2: Click claim**
- Click "Claim Winnings" button: ✅ / ❌
- Claim amount shown: _____ SOL
[...]

[Continue with remaining steps...]

#### Post-Test State

```markdown
- Devnet SOL balance: _____ SOL (should increase by claim amount)
- Shares owned (winning): 0 shares (should be burned)
- Claim available: 0 SOL
```

#### Payout Analysis

```markdown
- Winning shares: _____ shares
- Payout per share: 1.0 SOL (normalized)
- Total payout: _____ SOL
- Transaction fee: _____ SOL
- Net received: _____ SOL
```

#### Test Result

- ✅ **PASS**
- ❌ **FAIL** - [Reason]: _______________

---

## Summary Statistics

### Test Execution Summary

| Test # | Type | Outcome | Result | Duration | Issues Found |
|--------|------|---------|--------|----------|--------------|
| 1      | Buy YES | [OUTCOME] | ✅/❌ | [TIME] | [COUNT] |
| 2      | Sell YES | [OUTCOME] | ✅/❌ | [TIME] | [COUNT] |
| 3      | Buy NO | [OUTCOME] | ✅/❌ | [TIME] | [COUNT] |
| 4      | Claim | [OUTCOME] | ✅/❌ | [TIME] | [COUNT] |

**Total Tests:** _____ / 4
**Passing:** _____
**Failing:** _____
**Pass Rate:** _____%

### Issue Summary

**Total Issues Found:** _____
- Critical: _____
- High: _____
- Medium: _____
- Low: _____

**Most Common Issue Types:**
1. [Issue type] - [count] occurrences
2. [Issue type] - [count] occurrences
3. [Issue type] - [count] occurrences

### Performance Metrics

**Average Times:**
- Page load: _____ seconds
- Wallet connection: _____ seconds
- Transaction confirmation: _____ seconds
- UI update after transaction: _____ seconds
- Total flow time: _____ seconds

### Recommendations

**High Priority Fixes:**
1. [Issue requiring immediate attention]
2. [Issue requiring immediate attention]

**User Experience Improvements:**
1. [UX enhancement suggestion]
2. [UX enhancement suggestion]

**Performance Optimizations:**
1. [Performance improvement suggestion]
2. [Performance improvement suggestion]

---

## Weekly Smoke Test Checklist

**Date:** _______________
**Tester:** _______________
**Duration:** _____ minutes

### Quick Validation (Before Deployment)

- [ ] **Homepage loads** (<3s)
- [ ] **Market list displays** (shows at least 1 market)
- [ ] **Market page loads** (no 404)
- [ ] **Wallet connects** (Phantom/Solflare)
- [ ] **Buy transaction works** (small amount, confirm on-chain)
- [ ] **UI updates correctly** (position and balance)
- [ ] **No console errors** (check browser DevTools)
- [ ] **Mobile responsive** (test on phone or resize browser)

### Result

- ✅ **PASS** - All checks passed, safe to deploy
- ❌ **FAIL** - Issues found, do not deploy

**Issues Found:** [List critical issues]

**Next Steps:** [Actions to take]

---

**Last Updated:** [DATE]
**Total Manual Tests Executed:** 0
**Total Issues Documented:** 0
