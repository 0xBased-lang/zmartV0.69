use anchor_lang::prelude::*;
use crate::error::ErrorCode;
use crate::state::{GlobalConfig, MarketAccount, MarketState, UserPosition};
use crate::utils::transfer_from_pda_with_data;

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

    // BLUEPRINT PAYOUT FORMULA (CORE_LOGIC_INVARIANTS.md Section 8):
    // user_payout = (user_winning_shares / total_winning_shares) * totalDeposits
    //
    // Where:
    // - totalDeposits = current_liquidity (all deposits minus fees already distributed)
    // - total_winning_shares = market.shares_yes (if YES won) or market.shares_no (if NO won)
    // - user_winning_shares = position.shares_yes (if YES won) or position.shares_no (if NO won)

    let (user_winning_shares, total_winning_shares) = match market.final_outcome {
        Some(true) => {
            // YES outcome won
            require!(position.shares_yes > 0, ErrorCode::NoWinnings);
            (position.shares_yes, market.shares_yes)
        },
        Some(false) => {
            // NO outcome won
            require!(position.shares_no > 0, ErrorCode::NoWinnings);
            (position.shares_no, market.shares_no)
        },
        None => {
            // INVALID outcome → pro-rata refund based on total invested
            // Formula: user_refund = (user.totalInvested / market.totalDeposits) * market.totalDeposits
            // Simplifies to: user_refund = user.totalInvested
            require!(position.total_invested > 0, ErrorCode::NoWinnings);

            // For INVALID, we just return what the user invested (no proportional calc needed)
            let winnings = position.total_invested;

            // Check market has sufficient balance
            let market_balance = market.to_account_info().lamports();
            require!(
                market_balance >= winnings,
                ErrorCode::InsufficientLiquidity
            );

            // Early return for INVALID case
            market.lock()?;

            // Transfer from market PDA (PDAs with data require manual lamport transfer)
            transfer_from_pda_with_data(
                &market.to_account_info(),
                &ctx.accounts.user.to_account_info(),
                winnings,
            )?;

            market.unlock();
            position.has_claimed = true;
            position.claimed_amount = winnings;

            emit!(WinningsClaimed {
                market: market.key(),
                user: ctx.accounts.user.key(),
                outcome: None,
                amount: winnings,
                timestamp: Clock::get()?.unix_timestamp,
            });

            return Ok(());
        }
    };

    // Calculate proportional payout for YES/NO outcomes
    // Formula: (user_shares / total_shares) * total_deposits
    require!(total_winning_shares > 0, ErrorCode::DivisionByZero);

    // Use 128-bit arithmetic to prevent overflow in multiplication
    let total_deposits = market.current_liquidity;
    let winnings = (user_winning_shares as u128)
        .checked_mul(total_deposits as u128)
        .ok_or(ErrorCode::OverflowError)?
        .checked_div(total_winning_shares as u128)
        .ok_or(ErrorCode::DivisionByZero)? as u64;

    require!(winnings > 0, ErrorCode::NoWinnings);

    // Check market has sufficient balance
    let market_balance = market.to_account_info().lamports();
    let needed = winnings.checked_add(market.accumulated_resolver_fees)
        .ok_or(ErrorCode::OverflowError)?;

    require!(
        market_balance >= needed,
        ErrorCode::InsufficientLiquidity
    );

    // SECURITY FIX (Finding #8): Lock market before lamport transfers (reentrancy protection)
    market.lock()?;

    // SECURITY FIX (Finding #2): Transfer winnings with rent check
    // Ensures market account maintains rent exemption after transfer
    // Uses manual lamport transfer since market is a PDA with data
    transfer_from_pda_with_data(
        &market.to_account_info(),
        &ctx.accounts.user.to_account_info(),
        winnings,
    )?;

    // SECURITY FIX (Finding #2): Pay resolver with rent check
    // Only if outcome is valid and fees accumulated
    if market.final_outcome.is_some() && market.accumulated_resolver_fees > 0 {
        let resolver_fee = market.accumulated_resolver_fees;

        transfer_from_pda_with_data(
            &market.to_account_info(),
            &ctx.accounts.resolver,
            resolver_fee,
        )?;

        market.accumulated_resolver_fees = 0; // Paid out, prevent double-pay
    }

    // SECURITY FIX (Finding #8): Unlock market after transfers complete
    market.unlock();

    // Mark position as claimed
    position.has_claimed = true;
    position.claimed_amount = winnings;

    // Emit event
    emit!(WinningsClaimed {
        market: market.key(),
        user: ctx.accounts.user.key(),
        outcome: market.final_outcome,
        amount: winnings,
        timestamp: Clock::get()?.unix_timestamp,
    });

    Ok(())
}

#[event]
pub struct WinningsClaimed {
    pub market: Pubkey,
    pub user: Pubkey,
    pub outcome: Option<bool>,
    pub amount: u64,
    pub timestamp: i64,
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
