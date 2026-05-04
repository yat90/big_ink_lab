/** Tab ids for `/team` — kept in sync with the team page panels. */
export type TeamTabId = 'members' | 'ranking' | 'penalties' | 'court' | 'finance';

export const TEAM_TAB_IDS: readonly TeamTabId[] = [
  'members',
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
  return 'members';
}
