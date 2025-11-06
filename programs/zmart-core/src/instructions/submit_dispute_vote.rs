use anchor_lang::prelude::*;
use crate::state::*;
use crate::error::ErrorCode;

/// Submit a vote on a market dispute (agree/disagree)
///
/// This instruction creates an on-chain VoteRecord that serves as proof of vote.
/// The actual vote aggregation happens off-chain for gas efficiency, but the
/// VoteRecord provides verifiability and prevents duplicate votes.
///
/// # Arguments
///
/// * `vote` - true for "agree with dispute" (resolution is wrong),
///            false for "disagree with dispute" (resolution is correct)
///
/// # Errors
///
/// * `ErrorCode::InvalidStateForVoting` - Market is not in DISPUTED state
/// * `ErrorCode::AlreadyVoted` - User has already voted (PDA init will fail)
///
/// # PDA Seeds
///
/// VoteRecord: [b"vote", market.key(), user.key(), &[VoteType::Dispute as u8]]
///
/// This ensures one vote per (market, user, vote_type) tuple, preventing
/// duplicate votes while allowing both proposal and dispute votes.
#[derive(Accounts)]
pub struct SubmitDisputeVote<'info> {
    /// Market being voted on (must be in DISPUTED state)
    #[account(
        seeds = [b"market", &market.market_id],
        bump = market.bump,
        constraint = market.state == MarketState::Disputed @ ErrorCode::InvalidStateForVoting
    )]
    pub market: Account<'info, MarketAccount>,

    /// Vote record to create (PDA prevents duplicate votes)
    ///
    /// The `init` constraint will fail if this account already exists,
    /// which happens when a user tries to vote twice on the same dispute.
    /// This provides automatic duplicate vote prevention at the protocol level.
    #[account(
        init,
        payer = user,
        space = VoteRecord::LEN,
        seeds = [
            b"vote",
            market.key().as_ref(),
            user.key().as_ref(),
            &[VoteType::Dispute as u8]
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

/// Handler for submit_dispute_vote instruction
///
/// Creates a VoteRecord with the user's vote choice and emits an event
/// for the backend to index. The backend will aggregate all votes off-chain
/// and eventually call aggregate_dispute_votes to determine if dispute succeeds.
pub fn handler(ctx: Context<SubmitDisputeVote>, vote: bool) -> Result<()> {
    let vote_record = &mut ctx.accounts.vote_record;
    let clock = Clock::get()?;

    // Populate VoteRecord fields
    vote_record.market = ctx.accounts.market.key();
    vote_record.user = ctx.accounts.user.key();
    vote_record.vote_type = VoteType::Dispute;
    vote_record.vote = vote;
    vote_record.voted_at = clock.unix_timestamp;
    vote_record.bump = ctx.bumps.vote_record;

    // Emit event for backend indexing
    emit!(DisputeVoteSubmitted {
        market_id: ctx.accounts.market.market_id,
        user: vote_record.user,
        vote,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

/// Event emitted when a dispute vote is submitted
///
/// The backend listens for these events and aggregates votes off-chain.
/// When aggregation is complete, the backend calls aggregate_dispute_votes
/// to determine if the dispute threshold is met.
#[event]
pub struct DisputeVoteSubmitted {
    /// Market ID (not pubkey, the actual market_id bytes)
    pub market_id: [u8; 32],
    /// User who voted
    pub user: Pubkey,
    /// Vote choice (true = agree with dispute, false = disagree)
    pub vote: bool,
    /// Timestamp when vote was cast
    pub timestamp: i64,
}
