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
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Your Position</h2>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
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
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-4">Your Position</h2>

      {/* YES Position */}
      {sharesYesNum > 0 && (
        <div className="mb-4 p-4 bg-green-50 rounded-lg">
          <div className="flex justify-between items-start mb-2">
            <span className="text-sm font-semibold text-green-800">
              YES Shares
            </span>
            <span className="text-lg font-bold text-green-900">
              {formatted.sharesYes}
            </span>
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-green-700">Avg Price:</span>
              <span className="font-medium text-green-900">
                {yesAvgPrice.toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-green-700">Current Price:</span>
              <span className="font-medium text-green-900">
                {prices.yesPrice.toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between border-t border-green-200 pt-1 mt-1">
              <span className="text-green-700">Value:</span>
              <span className="font-medium text-green-900">
                {(Number(pnl.currentValue) / 1_000_000_000).toFixed(4)} SOL
              </span>
            </div>
          </div>
        </div>
      )}

      {/* NO Position */}
      {sharesNoNum > 0 && (
        <div className="mb-4 p-4 bg-red-50 rounded-lg">
          <div className="flex justify-between items-start mb-2">
            <span className="text-sm font-semibold text-red-800">
              NO Shares
            </span>
            <span className="text-lg font-bold text-red-900">
              {formatted.sharesNo}
            </span>
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-red-700">Avg Price:</span>
              <span className="font-medium text-red-900">
                {noAvgPrice.toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-red-700">Current Price:</span>
              <span className="font-medium text-red-900">
                {prices.noPrice.toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between border-t border-red-200 pt-1 mt-1">
              <span className="text-red-700">Value:</span>
              <span className="font-medium text-red-900">
                {(Number(pnl.currentValue) / 1_000_000_000).toFixed(4)} SOL
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Total Summary */}
      <div className="pt-4 border-t border-gray-200 space-y-2">
        {/* Total Invested */}
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-700">Total Invested:</span>
          <span className="font-medium text-gray-900">
            {formatted.totalInvested} SOL
          </span>
        </div>

        {/* Current Value */}
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-700">Current Value:</span>
          <span className="font-medium text-gray-900">
            {(Number(pnl.currentValue) / 1_000_000_000).toFixed(4)} SOL
          </span>
        </div>

        {/* Unrealized P&L */}
        <div className="flex justify-between items-center pt-2 border-t border-gray-200">
          <span className="text-sm font-medium text-gray-700">
            Unrealized P&L:
          </span>
          <div className="text-right">
            <div
              className={`text-xl font-bold ${
                pnl.unrealizedPnL >= 0n ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {pnl.unrealizedPnL >= 0n ? '+' : ''}
              {(Number(pnl.unrealizedPnL) / 1_000_000_000).toFixed(4)} SOL
            </div>
            <div
              className={`text-sm ${
                pnl.roi >= 0 ? 'text-green-600' : 'text-red-600'
              }`}
            >
              ({pnl.roi >= 0 ? '+' : ''}
              {pnl.roi.toFixed(2)}%)
            </div>
          </div>
        </div>
      </div>

      {/* Trade Stats */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex justify-between items-center text-xs text-gray-500">
          <span>Trades: {position.tradesCount}</span>
          <span>
            Last: {new Date(position.lastTradeAt * 1000).toLocaleDateString()}
          </span>
        </div>
      </div>
    </div>
  );
}
