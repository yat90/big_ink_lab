<script lang="ts">
  import { config } from '$lib/config';
  import { DECK_COLOR_OPTIONS, STAGE_OPTIONS, deckColorToInk } from '$lib/matches';

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
  let selectedStages = $state<StageOption[]>([...STAGE_OPTIONS]);

  const apiUrl = config.apiUrl ?? '/api';

  async function fetchStats(stages: StageOption[]) {
    loading = true;
    error = '';
    try {
      const params = new URLSearchParams();
      if (stages.length > 0 && stages.length < STAGE_OPTIONS.length) {
        stages.forEach((s) => params.append('stage', s));
      }
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
    } else {
      selectedStages = [...selectedStages, stage].sort(
        (a, b) => STAGE_OPTIONS.indexOf(a) - STAGE_OPTIONS.indexOf(b),
      );
    }
  }

  $effect(() => {
    fetchStats(selectedStages);
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
      {#if selectedStages.length < STAGE_OPTIONS.length}
        <p class="muted" style="margin: var(--space-sm) 0 0; font-size: 0.85rem;">
          Showing stats for: {selectedStages.length === 0 ? 'all stages' : selectedStages.join(', ')}
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

      {#if stats.deckColorMatrix && Object.keys(stats.deckColorMatrix).length > 0}
        <div class="card match-stats__card match-stats__card--wide">
          <h3 class="match-stats__title">Deck color matchups</h3>
          <p class="match-stats__sub muted" style="margin: 0 0 var(--space-md); font-size: 0.9rem;">
            Rows: deck color. Columns: opponent deck color. Cell: win rate when that matchup was played.
          </p>
          <div class="match-stats__matrix-wrap">
            <table class="match-stats__matrix" aria-label="Win rate by deck color vs opponent deck color">
              <thead>
                <tr>
                  <th scope="col" class="match-stats__matrix-corner"></th>
                  {#each DECK_COLOR_OPTIONS as oppDeck}
                    <th scope="col" class="match-stats__matrix-header" title={oppDeck}>{deckColorToInk(oppDeck)}</th>
                  {/each}
                </tr>
              </thead>
              <tbody>
                {#each DECK_COLOR_OPTIONS as myDeck}
                  <tr>
                    <th scope="row" class="match-stats__matrix-row-header" title={myDeck}>{deckColorToInk(myDeck)}</th>
                    {#each DECK_COLOR_OPTIONS as oppDeck}
                      {@const cell = stats.deckColorMatrix[myDeck]?.[oppDeck]}
                      {@const winPct = cell ? Math.round((cell.won / cell.played) * 100) : null}
                      <td
                        class="match-stats__matrix-cell"
                        class:match-stats__matrix-cell--win={winPct != null && winPct > 50}
                        class:match-stats__matrix-cell--loss={winPct != null && winPct < 50}
                      >
                        {#if cell}
                          <span
                            class="match-stats__matrix-cell-inner"
                            title="{myDeck} vs {oppDeck}: {cell.won} wins, {cell.played - cell.won} losses"
                          >
                            {winPct}%
                          </span>
                        {:else}
                          <span class="muted" aria-hidden="true">–</span>
                        {/if}
                      </td>
                    {/each}
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        </div>
      {/if}
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

  .match-stats__matrix-wrap {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  .match-stats__matrix {
    width: 100%;
    min-width: 280px;
    border-collapse: collapse;
    font-size: 0.9rem;
  }

  .match-stats__matrix th,
  .match-stats__matrix td {
    border: 1px solid var(--border);
    padding: var(--space-xs) var(--space-sm);
    text-align: center;
  }

  /* Sticky first column so row labels stay visible when scrolling horizontally */
  .match-stats__matrix-corner {
    position: sticky;
    left: 0;
    z-index: 2;
    min-width: 2.5rem;
    width: 2.5rem;
    background: var(--card);
    box-shadow: 2px 0 6px rgba(0, 0, 0, 0.15);
  }

  .match-stats__matrix-header {
    font-weight: 600;
    background-color: rgba(71, 71, 71, 0.5);
    white-space: nowrap;
  }

  .match-stats__matrix-row-header {
    position: sticky;
    left: 0;
    z-index: 1;
    font-weight: 600;
    background-color: rgba(138, 138, 138, 0.77);
    white-space: nowrap;
    box-shadow: 2px 0 6px rgba(0, 0, 0, 0.15);
  }

  .match-stats__matrix-cell {
    font-variant-numeric: tabular-nums;
  }

  .match-stats__matrix-cell--win {
    background-color: rgba(34, 197, 94, 0.2);
  }

  .match-stats__matrix-cell--loss {
    background-color: rgba(220, 38, 38, 0.2);
  }

  .match-stats__matrix-cell-inner {
    display: block;
    text-align: center;
  }
</style>
