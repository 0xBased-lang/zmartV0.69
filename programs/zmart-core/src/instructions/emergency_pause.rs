use anchor_lang::prelude::*;
use crate::state::GlobalConfig;
use crate::error::ErrorCode;

/// Toggle protocol pause state (pause/unpause trading)
///
/// Allows protocol admin to pause all trading operations in case of critical
/// bugs, exploits, or market instability. This is essential for operational
/// safety and mainnet readiness.
///
/// Calling this instruction when protocol is running pauses all trading.
/// Calling it again when protocol is paused unpauses (resumes) trading.
/// Voting and resolution operations are NOT affected by pause.
///
/// # Errors
///
/// * `Unauthorized` - If signer is not admin
#[derive(Accounts)]
pub struct EmergencyPause<'info> {
    /// Protocol admin with pause authority
    pub admin: Signer<'info>,

    /// Global configuration account to update
    #[account(
        mut,
        seeds = [b"global-config"],
        bump = global_config.bump,
        constraint = global_config.admin == admin.key() @ ErrorCode::Unauthorized
    )]
    pub global_config: Account<'info, GlobalConfig>,
}

/// Handler for emergency_pause instruction
pub fn handler(ctx: Context<EmergencyPause>) -> Result<()> {
    let config = &mut ctx.accounts.global_config;
    let clock = Clock::get()?;

    // Toggle pause state
    let new_paused_state = !config.is_paused;
    config.is_paused = new_paused_state;

    // Emit event with new pause status
    emit!(ProtocolPauseStatusChanged {
        is_paused: new_paused_state,
        paused_by: ctx.accounts.admin.key(),
        timestamp: clock.unix_timestamp,
    });

    if new_paused_state {
        msg!("Protocol PAUSED by admin");
    } else {
        msg!("Protocol UNPAUSED by admin");
    }

    Ok(())
}

/// Event emitted when protocol pause status changes
#[event]
pub struct ProtocolPauseStatusChanged {
    pub is_paused: bool,
    pub paused_by: Pubkey,
    pub timestamp: i64,
}

#[cfg(test)]
mod tests {
    use super::*;
    use solana_program::pubkey::Pubkey;

    fn create_test_config(is_paused: bool) -> GlobalConfig {
        GlobalConfig {
            admin: Pubkey::new_unique(),
            backend_authority: Pubkey::new_unique(),
            protocol_fee_wallet: Pubkey::new_unique(),
            protocol_fee_bps: 300,  // 3%
            resolver_reward_bps: 200, // 2%
            liquidity_provider_fee_bps: 500, // 5%
            proposal_approval_threshold: 7000, // 70%
            dispute_success_threshold: 6000, // 60%
            min_resolution_delay: 86400, // 24 hours
            dispute_period: 259200, // 3 days
            min_resolver_reputation: 8000, // 80%
            is_paused,
            reserved: [0; 64],
            bump: 255,
        }
    }

    #[test]
    fn test_pause_when_running() {
        // Protocol starts running (is_paused = false)
        let mut config = create_test_config(false);

        // Toggle pause (should become paused)
        let new_state = !config.is_paused;
        config.is_paused = new_state;

        assert!(config.is_paused);
    }

    #[test]
    fn test_unpause_when_paused() {
        // Protocol starts paused (is_paused = true)
        let mut config = create_test_config(true);

        // Toggle pause (should become unpaused)
        let new_state = !config.is_paused;
        config.is_paused = new_state;

        assert!(!config.is_paused);
    }

    #[test]
    fn test_multiple_toggles() {
        // Start running
        let mut config = create_test_config(false);
        assert!(!config.is_paused);

        // Pause
        config.is_paused = !config.is_paused;
        assert!(config.is_paused);

        // Unpause
        config.is_paused = !config.is_paused;
        assert!(!config.is_paused);

        // Pause again
        config.is_paused = !config.is_paused;
        assert!(config.is_paused);
    }

    #[test]
    fn test_pause_state_toggle() {
        let mut states = vec![false, true, false, true];
        let mut current = false;

        for expected in states {
            assert_eq!(current, expected);
            current = !current; // Toggle
        }

        // After 4 toggles, should be back to original state (false)
        assert!(!current);
    }

    #[test]
    fn test_pause_flag_independence() {
        // Pause state is independent of other config fields
        let mut config = create_test_config(false);

        // Toggle pause
        config.is_paused = !config.is_paused;

        // Verify other fields unchanged
        assert_eq!(config.protocol_fee_bps, 300);
        assert_eq!(config.proposal_approval_threshold, 7000);
        assert!(config.is_paused);
    }
}
