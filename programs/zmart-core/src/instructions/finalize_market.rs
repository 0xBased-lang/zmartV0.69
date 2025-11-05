use anchor_lang::prelude::*;
use crate::error::ErrorCode;
use crate::state::{GlobalConfig, MarketAccount, MarketState};

/// Set final outcome (RESOLVING/DISPUTED → FINALIZED)
///
/// Backend authority finalizes the market after vote aggregation.
/// - RESOLVING: Keep proposed outcome after dispute window expires
/// - DISPUTED: Check if ≥60% agree on flipping outcome
///
/// # Arguments
/// * `vote_yes_count` - Votes for YES outcome (used in DISPUTED state)
/// * `vote_no_count` - Votes for NO outcome (used in DISPUTED state)
/// * `total_votes` - Total votes cast (used in DISPUTED state)
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
    vote_yes_count: u64,
    vote_no_count: u64,
    total_votes: u64,
) -> Result<()> {
    let market = &mut ctx.accounts.market;
    let config = &ctx.accounts.global_config;
    let clock = Clock::get()?;

    // Determine final outcome based on current state
    let final_outcome = if market.state == MarketState::Disputed {
        // DISPUTED case: Use community votes to determine outcome
        require!(total_votes > 0, ErrorCode::NoVotesRecorded);

        // Convert u64 to u32 for storage (validate range)
        let vote_yes_u32 = vote_yes_count.try_into()
            .map_err(|_| ErrorCode::OverflowError)?;
        let vote_no_u32 = vote_no_count.try_into()
            .map_err(|_| ErrorCode::OverflowError)?;
        let total_u32 = total_votes.try_into()
            .map_err(|_| ErrorCode::OverflowError)?;

        // Record dispute votes
        market.dispute_agree = vote_yes_u32;
        market.dispute_disagree = vote_no_u32;
        market.dispute_total_votes = total_u32;

        // Calculate which outcome has majority support
        let yes_percentage_bps = (vote_yes_count as u128)
            .checked_mul(10000).ok_or(ErrorCode::OverflowError)?
            .checked_div(total_votes as u128).ok_or(ErrorCode::DivisionByZero)? as u64;

        // Determine final outcome: YES if ≥60% vote YES, otherwise NO
        // (Note: this treats abstentions as NO votes)
        if yes_percentage_bps >= config.dispute_success_threshold as u64 {
            // ≥60% voted YES
            Some(true)
        } else {
            // <60% voted YES (includes NO votes + abstentions)
            Some(false)
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

    // Set final outcome and mark as finalized
    market.final_outcome = final_outcome;
    market.finalized_at = clock.unix_timestamp;
    market.state = MarketState::Finalized;

    // Emit event
    // emit!(MarketFinalized {
    //     market_id: market.market_id,
    //     final_outcome,
    //     was_disputed: market.state == MarketState::Disputed,
    //     timestamp: market.finalized_at,
    // });

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_vote_percentage_calculation() {
        // Test 60% threshold
        let yes = 60u64;
        let no = 40u64;
        let total = yes + no;

        let yes_bps = (yes as u128) * 10000 / (total as u128);
        assert_eq!(yes_bps, 6000); // Exactly 60%

        let threshold = 6000u64;
        assert!(yes_bps >= threshold as u128);
    }

    #[test]
    fn test_below_threshold() {
        // 59% should result in NO outcome
        let yes = 59u64;
        let no = 41u64;
        let total = yes + no;

        let yes_bps = (yes as u128) * 10000 / (total as u128);
        assert_eq!(yes_bps, 5900); // 59%

        let threshold = 6000u64;
        assert!(yes_bps < threshold as u128);
    }

    #[test]
    fn test_unanimous_yes() {
        // 100% YES should pass
        let yes = 100u64;
        let no = 0u64;
        let total = yes + no;

        let yes_bps = (yes as u128) * 10000 / (total as u128);
        assert_eq!(yes_bps, 10000); // 100%

        let threshold = 6000u64;
        assert!(yes_bps >= threshold as u128);
    }

    #[test]
    fn test_50_50_split() {
        // 50/50 should result in NO (< 60%)
        let yes = 50u64;
        let no = 50u64;
        let total = yes + no;

        let yes_bps = (yes as u128) * 10000 / (total as u128);
        assert_eq!(yes_bps, 5000); // 50%

        let threshold = 6000u64;
        assert!(yes_bps < threshold as u128);
    }

    #[test]
    fn test_exact_threshold() {
        // Exactly 60% should pass (inclusive)
        let yes = 6u64;
        let no = 4u64;
        let total = yes + no;

        let yes_bps = (yes as u128) * 10000 / (total as u128);
        assert_eq!(yes_bps, 6000);

        let threshold = 6000u64;
        assert!(yes_bps >= threshold as u128);
    }
}
