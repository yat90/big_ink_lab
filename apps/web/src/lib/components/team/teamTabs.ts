/**
 * Tab ids for `/team` (see `routes/team/*.svelte` including `TeamTabOverview.svelte`).
 */
export type TeamTabId =
  | 'overview'
  | 'members'
  | 'ranking'
  | 'penalties'
  | 'court'
  | 'finance'
  | 'links';

export const TEAM_TAB_IDS: readonly TeamTabId[] = [
  'overview',
  'members',
  'links',
  'ranking',
  'penalties',
  'court',
  'finance',
];

export function teamTabFromSearchParams(searchParams: URLSearchParams): TeamTabId {
  const raw = searchParams.get('tab');
  if (raw && (TEAM_TAB_IDS as readonly string[]).includes(raw)) {
    return raw as TeamTabId;
  }
  return 'overview';
}
