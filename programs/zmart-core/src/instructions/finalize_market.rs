use anchor_lang::prelude::*;
use crate::error::ErrorCode;
use crate::state::{GlobalConfig, MarketAccount, MarketState};
use crate::math::verify_bounded_loss;

/// Set final outcome (RESOLVING/DISPUTED → FINALIZED)
///
/// Backend authority finalizes the market after vote aggregation.
/// - RESOLVING: Keep proposed outcome after dispute window expires
/// - DISPUTED: Check if ≥60% agree to flip outcome
///
/// # Arguments
/// * `dispute_agree` - Dispute agree votes (Some for DISPUTED, None for RESOLVING)
/// * `dispute_disagree` - Dispute disagree votes (Some for DISPUTED, None for RESOLVING)
#[derive(Accounts)]
pub struct FinalizeMarket<'info> {
    #[account(
        seeds = [b"global-config"],
        bump = global_config.bump
    )]
    pub global_config: Account<'info, GlobalConfig>,

    #[account(
        mut,
        seeds = [b"market", &market.market_id],
        bump = market.bump,
        constraint = market.state == MarketState::Resolving || market.state == MarketState::Disputed @ ErrorCode::InvalidMarketState
    )]
    pub market: Account<'info, MarketAccount>,

    /// Backend authority (vote aggregator)
    #[account(
        constraint = backend_authority.key() == global_config.backend_authority @ ErrorCode::Unauthorized
    )]
    pub backend_authority: Signer<'info>,
}

pub fn handler(
    ctx: Context<FinalizeMarket>,
    dispute_agree: Option<u32>,
    dispute_disagree: Option<u32>,
) -> Result<()> {
    let market = &mut ctx.accounts.market;
    let config = &ctx.accounts.global_config;
    let clock = Clock::get()?;
    let current_time = clock.unix_timestamp;

    // SECURITY FIX (Finding #10): Validate timestamp bounds
    // Prevents time travel and far-future manipulation attacks
    require!(
        current_time >= market.created_at,
        ErrorCode::InvalidTimestamp
    );

    // Sanity check: timestamp must be within 10 years of market creation
    let max_timestamp = market.created_at
        .checked_add(86400 * 365 * 10)  // 10 years in seconds
        .ok_or(ErrorCode::OverflowError)?;

    require!(
        current_time <= max_timestamp,
        ErrorCode::InvalidTimestamp
    );

    msg!("Timestamp validation passed: current={}, created={}, resolution_proposed={}",
        current_time, market.created_at, market.resolution_proposed_at);

    // SECURITY FIX (Finding #5): Validate timestamp monotonicity
    // Finalization can only happen after resolution is proposed
    require!(
        current_time > market.resolution_proposed_at,
        ErrorCode::InvalidTimestamp
    );

    // Record if market was disputed (before state change)
    let was_disputed = market.state == MarketState::Disputed;

    // Determine final outcome based on current state
    let final_outcome = if market.state == MarketState::Disputed {
        // DISPUTED case: Use community votes to determine outcome
        let agree = dispute_agree.ok_or(ErrorCode::NoVotesRecorded)?;
        let disagree = dispute_disagree.ok_or(ErrorCode::NoVotesRecorded)?;
        let total = agree.checked_add(disagree).ok_or(ErrorCode::OverflowError)?;

        require!(total > 0, ErrorCode::NoVotesRecorded);

        // Record dispute votes
        market.dispute_agree = agree;
        market.dispute_disagree = disagree;
        market.dispute_total_votes = total;

        // Calculate dispute agreement rate
        let agree_rate_bps = (agree as u64)
            .checked_mul(10000).ok_or(ErrorCode::OverflowError)?
            .checked_div(total as u64).ok_or(ErrorCode::DivisionByZero)?;

        // Check if dispute succeeded (≥60% agree to flip)
        if agree_rate_bps >= config.dispute_success_threshold as u64 {
            // Dispute succeeded → flip outcome
            match market.proposed_outcome {
                Some(true) => Some(false),   // YES → NO
                Some(false) => Some(true),   // NO → YES
                None => None,                // INVALID stays INVALID
            }
        } else {
            // Dispute failed → keep proposed outcome
            market.proposed_outcome
        }
    } else {
        // RESOLVING case: No dispute occurred
        // Verify dispute window has expired
        let dispute_deadline = market.resolution_proposed_at
            .checked_add(config.dispute_period)
            .ok_or(ErrorCode::OverflowError)?;

        require!(
            clock.unix_timestamp >= dispute_deadline,
            ErrorCode::DisputePeriodNotEnded
        );

        // Keep proposed outcome (no dispute)
        market.proposed_outcome
    };

    // SECURITY FIX (Finding #5 - Week 3): Verify bounded loss protection
    // Ensure market creator loss never exceeds b * ln(2) ≈ 0.693 * b
    // This protects against bugs in LMSR implementation or numerical errors
    // Already implemented, just updating comment for clarity
    verify_bounded_loss(
        market.initial_liquidity,
        market.current_liquidity,
        market.b_parameter,
    )?;

    // Set final outcome and mark as finalized
    market.final_outcome = final_outcome;
    market.was_disputed = was_disputed;
    market.finalized_at = clock.unix_timestamp;

    // Transition state: RESOLVING → FINALIZED (using wrapper for validation)
    market.transition_state(MarketState::Finalized)?;

    // Emit event
    emit!(MarketFinalized {
        market_id: market.market_id,
        final_outcome,
        was_disputed,
        timestamp: market.finalized_at,
    });

    Ok(())
}


#[event]
pub struct MarketFinalized {
    pub market_id: [u8; 32],
    pub final_outcome: Option<bool>,
    pub was_disputed: bool,
    pub timestamp: i64,
}
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_dispute_success_calculation() {
        // Test 60% threshold
        let agree = 60u32;
        let disagree = 40u32;
        let total = agree + disagree;

        let agree_bps = (agree as u64) * 10000 / (total as u64);
        assert_eq!(agree_bps, 6000); // Exactly 60%

        let threshold = 6000u64;
        assert!(agree_bps >= threshold); // Should succeed
    }

    #[test]
    fn test_below_threshold() {
        // 59% should fail
        let agree = 59u32;
        let disagree = 41u32;
        let total = agree + disagree;

        let agree_bps = (agree as u64) * 10000 / (total as u64);
        assert_eq!(agree_bps, 5900); // 59%

        let threshold = 6000u64;
        assert!(agree_bps < threshold); // Should fail
    }

    #[test]
    fn test_outcome_flipping() {
        // Test outcome flipping logic
        let proposed_yes: Option<bool> = Some(true);
        let proposed_no: Option<bool> = Some(false);

        // Flip YES → NO
        let flipped_yes = match proposed_yes {
            Some(true) => Some(false),
            Some(false) => Some(true),
            None => None,
        };
        assert_eq!(flipped_yes, Some(false));

        // Flip NO → YES
        let flipped_no = match proposed_no {
            Some(true) => Some(false),
            Some(false) => Some(true),
            None => None,
        };
        assert_eq!(flipped_no, Some(true));
    }

    #[test]
    fn test_50_50_split() {
        // 50/50 should fail (< 60%)
        let agree = 50u32;
        let disagree = 50u32;
        let total = agree + disagree;

        let agree_bps = (agree as u64) * 10000 / (total as u64);
        assert_eq!(agree_bps, 5000); // 50%

        let threshold = 6000u64;
        assert!(agree_bps < threshold); // Should fail
    }

    #[test]
    fn test_exact_threshold() {
        // Exactly 60% should pass (inclusive)
        let agree = 6u32;
        let disagree = 4u32;
        let total = agree + disagree;

        let agree_bps = (agree as u64) * 10000 / (total as u64);
        assert_eq!(agree_bps, 6000);

        let threshold = 6000u64;
        assert!(agree_bps >= threshold); // Should pass (>=)
    }
}
