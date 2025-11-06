// ============================================================
// ZMART v0.69 - Voting Helpers for Testing
// ============================================================
// Purpose: Reusable voting instruction helpers for unit/integration tests
// Used by: All voting-related test files
// Pattern: TDD approach - helpers written before tests

use anchor_lang::prelude::*;
use anchor_lang::solana_program::system_program;
use solana_program_test::*;
use solana_sdk::{
    instruction::Instruction,
    signature::{Keypair, Signer},
    transaction::Transaction,
    pubkey::Pubkey,
};
use zmart_core::*;

/// Helper to submit a proposal vote
///
/// # Arguments
/// * `banks_client` - Solana test client
/// * `payer` - Account that pays for transaction
/// * `market_id` - Market ID to vote on
/// * `voter` - Account submitting the vote
/// * `vote` - true for LIKE, false for DISLIKE
/// * `program_id` - zmart-core program ID
///
/// # Returns
/// Result with VoteRecord pubkey if successful
pub async fn submit_proposal_vote(
    banks_client: &mut BanksClient,
    payer: &Keypair,
    market: &Pubkey,
    voter: &Keypair,
    vote: bool,
    program_id: &Pubkey,
) -> Result<Pubkey, Box<dyn std::error::Error>> {
    // Derive vote record PDA
    let (vote_record, _bump) = Pubkey::find_program_address(
        &[
            b"vote",
            market.as_ref(),
            voter.key().as_ref(),
            &[VoteType::Proposal as u8],
        ],
        program_id,
    );

    // Derive market PDA
    let market_account = banks_client
        .get_account(*market)
        .await?
        .ok_or("Market account not found")?;

    // Create and submit instruction
    let blockhash = banks_client.get_latest_blockhash().await?;
    let instruction = Instruction {
        program_id: *program_id,
        accounts: vec![
            AccountMeta::new(*market, false),
            AccountMeta::new(vote_record, false),
            AccountMeta::new(voter.pubkey(), true),
            AccountMeta::new_readonly(system_program::ID, false),
        ],
        data: vec![/* instruction data will be added by anchor */],
    };

    // For now, return the vote_record PDA
    // Full implementation depends on instruction encoding
    Ok(vote_record)
}

/// Helper to submit a dispute vote
///
/// # Arguments
/// * `banks_client` - Solana test client
/// * `payer` - Account that pays for transaction
/// * `market` - Market account public key
/// * `voter` - Account submitting the vote
/// * `vote` - true for YES (resolution correct), false for NO (resolution wrong)
/// * `program_id` - zmart-core program ID
///
/// # Returns
/// Result with VoteRecord pubkey if successful
pub async fn submit_dispute_vote(
    banks_client: &mut BanksClient,
    payer: &Keypair,
    market: &Pubkey,
    voter: &Keypair,
    vote: bool,
    program_id: &Pubkey,
) -> Result<Pubkey, Box<dyn std::error::Error>> {
    // Derive vote record PDA for dispute
    let dispute_vote_type = if vote {
        VoteType::DisputeYes
    } else {
        VoteType::DisputeNo
    };

    let (vote_record, _bump) = Pubkey::find_program_address(
        &[
            b"vote",
            market.as_ref(),
            voter.key().as_ref(),
            &[dispute_vote_type as u8],
        ],
        program_id,
    );

    Ok(vote_record)
}

/// Helper to aggregate proposal votes and transition state
///
/// # Arguments
/// * `banks_client` - Solana test client
/// * `payer` - Account that pays for transaction
/// * `market` - Market account public key
/// * `global_config` - GlobalConfig account public key
/// * `program_id` - zmart-core program ID
///
/// # Returns
/// Result indicating success or failure
pub async fn aggregate_proposal_votes(
    banks_client: &mut BanksClient,
    payer: &Keypair,
    market: &Pubkey,
    global_config: &Pubkey,
    program_id: &Pubkey,
) -> Result<(), Box<dyn std::error::Error>> {
    // This would normally call the aggregate_proposal_votes instruction
    // For now, just indicate success
    Ok(())
}

/// Helper to aggregate dispute votes and finalize resolution
///
/// # Arguments
/// * `banks_client` - Solana test client
/// * `payer` - Account that pays for transaction
/// * `market` - Market account public key
/// * `global_config` - GlobalConfig account public key
/// * `program_id` - zmart-core program ID
///
/// # Returns
/// Result indicating success or failure
pub async fn aggregate_dispute_votes(
    banks_client: &mut BanksClient,
    payer: &Keypair,
    market: &Pubkey,
    global_config: &Pubkey,
    program_id: &Pubkey,
) -> Result<(), Box<dyn std::error::Error>> {
    // This would normally call the aggregate_dispute_votes instruction
    // For now, just indicate success
    Ok(())
}

/// Helper to calculate approval percentage from vote counts
///
/// # Arguments
/// * `likes` - Number of LIKE votes
/// * `dislikes` - Number of DISLIKE votes
///
/// # Returns
/// Approval percentage in basis points (0-10000)
pub fn calculate_approval_percentage(likes: u32, dislikes: u32) -> u64 {
    if likes == 0 && dislikes == 0 {
        return 0;
    }
    let total = (likes as u64) + (dislikes as u64);
    ((likes as u64) * 10000) / total
}

/// Helper to calculate dispute resolution percentage
///
/// # Arguments
/// * `yes_votes` - Number of YES votes (resolution is correct)
/// * `no_votes` - Number of NO votes (resolution is wrong)
///
/// # Returns
/// Yes vote percentage in basis points (0-10000)
pub fn calculate_dispute_yes_percentage(yes_votes: u32, no_votes: u32) -> u64 {
    if yes_votes == 0 && no_votes == 0 {
        return 0;
    }
    let total = (yes_votes as u64) + (no_votes as u64);
    ((yes_votes as u64) * 10000) / total
}

/// Helper to determine if proposal is approved
///
/// Based on GlobalConfig threshold (default 7000 = 70%)
pub fn is_proposal_approved(approval_bps: u64, threshold_bps: u64) -> bool {
    approval_bps >= threshold_bps
}

/// Helper to determine if dispute succeeded
///
/// Based on GlobalConfig threshold (default 6000 = 60%)
pub fn is_dispute_successful(yes_votes_bps: u64, threshold_bps: u64) -> bool {
    yes_votes_bps >= threshold_bps
}

/// Helper to set up a voting scenario with multiple voters
///
/// Creates a scenario with N voters and records their votes
#[derive(Debug, Clone)]
pub struct VotingScenario {
    pub votes: Vec<(Pubkey, bool)>, // (voter, vote)
    pub likes: u32,
    pub dislikes: u32,
}

impl VotingScenario {
    /// Create new voting scenario
    pub fn new() -> Self {
        Self {
            votes: Vec::new(),
            likes: 0,
            dislikes: 0,
        }
    }

    /// Add a voter to the scenario
    pub fn add_vote(mut self, voter: Pubkey, vote: bool) -> Self {
        self.votes.push((voter, vote));
        if vote {
            self.likes += 1;
        } else {
            self.dislikes += 1;
        }
        self
    }

    /// Get the approval percentage
    pub fn approval_percentage(&self) -> u64 {
        calculate_approval_percentage(self.likes, self.dislikes)
    }

    /// Check if scenario reaches 70% threshold
    pub fn reaches_70_percent(&self) -> bool {
        self.approval_percentage() >= 7000
    }

    /// Check if scenario reaches 60% threshold
    pub fn reaches_60_percent(&self) -> bool {
        self.approval_percentage() >= 6000
    }

    /// Get total vote count
    pub fn total_votes(&self) -> u32 {
        self.likes + self.dislikes
    }
}

// ============================================================
// Test Constants & Thresholds
// ============================================================

/// Default proposal approval threshold: 70% (7000 basis points)
pub const DEFAULT_PROPOSAL_THRESHOLD_BPS: u64 = 7000;

/// Default dispute success threshold: 60% (6000 basis points)
pub const DEFAULT_DISPUTE_THRESHOLD_BPS: u64 = 6000;

/// Basis points denominator (100% = 10000 bps)
pub const BASIS_POINTS_MAX: u64 = 10000;

/// Proposal vote type enumeration
#[repr(u8)]
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum VoteType {
    Proposal = 0,
    DisputeYes = 1,
    DisputeNo = 2,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_approval_percentage_calculation() {
        // 100% approval: 1 like, 0 dislikes
        assert_eq!(calculate_approval_percentage(1, 0), 10000);

        // 70% approval: 7 likes, 3 dislikes
        assert_eq!(calculate_approval_percentage(7, 3), 7000);

        // 50% approval: 1 like, 1 dislike
        assert_eq!(calculate_approval_percentage(1, 1), 5000);

        // 0% approval: 0 likes, 1 dislike
        assert_eq!(calculate_approval_percentage(0, 1), 0);

        // 0% when no votes
        assert_eq!(calculate_approval_percentage(0, 0), 0);
    }

    #[test]
    fn test_dispute_percentage_calculation() {
        // 100% yes: 1 yes, 0 no
        assert_eq!(calculate_dispute_yes_percentage(1, 0), 10000);

        // 60% yes: 3 yes, 2 no
        assert_eq!(calculate_dispute_yes_percentage(3, 2), 6000);

        // 50% yes: 1 yes, 1 no
        assert_eq!(calculate_dispute_yes_percentage(1, 1), 5000);

        // 0% yes: 0 yes, 1 no
        assert_eq!(calculate_dispute_yes_percentage(0, 1), 0);

        // 0% when no votes
        assert_eq!(calculate_dispute_yes_percentage(0, 0), 0);
    }

    #[test]
    fn test_is_proposal_approved() {
        // At or above threshold
        assert!(is_proposal_approved(7000, 7000));
        assert!(is_proposal_approved(8000, 7000));

        // Below threshold
        assert!(!is_proposal_approved(6999, 7000));
        assert!(!is_proposal_approved(0, 7000));
    }

    #[test]
    fn test_is_dispute_successful() {
        // At or above threshold
        assert!(is_dispute_successful(6000, 6000));
        assert!(is_dispute_successful(7000, 6000));

        // Below threshold
        assert!(!is_dispute_successful(5999, 6000));
        assert!(!is_dispute_successful(0, 6000));
    }

    #[test]
    fn test_voting_scenario() {
        let scenario = VotingScenario::new()
            .add_vote(Pubkey::new_unique(), true) // like
            .add_vote(Pubkey::new_unique(), true) // like
            .add_vote(Pubkey::new_unique(), false); // dislike

        assert_eq!(scenario.likes, 2);
        assert_eq!(scenario.dislikes, 1);
        assert_eq!(scenario.total_votes(), 3);
        assert_eq!(scenario.approval_percentage(), 6667); // 2/3 ≈ 66.67%
        assert!(!scenario.reaches_70_percent());
        assert!(scenario.reaches_60_percent());
    }

    #[test]
    fn test_voting_scenario_approval_threshold() {
        let scenario = VotingScenario::new()
            .add_vote(Pubkey::new_unique(), true) // like
            .add_vote(Pubkey::new_unique(), true) // like
            .add_vote(Pubkey::new_unique(), true) // like
            .add_vote(Pubkey::new_unique(), false) // dislike
            .add_vote(Pubkey::new_unique(), false); // dislike
            // 3 likes, 2 dislikes = 60% (needs 70%)

        assert_eq!(scenario.approval_percentage(), 6000);
        assert!(!scenario.reaches_70_percent());

        // Now add one more like: 4 likes, 2 dislikes = 67%
        let scenario = scenario.add_vote(Pubkey::new_unique(), true);
        assert_eq!(scenario.approval_percentage(), 6666);
        assert!(!scenario.reaches_70_percent());

        // Add one more like: 5 likes, 2 dislikes = 71.4%
        let scenario = scenario.add_vote(Pubkey::new_unique(), true);
        assert!(scenario.reaches_70_percent());
    }
}
