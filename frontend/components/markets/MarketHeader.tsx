'use client';

import { useState, useEffect } from 'react';
import type { Market } from '@/types/market';
import { MarketState } from '@/types/market';
import { StateBadge } from './StateBadge';
import { formatDistanceToNow } from 'date-fns';
import { Clock, CheckCircle, AlertCircle, XCircle, Copy, Check } from 'lucide-react';

interface MarketHeaderProps {
  market: Market;
}

/**
 * Get icon for market state
 */
function getStateIcon(state: Market['state']) {
  const iconClass = 'w-5 h-5';
  switch (state) {
    case MarketState.PROPOSED:
      return <Clock className={`${iconClass} text-blue-600`} />;
    case MarketState.APPROVED:
      return <CheckCircle className={`${iconClass} text-green-600`} />;
    case MarketState.ACTIVE:
      return <Clock className={`${iconClass} text-green-600`} />;
    case MarketState.RESOLVING:
      return <AlertCircle className={`${iconClass} text-yellow-600`} />;
    case MarketState.DISPUTED:
      return <AlertCircle className={`${iconClass} text-orange-600`} />;
    case MarketState.FINALIZED:
      return <CheckCircle className={`${iconClass} text-gray-600`} />;
    case MarketState.CANCELLED:
      return <XCircle className={`${iconClass} text-red-600`} />;
    default:
      return null;
  }
}

/**
 * Format time left in human-readable format
 */
function formatTimeLeft(expiresAt: string): string {
  const now = Date.now();
  const expiry = new Date(expiresAt).getTime();
  const diff = expiry - now;

  if (diff <= 0) return 'Expired';

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

/**
 * Market header with title, description, state, and countdown
 */
export function MarketHeader({ market }: MarketHeaderProps) {
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [copiedCreator, setCopiedCreator] = useState(false);

  // Update countdown every minute
  useEffect(() => {
    const updateCountdown = () => {
      setTimeLeft(formatTimeLeft(market.expires_at));
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [market.expires_at]);

  // Check if expired
  const isExpired = new Date(market.expires_at) < new Date();

  // Copy creator address to clipboard
  const handleCopyCreator = async () => {
    try {
      await navigator.clipboard.writeText(market.creator);
      setCopiedCreator(true);
      setTimeout(() => setCopiedCreator(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      {/* State Badge with Icon */}
      <div className="flex items-center gap-2 mb-4" data-testid="market-state">
        {getStateIcon(market.state)}
        <StateBadge state={market.state} />
      </div>

      {/* Title */}
      <h1 className="text-3xl font-bold text-gray-900 mb-3" data-testid="market-question">
        {market.title}
      </h1>

      {/* Description */}
      <p className="text-gray-700 text-lg mb-6">{market.description}</p>

      {/* Metadata */}
      <div className="flex flex-wrap gap-6 text-sm">
        {/* Creator with Copy Button */}
        <div data-testid="market-creator">
          <span className="text-gray-500">Creator:</span>{' '}
          <button
            onClick={handleCopyCreator}
            className="inline-flex items-center gap-1 font-medium text-gray-900 hover:text-blue-600 transition-colors"
            title="Click to copy address"
          >
            <span>{market.creator.slice(0, 4)}...{market.creator.slice(-4)}</span>
            {copiedCreator ? (
              <Check className="w-3 h-3 text-green-600" />
            ) : (
              <Copy className="w-3 h-3" />
            )}
          </button>
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

        {/* Market ID (Development Only) */}
        {process.env.NODE_ENV === 'development' && (
          <div>
            <span className="text-gray-500">Market ID:</span>{' '}
            <span className="font-mono text-xs text-gray-700">
              {market.market_id.slice(0, 8)}...
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
