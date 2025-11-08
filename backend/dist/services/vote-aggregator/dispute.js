"use strict";
// ============================================================
// Dispute Vote Aggregator Service
// ============================================================
// Purpose: Aggregate dispute votes and call finalize_market on-chain
// Pattern Prevention: #3 (Reactive Crisis) - Proactive error handling
// Story: 2.2 (Day 9)
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DisputeVoteAggregator = void 0;
const web3_js_1 = require("@solana/web3.js");
const logger_1 = __importDefault(require("../../utils/logger"));
const retry_1 = require("../../utils/retry");
/**
 * DisputeVoteAggregator Service
 *
 * Responsibilities:
 * 1. Poll Supabase for markets in DISPUTED state
 * 2. Aggregate votes (agree/disagree) from dispute_votes table
 * 3. Calculate agree rate (agree / total_votes)
 * 4. If >= 60%, dispute succeeded → overturn original resolution
 * 5. Call finalize_market on-chain with dispute vote counts
 * 6. Update Supabase market state to FINALIZED
 */
class DisputeVoteAggregator {
    program;
    backendKeypair;
    supabase;
    globalConfigPda;
    isRunning = false;
    disputeThreshold;
    constructor(program, backendKeypair, // Keypair from @solana/web3.js
    supabase, globalConfigPda, disputeThreshold = 6000 // 60% in basis points
    ) {
        this.program = program;
        this.backendKeypair = backendKeypair;
        this.supabase = supabase;
        this.globalConfigPda = globalConfigPda;
        this.disputeThreshold = disputeThreshold;
    }
    /**
     * Start the aggregation service
     * Called by scheduler (cron job)
     */
    async run() {
        if (this.isRunning) {
            logger_1.default.warn("[DisputeVoteAggregator] Already running, skipping...");
            return;
        }
        this.isRunning = true;
        const startTime = Date.now();
        try {
            logger_1.default.info("[DisputeVoteAggregator] Starting dispute vote aggregation...");
            // Get all markets in DISPUTED state
            const disputedMarkets = await this.getDisputedMarkets();
            logger_1.default.info(`[DisputeVoteAggregator] Found ${disputedMarkets.length} disputed markets`);
            if (disputedMarkets.length === 0) {
                logger_1.default.info("[DisputeVoteAggregator] No markets to process");
                return;
            }
            // Process each market
            let processedCount = 0;
            let finalizedCount = 0;
            let errorCount = 0;
            for (const market of disputedMarkets) {
                try {
                    const result = await this.processMarket(market);
                    processedCount++;
                    if (result.finalized) {
                        finalizedCount++;
                        logger_1.default.info(`[DisputeVoteAggregator] Market ${market.id} finalized! ` +
                            `Dispute ${result.disputeSucceeded ? "SUCCEEDED" : "FAILED"} ` +
                            `(${result.agreeVotes}/${result.totalVotes} = ${result.agreeRate.toFixed(2)}%)`);
                    }
                    else {
                        logger_1.default.debug(`[DisputeVoteAggregator] Market ${market.id} dispute period ongoing ` +
                            `(${result.agreeVotes}/${result.totalVotes} = ${result.agreeRate.toFixed(2)}%)`);
                    }
                }
                catch (error) {
                    errorCount++;
                    logger_1.default.error(`[DisputeVoteAggregator] Error processing market ${market.id}:`, error);
                }
            }
            const duration = Date.now() - startTime;
            logger_1.default.info(`[DisputeVoteAggregator] Completed: ` +
                `${processedCount} processed, ${finalizedCount} finalized, ` +
                `${errorCount} errors in ${duration}ms`);
        }
        catch (error) {
            logger_1.default.error("[DisputeVoteAggregator] Fatal error:", error);
            throw error;
        }
        finally {
            this.isRunning = false;
        }
    }
    /**
     * Get all markets in DISPUTED state from Supabase
     */
    async getDisputedMarkets() {
        const { data, error } = await this.supabase
            .from("markets")
            .select("id, on_chain_address, proposed_outcome, resolution_proposed_at")
            .eq("state", "DISPUTED")
            .order("resolution_proposed_at", { ascending: true });
        if (error) {
            throw new Error(`Failed to fetch disputed markets: ${error.message}`);
        }
        return data || [];
    }
    /**
     * Process a single disputed market:
     * 1. Check if dispute period ended (3 days from resolution_proposed_at)
     * 2. Aggregate votes
     * 3. Determine if dispute succeeded (>= 60%)
     * 4. Call on-chain finalize_market
     * 5. Update Supabase
     */
    async processMarket(market) {
        // 1. Check if dispute period ended (3 days = 259200 seconds)
        const disputeInitiatedAt = new Date(market.resolution_proposed_at).getTime();
        const now = Date.now();
        const disputePeriod = 3 * 24 * 60 * 60 * 1000; // 3 days in milliseconds
        if (now < disputeInitiatedAt + disputePeriod) {
            // Dispute period still ongoing
            const aggregation = await this.aggregateVotes(market.id);
            return {
                finalized: false,
                agreeVotes: aggregation.agreeVotes,
                disagreeVotes: aggregation.disagreeVotes,
                totalVotes: aggregation.totalVotes,
                agreeRate: aggregation.agreeRate,
                disputeSucceeded: aggregation.disputeSucceeded,
            };
        }
        // 2. Aggregate votes from Supabase
        const aggregation = await this.aggregateVotes(market.id);
        // 3. Determine final outcome based on dispute result
        let finalOutcome;
        if (aggregation.disputeSucceeded) {
            // Dispute succeeded → overturn original resolution
            finalOutcome = !market.proposed_outcome; // Flip the outcome
            logger_1.default.info(`[DisputeVoteAggregator] Dispute succeeded for market ${market.id}: ` +
                `Original ${market.proposed_outcome} → Final ${finalOutcome}`);
        }
        else {
            // Dispute failed → keep original resolution
            finalOutcome = market.proposed_outcome;
            logger_1.default.info(`[DisputeVoteAggregator] Dispute failed for market ${market.id}: ` +
                `Keeping original ${finalOutcome}`);
        }
        // 4. Call on-chain finalize_market with retry
        await this.finalizeMarketOnChain(market.on_chain_address, finalOutcome, aggregation.agreeVotes, aggregation.disagreeVotes);
        // 5. Update Supabase state
        await this.updateMarketState(market.id, "FINALIZED", finalOutcome, aggregation);
        return {
            finalized: true,
            agreeVotes: aggregation.agreeVotes,
            disagreeVotes: aggregation.disagreeVotes,
            totalVotes: aggregation.totalVotes,
            agreeRate: aggregation.agreeRate,
            disputeSucceeded: aggregation.disputeSucceeded,
        };
    }
    /**
     * Aggregate dispute votes for a market from dispute_votes table
     */
    async aggregateVotes(marketId) {
        const { data: votes, error } = await this.supabase
            .from("dispute_votes")
            .select("vote")
            .eq("market_id", marketId);
        if (error) {
            throw new Error(`Failed to fetch dispute votes for market ${marketId}: ${error.message}`);
        }
        if (!votes || votes.length === 0) {
            return {
                marketId,
                marketPda: "",
                agreeVotes: 0,
                disagreeVotes: 0,
                totalVotes: 0,
                agreeRate: 0,
                disputeSucceeded: false,
            };
        }
        // Count agree (vote = true) and disagree (vote = false)
        const agreeVotes = votes.filter((v) => v.vote === true).length;
        const disagreeVotes = votes.filter((v) => v.vote === false).length;
        const totalVotes = agreeVotes + disagreeVotes;
        // Calculate agree rate (percentage)
        const agreeRate = totalVotes > 0 ? (agreeVotes / totalVotes) * 100 : 0;
        // Check if dispute succeeded (>= 60% agree = 6000 bps)
        const agreeRateBps = Math.floor(agreeRate * 100);
        const disputeSucceeded = agreeRateBps >= this.disputeThreshold;
        return {
            marketId,
            marketPda: "",
            agreeVotes,
            disagreeVotes,
            totalVotes,
            agreeRate,
            disputeSucceeded,
        };
    }
    /**
     * Call on-chain finalize_market instruction with retry logic
     */
    async finalizeMarketOnChain(marketAddress, finalOutcome, agreeVotes, disagreeVotes) {
        const marketPda = new web3_js_1.PublicKey(marketAddress);
        // Retry with exponential backoff
        const signature = await (0, retry_1.retryWithBackoff)(async () => {
            logger_1.default.debug(`[DisputeVoteAggregator] Calling finalize_market: ${marketAddress} ` +
                `(outcome: ${finalOutcome}, agree: ${agreeVotes}, disagree: ${disagreeVotes})`);
            const tx = await this.program.methods
                .finalizeMarket(finalOutcome, agreeVotes, disagreeVotes)
                .accounts({
                globalConfig: this.globalConfigPda,
                market: marketPda,
                backendAuthority: this.backendKeypair.publicKey,
            })
                .signers([this.backendKeypair])
                .rpc();
            logger_1.default.debug(`[DisputeVoteAggregator] Transaction sent: ${tx}`);
            return tx;
        }, {
            maxAttempts: 3,
            initialDelay: 1000,
            maxDelay: 10000,
            backoffFactor: 2,
        });
        // Wait for confirmation
        await this.program.provider.connection.confirmTransaction(signature, "confirmed");
        logger_1.default.info(`[DisputeVoteAggregator] Transaction confirmed: ${signature}`);
        return signature;
    }
    /**
     * Update market state in Supabase after on-chain finalization
     */
    async updateMarketState(marketId, newState, finalOutcome, aggregation) {
        const { error } = await this.supabase
            .from("markets")
            .update({
            state: newState,
            final_outcome: finalOutcome,
            dispute_agree: aggregation.agreeVotes,
            dispute_disagree: aggregation.disagreeVotes,
            dispute_total_votes: aggregation.totalVotes,
            finalized_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        })
            .eq("id", marketId);
        if (error) {
            throw new Error(`Failed to update market ${marketId}: ${error.message}`);
        }
        logger_1.default.debug(`[DisputeVoteAggregator] Updated market ${marketId} state to ${newState}`);
    }
    /**
     * Get service status
     */
    getStatus() {
        return {
            isRunning: this.isRunning,
            disputeThreshold: this.disputeThreshold,
        };
    }
}
exports.DisputeVoteAggregator = DisputeVoteAggregator;
//# sourceMappingURL=dispute.js.map