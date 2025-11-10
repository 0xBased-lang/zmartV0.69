/// Fee calculation utilities with rounding protection
///
/// SECURITY CRITICAL: Finding #6 from security audit (Week 2)
///
/// Problem: Individual fee calculations lose precision due to integer division.
/// Each fee calculation (protocol, resolver, LP) independently truncates, leading
/// to value leakage over many transactions.
///
/// Solution: Calculate total fees first, then split proportionally to minimize
/// rounding errors and prevent value leakage.

use anchor_lang::prelude::*;
use crate::error::ErrorCode;

/// Fee breakdown for a transaction
#[derive(Debug, Clone, Copy)]
pub struct FeeBreakdown {
    /// Protocol fee in lamports
    pub protocol_fee: u64,
    /// Resolver reward in lamports
    pub resolver_fee: u64,
    /// Liquidity provider fee in lamports
    pub lp_fee: u64,
    /// Total fees (sum of all fees)
    pub total_fees: u64,
}

/// Calculate fees with minimized rounding errors
///
/// This function calculates fees using a "total-first" approach to minimize
/// precision loss from integer division. Instead of calculating each fee
/// independently, it:
///
/// 1. Calculates total fee percentage (all fees combined)
/// 2. Calculates total fees from amount
/// 3. Splits total fees proportionally among fee types
///
/// This ensures the sum of individual fees exactly equals total fees,
/// preventing value leakage from accumulated rounding errors.
///
/// # Arguments
///
/// * `amount` - Base amount to calculate fees from (in lamports)
/// * `protocol_fee_bps` - Protocol fee in basis points (1 bps = 0.01%)
/// * `resolver_fee_bps` - Resolver fee in basis points
/// * `lp_fee_bps` - LP fee in basis points
///
/// # Returns
///
/// `FeeBreakdown` with all fees in lamports
///
/// # Errors
///
/// * `ErrorCode::OverflowError` - Arithmetic overflow
/// * `ErrorCode::DivisionByZero` - Division by zero
///
/// # Security Guarantees
///
/// * protocol_fee + resolver_fee + lp_fee == total_fees (exact equality)
/// * No value leakage from rounding errors
/// * Uses checked arithmetic throughout
/// * Deterministic results (same input → same output)
///
/// # Example
///
/// ```rust
/// let fees = calculate_fees_accurate(
///     1_000_000_000, // 1 SOL
///     300,           // 3% protocol
///     200,           // 2% resolver
///     500,           // 5% LP
/// )?;
/// assert_eq!(fees.total_fees, 100_000_000); // 0.1 SOL (10%)
/// assert_eq!(fees.protocol_fee + fees.resolver_fee + fees.lp_fee, fees.total_fees);
/// ```
pub fn calculate_fees_accurate(
    amount: u64,
    protocol_fee_bps: u16,
    resolver_fee_bps: u16,
    lp_fee_bps: u16,
) -> Result<FeeBreakdown> {
    // SECURITY FIX (Finding #6): Calculate total fee percentage first
    // This prevents compounding rounding errors from individual calculations
    let total_fee_bps = (protocol_fee_bps as u64)
        .checked_add(resolver_fee_bps as u64)
        .ok_or(ErrorCode::OverflowError)?
        .checked_add(lp_fee_bps as u64)
        .ok_or(ErrorCode::OverflowError)?;

    // Calculate total fees from amount (single division point)
    let total_fees = amount
        .checked_mul(total_fee_bps)
        .ok_or(ErrorCode::OverflowError)?
        .checked_div(10000)
        .ok_or(ErrorCode::DivisionByZero)?;

    // Split total fees proportionally to minimize rounding errors
    // Use the individual fee percentages relative to total
    let protocol_fee = total_fees
        .checked_mul(protocol_fee_bps as u64)
        .ok_or(ErrorCode::OverflowError)?
        .checked_div(total_fee_bps)
        .ok_or(ErrorCode::DivisionByZero)?;

    let resolver_fee = total_fees
        .checked_mul(resolver_fee_bps as u64)
        .ok_or(ErrorCode::OverflowError)?
        .checked_div(total_fee_bps)
        .ok_or(ErrorCode::DivisionByZero)?;

    // Calculate LP fee as remainder to ensure exact sum
    // This guarantees: protocol + resolver + lp = total_fees (no precision loss)
    let lp_fee = total_fees
        .checked_sub(protocol_fee)
        .ok_or(ErrorCode::UnderflowError)?
        .checked_sub(resolver_fee)
        .ok_or(ErrorCode::UnderflowError)?;

    Ok(FeeBreakdown {
        protocol_fee,
        resolver_fee,
        lp_fee,
        total_fees,
    })
}

/// Calculate minimum fee to prevent dust amounts
///
/// For very small transactions, fees might round to zero. This function
/// ensures a minimum fee is charged to prevent gaming the system.
///
/// # Arguments
///
/// * `amount` - Transaction amount in lamports
/// * `min_fee_lamports` - Minimum fee in lamports (e.g., 1000 = 0.000001 SOL)
///
/// # Returns
///
/// The larger of calculated fee or minimum fee
pub fn enforce_minimum_fee(calculated_fee: u64, min_fee_lamports: u64) -> u64 {
    u64::max(calculated_fee, min_fee_lamports)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_fee_accuracy() {
        // Test with 1 SOL (1 billion lamports)
        let fees = calculate_fees_accurate(
            1_000_000_000,
            300, // 3%
            200, // 2%
            500, // 5%
        ).unwrap();

        // Total should be exactly 10%
        assert_eq!(fees.total_fees, 100_000_000);

        // Sum of individual fees should equal total (no value leakage)
        assert_eq!(
            fees.protocol_fee + fees.resolver_fee + fees.lp_fee,
            fees.total_fees
        );

        // Individual fees should be proportional
        assert_eq!(fees.protocol_fee, 30_000_000); // 3%
        assert_eq!(fees.resolver_fee, 20_000_000); // 2%
        assert_eq!(fees.lp_fee, 50_000_000);       // 5%
    }

    #[test]
    fn test_small_amount_rounding() {
        // Test with small amount (99 lamports)
        let fees = calculate_fees_accurate(
            99,
            300, // 3%
            200, // 2%
            500, // 5%
        ).unwrap();

        // Total fees: 99 * 1000 / 10000 = 9 lamports (rounded down from 9.9)
        assert_eq!(fees.total_fees, 9);

        // Individual fees sum to total (no value leakage)
        assert_eq!(
            fees.protocol_fee + fees.resolver_fee + fees.lp_fee,
            fees.total_fees
        );
    }

    #[test]
    fn test_no_value_leakage() {
        // Test multiple small amounts to ensure no accumulated leakage
        let test_amounts = [1, 10, 99, 100, 999, 1000, 9999, 10000, 99999, 100000];

        for amount in test_amounts.iter() {
            let fees = calculate_fees_accurate(*amount, 300, 200, 500).unwrap();

            // The key invariant: sum of individual fees MUST equal total fees
            assert_eq!(
                fees.protocol_fee + fees.resolver_fee + fees.lp_fee,
                fees.total_fees,
                "Value leakage detected for amount: {}",
                amount
            );
        }
    }

    #[test]
    fn test_edge_case_zero_amount() {
        let fees = calculate_fees_accurate(0, 300, 200, 500).unwrap();
        assert_eq!(fees.total_fees, 0);
        assert_eq!(fees.protocol_fee, 0);
        assert_eq!(fees.resolver_fee, 0);
        assert_eq!(fees.lp_fee, 0);
    }

    #[test]
    fn test_edge_case_large_amount() {
        // Test with max reasonable amount (10,000 SOL)
        let large_amount = 10_000_000_000_000u64;
        let fees = calculate_fees_accurate(large_amount, 300, 200, 500).unwrap();

        // Should not overflow
        assert!(fees.total_fees > 0);
        assert_eq!(
            fees.protocol_fee + fees.resolver_fee + fees.lp_fee,
            fees.total_fees
        );
    }
}
