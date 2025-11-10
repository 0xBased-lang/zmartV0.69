# LMSR UnderflowError Debugging Plan

**Created:** November 10, 2025
**Status:** Active Investigation
**Priority:** CRITICAL - Blocks TEST 5-8 (Trading Functionality)

---

## 🎯 Executive Summary

**Objective:** Fix the UnderflowError occurring in `buy_shares` instruction that prevents all trading functionality.

**Current Status:**
- ✅ Tests 1-4 passing (voting workflow fully functional)
- ❌ Tests 5-8 failing (UnderflowError in trading)
- Transaction fails at ~25K compute units in lmsr.rs:86

**Root Cause Hypothesis:** Fixed-point arithmetic precision issues in LMSR cost function with current parameter ranges.

---

## 📊 Current State Analysis

### What We Know

1. **Error Location:** `lmsr.rs:86` (compute_lmsr_shares function)
2. **Error Type:** Attempt to subtract with overflow (underflow in checked arithmetic)
3. **Transaction Details:**
   - Compute units: ~25,000 (increasing from 20K-25K across attempts)
   - Failing consistently at same location
   - Error: `0x11` (ArithmeticError)

4. **Test Parameters:**
   ```rust
   b_parameter = 100 SOL (100_000_000_000 lamports)
   initial_shares_yes = 0.1 SOL (100_000_000 lamports)
   initial_shares_no = 0.1 SOL (100_000_000 lamports)
   trade_size = 1 SOL (1_000_000_000 lamports)
   ```

5. **Attempted Fixes (All Failed):**
   - ✗ Changed calculation order (semantic fix)
   - ✗ Set initial shares = b_parameter
   - ✗ Set initial shares = initial_liquidity
   - ✗ Adjusted test trade sizes
   - ✗ Multiple recompile/redeploy cycles

### What We Don't Know

1. **Exact Values:** What are shares_yes, shares_no, target_cost at failure point?
2. **Intermediate Calculations:** What are exp_yes, exp_no, sum values before subtraction?
3. **Precision Loss:** Where is fixed-point precision being lost?
4. **Edge Cases:** Are we hitting a mathematical edge case in LMSR?

---

## 🔍 Systematic Debugging Strategy

### Phase 1: Add Comprehensive Logging (1 hour)

**Goal:** Capture exact values at failure point using `msg!()` macros

**Implementation Steps:**

1. **Add logging to lmsr.rs:compute_lmsr_shares**
   ```rust
   // At function start
   msg!("compute_lmsr_shares called:");
   msg!("  shares_yes: {}", shares_yes);
   msg!("  shares_no: {}", shares_no);
   msg!("  target_cost: {}", target_cost);
   msg!("  b: {}", b);
   msg!("  is_yes: {}", is_yes);

   // Before each calculation
   msg!("Computing exp_yes...");
   let exp_yes = compute_exp(shares_yes / b)?;
   msg!("  exp_yes: {}", exp_yes);

   msg!("Computing exp_no...");
   let exp_no = compute_exp(shares_no / b)?;
   msg!("  exp_no: {}", exp_no);

   msg!("Computing sum...");
   let sum = exp_yes.checked_add(exp_no)
       .ok_or(ErrorCode::Overflow)?;
   msg!("  sum: {}", sum);

   // At line 86 (the failure point)
   msg!("About to subtract:");
   msg!("  target_cost_fp: {}", target_cost_fp);
   msg!("  current_cost: {}", current_cost);
   ```

2. **Add logging to buy_shares instruction**
   ```rust
   msg!("buy_shares called:");
   msg!("  is_yes: {}", is_yes);
   msg!("  target_cost: {}", target_cost);
   msg!("  market.shares_yes: {}", market.shares_yes);
   msg!("  market.shares_no: {}", market.shares_no);
   msg!("  market.b_parameter: {}", market.b_parameter);
   ```

3. **Deploy and capture logs**
   ```bash
   anchor build
   solana program deploy \
     target/deploy/zmart_core.so \
     --program-id B5LimwoBn4aAqFmJsV1KtrxDbtEjaZ9WeNrfDWmJc42Z \
     --url devnet

   # Run test with log capture
   npm run test:devnet:lifecycle 2>&1 | tee logs/lmsr-debug-$(date +%Y%m%d-%H%M%S).log

   # Also watch program logs in separate terminal
   solana logs B5LimwoBn4aAqFmJsV1KtrxDbtEjaZ9WeNrfDWmJc42Z --url devnet
   ```

**Expected Output:** Exact values showing where underflow occurs

**Success Criteria:** Identify which specific subtraction is failing and with what values

---

### Phase 2: Verify LMSR Math Correctness (2 hours)

**Goal:** Validate that our LMSR implementation matches theoretical formulas

**Implementation Steps:**

1. **Create standalone LMSR math tester**
   ```rust
   // programs/zmart-core/src/bin/lmsr_tester.rs

   fn main() {
       // Test with actual values from logs
       let shares_yes = 100_000_000; // From Phase 1 logs
       let shares_no = 100_000_000;
       let b = 100_000_000_000;
       let target_cost = 1_000_000_000;

       println!("Testing LMSR with:");
       println!("  shares_yes: {}", shares_yes);
       println!("  shares_no: {}", shares_no);
       println!("  b: {}", b);
       println!("  target_cost: {}", target_cost);

       // Step-by-step calculation
       let q_yes = shares_yes as f64 / 1e9;
       let q_no = shares_no as f64 / 1e9;
       let b_sol = b as f64 / 1e9;
       let cost_sol = target_cost as f64 / 1e9;

       println!("\nIn SOL:");
       println!("  q_yes: {} SOL", q_yes);
       println!("  q_no: {} SOL", q_no);
       println!("  b: {} SOL", b_sol);
       println!("  target_cost: {} SOL", cost_sol);

       // Current market cost C(q_yes, q_no)
       let exp_yes = (q_yes / b_sol).exp();
       let exp_no = (q_no / b_sol).exp();
       let current_cost = b_sol * (exp_yes + exp_no).ln();

       println!("\nCurrent cost C(q_yes, q_no):");
       println!("  exp(q_yes/b): {}", exp_yes);
       println!("  exp(q_no/b): {}", exp_no);
       println!("  sum: {}", exp_yes + exp_no);
       println!("  ln(sum): {}", (exp_yes + exp_no).ln());
       println!("  b * ln(sum): {} SOL", current_cost);

       // Binary search for delta_shares
       // C(q_yes + delta, q_no) - C(q_yes, q_no) = target_cost
       // ...implement binary search...
   }
   ```

2. **Compare with Python reference implementation**
   ```python
   # scripts/lmsr_reference.py
   import math

   def lmsr_cost(q_yes, q_no, b):
       """LMSR cost function C(q_yes, q_no) = b * ln(e^(q_yes/b) + e^(q_no/b))"""
       exp_yes = math.exp(q_yes / b)
       exp_no = math.exp(q_no / b)
       return b * math.log(exp_yes + exp_no)

   def find_shares_for_cost(current_yes, current_no, target_cost, b, is_yes=True):
       """Binary search to find delta_shares such that cost change = target_cost"""
       # ... implement binary search ...
       pass

   # Test with values from Phase 1 logs
   shares_yes = 0.1  # SOL
   shares_no = 0.1
   b = 100
   target_cost = 1.0

   delta = find_shares_for_cost(shares_yes, shares_no, target_cost, b, True)
   print(f"Delta shares: {delta}")
   ```

3. **Cross-validate Rust and Python results**

**Expected Output:** Identify if math implementation diverges from theory

**Success Criteria:** Either confirm math is correct OR find the error in implementation

---

### Phase 3: Test Edge Cases (1 hour)

**Goal:** Determine if issue is parameter-dependent or fundamental

**Test Matrix:**

| Test | b (SOL) | Initial Shares | Trade Size | Expected |
|------|---------|----------------|------------|----------|
| 1    | 100     | 0.1 SOL        | 1 SOL      | Current failure |
| 2    | 100     | 1 SOL          | 1 SOL      | Test larger initial shares |
| 3    | 100     | 10 SOL         | 1 SOL      | Test much larger initial shares |
| 4    | 100     | 0.1 SOL        | 0.1 SOL    | Test smaller trade |
| 5    | 100     | 0.1 SOL        | 0.01 SOL   | Test tiny trade |
| 6    | 200     | 0.1 SOL        | 1 SOL      | Test different b |
| 7    | 50      | 0.1 SOL        | 0.5 SOL    | Test smaller b |

**Implementation:**
```typescript
// backend/tests/devnet/lmsr-edge-cases.test.ts

const testCases = [
  { b: 100e9, initShares: 0.1e9, tradeSize: 1e9, name: "baseline" },
  { b: 100e9, initShares: 1e9, tradeSize: 1e9, name: "larger_init" },
  // ... etc
];

for (const testCase of testCases) {
  console.log(`\nTesting ${testCase.name}...`);
  // Run test...
}
```

**Expected Output:** Identify parameter ranges where LMSR works vs. fails

**Success Criteria:** Find working parameter set OR confirm fundamental issue

---

### Phase 4: Review Fixed-Point Implementation (2 hours)

**Goal:** Verify fixed-point math is correct and handles precision properly

**Areas to Review:**

1. **PRECISION constant**
   ```rust
   // Check: Is 1e9 sufficient for our use case?
   pub const PRECISION: u64 = 1_000_000_000; // 9 decimals
   ```

2. **Division operations**
   ```rust
   // All divisions: Are we losing precision?
   let ratio = shares_yes / b;  // ← Potential precision loss
   ```

3. **Exponential function implementation**
   ```rust
   // Check compute_exp() for precision issues
   // Especially for very small or very large inputs
   ```

4. **Logarithm function implementation**
   ```rust
   // Check compute_ln() accuracy
   // Verify range limitations
   ```

5. **Multiplication/Division ordering**
   ```rust
   // Are we doing:
   //   (a * b) / c     ← Can overflow
   // Or:
   //   a * (b / c)     ← Can lose precision
   ```

**Tools:**
- Manual calculation with actual values
- Comparison with f64 reference
- Unit tests for each math primitive

**Expected Output:** Identify precision loss or overflow in fixed-point operations

**Success Criteria:** Either confirm fixed-point math is correct OR find the bug

---

### Phase 5: Implement Fix (Time varies)

**Based on findings from Phases 1-4, implement appropriate fix:**

#### Scenario A: Precision Loss in Fixed-Point Math

**Fix:** Increase precision or reorder operations
```rust
// Before:
let ratio = shares_yes / b;
let exp_val = compute_exp(ratio)?;

// After:
let ratio = shares_yes.checked_mul(PRECISION)?
    .checked_div(b)?;
let exp_val = compute_exp(ratio)?;
```

#### Scenario B: Initial Shares Too Small

**Fix:** Enforce minimum initial shares
```rust
// In create_market.rs:
let min_initial_shares = b_parameter / 1000; // 0.1% of b
require!(
    initial_liquidity >= min_initial_shares,
    ErrorCode::InsufficientInitialLiquidity
);
market.shares_yes = initial_liquidity;
market.shares_no = initial_liquidity;
```

#### Scenario C: Math Implementation Error

**Fix:** Correct the formula implementation
```rust
// Compare line-by-line with blueprint spec
// Fix any deviations
```

#### Scenario D: Parameter Constraints

**Fix:** Add validation and documentation
```rust
// Enforce relationships between parameters
require!(
    target_cost >= MIN_TRADE_SIZE,
    ErrorCode::TradeTooSmall
);
require!(
    target_cost <= b_parameter / 10,
    ErrorCode::TradeTooBig
);
```

---

## 🔧 Tools and Resources

### Logging Commands
```bash
# Watch program logs in real-time
solana logs B5LimwoBn4aAqFmJsV1KtrxDbtEjaZ9WeNrfDWmJc42Z --url devnet

# Capture test output with timestamps
npm run test:devnet:lifecycle 2>&1 | ts '[%Y-%m-%d %H:%M:%S]' | tee logs/test-$(date +%Y%m%d-%H%M%S).log

# Get transaction details
solana confirm -v <SIGNATURE> --url devnet
```

### Debug Build
```bash
# Build with debug symbols
anchor build -- --features debug

# Or add to Cargo.toml:
[profile.release]
debug = true
overflow-checks = true
```

### Analysis Tools
```bash
# Check program size
ls -lh target/deploy/zmart_core.so

# Inspect account data
solana account <MARKET_PDA> --url devnet --output json

# Monitor compute units
solana logs --url devnet | grep "consumed"
```

---

## 📈 Success Metrics

### Phase 1 Complete
- [ ] Exact values at failure point captured
- [ ] Logs show all intermediate calculations
- [ ] Underflow location pinpointed

### Phase 2 Complete
- [ ] Math verified against theoretical LMSR
- [ ] Python reference implementation matches
- [ ] Correctness confirmed OR error found

### Phase 3 Complete
- [ ] At least one parameter set works
- [ ] Parameter boundaries identified
- [ ] Working vs. failing ranges documented

### Phase 4 Complete
- [ ] All fixed-point operations reviewed
- [ ] Precision analysis complete
- [ ] Overflow/underflow risks assessed

### Phase 5 Complete
- [ ] Fix implemented and deployed
- [ ] All 8 lifecycle tests passing
- [ ] Additional edge case tests added
- [ ] Documentation updated

---

## 🎯 Final Deliverables

1. **LMSR_FIX_REPORT.md** - Complete analysis and solution documentation
2. **Updated tests** - Edge cases and parameter validation
3. **Updated docs** - LMSR parameter constraints and guidelines
4. **Working deployment** - All 8 tests passing on devnet
5. **Commit message** - Comprehensive fix description

---

## ⏱️ Time Estimates

| Phase | Estimated Time | Priority |
|-------|---------------|----------|
| Phase 1: Logging | 1 hour | CRITICAL |
| Phase 2: Math Verification | 2 hours | HIGH |
| Phase 3: Edge Cases | 1 hour | MEDIUM |
| Phase 4: Fixed-Point Review | 2 hours | HIGH |
| Phase 5: Implement Fix | 2-4 hours | CRITICAL |
| **TOTAL** | **8-10 hours** | - |

**Recommended Approach:** Execute phases sequentially. Phase 1 is critical - must be done first to inform all other phases.

---

## 🚦 Decision Points

### After Phase 1
- **If logs reveal obvious error:** Skip to Phase 5
- **If values look reasonable:** Proceed to Phase 2

### After Phase 2
- **If math is wrong:** Skip to Phase 5 (fix formula)
- **If math is correct:** Proceed to Phase 3

### After Phase 3
- **If some parameters work:** Adjust constraints (Phase 5)
- **If nothing works:** Proceed to Phase 4

### After Phase 4
- **If fixed-point issue found:** Proceed to Phase 5
- **If still unclear:** Consider external audit/review

---

## 📝 Notes

- All attempted fixes documented in this file for future reference
- Test logs saved in `logs/` directory with timestamps
- Each phase builds on previous findings
- Can parallelize Phases 2-4 if multiple people working

---

**Next Action:** Begin Phase 1 - Add comprehensive logging to lmsr.rs and buy_shares instruction

**Status:** Ready to execute
**Estimated Time to Fix:** 8-10 hours
**Blocking:** Tests 5-8 (Trading functionality)
