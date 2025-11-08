# Story 3.2: Emergency Pause Instruction

**Epic**: Epic 1: Voting System Foundation → Week 3 Admin Instructions
**Priority**: P0 Critical
**Estimated Time**: 2 hours naive, 2.5 hours with buffer
**Assigned To**: Claude Code
**Status**: IN PROGRESS

---

## Overview

Implement the `emergency_pause` instruction to allow protocol administrators to pause all trading operations in case of critical bugs, exploits, or market instability. This is essential for operational safety and mainnet readiness.

---

## Acceptance Criteria

### Functional Requirements

1. **GIVEN** protocol is running normally (is_paused = false)
   **WHEN** `emergency_pause` is called by admin
   **THEN** is_paused is set to true and ProtocolPauseStatusChanged event is emitted

2. **GIVEN** protocol is paused (is_paused = true)
   **WHEN** `emergency_pause` is called by admin
   **THEN** is_paused is set to false (toggle unpauses) and event is emitted

3. **GIVEN** protocol is paused
   **WHEN** any trading instruction (buy_shares, sell_shares) is attempted
   **THEN** instruction fails with ProtocolPaused error

4. **GIVEN** non-admin user attempts to pause protocol
   **WHEN** `emergency_pause` is called
   **THEN** instruction fails with Unauthorized error

5. **GIVEN** pause is toggled multiple times
   **WHEN** each toggle is verified
   **THEN** state transitions are accurate and events are emitted for each toggle

### Non-Functional Requirements

- ✅ Security: Only admin can call, pause blocks all trading instructions
- ✅ Audit Trail: ProtocolPauseStatusChanged event with timestamp for each toggle
- ✅ Performance: Pause check is O(1) read from GlobalConfig
- ✅ Recovery: Admin can unpause with same instruction call (toggle)

---

## Technical Implementation

### Definition of Done Tier

**Selected Tier**: Tier 3 (Critical safety mechanism with integration tests)

**Rationale**: Mainnet-essential safety feature. Must integrate with all trading instructions. Requires comprehensive testing to ensure pause blocks all trading without blocking other operations (voting, resolution).

### Files to Create

- [x] `programs/zmart-core/src/instructions/emergency_pause.rs` - Instruction implementation

### Files to Modify

- [x] `programs/zmart-core/src/instructions/mod.rs` - Add module import
- [x] `programs/zmart-core/src/lib.rs` - Add instruction handler
- [x] `programs/zmart-core/src/instructions/buy_shares.rs` - Add pause check
- [x] `programs/zmart-core/src/instructions/sell_shares.rs` - Add pause check

### Dependencies

- **Must Complete First**: Story 3.1 (update_global_config) - provides GlobalConfig mutation pattern
- **Blocks**: Phase 2 (integration with all trading instructions)
- **Related**: Story 3.3 (cancel_market), voting system (must not pause voting)

### External Dependencies

- [x] Anchor framework (solana_program, anchor_lang)
- [x] Clock sysvar (for pause timestamp)

---

## Testing Strategy

### Unit Tests

- [x] Test: Pause when running → paused
- [x] Test: Unpause when paused → running
- [x] Test: Non-admin caller → Unauthorized error
- [x] Test: Pause timestamp recorded correctly
- [x] Test: ProtocolPauseStatusChanged event emitted with correct status
- [x] Test: Multiple toggles work correctly

### Integration Tests

- [x] Test: buy_shares blocked when paused → ProtocolPaused error
- [x] Test: sell_shares blocked when paused → ProtocolPaused error
- [x] Test: submit_proposal_vote NOT blocked when paused (continue voting)
- [x] Test: resolve_market NOT blocked when paused (finish resolution)
- [x] Test: Emergency pause called, trading blocked, unpause called, trading works

### Manual Testing

- [x] Verify pause blocks trades on devnet
- [x] Verify unpause restores trading on devnet
- [x] Verify events appear in transaction history

---

## Implementation Notes

### Approach

1. Define `EmergencyPause` context struct with admin authority check
2. Implement toggle logic in instruction:
   - Read current is_paused state
   - Toggle to opposite state
   - Record timestamp
   - Emit event
3. Add pause check to buy_shares and sell_shares instructions
4. Ensure pause does NOT block voting or resolution (separate checks)

### Key Design Decisions

- **Toggle Pattern**: Single instruction toggles (pause/unpause), not separate instructions
- **Selective Blocking**: Only block trading, allow voting and resolution to continue
- **Event-Driven**: Always emit event, off-chain services listen for pause/unpause
- **Timestamp Recording**: Record exact moment of pause/unpause for audit trail

### Pause Check Implementation

```rust
// In trading instructions (buy_shares, sell_shares)
let config = &ctx.accounts.global_config;
require!(!config.is_paused, ErrorCode::ProtocolPaused);
```

### Risks & Mitigation

- **Risk**: Admin accidentally pauses protocol
  **Mitigation**: Use multi-sig for mainnet, require confirmation for pause action

- **Risk**: Pause prevents legitimate operations (voting, resolution)
  **Mitigation**: Only block trading, not voting/resolution (tested separately)

- **Risk**: Users panic when protocol is paused
  **Mitigation**: Clear events and off-chain notification system (Phase 2)

---

## Implementation Details

### Instruction Signature

```rust
pub fn emergency_pause(ctx: Context<EmergencyPause>) -> Result<()>
```

### Account Struct

```rust
#[derive(Accounts)]
pub struct EmergencyPause<'info> {
    #[account(
        mut,
        has_one = admin @ ErrorCode::Unauthorized
    )]
    pub global_config: Account<'info, GlobalConfig>,
    pub admin: Signer<'info>,
    pub clock: Sysvar<'info, Clock>,
}
```

### Event Emission

```rust
#[event]
pub struct ProtocolPauseStatusChanged {
    pub is_paused: bool,
    pub paused_by: Pubkey,
    pub timestamp: i64,
}
```

### Integration Pattern

```rust
// In buy_shares, sell_shares, etc.
require!(!ctx.accounts.global_config.is_paused, ErrorCode::ProtocolPaused);
```

---

## Completion Notes

**Completed**: November 7, 2025
**Actual Time**: 1.5 hours
**Variance**: -1.0 hours (simpler than estimated, toggle pattern effective)

### What Went Well

- Toggle pattern simpler than separate pause/unpause instructions
- Selective blocking (trading only) worked cleanly
- Tests validated pause doesn't block voting/resolution
- Integration with buy_shares/sell_shares was straightforward

### Lessons Learned

- Toggle pattern is elegant for on/off admin controls
- Selective blocking requires clear test coverage
- Events critical for monitoring pause/unpause in production

---

## References

- **Related Docs**: [CORE_LOGIC_INVARIANTS.md](../CORE_LOGIC_INVARIANTS.md)
- **Related Code**: [GlobalConfig state](../../programs/zmart-core/src/state/global_config.rs)
- **Error Codes**: [ErrorCode enum](../../programs/zmart-core/src/state/errors.rs)
- **Integration**: [buy_shares](../../programs/zmart-core/src/instructions/buy_shares.rs), [sell_shares](../../programs/zmart-core/src/instructions/sell_shares.rs)

