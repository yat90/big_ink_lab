<script lang="ts">
  import { config } from '$lib/config';
  import { type Game, STAGE_OPTIONS } from '$lib/matches';
  import InkIcons from '$lib/InkIcons.svelte';
  import IconCrown from '$lib/icons/IconCrown.svelte';
  import Pagination from '$lib/Pagination.svelte';

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

  let matches = $state<Match[]>([]);
  let loading = $state(true);
  let error = $state('');

  let filterStage = $state<string>('');
  let sortOrder = $state<'newest' | 'oldest'>('newest');
  let currentPage = $state(1);
  let totalPages = $state(1);
  let total = $state(0);

  const apiUrl = config.apiUrl ?? '/api';

  function playerName(p: Player | string | undefined): string {
    if (!p) return '–';
    return typeof p === 'string' ? p : (p.name ?? '–');
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
    return typeof w === 'object' && w !== null && '_id' in w
      ? (w as { _id: string })._id
      : String(w);
  }

  function gamesWon(match: Match, playerId: string): number {
    const games = match.games ?? [];
    return games.filter((g) => gameWinnerId(g) === playerId).length;
  }

  async function fetchMatches() {
    loading = true;
    error = '';
    try {
      // eslint-disable-next-line svelte/prefer-svelte-reactivity
      const params = new URLSearchParams();
      if (filterStage) params.set('stage', filterStage);
      params.set('sort', sortOrder);
      params.set('page', String(currentPage));
      params.set('limit', '20');
      const url = `${apiUrl}/matches${params.toString() ? `?${params}` : ''}`;
      const res = await fetch(url);
      if (!res.ok) {
        error = 'Failed to load matches';
        return;
      }
      const response = await res.json();
      matches = response.data || [];
      totalPages = response.meta?.totalPages || 1;
      total = response.meta?.total || 0;
    } catch {
      error = 'Could not reach API.';
    } finally {
      loading = false;
    }
  }

  function handlePageChange(page: number) {
    currentPage = page;
  }

  $effect(() => {
    filterStage;
    sortOrder;
    currentPage = 1;
  });

  $effect(() => {
    currentPage;
    fetchMatches();
  });
</script>

<div class="page">
  {#if loading}
    <div class="card">
      <div class="loading-skeleton" aria-busy="true" aria-live="polite">
        <div class="loading-skeleton__line loading-skeleton__line--title"></div>
        <div class="loading-skeleton__line loading-skeleton__line--short"></div>
        <div class="loading-skeleton__line"></div>
        <div class="loading-skeleton__line"></div>
        <div class="loading-skeleton__line"></div>
      </div>
      <p class="muted" style="margin-top: var(--space-md);">Loading matches…</p>
    </div>
  {:else if error}
    <div class="card" role="alert" aria-live="assertive">
      <p class="alert">{error}</p>
    </div>
  {:else if matches.length === 0 && !filterStage}
    <div class="card stack">
      <h2 class="card__title">No matches yet</h2>
      <p class="card__sub">Create your first match.</p>
      <a
        href="/matches/new"
        class="btn btn--primary"
        style="align-self: flex-start; margin-top: var(--space-sm);"
      >
        New match
      </a>
    </div>
  {:else}
    <div class="row matches-header">
      <h2 class="card__title" style="margin: 0;">Matches</h2>
      <div class="row" style="gap: var(--space-sm);">
        <a href="/matches/new" class="btn btn--primary">New match</a>
      </div>
    </div>

    <div class="filters card">
      <div class="filters__row">
        <label class="filters__label" for="filter-stage">
          <span class="muted" style="font-size: 0.85rem;">Stage</span>
          <select
            id="filter-stage"
            class="input filters__select"
            bind:value={filterStage}
            aria-label="Filter by stage"
          >
            <option value="">All stages</option>
            {#each STAGE_OPTIONS as s}
              <option value={s}>{s}</option>
            {/each}
          </select>
        </label>
        <label class="filters__label" for="filter-sort">
          <span class="muted" style="font-size: 0.85rem;">Sort</span>
          <select
            id="filter-sort"
            class="input filters__select"
            bind:value={sortOrder}
            aria-label="Sort order"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </label>
      </div>
      <p class="filters__count muted">
        {total} total match{total === 1 ? '' : 'es'}
      </p>
    </div>

    {#if matches.length === 0}
      <div class="card stack">
        <p class="card__sub">No matches match your filters.</p>
        <button type="button" class="btn" onclick={() => (filterStage = '')}>
          Clear filters
        </button>
      </div>
    {:else}
      <div class="stack">
        {#each matches as match}
          {@const p1Id = typeof match.p1 === 'object' && match.p1 ? match.p1._id : match.p1}
          {@const p2Id = typeof match.p2 === 'object' && match.p2 ? match.p2._id : match.p2}
          {@const winnerId = matchWinnerId(match)}
          <a
            href="/matches/{match._id}"
            class="card playercard matchcard"
            style="text-decoration: none; color: inherit;"
          >
            <div class="matchcard__top muted">
              {formatDate(match.playedAt)} · {match.stage ?? '–'}{#if match.tournamentName}
                · {match.tournamentName}{/if}{#if (match.stage === 'Tournament' || match.tournamentName) && match.round != null}
                · R{match.round}{/if}
            </div>
            <div class="matchcard__row">
              <div
                class="matchcard__player matchcard__player--left"
                class:matchcard__player--winner={winnerId === p1Id}
              >
                <span class="matchcard__name">
                  {playerName(match.p1)}
                  {#if winnerId === p1Id}
                    <span class="matchcard__badge matchcard__badge--winner" aria-label="Winner"
                      ><IconCrown size={16} /></span
                    >
                  {/if}
                </span>
                {#if match.p1DeckColor}
                  <span class="matchcard__ink" title={match.p1DeckColor} aria-hidden="true"
                    ><InkIcons deckColor={match.p1DeckColor} /></span
                  >
                {/if}
                <span class="matchcard__wins muted" title="Games won"
                  >{gamesWon(match, p1Id ?? '')}</span
                >
              </div>
              <div class="matchcard__vs" aria-hidden="true">VS.</div>
              <div
                class="matchcard__player matchcard__player--right"
                class:matchcard__player--winner={winnerId === p2Id}
              >
                <span class="matchcard__wins muted" title="Games won"
                  >{gamesWon(match, p2Id ?? '')}</span
                >
                {#if match.p2DeckColor}
                  <span class="matchcard__ink" title={match.p2DeckColor} aria-hidden="true"
                    ><InkIcons deckColor={match.p2DeckColor} /></span
                  >
                {/if}
                <span class="matchcard__name">
                  {playerName(match.p2)}
                  {#if winnerId === p2Id}
                    <span class="matchcard__badge matchcard__badge--winner" aria-label="Winner"
                      ><IconCrown size={16} /></span
                    >
                  {/if}
                </span>
              </div>
            </div>
          </a>
        {/each}
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
      />
    {/if}
  {/if}
</div>
