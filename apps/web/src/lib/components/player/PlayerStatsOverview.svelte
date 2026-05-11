<script lang="ts">
  import MatchupStatistics from '$lib/components/match/MatchupStatistics.svelte';
  import { t } from '$lib/i18n';

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
    /** Average lore in games the player lost. null when no lost games or no lore data. */
    avgLoreInLostGames?: number | null;
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
    emptyText = '',
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
          >{$t('statistics.playerOverview.deck')}</label
        >
        <select
          id="player-stats-filter-deck"
          class="input player-stats-overview__deck-filter-select"
          bind:value={filterDeckId}
          onchange={() => onDeckFilterChange?.()}
          aria-label={$t('statistics.playerOverview.filterByDeckAria')}
        >
          <option value="">{$t('statistics.playerOverview.allDecks')}</option>
          {#each decksUsed as deck (deck._id)}
            <option value={deck._id}>{deck.name}</option>
          {/each}
        </select>
      </div>
    </div>
  {/if}

  <div class="card stack player-stats-overview__match-stats">
    <div class="player-stats-overview__block">
      <h3>{$t('statistics.playerOverview.matchesHeading')}</h3>
      <div class="player-stats-overview__row">
        <div class="player-stats-overview__item">
          <span class="player-stats-overview__value">{stats.matchesPlayed}</span>
          <span class="player-stats-overview__label muted"
            >{$t('statistics.playerOverview.matchesPlayed')}</span
          >
        </div>
        <div class="player-stats-overview__item">
          <span class="player-stats-overview__value">{stats.matchesWon}</span>
          <span class="player-stats-overview__label muted"
            >{$t('statistics.playerOverview.matchesWon')}</span
          >
        </div>
        <div class="player-stats-overview__item">
          <span class="player-stats-overview__value">{stats.matchWinRate}%</span>
          <span class="player-stats-overview__label muted"
            >{$t('statistics.playerOverview.matchWinRate')}</span
          >
        </div>
      </div>
    </div>
    <div class="player-stats-overview__block">
      <h3>{$t('statistics.playerOverview.gamesHeading')}</h3>
      <div class="player-stats-overview__row">
        <div class="player-stats-overview__item">
          <span class="player-stats-overview__value">{stats.gamesPlayed}</span>
          <span class="player-stats-overview__label muted"
            >{$t('statistics.playerOverview.gamesPlayed')}</span
          >
        </div>
        <div class="player-stats-overview__item">
          <span class="player-stats-overview__value">{stats.gamesWon}</span>
          <span class="player-stats-overview__label muted"
            >{$t('statistics.playerOverview.gamesWon')}</span
          >
        </div>
        <div class="player-stats-overview__item">
          <span class="player-stats-overview__value">{stats.gameWinRate}%</span>
          <span class="player-stats-overview__label muted"
            >{$t('statistics.playerOverview.gameWinRate')}</span
          >
        </div>
        {#if stats.avgLoreInLostGames != null}
          <div class="player-stats-overview__item">
            <span class="player-stats-overview__value">{stats.avgLoreInLostGames}</span>
            <span class="player-stats-overview__label muted"
              >{$t('statistics.playerOverview.avgLoreInLostGames')}</span
            >
          </div>
        {/if}
      </div>
    </div>
  </div>

  <div class="card stack">
    <h3>{$t('statistics.playerOverview.byStartingPlayer')}</h3>
    <p class="player-stats-overview__description muted">
      {$t('statistics.playerOverview.starterExplainer')}
    </p>
    <table
      class="player-stats-overview__table"
      aria-label={$t('statistics.playerOverview.tableAriaStarting')}
    >
      <thead>
        <tr>
          <th scope="col"></th>
          <th scope="col">{$t('statistics.playerOverview.colOtp')}</th>
          <th scope="col">{$t('statistics.playerOverview.colOtd')}</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <th scope="row" class="player-stats-overview__table-row-header"
            >{$t('statistics.playerOverview.rowGames')}</th
          >
          <td>{stats.gamesAsStarter}</td>
          <td>{stats.gamesNotStarter}</td>
        </tr>
        <tr>
          <th scope="row" class="player-stats-overview__table-row-header"
            >{$t('statistics.playerOverview.rowWon')}</th
          >
          <td>{stats.gamesWonAsStarter}</td>
          <td>{stats.gamesWonNotStarter}</td>
        </tr>
        <tr>
          <th scope="row" class="player-stats-overview__table-row-header"
            >{$t('statistics.playerOverview.rowWinRate')}</th
          >
          <td>{stats.starterWinRate}%</td>
          <td>{stats.nonStarterWinRate}%</td>
        </tr>
      </tbody>
    </table>
  </div>

  {#if stats.deckColorMatrix && Object.keys(stats.deckColorMatrix).length > 0}
    <div class="card stack player-stats-overview__matchup-card">
      <h3>{$t('statistics.playerOverview.byDeckColors')}</h3>
      <MatchupStatistics
        matrix={stats.deckColorMatrix}
        bind:analysisMode
        onchange={onMatrixModeChange}
        title={$t('statistics.matrix.titleDefault')}
        emptyText={emptyText || $t('statistics.matrix.emptyDefault')}
      />
    </div>
  {/if}
</div>

<style>
  .player-stats-overview {
    display: flex;
    flex-direction: column;
    gap: var(--space-lg);
    min-width: 0;
    width: 100%;
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
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
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
