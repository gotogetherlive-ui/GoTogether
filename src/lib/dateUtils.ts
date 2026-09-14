/**
 * Utility functions for date/time formatting in IST (Indian Standard Time).
 * 
 * SQLite stores timestamps from `datetime('now')` as UTC without a 'Z' suffix
 * (e.g. "2026-05-12 13:36:00"). JavaScript's `new Date()` interprets these as
 * local time unless a 'Z' or timezone offset is appended.
 *
 * This utility normalizes all DB timestamps to ensure correct UTC parsing,
 * then formats them in the Asia/Kolkata timezone.
 */

/** Ensure a timestamp string from SQLite is treated as UTC by appending 'Z' if missing */
function parseUTCDate(dateStr: string): Date {
  if (!dateStr) return new Date();
  // If it already has timezone info (Z, +, -), parse directly
  if (/[Z+\-]\d{0,2}:?\d{0,2}$/.test(dateStr.trim())) {
    return new Date(dateStr);
  }
  // SQLite datetime format: "2026-05-12 13:36:00" → append 'Z' to parse as UTC
  return new Date(dateStr.trim() + 'Z');
}

/** Format a DB timestamp as IST date string (e.g. "12 May 2026") */
export function formatISTDate(dateStr: string, options?: Intl.DateTimeFormatOptions): string {
  const date = parseUTCDate(dateStr);
  return date.toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...options,
  });
}
