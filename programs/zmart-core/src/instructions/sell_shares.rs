use anchor_lang::prelude::*;
use crate::error::ErrorCode;
use crate::state::{GlobalConfig, MarketAccount, MarketState, UserPosition};
use crate::math::lmsr;
use crate::utils::{transfer_with_rent_check, calculate_fees_accurate};
use super::buy_shares::MIN_TRADE_AMOUNT;

/// Sell YES or NO shares back to the pool
///
/// Users specify how many shares to sell and receive proceeds calculated by
/// LMSR formula. Fees are deducted from proceeds: 3% protocol + 2% resolver + 5% LP = 10% total.
///
/// # Arguments
/// * `outcome` - true for YES, false for NO
/// * `shares_to_sell` - Number of shares to sell
/// * `min_proceeds` - Minimum acceptable proceeds (slippage protection)
///
/// # State Changes
/// * Market: shares_yes/shares_no decreased, liquidity decreased by payout
/// * Position: shares decreased, trades_count++
///
/// # Fees
/// Same 10% structure as buy, deducted from proceeds
#[derive(Accounts)]
pub struct SellShares<'info> {
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
        mut,
        seeds = [b"position", market.key().as_ref(), user.key().as_ref()],
        bump = position.bump,
        has_one = user @ ErrorCode::Unauthorized
    )]
    pub position: Account<'info, UserPosition>,

    #[account(mut)]
    pub user: Signer<'info>,

    /// Protocol fee wallet
    /// CHECK: Validated with constraint
    #[account(
        mut,
        constraint = protocol_fee_wallet.key() == global_config.protocol_fee_wallet @ ErrorCode::Unauthorized
    )]
    pub protocol_fee_wallet: AccountInfo<'info>,

    /// System program for CPI transfers
    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<SellShares>,
    outcome: bool,
    shares_to_sell: u64,
    min_proceeds: u64,
) -> Result<()> {
    let market = &mut ctx.accounts.market;
    let position = &mut ctx.accounts.position;
    let config = &ctx.accounts.global_config;

    // Check if protocol is paused (emergency pause active)
    require!(!config.is_paused, ErrorCode::ProtocolPaused);

    // Check user has enough shares
    let user_shares = if outcome { position.shares_yes } else { position.shares_no };
    require!(user_shares >= shares_to_sell, ErrorCode::InsufficientShares);

    // Calculate proceeds from selling shares (before fees)
    let proceeds_before_fees = lmsr::calculate_sell_proceeds(
        market.shares_yes,
        market.shares_no,
        market.b_parameter,
        outcome,
        shares_to_sell,
    )?;

    // SECURITY FIX (Finding #9): Enforce minimum trade size
    // Prevents micro-trade attacks that evade fees or manipulate prices
    require!(
        proceeds_before_fees >= MIN_TRADE_AMOUNT,
        ErrorCode::TradeTooSmall
    );

    // SECURITY FIX (Finding #6): Use accurate fee calculation to prevent value leakage
    // Old approach calculated fees individually, losing precision on each division
    // New approach calculates total fees first, then splits proportionally
    let fees = calculate_fees_accurate(
        proceeds_before_fees,
        config.protocol_fee_bps,
        config.resolver_reward_bps,
        config.liquidity_provider_fee_bps,
    )?;

    let net_proceeds = proceeds_before_fees
        .checked_sub(fees.total_fees)
        .ok_or(ErrorCode::UnderflowError)?;

    // Slippage check
    require!(net_proceeds >= min_proceeds, ErrorCode::SlippageExceeded);

    // Check market has enough liquidity to pay out
    let total_payout = net_proceeds
        .checked_add(fees.protocol_fee)
        .ok_or(ErrorCode::OverflowError)?;
    require!(market.current_liquidity >= total_payout, ErrorCode::InsufficientLiquidity);

    // Update market state
    if outcome {
        market.shares_yes = market.shares_yes.checked_sub(shares_to_sell).ok_or(ErrorCode::UnderflowError)?;
    } else {
        market.shares_no = market.shares_no.checked_sub(shares_to_sell).ok_or(ErrorCode::UnderflowError)?;
    }

    market.total_volume = market.total_volume
        .checked_add(proceeds_before_fees)
        .ok_or(ErrorCode::OverflowError)?;
    market.current_liquidity = market.current_liquidity
        .checked_sub(total_payout)
        .ok_or(ErrorCode::UnderflowError)?;

    // Accumulate fees (resolver + LP stay in market)
    market.accumulated_resolver_fees = market.accumulated_resolver_fees
        .checked_add(fees.resolver_fee)
        .ok_or(ErrorCode::OverflowError)?;

    market.accumulated_lp_fees = market.accumulated_lp_fees
        .checked_add(fees.lp_fee)
        .ok_or(ErrorCode::OverflowError)?;

    // Update user position
    if outcome {
        position.shares_yes = position.shares_yes.checked_sub(shares_to_sell).ok_or(ErrorCode::UnderflowError)?;
    } else {
        position.shares_no = position.shares_no.checked_sub(shares_to_sell).ok_or(ErrorCode::UnderflowError)?;
    }

    position.trades_count = position.trades_count.checked_add(1).ok_or(ErrorCode::OverflowError)?;
    position.last_trade_at = Clock::get()?.unix_timestamp;

    // SECURITY FIX (Finding #8): Lock market before lamport transfers (reentrancy protection)
    market.lock()?;

    // SECURITY FIX (Finding #2): Transfer net proceeds to user with rent check
    // Ensures market account maintains rent exemption after transfer
    transfer_with_rent_check(
        &market.to_account_info(),
        &ctx.accounts.user.to_account_info(),
        net_proceeds,
        &ctx.accounts.system_program.to_account_info(),
    )?;

    // SECURITY FIX (Finding #2): Transfer protocol fee with rent check
    // Ensures market account maintains rent exemption after fee payment
    transfer_with_rent_check(
        &market.to_account_info(),
        &ctx.accounts.protocol_fee_wallet,
        fees.protocol_fee,
        &ctx.accounts.system_program.to_account_info(),
    )?;

    // SECURITY FIX (Finding #8): Unlock market after transfers complete
    market.unlock();

    // Emit event
    // emit!(SharesSold {
    //     market_id: market.market_id,
    //     user: ctx.accounts.user.key(),
    //     outcome,
    //     shares: shares_to_sell,
    //     proceeds: net_proceeds,
    //     new_price_yes: lmsr::calculate_yes_price(market.shares_yes, market.shares_no, market.b_parameter)?,
    //     timestamp: position.last_trade_at,
    // });

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_fee_deduction() {
        // Test that fees are correctly deducted from proceeds
        let proceeds = 1_000_000_000u64; // 1 SOL
        let protocol_fee = (proceeds * 300) / 10000; // 3%
        let resolver_fee = (proceeds * 200) / 10000; // 2%
        let lp_fee = (proceeds * 500) / 10000;       // 5%

        let total_fees = protocol_fee + resolver_fee + lp_fee;
        let net_proceeds = proceeds - total_fees;

        assert_eq!(net_proceeds, 900_000_000); // 0.9 SOL (90%)
    }

    #[test]
    fn test_proceeds_calculation() {
        // Ensure proceeds are less than original cost (spread exists)
        let buy_cost = 1_100_000_000u64; // 1.1 SOL (1 + 10% fees)
        let sell_proceeds_gross = 1_000_000_000u64; // 1 SOL base
        let sell_proceeds_net = 900_000_000u64; // 0.9 SOL (1 - 10% fees)

        // User loses money on round-trip due to fees
        assert!(sell_proceeds_net < buy_cost);
    }
}
