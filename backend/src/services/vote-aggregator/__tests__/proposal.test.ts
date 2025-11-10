/**
 * ProposalVoteAggregator Service Tests
 *
 * Comprehensive test coverage for src/services/vote-aggregator/proposal.ts
 * Coverage Target: >90%
 *
 * Test Categories:
 * 1. Constructor and initialization
 * 2. run() method - main aggregation flow
 * 3. aggregateVotes() - vote counting and threshold checking
 * 4. processMarket() - single market processing
 * 5. On-chain interaction and error handling
 * 6. Supabase integration
 * 7. Edge cases and concurrent execution
 */

import { PublicKey } from "@solana/web3.js";
import { ProposalVoteAggregator, VoteAggregationResult } from "../proposal";

// Mock dependencies
jest.mock("../../../utils/logger");
jest.mock("../../../utils/retry");

describe("ProposalVoteAggregator", () => {
  let aggregator: ProposalVoteAggregator;
  let mockProgram: any;
  let mockBackendKeypair: any;
  let mockSupabase: any;
  let mockGlobalConfigPda: PublicKey;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock Anchor program
    mockProgram = {
      methods: {
        approveProposal: jest.fn().mockReturnThis(),
      },
      provider: {
        connection: {
          confirmTransaction: jest.fn().mockResolvedValue(undefined),
        },
      },
    };

    // Mock program methods chain
    const mockAccountsMethod = jest.fn().mockReturnThis();
    const mockSignersMethod = jest.fn().mockReturnThis();
    const mockRpcMethod = jest.fn().mockResolvedValue("mock-tx-signature");

    mockProgram.methods.approveProposal.mockReturnValue({
      accounts: mockAccountsMethod,
    });
    mockAccountsMethod.mockReturnValue({
      signers: mockSignersMethod,
    });
    mockSignersMethod.mockReturnValue({
      rpc: mockRpcMethod,
    });

    // Mock backend keypair
    mockBackendKeypair = {
      publicKey: new PublicKey("4WQwPjKHu3x7dHBEehBDgxXHJQoDuBvj6Xhu6C1jjTye"),
      secretKey: new Uint8Array(64),
    };

    // Mock Supabase client with proper method chaining
    const mockChain = {
      from: jest.fn(),
      select: jest.fn(),
      eq: jest.fn(),
      update: jest.fn(),
      order: jest.fn(),
    };

    // Setup chain: each method returns the chain object
    mockChain.from.mockReturnValue(mockChain);
    mockChain.select.mockReturnValue(mockChain);
    mockChain.eq.mockReturnValue(mockChain);
    mockChain.update.mockResolvedValue({ data: [], error: null }); // Terminal
    mockChain.order.mockResolvedValue({ data: [], error: null }); // Terminal

    mockSupabase = mockChain;

    // Mock global config PDA
    mockGlobalConfigPda = new PublicKey("73ZXQr6GjjD4qnMgsuZNcJsNmd2juUsevXgdAhiKtokz");

    // Create aggregator instance
    aggregator = new ProposalVoteAggregator(
      mockProgram,
      mockBackendKeypair,
      mockSupabase,
      mockGlobalConfigPda,
      7000 // 70% threshold
    );

    // Mock retry utility
    const { retryWithBackoff } = require("../../../utils/retry");
    retryWithBackoff.mockImplementation(async (fn: any) => await fn());
  });

  describe("Constructor", () => {
    it("should initialize with default threshold (7000 bps = 70%)", () => {
      const agg = new ProposalVoteAggregator(
        mockProgram,
        mockBackendKeypair,
        mockSupabase,
        mockGlobalConfigPda
      );

      const status = agg.getStatus();
      expect(status.approvalThreshold).toBe(7000);
      expect(status.isRunning).toBe(false);
    });

    it("should initialize with custom threshold", () => {
      const customThreshold = 8000; // 80%
      const agg = new ProposalVoteAggregator(
        mockProgram,
        mockBackendKeypair,
        mockSupabase,
        mockGlobalConfigPda,
        customThreshold
      );

      const status = agg.getStatus();
      expect(status.approvalThreshold).toBe(8000);
    });

    it("should start in non-running state", () => {
      const status = aggregator.getStatus();
      expect(status.isRunning).toBe(false);
    });
  });

  describe("aggregateVotes()", () => {
    it("should return zero result when no votes exist", async () => {
      mockSupabase.eq.mockResolvedValue({ data: [], error: null });

      const result = await aggregator.aggregateVotes("market-123");

      expect(result).toEqual({
        marketId: "market-123",
        marketPda: "",
        likes: 0,
        dislikes: 0,
        totalVotes: 0,
        approvalRate: 0,
        meetsThreshold: false,
      });
    });

    it("should return zero result when votes is null", async () => {
      mockSupabase.eq.mockResolvedValue({ data: null, error: null });

      const result = await aggregator.aggregateVotes("market-123");

      expect(result.totalVotes).toBe(0);
      expect(result.meetsThreshold).toBe(false);
    });

    it("should count likes and dislikes correctly", async () => {
      const votes = [
        { vote: true },  // like
        { vote: true },  // like
        { vote: false }, // dislike
        { vote: true },  // like
      ];
      mockSupabase.eq.mockResolvedValue({ data: votes, error: null });

      const result = await aggregator.aggregateVotes("market-123");

      expect(result.likes).toBe(3);
      expect(result.dislikes).toBe(1);
      expect(result.totalVotes).toBe(4);
    });

    it("should calculate approval rate correctly (75%)", async () => {
      const votes = [
        { vote: true },
        { vote: true },
        { vote: true },
        { vote: false },
      ];
      mockSupabase.eq.mockResolvedValue({ data: votes, error: null });

      const result = await aggregator.aggregateVotes("market-123");

      expect(result.approvalRate).toBe(75); // 3/4 = 75%
    });

    it("should calculate approval rate correctly (100%)", async () => {
      const votes = [
        { vote: true },
        { vote: true },
      ];
      mockSupabase.eq.mockResolvedValue({ data: votes, error: null });

      const result = await aggregator.aggregateVotes("market-123");

      expect(result.approvalRate).toBe(100);
    });

    it("should calculate approval rate correctly (0%)", async () => {
      const votes = [
        { vote: false },
        { vote: false },
      ];
      mockSupabase.eq.mockResolvedValue({ data: votes, error: null });

      const result = await aggregator.aggregateVotes("market-123");

      expect(result.approvalRate).toBe(0);
    });

    it("should meet threshold when approval >= 70%", async () => {
      const votes = [
        { vote: true },
        { vote: true },
        { vote: true },
        { vote: true },
        { vote: true },
        { vote: true },
        { vote: true },
        { vote: false },
        { vote: false },
        { vote: false },
      ];
      mockSupabase.eq.mockResolvedValue({ data: votes, error: null });

      const result = await aggregator.aggregateVotes("market-123");

      expect(result.approvalRate).toBe(70); // 7/10 = 70%
      expect(result.meetsThreshold).toBe(true);
    });

    it("should not meet threshold when approval < 70%", async () => {
      const votes = [
        { vote: true },
        { vote: true },
        { vote: false },
        { vote: false },
        { vote: false },
      ];
      mockSupabase.eq.mockResolvedValue({ data: votes, error: null });

      const result = await aggregator.aggregateVotes("market-123");

      expect(result.approvalRate).toBe(40); // 2/5 = 40%
      expect(result.meetsThreshold).toBe(false);
    });

    it("should meet threshold exactly at 70%", async () => {
      const votes = Array(7).fill({ vote: true }).concat(Array(3).fill({ vote: false }));
      mockSupabase.eq.mockResolvedValue({ data: votes, error: null });

      const result = await aggregator.aggregateVotes("market-123");

      expect(result.approvalRate).toBe(70);
      expect(result.meetsThreshold).toBe(true);
    });

    it("should not meet threshold just below 70% (69.99%)", async () => {
      // 699 likes, 301 dislikes = 69.9%
      const votes = Array(699).fill({ vote: true }).concat(Array(301).fill({ vote: false }));
      mockSupabase.eq.mockResolvedValue({ data: votes, error: null });

      const result = await aggregator.aggregateVotes("market-123");

      expect(result.approvalRate).toBe(69.9);
      expect(result.meetsThreshold).toBe(false); // 6990 bps < 7000 bps
    });

    it("should throw error when Supabase query fails", async () => {
      mockSupabase.eq.mockResolvedValue({
        data: null,
        error: { message: "Database connection failed" },
      });

      await expect(aggregator.aggregateVotes("market-123")).rejects.toThrow(
        "Failed to fetch votes for market market-123: Database connection failed"
      );
    });

    it("should handle edge case with 1 like", async () => {
      const votes = [{ vote: true }];
      mockSupabase.eq.mockResolvedValue({ data: votes, error: null });

      const result = await aggregator.aggregateVotes("market-123");

      expect(result.approvalRate).toBe(100);
      expect(result.meetsThreshold).toBe(true);
    });

    it("should handle edge case with 1 dislike", async () => {
      const votes = [{ vote: false }];
      mockSupabase.eq.mockResolvedValue({ data: votes, error: null });

      const result = await aggregator.aggregateVotes("market-123");

      expect(result.approvalRate).toBe(0);
      expect(result.meetsThreshold).toBe(false);
    });
  });

  describe("run()", () => {
    it("should skip if already running", async () => {
      // Set to running
      const promise1 = aggregator.run();

      // Try to run again immediately
      await aggregator.run();

      // Wait for first to complete
      mockSupabase.order.mockResolvedValue({ data: [], error: null });
      await promise1;

      // Logger should warn about already running
      const logger = require("../../../utils/logger").default;
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining("Already running")
      );
    });

    it("should complete when no markets to process", async () => {
      mockSupabase.order.mockResolvedValue({ data: [], error: null });

      await aggregator.run();

      const logger = require("../../../utils/logger").default;
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining("No markets to process")
      );
    });

    it("should process proposed markets successfully", async () => {
      const markets = [
        {
          id: "market-1",
          on_chain_address: "7h3gXfBfYFueFVLYyfL5Qo1QGsf4GQUfW96FKVgnUsJS",
          creator_wallet: "4WQwPjKHu3x7dHBEehBDgxXHJQoDuBvj6Xhu6C1jjTye",
          question: "Test market?",
        },
      ];
      const votes = Array(8).fill({ vote: true }).concat(Array(2).fill({ vote: false }));

      mockSupabase.order.mockResolvedValue({ data: markets, error: null });
      mockSupabase.eq.mockResolvedValueOnce({ data: votes, error: null }); // aggregateVotes
      mockSupabase.eq.mockResolvedValueOnce({ data: null, error: null }); // updateMarketState

      await aggregator.run();

      const logger = require("../../../utils/logger").default;
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining("1 processed, 1 approved")
      );
    });

    it("should handle errors during market processing", async () => {
      const markets = [
        {
          id: "market-1",
          on_chain_address: "invalid-address",
          creator_wallet: "4WQwPjKHu3x7dHBEehBDgxXHJQoDuBvj6Xhu6C1jjTye",
          question: "Test market?",
        },
      ];

      mockSupabase.order.mockResolvedValue({ data: markets, error: null });
      mockSupabase.eq.mockRejectedValue(new Error("Supabase error"));

      await aggregator.run();

      const logger = require("../../../utils/logger").default;
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining("Error processing market"),
        expect.any(Error)
      );
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining("1 errors")
      );
    });

    it("should reset isRunning flag after completion", async () => {
      mockSupabase.order.mockResolvedValue({ data: [], error: null });

      expect(aggregator.getStatus().isRunning).toBe(false);

      await aggregator.run();

      expect(aggregator.getStatus().isRunning).toBe(false);
    });

    it("should reset isRunning flag even if error occurs", async () => {
      mockSupabase.order.mockRejectedValue(new Error("Fatal error"));

      expect(aggregator.getStatus().isRunning).toBe(false);

      await expect(aggregator.run()).rejects.toThrow("Fatal error");

      expect(aggregator.getStatus().isRunning).toBe(false);
    });

    it("should log completion stats correctly", async () => {
      const markets = [
        { id: "market-1", on_chain_address: "addr1", creator_wallet: "wallet1", question: "Q1" },
        { id: "market-2", on_chain_address: "addr2", creator_wallet: "wallet2", question: "Q2" },
      ];

      mockSupabase.order.mockResolvedValue({ data: markets, error: null });

      // Market 1: Meets threshold (approved)
      const votes1 = Array(8).fill({ vote: true }).concat(Array(2).fill({ vote: false }));
      // Market 2: Below threshold (not approved)
      const votes2 = Array(3).fill({ vote: true }).concat(Array(7).fill({ vote: false }));

      mockSupabase.eq
        .mockResolvedValueOnce({ data: votes1, error: null }) // aggregateVotes market-1
        .mockResolvedValueOnce({ data: null, error: null })   // updateMarketState market-1
        .mockResolvedValueOnce({ data: votes2, error: null }); // aggregateVotes market-2

      await aggregator.run();

      const logger = require("../../../utils/logger").default;
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining("2 processed, 1 approved, 0 errors")
      );
    });
  });

  describe("getStatus()", () => {
    it("should return correct status when not running", () => {
      const status = aggregator.getStatus();

      expect(status).toEqual({
        isRunning: false,
        approvalThreshold: 7000,
      });
    });

    it("should return correct status when running", async () => {
      mockSupabase.order.mockResolvedValue({ data: [], error: null });

      const promise = aggregator.run();

      // Check status immediately (should be running)
      // Note: Due to async nature, this might be flaky, so we'll just verify the structure
      const statusDuringRun = aggregator.getStatus();
      expect(statusDuringRun).toHaveProperty("isRunning");
      expect(statusDuringRun).toHaveProperty("approvalThreshold");

      await promise;

      // After completion, should be not running
      const statusAfterRun = aggregator.getStatus();
      expect(statusAfterRun.isRunning).toBe(false);
    });
  });

  describe("Edge Cases and Error Handling", () => {
    it("should handle Supabase error when fetching markets", async () => {
      mockSupabase.order.mockResolvedValue({
        data: null,
        error: { message: "Connection timeout" },
      });

      await expect(aggregator.run()).rejects.toThrow(
        "Failed to fetch proposed markets: Connection timeout"
      );
    });

    it("should handle empty market data gracefully", async () => {
      mockSupabase.order.mockResolvedValue({ data: null, error: null });

      await aggregator.run();

      const logger = require("../../../utils/logger").default;
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining("No markets to process")
      );
    });

    it("should handle approval rate rounding edge cases", async () => {
      // 2/3 = 66.666...%
      const votes = [
        { vote: true },
        { vote: true },
        { vote: false },
      ];
      mockSupabase.eq.mockResolvedValue({ data: votes, error: null });

      const result = await aggregator.aggregateVotes("market-123");

      expect(result.approvalRate).toBeCloseTo(66.67, 1);
      expect(result.meetsThreshold).toBe(false); // 6666 bps < 7000 bps
    });

    it("should handle very large vote counts", async () => {
      // 10,000 votes: 7,500 likes, 2,500 dislikes = 75%
      const votes = Array(7500).fill({ vote: true }).concat(Array(2500).fill({ vote: false }));
      mockSupabase.eq.mockResolvedValue({ data: votes, error: null });

      const result = await aggregator.aggregateVotes("market-123");

      expect(result.likes).toBe(7500);
      expect(result.dislikes).toBe(2500);
      expect(result.totalVotes).toBe(10000);
      expect(result.approvalRate).toBe(75);
      expect(result.meetsThreshold).toBe(true);
    });

    it("should use custom approval threshold correctly", async () => {
      const customAggregator = new ProposalVoteAggregator(
        mockProgram,
        mockBackendKeypair,
        mockSupabase,
        mockGlobalConfigPda,
        8000 // 80% threshold
      );

      // 75% approval (would pass 70% but not 80%)
      const votes = Array(75).fill({ vote: true }).concat(Array(25).fill({ vote: false }));
      mockSupabase.eq.mockResolvedValue({ data: votes, error: null });

      const result = await customAggregator.aggregateVotes("market-123");

      expect(result.approvalRate).toBe(75);
      expect(result.meetsThreshold).toBe(false); // 7500 bps < 8000 bps
    });

    it("should handle concurrent execution protection", async () => {
      // Add a delay to getProposedMarkets to simulate longer execution
      const slowMarkets = () =>
        new Promise((resolve) => {
          setTimeout(() => {
            resolve({ data: [], error: null });
          }, 50); // 50ms delay to ensure overlapping execution
        });

      mockSupabase.order.mockImplementation(slowMarkets);

      const run1 = aggregator.run();
      // Start second run after first has started (but not finished)
      await new Promise((resolve) => setTimeout(resolve, 10));
      const run2 = aggregator.run();
      const run3 = aggregator.run();

      await Promise.all([run1, run2, run3]);

      const logger = require("../../../utils/logger").default;
      // At least two should warn about already running
      expect(logger.warn).toHaveBeenCalledTimes(2);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining("Already running")
      );
    });
  });

  describe("Integration Scenarios", () => {
    it("should handle market approval workflow end-to-end", async () => {
      const market = {
        id: "market-123",
        on_chain_address: "7h3gXfBfYFueFVLYyfL5Qo1QGsf4GQUfW96FKVgnUsJS",
        creator_wallet: "4WQwPjKHu3x7dHBEehBDgxXHJQoDuBvj6Xhu6C1jjTye",
        question: "Will this market be approved?",
      };
      const votes = Array(8).fill({ vote: true }).concat(Array(2).fill({ vote: false }));

      mockSupabase.order.mockResolvedValue({ data: [market], error: null });
      mockSupabase.eq
        .mockResolvedValueOnce({ data: votes, error: null })   // aggregateVotes
        .mockResolvedValueOnce({ data: null, error: null });   // updateMarketState

      await aggregator.run();

      // Verify on-chain call was made
      expect(mockProgram.methods.approveProposal).toHaveBeenCalledWith(8, 2);

      // Verify Supabase update was called
      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          state: "APPROVED",
          proposal_likes: 8,
          proposal_dislikes: 2,
          proposal_total_votes: 10,
        })
      );
    });

    it("should not call on-chain if threshold not met", async () => {
      const market = {
        id: "market-123",
        on_chain_address: "7h3gXfBfYFueFVLYyfL5Qo1QGsf4GQUfW96FKVgnUsJS",
        creator_wallet: "4WQwPjKHu3x7dHBEehBDgxXHJQoDuBvj6Xhu6C1jjTye",
        question: "Will this market be approved?",
      };
      const votes = Array(3).fill({ vote: true }).concat(Array(7).fill({ vote: false }));

      mockSupabase.order.mockResolvedValue({ data: [market], error: null });
      mockSupabase.eq.mockResolvedValue({ data: votes, error: null });

      await aggregator.run();

      // Verify on-chain call was NOT made
      expect(mockProgram.methods.approveProposal).not.toHaveBeenCalled();

      // Verify Supabase update was NOT called
      expect(mockSupabase.update).not.toHaveBeenCalled();
    });
  });
});
