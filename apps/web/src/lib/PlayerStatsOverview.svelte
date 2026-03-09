<script lang="ts">
  import MatchupStatistics from '$lib/MatchupStatistics.svelte';

  type MatrixMode = 'matches' | 'games';
  type DeckColorMatrixCell = { played: number; won: number };
  type DeckColorMatrix = Record<string, Record<string, DeckColorMatrixCell>>;

  export type PlayerStats = {
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

  let {
    stats,
    sectionTitle = '',
    decksUsed = [],
    filterDeckId = $bindable(''),
    onDeckFilterChange,
    analysisMode = $bindable<MatrixMode>('matches'),
    onMatrixModeChange,
    emptyText = 'No matchup data yet.',
  }: {
    stats: PlayerStats;
    sectionTitle?: string;
    decksUsed?: DeckUsed[];
    filterDeckId?: string;
    onDeckFilterChange?: () => void;
    analysisMode?: MatrixMode;
    onMatrixModeChange?: (mode: MatrixMode) => void;
    emptyText?: string;
  } = $props();

  const showDeckFilter = $derived(decksUsed.length > 0);
</script>

<div class="player-stats-overview">
  {#if sectionTitle}
    <h2 class="player-stats-overview__section-title">{sectionTitle}</h2>
  {/if}

  {#if showDeckFilter}
    <div class="card">
      <div class="player-stats-overview__deck-filter">
        <label for="player-stats-filter-deck" class="player-stats-overview__deck-filter-label"
          >Deck</label
        >
        <select
          id="player-stats-filter-deck"
          class="input player-stats-overview__deck-filter-select"
          bind:value={filterDeckId}
          onchange={() => onDeckFilterChange?.()}
          aria-label="Filter statistics by deck"
        >
          <option value="">All decks</option>
          {#each decksUsed as deck (deck._id)}
            <option value={deck._id}>{deck.name}</option>
          {/each}
        </select>
      </div>
    </div>
  {/if}

  <div class="card stack player-stats-overview__match-stats">
    <div class="player-stats-overview__block">
      <h3>Matches</h3>
      <div class="player-stats-overview__row">
        <div class="player-stats-overview__item">
          <span class="player-stats-overview__value">{stats.matchesPlayed}</span>
          <span class="player-stats-overview__label muted">Matches played</span>
        </div>
        <div class="player-stats-overview__item">
          <span class="player-stats-overview__value">{stats.matchesWon}</span>
          <span class="player-stats-overview__label muted">Matches won</span>
        </div>
        <div class="player-stats-overview__item">
          <span class="player-stats-overview__value">{stats.matchWinRate}%</span>
          <span class="player-stats-overview__label muted">Match win rate</span>
        </div>
      </div>
    </div>
    <div class="player-stats-overview__block">
      <h3>Games</h3>
      <div class="player-stats-overview__row">
        <div class="player-stats-overview__item">
          <span class="player-stats-overview__value">{stats.gamesPlayed}</span>
          <span class="player-stats-overview__label muted">Games played</span>
        </div>
        <div class="player-stats-overview__item">
          <span class="player-stats-overview__value">{stats.gamesWon}</span>
          <span class="player-stats-overview__label muted">Games won</span>
        </div>
        <div class="player-stats-overview__item">
          <span class="player-stats-overview__value">{stats.gameWinRate}%</span>
          <span class="player-stats-overview__label muted">Game win rate</span>
        </div>
      </div>
    </div>
  </div>

  <div class="card stack">
    <h3>By starting player</h3>
    <p class="player-stats-overview__description muted">
      <strong>On the play (OTP)</strong>: the player started the game.
      <strong>On the draw (OTD)</strong>: the player did not start and goes second.
    </p>
    <table class="player-stats-overview__table" aria-label="Statistics by starting player">
      <thead>
        <tr>
          <th scope="col"></th>
          <th scope="col">OTP</th>
          <th scope="col">OTD</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <th scope="row" class="player-stats-overview__table-row-header">Games</th>
          <td>{stats.gamesAsStarter}</td>
          <td>{stats.gamesNotStarter}</td>
        </tr>
        <tr>
          <th scope="row" class="player-stats-overview__table-row-header">Won</th>
          <td>{stats.gamesWonAsStarter}</td>
          <td>{stats.gamesWonNotStarter}</td>
        </tr>
        <tr>
          <th scope="row" class="player-stats-overview__table-row-header">Win rate</th>
          <td>{stats.starterWinRate}%</td>
          <td>{stats.nonStarterWinRate}%</td>
        </tr>
      </tbody>
    </table>
  </div>

  {#if stats.deckColorMatrix && Object.keys(stats.deckColorMatrix).length > 0}
    <div class="card stack player-stats-overview__matchup-card">
      <h3>By deck colors</h3>
      <MatchupStatistics
        matrix={stats.deckColorMatrix}
        bind:analysisMode={analysisMode}
        onchange={onMatrixModeChange}
        title="Deck color matchups"
        emptyText={emptyText}
      />
    </div>
  {/if}
</div>

<style>
  .player-stats-overview {
    display: flex;
    flex-direction: column;
    gap: var(--space-lg);
  }

  .player-stats-overview__section-title {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 700;
  }

  .player-stats-overview__deck-filter {
    display: flex;
    align-items: center;
    gap: var(--space-md);
  }

  .player-stats-overview__deck-filter-label {
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--muted);
  }

  .player-stats-overview__deck-filter-select {
    min-width: 14rem;
  }

  .player-stats-overview__matchup-card {
    width: 100%;
    min-width: 0;
    overflow: hidden;
  }

  .player-stats-overview__match-stats {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-lg);
  }

  .player-stats-overview__match-stats > .player-stats-overview__block {
    flex: 1 1 0;
    min-width: 0;
  }

  @media (max-width: 639px) {
    .player-stats-overview__match-stats {
      flex-direction: column;
    }
    .player-stats-overview__match-stats > .player-stats-overview__block {
      flex: 1 1 auto;
      min-width: unset;
    }
  }

  .player-stats-overview__block {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
  }

  .player-stats-overview__block h3 {
    margin: 0;
    font-size: 1rem;
    font-weight: 700;
  }

  .player-stats-overview__description {
    margin: 0;
    font-size: 0.9rem;
    line-height: 1.4;
  }

  .player-stats-overview__row {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    gap: var(--space-md) var(--space-lg);
  }

  .player-stats-overview__item {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }

  .player-stats-overview__value {
    font-size: 1.5rem;
    font-weight: 800;
    letter-spacing: -0.02em;
  }

  .player-stats-overview__label {
    font-size: 0.85rem;
    font-weight: 500;
  }

  .player-stats-overview__table {
    width: 100%;
    max-width: 24rem;
    border-collapse: collapse;
    font-size: 0.95rem;
  }

  .player-stats-overview__table th,
  .player-stats-overview__table td {
    border: 1px solid var(--border);
    padding: var(--space-sm) var(--space-md);
    text-align: left;
  }

  .player-stats-overview__table thead th {
    font-weight: 700;
    background: var(--glass-bg-strong, rgba(0, 0, 0, 0.06));
  }

  .player-stats-overview__table th:not(.player-stats-overview__table-row-header) {
    text-align: center;
  }

  .player-stats-overview__table td {
    text-align: center;
    font-variant-numeric: tabular-nums;
  }

  .player-stats-overview__table-row-header {
    font-weight: 600;
  }
</style>
