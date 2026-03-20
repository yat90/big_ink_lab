/** Shared types for My statistics page and tab components. */

export type PreferredDeckSummary = {
  _id: string;
  name: string;
  deckColor: string | null;
};

export type PlayStyleSummary = {
  playerId: string;
  matchesAnalyzed: number;
  gamesAnalyzed: number;
  deckColorStats: Array<{
    deckColor: string;
    matchesPlayed: number;
    matchesWon: number;
    matchWinRate: number;
    gamesPlayed: number;
    gamesWon: number;
    gameWinRate: number;
  }>;
  stageMix: Array<{ stage: string; count: number; percentage: number }>;
  starterWinRate: number;
  nonStarterWinRate: number;
  starterAdvantageDelta: number;
  avgLoreWhenWinning: number | null;
  avgLoreWhenLosing: number | null;
  preferredDeckColor: string | null;
  /** Present when API can infer most-played deck from match deck refs. */
  preferredDeck?: PreferredDeckSummary | null;
  bestPerformingDeckColor: string | null;
  decksUsed: { _id: string; name: string; deckColor?: string | null }[];
};

export type RecentMatchResult = {
  matchId: string;
  playedAt: string;
  stage: string;
  opponentDeckColor: string;
  myDeckColor: string;
  matchWon: boolean;
  gamesWon: number;
  gamesPlayed: number;
};

export type MatchAnalysisSummary = {
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
    stage: string;
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
  decksUsed: { _id: string; name: string }[];
};

export type RecentFormSummary = {
  wins: number;
  losses: number;
  total: number;
} | null;
