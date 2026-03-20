/** Locale-aware date strings for lists, stats, and match metadata. */
export class DateDisplay {
  static formatDate(s: string | undefined): string {
    if (!s) return '–';
    try {
      return new Date(s).toLocaleDateString(undefined, { dateStyle: 'medium' });
    } catch {
      return s;
    }
  }

  static formatRelativeDate(s: string | undefined): string {
    if (!s) return '–';
    try {
      const d = new Date(s);
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays} days ago`;
      if (diffDays < 14) return 'Last week';
      return DateDisplay.formatDate(s);
    } catch {
      return s ?? '–';
    }
  }
}
