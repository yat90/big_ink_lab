/** Regex for parsing deck list lines: optional count and card name (e.g. "2x Card Name" or "1 Card Name"). */
export const LINE_REGEX = /^(\d+)\s*x?\s*(.+)$/i;
