/** One row in the internal ladder: wins and losses only from matches vs other team members. */
export interface TeamInternalRankingRow {
  playerId: string;
  name: string;
  wins: number;
  losses: number;
  matches: number;
  /** Share of internal matches won; null when the player has no internal matches recorded. */
  winRate: number | null;
}
