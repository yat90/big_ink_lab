<script lang="ts">
  import { onMount } from 'svelte';
  import { config } from '$lib/config';
  import { authMe } from '$lib/me';
  import { get } from 'svelte/store';
  import { ERR, messageFromFailedResponse } from '$lib/errors';
  import FilterCard from '$lib/components/match/FilterCard.svelte';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Pagination from '$lib/components/ui/Pagination.svelte';
  import { registerPageRefresh } from '$lib/pageRefreshRegistry';
  import AppButton from '$lib/components/ui/AppButton.svelte';
  import StatusStateCard from '$lib/components/ui/StatusStateCard.svelte';

  type GuestScope = 'roster' | 'guests' | 'all';

  let players = $state<Array<{ _id: string; name: string; realName?: string; team: string; isGuest?: boolean }>>([]);
  let teamNames = $state<string[]>([]);
  let loading = $state(true);
  let error = $state('');
  let isAdmin = $state(false);
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

  onMount(() => {
    registerPageRefresh(fetchPlayers);
    const me = get(authMe);
    if (me) isAdmin = me.user?.role === 'admin';
    return authMe.subscribe((val) => {
      if (val) isAdmin = val.user?.role === 'admin';
    });
  });
</script>

<div class="page players-page">
  {#if loading}
    <StatusStateCard kind="loading" message="Loading players..." />
  {:else if error}
    <StatusStateCard kind="error" message={error} />
  {:else if players.length === 0 && showRosterEmptyHint}
    <StatusStateCard
      kind="empty"
      title="No roster players"
      message="Roster view hides guests by default. Use Guests or All below to list guest profiles (for example from tournament results), or add a roster player."
    >
      {#snippet actions()}
        <div class="row margin-top-sm gap-sm">
          {#if isAdmin}
            <AppButton href="/players/merge">Merge players</AppButton>
          {/if}
          <div class="players-page__segment" role="group" aria-label="Which players to list">
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
          <AppButton href="/players/new" variant="primary">New player</AppButton>
        </div>
      {/snippet}
    </StatusStateCard>
  {:else}
    <PageHeader
      title="Players"
      resultSummary={filterSummary}
      chips={filterTeam.trim() ? [{ label: `Team: ${filterTeam.trim()}`, onRemove: clearTeamFilter }] : []}
    >
      {#snippet actions()}
        {#if isAdmin}
          <AppButton href="/players/merge">Merge players</AppButton>
        {/if}
        <AppButton href="/players/new" variant="primary">New player</AppButton>
      {/snippet}
    </PageHeader>

    <FilterCard
      bind:expanded={filtersExpanded}
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
      <StatusStateCard kind="empty" message="No players in this team.">
        {#snippet actions()}
          <AppButton onclick={clearTeamFilter}>Clear filter</AppButton>
        {/snippet}
      </StatusStateCard>
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
            {#if player.realName}
              <div class="playercard__meta muted">{player.realName}</div>
            {/if}
            {#if player.team}
              <div class="playercard__meta">{player.team}</div>
            {/if}
          </a>
        {/each}
      </div>

      <Pagination {currentPage} {totalPages} onPageChange={handlePageChange} />
    {/if}
  {/if}
</div>

<style>
  .players-page {
    max-width: 720px;
  }

  .playercard__guest {
    font-size: 0.8rem;
    font-weight: 500;
    margin-left: 0.35rem;
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
