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
      <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 p-6">
        {/* Close button (only in error state or success) */}
        {(state === TransactionState.ERROR || state === TransactionState.SUCCESS) && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
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
      <h3 className="text-xl font-bold text-gray-900 mb-2">
        Building Transaction
      </h3>
      <p className="text-gray-600 text-sm">
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
      <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
        <svg
          className="w-8 h-8 text-blue-600"
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
      <h3 className="text-xl font-bold text-gray-900 mb-2">Confirm in Wallet</h3>
      <p className="text-gray-600 text-sm mb-4">
        Please approve the transaction in your wallet
      </p>
      <div className="bg-blue-50 rounded-lg p-3 text-sm">
        <span className="font-medium">
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
      <h3 className="text-xl font-bold text-gray-900 mb-2">
        Submitting Transaction
      </h3>
      <p className="text-gray-600 text-sm">Sending to Solana blockchain...</p>
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
      <h3 className="text-xl font-bold text-gray-900 mb-2">
        Confirming Transaction
      </h3>
      <p className="text-gray-600 text-sm mb-4">
        Waiting for blockchain confirmation...
      </p>
      <p className="text-xs text-gray-500 mb-3">This usually takes 10-30 seconds</p>

      {signature && explorerUrl && (
        <a
          href={explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
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
      <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
        <svg
          className="w-8 h-8 text-green-600"
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

      <h3 className="text-xl font-bold text-gray-900 mb-2">Trade Successful!</h3>
      <p className="text-gray-600 text-sm mb-6">
        Your {isBuy ? 'purchase' : 'sale'} has been confirmed
      </p>

      {/* Trade Summary */}
      <div className="bg-gray-50 rounded-lg p-4 space-y-2 mb-6">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Action</span>
          <span className="font-medium">
            {isBuy ? 'Bought' : 'Sold'} {fromFixedPoint(quantity)} {outcome} shares
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">{isBuy ? 'Cost' : 'Received'}</span>
          <span className="font-medium">{fromFixedPoint(finalAmount).toFixed(4)} SOL</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">New {outcome} Price</span>
          <span className="font-medium">{newPrice.toFixed(1)}%</span>
        </div>
      </div>

      {/* Explorer Link */}
      {explorerUrl && (
        <a
          href={explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium mb-4"
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
        <p className="text-xs text-gray-500 mt-4">
          Closing in {autoCloseTimer} seconds...
        </p>
      )}
    </div>
  );
}

/**
 * Error step
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

  return (
    <div className="text-center py-8">
      {/* Error Icon */}
      <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
        <svg
          className="w-8 h-8 text-red-600"
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

      <h3 className="text-xl font-bold text-gray-900 mb-2">Transaction Failed</h3>
      <p className="text-gray-600 text-sm mb-6">
        {error?.message || 'An unknown error occurred'}
      </p>

      {/* Error Code */}
      {error?.code && (
        <div className="bg-red-50 rounded-lg p-3 mb-6">
          <p className="text-xs font-mono text-red-800">Error Code: {error.code}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        {isRecoverable && (
          <button
            onClick={onRetry}
            className="flex-1 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        )}
        <button
          onClick={onClose}
          className={cn(
            'px-4 py-2 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300 transition-colors',
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
      className={cn('animate-spin text-blue-600', className)}
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
