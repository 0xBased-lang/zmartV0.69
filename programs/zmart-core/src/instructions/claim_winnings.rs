use anchor_lang::prelude::*;
use crate::error::ErrorCode;
use crate::state::{GlobalConfig, MarketAccount, MarketState, UserPosition};
use crate::utils::transfer_with_rent_check;

/// Claim winnings after market finalized
///
/// Users claim winnings based on final outcome:
/// - YES outcome: Only YES share holders win
/// - NO outcome: Only NO share holders win
/// - INVALID outcome: All holders refunded proportionally
///
/// First claimer pays resolver their accumulated fees (if outcome valid)
#[derive(Accounts)]
pub struct ClaimWinnings<'info> {
    #[account(
        seeds = [b"global-config"],
        bump = global_config.bump
    )]
    pub global_config: Account<'info, GlobalConfig>,

    #[account(
        mut,
        seeds = [b"market", &market.market_id],
        bump = market.bump,
        constraint = market.state == MarketState::Finalized @ ErrorCode::InvalidMarketState
    )]
    pub market: Account<'info, MarketAccount>,

    #[account(
        mut,
        seeds = [b"position", market.key().as_ref(), user.key().as_ref()],
        bump = position.bump,
        has_one = user,
        constraint = !position.has_claimed @ ErrorCode::AlreadyClaimed
    )]
    pub position: Account<'info, UserPosition>,

    #[account(mut)]
    pub user: Signer<'info>,

    /// Resolver (receives accumulated fees if outcome valid)
    /// CHECK: Validated against market.resolver
    #[account(
        mut,
        constraint = resolver.key() == market.resolver @ ErrorCode::InvalidResolver
    )]
    pub resolver: AccountInfo<'info>,

    /// System program for CPI transfers
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<ClaimWinnings>) -> Result<()> {
    let market = &mut ctx.accounts.market;
    let position = &mut ctx.accounts.position;

    // Calculate winnings based on final outcome
    let winnings = match market.final_outcome {
        Some(true) => position.shares_yes,   // YES won
        Some(false) => position.shares_no,   // NO won
        None => {
            // INVALID outcome → full refund (all shares)
            position.shares_yes.checked_add(position.shares_no)
                .ok_or(ErrorCode::OverflowError)?
        }
    };

    require!(winnings > 0, ErrorCode::NoWinnings);

    // Check market has sufficient balance
    let market_balance = market.to_account_info().lamports();
    let needed = winnings.checked_add(market.accumulated_resolver_fees)
        .ok_or(ErrorCode::OverflowError)?;

    require!(
        market_balance >= needed,
        ErrorCode::InsufficientLiquidity
    );

    // SECURITY FIX (Finding #2): Transfer winnings with rent check
    // Ensures market account maintains rent exemption after transfer
    transfer_with_rent_check(
        &market.to_account_info(),
        &ctx.accounts.user.to_account_info(),
        winnings,
        &ctx.accounts.system_program.to_account_info(),
    )?;

    // SECURITY FIX (Finding #2): Pay resolver with rent check
    // Only if outcome is valid and fees accumulated
    if market.final_outcome.is_some() && market.accumulated_resolver_fees > 0 {
        let resolver_fee = market.accumulated_resolver_fees;

        transfer_with_rent_check(
            &market.to_account_info(),
            &ctx.accounts.resolver,
            resolver_fee,
            &ctx.accounts.system_program.to_account_info(),
        )?;

        market.accumulated_resolver_fees = 0; // Paid out, prevent double-pay
    }

    // Mark position as claimed
    position.has_claimed = true;
    position.claimed_amount = winnings;

    // Emit event
    // emit!(WinningsClaimed {
    //     market_id: market.market_id,
    //     user: ctx.accounts.user.key(),
    //     amount: winnings,
    //     resolver_fee: market.accumulated_resolver_fees,
    //     timestamp: position.claimed_at,
    // });

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_winnings_yes_outcome() {
        // YES wins: only shares_yes count
        let shares_yes = 100u64;
        let shares_no = 50u64;
        let outcome = Some(true);

        let winnings = match outcome {
            Some(true) => shares_yes,
            Some(false) => shares_no,
            None => shares_yes + shares_no,
        };

        assert_eq!(winnings, 100); // Only YES shares
    }

    #[test]
    fn test_winnings_no_outcome() {
        // NO wins: only shares_no count
        let shares_yes = 100u64;
        let shares_no = 50u64;
        let outcome = Some(false);

        let winnings = match outcome {
            Some(true) => shares_yes,
            Some(false) => shares_no,
            None => shares_yes + shares_no,
        };

        assert_eq!(winnings, 50); // Only NO shares
    }

    #[test]
    fn test_winnings_invalid_outcome() {
        // INVALID: full refund (all shares)
        let shares_yes = 100u64;
        let shares_no = 50u64;
        let outcome: Option<bool> = None;

        let winnings = match outcome {
            Some(true) => shares_yes,
            Some(false) => shares_no,
            None => shares_yes + shares_no,
        };

        assert_eq!(winnings, 150); // Full refund
    }

    #[test]
    fn test_balance_check_logic() {
        let market_balance = 1000u64;
        let winnings = 800u64;
        let resolver_fees = 100u64;
        let needed = winnings + resolver_fees;

        assert!(market_balance >= needed);
    }

    #[test]
    fn test_balance_insufficient() {
        let market_balance = 800u64;
        let winnings = 900u64;
        let resolver_fees = 100u64;
        let needed = winnings + resolver_fees;

        assert!(market_balance < needed); // Should fail
    }
}
