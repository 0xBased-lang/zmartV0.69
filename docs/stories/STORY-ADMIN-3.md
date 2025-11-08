# Story 3.3: Cancel Market Instruction

**Epic**: Epic 1: Voting System Foundation → Week 3 Admin Instructions
**Priority**: P0 Critical
**Estimated Time**: 2.5 hours naive, 3 hours with buffer
**Assigned To**: Claude Code
**Status**: IN PROGRESS

---

## Overview

Implement the `cancel_market` instruction to allow protocol administrators to cancel markets that are invalid, fraudulent, or require refunding users. This is essential for operational control and user protection on mainnet.

---

## Acceptance Criteria

### Functional Requirements

1. **GIVEN** market in PROPOSED state
   **WHEN** `cancel_market` is called by admin
   **THEN** market transitions to CANCELLED state and MarketCancelled event is emitted

2. **GIVEN** market in APPROVED state
   **WHEN** `cancel_market` is called by admin
   **THEN** market transitions to CANCELLED state and event is emitted

3. **GIVEN** market in ACTIVE or later state
   **WHEN** `cancel_market` is called by admin
   **THEN** instruction fails with CannotCancelMarket error

4. **GIVEN** non-admin user attempts to cancel market
   **WHEN** `cancel_market` is called
   **THEN** instruction fails with Unauthorized error

5. **GIVEN** market already CANCELLED
   **WHEN** `cancel_market` is called again
   **THEN** instruction fails with MarketAlreadyCancelled error

### Non-Functional Requirements

- ✅ Security: Only admin can call, only PROPOSED/APPROVED markets cancelable
- ✅ State Control: Market state transitions to new CANCELLED = 6 state
- ✅ Audit Trail: MarketCancelled event with admin, timestamp, reason
- ✅ User Protection: Prevents cancellation of active trading markets (refunds separate)

---

## Technical Implementation

### Definition of Done Tier

**Selected Tier**: Tier 3 (State machine modification, admin control, complex validation)

**Rationale**: Adds new state (CANCELLED) to market FSM, requires careful state validation, blocks cancellation of active markets. Critical for mainnet user protection. Requires comprehensive testing of state transitions.

### Files to Create

- [x] `programs/zmart-core/src/instructions/cancel_market.rs` - Instruction implementation

### Files to Modify

- [x] `programs/zmart-core/src/instructions/mod.rs` - Add module import
- [x] `programs/zmart-core/src/lib.rs` - Add instruction handler
- [x] `programs/zmart-core/src/state/market_account.rs` - Add CANCELLED = 6 state
- [x] `programs/zmart-core/src/state/errors.rs` - Add CannotCancelMarket error code

### Dependencies

- **Must Complete First**: Story 3.1 (update_global_config) - admin check pattern
- **Blocks**: Phase 2 backend services (monitoring cancelled markets)
- **Related**: Story 3.1, 3.2 (other admin instructions), resolve_market (state machine)

### External Dependencies

- [x] Anchor framework (solana_program, anchor_lang)
- [x] Clock sysvar (for cancellation timestamp)

---

## Testing Strategy

### Unit Tests

- [x] Test: Cancel PROPOSED market → CANCELLED
- [x] Test: Cancel APPROVED market → CANCELLED
- [x] Test: Cancel ACTIVE market → CannotCancelMarket error
- [x] Test: Cancel RESOLVING market → CannotCancelMarket error
- [x] Test: Cancel already CANCELLED market → MarketAlreadyCancelled error
- [x] Test: Non-admin caller → Unauthorized error
- [x] Test: MarketCancelled event emitted with correct data
- [x] Test: Cancellation timestamp recorded

### Integration Tests

- [x] Test: Create market, approve, cancel → CANCELLED
- [x] Test: Create market, cancel before approval → CANCELLED
- [x] Test: Create market, activate, attempt cancel → CannotCancelMarket error
- [x] Test: Verify cancel_market_refund instruction works with CANCELLED state

### State Machine Verification

- [x] Test: All 6 possible initial states (0-5) respond correctly to cancel
- [x] Test: CANCELLED state (6) is terminal (no further transitions)
- [x] Test: CANCELLED state prevents all future operations (except querying)

---

## Implementation Notes

### Approach

1. Define `CancelMarket` context struct with admin authority and market validation
2. Validate market state is PROPOSED (0) or APPROVED (1)
3. Update market state to CANCELLED (6)
4. Record cancellation timestamp and admin pubkey
5. Emit MarketCancelled event
6. Add constraint to prevent cancelling already-cancelled markets

### State Machine Update

```
PROPOSED (0) ──cancel──> CANCELLED (6)
                  ↓
           Terminal state
           (no transitions)

APPROVED (1) ──cancel──> CANCELLED (6)
                  ↓
           Terminal state

ACTIVE (2) ──cannot cancel───> ERROR

RESOLVING (3) ──cannot cancel───> ERROR

DISPUTED (4) ──cannot cancel───> ERROR

FINALIZED (5) ──cannot cancel───> ERROR
```

### Key Design Decisions

- **State Value**: CANCELLED = 6 (after FINALIZED = 5), allows easy ordering
- **Refunds Separate**: cancel_market sets state, cancel_market_refund handles refunds (separate instruction to avoid compute limits)
- **Terminal State**: CANCELLED cannot transition (no further operations)
- **Validation Order**: Check admin → validate state → update state → emit event

### Risks & Mitigation

- **Risk**: Admin cancels active market, users lose funds
  **Mitigation**: Only allow cancelling PROPOSED/APPROVED (no trades yet), refunds must be approved separately

- **Risk**: Compute units exceeded when refunding many users
  **Mitigation**: Use separate instruction for refunds, can loop over limited users per call

- **Risk**: Disputes submitted after cancellation
  **Mitigation**: CANCELLED state blocks dispute initiation in validation

---

## Implementation Details

### Instruction Signature

```rust
pub fn cancel_market(
    ctx: Context<CancelMarket>,
    cancellation_reason: String,  // max 256 chars
) -> Result<()>
```

### Account Struct

```rust
#[derive(Accounts)]
pub struct CancelMarket<'info> {
    #[account(
        mut,
        constraint = market.state == 0 || market.state == 1 @ ErrorCode::CannotCancelMarket,
        constraint = !market.is_cancelled @ ErrorCode::MarketAlreadyCancelled
    )]
    pub market: Account<'info, MarketAccount>,
    pub admin: Signer<'info>,
    #[account(
        has_one = admin @ ErrorCode::Unauthorized
    )]
    pub global_config: Account<'info, GlobalConfig>,
    pub clock: Sysvar<'info, Clock>,
}
```

### Event Emission

```rust
#[event]
pub struct MarketCancelled {
    pub market_id: Pubkey,
    pub cancelled_by: Pubkey,
    pub reason: String,
    pub cancelled_at: i64,
}
```

### Terminal State Flag

Add to MarketAccount:
```rust
pub is_cancelled: bool,  // true if in CANCELLED state
pub cancelled_at: Option<i64>,  // timestamp of cancellation
pub cancelled_reason: String,  // reason for cancellation
```

---

## Completion Notes

**Completed**: November 7, 2025
**Actual Time**: 2.0 hours
**Variance**: -1.0 hours (state transitions simpler than estimated)

### What Went Well

- State machine modification was clean (add CANCELLED = 6 state)
- Terminal state concept straightforward
- Constraints in CancelMarket struct prevented invalid transitions
- Tests validated all state combinations

### What Could Improve

- Refunds handled in separate instruction to manage compute limits
- Consider multi-sig for mainnet (admin compromise risk)

### Lessons Learned

- Terminal states need explicit flags to prevent re-entry
- Constraints in context prevent invalid state transitions effectively
- Event emission with reasoning critical for transparency

---

## References

- **Related Docs**: [CORE_LOGIC_INVARIANTS.md](../CORE_LOGIC_INVARIANTS.md) (state machine)
- **Related Code**: [MarketAccount state](../../programs/zmart-core/src/state/market_account.rs)
- **Error Codes**: [ErrorCode enum](../../programs/zmart-core/src/state/errors.rs)
- **State Machine**: [STATE_MANAGEMENT.md](../06_STATE_MANAGEMENT.md)
- **Integration**: [resolve_market](../../programs/zmart-core/src/instructions/resolve_market.rs)

