<script lang="ts">
  import { config } from '$lib/config';
  import IconFilter from '$lib/icons/IconFilter.svelte';
  import Pagination from '$lib/Pagination.svelte';

  type TournamentRow = {
    _id: string;
    name: string;
    date: string;
    location?: string;
    url?: string;
    meta?: string;
    matchCount: number;
    latestPlayedAt: string | null;
  };

  let rows = $state<TournamentRow[]>([]);
  let loading = $state(true);
  let error = $state('');
  let currentPage = $state(1);
  let totalPages = $state(1);
  let total = $state(0);

  let filterName = $state('');
  let filterMeta = $state('');
  let filterLocation = $state('');
  let filterFromDate = $state('');
  let filterToDate = $state('');

  let appliedName = $state('');
  let appliedMeta = $state('');
  let appliedLocation = $state('');
  let appliedFromDate = $state('');
  let appliedToDate = $state('');

  /** Filter panel starts collapsed. */
  let filtersExpanded = $state(false);

  const apiUrl = config.apiUrl ?? '/api';
  const PAGE_SIZE = 20;

  const hasActiveFilters = $derived(
    !!(appliedName || appliedMeta || appliedLocation || appliedFromDate || appliedToDate)
  );

  const canClearFilters = $derived(
    hasActiveFilters ||
      !!(
        filterName.trim() ||
        filterMeta.trim() ||
        filterLocation.trim() ||
        filterFromDate.trim() ||
        filterToDate.trim()
      )
  );

  function formatDate(iso: string | null | undefined): string {
    if (!iso) return '–';
    try {
      return new Date(iso).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
    } catch {
      return String(iso);
    }
  }

  async function fetchTournaments() {
    loading = true;
    error = '';
    try {
      const params = new URLSearchParams();
      params.set('page', String(currentPage));
      params.set('limit', String(PAGE_SIZE));
      if (appliedName) params.set('name', appliedName);
      if (appliedMeta) params.set('meta', appliedMeta);
      if (appliedLocation) params.set('location', appliedLocation);
      if (appliedFromDate) params.set('fromDate', appliedFromDate);
      if (appliedToDate) params.set('toDate', appliedToDate);
      const res = await fetch(`${apiUrl}/tournaments?${params}`);
      if (!res.ok) {
        error = 'Failed to load tournaments';
        return;
      }
      const json = await res.json();
      rows = json.data ?? [];
      totalPages = json.meta?.totalPages ?? 1;
      total = json.meta?.total ?? 0;
    } catch {
      error = 'Could not reach API.';
    } finally {
      loading = false;
    }
  }

  function handlePageChange(page: number) {
    currentPage = page;
  }

  function applyFilters(): void {
    appliedName = filterName.trim();
    appliedMeta = filterMeta.trim();
    appliedLocation = filterLocation.trim();
    appliedFromDate = filterFromDate.trim();
    appliedToDate = filterToDate.trim();
    currentPage = 1;
  }

  function clearFilters(): void {
    filterName = '';
    filterMeta = '';
    filterLocation = '';
    filterFromDate = '';
    filterToDate = '';
    appliedName = '';
    appliedMeta = '';
    appliedLocation = '';
    appliedFromDate = '';
    appliedToDate = '';
    currentPage = 1;
  }

  $effect(() => {
    currentPage;
    appliedName;
    appliedMeta;
    appliedLocation;
    appliedFromDate;
    appliedToDate;
    void fetchTournaments();
  });
</script>

<svelte:head>
  <title>Tournaments · Big Ink Lab</title>
</svelte:head>

<div class="page tournaments-page">
  <div
    class="row"
    style="justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;"
  >
    <h1 class="page-title">Tournaments</h1>
    <a href="/tournaments/new" class="btn btn--primary">New tournament</a>
  </div>
  <div class="card stack tournaments-page__filters">
    <button
      type="button"
      class="tournaments-page__filters-toggle"
      aria-expanded={filtersExpanded}
      aria-controls="tournaments-filters-panel"
      onclick={() => (filtersExpanded = !filtersExpanded)}
    >
      <span class="tournaments-page__filters-toggle-main">
        <span class="tournaments-page__filters-toggle-icon" aria-hidden="true">
          <IconFilter size={20} />
        </span>
        <span class="tournaments-page__filters-toggle-label">Filters</span>
        {#if hasActiveFilters}
          <span class="tournaments-page__filters-toggle-badge" aria-hidden="true">On</span>
        {/if}
      </span>
      <span class="tournaments-page__filters-chevron" aria-hidden="true"
        >{filtersExpanded ? '▼' : '▶'}</span
      >
    </button>
    {#if filtersExpanded}
      <div id="tournaments-filters-panel" class="tournaments-page__filters-panel">
        <div class="tournaments-page__filters-grid">
          <div class="tournaments-page__field">
            <label class="label" for="tf-name">Name</label>
            <input
              id="tf-name"
              class="input"
              type="search"
              bind:value={filterName}
              placeholder="Contains…"
            />
          </div>
          <div class="tournaments-page__field">
            <label class="label" for="tf-meta">Meta</label>
            <input
              id="tf-meta"
              class="input"
              type="search"
              bind:value={filterMeta}
              placeholder="e.g. Set 11"
            />
          </div>
          <div class="tournaments-page__field">
            <label class="label" for="tf-location">Location</label>
            <input
              id="tf-location"
              class="input"
              type="search"
              bind:value={filterLocation}
              placeholder="Contains…"
            />
          </div>
          <div class="tournaments-page__field">
            <label class="label" for="tf-from">From date</label>
            <input id="tf-from" class="input" type="date" bind:value={filterFromDate} />
          </div>
          <div class="tournaments-page__field">
            <label class="label" for="tf-to">To date</label>
            <input id="tf-to" class="input" type="date" bind:value={filterToDate} />
          </div>
        </div>
        <p class="muted tournaments-page__filters-hint">
          Dates use UTC day boundaries. Filters apply when you click Apply.
        </p>
        <div class="row tournaments-page__filters-actions">
          <button type="button" class="btn btn--primary" onclick={applyFilters}
            >Apply filters</button
          >
          <button type="button" class="btn" onclick={clearFilters} disabled={!canClearFilters}
            >Clear</button
          >
        </div>
      </div>
    {:else if hasActiveFilters}
      <p class="muted tournaments-page__filters-collapsed-note">
        Filters are applied. Open to change or clear.
      </p>
    {/if}
  </div>

  <section class="tournaments-page__list" aria-labelledby="tournaments-list-heading">
    <h2 id="tournaments-list-heading" class="tournaments-page__list-title">All tournaments</h2>
    {#if hasActiveFilters}
      <p class="muted tournaments-page__filter-active">
        Filters active · {total} result{total === 1 ? '' : 's'}
      </p>
    {/if}
    {#if loading}
      <div class="card">
        <div class="loading-skeleton" aria-busy="true" aria-live="polite">
          <div class="loading-skeleton__line loading-skeleton__line--title"></div>
          <div class="loading-skeleton__line"></div>
          <div class="loading-skeleton__line"></div>
        </div>
        <p class="muted" style="margin-top: var(--space-md);">Loading tournaments…</p>
      </div>
    {:else if error}
      <div class="card" role="alert">
        <p class="alert">{error}</p>
      </div>
    {:else if rows.length === 0}
      <div class="card stack">
        <p class="card__sub" style="margin: 0;">
          {#if hasActiveFilters}
            No tournaments match these filters. Try different values or <button
              type="button"
              class="tournaments-page__linklike"
              onclick={clearFilters}>clear filters</button
            >.
          {:else}
            No tournaments yet. Create one from <strong>Tournament results</strong>, then save
            rounds to link matches.
          {/if}
        </p>
      </div>
    {:else}
      {#if !hasActiveFilters}
        <p class="muted tournaments-page__count">{total} tournament{total === 1 ? '' : 's'}</p>
      {/if}
      <ul class="tournaments-page__ul">
        {#each rows as row (row._id)}
          <li>
            <a href="/tournaments/{row._id}" class="card tournaments-page__row">
              <div class="tournaments-page__row-main">
                <span class="tournaments-page__name">{row.name}</span>
                <span class="muted tournaments-page__meta">
                  {formatDate(row.date)}{#if row.meta?.trim()}
                    · {row.meta.trim()}{/if}{#if row.location?.trim()}
                    · {row.location.trim()}{/if}
                  · {row.matchCount} match{row.matchCount === 1 ? '' : 'es'}{#if row.latestPlayedAt}
                    · Last match {formatDate(row.latestPlayedAt)}{/if}
                </span>
              </div>
              <span class="tournaments-page__chevron" aria-hidden="true">→</span>
            </a>
          </li>
        {/each}
      </ul>
      <Pagination {currentPage} {totalPages} onPageChange={handlePageChange} />
    {/if}
  </section>
</div>

<style>
  .tournaments-page {
    max-width: 720px;
  }
  .page-title {
    margin: 0 0 var(--space-md, 1rem) 0;
    font-size: 1.5rem;
    font-weight: 700;
  }
  .tournaments-page__filters {
    margin-top: var(--space-md, 1rem);
    gap: 0;
  }
  .tournaments-page__filters-toggle {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    gap: 0.75rem;
    padding: 0.65rem 0.35rem;
    margin: 0;
    border: none;
    border-radius: var(--radius-sm, 6px);
    background: transparent;
    color: inherit;
    font: inherit;
    font-weight: 600;
    font-size: 1rem;
    cursor: pointer;
    text-align: left;
    transition: background 0.15s ease;
  }
  .tournaments-page__filters-toggle:hover {
    background: var(--glass-bg-strong, rgba(255, 255, 255, 0.06));
  }
  .tournaments-page__filters-toggle-main {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    min-width: 0;
  }
  .tournaments-page__filters-toggle-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    color: var(--muted);
  }
  .tournaments-page__filters-toggle:hover .tournaments-page__filters-toggle-icon {
    color: var(--fg);
  }
  .tournaments-page__filters-toggle-label {
    flex-shrink: 0;
  }
  .tournaments-page__filters-toggle-badge {
    font-size: 0.75rem;
    font-weight: 600;
    padding: 0.15rem 0.45rem;
    border-radius: 999px;
    background: color-mix(in srgb, var(--color-accent, #3b82f6) 18%, transparent);
    color: var(--fg);
  }
  .tournaments-page__filters-chevron {
    flex-shrink: 0;
    font-size: 0.75rem;
    color: var(--muted);
    width: 1.25rem;
    text-align: center;
  }
  .tournaments-page__filters-panel {
    display: flex;
    flex-direction: column;
    gap: 0.65rem;
    padding-top: 0.35rem;
    border-top: 1px solid color-mix(in srgb, var(--color-fg, #111) 10%, transparent);
    margin-top: 0.35rem;
  }
  .tournaments-page__filters-collapsed-note {
    margin: 0;
    padding: 0 0.35rem 0.35rem;
    font-size: 0.8125rem;
    line-height: 1.4;
  }
  .tournaments-page__filters-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.75rem 1rem;
  }
  .tournaments-page__field {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    min-width: 0;
  }
  @media (max-width: 520px) {
    .tournaments-page__filters-grid {
      grid-template-columns: 1fr;
    }
  }
  .tournaments-page__filters-hint {
    margin: 0;
    font-size: 0.8125rem;
    line-height: 1.4;
  }
  .tournaments-page__filters-actions {
    margin-top: var(--space-sm, 0.5rem);
    gap: 0.75rem;
    flex-wrap: wrap;
  }
  .tournaments-page__filter-active {
    margin: 0 0 var(--space-sm, 0.5rem) 0;
    font-size: 0.875rem;
  }
  .tournaments-page__linklike {
    margin: 0;
    padding: 0;
    border: none;
    background: none;
    color: inherit;
    font: inherit;
    font-weight: 600;
    text-decoration: underline;
    text-underline-offset: 2px;
    cursor: pointer;
  }
  .tournaments-page__linklike:hover {
    color: var(--fg);
  }
  .tournaments-page__actions {
    margin-top: var(--space-md, 1rem);
    gap: 0.75rem;
    flex-wrap: wrap;
  }
  .tournaments-page__list {
    margin-top: var(--space-lg, 1.5rem);
  }
  .tournaments-page__list-title {
    margin: 0 0 var(--space-md, 1rem) 0;
    font-size: 1.25rem;
    font-weight: 600;
  }
  .tournaments-page__count {
    margin: 0 0 var(--space-sm, 0.5rem) 0;
    font-size: 0.875rem;
  }
  .tournaments-page__ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-sm, 0.5rem);
  }
  .tournaments-page__row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-md, 1rem);
    text-decoration: none;
    color: inherit;
    transition: background 0.15s var(--ease, ease);
  }
  .tournaments-page__row:hover {
    background: var(--glass-bg-strong, rgba(255, 255, 255, 0.06));
  }
  .tournaments-page__row-main {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    min-width: 0;
  }
  .tournaments-page__name {
    font-weight: 600;
    word-break: break-word;
  }
  .tournaments-page__meta {
    font-size: 0.875rem;
  }
  .tournaments-page__chevron {
    flex-shrink: 0;
    color: var(--muted);
    font-size: 1.125rem;
  }
</style>
