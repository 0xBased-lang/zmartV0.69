# Development Workflow - GitHub Flow

**Git Strategy**: GitHub Flow (simple, effective, team-friendly)
**Pattern Prevention**: Addresses Pattern #1 (Methodology Abandonment) from lessons-learned

---

## Git Strategy: GitHub Flow

### Why GitHub Flow?

**Chosen over alternatives** for simplicity and effectiveness:
- ✅ Simpler than GitFlow (no develop branch complexity)
- ✅ Clear workflow: feature branch → PR review → merge to main
- ✅ Integrates perfectly with GitHub Actions and CodeRabbit
- ✅ Enforces review process automatically
- ✅ Works well for solo developers AND teams

### Branch Structure

**Main Branches**:
- `main` - Production-ready code, always deployable, protected

**Temporary Branches**:
- `feature/story-X-Y-description` - Feature development (e.g., `feature/story-3-5-betting-interface`)
- `bugfix/story-X-Y-description` - Bug fixes (e.g., `bugfix/story-3-5-typescript-error`)
- `hotfix/description` - Emergency production fixes (e.g., `hotfix/security-rls-policy`)

### Branch Protection Rules

**For `main` branch** (configure in GitHub settings):
- ✅ Require pull request before merging
- ✅ Require 1 approval (team) or 0 approvals (solo, but still create PRs for history)
- ✅ Require status checks to pass (CI/CD)
- ✅ Require branches to be up to date before merging
- ✅ Dismiss stale PR approvals when new commits pushed

---

## Development Workflow Steps

### 1. Start New Work

```bash
# Update main branch
git checkout main
git pull origin main

# Create feature branch (use story number!)
git checkout -b feature/story-3-5-betting-interface

# Verify branch
git branch --show-current
```

### 2. Make Changes (Story-First Development)

```bash
# 1. Create/update story file FIRST
cp docs/stories/STORY-TEMPLATE.md docs/stories/STORY-3.5.md
# Fill out story file with acceptance criteria, DoD tier, etc.

# 2. Implement feature
# Edit files, write code, write tests...

# 3. Test locally
npm run build  # Or: anchor build
npm test

# 4. Commit with story reference (ENFORCED by git hook)
git add .
git commit -m "feat: Story 3.5 - Add betting interface component"
# ✅ Git hook validates story reference

# 5. Continue until feature complete
# Multiple commits OK, all should reference same story
```

### 3. Create Pull Request

```bash
# Push branch to GitHub
git push origin feature/story-3-5-betting-interface

# Create PR via GitHub UI or CLI
gh pr create --title "feat: Story 3.5 - Add betting interface" \
  --body "$(cat <<'EOF'
## Summary
Implements betting interface allowing users to buy YES/NO shares.

## Changes
- Added BettingInterface component
- Integrated with LMSR calculation hooks
- Added unit tests and E2E test

## Definition of Done
- [x] Tier 3 checklist complete (see docs/DEFINITION_OF_DONE.md)
- [x] Story file updated: docs/stories/STORY-3.5.md

## Testing
- Unit tests: 95% coverage
- E2E test: user-can-place-bet.spec.ts
- Tested in Chrome, Firefox

## Screenshots
[Attach screenshots if UI work]

Closes: Story 3.5
EOF
)"
```

### 4. Review Process

**Automated Reviews**:
1. **CI/CD Pipeline** runs automatically (see `.github/workflows/ci.yml`)
   - TypeScript compilation
   - ESLint
   - Tests
   - Build verification
   - Circuit breaker check

2. **CodeRabbit** reviews code automatically
   - Security analysis
   - Best practices
   - Code quality suggestions

**Human Review** (if team size >1):
- Reviewer checks Definition of Done tier used correctly
- Reviewer verifies story file updated
- Reviewer tests feature if necessary
- Approval required before merge

### 5. Merge to Main

```bash
# After approval, merge via GitHub (Squash and Merge recommended)
# Or via CLI:
gh pr merge --squash --delete-branch

# Main branch auto-deploys to devnet (see .github/workflows/deploy-devnet.yml)
```

---

## Commit Message Convention (Conventional Commits)

### Format

```
<type>: Story X.Y - <description>

[optional body]

[optional footer]
```

### Types

| Type | Use For | Story Required? |
|------|---------|-----------------|
| `feat:` | New features | ✅ YES (enforced by git hook) |
| `fix:` | Bug fixes | ✅ YES (enforced by git hook) |
| `refactor:` | Code refactoring | ✅ YES (enforced by git hook) |
| `docs:` | Documentation only | ❌ No |
| `chore:` | Dependencies, config | ❌ No |
| `ci:` | CI/CD changes | ❌ No |
| `test:` | Test changes only | ❌ No |
| `style:` | Formatting (no logic change) | ❌ No |

### Examples

```bash
# ✅ GOOD - Feature with story reference
feat: Story 3.5 - Add betting interface component

# ✅ GOOD - Fix with story reference
fix: Story 3.5 - Resolve TypeScript compilation error

# ✅ GOOD - Refactor with story reference
refactor: Story 2.8 - Extract LMSR utility functions

# ✅ GOOD - Docs without story (allowed)
docs: Update README with deployment instructions

# ✅ GOOD - Chore without story (allowed)
chore: Update dependencies to latest versions

# ❌ BAD - Feature without story (git hook will reject)
feat: Add betting interface

# ❌ BAD - Fix without story (git hook will reject)
fix: Resolve TypeScript error
```

---

## Story-First Development Workflow

### Creating a Story

```bash
# 1. Copy template
cp docs/stories/STORY-TEMPLATE.md docs/stories/STORY-X.Y.md

# 2. Fill out essential sections
# - Overview (what and why)
# - Acceptance Criteria (GIVEN/WHEN/THEN format)
# - Technical Implementation (files to create/modify)
# - DoD Tier selection (see docs/DEFINITION_OF_DONE.md)
# - Testing Strategy

# 3. Get review (if team size >1)
# Another developer reviews story for clarity

# 4. Commit story file
git add docs/stories/STORY-X.Y.md
git commit -m "docs: Add Story X.Y - [Feature Name]"
git push
```

### Working on a Story

```bash
# 1. Create feature branch
git checkout -b feature/story-X-Y-description

# 2. Reference story in ALL commits
git commit -m "feat: Story X.Y - Implement core functionality"
git commit -m "feat: Story X.Y - Add unit tests"
git commit -m "fix: Story X.Y - Resolve edge case"

# 3. Update story file as you go
# Add implementation notes, challenges, lessons learned

# 4. Mark complete when DoD checklist satisfied
# Update story status to COMPLETED
# Fill completion notes section
```

### Completing a Story

```bash
# 1. Verify Definition of Done (selected tier)
# Review docs/DEFINITION_OF_DONE.md checklist

# 2. Update story file
# - Set status: COMPLETED
# - Fill completion notes (what went well, what didn't, lessons)
# - Document actual time vs estimate

# 3. Update TODO_CHECKLIST.md
# Mark story complete in checklist
# Update phase progress

# 4. Final commit
git commit -m "docs: Story X.Y - Mark complete with notes"

# 5. Create PR and merge
```

---

## Git Hook Installation

### Automatic Installation

```bash
# Copy hook from .git-hooks/ to .git/hooks/
cp .git-hooks/pre-commit .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit

# Verify hook is active
ls -la .git/hooks/pre-commit
```

### What the Hook Does

1. **Enforces story references** for feat/fix/refactor commits with code changes
2. **Allows documentation/chore commits** without story reference
3. **Auto-regenerates Supabase types** when migrations change
4. **Provides helpful error messages** when validation fails

### Testing the Hook

```bash
# Test 1: Should PASS (docs commit, no story needed)
git add README.md
git commit -m "docs: Update README"
# ✅ Passes

# Test 2: Should FAIL (feat commit, no story)
git add src/betting.ts
git commit -m "feat: Add betting feature"
# ❌ ERROR: Must reference story

# Test 3: Should PASS (feat commit with story)
git commit -m "feat: Story 3.5 - Add betting feature"
# ✅ Passes

# Test 4: Should PASS (chore, no story needed)
git add package.json
git commit -m "chore: Update dependencies"
# ✅ Passes
```

### Bypass Hook (NOT RECOMMENDED)

```bash
# Only for emergencies (production hotfixes)
git commit --no-verify -m "hotfix: Critical security patch"
```

---

## Pull Request Requirements

### PR Title Format

```
<type>: Story X.Y - <description>
```

Examples:
- `feat: Story 3.5 - Add betting interface`
- `fix: Story 3.5 - Resolve calculation error`
- `docs: Update deployment guide`

### PR Description Template

```markdown
## Summary
[1-2 sentence description of changes]

## Changes
- [List of key changes]
- [Another change]

## Definition of Done
- [x] Tier X checklist complete (see docs/DEFINITION_OF_DONE.md)
- [x] Story file updated: docs/stories/STORY-X.Y.md

## Testing
- Unit tests: [coverage %]
- E2E tests: [list test files]
- Manual testing: [browsers tested]

## Screenshots (if UI work)
[Attach screenshots]

## Related
Closes: Story X.Y
Depends on: #123 (if applicable)
```

### PR Size Guidelines

| Lines Changed | Review Time | Recommendation |
|---------------|-------------|----------------|
| <100 lines | <15 min | ✅ Ideal size |
| 100-300 lines | 15-30 min | ✅ Good |
| 300-500 lines | 30-60 min | ⚠️ Consider splitting |
| >500 lines | >60 min | 🚨 Split into multiple PRs |

**Pattern #1 Prevention**: Small PRs easier to review, less likely to skip process

---

## Review Process

### Reviewer Checklist

□ PR title follows convention
□ Story file exists and is updated
□ Appropriate DoD tier used and checklist complete
□ All CI/CD checks passing
□ CodeRabbit review addressed
□ Code is readable and maintainable
□ Tests adequate for changes
□ No secrets in code
□ Breaking changes documented

### Approval Requirements

| PR Type | Approvals Required | Notes |
|---------|-------------------|-------|
| **Small PR** (<300 lines) | 1 approval | Or 0 if solo developer |
| **Large PR** (>300 lines) | 2 approvals | Strong recommendation to split |
| **Security/Database** | 2+ approvals | Critical changes need extra review |
| **Docs only** | 0-1 approval | Fast-track if just documentation |

### Max Review Time

- **Target**: 24 hours for review
- **Critical PRs**: 4 hours
- **Docs only**: Same day

**If blocked**: Tag reviewer or discuss in standup

---

## Branch Lifecycle

### Long-Running Branches

```
main (protected)
  └─ Always deployable
  └─ Auto-deploys to devnet on merge
  └─ Manual deploy to mainnet
```

### Feature Branch Lifecycle

```
feature/story-X-Y
  ↓
Create PR
  ↓
Review (automated + human)
  ↓
Approval
  ↓
Squash merge to main
  ↓
Delete feature branch (automatic)
```

**Max feature branch lifetime**: 1 week recommended

**If >1 week**: Consider if story is too large, should be split

---

## Handling Common Scenarios

### Scenario 1: Need to Pull Latest Main

```bash
# Update feature branch with latest main
git checkout main
git pull origin main
git checkout feature/story-X-Y
git rebase main  # Or: git merge main

# Resolve conflicts if any
# Then push
git push --force-with-lease origin feature/story-X-Y
```

### Scenario 2: Story Takes Multiple Days

```bash
# End of day: Push work in progress
git commit -m "feat: Story X.Y - WIP: Core implementation"
git push origin feature/story-X-Y

# Next day: Pull and continue
git pull origin feature/story-X-Y
# Continue work...
```

### Scenario 3: Discovered Another Issue While Working

```bash
# Option A: Create separate story and PR (RECOMMENDED)
# Finish current story first
# Create new story for discovered issue
# New branch, new PR

# Option B: Add to current story (only if closely related)
# Update story file with new scope
# Continue in same branch
```

### Scenario 4: Emergency Hotfix

```bash
# Create hotfix branch from main
git checkout main
git pull origin main
git checkout -b hotfix/security-rls-policy

# Make fix
# ...

# Commit (story reference optional for true emergencies)
git commit -m "hotfix: Fix critical RLS policy vulnerability"

# Create PR, expedited review
gh pr create --title "hotfix: Fix critical RLS policy" --body "Emergency security fix"

# After merge, delete branch
```

---

## Solo Developer Workflow

**Adaptations for solo work**:

✅ **Keep**: Story-first development, commit conventions, git hooks
✅ **Keep**: Create PRs (for history and CodeRabbit review)
⚠️ **Optional**: Human PR approval (0 approvals is fine)
⚠️ **Optional**: Can merge own PRs immediately after CI passes
✅ **Keep**: Circuit breaker checks (prevents crisis mode)

**Why still create PRs as solo developer**:
- Clean git history
- CodeRabbit automated review
- Easy to see what changed per story
- If you add team members later, process already established

---

## Related Documents

- **Story Template**: `docs/stories/STORY-TEMPLATE.md`
- **Definition of Done**: `docs/DEFINITION_OF_DONE.md`
- **Git Hook**: `.git-hooks/pre-commit`
- **CI/CD Pipeline**: `docs/CICD_PIPELINE.md`
- **Lessons Learned**: Pattern #1 (Methodology Abandonment)

---

**Last Updated**: November 5, 2025
**Version**: 1.0 (GitHub Flow)
