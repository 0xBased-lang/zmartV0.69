/// Bounded loss calculations for LMSR protection
///
/// SECURITY CRITICAL: Finding #4 from security audit (Week 2)
///
/// The LMSR (Logarithmic Market Scoring Rule) has a theoretical maximum loss
/// for the market maker (liquidity provider) of b * ln(2) ≈ 0.693 * b.
///
/// This module provides functions to calculate and enforce this bound.

use anchor_lang::prelude::*;
use crate::error::ErrorCode;
use super::{LN_2, PRECISION};

/// Calculate the maximum theoretical loss for an LMSR market
///
/// According to the LMSR formula, the maximum loss to the market maker is
/// bounded by b * ln(2), where:
/// - b is the liquidity sensitivity parameter
/// - ln(2) ≈ 0.693147180
///
/// This represents the worst-case scenario where all shares are bought on
/// one side (driving probability to 100%), then the opposite outcome occurs.
///
/// # Arguments
///
/// * `b_parameter` - LMSR liquidity depth parameter (fixed-point, 9 decimals)
///
/// # Returns
///
/// Maximum loss in lamports
///
/// # Example
///
/// ```rust
/// let b = 1_000_000_000_000u64; // 1000 SOL
/// let max_loss = calculate_max_loss(b)?;
/// assert_eq!(max_loss, 693_147_180_000); // ≈ 693.147 SOL
/// ```
pub fn calculate_max_loss(b_parameter: u64) -> Result<u64> {
    // Formula: max_loss = b * ln(2)
    // Since both b and LN_2 are in fixed-point (9 decimals), we need to divide by PRECISION

    // Use u128 to prevent overflow for large b values
    let b_wide = b_parameter as u128;
    let ln2_wide = LN_2 as u128;
    let precision_wide = PRECISION as u128;

    let max_loss_wide = b_wide
        .checked_mul(ln2_wide)
        .ok_or(ErrorCode::OverflowError)?
        .checked_div(precision_wide)
        .ok_or(ErrorCode::DivisionByZero)?;

    // Convert back to u64 (should always fit since max_loss < b)
    u64::try_from(max_loss_wide)
        .map_err(|_| ErrorCode::OverflowError.into())
}

/// Verify that actual loss does not exceed the LMSR theoretical maximum
///
/// This function ensures the market creator never loses more than the
/// theoretical maximum of b * ln(2). This protects against:
/// - Implementation bugs in LMSR calculations
/// - Numerical precision errors accumulating
/// - Unexpected edge cases in the trading formula
///
/// # Arguments
///
/// * `initial_liquidity` - Liquidity provided at market creation (lamports)
/// * `current_liquidity` - Remaining liquidity in market (lamports)
/// * `b_parameter` - LMSR liquidity depth parameter (fixed-point)
///
/// # Returns
///
/// * `Ok(())` if loss is within bounds
/// * `Err(ErrorCode::BoundedLossExceeded)` if loss exceeds theoretical maximum
///
/// # Security Guarantees
///
/// * Market creator loss never exceeds b * ln(2)
/// * Protects against catastrophic losses from bugs
/// * Provides mathematical guarantee of maximum risk
///
/// # Example
///
/// ```rust
/// let b = 1_000_000_000_000u64; // 1000 SOL
/// let initial = 1_000_000_000_000u64; // 1000 SOL
/// let current = 400_000_000_000u64; // 400 SOL
/// // Loss = 600 SOL, max allowed ≈ 693 SOL
/// verify_bounded_loss(initial, current, b)?; // OK
/// ```
pub fn verify_bounded_loss(
    initial_liquidity: u64,
    current_liquidity: u64,
    b_parameter: u64,
) -> Result<()> {
    // Calculate actual loss (handle case where current > initial due to trading profits)
    let actual_loss = if initial_liquidity > current_liquidity {
        initial_liquidity - current_liquidity
    } else {
        0 // No loss, market maker profited
    };

    // Calculate theoretical maximum loss
    let max_allowed_loss = calculate_max_loss(b_parameter)?;

    // SECURITY CHECK: Ensure actual loss doesn't exceed theoretical maximum
    // This prevents catastrophic losses from bugs or edge cases
    require!(
        actual_loss <= max_allowed_loss,
        ErrorCode::BoundedLossExceeded
    );

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_max_loss_calculation() {
        // Test with b = 1000 SOL
        let b = 1_000_000_000_000u64;
        let max_loss = calculate_max_loss(b).unwrap();

        // Expected: 1000 * 0.693147180 ≈ 693.147180 SOL
        assert_eq!(max_loss, 693_147_180_000);
    }

    #[test]
    fn test_max_loss_small_b() {
        // Test with b = 100 SOL (minimum)
        let b = 100_000_000_000u64;
        let max_loss = calculate_max_loss(b).unwrap();

        // Expected: 100 * 0.693147180 ≈ 69.3147180 SOL
        assert_eq!(max_loss, 69_314_718_000);
    }

    #[test]
    fn test_verify_within_bounds() {
        let b = 1_000_000_000_000u64; // 1000 SOL
        let initial = 1_000_000_000_000u64; // 1000 SOL
        let current = 400_000_000_000u64; // 400 SOL

        // Loss = 600 SOL, max = 693.147 SOL
        // Should pass (within bounds)
        verify_bounded_loss(initial, current, b).unwrap();
    }

    #[test]
    fn test_verify_exceeds_bounds() {
        let b = 1_000_000_000_000u64; // 1000 SOL
        let initial = 1_000_000_000_000u64; // 1000 SOL
        let current = 200_000_000_000u64; // 200 SOL

        // Loss = 800 SOL, max = 693.147 SOL
        // Should fail (exceeds bounds)
        let result = verify_bounded_loss(initial, current, b);
        assert!(result.is_err());
    }

    #[test]
    fn test_verify_no_loss() {
        let b = 1_000_000_000_000u64; // 1000 SOL
        let initial = 1_000_000_000_000u64; // 1000 SOL
        let current = 1_100_000_000_000u64; // 1100 SOL (profit!)

        // No loss (profit instead)
        // Should pass
        verify_bounded_loss(initial, current, b).unwrap();
    }

    #[test]
    fn test_verify_exact_bound() {
        let b = 1_000_000_000_000u64; // 1000 SOL
        let max_loss = calculate_max_loss(b).unwrap(); // 693.147180 SOL
        let initial = 1_000_000_000_000u64;
        let current = initial - max_loss; // Exactly at bound

        // Loss = max allowed
        // Should pass (boundary condition)
        verify_bounded_loss(initial, current, b).unwrap();
    }
}
