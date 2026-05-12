import { parseDeckColorLabel } from 'deck-ink';

export { DECK_COLOR_OPTIONS, type DeckColorLabel as DeckColor } from 'deck-ink';

/** Stage options for match forms (must match API enum) */
export const STAGE_OPTIONS = ['Tournament', 'Casual', 'Practice', 'Online'] as const;

/** Lorcana ink color image paths (under /ink/ in static) */
export const INK_IMAGE: Record<string, string> = {
  Amber: '/ink/amber.png',
  Amethyst: '/ink/amethyst.png',
  Emerald: '/ink/emerald.png',
  Ruby: '/ink/ruby.png',
  Sapphire: '/ink/sapphire.png',
  Steel: '/ink/steel.png',
};

/** Return [color1, color2] for a deck color string, e.g. "Amber / Amethyst" → ["Amber", "Amethyst"] */
export function getInkColors(label: string): [string, string] | null {
  const p = parseDeckColorLabel(label);
  if (!p) return null;
  const [a, b] = p;
  if (INK_IMAGE[a] && INK_IMAGE[b]) return [a, b];
  return null;
}

export type MatchStage = (typeof STAGE_OPTIONS)[number];

export type GameStatus = 'in_progress' | 'done';

/** Game event type (must match API GameEventType enum). */
export const GameEventType = {
  Start: 'start',
  End: 'end',
  LoreIncreased: 'lore_increased',
  LoreDecreased: 'lore_decreased',
  GameConceded: 'game_conceded',
} as const;

export type GameEventTypeValue = (typeof GameEventType)[keyof typeof GameEventType];

/** Game event for tracking start, end, and lore changes (syncs to API). */
export interface GameEvent {
  type: GameEventTypeValue;
  timestamp: Date | string;
  player?: string;
}

export interface Game {
  p1Lore?: number;
  p2Lore?: number;
  status?: GameStatus;
  winner?: string;
  /** Player ID who started the game (went first). */
  starter?: string;
  /** Events (start, end, lore_increased, lore_decreased, game_conceded, …) for this game. */
  events?: GameEvent[];
  /** Optional notes (e.g. import provenance). */
  notes?: string;
}

export function gameWinnerId(game: { winner?: string | { _id: string } }): string | undefined {
  const w = game.winner;
  if (w == null) return undefined;
  return typeof w === 'object' ? w._id : w;
}
