// ============================================================
// Simple Test Utilities for Day 7
// ============================================================
// Purpose: Minimal working utilities to unblock integration tests
// Future: Expand to full test infrastructure (Week 2-3)

use anchor_lang::prelude::*;
use solana_program_test::*;
use solana_sdk::{
    signature::{Keypair, Signer},
    transaction::Transaction,
    pubkey::Pubkey,
    system_instruction,
};

// Re-export for convenience
pub use solana_program_test::BanksClient;
pub use solana_sdk::hash::Hash;

// ============================================================
// Test Context (Minimal)
// ============================================================

pub struct TestContext {
    pub banks_client: BanksClient,
    pub payer: Keypair,
}

impl TestContext {
    pub async fn new() -> Self {
        let program_test = ProgramTest::default();
        let (banks_client, payer, _recent_blockhash) = program_test.start().await;

        Self {
            banks_client,
            payer,
        }
    }
}

// ============================================================
// Utility Functions
// ============================================================

/// Get current Unix timestamp
pub fn current_timestamp() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .expect("Time went backwards")
        .as_secs() as i64
}

/// Convert SOL to lamports
pub const fn sol_to_lamports(sol: u64) -> u64 {
    sol * 1_000_000_000
}

// TODO: Expand this module as needed for more complex tests
// For Day 7, we just need enough to run basic integration tests
