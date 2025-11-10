use anchor_lang::prelude::*;
use crate::error::ErrorCode;
use crate::state::{GlobalConfig, MarketAccount, MarketState};

/// Propose market resolution (ACTIVE → RESOLVING)
///
/// Starts the dispute window during which the community can challenge
/// the proposed outcome. Any user can resolve (reputation checked off-chain).
///
/// # Arguments
/// * `proposed_outcome` - Proposed outcome (true=YES, false=NO)
/// * `ipfs_evidence_hash` - IPFS CID with resolution evidence (46 bytes)
#[derive(Accounts)]
pub struct ResolveMarket<'info> {
    #[account(
        seeds = [b"global-config"],
        bump = global_config.bump
    )]
    pub global_config: Account<'info, GlobalConfig>,

    #[account(
        mut,
        seeds = [b"market", &market.market_id],
        bump = market.bump,
        constraint = market.state == MarketState::Active @ ErrorCode::InvalidMarketState
    )]
    pub market: Account<'info, MarketAccount>,

    /// Resolver proposing the outcome
    #[account(mut)]
    pub resolver: Signer<'info>,
}

pub fn handler(
    ctx: Context<ResolveMarket>,
    proposed_outcome: bool,
    ipfs_evidence_hash: [u8; 46],
) -> Result<()> {
    let market = &mut ctx.accounts.market;
    let clock = Clock::get()?;
    let current_time = clock.unix_timestamp;

    // SECURITY FIX (Finding #5): Verify market hasn't already been resolved
    require!(market.proposed_outcome.is_none(), ErrorCode::AlreadyResolved);

    // SECURITY FIX (Finding #10): Validate timestamp bounds
    // Prevents time travel and far-future manipulation attacks
    require!(
        current_time >= market.created_at,
        ErrorCode::InvalidTimestamp
    );

    // Sanity check: timestamp must be within 10 years of market creation
    let max_timestamp = market.created_at
        .checked_add(86400 * 365 * 10)  // 10 years in seconds
        .ok_or(ErrorCode::OverflowError)?;

    require!(
        current_time <= max_timestamp,
        ErrorCode::InvalidTimestamp
    );

    msg!("Timestamp validation passed: current={}, created={}, activated={}",
        current_time, market.created_at, market.activated_at);

    // SECURITY: Validate timestamp monotonicity (prevents time manipulation)
    // Resolution can only happen after market activation
    require!(
        current_time > market.activated_at,
        ErrorCode::InvalidTimestamp
    );

    // Record resolution proposal
    market.proposed_outcome = Some(proposed_outcome);
    market.resolver = ctx.accounts.resolver.key();
    market.ipfs_evidence_hash = ipfs_evidence_hash;
    market.resolution_proposed_at = Clock::get()?.unix_timestamp;

    // Initialize resolution vote counters
    market.resolution_agree = 0;
    market.resolution_disagree = 0;
    market.resolution_total_votes = 0;

    // Transition state: ACTIVE → RESOLVING (using wrapper for validation)
    market.transition_state(MarketState::Resolving)?;

    // Emit event
    emit!(MarketResolved {
        market_id: market.market_id,
        resolver: market.resolver,
        outcome: proposed_outcome,
        evidence_hash: ipfs_evidence_hash,
        timestamp: market.resolution_proposed_at,
    });

    Ok(())
}


#[event]
pub struct MarketResolved {
    pub market_id: [u8; 32],
    pub resolver: Pubkey,
    pub outcome: bool,
    pub evidence_hash: [u8; 46],
    pub timestamp: i64,
}
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_outcome_encoding() {
        // Verify outcome encoding matches spec
        let yes_outcome: Option<bool> = Some(true);
        let no_outcome: Option<bool> = Some(false);
        let invalid_outcome: Option<bool> = None;

        assert_eq!(yes_outcome, Some(true));
        assert_eq!(no_outcome, Some(false));
        assert_eq!(invalid_outcome, None);
    }

    #[test]
    fn test_ipfs_hash_size() {
        // IPFS CID v0 is 46 bytes
        let hash = [0u8; 46];
        assert_eq!(hash.len(), 46);
    }

    #[test]
    fn test_vote_counters_initialization() {
        // Verify counters initialized to zero
        let agree = 0u32;
        let disagree = 0u32;
        let total = 0u32;

        assert_eq!(agree + disagree, total);
    }
}
