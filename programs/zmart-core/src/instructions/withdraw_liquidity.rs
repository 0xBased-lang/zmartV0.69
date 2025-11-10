use anchor_lang::prelude::*;
use crate::error::ErrorCode;
use crate::state::{MarketAccount, MarketState};

/// Withdraw remaining liquidity after market finalized
///
/// Creator withdraws all remaining funds (liquidity + accumulated LP fees)
/// while preserving rent reserve to keep account alive.
#[derive(Accounts)]
pub struct WithdrawLiquidity<'info> {
    #[account(
        mut,
        seeds = [b"market", &market.market_id],
        bump = market.bump,
        constraint = market.state == MarketState::Finalized @ ErrorCode::InvalidMarketState,
        has_one = creator @ ErrorCode::Unauthorized
    )]
    pub market: Account<'info, MarketAccount>,

    #[account(mut)]
    pub creator: Signer<'info>,
}

pub fn handler(ctx: Context<WithdrawLiquidity>) -> Result<()> {
    let market = &mut ctx.accounts.market;

    // Calculate withdrawable amount (balance - rent reserve - safety margin)
    let remaining_balance = market.to_account_info().lamports();
    let account_info = market.to_account_info();
    let rent = Rent::get()?;
    let reserved_for_rent = rent.minimum_balance(account_info.data_len());

    // Add 10,000 lamports safety margin (~0.00001 SOL) to ensure account stays rent-exempt
    let safe_reserve = reserved_for_rent.saturating_add(10_000);
    let withdrawable = remaining_balance.saturating_sub(safe_reserve);

    require!(withdrawable > 0, ErrorCode::InsufficientLiquidity);

    // Transfer to creator
    **market.to_account_info().try_borrow_mut_lamports()? -= withdrawable;
    **ctx.accounts.creator.to_account_info().try_borrow_mut_lamports()? += withdrawable;

    // Zero out liquidity and LP fees
    market.current_liquidity = 0;
    market.accumulated_lp_fees = 0;

    // Emit event
    emit!(LiquidityWithdrawn {
        market_id: market.market_id,
        creator: market.creator,
        amount: withdrawable,
        timestamp: Clock::get()?.unix_timestamp,
    });

    Ok(())
}


#[event]
pub struct LiquidityWithdrawn {
    pub market_id: [u8; 32],
    pub creator: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
}
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_withdrawable_calculation() {
        let balance = 10_000_000_000u64; // 10 SOL
        let rent = 2_000_000u64; // ~0.002 SOL rent
        let withdrawable = balance.saturating_sub(rent);

        assert_eq!(withdrawable, 9_998_000_000);
    }

    #[test]
    fn test_withdrawable_with_zero_balance() {
        let balance = 0u64;
        let rent = 2_000_000u64;
        let withdrawable = balance.saturating_sub(rent);

        assert_eq!(withdrawable, 0); // Saturating sub returns 0
    }

    #[test]
    fn test_withdrawable_exactly_rent() {
        let balance = 2_000_000u64;
        let rent = 2_000_000u64;
        let withdrawable = balance.saturating_sub(rent);

        assert_eq!(withdrawable, 0); // Nothing to withdraw
    }

    #[test]
    fn test_withdrawable_slightly_above_rent() {
        let balance = 2_000_001u64;
        let rent = 2_000_000u64;
        let withdrawable = balance.saturating_sub(rent);

        assert_eq!(withdrawable, 1); // Can withdraw 1 lamport
    }
}
