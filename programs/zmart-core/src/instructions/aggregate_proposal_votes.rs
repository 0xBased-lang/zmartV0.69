use anchor_lang::prelude::*;

use crate::error::ErrorCode;
use crate::state::{GlobalConfig, MarketAccount, MarketState};

/// Aggregate proposal votes and transition state if threshold met
#[derive(Accounts)]
pub struct AggregateProposalVotes<'info> {
    /// Market account (must be in PROPOSED state)
    #[account(
        mut,
        seeds = [b"market", &market.market_id],
        bump = market.bump,
        constraint = market.state == MarketState::Proposed @ ErrorCode::InvalidStateForVoting
    )]
    pub market: Account<'info, MarketAccount>,

    /// Global config (contains backend authority)
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
    ctx: Context<AggregateProposalVotes>,
    final_likes: u32,
    final_dislikes: u32,
) -> Result<()> {
    let market = &mut ctx.accounts.market;
    let clock = Clock::get()?;

    // Record vote counts on-chain
    market.proposal_likes = final_likes;
    market.proposal_dislikes = final_dislikes;

    // Calculate total votes with overflow protection
    let total_votes = final_likes
        .checked_add(final_dislikes)
        .ok_or(ErrorCode::OverflowError)?;

    // Calculate approval percentage
    // Formula: (likes / total) * 100
    let likes_percentage = if total_votes > 0 {
        (final_likes as u64)
            .checked_mul(100)
            .ok_or(ErrorCode::OverflowError)?
            / (total_votes as u64)
    } else {
        0u64 // Zero votes = 0% approval
    };

    // Check 70% threshold
    const APPROVAL_THRESHOLD: u64 = 70;
    let approved = likes_percentage >= APPROVAL_THRESHOLD;

    if approved {
        // Transition to APPROVED state
        market.state = MarketState::Approved;
        market.approved_at = clock.unix_timestamp;
    }
    // else: stays in PROPOSED (can re-aggregate later)

    // Emit event (always, for monitoring)
    emit!(ProposalAggregated {
        market_id: market.market_id,
        likes: final_likes,
        dislikes: final_dislikes,
        approval_percentage: likes_percentage as u8,
        approved,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

/// Proposal votes aggregated and approval decision made
#[event]
pub struct ProposalAggregated {
    pub market_id: [u8; 32],
    pub likes: u32,
    pub dislikes: u32,
    pub approval_percentage: u8, // 0-100
    pub approved: bool,          // true if >= 70%
    pub timestamp: i64,
}
