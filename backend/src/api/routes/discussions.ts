// ============================================================
// Discussion Routes
// ============================================================
// Purpose: Discussion endpoints (list, create, delete)
// Story: 2.4 (Day 12)

import { Router, Request, Response } from "express";
import { validate, schemas } from "../middleware/validation";
import { requireAuth, checkOwnership } from "../middleware/auth";
import { asyncHandler, ApiError } from "../middleware/error-handler";
import { getSupabaseClient } from "../../config/database";

const router: any = Router();
const supabase = getSupabaseClient();

/**
 * GET /api/discussions/:marketId
 * Get discussions for a market
 */
router.get(
  "/:marketId",
  asyncHandler(async (req: Request, res: Response) => {
    const { marketId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const { data, error } = await supabase
      .from("discussions")
      .select("*")
      .eq("market_id", marketId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .range(
        parseInt(offset as string),
        parseInt(offset as string) + parseInt(limit as string) - 1
      );

    if (error) {
      throw new ApiError(500, `Failed to fetch discussions: ${error.message}`);
    }

    res.json({
      discussions: data || [],
      count: data?.length || 0,
      market_id: marketId,
    });
  })
);

/**
 * POST /api/discussions
 * Create a discussion (authenticated)
 */
router.post(
  "/",
  requireAuth,
  validate(schemas.createDiscussion),
  asyncHandler(async (req: Request, res: Response) => {
    const { market_id, content } = req.body;
    const user_wallet = req.user!.wallet;

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
      throw new ApiError(500, `Failed to create discussion: ${error.message}`);
    }

    res.status(201).json({
      message: "Discussion created successfully",
      discussion: data,
    });
  })
);

/**
 * DELETE /api/discussions/:id
 * Delete discussion (author only)
 */
router.delete(
  "/:id",
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const user_wallet = req.user!.wallet;

    // Check ownership
    const { data: discussion } = await supabase
      .from("discussions")
      .select("user_wallet")
      .eq("id", id)
      .single();

    if (!discussion) {
      throw new ApiError(404, "Discussion not found");
    }

    if (discussion.user_wallet !== user_wallet) {
      throw new ApiError(403, "You can only delete your own discussions");
    }

    // Soft delete
    const { error } = await supabase
      .from("discussions")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      throw new ApiError(500, `Failed to delete discussion: ${error.message}`);
    }

    res.json({
      message: "Discussion deleted successfully",
    });
  })
);

export default router;
