<script lang="ts">
  import { config } from '$lib/config';
  import { getAuthToken } from '$lib/auth';
  import Pagination from '$lib/Pagination.svelte';

  let players = $state<Array<{ _id: string; name: string; team: string }>>([]);
  let teamNames = $state<string[]>([]);
  let loading = $state(true);
  let error = $state('');
  const DEFAULT_TEAM = 'The Big Ink Theory';
  let filterTeam = $state('');
  let currentPage = $state(1);
  let totalPages = $state(1);
  let total = $state(0);

  const apiUrl = config.apiUrl ?? '/api';

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

  async function fetchTeamNamesAndDefaultFilter() {
    try {
      const res = await fetch(`${apiUrl}/players/teams`);
      if (!res.ok) return;
      const response = await res.json();
      const teams: string[] = Array.isArray(response?.teams) ? response.teams : [];
      teamNames = teams;
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
    } catch {
      // non-blocking
    }
  }

  function handlePageChange(page: number) {
    currentPage = page;
  }

  $effect(() => {
    filterTeam;
    currentPage;
    fetchPlayers();
  });

  $effect(() => {
    fetchTeamNamesAndDefaultFilter();
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
  {:else if players.length === 0 && !filterTeam.trim()}
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
      </div>
      <p class="filters__count muted">
        {total} player{total === 1 ? '' : 's'}
      </p>
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
          <div class="playercard__name">{player.name}</div>
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
