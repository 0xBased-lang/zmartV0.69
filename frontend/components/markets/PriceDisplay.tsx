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
          <div className="text-xs text-gray-500 mb-1">YES</div>
          <div className="text-lg font-bold text-green-600">
            {yesPrice.toFixed(1)}%
          </div>
        </div>
        <div className="flex-1">
          <div className="text-xs text-gray-500 mb-1">NO</div>
          <div className="text-lg font-bold text-red-600">
            {noPrice.toFixed(1)}%
          </div>
        </div>
      </div>
    </div>
  );
}
