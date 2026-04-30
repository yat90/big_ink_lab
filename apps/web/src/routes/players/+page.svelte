<script lang="ts">
  import { config } from '$lib/config';
  import { authMe } from '$lib/me';
  import { get } from 'svelte/store';
  import { ERR, messageFromFailedResponse } from '$lib/errors';
  import FilterCard from '$lib/FilterCard.svelte';
  import Pagination from '$lib/Pagination.svelte';
  import IconRefresh from '$lib/icons/IconRefresh.svelte';

  type GuestScope = 'roster' | 'guests' | 'all';

  let players = $state<Array<{ _id: string; name: string; team: string; isGuest?: boolean }>>([]);
  let teamNames = $state<string[]>([]);
  let loading = $state(true);
  let error = $state('');
  const DEFAULT_TEAM = 'The Big Ink Theory';
  let filterTeam = $state('');
  let filterName = $state('');
  let currentPage = $state(1);
  let totalPages = $state(1);
  let total = $state(0);
  let guestScope = $state<GuestScope>('roster');
  let appliedDefaultTeamFilter = $state(false);

  /** Filter panel starts collapsed (shared FilterCard pattern). */
  let filtersExpanded = $state(false);

  const apiUrl = config.apiUrl ?? '/api';

  const filterBadges = $derived.by(() => {
    const badges: string[] = [];
    if (guestScope === 'all') badges.push('All');
    else if (guestScope === 'guests') badges.push('Guests');
    if (filterName.trim()) badges.push('Name');
    return badges;
  });

  const guestSummaryPhrase = $derived(
    guestScope === 'roster'
      ? 'guests hidden'
      : guestScope === 'guests'
        ? 'guests only'
        : 'including guests'
  );

  const filterSummary = $derived(
    `${total} player${total === 1 ? '' : 's'} (${guestSummaryPhrase})`
  );

  function appendGuestQueryParams(params: URLSearchParams): void {
    if (guestScope === 'all') {
      params.set('includeGuests', 'true');
    } else if (guestScope === 'guests') {
      params.set('guestsOnly', 'true');
    }
  }

  async function fetchPlayers() {
    loading = true;
    error = '';
    try {
      const params = new URLSearchParams();
      params.set('page', String(currentPage));
      params.set('limit', '15');
      const team = filterTeam.trim();
      if (team) {
        params.set('team', team);
      }
      const name = filterName.trim();
      if (name) {
        params.set('name', name);
      }
      appendGuestQueryParams(params);
      const url = `${apiUrl}/players?${params}`;
      const res = await fetch(url);
      if (!res.ok) {
        error = await messageFromFailedResponse(res, ERR.loadPlayers);
        return;
      }
      const response = await res.json();
      players = response.data || [];
      totalPages = response.meta?.totalPages || 1;
      total = response.meta?.total || 0;
    } catch {
      error = ERR.network;
    } finally {
      loading = false;
    }
  }

  async function loadTeamNames(): Promise<string[]> {
    try {
      const showGuestTeams = guestScope === 'all' || guestScope === 'guests';
      const qs = showGuestTeams ? '?includeGuests=true' : '';
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
    const me = get(authMe);
    const myTeam = (me?.player?.team ?? '').trim();
    if (myTeam && teams.includes(myTeam)) {
      filterTeam = myTeam;
      currentPage = 1;
      return;
    }
    if (teams.includes(DEFAULT_TEAM)) {
      filterTeam = DEFAULT_TEAM;
      currentPage = 1;
    }
  }

  function handlePageChange(page: number) {
    currentPage = page;
  }

  function clearTeamFilter() {
    filterTeam = '';
    currentPage = 1;
  }

  function clearPlayerFilters() {
    filterTeam = '';
    filterName = '';
    guestScope = 'roster';
    currentPage = 1;
  }

  const canClearPlayerFilters = $derived(
    !!(filterTeam.trim() || filterName.trim() || guestScope !== 'roster')
  );

  const showRosterEmptyHint = $derived(
    guestScope === 'roster' && !filterTeam.trim() && !filterName.trim()
  );

  $effect(() => {
    guestScope;
    void (async () => {
      const teams = await loadTeamNames();
      await applyDefaultTeamFilterOnce(teams);
    })();
  });

  $effect(() => {
    filterTeam;
    filterName;
    currentPage;
    guestScope;
    fetchPlayers();
  });
</script>

<div class="page players-page">
  {#if loading}
    <div class="players-page players-page--skeleton" aria-busy="true" aria-live="polite" aria-label="Loading players">
      <div class="page-header">
        <div class="players-page__header-main">
          <div class="page-header__title-row">
            <div class="loading-skeleton__line loading-skeleton__line--title"></div>
            <div class="loading-skeleton__line loading-skeleton__line--btn-sm"></div>
          </div>
        </div>
        <div class="loading-skeleton__line loading-skeleton__line--primary-btn players-page__skel-new"></div>
      </div>
      <div class="card stack margin-bottom-md">
        <div class="loading-skeleton__line loading-skeleton__line--section-title"></div>
        <div class="filters__row filters__row--wrap">
          <div class="loading-skeleton__field" aria-hidden="true"></div>
          <div class="loading-skeleton__field" aria-hidden="true"></div>
          <div class="loading-skeleton__field loading-skeleton__field--wide"></div>
        </div>
      </div>
      <div class="stack">
        {#each [0, 1, 2, 3] as i (i)}
          <div class="loading-skeleton__match-block" aria-hidden="true"></div>
        {/each}
      </div>
      <p class="muted margin-top-md">Loading players…</p>
    </div>
  {:else if error}
    <div class="card" role="alert" aria-live="assertive">
      <p class="alert">{error}</p>
    </div>
  {:else if players.length === 0 && showRosterEmptyHint}
    <div class="card stack">
      <h2 class="card__title">No roster players</h2>
      <p class="card__sub">
        Roster view hides guests by default. Use <strong>Guests</strong> or <strong>All</strong> below to
        list guest profiles (e.g. from tournament results), or add a roster player.
      </p>
      <div class="row margin-top-sm gap-sm">
        <div
          class="players-page__segment"
          role="group"
          aria-label="Which players to list"
        >
          <button
            type="button"
            class="players-page__segment-btn"
            class:players-page__segment-btn--active={guestScope === 'roster'}
            onclick={() => {
              guestScope = 'roster';
              currentPage = 1;
            }}
          >
            Roster
          </button>
          <button
            type="button"
            class="players-page__segment-btn"
            class:players-page__segment-btn--active={guestScope === 'guests'}
            onclick={() => {
              guestScope = 'guests';
              currentPage = 1;
            }}
          >
            Guests
          </button>
          <button
            type="button"
            class="players-page__segment-btn"
            class:players-page__segment-btn--active={guestScope === 'all'}
            onclick={() => {
              guestScope = 'all';
              currentPage = 1;
            }}
          >
            All
          </button>
        </div>
        <a href="/players/new" class="btn btn--primary">New player</a>
      </div>
    </div>
  {:else}
    <div class="page-header">
      <div class="players-page__header-main">
        <div class="page-header__title-row">
          <h2 class="card__title card-title-reset">Players</h2>
          <button
            type="button"
            class="btn btn--sm page-header__refresh"
            onclick={() => fetchPlayers()}
            aria-label="Refresh list"
          >
            <IconRefresh size={20} />
          </button>
        </div>
        {#if filterTeam.trim()}
          <div class="players-page__chip-row" aria-label="Active filters">
            <button
              type="button"
              class="players-page__filter-chip"
              onclick={clearTeamFilter}
              aria-label="Remove team filter: {filterTeam.trim()}"
            >
              <span>Team: {filterTeam.trim()}</span>
              <span class="players-page__filter-chip-dismiss" aria-hidden="true">✕</span>
            </button>
          </div>
        {/if}
      </div>
      <a href="/players/new" class="btn btn--primary">New player</a>
    </div>

    <FilterCard
      bind:expanded={filtersExpanded}
      summary={filterSummary}
      badges={filterBadges}
      panelId="players-filters-panel"
      onClear={clearPlayerFilters}
      canClear={canClearPlayerFilters}
    >
      <div class="filters__row filters__row--wrap">
        <label class="filters__label" for="filter-name">
          <span class="muted text-sm">Name</span>
          <input
            id="filter-name"
            type="search"
            class="input filters__select"
            placeholder="Search by name…"
            bind:value={filterName}
            oninput={() => (currentPage = 1)}
            aria-label="Search players by name"
            autocomplete="off"
          />
        </label>
        <label class="filters__label" for="filter-team">
          <span class="muted text-sm">Team</span>
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
        <div class="filters__label filters__label--segment">
          <span class="muted text-sm">Show</span>
          <div
            class="players-page__segment players-page__segment--in-filters"
            role="group"
            aria-label="Which players to list"
          >
            <button
              type="button"
              class="players-page__segment-btn"
              class:players-page__segment-btn--active={guestScope === 'roster'}
              onclick={() => {
                guestScope = 'roster';
                currentPage = 1;
              }}
            >
              Roster
            </button>
            <button
              type="button"
              class="players-page__segment-btn"
              class:players-page__segment-btn--active={guestScope === 'guests'}
              onclick={() => {
                guestScope = 'guests';
                currentPage = 1;
              }}
            >
              Guests
            </button>
            <button
              type="button"
              class="players-page__segment-btn"
              class:players-page__segment-btn--active={guestScope === 'all'}
              onclick={() => {
                guestScope = 'all';
                currentPage = 1;
              }}
            >
              All
            </button>
          </div>
        </div>
      </div>
    </FilterCard>

    {#if players.length === 0 && filterTeam.trim()}
      <div class="card stack">
        <p class="card__sub">No players in this team.</p>
        <button type="button" class="btn" onclick={clearTeamFilter}> Clear filter </button>
      </div>
    {:else}
      <div class="stack">
        {#each players as player}
          <a href="/players/{player._id}" class="card playercard link-inherit">
            <div class="playercard__name">
              {player.name}
              {#if player.isGuest}
                <span class="muted playercard__guest">(guest)</span>
              {/if}
            </div>
            {#if player.team}
              <div class="playercard__meta">{player.team}</div>
            {/if}
          </a>
        {/each}
      </div>

      <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />
    {/if}
  {/if}
</div>

<style>
  .players-page {
    max-width: 720px;
  }

  .players-page__skel-new {
    max-width: 10rem;
  }

  .playercard__guest {
    font-size: 0.8rem;
    font-weight: 500;
    margin-left: 0.35rem;
  }

  .players-page__header-main {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
  }

  .filters__row--wrap {
    flex-wrap: wrap;
    align-items: flex-end;
    gap: var(--space-md);
  }

  .filters__label--segment {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    min-width: min(100%, 16rem);
  }

  .players-page__chip-row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .players-page__filter-chip {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.35rem 0.65rem;
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--fg);
    background: var(--glass-bg-strong);
    border: 1px solid var(--border);
    border-radius: var(--radius-full);
    cursor: pointer;
    transition: background var(--transition), border-color var(--transition);
  }

  .players-page__filter-chip:hover {
    background: var(--glass-dark-active-bg);
    border-color: var(--border-strong);
  }

  .players-page__filter-chip-dismiss {
    font-size: 0.9rem;
    line-height: 1;
    opacity: 0.75;
  }

  .players-page__segment {
    display: inline-flex;
    border-radius: var(--radius-sm);
    border: 1px solid var(--border);
    overflow: hidden;
    background: var(--bg2);
  }

  .players-page__segment--in-filters {
    width: 100%;
    max-width: 24rem;
  }

  .players-page__segment-btn {
    flex: 1;
    min-width: 0;
    padding: 0.45rem 0.55rem;
    font-size: 0.8rem;
    font-weight: 600;
    font-family: inherit;
    color: var(--muted);
    background: transparent;
    border: none;
    cursor: pointer;
    transition:
      color var(--transition),
      background var(--transition);
  }

  .players-page__segment-btn + .players-page__segment-btn {
    border-left: 1px solid var(--border);
  }

  .players-page__segment-btn:hover {
    color: var(--fg);
    background: var(--glass-bg);
  }

  .players-page__segment-btn--active {
    color: var(--fg);
    background: var(--glass-bg-strong);
    box-shadow: inset 0 0 0 1px var(--border-strong);
  }
</style>
