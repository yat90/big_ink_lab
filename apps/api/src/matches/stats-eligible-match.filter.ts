import { Stage } from './schemas/stages.enum';

/**
 * Matches that count toward player, deck, and global win/loss and game statistics.
 * Intentional tournament draws are excluded; also excludes legacy rows without the flag
 * (tournament pairing with no completed games and no winner).
 */
export const STATS_ELIGIBLE_MATCH_FILTER = {
  $nor: [
    { intentionalDraw: true },
    {
      stage: Stage.Tournament,
      $and: [
        { $or: [{ matchWinner: null }, { matchWinner: { $exists: false } }] },
        { $nor: [{ games: { $elemMatch: { status: 'done' } } }] },
      ],
    },
  ],
} as const;

/** AND-merge {@link STATS_ELIGIBLE_MATCH_FILTER} into an existing match query. */
export function withStatsEligibleMatches(base: Record<string, unknown>): Record<string, unknown> {
  if (Object.keys(base).length === 0) {
    return { ...STATS_ELIGIBLE_MATCH_FILTER };
  }
  return { $and: [base, STATS_ELIGIBLE_MATCH_FILTER] };
}
