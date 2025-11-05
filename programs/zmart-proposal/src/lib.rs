use anchor_lang::prelude::*;

declare_id!("4fuUiYxTQ6QCrdSq9ouBYcTM7bqSwYTSyLueGZLTy4T4");

#[program]
pub mod zmart_proposal {
    use super::*;

    /// Initialize the proposal manager
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("ZMART Proposal Manager initialized");
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
