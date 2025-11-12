/**
 * Safe Date Formatter Utilities
 * Prevents "Invalid time value" RangeError in production
 *
 * All functions validate dates before formatting and provide fallback values.
 * Use these utilities instead of calling new Date() and formatting directly.
 *
 * @module date-formatter
 * @created November 11, 2025
 */

import { formatDistanceToNow } from 'date-fns';

/**
 * Check if a value is a valid date
 *
 * @param date - Date value to validate (can be Date, string, number, or null/undefined)
 * @returns true if date is valid, false otherwise
 *
 * @example
 * isValidDate(new Date()); // true
 * isValidDate('2025-11-11'); // true
 * isValidDate(null); // false
 * isValidDate(NaN); // false
 * isValidDate(0); // false
 */
export function isValidDate(date: Date | string | number | null | undefined): boolean {
  // Handle null/undefined
  if (date == null) {
    return false;
  }

  // Convert to Date object if needed
  const d = date instanceof Date ? date : new Date(date);

  // Check if date is valid (not NaN) and has a positive timestamp
  return !isNaN(d.getTime()) && d.getTime() > 0;
}

/**
 * Safely format a date to localized date string
 *
 * @param timestamp - Date value (Date, string, number, null, or undefined)
 * @param fallback - Fallback string if date is invalid (default: "Invalid date")
 * @returns Formatted date string or fallback
 *
 * @example
 * safeFormatDate(new Date()); // "Nov 11, 2025"
 * safeFormatDate('2025-11-11'); // "Nov 11, 2025"
 * safeFormatDate(null); // "Invalid date"
 * safeFormatDate(null, 'Unknown'); // "Unknown"
 * safeFormatDate(0, 'Never'); // "Never"
 */
export function safeFormatDate(
  timestamp: string | Date | number | null | undefined,
  fallback: string = 'Invalid date'
): string {
  if (!isValidDate(timestamp)) {
    return fallback;
  }

  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);

  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Safely format a date to localized time string
 *
 * @param timestamp - Date value (Date, string, number, null, or undefined)
 * @param fallback - Fallback string if date is invalid (default: "Invalid time")
 * @returns Formatted time string or fallback
 *
 * @example
 * safeFormatTime(new Date()); // "3:45 PM"
 * safeFormatTime(null, 'Unknown'); // "Unknown"
 */
export function safeFormatTime(
  timestamp: string | Date | number | null | undefined,
  fallback: string = 'Invalid time'
): string {
  if (!isValidDate(timestamp)) {
    return fallback;
  }

  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);

  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Safely format a date to "X ago" format using date-fns
 *
 * @param timestamp - Date value (Date, string, number, null, or undefined)
 * @param fallback - Fallback string if date is invalid (default: "recently")
 * @returns Formatted relative time string or fallback
 *
 * @example
 * safeFormatDistanceToNow(new Date()); // "less than a minute ago"
 * safeFormatDistanceToNow(Date.now() - 3600000); // "about 1 hour ago"
 * safeFormatDistanceToNow(null); // "recently"
 * safeFormatDistanceToNow(null, 'Unknown'); // "Unknown"
 */
export function safeFormatDistanceToNow(
  timestamp: string | Date | number | null | undefined,
  fallback: string = 'recently'
): string {
  if (!isValidDate(timestamp)) {
    return fallback;
  }

  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);

  try {
    return formatDistanceToNow(date, { addSuffix: true });
  } catch (error) {
    // Fallback if date-fns throws an error
    return fallback;
  }
}

/**
 * Safely format a date to compact "time ago" format (custom implementation)
 * More compact than date-fns formatDistanceToNow
 *
 * @param timestamp - Date value (Date, string, number, null, or undefined)
 * @param fallback - Fallback string if date is invalid (default: "recently")
 * @returns Formatted relative time string or fallback
 *
 * @example
 * safeFormatTimeAgo(Date.now()); // "just now"
 * safeFormatTimeAgo(Date.now() - 60000); // "1m ago"
 * safeFormatTimeAgo(Date.now() - 3600000); // "1h ago"
 * safeFormatTimeAgo(Date.now() - 86400000); // "1d ago"
 * safeFormatTimeAgo(null); // "recently"
 */
export function safeFormatTimeAgo(
  timestamp: string | Date | number | null | undefined,
  fallback: string = 'recently'
): string {
  if (!isValidDate(timestamp)) {
    return fallback;
  }

  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  // Handle future dates
  if (seconds < 0) {
    return 'in the future';
  }

  // Less than a minute
  if (seconds < 60) {
    return 'just now';
  }

  // Less than an hour
  if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ago`;
  }

  // Less than a day
  if (seconds < 86400) {
    const hours = Math.floor(seconds / 3600);
    return `${hours}h ago`;
  }

  // Less than a month
  if (seconds < 2592000) {
    const days = Math.floor(seconds / 86400);
    return `${days}d ago`;
  }

  // Months
  const months = Math.floor(seconds / 2592000);
  return `${months}mo ago`;
}

/**
 * Safely format date and time together
 *
 * @param timestamp - Date value (Date, string, number, null, or undefined)
 * @param fallback - Fallback string if date is invalid (default: "Invalid date")
 * @returns Formatted date and time string or fallback
 *
 * @example
 * safeFormatDateTime(new Date()); // "Nov 11, 2025, 3:45 PM"
 * safeFormatDateTime(null); // "Invalid date"
 */
export function safeFormatDateTime(
  timestamp: string | Date | number | null | undefined,
  fallback: string = 'Invalid date'
): string {
  if (!isValidDate(timestamp)) {
    return fallback;
  }

  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);

  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Safely convert Unix timestamp (seconds) to milliseconds and format
 * Common pattern when dealing with blockchain timestamps
 *
 * @param unixTimestamp - Unix timestamp in seconds (not milliseconds)
 * @param fallback - Fallback string if timestamp is invalid
 * @returns Formatted date string or fallback
 *
 * @example
 * safeFormatUnixTimestamp(1731355200); // "Nov 11, 2025"
 * safeFormatUnixTimestamp(0, 'Never'); // "Never"
 */
export function safeFormatUnixTimestamp(
  unixTimestamp: number | null | undefined,
  fallback: string = 'Invalid date'
): string {
  if (unixTimestamp == null || unixTimestamp <= 0) {
    return fallback;
  }

  // Convert Unix timestamp (seconds) to milliseconds
  return safeFormatDate(unixTimestamp * 1000, fallback);
}
