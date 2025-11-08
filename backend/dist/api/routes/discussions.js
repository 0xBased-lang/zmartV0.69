"use strict";
// ============================================================
// Discussion Routes
// ============================================================
// Purpose: Discussion endpoints (list, create, delete)
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
 * GET /api/discussions/:marketId
 * Get discussions for a market
 */
router.get("/:marketId", (0, error_handler_1.asyncHandler)(async (req, res) => {
    const { marketId } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    const { data, error } = await supabase
        .from("discussions")
        .select("*")
        .eq("market_id", marketId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);
    if (error) {
        throw new error_handler_1.ApiError(500, `Failed to fetch discussions: ${error.message}`);
    }
    res.json({
        discussions: data || [],
        count: data?.length || 0,
        market_id: marketId,
    });
}));
/**
 * POST /api/discussions
 * Create a discussion (authenticated)
 */
router.post("/", auth_1.requireAuth, (0, validation_1.validate)(validation_1.schemas.createDiscussion), (0, error_handler_1.asyncHandler)(async (req, res) => {
    const { market_id, content } = req.body;
    const user_wallet = req.user.wallet;
    const { data, error } = await supabase
        .from("discussions")
        .insert({
        market_id,
        user_wallet,
        content,
        created_at: new Date().toISOString(),
    })
        .select()
        .single();
    if (error) {
        throw new error_handler_1.ApiError(500, `Failed to create discussion: ${error.message}`);
    }
    res.status(201).json({
        message: "Discussion created successfully",
        discussion: data,
    });
}));
/**
 * DELETE /api/discussions/:id
 * Delete discussion (author only)
 */
router.delete("/:id", auth_1.requireAuth, (0, error_handler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const user_wallet = req.user.wallet;
    // Check ownership
    const { data: discussion } = await supabase
        .from("discussions")
        .select("user_wallet")
        .eq("id", id)
        .single();
    if (!discussion) {
        throw new error_handler_1.ApiError(404, "Discussion not found");
    }
    if (discussion.user_wallet !== user_wallet) {
        throw new error_handler_1.ApiError(403, "You can only delete your own discussions");
    }
    // Soft delete
    const { error } = await supabase
        .from("discussions")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);
    if (error) {
        throw new error_handler_1.ApiError(500, `Failed to delete discussion: ${error.message}`);
    }
    res.json({
        message: "Discussion deleted successfully",
    });
}));
exports.default = router;
//# sourceMappingURL=discussions.js.map