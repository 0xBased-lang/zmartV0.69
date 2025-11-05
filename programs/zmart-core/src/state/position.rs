use anchor_lang::prelude::*;

/// User's position in a specific market
///
/// This account tracks a user's share holdings, cost basis,
/// and claiming status for a single market.
///
/// PDA Seeds: ["position", market.key(), user.key()]
/// Size: 174 bytes (8 discriminator + 166 data)
#[account]
pub struct UserPosition {
    /// Market this position belongs to
    pub market: Pubkey,

    /// User's wallet address
    pub user: Pubkey,

    /// YES shares held (fixed-point, 9 decimals)
    pub shares_yes: u64,

    /// NO shares held (fixed-point, 9 decimals)
    pub shares_no: u64,

    /// Total amount invested (cost basis for tax tracking, in lamports)
    pub total_invested: u64,

    /// Number of trades executed
    pub trades_count: u32,

    /// Timestamp of last trade
    pub last_trade_at: i64,

    /// Flag indicating if winnings have been claimed
    pub has_claimed: bool,

    /// Amount claimed (in lamports)
    pub claimed_amount: u64,

    /// Reserved space for future features (64 bytes)
    pub reserved: [u8; 64],

    /// Bump seed for PDA derivation
    pub bump: u8,
}

impl UserPosition {
    /// Calculate exact account size
    ///
    /// Total: 182 bytes (8 discriminator + 174 data)
    pub const LEN: usize = 8        // discriminator
        + 32                        // market (Pubkey)
        + 32                        // user (Pubkey)
        + 8                         // shares_yes (u64)
        + 8                         // shares_no (u64)
        + 8                         // total_invested (u64)
        + 4                         // trades_count (u32)
        + 8                         // last_trade_at (i64)
        + 1                         // has_claimed (bool)
        + 8                         // claimed_amount (u64)
        + 64                        // reserved ([u8; 64])
        + 1;                        // bump (u8)

    /// Calculate potential winnings for a given outcome
    ///
    /// Returns the number of shares on the winning outcome (1:1 redemption)
    pub fn calculate_winnings(&self, winning_outcome: bool) -> u64 {
        if winning_outcome {
            // YES wins: return YES shares
            self.shares_yes
        } else {
            // NO wins: return NO shares
            self.shares_no
        }
    }

    /// Check if user has any shares in this market
    pub fn has_shares(&self) -> bool {
        self.shares_yes > 0 || self.shares_no > 0
    }

    /// Get total shares held (YES + NO)
    pub fn total_shares(&self) -> Result<u64> {
        self.shares_yes
            .checked_add(self.shares_no)
            .ok_or_else(|| error!(crate::error::ErrorCode::OverflowError))
    }

    /// Calculate average price paid per share
    ///
    /// Returns: average_price = total_invested / total_shares (in lamports per share, not fixed-point)
    pub fn average_price(&self) -> Result<u64> {
        let total = self.total_shares()?;
        if total == 0 {
            return Ok(0);
        }

        // Simple division: lamports invested / shares held
        // Note: shares are fixed-point (9 decimals), so result is in lamports per full share
        let avg = (self.total_invested as u128)
            .checked_div(total as u128)
            .ok_or(crate::error::ErrorCode::DivisionByZero)?;

        Ok(avg as u64)
    }

    /// Check if user has already claimed winnings
    pub fn already_claimed(&self) -> bool {
        self.has_claimed
    }

    /// Get net profit/loss (claimed_amount - total_invested)
    ///
    /// Returns: Some(profit) if claimed, None if not claimed yet
    pub fn net_profit(&self) -> Option<i128> {
        if !self.has_claimed {
            return None;
        }

        let profit = (self.claimed_amount as i128) - (self.total_invested as i128);
        Some(profit)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_user_position_size() {
        assert_eq!(UserPosition::LEN, 182);
    }

    #[test]
    fn test_calculate_winnings() {
        let position = create_test_position(1000, 500);

        // YES wins: return YES shares
        assert_eq!(position.calculate_winnings(true), 1000);

        // NO wins: return NO shares
        assert_eq!(position.calculate_winnings(false), 500);
    }

    #[test]
    fn test_has_shares() {
        let mut position = create_test_position(0, 0);
        assert!(!position.has_shares());

        position.shares_yes = 100;
        assert!(position.has_shares());

        position.shares_yes = 0;
        position.shares_no = 200;
        assert!(position.has_shares());
    }

    #[test]
    fn test_total_shares() {
        let position = create_test_position(1000, 500);
        assert_eq!(position.total_shares().unwrap(), 1500);

        let empty_position = create_test_position(0, 0);
        assert_eq!(empty_position.total_shares().unwrap(), 0);
    }

    #[test]
    fn test_average_price() {
        let mut position = create_test_position(1000, 1000);

        // Invested 1 SOL for 2000 shares (2000 * 10^9 in fixed-point)
        position.total_invested = 1_000_000_000; // 1 SOL

        // Average = 1 SOL / 2000 shares = 0.0005 SOL per share
        // In lamports: 1_000_000_000 / 2000 = 500_000 lamports
        let avg = position.average_price().unwrap();
        assert_eq!(avg, 500_000); // 500_000 lamports per share

        // Empty position should return 0
        let empty_position = create_test_position(0, 0);
        assert_eq!(empty_position.average_price().unwrap(), 0);
    }

    #[test]
    fn test_already_claimed() {
        let mut position = create_test_position(1000, 500);
        assert!(!position.already_claimed());

        position.has_claimed = true;
        assert!(position.already_claimed());
    }

    #[test]
    fn test_net_profit() {
        let mut position = create_test_position(1000, 500);
        position.total_invested = 1_000_000_000; // 1 SOL

        // Not claimed yet
        assert!(position.net_profit().is_none());

        // Claimed with profit
        position.has_claimed = true;
        position.claimed_amount = 1_500_000_000; // 1.5 SOL
        assert_eq!(position.net_profit().unwrap(), 500_000_000); // +0.5 SOL profit

        // Claimed with loss
        position.claimed_amount = 800_000_000; // 0.8 SOL
        assert_eq!(position.net_profit().unwrap(), -200_000_000); // -0.2 SOL loss

        // Break even
        position.claimed_amount = 1_000_000_000; // 1 SOL
        assert_eq!(position.net_profit().unwrap(), 0);
    }

    // Helper function to create test position
    fn create_test_position(shares_yes: u64, shares_no: u64) -> UserPosition {
        UserPosition {
            market: Pubkey::new_unique(),
            user: Pubkey::new_unique(),
            shares_yes,
            shares_no,
            total_invested: 0,
            trades_count: 0,
            last_trade_at: 0,
            has_claimed: false,
            claimed_amount: 0,
            reserved: [0; 64],
            bump: 255,
        }
    }
}
