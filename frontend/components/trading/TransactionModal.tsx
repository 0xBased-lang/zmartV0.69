/**
 * TransactionModal - Transaction Confirmation Flow
 *
 * Multi-step modal for trade execution:
 * 1. Confirm - Review trade details
 * 2. Sign - Awaiting wallet signature
 * 3. Submit - Sending to blockchain
 * 4. Confirm TX - Waiting for confirmation
 * 5. Success - Trade executed
 * 6. Error - Failed with retry option
 *
 * --ultrathink Analysis:
 * - State-driven UI (matches useTrade states)
 * - Progress indicators for each step
 * - Block explorer links
 * - Auto-close on success (configurable)
 * - Retry failed transactions
 */

'use client';

import { useEffect, useState } from 'react';
import { TransactionState, type TransactionError } from '@/lib/hooks/useTrade';
import { Outcome, TradeAction, fromFixedPoint } from '@/lib/lmsr';
import { cn } from '@/lib/utils';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: TransactionState;
  signature: string | null;
  error: TransactionError | null;
  onRetry: () => void;
  // Trade details for confirmation step
  action: TradeAction;
  outcome: Outcome;
  quantity: bigint;
  finalAmount: bigint;
  newPrice: number;
  priceImpact: number;
}

/**
 * Transaction confirmation modal with multi-step flow
 */
export function TransactionModal({
  isOpen,
  onClose,
  state,
  signature,
  error,
  onRetry,
  action,
  outcome,
  quantity,
  finalAmount,
  newPrice,
  priceImpact,
}: TransactionModalProps) {
  const [autoCloseTimer, setAutoCloseTimer] = useState<number | null>(null);

  // Auto-close on success after 3 seconds
  useEffect(() => {
    if (state === TransactionState.SUCCESS) {
      const timer = window.setTimeout(() => {
        onClose();
      }, 3000);
      setAutoCloseTimer(3);

      // Countdown
      const countdown = window.setInterval(() => {
        setAutoCloseTimer((prev) => (prev !== null && prev > 0 ? prev - 1 : null));
      }, 1000);

      return () => {
        clearTimeout(timer);
        clearInterval(countdown);
      };
    }
  }, [state, onClose]);

  if (!isOpen) return null;

  const isBuy = action === TradeAction.BUY;
  const isYes = outcome === Outcome.YES;

  // Block explorer URL (mainnet/devnet)
  const explorerUrl = signature
    ? `https://explorer.solana.com/tx/${signature}?cluster=devnet`
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={state === TransactionState.ERROR ? onClose : undefined}
      />

      {/* Modal */}
      <div className="relative bg-surface-card rounded-xl shadow-glow-lg border border-border-default max-w-md w-full mx-4 p-6">
        {/* Close button (only in error state or success) */}
        {(state === TransactionState.ERROR || state === TransactionState.SUCCESS) && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-text-tertiary hover:text-text-primary transition-colors"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}

        {/* Content based on state */}
        {state === TransactionState.BUILDING && (
          <BuildingStep />
        )}

        {state === TransactionState.CONFIRMING && (
          <ConfirmingStep action={action} outcome={outcome} />
        )}

        {state === TransactionState.SUBMITTING && (
          <SubmittingStep />
        )}

        {state === TransactionState.CONFIRMING_TX && (
          <ConfirmingTxStep signature={signature} explorerUrl={explorerUrl} />
        )}

        {state === TransactionState.SUCCESS && (
          <SuccessStep
            action={action}
            outcome={outcome}
            quantity={quantity}
            finalAmount={finalAmount}
            newPrice={newPrice}
            explorerUrl={explorerUrl}
            autoCloseTimer={autoCloseTimer}
          />
        )}

        {state === TransactionState.ERROR && (
          <ErrorStep error={error} onRetry={onRetry} onClose={onClose} />
        )}
      </div>
    </div>
  );
}

/**
 * Building transaction step
 */
function BuildingStep() {
  return (
    <div className="text-center py-8">
      <Spinner className="w-12 h-12 mx-auto mb-4" />
      <h3 className="text-xl font-display font-bold text-text-primary mb-2">
        Building Transaction
      </h3>
      <p className="text-text-secondary text-sm">
        Preparing your trade for the blockchain...
      </p>
    </div>
  );
}

/**
 * Awaiting wallet signature step
 */
function ConfirmingStep({
  action,
  outcome,
}: {
  action: TradeAction;
  outcome: Outcome;
}) {
  return (
    <div className="text-center py-8">
      <div className="w-16 h-16 mx-auto mb-4 bg-brand-primary/10 border border-brand-primary/20 rounded-full flex items-center justify-center shadow-glow">
        <svg
          className="w-8 h-8 text-brand-primary"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>
      <h3 className="text-xl font-display font-bold text-text-primary mb-2">Confirm in Wallet</h3>
      <p className="text-text-secondary text-sm mb-4">
        Please approve the transaction in your wallet
      </p>
      <div className="bg-brand-primary/10 border border-brand-primary/20 rounded-lg p-3 text-sm">
        <span className="font-medium text-text-primary">
          {action === TradeAction.BUY ? 'Buying' : 'Selling'} {outcome} shares
        </span>
      </div>
    </div>
  );
}

/**
 * Submitting to blockchain step
 */
function SubmittingStep() {
  return (
    <div className="text-center py-8">
      <Spinner className="w-12 h-12 mx-auto mb-4" />
      <h3 className="text-xl font-display font-bold text-text-primary mb-2">
        Submitting Transaction
      </h3>
      <p className="text-text-secondary text-sm">Sending to Solana blockchain...</p>
    </div>
  );
}

/**
 * Waiting for blockchain confirmation step
 */
function ConfirmingTxStep({
  signature,
  explorerUrl,
}: {
  signature: string | null;
  explorerUrl: string | null;
}) {
  return (
    <div className="text-center py-8">
      <Spinner className="w-12 h-12 mx-auto mb-4" />
      <h3 className="text-xl font-display font-bold text-text-primary mb-2">
        Confirming Transaction
      </h3>
      <p className="text-text-secondary text-sm mb-4">
        Waiting for blockchain confirmation...
      </p>
      <p className="text-xs text-text-tertiary mb-3">This usually takes 10-30 seconds</p>

      {signature && explorerUrl && (
        <a
          href={explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm text-brand-primary hover:text-brand-accent font-medium transition-colors"
        >
          View on Explorer
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
            />
          </svg>
        </a>
      )}
    </div>
  );
}

/**
 * Success step
 */
function SuccessStep({
  action,
  outcome,
  quantity,
  finalAmount,
  newPrice,
  explorerUrl,
  autoCloseTimer,
}: {
  action: TradeAction;
  outcome: Outcome;
  quantity: bigint;
  finalAmount: bigint;
  newPrice: number;
  explorerUrl: string | null;
  autoCloseTimer: number | null;
}) {
  const isBuy = action === TradeAction.BUY;

  return (
    <div className="text-center py-8">
      {/* Success Icon */}
      <div className="w-16 h-16 mx-auto mb-4 bg-status-success/10 border border-status-success/20 rounded-full flex items-center justify-center shadow-glow animate-pulse">
        <svg
          className="w-8 h-8 text-status-success"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
      </div>

      <h3 className="text-xl font-display font-bold text-text-primary mb-2">Trade Successful!</h3>
      <p className="text-text-secondary text-sm mb-6">
        Your {isBuy ? 'purchase' : 'sale'} has been confirmed
      </p>

      {/* Trade Summary */}
      <div className="bg-surface-elevated border border-border-subtle rounded-lg p-4 space-y-2 mb-6">
        <div className="flex justify-between text-sm">
          <span className="text-text-tertiary">Action</span>
          <span className="font-medium text-text-primary">
            {isBuy ? 'Bought' : 'Sold'} {fromFixedPoint(quantity)} {outcome} shares
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-text-tertiary">{isBuy ? 'Cost' : 'Received'}</span>
          <span className="font-medium text-text-primary">{fromFixedPoint(finalAmount).toFixed(4)} SOL</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-text-tertiary">New {outcome} Price</span>
          <span className="font-medium text-text-primary">{newPrice.toFixed(1)}%</span>
        </div>
      </div>

      {/* Explorer Link */}
      {explorerUrl && (
        <a
          href={explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm text-brand-primary hover:text-brand-accent font-medium mb-4 transition-colors"
        >
          View Transaction
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
            />
          </svg>
        </a>
      )}

      {/* Auto-close timer */}
      {autoCloseTimer !== null && (
        <p className="text-xs text-text-tertiary mt-4">
          Closing in {autoCloseTimer} seconds...
        </p>
      )}
    </div>
  );
}

/**
 * Error step with user-friendly messages
 */
function ErrorStep({
  error,
  onRetry,
  onClose,
}: {
  error: TransactionError | null;
  onRetry: () => void;
  onClose: () => void;
}) {
  const isRecoverable = error?.recoverable ?? true;

  // Convert technical error to user-friendly message
  const getUserFriendlyMessage = (err: TransactionError | null): string => {
    if (!err?.message) return 'An unknown error occurred';

    const msg = err.message.toLowerCase();

    // User rejected transaction
    if (msg.includes('rejected') || msg.includes('cancelled') || msg.includes('user rejected')) {
      return 'Transaction cancelled. You can try again when ready.';
    }

    // Insufficient funds
    if (msg.includes('insufficient') || msg.includes('balance')) {
      return 'Insufficient funds in your wallet. Please add more SOL and try again.';
    }

    // Network/RPC errors
    if (msg.includes('network') || msg.includes('fetch') || msg.includes('rpc')) {
      return 'Network error. Please check your connection and try again.';
    }

    // Simulation failed (usually means transaction would fail)
    if (msg.includes('simulation') || msg.includes('simulate')) {
      return 'Transaction simulation failed. Please check your wallet balance or market state.';
    }

    // Slippage exceeded
    if (msg.includes('slippage')) {
      return 'Price moved too much. Try increasing slippage tolerance or reducing trade size.';
    }

    // Wallet not connected
    if (msg.includes('wallet') || msg.includes('not connected')) {
      return 'Wallet not connected. Please connect your wallet and try again.';
    }

    // Timeout
    if (msg.includes('timeout') || msg.includes('timed out')) {
      return 'Transaction timed out. The network may be congested. Please try again.';
    }

    // Default to original message
    return err.message;
  };

  const friendlyMessage = getUserFriendlyMessage(error);

  return (
    <div className="text-center py-8">
      {/* Error Icon */}
      <div className="w-16 h-16 mx-auto mb-4 bg-status-error/10 border border-status-error/20 rounded-full flex items-center justify-center animate-pulse">
        <svg
          className="w-8 h-8 text-status-error"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </div>

      <h3 className="text-xl font-display font-bold text-text-primary mb-2">Transaction Failed</h3>
      <p className="text-text-secondary text-sm mb-6">
        {friendlyMessage}
      </p>

      {/* Error Code (for debugging) */}
      {error?.code && (
        <details className="mb-6">
          <summary className="text-xs text-text-tertiary cursor-pointer hover:text-text-primary transition-colors">
            Technical Details
          </summary>
          <div className="bg-status-error/10 border border-status-error/20 rounded-lg p-3 mt-2">
            <p className="text-xs font-mono text-status-error">Error Code: {error.code}</p>
            {error.message && (
              <p className="text-xs font-mono text-text-secondary mt-1">
                {error.message}
              </p>
            )}
          </div>
        </details>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        {isRecoverable && (
          <button
            onClick={onRetry}
            className="flex-1 px-4 py-2 bg-brand-primary text-text-primary-inverse font-medium rounded-lg hover:bg-brand-accent shadow-glow transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2 focus:ring-offset-surface-card"
          >
            Try Again
          </button>
        )}
        <button
          onClick={onClose}
          className={cn(
            'px-4 py-2 bg-surface-elevated text-text-primary border border-border-default font-medium rounded-lg hover:bg-surface-card hover:border-border-hover transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-border-hover focus:ring-offset-2 focus:ring-offset-surface-card',
            isRecoverable ? 'flex-1' : 'w-full'
          )}
        >
          Close
        </button>
      </div>
    </div>
  );
}

/**
 * Loading spinner component
 */
function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={cn('animate-spin text-brand-primary', className)}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      ></circle>
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      ></path>
    </svg>
  );
}
