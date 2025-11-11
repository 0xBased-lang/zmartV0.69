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
        <label htmlFor="quantity" className="block text-sm font-medium text-text-primary mb-1">
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
            'focus:outline-none focus:ring-2 focus:ring-brand-primary',
            'transition-all duration-200 bg-surface-elevated text-text-primary',
            error
              ? 'border-status-error'
              : focused
                ? 'border-brand-primary shadow-glow'
                : 'border-border-default'
          )}
        />
        {max && (
          <div className="absolute right-3 top-9 text-sm text-text-tertiary">
            Max: {max.toLocaleString()}
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="text-sm text-status-error flex items-center gap-1">
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
            className="flex-1 px-3 py-2 text-sm font-medium rounded border border-border-default bg-surface-elevated text-text-primary hover:bg-surface-card hover:border-brand-primary transition-all duration-200"
          >
            {preset}
          </button>
        ))}
        {max && (
          <button
            type="button"
            onClick={() => handlePreset('max')}
            className="flex-1 px-3 py-2 text-sm font-medium rounded border border-border-default bg-surface-elevated text-text-primary hover:bg-surface-card hover:border-brand-primary transition-all duration-200"
          >
            MAX
          </button>
        )}
      </div>
    </div>
  );
}
