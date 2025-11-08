"use strict";
// ============================================================
// Trade Routes
// ============================================================
// Purpose: Trading endpoints (buy, sell)
// Story: 2.4 (Day 12) - Updated Phase 2 Day 3 (on-chain integration)
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const web3_js_1 = require("@solana/web3.js");
const anchor_1 = require("@coral-xyz/anchor");
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const validation_1 = require("../middleware/validation");
const auth_1 = require("../middleware/auth");
const error_handler_1 = require("../middleware/error-handler");
const database_1 = require("../../config/database");
const solana_1 = require("../../config/solana");
const logger_1 = __importDefault(require("../../utils/logger"));
const router = (0, express_1.Router)();
const supabase = (0, database_1.getSupabaseClient)();
// Load Anchor program IDL
let program = null;
function getProgram() {
    if (!program) {
        try {
            const idlPath = path_1.default.join(__dirname, "../../../target/idl/zmart_core.json");
            const idl = JSON.parse((0, fs_1.readFileSync)(idlPath, "utf-8"));
            const provider = (0, solana_1.getProvider)();
            program = new anchor_1.Program(idl, provider);
            logger_1.default.info("Anchor program loaded successfully for trades", {
                programId: program.programId.toBase58(),
            });
        }
        catch (error) {
            logger_1.default.error("Failed to load Anchor program for trades", { error: error.message });
            throw new error_handler_1.ApiError(500, "Failed to load Anchor program");
        }
    }
    return program;
}
/**
 * POST /api/trades/buy
 * Submit a buy trade on-chain (authenticated)
 */
router.post("/buy", auth_1.requireAuth, (0, validation_1.validate)(validation_1.schemas.buyTrade), (0, error_handler_1.asyncHandler)(async (req, res) => {
    const { market_id, outcome, shares, max_cost } = req.body;
    const user_wallet = req.user.wallet;
    logger_1.default.info("Processing buy trade", { market_id, outcome, shares, max_cost, user_wallet });
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
            throw new error_handler_1.ApiError(404, `Market not found: ${market_id}`);
        }
        // Verify market is ACTIVE
        if (market.state !== "ACTIVE") {
            throw new error_handler_1.ApiError(400, `Market must be ACTIVE to trade. Current state: ${market.state}`);
        }
        logger_1.default.info("Market validated for trading", { state: market.state });
        // ============================================
        // 2. Load program and derive PDAs
        // ============================================
        const prog = getProgram();
        const marketPda = new web3_js_1.PublicKey(market.on_chain_address);
        const buyerPubkey = new web3_js_1.PublicKey(user_wallet);
        const [globalConfigPda] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from("global-config")], prog.programId);
        const [userPositionPda] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from("user-position"), marketPda.toBuffer(), buyerPubkey.toBuffer()], prog.programId);
        // Get protocol fee wallet from global config (for now, use a placeholder)
        // In production, fetch this from the global config account
        const protocolFeeWallet = new web3_js_1.PublicKey("11111111111111111111111111111111");
        logger_1.default.info("PDAs derived for buy trade", {
            market: marketPda.toBase58(),
            userPosition: userPositionPda.toBase58(),
            globalConfig: globalConfigPda.toBase58(),
        });
        // ============================================
        // 3. Execute buy trade on-chain
        // ============================================
        const sharesBN = new anchor_1.BN(shares);
        const maxCostBN = new anchor_1.BN(max_cost);
        logger_1.default.info("Sending buy trade transaction...", {
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
            systemProgram: web3_js_1.SystemProgram.programId,
        })
            .rpc();
        logger_1.default.info("Buy trade executed on-chain", { tx });
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
            logger_1.default.error("Failed to store trade in database", { error: insertError.message });
            throw new error_handler_1.ApiError(500, `Trade executed on-chain but database insert failed: ${insertError.message}`);
        }
        logger_1.default.info("Trade stored in database", { tradeId: trade.id });
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
    }
    catch (error) {
        logger_1.default.error("Failed to execute buy trade", {
            error: error.message,
            logs: error.logs,
        });
        if (error.logs) {
            throw new error_handler_1.ApiError(500, `On-chain transaction failed: ${error.message}`, error.logs);
        }
        if (error instanceof error_handler_1.ApiError) {
            throw error;
        }
        throw new error_handler_1.ApiError(500, `Failed to execute buy trade: ${error.message}`);
    }
}));
/**
 * POST /api/trades/sell
 * Submit a sell trade on-chain (authenticated)
 */
router.post("/sell", auth_1.requireAuth, (0, validation_1.validate)(validation_1.schemas.sellTrade), (0, error_handler_1.asyncHandler)(async (req, res) => {
    const { market_id, outcome, shares, min_proceeds } = req.body;
    const user_wallet = req.user.wallet;
    logger_1.default.info("Processing sell trade", { market_id, outcome, shares, min_proceeds, user_wallet });
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
            throw new error_handler_1.ApiError(404, `Market not found: ${market_id}`);
        }
        // Verify market is ACTIVE
        if (market.state !== "ACTIVE") {
            throw new error_handler_1.ApiError(400, `Market must be ACTIVE to trade. Current state: ${market.state}`);
        }
        logger_1.default.info("Market validated for trading", { state: market.state });
        // ============================================
        // 2. Load program and derive PDAs
        // ============================================
        const prog = getProgram();
        const marketPda = new web3_js_1.PublicKey(market.on_chain_address);
        const sellerPubkey = new web3_js_1.PublicKey(user_wallet);
        const [globalConfigPda] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from("global-config")], prog.programId);
        const [userPositionPda] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from("user-position"), marketPda.toBuffer(), sellerPubkey.toBuffer()], prog.programId);
        logger_1.default.info("PDAs derived for sell trade", {
            market: marketPda.toBase58(),
            userPosition: userPositionPda.toBase58(),
            globalConfig: globalConfigPda.toBase58(),
        });
        // ============================================
        // 3. Execute sell trade on-chain
        // ============================================
        const sharesBN = new anchor_1.BN(shares);
        const minProceedsBN = new anchor_1.BN(min_proceeds);
        logger_1.default.info("Sending sell trade transaction...", {
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
            systemProgram: web3_js_1.SystemProgram.programId,
        })
            .rpc();
        logger_1.default.info("Sell trade executed on-chain", { tx });
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
            logger_1.default.error("Failed to store trade in database", { error: insertError.message });
            throw new error_handler_1.ApiError(500, `Trade executed on-chain but database insert failed: ${insertError.message}`);
        }
        logger_1.default.info("Trade stored in database", { tradeId: trade.id });
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
    }
    catch (error) {
        logger_1.default.error("Failed to execute sell trade", {
            error: error.message,
            logs: error.logs,
        });
        if (error.logs) {
            throw new error_handler_1.ApiError(500, `On-chain transaction failed: ${error.message}`, error.logs);
        }
        if (error instanceof error_handler_1.ApiError) {
            throw error;
        }
        throw new error_handler_1.ApiError(500, `Failed to execute sell trade: ${error.message}`);
    }
}));
exports.default = router;
//# sourceMappingURL=trades.js.map