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

    // CRITICAL: Ensure user record exists to prevent FK constraint violation
    // This auto-creates user if they don't exist (upsert pattern)
    await supabase
      .from("users")
      .upsert(
        {
          wallet: user_wallet,
          display_name: `User ${user_wallet.substring(0, 8)}`,
          created_at: new Date().toISOString(),
        },
        {
          onConflict: "wallet",
          ignoreDuplicates: false,
        }
      );

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
        // voted_at has DEFAULT NOW() in schema, no need to set it
      })
      .select()
      .single();

    if (error) {
      throw new ApiError(500, `Failed to submit vote: ${error.message}`);
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

    // CRITICAL: Ensure user record exists to prevent FK constraint violation
    // This auto-creates user if they don't exist (upsert pattern)
    await supabase
      .from("users")
      .upsert(
        {
          wallet: user_wallet,
          display_name: `User ${user_wallet.substring(0, 8)}`,
          created_at: new Date().toISOString(),
        },
        {
          onConflict: "wallet",
          ignoreDuplicates: false,
        }
      );

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
        // voted_at has DEFAULT NOW() in schema, no need to set it
      })
      .select()
      .single();

    if (error) {
      throw new ApiError(500, `Failed to submit dispute vote: ${error.message}`);
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
  })
);

export default router;
