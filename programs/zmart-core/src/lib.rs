use anchor_lang::prelude::*;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod zmart_core {
    use super::*;

    /// Initialize the ZMART protocol with global configuration
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("ZMART Core initialized");
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
