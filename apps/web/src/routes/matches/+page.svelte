<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { config } from '$lib/config';
  import { getAuthToken } from '$lib/auth';
  import { STAGE_OPTIONS } from '$lib/matches';
  import type { LorcanaMatch, LorcanaMatchPlayer } from '$lib/lorcana-match';
  import {
    formatMatchRoundLabel,
    getMatchRoundKey,
    isByeMatch,
    isIntentionalDrawMatch,
  } from '$lib/lorcana-match';
  import InkIcons from '$lib/InkIcons.svelte';
  import IconCrown from '$lib/icons/IconCrown.svelte';
  import IconUpload from '$lib/icons/IconUpload.svelte';
  import FilterCard from '$lib/FilterCard.svelte';
  import Select from '$lib/Select.svelte';
  import Pagination from '$lib/Pagination.svelte';
  import PlayerPickerModal from '$lib/PlayerPickerModal.svelte';
  import { DateDisplay } from '$lib/DateDisplay';
  import { getLocale, translate, t, locale } from '$lib/i18n';
  import { get } from 'svelte/store';
  import { messageFromFailedResponse } from '$lib/errors';
  import { authMe } from '$lib/me';
  import { registerPageRefresh } from '$lib/pageRefreshRegistry';

  type Player = { _id: string; name: string; team?: string };

  let matches = $state<LorcanaMatch[]>([]);
  let loading = $state(true);
  let error = $state('');

  const PAGE_SIZE = 15;

  let filterStage = $state<string>('');
  /** When set (from URL `?tournamentId=`), filters matches linked to that tournament entity. */
  let filterTournamentId = $state<string>('');
  /** '' = all time (default so stage filters e.g. Tournament aren’t hidden by a tight window). */
  let filterTime = $state<string>('');
  let filterPlayerId = $state<string>('');
  let filterPlayerName = $state<string>('');
  let playerPickerOpen = $state(false);
  let currentPage = $state(1);
  let totalPages = $state(1);
  let total = $state(0);

  /** Filter panel starts collapsed (shared FilterCard pattern). */
  let filtersExpanded = $state(false);

  /** Logged-in user’s player (for showing Duels import when linked). */
  let myPlayerId = $state<string | null>(null);
  let duelsImportInput = $state<HTMLInputElement | null>(null);
  let importingDuels = $state(false);
  let duelsImportError = $state('');
  let duelsHelpOpen = $state(false);

  const apiUrl = config.apiUrl ?? '/api';

  const STAGE_FILTER_OPTIONS = $derived.by(() => {
    const loc = get(locale);
    return [
      { value: '', label: translate(loc, 'matches.list.stageAll') },
      ...STAGE_OPTIONS.map((s) => ({ value: s, label: s })),
    ];
  });

  const TIME_FILTER_OPTIONS = $derived.by(() => {
    const loc = get(locale);
    return [
      { value: '', label: translate(loc, 'matches.list.timeAll') },
      { value: '7', label: translate(loc, 'matches.list.timeLast7') },
      { value: '30', label: translate(loc, 'matches.list.timeLast30') },
      { value: '90', label: translate(loc, 'matches.list.timeLast90') },
    ];
  });

  const filterSummary = $derived.by(() => {
    const loc = get(locale);
    return translate(
      loc,
      total === 1 ? 'matches.list.filterTotalOne' : 'matches.list.filterTotalMany',
      { count: String(total) },
    );
  });

  const filterBadges = $derived.by(() => {
    const loc = get(locale);
    return [
      filterPlayerName
        ? translate(loc, 'matches.list.filterBadgePlayer', { name: filterPlayerName })
        : '',
      filterStage ? translate(loc, 'matches.list.filterBadgeStage', { stage: filterStage }) : '',
      filterTime ? translate(loc, 'matches.list.filterBadgeLastDays', { days: filterTime }) : '',
    ].filter((b) => b.length > 0);
  });

  /**
   * A single `.zip` larger than this threshold is routed to the bulk archive
   * endpoint. Individual compressed replays from duels.ink are only a few KB,
   */

  function looksLikeBulkZip(files: FileList): boolean {
    if (files.length !== 1) return false;
    const file = files[0];
    return file.name.toLowerCase().endsWith('.zip')   ;
  }

  function triggerDuelsImport() {
    duelsImportInput?.click();
  }

  function toggleDuelsHelp() {
    duelsHelpOpen = !duelsHelpOpen;
  }

  function playerName(p: Player | LorcanaMatchPlayer | string | undefined): string {
    if (!p) return '–';
    return typeof p === 'string' ? p : (p.name ?? '–');
  }

  function matchWinnerId(m: LorcanaMatch): string | undefined {
    const w = m.matchWinner;
    if (!w) return undefined;
    return typeof w === 'object' && w !== null ? w._id : w;
  }

  function gameWinnerId(g: { winner?: unknown }): string | undefined {
    const w = g.winner;
    if (w == null) return undefined;
    return typeof w === 'object' && w !== null && '_id' in w
      ? (w as { _id: string })._id
      : String(w);
  }

  function gamesWon(match: LorcanaMatch, playerId: string): number {
    const games = match.games ?? [];
    return games.filter((g) => gameWinnerId(g) === playerId).length;
  }

  /** Stage vocabulary chip; tournament-linked matches use the Tournament label when needed. */
  function matchStagePillLabel(m: LorcanaMatch): string | null {
    const st = m.stage?.trim();
    if (st && (STAGE_OPTIONS as readonly string[]).includes(st)) return st;
    const t = m.tournament;
    if (t && (typeof t === 'object' ? t._id || t.name : typeof t === 'string' && t.trim()))
      return translate(getLocale(), 'matches.list.labelTournament');
    return null;
  }

  /** Populated tournament ref → link target for list chips. */
  function matchTournamentChip(
    m: LorcanaMatch
  ): { id: string; name: string } | null {
    const t = m.tournament;
    if (t && typeof t === 'object' && t._id) {
      return {
        id: t._id,
        name: t.name?.trim() || translate(getLocale(), 'matches.list.labelTournament'),
      };
    }
    if (typeof t === 'string' && /^[a-f\d]{24}$/i.test(t.trim())) {
      return { id: t.trim(), name: translate(getLocale(), 'matches.list.labelTournament') };
    }
    return null;
  }

  function getTimeRange(): { fromDate?: string; toDate?: string } {
    if (!filterTime) return {};
    const now = Date.now();
    const days = Number.parseInt(filterTime, 10) || 7;
    const fromMs = now - days * 24 * 60 * 60 * 1000;
    return {
      fromDate: new Date(fromMs).toISOString().slice(0, 10),
      toDate: new Date(now).toISOString().slice(0, 10),
    };
  }

  async function fetchMatches() {
    loading = true;
    error = '';
    try {
      const range = getTimeRange();
      // eslint-disable-next-line svelte/prefer-svelte-reactivity
      const params = new URLSearchParams();
      if (filterStage) params.set('stage', filterStage);
      if (filterTournamentId.trim()) params.set('tournamentId', filterTournamentId.trim());
      if (filterPlayerId) params.set('player', filterPlayerId);
      if (range.fromDate) params.set('fromDate', range.fromDate);
      if (range.toDate) params.set('toDate', range.toDate);
      params.set('sort', 'newest');
      params.set('page', String(currentPage));
      params.set('limit', String(PAGE_SIZE));
      const url = `${apiUrl}/matches${params.toString() ? `?${params}` : ''}`;
      const res = await fetch(url);
      if (!res.ok) {
        error = await messageFromFailedResponse(res, translate(getLocale(), 'matches.list.loadError'));
        return;
      }
      const response = await res.json();
      matches = response.data || [];
      totalPages = response.meta?.totalPages || 1;
      total = response.meta?.total || 0;
    } catch {
      error = translate(getLocale(), 'common.networkError');
    } finally {
      loading = false;
    }
  }

  function handlePageChange(page: number) {
    currentPage = page;
  }

  function handlePlayerSelect(playerId: string, player?: { name: string; team?: string }) {
    filterPlayerId = playerId ?? '';
    filterPlayerName = player ? player.name : '';
  }

  function clearFilters() {
    filterStage = '';
    filterTime = '';
    filterTournamentId = '';
    filterPlayerId = '';
    filterPlayerName = '';
  }

  const canClearFilters = $derived(
    !!(filterStage || filterTime || filterPlayerId || filterTournamentId),
  );

  $effect(() => {
    const tid = $page.url.searchParams.get('tournamentId');
    const s = $page.url.searchParams.get('stage');
    filterTournamentId = tid ?? '';
    if (s && STAGE_OPTIONS.includes(s as (typeof STAGE_OPTIONS)[number])) {
      filterStage = s;
    } else if (tid) {
      filterStage = 'Tournament';
    }
  });

  onMount(() => {
    let applied = false;
    const unsub = authMe.subscribe((me) => {
      if (applied) return;
      const p = me?.player;
      if (!p?._id) return;
      filterPlayerId = p._id;
      filterPlayerName = (p.name ?? '').trim();
      myPlayerId = p._id;
      applied = true;
    });
    const unregRefresh = registerPageRefresh(fetchMatches);
    return () => {
      unsub();
      unregRefresh();
    };
  });

  async function extractErrorMessage(res: Response, fallbackKey: string): Promise<string> {
    const data = (await res.json().catch(() => ({}))) as { message?: string | string[] };
    const m = data.message;
    if (Array.isArray(m)) return m.join(', ');
    if (typeof m === 'string') return m;
    return `${translate(getLocale(), fallbackKey)} (${res.status})`;
  }

  async function importAsBulk(file: File, token: string): Promise<void> {
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch(`${apiUrl}/matches/import-duels-bulk`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: fd,
    });
    if (!res.ok) {
      duelsImportError = await extractErrorMessage(res, 'matches.list.bulkImportFailed');
      return;
    }
    const json = (await res.json()) as { matches: Array<{ _id: string }> };
    const list = json.matches ?? [];
    if (list.length > 0) {
      await goto(`/matches/${list[0]._id}`);
    } else {
      await fetchMatches();
    }
  }

  async function importAsReplays(files: FileList, token: string): Promise<void> {
    const fd = new FormData();
    for (const f of Array.from(files)) {
      fd.append('files', f);
    }
    const res = await fetch(`${apiUrl}/matches/import-duels`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: fd,
    });
    if (!res.ok) {
      duelsImportError = await extractErrorMessage(res, 'matches.list.importFailed');
      return;
    }
    const match = (await res.json()) as { _id: string };
    await goto(`/matches/${match._id}`);
  }

  async function onDuelsImportFilesSelected(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    const files = input.files;
    if (!files?.length) return;
    const token = getAuthToken();
    if (!token) {
      duelsImportError = translate(getLocale(), 'matches.list.signInToImport');
      input.value = '';
      return;
    }
    importingDuels = true;
    duelsImportError = '';
    try {
      if (looksLikeBulkZip(files)) {
        await importAsBulk(files[0], token);
      } else {
        await importAsReplays(files, token);
      }
    } catch {
      duelsImportError = translate(getLocale(), 'matches.list.importFailed');
    } finally {
      importingDuels = false;
      input.value = '';
    }
  }

  $effect(() => {
    // Track filter deps so we reset page when they change
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _ = [filterStage, filterTime, filterPlayerId, filterTournamentId];
    currentPage = 1;
  });

  $effect(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _ = [currentPage, filterStage, filterTime, filterPlayerId, filterTournamentId];
    fetchMatches();
  });
</script>

<svelte:head>
  <title>{$t('matches.list.pageTitle')}</title>
</svelte:head>

<div class="page">
  {#if myPlayerId}
    <input
      bind:this={duelsImportInput}
      type="file"
      class="matches-page__duels-file-input"
      accept=".gz,.zip,application/gzip,application/x-gzip,application/zip"
      multiple
      disabled={importingDuels}
      onchange={onDuelsImportFilesSelected}
      aria-label={$t('matches.list.duelsFileAria')}
    />
  {/if}
  {#if loading}
    <div class="matches-page matches-page--skeleton" aria-busy="true" aria-live="polite" aria-label={$t('matches.list.loadingAria')}>
      <div class="row matches-header row--between">
        <div class="page-header__title-row">
          <div class="loading-skeleton__line loading-skeleton__line--title"></div>
        </div>
        <div class="row row--sm">
          <div class="loading-skeleton__line loading-skeleton__line--btn"></div>
          <div class="loading-skeleton__line loading-skeleton__line--btn"></div>
          <div class="loading-skeleton__line loading-skeleton__line--primary-btn"></div>
        </div>
      </div>
      <div class="card stack margin-bottom-md">
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
      <p class="muted margin-top-md">{$t('matches.list.loadingText')}</p>
    </div>
  {:else if error}
    <div class="card" role="alert" aria-live="assertive">
      <p class="alert">{error}</p>
    </div>
  {:else if matches.length === 0 && !filterStage && !filterTime && !filterPlayerId && !filterTournamentId}
    <div class="card stack">
      <h2 class="card__title">{$t('matches.list.emptyTitle')}</h2>
      <p class="card__sub">{$t('matches.list.emptySub')}</p>
      <div class="row matches-page__empty-actions">
        <a href="/matches/new" class="btn btn--primary">{$t('matches.list.newMatch')}</a>
        {#if myPlayerId}
          <button
            type="button"
            class="btn matches-page__duels-import-btn"
            onclick={triggerDuelsImport}
            disabled={importingDuels}
            aria-busy={importingDuels}
            aria-label={importingDuels ? $t('matches.list.importing') : $t('matches.list.importLabel')}
            title={$t('matches.list.duelsImportTooltip')}
          >
            <IconUpload size={20} />
            <span>{importingDuels ? $t('matches.list.importing') : $t('matches.list.importLabel')}</span>
          </button>
          <button
            type="button"
            class="btn btn--sm matches-page__duels-help-btn"
            onclick={toggleDuelsHelp}
            aria-expanded={duelsHelpOpen}
            aria-controls="duels-import-help"
            aria-label={duelsHelpOpen ? $t('matches.list.duelsHelpCollapseAria') : $t('matches.list.duelsHelpExpandAria')}
            title={$t('matches.list.duelsHelpButtonTitle')}
          >
            ?
          </button>
        {/if}
      </div>
      {#if myPlayerId && duelsHelpOpen}
        <div
          id="duels-import-help"
          class="matches-page__duels-help-panel"
          role="region"
          aria-label={$t('matches.list.duelsHelpRegionAria')}
        >
          <p class="muted matches-page__duels-hint">
            {$t('matches.list.duelsHelp1')}
          </p>
          <p class="muted matches-page__duels-hint matches-page__duels-hint--bulk">
            {$t('matches.list.duelsHelpBulk')}
          </p>
        </div>
      {/if}
      {#if duelsImportError}
        <p class="alert" role="alert">{duelsImportError}</p>
      {/if}
    </div>
  {:else}
    <div class="row matches-header row--between">
      <div class="page-header__title-row">
        <h2 class="card__title card-title-reset">{$t('matches.list.heading')}</h2>
      </div>
      <div class="row row--sm">
        <a href="/matches/quick" class="btn">{$t('matches.list.quickMatch')}</a>
        <a href="/tournaments" class="btn">{$t('matches.list.navTournaments')}</a>
        {#if myPlayerId}
          <button
            type="button"
            class="btn matches-page__duels-import-btn"
            onclick={triggerDuelsImport}
            disabled={importingDuels}
            aria-busy={importingDuels}
            aria-label={importingDuels ? $t('matches.list.importing') : $t('matches.list.importLabel')}
            title={$t('matches.list.duelsImportTooltip')}
          >
            <IconUpload size={20} />
            <span>{importingDuels ? $t('matches.list.importing') : $t('matches.list.importLabel')}</span>
          </button>
        {/if}
        <a href="/matches/new" class="btn btn--primary">{$t('matches.list.newMatch')}</a>
      </div>
    </div>
    {#if myPlayerId && duelsImportError}
      <p class="alert matches-page__duels-alert" role="alert">{duelsImportError}</p>
    {/if}

    <FilterCard
      bind:expanded={filtersExpanded}
      title={$t('common.filters')}
      summary={filterSummary}
      badges={filterBadges}
      panelId="matches-filters-panel"
      onClear={clearFilters}
      canClear={canClearFilters}
      clearLabel={$t('common.clearFilters')}
      showSummaryInExpandedPanel={false}
    >
      <div class="filters__row">
        <label class="filters__label" for="filter-player-btn">
          <span class="muted text-sm">{$t('matches.list.labelPlayer')}</span>
          <button
            id="filter-player-btn"
            type="button"
            class="btn filters__select filters__select-btn"
            onclick={() => (playerPickerOpen = true)}
            aria-label={$t('matches.list.filterByPlayerButton')}
          >
            {filterPlayerName || $t('matches.list.filterAllPlayers')}
          </button>
        </label>
        <label class="filters__label" for="filter-stage">
          <span class="muted text-sm">{$t('matches.list.labelStage')}</span>
          <div class="filters__select">
            <Select
              id="filter-stage"
              bind:value={filterStage}
              options={STAGE_FILTER_OPTIONS}
              ariaLabel={$t('matches.list.filterByStage')}
            />
          </div>
        </label>
        <label class="filters__label" for="filter-time">
          <span class="muted text-sm">{$t('matches.list.labelTime')}</span>
          <div class="filters__select">
            <Select
              id="filter-time"
              bind:value={filterTime}
              options={TIME_FILTER_OPTIONS}
              ariaLabel={$t('matches.list.filterByTime')}
            />
          </div>
        </label>
      </div>
      <div class="filters__footer">
        <p class="filters__count muted">{filterSummary}</p>
        <button type="button" class="btn" onclick={clearFilters} disabled={!canClearFilters}>
          {$t('common.clearFilters')}
        </button>
      </div>
    </FilterCard>

    <PlayerPickerModal
      bind:open={playerPickerOpen}
      title={$t('matches.list.filterPlayerModalTitle')}
      forLabel=""
      onSelect={handlePlayerSelect}
      onClose={() => (playerPickerOpen = false)}
    />

    {#if matches.length === 0}
      <div class="card stack matches-page__empty-filtered">
        <p class="card__sub">{$t('matches.list.emptyFiltered')}</p>
        {#if canClearFilters}
          <button type="button" class="btn" onclick={clearFilters}>{$t('common.clearFilters')}</button>
        {/if}
      </div>
    {:else}
      <div class="stack">
        {#each matches as match (match._id)}
          {@const p1Id = typeof match.p1 === 'object' && match.p1 ? match.p1._id : match.p1}
          {@const p2Id = typeof match.p2 === 'object' && match.p2 ? match.p2._id : match.p2}
          {@const winnerId = matchWinnerId(match)}
          {@const idMatch = isIntentionalDrawMatch(match)}
          {@const byeMatch = isByeMatch(match)}
          {@const stagePill = matchStagePillLabel(match)}
          {@const tournamentLink = matchTournamentChip(match)}
          <div class="card playercard matchcard">
            <div class="matchcard__top muted matchcard__top--with-pill">
              {#if stagePill}
                <span class="matchcard__stage-pill">{stagePill}</span>
              {/if}
              {#if idMatch}
                <span class="matchcard__pill--id" title={$t('matches.list.pillIdTitle')}
                  >{$t('matches.list.pillId')}</span
                >
              {:else if byeMatch}
                <span class="matchcard__pill--bye" title={$t('matches.list.pillByeTitle')}>{$t('matches.list.pillBye')}</span>
              {/if}
              <span
                class="matchcard__date-chip"
                title={DateDisplay.formatDateTime(match.playedAt)}
                >{DateDisplay.formatDate(match.playedAt)}</span
              >
              {#if tournamentLink}
                <a
                  href="/tournaments/{tournamentLink.id}"
                  class="matchcard__chip matchcard__chip--tournament"
                  aria-label={$t('matches.list.openTournamentAria', { name: tournamentLink.name })}
                  onclick={(e) => e.stopPropagation()}>{tournamentLink.name}</a
                >
              {/if}
              {#if getMatchRoundKey(match.round) != null}
                <span class="matchcard__top-meta matchcard__top-meta--round"
                  >{formatMatchRoundLabel(match.round)}</span
                >
              {/if}
            </div>
            <a
              href="/matches/{match._id}"
              class="matchcard__row matchcard__main-link link-inherit"
              aria-label={$t('matches.list.openMatchAria', {
                p1: playerName(match.p1),
                p2: playerName(match.p2),
              })}
            >
              <div
                class="matchcard__player matchcard__player--left"
                class:matchcard__player--winner={!idMatch && winnerId === p1Id}
              >
                <span class="matchcard__name">
                  {playerName(match.p1)}
                  {#if !idMatch && winnerId === p1Id}
                    <span class="matchcard__badge matchcard__badge--winner" aria-label={$t('matches.list.winnerAria')}
                      ><IconCrown size={16} /></span
                    >
                  {/if}
                </span>
                {#if match.p1DeckColor}
                  <span class="matchcard__ink" title={match.p1DeckColor} aria-hidden="true"
                    ><InkIcons deckColor={match.p1DeckColor} /></span
                  >
                {/if}
                <span class="matchcard__wins muted" title={$t('matches.list.gamesWonTitle')}
                  >{gamesWon(match, p1Id ?? '')}</span
                >
              </div>
              <div class="matchcard__vs" aria-hidden="true">{$t('matches.list.vs')}</div>
              <div
                class="matchcard__player matchcard__player--right"
                class:matchcard__player--winner={!idMatch && winnerId === p2Id}
              >
                <span class="matchcard__wins muted" title={$t('matches.list.gamesWonTitle')}
                  >{gamesWon(match, p2Id ?? '')}</span
                >
                {#if match.p2DeckColor}
                  <span class="matchcard__ink" title={match.p2DeckColor} aria-hidden="true"
                    ><InkIcons deckColor={match.p2DeckColor} /></span
                  >
                {/if}
                <span class="matchcard__name">
                  {playerName(match.p2)}
                  {#if !idMatch && winnerId === p2Id}
                    <span class="matchcard__badge matchcard__badge--winner" aria-label={$t('matches.list.winnerAria')}
                      ><IconCrown size={16} /></span
                    >
                  {/if}
                </span>
              </div>
            </a>
          </div>
        {/each}
      </div>

      <Pagination {currentPage} {totalPages} onPageChange={handlePageChange} />
    {/if}
  {/if}
</div>

<style>
  .matches-page__duels-file-input {
    position: absolute;
    width: 0;
    height: 0;
    opacity: 0;
    overflow: hidden;
    pointer-events: none;
  }

  .matches-page__empty-actions {
    align-items: center;
    gap: var(--space-sm);
    flex-wrap: wrap;
    margin-top: var(--space-sm);
  }

  .matches-page__duels-hint {
    margin: var(--space-sm) 0 0 0;
    font-size: 0.85rem;
    max-width: 42rem;
    line-height: 1.45;
  }

  .matches-page__duels-hint code {
    font-size: 0.9em;
  }

  .matches-page__duels-hint--bulk {
    margin-top: var(--space-sm);
  }

  .matches-page__duels-import-btn {
    gap: var(--space-xs);
  }

  .matches-page__duels-import-btn :global(svg) {
    display: block;
    flex-shrink: 0;
  }

  .matches-page__duels-help-btn {
    min-width: 2.25rem;
    padding-inline: 0;
    font-weight: 700;
    line-height: 1;
  }

  .matches-page__duels-help-panel {
    margin-top: var(--space-sm);
    padding: var(--space-sm) var(--space-md);
    border: 1px solid var(--glass-border, rgba(255, 255, 255, 0.1));
    border-radius: var(--radius-md, 8px);
    background: var(--glass-bg, rgba(255, 255, 255, 0.04));
    max-width: 42rem;
  }

  .matches-page__duels-help-panel .matches-page__duels-hint:first-child {
    margin-top: 0;
  }

  .matches-page__duels-alert {
    margin: 0 0 var(--space-sm) 0;
  }

  .matches-page__empty-filtered .btn {
    align-self: flex-start;
    margin-top: var(--space-sm);
  }

  :global(.matchcard) .matchcard__top--with-pill {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.45rem 0.5rem;
  }

  :global(.matchcard) .matchcard__stage-pill {
    flex-shrink: 0;
    font-size: 0.65rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    padding: 0.2rem 0.5rem;
    border-radius: 999px;
    border: 1px solid color-mix(in srgb, var(--fg, #fafafa) 14%, transparent);
    background: color-mix(in srgb, var(--fg, #fafafa) 6%, transparent);
    color: color-mix(in srgb, var(--fg, #fafafa) 78%, var(--muted));
  }

  :global(.matchcard) .matchcard__date-chip {
    flex-shrink: 0;
    font-size: 0.65rem;
    font-weight: 700;
    padding: 0.2rem 0.5rem;
    border-radius: 999px;
    border: 1px solid color-mix(in srgb, var(--muted) 35%, transparent);
    background: color-mix(in srgb, var(--muted) 12%, transparent);
    color: color-mix(in srgb, var(--fg, #fafafa) 85%, var(--muted));
  }

  :global(.matchcard) .matchcard__chip--tournament {
    flex-shrink: 0;
    max-width: min(100%, 14rem);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 0.65rem;
    font-weight: 700;
    padding: 0.2rem 0.5rem;
    border-radius: 999px;
    border: 1px solid color-mix(in srgb, var(--primary) 45%, transparent);
    background: color-mix(in srgb, var(--primary) 14%, transparent);
    color: var(--primary);
    text-decoration: none;
    transition:
      background var(--transition),
      border-color var(--transition),
      color var(--transition);
  }

  @media (hover: hover) {
    :global(.matchcard) .matchcard__chip--tournament:hover {
      background: color-mix(in srgb, var(--primary) 22%, transparent);
      border-color: color-mix(in srgb, var(--primary) 65%, transparent);
    }
  }

  :global(.matchcard) .matchcard__chip--tournament:focus-visible {
    outline: 2px solid var(--primary);
    outline-offset: 2px;
  }

  :global(.matchcard) .matchcard__top-meta {
    min-width: 0;
    flex: 1 1 12rem;
  }

  :global(.matchcard) .matchcard__top-meta--round {
    font-size: 0.75rem;
    font-weight: 600;
    text-align: right;
    color: var(--muted);
  }

  :global(.matchcard) .matchcard__main-link:focus-visible {
    outline: 2px solid var(--ink);
    outline-offset: 3px;
    border-radius: var(--radius-sm);
  }
</style>
