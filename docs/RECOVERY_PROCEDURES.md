# Recovery Procedures

**Purpose**: Step-by-step procedures for recovering from common development blockers
**Usage**: When stuck >30 minutes, consult this document IMMEDIATELY
**Pattern Prevention**: Addresses Pattern #3 (Reactive Crisis Loop)

---

## 📋 Quick Index

- [Build Failures](#build-failures)
- [Test Failures](#test-failures)
- [Type Errors](#type-errors)
- [RPC/Network Issues](#rpcnetwork-issues)
- [Compute Unit Exceeded](#compute-unit-exceeded)
- [Git Conflicts](#git-conflicts)
- [Database Issues](#database-issues)
- [Stuck on Implementation](#stuck-on-implementation)
- [Scope Creep](#scope-creep)
- [When to Ask for Help](#when-to-ask-for-help)

---

## 🔥 Build Failures

### Symptoms
```
error: could not compile `zmart-core` due to X previous errors
anchor build failed
```

### Diagnosis & Fix

#### Step 1: Read the Error (5 min)
```
□ Read ENTIRE error message (don't skip to bottom)
□ Note file name and line number
□ Copy error message to notes
□ Identify error category (syntax, type, missing dep, etc.)
```

#### Step 2: Common Anchor Build Errors

**Error: "cannot find macro `declare_id` in this scope"**
```bash
# Fix: Regenerate IDL
anchor build
anchor keys list  # Verify program ID matches
```

**Error: "no such file or directory: target/types"**
```bash
# Fix: Clean and rebuild
rm -rf target/
anchor build
```

**Error: "unresolved import"**
```rust
// Fix: Check imports in lib.rs or mod.rs
pub mod instructions;  // Make sure module declared
pub use instructions::*;  // Make sure exported
```

**Error: "mismatched types"**
```
□ Check if using correct numeric types (u64 vs i64)
□ Check if using BN vs number in TypeScript
□ Verify account types match expectations
```

#### Step 3: Clean Slate (if still failing after 15 min)
```bash
# Nuclear option: Clean everything
rm -rf target/
rm -rf node_modules/
rm -rf .anchor/
npm install
anchor build
```

#### Step 4: Isolate the Problem (if still failing)
```
□ Comment out recent changes
□ Build incrementally (uncomment one section at a time)
□ Identify exact line causing failure
□ Check VERIFICATION_SUMMARY.md for correct implementation
```

**Recovery Time**: 5-30 minutes
**Escalate If**: Still failing after 30 minutes

---

## 🧪 Test Failures

### Symptoms
```
Test failed: expected X to equal Y
Timeout: async operation did not complete
```

### Diagnosis & Fix

#### Step 1: Understand the Failure (10 min)
```
□ Read assertion error carefully
□ Check expected vs actual values
□ Verify test setup (before hooks)
□ Check if test has dependencies on other tests
```

#### Step 2: Common Test Patterns

**Pattern: "Transaction simulation failed"**
```typescript
// Often means on-chain validation failed
// Add logging to see which require!() failed

try {
  await program.methods.buyShares(...).rpc();
} catch (err) {
  console.log("Full error:", err);  // See actual error code
  throw err;
}
```

**Pattern: "Timeout of 2000ms exceeded"**
```typescript
// Increase timeout or check if operation hanging
it("should complete", async () => {
  // ...
}).timeout(10000);  // 10 seconds instead of 2
```

**Pattern: "Expected 1000000000 to equal 1000000001" (off-by-one)**
```
Common causes:
□ Fee rounding (expected)
□ Fixed-point precision (expected)
□ Race condition (fix needed)
□ Compute unit consumption (expected)

Fix: Use ranges instead of exact values
expect(actual).to.be.closeTo(expected, tolerance);
```

#### Step 3: Isolate Failing Test
```bash
# Run only failing test
anchor test --skip-build -- --grep "specific test name"

# Run in debug mode
DEBUG=* anchor test --skip-build -- --grep "specific test name"
```

#### Step 4: Verify On-Chain State
```typescript
// Add extensive logging
const account = await program.account.marketAccount.fetch(marketPda);
console.log("Market state:", JSON.stringify(account, null, 2));

// Check Solana logs
// In separate terminal:
solana logs --url devnet
```

**Recovery Time**: 10-45 minutes
**Escalate If**: Test consistently fails with correct implementation

---

## 📝 Type Errors

### Symptoms
```
Property 'X' does not exist on type 'Y'
Type 'string' is not assignable to type 'number'
```

### Diagnosis & Fix

#### Step 1: TypeScript Compilation
```bash
# Check types
npm run type-check

# Or for specific file
npx tsc --noEmit src/file.ts
```

#### Step 2: Common Type Issues

**Issue: "Supabase types out of sync"**
```bash
# Regenerate types from Supabase
npx supabase gen types typescript --project-id <project-id> > src/types/supabase.ts

# Or if using local dev
npx supabase gen types typescript --local > src/types/supabase.ts
```

**Issue: "Anchor IDL types out of sync"**
```bash
# Rebuild program to regenerate IDL
anchor build

# Copy IDL to frontend if needed
cp target/idl/zmart_core.json frontend/src/idl/
```

**Issue: "BigNumber / BN type mismatch"**
```typescript
// Use BN from @coral-xyz/anchor, not bignumber.js
import { BN } from "@coral-xyz/anchor";

// Convert carefully
const amount = new BN(1_000_000_000);  // u64
const number = amount.toNumber();      // Only if < 2^53
```

#### Step 3: Use Type Assertions (Last Resort)
```typescript
// If you're 100% sure type is correct
const value = data as ExpectedType;

// Better: Use type guards
if (isMarketData(data)) {
  // TypeScript now knows data is MarketData
}
```

**Recovery Time**: 5-20 minutes
**Escalate If**: Types genuinely incompatible (might need refactor)

---

## 🌐 RPC/Network Issues

### Symptoms
```
429 Too Many Requests
timeout of 30000ms exceeded
Connection refused
```

### Diagnosis & Fix

#### Step 1: Check RPC Health
```bash
# Test RPC endpoint
curl -X POST https://api.devnet.solana.com \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}'

# Expected: {"jsonrpc":"2.0","result":"ok","id":1}
```

#### Step 2: Rate Limiting (429)
```
Causes:
□ Free RPC tier limits hit
□ Too many requests in short time
□ Need to upgrade RPC provider

Immediate fix:
□ Add delays between requests
□ Use paid RPC (Helius, QuickNode, Alchemy)
□ Implement retry with exponential backoff
```

```typescript
// Retry logic
async function retryRpc<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === maxRetries - 1) throw err;
      await sleep(1000 * Math.pow(2, i));  // Exponential backoff
    }
  }
  throw new Error("Max retries exceeded");
}
```

#### Step 3: Switch RPC Provider
```typescript
// In .env
SOLANA_RPC_ENDPOINT=https://api.devnet.solana.com  // Free (rate limited)
# Switch to:
SOLANA_RPC_ENDPOINT=https://your-app.helius-rpc.com/?api-key=YOUR_KEY
```

**Free RPC options**:
- Solana public devnet (rate limited)
- Helius free tier (better limits)
- QuickNode free trial

**Paid options** (recommended for production):
- Helius: $50/month (10M requests)
- QuickNode: $49/month
- Alchemy: Custom pricing

**Recovery Time**: 5-15 minutes
**Escalate If**: RPC provider consistently down

---

## ⚙️ Compute Unit Exceeded

### Symptoms
```
Error: Transaction simulation failed: Error processing Instruction 0:
Program failed to complete: exceeded CUs meter at BPF instruction
```

### Diagnosis & Fix

#### Step 1: Measure Current Usage
```bash
# Run tests with compute unit logging
anchor test --show-compute-units

# Look for lines like:
# Program consumed: 187432 of 200000 compute units
```

#### Step 2: Identify Expensive Operations
```
Common CU hogs:
□ Complex math (multiple iterations)
□ Binary search loops
□ CPI calls (cross-program invocations)
□ Large account deserializations
□ String operations
□ Logging (msg!() costs CUs)
```

#### Step 3: Optimization Strategies

**Strategy 1: Reduce Iterations**
```rust
// Before (expensive)
for i in 0..1000 {  // Could iterate many times
    // ...
}

// After (cheaper)
let iterations = std::cmp::min(max_iterations, 50);  // Cap at 50
for i in 0..iterations {
    // ...
}
```

**Strategy 2: Optimize Math**
```rust
// Use lookup tables instead of calculations
const LOOKUP_TABLE: [u64; 100] = [ /* precomputed values */ ];

// Before
let result = expensive_calculation(x);

// After
let result = LOOKUP_TABLE[x as usize];
```

**Strategy 3: Reduce Logging**
```rust
// Only log in dev builds
#[cfg(feature = "dev")]
msg!("Debug info: {}", value);
```

**Strategy 4: Request More CUs**
```typescript
// In TypeScript client
const tx = await program.methods
  .complexInstruction()
  .accounts({ /* ... */ })
  .preInstructions([
    // Request more compute units (max 1.4M)
    ComputeBudgetProgram.setComputeUnitLimit({
      units: 400_000,
    }),
  ])
  .rpc();
```

**Recovery Time**: 30-120 minutes
**Escalate If**: Optimization doesn't help (might need algorithm redesign)

---

## 🔀 Git Conflicts

### Symptoms
```
CONFLICT (content): Merge conflict in src/file.rs
Automatic merge failed; fix conflicts and then commit the result.
```

### Diagnosis & Fix

#### Step 1: Assess Conflict Size
```bash
# See which files have conflicts
git status

# See conflict markers
git diff --check
```

#### Step 2: Resolve Small Conflicts (<5 files)
```bash
# Open conflicted file
# Look for markers:
<<<<<<< HEAD
Your changes
=======
Their changes
>>>>>>> branch-name

# Manual resolution:
# 1. Keep your changes, remove markers
# 2. Keep their changes, remove markers
# 3. Merge both, remove markers

# After resolving:
git add resolved-file.rs
git commit -m "fix: Resolve merge conflicts"
```

#### Step 3: Resolve Large Conflicts (>5 files)
```bash
# Option A: Use merge tool
git mergetool

# Option B: Abort and rebase instead
git merge --abort
git rebase main  # Resolve one commit at a time
```

#### Step 4: Prevention
```
□ Pull main frequently (daily)
□ Keep feature branches short-lived (<1 week)
□ Break large features into smaller PRs
□ Coordinate with team on file ownership
```

**Recovery Time**: 10-60 minutes
**Escalate If**: Complex logic conflicts (need author clarification)

---

## 🗄️ Database Issues

### Symptoms
```
relation "table_name" does not exist
permission denied for table
connection timeout
```

### Diagnosis & Fix

#### Step 1: Check Connection
```bash
# Test Supabase connection
curl https://your-project.supabase.co/rest/v1/markets \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

#### Step 2: Common Database Issues

**Issue: "relation does not exist"**
```
Causes:
□ Migration not run
□ Wrong database (local vs remote)
□ Table name typo

Fix:
# Run migrations
cd backend
npx supabase db push

# Or reset database (CAREFUL!)
npx supabase db reset
```

**Issue: "permission denied"**
```
Cause: RLS policy blocking access

Fix:
# Check RLS policies in Supabase dashboard
# Or disable for testing (NOT production)
ALTER TABLE markets DISABLE ROW LEVEL SECURITY;
```

**Issue: "too many connections"**
```
Fix:
# Use connection pooling
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(url, key, {
  db: {
    pool: { max: 10 }  // Limit connections
  }
})
```

#### Step 3: Schema Sync
```bash
# Regenerate types after schema changes
npx supabase gen types typescript --local > src/types/supabase.ts

# Verify schema matches
npx supabase db diff
```

**Recovery Time**: 10-30 minutes
**Escalate If**: Database corruption or data loss

---

## 🤔 Stuck on Implementation

### Symptoms
- Been on same micro-step for >90 minutes
- Don't know how to proceed
- Unclear requirements

### Diagnosis & Fix

#### Step 1: Take a Break (10 min)
```
□ Stand up, walk away from computer
□ Get water/coffee
□ Clear your head
□ Come back with fresh perspective
```

#### Step 2: Review Documentation
```
□ Re-read story file (docs/stories/STORY-X.Y.md)
□ Check implementation template
□ Review VERIFICATION_SUMMARY.md for mechanics
□ Check blueprint docs if needed
```

#### Step 3: Break It Down Further
```
Current micro-step: "Implement LMSR calculation" (90 min - TOO BIG!)

Break into smaller steps (30 min each):
□ Understand LMSR formula from docs (30 min)
□ Implement fixed-point conversion (30 min)
□ Implement cost function (30 min)
□ Add tests for cost function (30 min)
□ Implement share calculation (30 min)
□ Add tests for share calculation (30 min)
```

#### Step 4: Spike Solution
```
Instead of perfect implementation:
□ Write simplest possible version
□ Hard-code test values
□ Verify it compiles and runs
□ Then improve iteratively
```

#### Step 5: Phone a Friend
```
□ Search Discord/Telegram community
□ Search Stack Overflow
□ Search Solana Cookbook
□ Search Anchor examples
□ Ask in community channel
```

**Recovery Time**: 30-60 minutes
**Escalate If**: Truly blocked after all attempts

---

## 📈 Scope Creep

### Symptoms
- Implementing features not in story
- "While I'm at it..." thoughts
- Adding "nice to have" features

### Diagnosis & Fix

#### Step 1: STOP Immediately
```
□ Save current work (git stash or commit)
□ Re-read FRONTEND_SCOPE_V1.md
□ Re-read story file acceptance criteria
□ Ask: "Is this feature REQUIRED for v1?"
```

#### Step 2: Verify Against Scope
```
Questions:
□ Is this feature in FRONTEND_SCOPE_V1.md "In Scope" section?
□ Is this feature in story acceptance criteria?
□ Does user NEED this to accomplish their goal?
□ Can this wait for v2?

If ANY answer is NO/YES → STOP, defer to v2
```

#### Step 3: Document and Defer
```
# Create v2 feature note
echo "Feature: [description]" >> docs/V2_FEATURES.md
echo "Reason deferred: Not required for MVP" >> docs/V2_FEATURES.md

# Revert changes
git stash  # or git reset --hard
```

#### Step 4: Return to Plan
```
□ Check DAILY_WORKFLOW_CHECKLIST.md
□ Check MICRO_TASK_BREAKDOWN.md
□ Resume last planned micro-task
□ Stay on track!
```

**Remember**: Pattern #2 (Scope Creep) caused 180% growth in previous project!

**Recovery Time**: 5-15 minutes
**Escalate If**: Genuinely unclear if feature is in scope

---

## 🆘 When to Ask for Help

### Escalation Criteria

**Ask for help if**:
- Stuck >30 minutes after trying recovery procedures
- Same issue recurring 3+ times
- Build failure after clean slate
- Test failure with correct implementation
- RPC provider consistently down
- Database corruption
- Unclear requirements
- Genuinely blocked on external dependency

### Where to Ask

**Project Issues**:
1. GitHub Issues: Document problem with full context
2. Team Slack/Discord
3. Project maintainer directly

**Technical Issues**:
1. Solana Stack Exchange
2. Anchor Discord
3. Solana Developer Discord

### How to Ask (get help faster!)

```markdown
## Problem
[Clear 1-sentence description]

## Expected Behavior
[What should happen]

## Actual Behavior
[What actually happens]

## Steps to Reproduce
1. Step 1
2. Step 2
3. Error occurs

## Environment
- Anchor version: 0.28.0
- Solana version: 1.18.0
- OS: macOS 14.0

## What I've Tried
- Tried X (didn't work)
- Tried Y (didn't work)
- Checked Z (seems fine)

## Code Sample
```rust
// Minimal reproducible example
```

## Error Message
```
Full error output here
```
```

**Don't ask**:
- "It doesn't work, help!" (too vague)
- "Can someone debug my entire codebase?" (too broad)
- Without showing error messages
- Without showing what you've tried

---

## 📚 Related Documents

- [DAILY_WORKFLOW_CHECKLIST.md](./DAILY_WORKFLOW_CHECKLIST.md) - Daily workflow
- [MICRO_TASK_BREAKDOWN.md](./MICRO_TASK_BREAKDOWN.md) - Task breakdown
- [Implementation Templates](./implementation-templates/) - Step-by-step guides

---

**Last Updated**: November 5, 2025
**Version**: 1.0
**Status**: ✅ READY FOR USE

**Remember**: Being stuck is normal. Having recovery procedures is what makes you professional! 🚀
