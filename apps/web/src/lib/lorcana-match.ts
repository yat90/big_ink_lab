import type { Game } from './matches';

export type LorcanaMatchPlayer = { _id: string; name: string; team?: string };

export type LorcanaMatchDeckRef = { _id: string; name?: string };

/** Lorcana match document shape (list, detail, and analytics-derived rows). */
export type LorcanaTournamentRef = {
  _id: string;
  name?: string;
  date?: string;
  location?: string;
  url?: string;
  /** Card pool / format, e.g. "Set 11", "Infinity". */
  meta?: string;
};

export type LorcanaMatch = {
  _id: string;
  stage?: string;
  tournament?: LorcanaTournamentRef | string;
  playedAt?: string;
  /** Swiss index ("1", "2") or label ("top 8", "final"). */
  round?: string;
  p1?: LorcanaMatchPlayer | string;
  p2?: LorcanaMatchPlayer | string;
  p1DeckColor?: string;
  p2DeckColor?: string;
  p1Deck?: LorcanaMatchDeckRef | string;
  p2Deck?: LorcanaMatchDeckRef | string;
  matchWinner?: LorcanaMatchPlayer | string;
  games?: Game[];
  notes?: string;
};

const STATS_RECENT_FORM_OPPONENT_ID = '__stats_recent_form_opponent__';

export type RecentFormMatchFields = {
  matchId: string;
  playedAt: string;
  stage: string;
  opponentDeckColor: string;
  myDeckColor: string;
  matchWon: boolean;
  gamesWon: number;
  gamesPlayed: number;
};

/** Build a minimal {@link LorcanaMatch} from analytics “recent form” rows (viewer as P1). */
export function recentFormToLorcanaMatch(
  r: RecentFormMatchFields,
  viewerPlayerId: string,
): LorcanaMatch {
  const games: Game[] = [];
  for (let i = 0; i < r.gamesPlayed; i++) {
    games.push({
      winner: i < r.gamesWon ? viewerPlayerId : STATS_RECENT_FORM_OPPONENT_ID,
    });
  }
  return {
    _id: r.matchId,
    playedAt: r.playedAt,
    stage: r.stage,
    p1: viewerPlayerId,
    p2: STATS_RECENT_FORM_OPPONENT_ID,
    p1DeckColor: r.myDeckColor,
    p2DeckColor: r.opponentDeckColor,
    matchWinner: r.matchWon ? viewerPlayerId : STATS_RECENT_FORM_OPPONENT_ID,
    games,
  };
}

/** Normalizes API round (string or legacy BSON number) for filters and equality. */
export function getMatchRoundKey(round: unknown): string | null {
  if (round == null || round === '') return null;
  const s = String(round).trim();
  return s === '' ? null : s;
}

/**
 * Display suffix for lists/cards: plain digits → `R3`; other labels unchanged (e.g. `top 8`).
 */
export function formatMatchRoundLabel(round: string | number | null | undefined): string {
  const key = getMatchRoundKey(round);
  if (key == null) return '';
  if (/^\d+$/.test(key)) return `R${key}`;
  return key;
}

/**
 * Label for match list/detail meta lines: uses populated {@link LorcanaMatch.tournament} name when
 * present, otherwise {@link LorcanaMatch.stage} (e.g. Casual, Tournament).
 */
export function matchStageOrTournamentLabel(m: LorcanaMatch): string {
  const t = m.tournament;
  if (t && typeof t === 'object' && t.name?.trim()) {
    return t.name.trim();
  }
  return m.stage ?? '–';
}

export function getLorcanaMatchPlayerId(
  p: LorcanaMatchPlayer | string | undefined,
): string | undefined {
  if (!p) return undefined;
  return typeof p === 'string' ? p : p._id;
}

export function getLorcanaMatchDeckId(
  ref: LorcanaMatchDeckRef | string | undefined,
): string | undefined {
  if (!ref) return undefined;
  return typeof ref === 'string' ? ref : ref._id;
}

export function getLorcanaMatchWinnerId(m: LorcanaMatch): string | undefined {
  const w = m.matchWinner;
  if (!w) return undefined;
  return typeof w === 'object' && w !== null ? w._id : w;
}

/** Resolves game winner id from API-shaped rows (string id or populated `{ _id }`). */
export function getLorcanaGameWinnerId(g: { winner?: unknown }): string | undefined {
  const w = g.winner;
  if (w == null) return undefined;
  if (typeof w === 'object' && w !== null && '_id' in w) {
    return (w as { _id: string })._id;
  }
  return String(w);
}

export type MatchLineRowPerspective =
  | { matchupMode: 'opponent-only'; deckId: string }
  | { matchupMode: 'dual'; playerId: string };

export type MatchLineRowView = {
  won: boolean;
  stage: string;
  gamesWon: number;
  gamesPlayed: number;
  playedAt?: string;
  opponentDeckColor: string;
  myDeckColor?: string;
};

export function getMatchLineRowView(
  match: LorcanaMatch,
  perspective: MatchLineRowPerspective,
): MatchLineRowView {
  const stage = match.stage ?? '–';
  const playedAt = match.playedAt;
  const games = match.games ?? [];

  if (perspective.matchupMode === 'opponent-only') {
    const deckId = perspective.deckId;
    const winnerId = getLorcanaMatchWinnerId(match);
    const p1Id = getLorcanaMatchPlayerId(match.p1);
    const p2Id = getLorcanaMatchPlayerId(match.p2);
    const p1DeckId = getLorcanaMatchDeckId(match.p1Deck);
    const p2DeckId = getLorcanaMatchDeckId(match.p2Deck);
    const won =
      !!winnerId &&
      ((p1DeckId === deckId && p1Id === winnerId) || (p2DeckId === deckId && p2Id === winnerId));
    const isP1 = p1DeckId === deckId;
    const opponentDeckColor = isP1 ? (match.p2DeckColor ?? '–') : (match.p1DeckColor ?? '–');
    const ourPlayerId = isP1 ? p1Id : p2Id;
    const total = games.length;
    const ourWins = ourPlayerId
      ? games.filter((g) => getLorcanaGameWinnerId(g) === ourPlayerId).length
      : 0;
    return {
      won,
      stage,
      gamesWon: ourWins,
      gamesPlayed: total,
      playedAt,
      opponentDeckColor,
    };
  }

  const playerId = perspective.playerId;
  const winnerId = getLorcanaMatchWinnerId(match);
  const won = !!winnerId && winnerId === playerId;
  const p1Id = getLorcanaMatchPlayerId(match.p1);
  const p2Id = getLorcanaMatchPlayerId(match.p2);
  let myDeckColor: string;
  let opponentDeckColor: string;
  if (p1Id === playerId) {
    myDeckColor = match.p1DeckColor ?? '–';
    opponentDeckColor = match.p2DeckColor ?? '–';
  } else if (p2Id === playerId) {
    myDeckColor = match.p2DeckColor ?? '–';
    opponentDeckColor = match.p1DeckColor ?? '–';
  } else {
    myDeckColor = match.p1DeckColor ?? '–';
    opponentDeckColor = match.p2DeckColor ?? '–';
  }
  const total = games.length;
  const ourWins = games.filter((g) => getLorcanaGameWinnerId(g) === playerId).length;
  return {
    won,
    stage,
    gamesWon: ourWins,
    gamesPlayed: total,
    playedAt,
    opponentDeckColor,
    myDeckColor,
  };
}
