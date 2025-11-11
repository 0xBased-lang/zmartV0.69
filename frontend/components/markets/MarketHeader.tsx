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
      return <Clock className={`${iconClass} text-brand-accent`} />;
    case MarketState.APPROVED:
      return <CheckCircle className={`${iconClass} text-status-success`} />;
    case MarketState.ACTIVE:
      return <Clock className={`${iconClass} text-trading-yes`} />;
    case MarketState.RESOLVING:
      return <AlertCircle className={`${iconClass} text-status-warning`} />;
    case MarketState.DISPUTED:
      return <AlertCircle className={`${iconClass} text-status-warning`} />;
    case MarketState.FINALIZED:
      return <CheckCircle className={`${iconClass} text-text-tertiary`} />;
    case MarketState.CANCELLED:
      return <XCircle className={`${iconClass} text-status-error`} />;
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
    <div className="bg-surface-card rounded-lg shadow-glow border border-border-default p-6">
      {/* State Badge with Icon */}
      <div className="flex items-center gap-2 mb-4" data-testid="market-state">
        {getStateIcon(market.state)}
        <StateBadge state={market.state} />
      </div>

      {/* Title */}
      <h1 className="text-3xl font-display font-bold text-text-primary mb-3" data-testid="market-question">
        {market.title}
      </h1>

      {/* Description */}
      <p className="text-text-secondary text-lg mb-6">{market.description}</p>

      {/* Metadata */}
      <div className="flex flex-wrap gap-6 text-sm">
        {/* Creator with Copy Button */}
        <div data-testid="market-creator">
          <span className="text-text-tertiary">Creator:</span>{' '}
          <button
            onClick={handleCopyCreator}
            className="inline-flex items-center gap-1 font-medium text-text-primary hover:text-brand-primary transition-colors"
            title="Click to copy address"
          >
            <span>{market.creator.slice(0, 4)}...{market.creator.slice(-4)}</span>
            {copiedCreator ? (
              <Check className="w-3 h-3 text-status-success" />
            ) : (
              <Copy className="w-3 h-3" />
            )}
          </button>
        </div>

        {/* Expiry */}
        <div>
          <span className="text-text-tertiary">
            {isExpired ? 'Expired' : 'Expires'}:
          </span>{' '}
          <span
            className={`font-medium ${
              isExpired ? 'text-status-error' : 'text-text-primary'
            }`}
          >
            {timeLeft}
          </span>
        </div>

        {/* Volume */}
        <div>
          <span className="text-text-tertiary">Volume:</span>{' '}
          <span className="font-medium text-text-primary">
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
          <span className="text-text-tertiary">Created:</span>{' '}
          <span className="font-medium text-text-primary">
            {formatDistanceToNow(new Date(market.created_at), {
              addSuffix: true,
            })}
          </span>
        </div>

        {/* Market ID (Development Only) */}
        {process.env.NODE_ENV === 'development' && (
          <div>
            <span className="text-text-tertiary">Market ID:</span>{' '}
            <span className="font-mono text-xs text-text-secondary">
              {market.market_id.slice(0, 8)}...
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
