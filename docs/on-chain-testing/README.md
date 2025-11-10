# ZMART On-Chain Testing Documentation

**Purpose:** Comprehensive documentation of all on-chain testing for the ZMART prediction market platform.
**Goal:** Create a reusable library of test scenarios, results, and debugging guides for future reference.

## Quick Start

1. **🚀 NEW: Run Automated Voting Test:** See [Quick Start Voting Test](./QUICK-START-VOTING-TEST.md) ⭐
2. **📝 Document a Transaction:** Use [Transaction Documentation Template](./TRANSACTION-DOCUMENTATION-TEMPLATE.md) ⭐
3. **🔍 Troubleshoot an Issue:** Search [Issue Resolution Library](../ISSUE-RESOLUTION-LIBRARY.md) ⭐
4. **📊 View System Overview:** Read [Comprehensive Testing System Summary](./COMPREHENSIVE-TESTING-SYSTEM-SUMMARY.md) ⭐
5. **📚 Complete Index:** Navigate [INDEX.md](./INDEX.md) for all documents ⭐
6. **Run a test:** See [Test Scenarios](./01-TEST-SCENARIOS.md)
7. **Debug an issue:** See [Debugging Guide](./04-DEBUGGING-GUIDE.md)
8. **Check performance:** See [Performance Benchmarks](./05-PERFORMANCE-BENCHMARKS.md)
9. **Review history:** See [Test Results](./03-TEST-RESULTS/)

## Documentation Structure

```
docs/on-chain-testing/
├── README.md                                          # You are here
├── INDEX.md                                           # ⭐ NEW: Complete navigation index
├── QUICK-START-VOTING-TEST.md                        # ⭐ NEW: Step-by-step voting test guide
├── TRANSACTION-DOCUMENTATION-TEMPLATE.md             # ⭐ NEW: Standard transaction doc template
├── COMPREHENSIVE-TESTING-SYSTEM-SUMMARY.md           # ⭐ NEW: Complete system overview
├── 01-TEST-SCENARIOS.md                              # All test scenarios with steps
├── 02-TEST-DATA.md                                   # Test wallets, markets, sample data
├── 03-TEST-RESULTS/                                  # Historical test results
│   ├── 2025-11-08/                                  # Daily test run folders
│   │   ├── TEST-{timestamp}.json                    # ⭐ NEW: Automated test results
│   │   ├── program-tests.json
│   │   ├── integration-tests.json
│   │   └── e2e-tests.json
│   └── index.md                                      # Test history navigation
├── 04-DEBUGGING-GUIDE.md                             # Common issues and solutions
├── 05-PERFORMANCE-BENCHMARKS.md                      # Speed, compute units, throughput
└── 06-SECURITY-TESTS.md                             # Attack vectors and security testing

docs/ (root level)
└── ISSUE-RESOLUTION-LIBRARY.md                       # ⭐ NEW: Comprehensive issue knowledge base

backend/scripts/
├── on-chain-test-voting-system.ts                    # ⭐ NEW: Automated voting test script
└── run-voting-test.sh                                # ⭐ NEW: Shell test wrapper
```

## Test Categories

### 1. Program Tests
- **What:** Direct Solana program instruction tests
- **Coverage:** All 18 instructions
- **Location:** `programs/zmart-core/tests/`
- **Results:** `03-TEST-RESULTS/*/program-tests.json`

### 2. Integration Tests
- **What:** Backend services + on-chain program integration
- **Coverage:** Vote aggregation, event indexing, market monitoring
- **Location:** `backend/tests/integration/`
- **Results:** `03-TEST-RESULTS/*/integration-tests.json`

### 3. End-to-End Tests
- **What:** Full user workflows from frontend to blockchain
- **Coverage:** Market creation, trading, voting, resolution, claims
- **Location:** `frontend/tests/e2e/`
- **Results:** `03-TEST-RESULTS/*/e2e-tests.json`

## Test Execution

### Running All Tests
```bash
# Run all on-chain tests with documentation
npm run test:onchain:all

# Run specific category
npm run test:onchain:program
npm run test:onchain:integration
npm run test:onchain:e2e
```

### Documenting Tests
Every test automatically documents:
- Transaction signatures
- Instruction data
- Compute units used
- Success/failure status
- Error messages
- Execution time

### Analyzing Results
```bash
# Generate test report
npm run test:analyze

# Compare test runs
npm run test:compare 2025-11-08 2025-11-09

# Find performance regressions
npm run test:perf-check
```

## Key Metrics Tracked

### Performance Metrics
- **Transaction Time:** Time from submission to confirmation
- **Compute Units:** CUs used per instruction
- **Throughput:** Transactions per second
- **Success Rate:** Percentage of successful transactions

### Coverage Metrics
- **Instruction Coverage:** All 18 instructions tested
- **State Coverage:** All 6 market states tested
- **Edge Cases:** Boundary conditions, error cases
- **Load Testing:** Concurrent users, high volume

### Quality Metrics
- **LMSR Accuracy:** Cost calculations within 0.001%
- **State Transitions:** All transitions validated
- **Fee Distribution:** Correct 3/2/5 split verified
- **Authorization:** All role checks working

## Test Data Management

### Test Wallets
See [02-TEST-DATA.md](./02-TEST-DATA.md#test-wallets) for:
- Authority wallet (program owner)
- Creator wallets (market creators)
- Trader wallets (buyers/sellers)
- Oracle wallet (resolution authority)

### Test Markets
See [02-TEST-DATA.md](./02-TEST-DATA.md#test-markets) for:
- Standard markets (various parameters)
- Edge case markets (min/max values)
- Error case markets (invalid states)

### Test Transactions
All transactions documented with:
- Signature
- Block time
- Instructions
- Logs
- Compute units
- Fee paid

## Debugging Resources

### Common Issues
See [04-DEBUGGING-GUIDE.md](./04-DEBUGGING-GUIDE.md) for:
- Transaction failures
- State transition errors
- LMSR calculation issues
- Authorization problems
- Network issues

### Tools
- Solana Explorer links for all transactions
- Log analysis scripts
- State inspection utilities
- Performance profiling tools

## Security Testing

See [06-SECURITY-TESTS.md](./06-SECURITY-TESTS.md) for:
- Reentrancy tests
- Integer overflow tests
- Authorization bypass attempts
- State manipulation tests
- Economic attack scenarios

## Contributing

### Adding New Tests
1. Add scenario to `01-TEST-SCENARIOS.md`
2. Implement test in appropriate category
3. Ensure automatic documentation works
4. Run test and verify results saved
5. Update this README if needed

### Reporting Issues
1. Check `04-DEBUGGING-GUIDE.md` first
2. Search existing test results for similar issues
3. Create detailed issue with:
   - Test scenario
   - Transaction signature
   - Error message
   - Expected vs actual behavior

## Best Practices

### Test Design
- **Isolated:** Each test should be independent
- **Repeatable:** Same inputs → same outputs
- **Documented:** Clear purpose and steps
- **Fast:** Optimize for quick feedback

### Documentation
- **Automatic:** Use test documenter utilities
- **Comprehensive:** Include all relevant data
- **Searchable:** Use consistent naming
- **Versioned:** Track changes over time

## Quick Links

- [Latest Test Results](./03-TEST-RESULTS/index.md)
- [Performance Dashboard](./05-PERFORMANCE-BENCHMARKS.md#dashboard)
- [Security Checklist](./06-SECURITY-TESTS.md#checklist)
- [Debugging Flowchart](./04-DEBUGGING-GUIDE.md#flowchart)

---

**Last Updated:** November 8, 2025
**Maintainer:** ZMART Development Team
**Version:** 1.0.0