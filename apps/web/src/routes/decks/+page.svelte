<script lang="ts">
  import { onMount } from 'svelte';
  import { config } from '$lib/config';
  import DeckColorSelect from '$lib/DeckColorSelect.svelte';
  import type { Deck } from '$lib/decks';
  import { getDeckPlayerName } from '$lib/decks';
  import { getLocale, translate, t } from '$lib/i18n';
  import { messageFromFailedResponse } from '$lib/errors';
  import FilterCard from '$lib/FilterCard.svelte';
  import { registerPageRefresh } from '$lib/pageRefreshRegistry';
  import InkIcons from '$lib/InkIcons.svelte';
  import { authMe } from '$lib/me';
  import Pagination from '$lib/Pagination.svelte';
  import Select from '$lib/Select.svelte';
  import { SvelteURLSearchParams } from 'svelte/reactivity';
  import { get } from 'svelte/store';

  const BIG_INK_THEORY_TEAM = 'The Big Ink Theory';
  type Player = { _id: string; name: string; team?: string };

  let decks = $state<Deck[]>([]);
  let allPlayers = $state<Player[]>([]);
  const players = $derived(allPlayers.filter((p) => (p.team ?? '').trim() === BIG_INK_THEORY_TEAM));
  let loading = $state(true);
  /** When true, player list is ready for the filter; deck fetch waits for this to avoid an empty player dropdown. */
  let playersReady = $state(false);
  let error = $state('');
  let filterColor = $state('');
  let filterPlayer = $state('');
  let filterSort = $state('newest');
  let currentPage = $state(1);
  let totalPages = $state(1);
  let total = $state(0);

  /** Filter panel starts collapsed (shared FilterCard pattern). */
  let filtersExpanded = $state(false);

  const apiUrl = config.apiUrl ?? '/api';

  const selectedPlayerName = $derived(
    filterPlayer ? (players.find((p) => p._id === filterPlayer)?.name ?? '') : '',
  );

  function winRateBand(
    rate: number | null | undefined,
  ): 'high' | 'low' | 'mid' | 'none' {
    if (rate == null || Number.isNaN(rate)) return 'none';
    if (rate >= 0.6) return 'high';
    if (rate <= 0.4) return 'low';
    return 'mid';
  }

  async function loadDecks() {
    loading = true;
    error = '';
    try {
      const params = new SvelteURLSearchParams();
      if (filterColor.trim()) params.set('color', filterColor.trim());
      if (filterPlayer.trim()) params.set('player', filterPlayer.trim());
      params.set('sort', filterSort);
      params.set('page', String(currentPage));
      params.set('limit', '15');
      const url = `${apiUrl}/decks?${params}`;
      const res = await fetch(url);
      if (!res.ok) {
        error = await messageFromFailedResponse(res, translate(getLocale(), 'decks.loadError'));
        return;
      }
      const response = await res.json();
      decks = response.data || [];
      totalPages = response.meta?.totalPages || 1;
      total = response.meta?.total || 0;
    } catch {
      error = translate(getLocale(), 'common.networkError');
    } finally {
      loading = false;
    }
  }

  async function fetchPlayers() {
    try {
      const playersRes = await fetch(`${apiUrl}/players?limit=100`);
      if (playersRes.ok) {
        const response = await playersRes.json();
        allPlayers = response.data || [];
      }
      const me = get(authMe);
      const myId = me?.player?._id;
      if (
        myId &&
        allPlayers.some(
          (p) => (p.team ?? '').trim() === BIG_INK_THEORY_TEAM && p._id === myId,
        )
      ) {
        filterPlayer = myId;
      }
    } catch {
      // non-blocking
    } finally {
      playersReady = true;
    }
  }

  function onFilterChange() {
    currentPage = 1;
  }

  function onSortChange() {
    currentPage = 1;
  }

  function clearDeckFilters() {
    filterColor = '';
    filterPlayer = '';
    currentPage = 1;
  }

  const canClearDeckFilters = $derived(!!(filterColor.trim() || filterPlayer.trim()));

  function handlePageChange(page: number) {
    currentPage = page;
  }

  $effect(() => {
    if (!playersReady) return;
    void loadDecks();
  });

  onMount(() => {
    void fetchPlayers();
    registerPageRefresh(loadDecks);
  });
</script>

<svelte:head>
  <title>{$t('decks.pageTitle')}</title>
</svelte:head>

<div class="page">
  {#if loading}
    <div class="decks-page decks-page--skeleton" aria-busy="true" aria-live="polite" aria-label={$t('decks.loadingAria')}>
      <div class="page-header">
        <div class="page-header__title-row">
          <div class="loading-skeleton__line loading-skeleton__line--title"></div>
        </div>
        <div class="loading-skeleton__line loading-skeleton__line--primary-btn decks-page__skel-new"></div>
      </div>
      <div class="card stack margin-bottom-md">
        <div class="loading-skeleton__line loading-skeleton__line--section-title"></div>
        <div class="filters__row">
          <div class="loading-skeleton__field" aria-hidden="true"></div>
          <div class="loading-skeleton__field" aria-hidden="true"></div>
          <div class="loading-skeleton__field" aria-hidden="true"></div>
        </div>
      </div>
      <div class="stack">
        {#each [0, 1, 2, 3] as i (i)}
          <div class="loading-skeleton__match-block" aria-hidden="true"></div>
        {/each}
      </div>
      <p class="muted margin-top-md">{$t('decks.loadingText')}</p>
    </div>
  {:else if error}
    <div class="card" role="alert" aria-live="assertive">
      <p class="alert">{error}</p>
    </div>
  {:else if decks.length === 0 && !filterColor && !filterPlayer}
    <div class="card stack">
      <h2 class="card__title">{$t('decks.emptyTitle')}</h2>
      <p class="card__sub">{$t('decks.emptySub')}</p>
      <a href="/decks/new" class="btn btn--primary margin-top-sm align-self-start">
        {$t('decks.newDeck')}
      </a>
    </div>
  {:else}
    <div class="page-header">
      <div class="page-header__title-row">
        <h2 class="card__title card-title-reset">{$t('decks.heading')}</h2>
      </div>
      <a href="/decks/new" class="btn btn--primary">{$t('decks.newDeck')}</a>
    </div>

    <FilterCard
      bind:expanded={filtersExpanded}
      title={$t('common.filters')}
      summary={total === 1
        ? $t('decks.filterCountSingular', { count: String(total) })
        : $t('decks.filterCountPlural', { count: String(total) })}
      badges={[
        ...(filterColor ? [$t('common.filterBadgeColor', { color: filterColor })] : []),
        ...(selectedPlayerName ? [$t('common.filterBadgePlayer', { name: selectedPlayerName })] : []),
      ]}
      panelId="decks-filters-panel"
      onClear={clearDeckFilters}
      canClear={canClearDeckFilters}
      clearLabel={$t('common.clearFilters')}
    >
      <div class="filters__row">
        <label class="filters__label" for="filter-deck-color">
          <span class="muted text-sm">{$t('decks.labelDeckColor')}</span>
          <div class="filters__select">
            <DeckColorSelect
              id="filter-deck-color"
              bind:value={filterColor}
              ariaLabel={$t('decks.ariaFilterDeckColor')}
              onchange={onFilterChange}
            />
          </div>
        </label>
        <label class="filters__label" for="filter-player">
          <span class="muted text-sm">{$t('common.player')}</span>
          <select
            id="filter-player"
            class="input filters__select"
            bind:value={filterPlayer}
            onchange={onFilterChange}
            aria-label={$t('common.ariaFilterByPlayer')}
          >
            <option value="">{$t('common.all')}</option>
            {#each players as p (p._id)}
              <option value={p._id}>{p.name}</option>
            {/each}
          </select>
        </label>
        <label class="filters__label" for="filter-deck-sort">
          <span class="muted text-sm">{$t('common.sort')}</span>
          <div class="filters__select">
            <Select
              id="filter-deck-sort"
              bind:value={filterSort}
              options={[
                { value: 'newest', label: $t('common.sortNewest') },
                { value: 'name', label: $t('common.sortName') },
                { value: 'winrate', label: $t('common.sortWinrate') },
                { value: 'matches', label: $t('common.sortMatches') },
              ]}
              ariaLabel={$t('decks.ariaSortDecks')}
              onchange={onSortChange}
            />
          </div>
        </label>
      </div>
    </FilterCard>

    <div class="stack">
      {#if decks.length === 0 && (filterColor || filterPlayer)}
        <div class="card stack decks-page__empty-filtered">
          <p class="card__sub margin-0">{$t('decks.emptyFiltered')}</p>
          {#if canClearDeckFilters}
            <button type="button" class="btn" onclick={clearDeckFilters}>{$t('common.clearFilters')}</button>
          {/if}
        </div>
      {:else}
        {#each decks as deck (deck._id)}
          <a href="/decks/{deck._id}" class="card deckcard link-inherit">
            <div class="deckcard__name">{deck.name}</div>
            <div class="deckcard__meta row row--md">
              {#if deck.deckColor}
                <span class="deckcard__ink" title={deck.deckColor} aria-hidden="true">
                  <InkIcons deckColor={deck.deckColor} />
                </span>
              {/if}
              {#if getDeckPlayerName(deck) !== '–'}
                <span class="muted">{getDeckPlayerName(deck)}</span>
              {/if}
              {#if deck.totalMatches !== undefined || deck.winRate != null}
                <span class="deckcard__stats row row--sm">
                  <span class="deckcard__matches muted" title={$t('common.matchesRecordedTooltip')}>
                    {deck.totalMatches ?? 0}
                    {(deck.totalMatches ?? 0) === 1 ? $t('common.matchSingular') : $t('common.matchPlural')}
                  </span>
                  {#if deck.winRate != null}
                    {@const band = winRateBand(deck.winRate)}
                    <span
                      class="deckcard__win-chip"
                      class:deckcard__win-chip--high={band === 'high'}
                      class:deckcard__win-chip--low={band === 'low'}
                      class:deckcard__win-chip--mid={band === 'mid'}
                      title={$t('common.winRate')}
                    >
                      {(deck.winRate * 100).toFixed(1)}% {$t('common.winRateAbbrev')}
                    </span>
                  {/if}
                </span>
              {/if}
            </div>
          </a>
        {/each}
      {/if}
    </div>

    <Pagination {currentPage} {totalPages} onPageChange={handlePageChange} />
  {/if}
</div>

<style>
  .deckcard__name {
    font-weight: 700;
    font-size: 1.1rem;
  }
  .deckcard__meta {
    margin-top: var(--space-xs);
    font-size: 0.9rem;
  }
  .deckcard__ink {
    font-size: 1rem;
  }
  .deckcard__stats {
    flex-wrap: wrap;
    align-items: center;
  }
  .deckcard__matches {
    font-size: 0.9rem;
    font-weight: 600;
  }
  .deckcard__win-chip {
    display: inline-flex;
    align-items: center;
    padding: 0.15rem 0.5rem;
    border-radius: var(--radius-full);
    font-size: 0.8rem;
    font-weight: 700;
    background: var(--glass-bg-strong);
    border: 1px solid var(--border);
    color: var(--muted);
  }
  .deckcard__win-chip--high {
    color: var(--ok);
    border-color: rgba(34, 197, 94, 0.35);
    background: rgba(34, 197, 94, 0.12);
  }
  .deckcard__win-chip--low {
    color: var(--big);
    border-color: rgba(220, 38, 38, 0.35);
    background: var(--danger-soft);
  }
  .deckcard__win-chip--mid {
    color: var(--fg);
    border-color: var(--border-strong);
  }
  .decks-page__skel-new {
    max-width: 9rem;
  }
</style>
