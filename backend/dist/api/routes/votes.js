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
    // CRITICAL: Ensure user record exists to prevent FK constraint violation
    // This auto-creates user if they don't exist (upsert pattern)
    await supabase
        .from("users")
        .upsert({
        wallet: user_wallet,
        display_name: `User ${user_wallet.substring(0, 8)}`,
        created_at: new Date().toISOString(),
    }, {
        onConflict: "wallet",
        ignoreDuplicates: false,
    });
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
        // voted_at has DEFAULT NOW() in schema, no need to set it
    })
        .select()
        .single();
    if (error) {
        throw new error_handler_1.ApiError(500, `Failed to submit vote: ${error.message}`);
    }
    // STANDARDIZED: Use wrapper object format for consistency
    res.status(201).json({
        data: [data], // Wrap single vote in array for consistency
        count: 1,
        metadata: {
            message: "Proposal vote submitted successfully",
            market_id,
            vote_type: 'proposal',
            user_wallet,
        },
    });
}));
/**
 * POST /api/votes/dispute
 * Submit dispute vote (authenticated)
 */
router.post("/dispute", auth_1.requireAuth, (0, validation_1.validate)(validation_1.schemas.disputeVote), (0, error_handler_1.asyncHandler)(async (req, res) => {
    const { market_id, vote } = req.body;
    const user_wallet = req.user.wallet;
    // CRITICAL: Ensure user record exists to prevent FK constraint violation
    // This auto-creates user if they don't exist (upsert pattern)
    await supabase
        .from("users")
        .upsert({
        wallet: user_wallet,
        display_name: `User ${user_wallet.substring(0, 8)}`,
        created_at: new Date().toISOString(),
    }, {
        onConflict: "wallet",
        ignoreDuplicates: false,
    });
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
        // voted_at has DEFAULT NOW() in schema, no need to set it
    })
        .select()
        .single();
    if (error) {
        throw new error_handler_1.ApiError(500, `Failed to submit dispute vote: ${error.message}`);
    }
    // STANDARDIZED: Use wrapper object format for consistency
    res.status(201).json({
        data: [data], // Wrap single vote in array for consistency
        count: 1,
        metadata: {
            message: "Dispute vote submitted successfully",
            market_id,
            vote_type: 'dispute',
            user_wallet,
        },
    });
}));
exports.default = router;
//# sourceMappingURL=votes.js.map