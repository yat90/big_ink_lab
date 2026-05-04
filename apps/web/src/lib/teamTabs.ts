/** Tab ids for `/team` — kept in sync with the team page panels. */
export type TeamTabId = 'members' | 'ranking' | 'penalties' | 'court' | 'finance';

const TEAM_TAB_IDS: readonly TeamTabId[] = [
  'members',
  'ranking',
  'penalties',
  'court',
  'finance',
];

/** Labels match the in-page tab strip on the team page. */
export const TEAM_TABS: { id: TeamTabId; label: string }[] = [
  { id: 'members', label: 'Members' },
  { id: 'ranking', label: 'Ranking' },
  { id: 'penalties', label: 'Strafen' },
  { id: 'court', label: 'Gerichtssaal' },
  { id: 'finance', label: 'Finance' },
];

export function teamTabFromSearchParams(searchParams: URLSearchParams): TeamTabId {
  const raw = searchParams.get('tab');
  if (raw && (TEAM_TAB_IDS as readonly string[]).includes(raw)) {
    return raw as TeamTabId;
  }
  return 'members';
}
