use anchor_lang::prelude::*;
use anchor_lang::system_program;
use crate::error::ErrorCode;
use crate::state::{GlobalConfig, MarketAccount, MarketState, UserPosition};
use crate::math::lmsr;
use crate::utils::calculate_fees_accurate;

/// Minimum trade amount to prevent fee evasion through micro-trades
/// 0.00001 SOL = 10,000 lamports
/// SECURITY: Finding #9 - Prevents micro-trade attacks that bypass fee mechanics
pub const MIN_TRADE_AMOUNT: u64 = 10_000;

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

    // SECURITY FIX (Finding #1): Changed from init to init_if_needed
    // Prevents account aliasing and allows multiple purchases
    #[account(
        init_if_needed,
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

    // Check if protocol is paused (emergency pause active)
    require!(!config.is_paused, ErrorCode::ProtocolPaused);

    // SECURITY FIX (Finding #9): Enforce minimum trade size
    // Prevents micro-trade attacks that evade fees or manipulate prices
    require!(
        target_cost >= MIN_TRADE_AMOUNT,
        ErrorCode::TradeTooSmall
    );

    // Calculate shares user gets for their target cost (using LMSR)
    let (cost_before_fees, shares_bought) = lmsr::calculate_buy_cost(
        market.shares_yes,
        market.shares_no,
        market.b_parameter,
        outcome,
        target_cost,
    )?;

    // SECURITY FIX (Finding #6): Use accurate fee calculation to prevent value leakage
    // Old approach calculated fees individually, losing precision on each division
    // New approach calculates total fees first, then splits proportionally
    let fees = calculate_fees_accurate(
        cost_before_fees,
        config.protocol_fee_bps,
        config.resolver_reward_bps,
        config.liquidity_provider_fee_bps,
    )?;

    let total_cost = cost_before_fees
        .checked_add(fees.total_fees)
        .ok_or(ErrorCode::OverflowError)?;

    // Slippage check (total cost must not exceed user's max)
    require!(total_cost <= target_cost, ErrorCode::SlippageExceeded);

    // Transfer cost from user to market (minus protocol fee which goes directly)
    let market_transfer = total_cost
        .checked_sub(fees.protocol_fee)
        .ok_or(ErrorCode::UnderflowError)?;

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
        fees.protocol_fee,
    )?;

    // Update market state
    if outcome {
        market.shares_yes = market.shares_yes.checked_add(shares_bought).ok_or(ErrorCode::OverflowError)?;
    } else {
        market.shares_no = market.shares_no.checked_add(shares_bought).ok_or(ErrorCode::OverflowError)?;
    }

    market.total_volume = market.total_volume
        .checked_add(total_cost)
        .ok_or(ErrorCode::OverflowError)?;

    // Fees stay in market (resolver gets on claim, LP withdrawn by creator)
    market.current_liquidity = market.current_liquidity
        .checked_add(fees.resolver_fee)
        .ok_or(ErrorCode::OverflowError)?
        .checked_add(fees.lp_fee)
        .ok_or(ErrorCode::OverflowError)?;

    market.accumulated_resolver_fees = market.accumulated_resolver_fees
        .checked_add(fees.resolver_fee)
        .ok_or(ErrorCode::OverflowError)?;

    market.accumulated_lp_fees = market.accumulated_lp_fees
        .checked_add(fees.lp_fee)
        .ok_or(ErrorCode::OverflowError)?;

    // SECURITY FIX (Finding #1): Check if this is a newly initialized account
    let is_first_purchase = position.trades_count == 0;

    if is_first_purchase {
        // Initialize position for first buy
        position.market = market.key();
        position.user = ctx.accounts.user.key();
        position.shares_yes = 0;
        position.shares_no = 0;
        position.total_invested = 0;
        position.trades_count = 0;
        position.has_claimed = false;
        position.bump = ctx.bumps.position;
    } else {
        // SECURITY: Validate ownership for existing accounts
        // This prevents account aliasing where attacker creates position with victim's address
        require!(
            position.user == ctx.accounts.user.key(),
            ErrorCode::Unauthorized
        );
        require!(
            position.market == market.key(),
            ErrorCode::InvalidMarketId
        );
    }

    // Add shares (works for both first and subsequent purchases)
    if outcome {
        position.shares_yes = position.shares_yes
            .checked_add(shares_bought)
            .ok_or(ErrorCode::OverflowError)?;
    } else {
        position.shares_no = position.shares_no
            .checked_add(shares_bought)
            .ok_or(ErrorCode::OverflowError)?;
    }

    // Update position stats
    position.total_invested = position.total_invested
        .checked_add(total_cost)
        .ok_or(ErrorCode::OverflowError)?;
    position.trades_count = position.trades_count
        .checked_add(1)
        .ok_or(ErrorCode::OverflowError)?;
    position.last_trade_at = Clock::get()?.unix_timestamp;

    // Emit event (events defined in state.rs)
    emit!(SharesBought {
        market_id: market.market_id,
        user: ctx.accounts.user.key(),
        outcome,
        shares: shares_bought,
        cost: total_cost,
        new_price_yes: lmsr::calculate_yes_price(market.shares_yes, market.shares_no, market.b_parameter)?,
        timestamp: position.last_trade_at,
    });

    Ok(())
}

#[event]
pub struct SharesBought {
    pub market_id: [u8; 32],
    pub user: Pubkey,
    pub outcome: bool,
    pub shares: u64,
    pub cost: u64,
    pub new_price_yes: u64,
    pub timestamp: i64,
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
