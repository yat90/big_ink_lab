import type { TeamTabId } from '$lib/components/team/teamTabs';
import { teamTabFromSearchParams } from '$lib/components/team/teamTabs';
import IconBarChart from '$lib/icons/IconBarChart.svelte';
import IconCloud from '$lib/icons/IconCloud.svelte';
import IconGavel from '$lib/icons/IconGavel.svelte';
import IconPenalties from '$lib/icons/IconPenalties.svelte';
import IconTrophy from '$lib/icons/IconTrophy.svelte';
import IconUsers from '$lib/icons/IconUsers.svelte';

export type PrimaryNavId =
  | 'home'
  | 'matches'
  | 'tournaments'
  | 'decks'
  | 'team'
  | 'players';

export interface PrimaryNavItem {
  id: PrimaryNavId;
  href: string;
  labelKey: string;
  matches: (pathname: string) => boolean;
}

export const PRIMARY_NAV_ITEMS: PrimaryNavItem[] = [
  {
    id: 'home',
    href: '/',
    labelKey: 'nav.dashboard',
    matches: (pathname) => pathname === '/',
  },
  {
    id: 'matches',
    href: '/matches',
    labelKey: 'nav.matches',
    matches: (pathname) => pathname.startsWith('/matches') && pathname !== '/matches/new',
  },
  {
    id: 'tournaments',
    href: '/tournaments',
    labelKey: 'nav.tournaments',
    matches: (pathname) => pathname.startsWith('/tournaments'),
  },
  {
    id: 'decks',
    href: '/decks',
    labelKey: 'nav.decks',
    matches: (pathname) => pathname === '/decks' || pathname.startsWith('/decks/'),
  },
  {
    id: 'team',
    href: '/team',
    labelKey: 'nav.team',
    matches: (pathname) => pathname.startsWith('/team'),
  },
  {
    id: 'players',
    href: '/players',
    labelKey: 'nav.players',
    matches: (pathname) => pathname === '/players' || pathname.startsWith('/players/'),
  },
];

export const PRIMARY_NAV = Object.fromEntries(
  PRIMARY_NAV_ITEMS.map((item) => [item.id, item])
) as Record<PrimaryNavId, PrimaryNavItem>;

export const MOBILE_TAB_NAV_IDS: PrimaryNavId[] = ['home', 'matches', 'tournaments'];

export function isPrimaryNavActive(id: PrimaryNavId, pathname: string): boolean {
  return PRIMARY_NAV[id].matches(pathname);
}

/**
 * Team-tab id → icon component. Single source of truth shared by the desktop
 * nav, the mobile nav drawer, and the team page tab strip.
 */
export const TEAM_TAB_ICON_MAP: Record<
  TeamTabId,
  | typeof IconUsers
  | typeof IconTrophy
  | typeof IconPenalties
  | typeof IconGavel
  | typeof IconBarChart
  | typeof IconCloud
> = {
  members: IconUsers,
  ranking: IconTrophy,
  penalties: IconPenalties,
  court: IconGavel,
  finance: IconBarChart,
  links: IconCloud,
};

/** Active-state flags for nav UI, derived from the current URL. */
export interface NavRouteState {
  isHome: boolean;
  isMatches: boolean;
  isTournaments: boolean;
  isDecks: boolean;
  isPlayers: boolean;
  isTeam: boolean;
  isStats: boolean;
  isMe: boolean;
  isMyStatistics: boolean;
  isChangelog: boolean;
  /** Selected team tab when on `/team`, otherwise `null`. */
  activeTeamTab: TeamTabId | null;
}

/**
 * Resolves every nav active-state flag from the current URL. Shared by
 * `DesktopNavBar` and `MobileNavDrawer` so route-matching logic lives in one place.
 */
export function getNavRouteState(url: URL): NavRouteState {
  const { pathname } = url;
  return {
    isHome: isPrimaryNavActive('home', pathname),
    isMatches: isPrimaryNavActive('matches', pathname),
    isTournaments: isPrimaryNavActive('tournaments', pathname),
    isDecks: isPrimaryNavActive('decks', pathname),
    isPlayers: isPrimaryNavActive('players', pathname),
    isTeam: isPrimaryNavActive('team', pathname),
    isStats: pathname === '/stats',
    isMe: pathname === '/me',
    isMyStatistics: pathname === '/me/statistics',
    isChangelog: pathname === '/changelog',
    activeTeamTab: pathname.startsWith('/team')
      ? teamTabFromSearchParams(url.searchParams)
      : null,
  };
}
