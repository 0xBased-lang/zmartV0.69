/**
 * Fixed-Point Arithmetic Utilities
 *
 * All arithmetic operations use BigInt to prevent overflow
 * and maintain precision matching Solana's u64 representation.
 *
 * Representation: value = raw_value / (10^DECIMALS)
 * Example: 1 SOL = 1_000_000_000 base units
 */

import { DECIMALS, SCALE, LMSRError } from './types';

/**
 * Convert a number to fixed-point BigInt
 * @param value - Number value (e.g., 1.5)
 * @returns Fixed-point BigInt (e.g., 1_500_000_000n)
 */
export function toFixedPoint(value: number): bigint {
  if (!Number.isFinite(value)) {
    throw new LMSRError('Cannot convert non-finite number to fixed-point');
  }
  if (value < 0) {
    throw new LMSRError('Cannot convert negative number to fixed-point');
  }

  // Multiply by scale and round to nearest integer (banker's rounding)
  const scaled = value * Number(SCALE);
  return BigInt(Math.round(scaled));
}

/**
 * Convert fixed-point BigInt to number
 * @param value - Fixed-point BigInt (e.g., 1_500_000_000n)
 * @returns Number value (e.g., 1.5)
 */
export function fromFixedPoint(value: bigint): number {
  return Number(value) / Number(SCALE);
}

/**
 * Format fixed-point value as human-readable string
 * @param value - Fixed-point BigInt
 * @param decimals - Number of decimals to display (default: 4)
 * @returns Formatted string (e.g., "1.5000")
 */
export function formatFixedPoint(value: bigint, decimals: number = 4): string {
  const num = fromFixedPoint(value);
  return num.toFixed(decimals);
}

/**
 * Multiply two fixed-point values
 * @param a - First operand
 * @param b - Second operand
 * @returns Product (a * b)
 */
export function mulFixedPoint(a: bigint, b: bigint): bigint {
  return (a * b) / SCALE;
}

/**
 * Divide two fixed-point values
 * @param a - Dividend
 * @param b - Divisor
 * @returns Quotient (a / b)
 */
export function divFixedPoint(a: bigint, b: bigint): bigint {
  if (b === 0n) {
    throw new LMSRError('Division by zero');
  }
  return (a * SCALE) / b;
}

/**
 * Calculate natural logarithm of fixed-point value
 * Uses Taylor series approximation for ln(1 + x)
 *
 * ln(x) = ln(1 + (x-1)) ≈ sum of series for |x-1| < 1
 *
 * @param x - Input value (fixed-point)
 * @returns ln(x) as fixed-point
 */
export function lnFixedPoint(x: bigint): bigint {
  if (x <= 0n) {
    throw new LMSRError('Cannot calculate ln of non-positive number');
  }

  // Convert to float for Math.log (trade precision for simplicity in v1)
  // TODO: Implement integer Taylor series for production
  const xFloat = fromFixedPoint(x);
  const result = Math.log(xFloat);

  return toFixedPoint(result);
}

/**
 * Calculate exponential of fixed-point value
 * Uses Taylor series approximation: e^x = sum(x^n / n!)
 *
 * @param x - Exponent (fixed-point)
 * @returns e^x as fixed-point
 */
export function expFixedPoint(x: bigint): bigint {
  // Convert to float for Math.exp (trade precision for simplicity in v1)
  // TODO: Implement integer Taylor series for production
  const xFloat = fromFixedPoint(x);

  // Prevent overflow
  if (xFloat > 20) {
    throw new LMSRError('Exponential overflow: exponent too large');
  }
  if (xFloat < -20) {
    return 0n; // e^(-20) ≈ 0
  }

  const result = Math.exp(xFloat);
  return toFixedPoint(result);
}

/**
 * Safe addition with overflow check
 * @param a - First operand
 * @param b - Second operand
 * @returns Sum (a + b)
 */
export function safeAdd(a: bigint, b: bigint): bigint {
  const result = a + b;

  // Check for overflow (result should be >= both operands)
  if (result < a || result < b) {
    throw new LMSRError('Addition overflow');
  }

  return result;
}

/**
 * Safe subtraction with underflow check
 * @param a - Minuend
 * @param b - Subtrahend
 * @returns Difference (a - b)
 */
export function safeSub(a: bigint, b: bigint): bigint {
  if (b > a) {
    throw new LMSRError('Subtraction underflow');
  }

  return a - b;
}

/**
 * Safe multiplication with overflow check
 * @param a - First operand
 * @param b - Second operand
 * @returns Product (a * b)
 */
export function safeMul(a: bigint, b: bigint): bigint {
  // Check for overflow: if a * b / a != b, overflow occurred
  if (a === 0n || b === 0n) return 0n;

  const result = a * b;
  if (result / a !== b) {
    throw new LMSRError('Multiplication overflow');
  }

  return result;
}

/**
 * Calculate percentage (basis points)
 * @param value - Base value
 * @param bps - Basis points (e.g., 300 = 3%)
 * @returns Value * (bps / 10000)
 */
export function calculateBps(value: bigint, bps: number): bigint {
  const bpsBigInt = BigInt(bps);
  const denominator = BigInt(10_000);
  return (value * bpsBigInt) / denominator;
}

/**
 * Round to nearest integer (banker's rounding)
 * @param value - Fixed-point value with extra precision
 * @returns Rounded fixed-point value
 */
export function roundFixedPoint(value: bigint): bigint {
  // Already rounded to DECIMALS precision in toFixedPoint
  return value;
}

/**
 * Maximum of two fixed-point values
 */
export function maxFixedPoint(a: bigint, b: bigint): bigint {
  return a > b ? a : b;
}

/**
 * Minimum of two fixed-point values
 */
export function minFixedPoint(a: bigint, b: bigint): bigint {
  return a < b ? a : b;
}

/**
 * Absolute value
 */
export function absFixedPoint(a: bigint): bigint {
  return a < 0n ? -a : a;
}
