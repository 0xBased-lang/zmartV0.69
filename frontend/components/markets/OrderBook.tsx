'use client';

import { useMemo } from 'react';

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
 * Displays top holders for YES and NO outcomes
 */
export function OrderBook({ marketId }: OrderBookProps) {
  // MOCK: Generate sample positions
  // TODO: Fetch actual positions from on-chain data
  const positions = useMemo((): Position[] => {
    const mockAddresses = [
      '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
      '7xKXtg2CW87d97TXJSDpbD5jBkheTqA3',
      'C5v68qLr9V7aBkK9dRMZvE4FcA9sPmG4',
      'DqL8Pz3nT6rVmWxK9jFbA2sN5hEcYt7R',
      'E9mNxK2vR8tLpQ3zW5jF7aHcBs4DyG6T',
    ];

    return mockAddresses.flatMap((addr, i) => [
      {
        address: addr,
        outcome: 'YES' as const,
        shares: Math.floor(Math.random() * 100) + 10,
        avgPrice: 40 + Math.random() * 20,
      },
      {
        address: addr,
        outcome: 'NO' as const,
        shares: Math.floor(Math.random() * 100) + 10,
        avgPrice: 40 + Math.random() * 20,
      },
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const yesPositions = positions
    .filter((p) => p.outcome === 'YES')
    .sort((a, b) => b.shares - a.shares)
    .slice(0, 5);

  const noPositions = positions
    .filter((p) => p.outcome === 'NO')
    .sort((a, b) => b.shares - a.shares)
    .slice(0, 5);

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

      {/* MOCK Indicator */}
      <p className="text-xs text-text-tertiary mt-4 text-center">
        📊 Mock data - real positions coming soon
      </p>
    </div>
  );
}
