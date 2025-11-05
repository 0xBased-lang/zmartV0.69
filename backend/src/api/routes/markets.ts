// ============================================================
// Market Routes
// ============================================================
// Purpose: Market endpoints (list, get, create, trades, votes)
// Story: 2.4 (Day 12)

import { Router, Request, Response } from "express";
import { SupabaseClient } from "@supabase/supabase-js";
import { validate, schemas } from "../middleware/validation";
import { requireAuth, optionalAuth } from "../middleware/auth";
import { asyncHandler, ApiError } from "../middleware/error-handler";
import { getSupabaseClient } from "../../config/database";

const router: any = Router();
const supabase: SupabaseClient = getSupabaseClient();

/**
 * GET /api/markets
 * List all markets with optional filtering
 */
router.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const { state, category, limit = 20, offset = 0 } = req.query;

    let query = supabase
      .from("markets")
      .select("*")
      .order("created_at", { ascending: false })
      .range(
        parseInt(offset as string),
        parseInt(offset as string) + parseInt(limit as string) - 1
      );

    // Apply filters
    if (state) {
      query = query.eq("state", state);
    }

    if (category) {
      query = query.eq("category", category);
    }

    const { data, error } = await query;

    if (error) {
      throw new ApiError(500, `Failed to fetch markets: ${error.message}`);
    }

    res.json({
      markets: data || [],
      count: data?.length || 0,
      offset: parseInt(offset as string),
      limit: parseInt(limit as string),
    });
  })
);

/**
 * GET /api/markets/:id
 * Get market details by ID
 */
router.get(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const { data, error } = await supabase
      .from("markets")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        throw new ApiError(404, `Market not found: ${id}`);
      }
      throw new ApiError(500, `Failed to fetch market: ${error.message}`);
    }

    res.json(data);
  })
);

/**
 * POST /api/markets
 * Create a new market (authenticated)
 */
router.post(
  "/",
  requireAuth,
  validate(schemas.createMarket),
  asyncHandler(async (req: Request, res: Response) => {
    const { question, category, end_date, liquidity } = req.body;
    const creator_wallet = req.user!.wallet;

    // Create market in database
    const { data, error } = await supabase
      .from("markets")
      .insert({
        question,
        category,
        end_date,
        creator_wallet,
        state: "PROPOSED", // Initial state
        liquidity_parameter: liquidity,
        yes_shares: 0,
        no_shares: 0,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      throw new ApiError(500, `Failed to create market: ${error.message}`);
    }

    res.status(201).json({
      message: "Market created successfully",
      market: data,
    });
  })
);

/**
 * GET /api/markets/:id/trades
 * Get trades for a specific market
 */
router.get(
  "/:id/trades",
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const { data, error } = await supabase
      .from("trades")
      .select("*")
      .eq("market_id", id)
      .order("created_at", { ascending: false })
      .range(
        parseInt(offset as string),
        parseInt(offset as string) + parseInt(limit as string) - 1
      );

    if (error) {
      throw new ApiError(500, `Failed to fetch trades: ${error.message}`);
    }

    res.json({
      trades: data || [],
      count: data?.length || 0,
      market_id: id,
    });
  })
);

/**
 * GET /api/markets/:id/votes
 * Get proposal votes for a specific market
 */
router.get(
  "/:id/votes",
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { type = "proposal" } = req.query; // proposal or dispute

    const table = type === "dispute" ? "dispute_votes" : "proposal_votes";

    const { data, error } = await supabase
      .from(table)
      .select("*")
      .eq("market_id", id)
      .order("created_at", { ascending: false });

    if (error) {
      throw new ApiError(500, `Failed to fetch votes: ${error.message}`);
    }

    // Calculate vote counts
    const likes = data?.filter((v) => v.vote === true).length || 0;
    const dislikes = data?.filter((v) => v.vote === false).length || 0;
    const total = likes + dislikes;
    const approval_rate = total > 0 ? (likes / total) * 100 : 0;

    res.json({
      votes: data || [],
      stats: {
        likes,
        dislikes,
        total,
        approval_rate: approval_rate.toFixed(2),
      },
      market_id: id,
      type,
    });
  })
);

/**
 * GET /api/markets/:id/stats
 * Get market statistics (volume, participants, etc.)
 */
router.get(
  "/:id/stats",
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    // Get trade stats
    const { data: trades, error: tradesError } = await supabase
      .from("trades")
      .select("shares, cost, trade_type, user_wallet")
      .eq("market_id", id);

    if (tradesError) {
      throw new ApiError(500, `Failed to fetch trade stats: ${tradesError.message}`);
    }

    // Calculate stats
    const totalVolume = trades?.reduce((sum, t) => sum + parseInt(t.cost), 0) || 0;
    const totalTrades = trades?.length || 0;
    const uniqueTraders = new Set(trades?.map((t) => t.user_wallet)).size;
    const buyVolume =
      trades?.filter((t) => t.trade_type === "buy").reduce((sum, t) => sum + parseInt(t.cost), 0) ||
      0;
    const sellVolume =
      trades?.filter((t) => t.trade_type === "sell").reduce((sum, t) => sum + parseInt(t.cost), 0) ||
      0;

    res.json({
      market_id: id,
      stats: {
        total_volume: totalVolume,
        total_trades: totalTrades,
        unique_traders: uniqueTraders,
        buy_volume: buyVolume,
        sell_volume: sellVolume,
      },
    });
  })
);

export default router;
