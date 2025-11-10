use anchor_lang::prelude::*;
use crate::error::ErrorCode;
use crate::state::{GlobalConfig, MarketAccount, MarketState};

/// Challenge a resolution (RESOLVING → DISPUTED)
///
/// Allows any user to dispute the proposed outcome within the dispute window.
/// Resets dispute vote counters and opens community voting.
#[derive(Accounts)]
pub struct InitiateDispute<'info> {
    #[account(
        seeds = [b"global-config"],
        bump = global_config.bump
    )]
    pub global_config: Account<'info, GlobalConfig>,

    #[account(
        mut,
        seeds = [b"market", &market.market_id],
        bump = market.bump,
        constraint = market.state == MarketState::Resolving @ ErrorCode::InvalidMarketState
    )]
    pub market: Account<'info, MarketAccount>,

    /// User initiating the dispute
    pub initiator: Signer<'info>,
}

pub fn handler(ctx: Context<InitiateDispute>) -> Result<()> {
    let market = &mut ctx.accounts.market;
    let config = &ctx.accounts.global_config;
    let clock = Clock::get()?;

    // SECURITY FIX (Finding #5): Validate timestamp monotonicity
    // Dispute can only be initiated after resolution is proposed
    require!(
        clock.unix_timestamp > market.resolution_proposed_at,
        ErrorCode::InvalidTimestamp
    );

    // SECURITY: Verify within dispute window (time-based state transition validation)
    let dispute_deadline = market.resolution_proposed_at
        .checked_add(config.dispute_period as i64)
        .ok_or(ErrorCode::OverflowError)?;

    require!(
        clock.unix_timestamp < dispute_deadline,
        ErrorCode::DisputePeriodEnded
    );

    // Verify not already disputed
    require!(
        market.state == MarketState::Resolving,
        ErrorCode::AlreadyDisputed
    );

    // Record dispute initiation
    market.dispute_initiator = ctx.accounts.initiator.key();
    market.dispute_initiated_at = clock.unix_timestamp;

    // Reset dispute vote counters
    market.dispute_agree = 0;
    market.dispute_disagree = 0;
    market.dispute_total_votes = 0;

    // Transition state: RESOLVING → DISPUTED
    market.state = MarketState::Disputed;

    // Emit event
    // emit!(DisputeInitiated {
    //     market_id: market.market_id,
    //     initiator: market.dispute_initiator,
    //     disputed_outcome: market.proposed_outcome,
    //     timestamp: market.dispute_initiated_at,
    // });

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_dispute_window_calculation() {
        // Verify dispute window calculation
        let resolution_time: i64 = 1000;
        let dispute_period: u64 = 259200; // 3 days in seconds
        let deadline = resolution_time + dispute_period as i64;

        assert_eq!(deadline, 260200);
    }

    #[test]
    fn test_within_window() {
        // Test timing logic
        let resolution_time: i64 = 1000;
        let dispute_period: u64 = 259200;
        let deadline = resolution_time + dispute_period as i64;

        let current_time_valid = 100000;   // Within window
        let current_time_invalid = 300000; // After window

        assert!(current_time_valid < deadline);
        assert!(current_time_invalid >= deadline);
    }
}
