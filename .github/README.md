# GitHub Actions CI/CD Configuration

This directory contains automated workflows for ZMART v0.69 project.

## 📋 Workflows Overview

### 1. CI Pipeline (`ci.yml`)

**Triggers**: Push to main/develop/feature branches, Pull Requests

**Jobs**:
- ✅ **Validation & Linting** - TypeScript, ESLint, Prettier, Dependency Audit
- ✅ **Rust/Anchor Tests** - Program builds, unit tests, compute unit analysis
- ✅ **Backend Tests** - Node.js tests with coverage reports
- ✅ **Circuit Breaker** - Pattern #3 prevention (systemic issue detection)
- ✅ **Supabase Types** - Database schema sync validation
- ✅ **Build Check** - Frontend production bundle verification
- ✅ **Summary** - Aggregate results of all checks

**Key Features**:
- Uses `pnpm` for all Node.js operations
- Monorepo-aware (separate backend/frontend workflows)
- Intelligent error handling and fallbacks
- Performance metrics tracking

---

### 2. Devnet Deployment (`deploy-devnet.yml`)

**Triggers**:
- Push to `main` branch
- Git tags matching `v*-devnet`
- Manual workflow dispatch

**Jobs**:
- 🚀 **Deploy Programs** - Build and deploy Anchor programs to Solana devnet
- 🚀 **Deploy Backend** - Build and deploy backend services (placeholder)
- 🚀 **Deploy Frontend** - Build and deploy Next.js frontend (placeholder)
- ✅ **Post-Deployment** - Validation and notifications

**Configuration Required**:
```yaml
# GitHub Repository Secrets
SOLANA_DEVNET_DEPLOYER_KEY  # Base58 encoded deployer keypair
DEVNET_API_URL              # Backend API URL for frontend
DISCORD_WEBHOOK_URL         # Optional: Discord notifications
```

**Deployment Artifacts**:
- Program IDs saved to artifacts (90-day retention)
- Deployment metadata (timestamp, commit hash)

---

### 3. PR Quality Checks (`pr-checks.yml`)

**Triggers**: Pull Request opened/synchronized/reopened

**Checks**:
- 📝 **PR Title** - Must reference story (e.g., "feat: Story 3.5 - ...")
- 📊 **PR Size** - Warns on large PRs (>20 files or >500 lines)
- 📄 **PR Description** - Ensures description includes summary and testing
- 🔍 **Commit Quality** - Checks for WIP commits and conventional commits
- 🔄 **Merge Conflicts** - Detects conflicts with base branch
- ✅ **Summary** - Aggregates all check results

**Quality Standards**:
- Required: Title format, no conflicts
- Warning: Large PRs, missing description sections, WIP commits

---

## 🔧 Setup Instructions

### 1. Configure Repository Secrets

Go to: `https://github.com/0xBased-lang/zmartV0.69/settings/secrets/actions`

**Required for Devnet Deployment**:
```bash
# Generate deployer keypair (if you don't have one)
solana-keygen new --outfile deployer-keypair.json

# Get the keypair in base58 format
# Option 1: Manual
cat deployer-keypair.json

# Add as secret: SOLANA_DEVNET_DEPLOYER_KEY
# Name: SOLANA_DEVNET_DEPLOYER_KEY
# Value: [paste entire JSON array]

# Add backend API URL
# Name: DEVNET_API_URL
# Value: https://your-api.example.com (or Railway/Render URL)
```

**Optional Secrets**:
```bash
# Discord notifications
# Name: DISCORD_WEBHOOK_URL
# Value: https://discord.com/api/webhooks/...
```

### 2. Enable GitHub Actions

1. Go to: `https://github.com/0xBased-lang/zmartV0.69/actions`
2. Click "I understand my workflows, go ahead and enable them"
3. Workflows will now run automatically on push/PR

### 3. Configure Deployment Environments

Go to: `https://github.com/0xBased-lang/zmartV0.69/settings/environments`

**Create `devnet` environment**:
- Name: `devnet`
- Protection rules:
  - ✅ Required reviewers: 1 (recommended)
  - ✅ Wait timer: 0 minutes
  - ✅ Deployment branches: Only `main`

### 4. Test Workflows

**Test CI Pipeline**:
```bash
# Make a small change
echo "# Test" >> README.md
git add README.md
git commit -m "test: Trigger CI workflow"
git push origin main

# Check workflow status
gh run list --limit 5
gh run view --log  # View latest run logs
```

**Test PR Checks**:
```bash
# Create feature branch
git checkout -b test/pr-workflow
echo "# Test PR" >> README.md
git add README.md
git commit -m "feat: Story 0.1 - Test PR workflow"
git push origin test/pr-workflow

# Create PR
gh pr create \
  --title "feat: Story 0.1 - Test PR workflow" \
  --body "Testing PR quality checks workflow"

# Check PR status
gh pr checks
```

**Test Devnet Deployment** (manual trigger):
```bash
# Trigger deployment manually
gh workflow run deploy-devnet.yml

# Monitor deployment
gh run watch
```

---

## 📊 Monitoring Workflows

### View Workflow Runs
```bash
# List recent runs
gh run list

# View specific workflow runs
gh run list --workflow=ci.yml
gh run list --workflow=deploy-devnet.yml
gh run list --workflow=pr-checks.yml

# View logs
gh run view <run-id> --log
gh run view --log  # Latest run
```

### Check Workflow Status
```bash
# Overall repository status
gh repo view --web  # Opens GitHub in browser

# Check specific PR
gh pr checks <pr-number>

# Check specific commit
gh run list --commit <commit-sha>
```

### Download Artifacts
```bash
# List artifacts
gh run view <run-id> --log

# Download artifact
gh run download <run-id>
```

---

## 🔄 Workflow Maintenance

### Update Workflows

**Local changes**:
```bash
# Edit workflow files
code .github/workflows/ci.yml

# Commit changes
git add .github/workflows/
git commit -m "ci: Update workflow configuration"
git push origin main
```

**Testing changes**:
- Workflows run automatically on push
- Check logs to verify changes work as expected
- Use `workflow_dispatch` trigger for manual testing

### Common Issues

**Issue: Workflow fails with authentication error**
```
Error: authentication failed
```
**Solution**: Check repository secrets are configured correctly

**Issue: pnpm not found**
```
Error: pnpm: command not found
```
**Solution**: Ensure `pnpm/action-setup@v2` step is included

**Issue: Solana CLI not found**
```
Error: solana: command not found
```
**Solution**: Check Solana installation step in workflow

**Issue: Anchor build fails**
```
Error: anchor: command not found
```
**Solution**: Verify Anchor installation step uses correct version

---

## 📈 Performance Metrics

### CI Pipeline Benchmarks

**Typical run times** (on GitHub Actions):
- Validation & Linting: ~2-3 minutes
- Rust/Anchor Tests: ~5-10 minutes
- Backend Tests: ~2-3 minutes
- Supabase Types: ~3-5 minutes
- Build Check: ~3-5 minutes
- **Total**: ~15-25 minutes

**Optimization tips**:
- Use `actions/cache` for dependencies
- Run jobs in parallel when possible
- Use `pnpm --frozen-lockfile` for faster installs

### Deployment Times

**Devnet deployment**:
- Program build: ~3-5 minutes
- Program deployment: ~1-2 minutes
- Backend deployment: ~2-3 minutes
- Frontend deployment: ~3-5 minutes
- **Total**: ~10-15 minutes

---

## 🔐 Security Best Practices

### Secrets Management
- ✅ Never commit secrets to repository
- ✅ Use GitHub Secrets for sensitive data
- ✅ Rotate deployer keys regularly
- ✅ Use environment-specific secrets (devnet vs mainnet)
- ✅ Limit secret access to specific workflows

### Workflow Security
- ✅ Use pinned action versions (`@v4` not `@latest`)
- ✅ Review third-party actions before use
- ✅ Enable required status checks on protected branches
- ✅ Require PR reviews before merging
- ✅ Use CODEOWNERS for workflow changes

### Deployment Security
- ✅ Use separate deployer keys for devnet/mainnet
- ✅ Require manual approval for mainnet deployments
- ✅ Store mainnet keys in secure vault (AWS Secrets Manager)
- ✅ Enable 2FA on GitHub account
- ✅ Audit deployment logs regularly

---

## 🎯 Next Steps

### Immediate Actions
1. ✅ Configure repository secrets (SOLANA_DEVNET_DEPLOYER_KEY)
2. ✅ Enable GitHub Actions
3. ✅ Create `devnet` environment
4. ✅ Test CI pipeline with small commit
5. ✅ Test PR checks with test branch

### Future Enhancements
- [ ] Add mainnet deployment workflow
- [ ] Configure Discord/Slack notifications
- [ ] Add performance regression tests
- [ ] Set up automated security scanning (Dependabot, Snyk)
- [ ] Create release workflow with changelog generation
- [ ] Add E2E tests to CI pipeline
- [ ] Configure deployment to Vercel/Railway/Render

### Documentation Tasks
- [ ] Document backend deployment process
- [ ] Document frontend deployment process
- [ ] Create runbook for deployment failures
- [ ] Document rollback procedures
- [ ] Create monitoring/alerting guide

---

## 📚 Resources

- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [Anchor Documentation](https://www.anchor-lang.com/)
- [Solana CLI Reference](https://docs.solana.com/cli)
- [pnpm CI/CD](https://pnpm.io/continuous-integration)
- [GitHub CLI](https://cli.github.com/)

---

**Questions?** Check workflow logs first, then review this documentation. For persistent issues, create a GitHub Issue.

**Last Updated**: November 8, 2025
