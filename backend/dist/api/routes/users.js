"use strict";
// ============================================================
// User Routes
// ============================================================
// Purpose: User endpoints (profile, trades, votes)
// Story: 2.4 (Day 12)
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const error_handler_1 = require("../middleware/error-handler");
const database_1 = require("../../config/database");
const router = (0, express_1.Router)();
const supabase = (0, database_1.getSupabaseClient)();
/**
 * GET /api/users/:wallet
 * Get user profile
 */
router.get("/:wallet", (0, error_handler_1.asyncHandler)(async (req, res) => {
    const { wallet } = req.params;
    // Get user trades count
    const { data: trades } = await supabase
        .from("trades")
        .select("id", { count: "exact" })
        .eq("user_wallet", wallet);
    // Get user votes count
    const { data: proposalVotes } = await supabase
        .from("proposal_votes")
        .select("id", { count: "exact" })
        .eq("user_wallet", wallet);
    const { data: disputeVotes } = await supabase
        .from("dispute_votes")
        .select("id", { count: "exact" })
        .eq("user_wallet", wallet);
    // Get user discussions count
    const { data: discussions } = await supabase
        .from("discussions")
        .select("id", { count: "exact" })
        .eq("user_wallet", wallet)
        .is("deleted_at", null);
    res.json({
        wallet,
        stats: {
            total_trades: trades?.length || 0,
            total_votes: (proposalVotes?.length || 0) + (disputeVotes?.length || 0),
            proposal_votes: proposalVotes?.length || 0,
            dispute_votes: disputeVotes?.length || 0,
            discussions: discussions?.length || 0,
        },
    });
}));
/**
 * GET /api/users/:wallet/trades
 * Get user trades
 */
router.get("/:wallet/trades", (0, error_handler_1.asyncHandler)(async (req, res) => {
    const { wallet } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    const { data, error } = await supabase
        .from("trades")
        .select("*")
        .eq("user_wallet", wallet)
        .order("created_at", { ascending: false })
        .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);
    if (error) {
        throw new error_handler_1.ApiError(500, `Failed to fetch user trades: ${error.message}`);
    }
    res.json({
        trades: data || [],
        count: data?.length || 0,
        wallet,
    });
}));
/**
 * GET /api/users/:wallet/votes
 * Get user votes (proposal + dispute)
 */
router.get("/:wallet/votes", (0, error_handler_1.asyncHandler)(async (req, res) => {
    const { wallet } = req.params;
    const { type = "all" } = req.query; // all, proposal, or dispute
    let proposalVotes = [];
    let disputeVotes = [];
    if (type === "all" || type === "proposal") {
        const { data } = await supabase
            .from("proposal_votes")
            .select("*")
            .eq("user_wallet", wallet)
            .order("created_at", { ascending: false });
        proposalVotes = data || [];
    }
    if (type === "all" || type === "dispute") {
        const { data } = await supabase
            .from("dispute_votes")
            .select("*")
            .eq("user_wallet", wallet)
            .order("created_at", { ascending: false });
        disputeVotes = data || [];
    }
    res.json({
        proposal_votes: proposalVotes,
        dispute_votes: disputeVotes,
        total: proposalVotes.length + disputeVotes.length,
        wallet,
    });
}));
exports.default = router;
//# sourceMappingURL=users.js.map