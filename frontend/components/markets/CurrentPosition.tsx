'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { useMemo } from 'react';

interface CurrentPositionProps {
  marketId: string;
}

/**
 * Display user's current position in this market
 * Shows shares owned, average price, and P&L
 */
export function CurrentPosition({ marketId }: CurrentPositionProps) {
  const { connected, publicKey } = useWallet();

  // MOCK: User position data
  // TODO: Fetch actual position from on-chain state
  const position = useMemo(() => {
    if (!connected || !publicKey) return null;

    // Mock user has some YES shares
    return {
      yesShares: 25,
      noShares: 0,
      yesAvgPrice: 45,
      noAvgPrice: 0,
      currentYesPrice: 52,
      currentNoPrice: 48,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, publicKey]);

  // Don't show if wallet not connected
  if (!connected || !position) {
    return null;
  }

  // Calculate P&L
  const yesPnL =
    position.yesShares > 0
      ? position.yesShares * (position.currentYesPrice - position.yesAvgPrice)
      : 0;
  const noPnL =
    position.noShares > 0
      ? position.noShares * (position.currentNoPrice - position.noAvgPrice)
      : 0;
  const totalPnL = yesPnL + noPnL;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-4">Your Position</h2>

      {/* YES Position */}
      {position.yesShares > 0 && (
        <div className="mb-4 p-4 bg-green-50 rounded-lg">
          <div className="flex justify-between items-start mb-2">
            <span className="text-sm font-semibold text-green-800">
              YES Shares
            </span>
            <span className="text-lg font-bold text-green-900">
              {position.yesShares}
            </span>
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-green-700">Avg Price:</span>
              <span className="font-medium text-green-900">
                {position.yesAvgPrice.toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-green-700">Current Price:</span>
              <span className="font-medium text-green-900">
                {position.currentYesPrice.toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between border-t border-green-200 pt-1 mt-1">
              <span className="text-green-700">P&L:</span>
              <span
                className={`font-bold ${
                  yesPnL >= 0 ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {yesPnL >= 0 ? '+' : ''}
                {yesPnL.toFixed(2)}%
              </span>
            </div>
          </div>
        </div>
      )}

      {/* NO Position */}
      {position.noShares > 0 && (
        <div className="mb-4 p-4 bg-red-50 rounded-lg">
          <div className="flex justify-between items-start mb-2">
            <span className="text-sm font-semibold text-red-800">
              NO Shares
            </span>
            <span className="text-lg font-bold text-red-900">
              {position.noShares}
            </span>
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-red-700">Avg Price:</span>
              <span className="font-medium text-red-900">
                {position.noAvgPrice.toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-red-700">Current Price:</span>
              <span className="font-medium text-red-900">
                {position.currentNoPrice.toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between border-t border-red-200 pt-1 mt-1">
              <span className="text-red-700">P&L:</span>
              <span
                className={`font-bold ${
                  noPnL >= 0 ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {noPnL >= 0 ? '+' : ''}
                {noPnL.toFixed(2)}%
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Total P&L */}
      {(position.yesShares > 0 || position.noShares > 0) && (
        <div className="pt-4 border-t border-gray-200">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">
              Total P&L:
            </span>
            <span
              className={`text-xl font-bold ${
                totalPnL >= 0 ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {totalPnL >= 0 ? '+' : ''}
              {totalPnL.toFixed(2)}%
            </span>
          </div>
        </div>
      )}

      {/* No Position */}
      {position.yesShares === 0 && position.noShares === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p>You don&apos;t have a position in this market yet</p>
          <p className="text-sm mt-1">Use the trade form to get started</p>
        </div>
      )}

      {/* MOCK Indicator */}
      <p className="text-xs text-gray-500 mt-4 text-center">
        📊 Mock data - real position coming soon
      </p>
    </div>
  );
}
