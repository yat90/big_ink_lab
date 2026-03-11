import { Stage } from '../../matches/schemas/stages.enum';

/** Deck reference used in analytics responses. */
export interface DeckUsed {
  _id: string;
  name: string;
}

/** Per-deck-color stats in play-style summary. */
export interface DeckColorStats {
  deckColor: string;
  matchesPlayed: number;
  matchesWon: number;
  matchWinRate: number;
  gamesPlayed: number;
  gamesWon: number;
  gameWinRate: number;
}

/** Stage distribution in play-style summary. */
export interface StageMix {
  stage: Stage;
  count: number;
  percentage: number;
}

/** Play-style analysis summary for a player. */
export interface PlayStyleSummary {
  playerId: string;
  matchesAnalyzed: number;
  gamesAnalyzed: number;
  deckColorStats: DeckColorStats[];
  stageMix: StageMix[];
  starterWinRate: number;
  nonStarterWinRate: number;
  starterAdvantageDelta: number;
  avgLoreWhenWinning: number | null;
  avgLoreWhenLosing: number | null;
  preferredDeckColor: string | null;
  bestPerformingDeckColor: string | null;
  decksUsed: DeckUsed[];
}

/** Single recent match in match analysis. */
export interface RecentMatchResult {
  matchId: string;
  playedAt: Date;
  stage: Stage;
  opponentDeckColor: string;
  myDeckColor: string;
  matchWon: boolean;
  gamesWon: number;
  gamesPlayed: number;
}

/** Match/game analysis summary for a player. */
export interface MatchAnalysisSummary {
  playerId: string;
  totals: {
    matchesPlayed: number;
    matchesWon: number;
    matchWinRate: number;
    gamesPlayed: number;
    gamesWon: number;
    gameWinRate: number;
  };
  byStage: Array<{
    stage: Stage;
    matchesPlayed: number;
    matchesWon: number;
    matchWinRate: number;
    gamesPlayed: number;
    gamesWon: number;
    gameWinRate: number;
  }>;
  deckColorMatrix: Record<string, Record<string, { played: number; won: number }>>;
  recentForm: RecentMatchResult[];
  avgLoreInLostGames: number | null;
  avgLoreInWonGames: number | null;
  decksUsed: DeckUsed[];
}

/** Global match stats (aggregate). */
export interface GlobalMatchStats {
  totalMatches: number;
  matchesByStage: Record<string, number>;
  totalGames: number;
  gamesWonByStarter: number;
  gamesWonByNonStarter: number;
  starterWinRate: number;
  deckColorMatrix: Record<string, Record<string, { played: number; won: number }>>;
}

/** Player stats (for GET /players/:id). */
export interface PlayerStatsDto {
  matchesPlayed: number;
  matchesWon: number;
  matchesLost: number;
  matchWinRate: number;
  gamesPlayed: number;
  gamesWon: number;
  gameWinRate: number;
  avgLoreInLostGames: number | null;
  gamesAsStarter: number;
  gamesWonAsStarter: number;
  starterWinRate: number;
  gamesNotStarter: number;
  gamesWonNotStarter: number;
  nonStarterWinRate: number;
  deckColorMatrix: Record<string, Record<string, { played: number; won: number }>>;
}
