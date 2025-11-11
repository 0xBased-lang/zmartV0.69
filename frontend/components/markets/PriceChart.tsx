'use client';

import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface PriceChartProps {
  marketId: string;
}

/**
 * Price history chart showing YES/NO prices over time
 * Uses recharts for visualization
 */
export function PriceChart({ marketId }: PriceChartProps) {
  // MOCK: Generate sample price data
  // TODO: Fetch actual price history from backend/indexer
  const priceData = useMemo(() => {
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;

    // Generate 7 days of mock data
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(now - (6 - i) * dayMs);
      const basePrice = 50;
      const variance = Math.sin(i * 0.5) * 15; // Oscillate between 35-65%

      return {
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        timestamp: date.getTime(),
        yes: Math.max(1, Math.min(99, basePrice + variance)),
        no: Math.max(1, Math.min(99, basePrice - variance)),
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="bg-surface-card rounded-lg shadow-glow border border-border-default p-6">
      <h2 className="text-xl font-display font-bold text-text-primary mb-4">Price History</h2>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart
          data={priceData}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
          <XAxis
            dataKey="date"
            stroke="rgba(255,255,255,0.4)"
            style={{ fontSize: '12px' }}
          />
          <YAxis
            domain={[0, 100]}
            stroke="rgba(255,255,255,0.4)"
            style={{ fontSize: '12px' }}
            label={{ value: 'Price (%)', angle: -90, position: 'insideLeft', fill: 'rgba(255,255,255,0.6)' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1A1B1F',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              color: '#FFFFFF',
            }}
            formatter={(value: number) => `${value.toFixed(1)}%`}
          />
          <Legend wrapperStyle={{ color: '#FFFFFF' }} />
          <Line
            type="monotone"
            dataKey="yes"
            stroke="#22C55E"
            strokeWidth={2}
            name="YES"
            dot={false}
            activeDot={{ r: 6 }}
          />
          <Line
            type="monotone"
            dataKey="no"
            stroke="#EF4444"
            strokeWidth={2}
            name="NO"
            dot={false}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>

      {/* MOCK Indicator */}
      <p className="text-xs text-text-tertiary mt-3 text-center">
        📊 Mock data - real price history coming soon
      </p>
    </div>
  );
}
