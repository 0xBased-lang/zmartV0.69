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
        seeds = [b"global-config"],
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
    let global_config = &ctx.accounts.global_config;
    let clock = Clock::get()?;

    // SECURITY FIX (Finding #3): Explicit authority validation (defense-in-depth)
    // Belt-and-suspenders approach: verify authority even though Anchor constraints also check
    require!(
        ctx.accounts.backend_authority.key() == global_config.backend_authority,
        ErrorCode::Unauthorized
    );

    // SECURITY: Verify transaction was actually signed by backend authority
    // Signer<'info> type already enforces this, but we verify explicitly for clarity
    require!(
        ctx.accounts.backend_authority.is_signer,
        ErrorCode::Unauthorized
    );

    // Record vote counts on-chain
    market.proposal_likes = final_likes;
    market.proposal_dislikes = final_dislikes;

    // Calculate total votes with overflow protection
    let total_votes = final_likes
        .checked_add(final_dislikes)
        .ok_or(ErrorCode::OverflowError)?;

    // Calculate approval percentage in basis points (0-10000)
    // Formula: (likes / total) * 10000
    let likes_bps = if total_votes > 0 {
        (final_likes as u64)
            .checked_mul(10000)
            .ok_or(ErrorCode::OverflowError)?
            / (total_votes as u64)
    } else {
        0u64 // Zero votes = 0% approval
    };

    // Check threshold from GlobalConfig (default 7000 = 70%)
    let approved = likes_bps >= global_config.proposal_approval_threshold as u64;

    if approved {
        // Transition to APPROVED state
        market.state = MarketState::Approved;
        market.approved_at = clock.unix_timestamp;
    }
    // else: stays in PROPOSED (can re-aggregate later)

    // Calculate display percentage (0-100) for event
    let approval_percentage = (likes_bps / 100) as u8;

    // Emit event (always, for monitoring)
    emit!(ProposalAggregated {
        market_id: market.market_id,
        likes: final_likes,
        dislikes: final_dislikes,
        approval_percentage,
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
