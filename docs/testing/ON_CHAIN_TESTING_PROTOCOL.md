# On-Chain Testing & Data Collection Protocol

## Philosophy & Purpose

**CRITICAL REQUIREMENT:** During the building, optimizing, and validating phases, we maintain **ultra-detailed tracking** of ALL on-chain mechanics and transactions. This comprehensive data collection is:

- ✅ **Mandatory** during development and optimization
- ✅ **Archivable** after system stabilization
- ✅ **Refinable** to smaller size once patterns are established
- ✅ **Essential** for debugging, pattern recognition, and quality assurance

**Rationale:** When working with real blockchain transactions, having complete historical context enables:
1. Faster debugging (complete state at failure point)
2. Pattern detection (identify recurring issues)
3. Performance optimization (track regression over time)
4. Inconsistency detection (find unexpected behaviors)
5. Long-term quality trends (data-driven decisions)

---

## Mandatory Data Collection (15 Categories)

When running any on-chain test or validation, we **MUST** capture:

### **Network & Communication**
1. **HTTP Traffic** - Every request/response with timing
2. **RPC Calls** - All Solana RPC interactions with parameters
3. **WebSocket Messages** - Real-time data streams (if implemented)

### **Application State**
4. **React Query Cache** - Cache state before/after operations
5. **Wallet State** - Connection status, balance changes, signing events
6. **Browser Storage** - localStorage/sessionStorage snapshots

### **Blockchain State**
7. **On-Chain Snapshots** - Account data before/after transactions
8. **Transaction Details** - Complete tx metadata (compute units, fees, logs)

### **Performance**
9. **Timing Breakdown** - Precise timing for every operation step
10. **Browser Metrics** - Memory, CPU, network performance

### **User Context**
11. **User Actions** - Every interaction with full context
12. **Test Environment** - Complete environment metadata

### **Error Handling**
13. **Enhanced Errors** - Full error context, stack traces, recovery suggestions

### **Analysis**
14. **Before/After Comparison** - Structured state change verification
15. **Historical Trends** - Link to previous runs for regression detection

---

## Data Organization Structure

All test data stored in structured format:

```
test-data/
├── runs/
│   └── {timestamp}/
│       ├── metadata.json              # Run metadata
│       ├── environment.json           # Environment snapshot
│       ├── tests/
│       │   └── {test-name}/
│       │       ├── console-logs.json
│       │       ├── network-traffic.json
│       │       ├── rpc-calls.json
│       │       ├── react-query-cache.json
│       │       ├── wallet-state.json
│       │       ├── on-chain-state.json
│       │       ├── transaction-details.json
│       │       ├── timing-breakdown.json
│       │       ├── performance-metrics.json
│       │       ├── user-actions.json
│       │       ├── errors.json
│       │       ├── comparisons.json
│       │       ├── screenshots/
│       │       └── video.webm
│       └── summary.json
├── analysis/
│   ├── trends/
│   ├── patterns/
│   └── inconsistencies/
└── queries/
```

---

## When to Apply This Protocol

### **MANDATORY (Current Phase - Building/Optimizing/Validating)**
- ✅ All E2E tests with real blockchain transactions
- ✅ Integration tests involving on-chain state
- ✅ Performance benchmarking
- ✅ Bug reproduction
- ✅ Feature validation before deployment
- ✅ Any testing on devnet with real transactions
- ✅ Manual testing of critical flows
- ✅ Security audit test runs

### **OPTIONAL (Future - After Stabilization)**
- ⚠️ Smoke tests on stable features
- ⚠️ Regression tests on unchanged code
- ⚠️ CI/CD quick validation

### **ARCHIVE CANDIDATES (Post-Launch)**
Once the system is stable and patterns are well-understood, historical data can be:
- Compressed and archived (keep last 30 days full detail)
- Aggregated into trends (monthly summaries)
- Reduced to critical metrics only (error rates, performance)

---

## Running Tests with Full Tracking

All test commands automatically enable comprehensive tracking:

```bash
# Run E2E tests with full tracking (default)
pnpm test:e2e:real

# All data automatically saved to test-data/{timestamp}/
```

**No special flags required** - comprehensive tracking is the default during development phase.

---

## Querying Collected Data

Analysis scripts for exploring test data:

```bash
# Find all failed transactions
pnpm run analyze:failures --since "7 days ago"

# Performance trends
pnpm run analyze:performance --metric transactionTime

# Find state inconsistencies
pnpm run analyze:inconsistencies --type balanceMismatch

# Generate detailed report for specific run
pnpm run analyze:report --run {timestamp}

# Search console logs
pnpm run analyze:logs --search "Transaction failed" --run {timestamp}

# Compare two test runs
pnpm run analyze:compare {run1} {run2}

# Weekly trend analysis
pnpm run analyze:trends --days 7
```

---

## Data Retention Policy

**During Development (Current Phase):**
- Keep ALL data for 90 days
- Archive anything older (compressed)
- No automatic deletion
- Review weekly for patterns

**After Stabilization (Future):**
- Keep full detail for 30 days
- Keep aggregated trends indefinitely
- Archive detailed data after 30 days
- Reduce sampling frequency

**Critical Data (Always Keep):**
- Production deployment test runs (tagged)
- Bug reproduction runs (tagged)
- Performance baseline runs (tagged)
- Security audit test runs (tagged)
- Failed test runs (for pattern analysis)

---

## Quick Reference Card

**Running Tests:**
```bash
pnpm test:e2e:real                    # Full suite with tracking
pnpm test:e2e:real:trading            # Trading tests only
pnpm test:e2e:real:validation         # Validation tests
pnpm test:e2e:real:realtime           # Real-time update tests
pnpm test:e2e:real --grep "buy"       # Specific test pattern
pnpm test:e2e:real:ui                 # Interactive debugging mode
```

**Accessing Raw Data:**
```bash
# List all test runs
ls test-data/runs/

# View run summary
cat test-data/runs/{timestamp}/summary.json

# Browse test-specific data
open test-data/runs/{timestamp}/tests/{test-name}/

# View console logs
cat test-data/runs/{timestamp}/tests/{test-name}/console-logs.json

# Check network traffic
cat test-data/runs/{timestamp}/tests/{test-name}/network-traffic.json

# Review screenshots
open test-data/runs/{timestamp}/tests/{test-name}/screenshots/
```

**Analyzing Data:**
```bash
pnpm run analyze:latest               # Analyze most recent run
pnpm run analyze:summary              # Summary of all recent runs
pnpm run analyze:errors               # All errors from recent runs
pnpm run analyze:slow                 # Find slow operations
```

---

## Debugging Workflow with Collected Data

**When Something Goes Wrong:**

1. **Identify the Run**
   - Note the timestamp from test output
   - Or use: `pnpm run analyze:latest`

2. **Check Overview**
   ```bash
   cat test-data/runs/{timestamp}/summary.json
   ```

3. **Find Failed Test**
   ```bash
   ls test-data/runs/{timestamp}/tests/
   cd test-data/runs/{timestamp}/tests/{failed-test}/
   ```

4. **Review Logs**
   ```bash
   # Browser console
   cat console-logs.json | jq '.[] | select(.type=="error")'

   # Network issues
   cat network-traffic.json | jq '.[] | select(.response.status>=400)'

   # RPC problems
   cat rpc-calls.json | jq '.[] | select(.success==false)'
   ```

5. **Check State**
   ```bash
   # React Query cache
   cat react-query-cache.json

   # Wallet state
   cat wallet-state.json

   # On-chain state
   cat on-chain-state.json
   ```

6. **Review Visuals**
   ```bash
   # Screenshots
   open screenshots/

   # Video recording
   open video.webm
   ```

---

## Examples of What This Data Enables

**Debugging Questions:**
- "Show me the exact React Query cache state when test X failed"
- "What was the wallet balance before/after this transaction?"
- "Which RPC call is taking the longest?"
- "What network requests happened before the error?"
- "What was in localStorage when the wallet disconnected?"

**Performance Questions:**
- "Has buy transaction confirmation time increased this week?"
- "What's the 95th percentile transaction time?"
- "Are we making unnecessary RPC calls?"
- "Which operation is the bottleneck?"
- "How does performance vary by time of day?"

**Quality Questions:**
- "Find all cases where balance didn't update correctly"
- "Show me flaky tests (inconsistent pass/fail)"
- "What errors have occurred more than 3 times?"
- "Which tests are slowest on average?"
- "Are we seeing more failures on certain days?"

**Trend Questions:**
- "How has test suite duration changed over time?"
- "Are we getting slower RPC responses?"
- "What's our transaction success rate trend?"
- "Is memory usage increasing over time?"
- "Are error rates going up or down?"

---

## Important Considerations

**Storage Requirements:**
- Each test run: ~100-500 MB (depends on test count)
- 90 days of daily runs: ~9-45 GB
- Ensure adequate disk space
- Clean up manually if needed: `rm -rf test-data/runs/old-timestamp/`

**Performance Impact:**
- Minimal during test execution
- Data saved asynchronously
- No measurable impact on test timing
- Slightly longer startup (environment validation)

**Security:**
- Never commit test data to git (already in .gitignore)
- Sanitize wallet addresses before sharing externally
- Private keys are NEVER logged
- Transaction signatures are public (safe to share)

**Maintenance Tasks:**
- Weekly: Review for anomalies and patterns
- Monthly: Archive old data to free space
- As needed: Clean up incomplete runs from crashes
- Quarterly: Evaluate if tracking can be reduced

---

## Transition Strategy (Future)

**Indicators That Tracking Can Be Reduced:**
1. System has been stable for 30+ consecutive days
2. All major bugs have been resolved
3. Performance baselines are well-established
4. Error patterns are understood
5. Team has consensus on stability

**How to Gradually Reduce Tracking:**
1. Start with reducing retention (90d → 30d)
2. Keep only critical metrics (errors, key performance indicators)
3. Sample tests instead of tracking all tests (e.g., 1 in 10)
4. Move detailed logs to archive storage
5. Keep aggregated trends indefinitely

**What to Always Keep:**
- Error rates and types
- Transaction success rates
- Key performance metrics (p50, p95, p99)
- Production deployment validation runs
- Critical bug reproduction data

**This protocol can be revisited and refined as the project matures. The goal is maximum insight during development, transitioning to efficient monitoring in production.**

---

## Why This Matters

During the current **building, optimizing, and validating phase**, we are:
- Discovering edge cases
- Tuning performance
- Fixing bugs
- Understanding patterns
- Establishing baselines

**Without comprehensive data**, we would:
- Spend hours reproducing issues
- Miss performance regressions
- Lack context for debugging
- Make decisions based on guesses
- Repeat the same mistakes

**With comprehensive data**, we can:
- Debug issues in minutes with full context
- Detect problems before they reach production
- Make data-driven optimization decisions
- Learn from historical patterns
- Continuously improve quality

**The investment in comprehensive tracking during development pays massive dividends in quality, velocity, and confidence.**
