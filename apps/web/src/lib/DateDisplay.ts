/**
 * Locale-aware date strings for lists, stats, and match metadata.
 *
 * All formatters use the user's locale (`undefined` argument to the `Intl`
 * APIs lets the browser pick `navigator.language`). Lists should prefer
 * `formatRelative`; detail pages and metadata rows should use `formatDateTime`
 * or `formatDate`.
 */

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

export class DateDisplay {
  /** Short date + time using the user's locale (e.g. `4/29/26, 11:05 AM`). */
  static formatDateTime(s: string | undefined): string {
    if (!s) return '–';
    try {
      return new Date(s).toLocaleString(undefined, {
        dateStyle: 'short',
        timeStyle: 'short',
      });
    } catch {
      return s;
    }
  }

  /** Medium date only, e.g. `Apr 29, 2026` (en-US). */
  static formatDate(s: string | undefined): string {
    if (!s) return '–';
    try {
      return new Date(s).toLocaleDateString(undefined, { dateStyle: 'medium' });
    } catch {
      return s;
    }
  }

  /**
   * Relative time tuned for list rows.
   *
   * - `< 60s`             → `just now`
   * - `< 60m`             → `5m ago`
   * - `< 24h`             → `2h ago`
   * - same calendar day   → `2h ago` (covered above)
   * - previous calendar day → `Yesterday`
   * - 2–6 days ago        → `3d ago` via `Intl.RelativeTimeFormat`
   * - older, current year → `Mar 4`
   * - older, other year   → `Mar 4 2024`
   *
   * Future timestamps are formatted symmetrically (`in 5m`, `Tomorrow`, …).
   */
  static formatRelative(s: string | undefined): string {
    if (!s) return '–';
    try {
      const d = new Date(s);
      const t = d.getTime();
      if (Number.isNaN(t)) return s;
      const now = Date.now();
      const diffMs = t - now;
      const absMs = Math.abs(diffMs);

      if (absMs < MINUTE_MS) return 'just now';

      const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });

      if (absMs < HOUR_MS) {
        const minutes = Math.round(diffMs / MINUTE_MS);
        return rtf.format(minutes, 'minute');
      }

      if (absMs < DAY_MS) {
        const hours = Math.round(diffMs / HOUR_MS);
        return rtf.format(hours, 'hour');
      }

      // Use calendar-day diff so "yesterday" lines up with the user's clock,
      // not a fixed 24 h window.
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const startOfThat = new Date(d);
      startOfThat.setHours(0, 0, 0, 0);
      const dayDiff = Math.round(
        (startOfThat.getTime() - startOfToday.getTime()) / DAY_MS
      );

      if (Math.abs(dayDiff) < 7) {
        return rtf.format(dayDiff, 'day');
      }

      const sameYear = d.getFullYear() === new Date().getFullYear();
      return new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric',
        year: sameYear ? undefined : 'numeric',
      }).format(d);
    } catch {
      return s;
    }
  }

  /** @deprecated Use {@link DateDisplay.formatRelative}. Kept as alias for older callers. */
  static formatRelativeDate(s: string | undefined): string {
    return DateDisplay.formatRelative(s);
  }
}
