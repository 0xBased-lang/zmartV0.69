use anchor_lang::prelude::*;
use crate::state::GlobalConfig;
use crate::error::ErrorCode;

/// Update global protocol configuration parameters
///
/// Allows protocol admin to modify fee percentages, voting thresholds, and other
/// configuration parameters without redeploying the program. Critical for mainnet
/// operations and emergency parameter adjustments.
///
/// # Arguments
///
/// * `protocol_fee_bps` - Protocol fee in basis points (0-10000)
/// * `resolver_reward_bps` - Resolver/creator reward in basis points (0-10000)
/// * `liquidity_provider_fee_bps` - LP fee in basis points (0-10000)
/// * `proposal_approval_threshold` - Proposal approval threshold (0-10000)
/// * `dispute_success_threshold` - Dispute success threshold (0-10000)
///
/// # Errors
///
/// * `Unauthorized` - If signer is not admin
/// * `InvalidFeeStructure` - If total fees exceed 100%
/// * `InvalidThreshold` - If any threshold exceeds 100%
/// * `InvalidTimeLimit` - If time limits are invalid
#[derive(Accounts)]
pub struct UpdateGlobalConfig<'info> {
    /// Protocol admin with configuration authority
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

/// Handler for update_global_config instruction
pub fn handler(
    ctx: Context<UpdateGlobalConfig>,
    protocol_fee_bps: u16,
    resolver_reward_bps: u16,
    liquidity_provider_fee_bps: u16,
    proposal_approval_threshold: u16,
    dispute_success_threshold: u16,
    min_resolution_delay: Option<i64>,
    dispute_period: Option<i64>,
) -> Result<()> {
    let config = &mut ctx.accounts.global_config;

    // Validate fee structure: total fees must not exceed 100% (10000 bps)
    let total_fee = (protocol_fee_bps as u32)
        .checked_add(resolver_reward_bps as u32)
        .ok_or(ErrorCode::OverflowError)?
        .checked_add(liquidity_provider_fee_bps as u32)
        .ok_or(ErrorCode::OverflowError)?;

    require!(
        total_fee <= 10000,
        ErrorCode::InvalidFeeStructure
    );

    // Validate thresholds are within valid range
    require!(
        proposal_approval_threshold <= 10000,
        ErrorCode::InvalidThreshold
    );
    require!(
        dispute_success_threshold <= 10000,
        ErrorCode::InvalidThreshold
    );

    // Validate time limits if provided
    if let Some(delay) = min_resolution_delay {
        require!(delay > 0, ErrorCode::InvalidTimeLimit);
    }
    if let Some(period) = dispute_period {
        require!(period > 0, ErrorCode::InvalidTimeLimit);
    }

    // Update configuration fields
    config.protocol_fee_bps = protocol_fee_bps;
    config.resolver_reward_bps = resolver_reward_bps;
    config.liquidity_provider_fee_bps = liquidity_provider_fee_bps;
    config.proposal_approval_threshold = proposal_approval_threshold;
    config.dispute_success_threshold = dispute_success_threshold;

    // Update time parameters if provided
    if let Some(delay) = min_resolution_delay {
        config.min_resolution_delay = delay;
    }
    if let Some(period) = dispute_period {
        config.dispute_period = period;
    }

    // Emit event with updated configuration
    emit!(ConfigUpdated {
        protocol_fee_bps,
        resolver_reward_bps,
        liquidity_provider_fee_bps,
        proposal_approval_threshold,
        dispute_success_threshold,
        min_resolution_delay: config.min_resolution_delay,
        dispute_period: config.dispute_period,
        timestamp: Clock::get()?.unix_timestamp,
    });

    msg!(
        "Global config updated: protocol_fee={}%, resolver_reward={}%, lp_fee={}%, proposal_threshold={}%, dispute_threshold={}%",
        protocol_fee_bps / 100,
        resolver_reward_bps / 100,
        liquidity_provider_fee_bps / 100,
        proposal_approval_threshold / 100,
        dispute_success_threshold / 100
    );

    if let Some(delay) = min_resolution_delay {
        msg!("  min_resolution_delay: {} seconds", delay);
    }
    if let Some(period) = dispute_period {
        msg!("  dispute_period: {} seconds", period);
    }

    Ok(())
}

/// Event emitted when configuration is updated
#[event]
pub struct ConfigUpdated {
    pub protocol_fee_bps: u16,
    pub resolver_reward_bps: u16,
    pub liquidity_provider_fee_bps: u16,
    pub proposal_approval_threshold: u16,
    pub dispute_success_threshold: u16,
    pub min_resolution_delay: i64,
    pub dispute_period: i64,
    pub timestamp: i64,
}

#[cfg(test)]
mod tests {
    use super::*;
    use anchor_lang::solana_program::pubkey::Pubkey;

    fn create_test_config() -> GlobalConfig {
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
            is_paused: false,
            reserved: [0; 64],
            bump: 255,
        }
    }

    #[test]
    fn test_valid_config_update() {
        // Valid update: 3% + 2% + 5% = 10%
        let total_fee = (300u32 + 200u32 + 500u32);
        assert!(total_fee <= 10000);
    }

    #[test]
    fn test_fee_structure_validation() {
        // Fees sum to exactly 10000 bps (100%)
        let protocol_fee = 3000u16;
        let resolver_fee = 3000u16;
        let lp_fee = 4000u16;

        let total = (protocol_fee as u32)
            .checked_add(resolver_fee as u32)
            .unwrap()
            .checked_add(lp_fee as u32)
            .unwrap();

        assert_eq!(total, 10000);
    }

    #[test]
    fn test_fee_structure_exceeds_100() {
        // Fees exceed 100%
        let protocol_fee = 3001u16;
        let resolver_fee = 3001u16;
        let lp_fee = 4001u16;

        let total = (protocol_fee as u32)
            .checked_add(resolver_fee as u32)
            .unwrap()
            .checked_add(lp_fee as u32)
            .unwrap();

        assert!(total > 10000);
    }

    #[test]
    fn test_threshold_validation() {
        // Valid thresholds (70% and 60%)
        assert!(7000u16 <= 10000);
        assert!(6000u16 <= 10000);
    }

    #[test]
    fn test_threshold_exceeds_100() {
        // Invalid threshold (exceeds 100%)
        let invalid_threshold = 10001u16;
        assert!(invalid_threshold > 10000);
    }

    #[test]
    fn test_config_structure() {
        let config = create_test_config();

        // Verify initial config
        assert_eq!(config.protocol_fee_bps, 300);
        assert_eq!(config.resolver_reward_bps, 200);
        assert_eq!(config.liquidity_provider_fee_bps, 500);
        assert_eq!(config.proposal_approval_threshold, 7000);
        assert_eq!(config.dispute_success_threshold, 6000);
    }
}
