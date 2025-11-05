use anchor_lang::prelude::*;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

// Module declarations
pub mod error;
pub mod instructions;
pub mod math;
pub mod state;

// Re-exports for convenience
pub use error::*;
pub use instructions::*;
pub use math::*;
pub use state::*;

#[program]
pub mod zmart_core {
    use super::*;

    // ============================================================================
    // Lifecycle Instructions (Day 3)
    // ============================================================================

    /// Initialize global protocol configuration (one-time setup)
    ///
    /// Creates the GlobalConfig PDA with default settings for fees, voting
    /// thresholds, and time limits. Can only be called once.
    ///
    /// # Arguments
    ///
    /// * `backend_authority` - Backend service authority for vote aggregation
    pub fn initialize_global_config(
        ctx: Context<InitializeGlobalConfig>,
        backend_authority: Pubkey,
    ) -> Result<()> {
        initialize_global_config::handler(ctx, backend_authority)
    }

    /// Create a new prediction market in PROPOSED state
    ///
    /// Initializes a MarketAccount that must undergo proposal voting and
    /// admin approval before becoming tradeable.
    ///
    /// # Arguments
    ///
    /// * `market_id` - Unique identifier for this market (32 bytes, used in PDA seeds)
    /// * `b_parameter` - LMSR liquidity sensitivity parameter
    /// * `initial_liquidity` - Starting liquidity in lamports
    /// * `ipfs_question_hash` - IPFS CID for market question (46 bytes)
    pub fn create_market(
        ctx: Context<CreateMarket>,
        market_id: [u8; 32],
        b_parameter: u64,
        initial_liquidity: u64,
        ipfs_question_hash: [u8; 46],
    ) -> Result<()> {
        create_market::handler(
            ctx,
            market_id,
            b_parameter,
            initial_liquidity,
            ipfs_question_hash,
        )
    }

    /// Approve a market proposal (admin only)
    ///
    /// Transitions a market from PROPOSED → APPROVED after validating
    /// that proposal voting reached 70% approval threshold.
    pub fn approve_proposal(
        ctx: Context<ApproveProposal>,
    ) -> Result<()> {
        approve_proposal::handler(ctx)
    }

    /// Activate an approved market (admin or creator)
    ///
    /// Transitions a market from APPROVED → ACTIVE, enabling trading.
    /// Can be called by either admin or market creator.
    pub fn activate_market(
        ctx: Context<ActivateMarket>,
    ) -> Result<()> {
        activate_market::handler(ctx)
    }
}
