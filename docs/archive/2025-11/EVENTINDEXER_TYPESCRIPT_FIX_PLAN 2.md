# Event Indexer TypeScript Fix Plan
## 🧠 ULTRATHINK Analysis

**Generated:** 2025-11-07
**Status:** 57 TypeScript compilation errors identified
**Severity:** MEDIUM - All fixable, no architectural changes needed

---

## 📊 Error Classification & Root Cause Analysis

### Category 1: Type Definition Mismatches (35 errors) 🔴 CRITICAL

**Root Cause:** Event type definitions in `types/events.ts` don't match what writers expect.

**Affected Files:**
- `types/events.ts` - Source of truth needs corrections
- `writers/admin-writer.ts` - Expects properties that don't exist
- `writers/vote-writer.ts` - Property name mismatches

**Specific Issues:**

#### Issue 1A: HeliusWebhookPayload is Object, not Array
```typescript
// CURRENT (WRONG):
export interface HeliusWebhookPayload {
  accountData: Array<...>;
  signature: string;
  // ... single transaction
}

// EXPECTED (CORRECT):
export type HeliusWebhookPayload = Array<HeliusTransaction>;

export interface HeliusTransaction {
  accountData: Array<...>;
  signature: string;
  // ... single transaction properties
}
```

**Impact:** 6 errors in `webhook-handler.ts`
- `payload.length` fails (not an array)
- `payload.map()` fails (not an array)
- `payload[0]` fails (not indexable)

**Fix:** Change `HeliusWebhookPayload` to be an array type.

---

#### Issue 1B: ConfigInitializedEvent Missing Properties
```typescript
// CURRENT (types/events.ts):
export interface ConfigInitializedEvent extends BaseEvent {
  type: EventType.CONFIG_INITIALIZED;
  admin: string;                    // ❌ Writer expects 'authority'
  backendAuthority: string;
  protocolFeeWallet: string;
  // ❌ Missing fee percentages
}

// EXPECTED by admin-writer.ts:
{
  authority: string;                 // Not 'admin'
  proposalApprovalThreshold: number;
  minLiquidityRequired: string;
  platformFeePercentage: number;
  creatorFeePercentage: number;
  stakerFeePercentage: number;
}
```

**Impact:** 6 errors in `admin-writer.ts` lines 37-46
- Property 'authority' does not exist
- Property 'proposalApprovalThreshold' does not exist
- Property 'minLiquidityRequired' does not exist
- Property 'platformFeePercentage' does not exist
- Property 'creatorFeePercentage' does not exist
- Property 'stakerFeePercentage' does not exist

**Fix:** Add all config parameters to `ConfigInitializedEvent`.

---

#### Issue 1C: ConfigUpdatedEvent Missing Properties
```typescript
// CURRENT (types/events.ts):
export interface ConfigUpdatedEvent extends BaseEvent {
  type: EventType.CONFIG_UPDATED;
  updatedBy: string;                 // ❌ Writer expects 'authority'
  changes: Record<string, any>;      // ❌ Writer expects specific fields
}

// EXPECTED by admin-writer.ts:
{
  authority: string;                 // Not 'updatedBy'
  field: string;                     // Which config field changed
  oldValue: any;
  newValue: any;
}
```

**Impact:** 3 errors in `admin-writer.ts` lines 97-100
- Property 'authority' does not exist (has 'updatedBy')
- Property 'field' does not exist (has 'changes')
- Property 'oldValue' does not exist
- Property 'newValue' does not exist

**Fix:** Change `ConfigUpdatedEvent` to match writer expectations.

---

#### Issue 1D: EmergencyPauseToggledEvent Missing 'authority'
```typescript
// CURRENT (types/events.ts):
export interface EmergencyPauseToggledEvent extends BaseEvent {
  type: EventType.EMERGENCY_PAUSE_TOGGLED;
  toggledBy: string;                 // ❌ Writer expects 'authority'
  isPaused: boolean;
}

// EXPECTED by admin-writer.ts:
{
  authority: string;                 // Not 'toggledBy'
  isPaused: boolean;
}
```

**Impact:** 1 error in `admin-writer.ts` line 155
- Property 'authority' does not exist (has 'toggledBy')

**Fix:** Rename `toggledBy` to `authority` for consistency.

---

#### Issue 1E: ProposalVoteSubmittedEvent Property Name Mismatches
```typescript
// CURRENT (types/events.ts):
export interface ProposalVoteSubmittedEvent extends BaseEvent {
  type: EventType.PROPOSAL_VOTE_SUBMITTED;
  marketId: string;                  // ❌ Writer expects 'marketAddress'
  user: string;                      // ❌ Writer expects 'voter'
  vote: boolean;
  // ❌ Missing 'weight' property
}

// EXPECTED by vote-writer.ts:
{
  marketAddress: string;             // Not 'marketId'
  voter: string;                     // Not 'user'
  vote: boolean;
  weight: number;                    // Missing entirely
}
```

**Impact:** 6 errors in `vote-writer.ts`
- Property 'marketAddress' does not exist (has 'marketId')
- Property 'voter' does not exist (has 'user')
- Property 'weight' does not exist

**Fix:** Rename properties and add `weight` field.

---

#### Issue 1F: DisputeVoteSubmittedEvent Property Name Mismatches
```typescript
// CURRENT (types/events.ts):
export interface DisputeVoteSubmittedEvent extends BaseEvent {
  type: EventType.DISPUTE_VOTE_SUBMITTED;
  marketId: string;                  // ❌ Writer expects 'marketAddress'
  user: string;                      // ❌ Writer expects 'voter'
  vote: boolean;
  // ❌ Missing 'weight' and 'disputeRound'
}

// EXPECTED by vote-writer.ts:
{
  marketAddress: string;             // Not 'marketId'
  voter: string;                     // Not 'user'
  vote: boolean;
  weight: number;                    // Missing
  disputeRound: number;              // Missing
}
```

**Impact:** 7 errors in `vote-writer.ts`
- Property 'marketAddress' does not exist (has 'marketId')
- Property 'voter' does not exist (has 'user')
- Property 'weight' does not exist
- Property 'disputeRound' does not exist

**Fix:** Rename properties and add missing fields.

---

#### Issue 1G: WriteResult Interface Mismatch
```typescript
// CURRENT (types/events.ts):
export interface WriteResult {
  success: boolean;
  eventType: EventType;
  txSignature: string;
  tablesUpdated: string[];           // ❌ Writers use 'processingTime'
  error?: string;
}

// EXPECTED by all writers:
{
  success: boolean;
  eventType: string;                 // String, not enum
  txSignature: string;
  processingTime: number;            // Not 'tablesUpdated'
  error?: string;
}
```

**Impact:** 8 errors across all writers
- Type mismatch: writers return `eventType: string`, interface expects `EventType`
- Property 'processingTime' doesn't exist in interface

**Fix:** Update `WriteResult` interface to match writer implementations.

---

### Category 2: Missing Method Implementations (4 errors) 🟠 HIGH

**Root Cause:** Methods called in `webhook-handler.ts` don't exist in parser/writer classes.

#### Issue 2A: EventParser Missing parseTransaction()
```typescript
// CALLED BY webhook-handler.ts line 101:
const events = this.eventParser.parseTransaction(transaction);

// BUT parsers/event-parser.ts has NO such method
// Only has individual parse methods:
// - parseMarketProposed()
// - parseMarketApproved()
// etc. (16 methods)
```

**Impact:** 1 error in `webhook-handler.ts` line 101
- Property 'parseTransaction' does not exist on type 'EventParser'

**Fix:** Add `parseTransaction()` method that:
1. Extracts program logs from transaction
2. Identifies event type from log discriminator
3. Calls appropriate parse method
4. Returns array of parsed events

---

#### Issue 2B: VoteEventWriter Missing writeProposalVote()
```typescript
// CALLED BY webhook-handler.ts line 176:
result = await this.voteWriter.writeProposalVote(event);

// BUT writers/vote-writer.ts has:
// - writeProposalVoteSubmitted() ❌ Wrong name
```

**Impact:** 1 error in `webhook-handler.ts` line 176
- Property 'writeProposalVote' does not exist

**Fix:** Either:
- Option A: Rename method to `writeProposalVote()`
- Option B: Update webhook handler to call `writeProposalVoteSubmitted()`

**Recommendation:** Option A (shorter, clearer)

---

#### Issue 2C: VoteEventWriter Missing writeDisputeVote()
```typescript
// CALLED BY webhook-handler.ts line 179:
result = await this.voteWriter.writeDisputeVote(event);

// BUT writers/vote-writer.ts has:
// - writeDisputeVoteSubmitted() ❌ Wrong name
```

**Impact:** 1 error in `webhook-handler.ts` line 179
- Property 'writeDisputeVote' does not exist

**Fix:** Either:
- Option A: Rename method to `writeDisputeVote()`
- Option B: Update webhook handler to call `writeDisputeVoteSubmitted()`

**Recommendation:** Option A (shorter, clearer)

---

### Category 3: Constructor Signature Mismatches (3 errors) 🟡 MEDIUM

**Root Cause:** Writer constructors have inconsistent signatures, but `index.ts` tries to instantiate them uniformly.

```typescript
// index.ts lines 93-96 (WRONG):
this.marketWriter = new MarketEventWriter(this.supabase, this.logger);  // ❌ Takes 1 arg
this.tradeWriter = new TradeEventWriter(this.supabase, this.logger);    // ❌ Takes 1 arg
this.voteWriter = new VoteEventWriter(this.supabase, this.logger);      // ❌ Takes 1 arg

// ACTUAL constructor signatures:
// market-writer.ts line 31:
constructor(private supabase: SupabaseClient) {}                         // 1 arg

// trade-writer.ts line 25:
constructor(private supabase: SupabaseClient) {}                         // 1 arg

// vote-writer.ts line 29:
constructor(private supabase: SupabaseClient<Database>) {}               // 1 arg

// admin-writer.ts line 17:
constructor(private supabase: SupabaseClient, private logger: Logger) {} // 2 args ✅
```

**Impact:** 3 errors in `index.ts` lines 93-95
- Expected 1 arguments, but got 2

**Fix:** Update writer constructors to accept `Logger` as second parameter.

---

### Category 4: Import Issues (1 error) 🟢 LOW

**Root Cause:** Anchor v0.32 doesn't export `borsh` directly.

```typescript
// parsers/event-parser.ts line 14:
import { borsh } from '@coral-xyz/anchor';  // ❌ borsh not exported
```

**Impact:** 1 error in `event-parser.ts` line 14
- Module '"@coral-xyz/anchor"' has no exported member 'borsh'

**Fix:** Either:
- Import from `@coral-xyz/borsh` directly
- Use `@solana/web3.js` for base64 decoding instead
- Remove borsh import (currently unused, just placeholder)

**Recommendation:** Remove import (unused in current implementation)

---

### Category 5: EventParser Constructor Signature (1 error) 🟡 MEDIUM

**Root Cause:** EventParser expects a string, but receives Logger.

```typescript
// index.ts line 90 (WRONG):
this.eventParser = new EventParser(this.logger);  // ❌ Logger, not string

// parsers/event-parser.ts line 12 (needs checking):
constructor(programId: string) {}                 // Expects string
```

**Impact:** 1 error in `index.ts` line 90
- Argument of type 'Logger' is not assignable to parameter of type 'string'

**Fix:** Check EventParser constructor and either:
- Option A: Pass program ID string: `new EventParser(PROGRAM_ID)`
- Option B: Update constructor to accept Logger
- Option C: Accept both: `new EventParser(PROGRAM_ID, this.logger)`

**Recommendation:** Option C (need both program ID and logger)

---

### Category 6: Missing Supabase Database Type Import (1 error) 🟢 LOW

**Root Cause:** VoteEventWriter imports Database type that doesn't exist yet.

```typescript
// vote-writer.ts line 21:
import { Database } from '../../../types/supabase';  // ❌ File doesn't exist
```

**Impact:** 1 error in `vote-writer.ts` line 21
- Cannot find module '../../../types/supabase'

**Fix:** Either:
- Option A: Generate Supabase types: `npx supabase gen types typescript`
- Option B: Remove Database type parameter temporarily
- Option C: Use generic SupabaseClient without type parameter

**Recommendation:** Option C for now (add proper types later)

---

### Category 7: Implicit 'any' Type Parameters (3 errors) 🟢 LOW

**Root Cause:** TypeScript strict mode requires explicit types.

```typescript
// webhook-handler.ts line 66:
payload.map((tx) => ...)         // ❌ tx: any

// webhook-handler.ts line 70-71:
results.filter((r) => ...)       // ❌ r: any

// webhook-handler.ts line 113:
events.map((e) => ...)           // ❌ e: any
```

**Impact:** 3 errors in `webhook-handler.ts`
- Parameter implicitly has an 'any' type

**Fix:** Add explicit types:
```typescript
payload.map((tx: HeliusTransaction) => ...)
results.filter((r: PromiseSettledResult<void>) => ...)
events.map((e: ProgramEvent) => ...)
```

---

## 🎯 Prioritized Fix Plan

### Phase 1: Fix Type Definitions (CRITICAL) ⏱️ 10 min
**Impact:** Fixes 35 errors

1. **Update HeliusWebhookPayload to Array Type**
   - File: `types/events.ts` lines 219-243
   - Change: Make it `type HeliusWebhookPayload = HeliusTransaction[]`
   - Fixes: 6 errors in webhook-handler.ts

2. **Fix ConfigInitializedEvent**
   - File: `types/events.ts` lines 174-179
   - Add: All config parameters (6 properties)
   - Fixes: 6 errors in admin-writer.ts

3. **Fix ConfigUpdatedEvent**
   - File: `types/events.ts` lines 181-185
   - Change: `updatedBy` → `authority`, expand `changes` to specific fields
   - Fixes: 3 errors in admin-writer.ts

4. **Fix EmergencyPauseToggledEvent**
   - File: `types/events.ts` lines 187-191
   - Change: `toggledBy` → `authority`
   - Fixes: 1 error in admin-writer.ts

5. **Fix ProposalVoteSubmittedEvent**
   - File: `types/events.ts` lines 156-161
   - Change: `marketId` → `marketAddress`, `user` → `voter`, add `weight`
   - Fixes: 6 errors in vote-writer.ts

6. **Fix DisputeVoteSubmittedEvent**
   - File: `types/events.ts` lines 163-168
   - Change: `marketId` → `marketAddress`, `user` → `voter`, add `weight`, `disputeRound`
   - Fixes: 7 errors in vote-writer.ts

7. **Fix WriteResult Interface**
   - File: `types/events.ts` lines 249-255
   - Change: `eventType: EventType` → `eventType: string`, `tablesUpdated` → `processingTime: number`
   - Fixes: 8 errors across all writers

---

### Phase 2: Add Missing Methods (HIGH) ⏱️ 15 min
**Impact:** Fixes 4 errors

1. **Add EventParser.parseTransaction()**
   - File: `parsers/event-parser.ts`
   - Method signature:
     ```typescript
     parseTransaction(tx: HeliusTransaction): ProgramEvent[]
     ```
   - Logic:
     - Extract program logs
     - Identify event discriminator (first 8 bytes)
     - Route to appropriate parse method
     - Return array of events
   - Fixes: 1 error in webhook-handler.ts line 101

2. **Rename VoteEventWriter Methods**
   - File: `writers/vote-writer.ts`
   - Change: `writeProposalVoteSubmitted()` → `writeProposalVote()`
   - Change: `writeDisputeVoteSubmitted()` → `writeDisputeVote()`
   - Fixes: 2 errors in webhook-handler.ts lines 176, 179

---

### Phase 3: Fix Constructor Signatures (MEDIUM) ⏱️ 5 min
**Impact:** Fixes 4 errors

1. **Update Writer Constructors to Accept Logger**
   - Files: `market-writer.ts`, `trade-writer.ts`, `vote-writer.ts`
   - Change:
     ```typescript
     constructor(
       private supabase: SupabaseClient,
       private logger: Logger
     ) {}
     ```
   - Fixes: 3 errors in index.ts lines 93-95

2. **Fix EventParser Constructor**
   - File: `parsers/event-parser.ts` (check actual signature)
   - Expected: Accept both program ID and logger
   - Change:
     ```typescript
     constructor(
       private programId: string,
       private logger: Logger
     ) {}
     ```
   - Update index.ts line 90:
     ```typescript
     this.eventParser = new EventParser(PROGRAM_ID, this.logger);
     ```
   - Fixes: 1 error in index.ts line 90

---

### Phase 4: Clean Up Minor Issues (LOW) ⏱️ 5 min
**Impact:** Fixes 5 errors

1. **Remove Unused borsh Import**
   - File: `parsers/event-parser.ts` line 14
   - Action: Delete line (not used anywhere)
   - Fixes: 1 error

2. **Remove Database Type Import**
   - File: `vote-writer.ts` line 21
   - Action: Delete import
   - Change constructor: `SupabaseClient<Database>` → `SupabaseClient`
   - Fixes: 1 error

3. **Add Explicit Type Parameters**
   - File: `webhook-handler.ts` lines 66, 70, 71, 113
   - Action: Add explicit types to arrow functions
   - Fixes: 3 errors

---

## 📋 Execution Checklist

### Pre-Fix Validation
- [x] All 57 errors cataloged and categorized
- [x] Root causes identified for each error
- [x] Fix strategy determined for each category
- [x] Priority order established

### Fix Execution Order
1. [ ] **Phase 1:** Fix `types/events.ts` (7 changes) - 35 errors fixed
2. [ ] **Phase 2:** Add methods to parser/writers (3 changes) - 4 errors fixed
3. [ ] **Phase 3:** Fix constructors (4 changes) - 4 errors fixed
4. [ ] **Phase 4:** Clean up imports/types (3 changes) - 5 errors fixed

### Post-Fix Validation
- [ ] Run `npx tsc --noEmit` - expect 0 errors
- [ ] All imports resolve correctly
- [ ] All method calls have matching implementations
- [ ] All constructors have correct signatures
- [ ] Code compiles successfully

### Integration Validation
- [ ] Event Indexer service initializes without errors
- [ ] Webhook handler can process mock payload
- [ ] All 16 event types have complete flow
- [ ] Database writes execute (test with Supabase)
- [ ] Error handling works correctly

---

## 🚀 Estimated Fix Time

| Phase | Tasks | Errors Fixed | Time | Cumulative |
|-------|-------|--------------|------|------------|
| Phase 1 | 7 type fixes | 35 | 10 min | 10 min |
| Phase 2 | 3 method additions | 4 | 15 min | 25 min |
| Phase 3 | 4 constructor fixes | 4 | 5 min | 30 min |
| Phase 4 | 3 cleanup tasks | 5 | 5 min | 35 min |
| **TOTAL** | **17 changes** | **48 errors** | **35 min** | **35 min** |

**Validation:** +15 minutes
**Total Time:** ~50 minutes to zero errors

---

## 🔍 Success Criteria

**Compilation:**
- ✅ `npx tsc --noEmit` produces zero errors
- ✅ All imports resolve
- ✅ All types match between definitions and usage

**Runtime:**
- ✅ Event Indexer service can initialize
- ✅ Mock webhook can be processed
- ✅ Database writes execute (with mock data)

**Code Quality:**
- ✅ No `any` types used
- ✅ Strict TypeScript mode passes
- ✅ All methods have correct signatures
- ✅ Consistent naming conventions

---

## 📌 Notes for Implementation

**Type Consistency Strategy:**
- Prefer `authority` over `admin`/`updatedBy`/`toggledBy` for consistency
- Use `marketAddress` (not `marketId`) to match on-chain Pubkey fields
- Use `voter` (not `user`) for voting-specific events
- Add `weight` to all voting events (for future vote weight feature)

**Constructor Pattern:**
- All writers should accept: `(supabase: SupabaseClient, logger: Logger)`
- Event parser should accept: `(programId: string, logger: Logger)`
- Consistent error logging across all components

**Error Handling:**
- Preserve try/catch blocks in all writers
- Log errors with full context (event type, tx signature)
- Return `WriteResult` with success/error details

---

**End of Fix Plan** 🎯
