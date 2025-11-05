// ============================================================
// LMSR Calculation Validation Helpers
// ============================================================
// Reference: docs/05_LMSR_MATHEMATICS.md

use super::*;

// Fixed-point precision (9 decimals per spec)
pub const PRECISION: u64 = 1_000_000_000;
pub const PRECISION_F64: f64 = 1_000_000_000.0;

// ============================================================
// LMSR Formula Validation
// ============================================================

/// Calculate LMSR cost function: C(q) = b * ln(e^(q_yes/b) + e^(q_no/b))
///
/// Using fixed-point arithmetic with 9 decimals
/// Reference: 05_LMSR_MATHEMATICS.md Section 4.1
pub fn calculate_lmsr_cost(q_yes: u64, q_no: u64, b: u64) -> Result<u64, String> {
    // Convert to f64 for calculation (will convert back to fixed-point)
    let q_yes_f = (q_yes as f64) / PRECISION_F64;
    let q_no_f = (q_no as f64) / PRECISION_F64;
    let b_f = (b as f64) / PRECISION_F64;

    // e^(q_yes/b)
    let exp_yes = (q_yes_f / b_f).exp();

    // e^(q_no/b)
    let exp_no = (q_no_f / b_f).exp();

    // ln(e^(q_yes/b) + e^(q_no/b))
    let ln_sum = (exp_yes + exp_no).ln();

    // b * ln(...)
    let cost_f = b_f * ln_sum;

    // Convert back to fixed-point
    let cost = (cost_f * PRECISION_F64) as u64;

    Ok(cost)
}

/// Calculate price from quantity: P(YES) = e^(q_yes/b) / (e^(q_yes/b) + e^(q_no/b))
///
/// Returns price in range [0, 1] with 9 decimal precision
/// Reference: 05_LMSR_MATHEMATICS.md Section 4.3
pub fn calculate_price(q_yes: u64, q_no: u64, b: u64) -> Result<u64, String> {
    let q_yes_f = (q_yes as f64) / PRECISION_F64;
    let q_no_f = (q_no as f64) / PRECISION_F64;
    let b_f = (b as f64) / PRECISION_F64;

    let exp_yes = (q_yes_f / b_f).exp();
    let exp_no = (q_no_f / b_f).exp();

    let price_f = exp_yes / (exp_yes + exp_no);

    // Convert to fixed-point (0 to 1_000_000_000 representing 0 to 1.0)
    let price = (price_f * PRECISION_F64) as u64;

    Ok(price)
}

/// Calculate buy cost: Cost = C(q + Δq) - C(q)
///
/// Reference: 05_LMSR_MATHEMATICS.md Section 4.2
pub fn calculate_buy_cost(
    q_yes: u64,
    q_no: u64,
    b: u64,
    delta_q: u64,
    is_yes: bool,
) -> Result<u64, String> {
    let cost_before = calculate_lmsr_cost(q_yes, q_no, b)?;

    let (new_q_yes, new_q_no) = if is_yes {
        (q_yes + delta_q, q_no)
    } else {
        (q_yes, q_no + delta_q)
    };

    let cost_after = calculate_lmsr_cost(new_q_yes, new_q_no, b)?;

    let buy_cost = cost_after
        .checked_sub(cost_before)
        .ok_or("Cost calculation overflow")?;

    Ok(buy_cost)
}

/// Calculate sell proceeds: Proceeds = C(q) - C(q - Δq)
///
/// Reference: 05_LMSR_MATHEMATICS.md Section 4.4
pub fn calculate_sell_proceeds(
    q_yes: u64,
    q_no: u64,
    b: u64,
    delta_q: u64,
    is_yes: bool,
) -> Result<u64, String> {
    let cost_before = calculate_lmsr_cost(q_yes, q_no, b)?;

    let (new_q_yes, new_q_no) = if is_yes {
        (
            q_yes.checked_sub(delta_q).ok_or("Insufficient shares")?,
            q_no,
        )
    } else {
        (
            q_yes,
            q_no.checked_sub(delta_q).ok_or("Insufficient shares")?,
        )
    };

    let cost_after = calculate_lmsr_cost(new_q_yes, new_q_no, b)?;

    let proceeds = cost_before
        .checked_sub(cost_after)
        .ok_or("Proceeds calculation underflow")?;

    Ok(proceeds)
}

/// Calculate maximum bounded loss: Max Loss = b * ln(2)
///
/// Reference: 05_LMSR_MATHEMATICS.md Section 3.1
pub fn calculate_max_bounded_loss(b: u64) -> u64 {
    let b_f = (b as f64) / PRECISION_F64;
    let max_loss_f = b_f * 2.0_f64.ln(); // ln(2) ≈ 0.693

    (max_loss_f * PRECISION_F64) as u64
}

// ============================================================
// Known Test Cases (from 05_LMSR_MATHEMATICS.md Section 8)
// ============================================================

/// Test case 1: Equal shares (price should be 0.5)
#[cfg(test)]
pub fn test_case_equal_shares() -> (u64, u64, u64, u64) {
    let q_yes = 500_000_000;  // 0.5
    let q_no = 500_000_000;   // 0.5
    let b = 500_000_000;      // 0.5
    let expected_price = 500_000_000;  // 0.5

    (q_yes, q_no, b, expected_price)
}

/// Test case 2: 2:1 ratio (price should be ~0.73)
#[cfg(test)]
pub fn test_case_two_to_one() -> (u64, u64, u64, u64) {
    let q_yes = 1_000_000_000;  // 1.0
    let q_no = 500_000_000;     // 0.5
    let b = 500_000_000;        // 0.5
    let expected_price = 731_000_000;  // ~0.731

    (q_yes, q_no, b, expected_price)
}

/// Test case 3: Small b parameter (high volatility)
#[cfg(test)]
pub fn test_case_high_volatility() -> (u64, u64, u64, u64) {
    let q_yes = 200_000_000;  // 0.2
    let q_no = 100_000_000;   // 0.1
    let b = 100_000_000;      // 0.1 (small b = high price sensitivity)
    let expected_price = 731_000_000;  // ~0.731

    (q_yes, q_no, b, expected_price)
}

/// Test case 4: Large b parameter (low volatility)
#[cfg(test)]
pub fn test_case_low_volatility() -> (u64, u64, u64, u64) {
    let q_yes = 2_000_000_000;  // 2.0
    let q_no = 1_000_000_000;   // 1.0
    let b = 5_000_000_000;      // 5.0 (large b = low price sensitivity)
    let expected_price = 621_000_000;  // ~0.621

    (q_yes, q_no, b, expected_price)
}

// ============================================================
// Validation Helpers
// ============================================================

/// Validate price is within expected bounds [0, 1]
pub fn validate_price_bounds(price: u64) -> Result<(), String> {
    if price > PRECISION {
        return Err(format!("Price {} exceeds maximum {}", price, PRECISION));
    }
    Ok(())
}

/// Validate bounded loss property: actual_loss <= max_bounded_loss
pub fn validate_bounded_loss(
    initial_cost: u64,
    final_payout: u64,
    b: u64,
) -> Result<(), String> {
    let max_loss = calculate_max_bounded_loss(b);

    let actual_loss = if initial_cost > final_payout {
        initial_cost - final_payout
    } else {
        0
    };

    if actual_loss > max_loss {
        return Err(format!(
            "Bounded loss violated: actual {} > max {}",
            actual_loss, max_loss
        ));
    }

    Ok(())
}

/// Validate price increases when buying YES shares
pub fn validate_price_movement(
    price_before: u64,
    price_after: u64,
    is_buy_yes: bool,
) -> Result<(), String> {
    if is_buy_yes {
        if price_after <= price_before {
            return Err(format!(
                "Price should increase when buying YES: before {} <= after {}",
                price_before, price_after
            ));
        }
    } else {
        if price_after >= price_before {
            return Err(format!(
                "Price should decrease when buying NO: before {} >= after {}",
                price_before, price_after
            ));
        }
    }

    Ok(())
}

/// Calculate slippage percentage
pub fn calculate_slippage(expected_price: u64, actual_price: u64) -> f64 {
    let expected_f = (expected_price as f64) / PRECISION_F64;
    let actual_f = (actual_price as f64) / PRECISION_F64;

    ((actual_f - expected_f) / expected_f).abs() * 100.0
}

// ============================================================
// Conversion Utilities
// ============================================================

/// Convert fixed-point to f64 for display
pub fn fixed_to_f64(value: u64) -> f64 {
    (value as f64) / PRECISION_F64
}

/// Convert f64 to fixed-point
pub fn f64_to_fixed(value: f64) -> u64 {
    (value * PRECISION_F64) as u64
}

/// Format fixed-point for display
pub fn format_fixed(value: u64, decimals: usize) -> String {
    let value_f = fixed_to_f64(value);
    format!("{:.decimals$}", value_f, decimals = decimals)
}

// ============================================================
// Unit Tests
// ============================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_equal_shares_price() {
        let (q_yes, q_no, b, expected) = test_case_equal_shares();
        let price = calculate_price(q_yes, q_no, b).unwrap();

        // Allow 1% tolerance for floating point precision
        let tolerance = PRECISION / 100;
        assert_approx_eq!(price, expected, tolerance);
    }

    #[test]
    fn test_bounded_loss_calculation() {
        let b = 500_000_000;  // 0.5
        let max_loss = calculate_max_bounded_loss(b);

        // Max loss should be b * ln(2) ≈ b * 0.693
        let expected = (0.693 * PRECISION_F64) as u64;
        let tolerance = PRECISION / 100;

        assert_approx_eq!(max_loss, expected, tolerance);
    }

    #[test]
    fn test_price_bounds() {
        let (q_yes, q_no, b, _) = test_case_equal_shares();
        let price = calculate_price(q_yes, q_no, b).unwrap();

        assert!(validate_price_bounds(price).is_ok());
    }

    #[test]
    fn test_buy_increases_price() {
        let q_yes = 500_000_000;
        let q_no = 500_000_000;
        let b = 500_000_000;

        let price_before = calculate_price(q_yes, q_no, b).unwrap();

        let delta_q = 100_000_000;  // Buy 0.1 YES shares
        let price_after = calculate_price(q_yes + delta_q, q_no, b).unwrap();

        assert!(validate_price_movement(price_before, price_after, true).is_ok());
    }
}
