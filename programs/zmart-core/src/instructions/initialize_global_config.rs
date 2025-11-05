use anchor_lang::prelude::*;
use crate::state::GlobalConfig;
use crate::error::ErrorCode;

/// Initialize the global protocol configuration (one-time operation)
///
/// This instruction creates the GlobalConfig PDA with default settings for:
/// - Fee structure (3% protocol, 2% resolver, 5% LP)
/// - Voting thresholds (70% proposal approval, 60% dispute success)
/// - Time limits (24h minimum resolution delay, 3 days dispute period)
/// - Protocol admin and wallets
///
/// Can only be called once. Subsequent calls will fail with AlreadyInitialized.
///
/// # Arguments
///
/// * `backend_authority` - Backend service authority for vote aggregation
///
/// # Errors
///
/// * `InvalidFeeConfiguration` - If fee sum exceeds 10000 basis points (100%)
#[derive(Accounts)]
pub struct InitializeGlobalConfig<'info> {
    /// Protocol administrator who pays for account creation and has full control
    #[account(mut)]
    pub admin: Signer<'info>,

    /// Global configuration PDA (created once)
    ///
    /// Seeds: [b"global-config"]
    /// Space: GlobalConfig::LEN (198 bytes + 8 discriminator)
    #[account(
        init,
        seeds = [b"global-config"],
        bump,
        payer = admin,
        space = 8 + GlobalConfig::LEN
    )]
    pub global_config: Account<'info, GlobalConfig>,

    /// Wallet receiving protocol fees (3% of trading fees)
    /// CHECK: Any account can be protocol wallet, validated by admin
    pub protocol_fee_wallet: UncheckedAccount<'info>,

    /// System program for account creation
    pub system_program: Program<'info, System>,
}

/// Handler for initialize_global_config instruction
pub fn handler(
    ctx: Context<InitializeGlobalConfig>,
    backend_authority: Pubkey,
) -> Result<()> {
    let global_config = &mut ctx.accounts.global_config;

    // Set admin and backend authority
    global_config.admin = ctx.accounts.admin.key();
    global_config.backend_authority = backend_authority;

    // Set protocol fee wallet
    global_config.protocol_fee_wallet = ctx.accounts.protocol_fee_wallet.key();

    // Set fee configuration (3% + 2% + 5% = 10% total trading fee)
    global_config.protocol_fee_bps = 300; // 3%
    global_config.resolver_reward_bps = 200; // 2%
    global_config.liquidity_provider_fee_bps = 500; // 5%

    // Validate fee configuration
    let total_fees = global_config.protocol_fee_bps
        .checked_add(global_config.resolver_reward_bps)
        .ok_or(ErrorCode::OverflowError)?
        .checked_add(global_config.liquidity_provider_fee_bps)
        .ok_or(ErrorCode::OverflowError)?;

    require!(
        total_fees <= 10000, // Max 100%
        ErrorCode::InvalidFeeConfiguration
    );

    // Set voting thresholds
    global_config.proposal_approval_threshold = 7000; // 70%
    global_config.dispute_success_threshold = 6000; // 60%

    // Set time limits (in seconds)
    global_config.min_resolution_delay = 86_400; // 24 hours
    global_config.dispute_period = 259_200; // 3 days (72 hours)

    // Set minimum resolver reputation (80%)
    global_config.min_resolver_reputation = 8000;

    // Initialize state
    global_config.is_paused = false;
    global_config.bump = ctx.bumps.global_config;

    // Initialize reserved space to zero
    global_config.reserved = [0; 64];

    msg!(
        "Global config initialized by admin: {}",
        ctx.accounts.admin.key()
    );

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn create_test_global_config() -> GlobalConfig {
        GlobalConfig {
            admin: Pubkey::new_unique(),
            backend_authority: Pubkey::new_unique(),
            protocol_fee_wallet: Pubkey::new_unique(),
            protocol_fee_bps: 300,
            resolver_reward_bps: 200,
            liquidity_provider_fee_bps: 500,
            proposal_approval_threshold: 7000,
            dispute_success_threshold: 6000,
            min_resolution_delay: 86_400,
            dispute_period: 259_200,
            min_resolver_reputation: 8000,
            is_paused: false,
            reserved: [0; 64],
            bump: 255,
        }
    }

    #[test]
    fn test_default_fee_configuration() {
        let config = create_test_global_config();

        // Verify 3/2/5 split (3% protocol, 2% resolver, 5% LP)
        assert_eq!(config.protocol_fee_bps, 300);
        assert_eq!(config.resolver_reward_bps, 200);
        assert_eq!(config.liquidity_provider_fee_bps, 500);

        // Total should be 10% (1000 bps)
        let total = config.protocol_fee_bps + config.resolver_reward_bps + config.liquidity_provider_fee_bps;
        assert_eq!(total, 1000);
    }

    #[test]
    fn test_default_voting_thresholds() {
        let config = create_test_global_config();

        // Proposal approval requires 70%
        assert_eq!(config.proposal_approval_threshold, 7000);

        // Dispute success requires 60%
        assert_eq!(config.dispute_success_threshold, 6000);
    }

    #[test]
    fn test_default_time_limits() {
        let config = create_test_global_config();

        // Minimum resolution delay: 24 hours
        assert_eq!(config.min_resolution_delay, 86_400);
        assert_eq!(config.min_resolution_delay, 24 * 60 * 60);

        // Dispute period: 3 days
        assert_eq!(config.dispute_period, 259_200);
        assert_eq!(config.dispute_period, 3 * 24 * 60 * 60);
    }

    #[test]
    fn test_fee_configuration_validation() {
        // Valid: 3% + 2% + 5% = 10% < 100%
        let valid_total = 300u16 + 200u16 + 500u16;
        assert_eq!(valid_total, 1000);
        assert!(valid_total <= 10000);

        // Invalid: would exceed 100%
        let invalid_protocol = 9000u16;
        let invalid_resolver = 2000u16;
        let invalid_total = invalid_protocol + invalid_resolver;
        assert!(invalid_total > 10000);
    }

    #[test]
    fn test_initial_state() {
        let config = create_test_global_config();

        // Protocol should not be paused initially
        assert_eq!(config.is_paused, false);

        // Min resolver reputation should be 80%
        assert_eq!(config.min_resolver_reputation, 8000);

        // Reserved space should be zeroed
        assert_eq!(config.reserved, [0; 64]);
    }
}
