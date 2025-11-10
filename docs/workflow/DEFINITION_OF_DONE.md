# Definition of Done - Tiered Approach

**Purpose**: Prevent bureaucratic overhead while maintaining quality standards
**Pattern Prevention**: Addresses Pattern #3 (Reactive Crisis Loop) from lessons-learned

**Rule**: Match DoD tier to task complexity - not all tasks need 20 criteria!

---

## 🎯 How to Choose DoD Tier

| Task Type | Examples | DoD Tier | Criteria Count |
|-----------|----------|----------|----------------|
| **Trivial** | Typo fixes, comment updates, documentation tweaks | Tier 1 | 3 criteria |
| **Small** | Dependency updates, minor bug fixes, config changes | Tier 2 | 8 criteria |
| **Medium** | New features, database changes, API changes | Tier 3 | 15 criteria |
| **Critical** | Security changes, core system changes, major features | Tier 4 | 20 criteria |

**When in doubt**: Start with higher tier, can downgrade if overkill

---

## ✅ TIER 1: Trivial Changes (3 Criteria)

**Use for**: Documentation updates, typo fixes, comment changes, small refactors

### Checklist
□ Change is accurate and clear
□ No breaking changes introduced
□ Project builds successfully (`npm run build` or `anchor build`)

**Example Tasks**:
- docs: Fix typo in README
- docs: Update environment setup guide
- refactor: Extract utility function (no behavior change)
- chore: Update .gitignore

---

## ✅ TIER 2: Small Changes (8 Criteria)

**Use for**: Dependency updates, minor bug fixes, configuration changes

### Checklist

**Code Quality** (3 criteria):
□ Functional completion - Feature works as specified
□ Tests updated (if tests exist for affected code)
□ Code reviewed and approved (if team size >1)

**Build & Validation** (3 criteria):
□ TypeScript compilation succeeds (strict mode)
□ ESLint passes (zero warnings)
□ Project builds successfully

**Documentation** (2 criteria):
□ No console errors or warnings in browser/terminal
□ README/docs updated (if change affects user-facing behavior)

**Example Tasks**:
- chore: Update dependencies to latest versions
- fix: Resolve minor UI alignment issue
- config: Update Supabase environment variables
- fix: Story 3.5 - Resolve TypeScript error

---

## ✅ TIER 3: Medium Changes (15 Criteria)

**Use for**: New features, database changes, API changes, significant refactors

### Checklist

**Functional Completion** (4 criteria):
□ Feature works as specified in story file
□ User can complete primary workflow end-to-end
□ Edge cases handled (empty state, error state, loading state)
□ Feature works in local development environment

**Code Quality** (4 criteria):
□ TypeScript compilation succeeds (strict mode, zero errors)
□ ESLint passes (zero warnings)
□ Code reviewed and approved by 1+ engineers
□ No console errors or warnings

**Testing** (3 criteria):
□ Unit tests written and passing (if logic-heavy)
□ E2E test for critical path written and passing
□ Tested in 2+ browsers (Chrome, Firefox minimum)

**Production Readiness** (2 criteria):
□ Production build succeeds (`npm run build`)
□ Deployed to staging/Vercel preview and smoke tested

**Documentation** (2 criteria):
□ Story file updated with completion notes
□ README/docs updated (if new features/API changes)

**Example Tasks**:
- feat: Story 3.5 - Add betting interface
- feat: Story 4.2 - Implement dispute voting
- refactor: Story 2.8 - Restructure LMSR calculations
- feat: Story 5.1 - Add market creation wizard

---

## ✅ TIER 4: Production-Grade (20 Criteria)

**Use for**: Major features, security changes, core system changes, database schema changes

### Checklist

**Functional Completion** (4 criteria):
□ Feature works as specified in story file
□ User can complete primary workflow end-to-end
□ All edge cases handled (empty state, error state, loading state)
□ Feature works in local development environment

**Code Quality** (4 criteria):
□ TypeScript compilation succeeds (strict mode, zero errors)
□ ESLint passes (zero warnings)
□ Code reviewed and approved by 1+ engineers (2+ for critical changes)
□ No console errors or warnings

**Testing** (4 criteria):
□ Unit tests written and passing (95%+ coverage for critical paths)
□ Integration tests pass (if applicable)
□ E2E test for critical path written and passing
□ Tested in 2+ browsers (Chrome, Firefox, Safari recommended)

**Performance** (3 criteria):
□ Page load <3s on 3G network (Lighthouse check)
□ No client-side blocking >50ms
□ Database queries <100ms (use EXPLAIN ANALYZE if DB changes)

**Security** (3 criteria):
□ Input validation implemented (no SQL injection, XSS potential)
□ Authentication/authorization tested with all wallet types
□ RLS policies tested (if database changes)

**Production Readiness** (2 criteria):
□ Production build succeeds (`npm run build`)
□ Deployed to staging/Vercel preview and comprehensively tested
□ No secrets in code (environment variables used)
□ Error handling and structured logging implemented

**Example Tasks**:
- feat: Story 2.1 - Complete LMSR trading engine
- feat: Story 5.3 - Implement market resolution system
- security: Add wallet authentication and RLS policies
- feat: Story 6.1 - Complete dispute resolution workflow

---

## 🚨 Circuit Breaker Rules (Pattern #3 Prevention)

**Trigger**: 3+ different stories being fixed in 24 hours

**Detection**:
```bash
# Count distinct stories in fix commits (last 24h)
DIFFERENT_STORIES=$(git log --since="24 hours ago" --pretty=%s | \
  grep "fix:" | \
  grep -oP 'Story [0-9]+\.[0-9]+' | \
  sort -u | \
  wc -l)

if [ $DIFFERENT_STORIES -ge 3 ]; then
    echo "🚨 CIRCUIT BREAKER ACTIVATED"
    echo "   3+ different stories being fixed = systemic issue"
    echo "   HALT feature work → Root cause analysis required"
    exit 1
fi
```

**When triggered**:
1. STOP all new feature development
2. Schedule mandatory root cause analysis meeting
3. Document systemic issue in `docs/LESSONS_LEARNED.md`
4. Implement prevention (test, validation, etc.)
5. Reset counter and resume work

---

## 📊 Enforcement Strategy

### Manual Enforcement (Team >1)
- PR reviewer verifies appropriate DoD tier used
- Reviewer ensures all criteria checked before approval
- Use story file template which includes DoD tier selection

### Automated Enforcement (CI/CD)
- Git hook checks story file exists for feat/fix commits (see `.git/hooks/pre-commit`)
- CI/CD pipeline validates build success, tests passing
- Vercel preview deployment required before merge
- Circuit breaker in CI/CD detects excessive fix commits

### Solo Developer
- Self-review against checklist (integrity-based)
- Use checklist as quality gate, not bureaucracy
- Still benefits from circuit breaker detection

---

## 🎓 Learning from Lessons Learned

This tiered approach prevents:
- ❌ **Pattern #3**: "Works on my machine" syndrome (comprehensive testing in Tier 3-4)
- ❌ **Bureaucratic overhead**: Trivial changes don't need 20 checks
- ❌ **Process abandonment**: Reasonable overhead means developers follow it
- ❌ **All-night debugging**: Staging validation catches issues early

**Evidence**: Previous Zmart project had NO definition of done → 41% of commits were fixes → all-night debugging sessions

**Goal**: <15% fix commit ratio with sustainable pace

---

## 📖 Related Documents

- **Story Template**: `docs/stories/STORY-TEMPLATE.md` (includes DoD tier selection)
- **Git Workflow**: `docs/DEVELOPMENT_WORKFLOW.md` (commit conventions)
- **Testing Strategy**: `docs/TESTING_STRATEGY.md` (framework details)
- **Lessons Learned**: `/Users/seman/Desktop/Zmart-BMADFULL/LESSONS-LEARNED-ZMART.md` (Pattern #3)

---

**Last Updated**: November 5, 2025
**Version**: 1.0 (Tiered Approach)
