use anchor_lang::prelude::*;

declare_id!("4fuUiYxTQ6QCrdSq9ouBYcTM7bqSwYTSyLueGZLTy4T4");

// Module declarations
pub mod error;
pub mod instructions;
pub mod state;

// Re-exports for convenience
pub use error::*;
pub use state::*;

#[program]
pub mod zmart_proposal {
    use super::*;

    /// Initialize the proposal manager
    ///
    /// NOTE: Full implementation in Week 2
    pub fn initialize(_ctx: Context<Initialize>) -> Result<()> {
        msg!("ZMART Proposal Manager initialized");
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
