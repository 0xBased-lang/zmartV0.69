// Fixed-point mathematics module for ZMART

pub mod fixed_point;
pub mod lmsr;
pub mod bounded_loss;

pub use fixed_point::*;
pub use lmsr::*;
pub use bounded_loss::*;

/// Fixed-point precision: 9 decimals (matches SOL lamports)
///
/// This means 1.0 is represented as 1_000_000_000
/// and 0.5 is represented as 500_000_000
pub const PRECISION: u64 = 1_000_000_000;

/// Natural logarithm of 2 (ln(2) ≈ 0.693147180)
/// Fixed-point representation with 9 decimals
pub const LN_2: u64 = 693_147_180;

/// Maximum safe exponent for exp() to prevent overflow
/// e^20 ≈ 485,165,195 which is safely within u64 range
pub const MAX_EXP: u64 = 20 * PRECISION;

/// Minimum b parameter (prevents extreme price sensitivity)
/// Equivalent to 100 SOL
pub const MIN_B: u64 = 100 * PRECISION;

/// Maximum b parameter (prevents numerical instability)
/// Equivalent to 1,000,000 SOL
pub const MAX_B: u64 = 1_000_000 * PRECISION;

// Type aliases for clarity
pub type FixedPoint = u64;  // All fixed-point values
pub type Lamports = u64;    // SOL amounts in lamports
pub type Shares = u64;      // Share quantities (9 decimals)

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_precision() {
        assert_eq!(PRECISION, 1_000_000_000);
    }

    #[test]
    fn test_ln_2_approximation() {
        // ln(2) ≈ 0.693147180
        // With 9 decimals: 693_147_180
        assert_eq!(LN_2, 693_147_180);
    }

    #[test]
    fn test_max_exp() {
        // e^20 ≈ 485,165,195
        // MAX_EXP = 20 * PRECISION = 20_000_000_000
        assert_eq!(MAX_EXP, 20_000_000_000);
    }
}
