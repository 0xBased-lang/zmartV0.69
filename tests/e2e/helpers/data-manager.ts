/**
 * Test Data Manager for E2E Tests
 *
 * Organizes and saves all captured test data to structured directories
 * Provides consistent file paths and metadata tracking
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * Test data manager for organizing and saving captured data
 */
export class TestDataManager {
  private runId: string;
  private testName: string;
  private dataDir: string;
  private metadata: TestRunMetadata;

  constructor(testName: string, runId?: string) {
    this.runId = runId || new Date().toISOString().replace(/[:.]/g, '-');
    this.testName = this.sanitizeFilename(testName);
    this.dataDir = path.resolve(
      __dirname,
      `../../../test-data/runs/${this.runId}/tests/${this.testName}`
    );

    this.metadata = {
      runId: this.runId,
      testName,
      startTime: new Date().toISOString(),
      dataDirectory: this.dataDir,
    };

    this.ensureDirectoryExists();
    console.log(`💾 Test data manager initialized:`);
    console.log(`   Run ID: ${this.runId}`);
    console.log(`   Test: ${this.testName}`);
    console.log(`   Data Directory: ${this.dataDir}`);
  }

  /**
   * Sanitize filename to remove invalid characters
   */
  private sanitizeFilename(filename: string): string {
    return filename
      .replace(/[^a-z0-9]/gi, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase();
  }

  /**
   * Ensure data directory exists
   */
  private ensureDirectoryExists(): void {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  /**
   * Save data to a JSON file
   *
   * @param filename - Name of the file (without .json extension)
   * @param data - Data to save (will be JSON stringified)
   */
  async saveData(filename: string, data: any): Promise<void> {
    const sanitizedFilename = this.sanitizeFilename(filename);
    const filepath = path.join(this.dataDir, `${sanitizedFilename}.json`);

    try {
      await fs.promises.writeFile(
        filepath,
        JSON.stringify(data, null, 2),
        'utf-8'
      );
      console.log(`💾 Saved: ${sanitizedFilename}.json`);
    } catch (error) {
      console.error(`❌ Failed to save ${sanitizedFilename}.json:`, error);
      throw error;
    }
  }

  /**
   * Save screenshot to data directory
   *
   * @param screenshotPath - Path to source screenshot
   * @param label - Label for the screenshot
   */
  async saveScreenshot(screenshotPath: string, label: string): Promise<void> {
    const screenshotsDir = path.join(this.dataDir, 'screenshots');
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }

    const sanitizedLabel = this.sanitizeFilename(label);
    const destinationPath = path.join(
      screenshotsDir,
      `${sanitizedLabel}-${Date.now()}.png`
    );

    try {
      await fs.promises.copyFile(screenshotPath, destinationPath);
      console.log(`📸 Screenshot saved: ${sanitizedLabel}.png`);
    } catch (error) {
      console.error(`❌ Failed to save screenshot:`, error);
      throw error;
    }
  }

  /**
   * Save test summary with results and metadata
   */
  async saveSummary(summary: TestSummary): Promise<void> {
    const completeSummary = {
      ...this.metadata,
      endTime: new Date().toISOString(),
      duration: Date.now() - new Date(this.metadata.startTime).getTime(),
      ...summary,
    };

    await this.saveData('summary', completeSummary);
  }

  /**
   * Get data directory path
   */
  getDataPath(): string {
    return this.dataDir;
  }

  /**
   * Get run ID
   */
  getRunId(): string {
    return this.runId;
  }

  /**
   * Get test name
   */
  getTestName(): string {
    return this.testName;
  }

  /**
   * Load previously saved data
   *
   * @param filename - Name of the file (without .json extension)
   */
  async loadData(filename: string): Promise<any> {
    const sanitizedFilename = this.sanitizeFilename(filename);
    const filepath = path.join(this.dataDir, `${sanitizedFilename}.json`);

    try {
      const data = await fs.promises.readFile(filepath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      console.error(`❌ Failed to load ${sanitizedFilename}.json:`, error);
      throw error;
    }
  }

  /**
   * List all data files
   */
  async listDataFiles(): Promise<string[]> {
    try {
      const files = await fs.promises.readdir(this.dataDir);
      return files.filter(f => f.endsWith('.json'));
    } catch (error) {
      console.error('❌ Failed to list data files:', error);
      return [];
    }
  }

  /**
   * Create environment snapshot
   */
  static async captureEnvironment(): Promise<EnvironmentSnapshot> {
    return {
      timestamp: new Date().toISOString(),
      node: process.version,
      platform: process.platform,
      arch: process.arch,
      memory: {
        total: require('os').totalmem(),
        free: require('os').freemem(),
        used: process.memoryUsage().heapUsed,
      },
      cpus: require('os').cpus().length,
      env: {
        NODE_ENV: process.env.NODE_ENV || 'test',
        CI: process.env.CI || 'false',
      },
    };
  }

  /**
   * Save environment snapshot
   */
  async saveEnvironment(): Promise<void> {
    const env = await TestDataManager.captureEnvironment();
    await this.saveData('environment', env);
  }
}

/**
 * Test run metadata
 */
export interface TestRunMetadata {
  runId: string;
  testName: string;
  startTime: string;
  dataDirectory: string;
}

/**
 * Test summary
 */
export interface TestSummary {
  status: 'passed' | 'failed' | 'skipped';
  error?: {
    message: string;
    stack?: string;
  };
  metrics?: {
    totalDuration: number;
    networkRequests: number;
    rpcCalls: number;
    transactionCount: number;
  };
  artifacts?: {
    screenshots: number;
    logs: number;
    traces: number;
  };
}

/**
 * Environment snapshot
 */
export interface EnvironmentSnapshot {
  timestamp: string;
  node: string;
  platform: string;
  arch: string;
  memory: {
    total: number;
    free: number;
    used: number;
  };
  cpus: number;
  env: {
    NODE_ENV: string;
    CI: string;
  };
}

/**
 * Global data manager instance (can be used across tests)
 */
let globalDataManager: TestDataManager | null = null;

/**
 * Get or create global data manager
 */
export function getGlobalDataManager(testName?: string): TestDataManager {
  if (!globalDataManager && testName) {
    globalDataManager = new TestDataManager(testName);
  }

  if (!globalDataManager) {
    throw new Error('Global data manager not initialized. Provide testName first.');
  }

  return globalDataManager;
}

/**
 * Reset global data manager (useful between tests)
 */
export function resetGlobalDataManager(): void {
  globalDataManager = null;
}
