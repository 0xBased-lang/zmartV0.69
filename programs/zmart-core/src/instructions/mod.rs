// Lifecycle Instructions (Day 3)
pub mod initialize_global_config;
pub mod create_market;
pub mod approve_proposal;
pub mod activate_market;

// Trading Instructions (Day 4)
pub mod buy_shares;
pub mod sell_shares;

// Re-export instruction handlers
pub use initialize_global_config::*;
pub use create_market::*;
pub use approve_proposal::*;
pub use activate_market::*;
pub use buy_shares::*;
pub use sell_shares::*;
