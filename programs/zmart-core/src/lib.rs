use anchor_lang::prelude::*;

declare_id!("7h3gXfBfYFueFVLYyfL5Qo1QGsf4GQUfW96FKVgnUsJS");

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

    // ============================================================================
    // Trading Instructions (Day 4)
    // ============================================================================

    /// Buy YES or NO shares using LMSR
    ///
    /// Users specify a target cost and receive shares calculated by LMSR.
    /// Fees (10% total) are added on top: 3% protocol, 2% resolver, 5% LP.
    ///
    /// # Arguments
    ///
    /// * `outcome` - true for YES, false for NO
    /// * `target_cost` - Maximum willing to pay (before fees, slippage protection)
    pub fn buy_shares(
        ctx: Context<BuyShares>,
        outcome: bool,
        target_cost: u64,
    ) -> Result<()> {
        buy_shares::handler(ctx, outcome, target_cost)
    }

    /// Sell YES or NO shares back to the pool
    ///
    /// Users specify number of shares to sell and receive proceeds calculated
    /// by LMSR. Fees (10% total) are deducted from proceeds.
    ///
    /// # Arguments
    ///
    /// * `outcome` - true for YES, false for NO
    /// * `shares_to_sell` - Number of shares to sell
    /// * `min_proceeds` - Minimum acceptable proceeds (slippage protection)
    pub fn sell_shares(
        ctx: Context<SellShares>,
        outcome: bool,
        shares_to_sell: u64,
        min_proceeds: u64,
    ) -> Result<()> {
        sell_shares::handler(ctx, outcome, shares_to_sell, min_proceeds)
    }

    // ============================================================================
    // Resolution Instructions (Day 5)
    // ============================================================================

    /// Propose market resolution (ACTIVE → RESOLVING)
    ///
    /// Any user can propose resolution after market conditions met. Starts
    /// 48-hour dispute window for community challenges.
    ///
    /// # Arguments
    ///
    /// * `proposed_outcome` - true for YES, false for NO
    /// * `ipfs_evidence_hash` - IPFS CID with resolution evidence (46 bytes)
    pub fn resolve_market(
        ctx: Context<ResolveMarket>,
        proposed_outcome: bool,
        ipfs_evidence_hash: [u8; 46],
    ) -> Result<()> {
        resolve_market::handler(ctx, proposed_outcome, ipfs_evidence_hash)
    }

    /// Challenge a resolution (RESOLVING → DISPUTED)
    ///
    /// Any user can dispute proposed outcome during dispute window.
    /// Opens community voting via off-chain aggregation.
    pub fn initiate_dispute(
        ctx: Context<InitiateDispute>,
    ) -> Result<()> {
        initiate_dispute::handler(ctx)
    }

    /// Set final outcome (RESOLVING/DISPUTED → FINALIZED)
    ///
    /// Backend authority finalizes market after vote aggregation.
    /// For disputed markets: if ≥60% agree to flip, flip the outcome.
    ///
    /// # Arguments
    ///
    /// * `dispute_agree` - Dispute agree votes (Some for DISPUTED, None for RESOLVING)
    /// * `dispute_disagree` - Dispute disagree votes (Some for DISPUTED, None for RESOLVING)
    pub fn finalize_market(
        ctx: Context<FinalizeMarket>,
        dispute_agree: Option<u32>,
        dispute_disagree: Option<u32>,
    ) -> Result<()> {
        finalize_market::handler(ctx, dispute_agree, dispute_disagree)
    }

    // ============================================================================
    // Claim Instructions (Day 6)
    // ============================================================================

    /// Claim winnings after market finalized
    ///
    /// Users claim based on final outcome:
    /// - YES outcome: Only YES holders win
    /// - NO outcome: Only NO holders win
    /// - INVALID outcome: All holders refunded
    ///
    /// First claimer pays resolver their accumulated fees
    pub fn claim_winnings(
        ctx: Context<ClaimWinnings>,
    ) -> Result<()> {
        claim_winnings::handler(ctx)
    }

    /// Withdraw remaining liquidity after market finalized
    ///
    /// Creator withdraws remaining pool funds + LP fees while
    /// preserving rent reserve.
    pub fn withdraw_liquidity(
        ctx: Context<WithdrawLiquidity>,
    ) -> Result<()> {
        withdraw_liquidity::handler(ctx)
    }
}
