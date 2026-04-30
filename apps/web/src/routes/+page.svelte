<script lang="ts">
  import { config } from '$lib/config';
  import { getAuthToken } from '$lib/auth';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import type { LorcanaMatch, LorcanaMatchPlayer } from '$lib/lorcana-match';
  import {
    formatMatchRoundLabel,
    getMatchRoundKey,
    matchStageOrTournamentLabel,
  } from '$lib/lorcana-match';
  import InkIcons from '$lib/InkIcons.svelte';
  import IconCrown from '$lib/icons/IconCrown.svelte';
  import { DateDisplay } from '$lib/DateDisplay';
  import IconRefresh from '$lib/icons/IconRefresh.svelte';

  type Player = { _id: string; name: string; team?: string };

  type GlobalStats = {
    totalMatches: number;
    totalGames: number;
  };

  type DashboardTournament = {
    _id: string;
    name: string;
    date: string;
    location?: string;
    url?: string;
    meta?: string;
  };

  let stats = $state<GlobalStats | null>(null);
  let playerCount = $state<number>(0);
  let deckCount = $state<number>(0);
  let recentMatches = $state<LorcanaMatch[]>([]);
  let loading = $state(true);
  let error = $state('');
  let loreTrackerLoading = $state(false);
  let retrying = $state(false);
  /** Current user's linked player id (for Quick Match P1). */
  let myPlayerId = $state<string | null>(null);
  let pastTournaments = $state<DashboardTournament[]>([]);
  let upcomingTournaments = $state<DashboardTournament[]>([]);

  const apiUrl = config.apiUrl ?? '/api';

  /** Default players for Quick Match when no selection UI. */
  const QUICK_MATCH_P1_ID = '69a8a02d97f97400baf9f7fc';
  const QUICK_MATCH_P2_ID = '69a8a03297f97400baf9f7ff';

  async function startLoreTracker() {
    loreTrackerLoading = true;
    try {
      const p1Id = myPlayerId ?? QUICK_MATCH_P1_ID;
      const res = await fetch(`${apiUrl}/matches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stage: 'Casual',
          games: [{}],
          p1: p1Id,
          p2: QUICK_MATCH_P2_ID,
          playedAt: new Date().toISOString(),
        }),
      });
      if (!res.ok) {
        error = 'Could not create match';
        return;
      }
      const match = await res.json();
      goto(`/matches/${match._id}/lore`);
    } catch {
      error = 'Could not reach API.';
    } finally {
      loreTrackerLoading = false;
    }
  }

  function playerName(p: Player | LorcanaMatchPlayer | string | undefined): string {
    if (!p) return '–';
    return typeof p === 'string' ? p : p.name ?? '–';
  }

  function localCalendarDay(): string {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function matchWinnerId(m: LorcanaMatch): string | undefined {
    const w = m.matchWinner;
    if (!w) return undefined;
    return typeof w === 'object' && w !== null ? w._id : w;
  }

  function gameWinnerId(g: { winner?: unknown }): string | undefined {
    const w = g.winner;
    if (w == null) return undefined;
    return typeof w === 'object' && w !== null && '_id' in w ? (w as { _id: string })._id : String(w);
  }

  function gamesWon(match: LorcanaMatch, playerId: string): number {
    const games = match.games ?? [];
    return games.filter((g) => gameWinnerId(g) === playerId).length;
  }

  async function loadDashboard() {
    error = '';
    try {
      const token = getAuthToken();
      if (token) {
        try {
          const meRes = await fetch(`${apiUrl}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (meRes.ok) {
            const me = await meRes.json();
            if (me?.player?._id) myPlayerId = me.player._id;
          }
        } catch {
          /* ignore */
        }
      }
      const day = localCalendarDay();
      const [statsRes, playersRes, decksRes, matchesRes, twRes] = await Promise.all([
        fetch(`${apiUrl}/matches/stats`),
        fetch(`${apiUrl}/players`),
        fetch(`${apiUrl}/decks`),
        fetch(`${apiUrl}/matches?sort=newest`),
        fetch(`${apiUrl}/tournaments/dashboard/window?day=${encodeURIComponent(day)}`),
      ]);
      if (statsRes.ok) {
        const data = await statsRes.json();
        stats = { totalMatches: data.totalMatches ?? 0, totalGames: data.totalGames ?? 0 };
      }
      if (playersRes.ok) {
        const players = await playersRes.json();
        playerCount = Array.isArray(players) ? players.length : 0;
      }
      if (decksRes.ok) {
        const decks = await decksRes.json();
        deckCount = Array.isArray(decks) ? decks.length : 0;
      }
      if (matchesRes.ok) {
        const matches = await matchesRes.json();
        recentMatches = Array.isArray(matches) ? matches.slice(0, 5) : [];
      }
      if (twRes.ok) {
        const tw = (await twRes.json()) as {
          past?: DashboardTournament[];
          upcoming?: DashboardTournament[];
        };
        const mapRow = (r: {
          _id?: string;
          name?: string;
          date?: string;
          location?: string;
          url?: string;
          meta?: string;
        }) => ({
          _id: String(r._id ?? ''),
          name: String(r.name ?? ''),
          date: String(r.date ?? ''),
          location: r.location,
          url: r.url,
          meta: r.meta,
        });
        pastTournaments = (tw.past ?? []).map(mapRow).filter((r) => r._id);
        upcomingTournaments = (tw.upcoming ?? []).map(mapRow).filter((r) => r._id);
      }
    } catch {
      error = 'Could not load dashboard.';
    }
  }

  async function retry() {
    retrying = true;
    try {
      await loadDashboard();
    } finally {
      retrying = false;
    }
  }

  async function refreshDashboard() {
    loading = true;
    error = '';
    try {
      await loadDashboard();
    } finally {
      loading = false;
    }
  }

  onMount(async () => {
    try {
      await loadDashboard();
    } finally {
      loading = false;
    }
  });
</script>

<svelte:head>
  <title>Big Ink Lab</title>
</svelte:head>

<div class="page">
  {#if loading}
    <div class="dashboard dashboard--skeleton" aria-busy="true" aria-live="polite" aria-label="Loading dashboard">
      <div class="card stack dashboard__header">
        <div class="loading-skeleton">
          <div class="loading-skeleton__line loading-skeleton__line--title"></div>
          <div class="loading-skeleton__line loading-skeleton__line--short"></div>
        </div>
        <div class="row loading-skeleton__actions-primary">
          <div class="loading-skeleton__line loading-skeleton__line--icon"></div>
          <div class="loading-skeleton__line loading-skeleton__line--primary-btn"></div>
        </div>
        <div class="row loading-skeleton__actions-secondary">
          <div class="loading-skeleton__line loading-skeleton__line--btn"></div>
          <div class="loading-skeleton__line loading-skeleton__line--btn"></div>
          <div class="loading-skeleton__line loading-skeleton__line--btn"></div>
        </div>
      </div>

      <div class="card stack dashboard__tournaments">
        <div class="row" style="justify-content: space-between;">
          <div class="loading-skeleton__line loading-skeleton__line--section-title"></div>
          <div class="row" style="gap: 8px;">
            <div class="loading-skeleton__line loading-skeleton__line--btn-sm"></div>
            <div class="loading-skeleton__line loading-skeleton__line--btn-sm"></div>
          </div>
        </div>
        <div class="loading-skeleton__line loading-skeleton__line--sub"></div>
        <div class="loading-skeleton__tournaments-cols">
          <div class="stack" style="gap: var(--space-sm);">
            <div class="loading-skeleton__line loading-skeleton__line--micro"></div>
            <div class="loading-skeleton__line"></div>
            <div class="loading-skeleton__line loading-skeleton__line--short"></div>
          </div>
          <div class="stack" style="gap: var(--space-sm);">
            <div class="loading-skeleton__line loading-skeleton__line--micro"></div>
            <div class="loading-skeleton__line"></div>
            <div class="loading-skeleton__line loading-skeleton__line--short"></div>
          </div>
        </div>
      </div>

      <div class="dashboard__summary card">
        <div class="loading-skeleton__line loading-skeleton__line--section-title loading-skeleton__line--at-a-glance"></div>
        <div class="dashboard__summary-grid">
          {#each [0, 1, 2, 3] as i (i)}
            <div class="loading-skeleton__stat-block"></div>
          {/each}
        </div>
      </div>

      <div class="card stack">
        <div class="row" style="justify-content: space-between;">
          <div class="loading-skeleton__line loading-skeleton__line--section-title"></div>
          <div class="loading-skeleton__line loading-skeleton__line--btn-sm"></div>
        </div>
        <div class="stack" style="gap: var(--space-sm);">
          {#each [0, 1, 2] as i (i)}
            <div class="loading-skeleton__match-block"></div>
          {/each}
        </div>
      </div>
    </div>
  {:else if error}
    <div class="card" role="alert">
      <p class="alert">{error}</p>
      <div class="row" style="gap: 12px; margin-top: 12px;">
        <button type="button" class="btn btn--primary" onclick={retry} disabled={retrying}>
          {#if retrying}
            <span class="spinner" aria-hidden="true" style="margin-right: 8px;"></span>
            Retrying…
          {:else}
            Try again
          {/if}
        </button>
        <a href="/matches" class="btn">Matches</a>
        <a href="/players" class="btn">Players</a>
      </div>
    </div>
  {:else}
    <div class="dashboard">
      <div class="card stack dashboard__header">
        <div class="row dashboard__header-top" style="justify-content: space-between; align-items: flex-start; gap: 12px;">
          <div class="stack" style="gap: 4px;">
            <h2 class="card__title">Big Ink Lab</h2>
            <p class="card__sub">Track matches, players, and Lorcana stats.</p>
          </div>
          <div class="dashboard__header-actions stack">
            <div class="row dashboard__header-actions-primary">
              <button
                type="button"
                class="btn btn--sm page-header__refresh"
                onclick={() => refreshDashboard()}
                aria-label="Refresh dashboard"
              >
                <IconRefresh size={20} />
              </button>
              <a href="/matches/new" class="btn btn--primary dashboard__header-new-match">New match</a>
            </div>
            <div class="row dashboard__header-actions-secondary">
              <button
                type="button"
                class="btn btn--sm"
                disabled={loreTrackerLoading}
                onclick={startLoreTracker}
              >
                {loreTrackerLoading ? 'Creating…' : 'Quick Match'}
              </button>
              <a href="/tournaments" class="btn btn--sm">Tournaments</a>
              <a href="/tournaments/new" class="btn btn--sm">New tournament</a>
            </div>
          </div>
        </div>
      </div>

      <div class="card stack dashboard__tournaments">
        <div class="row" style="justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
          <h3 class="dashboard__section-title" style="margin: 0;">Tournaments</h3>
          <div class="row" style="gap: 8px; flex-wrap: wrap;">
            <a href="/tournaments/new" class="btn btn--sm" style="font-size: 0.9rem;">New</a>
            <a href="/tournaments" class="btn btn--sm" style="font-size: 0.9rem;">All</a>
          </div>
        </div>
        <p class="card__sub muted" style="margin: 0 0 var(--space-sm) 0;">
          Recent tournaments and what&apos;s coming up.
        </p>
        <div class="dashboard__tournaments-grid">
          <div class="dashboard__tournaments-col">
            <h4 class="dashboard__tournaments-col-title muted">Earlier</h4>
            {#if pastTournaments.length === 0}
              <p class="muted dashboard__tournaments-empty">None</p>
            {:else}
              <ul class="dashboard__tournaments-list">
                {#each pastTournaments as t (t._id)}
                  <li>
                    <a href="/tournaments/{t._id}" class="dashboard__tournaments-link">
                      <span class="dashboard__tournaments-name">{t.name}</span>
                      <span class="muted dashboard__tournaments-date">
                        {DateDisplay.formatDate(t.date)}{#if t.meta?.trim()} · {t.meta.trim()}{/if}
                      </span>
                    </a>
                  </li>
                {/each}
              </ul>
            {/if}
          </div>
          <div class="dashboard__tournaments-col">
            <h4 class="dashboard__tournaments-col-title muted">Upcoming</h4>
            {#if upcomingTournaments.length === 0}
              <p class="muted dashboard__tournaments-empty">None</p>
            {:else}
              <ul class="dashboard__tournaments-list">
                {#each upcomingTournaments as t (t._id)}
                  <li>
                    <a href="/tournaments/{t._id}" class="dashboard__tournaments-link">
                      <span class="dashboard__tournaments-name">{t.name}</span>
                      <span class="muted dashboard__tournaments-date">
                        {DateDisplay.formatDate(t.date)}{#if t.meta?.trim()} · {t.meta.trim()}{/if}
                      </span>
                    </a>
                  </li>
                {/each}
              </ul>
            {/if}
          </div>
        </div>
      </div>

      {#if stats || playerCount > 0 || deckCount > 0}
        <div class="dashboard__summary card">
          <h3 class="dashboard__summary-title">At a glance</h3>
          <div class="dashboard__summary-grid">
            {#if stats}
              <a href="/matches" class="dashboard__stat dashboard__stat--link">
                <span class="dashboard__stat-value">{stats.totalMatches}</span>
                <span class="dashboard__stat-label muted">Matches</span>
              </a>
              <a href="/matches" class="dashboard__stat dashboard__stat--link">
                <span class="dashboard__stat-value">{stats.totalGames}</span>
                <span class="dashboard__stat-label muted">Games</span>
              </a>
            {/if}
            <a href="/decks" class="dashboard__stat dashboard__stat--link">
              <span class="dashboard__stat-value">{deckCount}</span>
              <span class="dashboard__stat-label muted">Decks</span>
            </a>
            <a href="/players" class="dashboard__stat dashboard__stat--link">
              <span class="dashboard__stat-value">{playerCount}</span>
              <span class="dashboard__stat-label muted">Players</span>
            </a>
          </div>
        </div>
      {/if}

      {#if recentMatches.length > 0}
        <div class="card stack">
          <div class="row" style="justify-content: space-between; align-items: center;">
            <h3 class="dashboard__section-title">Recent matches</h3>
            <a href="/matches" class="btn btn--sm" style="font-size: 0.9rem;">View all</a>
          </div>
          <div class="stack">
            {#each recentMatches as match}
              {@const p1Id = typeof match.p1 === 'object' && match.p1 ? match.p1._id : match.p1}
              {@const p2Id = typeof match.p2 === 'object' && match.p2 ? match.p2._id : match.p2}
              {@const winnerId = matchWinnerId(match)}
              <a
                href="/matches/{match._id}"
                class="card playercard matchcard dashboard__match"
                style="text-decoration: none; color: inherit;"
              >
                <div class="matchcard__top muted">
                  {DateDisplay.formatRelative(match.playedAt)} · {matchStageOrTournamentLabel(match)}{#if getMatchRoundKey(match.round) != null}
                    · {formatMatchRoundLabel(match.round)}{/if}
                </div>
                <div class="matchcard__row">
                  <div
                    class="matchcard__player matchcard__player--left"
                    class:matchcard__player--winner={winnerId === p1Id}
                  >
                    <span class="matchcard__name">
                      {playerName(match.p1)}
                      {#if winnerId === p1Id}
                        <span class="matchcard__badge matchcard__badge--winner" aria-label="Winner"><IconCrown size={16} /></span>
                      {/if}
                    </span>
                    {#if match.p1DeckColor}
                      <span class="matchcard__ink" title={match.p1DeckColor} aria-hidden="true"
                        ><InkIcons deckColor={match.p1DeckColor} /></span
                      >
                    {/if}
                    <span class="matchcard__wins muted" title="Games won">{gamesWon(match, p1Id ?? '')}</span>
                  </div>
                  <div class="matchcard__vs" aria-hidden="true">VS.</div>
                  <div
                    class="matchcard__player matchcard__player--right"
                    class:matchcard__player--winner={winnerId === p2Id}
                  >
                    <span class="matchcard__wins muted" title="Games won">{gamesWon(match, p2Id ?? '')}</span>
                    {#if match.p2DeckColor}
                      <span class="matchcard__ink" title={match.p2DeckColor} aria-hidden="true"
                        ><InkIcons deckColor={match.p2DeckColor} /></span
                      >
                    {/if}
                    <span class="matchcard__name">
                      {playerName(match.p2)}
                      {#if winnerId === p2Id}
                        <span class="matchcard__badge matchcard__badge--winner" aria-label="Winner"><IconCrown size={16} /></span>
                      {/if}
                    </span>
                  </div>
                </div>
              </a>
            {/each}
          </div>
        </div>
      {:else}
        <div class="card stack">
          <p class="card__sub muted">No matches yet. Create your first match to get started.</p>
          <a href="/matches/new" class="btn btn--primary" style="align-self: flex-start;">New match</a>
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .dashboard {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
  }

  .dashboard--skeleton {
    pointer-events: none;
  }

  .dashboard__header-actions {
    align-items: flex-end;
    gap: var(--space-sm);
    min-width: 0;
    flex: 1 1 auto;
    justify-content: flex-end;
  }

  .dashboard__header-actions-primary,
  .dashboard__header-actions-secondary {
    justify-content: flex-end;
    gap: var(--space-sm);
  }

  .dashboard__header-new-match {
    min-height: 46px;
  }

  @media (max-width: 639px) {
    .dashboard__header-actions {
      width: 100%;
      align-items: stretch;
    }

    .dashboard__header-actions-primary,
    .dashboard__header-actions-secondary {
      justify-content: flex-start;
    }

    .dashboard__header-new-match {
      flex: 1 1 auto;
      min-width: 0;
    }
  }
  @media (min-width: 640px) {
    .dashboard {
      gap: var(--space-lg);
    }
  }

  .dashboard__header {
    padding: 14px;
  }

  .dashboard__header-top {
    flex-wrap: wrap;
  }
  @media (min-width: 640px) {
    .dashboard__header {
      padding: var(--space-lg);
    }
  }

  .dashboard__summary {
    padding: 14px;
  }
  @media (min-width: 640px) {
    .dashboard__summary {
      padding: var(--space-lg);
    }
  }

  .dashboard__summary-title {
    font-size: 1rem;
    font-weight: 700;
    letter-spacing: -0.02em;
    margin: 0 0 var(--space-md);
  }

  .dashboard__summary-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
    gap: var(--space-md);
  }
  @media (min-width: 640px) {
    .dashboard__summary-grid {
      grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
      gap: var(--space-lg);
    }
  }

  .dashboard__stat {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }

  a.dashboard__stat--link {
    text-decoration: none;
    color: inherit;
    border-radius: var(--radius-sm);
    padding: var(--space-sm);
    margin: calc(var(--space-sm) * -1);
    align-self: start;
    min-width: 0;
    transition:
      background var(--transition),
      box-shadow var(--transition);
    -webkit-tap-highlight-color: transparent;
  }

  @media (hover: hover) {
    a.dashboard__stat--link:hover {
      background: var(--glass-bg-strong);
    }
  }

  a.dashboard__stat--link:focus-visible {
    outline: 2px solid var(--primary);
    outline-offset: 2px;
  }

  .dashboard__stat-value {
    font-size: 1.5rem;
    font-weight: 800;
    letter-spacing: -0.02em;
  }
  @media (min-width: 640px) {
    .dashboard__stat-value {
      font-size: 1.75rem;
    }
  }

  .dashboard__stat-label {
    font-size: 0.85rem;
    font-weight: 500;
  }

  .dashboard__section-title {
    font-size: 1rem;
    font-weight: 700;
    margin: 0;
  }

  .dashboard__match {
    padding: var(--space-md);
  }

  .btn--sm {
    padding: 6px 12px;
    min-height: 44px;
  }

  .dashboard__tournaments {
    padding: 14px;
  }
  @media (min-width: 640px) {
    .dashboard__tournaments {
      padding: var(--space-lg);
    }
  }

  .dashboard__tournaments-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-md);
  }
  @media (max-width: 480px) {
    .dashboard__tournaments-grid {
      grid-template-columns: 1fr;
    }
  }

  .dashboard__tournaments-col-title {
    margin: 0 0 var(--space-xs) 0;
    font-size: 0.8rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .dashboard__tournaments-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
  }

  .dashboard__tournaments-link {
    display: flex;
    flex-direction: column;
    gap: 2px;
    text-decoration: none;
    color: inherit;
    padding: 8px 10px;
    border-radius: var(--radius);
    border: 1px solid var(--border-strong, rgba(255, 255, 255, 0.12));
    transition: background 0.15s var(--ease, ease);
  }
  .dashboard__tournaments-link:hover {
    background: var(--glass-bg-strong, rgba(255, 255, 255, 0.06));
  }

  .dashboard__tournaments-name {
    font-weight: 600;
    font-size: 0.9375rem;
  }

  .dashboard__tournaments-date {
    font-size: 0.8125rem;
  }

  .dashboard__tournaments-empty {
    margin: 0;
    font-size: 0.875rem;
  }
</style>
