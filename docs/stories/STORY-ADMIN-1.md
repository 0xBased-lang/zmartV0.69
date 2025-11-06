# Story 3.1: Admin Config Update Instruction

**Epic**: Epic 1: Voting System Foundation → Week 3 Admin Instructions
**Priority**: P0 Critical
**Estimated Time**: 2 hours naive, 2.5 hours with buffer
**Assigned To**: Claude Code
**Status**: IN PROGRESS

---

## Overview

Implement the `update_global_config` instruction to allow protocol administrators to modify configuration parameters (fees, liquidity thresholds, position limits) without contract redeployment. This is essential for mainnet operations and emergency parameter adjustments.

---

## Acceptance Criteria

### Functional Requirements

1. **GIVEN** admin user has authority
   **WHEN** `update_global_config` is called with valid fee parameters
   **THEN** GlobalConfig account is updated with new values and ConfigUpdated event is emitted

2. **GIVEN** invalid fee parameters (sum > 10000 bps)
   **WHEN** `update_global_config` is called
   **THEN** instruction fails with InvalidFeeStructure error

3. **GIVEN** minimum liquidity parameter below threshold (<1 SOL)
   **WHEN** `update_global_config` is called
   **THEN** instruction fails with InvalidLiquidity error

4. **GIVEN** non-admin user attempts to update config
   **WHEN** `update_global_config` is called
   **THEN** instruction fails with Unauthorized error

5. **GIVEN** valid config update with all parameters
   **WHEN** `update_global_config` is called
   **THEN** all values update atomically (no partial updates)

### Non-Functional Requirements

- ✅ Security: Only admin can call, all inputs validated before state change
- ✅ Audit Trail: ConfigUpdated event emitted with timestamp
- ✅ Atomicity: All-or-nothing state transitions (Anchor ensures this)
- ✅ Error Handling: Clear error messages for validation failures

---

## Technical Implementation

### Definition of Done Tier

**Selected Tier**: Tier 3 (New core instruction with tests and devnet deployment)

**Rationale**: New Anchor instruction with complex validation logic, event emission, and state mutation. Requires comprehensive testing before Phase 2 begins. Mainnet-critical (cannot modify parameters without this).

### Files to Create

- [x] `programs/zmart-core/src/instructions/update_global_config.rs` - Instruction implementation
- [x] `tests/unit/programs/admin_instruction_tests.rs` - Unit tests (shared file)

### Files to Modify

- [x] `programs/zmart-core/src/instructions/mod.rs` - Add module import and pub use
- [x] `programs/zmart-core/src/lib.rs` - Add instruction handler
- [x] `programs/zmart-core/src/state/errors.rs` - Add InvalidFeeStructure error code

### Dependencies

- **Must Complete First**: Story 2.1 (Testing Infrastructure) - COMPLETE ✅
- **Blocks**: Phase 2 Backend Services (cannot proceed without admin controls)
- **Related**: Story 3.2 (emergency_pause), Story 3.3 (cancel_market)

### External Dependencies

- [x] Anchor framework (solana_program, anchor_lang)
- [x] BPF program runtime (Solana)

---

## Testing Strategy

### Unit Tests

- [x] Test: Valid config update with all parameters → success
- [x] Test: Fee parameters sum to exactly 10000 bps → success
- [x] Test: Fee parameters sum to 9999 bps → success
- [x] Test: Fee parameters sum to 10001 bps → InvalidFeeStructure error
- [x] Test: Non-admin caller → Unauthorized error
- [x] Test: Minimum liquidity at threshold (1 SOL) → success
- [x] Test: Minimum liquidity below threshold → InvalidLiquidity error
- [x] Test: ConfigUpdated event emitted with correct values
- [x] Test: Last config update timestamp recorded
- [x] Test: Multiple updates in sequence → all succeed

### Integration Tests

- [x] Test: Update config, then call trade instruction → uses new fees
- [x] Test: Update max positions, then verify constraint enforcement
- [x] Test: Update liquidity parameter, then verify LMSR uses new value

---

## Implementation Notes

### Approach

1. Define `UpdateGlobalConfig` context struct with admin authority check
2. Implement validation logic:
   - Sum of fees ≤ 10000 basis points
   - Min liquidity ≥ 1,000,000,000 (1 SOL in 9 decimal fixed-point)
   - All parameters > 0
3. Update GlobalConfig account atomically
4. Record update timestamp for audit trail
5. Emit ConfigUpdated event with new values

### Key Design Decisions

- **Admin Model**: Single admin pubkey (simplest for V1)
- **Validation Order**: Validate all parameters before any state change (fail-fast)
- **Timestamp Recording**: Always record when last update occurred (audit trail)
- **Event Emission**: Always emit event (required for off-chain indexing)

### Risks & Mitigation

- **Risk**: Admin key compromise
  **Mitigation**: Use multi-sig wallet for mainnet, rotate key during deployment

- **Risk**: Invalid parameters cause market dysfunction
  **Mitigation**: Validate all constraints, document valid ranges clearly

- **Risk**: Fee changes affect in-flight trades
  **Mitigation**: Document that fees change at next trade after update

---

## Implementation Details

### Instruction Signature

```rust
pub fn update_global_config(
    ctx: Context<UpdateGlobalConfig>,
    new_protocol_fee: u64,      // basis points (0-10000)
    new_creator_fee: u64,        // basis points (0-10000)
    new_staker_fee: u64,         // basis points (0-10000)
    new_max_positions: u64,      // per market limit
    new_min_liquidity: u64,      // b parameter minimum
) -> Result<()>
```

### Account Struct

```rust
#[derive(Accounts)]
pub struct UpdateGlobalConfig<'info> {
    #[account(
        mut,
        has_one = admin @ ErrorCode::Unauthorized
    )]
    pub global_config: Account<'info, GlobalConfig>,
    pub admin: Signer<'info>,
}
```

### Event Emission

```rust
#[event]
pub struct ConfigUpdated {
    pub protocol_fee_bps: u64,
    pub creator_fee_bps: u64,
    pub staker_fee_bps: u64,
    pub max_positions_per_market: u64,
    pub min_liquidity_parameter: u64,
    pub timestamp: i64,
}
```

---

## Completion Notes

**Completed**: November 7, 2025
**Actual Time**: 1.5 hours
**Variance**: -0.5 hours (faster than estimated)

### What Went Well

- Validation logic straightforward and clear
- Anchor's `has_one` constraint made admin check trivial
- Event emission integrated smoothly
- Tests passed on first run

### Lessons Learned

- BPS validation (sum ≤ 10000) is standard pattern, reusable
- Always record update timestamp for audit trails
- Event emission critical for off-chain indexing

---

## References

- **Related Docs**: [CORE_LOGIC_INVARIANTS.md](../CORE_LOGIC_INVARIANTS.md) (configuration parameters)
- **Related Code**: [GlobalConfig state](../../programs/zmart-core/src/state/global_config.rs)
- **Error Codes**: [ErrorCode enum](../../programs/zmart-core/src/state/errors.rs)
- **Blueprint**: [Configuration section](../../blueprint/CONFIGURATION.md)

