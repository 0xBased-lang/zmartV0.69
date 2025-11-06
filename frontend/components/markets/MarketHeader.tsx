'use client';

import { useState, useEffect } from 'react';
import type { Market } from '@/types/market';
import { StateBadge } from './StateBadge';
import { formatDistanceToNow } from 'date-fns';

interface MarketHeaderProps {
  market: Market;
}

/**
 * Market header with title, description, state, and countdown
 */
export function MarketHeader({ market }: MarketHeaderProps) {
  const [timeLeft, setTimeLeft] = useState<string>('');

  // Update countdown every second
  useEffect(() => {
    const updateCountdown = () => {
      try {
        const distance = formatDistanceToNow(new Date(market.expires_at), {
          addSuffix: true,
        });
        setTimeLeft(distance);
      } catch {
        setTimeLeft('Invalid date');
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [market.expires_at]);

  // Check if expired
  const isExpired = new Date(market.expires_at) < new Date();

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      {/* State Badge */}
      <div className="mb-4">
        <StateBadge state={market.state} />
      </div>

      {/* Title */}
      <h1 className="text-3xl font-bold text-gray-900 mb-3">{market.title}</h1>

      {/* Description */}
      <p className="text-gray-700 text-lg mb-6">{market.description}</p>

      {/* Metadata */}
      <div className="flex flex-wrap gap-6 text-sm">
        {/* Creator */}
        <div>
          <span className="text-gray-500">Creator:</span>{' '}
          <span className="font-medium text-gray-900">
            {market.creator.slice(0, 4)}...{market.creator.slice(-4)}
          </span>
        </div>

        {/* Expiry */}
        <div>
          <span className="text-gray-500">
            {isExpired ? 'Expired' : 'Expires'}:
          </span>{' '}
          <span
            className={`font-medium ${
              isExpired ? 'text-red-600' : 'text-gray-900'
            }`}
          >
            {timeLeft}
          </span>
        </div>

        {/* Volume */}
        <div>
          <span className="text-gray-500">Volume:</span>{' '}
          <span className="font-medium text-gray-900">
            {(() => {
              const volume = parseFloat(market.total_volume) || 0;
              return volume >= 1_000_000
                ? `$${(volume / 1_000_000).toFixed(1)}M`
                : volume >= 1_000
                  ? `$${(volume / 1_000).toFixed(1)}K`
                  : `$${volume.toFixed(0)}`;
            })()}
          </span>
        </div>

        {/* Created */}
        <div>
          <span className="text-gray-500">Created:</span>{' '}
          <span className="font-medium text-gray-900">
            {formatDistanceToNow(new Date(market.created_at), {
              addSuffix: true,
            })}
          </span>
        </div>
      </div>
    </div>
  );
}
