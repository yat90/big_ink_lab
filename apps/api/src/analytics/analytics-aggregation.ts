import { Stage } from '../matches/schemas/stages.enum';

/** Returns an integer win-rate percentage (0–100). */
export function winRate(won: number, total: number): number {
  return total > 0 ? Math.round((won / total) * 100) : 0;
}

/** Returns sum/count rounded to one decimal place, or null when count is 0. */
export function avgOf(sum: number, count: number): number | null {
  return count > 0 ? Math.round((sum / count) * 10) / 10 : null;
}

/** Mutates matrix to record one game/match result for a myDeck vs oppDeck pair. */
export function addMatrixEntry(
  matrix: Record<string, Record<string, { played: number; won: number }>>,
  myDeck: string,
  oppDeck: string,
  won: number,
): void {
  if (!matrix[myDeck]) matrix[myDeck] = {};
  if (!matrix[myDeck][oppDeck]) matrix[myDeck][oppDeck] = { played: 0, won: 0 };
  matrix[myDeck][oppDeck].played += 1;
  matrix[myDeck][oppDeck].won += won;
}

interface StageTotals {
  matchesPlayed: number;
  matchesWon: number;
  gamesPlayed: number;
  gamesWon: number;
}

/** Maps a stage-keyed accumulator into a full stats array covering every Stage value. */
export function buildStageStats(
  agg: Record<string, StageTotals>,
): Array<StageTotals & { stage: Stage; matchWinRate: number; gameWinRate: number }> {
  return (Object.values(Stage) as Stage[]).map((stage) => {
    const d = agg[stage] ?? { matchesPlayed: 0, matchesWon: 0, gamesPlayed: 0, gamesWon: 0 };
    return {
      stage,
      matchesPlayed: d.matchesPlayed,
      matchesWon: d.matchesWon,
      matchWinRate: winRate(d.matchesWon, d.matchesPlayed),
      gamesPlayed: d.gamesPlayed,
      gamesWon: d.gamesWon,
      gameWinRate: winRate(d.gamesWon, d.gamesPlayed),
    };
  });
}
