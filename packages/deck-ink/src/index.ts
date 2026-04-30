/** Canonical ink order for deck color strings and analytics. */
export const INK_ORDER: Record<string, number> = {
  Amber: 0,
  Amethyst: 1,
  Emerald: 2,
  Ruby: 3,
  Sapphire: 4,
  Steel: 5,
};

/** Single-ink names in display order. */
export const INKS: readonly string[] = Object.keys(INK_ORDER).sort(
  (a, b) => (INK_ORDER[a] ?? 99) - (INK_ORDER[b] ?? 99),
);

/**
 * All valid two-ink deck labels. Order matches pairs derived from INK_ORDER
 * (same as legacy API enum / web picker).
 */
export const DECK_COLOR_OPTIONS = [
  'Amber / Amethyst',
  'Amber / Emerald',
  'Amber / Ruby',
  'Amber / Sapphire',
  'Amber / Steel',
  'Amethyst / Emerald',
  'Amethyst / Ruby',
  'Amethyst / Sapphire',
  'Amethyst / Steel',
  'Emerald / Ruby',
  'Emerald / Sapphire',
  'Emerald / Steel',
  'Ruby / Sapphire',
  'Ruby / Steel',
  'Sapphire / Steel',
] as const;

export type DeckColorLabel = (typeof DECK_COLOR_OPTIONS)[number];

export const DEFAULT_DECK_COLOR: DeckColorLabel = DECK_COLOR_OPTIONS[0];

/** Hex colors for charts (web). */
export const INK_CHART_COLORS: Readonly<Record<string, string>> = {
  Amber: '#f59e0b',
  Amethyst: '#7c3aed',
  Emerald: '#10b981',
  Ruby: '#ef4444',
  Sapphire: '#06b6d4',
  Steel: '#64748b',
  Other: '#475569',
};

/** Lowercase slug → canonical ink name (e.g. duels import). */
export const INK_SLUG_TO_CANONICAL: Readonly<Record<string, string>> = Object.fromEntries(
  INKS.map((ink) => [ink.toLowerCase(), ink]),
);

/**
 * Parse "A / B" deck label into two canonical ink names if both are known.
 */
export function parseDeckColorLabel(label: string): [string, string] | null {
  if (!label) return null;
  const parts = label.split(' / ').map((s) => s.trim());
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  const [a, b] = parts;
  if (INK_ORDER[a] === undefined || INK_ORDER[b] === undefined) return null;
  return [a, b];
}

(function assertDeckColorsMatchInkOrder(): void {
  const inks = [...INKS];
  const generated: string[] = [];
  for (let i = 0; i < inks.length; i++) {
    for (let j = i + 1; j < inks.length; j++) {
      generated.push(`${inks[i]} / ${inks[j]}`);
    }
  }
  const expected = [...DECK_COLOR_OPTIONS];
  if (
    generated.length !== expected.length ||
    generated.some((g, idx) => g !== expected[idx])
  ) {
    throw new Error('deck-ink: DECK_COLOR_OPTIONS does not match pairs from INK_ORDER');
  }
})();
