/**
 * Test Wallet Manager
 *
 * Generates and manages test wallets for multi-user integration testing.
 * Handles wallet creation, funding, and balance tracking.
 */

import { Keypair, Connection, PublicKey, LAMPORTS_PER_SOL, Transaction, SystemProgram } from '@solana/web3.js';
import * as fs from 'fs';
import * as path from 'path';

export interface WalletInfo {
  keypair: Keypair;
  publicKey: PublicKey;
  balance: number;
  label: string;
}

export interface WalletManagerConfig {
  connection: Connection;
  fundingWallet?: Keypair; // Wallet to fund test wallets from
  defaultFundingAmount?: number; // In SOL
  walletStoragePath?: string; // Path to store wallet keypairs
}

export class TestWalletManager {
  private connection: Connection;
  private fundingWallet?: Keypair;
  private defaultFundingAmount: number;
  private walletStoragePath: string;
  private wallets: Map<string, WalletInfo> = new Map();

  constructor(config: WalletManagerConfig) {
    this.connection = config.connection;
    this.fundingWallet = config.fundingWallet;
    this.defaultFundingAmount = config.defaultFundingAmount || 10; // 10 SOL default
    this.walletStoragePath = config.walletStoragePath || path.join(__dirname, '../fixtures/test-wallets');

    // Ensure wallet storage directory exists
    if (!fs.existsSync(this.walletStoragePath)) {
      fs.mkdirSync(this.walletStoragePath, { recursive: true });
    }
  }

  /**
   * Create multiple test wallets
   * @param count Number of wallets to create
   * @param labels Optional labels for wallets
   * @returns Array of wallet info
   */
  async createWallets(count: number, labels?: string[]): Promise<WalletInfo[]> {
    console.log(`\n📝 Creating ${count} test wallets...`);

    const wallets: WalletInfo[] = [];

    for (let i = 0; i < count; i++) {
      const keypair = Keypair.generate();
      const label = labels?.[i] || `TestWallet${i + 1}`;

      const walletInfo: WalletInfo = {
        keypair,
        publicKey: keypair.publicKey,
        balance: 0,
        label,
      };

      wallets.push(walletInfo);
      this.wallets.set(label, walletInfo);

      // Save keypair to disk for persistence
      await this.saveWallet(walletInfo);
    }

    console.log(`✅ Created ${count} wallets`);
    return wallets;
  }

  /**
   * Fund test wallets with SOL
   * @param wallets Wallets to fund
   * @param amount Amount in SOL (optional, uses default if not specified)
   */
  async fundWallets(wallets: WalletInfo[], amount?: number): Promise<void> {
    const fundAmount = amount || this.defaultFundingAmount;
    console.log(`\n💰 Funding ${wallets.length} wallets with ${fundAmount} SOL each...`);

    for (const wallet of wallets) {
      try {
        // Try airdrop first (devnet only)
        await this.requestAirdrop(wallet.publicKey, fundAmount);
        console.log(`✅ Funded ${wallet.label}: ${fundAmount} SOL`);
      } catch (error: any) {
        console.log(`⚠️  Airdrop failed for ${wallet.label}, trying transfer...`);

        // Fallback: Transfer from funding wallet if available
        if (this.fundingWallet) {
          await this.transferFunds(this.fundingWallet, wallet.publicKey, fundAmount);
          console.log(`✅ Transferred to ${wallet.label}: ${fundAmount} SOL`);
        } else {
          throw new Error(`Cannot fund ${wallet.label}: Airdrop failed and no funding wallet provided`);
        }
      }

      // Update balance
      wallet.balance = await this.getBalance(wallet.publicKey);
    }

    console.log(`✅ All wallets funded successfully`);
  }

  /**
   * Request airdrop from devnet faucet
   * @param publicKey Wallet to receive airdrop
   * @param amount Amount in SOL
   */
  private async requestAirdrop(publicKey: PublicKey, amount: number): Promise<void> {
    const lamports = amount * LAMPORTS_PER_SOL;

    // Devnet has 2 SOL per airdrop limit, so we need multiple requests for larger amounts
    const maxAirdropPerRequest = 2;
    const requestCount = Math.ceil(amount / maxAirdropPerRequest);

    for (let i = 0; i < requestCount; i++) {
      const requestAmount = Math.min(maxAirdropPerRequest, amount - (i * maxAirdropPerRequest));
      const requestLamports = requestAmount * LAMPORTS_PER_SOL;

      const signature = await this.connection.requestAirdrop(publicKey, requestLamports);
      await this.connection.confirmTransaction(signature, 'confirmed');

      // Wait 1 second between airdrops to avoid rate limiting
      if (i < requestCount - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  /**
   * Transfer funds from one wallet to another
   * @param from Source wallet
   * @param to Destination public key
   * @param amount Amount in SOL
   */
  private async transferFunds(from: Keypair, to: PublicKey, amount: number): Promise<void> {
    const lamports = amount * LAMPORTS_PER_SOL;

    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: from.publicKey,
        toPubkey: to,
        lamports,
      })
    );

    const signature = await this.connection.sendTransaction(transaction, [from]);
    await this.connection.confirmTransaction(signature, 'confirmed');
  }

  /**
   * Get wallet balance
   * @param publicKey Wallet public key
   * @returns Balance in SOL
   */
  async getBalance(publicKey: PublicKey): Promise<number> {
    const lamports = await this.connection.getBalance(publicKey);
    return lamports / LAMPORTS_PER_SOL;
  }

  /**
   * Get balances for multiple wallets
   * @param wallets Array of wallet info
   * @returns Array of balances in SOL
   */
  async getBalances(wallets: WalletInfo[]): Promise<number[]> {
    const balances = await Promise.all(
      wallets.map(wallet => this.getBalance(wallet.publicKey))
    );

    // Update cached balances
    wallets.forEach((wallet, i) => {
      wallet.balance = balances[i];
    });

    return balances;
  }

  /**
   * Display wallet balances
   * @param wallets Wallets to display
   */
  async displayBalances(wallets: WalletInfo[]): Promise<void> {
    console.log('\n📊 Wallet Balances:');
    console.log('─────────────────────────────────────────');

    await this.getBalances(wallets);

    for (const wallet of wallets) {
      console.log(`${wallet.label.padEnd(20)} ${wallet.balance.toFixed(4)} SOL`);
    }

    const totalBalance = wallets.reduce((sum, w) => sum + w.balance, 0);
    console.log('─────────────────────────────────────────');
    console.log(`${'TOTAL'.padEnd(20)} ${totalBalance.toFixed(4)} SOL\n`);
  }

  /**
   * Save wallet keypair to disk
   * @param wallet Wallet info to save
   */
  private async saveWallet(wallet: WalletInfo): Promise<void> {
    const filename = `${wallet.label}.json`;
    const filepath = path.join(this.walletStoragePath, filename);

    const keypairData = {
      publicKey: wallet.publicKey.toString(),
      secretKey: Array.from(wallet.keypair.secretKey),
      label: wallet.label,
    };

    fs.writeFileSync(filepath, JSON.stringify(keypairData, null, 2));
  }

  /**
   * Load wallet from disk
   * @param label Wallet label
   * @returns Wallet info
   */
  async loadWallet(label: string): Promise<WalletInfo | null> {
    const filename = `${label}.json`;
    const filepath = path.join(this.walletStoragePath, filename);

    if (!fs.existsSync(filepath)) {
      return null;
    }

    const data = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
    const keypair = Keypair.fromSecretKey(new Uint8Array(data.secretKey));
    const balance = await this.getBalance(keypair.publicKey);

    const walletInfo: WalletInfo = {
      keypair,
      publicKey: keypair.publicKey,
      balance,
      label: data.label,
    };

    this.wallets.set(label, walletInfo);
    return walletInfo;
  }

  /**
   * Load all wallets from disk
   * @returns Array of wallet info
   */
  async loadAllWallets(): Promise<WalletInfo[]> {
    const files = fs.readdirSync(this.walletStoragePath).filter(f => f.endsWith('.json'));
    const wallets: WalletInfo[] = [];

    for (const file of files) {
      const label = file.replace('.json', '');
      const wallet = await this.loadWallet(label);
      if (wallet) {
        wallets.push(wallet);
      }
    }

    console.log(`✅ Loaded ${wallets.length} wallets from disk`);
    return wallets;
  }

  /**
   * Get wallet by label
   * @param label Wallet label
   * @returns Wallet info or undefined
   */
  getWallet(label: string): WalletInfo | undefined {
    return this.wallets.get(label);
  }

  /**
   * Get all managed wallets
   * @returns Array of all wallet info
   */
  getAllWallets(): WalletInfo[] {
    return Array.from(this.wallets.values());
  }

  /**
   * Clear all wallets from storage
   */
  clearWallets(): void {
    const files = fs.readdirSync(this.walletStoragePath);
    for (const file of files) {
      if (file.endsWith('.json')) {
        fs.unlinkSync(path.join(this.walletStoragePath, file));
      }
    }
    this.wallets.clear();
    console.log('✅ Cleared all test wallets');
  }

  /**
   * Generate user labels for testing
   * @param count Number of labels
   * @param prefix Label prefix
   * @returns Array of labels
   */
  static generateLabels(count: number, prefix: string = 'User'): string[] {
    return Array.from({ length: count }, (_, i) => `${prefix}${i + 1}`);
  }
}

/**
 * Create a test wallet manager instance
 * @param connection Solana connection
 * @param fundingWallet Optional funding wallet
 * @returns Configured wallet manager
 */
export function createTestWalletManager(
  connection: Connection,
  fundingWallet?: Keypair
): TestWalletManager {
  return new TestWalletManager({
    connection,
    fundingWallet,
    defaultFundingAmount: 10, // 10 SOL per wallet
  });
}

/**
 * Quick setup: Create and fund test wallets
 * @param connection Solana connection
 * @param count Number of wallets
 * @param fundingAmount Amount to fund each wallet (SOL)
 * @returns Array of funded wallet info
 */
export async function setupTestWallets(
  connection: Connection,
  count: number,
  fundingAmount: number = 10
): Promise<WalletInfo[]> {
  const manager = createTestWalletManager(connection);

  // Generate labels
  const labels = TestWalletManager.generateLabels(count, 'TestUser');

  // Create wallets
  const wallets = await manager.createWallets(count, labels);

  // Fund wallets
  await manager.fundWallets(wallets, fundingAmount);

  // Display balances
  await manager.displayBalances(wallets);

  return wallets;
}
