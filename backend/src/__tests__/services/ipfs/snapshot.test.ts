// ============================================================
// IPFSSnapshotService Unit Tests
// ============================================================
// Purpose: Test IPFS snapshot creation and upload logic
// Story: 2.3 (Day 10)

import { IPFSSnapshotService } from "../../../services/ipfs/snapshot";

// Mock IPFS client
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
  is: jest.fn(() => mockSupabase),
  order: jest.fn(() => mockSupabase),
  limit: jest.fn(() => Promise.resolve(mockSupabaseResponse)),
  insert: jest.fn(() => Promise.resolve(mockSupabaseResponse)),
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

describe("IPFSSnapshotService", () => {
  let service: IPFSSnapshotService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabaseResponse = { data: null, error: null };
    service = new IPFSSnapshotService(mockSupabase);
  });

  describe("snapshotMarket", () => {
    it("should create snapshot for market with discussions", async () => {
      // Mock Supabase discussions response
      mockSupabaseResponse = {
        data: [
          {
            id: "disc-1",
            user_wallet: "wallet1",
            content: "Great market!",
            created_at: new Date().toISOString(),
          },
          {
            id: "disc-2",
            user_wallet: "wallet2",
            content: "I disagree",
            created_at: new Date().toISOString(),
          },
        ],
        error: null,
      };

      // Mock IPFS upload
      mockIPFS.add.mockResolvedValueOnce({
        cid: { toString: () => "QmTest123456" },
      });

      const result = await service.snapshotMarket("market-1");

      expect(result).not.toBeNull();
      expect(result?.marketId).toBe("market-1");
      expect(result?.discussionsCount).toBe(2);
      expect(result?.ipfsCid).toBe("QmTest123456");
      expect(mockIPFS.add).toHaveBeenCalledTimes(1);
    });

    it("should return null for market with no discussions", async () => {
      // Mock empty discussions
      mockSupabaseResponse = {
        data: [],
        error: null,
      };

      const result = await service.snapshotMarket("market-2");

      expect(result).toBeNull();
      expect(mockIPFS.add).not.toHaveBeenCalled();
    });

    it("should filter discussions by 24-hour window", async () => {
      const now = Date.now();
      const yesterday = new Date(now - 86400000).toISOString();

      // Discussions within 24h window
      mockSupabaseResponse = {
        data: [
          {
            id: "disc-1",
            user_wallet: "wallet1",
            content: "Recent discussion",
            created_at: new Date(now - 3600000).toISOString(), // 1 hour ago
          },
        ],
        error: null,
      };

      mockIPFS.add.mockResolvedValueOnce({
        cid: { toString: () => "QmTest789" },
      });

      const result = await service.snapshotMarket("market-3");

      expect(result).not.toBeNull();
      expect(result?.discussionsCount).toBe(1);
    });

    it("should handle IPFS upload failure with retry", async () => {
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

      // First attempt fails, second succeeds
      mockIPFS.add
        .mockRejectedValueOnce(new Error("IPFS timeout"))
        .mockResolvedValueOnce({
          cid: { toString: () => "QmTestRetry" },
        });

      const result = await service.snapshotMarket("market-4");

      expect(result).not.toBeNull();
      expect(result?.ipfsCid).toBe("QmTestRetry");
      expect(mockIPFS.add).toHaveBeenCalledTimes(2); // Retry happened
    });

    it("should throw error if Supabase CID storage fails", async () => {
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

      mockIPFS.add.mockResolvedValueOnce({
        cid: { toString: () => "QmTest" },
      });

      // Mock insert to fail
      mockSupabase.insert.mockResolvedValueOnce({
        data: null,
        error: { message: "Database connection failed" },
      });

      await expect(service.snapshotMarket("market-5")).rejects.toThrow(
        "Failed to store CID for market market-5"
      );
    });
  });

  describe("createSnapshot", () => {
    it("should create valid snapshot structure", () => {
      const discussions = [
        {
          id: "disc-1",
          user_wallet: "wallet1",
          content: "Test content",
          created_at: "2025-11-05T00:00:00Z",
        },
      ];

      // Access private method through service instance (testing internal logic)
      const snapshot = (service as any).createSnapshot("market-1", discussions);

      expect(snapshot).toMatchObject({
        market_id: "market-1",
        snapshot_version: "1.0",
        discussions_count: 1,
        discussions: [
          {
            id: "disc-1",
            user_wallet: "wallet1",
            content: "Test content",
            created_at: "2025-11-05T00:00:00Z",
          },
        ],
      });
      expect(snapshot.snapshot_date).toBeDefined();
    });

    it("should handle empty discussions array", () => {
      const snapshot = (service as any).createSnapshot("market-2", []);

      expect(snapshot.discussions_count).toBe(0);
      expect(snapshot.discussions).toEqual([]);
    });

    it("should handle large discussion sets", () => {
      const discussions = Array(1000).fill(null).map((_, i) => ({
        id: `disc-${i}`,
        user_wallet: `wallet-${i}`,
        content: `Discussion ${i}`,
        created_at: new Date().toISOString(),
      }));

      const snapshot = (service as any).createSnapshot("market-3", discussions);

      expect(snapshot.discussions_count).toBe(1000);
      expect(snapshot.discussions.length).toBe(1000);
    });
  });

  describe("retrieveSnapshot", () => {
    it("should retrieve and parse snapshot from IPFS", async () => {
      const mockSnapshot = {
        market_id: "market-1",
        snapshot_date: "2025-11-05T00:00:00Z",
        snapshot_version: "1.0",
        discussions_count: 2,
        discussions: [
          {
            id: "disc-1",
            user_wallet: "wallet1",
            content: "Test",
            created_at: "2025-11-05T00:00:00Z",
          },
        ],
      };

      // Mock IPFS cat to return async generator
      const mockChunks = [Buffer.from(JSON.stringify(mockSnapshot))];
      mockIPFS.cat.mockReturnValueOnce((async function* () {
        for (const chunk of mockChunks) {
          yield chunk;
        }
      })());

      const result = await service.retrieveSnapshot("QmTest123");

      expect(result).toEqual(mockSnapshot);
      expect(mockIPFS.cat).toHaveBeenCalledWith("QmTest123");
    });

    it("should handle invalid CID", async () => {
      mockIPFS.cat.mockImplementationOnce(() => {
        throw new Error("Invalid CID");
      });

      await expect(service.retrieveSnapshot("InvalidCID")).rejects.toThrow(
        "Failed to retrieve snapshot from IPFS"
      );
    });
  });

  describe("getSnapshotHistory", () => {
    it("should fetch snapshot history for market", async () => {
      const mockHistory = [
        {
          id: "1",
          market_id: "market-1",
          ipfs_hash: "QmTest1",
          discussions_count: 5,
          created_at: "2025-11-05T00:00:00Z",
        },
        {
          id: "2",
          market_id: "market-1",
          ipfs_hash: "QmTest2",
          discussions_count: 3,
          created_at: "2025-11-04T00:00:00Z",
        },
      ];

      mockSupabaseResponse = {
        data: mockHistory,
        error: null,
      };

      const result = await service.getSnapshotHistory("market-1", 30);

      expect(result).toEqual(mockHistory);
      expect(result.length).toBe(2);
    });

    it("should handle empty history", async () => {
      mockSupabaseResponse = {
        data: [],
        error: null,
      };

      const result = await service.getSnapshotHistory("market-2");

      expect(result).toEqual([]);
    });
  });

  describe("testConnection", () => {
    it("should return true for successful connection", async () => {
      mockIPFS.add.mockResolvedValueOnce({
        cid: { toString: () => "QmTestConnection" },
      });

      const result = await service.testConnection();

      expect(result).toBe(true);
      expect(mockIPFS.add).toHaveBeenCalledTimes(1);
    });

    it("should return false for failed connection", async () => {
      mockIPFS.add.mockRejectedValueOnce(new Error("Connection failed"));

      const result = await service.testConnection();

      expect(result).toBe(false);
    });
  });

  describe("getStatus", () => {
    it("should return correct status", () => {
      const status = service.getStatus();

      expect(status.isRunning).toBe(false);
      expect(status.ipfsGateway).toBeDefined();
    });
  });
});
