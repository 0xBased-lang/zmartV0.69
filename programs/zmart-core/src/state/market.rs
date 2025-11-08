use anchor_lang::prelude::*;
use crate::error::ErrorCode;

/// Market lifecycle states (7-state FSM)
///
/// State transitions:
/// PROPOSED → APPROVED → ACTIVE → RESOLVING → DISPUTED → FINALIZED
///                              → (skip DISPUTED) → FINALIZED
/// PROPOSED → CANCELLED (admin only)
/// APPROVED → CANCELLED (admin only)
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
#[repr(u8)]
pub enum MarketState {
    /// Created, awaiting community approval vote
    Proposed = 0,
    /// Approved by community, waiting for activation
    Approved = 1,
    /// Trading enabled, users can buy/sell shares
    Active = 2,
    /// Resolution proposed, dispute period active (48h default)
    Resolving = 3,
    /// Dispute in progress, community voting on outcome
    Disputed = 4,
    /// Final outcome set, claims enabled
    Finalized = 5,
    /// Market cancelled by admin (terminal state)
    Cancelled = 6,
}

/// Individual prediction market account
///
/// This account stores all market state including LMSR parameters,
/// share quantities, resolution data, and fee accumulation.
///
/// PDA Seeds: ["market", market_id]
/// Size: 421 bytes (8 discriminator + 413 data)
#[account]
pub struct MarketAccount {
    /// Unique market identifier (32-byte UUID from off-chain)
    pub market_id: [u8; 32],

    /// Market creator (receives creator rewards)
    pub creator: Pubkey,

    /// Current market state (see MarketState enum)
    pub state: MarketState,

    /// LMSR liquidity depth parameter (fixed-point, 9 decimals)
    /// Controls price sensitivity: larger b = less sensitive
    pub b_parameter: u64,

    /// Initial liquidity provided at market creation (in lamports)
    pub initial_liquidity: u64,

    /// Current liquidity in the pool (in lamports)
    pub current_liquidity: u64,

    /// Share quantities (fixed-point, 9 decimals)
    /// YES shares outstanding
    pub shares_yes: u64,

    /// NO shares outstanding
    pub shares_no: u64,

    /// Cumulative trading volume (in lamports)
    pub total_volume: u64,

    // ============================================================
    // Timestamps (i64 = Unix seconds)
    // ============================================================

    /// Market creation timestamp
    pub created_at: i64,

    /// Proposal approval timestamp
    pub approved_at: i64,

    /// Market activation timestamp (trading enabled)
    pub activated_at: i64,

    /// Resolution proposal timestamp
    pub resolution_proposed_at: i64,

    /// Market resolution timestamp (deprecated, use finalized_at)
    pub resolved_at: i64,

    /// Market finalization timestamp (final outcome set)
    pub finalized_at: i64,

    // ============================================================
    // Resolution Data
    // ============================================================

    /// Resolver's wallet address
    pub resolver: Pubkey,

    /// Proposed outcome (Some(true)=YES, Some(false)=NO, None=INVALID)
    pub proposed_outcome: Option<bool>,

    /// Final outcome after dispute period
    pub final_outcome: Option<bool>,

    /// IPFS hash of resolution evidence (46 bytes for CIDv0: Qm...)
    pub ipfs_evidence_hash: [u8; 46],

    // ============================================================
    // Dispute Tracking
    // ============================================================

    /// Dispute initiation timestamp
    pub dispute_initiated_at: i64,

    /// User who initiated the dispute
    pub dispute_initiator: Pubkey,

    // ============================================================
    // Fee Accumulation (in lamports)
    // ============================================================

    /// Protocol fees accumulated (3% default)
    pub accumulated_protocol_fees: u64,

    /// Resolver rewards accumulated (2% default)
    pub accumulated_resolver_fees: u64,

    /// Liquidity provider fees accumulated (5% default)
    pub accumulated_lp_fees: u64,

    // ============================================================
    // ProposalManager Voting (Off-chain aggregated, on-chain recorded)
    // ============================================================

    /// Number of "like" votes for proposal
    pub proposal_likes: u32,

    /// Number of "dislike" votes for proposal
    pub proposal_dislikes: u32,

    /// Total proposal votes cast
    pub proposal_total_votes: u32,

    // ============================================================
    // Resolution Voting (Off-chain aggregated, on-chain recorded)
    // ============================================================

    /// Number of "agree with resolution" votes
    pub resolution_agree: u32,

    /// Number of "disagree with resolution" votes
    pub resolution_disagree: u32,

    /// Total resolution votes cast
    pub resolution_total_votes: u32,

    // ============================================================
    // Dispute Voting (Off-chain aggregated, on-chain recorded)
    // ============================================================

    /// Number of "agree with dispute" votes
    pub dispute_agree: u32,

    /// Number of "disagree with dispute" votes
    pub dispute_disagree: u32,

    /// Total dispute votes cast
    pub dispute_total_votes: u32,

    /// Flag indicating if market was disputed
    pub was_disputed: bool,

    // ============================================================
    // Access Control
    // ============================================================

    /// Market cancellation flag (admin only)
    pub is_cancelled: bool,

    /// Market cancellation timestamp (if cancelled by admin)
    pub cancelled_at: Option<i64>,

    /// Reserved space for future upgrades (120 bytes)
    pub reserved: [u8; 120],

    /// Bump seed for PDA derivation
    pub bump: u8,
}

impl MarketAccount {
    /// Calculate exact account size
    ///
    /// Note: Actual size reported by Anchor compiler including alignment
    ///
    /// Total: 480 bytes (472 original + cancelled_at Option<i64> 16 bytes - reserved 8 bytes = +8 net)
    pub const LEN: usize = 480;

    /// Check if state transition is valid
    ///
    /// Valid transitions:
    /// - PROPOSED → APPROVED
    /// - APPROVED → ACTIVE
    /// - ACTIVE → RESOLVING
    /// - RESOLVING → DISPUTED
    /// - RESOLVING → FINALIZED
    /// - DISPUTED → FINALIZED
    pub fn can_transition_to(&self, new_state: MarketState) -> bool {
        use MarketState::*;
        matches!(
            (self.state, new_state),
            (Proposed, Approved)
                | (Approved, Active)
                | (Active, Resolving)
                | (Resolving, Disputed)
                | (Resolving, Finalized)
                | (Disputed, Finalized)
        )
    }

    /// Check if proposal voting passed the threshold
    ///
    /// Requires: proposal_total_votes > 0
    /// Returns: true if approval_rate >= threshold_bps
    pub fn proposal_approved(&self, threshold_bps: u16) -> bool {
        if self.proposal_total_votes == 0 {
            return false;
        }

        let approval_rate = (self.proposal_likes as u64 * 10000) / (self.proposal_total_votes as u64);
        approval_rate >= threshold_bps as u64
    }

    /// Check if dispute succeeded (≥60% agree by default)
    ///
    /// Requires: dispute_total_votes > 0
    /// Returns: true if agree_rate >= threshold_bps
    pub fn dispute_succeeded(&self, threshold_bps: u16) -> bool {
        if self.dispute_total_votes == 0 {
            return false;
        }

        let agree_rate = (self.dispute_agree as u64 * 10000) / (self.dispute_total_votes as u64);
        agree_rate >= threshold_bps as u64
    }

    /// Check if market is in active trading state
    pub fn is_tradable(&self) -> bool {
        self.state == MarketState::Active && !self.is_cancelled
    }

    /// Check if resolution period has ended (can finalize)
    pub fn can_finalize(&self, min_delay: i64, current_time: i64) -> bool {
        self.state == MarketState::Resolving
            && self.resolution_proposed_at > 0
            && current_time >= self.resolution_proposed_at + min_delay
    }

    /// Check if dispute period is still active
    pub fn can_dispute(&self, dispute_period: i64, current_time: i64) -> bool {
        self.state == MarketState::Resolving
            && self.resolution_proposed_at > 0
            && current_time < self.resolution_proposed_at + dispute_period
    }

    /// Get current market liquidity (sum of all shares value)
    pub fn get_liquidity(&self) -> u64 {
        self.current_liquidity
    }

    /// Calculate total fees accumulated
    pub fn total_fees_accumulated(&self) -> Result<u64> {
        self.accumulated_protocol_fees
            .checked_add(self.accumulated_resolver_fees)
            .and_then(|sum| sum.checked_add(self.accumulated_lp_fees))
            .ok_or_else(|| ErrorCode::OverflowError.into())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_market_account_size() {
        // Actual size may vary slightly due to struct padding/alignment
        // Test that our calculated size matches the actual size
        let actual_size = std::mem::size_of::<MarketAccount>();
        assert_eq!(MarketAccount::LEN, actual_size,
            "Calculated LEN ({}) doesn't match actual size ({})",
            MarketAccount::LEN, actual_size);
    }

    #[test]
    fn test_state_transitions() {
        let mut market = create_test_market();

        // Valid transitions
        market.state = MarketState::Proposed;
        assert!(market.can_transition_to(MarketState::Approved));

        market.state = MarketState::Approved;
        assert!(market.can_transition_to(MarketState::Active));

        market.state = MarketState::Active;
        assert!(market.can_transition_to(MarketState::Resolving));

        market.state = MarketState::Resolving;
        assert!(market.can_transition_to(MarketState::Disputed));
        assert!(market.can_transition_to(MarketState::Finalized));

        market.state = MarketState::Disputed;
        assert!(market.can_transition_to(MarketState::Finalized));

        // Invalid transitions
        market.state = MarketState::Proposed;
        assert!(!market.can_transition_to(MarketState::Active));
        assert!(!market.can_transition_to(MarketState::Finalized));

        market.state = MarketState::Active;
        assert!(!market.can_transition_to(MarketState::Proposed));
        assert!(!market.can_transition_to(MarketState::Finalized));
    }

    #[test]
    fn test_proposal_voting() {
        let mut market = create_test_market();

        // 70% threshold
        market.proposal_likes = 70;
        market.proposal_dislikes = 30;
        market.proposal_total_votes = 100;

        assert!(market.proposal_approved(7000)); // Exactly 70%

        // Just below threshold
        market.proposal_likes = 69;
        market.proposal_total_votes = 100;
        assert!(!market.proposal_approved(7000));

        // No votes
        market.proposal_total_votes = 0;
        assert!(!market.proposal_approved(7000));
    }

    #[test]
    fn test_dispute_voting() {
        let mut market = create_test_market();

        // 60% threshold
        market.dispute_agree = 60;
        market.dispute_disagree = 40;
        market.dispute_total_votes = 100;

        assert!(market.dispute_succeeded(6000)); // Exactly 60%

        // Just below threshold
        market.dispute_agree = 59;
        market.dispute_total_votes = 100;
        assert!(!market.dispute_succeeded(6000));
    }

    #[test]
    fn test_tradability() {
        let mut market = create_test_market();

        // Active and not cancelled
        market.state = MarketState::Active;
        market.is_cancelled = false;
        assert!(market.is_tradable());

        // Cancelled
        market.is_cancelled = true;
        assert!(!market.is_tradable());

        // Not active
        market.is_cancelled = false;
        market.state = MarketState::Proposed;
        assert!(!market.is_tradable());
    }

    #[test]
    fn test_can_finalize() {
        let mut market = create_test_market();

        market.state = MarketState::Resolving;
        market.resolution_proposed_at = 1000;

        let min_delay = 86400; // 24 hours

        // Too early
        assert!(!market.can_finalize(min_delay, 1000 + 86399));

        // Exactly at threshold
        assert!(market.can_finalize(min_delay, 1000 + 86400));

        // After threshold
        assert!(market.can_finalize(min_delay, 1000 + 100000));

        // Wrong state
        market.state = MarketState::Active;
        assert!(!market.can_finalize(min_delay, 1000 + 86400));
    }

    #[test]
    fn test_can_dispute() {
        let mut market = create_test_market();

        market.state = MarketState::Resolving;
        market.resolution_proposed_at = 1000;

        let dispute_period = 259200; // 3 days

        // Within dispute period
        assert!(market.can_dispute(dispute_period, 1000 + 100000));

        // Exactly at end of period
        assert!(!market.can_dispute(dispute_period, 1000 + 259200));

        // After dispute period
        assert!(!market.can_dispute(dispute_period, 1000 + 300000));
    }

    #[test]
    fn test_total_fees_accumulated() {
        let mut market = create_test_market();

        market.accumulated_protocol_fees = 1000;
        market.accumulated_resolver_fees = 500;
        market.accumulated_lp_fees = 1500;

        assert_eq!(market.total_fees_accumulated().unwrap(), 3000);
    }

    // Helper function to create test market
    fn create_test_market() -> MarketAccount {
        MarketAccount {
            market_id: [0; 32],
            creator: Pubkey::new_unique(),
            state: MarketState::Proposed,
            b_parameter: 1000 * 1_000_000_000, // 1000 SOL equivalent
            initial_liquidity: 10_000_000_000, // 10 SOL
            current_liquidity: 10_000_000_000,
            shares_yes: 0,
            shares_no: 0,
            total_volume: 0,
            created_at: 0,
            approved_at: 0,
            activated_at: 0,
            resolution_proposed_at: 0,
            resolved_at: 0,
            finalized_at: 0,
            resolver: Pubkey::default(),
            proposed_outcome: None,
            final_outcome: None,
            ipfs_evidence_hash: [0; 46],
            dispute_initiated_at: 0,
            dispute_initiator: Pubkey::default(),
            accumulated_protocol_fees: 0,
            accumulated_resolver_fees: 0,
            accumulated_lp_fees: 0,
            proposal_likes: 0,
            proposal_dislikes: 0,
            proposal_total_votes: 0,
            resolution_agree: 0,
            resolution_disagree: 0,
            resolution_total_votes: 0,
            dispute_agree: 0,
            dispute_disagree: 0,
            dispute_total_votes: 0,
            was_disputed: false,
            is_cancelled: false,
            cancelled_at: None,
            reserved: [0; 120],
            bump: 255,
        }
    }
}
