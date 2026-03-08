<script lang="ts">
  import { config } from '$lib/config';
  import { STAGE_OPTIONS } from '$lib/matches';
  import MatchupStatistics from '$lib/MatchupStatistics.svelte';

  type GlobalStats = {
    totalMatches: number;
    matchesByStage: Record<string, number>;
    totalGames: number;
    gamesWonByStarter: number;
    gamesWonByNonStarter: number;
    starterWinRate: number;
    deckColorMatrix: Record<string, Record<string, { played: number; won: number }>>;
  };

  let stats = $state<GlobalStats | null>(null);
  let loading = $state(true);
  let error = $state('');
  type StageOption = (typeof STAGE_OPTIONS)[number];
  type MatrixMode = 'matches' | 'games';
  let selectedStages = $state<StageOption[]>([...STAGE_OPTIONS]);
  let selectedTournament = $state('');
  let selectedMatrixMode = $state<MatrixMode>('matches');
  let tournamentNames = $state<string[]>([]);

  const apiUrl = config.apiUrl ?? '/api';
  const tournamentStageSelected = $derived(selectedStages.includes('Tournament'));

  async function fetchTournamentNames() {
    try {
      const res = await fetch(`${apiUrl}/matches/tournaments`);
      if (res.ok) {
        const data = await res.json();
        tournamentNames = data.tournamentNames ?? [];
      }
    } catch {
      tournamentNames = [];
    }
  }

  async function fetchStats(stages: StageOption[], tournamentName?: string, matrixMode: MatrixMode = 'matches') {
    loading = true;
    error = '';
    try {
      const params = new URLSearchParams();
      if (stages.length > 0 && stages.length < STAGE_OPTIONS.length) {
        stages.forEach((s) => params.append('stage', s));
      }
      if (tournamentName?.trim()) params.set('tournamentName', tournamentName.trim());
      params.set('matrixMode', matrixMode);
      const url = `${apiUrl}/matches/stats${params.toString() ? `?${params}` : ''}`;
      const res = await fetch(url);
      if (!res.ok) {
        error = 'Failed to load statistics';
        return;
      }
      stats = await res.json();
    } catch {
      error = 'Could not reach API.';
    } finally {
      loading = false;
    }
  }

  function toggleStage(stage: StageOption) {
    if (selectedStages.includes(stage)) {
      selectedStages = selectedStages.filter((s) => s !== stage);
      if (stage === 'Tournament') selectedTournament = '';
    } else {
      selectedStages = [...selectedStages, stage].sort(
        (a, b) => STAGE_OPTIONS.indexOf(a) - STAGE_OPTIONS.indexOf(b),
      );
    }
  }

  $effect(() => {
    if (tournamentStageSelected) fetchTournamentNames();
  });

  $effect(() => {
    fetchStats(selectedStages, selectedTournament || undefined, selectedMatrixMode);
  });
</script>

<svelte:head>
  <title>Statistics · Big Ink Lab</title>
</svelte:head>

<div class="page">
  {#if loading}
    <div class="card">
      <div class="loading-skeleton" aria-busy="true" aria-live="polite">
        <div class="loading-skeleton__line loading-skeleton__line--title"></div>
        <div class="loading-skeleton__line loading-skeleton__line--short"></div>
        <div class="loading-skeleton__line"></div>
      </div>
      <p class="muted" style="margin-top: var(--space-md);">Loading statistics…</p>
    </div>
  {:else if error}
    <div class="card" role="alert">
      <p class="alert">{error}</p>
      <a href="/" class="btn">Back to home</a>
    </div>
  {:else if stats}
    <div class="row" style="justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: var(--space-md);">
      <h2 class="card__title" style="margin: 0;">Statistics</h2>
      <a href="/" class="btn">Back to home</a>
    </div>

    <div class="card match-stats__card match-stats__filter">
      <h3 class="match-stats__title">Filter by stage</h3>
      <div class="match-stats__stage-chips" role="group" aria-label="Stage filter">
        {#each STAGE_OPTIONS as stage}
          <label class="match-stats__stage-chip" class:match-stats__stage-chip--active={selectedStages.includes(stage)}>
            <input
              type="checkbox"
              checked={selectedStages.includes(stage)}
              onchange={() => toggleStage(stage)}
              class="match-stats__stage-checkbox"
              aria-label="{stage}"
            />
            <span class="match-stats__stage-label">{stage}</span>
          </label>
        {/each}
      </div>
      {#if tournamentStageSelected}
        <div class="match-stats__tournament-filter">
          <label for="filter-tournament" class="match-stats__tournament-label">Tournament</label>
          <select
            id="filter-tournament"
            class="input match-stats__tournament-select"
            bind:value={selectedTournament}
            aria-label="Filter by tournament"
          >
            <option value="">All tournaments</option>
            {#each tournamentNames as name (name)}
              <option value={name}>{name}</option>
            {/each}
          </select>
        </div>
      {/if}
      {#if selectedStages.length < STAGE_OPTIONS.length}
        <p class="muted" style="margin: var(--space-sm) 0 0; font-size: 0.85rem;">
          Showing stats for: {selectedStages.length === 0 ? 'all stages' : selectedStages.join(', ')}
          {#if selectedTournament}
            · {selectedTournament}
          {/if}
        </p>
      {/if}
    </div>

    <div class="match-stats">
      <div class="card match-stats__card">
        <h3 class="match-stats__title">Match overview</h3>
        <div class="match-stats__grid">
          <div class="match-stats__item">
            <span class="match-stats__value">{stats.totalMatches}</span>
            <span class="match-stats__label muted">Total matches</span>
          </div>
          <div class="match-stats__item">
            <span class="match-stats__value">{stats.totalGames}</span>
            <span class="match-stats__label muted">Total games</span>
          </div>
        </div>
      </div>

      <div class="card match-stats__card">
        <h3 class="match-stats__title">Matches by stage</h3>
        <div class="match-stats__grid">
          {#each Object.entries(stats.matchesByStage) as [stage, count]}
            <div class="match-stats__item">
              <span class="match-stats__value">{count}</span>
              <span class="match-stats__label muted">{stage}</span>
            </div>
          {/each}
        </div>
      </div>

      <div class="card match-stats__card">
        <h3 class="match-stats__title">By starting player</h3>
        <div class="match-stats__grid">
          <div class="match-stats__item">
            <span class="match-stats__value">{stats.gamesWonByStarter}</span>
            <span class="match-stats__label muted">Games won by starter</span>
          </div>
          <div class="match-stats__item">
            <span class="match-stats__value">{stats.gamesWonByNonStarter}</span>
            <span class="match-stats__label muted">Games won by non-starter</span>
          </div>
          <div class="match-stats__item">
            <span class="match-stats__value">{stats.starterWinRate}%</span>
            <span class="match-stats__label muted">Starter win rate</span>
          </div>
        </div>
      </div>

      <div class="card match-stats__card match-stats__card--wide">
        <MatchupStatistics
          matrix={stats.deckColorMatrix}
          bind:analysisMode={selectedMatrixMode}
          title="Deck color matchups"
          emptyText="No matchup data available for the selected filters."
        />
      </div>
    </div>
  {/if}
</div>

<style>
  .match-stats {
    display: flex;
    flex-direction: column;
    gap: var(--space-lg);
  }

  .match-stats__card {
    padding: var(--space-lg);
  }

  .match-stats__filter {
    margin-bottom: 0;
  }

  .match-stats__tournament-filter {
    display: flex;
    align-items: center;
    gap: var(--space-md);
    margin-top: var(--space-md);
  }

  .match-stats__tournament-label {
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--muted);
  }

  .match-stats__tournament-select {
    min-width: 14rem;
  }

  .match-stats__stage-chips {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-sm);
  }

  .match-stats__stage-chip {
    display: inline-flex;
    align-items: center;
    gap: var(--space-xs);
    padding: 8px 14px;
    border-radius: var(--radius-full);
    border: 1px solid var(--border);
    background: var(--glass-bg);
    cursor: pointer;
    font-size: 0.9rem;
    font-weight: 600;
    transition: background var(--transition), border-color var(--transition), color var(--transition);
  }

  .match-stats__stage-chip:hover {
    background: var(--glass-bg-strong);
  }

  .match-stats__stage-chip--active {
    background: var(--ink);
    border-color: var(--ink);
    color: white;
  }

  .match-stats__stage-chip--active:hover {
    background: var(--ink-hover);
    border-color: var(--ink-hover);
    color: white;
  }

  .match-stats__stage-checkbox {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  .match-stats__stage-label {
    user-select: none;
  }

  .match-stats__card--wide {
    overflow: hidden;
  }

  .match-stats__title {
    font-size: 1rem;
    font-weight: 700;
    letter-spacing: -0.02em;
    margin: 0 0 var(--space-md);
  }

  .match-stats__grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: var(--space-lg);
  }

  .match-stats__item {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }

  .match-stats__value {
    font-size: 1.5rem;
    font-weight: 800;
    letter-spacing: -0.02em;
  }

  .match-stats__label {
    font-size: 0.85rem;
    font-weight: 500;
  }

</style>
