/**
 * Declarative breadcrumbs from pathname. Uses i18n keys resolved by AppBreadcrumb.
 * Match most specific routes first (dynamic /…/[id]/… before /…/[id]).
 */

export type TrailSegment = { key: string; href?: string };

const OID = '[a-f\\d]{24}';

function normalizePath(pathname: string): string {
  if (!pathname || pathname === '/') return '/';
  return pathname.replace(/\/+$/, '') || '/';
}

export function breadcrumbTrail(pathname: string): TrailSegment[] {
  const p = normalizePath(pathname);

  if (p === '/') return [{ key: 'breadcrumb.home' }];

  if (p === '/login') return [{ key: 'breadcrumb.login' }];
  if (p === '/forgot-password') return [{ key: 'breadcrumb.forgotPassword' }];

  if (p === '/stats') return [{ key: 'nav.statistics' }];
  if (p === '/team') return [{ key: 'nav.team' }];

  if (p === '/me/statistics') {
    return [
      { key: 'nav.mobileMe', href: '/me' },
      { key: 'nav.myStatistics' },
    ];
  }
  if (p === '/me') return [{ key: 'nav.mobileMe' }];

  if (p === '/matches/new') {
    return [
      { key: 'matches.list.heading', href: '/matches' },
      { key: 'matches.new.title' },
    ];
  }
  if (p === '/matches/quick') {
    return [
      { key: 'matches.list.heading', href: '/matches' },
      { key: 'matches.list.quickMatch' },
    ];
  }

  {
    const m = p.match(new RegExp(`^/matches/(${OID})/lore$`, 'i'));
    if (m) {
      const id = m[1];
      return [
        { key: 'matches.list.heading', href: '/matches' },
        { key: 'breadcrumb.match', href: `/matches/${id}` },
        { key: 'breadcrumb.lore' },
      ];
    }
  }
  {
    const m = p.match(new RegExp(`^/matches/(${OID})$`, 'i'));
    if (m) {
      return [
        { key: 'matches.list.heading', href: '/matches' },
        { key: 'breadcrumb.match' },
      ];
    }
  }
  if (p === '/matches') return [{ key: 'matches.list.heading' }];

  if (p === '/tournaments/new') {
    return [
      { key: 'tournaments.list.heading', href: '/tournaments' },
      { key: 'common.newBreadcrumb' },
    ];
  }
  if (p === '/tournaments/results') {
    return [
      { key: 'tournaments.list.heading', href: '/tournaments' },
      { key: 'tournaments.results.title' },
    ];
  }
  {
    const m = p.match(new RegExp(`^/tournaments/(${OID})$`, 'i'));
    if (m) {
      return [
        { key: 'tournaments.list.heading', href: '/tournaments' },
        { key: 'common.defaultTournamentName' },
      ];
    }
  }
  if (p === '/tournaments') return [{ key: 'tournaments.list.heading' }];

  if (p === '/decks/new') {
    return [
      { key: 'decks.heading', href: '/decks' },
      { key: 'decks.newDeck' },
    ];
  }
  {
    const m = p.match(new RegExp(`^/decks/(${OID})/stats$`, 'i'));
    if (m) {
      const id = m[1];
      return [
        { key: 'decks.heading', href: '/decks' },
        { key: 'breadcrumb.deck', href: `/decks/${id}` },
        { key: 'breadcrumb.deckStatistics' },
      ];
    }
  }
  {
    const m = p.match(new RegExp(`^/decks/(${OID})/edit$`, 'i'));
    if (m) {
      const id = m[1];
      return [
        { key: 'decks.heading', href: '/decks' },
        { key: 'breadcrumb.deck', href: `/decks/${id}` },
        { key: 'breadcrumb.edit' },
      ];
    }
  }
  {
    const m = p.match(new RegExp(`^/decks/(${OID})$`, 'i'));
    if (m) {
      return [
        { key: 'decks.heading', href: '/decks' },
        { key: 'breadcrumb.deck' },
      ];
    }
  }
  if (p === '/decks') return [{ key: 'decks.heading' }];

  if (p === '/players/new') {
    return [
      { key: 'nav.players', href: '/players' },
      { key: 'breadcrumb.newPlayer' },
    ];
  }
  {
    const m = p.match(new RegExp(`^/players/(${OID})/edit$`, 'i'));
    if (m) {
      const id = m[1];
      return [
        { key: 'nav.players', href: '/players' },
        { key: 'breadcrumb.player', href: `/players/${id}` },
        { key: 'breadcrumb.edit' },
      ];
    }
  }
  {
    const m = p.match(new RegExp(`^/players/(${OID})$`, 'i'));
    if (m) {
      return [
        { key: 'nav.players', href: '/players' },
        { key: 'breadcrumb.player' },
      ];
    }
  }
  if (p === '/players') return [{ key: 'nav.players' }];

  return [{ key: 'breadcrumb.home', href: '/' }, { key: 'breadcrumb.fallback' }];
}
