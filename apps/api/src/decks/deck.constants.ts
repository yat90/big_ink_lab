/** Regex for parsing deck list lines: optional count and card name (e.g. "2x Card Name" or "1 Card Name"). */
export const LINE_REGEX = /^(\d+)\s*x?\s*(.+)$/i;

/** Canonical ink order for consistent deck color pairing. */
export const INK_ORDER: Record<string, number> = {
  Amber: 0,
  Amethyst: 1,
  Emerald: 2,
  Ruby: 3,
  Sapphire: 4,
  Steel: 5,
};

/** Canonical ink names as array (keys of INK_ORDER). */
export const INKS = Object.keys(INK_ORDER) as string[];
