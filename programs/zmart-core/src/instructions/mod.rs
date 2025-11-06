// Lifecycle Instructions (Day 3)
pub mod initialize_global_config;
pub mod create_market;
pub mod approve_proposal;
pub mod activate_market;

// Trading Instructions (Day 4)
pub mod buy_shares;
pub mod sell_shares;

// Resolution Instructions (Day 5)
pub mod resolve_market;
pub mod initiate_dispute;
pub mod finalize_market;

// Claim Instructions (Day 6)
pub mod claim_winnings;
pub mod withdraw_liquidity;

// Voting Instructions (Phase 1, Week 1)
pub mod submit_proposal_vote;
pub mod aggregate_proposal_votes;
pub mod submit_dispute_vote;
pub mod aggregate_dispute_votes;

// Re-export instruction handlers
pub use initialize_global_config::*;
pub use create_market::*;
pub use approve_proposal::*;
pub use activate_market::*;
pub use buy_shares::*;
pub use sell_shares::*;
pub use resolve_market::*;
pub use initiate_dispute::*;
pub use finalize_market::*;
pub use claim_winnings::*;
pub use withdraw_liquidity::*;
pub use submit_proposal_vote::*;
pub use aggregate_proposal_votes::*;
pub use submit_dispute_vote::*;
pub use aggregate_dispute_votes::*;
