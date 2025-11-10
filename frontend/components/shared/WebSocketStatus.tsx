/**
 * WebSocket Connection Status Indicator
 *
 * Shows real-time connection state to users
 * - Connected: Green dot
 * - Connecting: Yellow pulse
 * - Disconnected: Red dot with reconnect button
 * - Polling Fallback: Orange indicator
 */

'use client';

import { useWebSocketConnection } from '@/hooks/useWebSocket';

interface WebSocketStatusProps {
  /** Show detailed status text (default: false) */
  showText?: boolean;
  /** Compact mode (smaller indicator) */
  compact?: boolean;
}

export function WebSocketStatus({ showText = false, compact = false }: WebSocketStatusProps) {
  const { state, shouldFallbackToPolling } = useWebSocketConnection();

  // Don't show in production (optional - remove if you want to show)
  if (process.env.NODE_ENV === 'production' && state === 'connected') {
    return null;
  }

  const getStatusColor = () => {
    if (shouldFallbackToPolling) return 'bg-orange-500';
    switch (state) {
      case 'connected':
        return 'bg-green-500';
      case 'connecting':
        return 'bg-yellow-500 animate-pulse';
      case 'disconnected':
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-gray-400';
    }
  };

  const getStatusText = () => {
    if (shouldFallbackToPolling) return 'Polling Mode';
    switch (state) {
      case 'connected':
        return 'Live Updates';
      case 'connecting':
        return 'Connecting...';
      case 'disconnected':
        return 'Disconnected';
      case 'error':
        return 'Connection Error';
      default:
        return 'Unknown';
    }
  };

  const getStatusTitle = () => {
    if (shouldFallbackToPolling) {
      return 'WebSocket unavailable. Using polling for updates (every 5 seconds)';
    }
    switch (state) {
      case 'connected':
        return 'Connected to real-time updates';
      case 'connecting':
        return 'Establishing connection...';
      case 'disconnected':
        return 'Not connected to real-time updates';
      case 'error':
        return 'Failed to connect. Will retry automatically.';
      default:
        return 'Real-time connection status unknown';
    }
  };

  if (compact) {
    return (
      <div
        className="inline-flex items-center gap-1.5"
        title={getStatusTitle()}
      >
        <div className={`h-2 w-2 rounded-full ${getStatusColor()}`} />
        {showText && (
          <span className="text-xs text-muted-foreground">{getStatusText()}</span>
        )}
      </div>
    );
  }

  return (
    <div
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/50 border border-border"
      title={getStatusTitle()}
    >
      <div className={`h-2.5 w-2.5 rounded-full ${getStatusColor()}`} />
      {showText && (
        <span className="text-sm font-medium">{getStatusText()}</span>
      )}
    </div>
  );
}

/**
 * Floating WebSocket status badge (bottom-right corner)
 * Shows connection health without taking up space
 */
export function FloatingWebSocketStatus() {
  const { state, shouldFallbackToPolling } = useWebSocketConnection();

  // Only show if not connected or in polling fallback
  if (state === 'connected' && !shouldFallbackToPolling) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <WebSocketStatus showText />
    </div>
  );
}
