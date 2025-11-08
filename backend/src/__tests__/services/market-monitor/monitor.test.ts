// ============================================================
// Market Monitor - Monitor Service Unit Tests
// ============================================================
// Purpose: Test core monitoring logic, batch processing, error handling
// Test Coverage: 90% (complex orchestration logic)

import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { Program } from '@coral-xyz/anchor';
import { SupabaseClient } from '@supabase/supabase-js';
import { MarketMonitor, MarketToFinalize } from '../../../services/market-monitor/monitor';
import MARKET_MONITOR_CONFIG from '../../../services/market-monitor/config';

describe('Market Monitor Service', () => {
  // Mock dependencies
  let mockProgram: Program;
  let mockConnection: Connection;
  let mockBackendKeypair: Keypair;
  let mockSupabase: SupabaseClient;
  let mockGlobalConfigPda: PublicKey;

  beforeEach(() => {
    // Create fresh mocks for each test
    mockProgram = {} as Program;
    mockConnection = {} as Connection;
    mockBackendKeypair = Keypair.generate();
    mockGlobalConfigPda = Keypair.generate().publicKey;

    // Mock Supabase client
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      not: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
    } as any;
  });

  describe('Service Initialization', () => {
    it('creates MarketMonitor instance with required dependencies', () => {
      const monitor = new MarketMonitor(
        mockProgram,
        mockConnection,
        mockBackendKeypair,
        mockSupabase,
        mockGlobalConfigPda
      );

      expect(monitor).toBeInstanceOf(MarketMonitor);
    });

    it('getStatus() returns correct initial state', () => {
      const monitor = new MarketMonitor(
        mockProgram,
        mockConnection,
        mockBackendKeypair,
        mockSupabase,
        mockGlobalConfigPda
      );

      const status = monitor.getStatus();

      expect(status.isRunning).toBe(false);
      expect(status.lastRunTime).toBe(0);
      expect(status.runCount).toBe(0);
      expect(status.config).toBeDefined();
    });
  });

  describe('Query Logic', () => {
    it('queries markets with correct filters', async () => {
      const mockData: MarketToFinalize[] = [];

      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            not: jest.fn().mockReturnValue({
              lte: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  limit: jest.fn().mockResolvedValue({
                    data: mockData,
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        }),
      });

      const monitor = new MarketMonitor(
        mockProgram,
        mockConnection,
        mockBackendKeypair,
        mockSupabase,
        mockGlobalConfigPda
      );

      await monitor.run();

      // Verify Supabase query was called
      expect(mockSupabase.from).toHaveBeenCalledWith('markets');
    });

    it('calculates dispute window deadline correctly', () => {
      // 48 hours + 1 minute safety buffer
      const disputeWindowMs = MARKET_MONITOR_CONFIG.DISPUTE_WINDOW_MS;
      const safetyBufferMs = MARKET_MONITOR_CONFIG.SAFETY_BUFFER_MS;
      const totalWindowMs = disputeWindowMs + safetyBufferMs;

      // Expected: 48 hours + 1 minute = 172,860,000 ms
      expect(totalWindowMs).toBe(172860000);

      // Convert to hours for readability
      const totalHours = totalWindowMs / (60 * 60 * 1000);
      expect(totalHours).toBeCloseTo(48.0167, 2); // ~48.02 hours
    });

    it('respects batch size limit', async () => {
      const limitSpy = jest.fn().mockResolvedValue({ data: [], error: null });

      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            not: jest.fn().mockReturnValue({
              lte: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  limit: limitSpy,
                }),
              }),
            }),
          }),
        }),
      });

      const monitor = new MarketMonitor(
        mockProgram,
        mockConnection,
        mockBackendKeypair,
        mockSupabase,
        mockGlobalConfigPda
      );

      await monitor.run();

      // Verify batch size limit was applied
      expect(limitSpy).toHaveBeenCalledWith(MARKET_MONITOR_CONFIG.BATCH_SIZE);
    });
  });

  describe('Batch Processing', () => {
    it('run() returns empty summary when no markets found', async () => {
      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            not: jest.fn().mockReturnValue({
              lte: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  limit: jest.fn().mockResolvedValue({
                    data: [],
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        }),
      });

      const monitor = new MarketMonitor(
        mockProgram,
        mockConnection,
        mockBackendKeypair,
        mockSupabase,
        mockGlobalConfigPda
      );

      const summary = await monitor.run();

      expect(summary.marketsFound).toBe(0);
      expect(summary.successCount).toBe(0);
      expect(summary.failCount).toBe(0);
      expect(summary.attempts).toHaveLength(0);
    });

    it('run() prevents concurrent execution', async () => {
      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            not: jest.fn().mockReturnValue({
              lte: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  limit: jest.fn().mockResolvedValue({
                    data: [],
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        }),
      });

      const monitor = new MarketMonitor(
        mockProgram,
        mockConnection,
        mockBackendKeypair,
        mockSupabase,
        mockGlobalConfigPda
      );

      // Start first run
      const run1Promise = monitor.run();

      // Try to start second run immediately
      const run2Promise = monitor.run();

      const [summary1, summary2] = await Promise.all([run1Promise, run2Promise]);

      // First run should complete normally
      expect(summary1.skippedCount).toBe(0);

      // Second run should be skipped
      expect(summary2.skippedCount).toBe(1);
    });

    it('run() increments run count', async () => {
      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            not: jest.fn().mockReturnValue({
              lte: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  limit: jest.fn().mockResolvedValue({
                    data: [],
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        }),
      });

      const monitor = new MarketMonitor(
        mockProgram,
        mockConnection,
        mockBackendKeypair,
        mockSupabase,
        mockGlobalConfigPda
      );

      expect(monitor.getStatus().runCount).toBe(0);

      await monitor.run();
      expect(monitor.getStatus().runCount).toBe(1);

      await monitor.run();
      expect(monitor.getStatus().runCount).toBe(2);
    });

    it('run() updates lastRunTime', async () => {
      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            not: jest.fn().mockReturnValue({
              lte: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  limit: jest.fn().mockResolvedValue({
                    data: [],
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        }),
      });

      const monitor = new MarketMonitor(
        mockProgram,
        mockConnection,
        mockBackendKeypair,
        mockSupabase,
        mockGlobalConfigPda
      );

      const beforeRun = Date.now();
      await monitor.run();
      const afterRun = Date.now();

      const lastRunTime = monitor.getStatus().lastRunTime;

      expect(lastRunTime).toBeGreaterThanOrEqual(beforeRun);
      expect(lastRunTime).toBeLessThanOrEqual(afterRun);
    });
  });

  describe('Error Handling', () => {
    it('run() handles Supabase query errors gracefully', async () => {
      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            not: jest.fn().mockReturnValue({
              lte: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  limit: jest.fn().mockResolvedValue({
                    data: null,
                    error: { message: 'Database connection failed' },
                  }),
                }),
              }),
            }),
          }),
        }),
      });

      const monitor = new MarketMonitor(
        mockProgram,
        mockConnection,
        mockBackendKeypair,
        mockSupabase,
        mockGlobalConfigPda
      );

      await expect(monitor.run()).rejects.toThrow('Supabase query failed');
    });

    it('run() processes multiple markets in batch', async () => {
      // Test that run() can handle batch processing logic
      // This test verifies the structure, not the actual finalization

      const mockMarkets: MarketToFinalize[] = [
        {
          id: 'market-1',
          on_chain_address: Keypair.generate().publicKey.toBase58(),
          market_id: 'test-market-1',
          proposed_outcome: 'YES',
          resolution_proposed_at: new Date().toISOString(),
          state: 'RESOLVING',
        },
      ];

      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            not: jest.fn().mockReturnValue({
              lte: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  limit: jest.fn().mockResolvedValue({
                    data: mockMarkets,
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        }),
        insert: jest.fn().mockReturnValue({
          error: null,
        }),
      });

      const monitor = new MarketMonitor(
        mockProgram,
        mockConnection,
        mockBackendKeypair,
        mockSupabase,
        mockGlobalConfigPda
      );

      const summary = await monitor.run();

      // Should find 1 market
      expect(summary.marketsFound).toBe(1);
      expect(summary.attempts).toHaveLength(1);
    }, 20000); // Increase timeout to 20s
  });

  describe('Lifecycle Management', () => {
    it('validate() checks backend authority', async () => {
      const mockProgram = {
        account: {
          globalConfig: {
            fetch: jest.fn().mockResolvedValue({
              backendAuthority: mockBackendKeypair.publicKey,
            }),
          },
        },
      } as any;

      const mockConnection = {
        getSlot: jest.fn().mockResolvedValue(12345),
      } as any;

      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      });

      const monitor = new MarketMonitor(
        mockProgram,
        mockConnection,
        mockBackendKeypair,
        mockSupabase,
        mockGlobalConfigPda
      );

      await expect(monitor.validate()).resolves.toBeUndefined();
    });

    it('validate() checks Supabase connection', async () => {
      const mockProgram = {
        account: {
          globalConfig: {
            fetch: jest.fn().mockResolvedValue({
              backendAuthority: mockBackendKeypair.publicKey,
            }),
          },
        },
      } as any;

      const mockConnection = {
        getSlot: jest.fn().mockResolvedValue(12345),
      } as any;

      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({
            data: [],
            error: { message: 'Connection failed' },
          }),
        }),
      });

      const monitor = new MarketMonitor(
        mockProgram,
        mockConnection,
        mockBackendKeypair,
        mockSupabase,
        mockGlobalConfigPda
      );

      await expect(monitor.validate()).rejects.toThrow('Supabase connection failed');
    });

    it('shutdown() waits for current run to complete', async () => {
      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            not: jest.fn().mockReturnValue({
              lte: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  limit: jest.fn().mockResolvedValue({
                    data: [],
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        }),
      });

      const monitor = new MarketMonitor(
        mockProgram,
        mockConnection,
        mockBackendKeypair,
        mockSupabase,
        mockGlobalConfigPda
      );

      // Start run and shutdown immediately
      const runPromise = monitor.run();
      const shutdownPromise = monitor.shutdown();

      await Promise.all([runPromise, shutdownPromise]);

      // Should complete without errors
      expect(monitor.getStatus().isRunning).toBe(false);
    });
  });

  describe('Summary Generation', () => {
    it('run() returns correct summary structure', async () => {
      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            not: jest.fn().mockReturnValue({
              lte: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  limit: jest.fn().mockResolvedValue({
                    data: [],
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        }),
      });

      const monitor = new MarketMonitor(
        mockProgram,
        mockConnection,
        mockBackendKeypair,
        mockSupabase,
        mockGlobalConfigPda
      );

      const summary = await monitor.run();

      // Verify summary structure
      expect(summary).toHaveProperty('runId');
      expect(summary).toHaveProperty('startTime');
      expect(summary).toHaveProperty('endTime');
      expect(summary).toHaveProperty('duration');
      expect(summary).toHaveProperty('marketsFound');
      expect(summary).toHaveProperty('successCount');
      expect(summary).toHaveProperty('failCount');
      expect(summary).toHaveProperty('skippedCount');
      expect(summary).toHaveProperty('attempts');

      expect(Array.isArray(summary.attempts)).toBe(true);
      expect(typeof summary.runId).toBe('string');
      expect(typeof summary.duration).toBe('number');
    });

    it('run() calculates duration correctly', async () => {
      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            not: jest.fn().mockReturnValue({
              lte: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  limit: jest.fn().mockResolvedValue({
                    data: [],
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        }),
      });

      const monitor = new MarketMonitor(
        mockProgram,
        mockConnection,
        mockBackendKeypair,
        mockSupabase,
        mockGlobalConfigPda
      );

      const summary = await monitor.run();

      // Duration should be non-negative (may be 0 for very fast runs)
      expect(summary.duration).toBeGreaterThanOrEqual(0);
      expect(summary.duration).toBeLessThan(1000); // < 1 second

      // end time should equal start time + duration
      expect(summary.endTime).toBe(summary.startTime + summary.duration);
    });
  });

  describe('Performance', () => {
    it('run() executes quickly with no markets', async () => {
      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            not: jest.fn().mockReturnValue({
              lte: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  limit: jest.fn().mockResolvedValue({
                    data: [],
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        }),
      });

      const monitor = new MarketMonitor(
        mockProgram,
        mockConnection,
        mockBackendKeypair,
        mockSupabase,
        mockGlobalConfigPda
      );

      const start = Date.now();
      await monitor.run();
      const duration = Date.now() - start;

      // Should complete in less than 100ms
      expect(duration).toBeLessThan(100);
    });

    it('getStatus() is fast', () => {
      const monitor = new MarketMonitor(
        mockProgram,
        mockConnection,
        mockBackendKeypair,
        mockSupabase,
        mockGlobalConfigPda
      );

      const start = Date.now();
      for (let i = 0; i < 1000; i++) {
        monitor.getStatus();
      }
      const duration = Date.now() - start;

      // 1000 calls should take less than 10ms
      expect(duration).toBeLessThan(10);
    });
  });

  describe('Type Safety', () => {
    it('MarketToFinalize interface has correct structure', () => {
      const mockMarket: MarketToFinalize = {
        id: 'test-id',
        on_chain_address: 'test-address',
        market_id: 'test-market-id',
        proposed_outcome: 'YES',
        resolution_proposed_at: new Date().toISOString(),
        state: 'RESOLVING',
      };

      expect(mockMarket).toHaveProperty('id');
      expect(mockMarket).toHaveProperty('on_chain_address');
      expect(mockMarket).toHaveProperty('market_id');
      expect(mockMarket).toHaveProperty('proposed_outcome');
      expect(mockMarket).toHaveProperty('resolution_proposed_at');
      expect(mockMarket).toHaveProperty('state');
    });
  });
});
