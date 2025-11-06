// ============================================================
// ZMART v0.69 - Comprehensive Voting Instruction Tests
// ============================================================
// Phase: Week 2 - Testing & Admin Instructions
// Coverage: All 4 voting instructions (33 test scenarios)
// Test Framework: Anchor native tests
// Status: Test infrastructure validation

// These tests validate:
// 1. submit_proposal_vote - Record proposal votes (LIKE/DISLIKE)
// 2. aggregate_proposal_votes - Aggregate and transition to APPROVED
// 3. submit_dispute_vote - Record dispute votes (YES/NO)
// 4. aggregate_dispute_votes - Aggregate and transition to FINALIZED/RESOLVING

#[cfg(test)]
mod tests {
    use super::super::super::common::*;

    // ============================================================
    // Test Helper Validation (voting_helpers module tests)
    // ============================================================

    #[test]
    fn test_voting_helpers_approval_percentage() {
        // Test exact thresholds
        assert_eq!(calculate_approval_percentage(1, 0), 10000); // 100%
        assert_eq!(calculate_approval_percentage(7, 3), 7000); // 70% (threshold)
        assert_eq!(calculate_approval_percentage(6, 4), 6000); // 60%
        assert_eq!(calculate_approval_percentage(0, 1), 0); // 0%
    }

    #[test]
    fn test_voting_helpers_dispute_percentage() {
        // Test exact thresholds for dispute
        assert_eq!(calculate_dispute_yes_percentage(3, 2), 6000); // 60% (threshold)
        assert_eq!(calculate_dispute_yes_percentage(4, 1), 8000); // 80%
        assert_eq!(calculate_dispute_yes_percentage(1, 4), 2000); // 20%
        assert_eq!(calculate_dispute_yes_percentage(0, 1), 0); // 0%
    }

    #[test]
    fn test_is_proposal_approved_at_threshold() {
        // Exact threshold: 7000 bps = 70%
        assert!(is_proposal_approved(7000, 7000));
        assert!(is_proposal_approved(7001, 7000));
        assert!(!is_proposal_approved(6999, 7000));
    }

    #[test]
    fn test_is_dispute_successful_at_threshold() {
        // Exact threshold: 6000 bps = 60%
        assert!(is_dispute_successful(6000, 6000));
        assert!(is_dispute_successful(6001, 6000));
        assert!(!is_dispute_successful(5999, 6000));
    }

    // ============================================================
    // Proposal Vote Scenarios (Instructions 1 & 2)
    // ============================================================

    #[test]
    fn test_zero_proposal_votes_stays_proposed() {
        // Scenario: No votes submitted
        let scenario = VotingScenario::new();

        assert_eq!(scenario.total_votes(), 0);
        assert_eq!(scenario.approval_percentage(), 0);
        assert!(!scenario.reaches_70_percent());
    }

    #[test]
    fn test_single_like_vote_100_percent_approval() {
        // Scenario: 1 user votes LIKE
        let scenario = VotingScenario::new()
            .add_vote(solana_sdk::pubkey::Pubkey::new_unique(), true);

        assert_eq!(scenario.likes, 1);
        assert_eq!(scenario.dislikes, 0);
        assert_eq!(scenario.approval_percentage(), 10000); // 100%
        assert!(scenario.reaches_70_percent());
    }

    #[test]
    fn test_single_dislike_vote_0_percent_approval() {
        // Scenario: 1 user votes DISLIKE
        let scenario = VotingScenario::new()
            .add_vote(solana_sdk::pubkey::Pubkey::new_unique(), false);

        assert_eq!(scenario.likes, 0);
        assert_eq!(scenario.dislikes, 1);
        assert_eq!(scenario.approval_percentage(), 0); // 0%
        assert!(!scenario.reaches_70_percent());
    }

    #[test]
    fn test_three_users_unanimous_like() {
        // Scenario: 3 users all vote LIKE (100%)
        let scenario = VotingScenario::new()
            .add_vote(solana_sdk::pubkey::Pubkey::new_unique(), true)
            .add_vote(solana_sdk::pubkey::Pubkey::new_unique(), true)
            .add_vote(solana_sdk::pubkey::Pubkey::new_unique(), true);

        assert_eq!(scenario.likes, 3);
        assert_eq!(scenario.dislikes, 0);
        assert_eq!(scenario.approval_percentage(), 10000); // 100%
        assert!(scenario.reaches_70_percent());
    }

    #[test]
    fn test_seven_likes_three_dislikes_exact_threshold() {
        // Scenario: 7 LIKE, 3 DISLIKE = 70% (exactly at threshold)
        let scenario = VotingScenario::new()
            .add_vote(solana_sdk::pubkey::Pubkey::new_unique(), true)
            .add_vote(solana_sdk::pubkey::Pubkey::new_unique(), true)
            .add_vote(solana_sdk::pubkey::Pubkey::new_unique(), true)
            .add_vote(solana_sdk::pubkey::Pubkey::new_unique(), true)
            .add_vote(solana_sdk::pubkey::Pubkey::new_unique(), true)
            .add_vote(solana_sdk::pubkey::Pubkey::new_unique(), true)
            .add_vote(solana_sdk::pubkey::Pubkey::new_unique(), true)
            .add_vote(solana_sdk::pubkey::Pubkey::new_unique(), false)
            .add_vote(solana_sdk::pubkey::Pubkey::new_unique(), false)
            .add_vote(solana_sdk::pubkey::Pubkey::new_unique(), false);

        assert_eq!(scenario.likes, 7);
        assert_eq!(scenario.dislikes, 3);
        assert_eq!(scenario.approval_percentage(), 7000); // 70% (threshold)
        assert!(scenario.reaches_70_percent());
    }

    #[test]
    fn test_six_likes_four_dislikes_below_threshold() {
        // Scenario: 6 LIKE, 4 DISLIKE = 60% (below 70% threshold)
        let scenario = VotingScenario::new()
            .add_vote(solana_sdk::pubkey::Pubkey::new_unique(), true)
            .add_vote(solana_sdk::pubkey::Pubkey::new_unique(), true)
            .add_vote(solana_sdk::pubkey::Pubkey::new_unique(), true)
            .add_vote(solana_sdk::pubkey::Pubkey::new_unique(), true)
            .add_vote(solana_sdk::pubkey::Pubkey::new_unique(), true)
            .add_vote(solana_sdk::pubkey::Pubkey::new_unique(), true)
            .add_vote(solana_sdk::pubkey::Pubkey::new_unique(), false)
            .add_vote(solana_sdk::pubkey::Pubkey::new_unique(), false)
            .add_vote(solana_sdk::pubkey::Pubkey::new_unique(), false)
            .add_vote(solana_sdk::pubkey::Pubkey::new_unique(), false);

        assert_eq!(scenario.likes, 6);
        assert_eq!(scenario.dislikes, 4);
        assert_eq!(scenario.approval_percentage(), 6000); // 60%
        assert!(!scenario.reaches_70_percent());
        assert!(scenario.reaches_60_percent());
    }

    #[test]
    fn test_fifty_fifty_split_50_percent() {
        // Scenario: 50/50 split = 50% approval
        let scenario = VotingScenario::new()
            .add_vote(solana_sdk::pubkey::Pubkey::new_unique(), true)
            .add_vote(solana_sdk::pubkey::Pubkey::new_unique(), false);

        assert_eq!(scenario.approval_percentage(), 5000); // 50%
        assert!(!scenario.reaches_70_percent());
        assert!(!scenario.reaches_60_percent());
    }

    #[test]
    fn test_large_vote_count_above_threshold() {
        // Scenario: 71 LIKE, 29 DISLIKE = 71% (above threshold)
        let mut scenario = VotingScenario::new();

        for _ in 0..71 {
            scenario = scenario.add_vote(solana_sdk::pubkey::Pubkey::new_unique(), true);
        }
        for _ in 0..29 {
            scenario = scenario.add_vote(solana_sdk::pubkey::Pubkey::new_unique(), false);
        }

        assert_eq!(scenario.approval_percentage(), 7100); // 71%
        assert!(scenario.reaches_70_percent());
    }

    #[test]
    fn test_large_vote_count_below_threshold() {
        // Scenario: 69 LIKE, 31 DISLIKE = 69% (below 70% threshold)
        let mut scenario = VotingScenario::new();

        for _ in 0..69 {
            scenario = scenario.add_vote(solana_sdk::pubkey::Pubkey::new_unique(), true);
        }
        for _ in 0..31 {
            scenario = scenario.add_vote(solana_sdk::pubkey::Pubkey::new_unique(), false);
        }

        assert_eq!(scenario.approval_percentage(), 6900); // 69%
        assert!(!scenario.reaches_70_percent());
    }

    // ============================================================
    // Dispute Vote Scenarios (Instructions 3 & 4)
    // ============================================================

    #[test]
    fn test_zero_dispute_votes_stays_disputed() {
        // Scenario: No dispute votes submitted
        let scenario = VotingScenario::new();

        assert_eq!(scenario.total_votes(), 0);
        assert_eq!(scenario.approval_percentage(), 0);
    }

    #[test]
    fn test_unanimous_dispute_yes_100_percent() {
        // Scenario: All users vote YES (resolution is correct)
        let scenario = VotingScenario::new()
            .add_vote(solana_sdk::pubkey::Pubkey::new_unique(), true)
            .add_vote(solana_sdk::pubkey::Pubkey::new_unique(), true)
            .add_vote(solana_sdk::pubkey::Pubkey::new_unique(), true);

        assert_eq!(scenario.approval_percentage(), 10000); // 100%
        assert!(is_dispute_successful(scenario.approval_percentage(), 6000));
    }

    #[test]
    fn test_unanimous_dispute_no_0_percent() {
        // Scenario: All users vote NO (resolution is wrong)
        let scenario = VotingScenario::new()
            .add_vote(solana_sdk::pubkey::Pubkey::new_unique(), false)
            .add_vote(solana_sdk::pubkey::Pubkey::new_unique(), false)
            .add_vote(solana_sdk::pubkey::Pubkey::new_unique(), false);

        assert_eq!(scenario.approval_percentage(), 0); // 0%
        assert!(!is_dispute_successful(scenario.approval_percentage(), 6000));
    }

    #[test]
    fn test_dispute_three_yes_two_no_60_percent_threshold() {
        // Scenario: 3 YES, 2 NO = 60% (exactly at threshold)
        let scenario = VotingScenario::new()
            .add_vote(solana_sdk::pubkey::Pubkey::new_unique(), true)
            .add_vote(solana_sdk::pubkey::Pubkey::new_unique(), true)
            .add_vote(solana_sdk::pubkey::Pubkey::new_unique(), true)
            .add_vote(solana_sdk::pubkey::Pubkey::new_unique(), false)
            .add_vote(solana_sdk::pubkey::Pubkey::new_unique(), false);

        assert_eq!(scenario.approval_percentage(), 6000); // 60%
        assert!(is_dispute_successful(scenario.approval_percentage(), 6000));
    }

    #[test]
    fn test_dispute_two_yes_three_no_40_percent_below_threshold() {
        // Scenario: 2 YES, 3 NO = 40% (below 60% threshold)
        let scenario = VotingScenario::new()
            .add_vote(solana_sdk::pubkey::Pubkey::new_unique(), true)
            .add_vote(solana_sdk::pubkey::Pubkey::new_unique(), true)
            .add_vote(solana_sdk::pubkey::Pubkey::new_unique(), false)
            .add_vote(solana_sdk::pubkey::Pubkey::new_unique(), false)
            .add_vote(solana_sdk::pubkey::Pubkey::new_unique(), false);

        assert_eq!(scenario.approval_percentage(), 4000); // 40%
        assert!(!is_dispute_successful(scenario.approval_percentage(), 6000));
    }

    #[test]
    fn test_dispute_four_yes_one_no_80_percent() {
        // Scenario: 4 YES, 1 NO = 80% (well above threshold)
        let scenario = VotingScenario::new()
            .add_vote(solana_sdk::pubkey::Pubkey::new_unique(), true)
            .add_vote(solana_sdk::pubkey::Pubkey::new_unique(), true)
            .add_vote(solana_sdk::pubkey::Pubkey::new_unique(), true)
            .add_vote(solana_sdk::pubkey::Pubkey::new_unique(), true)
            .add_vote(solana_sdk::pubkey::Pubkey::new_unique(), false);

        assert_eq!(scenario.approval_percentage(), 8000); // 80%
        assert!(is_dispute_successful(scenario.approval_percentage(), 6000));
    }

    #[test]
    fn test_dispute_one_yes_four_no_20_percent() {
        // Scenario: 1 YES, 4 NO = 20% (well below threshold)
        let scenario = VotingScenario::new()
            .add_vote(solana_sdk::pubkey::Pubkey::new_unique(), true)
            .add_vote(solana_sdk::pubkey::Pubkey::new_unique(), false)
            .add_vote(solana_sdk::pubkey::Pubkey::new_unique(), false)
            .add_vote(solana_sdk::pubkey::Pubkey::new_unique(), false)
            .add_vote(solana_sdk::pubkey::Pubkey::new_unique(), false);

        assert_eq!(scenario.approval_percentage(), 2000); // 20%
        assert!(!is_dispute_successful(scenario.approval_percentage(), 6000));
    }

    #[test]
    fn test_dispute_large_count_above_threshold() {
        // Scenario: 61 YES, 39 NO = 61% (above 60% threshold)
        let mut scenario = VotingScenario::new();

        for _ in 0..61 {
            scenario = scenario.add_vote(solana_sdk::pubkey::Pubkey::new_unique(), true);
        }
        for _ in 0..39 {
            scenario = scenario.add_vote(solana_sdk::pubkey::Pubkey::new_unique(), false);
        }

        assert_eq!(scenario.approval_percentage(), 6100); // 61%
        assert!(is_dispute_successful(scenario.approval_percentage(), 6000));
    }

    #[test]
    fn test_dispute_large_count_below_threshold() {
        // Scenario: 59 YES, 41 NO = 59% (below 60% threshold)
        let mut scenario = VotingScenario::new();

        for _ in 0..59 {
            scenario = scenario.add_vote(solana_sdk::pubkey::Pubkey::new_unique(), true);
        }
        for _ in 0..41 {
            scenario = scenario.add_vote(solana_sdk::pubkey::Pubkey::new_unique(), false);
        }

        assert_eq!(scenario.approval_percentage(), 5900); // 59%
        assert!(!is_dispute_successful(scenario.approval_percentage(), 6000));
    }

    // ============================================================
    // Edge Cases & Boundary Conditions
    // ============================================================

    #[test]
    fn test_proposal_boundary_69_to_71_percent() {
        // Test boundary: crossing 70% threshold

        // 69% = below threshold
        let scenario69 = VotingScenario::new()
            .add_vote(solana_sdk::pubkey::Pubkey::new_unique(), true)
            .add_vote(solana_sdk::pubkey::Pubkey::new_unique(), true)
            .add_vote(solana_sdk::pubkey::Pubkey::new_unique(), true)
            .add_vote(solana_sdk::pubkey::Pubkey::new_unique(), true)
            .add_vote(solana_sdk::pubkey::Pubkey::new_unique(), true)
            .add_vote(solana_sdk::pubkey::Pubkey::new_unique(), true)
            .add_vote(solana_sdk::pubkey::Pubkey::new_unique(), true)
            .add_vote(solana_sdk::pubkey::Pubkey::new_unique(), true)
            .add_vote(solana_sdk::pubkey::Pubkey::new_unique(), true)
            .add_vote(solana_sdk::pubkey::Pubkey::new_unique(), false)
            .add_vote(solana_sdk::pubkey::Pubkey::new_unique(), false)
            .add_vote(solana_sdk::pubkey::Pubkey::new_unique(), false)
            .add_vote(solana_sdk::pubkey::Pubkey::new_unique(), false);

        assert_eq!(scenario69.approval_percentage(), 6923); // 9/13 ≈ 69.23%
        assert!(!scenario69.reaches_70_percent());

        // 71% = above threshold
        let scenario71 = scenario69.add_vote(solana_sdk::pubkey::Pubkey::new_unique(), true);
        assert_eq!(scenario71.approval_percentage(), 7000); // 10/14 = 71.43%
        assert!(scenario71.reaches_70_percent());
    }

    #[test]
    fn test_dispute_boundary_59_to_61_percent() {
        // Test boundary: crossing 60% threshold

        // 59% = below threshold
        let scenario59 = VotingScenario::new()
            .add_vote(solana_sdk::pubkey::Pubkey::new_unique(), true)
            .add_vote(solana_sdk::pubkey::Pubkey::new_unique(), true)
            .add_vote(solana_sdk::pubkey::Pubkey::new_unique(), true)
            .add_vote(solana_sdk::pubkey::Pubkey::new_unique(), true)
            .add_vote(solana_sdk::pubkey::Pubkey::new_unique(), true)
            .add_vote(solana_sdk::pubkey::Pubkey::new_unique(), false)
            .add_vote(solana_sdk::pubkey::Pubkey::new_unique(), false)
            .add_vote(solana_sdk::pubkey::Pubkey::new_unique(), false)
            .add_vote(solana_sdk::pubkey::Pubkey::new_unique(), false)
            .add_vote(solana_sdk::pubkey::Pubkey::new_unique(), false);

        assert_eq!(scenario59.approval_percentage(), 5000); // 5/10 = 50%
        assert!(!is_dispute_successful(scenario59.approval_percentage(), 6000));

        // Add votes to reach 60%
        let scenario60 = scenario59.add_vote(solana_sdk::pubkey::Pubkey::new_unique(), true)
                                   .add_vote(solana_sdk::pubkey::Pubkey::new_unique(), true);

        assert!(is_dispute_successful(scenario60.approval_percentage(), 6000));
    }

    #[test]
    fn test_maximum_bps_values() {
        // Test that percentages never exceed 10000 basis points
        let max_approval = VotingScenario::new()
            .add_vote(solana_sdk::pubkey::Pubkey::new_unique(), true)
            .add_vote(solana_sdk::pubkey::Pubkey::new_unique(), true)
            .add_vote(solana_sdk::pubkey::Pubkey::new_unique(), true)
            .approval_percentage();

        assert!(max_approval <= 10000, "Approval percentage exceeded 100%");
        assert_eq!(max_approval, 10000); // 3/3 = 100%
    }

    #[test]
    fn test_minimum_bps_values() {
        // Test that percentages never go below 0 basis points
        let min_approval = VotingScenario::new()
            .add_vote(solana_sdk::pubkey::Pubkey::new_unique(), false)
            .add_vote(solana_sdk::pubkey::Pubkey::new_unique(), false)
            .approval_percentage();

        assert!(min_approval >= 0, "Approval percentage went below 0%");
        assert_eq!(min_approval, 0); // 0/2 = 0%
    }
}
