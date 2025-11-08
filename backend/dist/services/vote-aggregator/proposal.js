"use strict";
// ============================================================
// ProposalManager Vote Aggregator Service
// ============================================================
// Purpose: Aggregate proposal votes and call approve_market on-chain
// Pattern Prevention: #3 (Reactive Crisis) - Proactive error handling
// Story: 2.2 (Day 9)
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProposalVoteAggregator = void 0;
const web3_js_1 = require("@solana/web3.js");
const logger_1 = __importDefault(require("../../utils/logger"));
const retry_1 = require("../../utils/retry");
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
class ProposalVoteAggregator {
    program;
    backendKeypair;
    supabase;
    globalConfigPda;
    isRunning = false;
    approvalThreshold;
    constructor(program, backendKeypair, // Keypair from @solana/web3.js
    supabase, globalConfigPda, approvalThreshold = 7000 // 70% in basis points
    ) {
        this.program = program;
        this.backendKeypair = backendKeypair;
        this.supabase = supabase;
        this.globalConfigPda = globalConfigPda;
        this.approvalThreshold = approvalThreshold;
    }
    /**
     * Start the aggregation service
     * Called by scheduler (cron job)
     */
    async run() {
        if (this.isRunning) {
            logger_1.default.warn("[ProposalVoteAggregator] Already running, skipping...");
            return;
        }
        this.isRunning = true;
        const startTime = Date.now();
        try {
            logger_1.default.info("[ProposalVoteAggregator] Starting vote aggregation...");
            // Get all markets in PROPOSED state
            const proposedMarkets = await this.getProposedMarkets();
            logger_1.default.info(`[ProposalVoteAggregator] Found ${proposedMarkets.length} proposed markets`);
            if (proposedMarkets.length === 0) {
                logger_1.default.info("[ProposalVoteAggregator] No markets to process");
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
                        logger_1.default.info(`[ProposalVoteAggregator] Market ${market.id} approved! ` +
                            `(${result.likes}/${result.totalVotes} = ${result.approvalRate.toFixed(2)}%)`);
                    }
                    else {
                        logger_1.default.debug(`[ProposalVoteAggregator] Market ${market.id} below threshold ` +
                            `(${result.likes}/${result.totalVotes} = ${result.approvalRate.toFixed(2)}%)`);
                    }
                }
                catch (error) {
                    errorCount++;
                    logger_1.default.error(`[ProposalVoteAggregator] Error processing market ${market.id}:`, error);
                }
            }
            const duration = Date.now() - startTime;
            logger_1.default.info(`[ProposalVoteAggregator] Completed: ` +
                `${processedCount} processed, ${approvedCount} approved, ` +
                `${errorCount} errors in ${duration}ms`);
        }
        catch (error) {
            logger_1.default.error("[ProposalVoteAggregator] Fatal error:", error);
            throw error;
        }
        finally {
            this.isRunning = false;
        }
    }
    /**
     * Get all markets in PROPOSED state from Supabase
     */
    async getProposedMarkets() {
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
    async processMarket(market) {
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
        await this.approveMarketOnChain(market.on_chain_address, aggregation.likes, aggregation.dislikes);
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
    async aggregateVotes(marketId) {
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
    async approveMarketOnChain(marketAddress, finalLikes, finalDislikes) {
        const marketPda = new web3_js_1.PublicKey(marketAddress);
        // Retry with exponential backoff
        const signature = await (0, retry_1.retryWithBackoff)(async () => {
            logger_1.default.debug(`[ProposalVoteAggregator] Calling approve_market: ${marketAddress} ` +
                `(likes: ${finalLikes}, dislikes: ${finalDislikes})`);
            const tx = await this.program.methods
                .approveMarket(finalLikes, finalDislikes)
                .accounts({
                globalConfig: this.globalConfigPda,
                market: marketPda,
                backendAuthority: this.backendKeypair.publicKey,
            })
                .signers([this.backendKeypair])
                .rpc();
            logger_1.default.debug(`[ProposalVoteAggregator] Transaction sent: ${tx}`);
            return tx;
        }, {
            maxAttempts: 3,
            initialDelay: 1000,
            maxDelay: 10000,
            backoffFactor: 2,
        });
        // Wait for confirmation
        await this.program.provider.connection.confirmTransaction(signature, "confirmed");
        logger_1.default.info(`[ProposalVoteAggregator] Transaction confirmed: ${signature}`);
        return signature;
    }
    /**
     * Update market state in Supabase after on-chain approval
     */
    async updateMarketState(marketId, newState, aggregation) {
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
        logger_1.default.debug(`[ProposalVoteAggregator] Updated market ${marketId} state to ${newState}`);
    }
    /**
     * Get service status
     */
    getStatus() {
        return {
            isRunning: this.isRunning,
            approvalThreshold: this.approvalThreshold,
        };
    }
}
exports.ProposalVoteAggregator = ProposalVoteAggregator;
//# sourceMappingURL=proposal.js.map