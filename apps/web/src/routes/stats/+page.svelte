<script lang="ts">
  import { config } from '$lib/config';
  import { onMount } from 'svelte';
  import { DECK_COLOR_OPTIONS, deckColorToInk } from '$lib/matches';

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

  const apiUrl = config.apiUrl ?? '/api';

  onMount(async () => {
    try {
      const res = await fetch(`${apiUrl}/matches/stats`);
      if (!res.ok) {
        error = 'Failed to load statistics';
        loading = false;
        return;
      }
      stats = await res.json();
    } catch {
      error = 'Could not reach API.';
    } finally {
      loading = false;
    }
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

  .match-stats__matrix-corner {
    background: unset;
    min-width: 2.5rem;
  }

  .match-stats__matrix-header {
    font-weight: 600;
    background-color: rgba(71, 71, 71, 0.5);
    white-space: nowrap;
  }

  .match-stats__matrix-row-header {
    font-weight: 600;
    background-color: rgba(138, 138, 138, 0.77);
    white-space: nowrap;
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
