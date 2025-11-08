use anchor_lang::prelude::*;

use crate::error::ErrorCode;
use crate::state::{GlobalConfig, MarketAccount, MarketState};

/// Aggregate dispute votes and transition state based on threshold
#[derive(Accounts)]
pub struct AggregateDisputeVotes<'info> {
    /// Market account (must be in DISPUTED state)
    #[account(
        mut,
        seeds = [b"market", &market.market_id],
        bump = market.bump,
        constraint = market.state == MarketState::Disputed @ ErrorCode::InvalidStateForVoting
    )]
    pub market: Account<'info, MarketAccount>,

    /// Global config (contains backend authority and dispute threshold)
    #[account(
        seeds = [b"global_config"],
        bump = global_config.bump,
    )]
    pub global_config: Account<'info, GlobalConfig>,

    /// Backend authority (must match global config)
    #[account(
        constraint = backend_authority.key() == global_config.backend_authority @ ErrorCode::Unauthorized
    )]
    pub backend_authority: Signer<'info>,
}

pub fn handler(
    ctx: Context<AggregateDisputeVotes>,
    final_agrees: u32,
    final_disagrees: u32,
) -> Result<()> {
    let market = &mut ctx.accounts.market;
    let global_config = &ctx.accounts.global_config;
    let clock = Clock::get()?;

    // Record vote counts on-chain
    market.dispute_agree = final_agrees;
    market.dispute_disagree = final_disagrees;

    // Calculate total votes with overflow protection
    let total_votes = final_agrees
        .checked_add(final_disagrees)
        .ok_or(ErrorCode::OverflowError)?;

    market.dispute_total_votes = total_votes;

    // Calculate agreement percentage using helper method
    // Returns: (agrees / total) * 10000 >= threshold_bps
    let dispute_succeeded = market.dispute_succeeded(global_config.dispute_success_threshold);

    // Calculate percentage for event (0-100)
    let agreement_percentage = if total_votes > 0 {
        ((final_agrees as u64)
            .checked_mul(100)
            .ok_or(ErrorCode::OverflowError)?
            / (total_votes as u64)) as u8
    } else {
        0u8 // Zero votes = 0% agreement = dispute fails
    };

    // State transition based on dispute outcome
    if dispute_succeeded {
        // >=60% agree: Resolution rejected, return to RESOLVING
        market.state = MarketState::Resolving;
        market.was_disputed = true;
        // Note: resolution_proposed_at remains set (for dispute period calculation)
    } else {
        // <60% agree: Original resolution accepted, finalize market
        market.state = MarketState::Finalized;
        market.resolved_at = clock.unix_timestamp;
        market.was_disputed = true;
    }

    // Emit event (always, for monitoring)
    emit!(DisputeAggregated {
        market_id: market.market_id,
        agrees: final_agrees,
        disagrees: final_disagrees,
        agreement_percentage,
        dispute_succeeded,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

/// Dispute votes aggregated and resolution decision made
#[event]
pub struct DisputeAggregated {
    pub market_id: [u8; 32],
    pub agrees: u32,
    pub disagrees: u32,
    pub agreement_percentage: u8, // 0-100
    pub dispute_succeeded: bool,  // true if >= 60%
    pub timestamp: i64,
}
