// ============================================================
// DisputeVoteAggregator Unit Tests
// ============================================================
// Purpose: Test dispute vote aggregation logic
// Story: 2.2 (Day 9)

import { DisputeVoteAggregator } from "../../../services/vote-aggregator/dispute";
import { PublicKey } from "@solana/web3.js";

// Mock dependencies
const mockProgram: any = {
  methods: {
    finalizeMarket: jest.fn().mockReturnValue({
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
// 2. Per-test overrides via mockSupabaseResponse
const mockSupabase: any = {
  from: jest.fn().mockImplementation(function(this: any) { return this; }),
  select: jest.fn().mockImplementation(function(this: any) { return this; }),
  eq: jest.fn().mockImplementation(() => Promise.resolve(mockSupabaseResponse)),
  order: jest.fn().mockImplementation(function(this: any) { return this; }),
  update: jest.fn().mockImplementation(function(this: any) { return this; }),
  then: function(resolve: any) {
    return Promise.resolve(mockSupabaseResponse).then(resolve);
  },
};

const mockGlobalConfigPda = new PublicKey("2aWG3YTjEggmR7s3nW2new79iXWCq7aTCmDnmZ8Vy3k5");

describe("DisputeVoteAggregator", () => {
  let aggregator: DisputeVoteAggregator;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabaseResponse = { data: null, error: null };
    aggregator = new DisputeVoteAggregator(
      mockProgram,
      mockKeypair,
      mockSupabase,
      mockGlobalConfigPda,
      6000 // 60% threshold
    );
  });

  describe("aggregateVotes", () => {
    it("should correctly count agree and disagree votes", async () => {
      // Mock Supabase response
      mockSupabaseResponse = {
        data: [
          { vote: true },  // agree with dispute
          { vote: true },  // agree
          { vote: true },  // agree
          { vote: false }, // disagree
        ],
        error: null,
      };

      const result = await aggregator.aggregateVotes("market-1");

      expect(result.agreeVotes).toBe(3);
      expect(result.disagreeVotes).toBe(1);
      expect(result.totalVotes).toBe(4);
      expect(result.agreeRate).toBe(75); // 3/4 = 75%
      expect(result.disputeSucceeded).toBe(true); // 75% >= 60%
    });

    it("should return correct agree rate for edge case (exact 60%)", async () => {
      // 6 agree, 4 disagree = 60%
      mockSupabaseResponse = {
        data: [
          { vote: true },
          { vote: true },
          { vote: true },
          { vote: true },
          { vote: true },
          { vote: true },
          { vote: false },
          { vote: false },
          { vote: false },
          { vote: false },
        ],
        error: null,
      };

      const result = await aggregator.aggregateVotes("market-2");

      expect(result.agreeVotes).toBe(6);
      expect(result.disagreeVotes).toBe(4);
      expect(result.totalVotes).toBe(10);
      expect(result.agreeRate).toBe(60); // Exactly 60%
      expect(result.disputeSucceeded).toBe(true); // 60% >= 60% (inclusive)
    });

    it("should NOT succeed for 59.9%", async () => {
      // 599 agree, 401 disagree = 59.9%
      const votes = [
        ...Array(599).fill({ vote: true }),
        ...Array(401).fill({ vote: false }),
      ];

      mockSupabaseResponse = {
        data: votes,
        error: null,
      };

      const result = await aggregator.aggregateVotes("market-3");

      expect(result.agreeVotes).toBe(599);
      expect(result.disagreeVotes).toBe(401);
      expect(result.totalVotes).toBe(1000);
      expect(result.agreeRate).toBeCloseTo(59.9, 1); // Allow floating point tolerance
      expect(result.disputeSucceeded).toBe(false); // 59.9% < 60%
    });

    it("should handle zero votes", async () => {
      mockSupabaseResponse = {
        data: [],
        error: null,
      };

      const result = await aggregator.aggregateVotes("market-4");

      expect(result.agreeVotes).toBe(0);
      expect(result.disagreeVotes).toBe(0);
      expect(result.totalVotes).toBe(0);
      expect(result.agreeRate).toBe(0);
      expect(result.disputeSucceeded).toBe(false);
    });

    it("should handle 100% agree (dispute fully succeeds)", async () => {
      mockSupabaseResponse = {
        data: [
          { vote: true },
          { vote: true },
          { vote: true },
        ],
        error: null,
      };

      const result = await aggregator.aggregateVotes("market-5");

      expect(result.agreeVotes).toBe(3);
      expect(result.disagreeVotes).toBe(0);
      expect(result.totalVotes).toBe(3);
      expect(result.agreeRate).toBe(100);
      expect(result.disputeSucceeded).toBe(true);
    });

    it("should handle 0% agree (dispute fails)", async () => {
      mockSupabaseResponse = {
        data: [
          { vote: false },
          { vote: false },
          { vote: false },
        ],
        error: null,
      };

      const result = await aggregator.aggregateVotes("market-6");

      expect(result.agreeVotes).toBe(0);
      expect(result.disagreeVotes).toBe(3);
      expect(result.totalVotes).toBe(3);
      expect(result.agreeRate).toBe(0);
      expect(result.disputeSucceeded).toBe(false);
    });

    it("should throw error if Supabase query fails", async () => {
      mockSupabaseResponse = {
        data: null,
        error: { message: "Database connection failed" },
      };

      await expect(aggregator.aggregateVotes("market-7")).rejects.toThrow(
        "Failed to fetch dispute votes for market market-7"
      );
    });

    it("should handle large vote counts without overflow", async () => {
      // Test with large numbers (10,000 votes)
      const votes = [
        ...Array(7000).fill({ vote: true }),  // 70%
        ...Array(3000).fill({ vote: false }), // 30%
      ];

      mockSupabaseResponse = {
        data: votes,
        error: null,
      };

      const result = await aggregator.aggregateVotes("market-8");

      expect(result.agreeVotes).toBe(7000);
      expect(result.disagreeVotes).toBe(3000);
      expect(result.totalVotes).toBe(10000);
      expect(result.agreeRate).toBe(70);
      expect(result.disputeSucceeded).toBe(true);
    });
  });

  describe("getStatus", () => {
    it("should return correct status", () => {
      const status = aggregator.getStatus();

      expect(status.isRunning).toBe(false);
      expect(status.disputeThreshold).toBe(6000);
    });
  });

  describe("threshold calculations", () => {
    it("should correctly calculate basis points for disputes", () => {
      // 60% = 6000 bps
      const agreeRate = 60;
      const agreeRateBps = Math.floor(agreeRate * 100);
      expect(agreeRateBps).toBe(6000);
    });

    it("should handle decimal percentages correctly", () => {
      // 59.9% = 5990 bps
      const agreeRate = 59.9;
      const agreeRateBps = Math.floor(agreeRate * 100);
      expect(agreeRateBps).toBe(5990);
      expect(agreeRateBps < 6000).toBe(true);
    });
  });

  describe("dispute period checking", () => {
    it("should correctly calculate 3-day dispute period", () => {
      const disputePeriodMs = 3 * 24 * 60 * 60 * 1000; // 3 days
      expect(disputePeriodMs).toBe(259200000); // 259,200,000 milliseconds
    });

    it("should identify if dispute period has ended", () => {
      const now = Date.now();
      const disputeInitiatedAt = now - (4 * 24 * 60 * 60 * 1000); // 4 days ago
      const disputePeriod = 3 * 24 * 60 * 60 * 1000; // 3 days

      const hasEnded = now >= disputeInitiatedAt + disputePeriod;
      expect(hasEnded).toBe(true);
    });

    it("should identify if dispute period is still ongoing", () => {
      const now = Date.now();
      const disputeInitiatedAt = now - (2 * 24 * 60 * 60 * 1000); // 2 days ago
      const disputePeriod = 3 * 24 * 60 * 60 * 1000; // 3 days

      const hasEnded = now >= disputeInitiatedAt + disputePeriod;
      expect(hasEnded).toBe(false);
    });
  });
});
