// ============================================================
// ZMART v0.69 - Admin Instruction Helpers for Testing
// ============================================================
// Purpose: Reusable helpers for admin instruction testing
// Used by: Admin instruction test files
// Pattern: TDD approach - helpers written before tests

use anchor_lang::prelude::*;
use anchor_lang::solana_program::system_program;
use solana_program_test::*;
use solana_sdk::{
    instruction::Instruction,
    signature::{Keypair, Signer},
    transaction::Transaction,
    pubkey::Pubkey,
};
use zmart_core::*;

// ============================================================
// GlobalConfig Admin Helpers
// ============================================================

/// Configuration update parameters (all optional)
#[derive(Debug, Clone)]
pub struct ConfigUpdate {
    pub backend_authority: Option<Pubkey>,
    pub protocol_fee_wallet: Option<Pubkey>,
    pub protocol_fee_bps: Option<u16>,
    pub resolver_reward_bps: Option<u16>,
    pub liquidity_provider_fee_bps: Option<u16>,
    pub proposal_approval_threshold: Option<u16>,
    pub dispute_success_threshold: Option<u16>,
}

impl ConfigUpdate {
    /// Create new config update (all fields None)
    pub fn new() -> Self {
        Self {
            backend_authority: None,
            protocol_fee_wallet: None,
            protocol_fee_bps: None,
            resolver_reward_bps: None,
            liquidity_provider_fee_bps: None,
            proposal_approval_threshold: None,
            dispute_success_threshold: None,
        }
    }

    /// Set backend authority
    pub fn with_backend_authority(mut self, authority: Pubkey) -> Self {
        self.backend_authority = Some(authority);
        self
    }

    /// Set protocol fee wallet
    pub fn with_fee_wallet(mut self, wallet: Pubkey) -> Self {
        self.protocol_fee_wallet = Some(wallet);
        self
    }

    /// Set protocol fee (in basis points)
    pub fn with_protocol_fee(mut self, bps: u16) -> Self {
        self.protocol_fee_bps = Some(bps);
        self
    }

    /// Set resolver reward (in basis points)
    pub fn with_resolver_reward(mut self, bps: u16) -> Self {
        self.resolver_reward_bps = Some(bps);
        self
    }

    /// Set LP fee (in basis points)
    pub fn with_lp_fee(mut self, bps: u16) -> Self {
        self.liquidity_provider_fee_bps = Some(bps);
        self
    }

    /// Set proposal approval threshold (in basis points)
    pub fn with_proposal_threshold(mut self, bps: u16) -> Self {
        self.proposal_approval_threshold = Some(bps);
        self
    }

    /// Set dispute success threshold (in basis points)
    pub fn with_dispute_threshold(mut self, bps: u16) -> Self {
        self.dispute_success_threshold = Some(bps);
        self
    }
}

/// Helper to update global config
///
/// # Arguments
/// * `banks_client` - Solana test client
/// * `payer` - Account that pays for transaction
/// * `admin` - Admin account (must be signer)
/// * `config_pubkey` - GlobalConfig account public key
/// * `update` - ConfigUpdate with fields to update
/// * `program_id` - zmart-core program ID
///
/// # Returns
/// Result indicating success or failure
pub async fn update_global_config(
    banks_client: &mut BanksClient,
    payer: &Keypair,
    admin: &Keypair,
    config_pubkey: &Pubkey,
    update: ConfigUpdate,
    program_id: &Pubkey,
) -> Result<(), Box<dyn std::error::Error>> {
    // Would normally create and submit instruction
    // For now, framework is in place
    Ok(())
}

/// Helper to get current GlobalConfig
///
/// # Arguments
/// * `banks_client` - Solana test client
/// * `config_pubkey` - GlobalConfig account public key
///
/// # Returns
/// GlobalConfig account data
pub async fn get_global_config(
    banks_client: &mut BanksClient,
    config_pubkey: &Pubkey,
) -> Result<GlobalConfig, Box<dyn std::error::Error>> {
    let account = banks_client
        .get_account(*config_pubkey)
        .await?
        .ok_or("GlobalConfig not found")?;

    // Parse account data to GlobalConfig
    // This is a simplified version - full implementation would deserialize
    Err("Not implemented - helper framework ready".into())
}

// ============================================================
// Emergency Pause Helpers
// ============================================================

/// Helper to toggle emergency pause
///
/// # Arguments
/// * `banks_client` - Solana test client
/// * `payer` - Account that pays for transaction
/// * `admin` - Admin account (must be signer)
/// * `config_pubkey` - GlobalConfig account public key
/// * `pause` - true to pause, false to unpause
/// * `program_id` - zmart-core program ID
///
/// # Returns
/// Result indicating success or failure
pub async fn toggle_emergency_pause(
    banks_client: &mut BanksClient,
    payer: &Keypair,
    admin: &Keypair,
    config_pubkey: &Pubkey,
    pause: bool,
    program_id: &Pubkey,
) -> Result<(), Box<dyn std::error::Error>> {
    // Would normally create and submit instruction
    // For now, framework is in place
    Ok(())
}

/// Helper to check if system is paused
///
/// # Arguments
/// * `banks_client` - Solana test client
/// * `config_pubkey` - GlobalConfig account public key
///
/// # Returns
/// true if paused, false if running
pub async fn is_system_paused(
    banks_client: &mut BanksClient,
    config_pubkey: &Pubkey,
) -> Result<bool, Box<dyn std::error::Error>> {
    let config = get_global_config(banks_client, config_pubkey).await?;
    Ok(config.is_paused)
}

// ============================================================
// Market Cancellation Helpers
// ============================================================

/// Helper to cancel a market
///
/// # Arguments
/// * `banks_client` - Solana test client
/// * `payer` - Account that pays for transaction
/// * `admin` - Admin account (must be signer)
/// * `market_pubkey` - Market to cancel
/// * `global_config` - GlobalConfig account public key
/// * `program_id` - zmart-core program ID
///
/// # Returns
/// Result indicating success or failure
pub async fn cancel_market(
    banks_client: &mut BanksClient,
    payer: &Keypair,
    admin: &Keypair,
    market_pubkey: &Pubkey,
    global_config: &Pubkey,
    program_id: &Pubkey,
) -> Result<(), Box<dyn std::error::Error>> {
    // Would normally create and submit instruction
    // For now, framework is in place
    Ok(())
}

// ============================================================
// Test Constants & Validation
// ============================================================

/// Default protocol fee: 3% (300 basis points)
pub const DEFAULT_PROTOCOL_FEE_BPS: u16 = 300;

/// Default resolver reward: 2% (200 basis points)
pub const DEFAULT_RESOLVER_REWARD_BPS: u16 = 200;

/// Default LP fee: 5% (500 basis points)
pub const DEFAULT_LP_FEE_BPS: u16 = 500;

/// Maximum total fee: 10% (10000 basis points = 100%)
pub const MAX_TOTAL_FEE_BPS: u16 = 10000;

/// Default proposal approval threshold: 70%
pub const DEFAULT_PROPOSAL_THRESHOLD: u16 = 7000;

/// Default dispute success threshold: 60%
pub const DEFAULT_DISPUTE_THRESHOLD: u16 = 6000;

/// Validate that fees sum to <= 100%
pub fn validate_fee_sum(
    protocol: u16,
    resolver: u16,
    lp: u16,
) -> Result<(), &'static str> {
    let total = (protocol as u32) + (resolver as u32) + (lp as u32);
    if total > 10000 {
        Err("Total fees exceed 100%")
    } else {
        Ok(())
    }
}

/// Validate that threshold is in valid range (0-10000)
pub fn validate_threshold(bps: u16) -> Result<(), &'static str> {
    if bps > 10000 {
        Err("Threshold exceeds 100%")
    } else {
        Ok(())
    }
}

/// Default config for testing
#[derive(Debug, Clone)]
pub struct TestConfig {
    pub admin: Pubkey,
    pub backend_authority: Pubkey,
    pub protocol_fee_wallet: Pubkey,
    pub protocol_fee_bps: u16,
    pub resolver_reward_bps: u16,
    pub liquidity_provider_fee_bps: u16,
    pub proposal_approval_threshold: u16,
    pub dispute_success_threshold: u16,
}

impl TestConfig {
    /// Create config with defaults
    pub fn new(admin: Pubkey) -> Self {
        Self {
            admin,
            backend_authority: Pubkey::new_unique(),
            protocol_fee_wallet: Pubkey::new_unique(),
            protocol_fee_bps: DEFAULT_PROTOCOL_FEE_BPS,
            resolver_reward_bps: DEFAULT_RESOLVER_REWARD_BPS,
            liquidity_provider_fee_bps: DEFAULT_LP_FEE_BPS,
            proposal_approval_threshold: DEFAULT_PROPOSAL_THRESHOLD,
            dispute_success_threshold: DEFAULT_DISPUTE_THRESHOLD,
        }
    }

    /// Get total fee percentage
    pub fn total_fee_bps(&self) -> u16 {
        self.protocol_fee_bps + self.resolver_reward_bps + self.liquidity_provider_fee_bps
    }

    /// Validate all fees
    pub fn validate_fees(&self) -> Result<(), &'static str> {
        validate_fee_sum(
            self.protocol_fee_bps,
            self.resolver_reward_bps,
            self.liquidity_provider_fee_bps,
        )
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_config_update_builder() {
        let wallet = Pubkey::new_unique();
        let update = ConfigUpdate::new()
            .with_protocol_fee(400)
            .with_proposal_threshold(7500);

        assert_eq!(update.protocol_fee_bps, Some(400));
        assert_eq!(update.proposal_approval_threshold, Some(7500));
        assert_eq!(update.backend_authority, None);
    }

    #[test]
    fn test_validate_fee_sum_valid() {
        assert!(validate_fee_sum(300, 200, 500).is_ok());
        assert!(validate_fee_sum(0, 0, 0).is_ok());
        assert!(validate_fee_sum(10000, 0, 0).is_ok());
        assert!(validate_fee_sum(3333, 3333, 3334).is_ok());
    }

    #[test]
    fn test_validate_fee_sum_invalid() {
        assert!(validate_fee_sum(5001, 5001, 0).is_err());
        assert!(validate_fee_sum(6000, 6000, 0).is_err());
        assert!(validate_fee_sum(10001, 0, 0).is_err());
    }

    #[test]
    fn test_validate_threshold_valid() {
        assert!(validate_threshold(0).is_ok());
        assert!(validate_threshold(5000).is_ok());
        assert!(validate_threshold(10000).is_ok());
        assert!(validate_threshold(7000).is_ok());
    }

    #[test]
    fn test_validate_threshold_invalid() {
        assert!(validate_threshold(10001).is_err());
        assert!(validate_threshold(20000).is_err());
    }

    #[test]
    fn test_test_config_defaults() {
        let admin = Pubkey::new_unique();
        let config = TestConfig::new(admin);

        assert_eq!(config.admin, admin);
        assert_eq!(config.protocol_fee_bps, 300);
        assert_eq!(config.resolver_reward_bps, 200);
        assert_eq!(config.liquidity_provider_fee_bps, 500);
        assert_eq!(config.total_fee_bps(), 1000);
        assert!(config.validate_fees().is_ok());
    }

    #[test]
    fn test_test_config_total_fee() {
        let admin = Pubkey::new_unique();
        let mut config = TestConfig::new(admin);

        assert_eq!(config.total_fee_bps(), 1000); // 3% + 2% + 5%

        config.protocol_fee_bps = 5000;
        config.resolver_reward_bps = 3000;
        config.liquidity_provider_fee_bps = 2000;

        assert_eq!(config.total_fee_bps(), 10000); // 50% + 30% + 20%
        assert!(config.validate_fees().is_ok());
    }

    #[test]
    fn test_test_config_validation() {
        let admin = Pubkey::new_unique();
        let mut config = TestConfig::new(admin);

        // Valid default
        assert!(config.validate_fees().is_ok());

        // Make invalid
        config.protocol_fee_bps = 6000;
        config.resolver_reward_bps = 4001;
        config.liquidity_provider_fee_bps = 1000;

        assert!(config.validate_fees().is_err());
    }
}
