use anchor_lang::prelude::*;

/// Error codes for the zmart-core program (6000-6999 range)
#[error_code]
pub enum ErrorCode {
    // ============================================================
    // Configuration Errors (6000-6099)
    // ============================================================

    /// 6000: Invalid fee configuration (total fees exceed 100%)
    #[msg("Invalid fee configuration: total fees exceed 100%")]
    InvalidFeeConfiguration,

    /// 6001: Invalid threshold (must be ≤ 10000 = 100%)
    #[msg("Invalid threshold: must be ≤ 10000 (100%)")]
    InvalidThreshold,

    /// 6002: Invalid time limit (must be positive)
    #[msg("Invalid time limit: must be positive")]
    InvalidTimeLimit,

    // ============================================================
    // State Transition Errors (6100-6199)
    // ============================================================

    /// 6100: Invalid state transition attempted
    #[msg("Invalid state transition")]
    InvalidStateTransition,

    /// 6101: Market not in required state for this operation
    #[msg("Market not in required state")]
    InvalidMarketState,

    /// 6102: Market is paused (emergency pause active)
    #[msg("Market is paused")]
    MarketPaused,

    /// 6103: Market is cancelled
    #[msg("Market is cancelled")]
    MarketCancelled,

    // ============================================================
    // Trading Errors (6200-6299)
    // ============================================================

    /// 6200: Trading amount is zero
    #[msg("Trading amount must be greater than zero")]
    ZeroAmount,

    /// 6201: Insufficient shares for sell operation
    #[msg("Insufficient shares to sell")]
    InsufficientShares,

    /// 6202: Slippage tolerance exceeded
    #[msg("Slippage tolerance exceeded")]
    SlippageExceeded,

    /// 6203: Insufficient liquidity in market
    #[msg("Insufficient liquidity")]
    InsufficientLiquidity,

    // ============================================================
    // Resolution Errors (6300-6399)
    // ============================================================

    /// 6300: Resolution period has not ended yet
    #[msg("Resolution period not ended")]
    ResolutionPeriodNotEnded,

    /// 6301: Dispute period has ended
    #[msg("Dispute period ended")]
    DisputePeriodEnded,

    /// 6302: No resolution proposed yet
    #[msg("No resolution proposed")]
    NoResolutionProposed,

    /// 6303: Already claimed winnings
    #[msg("Winnings already claimed")]
    AlreadyClaimed,

    /// 6304: No winnings to claim (user has no shares on winning outcome)
    #[msg("No winnings to claim")]
    NoWinnings,

    // ============================================================
    // Authorization Errors (6400-6499)
    // ============================================================

    /// 6400: Unauthorized (caller is not admin/creator/resolver)
    #[msg("Unauthorized")]
    Unauthorized,

    /// 6401: Invalid admin
    #[msg("Invalid admin")]
    InvalidAdmin,

    /// 6402: Invalid resolver
    #[msg("Invalid resolver")]
    InvalidResolver,

    /// 6403: Insufficient reputation for resolver role
    #[msg("Insufficient reputation")]
    InsufficientReputation,

    // ============================================================
    // Math Errors (6500-6599)
    // ============================================================

    /// 6500: Arithmetic overflow
    #[msg("Arithmetic overflow")]
    OverflowError,

    /// 6501: Arithmetic underflow
    #[msg("Arithmetic underflow")]
    UnderflowError,

    /// 6502: Division by zero
    #[msg("Division by zero")]
    DivisionByZero,

    /// 6503: Invalid fixed-point value
    #[msg("Invalid fixed-point value")]
    InvalidFixedPoint,

    /// 6504: Logarithm of zero or negative number
    #[msg("Logarithm of non-positive number")]
    InvalidLogarithm,

    /// 6505: Exponential overflow (result too large)
    #[msg("Exponential overflow")]
    ExponentialOverflow,

    // ============================================================
    // Validation Errors (6600-6699)
    // ============================================================

    /// 6600: Invalid LMSR b parameter (too small or too large)
    #[msg("Invalid b parameter")]
    InvalidBParameter,

    /// 6601: Invalid market ID
    #[msg("Invalid market ID")]
    InvalidMarketId,

    /// 6602: Invalid timestamp
    #[msg("Invalid timestamp")]
    InvalidTimestamp,

    /// 6603: Invalid IPFS hash
    #[msg("Invalid IPFS hash")]
    InvalidIpfsHash,
}
