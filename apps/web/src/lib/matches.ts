/** Stage options for match forms (must match API enum) */
export const STAGE_OPTIONS = ['Tournament', 'Casual', 'Practice'] as const;

/** Deck color options for match forms (must match API enum) */
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

/** Lorcana ink emoji per color (for display in deck color selects) */
const INK_EMOJI: Record<string, string> = {
  Amber: '🟡',
  Amethyst: '🟣',
  Emerald: '🟢',
  Ruby: '🔴',
  Sapphire: '🔵',
  Steel: '⚙️',
};

/** Return ink emoji pair for a deck color string, e.g. "Amber / Amethyst" → "🟡 🟣" */
export function deckColorToInk(label: string): string {
  if (!label) return '–';
  const [a, b] = label.split(' / ').map((s) => s.trim());
  const e1 = INK_EMOJI[a] ?? '';
  const e2 = INK_EMOJI[b] ?? '';
  return e1 && e2 ? `${e1} ${e2}` : label;
}

export type MatchStage = (typeof STAGE_OPTIONS)[number];
export type DeckColor = (typeof DECK_COLOR_OPTIONS)[number];

export type GameStatus = 'in_progress' | 'done';

export interface Game {
  p1Lore?: number;
  p2Lore?: number;
  status?: GameStatus;
  winner?: string;
}
