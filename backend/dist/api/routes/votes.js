"use strict";
// ============================================================
// Vote Routes
// ============================================================
// Purpose: Voting endpoints (proposal, dispute)
// Story: 2.4 (Day 12)
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const validation_1 = require("../middleware/validation");
const auth_1 = require("../middleware/auth");
const error_handler_1 = require("../middleware/error-handler");
const database_1 = require("../../config/database");
const router = (0, express_1.Router)();
const supabase = (0, database_1.getSupabaseClient)();
/**
 * POST /api/votes/proposal
 * Submit proposal vote (authenticated)
 */
router.post("/proposal", auth_1.requireAuth, (0, validation_1.validate)(validation_1.schemas.proposalVote), (0, error_handler_1.asyncHandler)(async (req, res) => {
    const { market_id, vote } = req.body;
    const user_wallet = req.user.wallet;
    // Check for duplicate vote
    const { data: existing } = await supabase
        .from("proposal_votes")
        .select("id")
        .eq("market_id", market_id)
        .eq("user_wallet", user_wallet)
        .single();
    if (existing) {
        throw new error_handler_1.ApiError(400, "You have already voted on this proposal");
    }
    // Create vote
    const { data, error } = await supabase
        .from("proposal_votes")
        .insert({
        market_id,
        user_wallet,
        vote,
        created_at: new Date().toISOString(),
    })
        .select()
        .single();
    if (error) {
        throw new error_handler_1.ApiError(500, `Failed to submit vote: ${error.message}`);
    }
    res.status(201).json({
        message: "Proposal vote submitted successfully",
        vote: data,
    });
}));
/**
 * POST /api/votes/dispute
 * Submit dispute vote (authenticated)
 */
router.post("/dispute", auth_1.requireAuth, (0, validation_1.validate)(validation_1.schemas.disputeVote), (0, error_handler_1.asyncHandler)(async (req, res) => {
    const { market_id, vote } = req.body;
    const user_wallet = req.user.wallet;
    // Check for duplicate vote
    const { data: existing } = await supabase
        .from("dispute_votes")
        .select("id")
        .eq("market_id", market_id)
        .eq("user_wallet", user_wallet)
        .single();
    if (existing) {
        throw new error_handler_1.ApiError(400, "You have already voted on this dispute");
    }
    // Create vote
    const { data, error } = await supabase
        .from("dispute_votes")
        .insert({
        market_id,
        user_wallet,
        vote,
        created_at: new Date().toISOString(),
    })
        .select()
        .single();
    if (error) {
        throw new error_handler_1.ApiError(500, `Failed to submit dispute vote: ${error.message}`);
    }
    res.status(201).json({
        message: "Dispute vote submitted successfully",
        vote: data,
    });
}));
exports.default = router;
//# sourceMappingURL=votes.js.map