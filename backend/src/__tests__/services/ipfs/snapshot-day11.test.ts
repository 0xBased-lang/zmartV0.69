// ============================================================
// IPFSSnapshotService Day 11 Tests
// ============================================================
// Purpose: Test gateway fallback, pruning, and enhanced retrieval
// Story: 2.3 (Day 11)

import { IPFSSnapshotService } from "../../../services/ipfs/snapshot";

// Mock IPFS client with failure simulation
const mockIPFS = {
  add: jest.fn(),
  cat: jest.fn(),
};

// Mock Supabase
let mockSupabaseResponse: any = { data: null, error: null };
const mockSupabase: any = {
  from: jest.fn(() => mockSupabase),
  select: jest.fn(() => mockSupabase),
  eq: jest.fn(() => mockSupabase),
  in: jest.fn(() => mockSupabase),
  gte: jest.fn(() => mockSupabase),
  lt: jest.fn(() => mockSupabase),
  is: jest.fn(() => mockSupabase),
  order: jest.fn(() => mockSupabase),
  limit: jest.fn(() => Promise.resolve(mockSupabaseResponse)),
  insert: jest.fn(() => Promise.resolve(mockSupabaseResponse)),
  delete: jest.fn(() => Promise.resolve(mockSupabaseResponse)),
};

// Mock config
jest.mock("../../../config", () => ({
  config: {
    ipfs: {
      projectId: "test-project-id",
      projectSecret: "test-project-secret",
      gatewayUrl: "https://ipfs.infura.io:5001",
    },
    services: {
      ipfsSnapshotCron: "0 0 * * *",
    },
  },
}));

// Mock ipfs-http-client
jest.mock("ipfs-http-client", () => ({
  create: jest.fn(() => mockIPFS),
}));

describe("IPFSSnapshotService - Day 11 Features", () => {
  let service: IPFSSnapshotService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabaseResponse = { data: null, error: null };
    service = new IPFSSnapshotService(mockSupabase);
  });

  describe("Gateway Fallback", () => {
    it("should successfully upload on first gateway attempt", async () => {
      // Mock discussions
      mockSupabaseResponse = {
        data: [
          {
            id: "disc-1",
            user_wallet: "wallet1",
            content: "Test",
            created_at: new Date().toISOString(),
          },
        ],
        error: null,
      };

      // Mock successful upload on first attempt
      mockIPFS.add.mockResolvedValueOnce({
        cid: { toString: () => "QmSuccess" },
      });

      const result = await service.snapshotMarket("market-1");

      expect(result).not.toBeNull();
      expect(result?.ipfsCid).toBe("QmSuccess");
      expect(mockIPFS.add).toHaveBeenCalledTimes(1);
    });

    it("should fallback to second gateway on first failure", async () => {
      // Mock discussions
      mockSupabaseResponse = {
        data: [
          {
            id: "disc-1",
            user_wallet: "wallet1",
            content: "Test",
            created_at: new Date().toISOString(),
          },
        ],
        error: null,
      };

      // First gateway fails, second succeeds
      mockIPFS.add
        .mockRejectedValueOnce(new Error("Infura timeout"))
        .mockRejectedValueOnce(new Error("Infura timeout again")) // Retry attempt 2
        .mockResolvedValueOnce({
          cid: { toString: () => "QmFallback" },
        });

      const result = await service.snapshotMarket("market-1");

      expect(result).not.toBeNull();
      expect(result?.ipfsCid).toBe("QmFallback");
      expect(mockIPFS.add).toHaveBeenCalledTimes(3); // 2 failed + 1 success
    });

    it("should throw error after all gateways fail", async () => {
      // Mock discussions
      mockSupabaseResponse = {
        data: [
          {
            id: "disc-1",
            user_wallet: "wallet1",
            content: "Test",
            created_at: new Date().toISOString(),
          },
        ],
        error: null,
      };

      // All gateways fail
      mockIPFS.add.mockRejectedValue(new Error("IPFS network down"));

      await expect(service.snapshotMarket("market-1")).rejects.toThrow(
        "IPFS upload failed on all gateways"
      );
    });
  });

  describe("Snapshot Retrieval with Fallback", () => {
    it("should retrieve snapshot on first gateway attempt", async () => {
      const mockSnapshot = {
        market_id: "market-1",
        snapshot_date: new Date().toISOString(),
        snapshot_version: "1.0",
        discussions_count: 2,
        discussions: [
          {
            id: "disc-1",
            user_wallet: "wallet1",
            content: "Test",
            created_at: new Date().toISOString(),
          },
        ],
      };

      // Mock IPFS cat successful
      mockIPFS.cat.mockReturnValueOnce(
        (async function* () {
          yield Buffer.from(JSON.stringify(mockSnapshot));
        })()
      );

      const result = await service.retrieveSnapshot("QmTest");

      expect(result.market_id).toBe("market-1");
      expect(result.discussions_count).toBe(2);
      expect(mockIPFS.cat).toHaveBeenCalledWith("QmTest");
    });

    it("should fallback to second gateway on first retrieval failure", async () => {
      const mockSnapshot = {
        market_id: "market-1",
        snapshot_date: new Date().toISOString(),
        snapshot_version: "1.0",
        discussions_count: 1,
        discussions: [],
      };

      // First gateway fails, second succeeds
      mockIPFS.cat
        .mockRejectedValueOnce(new Error("Gateway timeout"))
        .mockReturnValueOnce(
          (async function* () {
            yield Buffer.from(JSON.stringify(mockSnapshot));
          })()
        );

      const result = await service.retrieveSnapshot("QmTest");

      expect(result.market_id).toBe("market-1");
      expect(mockIPFS.cat).toHaveBeenCalledTimes(2);
    });

    it("should throw error after all retrieval gateways fail", async () => {
      // All gateways fail
      mockIPFS.cat.mockRejectedValue(new Error("Network down"));

      await expect(service.retrieveSnapshot("QmTest")).rejects.toThrow(
        "IPFS retrieval failed on all gateways"
      );
    });
  });

  describe("Snapshot Pruning (90-day cleanup)", () => {
    it("should prune old snapshots (>90 days)", async () => {
      const ninetyOneDaysAgo = new Date(Date.now() - 91 * 86400000);

      // Mock old snapshots
      mockSupabaseResponse = {
        data: [
          {
            id: 1,
            market_id: "old-market-1",
            ipfs_hash: "QmOld1",
            created_at: ninetyOneDaysAgo.toISOString(),
          },
          {
            id: 2,
            market_id: "old-market-2",
            ipfs_hash: "QmOld2",
            created_at: ninetyOneDaysAgo.toISOString(),
          },
        ],
        error: null,
      };

      const prunedCount = await service.pruneOldSnapshots();

      expect(prunedCount).toBe(2);
      expect(mockSupabase.delete).toHaveBeenCalled();
    });

    it("should return 0 when no old snapshots to prune", async () => {
      // Mock no old snapshots
      mockSupabaseResponse = {
        data: [],
        error: null,
      };

      const prunedCount = await service.pruneOldSnapshots();

      expect(prunedCount).toBe(0);
      expect(mockSupabase.delete).not.toHaveBeenCalled();
    });

    it("should throw error on Supabase select failure", async () => {
      // Mock Supabase select error
      mockSupabaseResponse = {
        data: null,
        error: { message: "Database connection lost" },
      };

      await expect(service.pruneOldSnapshots()).rejects.toThrow(
        "Failed to fetch old snapshots"
      );
    });

    it("should throw error on Supabase delete failure", async () => {
      // Mock successful select but failed delete
      const mockOldSnapshots = [
        {
          id: 1,
          market_id: "old-market",
          ipfs_hash: "QmOld",
          created_at: new Date(Date.now() - 100 * 86400000).toISOString(),
        },
      ];

      // First call (select) succeeds, second call (delete) fails
      mockSupabase.select.mockReturnValueOnce(mockSupabase);
      mockSupabase.lt.mockReturnValueOnce(mockSupabase);
      mockSupabase.order.mockResolvedValueOnce({
        data: mockOldSnapshots,
        error: null,
      });

      mockSupabase.delete.mockReturnValueOnce(mockSupabase);
      mockSupabase.lt.mockResolvedValueOnce({
        data: null,
        error: { message: "Delete failed" },
      });

      await expect(service.pruneOldSnapshots()).rejects.toThrow(
        "Failed to delete old snapshots"
      );
    });

    it("should not prune snapshots <90 days old", async () => {
      const eightyNineDaysAgo = new Date(Date.now() - 89 * 86400000);

      // Mock recent snapshots (should NOT be pruned)
      mockSupabaseResponse = {
        data: [], // No snapshots older than 90 days
        error: null,
      };

      const prunedCount = await service.pruneOldSnapshots();

      expect(prunedCount).toBe(0);
    });

    it("should handle large batch pruning (100+ snapshots)", async () => {
      // Mock 150 old snapshots
      const ninetyOneDaysAgo = new Date(Date.now() - 91 * 86400000);
      const oldSnapshots = Array.from({ length: 150 }, (_, i) => ({
        id: i + 1,
        market_id: `old-market-${i}`,
        ipfs_hash: `QmOld${i}`,
        created_at: ninetyOneDaysAgo.toISOString(),
      }));

      mockSupabaseResponse = {
        data: oldSnapshots,
        error: null,
      };

      const prunedCount = await service.pruneOldSnapshots();

      expect(prunedCount).toBe(150);
      expect(mockSupabase.delete).toHaveBeenCalled();
    });
  });

  describe("Integration: Snapshot History", () => {
    it("should return recent snapshot history after pruning", async () => {
      const recentSnapshots = [
        {
          id: 1,
          market_id: "market-1",
          ipfs_hash: "QmRecent1",
          created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
        },
        {
          id: 2,
          market_id: "market-1",
          ipfs_hash: "QmRecent2",
          created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
        },
      ];

      mockSupabaseResponse = {
        data: recentSnapshots,
        error: null,
      };

      const history = await service.getSnapshotHistory("market-1");

      expect(history).toHaveLength(2);
      expect(history[0].ipfs_hash).toBe("QmRecent1");
    });
  });
});
