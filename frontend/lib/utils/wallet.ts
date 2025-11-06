/**
 * Truncate Solana address for display
 * @param address - Full Solana address
 * @param chars - Number of chars to show on each side (default: 4)
 * @returns Truncated address (e.g., "5XaB...nK2p")
 */
export function truncateAddress(address: string, chars: number = 4): string {
  if (!address) return '';
  if (address.length <= chars * 2 + 3) return address;

  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

/**
 * Validate Solana address format
 * @param address - Address to validate
 * @returns true if valid Solana address
 */
export function isValidSolanaAddress(address: string): boolean {
  // Solana addresses are 32-44 characters, base58 encoded
  const solanaAddressRegex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
  return solanaAddressRegex.test(address);
}

/**
 * Format SOL amount for display
 * @param lamports - Amount in lamports
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted SOL string
 */
export function formatSOL(lamports: number, decimals: number = 2): string {
  const sol = lamports / 1_000_000_000;
  return sol.toFixed(decimals);
}
