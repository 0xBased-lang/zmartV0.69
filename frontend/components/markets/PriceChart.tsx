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
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-4">Price History</h2>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart
          data={priceData}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="date"
            stroke="#6b7280"
            style={{ fontSize: '12px' }}
          />
          <YAxis
            domain={[0, 100]}
            stroke="#6b7280"
            style={{ fontSize: '12px' }}
            label={{ value: 'Price (%)', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
            }}
            formatter={(value: number) => `${value.toFixed(1)}%`}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="yes"
            stroke="#10b981"
            strokeWidth={2}
            name="YES"
            dot={false}
            activeDot={{ r: 6 }}
          />
          <Line
            type="monotone"
            dataKey="no"
            stroke="#ef4444"
            strokeWidth={2}
            name="NO"
            dot={false}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>

      {/* MOCK Indicator */}
      <p className="text-xs text-gray-500 mt-3 text-center">
        📊 Mock data - real price history coming soon
      </p>
    </div>
  );
}
