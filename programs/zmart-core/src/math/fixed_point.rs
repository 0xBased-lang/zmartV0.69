use anchor_lang::prelude::*;
use crate::error::ErrorCode;
use super::PRECISION;

/// Fixed-point multiplication
///
/// Calculates: (a * b) / PRECISION
///
/// Uses u128 for intermediate calculation to prevent overflow.
/// Example: 1.5 * 2.0 = 3.0
///   1_500_000_000 * 2_000_000_000 / 1_000_000_000 = 3_000_000_000
pub fn fixed_mul(a: u64, b: u64) -> Result<u64> {
    let product = (a as u128)
        .checked_mul(b as u128)
        .ok_or(ErrorCode::OverflowError)?;

    // Scale down by PRECISION
    let result = product
        .checked_div(PRECISION as u128)
        .ok_or(ErrorCode::DivisionByZero)?;

    // Check if result fits in u64
    require!(
        result <= u64::MAX as u128,
        ErrorCode::OverflowError
    );

    Ok(result as u64)
}

/// Fixed-point division
///
/// Calculates: (a * PRECISION) / b
///
/// Uses u128 for intermediate calculation to prevent overflow.
/// Example: 3.0 / 2.0 = 1.5
///   3_000_000_000 * 1_000_000_000 / 2_000_000_000 = 1_500_000_000
pub fn fixed_div(a: u64, b: u64) -> Result<u64> {
    require!(b > 0, ErrorCode::DivisionByZero);

    let numerator = (a as u128)
        .checked_mul(PRECISION as u128)
        .ok_or(ErrorCode::OverflowError)?;

    let result = numerator
        .checked_div(b as u128)
        .ok_or(ErrorCode::DivisionByZero)?;

    // Check if result fits in u64
    require!(
        result <= u64::MAX as u128,
        ErrorCode::OverflowError
    );

    Ok(result as u64)
}

/// Convert floating-point to fixed-point (for testing only)
///
/// WARNING: Only use in tests! Floats are not available in BPF programs.
#[cfg(test)]
pub fn from_f64(value: f64) -> u64 {
    (value * PRECISION as f64) as u64
}

/// Convert fixed-point to floating-point (for testing/display only)
///
/// WARNING: Only use in tests! Floats are not available in BPF programs.
#[cfg(test)]
pub fn to_f64(value: u64) -> f64 {
    value as f64 / PRECISION as f64
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_fixed_mul_basic() {
        // 1.5 * 2.0 = 3.0
        let a = from_f64(1.5);
        let b = from_f64(2.0);
        let result = fixed_mul(a, b).unwrap();
        assert_eq!(result, from_f64(3.0));
        assert_eq!(to_f64(result), 3.0);
    }

    #[test]
    fn test_fixed_mul_precise() {
        // Test exact values
        let a: u64 = 1_500_000_000; // 1.5
        let b: u64 = 2_000_000_000; // 2.0
        let result = fixed_mul(a, b).unwrap();
        assert_eq!(result, 3_000_000_000); // 3.0
    }

    #[test]
    fn test_fixed_mul_fractional() {
        // 0.5 * 0.5 = 0.25
        let a = from_f64(0.5);
        let b = from_f64(0.5);
        let result = fixed_mul(a, b).unwrap();
        assert_eq!(result, from_f64(0.25));
    }

    #[test]
    fn test_fixed_mul_zero() {
        // 0 * anything = 0
        let a = 0;
        let b = from_f64(5.0);
        let result = fixed_mul(a, b).unwrap();
        assert_eq!(result, 0);

        // anything * 0 = 0
        let a = from_f64(5.0);
        let b = 0;
        let result = fixed_mul(a, b).unwrap();
        assert_eq!(result, 0);
    }

    #[test]
    fn test_fixed_mul_one() {
        // 1.0 * x = x
        let x = from_f64(5.5);
        let one = PRECISION;
        let result = fixed_mul(one, x).unwrap();
        assert_eq!(result, x);

        // x * 1.0 = x
        let result = fixed_mul(x, one).unwrap();
        assert_eq!(result, x);
    }

    #[test]
    fn test_fixed_div_basic() {
        // 5.0 / 2.0 = 2.5
        let a = from_f64(5.0);
        let b = from_f64(2.0);
        let result = fixed_div(a, b).unwrap();
        assert_eq!(result, from_f64(2.5));
        assert_eq!(to_f64(result), 2.5);
    }

    #[test]
    fn test_fixed_div_precise() {
        // Test exact values
        let a: u64 = 5_000_000_000; // 5.0
        let b: u64 = 2_000_000_000; // 2.0
        let result = fixed_div(a, b).unwrap();
        assert_eq!(result, 2_500_000_000); // 2.5
    }

    #[test]
    fn test_fixed_div_fractional() {
        // 1.0 / 4.0 = 0.25
        let a = from_f64(1.0);
        let b = from_f64(4.0);
        let result = fixed_div(a, b).unwrap();
        assert_eq!(result, from_f64(0.25));
    }

    #[test]
    fn test_fixed_div_one() {
        // x / 1.0 = x
        let x = from_f64(7.5);
        let one = PRECISION;
        let result = fixed_div(x, one).unwrap();
        assert_eq!(result, x);
    }

    #[test]
    fn test_fixed_div_zero_numerator() {
        // 0 / x = 0
        let zero = 0;
        let b = from_f64(5.0);
        let result = fixed_div(zero, b).unwrap();
        assert_eq!(result, 0);
    }

    #[test]
    #[should_panic(expected = "DivisionByZero")]
    fn test_fixed_div_zero_denominator() {
        // x / 0 should panic
        let a = from_f64(5.0);
        let zero = 0;
        fixed_div(a, zero).unwrap();
    }

    #[test]
    fn test_conversions() {
        // Test from_f64 and to_f64 roundtrip
        let values = [0.0, 0.5, 1.0, 1.5, 2.0, 10.5, 100.0];
        for &value in &values {
            let fixed = from_f64(value);
            let converted_back = to_f64(fixed);
            assert!((converted_back - value).abs() < 0.0000001);
        }
    }

    #[test]
    fn test_mul_div_inverse() {
        // (a * b) / b should equal a
        let a = from_f64(3.5);
        let b = from_f64(7.2);

        let product = fixed_mul(a, b).unwrap();
        let result = fixed_div(product, b).unwrap();

        // Allow small rounding error
        let diff = if result > a { result - a } else { a - result };
        assert!(diff < 10); // Less than 0.00000001 (1e-8)
    }

    #[test]
    fn test_associativity() {
        // (a * b) * c should approximately equal a * (b * c)
        let a = from_f64(2.0);
        let b = from_f64(3.0);
        let c = from_f64(4.0);

        let left = fixed_mul(fixed_mul(a, b).unwrap(), c).unwrap();
        let right = fixed_mul(a, fixed_mul(b, c).unwrap()).unwrap();

        // Allow small rounding error
        let diff = if left > right { left - right } else { right - left };
        assert!(diff < 100); // Less than 0.0000001 (1e-7)
    }

    #[test]
    fn test_large_values() {
        // Test with large but valid values
        let large = from_f64(1_000_000.0); // 1 million
        let small = from_f64(0.5);

        let result = fixed_mul(large, small).unwrap();
        assert_eq!(result, from_f64(500_000.0));

        let result = fixed_div(large, from_f64(2.0)).unwrap();
        assert_eq!(result, from_f64(500_000.0));
    }

    #[test]
    fn test_precision_limits() {
        // Test values near precision limits
        let very_small = 1u64; // 0.000000001 (1 nanoshare)
        let one = PRECISION;

        // Should be able to multiply very small values
        let result = fixed_mul(very_small, one).unwrap();
        assert_eq!(result, very_small);

        // Should be able to divide by very small values
        let result = fixed_div(one, PRECISION / 1000).unwrap();
        assert_eq!(result, 1000 * PRECISION); // 1000.0
    }
}
