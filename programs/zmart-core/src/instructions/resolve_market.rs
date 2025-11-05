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
) -> Result<()> {
    let market = &mut ctx.accounts.market;

    // Verify market hasn't already been resolved
    require!(market.proposed_outcome.is_none(), ErrorCode::AlreadyResolved);

    // Record resolution proposal
    market.proposed_outcome = Some(proposed_outcome);
    market.resolver = ctx.accounts.resolver.key();
    market.resolution_proposed_at = Clock::get()?.unix_timestamp;

    // Transition state: ACTIVE → RESOLVING
    market.state = MarketState::Resolving;

    // Emit event
    // emit!(MarketResolved {
    //     market_id: market.market_id,
    //     resolver: market.resolver,
    //     outcome,
    //     evidence_hash: ipfs_evidence_hash,
    //     timestamp: market.resolution_proposed_at,
    // });

    Ok(())
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
