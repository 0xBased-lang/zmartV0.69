// ============================================================
// Market Lifecycle Orchestration Helpers
// ============================================================

use super::*;
use anchor_lang::prelude::*;

/// Market lifecycle stages for testing
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum MarketStage {
    Proposed,   // 0
    Approved,   // 1
    Active,     // 2
    Resolving,  // 3
    Disputed,   // 4
    Finalized,  // 5
}

impl MarketStage {
    pub fn as_u8(&self) -> u8 {
        match self {
            MarketStage::Proposed => 0,
            MarketStage::Approved => 1,
            MarketStage::Active => 2,
            MarketStage::Resolving => 3,
            MarketStage::Disputed => 4,
            MarketStage::Finalized => 5,
        }
    }
}

/// Market creation parameters
pub struct CreateMarketParams {
    pub question: String,
    pub category: String,
    pub image_url: String,
    pub resolve_date: i64,
    pub liquidity: u64,
    pub b_param: u64,
}

impl Default for CreateMarketParams {
    fn default() -> Self {
        Self {
            question: "Will BTC hit $100k by end of 2025?".to_string(),
            category: "crypto".to_string(),
            image_url: "https://example.com/btc.png".to_string(),
            resolve_date: current_timestamp() + 86400 * 30, // 30 days
            liquidity: sol_to_lamports(100),  // 100 SOL
            b_param: 500_000_000,  // 0.5 with 9 decimals
        }
    }
}

/// Trading parameters
pub struct TradeParams {
    pub outcome: bool,  // true = YES, false = NO
    pub amount: u64,    // lamports
    pub is_buy: bool,   // true = buy, false = sell
}

impl TradeParams {
    pub fn buy_yes(amount_sol: u64) -> Self {
        Self {
            outcome: true,
            amount: sol_to_lamports(amount_sol),
            is_buy: true,
        }
    }

    pub fn buy_no(amount_sol: u64) -> Self {
        Self {
            outcome: false,
            amount: sol_to_lamports(amount_sol),
            is_buy: true,
        }
    }

    pub fn sell_yes(shares: u64) -> Self {
        Self {
            outcome: true,
            amount: shares,
            is_buy: false,
        }
    }

    pub fn sell_no(shares: u64) -> Self {
        Self {
            outcome: false,
            amount: shares,
            is_buy: false,
        }
    }
}

/// Resolution parameters
pub struct ResolveParams {
    pub outcome: bool,         // true = YES wins, false = NO wins
    pub dispute_deadline: i64, // Unix timestamp for dispute window
}

impl ResolveParams {
    pub fn yes_wins() -> Self {
        Self {
            outcome: true,
            dispute_deadline: current_timestamp() + 86400 * 2, // 48 hours
        }
    }

    pub fn no_wins() -> Self {
        Self {
            outcome: false,
            dispute_deadline: current_timestamp() + 86400 * 2,
        }
    }
}

// ============================================================
// Market Lifecycle Orchestration
// ============================================================

/// Complete market lifecycle from creation to resolution
pub struct MarketLifecycle {
    pub market_id: u64,
    pub market_pdas: MarketPDAs,
    pub creator: Keypair,
    pub current_stage: MarketStage,
}

impl MarketLifecycle {
    /// Create new market (PROPOSED stage)
    pub async fn create(
        ctx: &mut TestContext,
        params: CreateMarketParams,
    ) -> Result<Self, Box<dyn std::error::Error>> {
        let creator = Keypair::new();
        airdrop(&mut ctx.banks_client, &creator.pubkey(), sol_to_lamports(200)).await?;

        // Market ID (use timestamp for uniqueness)
        let market_id = current_timestamp() as u64;
        let market_pdas = MarketPDAs::new(market_id, &ctx.core_program_id);

        // TODO: Call create_market instruction
        // For now, return structure (will implement instruction calls in Phase 2)

        Ok(Self {
            market_id,
            market_pdas,
            creator,
            current_stage: MarketStage::Proposed,
        })
    }

    /// Approve market (PROPOSED → APPROVED)
    pub async fn approve(
        &mut self,
        ctx: &mut TestContext,
    ) -> Result<(), Box<dyn std::error::Error>> {
        assert_eq!(self.current_stage, MarketStage::Proposed, "Market must be in PROPOSED stage");

        // TODO: Call approve_market instruction

        self.current_stage = MarketStage::Approved;
        Ok(())
    }

    /// Activate market (APPROVED → ACTIVE)
    pub async fn activate(
        &mut self,
        ctx: &mut TestContext,
    ) -> Result<(), Box<dyn std::error::Error>> {
        assert_eq!(self.current_stage, MarketStage::Approved, "Market must be in APPROVED stage");

        // TODO: Call activate_market instruction

        self.current_stage = MarketStage::Active;
        Ok(())
    }

    /// Execute trade on market (ACTIVE stage only)
    pub async fn trade(
        &mut self,
        ctx: &mut TestContext,
        trader: &Keypair,
        params: TradeParams,
    ) -> Result<u64, Box<dyn std::error::Error>> {
        assert_eq!(self.current_stage, MarketStage::Active, "Market must be in ACTIVE stage");

        // TODO: Call buy_shares or sell_shares instruction

        // Return shares bought/sold
        Ok(params.amount)
    }

    /// Propose resolution (ACTIVE → RESOLVING)
    pub async fn propose_resolution(
        &mut self,
        ctx: &mut TestContext,
        params: ResolveParams,
    ) -> Result<(), Box<dyn std::error::Error>> {
        assert_eq!(self.current_stage, MarketStage::Active, "Market must be in ACTIVE stage");

        // TODO: Call propose_resolution instruction

        self.current_stage = MarketStage::Resolving;
        Ok(())
    }

    /// Dispute resolution (RESOLVING → DISPUTED)
    pub async fn dispute(
        &mut self,
        ctx: &mut TestContext,
        disputer: &Keypair,
        reason: String,
    ) -> Result<(), Box<dyn std::error::Error>> {
        assert_eq!(self.current_stage, MarketStage::Resolving, "Market must be in RESOLVING stage");

        // TODO: Call dispute_resolution instruction

        self.current_stage = MarketStage::Disputed;
        Ok(())
    }

    /// Finalize market (RESOLVING/DISPUTED → FINALIZED)
    pub async fn finalize(
        &mut self,
        ctx: &mut TestContext,
    ) -> Result<(), Box<dyn std::error::Error>> {
        assert!(
            self.current_stage == MarketStage::Resolving || self.current_stage == MarketStage::Disputed,
            "Market must be in RESOLVING or DISPUTED stage"
        );

        // TODO: Call finalize_market instruction

        self.current_stage = MarketStage::Finalized;
        Ok(())
    }

    /// Claim winnings (FINALIZED stage only)
    pub async fn claim_winnings(
        &mut self,
        ctx: &mut TestContext,
        winner: &Keypair,
    ) -> Result<u64, Box<dyn std::error::Error>> {
        assert_eq!(self.current_stage, MarketStage::Finalized, "Market must be in FINALIZED stage");

        // TODO: Call claim_winnings instruction

        // Return payout amount
        Ok(0)
    }

    /// Withdraw liquidity (FINALIZED stage only)
    pub async fn withdraw_liquidity(
        &mut self,
        ctx: &mut TestContext,
    ) -> Result<u64, Box<dyn std::error::Error>> {
        assert_eq!(self.current_stage, MarketStage::Finalized, "Market must be in FINALIZED stage");

        // TODO: Call withdraw_liquidity instruction

        // Return withdrawn amount
        Ok(0)
    }
}

// ============================================================
// Helper Functions
// ============================================================

/// Get market account data
pub async fn get_market_account(
    ctx: &mut TestContext,
    market: &Pubkey,
) -> Result<Account, Box<dyn std::error::Error>> {
    ctx.get_account(market).await
}

/// Get user position account data
pub async fn get_position_account(
    ctx: &mut TestContext,
    position: &Pubkey,
) -> Result<Account, Box<dyn std::error::Error>> {
    ctx.get_account(position).await
}

/// Check if market is in expected stage
pub async fn assert_market_stage(
    ctx: &mut TestContext,
    market: &Pubkey,
    expected_stage: MarketStage,
) -> Result<(), Box<dyn std::error::Error>> {
    let account = get_market_account(ctx, market).await?;

    // TODO: Deserialize and check state field
    // For now, just verify account exists
    assert!(account.lamports > 0, "Market account should have lamports");

    Ok(())
}
