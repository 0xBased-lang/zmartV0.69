// ============================================================
// Vote Routes
// ============================================================
// Purpose: Voting endpoints (proposal, dispute)
// Story: 2.4 (Day 12)

import { Router, Request, Response } from "express";
import { validate, schemas } from "../middleware/validation";
import { requireAuth } from "../middleware/auth";
import { asyncHandler, ApiError } from "../middleware/error-handler";
import { getSupabaseClient } from "../../config/database";

const router: any = Router();
const supabase = getSupabaseClient();

/**
 * POST /api/votes/proposal
 * Submit proposal vote (authenticated)
 */
router.post(
  "/proposal",
  requireAuth,
  validate(schemas.proposalVote),
  asyncHandler(async (req: Request, res: Response) => {
    const { market_id, vote } = req.body;
    const user_wallet = req.user!.wallet;

    // Check for duplicate vote
    const { data: existing } = await supabase
      .from("proposal_votes")
      .select("id")
      .eq("market_id", market_id)
      .eq("user_wallet", user_wallet)
      .single();

    if (existing) {
      throw new ApiError(400, "You have already voted on this proposal");
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
      throw new ApiError(500, `Failed to submit vote: ${error.message}`);
    }

    res.status(201).json({
      message: "Proposal vote submitted successfully",
      vote: data,
    });
  })
);

/**
 * POST /api/votes/dispute
 * Submit dispute vote (authenticated)
 */
router.post(
  "/dispute",
  requireAuth,
  validate(schemas.disputeVote),
  asyncHandler(async (req: Request, res: Response) => {
    const { market_id, vote } = req.body;
    const user_wallet = req.user!.wallet;

    // Check for duplicate vote
    const { data: existing } = await supabase
      .from("dispute_votes")
      .select("id")
      .eq("market_id", market_id)
      .eq("user_wallet", user_wallet)
      .single();

    if (existing) {
      throw new ApiError(400, "You have already voted on this dispute");
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
      throw new ApiError(500, `Failed to submit dispute vote: ${error.message}`);
    }

    res.status(201).json({
      message: "Dispute vote submitted successfully",
      vote: data,
    });
  })
);

export default router;
