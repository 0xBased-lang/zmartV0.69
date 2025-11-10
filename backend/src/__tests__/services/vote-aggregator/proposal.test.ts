// ============================================================
// ProposalVoteAggregator Unit Tests
// ============================================================
// Purpose: Test proposal vote aggregation logic
// Story: 2.2 (Day 9)

import { ProposalVoteAggregator } from "../../../services/vote-aggregator/proposal";
import { PublicKey } from "@solana/web3.js";

// Mock dependencies
const mockProgram: any = {
  methods: {
    approveProposal: jest.fn().mockReturnValue({
      accounts: jest.fn().mockReturnThis(),
      signers: jest.fn().mockReturnThis(),
      rpc: jest.fn().mockResolvedValue("mock-signature"),
    }),
  },
  provider: {
    connection: {
      confirmTransaction: jest.fn().mockResolvedValue(undefined),
    },
  },
};

const mockKeypair: any = {
  publicKey: new PublicKey("3eHjEggmR7s3nW2new79iXWCq7aTCmDnmZ8Vy3CoTjy4"),
};

let mockSupabaseResponse: any = { data: null, error: null };

// Create a Supabase mock that properly supports:
// 1. Chaining: supabase.from().select().eq()
// 2. Per-test overrides: mockSupabase.select.mockResolvedValueOnce()
//
// Key insight: When mockResolvedValueOnce() is called on select, it should return
// that value directly (skipping eq()), so we make eq() just forward the response.
const mockSupabase: any = {
  from: jest.fn().mockImplementation(function(this: any) { return this; }),

  // select() returns 'this' for chaining, BUT can be overridden per-test
  select: jest.fn().mockImplementation(function(this: any) { return this; }),

  // eq() returns a promise with mockSupabaseResponse
  // When select.mockResolvedValueOnce() is used, this chain gets bypassed
  eq: jest.fn().mockImplementation(() => Promise.resolve(mockSupabaseResponse)),

  // order() for chaining
  order: jest.fn().mockImplementation(function(this: any) { return this; }),

  // update() for chaining
  update: jest.fn().mockImplementation(function(this: any) { return this; }),

  // Make the mock itself thenable (for awaiting the chain result)
  then: function(resolve: any) {
    return Promise.resolve(mockSupabaseResponse).then(resolve);
  },
};

const mockGlobalConfigPda = new PublicKey("2aWG3YTjEggmR7s3nW2new79iXWCq7aTCmDnmZ8Vy3k5");

describe("ProposalVoteAggregator", () => {
  let aggregator: ProposalVoteAggregator;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabaseResponse = { data: null, error: null };
    aggregator = new ProposalVoteAggregator(
      mockProgram,
      mockKeypair,
      mockSupabase,
      mockGlobalConfigPda,
      7000 // 70% threshold
    );
  });

  describe("aggregateVotes", () => {
    it("should correctly count likes and dislikes", async () => {
      // Mock Supabase response
      mockSupabaseResponse = {
        data: [
          { vote: true },  // like
          { vote: true },  // like
          { vote: true },  // like
          { vote: false }, // dislike
        ],
        error: null,
      };

      const result = await aggregator.aggregateVotes("market-1");

      expect(result.likes).toBe(3);
      expect(result.dislikes).toBe(1);
      expect(result.totalVotes).toBe(4);
      expect(result.approvalRate).toBe(75); // 3/4 = 75%
      expect(result.meetsThreshold).toBe(true); // 75% >= 70%
    });

    it("should return correct approval rate for edge case (exact 70%)", async () => {
      // 7 likes, 3 dislikes = 70%
      mockSupabaseResponse = {
        data: [
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
        ],
        error: null,
      };

      const result = await aggregator.aggregateVotes("market-2");

      expect(result.likes).toBe(7);
      expect(result.dislikes).toBe(3);
      expect(result.totalVotes).toBe(10);
      expect(result.approvalRate).toBe(70); // Exactly 70%
      expect(result.meetsThreshold).toBe(true); // 70% >= 70% (inclusive)
    });

    it("should NOT meet threshold for 69.9%", async () => {
      // 699 likes, 301 dislikes = 69.9%
      const votes = [
        ...Array(699).fill({ vote: true }),
        ...Array(301).fill({ vote: false }),
      ];

      mockSupabaseResponse = {
        data: votes,
        error: null,
      };

      const result = await aggregator.aggregateVotes("market-3");

      expect(result.likes).toBe(699);
      expect(result.dislikes).toBe(301);
      expect(result.totalVotes).toBe(1000);
      expect(result.approvalRate).toBeCloseTo(69.9, 1); // Allow floating point tolerance
      expect(result.meetsThreshold).toBe(false); // 69.9% < 70%
    });

    it("should handle zero votes", async () => {
      mockSupabaseResponse = {
        data: [],
        error: null,
      };

      const result = await aggregator.aggregateVotes("market-4");

      expect(result.likes).toBe(0);
      expect(result.dislikes).toBe(0);
      expect(result.totalVotes).toBe(0);
      expect(result.approvalRate).toBe(0);
      expect(result.meetsThreshold).toBe(false);
    });

    it("should handle 100% approval", async () => {
      mockSupabaseResponse = {
        data: [
          { vote: true },
          { vote: true },
          { vote: true },
        ],
        error: null,
      };

      const result = await aggregator.aggregateVotes("market-5");

      expect(result.likes).toBe(3);
      expect(result.dislikes).toBe(0);
      expect(result.totalVotes).toBe(3);
      expect(result.approvalRate).toBe(100);
      expect(result.meetsThreshold).toBe(true);
    });

    it("should handle 0% approval", async () => {
      mockSupabaseResponse = {
        data: [
          { vote: false },
          { vote: false },
          { vote: false },
        ],
        error: null,
      };

      const result = await aggregator.aggregateVotes("market-6");

      expect(result.likes).toBe(0);
      expect(result.dislikes).toBe(3);
      expect(result.totalVotes).toBe(3);
      expect(result.approvalRate).toBe(0);
      expect(result.meetsThreshold).toBe(false);
    });

    it("should throw error if Supabase query fails", async () => {
      mockSupabaseResponse = {
        data: null,
        error: { message: "Database connection failed" },
      };

      await expect(aggregator.aggregateVotes("market-7")).rejects.toThrow(
        "Failed to fetch votes for market market-7"
      );
    });

    it("should handle large vote counts without overflow", async () => {
      // Test with large numbers (10,000 votes)
      const votes = [
        ...Array(8000).fill({ vote: true }),  // 80%
        ...Array(2000).fill({ vote: false }), // 20%
      ];

      mockSupabaseResponse = {
        data: votes,
        error: null,
      };

      const result = await aggregator.aggregateVotes("market-8");

      expect(result.likes).toBe(8000);
      expect(result.dislikes).toBe(2000);
      expect(result.totalVotes).toBe(10000);
      expect(result.approvalRate).toBe(80);
      expect(result.meetsThreshold).toBe(true);
    });
  });

  describe("getStatus", () => {
    it("should return correct status", () => {
      const status = aggregator.getStatus();

      expect(status.isRunning).toBe(false);
      expect(status.approvalThreshold).toBe(7000);
    });
  });

  describe("threshold calculations", () => {
    it("should correctly calculate basis points", () => {
      // 70% = 7000 bps
      // If approvalRate = 70%, approvalRateBps should be 7000
      const approvalRate = 70;
      const approvalRateBps = Math.floor(approvalRate * 100);
      expect(approvalRateBps).toBe(7000);
    });

    it("should handle decimal percentages correctly", () => {
      // 69.9% = 6990 bps
      const approvalRate = 69.9;
      const approvalRateBps = Math.floor(approvalRate * 100);
      expect(approvalRateBps).toBe(6990);
      expect(approvalRateBps < 7000).toBe(true);
    });
  });
});
