export type GameRow = {
  winnerSide: '' | 'p1' | 'p2';
  starterSide: '' | 'p1' | 'p2';
  p1Lore: string;
  p2Lore: string;
  notes: string;
};

export type TournamentRoundResultMode = 'match' | 'intentionalDraw' | 'bye';

export type RoundRow = {
  round: string;
  /** `match` = played games; `intentionalDraw` = ID; `bye` = free win. */
  resultMode: TournamentRoundResultMode;
  /** Opponent name; API resolves to existing player or creates a guest. */
  opponentName: string;
  p2DeckColor: string;
  notes: string;
  games: GameRow[];
};

/** Same as match lore tracker: first to 20 wins; if both ≥20, higher lore wins (ties → P1). */
export const GAME_LORE_WIN = 20;

export function emptyGame(): GameRow {
  return {
    winnerSide: '',
    starterSide: '',
    p1Lore: '',
    p2Lore: '',
    notes: '',
  };
}

export function emptyRound(label: string): RoundRow {
  return {
    round: label,
    resultMode: 'match',
    opponentName: '',
    p2DeckColor: '',
    notes: '',
    games: [emptyGame()],
  };
}

export function parseLoreField(s: string): number | undefined {
  const t = s.trim();
  if (t === '') return undefined;
  const n = Number.parseInt(t, 10);
  if (Number.isNaN(n) || n < 0) return undefined;
  return n;
}

/** Derive winner from lore (used when editing lore fields). */
export function winnerSideFromLore(p1Str: string, p2Str: string): '' | 'p1' | 'p2' {
  const p1 = parseLoreField(p1Str);
  const p2 = parseLoreField(p2Str);
  if (p1 === undefined && p2 === undefined) return '';
  if (p1 !== undefined && p2 !== undefined) {
    if (p1 >= GAME_LORE_WIN && p2 >= GAME_LORE_WIN) {
      return p1 >= p2 ? 'p1' : 'p2';
    }
    if (p1 >= GAME_LORE_WIN && p2 < GAME_LORE_WIN) return 'p1';
    if (p2 >= GAME_LORE_WIN && p1 < GAME_LORE_WIN) return 'p2';
    if (p1 > p2) return 'p1';
    if (p2 > p1) return 'p2';
    return '';
  }
  if (p1 !== undefined && p2 === undefined && p1 >= GAME_LORE_WIN) return 'p1';
  if (p2 !== undefined && p1 === undefined && p2 >= GAME_LORE_WIN) return 'p2';
  return '';
}

/** Loser of the previous game goes first in the next (typical "loser starts"). */
export function starterSideAfterPrevious(prev: GameRow): '' | 'p1' | 'p2' {
  if (prev.winnerSide === 'p1') return 'p2';
  if (prev.winnerSide === 'p2') return 'p1';
  return '';
}
