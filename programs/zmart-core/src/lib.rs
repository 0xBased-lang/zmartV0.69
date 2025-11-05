use anchor_lang::prelude::*;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

// Module declarations
pub mod error;
pub mod instructions;
pub mod math;
pub mod state;

// Re-exports for convenience
pub use error::*;
pub use math::*;
pub use state::*;

#[program]
pub mod zmart_core {
    use super::*;

    /// Initialize the ZMART protocol with global configuration
    ///
    /// NOTE: Full implementation in Week 2
    pub fn initialize(_ctx: Context<Initialize>) -> Result<()> {
        msg!("ZMART Core initialized");
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
