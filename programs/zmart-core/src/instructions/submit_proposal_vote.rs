use anchor_lang::prelude::*;
use crate::state::*;
use crate::error::ErrorCode;

/// Submit a vote on a market proposal (like/dislike)
///
/// This instruction creates an on-chain VoteRecord that serves as proof of vote.
/// The actual vote aggregation happens off-chain for gas efficiency, but the
/// VoteRecord provides verifiability and prevents duplicate votes.
///
/// # Arguments
///
/// * `vote` - true for "like" (support), false for "dislike" (oppose)
///
/// # Errors
///
/// * `ErrorCode::InvalidStateForVoting` - Market is not in PROPOSED state
/// * `ErrorCode::AlreadyVoted` - User has already voted (PDA init will fail)
///
/// # PDA Seeds
///
/// VoteRecord: [b"vote", market.key(), user.key(), &[VoteType::Proposal as u8]]
///
/// This ensures one vote per (market, user, vote_type) tuple, preventing
/// duplicate votes while allowing both proposal and dispute votes.
#[derive(Accounts)]
pub struct SubmitProposalVote<'info> {
    /// Market being voted on (must be in PROPOSED state)
    #[account(
        seeds = [b"market", &market.market_id],
        bump = market.bump,
        constraint = market.state == MarketState::Proposed @ ErrorCode::InvalidStateForVoting
    )]
    pub market: Account<'info, MarketAccount>,

    /// Vote record to create (PDA prevents duplicate votes)
    ///
    /// The `init` constraint will fail if this account already exists,
    /// which happens when a user tries to vote twice on the same proposal.
    /// This provides automatic duplicate vote prevention at the protocol level.
    #[account(
        init,
        payer = user,
        space = VoteRecord::LEN,
        seeds = [
            b"vote",
            market.key().as_ref(),
            user.key().as_ref(),
            &[VoteType::Proposal as u8]
        ],
        bump
    )]
    pub vote_record: Account<'info, VoteRecord>,

    /// User submitting the vote (pays for account creation)
    #[account(mut)]
    pub user: Signer<'info>,

    /// System program for account creation
    pub system_program: Program<'info, System>,
}

/// Handler for submit_proposal_vote instruction
///
/// Creates a VoteRecord with the user's vote choice and emits an event
/// for the backend to index. The backend will aggregate all votes off-chain
/// and eventually call approve_proposal when the 70% threshold is met.
pub fn handler(ctx: Context<SubmitProposalVote>, vote: bool) -> Result<()> {
    let vote_record = &mut ctx.accounts.vote_record;
    let clock = Clock::get()?;

    // Populate VoteRecord fields
    vote_record.market = ctx.accounts.market.key();
    vote_record.user = ctx.accounts.user.key();
    vote_record.vote_type = VoteType::Proposal;
    vote_record.vote = vote;
    vote_record.voted_at = clock.unix_timestamp;
    vote_record.bump = ctx.bumps.vote_record;

    // Emit event for backend indexing
    emit!(ProposalVoteSubmitted {
        market_id: ctx.accounts.market.market_id,
        user: vote_record.user,
        vote,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

/// Event emitted when a proposal vote is submitted
///
/// The backend listens for these events and aggregates votes off-chain.
/// When the 70% approval threshold is reached, the backend calls
/// approve_proposal to transition the market to APPROVED state.
#[event]
pub struct ProposalVoteSubmitted {
    /// Market ID (not pubkey, the actual market_id bytes)
    pub market_id: [u8; 32],
    /// User who voted
    pub user: Pubkey,
    /// Vote choice (true = like, false = dislike)
    pub vote: bool,
    /// Timestamp when vote was cast
    pub timestamp: i64,
}
