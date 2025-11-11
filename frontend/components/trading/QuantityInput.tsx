'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

interface QuantityInputProps {
  value: string;
  onChange: (value: string) => void;
  max?: number;
  error?: string;
  className?: string;
}

/**
 * Validated number input for share quantity
 * Supports presets (10, 50, 100, MAX)
 */
export function QuantityInput({
  value,
  onChange,
  max,
  error,
  className,
}: QuantityInputProps) {
  const [focused, setFocused] = useState(false);

  const presets = [10, 50, 100];

  const handlePreset = (preset: number | 'max') => {
    if (preset === 'max' && max) {
      onChange(max.toString());
    } else if (typeof preset === 'number') {
      onChange(preset.toString());
    }
  };

  return (
    <div className={cn('space-y-2', className)}>
      {/* Input Field */}
      <div className="relative">
        <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-1">
          Number of Shares
        </label>
        <input
          id="quantity"
          type="number"
          data-testid="amount-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="0"
          min="0"
          max={max}
          step="0.01"
          className={cn(
            'w-full px-4 py-3 text-lg font-medium rounded-lg border-2',
            'focus:outline-none focus:ring-2 focus:ring-blue-500',
            'transition-colors',
            error
              ? 'border-red-300 bg-red-50 text-red-900'
              : focused
                ? 'border-blue-400 bg-white'
                : 'border-gray-300 bg-white'
          )}
        />
        {max && (
          <div className="absolute right-3 top-9 text-sm text-gray-500">
            Max: {max.toLocaleString()}
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="text-sm text-red-600 flex items-center gap-1">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* Preset Buttons */}
      <div className="flex gap-2">
        {presets.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => handlePreset(preset)}
            className="flex-1 px-3 py-2 text-sm font-medium rounded border border-gray-300 bg-white hover:bg-gray-50 transition-colors"
          >
            {preset}
          </button>
        ))}
        {max && (
          <button
            type="button"
            onClick={() => handlePreset('max')}
            className="flex-1 px-3 py-2 text-sm font-medium rounded border border-gray-300 bg-white hover:bg-gray-50 transition-colors"
          >
            MAX
          </button>
        )}
      </div>
    </div>
  );
}
