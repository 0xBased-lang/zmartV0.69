// ============================================================
// Custom Test Assertions
// ============================================================

use super::*;
use anchor_lang::prelude::*;

/// Tolerance for fixed-point comparisons (0.01% = 100,000 in fixed-point with 9 decimals)
pub const DEFAULT_TOLERANCE: u64 = 100_000;

// ============================================================
// Account Assertions
// ============================================================

/// Assert account exists and has expected owner
pub async fn assert_account_exists(
    ctx: &mut TestContext,
    pubkey: &Pubkey,
    expected_owner: &Pubkey,
) -> Result<Account, Box<dyn std::error::Error>> {
    let account = ctx.get_account(pubkey).await?;

    assert_eq!(
        account.owner, *expected_owner,
        "Account owner mismatch: expected {}, got {}",
        expected_owner, account.owner
    );

    Ok(account)
}

/// Assert account does not exist
pub async fn assert_account_not_exists(
    ctx: &mut TestContext,
    pubkey: &Pubkey,
) -> Result<(), Box<dyn std::error::Error>> {
    let result = ctx.get_account(pubkey).await;

    assert!(
        result.is_err(),
        "Account {} should not exist",
        pubkey
    );

    Ok(())
}

/// Assert account balance is expected value
pub async fn assert_account_balance(
    ctx: &mut TestContext,
    pubkey: &Pubkey,
    expected_lamports: u64,
    tolerance: u64,
) -> Result<(), Box<dyn std::error::Error>> {
    let account = ctx.get_account(pubkey).await?;

    let diff = if account.lamports > expected_lamports {
        account.lamports - expected_lamports
    } else {
        expected_lamports - account.lamports
    };

    assert!(
        diff <= tolerance,
        "Account balance mismatch: expected {} ± {}, got {} (diff: {})",
        expected_lamports,
        tolerance,
        account.lamports,
        diff
    );

    Ok(())
}

// ============================================================
// Market State Assertions
// ============================================================

/// Assert market is in expected state
pub fn assert_market_state(
    actual_state: u8,
    expected_state: MarketStage,
    message: &str,
) {
    assert_eq!(
        actual_state,
        expected_state.as_u8(),
        "{}: expected state {:?} ({}), got {}",
        message,
        expected_state,
        expected_state.as_u8(),
        actual_state
    );
}

/// Assert market has expected liquidity
pub fn assert_market_liquidity(
    actual_liquidity: u64,
    expected_liquidity: u64,
    tolerance: u64,
    message: &str,
) {
    let diff = if actual_liquidity > expected_liquidity {
        actual_liquidity - expected_liquidity
    } else {
        expected_liquidity - actual_liquidity
    };

    assert!(
        diff <= tolerance,
        "{}: liquidity mismatch: expected {} ± {}, got {} (diff: {})",
        message,
        expected_liquidity,
        tolerance,
        actual_liquidity,
        diff
    );
}

// ============================================================
// Position Assertions
// ============================================================

/// Assert user has expected shares
pub fn assert_user_shares(
    actual_yes_shares: u64,
    actual_no_shares: u64,
    expected_yes_shares: u64,
    expected_no_shares: u64,
    tolerance: u64,
    message: &str,
) {
    let yes_diff = if actual_yes_shares > expected_yes_shares {
        actual_yes_shares - expected_yes_shares
    } else {
        expected_yes_shares - actual_yes_shares
    };

    let no_diff = if actual_no_shares > expected_no_shares {
        actual_no_shares - expected_no_shares
    } else {
        expected_no_shares - actual_no_shares
    };

    assert!(
        yes_diff <= tolerance,
        "{}: YES shares mismatch: expected {} ± {}, got {} (diff: {})",
        message,
        expected_yes_shares,
        tolerance,
        actual_yes_shares,
        yes_diff
    );

    assert!(
        no_diff <= tolerance,
        "{}: NO shares mismatch: expected {} ± {}, got {} (diff: {})",
        message,
        expected_no_shares,
        tolerance,
        actual_no_shares,
        no_diff
    );
}

// ============================================================
// LMSR Assertions
// ============================================================

/// Assert price is within expected range
pub fn assert_price_in_range(
    actual_price: u64,
    expected_price: u64,
    tolerance_percent: f64,
    message: &str,
) {
    let tolerance = ((expected_price as f64) * tolerance_percent / 100.0) as u64;

    let diff = if actual_price > expected_price {
        actual_price - expected_price
    } else {
        expected_price - actual_price
    };

    assert!(
        diff <= tolerance,
        "{}: price mismatch: expected {} ± {}% ({} units), got {} (diff: {})",
        message,
        expected_price,
        tolerance_percent,
        tolerance,
        actual_price,
        diff
    );
}

/// Assert cost calculation is correct (with tolerance)
pub fn assert_cost_calculation(
    q_yes_before: u64,
    q_no_before: u64,
    q_yes_after: u64,
    q_no_after: u64,
    b: u64,
    actual_cost: u64,
    tolerance: u64,
    message: &str,
) {
    let cost_before = calculate_lmsr_cost(q_yes_before, q_no_before, b)
        .expect("Cost calculation failed");
    let cost_after = calculate_lmsr_cost(q_yes_after, q_no_after, b)
        .expect("Cost calculation failed");

    let expected_cost = cost_after.saturating_sub(cost_before);

    let diff = if actual_cost > expected_cost {
        actual_cost - expected_cost
    } else {
        expected_cost - actual_cost
    };

    assert!(
        diff <= tolerance,
        "{}: cost mismatch: expected {} ± {}, got {} (diff: {})",
        message,
        expected_cost,
        tolerance,
        actual_cost,
        diff
    );
}

/// Assert bounded loss property holds
pub fn assert_bounded_loss(
    initial_cost: u64,
    final_payout: u64,
    b: u64,
    message: &str,
) {
    let max_loss = calculate_max_bounded_loss(b);

    let actual_loss = if initial_cost > final_payout {
        initial_cost - final_payout
    } else {
        0
    };

    assert!(
        actual_loss <= max_loss,
        "{}: bounded loss violated: actual loss {} > max loss {} (b = {})",
        message,
        actual_loss,
        max_loss,
        b
    );
}

// ============================================================
// Fee Assertions
// ============================================================

/// Assert fee distribution is correct (3% protocol, 2% creator, 5% stakers = 10% total)
pub fn assert_fee_distribution(
    total_amount: u64,
    protocol_fee: u64,
    creator_fee: u64,
    staker_fee: u64,
    tolerance: u64,
    message: &str,
) {
    // Calculate expected fees (per CORE_LOGIC_INVARIANTS.md)
    let expected_protocol = (total_amount * 3) / 100;  // 3%
    let expected_creator = (total_amount * 2) / 100;   // 2%
    let expected_staker = (total_amount * 5) / 100;    // 5%

    // Verify protocol fee
    let protocol_diff = if protocol_fee > expected_protocol {
        protocol_fee - expected_protocol
    } else {
        expected_protocol - protocol_fee
    };

    assert!(
        protocol_diff <= tolerance,
        "{}: protocol fee mismatch: expected {} ± {}, got {} (diff: {})",
        message,
        expected_protocol,
        tolerance,
        protocol_fee,
        protocol_diff
    );

    // Verify creator fee
    let creator_diff = if creator_fee > expected_creator {
        creator_fee - expected_creator
    } else {
        expected_creator - creator_fee
    };

    assert!(
        creator_diff <= tolerance,
        "{}: creator fee mismatch: expected {} ± {}, got {} (diff: {})",
        message,
        expected_creator,
        tolerance,
        creator_fee,
        creator_diff
    );

    // Verify staker fee
    let staker_diff = if staker_fee > expected_staker {
        staker_fee - expected_staker
    } else {
        expected_staker - staker_fee
    };

    assert!(
        staker_diff <= tolerance,
        "{}: staker fee mismatch: expected {} ± {}, got {} (diff: {})",
        message,
        expected_staker,
        tolerance,
        staker_fee,
        staker_diff
    );

    // Verify total is 10%
    let total_fee = protocol_fee + creator_fee + staker_fee;
    let expected_total = (total_amount * 10) / 100;

    let total_diff = if total_fee > expected_total {
        total_fee - expected_total
    } else {
        expected_total - total_fee
    };

    assert!(
        total_diff <= tolerance,
        "{}: total fee mismatch: expected {} ± {}, got {} (diff: {})",
        message,
        expected_total,
        tolerance,
        total_fee,
        total_diff
    );
}

// ============================================================
// Timestamp Assertions
// ============================================================

/// Assert timestamp is in expected range
pub fn assert_timestamp_in_range(
    actual: i64,
    expected: i64,
    tolerance_seconds: i64,
    message: &str,
) {
    let diff = (actual - expected).abs();

    assert!(
        diff <= tolerance_seconds,
        "{}: timestamp mismatch: expected {} ± {}s, got {} (diff: {}s)",
        message,
        expected,
        tolerance_seconds,
        actual,
        diff
    );
}

/// Assert timestamp is in the future
pub fn assert_timestamp_future(actual: i64, message: &str) {
    let now = current_timestamp();

    assert!(
        actual > now,
        "{}: timestamp {} should be in the future (now: {})",
        message,
        actual,
        now
    );
}

/// Assert timestamp is in the past
pub fn assert_timestamp_past(actual: i64, message: &str) {
    let now = current_timestamp();

    assert!(
        actual < now,
        "{}: timestamp {} should be in the past (now: {})",
        message,
        actual,
        now
    );
}

// ============================================================
// Voting Assertions
// ============================================================

/// Assert vote counts are correct
pub fn assert_vote_counts(
    actual_yes_votes: u64,
    actual_no_votes: u64,
    expected_yes_votes: u64,
    expected_no_votes: u64,
    message: &str,
) {
    assert_eq!(
        actual_yes_votes, expected_yes_votes,
        "{}: YES votes mismatch: expected {}, got {}",
        message, expected_yes_votes, actual_yes_votes
    );

    assert_eq!(
        actual_no_votes, expected_no_votes,
        "{}: NO votes mismatch: expected {}, got {}",
        message, expected_no_votes, actual_no_votes
    );
}

/// Assert vote passes threshold (70% per blueprint)
pub fn assert_vote_passes_threshold(
    yes_votes: u64,
    no_votes: u64,
    threshold_percent: u64,
    message: &str,
) {
    let total_votes = yes_votes + no_votes;
    let yes_percent = if total_votes > 0 {
        (yes_votes * 100) / total_votes
    } else {
        0
    };

    assert!(
        yes_percent >= threshold_percent,
        "{}: vote did not pass threshold: {}% YES (need {}%)",
        message,
        yes_percent,
        threshold_percent
    );
}
