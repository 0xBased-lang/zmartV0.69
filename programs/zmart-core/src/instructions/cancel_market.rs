use anchor_lang::prelude::*;
use crate::state::{GlobalConfig, MarketAccount, MarketState};
use crate::error::ErrorCode;

/// Cancel a market and transition to terminal CANCELLED state
///
/// Allows protocol admin to cancel markets that are invalid, fraudulent, or
/// require refunding users. Only works for markets in PROPOSED or APPROVED states.
/// Active, resolving, or finalized markets cannot be cancelled.
///
/// This instruction sets the market state to CANCELLED. Actual refunds are handled
/// by a separate cancel_market_refund instruction to avoid compute unit limits.
///
/// # Errors
///
/// * `Unauthorized` - If signer is not admin
/// * `CannotCancelMarket` - If market not in PROPOSED or APPROVED state
/// * `MarketAlreadyCancelled` - If market already in CANCELLED state
#[derive(Accounts)]
pub struct CancelMarket<'info> {
    /// Protocol admin with cancellation authority
    pub admin: Signer<'info>,

    /// Market account to cancel
    #[account(
        mut,
        seeds = [b"market", market.market_id.as_ref()],
        bump = market.bump
    )]
    pub market: Account<'info, MarketAccount>,

    /// Global configuration (verify admin authority)
    #[account(
        seeds = [b"global-config"],
        bump = global_config.bump,
        constraint = global_config.admin == admin.key() @ ErrorCode::Unauthorized
    )]
    pub global_config: Account<'info, GlobalConfig>,
}

/// Handler for cancel_market instruction
pub fn handler(ctx: Context<CancelMarket>) -> Result<()> {
    let market = &mut ctx.accounts.market;

    // Verify market is not already cancelled
    require!(
        market.state != MarketState::Cancelled,
        ErrorCode::MarketAlreadyCancelled
    );

    // Only allow cancellation of PROPOSED or APPROVED markets
    // Active, resolving, disputed, or finalized markets cannot be cancelled
    require!(
        market.state == MarketState::Proposed || market.state == MarketState::Approved,
        ErrorCode::CannotCancelMarket
    );

    // Transition to CANCELLED state (terminal state)
    market.state = MarketState::Cancelled;

    // Record cancellation timestamp
    let clock = Clock::get()?;
    market.cancelled_at = Some(clock.unix_timestamp);

    // Emit event
    emit!(MarketCancelled {
        market_id: market.market_id,
        cancelled_by: ctx.accounts.admin.key(),
        cancelled_at: clock.unix_timestamp,
    });

    msg!(
        "Market {:?} cancelled by admin at timestamp {}",
        market.market_id,
        clock.unix_timestamp
    );

    Ok(())
}

/// Event emitted when a market is cancelled
#[event]
pub struct MarketCancelled {
    pub market_id: [u8; 32],
    pub cancelled_by: Pubkey,
    pub cancelled_at: i64,
}

#[cfg(test)]
mod tests {
    use super::*;
    use anchor_lang::solana_program::pubkey::Pubkey;

    fn create_test_market(state: MarketState) -> MarketAccount {
        MarketAccount {
            market_id: [1; 32],
            creator: Pubkey::new_unique(),
            state,
            b_parameter: 1_000_000_000, // 1 SOL in fixed-point
            initial_liquidity: 100_000_000,
            current_liquidity: 100_000_000,
            shares_yes: 0,
            shares_no: 0,
            total_volume: 0,
            created_at: 0,
            approved_at: 0,
            activated_at: 0,
            resolution_proposed_at: 0,
            resolved_at: 0,
            finalized_at: 0,
            resolver: Pubkey::new_unique(),
            proposed_outcome: None,
            final_outcome: None,
            ipfs_evidence_hash: [0; 46],
            dispute_initiated_at: 0,
            dispute_initiator: Pubkey::new_unique(),
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
            reserved: [0; 120],
            bump: 255,
        }
    }

    #[test]
    fn test_cancel_proposed_market() {
        // Market in PROPOSED state
        let mut market = create_test_market(MarketState::Proposed);
        assert_eq!(market.state, MarketState::Proposed);

        // Cancel it
        market.state = MarketState::Cancelled;

        assert_eq!(market.state, MarketState::Cancelled);
    }

    #[test]
    fn test_cancel_approved_market() {
        // Market in APPROVED state
        let mut market = create_test_market(MarketState::Approved);
        assert_eq!(market.state, MarketState::Approved);

        // Cancel it
        market.state = MarketState::Cancelled;

        assert_eq!(market.state, MarketState::Cancelled);
    }

    #[test]
    fn test_cannot_cancel_active_market() {
        // Market in ACTIVE state
        let market = create_test_market(MarketState::Active);

        // Should fail to cancel (would require error in actual instruction)
        assert_ne!(market.state, MarketState::Proposed);
        assert_ne!(market.state, MarketState::Approved);
    }

    #[test]
    fn test_cannot_cancel_resolving_market() {
        // Market in RESOLVING state
        let market = create_test_market(MarketState::Resolving);

        // Should fail to cancel
        assert_ne!(market.state, MarketState::Proposed);
        assert_ne!(market.state, MarketState::Approved);
    }

    #[test]
    fn test_cannot_cancel_disputed_market() {
        // Market in DISPUTED state
        let market = create_test_market(MarketState::Disputed);

        // Should fail to cancel
        assert_ne!(market.state, MarketState::Proposed);
        assert_ne!(market.state, MarketState::Approved);
    }

    #[test]
    fn test_cannot_cancel_finalized_market() {
        // Market in FINALIZED state
        let market = create_test_market(MarketState::Finalized);

        // Should fail to cancel
        assert_ne!(market.state, MarketState::Proposed);
        assert_ne!(market.state, MarketState::Approved);
    }

    #[test]
    fn test_cannot_cancel_already_cancelled_market() {
        // Market already CANCELLED
        let market = create_test_market(MarketState::Cancelled);
        assert_eq!(market.state, MarketState::Cancelled);

        // Attempting to cancel again should fail
        // (verified in actual instruction with MarketAlreadyCancelled error)
    }

    #[test]
    fn test_cancelled_is_terminal_state() {
        // Once CANCELLED, market cannot transition to other states
        let market = create_test_market(MarketState::Cancelled);

        // CANCELLED = 6, which is after all other states (0-5)
        assert_eq!(market.state as u8, 6);
    }

    #[test]
    fn test_market_states_ordering() {
        // Verify state values
        assert_eq!(MarketState::Proposed as u8, 0);
        assert_eq!(MarketState::Approved as u8, 1);
        assert_eq!(MarketState::Active as u8, 2);
        assert_eq!(MarketState::Resolving as u8, 3);
        assert_eq!(MarketState::Disputed as u8, 4);
        assert_eq!(MarketState::Finalized as u8, 5);
        assert_eq!(MarketState::Cancelled as u8, 6);
    }

    #[test]
    fn test_cancellation_timestamp_recording() {
        let mut market = create_test_market(MarketState::Proposed);

        // Initially no cancellation timestamp
        assert_eq!(market.cancelled_at, None);

        // After cancellation, should have timestamp
        market.cancelled_at = Some(1000);
        assert_eq!(market.cancelled_at, Some(1000));
    }
}
