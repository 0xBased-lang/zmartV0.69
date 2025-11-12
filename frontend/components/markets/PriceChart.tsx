'use client';

import { useState, useEffect } from 'react';
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

interface PriceDataPoint {
  date: string;
  timestamp: number;
  yes: number;
  no: number;
}

/**
 * Price history chart showing YES/NO prices over time
 * Uses recharts for visualization with real LMSR price data
 */
export function PriceChart({ marketId }: PriceChartProps) {
  const [priceData, setPriceData] = useState<PriceDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPriceHistory = async () => {
      try {
        setLoading(true);
        setError(null);

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
        const response = await fetch(`${apiUrl}/api/markets/${marketId}/price-history?limit=50`);

        if (!response.ok) {
          throw new Error('Failed to fetch price history');
        }

        const data = await response.json();

        // Transform API response to chart format
        const formattedData: PriceDataPoint[] = data.price_history.map((point: any) => ({
          date: new Date(point.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          timestamp: new Date(point.timestamp).getTime(),
          yes: point.yes,
          no: point.no,
        }));

        setPriceData(formattedData);
      } catch (err) {
        console.error('Error fetching price history:', err);
        setError('Failed to load price history');
        // Fallback to initial 50/50 point
        setPriceData([{
          date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          timestamp: Date.now(),
          yes: 50,
          no: 50,
        }]);
      } finally {
        setLoading(false);
      }
    };

    if (marketId) {
      fetchPriceHistory();
    }
  }, [marketId]);

  if (loading) {
    return (
      <div className="bg-surface-card rounded-lg shadow-glow border border-border-default p-6">
        <h2 className="text-xl font-display font-bold text-text-primary mb-4">Price History</h2>
        <div className="h-[300px] flex items-center justify-center">
          <div className="animate-pulse text-text-tertiary">Loading price history...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-surface-card rounded-lg shadow-glow border border-border-default p-6">
        <h2 className="text-xl font-display font-bold text-text-primary mb-4">Price History</h2>
        <div className="h-[300px] flex items-center justify-center">
          <div className="text-status-error text-sm">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface-card rounded-lg shadow-glow border border-border-default p-6" suppressHydrationWarning>
      <h2 className="text-xl font-display font-bold text-text-primary mb-4">Price History</h2>

      <ResponsiveContainer width="100%" height={300} suppressHydrationWarning>
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

      {priceData.length > 0 && (
        <p className="text-xs text-text-tertiary mt-3 text-center">
          {priceData.length} price points • Real-time LMSR data
        </p>
      )}
    </div>
  );
}
