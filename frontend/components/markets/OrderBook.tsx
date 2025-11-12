'use client';

import { useState, useEffect } from 'react';

interface OrderBookProps {
  marketId: string;
}

interface Position {
  address: string;
  outcome: 'YES' | 'NO';
  shares: number;
  avgPrice: number;
}

/**
 * Order book showing aggregated positions
 * Displays top holders for YES and NO outcomes based on real trade data
 */
export function OrderBook({ marketId }: OrderBookProps) {
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPositions = async () => {
      try {
        setLoading(true);
        setError(null);

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
        const response = await fetch(`${apiUrl}/api/markets/${marketId}/trades`);

        if (!response.ok) {
          throw new Error('Failed to fetch trades');
        }

        const data = await response.json();
        const trades = data.trades || [];

        // Aggregate positions by wallet and outcome
        const positionMap = new Map<string, { shares: number; totalCost: number }>();

        for (const trade of trades) {
          const key = `${trade.user_wallet}-${trade.outcome}`;
          const existing = positionMap.get(key) || { shares: 0, totalCost: 0 };

          const shares = parseFloat(trade.shares);
          const cost = parseFloat(trade.cost);

          if (trade.trade_type === 'buy') {
            positionMap.set(key, {
              shares: existing.shares + shares,
              totalCost: existing.totalCost + cost,
            });
          } else {
            positionMap.set(key, {
              shares: existing.shares - shares,
              totalCost: existing.totalCost - cost,
            });
          }
        }

        // Convert to Position array
        const aggregatedPositions: Position[] = [];
        positionMap.forEach((value, key) => {
          const [address, outcome] = key.split('-');
          if (value.shares > 0) {
            aggregatedPositions.push({
              address,
              outcome: outcome as 'YES' | 'NO',
              shares: value.shares,
              avgPrice: (value.totalCost / value.shares / 1e9) * 100, // Convert to percentage
            });
          }
        });

        setPositions(aggregatedPositions);
      } catch (err) {
        console.error('Error fetching positions:', err);
        setError('Failed to load positions');
        setPositions([]);
      } finally {
        setLoading(false);
      }
    };

    if (marketId) {
      fetchPositions();
    }
  }, [marketId]);

  const yesPositions = positions
    .filter((p) => p.outcome === 'YES')
    .sort((a, b) => b.shares - a.shares)
    .slice(0, 5);

  const noPositions = positions
    .filter((p) => p.outcome === 'NO')
    .sort((a, b) => b.shares - a.shares)
    .slice(0, 5);

  // Show loading skeleton
  if (loading) {
    return (
      <div className="bg-surface-card rounded-lg shadow-glow border border-border-default p-6">
        <h2 className="text-xl font-display font-bold text-text-primary mb-4">Order Book</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* YES skeleton */}
          <div>
            <h3 className="text-sm font-semibold text-trading-yes bg-trading-yes/10 border border-trading-yes/20 px-3 py-2 rounded mb-3">
              YES Positions
            </h3>
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={`yes-skeleton-${i}`} className="h-12 bg-surface-elevated rounded animate-pulse" />
              ))}
            </div>
          </div>
          {/* NO skeleton */}
          <div>
            <h3 className="text-sm font-semibold text-trading-no bg-trading-no/10 border border-trading-no/20 px-3 py-2 rounded mb-3">
              NO Positions
            </h3>
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={`no-skeleton-${i}`} className="h-12 bg-surface-elevated rounded animate-pulse" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="bg-surface-card rounded-lg shadow-glow border border-border-default p-6">
        <h2 className="text-xl font-display font-bold text-text-primary mb-4">Order Book</h2>
        <div className="text-sm text-status-error text-center py-8">{error}</div>
      </div>
    );
  }

  return (
    <div className="bg-surface-card rounded-lg shadow-glow border border-border-default p-6">
      <h2 className="text-xl font-display font-bold text-text-primary mb-4">Order Book</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* YES Positions */}
        <div>
          <h3 className="text-sm font-semibold text-trading-yes bg-trading-yes/10 border border-trading-yes/20 px-3 py-2 rounded mb-3">
            YES Positions
          </h3>
          <div className="space-y-2">
            {yesPositions.map((position, i) => (
              <div
                key={`yes-${i}`}
                className="flex justify-between items-center text-sm"
              >
                <span className="text-text-tertiary font-mono">
                  {position.address.slice(0, 6)}...{position.address.slice(-4)}
                </span>
                <div className="text-right">
                  <div className="font-medium text-text-primary">
                    {position.shares} shares
                  </div>
                  <div className="text-xs text-text-tertiary">
                    Avg: {position.avgPrice.toFixed(1)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* NO Positions */}
        <div>
          <h3 className="text-sm font-semibold text-trading-no bg-trading-no/10 border border-trading-no/20 px-3 py-2 rounded mb-3">
            NO Positions
          </h3>
          <div className="space-y-2">
            {noPositions.map((position, i) => (
              <div
                key={`no-${i}`}
                className="flex justify-between items-center text-sm"
              >
                <span className="text-text-tertiary font-mono">
                  {position.address.slice(0, 6)}...{position.address.slice(-4)}
                </span>
                <div className="text-right">
                  <div className="font-medium text-text-primary">
                    {position.shares} shares
                  </div>
                  <div className="text-xs text-text-tertiary">
                    Avg: {position.avgPrice.toFixed(1)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {positions.length > 0 && (
        <p className="text-xs text-text-tertiary mt-4 text-center">
          {positions.length} active positions • Real-time data
        </p>
      )}
      {positions.length === 0 && (
        <p className="text-xs text-text-tertiary mt-4 text-center">
          No positions yet • Be the first to trade!
        </p>
      )}
    </div>
  );
}
