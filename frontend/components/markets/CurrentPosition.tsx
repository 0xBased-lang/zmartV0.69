'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { useUserPositionWithStatus, calculatePositionPnL, formatPosition } from '@/lib/hooks/useUserPosition';
import { useMarketState } from '@/lib/hooks/useMarketState';
import { calculatePrices } from '@/lib/lmsr';

interface CurrentPositionProps {
  marketId: string;
}

/**
 * Display user's current position in this market
 * Shows shares owned, average price, and P&L
 */
export function CurrentPosition({ marketId }: CurrentPositionProps) {
  const { connected } = useWallet();

  // Fetch real position data
  const { position, hasPosition, isLoading: isLoadingPosition } = useUserPositionWithStatus(marketId);

  // Fetch market state for current prices
  const { data: marketState, isLoading: isLoadingMarket } = useMarketState(marketId);

  // Don't show if wallet not connected or no position
  if (!connected || !hasPosition) {
    return null;
  }

  // Show loading state
  if (isLoadingPosition || isLoadingMarket) {
    return (
      <div className="bg-surface-card rounded-lg shadow-glow border border-border-default p-6">
        <h2 className="text-xl font-display font-bold text-text-primary mb-4">Your Position</h2>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary"></div>
        </div>
      </div>
    );
  }

  // Can't calculate P&L without market state
  if (!marketState || !position) {
    return null;
  }

  // Calculate current prices
  const prices = calculatePrices(marketState);
  const currentYesPrice = prices.yesPrice / 100; // Convert from percentage to 0-1 range
  const currentNoPrice = prices.noPrice / 100;

  // Calculate P&L
  const pnl = calculatePositionPnL(position, currentYesPrice, currentNoPrice);

  // Format position for display
  const formatted = formatPosition(position);

  // Calculate average price per share (in percentage)
  const totalInvestedLamports = Number(position.totalInvested);
  const DECIMALS = 1_000_000_000; // 9 decimals
  const sharesYesNum = Number(position.sharesYes) / DECIMALS;
  const sharesNoNum = Number(position.sharesNo) / DECIMALS;

  // Average prices (simplified - total invested / shares)
  // Note: This is approximate since we don't track individual trade prices
  const yesAvgPrice = sharesYesNum > 0
    ? ((totalInvestedLamports / 1_000_000_000) / (sharesYesNum + sharesNoNum)) * (sharesYesNum / (sharesYesNum + sharesNoNum)) * 100
    : 0;
  const noAvgPrice = sharesNoNum > 0
    ? ((totalInvestedLamports / 1_000_000_000) / (sharesYesNum + sharesNoNum)) * (sharesNoNum / (sharesYesNum + sharesNoNum)) * 100
    : 0;

  return (
    <div className="bg-surface-card rounded-lg shadow-glow border border-border-default p-6">
      <h2 className="text-xl font-display font-bold text-text-primary mb-4">Your Position</h2>

      {/* YES Position */}
      {sharesYesNum > 0 && (
        <div className="mb-4 p-4 bg-trading-yes/10 border border-trading-yes/20 rounded-lg">
          <div className="flex justify-between items-start mb-2">
            <span className="text-sm font-semibold text-trading-yes">
              YES Shares
            </span>
            <span className="text-lg font-bold text-trading-yes">
              {formatted.sharesYes}
            </span>
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-text-tertiary">Avg Price:</span>
              <span className="font-medium text-text-primary">
                {yesAvgPrice.toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-tertiary">Current Price:</span>
              <span className="font-medium text-text-primary">
                {prices.yesPrice.toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between border-t border-border-subtle pt-1 mt-1">
              <span className="text-text-tertiary">Value:</span>
              <span className="font-medium text-text-primary">
                {(Number(pnl.currentValue) / 1_000_000_000).toFixed(4)} SOL
              </span>
            </div>
          </div>
        </div>
      )}

      {/* NO Position */}
      {sharesNoNum > 0 && (
        <div className="mb-4 p-4 bg-trading-no/10 border border-trading-no/20 rounded-lg">
          <div className="flex justify-between items-start mb-2">
            <span className="text-sm font-semibold text-trading-no">
              NO Shares
            </span>
            <span className="text-lg font-bold text-trading-no">
              {formatted.sharesNo}
            </span>
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-text-tertiary">Avg Price:</span>
              <span className="font-medium text-text-primary">
                {noAvgPrice.toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-tertiary">Current Price:</span>
              <span className="font-medium text-text-primary">
                {prices.noPrice.toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between border-t border-border-subtle pt-1 mt-1">
              <span className="text-text-tertiary">Value:</span>
              <span className="font-medium text-text-primary">
                {(Number(pnl.currentValue) / 1_000_000_000).toFixed(4)} SOL
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Total Summary */}
      <div className="pt-4 border-t border-border-default space-y-2">
        {/* Total Invested */}
        <div className="flex justify-between items-center text-sm">
          <span className="text-text-secondary">Total Invested:</span>
          <span className="font-medium text-text-primary">
            {formatted.totalInvested} SOL
          </span>
        </div>

        {/* Current Value */}
        <div className="flex justify-between items-center text-sm">
          <span className="text-text-secondary">Current Value:</span>
          <span className="font-medium text-text-primary">
            {(Number(pnl.currentValue) / 1_000_000_000).toFixed(4)} SOL
          </span>
        </div>

        {/* Unrealized P&L */}
        <div className="flex justify-between items-center pt-2 border-t border-border-subtle">
          <span className="text-sm font-medium text-text-secondary">
            Unrealized P&L:
          </span>
          <div className="text-right">
            <div
              className={`text-xl font-bold ${
                pnl.unrealizedPnL >= 0n ? 'text-trading-yes' : 'text-trading-no'
              }`}
            >
              {pnl.unrealizedPnL >= 0n ? '+' : ''}
              {(Number(pnl.unrealizedPnL) / 1_000_000_000).toFixed(4)} SOL
            </div>
            <div
              className={`text-sm ${
                pnl.roi >= 0 ? 'text-trading-yes' : 'text-trading-no'
              }`}
            >
              ({pnl.roi >= 0 ? '+' : ''}
              {pnl.roi.toFixed(2)}%)
            </div>
          </div>
        </div>
      </div>

      {/* Trade Stats */}
      <div className="mt-4 pt-4 border-t border-border-subtle">
        <div className="flex justify-between items-center text-xs text-text-tertiary">
          <span>Trades: {position.tradesCount}</span>
          <span>
            Last: {new Date(position.lastTradeAt * 1000).toLocaleDateString()}
          </span>
        </div>
      </div>
    </div>
  );
}
