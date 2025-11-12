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
        <label className="text-sm font-medium text-text-primary">
          Slippage Tolerance
        </label>
        <span className="text-xs text-text-tertiary">
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
              'flex-1 px-3 py-2 text-sm font-medium rounded border transition-all duration-200',
              !customMode && value === preset
                ? 'bg-brand-primary/10 border-brand-primary text-brand-primary shadow-glow'
                : 'border-border-default bg-surface-elevated text-text-primary hover:bg-surface-card hover:border-brand-primary'
            )}
          >
            {preset}%
          </button>
        ))}
        <button
          type="button"
          onClick={handleCustom}
          className={cn(
            'flex-1 px-3 py-2 text-sm font-medium rounded border transition-all duration-200',
            customMode
              ? 'bg-brand-primary/10 border-brand-primary text-brand-primary shadow-glow'
              : 'border-border-default bg-surface-elevated text-text-primary hover:bg-surface-card hover:border-brand-primary'
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
            className="w-full px-3 py-2 text-sm rounded border-2 border-brand-primary bg-surface-elevated text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary shadow-glow"
          />
          <span className="absolute right-3 top-2 text-sm text-text-tertiary">%</span>
        </div>
      )}

      {/* Warning for high slippage */}
      {value > 5 && (
        <div className="text-xs text-status-warning flex items-center gap-1 bg-status-warning/10 border border-status-warning/20 p-2 rounded">
          <span>⚠️</span>
          <span>High slippage tolerance may result in unfavorable trades</span>
        </div>
      )}
    </div>
  );
}
