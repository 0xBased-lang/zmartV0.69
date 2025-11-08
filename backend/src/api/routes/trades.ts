// ============================================================
// Trade Routes
// ============================================================
// Purpose: Trading endpoints (buy, sell)
// Story: 2.4 (Day 12) - Updated Phase 2 Day 3 (on-chain integration)

import { Router, Request, Response } from "express";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { Program, BN } from "@coral-xyz/anchor";
import { readFileSync } from "fs";
import path from "path";
import { validate, schemas } from "../middleware/validation";
import { requireAuth } from "../middleware/auth";
import { asyncHandler, ApiError } from "../middleware/error-handler";
import { getSupabaseClient } from "../../config/database";
import { getProvider, getProgramIds } from "../../config/solana";
import logger from "../../utils/logger";

const router: any = Router();
const supabase = getSupabaseClient();

// Load Anchor program IDL
let program: Program | null = null;

function getProgram(): Program {
  if (!program) {
    try {
      const idlPath = path.join(__dirname, "../../../target/idl/zmart_core.json");
      const idl = JSON.parse(readFileSync(idlPath, "utf-8"));
      const provider = getProvider();
      program = new Program(idl, provider);
      logger.info("Anchor program loaded successfully for trades", {
        programId: program.programId.toBase58(),
      });
    } catch (error: any) {
      logger.error("Failed to load Anchor program for trades", { error: error.message });
      throw new ApiError(500, "Failed to load Anchor program");
    }
  }
  return program;
}

/**
 * POST /api/trades/buy
 * Submit a buy trade on-chain (authenticated)
 */
router.post(
  "/buy",
  requireAuth,
  validate(schemas.buyTrade),
  asyncHandler(async (req: Request, res: Response) => {
    const { market_id, outcome, shares, max_cost } = req.body;
    const user_wallet = req.user!.wallet;

    logger.info("Processing buy trade", { market_id, outcome, shares, max_cost, user_wallet });

    try {
      // ============================================
      // 1. Fetch market from database
      // ============================================
      const { data: market, error: fetchError } = await supabase
        .from("markets")
        .select("*")
        .eq("id", market_id)
        .single();

      if (fetchError || !market) {
        throw new ApiError(404, `Market not found: ${market_id}`);
      }

      // Verify market is ACTIVE
      if (market.state !== "ACTIVE") {
        throw new ApiError(400, `Market must be ACTIVE to trade. Current state: ${market.state}`);
      }

      logger.info("Market validated for trading", { state: market.state });

      // ============================================
      // 2. Load program and derive PDAs
      // ============================================
      const prog = getProgram();

      const marketPda = new PublicKey(market.on_chain_address);
      const buyerPubkey = new PublicKey(user_wallet);

      const [globalConfigPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("global-config")],
        prog.programId
      );

      const [userPositionPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("user-position"), marketPda.toBuffer(), buyerPubkey.toBuffer()],
        prog.programId
      );

      // Get protocol fee wallet from global config (for now, use a placeholder)
      // In production, fetch this from the global config account
      const protocolFeeWallet = new PublicKey("11111111111111111111111111111111");

      logger.info("PDAs derived for buy trade", {
        market: marketPda.toBase58(),
        userPosition: userPositionPda.toBase58(),
        globalConfig: globalConfigPda.toBase58(),
      });

      // ============================================
      // 3. Execute buy trade on-chain
      // ============================================
      const sharesBN = new BN(shares);
      const maxCostBN = new BN(max_cost);

      logger.info("Sending buy trade transaction...", {
        outcome: outcome ? "YES" : "NO",
        shares: sharesBN.toString(),
        maxCost: maxCostBN.toString(),
      });

      const tx = await prog.methods
        .buyShares(outcome, sharesBN, maxCostBN)
        .accounts({
          buyer: buyerPubkey,
          globalConfig: globalConfigPda,
          market: marketPda,
          userPosition: userPositionPda,
          protocolFeeWallet,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      logger.info("Buy trade executed on-chain", { tx });

      // ============================================
      // 4. Store trade in database
      // ============================================
      const { data: trade, error: insertError } = await supabase
        .from("trades")
        .insert({
          market_id,
          user_wallet,
          trade_type: "buy",
          outcome,
          shares: shares.toString(),
          cost: max_cost.toString(), // Actual cost from on-chain event
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertError) {
        logger.error("Failed to store trade in database", { error: insertError.message });
        throw new ApiError(500, `Trade executed on-chain but database insert failed: ${insertError.message}`);
      }

      logger.info("Trade stored in database", { tradeId: trade.id });

      // ============================================
      // 5. Update market shares in database
      // ============================================
      const currentYesShares = parseInt(market.yes_shares);
      const currentNoShares = parseInt(market.no_shares);

      const updatedYesShares = outcome ? currentYesShares + shares : currentYesShares;
      const updatedNoShares = !outcome ? currentNoShares + shares : currentNoShares;

      await supabase
        .from("markets")
        .update({
          yes_shares: updatedYesShares.toString(),
          no_shares: updatedNoShares.toString(),
        })
        .eq("id", market_id);

      // ============================================
      // 6. Return response
      // ============================================
      res.status(201).json({
        message: "Buy trade executed successfully on-chain",
        trade,
        transaction: tx,
        explorer: `https://explorer.solana.com/tx/${tx}?cluster=devnet`,
      });
    } catch (error: any) {
      logger.error("Failed to execute buy trade", {
        error: error.message,
        logs: error.logs,
      });

      if (error.logs) {
        throw new ApiError(500, `On-chain transaction failed: ${error.message}`, error.logs);
      }

      if (error instanceof ApiError) {
        throw error;
      }

      throw new ApiError(500, `Failed to execute buy trade: ${error.message}`);
    }
  })
);

/**
 * POST /api/trades/sell
 * Submit a sell trade on-chain (authenticated)
 */
router.post(
  "/sell",
  requireAuth,
  validate(schemas.sellTrade),
  asyncHandler(async (req: Request, res: Response) => {
    const { market_id, outcome, shares, min_proceeds } = req.body;
    const user_wallet = req.user!.wallet;

    logger.info("Processing sell trade", { market_id, outcome, shares, min_proceeds, user_wallet });

    try {
      // ============================================
      // 1. Fetch market from database
      // ============================================
      const { data: market, error: fetchError } = await supabase
        .from("markets")
        .select("*")
        .eq("id", market_id)
        .single();

      if (fetchError || !market) {
        throw new ApiError(404, `Market not found: ${market_id}`);
      }

      // Verify market is ACTIVE
      if (market.state !== "ACTIVE") {
        throw new ApiError(400, `Market must be ACTIVE to trade. Current state: ${market.state}`);
      }

      logger.info("Market validated for trading", { state: market.state });

      // ============================================
      // 2. Load program and derive PDAs
      // ============================================
      const prog = getProgram();

      const marketPda = new PublicKey(market.on_chain_address);
      const sellerPubkey = new PublicKey(user_wallet);

      const [globalConfigPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("global-config")],
        prog.programId
      );

      const [userPositionPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("user-position"), marketPda.toBuffer(), sellerPubkey.toBuffer()],
        prog.programId
      );

      logger.info("PDAs derived for sell trade", {
        market: marketPda.toBase58(),
        userPosition: userPositionPda.toBase58(),
        globalConfig: globalConfigPda.toBase58(),
      });

      // ============================================
      // 3. Execute sell trade on-chain
      // ============================================
      const sharesBN = new BN(shares);
      const minProceedsBN = new BN(min_proceeds);

      logger.info("Sending sell trade transaction...", {
        outcome: outcome ? "YES" : "NO",
        shares: sharesBN.toString(),
        minProceeds: minProceedsBN.toString(),
      });

      const tx = await prog.methods
        .sellShares(outcome, sharesBN, minProceedsBN)
        .accounts({
          seller: sellerPubkey,
          globalConfig: globalConfigPda,
          market: marketPda,
          userPosition: userPositionPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      logger.info("Sell trade executed on-chain", { tx });

      // ============================================
      // 4. Store trade in database
      // ============================================
      const { data: trade, error: insertError } = await supabase
        .from("trades")
        .insert({
          market_id,
          user_wallet,
          trade_type: "sell",
          outcome,
          shares: shares.toString(),
          cost: min_proceeds.toString(), // Actual proceeds from on-chain event
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertError) {
        logger.error("Failed to store trade in database", { error: insertError.message });
        throw new ApiError(500, `Trade executed on-chain but database insert failed: ${insertError.message}`);
      }

      logger.info("Trade stored in database", { tradeId: trade.id });

      // ============================================
      // 5. Update market shares in database
      // ============================================
      const currentYesShares = parseInt(market.yes_shares);
      const currentNoShares = parseInt(market.no_shares);

      const updatedYesShares = outcome ? currentYesShares - shares : currentYesShares;
      const updatedNoShares = !outcome ? currentNoShares - shares : currentNoShares;

      await supabase
        .from("markets")
        .update({
          yes_shares: updatedYesShares.toString(),
          no_shares: updatedNoShares.toString(),
        })
        .eq("id", market_id);

      // ============================================
      // 6. Return response
      // ============================================
      res.status(201).json({
        message: "Sell trade executed successfully on-chain",
        trade,
        transaction: tx,
        explorer: `https://explorer.solana.com/tx/${tx}?cluster=devnet`,
      });
    } catch (error: any) {
      logger.error("Failed to execute sell trade", {
        error: error.message,
        logs: error.logs,
      });

      if (error.logs) {
        throw new ApiError(500, `On-chain transaction failed: ${error.message}`, error.logs);
      }

      if (error instanceof ApiError) {
        throw error;
      }

      throw new ApiError(500, `Failed to execute sell trade: ${error.message}`);
    }
  })
);

export default router;
