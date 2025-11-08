# 🚀 End-to-End Testing Guide

**Date**: November 7, 2025
**Status**: Ready for testing
**Estimated Time**: 15-30 minutes

---

## Pre-Test Checklist ✅

- [x] Devnet SOL: 4.92 SOL (sufficient)
- [x] Program deployed: `7h3gXfBfYFueFVLYyfL5Qo1QGsf4GQUfW96FKVgnUsJS`
- [x] Global config initialized and validated (8/8 checks passed)
- [x] Test market available: `HFaHHLFukTcA15khhvssYa7fTFmkzxTDsLih2LGVWCrM`
- [x] Frontend .env configured with program ID
- [x] Transaction utilities production-ready (442 lines)

---

## Test Environment

**Network**: Solana Devnet
**RPC**: https://api.devnet.solana.com
**Program ID**: `7h3gXfBfYFueFVLYyfL5Qo1QGsf4GQUfW96FKVgnUsJS`
**Test Market**: `HFaHHLFukTcA15khhvssYa7fTFmkzxTDsLih2LGVWCrM`
**Wallet**: ~/.config/solana/id.json (4.92 SOL)

---

## Testing Sequence

### Part 1: Frontend Setup (5 MIN)

#### Step 1.1: Start Development Server
```bash
cd frontend
npm run dev
```

**Expected Output**:
```
- Local:        http://localhost:3000
- ready started server on 0.0.0.0:3000
```

**If Fails**:
```bash
# Install dependencies if needed
npm install

# Try again
npm run dev
```

#### Step 1.2: Open Browser
- Navigate to: http://localhost:3000
- You should see the ZMART homepage

**Expected**: Clean UI, no console errors

---

### Part 2: Wallet Connection (2 MIN)

#### Step 2.1: Connect Wallet
1. Click "Connect Wallet" button in header
2. Select your wallet (Phantom/Solflare/Backpack)
3. Approve connection in wallet popup

**Expected Behavior**:
- Wallet dropdown appears
- Shows your wallet address
- No connection errors

**If Using Phantom**:
- Ensure Phantom is on Devnet
- Settings → Network → Devnet

**Verification**:
- Open browser console (F12)
- Should see: "Wallet connected: <your-address>"
- No error messages

#### Step 2.2: Check Console Logs
```javascript
// Should see in console:
✅ Wallet connected: 4MkybTASDtmzQnfUWztHmfgyHgBREw74eTKipVADqQLA
✅ Network: devnet
✅ RPC: https://api.devnet.solana.com
```

---

### Part 3: Market Page Navigation (2 MIN)

#### Step 3.1: Navigate to Market
**URL**: http://localhost:3000/markets/HFaHHLFukTcA15khhvssYa7fTFmkzxTDsLih2LGVWCrM

**Expected to See**:
1. **Breadcrumb**: "Markets › Market Details"
2. **Market Header**:
   - State badge with icon
   - Market question/title
   - Creator address (clickable to copy)
   - Expiry countdown (e.g., "2d 5h")
   - Volume, created date
3. **Trading Panel**:
   - YES/NO tabs
   - Amount input
   - Slippage input
   - "Buy Shares" button
4. **Chart Area**: Bonding curve visualization
5. **Order Book**: Recent trades
6. **Discussion**: Comments section

#### Step 3.2: Verify UI Enhancements
Test the new features we built:

**Breadcrumb Navigation**:
- [ ] Click "Markets" → Goes to /markets
- [ ] Shows "Markets › Market Details"

**Market Header**:
- [ ] State icon appears (🕐 for ACTIVE)
- [ ] Click creator address → Copies to clipboard
- [ ] See checkmark icon for 2 seconds after copy
- [ ] Countdown shows format "Xd Yh" (e.g., "2d 5h")

**Skeleton Loader** (refresh page to see):
- [ ] Shows detailed skeleton matching actual layout
- [ ] Header skeleton with badge, title, metadata
- [ ] Chart skeleton (400px height)
- [ ] Trading panel skeleton with tabs
- [ ] Discussion skeleton with 3 comment placeholders

**Console Check**:
```javascript
// Open console, should see:
📋 Market ID: HFaHHLFukTcA15khhvssYa7fTFmkzxTDsLih2LGVWCrM
📊 Market Data: { state: "ACTIVE", ... }
```

---

### Part 4: Transaction Testing (10-15 MIN)

#### Step 4.1: Buy YES Shares (CRITICAL TEST)

**Setup**:
1. Ensure wallet connected
2. On market detail page
3. Select "YES" outcome
4. Enter amount: `0.1` SOL
5. Set slippage: `1%` (default)

**Transaction Flow**:
```
1. Click "Buy Shares"
   ↓
2. See transaction building in console
   ↓
3. Wallet popup appears
   ↓
4. Review transaction details
   ↓
5. Sign transaction
   ↓
6. Wait for confirmation (2-5 seconds)
   ↓
7. Transaction confirmed!
```

**Console Output (Expected)**:
```javascript
⏳ Building buy_shares transaction...
📝 Amount: 0.1 SOL (100000000 lamports)
📝 Outcome: YES
📝 Slippage: 1%

🔑 PDAs derived:
   Market: <market-pda>
   Position: <position-pda>
   Global Config: 73ZXQr6GjjD4qnMgsuZNcJsNmd2juUsevXgdAhiKtokz

✅ Transaction built successfully
📦 Compute units: 200000
📝 Instruction data: <hex>

⏳ Requesting wallet signature...
✅ Signature received
⏳ Sending transaction...
📝 Signature: <tx-signature>

⏳ Confirming transaction...
✅ Transaction confirmed!
   Signature: <tx-signature>
   Explorer: https://explorer.solana.com/tx/<signature>?cluster=devnet

✅ Position updated
   YES shares: <amount>
```

**UI Updates (Expected)**:
- [ ] "Buy Shares" button shows loading state
- [ ] Transaction signature appears
- [ ] Solana Explorer link appears (clickable)
- [ ] Position balance updates (shows shares owned)
- [ ] Market price updates
- [ ] Success toast/notification

**Solana Explorer Verification**:
1. Click Explorer link
2. Should open: https://explorer.solana.com/tx/<signature>?cluster=devnet
3. Verify:
   - Status: "Success" ✅
   - Slot: Recent block number
   - Block Time: Just now
   - Fee: ~0.00001 SOL
   - Instructions: Should show program call

#### Step 4.2: Verify Position Balance

**Check Position**:
```javascript
// In console:
📊 User Position:
   Market: HFaHHLFukTcA15khhvssYa7fTFmkzxTDsLih2LGVWCrM
   YES shares: <amount>
   NO shares: 0
   Total invested: 0.1 SOL
```

**UI Verification**:
- [ ] "My Position" section shows YES shares
- [ ] Share count is > 0
- [ ] Value displayed correctly

#### Step 4.3: Sell Shares Test

**Setup**:
1. After buying shares successfully
2. Click "SELL" tab
3. Select "YES" outcome
4. Enter shares to sell: Half of what you own
5. Set slippage: `1%`

**Expected Flow**:
1. Click "Sell Shares"
2. Wallet signature prompt
3. Transaction confirms (2-5 seconds)
4. Position balance decreases
5. SOL balance increases

**Console Output**:
```javascript
⏳ Building sell_shares transaction...
📝 Shares to sell: <amount>
📝 Outcome: YES
📝 Slippage: 1%

✅ Transaction built
⏳ Sending...
✅ Transaction confirmed!

✅ Position updated
   YES shares: <reduced-amount>
   SOL received: ~0.05 SOL (minus fees)
```

---

### Part 5: Error Handling (5 MIN)

Test error cases to verify user-friendly messages:

#### Test 5.1: Buy with 0 Amount
```
1. Enter amount: 0
2. Click "Buy Shares"
```

**Expected**:
- ❌ Error message: "Amount must be greater than 0"
- No wallet popup
- No transaction sent

#### Test 5.2: Buy with Insufficient Balance
```
1. Enter amount: 100 SOL (more than you have)
2. Click "Buy Shares"
```

**Expected**:
- ❌ Error: "Insufficient balance"
- Or wallet rejects with balance error
- No transaction sent

#### Test 5.3: Sell More Than Owned
```
1. Click "SELL" tab
2. Enter shares: 999999 (way more than owned)
3. Click "Sell Shares"
```

**Expected**:
- ❌ Error: "Cannot sell more shares than owned"
- Or program error: "InsufficientShares"
- Transaction fails gracefully

#### Test 5.4: Wallet Rejection
```
1. Enter valid amount
2. Click "Buy Shares"
3. Reject in wallet popup
```

**Expected**:
- ❌ Clear message: "Transaction cancelled by user"
- No error in console
- UI returns to normal state

#### Test 5.5: Network Error
```
1. Disconnect internet
2. Try to buy shares
```

**Expected**:
- ❌ Error: "Network error. Please check connection"
- Retry button appears
- Clear instructions

---

### Part 6: Advanced Features (5 MIN)

#### Test 6.1: Copy Creator Address
```
1. Click creator address in market header
2. Should copy to clipboard
3. Icon changes: Copy → Check ✓
4. After 2 seconds: Check → Copy
```

**Verification**:
- Paste in notepad → Should see full address
- Console: "Address copied to clipboard"

#### Test 6.2: Countdown Timer
```
1. Note the countdown (e.g., "2d 5h")
2. Wait 1 minute
3. Should update to new value
```

**Expected**:
- Updates every 60 seconds
- Format: "Xd Yh" or "Xh Ym" or "Xm Ys"
- Accurate countdown

#### Test 6.3: State Icon
```
1. Verify state icon appears
2. Should match market state:
   - ACTIVE → 🕐 Clock (green)
   - PROPOSED → 🕐 Clock (blue)
   - APPROVED → ✅ CheckCircle (green)
   - RESOLVING → ⚠️ AlertCircle (yellow)
```

#### Test 6.4: Breadcrumb Navigation
```
1. Click "Markets" in breadcrumb
2. Should navigate to /markets
3. Click back button
4. Should return to market detail
```

---

## Success Criteria

### Critical (Must Pass)
- [ ] Wallet connects without errors
- [ ] Market page loads and displays data
- [ ] Buy transaction succeeds and confirms
- [ ] Position balance updates after buy
- [ ] Transaction appears in Solana Explorer
- [ ] Sell transaction succeeds
- [ ] Position balance decreases after sell

### Important (Should Pass)
- [ ] Error messages are user-friendly
- [ ] UI shows loading states
- [ ] Transaction links work
- [ ] Console logs are informative
- [ ] No JavaScript errors

### Nice-to-Have (Enhancement Validation)
- [ ] Breadcrumb navigation works
- [ ] State icon displays correctly
- [ ] Copy creator address works
- [ ] Countdown timer updates
- [ ] Skeleton loader matches layout

---

## Troubleshooting

### Issue: Wallet Won't Connect
**Symptoms**: Connection button doesn't work
**Solutions**:
1. Refresh page
2. Ensure wallet extension installed
3. Check wallet is on Devnet network
4. Clear browser cache
5. Try different wallet (Phantom/Solflare)

### Issue: Transaction Fails
**Symptoms**: Error after signing
**Solutions**:
1. Check console for error details
2. Verify sufficient SOL balance
3. Check program is deployed: `solana program show <program-id>`
4. Verify global config exists: `node scripts/verify-global-config.mjs`
5. Try smaller amount (0.01 SOL)

### Issue: Position Not Updating
**Symptoms**: Transaction succeeds but balance doesn't change
**Solutions**:
1. Wait 5 seconds (blockchain confirmation delay)
2. Refresh page
3. Check transaction in Explorer
4. Verify position PDA derivation in console

### Issue: Market Not Loading
**Symptoms**: Blank page or loading forever
**Solutions**:
1. Check market exists: `node scripts/check-all-accounts.mjs`
2. Verify .env.local has correct PROGRAM_ID
3. Check RPC URL is accessible
4. Try different RPC: `https://api.devnet.solana.com`
5. Clear Next.js cache: `rm -rf .next && npm run dev`

### Issue: Console Errors
**Symptoms**: Red errors in console
**Common Errors**:
```
"Failed to fetch account" → Market doesn't exist or wrong ID
"Insufficient funds" → Not enough SOL in wallet
"Transaction too large" → Compute budget issue (should auto-adjust)
"Slippage tolerance exceeded" → Price moved too much, increase slippage
"Account not found" → PDA derivation issue (check console logs)
```

---

## Testing Checklist

### Pre-Test
- [ ] Frontend server running (npm run dev)
- [ ] Browser at http://localhost:3000
- [ ] Wallet extension installed
- [ ] Wallet on Devnet network
- [ ] 4.92 SOL in devnet wallet
- [ ] Console open (F12)

### Wallet Connection
- [ ] Connect wallet succeeds
- [ ] Wallet address appears in UI
- [ ] Network shows "devnet"
- [ ] No connection errors in console

### Market Page
- [ ] Navigate to market HFaHHLFukTcA15khhvssYa7fTFmkzxTDsLih2LGVWCrM
- [ ] Market data loads
- [ ] Breadcrumb shows "Markets › Market Details"
- [ ] State icon appears
- [ ] Countdown timer displays
- [ ] Creator address is copyable

### Buy Transaction
- [ ] Enter 0.1 SOL amount
- [ ] Click "Buy Shares"
- [ ] Wallet prompts for signature
- [ ] Sign transaction
- [ ] Transaction confirms (2-5 sec)
- [ ] Explorer link appears and works
- [ ] Position balance updates
- [ ] Console shows success logs

### Sell Transaction
- [ ] Switch to "SELL" tab
- [ ] Enter half of owned shares
- [ ] Click "Sell Shares"
- [ ] Transaction confirms
- [ ] Position decreases
- [ ] SOL balance increases

### Error Handling
- [ ] Buy with 0 amount → Error message
- [ ] Sell more than owned → Error message
- [ ] Reject wallet signature → Graceful cancellation
- [ ] All error messages are user-friendly

### UI Enhancements
- [ ] Copy creator address works
- [ ] Countdown timer updates every minute
- [ ] State icon matches market state
- [ ] Breadcrumb navigation works
- [ ] Skeleton loader appears on refresh

---

## Expected Test Duration

**Optimistic** (Everything works first try): 15 minutes
**Realistic** (Minor issues to debug): 30 minutes
**Pessimistic** (Multiple issues): 60 minutes

---

## Post-Test Actions

### If All Tests Pass ✅
1. Document results in E2E-TEST-RESULTS.md
2. Take screenshots of successful transactions
3. Note transaction signatures for reference
4. Proceed to Week 11: LMSR chart implementation

### If Tests Fail ❌
1. Document errors in detail
2. Check troubleshooting section
3. Review console logs
4. Verify program deployment
5. Check global config status
6. Create bug report with:
   - Error message
   - Console logs
   - Transaction signature (if any)
   - Steps to reproduce

---

## Next Steps After Testing

**Immediate** (If tests pass):
1. Test with multiple wallets
2. Test dispute flow
3. Test resolution and claiming

**Short-term** (Week 11):
1. Implement LMSR bonding curve chart
2. Add binary search for share calculation
3. Real-time WebSocket price updates

**Medium-term** (Week 12+):
1. Backend services deployment
2. Discussion system implementation
3. Comprehensive E2E tests (Playwright)

---

## Contact / Help

**If Stuck**:
1. Check console for detailed errors
2. Review troubleshooting section above
3. Verify pre-test checklist complete
4. Check DEVNET-TESTING-SUCCESS.md for more context

**Common Issues**:
- Wallet not connecting → Check network (must be Devnet)
- Transaction failing → Check SOL balance and program status
- Market not loading → Verify market ID and RPC connection

---

*Testing Guide Created: November 7, 2025*
*Status: Ready for E2E Testing*
*Expected Success Rate: 95%*
