"use strict";
// ============================================================
// Market Routes
// ============================================================
// Purpose: Market endpoints (list, get, create, trades, votes)
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
const crypto_1 = __importDefault(require("crypto"));
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
            logger_1.default.info("Anchor program loaded successfully", {
                programId: program.programId.toBase58(),
            });
        }
        catch (error) {
            logger_1.default.error("Failed to load Anchor program", { error: error.message });
            throw new error_handler_1.ApiError(500, "Failed to load Anchor program");
        }
    }
    return program;
}
/**
 * GET /api/markets
 * List all markets with optional filtering
 */
router.get("/", (0, error_handler_1.asyncHandler)(async (req, res) => {
    const { state, category, limit = 20, offset = 0 } = req.query;
    let query = supabase
        .from("markets")
        .select("*")
        .order("created_at", { ascending: false })
        .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);
    // Apply filters
    if (state) {
        query = query.eq("state", state);
    }
    if (category) {
        query = query.eq("category", category);
    }
    const { data, error } = await query;
    if (error) {
        throw new error_handler_1.ApiError(500, `Failed to fetch markets: ${error.message}`);
    }
    res.json({
        markets: data || [],
        count: data?.length || 0,
        offset: parseInt(offset),
        limit: parseInt(limit),
    });
}));
/**
 * GET /api/markets/:id
 * Get market details by ID
 */
router.get("/:id", (0, error_handler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const { data, error } = await supabase
        .from("markets")
        .select("*")
        .eq("id", id)
        .single();
    if (error) {
        if (error.code === "PGRST116") {
            throw new error_handler_1.ApiError(404, `Market not found: ${id}`);
        }
        throw new error_handler_1.ApiError(500, `Failed to fetch market: ${error.message}`);
    }
    res.json(data);
}));
/**
 * POST /api/markets
 * Create a new market on-chain and in database (authenticated)
 */
router.post("/", auth_1.requireAuth, (0, validation_1.validate)(validation_1.schemas.createMarket), (0, error_handler_1.asyncHandler)(async (req, res) => {
    const { question, category, end_date, liquidity } = req.body;
    const creator_wallet = req.user.wallet;
    logger_1.default.info("Creating market", { question, category, liquidity, creator_wallet });
    try {
        // ============================================
        // 1. Load program and derive PDAs
        // ============================================
        const prog = getProgram();
        // Generate unique market ID
        const marketId = crypto_1.default.randomBytes(32);
        const marketIdHex = Buffer.from(marketId).toString("hex");
        logger_1.default.info("Market ID generated", { marketIdHex: marketIdHex.slice(0, 16) + "..." });
        // Derive Global Config PDA
        const [globalConfigPda] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from("global-config")], prog.programId);
        // Derive Market PDA
        const [marketPda] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from("market"), Buffer.from(marketId)], prog.programId);
        logger_1.default.info("PDAs derived", {
            globalConfig: globalConfigPda.toBase58(),
            market: marketPda.toBase58(),
        });
        // ============================================
        // 2. Prepare on-chain parameters
        // ============================================
        // Convert question to IPFS hash format ([u8; 46])
        // In production, this would be an actual IPFS hash
        const ipfsQuestionHashStr = `QmTest${question.slice(0, 40).padEnd(40, '0')}`;
        const ipfsQuestionHash = Array.from(Buffer.from(ipfsQuestionHashStr.padEnd(46, '0').slice(0, 46)));
        // LMSR parameters (9 decimals)
        const bParameter = new anchor_1.BN(liquidity);
        const initialLiquidity = new anchor_1.BN(liquidity);
        logger_1.default.info("On-chain parameters prepared", {
            ipfsHash: ipfsQuestionHashStr,
            bParameter: bParameter.toString(),
            initialLiquidity: initialLiquidity.toString(),
        });
        // ============================================
        // 3. Create market on-chain
        // ============================================
        const creatorPubkey = new web3_js_1.PublicKey(creator_wallet);
        logger_1.default.info("Sending on-chain transaction...");
        const tx = await prog.methods
            .createMarket(Array.from(marketId), bParameter, initialLiquidity, ipfsQuestionHash)
            .accounts({
            creator: creatorPubkey,
            globalConfig: globalConfigPda,
            market: marketPda,
            systemProgram: web3_js_1.SystemProgram.programId,
        })
            .rpc();
        logger_1.default.info("Market created on-chain", {
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
            end_date,
            creator_wallet,
            state: "PROPOSED", // Initial state
            liquidity_parameter: liquidity.toString(),
            yes_shares: "0",
            no_shares: "0",
            created_at: new Date().toISOString(),
        })
            .select()
            .single();
        if (error) {
            logger_1.default.error("Failed to store market in database", { error: error.message });
            throw new error_handler_1.ApiError(500, `Market created on-chain but database insert failed: ${error.message}`);
        }
        logger_1.default.info("Market stored in database", { marketId: data.id });
        // ============================================
        // 5. Return response
        // ============================================
        res.status(201).json({
            message: "Market created successfully on-chain",
            market: data,
            transaction: tx,
            explorer: `https://explorer.solana.com/tx/${tx}?cluster=devnet`,
        });
    }
    catch (error) {
        logger_1.default.error("Failed to create market", {
            error: error.message,
            logs: error.logs,
        });
        // Provide detailed error message
        if (error.logs) {
            throw new error_handler_1.ApiError(500, `On-chain transaction failed: ${error.message}`, error.logs);
        }
        throw new error_handler_1.ApiError(500, `Failed to create market: ${error.message}`);
    }
}));
/**
 * GET /api/markets/:id/trades
 * Get trades for a specific market
 */
router.get("/:id/trades", (0, error_handler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    const { data, error } = await supabase
        .from("trades")
        .select("*")
        .eq("market_id", id)
        .order("created_at", { ascending: false })
        .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);
    if (error) {
        throw new error_handler_1.ApiError(500, `Failed to fetch trades: ${error.message}`);
    }
    res.json({
        trades: data || [],
        count: data?.length || 0,
        market_id: id,
    });
}));
/**
 * GET /api/markets/:id/votes
 * Get proposal votes for a specific market
 */
router.get("/:id/votes", (0, error_handler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const { type = "proposal" } = req.query; // proposal or dispute
    const table = type === "dispute" ? "dispute_votes" : "proposal_votes";
    const { data, error } = await supabase
        .from(table)
        .select("*")
        .eq("market_id", id)
        .order("voted_at", { ascending: false });
    if (error) {
        throw new error_handler_1.ApiError(500, `Failed to fetch votes: ${error.message}`);
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
}));
/**
 * GET /api/markets/:id/stats
 * Get market statistics (volume, participants, etc.)
 */
router.get("/:id/stats", (0, error_handler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    // Get trade stats
    const { data: trades, error: tradesError } = await supabase
        .from("trades")
        .select("shares, cost, trade_type, user_wallet")
        .eq("market_id", id);
    if (tradesError) {
        throw new error_handler_1.ApiError(500, `Failed to fetch trade stats: ${tradesError.message}`);
    }
    // Calculate stats
    const totalVolume = trades?.reduce((sum, t) => sum + parseInt(t.cost), 0) || 0;
    const totalTrades = trades?.length || 0;
    const uniqueTraders = new Set(trades?.map((t) => t.user_wallet)).size;
    const buyVolume = trades?.filter((t) => t.trade_type === "buy").reduce((sum, t) => sum + parseInt(t.cost), 0) ||
        0;
    const sellVolume = trades?.filter((t) => t.trade_type === "sell").reduce((sum, t) => sum + parseInt(t.cost), 0) ||
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
}));
/**
 * POST /api/markets/:id/resolve
 * Resolve a market with outcome (authenticated)
 */
router.post("/:id/resolve", auth_1.requireAuth, (0, validation_1.validate)(validation_1.schemas.resolveMarket), (0, error_handler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const { outcome, ipfs_evidence_hash } = req.body;
    const resolver_wallet = req.user.wallet;
    logger_1.default.info("Resolving market", { marketId: id, outcome, resolver_wallet });
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
            throw new error_handler_1.ApiError(404, `Market not found: ${id}`);
        }
        // Verify market is in ACTIVE state
        if (market.state !== "ACTIVE") {
            throw new error_handler_1.ApiError(400, `Market must be ACTIVE to resolve. Current state: ${market.state}`);
        }
        // Verify user is creator or admin
        if (market.creator_wallet !== resolver_wallet) {
            // TODO: Check if user is admin
            throw new error_handler_1.ApiError(403, "Only market creator can resolve market");
        }
        logger_1.default.info("Market validated for resolution", { state: market.state, creator: market.creator_wallet });
        // ============================================
        // 2. Load program and derive PDAs
        // ============================================
        const prog = getProgram();
        const marketPda = new web3_js_1.PublicKey(market.on_chain_address);
        const [globalConfigPda] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from("global-config")], prog.programId);
        logger_1.default.info("PDAs derived for resolution", {
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
        }
        else if (outcome === false) {
            outcomeEnum = { no: {} };
        }
        else {
            outcomeEnum = { invalid: {} };
        }
        // Convert IPFS hash to byte array
        const ipfsEvidenceHash = Array.from(Buffer.from(ipfs_evidence_hash.padEnd(46, '0').slice(0, 46)));
        logger_1.default.info("Resolution parameters prepared", {
            outcome: outcome === null ? "INVALID" : outcome ? "YES" : "NO",
            ipfsHash: ipfs_evidence_hash,
        });
        // ============================================
        // 4. Resolve market on-chain
        // ============================================
        const resolverPubkey = new web3_js_1.PublicKey(resolver_wallet);
        logger_1.default.info("Sending on-chain resolution transaction...");
        const tx = await prog.methods
            .resolveMarket(outcomeEnum, ipfsEvidenceHash)
            .accounts({
            resolver: resolverPubkey,
            globalConfig: globalConfigPda,
            market: marketPda,
        })
            .rpc();
        logger_1.default.info("Market resolved on-chain", { tx });
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
            logger_1.default.error("Failed to update market in database", { error: updateError.message });
            throw new error_handler_1.ApiError(500, `Market resolved on-chain but database update failed: ${updateError.message}`);
        }
        logger_1.default.info("Market updated in database", { state: "RESOLVING" });
        // ============================================
        // 6. Return response
        // ============================================
        res.status(200).json({
            message: "Market resolved successfully on-chain",
            market: updatedMarket,
            transaction: tx,
            explorer: `https://explorer.solana.com/tx/${tx}?cluster=devnet`,
        });
    }
    catch (error) {
        logger_1.default.error("Failed to resolve market", {
            error: error.message,
            logs: error.logs,
        });
        // Provide detailed error message
        if (error.logs) {
            throw new error_handler_1.ApiError(500, `On-chain transaction failed: ${error.message}`, error.logs);
        }
        if (error instanceof error_handler_1.ApiError) {
            throw error;
        }
        throw new error_handler_1.ApiError(500, `Failed to resolve market: ${error.message}`);
    }
}));
exports.default = router;
//# sourceMappingURL=markets.js.map