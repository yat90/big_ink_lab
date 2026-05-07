/**
 * Tab ids for `/team` (panels: `TeamTabMembers`, `TeamTabRanking`, `TeamTabPenalties`, `TeamTabCourt`, `TeamTabFinance`, `TeamTabLinks` in `routes/team/`).
 */
export type TeamTabId = 'members' | 'ranking' | 'penalties' | 'court' | 'finance' | 'links';

export const TEAM_TAB_IDS: readonly TeamTabId[] = [
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
  return 'members';
}
