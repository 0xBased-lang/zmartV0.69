// ============================================================
// Market Routes
// ============================================================
// Purpose: Market endpoints (list, get, create, trades, votes)
// Story: 2.4 (Day 12) - Updated Phase 2 Day 3 (on-chain integration)

import { Router, Request, Response } from "express";
import { SupabaseClient } from "@supabase/supabase-js";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { Program, BN } from "@coral-xyz/anchor";
import { readFileSync } from "fs";
import path from "path";
import crypto from "crypto";
import { validate, schemas } from "../middleware/validation";
import { requireAuth, optionalAuth } from "../middleware/auth";
import { asyncHandler, ApiError } from "../middleware/error-handler";
import { getSupabaseClient } from "../../config/database";
import { getProvider, getProgramIds } from "../../config/solana";
import logger from "../../utils/logger";

const router: any = Router();
const supabase: SupabaseClient = getSupabaseClient();

// Load Anchor program IDL
let program: Program | null = null;

function getProgram(): Program {
  if (!program) {
    try {
      const idlPath = path.join(__dirname, "../../../target/idl/zmart_core.json");
      const idl = JSON.parse(readFileSync(idlPath, "utf-8"));
      const provider = getProvider();
      program = new Program(idl, provider);
      logger.info("Anchor program loaded successfully", {
        programId: program.programId.toBase58(),
      });
    } catch (error: any) {
      logger.error("Failed to load Anchor program", { error: error.message });
      throw new ApiError(500, "Failed to load Anchor program");
    }
  }
  return program;
}

/**
 * GET /api/markets
 * List all markets with optional filtering
 */
router.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const { state, category, limit = 20, offset = 0 } = req.query;

    // PERFORMANCE: Select only necessary fields instead of *
    // This reduces data transfer and speeds up queries significantly
    const selectFields = [
      'id',
      'on_chain_address',
      'question',
      'description',
      'category',
      'state',
      'creator_wallet',
      'b_parameter',
      'initial_liquidity',
      'shares_yes',
      'shares_no',
      'created_at'
    ].join(',');

    let query = supabase
      .from("markets")
      .select(selectFields, { count: 'exact' }) // Get accurate count for pagination
      .order("created_at", { ascending: false })
      .range(
        parseInt(offset as string),
        parseInt(offset as string) + parseInt(limit as string) - 1
      );

    // Apply filters (order matters for index usage)
    if (state) {
      query = query.eq("state", state);
    }

    if (category) {
      query = query.eq("category", category);
    }

    const { data, error, count } = await query;

    if (error) {
      throw new ApiError(500, `Failed to fetch markets: ${error.message}`);
    }

    res.json({
      markets: data || [],
      count: count || 0, // Total count from database
      offset: parseInt(offset as string),
      limit: parseInt(limit as string),
    });
  })
);

/**
 * GET /api/markets/:id
 * Get market details by ID (on-chain address or database id)
 */
router.get(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    // Try to query by on_chain_address first (for Solana public keys),
    // fall back to database id for internal IDs
    let data, error;

    // Check if this looks like a Solana public key (44 characters, base58)
    if (id.length === 44 || id.length === 43) {
      const result = await supabase
        .from("markets")
        .select("*")
        .eq("on_chain_address", id)
        .maybeSingle();
      data = result.data;
      error = result.error;
    }

    // If not found by on_chain_address, try by database id
    if (!data && !error) {
      const result = await supabase
        .from("markets")
        .select("*")
        .eq("id", id)
        .single();
      data = result.data;
      error = result.error;
    }

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
 * Create a new market on-chain and in database (authenticated)
 */
router.post(
  "/",
  requireAuth,
  validate(schemas.createMarket),
  asyncHandler(async (req: Request, res: Response) => {
    const { question, category, end_date, liquidity } = req.body;
    const creator_wallet = req.user!.wallet;

    logger.info("Creating market", { question, category, liquidity, creator_wallet });

    try {
      // ============================================
      // 1. Load program and derive PDAs
      // ============================================
      const prog = getProgram();

      // Generate unique market ID
      const marketId = crypto.randomBytes(32);
      const marketIdHex = Buffer.from(marketId).toString("hex");

      logger.info("Market ID generated", { marketIdHex: marketIdHex.slice(0, 16) + "..." });

      // Derive Global Config PDA
      const [globalConfigPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("global-config")],
        prog.programId
      );

      // Derive Market PDA
      const [marketPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("market"), Buffer.from(marketId)],
        prog.programId
      );

      logger.info("PDAs derived", {
        globalConfig: globalConfigPda.toBase58(),
        market: marketPda.toBase58(),
      });

      // ============================================
      // 2. Prepare on-chain parameters
      // ============================================

      // Convert question to IPFS hash format ([u8; 46])
      // In production, this would be an actual IPFS hash
      const ipfsQuestionHashStr = `QmTest${question.slice(0, 40).padEnd(40, '0')}`;
      const ipfsQuestionHash = Array.from(
        Buffer.from(ipfsQuestionHashStr.padEnd(46, '0').slice(0, 46))
      );

      // LMSR parameters (9 decimals)
      const bParameter = new BN(liquidity);
      const initialLiquidity = new BN(liquidity);

      logger.info("On-chain parameters prepared", {
        ipfsHash: ipfsQuestionHashStr,
        bParameter: bParameter.toString(),
        initialLiquidity: initialLiquidity.toString(),
      });

      // ============================================
      // 3. Create market on-chain
      // ============================================
      const creatorPubkey = new PublicKey(creator_wallet);

      logger.info("Sending on-chain transaction...");

      const tx = await prog.methods
        .createMarket(
          Array.from(marketId),
          bParameter,
          initialLiquidity,
          ipfsQuestionHash
        )
        .accounts({
          creator: creatorPubkey,
          globalConfig: globalConfigPda,
          market: marketPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      logger.info("Market created on-chain", {
        tx,
        marketPda: marketPda.toBase58(),
      });

      // ============================================
      // 4. Store in database
      // ============================================
      const { data, error } = await supabase
        .from("markets")
        .insert({
          id: marketIdHex,
          on_chain_address: marketPda.toBase58(),
          question,
          category,
          creator_wallet,
          state: "PROPOSED", // Initial state
          b_parameter: liquidity.toString(),
          initial_liquidity: liquidity.toString(),
          shares_yes: "0",
          shares_no: "0",
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        logger.error("Failed to store market in database", { error: error.message });
        throw new ApiError(500, `Market created on-chain but database insert failed: ${error.message}`);
      }

      logger.info("Market stored in database", { marketId: data.id });

      // ============================================
      // 5. Return response
      // ============================================
      res.status(201).json({
        message: "Market created successfully on-chain",
        market: data,
        transaction: tx,
        explorer: `https://explorer.solana.com/tx/${tx}?cluster=devnet`,
      });
    } catch (error: any) {
      logger.error("Failed to create market", {
        error: error.message,
        logs: error.logs,
      });

      // Provide detailed error message
      if (error.logs) {
        throw new ApiError(500, `On-chain transaction failed: ${error.message}`, error.logs);
      }

      throw new ApiError(500, `Failed to create market: ${error.message}`);
    }
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
      .order("voted_at", { ascending: false });

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

/**
 * GET /api/markets/activity
 * Get recent platform activity (trades, resolutions, etc.)
 */
router.get(
  "/activity",
  asyncHandler(async (req: Request, res: Response) => {
    const { limit = 20, type } = req.query;

    try {
      const activities: Array<{
        id: string;
        type: "trade" | "resolution" | "creation";
        user: string;
        action: string;
        market: string;
        marketId: string;
        time: string;
        amount?: string;
      }> = [];

      // 1. Get recent trades
      if (!type || type === "trade") {
        const { data: trades, error: tradesError } = await supabase
          .from("trades")
          .select("id, user_wallet, trade_type, outcome, shares, cost, created_at, market_id")
          .order("created_at", { ascending: false })
          .limit(Math.floor(parseInt(limit as string) / 2));

        if (!tradesError && trades) {
          // Get market details for these trades
          const marketIds = [...new Set(trades.map((t) => t.market_id))];
          const { data: markets } = await supabase
            .from("markets")
            .select("id, question")
            .in("id", marketIds);

          const marketMap = new Map(markets?.map((m) => [m.id, m.question]) || []);

          for (const trade of trades) {
            activities.push({
              id: trade.id,
              type: "trade",
              user: `${trade.user_wallet.slice(0, 6)}...${trade.user_wallet.slice(-4)}`,
              action: `${trade.trade_type === "buy" ? "bought" : "sold"} ${Math.floor(parseFloat(trade.shares))} ${trade.outcome} shares`,
              market: marketMap.get(trade.market_id) || "Unknown Market",
              marketId: trade.market_id,
              time: trade.created_at,
              amount: `${(parseFloat(trade.cost) / 1e9).toFixed(2)} SOL`,
            });
          }
        }
      }

      // 2. Get recent market resolutions
      if (!type || type === "resolution") {
        const { data: resolvedMarkets, error: resolvedError } = await supabase
          .from("markets")
          .select("id, question, proposed_outcome, resolved_at, creator_wallet")
          .not("resolved_at", "is", null)
          .order("resolved_at", { ascending: false })
          .limit(Math.floor(parseInt(limit as string) / 4));

        if (!resolvedError && resolvedMarkets) {
          for (const market of resolvedMarkets) {
            activities.push({
              id: `resolution-${market.id}`,
              type: "resolution",
              user: market.creator_wallet
                ? `${market.creator_wallet.slice(0, 6)}...${market.creator_wallet.slice(-4)}`
                : "oracle",
              action: `resolved as ${market.proposed_outcome === true ? "YES" : market.proposed_outcome === false ? "NO" : "INVALID"}`,
              market: market.question,
              marketId: market.id,
              time: market.resolved_at,
            });
          }
        }
      }

      // 3. Get recent market creations
      if (!type || type === "creation") {
        const { data: newMarkets, error: newMarketsError } = await supabase
          .from("markets")
          .select("id, question, creator_wallet, created_at")
          .order("created_at", { ascending: false })
          .limit(Math.floor(parseInt(limit as string) / 4));

        if (!newMarketsError && newMarkets) {
          for (const market of newMarkets) {
            activities.push({
              id: `creation-${market.id}`,
              type: "creation",
              user: market.creator_wallet
                ? `${market.creator_wallet.slice(0, 6)}...${market.creator_wallet.slice(-4)}`
                : "unknown",
              action: "created market",
              market: market.question,
              marketId: market.id,
              time: market.created_at,
            });
          }
        }
      }

      // Sort all activities by time (most recent first)
      activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

      // Limit to requested amount
      const limitedActivities = activities.slice(0, parseInt(limit as string));

      res.json({
        activities: limitedActivities,
        count: limitedActivities.length,
      });
    } catch (error: any) {
      throw new ApiError(500, `Failed to fetch activity: ${error.message}`);
    }
  })
);

/**
 * GET /api/markets/:id/price-history
 * Get price history over time calculated from trades using LMSR
 */
router.get(
  "/:id/price-history",
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { limit = 100 } = req.query;

    // Helper function to calculate LMSR prices
    // P(YES) = e^(q_yes/b) / (e^(q_yes/b) + e^(q_no/b))
    function calculateLMSRPrices(qYes: number, qNo: number, b: number): { yes: number; no: number } {
      // Handle edge cases
      if (b <= 0) return { yes: 50, no: 50 };
      if (qYes === 0 && qNo === 0) return { yes: 50, no: 50 };

      // Calculate exponentials
      const expYes = Math.exp(qYes / b);
      const expNo = Math.exp(qNo / b);
      const sum = expYes + expNo;

      // Calculate prices as percentages
      const yesPrice = (expYes / sum) * 100;
      const noPrice = (expNo / sum) * 100;

      // Clamp to reasonable range (1% - 99%)
      return {
        yes: Math.max(1, Math.min(99, yesPrice)),
        no: Math.max(1, Math.min(99, noPrice)),
      };
    }

    try {
      // 1. Get market details for liquidity parameter
      const { data: market, error: marketError } = await supabase
        .from("markets")
        .select("id, b_parameter, initial_liquidity, shares_yes, shares_no, created_at")
        .eq("id", id)
        .single();

      if (marketError || !market) {
        throw new ApiError(404, `Market not found: ${id}`);
      }

      const liquidity = parseFloat(market.b_parameter || market.initial_liquidity);

      // 2. Get all trades for this market ordered by time
      const { data: trades, error: tradesError } = await supabase
        .from("trades")
        .select("created_at, trade_type, outcome, shares, cost")
        .eq("market_id", id)
        .order("created_at", { ascending: true })
        .limit(parseInt(limit as string));

      if (tradesError) {
        throw new ApiError(500, `Failed to fetch trades: ${tradesError.message}`);
      }

      // 3. Calculate price history from trades
      const priceHistory: Array<{ timestamp: string; yes: number; no: number }> = [];

      // Start with initial market state
      let qYes = 0;
      let qNo = 0;

      // Add initial price point (50/50)
      priceHistory.push({
        timestamp: market.created_at,
        yes: 50,
        no: 50,
      });

      // Process each trade and calculate new price
      for (const trade of trades || []) {
        const shares = parseFloat(trade.shares);

        // Update share quantities based on trade
        if (trade.trade_type === "buy") {
          if (trade.outcome === "YES") {
            qYes += shares;
          } else {
            qNo += shares;
          }
        } else if (trade.trade_type === "sell") {
          if (trade.outcome === "YES") {
            qYes -= shares;
          } else {
            qNo -= shares;
          }
        }

        // Calculate prices at this point
        const prices = calculateLMSRPrices(qYes, qNo, liquidity);

        priceHistory.push({
          timestamp: trade.created_at,
          yes: prices.yes,
          no: prices.no,
        });
      }

      // 4. Add current price point if we have current shares
      if (priceHistory.length === 1 && (parseFloat(market.shares_yes) > 0 || parseFloat(market.shares_no) > 0)) {
        const currentQYes = parseFloat(market.shares_yes);
        const currentQNo = parseFloat(market.shares_no);
        const currentPrices = calculateLMSRPrices(currentQYes, currentQNo, liquidity);

        priceHistory.push({
          timestamp: new Date().toISOString(),
          yes: currentPrices.yes,
          no: currentPrices.no,
        });
      }

      res.json({
        market_id: id,
        price_history: priceHistory,
        count: priceHistory.length,
      });
    } catch (error: any) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, `Failed to calculate price history: ${error.message}`);
    }
  })
);

/**
 * POST /api/markets/:id/resolve
 * Resolve a market with outcome (authenticated)
 */
router.post(
  "/:id/resolve",
  requireAuth,
  validate(schemas.resolveMarket),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { outcome, ipfs_evidence_hash } = req.body;
    const resolver_wallet = req.user!.wallet;

    logger.info("Resolving market", { marketId: id, outcome, resolver_wallet });

    try {
      // ============================================
      // 1. Fetch market from database
      // ============================================
      const { data: market, error: fetchError } = await supabase
        .from("markets")
        .select("*")
        .eq("id", id)
        .single();

      if (fetchError || !market) {
        throw new ApiError(404, `Market not found: ${id}`);
      }

      // Verify market is in ACTIVE state
      if (market.state !== "ACTIVE") {
        throw new ApiError(400, `Market must be ACTIVE to resolve. Current state: ${market.state}`);
      }

      // Verify user is creator or admin
      if (market.creator_wallet !== resolver_wallet) {
        // TODO: Check if user is admin
        throw new ApiError(403, "Only market creator can resolve market");
      }

      logger.info("Market validated for resolution", { state: market.state, creator: market.creator_wallet });

      // ============================================
      // 2. Load program and derive PDAs
      // ============================================
      const prog = getProgram();

      const marketPda = new PublicKey(market.on_chain_address);

      const [globalConfigPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("global-config")],
        prog.programId
      );

      logger.info("PDAs derived for resolution", {
        market: marketPda.toBase58(),
        globalConfig: globalConfigPda.toBase58(),
      });

      // ============================================
      // 3. Prepare resolution parameters
      // ============================================

      // Convert outcome to Anchor enum format
      let outcomeEnum;
      if (outcome === true) {
        outcomeEnum = { yes: {} };
      } else if (outcome === false) {
        outcomeEnum = { no: {} };
      } else {
        outcomeEnum = { invalid: {} };
      }

      // Convert IPFS hash to byte array
      const ipfsEvidenceHash = Array.from(
        Buffer.from(ipfs_evidence_hash.padEnd(46, '0').slice(0, 46))
      );

      logger.info("Resolution parameters prepared", {
        outcome: outcome === null ? "INVALID" : outcome ? "YES" : "NO",
        ipfsHash: ipfs_evidence_hash,
      });

      // ============================================
      // 4. Resolve market on-chain
      // ============================================
      const resolverPubkey = new PublicKey(resolver_wallet);

      logger.info("Sending on-chain resolution transaction...");

      const tx = await prog.methods
        .resolveMarket(outcomeEnum, ipfsEvidenceHash)
        .accounts({
          resolver: resolverPubkey,
          globalConfig: globalConfigPda,
          market: marketPda,
        })
        .rpc();

      logger.info("Market resolved on-chain", { tx });

      // ============================================
      // 5. Update database
      // ============================================
      const { data: updatedMarket, error: updateError } = await supabase
        .from("markets")
        .update({
          state: "RESOLVING",
          proposed_outcome: outcome === null ? null : outcome,
          resolved_at: new Date().toISOString(),
          ipfs_evidence_hash,
        })
        .eq("id", id)
        .select()
        .single();

      if (updateError) {
        logger.error("Failed to update market in database", { error: updateError.message });
        throw new ApiError(500, `Market resolved on-chain but database update failed: ${updateError.message}`);
      }

      logger.info("Market updated in database", { state: "RESOLVING" });

      // ============================================
      // 6. Return response
      // ============================================
      res.status(200).json({
        message: "Market resolved successfully on-chain",
        market: updatedMarket,
        transaction: tx,
        explorer: `https://explorer.solana.com/tx/${tx}?cluster=devnet`,
      });
    } catch (error: any) {
      logger.error("Failed to resolve market", {
        error: error.message,
        logs: error.logs,
      });

      // Provide detailed error message
      if (error.logs) {
        throw new ApiError(500, `On-chain transaction failed: ${error.message}`, error.logs);
      }

      if (error instanceof ApiError) {
        throw error;
      }

      throw new ApiError(500, `Failed to resolve market: ${error.message}`);
    }
  })
);

export default router;
