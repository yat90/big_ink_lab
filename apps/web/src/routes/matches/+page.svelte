<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { config } from '$lib/config';
  import { getAuthToken } from '$lib/auth';
  import { STAGE_OPTIONS } from '$lib/matches';
  import type { LorcanaMatch, LorcanaMatchPlayer } from '$lib/lorcana-match';
  import InkIcons from '$lib/InkIcons.svelte';
  import IconCrown from '$lib/icons/IconCrown.svelte';
  import IconUpload from '$lib/icons/IconUpload.svelte';
  import Pagination from '$lib/Pagination.svelte';
  import PlayerPickerModal from '$lib/PlayerPickerModal.svelte';

  type Player = { _id: string; name: string; team?: string };

  let matches = $state<LorcanaMatch[]>([]);
  let loading = $state(true);
  let error = $state('');

  const PAGE_SIZE = 10;

  let filterStage = $state<string>('');
  /** When set (e.g. from URL `?tournamentName=`), filters API by tournament name. */
  let filterTournamentName = $state<string>('');
  /** '' = all time (default so stage filters e.g. Tournament aren’t hidden by a tight window). */
  let filterTime = $state<string>('');
  let filterPlayerId = $state<string>('');
  let filterPlayerName = $state<string>('');
  let playerPickerOpen = $state(false);
  let currentPage = $state(1);
  let totalPages = $state(1);
  let total = $state(0);

  /** Logged-in user’s player (for showing Duels import when linked). */
  let myPlayerId = $state<string | null>(null);
  let duelsImportInput = $state<HTMLInputElement | null>(null);
  let duelsBulkImportInput = $state<HTMLInputElement | null>(null);
  let importingDuelsReplays = $state(false);
  let importingDuelsBulk = $state(false);
  let duelsImportError = $state('');
  let duelsBulkImportError = $state('');

  const apiUrl = config.apiUrl ?? '/api';

  const isDuelsImportBusy = $derived(importingDuelsReplays || importingDuelsBulk);

  let duelsImportMenu = $state<HTMLElement | null>(null);

  /** Accessible name / tooltip for the icon-only Duels import control. */
  function duelsImportAriaLabel(): string {
    if (!isDuelsImportBusy) {
      return 'Import from Duels — replay files (.gz / .zip) or bulk archive (.zip of .gz games)';
    }
    if (importingDuelsBulk) return 'Importing bulk…';
    return 'Importing…';
  }

  function closeDuelsImportMenu() {
    const el = duelsImportMenu;
    if (el && 'open' in el) (el as { open: boolean }).open = false;
  }

  function openDuelsSingleImport() {
    closeDuelsImportMenu();
    duelsImportInput?.click();
  }

  function openDuelsBulkImport() {
    closeDuelsImportMenu();
    duelsBulkImportInput?.click();
  }

  function playerName(p: Player | LorcanaMatchPlayer | string | undefined): string {
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
      if (filterTournamentName.trim()) params.set('tournamentName', filterTournamentName.trim());
      if (filterPlayerId) params.set('player', filterPlayerId);
      if (range.fromDate) params.set('fromDate', range.fromDate);
      if (range.toDate) params.set('toDate', range.toDate);
      params.set('sort', 'newest');
      params.set('page', String(currentPage));
      params.set('limit', String(PAGE_SIZE));
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

  function handlePlayerSelect(playerId: string, player?: { name: string; team?: string }) {
    filterPlayerId = playerId ?? '';
    filterPlayerName = player ? player.name : '';
  }

  function clearFilters() {
    filterStage = '';
    filterTime = '';
    filterTournamentName = '';
    filterPlayerId = '';
    filterPlayerName = '';
  }

  $effect(() => {
    const t = $page.url.searchParams.get('tournamentName');
    const s = $page.url.searchParams.get('stage');
    filterTournamentName = t ?? '';
    if (s && STAGE_OPTIONS.includes(s as (typeof STAGE_OPTIONS)[number])) {
      filterStage = s;
    } else if (t) {
      filterStage = 'Tournament';
    }
  });

  onMount(async () => {
    const token = getAuthToken();
    if (!token) return;
    try {
      const meRes = await fetch(`${apiUrl}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (meRes.ok) {
        const me = await meRes.json();
        const p = me?.player;
        if (p?._id) {
          filterPlayerId = p._id;
          filterPlayerName = (p.name ?? '').trim();
          myPlayerId = p._id;
        }
      }
    } catch {
      /* non-blocking */
    }
  });

  async function onDuelsImportFilesSelected(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    const files = input.files;
    if (!files?.length) return;
    const token = getAuthToken();
    if (!token) {
      duelsImportError = 'Sign in to import.';
      input.value = '';
      return;
    }
    importingDuelsReplays = true;
    duelsImportError = '';
    duelsBulkImportError = '';
    try {
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
        const data = (await res.json().catch(() => ({}))) as {
          message?: string | string[];
        };
        const m = data.message;
        duelsImportError = Array.isArray(m)
          ? m.join(', ')
          : typeof m === 'string'
            ? m
            : `Import failed (${res.status})`;
        return;
      }
      const match = (await res.json()) as { _id: string };
      await goto(`/matches/${match._id}`);
    } catch {
      duelsImportError = 'Import failed.';
    } finally {
      importingDuelsReplays = false;
      input.value = '';
    }
  }

  async function onDuelsBulkImportFileSelected(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const token = getAuthToken();
    if (!token) {
      duelsBulkImportError = 'Sign in to import.';
      input.value = '';
      return;
    }
    importingDuelsBulk = true;
    duelsBulkImportError = '';
    duelsImportError = '';
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`${apiUrl}/matches/import-duels-bulk`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          message?: string | string[];
        };
        const m = data.message;
        duelsBulkImportError = Array.isArray(m)
          ? m.join(', ')
          : typeof m === 'string'
            ? m
            : `Bulk import failed (${res.status})`;
        return;
      }
      const json = (await res.json()) as { matches: Array<{ _id: string }> };
      const list = json.matches ?? [];
      if (list.length > 0) {
        await goto(`/matches/${list[0]._id}`);
      } else {
        await fetchMatches();
      }
    } catch {
      duelsBulkImportError = 'Bulk import failed.';
    } finally {
      importingDuelsBulk = false;
      input.value = '';
    }
  }

  $effect(() => {
    // Track filter deps so we reset page when they change
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _ = [filterStage, filterTime, filterPlayerId, filterTournamentName];
    currentPage = 1;
  });

  $effect(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _ = [currentPage, filterStage, filterTime, filterPlayerId, filterTournamentName];
    fetchMatches();
  });
</script>

<div class="page">
  {#if myPlayerId}
    <input
      bind:this={duelsImportInput}
      type="file"
      class="matches-page__duels-file-input"
      accept=".gz,.zip,application/gzip,application/x-gzip,application/zip"
      multiple
      disabled={isDuelsImportBusy}
      onchange={onDuelsImportFilesSelected}
      aria-label="Import Duels replay files"
    />
    <input
      bind:this={duelsBulkImportInput}
      type="file"
      class="matches-page__duels-file-input"
      accept=".zip,.tar.gz,.tgz,application/zip,application/x-gzip,application/gzip"
      disabled={isDuelsImportBusy}
      onchange={onDuelsBulkImportFileSelected}
      aria-label="Import Duels bulk archive (zip of gz games)"
    />
  {/if}
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
  {:else if matches.length === 0 && !filterStage && !filterTime && !filterPlayerId}
    <div class="card stack">
      <h2 class="card__title">No matches yet</h2>
      <p class="card__sub">Create your first match or import replays from duels.ink.</p>
      <div class="row matches-page__empty-actions">
        <a href="/matches/new" class="btn btn--primary">New match</a>
        {#if myPlayerId}
          <details
            bind:this={duelsImportMenu}
            class="matches-page__duels-menu"
            class:matches-page__duels-menu--busy={isDuelsImportBusy}
          >
            <summary
              class="btn matches-page__duels-menu__summary matches-page__duels-menu__summary--icon"
              aria-label={duelsImportAriaLabel()}
              title={duelsImportAriaLabel()}
              aria-busy={isDuelsImportBusy}
            >
              <IconUpload size={20} />
            </summary>
            <div class="matches-page__duels-menu__panel" role="menu">
              <button
                type="button"
                class="matches-page__duels-menu__item"
                role="menuitem"
                disabled={isDuelsImportBusy}
                onclick={openDuelsSingleImport}
              >
                Import replays from duels.ink…
              </button>
              <button
                type="button"
                class="matches-page__duels-menu__item"
                role="menuitem"
                disabled={isDuelsImportBusy}
                title="One .zip with day folders and .gz games; matchView groups games, else one match per replay"
                onclick={openDuelsBulkImport}
              >
                Import bulk replays (.zip)
              </button>
            </div>
          </details>
        {/if}
      </div>
      {#if myPlayerId}
        <p class="muted matches-page__duels-hint">
          You are <strong>Player 1</strong>. Opponent is taken from the replay
          (<code>playerNames</code> / <code>perspective</code>). One <code>.gz</code> per game, or one
          <code>.zip</code> of <code>.gz</code> files. A new player is created if the name does not
          exist.
        </p>
        <p class="muted matches-page__duels-hint matches-page__duels-hint--bulk">
          <strong>Bulk:</strong> one <code>.zip</code> (folders per day, <code>.gz</code> per game). A
          <code>.tar.gz</code> still works. With <code>matchView</code>, games merge into one match per id;
          without it, each replay becomes its own single-game match.
        </p>
      {/if}
      {#if duelsImportError}
        <p class="alert" role="alert">{duelsImportError}</p>
      {/if}
      {#if duelsBulkImportError}
        <p class="alert" role="alert">{duelsBulkImportError}</p>
      {/if}
    </div>
  {:else}
    <div class="row matches-header">
      <h2 class="card__title" style="margin: 0;">
        Matches
        <span class="matches-header__count muted" aria-label="Total matches">({total})</span>
      </h2>
      <div class="row" style="gap: var(--space-sm); flex-wrap: wrap;">
        <a href="/matches/quick" class="btn">Quick match</a>
        <a href="/tournaments/results" class="btn">Tournament results</a>
        {#if myPlayerId}
          <details
            bind:this={duelsImportMenu}
            class="matches-page__duels-menu"
            class:matches-page__duels-menu--busy={isDuelsImportBusy}
          >
            <summary
              class="btn matches-page__duels-menu__summary matches-page__duels-menu__summary--icon"
              aria-label={duelsImportAriaLabel()}
              title={duelsImportAriaLabel()}
              aria-busy={isDuelsImportBusy}
            >
              <IconUpload size={20} />
            </summary>
            <div class="matches-page__duels-menu__panel" role="menu">
              <button
                type="button"
                class="matches-page__duels-menu__item"
                role="menuitem"
                disabled={isDuelsImportBusy}
                onclick={openDuelsSingleImport}
              >
                Import replays from duels.ink
              </button>
              <button
                type="button"
                class="matches-page__duels-menu__item"
                role="menuitem"
                disabled={isDuelsImportBusy}
                title="One .zip with day folders and .gz games; matchView groups games, else one match per replay"
                onclick={openDuelsBulkImport}
              >
                Import bulk replays (.zip)
              </button>
            </div>
          </details>
        {/if}
        <a href="/matches/new" class="btn btn--primary">New match</a>
      </div>
    </div>
    {#if myPlayerId && duelsImportError}
      <p class="alert matches-page__duels-alert" role="alert">{duelsImportError}</p>
    {/if}
    {#if myPlayerId && duelsBulkImportError}
      <p class="alert matches-page__duels-alert" role="alert">{duelsBulkImportError}</p>
    {/if}

    <div class="filters card">
      <div class="filters__row">
        <label class="filters__label" for="filter-player-btn">
          <span class="muted" style="font-size: 0.85rem;">Player</span>
          <button
            id="filter-player-btn"
            type="button"
            class="btn filters__select filters__select-btn"
            onclick={() => (playerPickerOpen = true)}
            aria-label="Filter by player"
          >
            {filterPlayerName || 'All players'}
          </button>
        </label>
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
        <label class="filters__label" for="filter-time">
          <span class="muted" style="font-size: 0.85rem;">Time</span>
          <select
            id="filter-time"
            class="input filters__select"
            bind:value={filterTime}
            aria-label="Filter by time range"
          >
            <option value="">All time</option>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
        </label>
      </div>
      <div class="filters__footer">
        <p class="filters__count muted">
          {total} total match{total === 1 ? '' : 'es'}
        </p>
        <button type="button" class="btn" onclick={clearFilters}>Clear filters</button>
      </div>
    </div>

    <PlayerPickerModal
      bind:open={playerPickerOpen}
      title="Filter by player"
      forLabel=""
      onSelect={handlePlayerSelect}
      onClose={() => (playerPickerOpen = false)}
    />

    {#if matches.length === 0}
      <div class="card stack">
        <p class="card__sub">No matches match your filters.</p>
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

  .matches-page__duels-menu {
    position: relative;
    display: inline-block;
  }

  .matches-page__duels-menu--busy .matches-page__duels-menu__summary {
    pointer-events: none;
    opacity: 0.75;
  }

  .matches-page__duels-menu__summary {
    list-style: none;
    cursor: pointer;
    user-select: none;
  }

  .matches-page__duels-menu__summary--icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 2.5rem;
    min-height: 2.5rem;
    padding: 0 var(--space-sm);
  }

  .matches-page__duels-menu__summary--icon :global(svg) {
    display: block;
    flex-shrink: 0;
  }

  .matches-page__duels-menu__summary::-webkit-details-marker {
    display: none;
  }

  .matches-page__duels-menu__panel {
    position: absolute;
    top: calc(100% + 4px);
    right: 0;
    z-index: 20;
    min-width: 12rem;
    padding: var(--space-xs);
    display: flex;
    flex-direction: column;
    gap: 2px;
    color: #e8eaef;
    background: #1c1d22;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: var(--radius-md, 8px);
    box-shadow:
      0 4px 6px rgba(0, 0, 0, 0.25),
      0 12px 28px rgba(0, 0, 0, 0.35);
  }

  .matches-page__duels-menu__item {
    display: block;
    width: 100%;
    margin: 0;
    padding: var(--space-sm) var(--space-md);
    text-align: left;
    font: inherit;
    color: inherit;
    background: transparent;
    border: none;
    border-radius: var(--radius-sm, 6px);
    cursor: pointer;
  }

  .matches-page__duels-menu__item:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.08);
  }

  .matches-page__duels-menu__item:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .matches-page__duels-alert {
    margin: 0 0 var(--space-sm) 0;
  }
</style>
