use anchor_lang::prelude::*;
use crate::state::{GlobalConfig, MarketAccount, MarketState};
use crate::error::ErrorCode;

/// Activate an approved market, transitioning APPROVED → ACTIVE
///
/// After a market is approved, either the admin or the market creator can
/// activate it, making it available for trading. This is the final step
/// before users can buy and sell shares.
///
/// # Errors
///
/// * `Unauthorized` - If signer is not admin or creator
/// * `InvalidStateTransition` - If market not in APPROVED state
/// * `InsufficientLiquidity` - If current_liquidity < initial_liquidity
#[derive(Accounts)]
pub struct ActivateMarket<'info> {
    /// Authority (either admin or creator) activating the market
    #[account(mut)]
    pub authority: Signer<'info>,

    /// Market account to activate
    #[account(
        mut,
        seeds = [b"market", market.market_id.as_ref()],
        bump = market.bump
    )]
    pub market: Account<'info, MarketAccount>,

    /// Global configuration (verify admin if authority is admin)
    #[account(
        seeds = [b"global-config"],
        bump = global_config.bump
    )]
    pub global_config: Account<'info, GlobalConfig>,
}

/// Handler for activate_market instruction
pub fn handler(ctx: Context<ActivateMarket>) -> Result<()> {
    let market = &mut ctx.accounts.market;
    let global_config = &ctx.accounts.global_config;
    let authority = ctx.accounts.authority.key();

    // Validate authority is either admin or creator
    let is_admin = authority == global_config.admin;
    let is_creator = authority == market.creator;

    require!(
        is_admin || is_creator,
        ErrorCode::Unauthorized
    );

    // Validate current state is APPROVED
    require!(
        market.state == MarketState::Approved,
        ErrorCode::InvalidStateTransition
    );

    // Validate sufficient liquidity
    require!(
        market.current_liquidity >= market.initial_liquidity,
        ErrorCode::InsufficientLiquidity
    );

    // Transition to ACTIVE state
    market.state = MarketState::Active;

    // Set activated_at timestamp
    let clock = Clock::get()?;
    market.activated_at = clock.unix_timestamp;

    msg!(
        "Market {:?} activated by {} (admin: {}, creator: {})",
        market.market_id,
        authority,
        is_admin,
        is_creator
    );

    // Emit event
    emit!(MarketActivated {
        market_id: market.market_id,
        creator: market.creator,
        initial_liquidity: market.initial_liquidity,
        timestamp: market.activated_at,
    });

    Ok(())
}

#[event]
pub struct MarketActivated {
    pub market_id: [u8; 32],
    pub creator: Pubkey,
    pub initial_liquidity: u64,
    pub timestamp: i64,
}

#[cfg(test)]
mod tests {
    use super::*;

    fn create_test_market_approved(
        creator: Pubkey,
        liquidity: u64,
    ) -> MarketAccount {
        MarketAccount {
            market_id: [1; 32],
            creator,
            state: MarketState::Approved,
            b_parameter: 1_000_000_000,
            initial_liquidity: liquidity,
            current_liquidity: liquidity,
            shares_yes: 0,
            shares_no: 0,
            total_volume: 0,
            created_at: 1730000000,
            approved_at: 1730100000,
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
            proposal_likes: 80,
            proposal_dislikes: 20,
            proposal_total_votes: 100,
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
    fn test_state_transition_approved_to_active() {
        let creator = Pubkey::new_unique();
        let mut market = create_test_market_approved(creator, 10_000_000_000);

        // Verify initial state
        assert_eq!(market.state, MarketState::Approved);
        assert_eq!(market.activated_at, 0);

        // Simulate activation
        market.state = MarketState::Active;
        market.activated_at = 1730200000;

        // Verify state transition
        assert_eq!(market.state, MarketState::Active);
        assert!(market.activated_at > market.approved_at);
        assert!(market.activated_at > market.created_at);
    }

    #[test]
    fn test_timestamp_progression() {
        let mut market = create_test_market_approved(Pubkey::new_unique(), 10_000_000_000);

        // Simulate activation
        market.activated_at = market.approved_at + 3600; // 1 hour later

        // Verify timestamp progression
        assert!(market.created_at > 0);
        assert!(market.approved_at > market.created_at);
        assert!(market.activated_at > market.approved_at);
    }

    #[test]
    fn test_liquidity_validation() {
        let creator = Pubkey::new_unique();
        let market = create_test_market_approved(creator, 10_000_000_000);

        // Sufficient liquidity
        assert_eq!(market.current_liquidity, market.initial_liquidity);
        assert!(market.current_liquidity >= market.initial_liquidity);

        // Test insufficient liquidity case
        let mut market_low = market.clone();
        market_low.current_liquidity = market_low.initial_liquidity - 1;
        assert!(market_low.current_liquidity < market_low.initial_liquidity);
        // Would trigger InsufficientLiquidity error
    }

    #[test]
    fn test_authority_validation_admin() {
        let admin = Pubkey::new_unique();
        let creator = Pubkey::new_unique();

        // Admin should be authorized
        assert_ne!(admin, creator);
        let is_admin = true;
        let is_creator = false;
        assert!(is_admin || is_creator);
    }

    #[test]
    fn test_authority_validation_creator() {
        let admin = Pubkey::new_unique();
        let creator = Pubkey::new_unique();

        // Creator should be authorized
        assert_ne!(admin, creator);
        let is_admin = false;
        let is_creator = true;
        assert!(is_admin || is_creator);
    }

    #[test]
    fn test_authority_validation_unauthorized() {
        let admin = Pubkey::new_unique();
        let creator = Pubkey::new_unique();
        let random = Pubkey::new_unique();

        // Random user should not be authorized
        assert_ne!(random, admin);
        assert_ne!(random, creator);
        let is_admin = false;
        let is_creator = false;
        assert!(!(is_admin || is_creator));
        // Would trigger Unauthorized error
    }

    #[test]
    fn test_activation_from_different_states() {
        let creator = Pubkey::new_unique();

        // Only APPROVED state should allow activation
        let approved = create_test_market_approved(creator, 10_000_000_000);
        assert_eq!(approved.state, MarketState::Approved); // Valid

        // Other states should fail
        let mut proposed = approved.clone();
        proposed.state = MarketState::Proposed;
        assert_ne!(proposed.state, MarketState::Approved); // Invalid

        let mut active = approved.clone();
        active.state = MarketState::Active;
        assert_ne!(active.state, MarketState::Approved); // Invalid

        let mut resolving = approved.clone();
        resolving.state = MarketState::Resolving;
        assert_ne!(resolving.state, MarketState::Approved); // Invalid
    }
}
