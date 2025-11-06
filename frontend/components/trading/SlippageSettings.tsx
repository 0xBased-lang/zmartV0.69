'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

interface SlippageSettingsProps {
  value: number; // Percentage (0-100)
  onChange: (value: number) => void;
  className?: string;
}

/**
 * Slippage tolerance settings
 * Allows user to set max acceptable price movement
 */
export function SlippageSettings({
  value,
  onChange,
  className,
}: SlippageSettingsProps) {
  const [customMode, setCustomMode] = useState(false);

  const presets = [0.5, 1, 2, 5];

  const handlePreset = (preset: number) => {
    setCustomMode(false);
    onChange(preset);
  };

  const handleCustom = () => {
    setCustomMode(true);
  };

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">
          Slippage Tolerance
        </label>
        <span className="text-xs text-gray-500">
          Max price movement accepted
        </span>
      </div>

      {/* Preset Buttons */}
      <div className="flex gap-2">
        {presets.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => handlePreset(preset)}
            className={cn(
              'flex-1 px-3 py-2 text-sm font-medium rounded border transition-colors',
              !customMode && value === preset
                ? 'bg-blue-50 border-blue-500 text-blue-900'
                : 'border-gray-300 bg-white hover:bg-gray-50'
            )}
          >
            {preset}%
          </button>
        ))}
        <button
          type="button"
          onClick={handleCustom}
          className={cn(
            'flex-1 px-3 py-2 text-sm font-medium rounded border transition-colors',
            customMode
              ? 'bg-blue-50 border-blue-500 text-blue-900'
              : 'border-gray-300 bg-white hover:bg-gray-50'
          )}
        >
          Custom
        </button>
      </div>

      {/* Custom Input */}
      {customMode && (
        <div className="relative">
          <input
            type="number"
            value={value}
            onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
            placeholder="Enter %"
            min="0"
            max="100"
            step="0.1"
            className="w-full px-3 py-2 text-sm rounded border-2 border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="absolute right-3 top-2 text-sm text-gray-500">%</span>
        </div>
      )}

      {/* Warning for high slippage */}
      {value > 5 && (
        <div className="text-xs text-amber-600 flex items-center gap-1 bg-amber-50 p-2 rounded">
          <span>⚠️</span>
          <span>High slippage tolerance may result in unfavorable trades</span>
        </div>
      )}
    </div>
  );
}
