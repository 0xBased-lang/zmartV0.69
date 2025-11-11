# Integration Testing Guide - ZMART V0.69

**Purpose:** Complete integration testing with real wallets on Solana devnet before production deployment.

**Last Updated:** November 11, 2025

---

## 📋 Overview

This guide covers comprehensive integration testing of the entire ZMART platform:
- Frontend → Backend → Solana Program → Database
- Real wallet connections (Phantom, Solflare, Backpack)
- Real transactions on Solana devnet
- Real-time WebSocket updates
- End-to-end user flows

---

## 🎯 Test Coverage

### Core User Flows (Must Pass)

1. **Market Discovery Flow**
   - Browse markets on listing page
   - Filter by state (ACTIVE, FINALIZED, etc.)
   - Sort by newest/volume/ending
   - View market details

2. **Trading Flow**
   - Connect wallet (Phantom/Solflare/Backpack)
   - View market prices (LMSR calculation)
   - Buy YES/NO shares
   - Sell shares
   - View updated position
   - Check transaction on Solscan

3. **Market Creation Flow**
   - Connect wallet
   - Fill market creation form
   - Submit transaction
   - Verify market appears on-chain
   - View new market in listing

4. **Portfolio Flow**
   - View all active positions
   - Check P&L calculations
   - Track total invested vs. current value
   - View ROI percentages

5. **Claim Winnings Flow** (Future - when markets finalize)
   - Wait for market to finalize
   - Check if user has winning shares
   - Click claim button
   - Sign transaction
   - Verify payout received

---

## 🔧 Prerequisites

### 1. Test Wallets Setup

**Create 3 Test Wallets:**
```bash
# Wallet 1: Market Creator
solana-keygen new -o ~/.config/solana/test-wallet-1.json

# Wallet 2: Trader A
solana-keygen new -o ~/.config/solana/test-wallet-2.json

# Wallet 3: Trader B
solana-keygen new -o ~/.config/solana/test-wallet-3.json
```

**Fund Test Wallets:**
```bash
# Get devnet SOL for each wallet
solana airdrop 5 $(solana-keygen pubkey ~/.config/solana/test-wallet-1.json) --url devnet
solana airdrop 5 $(solana-keygen pubkey ~/.config/solana/test-wallet-2.json) --url devnet
solana airdrop 5 $(solana-keygen pubkey ~/.config/solana/test-wallet-3.json) --url devnet
```

**Import to Browser Wallet:**
1. Install Phantom/Solflare extension
2. Import private keys from test wallet JSON files
3. Switch network to Devnet
4. Verify balances show up

### 2. Backend Services Running

**VPS Services (Must be running):**
```bash
ssh kek
pm2 list

# Should show 4 services running:
# - api-gateway
# - websocket-server
# - event-indexer
# - market-monitor
```

**Local Frontend:**
```bash
cd frontend
pnpm dev  # Runs on localhost:3004
```

### 3. Environment Configuration

**Frontend `.env.local`:**
```bash
# Point to VPS backend
NEXT_PUBLIC_API_URL=http://185.202.236.71:4000
NEXT_PUBLIC_WS_URL=ws://185.202.236.71:4001

# Solana devnet
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_SOLANA_NETWORK=devnet

# Program ID (devnet)
NEXT_PUBLIC_PROGRAM_ID=7h3gXfBfYFueFVLYyfL5Qo1QGsf4GQUfW96FKVgnUsJS
```

---

## 🧪 Test Execution Plan

### Phase 1: Smoke Tests (30 minutes)

**Goal:** Verify all services are reachable and basic functionality works.

**Tests:**
```bash
# 1. Backend health check
curl http://185.202.236.71:4000/health

# 2. WebSocket connectivity
# (Open browser DevTools → Network → WS tab)
# Should see connection to ws://185.202.236.71:4001

# 3. Database connectivity
curl http://185.202.236.71:4000/api/markets

# 4. Solana program reachable
solana program show 7h3gXfBfYFueFVLYyfL5Qo1QGsf4GQUfW96FKVgnUsJS --url devnet
```

**Success Criteria:**
- ✅ All API endpoints return 200
- ✅ WebSocket connects successfully
- ✅ Markets data loads from database
- ✅ Solana program is deployed and accessible

---

### Phase 2: Core Functionality Tests (1-2 hours)

#### Test 1: Market Discovery
**Wallet:** Any or none
**Steps:**
1. Open http://localhost:3004/markets
2. Verify markets load from backend
3. Test filters (ACTIVE, PROPOSED, FINALIZED)
4. Test sorting (Newest, Volume, Ending Soon)
5. Click on a market → verify detail page loads

**Success Criteria:**
- ✅ Market listing loads with correct data
- ✅ Filters work (state, category)
- ✅ Sorting changes order correctly
- ✅ Detail page shows full market info
- ✅ Prices display correctly

**Expected Issues:** None

---

#### Test 2: Wallet Connection
**Wallet:** Test Wallet 1
**Steps:**
1. Click "Connect Wallet" button
2. Select Phantom/Solflare from modal
3. Approve connection in wallet extension
4. Verify wallet address displays in header
5. Disconnect and reconnect

**Success Criteria:**
- ✅ Wallet connection modal appears
- ✅ Wallet connects successfully
- ✅ Address displays correctly
- ✅ Disconnect works
- ✅ Reconnect works

**Expected Issues:**
- ⚠️ First connection may require network switch to devnet
- ⚠️ May need to manually switch to devnet in wallet settings

---

#### Test 3: Buy Shares Transaction
**Wallet:** Test Wallet 1
**Steps:**
1. Navigate to active market detail page
2. Connect wallet (Test Wallet 1)
3. Select "YES" outcome
4. Select "BUY" action
5. Enter quantity: 10 shares
6. Review cost breakdown
7. Click "Execute Trade"
8. Approve transaction in wallet
9. Wait for confirmation
10. Verify success modal
11. Check transaction on Solscan devnet

**Success Criteria:**
- ✅ LMSR price calculates correctly
- ✅ Cost breakdown shows (shares × price + fees)
- ✅ Transaction builds successfully
- ✅ Wallet prompts for signature
- ✅ Transaction submits to blockchain
- ✅ Confirmation received (~10-30s)
- ✅ Success modal displays
- ✅ Position updates on page
- ✅ Transaction visible on Solscan

**Expected Issues:**
- ⚠️ May fail if insufficient SOL for transaction fees
- ⚠️ Network congestion can cause delays
- ⚠️ Price may change between calculation and execution (slippage)

**Debugging:**
```bash
# Check transaction details
solana confirm <SIGNATURE> --url devnet -v

# Check program logs
solana logs 7h3gXfBfYFueFVLYyfL5Qo1QGsf4GQUfW96FKVgnUsJS --url devnet
```

---

#### Test 4: Sell Shares Transaction
**Wallet:** Test Wallet 1 (must have shares from Test 3)
**Steps:**
1. On same market from Test 3
2. Verify "Current Position" shows shares owned
3. Select "YES" outcome
4. Select "SELL" action
5. Enter quantity: 5 shares (half of purchased)
6. Review proceeds breakdown
7. Click "Execute Trade"
8. Approve transaction
9. Verify success
10. Check position updated (5 shares remaining)

**Success Criteria:**
- ✅ Can only sell shares you own
- ✅ Proceeds calculate correctly
- ✅ Transaction completes
- ✅ Position updates (10 → 5 shares)
- ✅ P&L updates correctly

**Expected Issues:**
- ⚠️ Cannot sell more shares than owned
- ⚠️ Slippage protection may reject if price moved too much

---

#### Test 5: Market Creation
**Wallet:** Test Wallet 1
**Steps:**
1. Navigate to http://localhost:3004/markets/create
2. Connect wallet
3. Fill form:
   - Question: "Will Bitcoin reach $100K by December 31, 2025?"
   - Description: "Resolves YES if BTC price >= $100,000 USD on CoinGecko at midnight UTC on December 31, 2025. Otherwise resolves NO."
   - Category: Crypto
   - Expiry: 30 days from now
   - Initial Liquidity: 1 SOL
4. Click "Create Market"
5. Approve transaction
6. Wait for confirmation
7. Verify redirect to new market page
8. Check market appears in listing

**Success Criteria:**
- ✅ Form validation works (all fields required)
- ✅ Transaction builds with correct parameters
- ✅ Market created on-chain
- ✅ Redirect to new market detail page
- ✅ Market appears in listing page
- ✅ Market indexed by event-indexer
- ✅ Market stored in Supabase

**Expected Issues:**
- ⚠️ IPFS metadata upload may timeout (using placeholder for now)
- ⚠️ Initial liquidity locked in market (1 SOL)

**Verify On-Chain:**
```bash
# Get market account data
solana account <MARKET_PDA> --url devnet
```

---

#### Test 6: Portfolio View
**Wallet:** Test Wallet 1 (must have positions from Tests 3-4)
**Steps:**
1. Navigate to http://localhost:3004/portfolio
2. Verify portfolio statistics display:
   - Total Invested
   - Current Value
   - Total P&L
   - ROI %
3. Verify active positions list shows:
   - Market question
   - YES/NO shares
   - Invested amount
   - Current value
   - P&L per position
4. Click on position → redirects to market detail

**Success Criteria:**
- ✅ Portfolio stats calculate correctly
- ✅ All positions display
- ✅ P&L calculations accurate
- ✅ Click-through works

**Expected Issues:**
- ⚠️ P&L may be negative if price moved against position

---

#### Test 7: Real-Time Updates (WebSocket)
**Wallet:** Test Wallet 2 (different from Wallet 1)
**Steps:**
1. Open market detail page in Browser 1 (Wallet 1 connected)
2. Open SAME market in Browser 2 (Wallet 2 connected)
3. In Browser 2, execute a buy trade
4. Watch Browser 1 for real-time updates:
   - Price should update
   - Order book should update
   - Position should update (for Browser 2 only)
5. Verify trade notification appears in Browser 1

**Success Criteria:**
- ✅ WebSocket connects successfully
- ✅ Price updates in real-time (<5s delay)
- ✅ Trade notifications appear
- ✅ Multiple users can trade simultaneously
- ✅ No race conditions or conflicts

**Expected Issues:**
- ⚠️ WebSocket may disconnect if VPS restarts
- ⚠️ Updates may have 1-5 second delay
- ⚠️ Local frontend may not have WebSocket running

---

### Phase 3: Edge Cases & Error Handling (1 hour)

#### Test 8: Insufficient Funds
**Wallet:** Test Wallet 3 (with minimal SOL)
**Steps:**
1. Try to buy 100 shares (high cost)
2. Verify error message: "Insufficient funds"
3. Verify transaction doesn't submit

**Success Criteria:**
- ✅ User-friendly error message
- ✅ No failed transaction on-chain
- ✅ Can retry with lower amount

---

#### Test 9: User Rejects Transaction
**Wallet:** Any
**Steps:**
1. Initiate buy trade
2. Click "Reject" in wallet
3. Verify error message: "Transaction cancelled"
4. Verify can retry

**Success Criteria:**
- ✅ User-friendly cancellation message
- ✅ No failed transaction
- ✅ Can immediately retry

---

#### Test 10: Network Timeout
**Wallet:** Any
**Steps:**
1. Disconnect internet during transaction
2. Verify timeout error with retry option
3. Reconnect internet
4. Click retry
5. Verify transaction completes

**Success Criteria:**
- ✅ Network error detected
- ✅ Retry button works
- ✅ Transaction eventually succeeds

---

#### Test 11: Slippage Exceeded
**Wallet:** Any
**Steps:**
1. Set slippage tolerance to 0.1% (very low)
2. Execute large trade that will move price
3. Verify transaction fails with slippage error
4. Increase slippage to 1%
5. Retry and verify success

**Success Criteria:**
- ✅ Slippage protection works
- ✅ Error message explains issue
- ✅ User can adjust and retry

---

### Phase 4: Multi-User Scenarios (30 minutes)

#### Test 12: Concurrent Trading
**Wallets:** Test Wallet 1, 2, 3 simultaneously
**Steps:**
1. Open market in 3 browsers (one per wallet)
2. All 3 users buy shares simultaneously
3. Verify all transactions complete
4. Verify no double-spending
5. Verify prices update correctly for all users

**Success Criteria:**
- ✅ All transactions succeed
- ✅ No race conditions
- ✅ Prices calculate correctly
- ✅ Real-time updates work for all users

---

#### Test 13: Market State Transitions
**Wallet:** Market Creator (Test Wallet 1)
**Steps:**
1. Wait for created market to pass expiry time
2. Verify state changes: ACTIVE → RESOLVING
3. Submit votes (if implemented)
4. Verify state changes: RESOLVING → FINALIZED
5. Verify claim button appears

**Success Criteria:**
- ✅ State transitions happen automatically
- ✅ Market monitor detects and updates state
- ✅ UI reflects state changes
- ✅ Appropriate actions available per state

**Note:** This test requires waiting for market expiry or manually advancing time (not possible on devnet).

---

## 📊 Test Results Template

Use this template to record test results:

```markdown
## Integration Test Results - [DATE]

**Tester:** [NAME]
**Environment:** Devnet
**Frontend:** localhost:3004
**Backend:** VPS 185.202.236.71:4000

### Phase 1: Smoke Tests
- [ ] Backend health check - PASS/FAIL
- [ ] WebSocket connectivity - PASS/FAIL
- [ ] Database connectivity - PASS/FAIL
- [ ] Solana program reachable - PASS/FAIL

### Phase 2: Core Functionality
- [ ] Test 1: Market Discovery - PASS/FAIL
- [ ] Test 2: Wallet Connection - PASS/FAIL
- [ ] Test 3: Buy Shares - PASS/FAIL (TX: _________)
- [ ] Test 4: Sell Shares - PASS/FAIL (TX: _________)
- [ ] Test 5: Market Creation - PASS/FAIL (TX: _________)
- [ ] Test 6: Portfolio View - PASS/FAIL
- [ ] Test 7: Real-Time Updates - PASS/FAIL

### Phase 3: Edge Cases
- [ ] Test 8: Insufficient Funds - PASS/FAIL
- [ ] Test 9: User Rejects TX - PASS/FAIL
- [ ] Test 10: Network Timeout - PASS/FAIL
- [ ] Test 11: Slippage Exceeded - PASS/FAIL

### Phase 4: Multi-User
- [ ] Test 12: Concurrent Trading - PASS/FAIL
- [ ] Test 13: State Transitions - PASS/FAIL (or SKIPPED)

### Issues Found
1. [Issue description]
   - Severity: Critical/High/Medium/Low
   - Steps to reproduce:
   - Expected behavior:
   - Actual behavior:

2. [Additional issues...]

### Overall Result
- Tests Passed: __/13
- Tests Failed: __/13
- Pass Rate: __%
- Ready for Production: YES/NO
```

---

## 🚨 Common Issues & Solutions

### Issue: Wallet won't connect
**Solution:**
1. Check wallet extension is installed
2. Switch wallet to devnet network
3. Refresh page and try again

### Issue: Transaction fails with "Simulation failed"
**Solution:**
1. Check wallet has enough SOL (need ~0.01 SOL for fees)
2. Check market is in ACTIVE state
3. Try reducing trade size
4. Check slippage tolerance

### Issue: WebSocket disconnects
**Solution:**
1. Check VPS websocket-server is running: `ssh kek && pm2 list`
2. Restart if needed: `pm2 restart websocket-server`
3. Refresh frontend page

### Issue: Prices don't update
**Solution:**
1. Check market-monitor service is running
2. Check event-indexer is processing events
3. Verify WebSocket connection in DevTools

### Issue: Transaction stuck pending
**Solution:**
1. Wait 30-60 seconds (network may be congested)
2. Check transaction on Solscan
3. If truly stuck (>2 minutes), retry transaction

---

## 📈 Success Criteria

**Must Pass Before Production:**
- ✅ All smoke tests pass (100%)
- ✅ At least 11/13 integration tests pass (85%+)
- ✅ No critical or high-severity bugs
- ✅ All core user flows work end-to-end
- ✅ Real-time updates work reliably
- ✅ Multi-user concurrent trading works

**Nice to Have:**
- ✅ All 13 tests pass (100%)
- ✅ No medium-severity bugs
- ✅ Sub-5-second transaction confirmations
- ✅ Zero WebSocket disconnections

---

## 📝 Next Steps After Testing

1. **Document all findings** in test results template
2. **File bugs** for any issues found (GitHub Issues)
3. **Fix critical/high issues** before production
4. **Retest** after fixes applied
5. **Get approval** from stakeholders
6. **Proceed to Vercel deployment**

---

**Questions or Issues?**
- Check [docs/testing/ON_CHAIN_TESTING_PROTOCOL.md](./ON_CHAIN_TESTING_PROTOCOL.md)
- Review [docs/troubleshooting/COMMON_ISSUES.md](../troubleshooting/COMMON_ISSUES.md)
- SSH to VPS and check logs: `ssh kek && pm2 logs`

**Good luck with testing! 🚀**
