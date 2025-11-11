interface PriceDisplayProps {
  yesPrice: number; // 0-100
  noPrice: number; // 0-100
  className?: string;
}

/**
 * Display YES/NO prices for a prediction market
 * Prices are shown as percentages (0-100%)
 */
export function PriceDisplay({
  yesPrice,
  noPrice,
  className,
}: PriceDisplayProps) {
  return (
    <div className={className}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <div className="text-xs text-text-tertiary mb-1">YES</div>
          <div className="text-lg font-bold text-trading-yes">
            {yesPrice.toFixed(1)}%
          </div>
        </div>
        <div className="flex-1">
          <div className="text-xs text-text-tertiary mb-1">NO</div>
          <div className="text-lg font-bold text-trading-no">
            {noPrice.toFixed(1)}%
          </div>
        </div>
      </div>
    </div>
  );
}
