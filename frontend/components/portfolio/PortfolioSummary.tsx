'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { useQuery } from '@tanstack/react-query';
import { getAPIClient } from '@/lib/services/api';
import Link from 'next/link';

interface Position {
  market_id: string;
  question: string;
  shares_yes: string;
  shares_no: string;
  total_invested: string;
  current_value: string;
  unrealized_pnl: string;
  roi: number;
  state: number;
}

/**
 * Portfolio Summary Component
 *
 * Displays user's trading positions across all markets:
 * - Active positions with P&L
 * - Portfolio statistics (total invested, current value, ROI)
 * - Winnings available to claim
 */
export function PortfolioSummary() {
  const { connected, publicKey } = useWallet();

  // Fetch user positions
  const { data: positions, isLoading } = useQuery<Position[]>({
    queryKey: ['portfolio', publicKey?.toBase58()],
    queryFn: async () => {
      if (!publicKey) return [];

      const api = getAPIClient();

      try {
        // Fetch all markets where user has positions
        const positions = await api.getPositions(publicKey.toBase58());
        return positions || [];
      } catch (err) {
        console.error('Failed to fetch positions:', err);
        return [];
      }
    },
    enabled: connected && !!publicKey,
    staleTime: 10 * 1000, // 10 seconds
    refetchOnWindowFocus: true,
  });

  if (!connected) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-blue-800 mb-2">Connect Your Wallet</h3>
        <p className="text-blue-700 text-sm">
          Connect your wallet to view your portfolio and trading positions.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!positions || positions.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
        <div className="text-4xl mb-4">📊</div>
        <h3 className="font-semibold text-gray-800 mb-2">No Positions Yet</h3>
        <p className="text-gray-600 text-sm mb-4">
          You haven&apos;t made any trades yet. Browse markets and start trading!
        </p>
        <Link
          href="/markets"
          className="inline-block px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          Explore Markets
        </Link>
      </div>
    );
  }

  // Calculate portfolio totals
  const totalInvested = positions.reduce((sum, p) => sum + Number(p.total_invested) / 1e9, 0);
  const totalValue = positions.reduce((sum, p) => sum + Number(p.current_value) / 1e9, 0);
  const totalPnL = totalValue - totalInvested;
  const portfolioROI = totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Portfolio Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Invested */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="text-sm text-gray-600 mb-1">Total Invested</div>
          <div className="text-2xl font-bold text-gray-900">
            {totalInvested.toFixed(4)} SOL
          </div>
        </div>

        {/* Current Value */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="text-sm text-gray-600 mb-1">Current Value</div>
          <div className="text-2xl font-bold text-gray-900">
            {totalValue.toFixed(4)} SOL
          </div>
        </div>

        {/* Total P&L */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="text-sm text-gray-600 mb-1">Total P&L</div>
          <div
            className={`text-2xl font-bold ${totalPnL >= 0 ? 'text-green-600' : 'text-red-600'
              }`}
          >
            {totalPnL >= 0 ? '+' : ''}
            {totalPnL.toFixed(4)} SOL
          </div>
          <div
            className={`text-sm ${portfolioROI >= 0 ? 'text-green-600' : 'text-red-600'}`}
          >
            ({portfolioROI >= 0 ? '+' : ''}
            {portfolioROI.toFixed(2)}%)
          </div>
        </div>
      </div>

      {/* Positions List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Active Positions</h2>
          <p className="text-sm text-gray-600 mt-1">{positions.length} markets</p>
        </div>

        <div className="divide-y divide-gray-200">
          {positions.map((position) => {
            const invested = Number(position.total_invested) / 1e9;
            const value = Number(position.current_value) / 1e9;
            const pnl = value - invested;
            const roi = invested > 0 ? (pnl / invested) * 100 : 0;

            const sharesYes = Number(position.shares_yes) / 1e9;
            const sharesNo = Number(position.shares_no) / 1e9;

            // State labels
            const stateLabels = [
              'PROPOSED',
              'APPROVED',
              'ACTIVE',
              'RESOLVING',
              'DISPUTED',
              'FINALIZED',
            ];
            const stateName = stateLabels[position.state] || 'UNKNOWN';

            return (
              <Link
                key={position.market_id}
                href={`/markets/${position.market_id}`}
                className="block p-6 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">
                      {position.question}
                    </h3>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="text-gray-600">
                        State:{' '}
                        <span className="font-medium text-gray-800">{stateName}</span>
                      </span>
                    </div>
                  </div>

                  <div className="text-right ml-4">
                    <div
                      className={`text-lg font-bold ${pnl >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}
                    >
                      {pnl >= 0 ? '+' : ''}
                      {pnl.toFixed(4)} SOL
                    </div>
                    <div
                      className={`text-sm ${roi >= 0 ? 'text-green-600' : 'text-red-600'}`}
                    >
                      ({roi >= 0 ? '+' : ''}
                      {roi.toFixed(2)}%)
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  {sharesYes > 0 && (
                    <div>
                      <div className="text-gray-600">YES Shares</div>
                      <div className="font-medium text-green-900">
                        {sharesYes.toFixed(2)}
                      </div>
                    </div>
                  )}
                  {sharesNo > 0 && (
                    <div>
                      <div className="text-gray-600">NO Shares</div>
                      <div className="font-medium text-red-900">
                        {sharesNo.toFixed(2)}
                      </div>
                    </div>
                  )}
                  <div>
                    <div className="text-gray-600">Invested</div>
                    <div className="font-medium text-gray-900">
                      {invested.toFixed(4)} SOL
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-600">Value</div>
                    <div className="font-medium text-gray-900">
                      {value.toFixed(4)} SOL
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
