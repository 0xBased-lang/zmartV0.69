# Vote Aggregator Testing Notes

## Known Issues (Nov 9, 2025)

### proposal.test.ts - Mock Chain Issues

**Issue**: 7 tests failing due to Supabase mock chain breaking when tests override individual mock methods.

**Root Cause**:
- `beforeEach` creates a mock chain object
- Individual tests override methods like `mockSupabase.order.mockResolvedValue()`
- This breaks the chain reference for subsequent calls in the same test

**Affected Tests**:
1. `should skip if already running`
2. `should process empty markets array`
3. `should handle errors gracefully`
4. `should process multiple markets successfully`
5. `should handle concurrent run protection`
6. `should handle market approval workflow end-to-end`
7. `should not call on-chain if threshold not met`

**Passing Tests**: 37/44 (84% pass rate)

**Coverage**:
- `src/services/vote-aggregator/proposal.ts`: 32% (partial coverage)
- Core logic (aggregateVotes, threshold calculations) fully tested ✅

**Fix Approach** (deferred):
1. Option A: Refactor each failing test to not override mock chain methods
2. Option B: Create a more sophisticated mock factory that handles overrides
3. Option C: Use jest.spyOn instead of direct mocks

**Decision**: Move forward with dispute.ts tests, come back to fix these tests later.

**Priority**: Medium (core functionality tested, integration tests failing)

---

## Test Coverage Status

| File | Coverage | Status | Notes |
|------|----------|--------|-------|
| proposal.ts | 32% | 🟡 Partial | Core logic tested, run() integration needs work |
| dispute.ts | 0% | ⏳ Next | Starting now |

---

## Lessons Learned

### Mock Chaining Best Practices

**✅ DO:**
- Create fresh mocks in beforeEach
- Use jest.clearAllMocks() at start of beforeEach
- Set up default behavior that works for most tests

**❌ DON'T:**
- Override mock methods within individual tests (breaks chain)
- Share mock state across tests
- Mix mockReturnValue and mockResolvedValue on same method

### Better Pattern for Individual Test Customization

Instead of:
```typescript
mockSupabase.order.mockResolvedValue({ data: customData, error: null });
```

Use:
```typescript
mockSupabase.order.mockImplementationOnce(() =>
  Promise.resolve({ data: customData, error: null })
);
```

This preserves the chain while customizing behavior for one test.

---

**Next Steps**:
1. Create dispute.ts test suite (using improved mock patterns)
2. Come back to fix proposal.test.ts failing tests
3. Aim for >90% coverage on both files
