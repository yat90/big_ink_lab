/**
 * Synthetic bulk-import group key prefix for replays with no `baseSnapshot.matchView.id`
 * (one match per replay). Must not collide with real matchView ids from duels.ink.
 */
export const BULK_NO_MATCHVIEW_PREFIX = '__no_matchView__:' as const;
