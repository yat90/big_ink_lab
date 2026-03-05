<script lang="ts">
  import { config } from '$lib/config';
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { DECK_COLOR_OPTIONS } from '$lib/matches';
  import InkIcons from '$lib/InkIcons.svelte';

  type DeckColorMatrixCell = { played: number; won: number };
  type DeckColorMatrix = Record<string, Record<string, DeckColorMatrixCell>>;

  type PlayerStats = {
    matchesPlayed: number;
    matchesWon: number;
    matchesLost: number;
    matchWinRate: number;
    gamesPlayed: number;
    gamesWon: number;
    gameWinRate: number;
    gamesAsStarter: number;
    gamesWonAsStarter: number;
    starterWinRate: number;
    gamesNotStarter: number;
    gamesWonNotStarter: number;
    nonStarterWinRate: number;
    deckColorMatrix?: DeckColorMatrix;
  };

  type DeckUsed = { _id: string; name: string };
  type PlayerWithStats = {
    _id: string;
    name: string;
    team: string;
    stats?: PlayerStats;
    decksUsed?: DeckUsed[];
  };

  const id = $page.params.id;
  let player = $state<PlayerWithStats | null>(null);
  let loading = $state(true);
  let error = $state('');
  let filterDeckId = $state('');

  const apiUrl = config.apiUrl ?? '/api';
  const decksUsed = $derived(player?.decksUsed ?? []);

  async function loadPlayer(deckId?: string) {
    loading = true;
    error = '';
    try {
      const url = deckId?.trim()
        ? `${apiUrl}/players/${id}?deckId=${encodeURIComponent(deckId.trim())}`
        : `${apiUrl}/players/${id}`;
      const res = await fetch(url);
      if (!res.ok) {
        error = 'Player not found';
        return;
      }
      player = await res.json();
    } catch {
      error = 'Could not load player.';
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    loadPlayer(filterDeckId || undefined);
  });

  async function onDeckFilterChange() {
    await loadPlayer(filterDeckId || undefined);
  }
</script>

<svelte:head>
  <title>{player?.name ?? 'Player'} · Big Ink Lab</title>
</svelte:head>

<div class="page page--player">
  {#if loading}
    <div class="card">
      <div class="loading-skeleton" aria-busy="true" aria-live="polite">
        <div class="loading-skeleton__line loading-skeleton__line--title"></div>
        <div class="loading-skeleton__line loading-skeleton__line--short"></div>
        <div class="loading-skeleton__line"></div>
      </div>
      <p class="muted" style="margin-top: var(--space-md);">Loading player…</p>
    </div>
  {:else if error || !player}
    <div class="card" role="alert">
      <p class="alert">{error || 'Player not found'}</p>
      <a href="/players" class="btn">Back to players</a>
    </div>
  {:else}
    <div class="player-overview">
      <div class="card stack player-overview__header">
        <div class="row" style="justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: var(--space-md);">
          <div>
            <h1 class="card__title" style="margin: 0;">{player.name}</h1>
            {#if player.team}
              <p class="card__sub" style="margin-top: var(--space-xs);">{player.team}</p>
            {/if}
          </div>
          <div class="row" style="gap: var(--space-sm);">
            <a href="/players/{player._id}/edit" class="btn">Edit</a>
            <a href="/players" class="btn">Back to players</a>
          </div>
        </div>
        {#if decksUsed.length > 0}
          <div class="player-overview__deck-filter">
            <label for="filter-deck" class="player-overview__deck-filter-label">Deck</label>
            <select
              id="filter-deck"
              class="input player-overview__deck-filter-select"
              bind:value={filterDeckId}
              onchange={onDeckFilterChange}
              aria-label="Filter statistics by deck"
            >
              <option value="">All decks</option>
              {#each decksUsed as deck (deck._id)}
                <option value={deck._id}>{deck.name}</option>
              {/each}
            </select>
          </div>
        {/if}
      </div>

      {#if player.stats}
        <div class="player-stats card">
          <h2 class="player-stats__title">Game statistics</h2>
          <div class="player-stats__grid">
            <div class="player-stats__item">
              <span class="player-stats__value">{player.stats.matchesPlayed}</span>
              <span class="player-stats__label muted">Matches played</span>
            </div>
            <div class="player-stats__item">
              <span class="player-stats__value">{player.stats.matchesWon}</span>
              <span class="player-stats__label muted">Matches won</span>
            </div>
            <div class="player-stats__item">
              <span class="player-stats__value">{player.stats.matchesLost}</span>
              <span class="player-stats__label muted">Matches lost</span>
            </div>
            <div class="player-stats__item">
              <span class="player-stats__value">{player.stats.matchWinRate}%</span>
              <span class="player-stats__label muted">Match win rate</span>
            </div>
            <div class="player-stats__item">
              <span class="player-stats__value">{player.stats.gamesPlayed}</span>
              <span class="player-stats__label muted">Games played</span>
            </div>
            <div class="player-stats__item">
              <span class="player-stats__value">{player.stats.gamesWon}</span>
              <span class="player-stats__label muted">Games won</span>
            </div>
            <div class="player-stats__item">
              <span class="player-stats__value">{player.stats.gameWinRate}%</span>
              <span class="player-stats__label muted">Game win rate</span>
            </div>
          </div>

          <h3 class="player-stats__subtitle">By starting player</h3>
          <div class="player-stats__grid">
            <div class="player-stats__item">
              <span class="player-stats__value">{player.stats.gamesAsStarter}</span>
              <span class="player-stats__label muted">Games started</span>
            </div>
            <div class="player-stats__item">
              <span class="player-stats__value">{player.stats.gamesWonAsStarter}</span>
              <span class="player-stats__label muted">Won when starting</span>
            </div>
            <div class="player-stats__item">
              <span class="player-stats__value">{player.stats.starterWinRate}%</span>
              <span class="player-stats__label muted">Win rate when starting</span>
            </div>
            <div class="player-stats__item">
              <span class="player-stats__value">{player.stats.gamesNotStarter}</span>
              <span class="player-stats__label muted">Games not started</span>
            </div>
            <div class="player-stats__item">
              <span class="player-stats__value">{player.stats.gamesWonNotStarter}</span>
              <span class="player-stats__label muted">Won when not starting</span>
            </div>
            <div class="player-stats__item">
              <span class="player-stats__value">{player.stats.nonStarterWinRate}%</span>
              <span class="player-stats__label muted">Win rate when not starting</span>
            </div>
          </div>

          {#if player.stats.deckColorMatrix}
            <h3 class="player-stats__subtitle">By deck colors</h3>
            <div class="player-stats__matrix-wrap">
              <table class="player-stats__matrix" aria-label="Match record by your deck color vs opponent deck color">
                <thead>
                  <tr>
                    <th scope="col" class="player-stats__matrix-corner"></th>
                    {#each DECK_COLOR_OPTIONS as oppDeck}
                      <th scope="col" class="player-stats__matrix-header" title={oppDeck}><InkIcons deckColor={oppDeck} size="sm" /></th>
                    {/each}
                  </tr>
                </thead>
                <tbody>
                  {#each DECK_COLOR_OPTIONS as myDeck}
                    <tr>
                      <th scope="row" class="player-stats__matrix-row-header" title={myDeck}><InkIcons deckColor={myDeck} size="sm" /></th>
                      {#each DECK_COLOR_OPTIONS as oppDeck}
                        {@const cell = player.stats?.deckColorMatrix?.[myDeck]?.[oppDeck]}
                        {@const winPct = cell ? Math.round((cell.won / cell.played) * 100) : null}
                        <td
                          class="player-stats__matrix-cell"
                          class:player-stats__matrix-cell--win={winPct != null && winPct > 50}
                          class:player-stats__matrix-cell--loss={winPct != null && winPct < 50}
                        >
                          {#if cell}
                            <span
                              class="player-stats__matrix-cell-inner"
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
          {/if}
        </div>
      {:else}
        <div class="card">
          <p class="card__sub muted">No match data yet. Play some matches to see statistics.</p>
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  @media (min-width: 1024px) {
    :global(.page.page--player) {
      max-width: 1200px;
    }
  }

  .player-overview {
    display: flex;
    flex-direction: column;
    gap: var(--space-lg);
  }

  .player-overview__header {
    padding: var(--space-lg);
  }

  .player-overview__deck-filter {
    display: flex;
    align-items: center;
    gap: var(--space-md);
    margin-top: var(--space-md);
    padding-top: var(--space-md);
    border-top: 1px solid var(--border);
  }

  .player-overview__deck-filter-label {
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--muted);
  }

  .player-overview__deck-filter-select {
    min-width: 14rem;
  }

  .player-stats__title {
    font-size: 1rem;
    font-weight: 700;
    letter-spacing: -0.02em;
    margin: 0 0 var(--space-md);
  }

  .player-stats__subtitle {
    font-size: 0.95rem;
    font-weight: 700;
    letter-spacing: -0.02em;
    margin: var(--space-xl) 0 var(--space-md);
    padding-top: var(--space-md);
    border-top: 1px solid var(--border);
  }

  .player-stats__grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: var(--space-lg);
  }

  .player-stats__item {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }

  .player-stats__value {
    font-size: 1.5rem;
    font-weight: 800;
    letter-spacing: -0.02em;
  }

  .player-stats__label {
    font-size: 0.85rem;
    font-weight: 500;
  }

  .player-stats__matrix-wrap {
    overflow-x: auto;
    margin-bottom: var(--space-md);
  }

  .player-stats__matrix {
    width: 100%;
    min-width: 280px;
    border-collapse: collapse;
    font-size: 0.9rem;
  }

  .player-stats__matrix th,
  .player-stats__matrix td {
    border: 1px solid var(--border);
    padding: var(--space-xs) var(--space-sm);
    text-align: center;
  }

  .player-stats__matrix-corner {
    background: unset;
    min-width: 2.5rem;
  }

  .player-stats__matrix-header {
    font-weight: 600;
    background-color: rgba(71, 71, 71, 0.5);
    white-space: nowrap;
  }

  .player-stats__matrix-row-header {
    font-weight: 600;
    background-color: rgba(138, 138, 138, 0.77);
    white-space: nowrap;
  }

  .player-stats__matrix-cell {
    font-variant-numeric: tabular-nums;
  }

  .player-stats__matrix-cell--win {
    background-color: rgba(34, 197, 94, 0.2);
  }

  .player-stats__matrix-cell--loss {
    background-color: rgba(220, 38, 38, 0.2);
  }

  .player-stats__matrix-cell-inner {
    display: block;
    text-align: center;
  }
</style>
