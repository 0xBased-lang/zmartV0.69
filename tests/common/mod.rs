// ============================================================
// ZMART v0.69 - Common Test Utilities
// ============================================================
// Purpose: Reusable test infrastructure for integration tests
// Used by: All integration test files
// Pattern Prevention: #3 (Reactive Crisis) - Proactive test utilities

use anchor_lang::prelude::*;
use anchor_lang::solana_program::system_program;
use solana_program_test::*;
use solana_sdk::{
    signature::{Keypair, Signer},
    transaction::Transaction,
    pubkey::Pubkey,
};

pub mod account_helpers;
pub mod market_helpers;
pub mod lmsr_helpers;
pub mod assertions;
pub mod voting_helpers;
pub mod admin_helpers;

// Re-export for convenience
pub use account_helpers::*;
pub use market_helpers::*;
pub use lmsr_helpers::*;
pub use assertions::*;
pub use voting_helpers::*;
pub use admin_helpers::*;

// ============================================================
// Test Context Management
// ============================================================

/// Test context with common accounts and utilities
pub struct TestContext {
    pub banks_client: BanksClient,
    pub payer: Keypair,
    pub recent_blockhash: Hash,

    // Common test accounts
    pub admin: Keypair,
    pub creator: Keypair,
    pub trader1: Keypair,
    pub trader2: Keypair,
    pub resolver: Keypair,

    // Program IDs
    pub core_program_id: Pubkey,
    pub proposal_program_id: Pubkey,
}

impl TestContext {
    /// Create new test context with pre-funded accounts
    pub async fn new() -> Result<Self, Box<dyn std::error::Error>> {
        let program_test = ProgramTest::new(
            "zmart_core",
            zmart_core::id(),
            processor!(zmart_core::entry),
        );

        let (mut banks_client, payer, recent_blockhash) = program_test.start().await;

        // Create and fund test accounts
        let admin = Keypair::new();
        let creator = Keypair::new();
        let trader1 = Keypair::new();
        let trader2 = Keypair::new();
        let resolver = Keypair::new();

        // Airdrop SOL to test accounts
        for account in &[&admin, &creator, &trader1, &trader2, &resolver] {
            airdrop(&mut banks_client, &account.pubkey(), 10_000_000_000).await?;
        }

        Ok(Self {
            banks_client,
            payer,
            recent_blockhash,
            admin,
            creator,
            trader1,
            trader2,
            resolver,
            core_program_id: zmart_core::id(),
            proposal_program_id: zmart_core::id(), // Single program now
        })
    }

    /// Get fresh blockhash (call before each transaction)
    pub async fn get_blockhash(&mut self) -> Hash {
        self.recent_blockhash = self.banks_client
            .get_latest_blockhash()
            .await
            .expect("Failed to get recent blockhash");
        self.recent_blockhash
    }

    /// Submit transaction and process
    pub async fn submit_transaction(&mut self, transaction: Transaction) -> Result<(), Box<dyn std::error::Error>> {
        self.banks_client
            .process_transaction(transaction)
            .await
            .map_err(|e| Box::new(e) as Box<dyn std::error::Error>)
    }

    /// Get account data
    pub async fn get_account(&mut self, pubkey: &Pubkey) -> Result<Account, Box<dyn std::error::Error>> {
        self.banks_client
            .get_account(*pubkey)
            .await?
            .ok_or_else(|| "Account not found".into())
    }
}

// ============================================================
// Utility Functions
// ============================================================

/// Airdrop SOL to an account
pub async fn airdrop(
    banks_client: &mut BanksClient,
    pubkey: &Pubkey,
    lamports: u64,
) -> Result<(), Box<dyn std::error::Error>> {
    let blockhash = banks_client.get_latest_blockhash().await?;

    let transaction = Transaction::new_signed_with_payer(
        &[system_instruction::transfer(
            &banks_client.payer().pubkey(),
            pubkey,
            lamports,
        )],
        Some(&banks_client.payer().pubkey()),
        &[&banks_client.payer()],
        blockhash,
    );

    banks_client.process_transaction(transaction).await?;
    Ok(())
}

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

/// Convert lamports to SOL (for assertions)
pub fn lamports_to_sol(lamports: u64) -> f64 {
    lamports as f64 / 1_000_000_000.0
}

// ============================================================
// Test Macros
// ============================================================

/// Assert transaction succeeded
#[macro_export]
macro_rules! assert_tx_success {
    ($result:expr) => {
        assert!($result.is_ok(), "Transaction failed: {:?}", $result.err());
    };
}

/// Assert transaction failed with specific error
#[macro_export]
macro_rules! assert_tx_error {
    ($result:expr, $error:expr) => {
        assert!($result.is_err(), "Transaction should have failed");
        let err_msg = format!("{:?}", $result.err().unwrap());
        assert!(err_msg.contains($error), "Expected error '{}', got: {}", $error, err_msg);
    };
}

/// Assert approximate equality (for fixed-point math)
#[macro_export]
macro_rules! assert_approx_eq {
    ($left:expr, $right:expr, $tolerance:expr) => {
        let diff = if $left > $right {
            $left - $right
        } else {
            $right - $left
        };
        assert!(
            diff <= $tolerance,
            "Values not approximately equal: {} vs {} (tolerance: {})",
            $left,
            $right,
            $tolerance
        );
    };
}
