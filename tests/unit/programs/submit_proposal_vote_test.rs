// ============================================================================
// Unit Tests for submit_proposal_vote Instruction (Story 1.1)
// ============================================================================
//
// TDD Approach: Tests written FIRST, implementation comes after
// Expected: ALL TESTS WILL FAIL until instruction is implemented
//
// These tests validate:
// 1. Valid like votes are recorded correctly
// 2. Valid dislike votes are recorded correctly
// 3. Duplicate votes are rejected (PDA init fails)
// 4. Wrong market state votes are rejected
// 5. PDA derivation uses correct seeds
//
// Reference: docs/stories/STORY-VOTING-1.md
// Blueprint Compliance: docs/CORE_LOGIC_INVARIANTS.md Section 3.2
// ============================================================================

use anchor_lang::prelude::*;
use anchor_lang::solana_program::system_program;
use zmart_core::*;
use solana_program_test::*;
use solana_sdk::{
    signature::{Keypair, Signer},
    transaction::Transaction,
    pubkey::Pubkey,
};

// Common test utilities
mod common {
    use super::*;

    /// Create a test market in PROPOSED state
    pub async fn create_proposed_market(
        banks_client: &mut BanksClient,
        payer: &Keypair,
        market_id: [u8; 32],
    ) -> Pubkey {
        // TODO: Implement market creation helper
        // For now, return a dummy pubkey - will implement when we run tests
        Pubkey::new_unique()
    }

    /// Get VoteRecord PDA address
    pub fn get_vote_record_pda(
        market: &Pubkey,
        user: &Pubkey,
        vote_type: u8,
    ) -> (Pubkey, u8) {
        Pubkey::find_program_address(
            &[
                b"vote",
                market.as_ref(),
                user.as_ref(),
                &[vote_type],
            ],
            &zmart_core::ID,
        )
    }
}

// ============================================================================
// Test 1: Valid Like Vote Recorded Correctly
// ============================================================================

#[tokio::test]
async fn test_submit_proposal_vote_like_success() {
    // GIVEN: A market in PROPOSED state and a user who hasn't voted yet
    let program_test = ProgramTest::new(
        "zmart_core",
        zmart_core::ID,
        processor!(zmart_core::entry),
    );

    let (mut banks_client, payer, recent_blockhash) = program_test.start().await;

    // Create market in PROPOSED state
    let market_id = [1u8; 32];
    let market_pubkey = common::create_proposed_market(
        &mut banks_client,
        &payer,
        market_id,
    ).await;

    // User who will vote
    let voter = Keypair::new();

    // Get expected VoteRecord PDA
    let (vote_record_pda, bump) = common::get_vote_record_pda(
        &market_pubkey,
        &voter.pubkey(),
        VoteType::Proposal as u8,
    );

    // WHEN: User calls submit_proposal_vote with vote=true (like)
    let accounts = zmart_core::accounts::SubmitProposalVote {
        market: market_pubkey,
        vote_record: vote_record_pda,
        user: voter.pubkey(),
        system_program: system_program::ID,
    };

    let instruction = zmart_core::instruction::SubmitProposalVote {
        vote: true, // LIKE vote
    };

    // Build and send transaction
    let mut transaction = Transaction::new_with_payer(
        &[instruction.data()],
        Some(&payer.pubkey()),
    );
    transaction.sign(&[&payer, &voter], recent_blockhash);

    let result = banks_client.process_transaction(transaction).await;

    // THEN: Transaction succeeds
    assert!(result.is_ok(), "Transaction should succeed");

    // THEN: VoteRecord account created with correct data
    let vote_record_account = banks_client
        .get_account(vote_record_pda)
        .await
        .expect("Failed to get account")
        .expect("Account should exist");

    let vote_record: VoteRecord = VoteRecord::try_deserialize(
        &mut vote_record_account.data.as_ref()
    ).expect("Failed to deserialize VoteRecord");

    // Verify all fields
    assert_eq!(vote_record.market, market_pubkey, "Market should match");
    assert_eq!(vote_record.user, voter.pubkey(), "User should match");
    assert_eq!(vote_record.vote_type, VoteType::Proposal, "Vote type should be Proposal");
    assert_eq!(vote_record.vote, true, "Vote should be true (like)");
    assert!(vote_record.voted_at > 0, "Timestamp should be set");
    assert_eq!(vote_record.bump, bump, "Bump should match PDA bump");

    // THEN: ProposalVoteSubmitted event emitted
    // TODO: Verify event emission when event testing infrastructure is ready
}

// ============================================================================
// Test 2: Valid Dislike Vote Recorded Correctly
// ============================================================================

#[tokio::test]
async fn test_submit_proposal_vote_dislike_success() {
    // GIVEN: A market in PROPOSED state and a user who hasn't voted yet
    let program_test = ProgramTest::new(
        "zmart_core",
        zmart_core::ID,
        processor!(zmart_core::entry),
    );

    let (mut banks_client, payer, recent_blockhash) = program_test.start().await;

    // Create market in PROPOSED state
    let market_id = [2u8; 32];
    let market_pubkey = common::create_proposed_market(
        &mut banks_client,
        &payer,
        market_id,
    ).await;

    // User who will vote
    let voter = Keypair::new();

    // Get expected VoteRecord PDA
    let (vote_record_pda, bump) = common::get_vote_record_pda(
        &market_pubkey,
        &voter.pubkey(),
        VoteType::Proposal as u8,
    );

    // WHEN: User calls submit_proposal_vote with vote=false (dislike)
    let accounts = zmart_core::accounts::SubmitProposalVote {
        market: market_pubkey,
        vote_record: vote_record_pda,
        user: voter.pubkey(),
        system_program: system_program::ID,
    };

    let instruction = zmart_core::instruction::SubmitProposalVote {
        vote: false, // DISLIKE vote
    };

    // Build and send transaction
    let mut transaction = Transaction::new_with_payer(
        &[instruction.data()],
        Some(&payer.pubkey()),
    );
    transaction.sign(&[&payer, &voter], recent_blockhash);

    let result = banks_client.process_transaction(transaction).await;

    // THEN: Transaction succeeds
    assert!(result.is_ok(), "Transaction should succeed");

    // THEN: VoteRecord created with vote=false
    let vote_record_account = banks_client
        .get_account(vote_record_pda)
        .await
        .expect("Failed to get account")
        .expect("Account should exist");

    let vote_record: VoteRecord = VoteRecord::try_deserialize(
        &mut vote_record_account.data.as_ref()
    ).expect("Failed to deserialize VoteRecord");

    assert_eq!(vote_record.vote, false, "Vote should be false (dislike)");
    assert_eq!(vote_record.market, market_pubkey, "Market should match");
    assert_eq!(vote_record.user, voter.pubkey(), "User should match");
}

// ============================================================================
// Test 3: Duplicate Vote Rejected (AlreadyVoted Error)
// ============================================================================

#[tokio::test]
async fn test_submit_proposal_vote_duplicate_fails() {
    // GIVEN: A market in PROPOSED state and a user who ALREADY voted
    let program_test = ProgramTest::new(
        "zmart_core",
        zmart_core::ID,
        processor!(zmart_core::entry),
    );

    let (mut banks_client, payer, recent_blockhash) = program_test.start().await;

    // Create market in PROPOSED state
    let market_id = [3u8; 32];
    let market_pubkey = common::create_proposed_market(
        &mut banks_client,
        &payer,
        market_id,
    ).await;

    // User who will vote
    let voter = Keypair::new();

    // Get VoteRecord PDA
    let (vote_record_pda, _bump) = common::get_vote_record_pda(
        &market_pubkey,
        &voter.pubkey(),
        VoteType::Proposal as u8,
    );

    // FIRST VOTE: Submit initial vote (should succeed)
    let accounts = zmart_core::accounts::SubmitProposalVote {
        market: market_pubkey,
        vote_record: vote_record_pda,
        user: voter.pubkey(),
        system_program: system_program::ID,
    };

    let instruction1 = zmart_core::instruction::SubmitProposalVote {
        vote: true,
    };

    let mut transaction1 = Transaction::new_with_payer(
        &[instruction1.data()],
        Some(&payer.pubkey()),
    );
    transaction1.sign(&[&payer, &voter], recent_blockhash);

    banks_client.process_transaction(transaction1).await
        .expect("First vote should succeed");

    // WHEN: User tries to vote AGAIN on the same market
    let instruction2 = zmart_core::instruction::SubmitProposalVote {
        vote: false, // Trying to change vote
    };

    let recent_blockhash = banks_client.get_latest_blockhash().await.unwrap();
    let mut transaction2 = Transaction::new_with_payer(
        &[instruction2.data()],
        Some(&payer.pubkey()),
    );
    transaction2.sign(&[&payer, &voter], recent_blockhash);

    let result = banks_client.process_transaction(transaction2).await;

    // THEN: Transaction fails with AlreadyVoted error
    assert!(result.is_err(), "Duplicate vote should fail");

    // Verify error is AlreadyVoted (PDA init fails because account exists)
    let error = result.unwrap_err();
    // Note: Anchor's init constraint will fail with "account already exists"
    // which maps to our AlreadyVoted semantic error
    assert!(
        error.to_string().contains("already") ||
        error.to_string().contains("exist"),
        "Error should indicate account already exists (AlreadyVoted)"
    );
}

// ============================================================================
// Test 4: Wrong Market State Rejected (InvalidStateForVoting Error)
// ============================================================================

#[tokio::test]
async fn test_submit_proposal_vote_wrong_state_fails() {
    // GIVEN: A market in ACTIVE state (NOT PROPOSED)
    let program_test = ProgramTest::new(
        "zmart_core",
        zmart_core::ID,
        processor!(zmart_core::entry),
    );

    let (mut banks_client, payer, recent_blockhash) = program_test.start().await;

    // Create market in ACTIVE state (not PROPOSED)
    // TODO: Helper to create market in specific state
    let market_id = [4u8; 32];
    // For now, we'll create in PROPOSED then transition to ACTIVE
    let market_pubkey = common::create_proposed_market(
        &mut banks_client,
        &payer,
        market_id,
    ).await;

    // TODO: Transition market to ACTIVE state
    // (approve_proposal + activate_market instructions)

    // User who will try to vote
    let voter = Keypair::new();

    // Get VoteRecord PDA
    let (vote_record_pda, _bump) = common::get_vote_record_pda(
        &market_pubkey,
        &voter.pubkey(),
        VoteType::Proposal as u8,
    );

    // WHEN: User tries to vote on ACTIVE market (should only work on PROPOSED)
    let accounts = zmart_core::accounts::SubmitProposalVote {
        market: market_pubkey,
        vote_record: vote_record_pda,
        user: voter.pubkey(),
        system_program: system_program::ID,
    };

    let instruction = zmart_core::instruction::SubmitProposalVote {
        vote: true,
    };

    let mut transaction = Transaction::new_with_payer(
        &[instruction.data()],
        Some(&payer.pubkey()),
    );
    transaction.sign(&[&payer, &voter], recent_blockhash);

    let result = banks_client.process_transaction(transaction).await;

    // THEN: Transaction fails with InvalidStateForVoting error
    assert!(result.is_err(), "Vote on non-PROPOSED market should fail");

    let error = result.unwrap_err();
    // Verify error is InvalidStateForVoting (error code 6701)
    assert!(
        error.to_string().contains("6701") ||
        error.to_string().contains("Invalid state for voting"),
        "Error should be InvalidStateForVoting (6701)"
    );
}

// ============================================================================
// Test 5: PDA Derivation Uses Correct Seeds
// ============================================================================

#[tokio::test]
async fn test_submit_proposal_vote_pda_derivation() {
    // GIVEN: Known market and user pubkeys
    let market_pubkey = Pubkey::new_unique();
    let user_pubkey = Pubkey::new_unique();
    let vote_type = VoteType::Proposal as u8;

    // WHEN: We derive VoteRecord PDA
    let (vote_record_pda, bump) = common::get_vote_record_pda(
        &market_pubkey,
        &user_pubkey,
        vote_type,
    );

    // THEN: PDA should match expected seeds
    // Seeds: [b"vote", market.key(), user.key(), &[vote_type]]
    let expected_seeds = &[
        b"vote".as_ref(),
        market_pubkey.as_ref(),
        user_pubkey.as_ref(),
        &[vote_type],
        &[bump],
    ];

    let derived_pubkey = Pubkey::create_program_address(
        expected_seeds,
        &zmart_core::ID,
    ).expect("PDA derivation should succeed");

    assert_eq!(
        vote_record_pda,
        derived_pubkey,
        "PDA should match expected derivation from seeds"
    );

    // THEN: Verify seeds are correct format
    // - First seed is "vote"
    // - Second seed is market pubkey (32 bytes)
    // - Third seed is user pubkey (32 bytes)
    // - Fourth seed is vote_type (1 byte: 0 for Proposal, 1 for Dispute)
    assert_eq!(expected_seeds[0], b"vote", "First seed should be 'vote'");
    assert_eq!(expected_seeds[1].len(), 32, "Market pubkey should be 32 bytes");
    assert_eq!(expected_seeds[2].len(), 32, "User pubkey should be 32 bytes");
    assert_eq!(expected_seeds[3], &[0u8], "Vote type should be 0 for Proposal");

    // THEN: Different vote types should produce different PDAs
    let (dispute_pda, _) = common::get_vote_record_pda(
        &market_pubkey,
        &user_pubkey,
        VoteType::Dispute as u8,
    );

    assert_ne!(
        vote_record_pda,
        dispute_pda,
        "Proposal and Dispute votes should have different PDAs"
    );
}

// ============================================================================
// Additional Edge Case Tests (Bonus - Not Required for Story 1.1)
// ============================================================================

#[tokio::test]
#[ignore] // Run with: cargo test -- --ignored
async fn test_submit_proposal_vote_different_users_same_market() {
    // Verify: Multiple users can vote on same market
    // Expected: Each user gets unique VoteRecord PDA
    todo!("Implement multi-user test")
}

#[tokio::test]
#[ignore]
async fn test_submit_proposal_vote_same_user_different_markets() {
    // Verify: Same user can vote on multiple markets
    // Expected: Each market gets unique VoteRecord PDA per user
    todo!("Implement multi-market test")
}

#[tokio::test]
#[ignore]
async fn test_submit_proposal_vote_account_size() {
    // Verify: VoteRecord account is exactly 83 bytes
    // Expected: Account rent matches 83-byte size
    todo!("Implement account size test")
}
