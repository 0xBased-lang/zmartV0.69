// ============================================================
// ProposalManager Vote Aggregator Service
// ============================================================
// Purpose: Aggregate proposal votes and call approve_market on-chain
// Pattern Prevention: #3 (Reactive Crisis) - Proactive error handling
// Story: 2.2 (Day 9)

import { Program } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { SupabaseClient } from "@supabase/supabase-js";
import logger from "../../utils/logger";
import { retryWithBackoff } from "../../utils/retry";

/**
 * Vote aggregation result for a single market
 */
export interface VoteAggregationResult {
  marketId: string;
  marketPda: string;
  likes: number;
  dislikes: number;
  totalVotes: number;
  approvalRate: number;
  meetsThreshold: boolean;
}

/**
 * ProposalVoteAggregator Service
 *
 * Responsibilities:
 * 1. Poll Supabase for markets in PROPOSED state
 * 2. Aggregate votes (likes/dislikes) from proposal_votes table
 * 3. Calculate approval rate (likes / total_votes)
 * 4. If >= 70%, call approve_market on-chain
 * 5. Update Supabase market state to APPROVED
 */
export class ProposalVoteAggregator {
  private isRunning: boolean = false;
  private approvalThreshold: number;

  constructor(
    private program: Program,
    private backendKeypair: any, // Keypair from @solana/web3.js
    private supabase: SupabaseClient,
    private globalConfigPda: PublicKey,
    approvalThreshold: number = 7000 // 70% in basis points
  ) {
    this.approvalThreshold = approvalThreshold;
  }

  /**
   * Start the aggregation service
   * Called by scheduler (cron job)
   */
  async run(): Promise<void> {
    if (this.isRunning) {
      logger.warn("[ProposalVoteAggregator] Already running, skipping...");
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      logger.info("[ProposalVoteAggregator] Starting vote aggregation...");

      // Get all markets in PROPOSED state
      const proposedMarkets = await this.getProposedMarkets();
      logger.info(`[ProposalVoteAggregator] Found ${proposedMarkets.length} proposed markets`);

      if (proposedMarkets.length === 0) {
        logger.info("[ProposalVoteAggregator] No markets to process");
        return;
      }

      // Process each market
      let processedCount = 0;
      let approvedCount = 0;
      let errorCount = 0;

      for (const market of proposedMarkets) {
        try {
          const result = await this.processMarket(market);
          processedCount++;

          if (result.approved) {
            approvedCount++;
            logger.info(
              `[ProposalVoteAggregator] Market ${market.id} approved! ` +
              `(${result.likes}/${result.totalVotes} = ${result.approvalRate.toFixed(2)}%)`
            );
          } else {
            logger.debug(
              `[ProposalVoteAggregator] Market ${market.id} below threshold ` +
              `(${result.likes}/${result.totalVotes} = ${result.approvalRate.toFixed(2)}%)`
            );
          }
        } catch (error) {
          errorCount++;
          logger.error(
            `[ProposalVoteAggregator] Error processing market ${market.id}:`,
            error
          );
        }
      }

      const duration = Date.now() - startTime;
      logger.info(
        `[ProposalVoteAggregator] Completed: ` +
        `${processedCount} processed, ${approvedCount} approved, ` +
        `${errorCount} errors in ${duration}ms`
      );
    } catch (error) {
      logger.error("[ProposalVoteAggregator] Fatal error:", error);
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Get all markets in PROPOSED state from Supabase
   */
  private async getProposedMarkets(): Promise<any[]> {
    const { data, error } = await this.supabase
      .from("markets")
      .select("id, on_chain_address, creator_wallet, question, description, created_at")
      .eq("state", "PROPOSED")
      .order("created_at", { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch proposed markets: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Process a single market:
   * 1. Aggregate votes
   * 2. Check threshold
   * 3. Call on-chain if threshold met
   * 4. Update Supabase
   */
  private async processMarket(market: any): Promise<{
    approved: boolean;
    likes: number;
    dislikes: number;
    totalVotes: number;
    approvalRate: number;
  }> {
    // 1. Aggregate votes from Supabase
    const aggregation = await this.aggregateVotes(market.id);

    // 2. Check if threshold met
    if (!aggregation.meetsThreshold) {
      return {
        approved: false,
        likes: aggregation.likes,
        dislikes: aggregation.dislikes,
        totalVotes: aggregation.totalVotes,
        approvalRate: aggregation.approvalRate,
      };
    }

    // 3. Call on-chain approve_market with retry
    await this.approveMarketOnChain(
      market.on_chain_address,
      aggregation.likes,
      aggregation.dislikes
    );

    // 4. Update Supabase state
    await this.updateMarketState(market.id, "APPROVED", aggregation);

    return {
      approved: true,
      likes: aggregation.likes,
      dislikes: aggregation.dislikes,
      totalVotes: aggregation.totalVotes,
      approvalRate: aggregation.approvalRate,
    };
  }

  /**
   * Aggregate votes for a market from proposal_votes table
   */
  async aggregateVotes(marketId: string): Promise<VoteAggregationResult> {
    const { data: votes, error } = await this.supabase
      .from("proposal_votes")
      .select("vote")
      .eq("market_id", marketId);

    if (error) {
      throw new Error(`Failed to fetch votes for market ${marketId}: ${error.message}`);
    }

    if (!votes || votes.length === 0) {
      return {
        marketId,
        marketPda: "", // Will be filled by caller if needed
        likes: 0,
        dislikes: 0,
        totalVotes: 0,
        approvalRate: 0,
        meetsThreshold: false,
      };
    }

    // Count likes (vote = true) and dislikes (vote = false)
    const likes = votes.filter((v) => v.vote === true).length;
    const dislikes = votes.filter((v) => v.vote === false).length;
    const totalVotes = likes + dislikes;

    // Calculate approval rate (percentage)
    const approvalRate = totalVotes > 0 ? (likes / totalVotes) * 100 : 0;

    // Check if threshold met (70% = 7000 bps)
    const approvalRateBps = Math.floor(approvalRate * 100);
    const meetsThreshold = approvalRateBps >= this.approvalThreshold;

    return {
      marketId,
      marketPda: "",
      likes,
      dislikes,
      totalVotes,
      approvalRate,
      meetsThreshold,
    };
  }

  /**
   * Call on-chain approve_market instruction with retry logic
   */
  private async approveMarketOnChain(
    marketAddress: string,
    finalLikes: number,
    finalDislikes: number
  ): Promise<string> {
    const marketPda = new PublicKey(marketAddress);

    // Retry with exponential backoff
    const signature = await retryWithBackoff(
      async () => {
        logger.debug(
          `[ProposalVoteAggregator] Calling approve_market: ${marketAddress} ` +
          `(likes: ${finalLikes}, dislikes: ${finalDislikes})`
        );

        const tx = await this.program.methods
          .approveMarket(finalLikes, finalDislikes)
          .accounts({
            globalConfig: this.globalConfigPda,
            market: marketPda,
            backendAuthority: this.backendKeypair.publicKey,
          })
          .signers([this.backendKeypair])
          .rpc();

        logger.debug(`[ProposalVoteAggregator] Transaction sent: ${tx}`);
        return tx;
      },
      {
        maxAttempts: 3,
        initialDelay: 1000,
        maxDelay: 10000,
        backoffFactor: 2,
      }
    );

    // Wait for confirmation
    await this.program.provider.connection.confirmTransaction(signature, "confirmed");
    logger.info(`[ProposalVoteAggregator] Transaction confirmed: ${signature}`);

    return signature;
  }

  /**
   * Update market state in Supabase after on-chain approval
   */
  private async updateMarketState(
    marketId: string,
    newState: string,
    aggregation: VoteAggregationResult
  ): Promise<void> {
    const { error } = await this.supabase
      .from("markets")
      .update({
        state: newState,
        proposal_likes: aggregation.likes,
        proposal_dislikes: aggregation.dislikes,
        proposal_total_votes: aggregation.totalVotes,
        updated_at: new Date().toISOString(),
      })
      .eq("id", marketId);

    if (error) {
      throw new Error(`Failed to update market ${marketId}: ${error.message}`);
    }

    logger.debug(`[ProposalVoteAggregator] Updated market ${marketId} state to ${newState}`);
  }

  /**
   * Get service status
   */
  getStatus(): { isRunning: boolean; approvalThreshold: number } {
    return {
      isRunning: this.isRunning,
      approvalThreshold: this.approvalThreshold,
    };
  }
}
