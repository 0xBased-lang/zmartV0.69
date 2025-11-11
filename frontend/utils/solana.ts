/**
 * Solana Utility Functions
 * Version: 0.69.0
 * Last Updated: November 9, 2025
 *
 * Production-ready utilities for Solana blockchain operations including:
 * - Lamports ↔ SOL conversion
 * - Price formatting
 * - Wallet address formatting
 * - Transaction signature formatting
 */

// Imports
import { isValidDate } from '@/lib/utils/date-formatter';

// Constants
export const LAMPORTS_PER_SOL = 1_000_000_000; // 1 SOL = 1 billion lamports
export const DECIMALS = 9; // Solana uses 9 decimals

/**
 * Convert lamports to SOL
 * @param lamports - Amount in lamports (can be string, number, or BigInt)
 * @returns Amount in SOL as a number
 * @example
 * lamportsToSol("50000000") // 0.05
 * lamportsToSol(1000000000) // 1.0
 */
export function lamportsToSol(lamports: string | number | bigint): number {
  if (typeof lamports === 'string') {
    return Number(BigInt(lamports)) / LAMPORTS_PER_SOL;
  }

  if (typeof lamports === 'bigint') {
    return Number(lamports) / LAMPORTS_PER_SOL;
  }

  return lamports / LAMPORTS_PER_SOL;
}

/**
 * Convert SOL to lamports
 * @param sol - Amount in SOL
 * @returns Amount in lamports (safe integer, NOT BigInt)
 * @example
 * solToLamports(0.05) // 50000000
 * solToLamports(1.5) // 1500000000
 */
export function solToLamports(sol: number): number {
  return Math.floor(sol * LAMPORTS_PER_SOL);
}

/**
 * Convert SOL to lamports as BigInt (for large numbers)
 * @param sol - Amount in SOL
 * @returns Amount in lamports as BigInt
 * @example
 * solToLamportsBigInt(1000000) // 1000000000000000n
 */
export function solToLamportsBigInt(sol: number): bigint {
  return BigInt(Math.floor(sol * LAMPORTS_PER_SOL));
}

/**
 * Format lamports as SOL string for UI display
 * @param lamports - Amount in lamports
 * @param decimals - Number of decimals to display (default: 4)
 * @returns Formatted string with SOL suffix
 * @example
 * formatSol("50000000") // "0.0500 SOL"
 * formatSol(1000000000, 2) // "1.00 SOL"
 */
export function formatSol(lamports: string | number | bigint, decimals: number = 4): string {
  const sol = lamportsToSol(lamports);
  return `${sol.toFixed(decimals)} SOL`;
}

/**
 * Format lamports as SOL number (no suffix)
 * @param lamports - Amount in lamports
 * @param decimals - Number of decimals to display (default: 4)
 * @returns Formatted number string
 * @example
 * formatSolNumber("50000000") // "0.0500"
 * formatSolNumber(1000000000, 2) // "1.00"
 */
export function formatSolNumber(lamports: string | number | bigint, decimals: number = 4): string {
  const sol = lamportsToSol(lamports);
  return sol.toFixed(decimals);
}

/**
 * Format lamports with automatic precision (removes trailing zeros)
 * @param lamports - Amount in lamports
 * @returns Formatted string with SOL suffix
 * @example
 * formatSolCompact("50000000") // "0.05 SOL"
 * formatSolCompact(1000000000) // "1 SOL"
 * formatSolCompact(1500000000) // "1.5 SOL"
 */
export function formatSolCompact(lamports: string | number | bigint): string {
  const sol = lamportsToSol(lamports);

  // Remove trailing zeros
  const formatted = sol.toFixed(9).replace(/\.?0+$/, '');

  return `${formatted} SOL`;
}

/**
 * Format large SOL amounts with K/M/B suffixes
 * @param lamports - Amount in lamports
 * @returns Formatted string with suffix
 * @example
 * formatSolLarge(5000000000000) // "5K SOL"
 * formatSolLarge(1500000000000000) // "1.5M SOL"
 */
export function formatSolLarge(lamports: string | number | bigint): string {
  const sol = lamportsToSol(lamports);

  if (sol >= 1_000_000_000) {
    return `${(sol / 1_000_000_000).toFixed(2)}B SOL`;
  }

  if (sol >= 1_000_000) {
    return `${(sol / 1_000_000).toFixed(2)}M SOL`;
  }

  if (sol >= 1_000) {
    return `${(sol / 1_000).toFixed(2)}K SOL`;
  }

  return formatSolCompact(lamports);
}

/**
 * Format wallet address (truncated)
 * @param address - Full wallet address
 * @param chars - Number of chars to show on each side (default: 4)
 * @returns Truncated address
 * @example
 * formatAddress("4WQwPjKHu3x7dHBEehBDgxXHJQoDuBvj6Xhu6C1jjTye") // "4WQw...jTye"
 * formatAddress("4WQwPjKHu3x7dHBEehBDgxXHJQoDuBvj6Xhu6C1jjTye", 6) // "4WQwPj...C1jjTye"
 */
export function formatAddress(address: string, chars: number = 4): string {
  if (!address) return '';
  if (address.length <= chars * 2 + 3) return address; // Too short to truncate

  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

/**
 * Format transaction signature (truncated)
 * @param signature - Full transaction signature
 * @param chars - Number of chars to show on each side (default: 8)
 * @returns Truncated signature
 * @example
 * formatSignature("5YNmS1R9nNSCDzivdhG4t4JZxKS6yhZBbHf3z6FVMnVPmZJrPG7...") // "5YNmS1R9...rPG7"
 */
export function formatSignature(signature: string, chars: number = 8): string {
  return formatAddress(signature, chars);
}

/**
 * Validate Solana address format
 * @param address - Address to validate
 * @returns true if valid Solana address format
 * @example
 * isValidAddress("4WQwPjKHu3x7dHBEehBDgxXHJQoDuBvj6Xhu6C1jjTye") // true
 * isValidAddress("invalid") // false
 */
export function isValidAddress(address: string): boolean {
  // Solana addresses are base58 encoded, 32-44 characters
  const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
  return base58Regex.test(address);
}

/**
 * Format percentage with % symbol
 * @param value - Percentage value (0-1 or 0-100)
 * @param decimals - Number of decimals (default: 2)
 * @param isDecimal - Whether value is in decimal form 0-1 (default: true)
 * @returns Formatted percentage string
 * @example
 * formatPercentage(0.525) // "52.50%"
 * formatPercentage(52.5, 2, false) // "52.50%"
 */
export function formatPercentage(value: number, decimals: number = 2, isDecimal: boolean = true): string {
  const percentage = isDecimal ? value * 100 : value;
  return `${percentage.toFixed(decimals)}%`;
}

/**
 * Format shares count (handles large numbers)
 * @param shares - Number of shares (can be string or number)
 * @param decimals - Number of decimals (default: 0 for whole numbers)
 * @returns Formatted shares string
 * @example
 * formatShares("15") // "15"
 * formatShares(1000000) // "1,000,000"
 */
export function formatShares(shares: string | number, decimals: number = 0): string {
  const num = typeof shares === 'string' ? Number(shares) : shares;

  if (decimals > 0) {
    return num.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  return num.toLocaleString('en-US');
}

/**
 * Calculate slippage protection for buy trades
 * @param estimatedCost - Estimated cost in lamports
 * @param slippagePercent - Slippage tolerance percentage (default: 5)
 * @returns Maximum cost in lamports
 * @example
 * calculateMaxCost(50000000, 5) // 52500000 (5% more)
 * calculateMaxCost(50000000, 1) // 50500000 (1% more)
 */
export function calculateMaxCost(estimatedCost: number, slippagePercent: number = 5): number {
  return Math.floor(estimatedCost * (1 + slippagePercent / 100));
}

/**
 * Calculate slippage protection for sell trades
 * @param estimatedPayout - Estimated payout in lamports
 * @param slippagePercent - Slippage tolerance percentage (default: 5)
 * @returns Minimum payout in lamports
 * @example
 * calculateMinPayout(50000000, 5) // 47500000 (5% less)
 * calculateMinPayout(50000000, 1) // 49500000 (1% less)
 */
export function calculateMinPayout(estimatedPayout: number, slippagePercent: number = 5): number {
  return Math.floor(estimatedPayout * (1 - slippagePercent / 100));
}

/**
 * Parse lamports from string (handles BigInt strings)
 * @param lamportsStr - Lamports as string
 * @returns Lamports as safe integer number
 * @example
 * parseLamports("50000000") // 50000000
 */
export function parseLamports(lamportsStr: string): number {
  const value = BigInt(lamportsStr);
  if (value > BigInt(Number.MAX_SAFE_INTEGER)) {
    console.warn('[Solana] Lamports value exceeds MAX_SAFE_INTEGER:', lamportsStr);
  }
  return Number(value);
}

/**
 * Get Explorer URL for address/transaction
 * @param addressOrSignature - Wallet address or transaction signature
 * @param type - Type of entity ('address' or 'tx')
 * @param cluster - Solana cluster (default: from env)
 * @returns Solana Explorer URL
 * @example
 * getExplorerUrl("4WQwPj...", 'address') // "https://explorer.solana.com/address/4WQwPj...?cluster=devnet"
 * getExplorerUrl("5YNmS1...", 'tx') // "https://explorer.solana.com/tx/5YNmS1...?cluster=devnet"
 */
export function getExplorerUrl(
  addressOrSignature: string,
  type: 'address' | 'tx' = 'address',
  cluster?: string
): string {
  const clusterParam = cluster || process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'devnet';
  const clusterSuffix = clusterParam === 'mainnet-beta' ? '' : `?cluster=${clusterParam}`;

  return `https://explorer.solana.com/${type}/${addressOrSignature}${clusterSuffix}`;
}

/**
 * Format time ago from timestamp
 * @param timestamp - ISO 8601 timestamp or Date
 * @returns Human-readable time ago string
 * @example
 * formatTimeAgo("2025-11-09T12:00:00Z") // "5 minutes ago"
 */
export function formatTimeAgo(timestamp: string | Date): string {
  const now = new Date();
  const past = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  const diffMs = now.getTime() - past.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);

  if (diffSeconds < 60) return `${diffSeconds} seconds ago`;
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)} minutes ago`;
  if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)} hours ago`;
  if (diffSeconds < 2592000) return `${Math.floor(diffSeconds / 86400)} days ago`;
  if (diffSeconds < 31536000) return `${Math.floor(diffSeconds / 2592000)} months ago`;
  return `${Math.floor(diffSeconds / 31536000)} years ago`;
}

/**
 * Format date for display
 * @param timestamp - ISO 8601 timestamp or Date
 * @param format - Format type ('short' | 'long' | 'time')
 * @returns Formatted date string
 * @example
 * formatDate("2025-11-09T12:00:00Z", 'short') // "Nov 9, 2025"
 * formatDate("2025-11-09T12:00:00Z", 'long') // "November 9, 2025 at 12:00 PM"
 * formatDate("2025-11-09T12:00:00Z", 'time') // "12:00 PM"
 */
export function formatDate(timestamp: string | Date, format: 'short' | 'long' | 'time' = 'short'): string {
  // Validate date first
  if (!isValidDate(timestamp)) {
    return 'Invalid date';
  }

  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;

  if (format === 'time') {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }

  if (format === 'long') {
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  // short
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

/**
 * Copy text to clipboard
 * @param text - Text to copy
 * @returns Promise that resolves to true if successful
 * @example
 * copyToClipboard(wallet.publicKey.toBase58())
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('[Clipboard] Failed to copy:', error);
    return false;
  }
}

// Type exports
export type SolanaCluster = 'mainnet-beta' | 'devnet' | 'testnet' | 'localnet';

/**
 * Get RPC URL for cluster
 * @param cluster - Solana cluster
 * @returns RPC URL
 */
export function getRpcUrl(cluster: SolanaCluster = 'devnet'): string {
  const envRpc = process.env.NEXT_PUBLIC_SOLANA_RPC;
  if (envRpc) return envRpc;

  const urls: Record<SolanaCluster, string> = {
    'mainnet-beta': 'https://api.mainnet-beta.solana.com',
    'devnet': 'https://api.devnet.solana.com',
    'testnet': 'https://api.testnet.solana.com',
    'localnet': 'http://localhost:8899',
  };

  return urls[cluster];
}
