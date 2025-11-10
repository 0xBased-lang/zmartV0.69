/**
 * Concurrent Transaction Executor
 *
 * Executes Solana transactions in parallel with conflict resolution,
 * retry logic, and performance monitoring.
 */

import {
  Connection,
  Transaction,
  Keypair,
  SendTransactionError,
  TransactionSignature,
  Commitment,
  TransactionInstruction,
} from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';

export interface TransactionTask {
  id: string;
  instruction: TransactionInstruction | TransactionInstruction[];
  signers: Keypair[];
  description?: string;
}

export interface TransactionResult {
  id: string;
  signature?: TransactionSignature;
  success: boolean;
  error?: Error;
  duration: number; // milliseconds
  retries: number;
  description?: string;
}

export interface ExecutionMetrics {
  totalTransactions: number;
  successfulTransactions: number;
  failedTransactions: number;
  successRate: number;
  averageDuration: number;
  p95Duration: number;
  p99Duration: number;
  totalDuration: number;
  throughput: number; // TPS
}

export interface ConcurrentExecutorConfig {
  connection: Connection;
  commitment?: Commitment;
  maxRetries?: number;
  retryDelay?: number; // milliseconds
  batchSize?: number; // Max concurrent transactions
  priorityFee?: number; // lamports
}

export class ConcurrentExecutor {
  private connection: Connection;
  private commitment: Commitment;
  private maxRetries: number;
  private retryDelay: number;
  private batchSize: number;
  private priorityFee: number;
  private results: TransactionResult[] = [];

  constructor(config: ConcurrentExecutorConfig) {
    this.connection = config.connection;
    this.commitment = config.commitment || 'confirmed';
    this.maxRetries = config.maxRetries || 3;
    this.retryDelay = config.retryDelay || 1000;
    this.batchSize = config.batchSize || 25;
    this.priorityFee = config.priorityFee || 0;
  }

  /**
   * Execute transactions concurrently
   * @param tasks Array of transaction tasks
   * @returns Array of transaction results
   */
  async executeConcurrent(tasks: TransactionTask[]): Promise<TransactionResult[]> {
    console.log(`\n🚀 Executing ${tasks.length} transactions concurrently...`);
    console.log(`   Batch size: ${this.batchSize}`);
    console.log(`   Max retries: ${this.maxRetries}`);
    console.log(`   Commitment: ${this.commitment}\n`);

    const startTime = Date.now();
    const results: TransactionResult[] = [];

    // Process tasks in batches to avoid overwhelming the RPC
    for (let i = 0; i < tasks.length; i += this.batchSize) {
      const batch = tasks.slice(i, i + this.batchSize);
      console.log(`   Processing batch ${Math.floor(i / this.batchSize) + 1}/${Math.ceil(tasks.length / this.batchSize)} (${batch.length} txs)...`);

      // Execute batch concurrently
      const batchResults = await Promise.all(
        batch.map(task => this.executeWithRetry(task))
      );

      results.push(...batchResults);

      // Log batch results
      const batchSuccessCount = batchResults.filter(r => r.success).length;
      console.log(`   ✅ Batch complete: ${batchSuccessCount}/${batchResults.length} successful\n`);

      // Small delay between batches to avoid rate limiting
      if (i + this.batchSize < tasks.length) {
        await this.sleep(500);
      }
    }

    const endTime = Date.now();
    const totalDuration = endTime - startTime;

    // Store results for metrics
    this.results.push(...results);

    // Log summary
    const successCount = results.filter(r => r.success).length;
    console.log(`✅ All transactions complete: ${successCount}/${results.length} successful`);
    console.log(`   Total duration: ${(totalDuration / 1000).toFixed(2)}s`);
    console.log(`   Throughput: ${(results.length / (totalDuration / 1000)).toFixed(2)} TPS\n`);

    return results;
  }

  /**
   * Execute single transaction with retry logic
   * @param task Transaction task
   * @returns Transaction result
   */
  async executeWithRetry(task: TransactionTask): Promise<TransactionResult> {
    const startTime = Date.now();
    let retries = 0;
    let lastError: Error | undefined;

    while (retries <= this.maxRetries) {
      try {
        // Build transaction
        const transaction = new Transaction();

        // Add priority fee if specified
        if (this.priorityFee > 0) {
          transaction.add(
            anchor.web3.ComputeBudgetProgram.setComputeUnitPrice({
              microLamports: this.priorityFee,
            })
          );
        }

        // Add instructions
        if (Array.isArray(task.instruction)) {
          transaction.add(...task.instruction);
        } else {
          transaction.add(task.instruction);
        }

        // Get recent blockhash
        const { blockhash } = await this.connection.getLatestBlockhash(this.commitment);
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = task.signers[0].publicKey;

        // Sign transaction
        transaction.sign(...task.signers);

        // Send transaction
        const signature = await this.connection.sendRawTransaction(
          transaction.serialize(),
          {
            skipPreflight: false,
            preflightCommitment: this.commitment,
          }
        );

        // Confirm transaction
        await this.connection.confirmTransaction(signature, this.commitment);

        // Success!
        const duration = Date.now() - startTime;
        return {
          id: task.id,
          signature,
          success: true,
          duration,
          retries,
          description: task.description,
        };

      } catch (error: any) {
        lastError = error;
        retries++;

        // Log retry
        if (retries <= this.maxRetries) {
          console.log(`   ⚠️  Transaction ${task.id} failed (attempt ${retries}), retrying...`);
          await this.sleep(this.retryDelay * retries); // Exponential backoff
        }
      }
    }

    // Failed after all retries
    const duration = Date.now() - startTime;
    console.log(`   ❌ Transaction ${task.id} failed after ${retries} retries: ${lastError?.message}`);

    return {
      id: task.id,
      success: false,
      error: lastError,
      duration,
      retries: retries - 1,
      description: task.description,
    };
  }

  /**
   * Execute single transaction (no retry)
   * @param task Transaction task
   * @returns Transaction result
   */
  async executeSingle(task: TransactionTask): Promise<TransactionResult> {
    // Temporarily set maxRetries to 0 for single execution
    const originalMaxRetries = this.maxRetries;
    this.maxRetries = 0;

    const result = await this.executeWithRetry(task);

    // Restore original maxRetries
    this.maxRetries = originalMaxRetries;

    return result;
  }

  /**
   * Calculate execution metrics
   * @param results Optional array of results (uses stored results if not provided)
   * @returns Execution metrics
   */
  calculateMetrics(results?: TransactionResult[]): ExecutionMetrics {
    const data = results || this.results;

    if (data.length === 0) {
      return {
        totalTransactions: 0,
        successfulTransactions: 0,
        failedTransactions: 0,
        successRate: 0,
        averageDuration: 0,
        p95Duration: 0,
        p99Duration: 0,
        totalDuration: 0,
        throughput: 0,
      };
    }

    const successful = data.filter(r => r.success);
    const failed = data.filter(r => !r.success);

    // Calculate durations
    const durations = data.map(r => r.duration).sort((a, b) => a - b);
    const totalDuration = durations.reduce((sum, d) => sum + d, 0);
    const averageDuration = totalDuration / data.length;

    // Calculate percentiles
    const p95Index = Math.floor(durations.length * 0.95);
    const p99Index = Math.floor(durations.length * 0.99);
    const p95Duration = durations[p95Index] || 0;
    const p99Duration = durations[p99Index] || 0;

    // Calculate throughput (transactions per second)
    const throughput = data.length / (totalDuration / 1000);

    return {
      totalTransactions: data.length,
      successfulTransactions: successful.length,
      failedTransactions: failed.length,
      successRate: successful.length / data.length,
      averageDuration,
      p95Duration,
      p99Duration,
      totalDuration,
      throughput,
    };
  }

  /**
   * Display execution metrics
   * @param results Optional array of results
   */
  displayMetrics(results?: TransactionResult[]): void {
    const metrics = this.calculateMetrics(results);

    console.log('\n📊 Execution Metrics:');
    console.log('─────────────────────────────────────────');
    console.log(`Total Transactions:     ${metrics.totalTransactions}`);
    console.log(`Successful:             ${metrics.successfulTransactions} (${(metrics.successRate * 100).toFixed(2)}%)`);
    console.log(`Failed:                 ${metrics.failedTransactions}`);
    console.log('─────────────────────────────────────────');
    console.log(`Average Duration:       ${metrics.averageDuration.toFixed(2)} ms`);
    console.log(`P95 Duration:           ${metrics.p95Duration.toFixed(2)} ms`);
    console.log(`P99 Duration:           ${metrics.p99Duration.toFixed(2)} ms`);
    console.log(`Total Duration:         ${(metrics.totalDuration / 1000).toFixed(2)} s`);
    console.log(`Throughput:             ${metrics.throughput.toFixed(2)} TPS`);
    console.log('─────────────────────────────────────────\n');
  }

  /**
   * Check if metrics meet success thresholds
   * @param minSuccessRate Minimum success rate (0-1)
   * @param maxAvgLatency Maximum average latency (ms)
   * @param maxP95Latency Maximum P95 latency (ms)
   * @returns True if all thresholds met
   */
  validateMetrics(
    minSuccessRate: number = 0.95,
    maxAvgLatency: number = 5000,
    maxP95Latency: number = 10000
  ): boolean {
    const metrics = this.calculateMetrics();

    console.log('\n✅ Validating Metrics Against Thresholds:');
    console.log('─────────────────────────────────────────');

    const successRatePass = metrics.successRate >= minSuccessRate;
    console.log(`Success Rate:  ${(metrics.successRate * 100).toFixed(2)}% ${successRatePass ? '✅' : '❌'} (>= ${(minSuccessRate * 100).toFixed(0)}%)`);

    const avgLatencyPass = metrics.averageDuration <= maxAvgLatency;
    console.log(`Avg Latency:   ${metrics.averageDuration.toFixed(2)} ms ${avgLatencyPass ? '✅' : '❌'} (<= ${maxAvgLatency} ms)`);

    const p95LatencyPass = metrics.p95Duration <= maxP95Latency;
    console.log(`P95 Latency:   ${metrics.p95Duration.toFixed(2)} ms ${p95LatencyPass ? '✅' : '❌'} (<= ${maxP95Latency} ms)`);

    console.log('─────────────────────────────────────────\n');

    return successRatePass && avgLatencyPass && p95LatencyPass;
  }

  /**
   * Get all results
   * @returns Array of transaction results
   */
  getResults(): TransactionResult[] {
    return this.results;
  }

  /**
   * Get failed results
   * @returns Array of failed transaction results
   */
  getFailedResults(): TransactionResult[] {
    return this.results.filter(r => !r.success);
  }

  /**
   * Clear stored results
   */
  clearResults(): void {
    this.results = [];
  }

  /**
   * Sleep helper
   * @param ms Milliseconds to sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Create a concurrent executor instance
 * @param connection Solana connection
 * @param maxRetries Maximum retry attempts
 * @param batchSize Maximum concurrent transactions
 * @returns Configured concurrent executor
 */
export function createConcurrentExecutor(
  connection: Connection,
  maxRetries: number = 3,
  batchSize: number = 25
): ConcurrentExecutor {
  return new ConcurrentExecutor({
    connection,
    commitment: 'confirmed',
    maxRetries,
    retryDelay: 1000,
    batchSize,
  });
}
