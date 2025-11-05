// ============================================================
// Trade Routes
// ============================================================
// Purpose: Trading endpoints (buy, sell)
// Story: 2.4 (Day 12)

import { Router, Request, Response } from "express";
import { validate, schemas } from "../middleware/validation";
import { requireAuth } from "../middleware/auth";
import { asyncHandler, ApiError } from "../middleware/error-handler";
import { getSupabaseClient } from "../../config/database";

const router: any = Router();
const supabase = getSupabaseClient();

/**
 * POST /api/trades/buy
 * Submit a buy trade (authenticated)
 */
router.post(
  "/buy",
  requireAuth,
  validate(schemas.buyTrade),
  asyncHandler(async (req: Request, res: Response) => {
    const { market_id, outcome, shares, max_cost } = req.body;
    const user_wallet = req.user!.wallet;

    // Create trade record
    const { data, error } = await supabase
      .from("trades")
      .insert({
        market_id,
        user_wallet,
        trade_type: "buy",
        outcome,
        shares,
        cost: max_cost, // Will be updated by on-chain transaction
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      throw new ApiError(500, `Failed to create buy trade: ${error.message}`);
    }

    res.status(201).json({
      message: "Buy trade submitted successfully",
      trade: data,
    });
  })
);

/**
 * POST /api/trades/sell
 * Submit a sell trade (authenticated)
 */
router.post(
  "/sell",
  requireAuth,
  validate(schemas.sellTrade),
  asyncHandler(async (req: Request, res: Response) => {
    const { market_id, outcome, shares, min_proceeds } = req.body;
    const user_wallet = req.user!.wallet;

    // Create trade record
    const { data, error } = await supabase
      .from("trades")
      .insert({
        market_id,
        user_wallet,
        trade_type: "sell",
        outcome,
        shares,
        cost: min_proceeds, // Will be updated by on-chain transaction
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      throw new ApiError(500, `Failed to create sell trade: ${error.message}`);
    }

    res.status(201).json({
      message: "Sell trade submitted successfully",
      trade: data,
    });
  })
);

export default router;
