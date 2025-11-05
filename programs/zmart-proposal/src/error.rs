use anchor_lang::prelude::*;

/// Error codes for the zmart-proposal program (7000-7999 range)
#[error_code]
pub enum ErrorCode {
    // ============================================================
    // Voting Errors (7000-7099)
    // ============================================================

    /// 7000: User has already voted
    #[msg("Already voted")]
    AlreadyVoted,

    /// 7001: Voting period has ended
    #[msg("Voting period ended")]
    VotingPeriodEnded,

    /// 7002: Market not in voting state
    #[msg("Market not in voting state")]
    NotInVotingState,

    /// 7003: Invalid vote type
    #[msg("Invalid vote type")]
    InvalidVoteType,

    // ============================================================
    // Authorization Errors (7100-7199)
    // ============================================================

    /// 7100: Unauthorized (caller is not backend authority)
    #[msg("Unauthorized")]
    Unauthorized,

    /// 7101: Invalid backend authority
    #[msg("Invalid backend authority")]
    InvalidBackendAuthority,

    // ============================================================
    // Validation Errors (7200-7299)
    // ============================================================

    /// 7200: Invalid market reference
    #[msg("Invalid market reference")]
    InvalidMarketReference,

    /// 7201: Invalid user reference
    #[msg("Invalid user reference")]
    InvalidUserReference,
}
