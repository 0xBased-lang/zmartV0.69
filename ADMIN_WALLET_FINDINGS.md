# Admin Wallet Investigation - Complete Findings

**Date:** November 10, 2025
**Status:** 🔴 **CRITICAL BUGS FOUND**

---

## 🐛 Critical Bugs Discovered

### Bug #1: Missing `proposal_total_votes` Field Update

**Location:** `programs/zmart-core/src/instructions/aggregate_proposal_votes.rs:56-57`

**The Issue:**
```rust
// EXISTING CODE (BUGGY)
market.proposal_likes = final_likes;        // ✅ Sets likes
market.proposal_dislikes = final_dislikes;  // ✅ Sets dislikes
// ❌ MISSING: proposal_total_votes is NEVER set!
```

**Evidence:**
```
Market state before approval: { approved: {} }
Proposal votes - Likes: 3
Proposal votes - Dislikes: 1
Proposal votes - Total: 0  <-- ❌ SHOULD BE 4!
```

**Impact:**
- `proposal_total_votes` stays 0 forever
- Breaks any logic that relies on total vote count
- Makes approval validation impossible in `approve_proposal`

**Fix Required:**
```rust
market.proposal_likes = final_likes;
market.proposal_dislikes = final_dislikes;
market.proposal_total_votes = total_votes;  // ADD THIS LINE
```

---

### Bug #2: Auto-Approval Conflict

**Location:** `programs/zmart-core/src/instructions/aggregate_proposal_votes.rs:78-82`

**The Issue:**
```rust
// aggregate_proposal_votes AUTOMATICALLY approves market if threshold met
if approved {
    market.state = MarketState::Approved;  // ❌ Auto-transition
    market.approved_at = clock.unix_timestamp;
}
```

**The Conflict:**
1. You have a separate `approve_proposal` instruction
2. But `aggregate_proposal_votes` already does the approval
3. This makes `approve_proposal` unreachable (market is already Approved)

**Evidence:**
```
Market created in PROPOSED state  ✅
Votes aggregated with 75% approval  ✅
Market automatically transitions to APPROVED  ❌ Unexpected!
approve_proposal() called  ❌ Fails: InvalidStateTransition
```

---

## 🤔 Design Decision Required

You have **two conflicting workflows** in your code:

### Option A: Manual Approval (Your Documentation Says)
```
PROPOSED → aggregate_proposal_votes (records votes) →
          → approve_proposal (admin reviews) → APPROVED
          (explicit admin action required)
```
- **Pros:**
  - Admin can review and reject (even if 70%+)
  - Follows documented 6-state FSM
  - More control and safety
- **Cons:** Requires extra transaction

### Option B: Auto-Approval (Current Implementation)
```
PROPOSED → aggregate_proposal_votes (75% approval) → APPROVED
          (automatic transition if threshold met)
```
- **Pros:** Simpler, fewer transactions, faster
- **Cons:**
  - No admin oversight/veto power
  - `approve_proposal` instruction becomes useless
  - Contradicts 6-state FSM documentation

---

## 📚 What Your Documentation Says

**From CORE_LOGIC_INVARIANTS.md:**
```markdown
### State 1: APPROVED
After proposal voting reaches 70% approval threshold, **admin can approve**
the market, allowing it to be activated for trading. This instruction
**validates the voting threshold** and transitions the market state.
```

**This suggests Manual Approval (Option A) is the intended design.**

---

## 🛠️ Recommended Fixes

### Fix #1: Set `proposal_total_votes` Field (CRITICAL)
```rust
// In aggregate_proposal_votes.rs, line 57, add:
market.proposal_total_votes = total_votes;
```
**Priority:** CRITICAL - This is a data integrity bug that must be fixed.

---

### Fix #2: Choose Approval Workflow

**Choice A: Manual Approval (RECOMMENDED)**
```rust
// Remove auto-approval from aggregate_proposal_votes.rs:78-82
// DELETE THESE LINES:
if approved {
    market.state = MarketState::Approved;
    market.approved_at = clock.unix_timestamp;
}

// Keep aggregate_proposal_votes for recording votes only
// Keep approve_proposal for admin to manually approve if >= 70%
```

**Choice B: Auto-Approval (Simpler)**
```rust
// Keep aggregate_proposal_votes.rs as-is (with auto-approval)
// Delete approve_proposal.rs entirely
// Update documentation to reflect auto-approval workflow
```

---

## ⚖️ My Recommendation: Manual Approval (Option A)

**Why:**
1. **Follows your blueprint documentation** (admin approval is explicit)
2. **Safety and control** - Admin can reject even if 70%+
3. **Matches 6-state FSM design** - PROPOSED → APPROVED is explicit transition
4. **Better for moderation** - Admin reviews market quality, not just vote count

**Implementation:**
1. Fix Bug #1 (add `proposal_total_votes` line) - **MUST DO**
2. Remove lines 78-82 from `aggregate_proposal_votes.rs` (auto-approval)
3. Keep `approve_proposal` instruction as-is
4. Test workflow: create → vote → aggregate → admin approve → activate

---

## 🧪 Updated Test Workflow

**After Fix #1 + Fix #2 (Manual Approval):**
```typescript
// TEST 1: Create Market (PROPOSED state)
await createMarket(...);

// TEST 2: Submit & Aggregate Votes
await submitProposalVote(true);  // Like
await aggregateProposalVotes(3, 1);  // 75% approval
// Market stays in PROPOSED state (votes recorded only)

// TEST 3: Admin Approval (PROPOSED → APPROVED)
await approveProposal();  // Admin explicitly approves
// Market now in APPROVED state

// TEST 4: Activate Market (APPROVED → ACTIVE)
await activateMarket();
// Market now tradeable

// TEST 5-8: Trading, resolution, claiming
...
```

---

## 📊 Impact Summary

### Current Status:
- ❌ Bug #1 breaks all approval logic (proposal_total_votes = 0)
- ❌ Bug #2 makes approve_proposal unreachable
- ❌ Tests cannot progress past approval step
- ❌ Design conflicts with documentation

### After Fixes:
- ✅ Vote counts accurate (Bug #1 fixed)
- ✅ Admin approval workflow works (Bug #2 fixed)
- ✅ Tests can complete full lifecycle
- ✅ Design matches blueprint documentation

---

## 🚀 Next Steps

1. **User Decision:** Choose Manual Approval (recommended) or Auto-Approval
2. **Apply Fix #1:** Add `proposal_total_votes` line (MUST DO either way)
3. **Apply Fix #2:** Remove auto-approval lines OR delete approve_proposal
4. **Rebuild & Redeploy:** Fresh deployment with fixes
5. **Run Tests:** Validate complete lifecycle

---

## 📁 Files to Modify

**Fix #1 (CRITICAL):**
- `programs/zmart-core/src/instructions/aggregate_proposal_votes.rs` (1 line add)

**Fix #2 (Choose one):**
- **Option A:** Remove lines 78-82 from aggregate_proposal_votes.rs
- **Option B:** Delete approve_proposal.rs + remove from lib.rs

---

## 💡 Additional Notes

### Why This Wasn't Caught Earlier:
- Tests didn't check intermediate state (assumed happy path)
- Auto-approval looked like it was working (it was!)
- No test explicitly checked `proposal_total_votes` field
- Documentation didn't clarify manual vs auto-approval

### What We Learned:
- ✅ Always fetch and validate account state in tests
- ✅ Check ALL fields after state changes
- ✅ Test both happy path AND edge cases
- ✅ Verify design matches documentation

---

## 🎯 Decision Needed

**Question for User:**

Do you want:
- **A) Manual Approval** (admin must explicitly approve, matches docs)
- **B) Auto-Approval** (market auto-approves if >= 70%, simpler)

**I recommend A (Manual Approval)** for better control and safety.

---

**Status:** Awaiting user decision before proceeding with fixes.

**All findings committed to:** `security/critical-fixes` branch
**Ready to fix as soon as you decide which workflow you want!** ✅
