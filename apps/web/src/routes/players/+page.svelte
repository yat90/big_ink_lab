<script lang="ts">
  import { config } from '$lib/config';
  import { getAuthToken } from '$lib/auth';
  import IconFilter from '$lib/icons/IconFilter.svelte';
  import Pagination from '$lib/Pagination.svelte';

  let players = $state<Array<{ _id: string; name: string; team: string; isGuest?: boolean }>>([]);
  let teamNames = $state<string[]>([]);
  let loading = $state(true);
  let error = $state('');
  const DEFAULT_TEAM = 'The Big Ink Theory';
  let filterTeam = $state('');
  let currentPage = $state(1);
  let totalPages = $state(1);
  let total = $state(0);
  /** When false, API excludes guest players (default). */
  let includeGuests = $state(false);
  let appliedDefaultTeamFilter = $state(false);

  /** Filter panel starts collapsed (same pattern as tournaments list). */
  let filtersExpanded = $state(false);

  const apiUrl = config.apiUrl ?? '/api';

  const hasGuestFilterOn = $derived(includeGuests);

  async function fetchPlayers() {
    loading = true;
    error = '';
    try {
      const params = new URLSearchParams();
      params.set('page', String(currentPage));
      params.set('limit', '20');
      const team = filterTeam.trim();
      if (team) {
        params.set('team', team);
      }
      if (includeGuests) {
        params.set('includeGuests', 'true');
      }
      const url = `${apiUrl}/players?${params}`;
      const res = await fetch(url);
      if (!res.ok) {
        error = 'Failed to load players';
        return;
      }
      const response = await res.json();
      players = response.data || [];
      totalPages = response.meta?.totalPages || 1;
      total = response.meta?.total || 0;
    } catch {
      error = 'Could not reach API.';
    } finally {
      loading = false;
    }
  }

  async function loadTeamNames(): Promise<string[]> {
    try {
      const qs = includeGuests ? '?includeGuests=true' : '';
      const res = await fetch(`${apiUrl}/players/teams${qs}`);
      if (!res.ok) return [];
      const response = await res.json();
      const teams: string[] = Array.isArray(response?.teams) ? response.teams : [];
      teamNames = teams;
      return teams;
    } catch {
      return [];
    }
  }

  async function applyDefaultTeamFilterOnce(teams: string[]) {
    if (appliedDefaultTeamFilter) return;
    if (filterTeam.trim()) {
      appliedDefaultTeamFilter = true;
      return;
    }
    appliedDefaultTeamFilter = true;
    const token = getAuthToken();
    if (token) {
      try {
        const meRes = await fetch(`${apiUrl}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (meRes.ok) {
          const me = await meRes.json();
          const myTeam = (me?.player?.team ?? '').trim();
          if (myTeam && teams.includes(myTeam)) {
            filterTeam = myTeam;
            currentPage = 1;
            return;
          }
        }
      } catch {
        /* ignore */
      }
    }
    if (teams.includes(DEFAULT_TEAM)) {
      filterTeam = DEFAULT_TEAM;
      currentPage = 1;
    }
  }

  function handlePageChange(page: number) {
    currentPage = page;
  }

  $effect(() => {
    includeGuests;
    void (async () => {
      const teams = await loadTeamNames();
      await applyDefaultTeamFilterOnce(teams);
    })();
  });

  $effect(() => {
    filterTeam;
    currentPage;
    includeGuests;
    fetchPlayers();
  });
</script>

<div class="page players-page">
  {#if loading}
    <div class="card">
      <div class="loading-skeleton" aria-busy="true" aria-live="polite">
        <div class="loading-skeleton__line loading-skeleton__line--title"></div>
        <div class="loading-skeleton__line loading-skeleton__line--short"></div>
        <div class="loading-skeleton__line"></div>
        <div class="loading-skeleton__line"></div>
      </div>
      <p class="muted" style="margin-top: var(--space-md);">Loading players…</p>
    </div>
  {:else if error}
    <div class="card" role="alert" aria-live="assertive">
      <p class="alert">{error}</p>
    </div>
  {:else if players.length === 0 && !filterTeam.trim() && !includeGuests}
    <div class="card stack">
      <h2 class="card__title">No roster players</h2>
      <p class="card__sub">
        Guests are hidden by default. Turn on <strong>Show guests</strong> below to list guest profiles
        (e.g. from tournament results), or add a roster player.
      </p>
      <div class="row" style="margin-top: var(--space-sm); flex-wrap: wrap; gap: 0.5rem;">
        <label class="filters__label" style="display: inline-flex; align-items: center; gap: 0.35rem;">
          <input type="checkbox" bind:checked={includeGuests} />
          <span>Show guests</span>
        </label>
        <a href="/players/new" class="btn btn--primary">New player</a>
      </div>
    </div>
  {:else}
    <div class="page-header">
      <h2 class="card__title" style="margin: 0;">Players</h2>
      <a href="/players/new" class="btn btn--primary">New player</a>
    </div>

    <div class="players-page__filters-wrap">
      <div class="card stack players-page__filters">
        <button
          type="button"
          class="players-page__filters-toggle"
          aria-expanded={filtersExpanded}
          aria-controls="players-filters-panel"
          onclick={() => (filtersExpanded = !filtersExpanded)}
        >
          <span class="players-page__filters-toggle-main">
            <span class="players-page__filters-toggle-icon" aria-hidden="true">
              <IconFilter size={20} />
            </span>
            <span class="players-page__filters-toggle-label">Filters</span>
            {#if hasGuestFilterOn}
              <span class="players-page__filters-toggle-badge" aria-hidden="true">Guests</span>
            {/if}
          </span>
          <span class="players-page__filters-chevron" aria-hidden="true"
            >{filtersExpanded ? '▼' : '▶'}</span
          >
        </button>
        {#if filtersExpanded}
          <div id="players-filters-panel" class="players-page__filters-panel">
            <div class="filters__row">
              <label class="filters__label" for="filter-team">
                <span class="muted" style="font-size: 0.85rem;">Team</span>
                <select
                  id="filter-team"
                  class="input filters__select"
                  bind:value={filterTeam}
                  onchange={() => (currentPage = 1)}
                  aria-label="Filter by team"
                >
                  <option value="">All teams</option>
                  {#each teamNames as team}
                    <option value={team}>{team}</option>
                  {/each}
                </select>
              </label>
              <label
                class="filters__label filters__label--checkbox"
                for="filter-include-guests"
                style="display: flex; align-items: center; gap: 0.35rem;"
              >
                <input
                  id="filter-include-guests"
                  type="checkbox"
                  bind:checked={includeGuests}
                  onchange={() => (currentPage = 1)}
                />
                <span class="muted" style="font-size: 0.85rem;">Show guests</span>
              </label>
            </div>
            <p class="filters__count muted" style="margin: 0;">
              {total} player{total === 1 ? '' : 's'}{includeGuests ? '' : ' (guests hidden)'}
            </p>
          </div>
        {/if}
      </div>
      {#if !filtersExpanded}
        <p class="muted players-page__filters-summary">
          {total} player{total === 1 ? '' : 's'}{includeGuests ? '' : ' (guests hidden)'}
        </p>
      {/if}
    </div>

    {#if players.length === 0 && filterTeam.trim()}
      <div class="card stack">
        <p class="card__sub">No players in this team.</p>
        <button
          type="button"
          class="btn"
          onclick={() => {
            filterTeam = '';
            currentPage = 1;
          }}
        >
          Clear filter
        </button>
      </div>
    {:else}
    <div class="stack">
      {#each players as player}
        <a href="/players/{player._id}" class="card playercard" style="text-decoration: none; color: inherit;">
          <div class="playercard__name">
            {player.name}
            {#if player.isGuest}
              <span class="muted" style="font-size: 0.8rem; font-weight: 500; margin-left: 0.35rem;"
                >(guest)</span
              >
            {/if}
          </div>
          {#if player.team}
            <div class="playercard__meta">{player.team}</div>
          {/if}
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

<style>
  .players-page {
    max-width: 720px;
  }
  .players-page__filters-wrap {
    margin-top: var(--space-md, 1rem);
    margin-bottom: var(--space-md, 1rem);
  }
  .players-page__filters {
    gap: 0;
  }
  .players-page__filters-toggle {
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
  .players-page__filters-toggle:hover {
    background: var(--glass-bg-strong, rgba(255, 255, 255, 0.06));
  }
  .players-page__filters-toggle-main {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    min-width: 0;
  }
  .players-page__filters-toggle-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    color: var(--muted);
  }
  .players-page__filters-toggle:hover .players-page__filters-toggle-icon {
    color: var(--fg);
  }
  .players-page__filters-toggle-label {
    flex-shrink: 0;
  }
  .players-page__filters-toggle-badge {
    font-size: 0.75rem;
    font-weight: 600;
    padding: 0.15rem 0.45rem;
    border-radius: 999px;
    background: color-mix(in srgb, var(--color-accent, #3b82f6) 18%, transparent);
    color: var(--fg);
  }
  .players-page__filters-chevron {
    flex-shrink: 0;
    font-size: 0.75rem;
    color: var(--muted);
    width: 1.25rem;
    text-align: center;
  }
  .players-page__filters-panel {
    display: flex;
    flex-direction: column;
    gap: 0.65rem;
    padding-top: 0.35rem;
    border-top: 1px solid color-mix(in srgb, var(--color-fg, #111) 10%, transparent);
    margin-top: 0.35rem;
  }
  .players-page__filters-summary {
    margin: 0.35rem 0 0;
    padding: 0 0.35rem;
    font-size: 0.875rem;
    line-height: 1.4;
  }
</style>
