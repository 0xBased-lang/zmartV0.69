use anchor_lang::prelude::*;

/// Type of vote being recorded
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub enum VoteType {
    /// Vote on market proposal (like/dislike)
    Proposal = 0,
    /// Vote on dispute resolution (support/reject)
    Dispute = 1,
}

/// Individual vote record for proposal or dispute voting
///
/// PDA Seeds: [b"vote", market_key, user_key, &[vote_type as u8]]
///
/// This ensures one vote per (market, user, vote_type) tuple,
/// preventing duplicate votes while allowing both proposal and
/// dispute votes on the same market.
#[account]
pub struct VoteRecord {
    /// Market being voted on (32 bytes)
    pub market: Pubkey,

    /// User who cast the vote (32 bytes)
    pub user: Pubkey,

    /// Type of vote (Proposal or Dispute) (1 byte)
    pub vote_type: VoteType,

    /// Vote value (1 byte)
    /// - For proposals: true = like/support, false = dislike/oppose
    /// - For disputes: true = support outcome change, false = reject change
    pub vote: bool,

    /// Unix timestamp when vote was cast (8 bytes)
    pub voted_at: i64,

    /// PDA bump seed (1 byte)
    pub bump: u8,
}

impl VoteRecord {
    /// Total account size in bytes
    pub const LEN: usize = 8 +  // discriminator
        32 +                     // market
        32 +                     // user
        1 +                      // vote_type
        1 +                      // vote
        8 +                      // voted_at
        1;                       // bump
    // Total: 83 bytes
}
