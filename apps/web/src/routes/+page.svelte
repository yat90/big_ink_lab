<script lang="ts">
  import { config } from '$lib/config';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { type Game } from '$lib/matches';
  import InkIcons from '$lib/InkIcons.svelte';

  type Player = { _id: string; name: string; team: string };
  type Match = {
    _id: string;
    stage?: string;
    tournamentName?: string;
    round?: number;
    playedAt?: string;
    p1?: Player | string;
    p2?: Player | string;
    p1DeckColor?: string;
    p2DeckColor?: string;
    matchWinner?: Player | string;
    games?: Game[];
  };

  type GlobalStats = {
    totalMatches: number;
    totalGames: number;
  };

  let stats = $state<GlobalStats | null>(null);
  let playerCount = $state<number>(0);
  let deckCount = $state<number>(0);
  let recentMatches = $state<Match[]>([]);
  let loading = $state(true);
  let error = $state('');
  let loreTrackerLoading = $state(false);

  const apiUrl = config.apiUrl ?? '/api';

  /** Default players for Quick Match when no selection UI. */
  const QUICK_MATCH_P1_ID = '69a8a02d97f97400baf9f7fc';
  const QUICK_MATCH_P2_ID = '69a8a03297f97400baf9f7ff';

  async function startLoreTracker() {
    loreTrackerLoading = true;
    try {
      const res = await fetch(`${apiUrl}/matches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stage: 'Casual',
          games: [{}],
          p1: QUICK_MATCH_P1_ID,
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

  function playerName(p: Player | string | undefined): string {
    if (!p) return '–';
    return typeof p === 'string' ? p : p.name ?? '–';
  }

  function formatDate(s: string | undefined): string {
    if (!s) return '–';
    try {
      return new Date(s).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' });
    } catch {
      return s;
    }
  }

  function matchWinnerId(m: Match): string | undefined {
    const w = m.matchWinner;
    if (!w) return undefined;
    return typeof w === 'object' && w !== null ? w._id : w;
  }

  function gameWinnerId(g: Game): string | undefined {
    const w = g.winner;
    if (w == null) return undefined;
    return typeof w === 'object' && w !== null && '_id' in w ? (w as { _id: string })._id : String(w);
  }

  function gamesWon(match: Match, playerId: string): number {
    const games = match.games ?? [];
    return games.filter((g) => gameWinnerId(g) === playerId).length;
  }

  onMount(async () => {
    try {
      const [statsRes, playersRes, decksRes, matchesRes] = await Promise.all([
        fetch(`${apiUrl}/matches/stats`),
        fetch(`${apiUrl}/players`),
        fetch(`${apiUrl}/decks`),
        fetch(`${apiUrl}/matches?sort=newest`),
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
    } catch {
      error = 'Could not load dashboard.';
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
    <div class="card">
      <div class="loading-skeleton" aria-busy="true" aria-live="polite">
        <div class="loading-skeleton__line loading-skeleton__line--title"></div>
        <div class="loading-skeleton__line loading-skeleton__line--short"></div>
        <div class="loading-skeleton__line"></div>
      </div>
      <p class="muted" style="margin-top: var(--space-md);">Loading…</p>
    </div>
  {:else if error}
    <div class="card" role="alert">
      <p class="alert">{error}</p>
      <div class="row" style="gap: 12px; margin-top: 12px;">
        <a href="/matches" class="btn btn--primary">Matches</a>
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
          <div class="row" style="gap: 8px; flex-wrap: wrap;">
            <button
              type="button"
              class="btn"
              disabled={loreTrackerLoading}
              onclick={startLoreTracker}
            >
              {loreTrackerLoading ? 'Creating…' : 'Quick Match'}
            </button>
            <a href="/matches/new" class="btn btn--primary">New match</a>
          </div>
        </div>
      </div>

      {#if stats || playerCount > 0 || deckCount > 0}
        <div class="dashboard__summary card">
          <h3 class="dashboard__summary-title">At a glance</h3>
          <div class="dashboard__summary-grid">
            {#if stats}
              <div class="dashboard__stat">
                <span class="dashboard__stat-value">{stats.totalMatches}</span>
                <span class="dashboard__stat-label muted">Matches</span>
              </div>
              <div class="dashboard__stat">
                <span class="dashboard__stat-value">{stats.totalGames}</span>
                <span class="dashboard__stat-label muted">Games</span>
              </div>
            {/if}
            <div class="dashboard__stat">
              <span class="dashboard__stat-value">{deckCount}</span>
              <span class="dashboard__stat-label muted">Decks</span>
            </div>
            <div class="dashboard__stat">
              <span class="dashboard__stat-value">{playerCount}</span>
              <span class="dashboard__stat-label muted">Players</span>
            </div>
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
                  {formatDate(match.playedAt)} · {match.stage ?? '–'}{#if match.tournamentName} · {match.tournamentName}{/if}{#if (match.stage === 'Tournament' || match.tournamentName) && match.round != null} · R{match.round}{/if}
                </div>
                <div class="matchcard__row">
                  <div
                    class="matchcard__player matchcard__player--left"
                    class:matchcard__player--winner={winnerId === p1Id}
                  >
                    <span class="matchcard__name">
                      {playerName(match.p1)}
                      {#if winnerId === p1Id}
                        <span class="matchcard__badge matchcard__badge--winner" aria-label="Winner">👑</span>
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
                        <span class="matchcard__badge matchcard__badge--winner" aria-label="Winner">👑</span>
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
</style>
