use anchor_lang::prelude::*;

declare_id!("7h3gXfBfYFueFVLYyfL5Qo1QGsf4GQUfW96FKVgnUsJS");

// Module declarations
pub mod error;
pub mod instructions;
pub mod math;
pub mod state;
pub mod utils;

// Re-exports for convenience
pub use error::*;
pub use instructions::*;
pub use math::*;
pub use state::*;
pub use utils::*;

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

    // ============================================================================
    // Voting Instructions (Phase 1, Week 1)
    // ============================================================================

    /// Submit a vote on a market proposal (like/dislike)
    ///
    /// Creates an on-chain VoteRecord for proof and duplicate prevention.
    /// Votes are aggregated off-chain by the backend. When 70% approval
    /// threshold is reached, backend calls approve_proposal.
    ///
    /// # Arguments
    ///
    /// * `vote` - true for "like" (support), false for "dislike" (oppose)
    ///
    /// # Errors
    ///
    /// * `ErrorCode::InvalidStateForVoting` - Market not in PROPOSED state
    /// * `ErrorCode::AlreadyVoted` - User already voted (PDA init fails)
    pub fn submit_proposal_vote(
        ctx: Context<SubmitProposalVote>,
        vote: bool,
    ) -> Result<()> {
        submit_proposal_vote::handler(ctx, vote)
    }

    /// Aggregate proposal votes and check approval threshold
    ///
    /// Backend authority aggregates votes off-chain (from VoteRecords) and submits
    /// final counts. If 70%+ likes, market transitions to APPROVED state.
    ///
    /// # Arguments
    ///
    /// * `final_likes` - Total number of like votes (from off-chain aggregation)
    /// * `final_dislikes` - Total number of dislike votes (from off-chain aggregation)
    ///
    /// # Behavior
    ///
    /// * Records vote counts in MarketAccount
    /// * Calculates approval percentage
    /// * If >= 70% likes: transitions to APPROVED state
    /// * If < 70% likes: stays in PROPOSED (can re-aggregate)
    /// * Emits ProposalAggregated event
    ///
    /// # Errors
    ///
    /// * `ErrorCode::Unauthorized` - Caller is not backend authority
    /// * `ErrorCode::InvalidStateForVoting` - Market not in PROPOSED state
    /// * `ErrorCode::OverflowError` - Vote count overflow (extremely unlikely)
    pub fn aggregate_proposal_votes(
        ctx: Context<AggregateProposalVotes>,
        final_likes: u32,
        final_dislikes: u32,
    ) -> Result<()> {
        aggregate_proposal_votes::handler(ctx, final_likes, final_dislikes)
    }

    /// Submit a vote on a market dispute (agree/disagree)
    ///
    /// Creates an on-chain VoteRecord for proof and duplicate prevention.
    /// Votes are aggregated off-chain by the backend. When dispute voting
    /// concludes, backend calls aggregate_dispute_votes.
    ///
    /// # Arguments
    ///
    /// * `vote` - true for "agree with dispute" (resolution is wrong),
    ///            false for "disagree with dispute" (resolution is correct)
    ///
    /// # Errors
    ///
    /// * `ErrorCode::InvalidStateForVoting` - Market not in DISPUTED state
    /// * `ErrorCode::AlreadyVoted` - User already voted (PDA init fails)
    pub fn submit_dispute_vote(
        ctx: Context<SubmitDisputeVote>,
        vote: bool,
    ) -> Result<()> {
        submit_dispute_vote::handler(ctx, vote)
    }

    /// Aggregate dispute votes and check dispute threshold
    ///
    /// Backend authority aggregates votes off-chain (from VoteRecords) and submits
    /// final counts. If 60%+ agree with dispute, resolution is rejected and market
    /// returns to RESOLVING state. If <60%, original resolution stands and market
    /// transitions to FINALIZED.
    ///
    /// # Arguments
    ///
    /// * `final_agrees` - Total number of "agree with dispute" votes
    /// * `final_disagrees` - Total number of "disagree with dispute" votes
    ///
    /// # Behavior
    ///
    /// * Records vote counts in MarketAccount
    /// * Calculates agreement percentage
    /// * If >= 60% agree: transitions to RESOLVING (resolution rejected)
    /// * If < 60% agree: transitions to FINALIZED (resolution accepted)
    /// * Emits DisputeAggregated event
    ///
    /// # Errors
    ///
    /// * `ErrorCode::Unauthorized` - Caller is not backend authority
    /// * `ErrorCode::InvalidStateForVoting` - Market not in DISPUTED state
    /// * `ErrorCode::OverflowError` - Vote count overflow (extremely unlikely)
    pub fn aggregate_dispute_votes(
        ctx: Context<AggregateDisputeVotes>,
        final_agrees: u32,
        final_disagrees: u32,
    ) -> Result<()> {
        aggregate_dispute_votes::handler(ctx, final_agrees, final_disagrees)
    }

    // ============================================================================
    // Admin Instructions (Phase 1, Week 3)
    // ============================================================================

    /// Update global protocol configuration parameters
    ///
    /// Allows admin to modify fee percentages, voting thresholds, and other
    /// configuration parameters without redeploying the program.
    ///
    /// # Arguments
    ///
    /// * `protocol_fee_bps` - Protocol fee in basis points (0-10000)
    /// * `resolver_reward_bps` - Resolver reward in basis points (0-10000)
    /// * `liquidity_provider_fee_bps` - LP fee in basis points (0-10000)
    /// * `proposal_approval_threshold` - Proposal approval threshold (0-10000)
    /// * `dispute_success_threshold` - Dispute success threshold (0-10000)
    pub fn update_global_config(
        ctx: Context<UpdateGlobalConfig>,
        protocol_fee_bps: u16,
        resolver_reward_bps: u16,
        liquidity_provider_fee_bps: u16,
        proposal_approval_threshold: u16,
        dispute_success_threshold: u16,
    ) -> Result<()> {
        update_global_config::handler(
            ctx,
            protocol_fee_bps,
            resolver_reward_bps,
            liquidity_provider_fee_bps,
            proposal_approval_threshold,
            dispute_success_threshold,
        )
    }

    /// Toggle protocol pause state (pause/unpause trading)
    ///
    /// Allows admin to pause all trading operations in case of critical bugs,
    /// exploits, or market instability. Calling when running pauses protocol.
    /// Calling when paused unpauses protocol. Voting and resolution continue.
    pub fn emergency_pause(
        ctx: Context<EmergencyPause>,
    ) -> Result<()> {
        emergency_pause::handler(ctx)
    }

    /// Cancel a market and transition to CANCELLED state
    ///
    /// Allows admin to cancel markets that are invalid or fraudulent.
    /// Only works for PROPOSED or APPROVED markets (cannot cancel active/resolving).
    /// Sets market to CANCELLED state. Refunds handled by separate instruction.
    pub fn cancel_market(
        ctx: Context<CancelMarket>,
    ) -> Result<()> {
        cancel_market::handler(ctx)
    }
}
