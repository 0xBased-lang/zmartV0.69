// ============================================================
// Account Creation & Management Helpers
// ============================================================

use anchor_lang::prelude::*;
use anchor_lang::solana_program::system_program;
use solana_sdk::{
    signature::{Keypair, Signer},
    pubkey::Pubkey,
};

/// Generate PDA for global config
pub fn get_global_config_pda(program_id: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(&[b"global_config"], program_id)
}

/// Generate PDA for market account
pub fn get_market_pda(market_id: u64, program_id: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[b"market", &market_id.to_le_bytes()],
        program_id,
    )
}

/// Generate PDA for user position
pub fn get_user_position_pda(
    market: &Pubkey,
    user: &Pubkey,
    program_id: &Pubkey,
) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[b"position", market.as_ref(), user.as_ref()],
        program_id,
    )
}

/// Generate PDA for vote record
pub fn get_vote_record_pda(
    market: &Pubkey,
    voter: &Pubkey,
    program_id: &Pubkey,
) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[b"vote", market.as_ref(), voter.as_ref()],
        program_id,
    )
}

/// Generate PDA for proposal account
pub fn get_proposal_pda(proposal_id: u64, program_id: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[b"proposal", &proposal_id.to_le_bytes()],
        program_id,
    )
}

/// Generate PDA for market vault (holds liquidity)
pub fn get_market_vault_pda(market: &Pubkey, program_id: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[b"vault", market.as_ref()],
        program_id,
    )
}

// ============================================================
// Account Creation Helpers
// ============================================================

/// Create and fund a new keypair
pub fn create_funded_keypair() -> Keypair {
    Keypair::new()
}

/// Derive all PDAs for a market
pub struct MarketPDAs {
    pub market: Pubkey,
    pub market_bump: u8,
    pub vault: Pubkey,
    pub vault_bump: u8,
}

impl MarketPDAs {
    pub fn new(market_id: u64, program_id: &Pubkey) -> Self {
        let (market, market_bump) = get_market_pda(market_id, program_id);
        let (vault, vault_bump) = get_market_vault_pda(&market, program_id);

        Self {
            market,
            market_bump,
            vault,
            vault_bump,
        }
    }
}

/// Derive all PDAs for a user position
pub struct UserPositionPDAs {
    pub position: Pubkey,
    pub position_bump: u8,
}

impl UserPositionPDAs {
    pub fn new(market: &Pubkey, user: &Pubkey, program_id: &Pubkey) -> Self {
        let (position, position_bump) = get_user_position_pda(market, user, program_id);

        Self {
            position,
            position_bump,
        }
    }
}
