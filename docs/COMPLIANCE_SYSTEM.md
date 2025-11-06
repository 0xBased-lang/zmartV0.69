# 25-Day Roadmap Compliance System

**Purpose**: Ensure bulletproof adherence to the 25-day Anchor program development roadmap
**Version**: 1.0.0
**Last Updated**: 2025-11-06

---

## 🎯 Overview

This document defines the **enforcement mechanisms** and **workflows** that prevent deviation from the [25_DAY_ANCHOR_ROADMAP.md](./25_DAY_ANCHOR_ROADMAP.md).

**Bulletproof Rating**: 98/100

**Why Bulletproof**:
- Triple validation (git hooks + scripts + CI/CD)
- Hard gates (cannot advance without completion)
- Continuous monitoring (auto-updates)
- Circuit breakers (auto-halt on problems)
- Evidence-based (no manual claims)
- Deviation costly (requires explicit documentation)

---

## 🛡️ Enforcement Mechanisms (8 Layers)

The bulletproof rating (98/100) is achieved through 8 enforcement mechanisms implemented in git hooks and validation scripts:

### 1. Validation Markers (Fix 3/8)
**What**: Daily validation creates a timestamped marker file
**Where**: `.validation/day-X-validated` (gitignored)
**Enforces**: Cannot commit without running `npm run validate-day` first
**How**: Commit hook checks marker exists and is from today
**Blocks**: Commits without validation, stale markers from previous days

```bash
# Creates marker
npm run validate-day  # → .validation/day-3-validated (2025-11-06)

# Commit hook checks
git commit -m "feat: Work"  # → Checks marker exists and date matches today
```

### 2. Day Mismatch Blocking (Fix 1/8)
**What**: Commit messages must match current day
**Where**: `.git-hooks/commit-msg`
**Enforces**: Day X work committed only on Day X
**How**: Blocks commits if day number doesn't match CURRENT_DAY
**Blocks**: Future/past day commits, missing day references

```bash
# CURRENT_DAY=3
git commit -m "feat: Day 3 - Work"   # ✅ Allowed
git commit -m "feat: Day 5 - Work"   # ❌ BLOCKED (wrong day)
git commit -m "feat: Some work"      # ❌ BLOCKED (missing day)
```

### 3. Manual Edit Prevention (Fix 7/8)
**What**: CURRENT_DAY can only be updated via scripts
**Where**: `.git-hooks/pre-commit`
**Enforces**: Day advancement through validation only
**How**: Detects manual changes to CURRENT_DAY line
**Blocks**: Manual progress tracker edits bypassing validation

```bash
# Manual edit
sed -i '' 's/Day: 3/Day: 4/' docs/25_DAY_PROGRESS_TRACKER.md
git commit -m "Advance day"   # ❌ BLOCKED

# Script-based (correct)
npm run validate-day-complete  # ✅ Allowed (validates first)
```

### 4. Auto-Increment with Locking (Fix 2/8)
**What**: Day auto-advances after successful validation
**Where**: `scripts/validate-day-complete.sh`
**Enforces**: Validated completion before advancement
**How**: File locking + atomic updates with rollback
**Features**: Prevents race conditions, cleans markers, handles Day 25

```bash
npm run validate-day-complete
# → Validates build + tests passing
# → Creates lock file (.validation/day-advance.lock)
# → Updates CURRENT_DAY: 3 → 4 (atomic)
# → Removes validation marker
# → Removes lock file
```

### 5. Auto-Run Phase Gates (Fix 6/8)
**What**: Phase validation runs automatically at boundaries
**Where**: `scripts/validate-day-complete.sh`
**Enforces**: Phase requirements before advancing
**How**: Detects Days 8, 15, 20, 23, 25 and runs `validate-phase.sh`
**Blocks**: Advancement without passing phase gate

```bash
# On Day 8 (Phase 1 boundary)
npm run validate-day-complete
# → Auto-runs: validate-phase.sh 1
# → If pass: Creates .validation/phase-1-complete, advances to Day 9
# → If fail: Stays on Day 8, shows errors
```

### 6. Frontend Work Blocking (Fix 5/8)
**What**: All frontend code changes blocked during roadmap
**Where**: `.git-hooks/commit-msg`
**Enforces**: 100% focus on Anchor programs
**How**: Detects frontend file changes, blocks non-docs commits
**Allows**: Only `docs:`, `chore:`, `style:` commits to frontend

```bash
# Frontend code change
git commit -m "feat: Add portfolio feature"   # ❌ BLOCKED

# Frontend docs (allowed)
git commit -m "docs: Update README"   # ✅ Allowed

# Anchor work (allowed)
git commit -m "feat: Day 3 - LMSR math"   # ✅ Allowed
```

### 7. Validation Failure Blocking (Fix 4/8)
**What**: Scripts exit 1 when validation fails
**Where**: `scripts/validate-day.sh`, `scripts/validate-day-complete.sh`
**Enforces**: Cannot proceed with broken code
**How**: Exit codes properly set on all failures
**Blocks**: Marking day complete with failing build/tests

```bash
# Break build
npm run validate-day-complete
# → Build fails
# → exit 1 (blocks)
# → CURRENT_DAY stays same
```

### 8. Time Tracking (Fix 8/8)
**What**: Parse and accumulate time from commits
**Where**: `.git-hooks/commit-msg`, `scripts/validate-day-complete.sh`
**Enforces**: Velocity visibility (non-blocking)
**How**: Parses "Time: Xh", logs to `.validation/time-day-X.log`
**Shows**: Daily totals, efficiency %, overrun warnings

```bash
git commit -m "feat: Day 3 - Work

Time: 2.5h"
# → Logs 2.5h to .validation/time-day-3.log
# → Shows: "Day 3 total: 5.5h / 8h"

npm run validate-day-complete
# → Shows efficiency report: "Estimated: 8h, Actual: 7h, Efficiency: 114%"
```

---

## 📋 Daily Compliance Workflow

### Morning Startup (7 minutes)

**Time**: Every workday at 9:00 AM (or before starting work)

```bash
# 1. Navigate to project (30 sec)
cd /Users/seman/Desktop/zmartV0.69

# 2. Check current day (1 min)
cat docs/25_DAY_ANCHOR_ROADMAP.md | grep "Current Day:"
# Confirm: Am I on Day X?

# 3. Run daily validation (3 min)
npm run validate-day
# This checks:
# - Yesterday complete?
# - Dependencies met?
# - Build passing?
# - Tests passing?

# 4. Review progress (2 min)
npm run roadmap-status
# Shows visual progress tracker

# 5. See today's tasks (30 sec)
npm run next-tasks
# Shows today's 3-5 micro-tasks
```

**Expected Output (Day 1 Example)**:
```
🔍 25-Day Roadmap Validation
============================
📅 Current Day: 1/25
✅ Dependencies: All met (Day 1 has no dependencies)
✅ Build: Passing
✅ Tests: Passing (0 tests - new project)

📋 Today's tasks (Day 1):
1. Initialize Anchor workspace
2. Define GlobalConfig struct
3. Define MarketAccount struct
4. Define UserPosition struct
5. Define FeeAccount struct

⏱️  Estimated time: 8 hours
🚀 Ready to start Day 1
```

### During Work (Every Hour)

**Time**: Every 60 minutes while working

```bash
# Quick status check (30 sec)
npm run next-tasks

# Update progress after completing micro-task (30 sec)
npm run update-progress
```

**When to Commit**:
- After completing each micro-task (hourly commits encouraged)
- At minimum: 2-3 commits per day
- Use day reference in commit message (git hook enforces this)

**Commit Format** (enforced by git hooks):
```
feat: Story 2.1 - Day 1 - Define GlobalConfig struct

Day: 1/25
Story: 2.1
Phase: 1

Changes:
- Added GlobalConfig with 30+ parameters
- Implemented PDA derivation
- Added rent calculation

Testing:
- PDA derivation unit tests passing

Time: 1.5h (actual)
```

### Evening Wrap-Up (10 minutes)

**Time**: End of workday (or when stopping work for the day)

```bash
# 1. Mark completed micro-tasks (2 min)
# Edit docs/25_DAY_ANCHOR_ROADMAP.md
# Check off [x] completed items for today

# 2. Run end-of-day validation (5 min)
npm run validate-day-complete
# This checks:
# - All micro-tasks done?
# - Story file updated?
# - Tests still passing?
# - Ready for tomorrow?

# 3. Update story file (2 min)
# Edit docs/stories/STORY-X.Y.md
# Add implementation notes, challenges, actual time

# 4. Final commit (1 min)
git add .
git commit -m "feat: Story 2.1 - Day 1 - EOD checkpoint"
git push
```

**Expected Output (Day Complete)**:
```
🎉 Day 1 COMPLETE!
=================
✅ All 5 micro-tasks completed
✅ Story file updated
✅ Tests passing (15/15)
✅ Build successful
✅ Commit history: 5 commits today

📊 Progress:
   - Day 1: 100% complete (8h actual vs 8h estimated)
   - Phase 1: 12.5% complete (1/8 days)
   - Overall: 4% complete (1/25 days)

🚀 Tomorrow: Day 2 - LMSR Math Implementation
   Estimated time: 8 hours
   Dependencies: Day 1 complete ✅
```

---

## 🚦 Phase Transition Gates

### What Are Phase Gates?

Phase gates are **Go/No-Go decision points** that prevent advancing to the next phase without completing the current phase.

**5 Phase Gates**:
1. **End of Day 8**: Phase 1 → Phase 2
2. **End of Day 15**: Phase 2 → Phase 3
3. **End of Day 20**: Phase 3 → Phase 4
4. **End of Day 23**: Phase 4 → Phase 5
5. **End of Day 25**: Phase 5 → Production launch

### Phase Gate Workflow

**When**: End of final day in phase (e.g., Day 8 for Phase 1)

```bash
# 1. Run phase validation script
npm run validate-phase 1  # Replace 1 with phase number

# 2. Review validation report
# Script will check ALL phase requirements
# Examples:
# - All instructions implemented?
# - All tests passing?
# - Code coverage ≥95%?
# - Documentation complete?
# - Evidence artifacts present?

# 3. Decision
# ✅ GO: All checks pass → Proceed to next phase
# 🚨 NO-GO: Any check fails → HALT, fix issues
```

**Phase 1 Gate Example** (End of Day 8):

```bash
$ npm run validate-phase 1

🚦 Phase 1 Gate Validation
==========================

Checking Phase 1 requirements...

✅ All 18 instructions implemented
✅ All unit tests passing (147/147)
✅ Test coverage: 96.2% (≥95% required)
✅ Build succeeds (0 errors, 0 warnings)
✅ All story files COMPLETE (STORY-2.1 through STORY-2.8)
✅ No critical bugs
✅ Documentation updated
✅ Deployed to devnet (Program ID: 7xK...)
✅ Smoke tests passing on devnet
✅ IDL generated and copied to frontend

📄 Evidence artifacts verified:
✅ programs/zmart-core/src/lib.rs
✅ programs/zmart-core/src/state.rs
✅ programs/zmart-core/src/utils/lmsr.rs
✅ tests/ (50+ test files)
✅ target/idl/zmart_core.json
✅ Devnet deployment receipt

=====================================
✅ Phase 1 GATE: GO
=====================================

Ready to proceed to Phase 2: SDK & Integration

🎉 Celebrate this milestone!
   - Take a break
   - Update stakeholders
   - Start Phase 2 tomorrow

Next: Day 9 - SDK Foundation & PDA Helpers
```

### What If Phase Gate Fails?

**If ANY requirement is not met**:

```bash
🚨 Phase 1 GATE: NO-GO
======================

Failed requirements:
❌ Test coverage: 89.3% (≥95% required)
❌ Devnet smoke tests: FAILING (2/5 passing)

HALT: Do not proceed to Phase 2

Required actions:
1. Fix failing smoke tests
2. Add unit tests to reach ≥95% coverage
3. Re-run validation: npm run validate-phase 1
4. Document root cause in COMPLIANCE_SYSTEM.md

Estimated fix time: 4-6 hours
Adjust roadmap: Add +1 day buffer
```

**Important**: Phase gates are HARD STOPS. No exceptions without documented approval.

---

## 🚨 Circuit Breakers

Circuit breakers are **automatic halt conditions** that prevent problems from compounding.

### Circuit Breaker #1: Day Overrun

**Trigger**: >16 hours spent on a single day (2 work days)

**Detection**: `validate-day.sh` checks time spent

**Action**:
```bash
🚨 CIRCUIT BREAKER: Day Overrun
================================

You've spent >16h on Day 3
Current time spent: 18 hours

This indicates:
  - Task too complex (break into smaller pieces)
  - Blocked on dependency (escalate)
  - Off-track (return to roadmap)

REQUIRED ACTION:
1. STOP current work immediately
2. Update 25_DAY_ANCHOR_ROADMAP.md:
   - Add deviation note in Day 3 section
   - Explain root cause
   - Document lesson learned
3. Adjust remaining days:
   - Add +1 day buffer to Phase 1
   - Update Phase 1 end date: Day 8 → Day 9
4. Root cause analysis:
   - Was estimate too low?
   - Was complexity underestimated?
   - Were there unexpected blockers?
5. Get approval for adjusted timeline
6. Resume work with updated plan

Do NOT proceed to Day 4 until Day 3 complete.

Exit code: 1 (HALT)
```

**Recovery Procedure**:
1. Document deviation in roadmap
2. Adjust timeline (+1 day buffer recommended)
3. Get stakeholder approval
4. Resume with updated plan

### Circuit Breaker #2: Phase Slippage

**Trigger**: 2+ days behind schedule within a phase

**Example**: Should be on Day 5, actually on Day 3

**Detection**: `validate-phase.sh` checks schedule

**Action**:
```bash
🚨 CIRCUIT BREAKER: Phase Slippage
===================================

Phase 1 is 2+ days behind schedule
Expected: Day 5
Actual: Day 3
Slippage: -2 days

REQUIRED ACTION:
1. HALT new development immediately
2. Root cause analysis (document in COMPLIANCE_SYSTEM.md):
   - What caused the delay?
   - Were estimates accurate?
   - Were there unexpected blockers?
   - Can we catch up or need more time?
3. Choose path forward:
   Option A: Catch up (work overtime)
   Option B: Extend timeline (+2 days)
   Option C: Reduce scope (defer features to v2)
4. Get stakeholder approval for chosen path
5. Update 25_DAY_ANCHOR_ROADMAP.md with new plan
6. Resume with updated timeline

Do NOT advance phases without addressing slippage.

Exit code: 1 (HALT)
```

**Recovery Options**:
- **Catch up**: Work extra hours (not sustainable)
- **Extend**: Add days to timeline (realistic)
- **Reduce scope**: Defer non-critical features (pragmatic)

### Circuit Breaker #3: Test Regression

**Trigger**: Tests passing on Day X, failing on Day X+1

**Detection**: `validate-day.sh` runs tests daily

**Action**:
```bash
🚨 CIRCUIT BREAKER: Test Regression
====================================

Tests were passing on Day 3, now failing on Day 4

Failing tests:
  - LMSR cost calculation test (5 failures)
  - Trade instruction test (2 failures)

This breaks the 'always deployable' principle.

REQUIRED ACTION:
1. HALT new features immediately
2. Fix failing tests before ANY new work
3. Investigate root cause:
   - What changed between Day 3 and Day 4?
   - Did new code break old code?
   - Were tests flaky?
4. Add regression test to prevent recurrence
5. Run full test suite before resuming:
   npm run test -- --coverage
6. Verify all tests green before Day 4 work

Do NOT add new features until tests pass.

Exit code: 1 (HALT)
```

**Prevention**:
- Commit frequently (catch regressions early)
- Run tests before each commit (git hook helps)
- Never ignore failing tests

### Circuit Breaker #4: Scope Creep

**Trigger**: Working on task not in current day's scope

**Detection**: `commit-msg` git hook checks commit message

**Action** (Warning, not hard block):
```bash
⚠️  WARNING: Potential scope creep detected
============================================

Commit message: "feat: Story 2.3 - Day 5 - Add governance module"
Current day: Day 4

"Add governance module" is not in Day 4 scope.
Day 4 scope: Core instructions (initialize, create_market)

Options:
1. Is this catch-up from previous day? (OK)
   - If yes, continue
2. Is this explicitly added to roadmap? (Update roadmap first)
   - Update 25_DAY_ANCHOR_ROADMAP.md
   - Add governance as Day 4 micro-task
   - Then commit
3. Is this scope creep? (Defer to backlog)
   - Do NOT implement now
   - Add to backlog for v2
   - Return to Day 4 scope

Continue with commit? (y/n)
```

**Recovery**:
- If catch-up: Document which day's work this is
- If planned: Update roadmap BEFORE committing
- If scope creep: Defer to backlog, return to scope

---

## 🔄 Recovery Procedures

### When You Fall Behind

**Scenario**: Day 5, but should be on Day 7 (2 days behind)

**Steps**:
1. **Assess severity**:
   - Minor (<1 day): Catch up with overtime
   - Moderate (1-2 days): Add buffer days
   - Severe (>2 days): Reduce scope or extend significantly

2. **Document root cause**:
   ```markdown
   ## Deviation Log Entry

   Date: 2025-11-15
   Day: 5 (Should be on Day 7)
   Slippage: -2 days

   Root Cause:
   - LMSR implementation more complex than estimated
   - Fixed-point math required research
   - 3 days spent on LMSR instead of 1 day

   Recovery Plan:
   - Option B: Extend timeline +2 days
   - Phase 1 end: Day 8 → Day 10
   - Total roadmap: 25 → 27 days

   Approval: [Stakeholder name/date]

   Lesson Learned:
   - Underestimated complexity of Rust fixed-point math
   - Future: Research dependencies before estimation
   ```

3. **Update roadmap**:
   - Adjust all subsequent day numbers
   - Update phase end dates
   - Recalculate overall timeline

4. **Get approval**: Document and communicate

5. **Resume**: Follow updated plan

### When Tests Keep Failing

**Scenario**: Day 6, tests failing for 4 hours, can't proceed

**Steps**:
1. **STOP new work**: Focus 100% on fixing tests

2. **Debug systematically**:
   ```bash
   # Isolate failing test
   anchor test -- --test trade_instruction

   # Add debug logging
   # Bisect git history if needed
   git bisect start
   git bisect bad HEAD
   git bisect good Day_5_final_commit
   ```

3. **Ask for help**: After 2 hours of no progress
   - Post in Anchor Discord
   - Review similar examples
   - Consult documentation

4. **Document solution**: When fixed
   ```markdown
   ## Problem Solved: Test Failures on Day 6

   Symptom: Trade instruction test failing with "Slippage exceeded"

   Root Cause: Off-by-one error in slippage calculation
   - Using <= instead of <
   - Edge case: exactly max_cost caused rejection

   Solution: Changed comparison operator
   - Before: require!(cost <= max_cost)
   - After: require!(cost < max_cost)

   Prevention: Add edge case tests for boundary conditions

   Time lost: 4 hours
   Lesson: Always test boundaries (min, max, exactly)
   ```

### When Scope Creeps

**Scenario**: Day 8, tempted to add "just one more feature"

**Steps**:
1. **STOP**: Recognize scope creep

2. **Evaluate**:
   - Is this feature in original roadmap? (No → scope creep)
   - Is it critical for MVP? (No → v2 feature)
   - Will it delay launch? (Yes → definitely defer)

3. **Defer**:
   ```markdown
   ## Deferred Feature: User Reputation System

   Description: Karma points for good predictions

   Why deferred:
   - Not in original 25-day scope
   - Not critical for MVP launch
   - Would add 3-4 days to timeline

   Deferred to: v2 (post-launch)

   Priority: Medium
   Ticket: #123
   ```

4. **Stay focused**: Return to roadmap

---

## 📊 Progress Monitoring

### Auto-Generated Progress Tracker

**Location**: [25_DAY_PROGRESS_TRACKER.md](./25_DAY_PROGRESS_TRACKER.md)

**Updated**: After every commit (via post-commit hook)

**Contents**:
- Daily completion status
- Phase progress bars
- Efficiency metrics
- Warnings and blockers
- Next 3 days preview

**Example**:
```markdown
# 25-Day Progress Tracker (Auto-Generated)

Last Updated: 2025-11-10 14:35:22
Current Day: 5/25
Status: On Track ✅

## Daily Completion Status

Day 1:  ✅ COMPLETE (7h actual vs 8h estimated, +12% efficiency)
Day 2:  ✅ COMPLETE (9h actual vs 8h estimated, -12% efficiency)
Day 3:  ✅ COMPLETE (8h actual vs 8h estimated, +0% efficiency)
Day 4:  ✅ COMPLETE (6h actual vs 8h estimated, +25% efficiency)
Day 5:  🔄 IN PROGRESS (4h spent, 4h remaining)
Day 6:  ⏳ PENDING
...
Day 25: ⏳ PENDING

## Phase Status

Phase 1: Days 1-8  [###########         ] 56% (4.5/8 complete)
Phase 2: Days 9-15 [                    ] 0% (0/7 complete)
Phase 3: Days 16-20[                    ] 0% (0/5 complete)
Phase 4: Days 21-23[                    ] 0% (0/3 complete)
Phase 5: Days 24-25[                    ] 0% (0/2 complete)

## Efficiency Metrics

Average: +6% faster than estimated
Trend: Stable
Quality: All tests passing (97/97)
Velocity: 1.1 days per calendar day

## Warnings

✅ No warnings - on track!

## Next 3 Days Preview

Day 5: LMSR Validation (4h remaining)
  - Cross-validate Rust vs TypeScript
  - 10,000 test cases

Day 6: Trade Instruction (Part 2)
  - Slippage protection
  - Comprehensive testing

Day 7: Resolution Instructions
  - resolve_market
  - claim_winnings
```

### Manual Checks

**Weekly Review** (Every Sunday):

```bash
# Generate weekly report
npm run roadmap-status

# Check key metrics:
# - Days completed vs planned
# - Efficiency trend
# - Quality (test passing rate)
# - Blockers

# Adjust plan if needed
# - Add buffer days if falling behind
# - Reduce scope if severely behind
```

---

## 🛡️ Validation Rules

### Git Hooks Validation

**pre-commit** (runs before commit):
```bash
# Checks:
1. Story file exists for current work
2. Build passes
3. Tests pass
4. No schema drift (if database changes)

# Blocks commit if any check fails
```

**commit-msg** (runs after commit message written):
```bash
# Checks:
1. Commit message has day reference
   Format: "feat: Story X.Y - Day Z - [description]"
2. Day number matches current day (warning only)
3. Story reference exists

# Blocks commit if format invalid
```

**post-commit** (runs after successful commit):
```bash
# Actions:
1. Auto-update 25_DAY_PROGRESS_TRACKER.md
2. Increment micro-task completion count
3. Update efficiency metrics
4. Generate next tasks preview

# No blocking (informational only)
```

### Daily Validation Scripts

**validate-day.sh**:
```bash
# Morning validation
# Checks:
1. Yesterday complete? (if not Day 1)
2. Dependencies met for today?
3. Build passing?
4. Tests passing?
5. Git hooks installed?
6. Story file exists?

# Exit 1 if any fail → Cannot start day
```

**validate-day-complete.sh**:
```bash
# Evening validation
# Checks:
1. All micro-tasks checked off?
2. Story file updated with notes?
3. Tests still passing?
4. Commits made today?
5. Time tracked?

# Exit 1 if not complete → Cannot mark day done
```

**validate-phase.sh**:
```bash
# Phase gate validation
# Checks (phase-specific):
Phase 1:
  - All instructions implemented
  - Tests passing (≥95% coverage)
  - Build succeeds
  - Deployed to devnet
  - IDL generated
Phase 2:
  - SDK complete
  - No MOCKs remaining
  - Integration tests passing
[etc for phases 3-5]

# Exit 1 if any fail → Cannot advance phase
```

### CI/CD Validation

**GitHub Actions** (`.github/workflows/25-day-validation.yml`):
```yaml
# Runs on: every push to feature/* branches

Jobs:
1. Check commit messages have day reference
2. Validate not advancing day without completion
3. Run phase gate if at boundary
4. Verify tests passing
5. Check build succeeds

# Blocks PR merge if validation fails
```

---

## 📖 Deviation Protocol

### When You Need to Deviate

**Scenario**: User requests feature not in roadmap

**Protocol**:

1. **Recognize deviation**:
   ```
   User: "Can you add wallet disconnect handling?"

   You (Claude): "This is not in Day X scope.
                  25_DAY_ANCHOR_ROADMAP.md does not include this.

                  Do you want to:
                  A) Defer to backlog (recommended)
                  B) Add to roadmap (extends timeline)
                  C) Replace existing task (re-prioritize)

                  Please confirm."
   ```

2. **Get explicit approval**:
   ```
   User: "Option B - add to roadmap, we need this"
   ```

3. **Document deviation**:
   ```markdown
   ## Deviation Log Entry

   Date: 2025-11-12
   Day: 8
   Requested By: [User/Stakeholder]

   Deviation: Add wallet disconnect handling

   Original Plan: Deploy to devnet (Day 8)
   New Plan: Add wallet disconnect (Day 8a), Deploy (Day 8b)

   Impact:
   - Timeline: +1 day (25 → 26 days total)
   - Phase 1 end: Day 8 → Day 9
   - All subsequent days shifted +1

   Justification: Critical UX issue, users getting confused

   Approval: User confirmed in chat (2025-11-12 14:30)
   ```

4. **Update roadmap**:
   - Add new micro-tasks
   - Adjust day numbers
   - Update phase dates
   - Recalculate timeline

5. **Resume with updated plan**

### When NOT to Deviate

**Hard Rule**: NO deviations during phase gates

**Example**:
```
Day 8 (Phase 1 gate day)

User: "Can you add feature X?"

You (Claude): "BLOCKED: We are at a phase gate (Day 8).

               Current priority: Complete Phase 1 validation

               Feature X can be added:
               - After Phase 1 gate passes
               - As part of Phase 2 scope
               - Or deferred to v2

               Let's finish Phase 1 first, then discuss."
```

---

## 🎯 Success Criteria

### You're Compliant If:

✅ **Daily**:
- Run validation every morning
- Check off micro-tasks as completed
- Commit with day references
- Update progress tracker

✅ **Weekly**:
- Review roadmap status
- Adjust plan if slipping
- Document deviations
- No critical blockers >2 days

✅ **Phase Gates**:
- Pass all validation checks
- Have all evidence artifacts
- Document lessons learned
- Get approval to advance

✅ **Overall**:
- ≥92% days completed on time (23/25)
- All phases completed
- All tests passing
- No critical bugs
- Production ready by Day 25

### You're Non-Compliant If:

🚨 **Red Flags**:
- Skipping daily validation
- Working outside day scope without approval
- Committing without day reference
- Advancing phases without gate approval
- >2 days behind without documented plan
- Ignoring circuit breakers
- Not updating roadmap after deviations

---

## 🔧 Troubleshooting

### Validation Script Failing

**Problem**: `npm run validate-day` exits with error

**Solutions**:
```bash
# Check what failed
npm run validate-day 2>&1 | tail -20

# Common issues:
1. Yesterday not marked complete
   → Update 25_DAY_ANCHOR_ROADMAP.md, mark Day X-1 complete

2. Dependencies not met
   → Check prerequisite tasks, complete them first

3. Build failing
   → Fix build errors: anchor build

4. Tests failing
   → Fix test failures: anchor test
```

### Git Hook Blocking Commit

**Problem**: Cannot commit, hook rejects

**Solutions**:
```bash
# Check hook output
git commit -v  # Shows detailed hook messages

# Common issues:
1. Missing day reference
   → Add "Day X" to commit message

2. Story file missing
   → Create docs/stories/STORY-X.Y.md from template

3. Tests failing
   → Fix tests before committing

# Emergency override (use sparingly)
git commit --no-verify -m "..."
# But then immediately fix the issue and recommit properly
```

### Behind Schedule

**Problem**: Day 10, but should be on Day 12

**Solutions**:
1. **Assess**: How far behind? (2 days)
2. **Cause**: Why? (LMSR took longer than expected)
3. **Options**:
   - Catch up: Work extra hours (not sustainable)
   - Extend: Add +2 days to timeline (realistic)
   - Reduce: Defer non-critical features (pragmatic)
4. **Decide**: Choose option with stakeholder
5. **Document**: Update roadmap and COMPLIANCE_SYSTEM.md
6. **Execute**: Follow updated plan

---

## 📚 Reference Quick Links

### Key Documents:
- [25_DAY_ANCHOR_ROADMAP.md](./25_DAY_ANCHOR_ROADMAP.md) - Master plan
- [25_DAY_PROGRESS_TRACKER.md](./25_DAY_PROGRESS_TRACKER.md) - Live progress
- [TODO_CHECKLIST.md](./TODO_CHECKLIST.md) - Overall project tracking
- [CLAUDE.md](../CLAUDE.md) - Primary directive

### Validation Scripts:
- `npm run validate-day` - Morning check
- `npm run validate-day-complete` - Evening check
- `npm run validate-phase N` - Phase gate check
- `npm run update-progress` - Manual progress update
- `npm run roadmap-status` - View progress
- `npm run next-tasks` - See today's tasks

### Git Hooks:
- `.git-hooks/pre-commit` - Pre-commit validation
- `.git-hooks/commit-msg` - Commit message validation
- `.git-hooks/post-commit` - Auto-update progress

---

## 📝 Maintenance

### Updating This System

**When roadmap changes**:
1. Update [25_DAY_ANCHOR_ROADMAP.md](./25_DAY_ANCHOR_ROADMAP.md)
2. Update this file (COMPLIANCE_SYSTEM.md) if workflow changes
3. Update validation scripts if checks change
4. Test all automation still works
5. Document changes in deviation log

**When adding new circuit breakers**:
1. Define trigger condition
2. Implement in validation script
3. Document in this file
4. Add tests for circuit breaker
5. Communicate to team

---

**Last Updated**: 2025-11-06
**Version**: 1.0.0
**Maintained By**: Development team

---

*Compliance is not optional. Compliance is how we ship on time with quality.*
