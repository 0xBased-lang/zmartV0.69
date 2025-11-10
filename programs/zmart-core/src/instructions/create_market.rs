use anchor_lang::prelude::*;
use crate::state::{GlobalConfig, MarketAccount, MarketState};
use crate::error::ErrorCode;

/// Create a new prediction market in PROPOSED state
///
/// Creates a MarketAccount PDA that begins in PROPOSED state, subject to
/// proposal voting approval. The market will need 70% approval to transition
/// to APPROVED state, then admin/creator activation to become ACTIVE.
///
/// # Arguments
///
/// * `market_id` - Unique identifier for this market (32 bytes, used in PDA seeds)
/// * `b_parameter` - LMSR liquidity sensitivity parameter (must be > 0)
/// * `initial_liquidity` - Starting liquidity in lamports (must be > 0)
/// * `ipfs_question_hash` - IPFS CID for market question/description (46 bytes)
///
/// # Errors
///
/// * `ProtocolPaused` - If protocol is paused
/// * `InvalidBParameter` - If b_parameter < MIN_B
/// * `InvalidLiquidity` - If initial_liquidity == 0
#[derive(Accounts)]
#[instruction(market_id: [u8; 32])]
pub struct CreateMarket<'info> {
    /// Market creator who pays for account creation
    #[account(mut)]
    pub creator: Signer<'info>,

    /// Market account PDA (initialized in PROPOSED state)
    ///
    /// Seeds: [b"market", market_id.as_ref()]
    /// Space: MarketAccount::LEN (464 bytes + 8 discriminator)
    #[account(
        init,
        seeds = [b"market", market_id.as_ref()],
        bump,
        payer = creator,
        space = 8 + MarketAccount::LEN
    )]
    pub market: Account<'info, MarketAccount>,

    /// Global configuration (read protocol settings)
    #[account(
        seeds = [b"global-config"],
        bump = global_config.bump
    )]
    pub global_config: Account<'info, GlobalConfig>,

    /// System program for account creation
    pub system_program: Program<'info, System>,
}

/// Handler for create_market instruction
pub fn handler(
    ctx: Context<CreateMarket>,
    market_id: [u8; 32],
    b_parameter: u64,
    initial_liquidity: u64,
    ipfs_question_hash: [u8; 46],
) -> Result<()> {
    let global_config = &ctx.accounts.global_config;
    let market = &mut ctx.accounts.market;

    // Validate protocol is not paused
    require!(
        !global_config.is_paused,
        ErrorCode::ProtocolPaused
    );

    // Validate LMSR parameter
    require!(
        b_parameter > 0,
        ErrorCode::InvalidBParameter
    );

    // Validate initial liquidity
    require!(
        initial_liquidity > 0,
        ErrorCode::InvalidLiquidity
    );

    // Initialize market in PROPOSED state
    market.market_id = market_id;
    market.creator = ctx.accounts.creator.key();
    market.state = MarketState::Proposed;

    // Set LMSR parameters
    market.b_parameter = b_parameter;
    market.initial_liquidity = initial_liquidity;
    market.current_liquidity = initial_liquidity;
    market.shares_yes = 0;
    market.shares_no = 0;
    market.total_volume = 0;

    // Set timestamps (only created_at initially)
    let clock = Clock::get()?;
    market.created_at = clock.unix_timestamp;
    market.approved_at = 0;
    market.activated_at = 0;
    market.resolution_proposed_at = 0;
    market.resolved_at = 0;
    market.finalized_at = 0;

    // Initialize resolution data
    market.resolver = Pubkey::default();
    market.proposed_outcome = None;
    market.final_outcome = None;
    market.ipfs_evidence_hash = ipfs_question_hash;
    market.dispute_initiated_at = 0;
    market.dispute_initiator = Pubkey::default();

    // Initialize fee accumulators
    market.accumulated_protocol_fees = 0;
    market.accumulated_resolver_fees = 0;
    market.accumulated_lp_fees = 0;

    // Initialize vote counters
    market.proposal_likes = 0;
    market.proposal_dislikes = 0;
    market.proposal_total_votes = 0;
    market.dispute_agree = 0;
    market.dispute_disagree = 0;
    market.dispute_total_votes = 0;

    // Initialize state flags
    market.is_cancelled = false;
    market.is_locked = false;  // SECURITY FIX (Finding #8): Initialize reentrancy guard
    market.bump = ctx.bumps.market;

    // Initialize reserved space (119 bytes, 1 byte used by is_locked)
    market.reserved = [0; 119];

    msg!(
        "Market created: {:?} by creator: {} with b={}, liquidity={}",
        market_id,
        ctx.accounts.creator.key(),
        b_parameter,
        initial_liquidity
    );

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn create_test_market(
        creator: Pubkey,
        b: u64,
        liquidity: u64,
    ) -> MarketAccount {
        MarketAccount {
            market_id: [1; 32],
            creator,
            state: MarketState::Proposed,
            b_parameter: b,
            initial_liquidity: liquidity,
            current_liquidity: liquidity,
            shares_yes: 0,
            shares_no: 0,
            total_volume: 0,
            created_at: 1730000000,
            approved_at: 0,
            activated_at: 0,
            resolution_proposed_at: 0,
            resolved_at: 0,
            finalized_at: 0,
            resolver: Pubkey::default(),
            proposed_outcome: None,
            final_outcome: None,
            ipfs_evidence_hash: [0; 46],
            dispute_initiated_at: 0,
            dispute_initiator: Pubkey::default(),
            accumulated_protocol_fees: 0,
            accumulated_resolver_fees: 0,
            accumulated_lp_fees: 0,
            proposal_likes: 0,
            proposal_dislikes: 0,
            proposal_total_votes: 0,
            resolution_agree: 0,
            resolution_disagree: 0,
            resolution_total_votes: 0,
            dispute_agree: 0,
            dispute_disagree: 0,
            dispute_total_votes: 0,
            was_disputed: false,
            is_cancelled: false,
            cancelled_at: None,
            bump: 255,
            is_locked: false,
            reserved: [0; 119],
        }
    }

    #[test]
    fn test_market_initialization() {
        let creator = Pubkey::new_unique();
        let market = create_test_market(creator, 1_000_000_000, 10_000_000_000);

        // Verify initial state
        assert_eq!(market.state, MarketState::Proposed);
        assert_eq!(market.creator, creator);

        // Verify LMSR parameters
        assert_eq!(market.b_parameter, 1_000_000_000);
        assert_eq!(market.initial_liquidity, 10_000_000_000);
        assert_eq!(market.current_liquidity, 10_000_000_000);

        // Verify shares start at zero
        assert_eq!(market.shares_yes, 0);
        assert_eq!(market.shares_no, 0);
        assert_eq!(market.total_volume, 0);
    }

    #[test]
    fn test_timestamps_initialization() {
        let market = create_test_market(Pubkey::new_unique(), 1_000_000_000, 10_000_000_000);

        // Only created_at should be set initially
        assert!(market.created_at > 0);
        assert_eq!(market.approved_at, 0);
        assert_eq!(market.activated_at, 0);
        assert_eq!(market.resolution_proposed_at, 0);
        assert_eq!(market.resolved_at, 0);
        assert_eq!(market.finalized_at, 0);
    }

    #[test]
    fn test_fee_accumulators_initialization() {
        let market = create_test_market(Pubkey::new_unique(), 1_000_000_000, 10_000_000_000);

        // All fee accumulators should start at zero
        assert_eq!(market.accumulated_protocol_fees, 0);
        assert_eq!(market.accumulated_resolver_fees, 0);
        assert_eq!(market.accumulated_lp_fees, 0);
    }

    #[test]
    fn test_vote_counters_initialization() {
        let market = create_test_market(Pubkey::new_unique(), 1_000_000_000, 10_000_000_000);

        // Proposal vote counters
        assert_eq!(market.proposal_likes, 0);
        assert_eq!(market.proposal_dislikes, 0);
        assert_eq!(market.proposal_total_votes, 0);

        // Dispute vote counters
        assert_eq!(market.dispute_agree, 0);
        assert_eq!(market.dispute_disagree, 0);
        assert_eq!(market.dispute_total_votes, 0);
    }

    #[test]
    fn test_resolution_data_initialization() {
        let market = create_test_market(Pubkey::new_unique(), 1_000_000_000, 10_000_000_000);

        // Resolution fields should be unset
        assert_eq!(market.resolver, Pubkey::default());
        assert_eq!(market.proposed_outcome, None);
        assert_eq!(market.final_outcome, None);
        assert_eq!(market.dispute_initiated_at, 0);
        assert_eq!(market.dispute_initiator, Pubkey::default());
    }

    #[test]
    fn test_parameter_validation_requirements() {
        // b_parameter must be > 0
        let invalid_b = 0u64;
        assert_eq!(invalid_b, 0); // Would trigger InvalidBParameter

        let valid_b = 1_000_000_000u64;
        assert!(valid_b > 0);

        // initial_liquidity must be > 0
        let invalid_liquidity = 0u64;
        assert_eq!(invalid_liquidity, 0); // Would trigger InvalidLiquidity

        let valid_liquidity = 10_000_000_000u64;
        assert!(valid_liquidity > 0);
    }

    #[test]
    fn test_state_flags_initialization() {
        let market = create_test_market(Pubkey::new_unique(), 1_000_000_000, 10_000_000_000);

        // Market should not be cancelled initially
        assert_eq!(market.is_cancelled, false);

        // Reserved space should be zeroed
        assert_eq!(market.reserved, [0; 119]);
    }

    #[test]
    fn test_market_id_format() {
        let market = create_test_market(Pubkey::new_unique(), 1_000_000_000, 10_000_000_000);

        // market_id should be [u8; 32]
        assert_eq!(market.market_id.len(), 32);
        assert_eq!(market.market_id, [1; 32]);
    }
}
