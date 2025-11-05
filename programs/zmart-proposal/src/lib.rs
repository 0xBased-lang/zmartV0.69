use anchor_lang::prelude::*;

declare_id!("3XDU9r97qqJRdgqKJEWDYSJesPAUbLqsejXus4WLuhAQ");

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
