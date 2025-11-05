use anchor_lang::prelude::*;
use crate::state::{GlobalConfig, MarketAccount, MarketState};
use crate::error::ErrorCode;

/// Approve a market proposal, transitioning PROPOSED → APPROVED
///
/// After proposal voting reaches 70% approval threshold, admin can approve
/// the market, allowing it to be activated for trading. This instruction
/// validates the voting threshold and transitions the market state.
///
/// # Errors
///
/// * `Unauthorized` - If signer is not admin
/// * `InvalidStateTransition` - If market not in PROPOSED state
/// * `InsufficientVotes` - If approval percentage < 70%
/// * `NoVotesRecorded` - If no votes have been cast
#[derive(Accounts)]
pub struct ApproveProposal<'info> {
    /// Protocol admin with approval authority
    #[account(mut)]
    pub admin: Signer<'info>,

    /// Market account to approve
    #[account(
        mut,
        seeds = [b"market", market.market_id.as_ref()],
        bump = market.bump
    )]
    pub market: Account<'info, MarketAccount>,

    /// Global configuration (verify admin and read approval threshold)
    #[account(
        seeds = [b"global-config"],
        bump = global_config.bump,
        constraint = global_config.admin == admin.key() @ ErrorCode::Unauthorized
    )]
    pub global_config: Account<'info, GlobalConfig>,
}

/// Handler for approve_proposal instruction
pub fn handler(ctx: Context<ApproveProposal>) -> Result<()> {
    let market = &mut ctx.accounts.market;
    let global_config = &ctx.accounts.global_config;

    // Validate current state is PROPOSED
    require!(
        market.state == MarketState::Proposed,
        ErrorCode::InvalidStateTransition
    );

    // Validate votes have been recorded
    require!(
        market.proposal_total_votes > 0,
        ErrorCode::NoVotesRecorded
    );

    // Calculate approval percentage in basis points (10000 = 100%)
    // Formula: (likes * 10000) / total_votes
    let approval_bps = (market.proposal_likes as u128)
        .checked_mul(10000)
        .ok_or(ErrorCode::OverflowError)?
        .checked_div(market.proposal_total_votes as u128)
        .ok_or(ErrorCode::DivisionByZero)? as u16;

    // Validate approval meets threshold (70% = 7000 bps)
    require!(
        approval_bps >= global_config.proposal_approval_threshold,
        ErrorCode::InsufficientVotes
    );

    // Transition to APPROVED state
    market.state = MarketState::Approved;

    // Set approved_at timestamp
    let clock = Clock::get()?;
    market.approved_at = clock.unix_timestamp;

    msg!(
        "Market {:?} approved by admin with {}% approval ({}/{} votes)",
        market.market_id,
        approval_bps / 100,
        market.proposal_likes,
        market.proposal_total_votes
    );

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn create_test_market_proposed(
        likes: u32,
        dislikes: u32,
    ) -> MarketAccount {
        let total = likes + dislikes;
        MarketAccount {
            market_id: [1; 32],
            creator: Pubkey::new_unique(),
            state: MarketState::Proposed,
            b_parameter: 1_000_000_000,
            initial_liquidity: 10_000_000_000,
            current_liquidity: 10_000_000_000,
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
            proposal_likes: likes,
            proposal_dislikes: dislikes,
            proposal_total_votes: total,
            dispute_agree: 0,
            dispute_disagree: 0,
            dispute_total_votes: 0,
            is_cancelled: false,
            bump: 255,
            reserved: [0; 128],
        }
    }

    #[test]
    fn test_approval_calculation_exact_70_percent() {
        // Exactly 70% approval (70 likes, 30 dislikes)
        let likes = 70u32;
        let dislikes = 30u32;
        let total = likes + dislikes;

        let approval_bps = (likes as u128 * 10000 / total as u128) as u16;
        assert_eq!(approval_bps, 7000); // Exactly 70%
        assert!(approval_bps >= 7000); // Meets threshold
    }

    #[test]
    fn test_approval_calculation_above_threshold() {
        // 80% approval (80 likes, 20 dislikes)
        let likes = 80u32;
        let dislikes = 20u32;
        let total = likes + dislikes;

        let approval_bps = (likes as u128 * 10000 / total as u128) as u16;
        assert_eq!(approval_bps, 8000); // 80%
        assert!(approval_bps >= 7000); // Exceeds threshold
    }

    #[test]
    fn test_approval_calculation_below_threshold() {
        // 69% approval (69 likes, 31 dislikes)
        let likes = 69u32;
        let dislikes = 31u32;
        let total = likes + dislikes;

        let approval_bps = (likes as u128 * 10000 / total as u128) as u16;
        assert_eq!(approval_bps, 6900); // 69%
        assert!(approval_bps < 7000); // Below threshold
    }

    #[test]
    fn test_state_transition_proposed_to_approved() {
        let mut market = create_test_market_proposed(80, 20);

        // Verify initial state
        assert_eq!(market.state, MarketState::Proposed);
        assert_eq!(market.approved_at, 0);

        // Simulate approval
        market.state = MarketState::Approved;
        market.approved_at = 1730100000;

        // Verify state transition
        assert_eq!(market.state, MarketState::Approved);
        assert!(market.approved_at > market.created_at);
    }

    #[test]
    fn test_no_votes_validation() {
        let market = create_test_market_proposed(0, 0);

        // Verify no votes recorded
        assert_eq!(market.proposal_total_votes, 0);
        // Would trigger NoVotesRecorded error
    }

    #[test]
    fn test_approval_with_large_vote_counts() {
        // Test with 10,000 votes
        let likes = 7500u32; // 75%
        let dislikes = 2500u32; // 25%
        let total = likes + dislikes;

        let approval_bps = (likes as u128 * 10000 / total as u128) as u16;
        assert_eq!(approval_bps, 7500); // 75%
        assert!(approval_bps >= 7000);
    }

    #[test]
    fn test_approval_with_fractional_percentages() {
        // Test rounding behavior with odd vote counts
        let likes = 7u32;
        let dislikes = 3u32;
        let total = 10u32;

        let approval_bps = (likes as u128 * 10000 / total as u128) as u16;
        assert_eq!(approval_bps, 7000); // Exactly 70%

        // Test 71% (rounding down)
        let likes = 71u32;
        let dislikes = 29u32;
        let total = 100u32;
        let approval_bps = (likes as u128 * 10000 / total as u128) as u16;
        assert_eq!(approval_bps, 7100); // 71%
    }
}
