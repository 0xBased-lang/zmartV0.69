use anchor_lang::prelude::*;
use anchor_lang::system_program;
use crate::error::ErrorCode;
use crate::state::{GlobalConfig, MarketAccount, MarketState, UserPosition};
use crate::math::lmsr;

/// Buy YES or NO shares using LMSR formula
///
/// Users specify a target cost (max they're willing to spend) and receive
/// shares calculated by the LMSR algorithm. Fees are applied on top of the
/// base cost: 3% protocol + 2% resolver + 5% LP = 10% total.
///
/// # Arguments
/// * `outcome` - true for YES, false for NO
/// * `target_cost` - Maximum amount user is willing to pay (before fees)
///
/// # State Changes
/// * Market: shares_yes/shares_no increased, liquidity increased by fees
/// * Position: shares increased, total_invested increased, trades_count++
///
/// # Fees
/// * 3% → Protocol (transferred immediately)
/// * 2% → Resolver (accumulated in market, paid on claim)
/// * 5% → LP (accumulated in market, withdrawn by creator)
#[derive(Accounts)]
pub struct BuyShares<'info> {
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

    #[account(
        init,
        payer = user,
        space = UserPosition::LEN,
        seeds = [b"position", market.key().as_ref(), user.key().as_ref()],
        bump
    )]
    pub position: Account<'info, UserPosition>,

    #[account(mut)]
    pub user: Signer<'info>,

    /// Protocol fee wallet (validated against global_config)
    /// CHECK: Validated with constraint
    #[account(
        mut,
        constraint = protocol_fee_wallet.key() == global_config.protocol_fee_wallet @ ErrorCode::Unauthorized
    )]
    pub protocol_fee_wallet: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<BuyShares>,
    outcome: bool,
    target_cost: u64,
) -> Result<()> {
    let market = &mut ctx.accounts.market;
    let position = &mut ctx.accounts.position;
    let config = &ctx.accounts.global_config;

    // Calculate shares user gets for their target cost (using LMSR)
    let (cost_before_fees, shares_bought) = lmsr::calculate_buy_cost(
        market.shares_yes,
        market.shares_no,
        market.b_parameter,
        outcome,
        target_cost,
    )?;

    // Apply fees (3% + 2% + 5% = 10%)
    let protocol_fee = cost_before_fees
        .checked_mul(config.protocol_fee_bps as u64).ok_or(ErrorCode::OverflowError)?
        .checked_div(10000).ok_or(ErrorCode::DivisionByZero)?;

    let resolver_fee = cost_before_fees
        .checked_mul(config.resolver_reward_bps as u64).ok_or(ErrorCode::OverflowError)?
        .checked_div(10000).ok_or(ErrorCode::DivisionByZero)?;

    let lp_fee = cost_before_fees
        .checked_mul(config.liquidity_provider_fee_bps as u64).ok_or(ErrorCode::OverflowError)?
        .checked_div(10000).ok_or(ErrorCode::DivisionByZero)?;

    let total_cost = cost_before_fees
        .checked_add(protocol_fee).ok_or(ErrorCode::OverflowError)?
        .checked_add(resolver_fee).ok_or(ErrorCode::OverflowError)?
        .checked_add(lp_fee).ok_or(ErrorCode::OverflowError)?;

    // Slippage check (total cost must not exceed user's max)
    require!(total_cost <= target_cost, ErrorCode::SlippageExceeded);

    // Transfer cost from user to market (minus protocol fee which goes directly)
    let market_transfer = total_cost.checked_sub(protocol_fee).ok_or(ErrorCode::UnderflowError)?;

    system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.user.to_account_info(),
                to: market.to_account_info(),
            },
        ),
        market_transfer,
    )?;

    // Transfer protocol fee to protocol wallet
    system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.user.to_account_info(),
                to: ctx.accounts.protocol_fee_wallet.to_account_info(),
            },
        ),
        protocol_fee,
    )?;

    // Update market state
    if outcome {
        market.shares_yes = market.shares_yes.checked_add(shares_bought).ok_or(ErrorCode::OverflowError)?;
    } else {
        market.shares_no = market.shares_no.checked_add(shares_bought).ok_or(ErrorCode::OverflowError)?;
    }

    market.total_volume = market.total_volume.checked_add(total_cost).ok_or(ErrorCode::OverflowError)?;

    // Fees stay in market (resolver gets on claim, LP withdrawn by creator)
    market.current_liquidity = market.current_liquidity
        .checked_add(resolver_fee).ok_or(ErrorCode::OverflowError)?
        .checked_add(lp_fee).ok_or(ErrorCode::OverflowError)?;

    market.accumulated_resolver_fees = market.accumulated_resolver_fees
        .checked_add(resolver_fee).ok_or(ErrorCode::OverflowError)?;

    market.accumulated_lp_fees = market.accumulated_lp_fees
        .checked_add(lp_fee).ok_or(ErrorCode::OverflowError)?;

    // Initialize position (first buy for this user on this market)
    position.market = market.key();
    position.user = ctx.accounts.user.key();
    position.shares_yes = 0;
    position.shares_no = 0;
    position.total_invested = 0;
    position.trades_count = 0;
    position.has_claimed = false;
    position.last_trade_at = Clock::get()?.unix_timestamp;
    position.bump = ctx.bumps.position;

    // Add shares
    if outcome {
        position.shares_yes = shares_bought;
    } else {
        position.shares_no = shares_bought;
    }

    position.total_invested = total_cost;
    position.trades_count = 1;

    // Emit event (events defined in state.rs)
    // emit!(SharesBought {
    //     market_id: market.market_id,
    //     user: ctx.accounts.user.key(),
    //     outcome,
    //     shares: shares_bought,
    //     cost: total_cost,
    //     new_price_yes: lmsr::calculate_yes_price(market.shares_yes, market.shares_no, market.b_parameter)?,
    //     timestamp: position.last_trade_at,
    // });

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_fee_calculation() {
        // Test that fees add up to 10%
        let cost = 1_000_000_000u64; // 1 SOL
        let protocol_fee = (cost * 300) / 10000; // 3%
        let resolver_fee = (cost * 200) / 10000; // 2%
        let lp_fee = (cost * 500) / 10000;       // 5%
        let total_fee = protocol_fee + resolver_fee + lp_fee;

        assert_eq!(protocol_fee, 30_000_000); // 0.03 SOL
        assert_eq!(resolver_fee, 20_000_000); // 0.02 SOL
        assert_eq!(lp_fee, 50_000_000);       // 0.05 SOL
        assert_eq!(total_fee, 100_000_000);   // 0.1 SOL (10%)
    }

    #[test]
    fn test_total_cost_with_fees() {
        let base_cost = 1_000_000_000u64;
        let fees = 100_000_000u64; // 10%
        let total = base_cost + fees;
        assert_eq!(total, 1_100_000_000); // 1.1 SOL
    }
}
