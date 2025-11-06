'use client';

import { useState, useMemo } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import {
  Outcome,
  TradeAction,
  toFixedPoint,
  calculateTrade,
  calculatePrices,
  type MarketState,
  type TradeResult,
} from '@/lib/lmsr';
import { useTrade, TransactionState } from '@/lib/hooks/useTrade';
import { OutcomeSelector } from './OutcomeSelector';
import { QuantityInput } from './QuantityInput';
import { CostBreakdown } from './CostBreakdown';
import { SlippageSettings } from './SlippageSettings';
import { TransactionModal } from './TransactionModal';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

interface TradeFormProps {
  marketId: string;
  marketState: MarketState;
  onTrade?: (result: TradeResult) => void;
  className?: string;
}

/**
 * Complete trading form with:
 * - Outcome selector (YES/NO)
 * - Action selector (BUY/SELL)
 * - Quantity input with presets
 * - Real-time LMSR price calculation
 * - Cost breakdown with fees
 * - Slippage settings
 */
export function TradeForm({ marketId, marketState, onTrade, className }: TradeFormProps) {
  const { connected, publicKey } = useWallet();
  const { state: txState, signature, error, executeTrade, reset, retry } = useTrade();

  // Form state
  const [outcome, setOutcome] = useState<Outcome>(Outcome.YES);
  const [action, setAction] = useState<TradeAction>(TradeAction.BUY);
  const [quantityInput, setQuantityInput] = useState<string>('');
  const [slippage, setSlippage] = useState<number>(1); // 1% default
  const [showSlippage, setShowSlippage] = useState(false);

  // Modal visibility
  const showModal =
    txState !== TransactionState.IDLE && txState !== TransactionState.ERROR;

  // Calculate current prices
  const currentPrices = useMemo(() => {
    try {
      return calculatePrices(marketState);
    } catch (error) {
      console.error('Error calculating prices:', error);
      return { yesPrice: 50, noPrice: 50, probabilitySum: 100 };
    }
  }, [marketState]);

  // Validate and parse quantity
  const quantity = useMemo(() => {
    if (!quantityInput || quantityInput === '0') return null;
    try {
      const parsed = parseFloat(quantityInput);
      if (isNaN(parsed) || parsed <= 0) return null;
      return toFixedPoint(parsed);
    } catch {
      return null;
    }
  }, [quantityInput]);

  // Calculate trade result
  const tradeResult = useMemo((): TradeResult | null => {
    if (!quantity) return null;

    try {
      return calculateTrade({
        action,
        outcome,
        quantity,
        marketState,
      });
    } catch (error) {
      console.error('Error calculating trade:', error);
      return null;
    }
  }, [quantity, action, outcome, marketState]);

  // Validate trade
  const validationError = useMemo(() => {
    if (!connected) return 'Please connect your wallet';
    if (!quantityInput) return null;
    if (!quantity) return 'Invalid quantity';

    if (tradeResult) {
      // Check slippage
      const currentPrice = outcome === Outcome.YES ? currentPrices.yesPrice : currentPrices.noPrice;
      const slippagePercent = Math.abs(tradeResult.priceImpact);
      if (slippagePercent > slippage) {
        return `Price impact (${slippagePercent.toFixed(2)}%) exceeds slippage tolerance (${slippage}%)`;
      }

      // TODO: Check user balance
      // TODO: Check market state (must be ACTIVE)
    }

    return null;
  }, [connected, quantityInput, quantity, tradeResult, currentPrices, outcome, slippage]);

  const canSubmit = connected && quantity && tradeResult && !validationError;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!canSubmit || !tradeResult || !quantity) return;

    try {
      // Execute trade transaction
      const result = await executeTrade({
        marketId,
        action,
        outcome,
        quantity,
        tradeResult,
        maxSlippage: slippage,
      });

      if (result) {
        // Success callback
        onTrade?.(tradeResult);

        // Show success toast
        toast.success(
          `${action === TradeAction.BUY ? 'Bought' : 'Sold'} ${quantityInput} ${outcome} shares`
        );

        // Reset form
        setQuantityInput('');
      }
    } catch (err) {
      // Error handled by modal
      console.error('Trade execution failed:', err);
    }
  };

  const handleCloseModal = () => {
    reset();
  };

  const handleRetry = async () => {
    try {
      await retry();
    } catch (err) {
      console.error('Retry failed:', err);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={cn('space-y-6', className)}>
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Trade</h2>
        <p className="text-gray-600 text-sm mt-1">
          Buy or sell shares based on your prediction
        </p>
      </div>

      {/* Outcome Selector */}
      <OutcomeSelector
        value={outcome}
        onChange={setOutcome}
        yesPrice={currentPrices.yesPrice}
        noPrice={currentPrices.noPrice}
      />

      {/* Action Selector */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setAction(TradeAction.BUY)}
          className={cn(
            'flex-1 px-4 py-2 font-medium rounded-lg transition-colors',
            'border-2 focus:outline-none focus:ring-2 focus:ring-blue-500',
            action === TradeAction.BUY
              ? 'bg-blue-50 border-blue-500 text-blue-900'
              : 'bg-white border-gray-300 text-gray-700 hover:border-blue-300'
          )}
        >
          Buy
        </button>
        <button
          type="button"
          onClick={() => setAction(TradeAction.SELL)}
          className={cn(
            'flex-1 px-4 py-2 font-medium rounded-lg transition-colors',
            'border-2 focus:outline-none focus:ring-2 focus:ring-blue-500',
            action === TradeAction.SELL
              ? 'bg-blue-50 border-blue-500 text-blue-900'
              : 'bg-white border-gray-300 text-gray-700 hover:border-blue-300'
          )}
        >
          Sell
        </button>
      </div>

      {/* Quantity Input */}
      <QuantityInput
        value={quantityInput}
        onChange={setQuantityInput}
        error={validationError || undefined}
      />

      {/* Price Preview */}
      {tradeResult && (
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-blue-900">
              New {outcome} Price
            </span>
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-900">
                {tradeResult.newPrice.toFixed(1)}%
              </div>
              <div
                className={cn(
                  'text-sm font-medium',
                  tradeResult.priceImpact > 0 ? 'text-green-600' : 'text-red-600'
                )}
              >
                {tradeResult.priceImpact > 0 ? '+' : ''}
                {tradeResult.priceImpact.toFixed(2)}%
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cost Breakdown */}
      {tradeResult && (
        <CostBreakdown
          baseCost={tradeResult.baseCost}
          protocolFee={tradeResult.protocolFee}
          creatorFee={tradeResult.creatorFee}
          stakerFee={tradeResult.stakerFee}
          totalFee={tradeResult.totalFee}
          finalAmount={tradeResult.finalAmount}
          action={action}
        />
      )}

      {/* Slippage Settings */}
      <button
        type="button"
        onClick={() => setShowSlippage(!showSlippage)}
        className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
      >
        {showSlippage ? '▼' : '▶'} Slippage Settings ({slippage}%)
      </button>

      {showSlippage && <SlippageSettings value={slippage} onChange={setSlippage} />}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={!canSubmit}
        className={cn(
          'w-full px-6 py-4 text-lg font-semibold rounded-lg transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-offset-2',
          canSubmit
            ? 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500'
            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
        )}
      >
        {!connected
          ? 'Connect Wallet to Trade'
          : validationError
            ? validationError
            : action === TradeAction.BUY
              ? `Buy ${outcome} Shares`
              : `Sell ${outcome} Shares`}
      </button>

      {/* Wallet Connect Helper */}
      {!connected && (
        <div className="text-center text-sm text-gray-600 bg-gray-50 rounded-lg p-4">
          <p>Connect your Solana wallet to start trading</p>
          <p className="text-xs mt-1 text-gray-500">
            Supported: Phantom, Solflare, Backpack
          </p>
        </div>
      )}

      {/* Transaction Modal */}
      {tradeResult && (
        <TransactionModal
          isOpen={showModal || txState === TransactionState.ERROR}
          onClose={handleCloseModal}
          state={txState}
          signature={signature}
          error={error}
          onRetry={handleRetry}
          action={action}
          outcome={outcome}
          quantity={quantity || 0n}
          finalAmount={tradeResult.finalAmount}
          newPrice={tradeResult.newPrice}
          priceImpact={tradeResult.priceImpact}
        />
      )}
    </form>
  );
}
