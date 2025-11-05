use anchor_lang::prelude::*;
use crate::error::ErrorCode;

/// Global configuration for the ZMART protocol
///
/// This account stores protocol-wide settings including fee percentages,
/// voting thresholds, time limits, and admin controls.
///
/// PDA Seeds: ["global_config"]
/// Size: 198 bytes (8 discriminator + 190 data)
#[account]
pub struct GlobalConfig {
    /// Protocol admin (can update parameters)
    pub admin: Pubkey,

    /// Backend authority (can aggregate votes, trigger auto-resolution)
    pub backend_authority: Pubkey,

    /// Protocol fee wallet (receives 3% trading fees by default)
    pub protocol_fee_wallet: Pubkey,

    /// Fee percentages in basis points (100 = 1%, 10000 = 100%)
    /// Default: 300 (3%)
    pub protocol_fee_bps: u16,

    /// Resolver reward in basis points
    /// Default: 200 (2%)
    pub resolver_reward_bps: u16,

    /// Liquidity provider fee in basis points
    /// Default: 500 (5%)
    pub liquidity_provider_fee_bps: u16,

    /// Proposal approval threshold in basis points
    /// Default: 7000 (70%)
    pub proposal_approval_threshold: u16,

    /// Dispute success threshold in basis points
    /// Default: 6000 (60%)
    pub dispute_success_threshold: u16,

    /// Minimum delay before resolution can be finalized (in seconds)
    /// Default: 86400 (24 hours)
    pub min_resolution_delay: i64,

    /// Dispute period duration (in seconds)
    /// Default: 259200 (3 days)
    pub dispute_period: i64,

    /// Minimum reputation score required to be a resolver (in basis points)
    /// Default: 8000 (80%)
    pub min_resolver_reputation: u16,

    /// Emergency pause flag (stops all trading and state transitions)
    pub is_paused: bool,

    /// Reserved space for future upgrades (64 bytes)
    pub reserved: [u8; 64],

    /// Bump seed for PDA derivation
    pub bump: u8,
}

impl GlobalConfig {
    /// Calculate exact account size
    ///
    /// Layout:
    /// - Discriminator: 8 bytes (Anchor)
    /// - admin: 32 bytes (Pubkey)
    /// - backend_authority: 32 bytes (Pubkey)
    /// - protocol_fee_wallet: 32 bytes (Pubkey)
    /// - protocol_fee_bps: 2 bytes (u16)
    /// - resolver_reward_bps: 2 bytes (u16)
    /// - liquidity_provider_fee_bps: 2 bytes (u16)
    /// - proposal_approval_threshold: 2 bytes (u16)
    /// - dispute_success_threshold: 2 bytes (u16)
    /// - min_resolution_delay: 8 bytes (i64)
    /// - dispute_period: 8 bytes (i64)
    /// - min_resolver_reputation: 2 bytes (u16)
    /// - is_paused: 1 byte (bool)
    /// - reserved: 64 bytes ([u8; 64])
    /// - bump: 1 byte (u8)
    ///
    /// Total: 8 + 32 + 32 + 32 + 2 + 2 + 2 + 2 + 2 + 8 + 8 + 2 + 1 + 64 + 1 = 198 bytes
    pub const LEN: usize = 8      // discriminator
        + 32                      // admin
        + 32                      // backend_authority
        + 32                      // protocol_fee_wallet
        + 2                       // protocol_fee_bps
        + 2                       // resolver_reward_bps
        + 2                       // liquidity_provider_fee_bps
        + 2                       // proposal_approval_threshold
        + 2                       // dispute_success_threshold
        + 8                       // min_resolution_delay
        + 8                       // dispute_period
        + 2                       // min_resolver_reputation
        + 1                       // is_paused
        + 64                      // reserved
        + 1;                      // bump

    /// Validate configuration invariants
    ///
    /// Checks:
    /// - Total fees ≤ 100% (10000 basis points)
    /// - All thresholds ≤ 100% (10000 basis points)
    /// - All time limits are positive
    pub fn validate(&self) -> Result<()> {
        // Fee distribution must sum to ≤ 100%
        let total_fee = self
            .protocol_fee_bps
            .checked_add(self.resolver_reward_bps)
            .and_then(|sum| sum.checked_add(self.liquidity_provider_fee_bps))
            .ok_or(ErrorCode::OverflowError)?;

        require!(
            total_fee <= 10000,
            ErrorCode::InvalidFeeConfiguration
        );

        // Thresholds must be ≤ 100%
        require!(
            self.proposal_approval_threshold <= 10000,
            ErrorCode::InvalidThreshold
        );
        require!(
            self.dispute_success_threshold <= 10000,
            ErrorCode::InvalidThreshold
        );

        // Reputation threshold must be ≤ 100%
        require!(
            self.min_resolver_reputation <= 10000,
            ErrorCode::InvalidThreshold
        );

        // Time limits must be positive
        require!(
            self.min_resolution_delay > 0,
            ErrorCode::InvalidTimeLimit
        );
        require!(
            self.dispute_period > 0,
            ErrorCode::InvalidTimeLimit
        );

        Ok(())
    }

    /// Get total fee percentage in basis points
    pub fn total_fee_bps(&self) -> Result<u16> {
        self.protocol_fee_bps
            .checked_add(self.resolver_reward_bps)
            .and_then(|sum| sum.checked_add(self.liquidity_provider_fee_bps))
            .ok_or_else(|| ErrorCode::OverflowError.into())
    }

    /// Calculate fee split for a given amount
    ///
    /// Returns: (protocol_fee, resolver_fee, lp_fee)
    pub fn calculate_fees(&self, amount: u64) -> Result<(u64, u64, u64)> {
        let protocol_fee = self.calculate_fee(amount, self.protocol_fee_bps)?;
        let resolver_fee = self.calculate_fee(amount, self.resolver_reward_bps)?;
        let lp_fee = self.calculate_fee(amount, self.liquidity_provider_fee_bps)?;

        Ok((protocol_fee, resolver_fee, lp_fee))
    }

    /// Calculate fee for a specific basis points
    fn calculate_fee(&self, amount: u64, bps: u16) -> Result<u64> {
        let fee = (amount as u128)
            .checked_mul(bps as u128)
            .ok_or(ErrorCode::OverflowError)?
            .checked_div(10000)
            .ok_or(ErrorCode::DivisionByZero)?;

        Ok(fee as u64)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_global_config_size() {
        // Verify calculated size matches actual struct size
        assert_eq!(GlobalConfig::LEN, 198);
    }

    #[test]
    fn test_fee_validation() {
        let mut config = create_test_config();

        // Valid configuration (3% + 2% + 5% = 10%)
        assert!(config.validate().is_ok());

        // Invalid: total fees exceed 100%
        config.protocol_fee_bps = 5000; // 50%
        config.resolver_reward_bps = 3000; // 30%
        config.liquidity_provider_fee_bps = 3000; // 30% (total = 110%)
        assert!(config.validate().is_err());
    }

    #[test]
    fn test_threshold_validation() {
        let mut config = create_test_config();

        // Valid threshold
        config.proposal_approval_threshold = 10000; // 100%
        assert!(config.validate().is_ok());

        // Invalid threshold (exceeds 100%)
        config.proposal_approval_threshold = 10001;
        assert!(config.validate().is_err());
    }

    #[test]
    fn test_time_limit_validation() {
        let mut config = create_test_config();

        // Valid time limits
        assert!(config.validate().is_ok());

        // Invalid: zero resolution delay
        config.min_resolution_delay = 0;
        assert!(config.validate().is_err());

        // Invalid: negative resolution delay
        config.min_resolution_delay = -1;
        assert!(config.validate().is_err());
    }

    #[test]
    fn test_fee_calculation() {
        let config = create_test_config();

        // Calculate fees for 1000 SOL (1_000_000_000_000 lamports)
        let amount = 1_000_000_000_000u64;
        let (protocol, resolver, lp) = config.calculate_fees(amount).unwrap();

        // 3% = 30_000_000_000 lamports
        assert_eq!(protocol, 30_000_000_000);
        // 2% = 20_000_000_000 lamports
        assert_eq!(resolver, 20_000_000_000);
        // 5% = 50_000_000_000 lamports
        assert_eq!(lp, 50_000_000_000);

        // Total = 10%
        assert_eq!(protocol + resolver + lp, 100_000_000_000);
    }

    #[test]
    fn test_total_fee_bps() {
        let config = create_test_config();
        assert_eq!(config.total_fee_bps().unwrap(), 1000); // 3% + 2% + 5% = 10%
    }

    // Helper function to create test configuration
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
}
