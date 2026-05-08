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
