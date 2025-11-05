use anchor_lang::prelude::*;

/// Vote type enum (proposal or dispute)
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
#[repr(u8)]
pub enum VoteType {
    /// Vote on market proposal (approve/reject)
    Proposal = 0,
    /// Vote on dispute (agree/disagree with dispute)
    Dispute = 1,
}

/// Individual vote record (prevents double-voting)
///
/// This account stores a single vote cast by a user on either
/// a proposal or dispute. The PDA design ensures one vote per (market, user, vote_type).
///
/// PDA Seeds: ["vote", market.key(), user.key(), vote_type_byte]
/// Size: 83 bytes (8 discriminator + 75 data)
#[account]
pub struct VoteRecord {
    /// Market being voted on
    pub market: Pubkey,

    /// User who cast the vote
    pub user: Pubkey,

    /// Type of vote (proposal or dispute)
    pub vote_type: VoteType,

    /// Vote value
    /// - For proposal: true = like, false = dislike
    /// - For dispute: true = agree with dispute, false = disagree
    pub vote: bool,

    /// Timestamp when vote was cast (Unix seconds)
    pub voted_at: i64,

    /// Bump seed for PDA derivation
    pub bump: u8,
}

impl VoteRecord {
    /// Calculate exact account size
    ///
    /// Total: 83 bytes (8 discriminator + 75 data)
    pub const LEN: usize = 8        // discriminator
        + 32                        // market
        + 32                        // user
        + 1                         // vote_type (VoteType enum u8)
        + 1                         // vote (bool)
        + 8                         // voted_at
        + 1;                        // bump

    /// Check if this is a proposal vote
    pub fn is_proposal_vote(&self) -> bool {
        self.vote_type == VoteType::Proposal
    }

    /// Check if this is a dispute vote
    pub fn is_dispute_vote(&self) -> bool {
        self.vote_type == VoteType::Dispute
    }

    /// Get vote as approval (for proposal votes)
    ///
    /// Returns: Some(true) = approve, Some(false) = reject, None = not a proposal vote
    pub fn as_approval(&self) -> Option<bool> {
        if self.is_proposal_vote() {
            Some(self.vote)
        } else {
            None
        }
    }

    /// Get vote as dispute agreement (for dispute votes)
    ///
    /// Returns: Some(true) = agree with dispute, Some(false) = disagree, None = not a dispute vote
    pub fn as_dispute_agreement(&self) -> Option<bool> {
        if self.is_dispute_vote() {
            Some(self.vote)
        } else {
            None
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_vote_record_size() {
        assert_eq!(VoteRecord::LEN, 83);
    }

    #[test]
    fn test_vote_type_checks() {
        let mut vote = create_test_vote(VoteType::Proposal, true);

        assert!(vote.is_proposal_vote());
        assert!(!vote.is_dispute_vote());

        vote.vote_type = VoteType::Dispute;
        assert!(!vote.is_proposal_vote());
        assert!(vote.is_dispute_vote());
    }

    #[test]
    fn test_as_approval() {
        let approve_vote = create_test_vote(VoteType::Proposal, true);
        assert_eq!(approve_vote.as_approval(), Some(true));

        let reject_vote = create_test_vote(VoteType::Proposal, false);
        assert_eq!(reject_vote.as_approval(), Some(false));

        let dispute_vote = create_test_vote(VoteType::Dispute, true);
        assert_eq!(dispute_vote.as_approval(), None);
    }

    #[test]
    fn test_as_dispute_agreement() {
        let agree_vote = create_test_vote(VoteType::Dispute, true);
        assert_eq!(agree_vote.as_dispute_agreement(), Some(true));

        let disagree_vote = create_test_vote(VoteType::Dispute, false);
        assert_eq!(disagree_vote.as_dispute_agreement(), Some(false));

        let proposal_vote = create_test_vote(VoteType::Proposal, true);
        assert_eq!(proposal_vote.as_dispute_agreement(), None);
    }

    #[test]
    fn test_vote_type_serialization() {
        // Test that enum values match expected u8 values
        assert_eq!(VoteType::Proposal as u8, 0);
        assert_eq!(VoteType::Dispute as u8, 1);
    }

    // Helper function to create test vote
    fn create_test_vote(vote_type: VoteType, vote: bool) -> VoteRecord {
        VoteRecord {
            market: Pubkey::new_unique(),
            user: Pubkey::new_unique(),
            vote_type,
            vote,
            voted_at: 1699564800, // Example timestamp
            bump: 255,
        }
    }
}
