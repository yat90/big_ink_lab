<script lang="ts">
  import { config } from '$lib/config';
  import Pagination from '$lib/Pagination.svelte';

  let players = $state<Array<{ _id: string; name: string; team: string }>>([]);
  let allPlayers = $state<Array<{ _id: string; name: string; team: string }>>([]);
  let loading = $state(true);
  let error = $state('');
  const DEFAULT_TEAM = 'The Big Ink Theory';
  let filterTeam = $state('');
  let currentPage = $state(1);
  let totalPages = $state(1);
  let total = $state(0);

  const apiUrl = config.apiUrl ?? '/api';

  const teamNames = $derived(
    [...new Set(allPlayers.map((p) => (p.team ?? '').trim()).filter((t) => t !== ''))].sort((a, b) =>
      a.localeCompare(b),
    ),
  );

  const filteredPlayers = $derived(
    filterTeam
      ? players.filter((p) => (p.team?.trim() ?? '') === filterTeam)
      : players,
  );

  async function fetchPlayers() {
    loading = true;
    error = '';
    try {
      const params = new URLSearchParams();
      params.set('page', String(currentPage));
      params.set('limit', '20');
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

  async function fetchAllPlayersForTeams() {
    try {
      const res = await fetch(`${apiUrl}/players?limit=1000`);
      if (res.ok) {
        const response = await res.json();
        allPlayers = response.data || [];
        const teams = [...new Set(allPlayers.map((p) => (p.team ?? '').trim()).filter((t) => t !== ''))];
        if (teams.includes(DEFAULT_TEAM)) {
          filterTeam = DEFAULT_TEAM;
        }
      }
    } catch {
      // non-blocking
    }
  }

  function handlePageChange(page: number) {
    currentPage = page;
  }

  $effect(() => {
    currentPage;
    fetchPlayers();
  });

  $effect(() => {
    fetchAllPlayersForTeams();
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
      </div>
      <p class="muted" style="margin-top: var(--space-md);">Loading players…</p>
    </div>
  {:else if error}
    <div class="card" role="alert" aria-live="assertive">
      <p class="alert">{error}</p>
    </div>
  {:else if players.length === 0}
    <div class="card stack">
      <h2 class="card__title">No players yet</h2>
      <p class="card__sub">Create your first player – name and team.</p>
      <a href="/players/new" class="btn btn--primary" style="align-self: flex-start; margin-top: var(--space-sm);">
        New player
      </a>
    </div>
  {:else}
    <div class="page-header">
      <h2 class="card__title" style="margin: 0;">Players</h2>
      <a href="/players/new" class="btn btn--primary">New player</a>
    </div>

    <div class="filters card">
      <div class="filters__row">
        <label class="filters__label" for="filter-team">
          <span class="muted" style="font-size: 0.85rem;">Team</span>
          <select id="filter-team" class="input filters__select" bind:value={filterTeam} aria-label="Filter by team">
            <option value="">All teams</option>
            {#each teamNames as team}
              <option value={team}>{team}</option>
            {/each}
          </select>
        </label>
      </div>
      <p class="filters__count muted">
        {filterTeam ? filteredPlayers.length : total} player{(filterTeam ? filteredPlayers.length : total) === 1 ? '' : 's'}
      </p>
    </div>

    {#if filteredPlayers.length === 0 && filterTeam}
      <div class="card stack">
        <p class="card__sub">No players in this team.</p>
        <button type="button" class="btn" onclick={() => (filterTeam = '')}>
          Clear filter
        </button>
      </div>
    {:else}
    <div class="stack">
      {#each filteredPlayers as player}
        <a href="/players/{player._id}" class="card playercard" style="text-decoration: none; color: inherit;">
          <div class="playercard__name">{player.name}</div>
          {#if player.team}
            <div class="playercard__meta">{player.team}</div>
          {/if}
        </a>
      {/each}
    </div>

    {#if !filterTeam}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
      />
    {/if}
    {/if}
  {/if}
</div>
