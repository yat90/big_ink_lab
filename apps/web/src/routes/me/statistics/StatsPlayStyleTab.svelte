<script lang="ts">
  import InkIcons from '$lib/InkIcons.svelte';
  import type { PlayStyleSummary } from './stats-types';

  let { playStyle }: { playStyle: PlayStyleSummary | null } = $props();
</script>


<div class="stats-play-style card stack stats-page__card">
{#if playStyle && (playStyle.matchesAnalyzed > 0 || playStyle.gamesAnalyzed > 0)}
  <p class="muted stats-page__hint">
    Based on {playStyle.matchesAnalyzed} matches and {playStyle.gamesAnalyzed} games.
  </p>
  {#if playStyle.preferredDeck || playStyle.preferredDeckColor || playStyle.bestPerformingDeckColor}
    <div class="stats-page__row">
      {#if playStyle.preferredDeck || playStyle.preferredDeckColor}
        <div class="stats-page__item">
          <span class="stats-page__value"
            >{playStyle.preferredDeck?.name ?? playStyle.preferredDeckColor}</span
          >
          <span class="stats-page__label muted">Most played deck</span>
        </div>
      {/if}
      {#if playStyle.bestPerformingDeckColor}
        <div class="stats-page__item">
          <span class="stats-page__value">{playStyle.bestPerformingDeckColor}</span>
          <span class="stats-page__label muted">Best win rate (min 5 games)</span>
        </div>
      {/if}
    </div>
  {/if}
  <div class="stats-page__block">
    <h2 class="stats-page__subtitle">When you go first vs second</h2>
    <p class="muted stats-page__description">
      Win rate when you <strong>start the game</strong> vs when you <strong>go second</strong>.
    </p>
    <table class="stats-page__table" aria-label="Win rate by starting player">
      <thead>
        <tr>
          <th scope="col"></th>
          <th scope="col">You go first</th>
          <th scope="col">You go second</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <th scope="row" class="stats-page__row-header">Win rate</th>
          <td>{playStyle.starterWinRate}%</td>
          <td>{playStyle.nonStarterWinRate}%</td>
        </tr>
      </tbody>
    </table>
    {#if playStyle.starterAdvantageDelta != null && playStyle.starterAdvantageDelta !== 0}
      <p class="muted stats-page__delta">
        You perform {playStyle.starterAdvantageDelta > 0 ? 'better' : 'worse'} when you start: {playStyle.starterAdvantageDelta > 0 ? '+' : ''}{playStyle.starterAdvantageDelta}% win rate.
      </p>
    {/if}
  </div>
  {#if playStyle.stageMix?.length > 0}
    <div class="stats-page__block">
      <h2 class="stats-page__subtitle">Where you play (by stage)</h2>
      <table class="stats-page__table stats-page__table--wide" aria-label="Matches by stage">
        <thead>
          <tr>
            <th scope="col">Stage</th>
            <th scope="col">Matches</th>
            <th scope="col">Share</th>
          </tr>
        </thead>
        <tbody>
          {#each playStyle.stageMix as row (row.stage)}
            <tr>
              <th scope="row" class="stats-page__row-header">{row.stage}</th>
              <td>{row.count}</td>
              <td>{row.percentage}%</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
  {#if playStyle.deckColorStats?.length > 0}
    <div class="stats-page__block">
      <h2 class="stats-page__subtitle">Stats by deck color</h2>
      <table class="stats-page__table stats-page__table--wide" aria-label="Stats by deck color">
        <thead>
          <tr>
            <th scope="col" class="stats-play-style__deck-col-head">
              <span class="stats-play-style__sr-only">Deck color</span>
            </th>
            <th scope="col">Matches</th>
            <th scope="col">Match WR</th>
            <th scope="col">Games</th>
            <th scope="col">Game WR</th>
          </tr>
        </thead>
        <tbody>
          {#each playStyle.deckColorStats as row (row.deckColor)}
            <tr>
              <th scope="row" class="stats-page__row-header stats-play-style__deck-cell">
                <span class="stats-play-style__sr-only">{row.deckColor}</span>
                <InkIcons deckColor={row.deckColor} size="sm" />
              </th>
              <td>{row.matchesPlayed}</td>
              <td>{row.matchWinRate}%</td>
              <td>{row.gamesPlayed}</td>
              <td>{row.gameWinRate}%</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
  {#if playStyle.avgLoreWhenWinning != null || playStyle.avgLoreWhenLosing != null}
    <div class="stats-page__row">
      {#if playStyle.avgLoreWhenWinning != null}
        <div class="stats-page__item">
          <span class="stats-page__value">{playStyle.avgLoreWhenWinning.toFixed(1)}</span>
          <span class="stats-page__label muted">Avg lore when you win</span>
        </div>
      {/if}
      {#if playStyle.avgLoreWhenLosing != null}
        <div class="stats-page__item">
          <span class="stats-page__value">{playStyle.avgLoreWhenLosing.toFixed(1)}</span>
          <span class="stats-page__label muted">Avg lore when you lose</span>
        </div>
      {/if}
    </div>
  {/if}
{:else}
  <p class="stats-play-style__empty muted">No play-style data yet. Play more matches to see how you play.</p>
{/if}
</div>

<style>
  .stats-play-style {
    position: relative;
    overflow: hidden;
    padding: var(--space-xl);
    background: linear-gradient(
      155deg,
      rgba(168, 85, 247, 0.1) 0%,
      rgba(168, 85, 247, 0.025) 38%,
      var(--card) 55%
    );
    border: 1px solid var(--border-strong);
    box-shadow: var(--shadow-card);
  }

  .stats-play-style::before {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(
      ellipse 75% 48% at 100% -18%,
      rgba(168, 85, 247, 0.16),
      transparent 52%
    );
    pointer-events: none;
  }

  .stats-play-style > :global(*) {
    position: relative;
    z-index: 1;
  }

  .stats-play-style .stats-page__hint {
    margin: 0 0 var(--space-lg) 0;
    padding: var(--space-sm) var(--space-md);
    border-radius: var(--radius-sm);
    background: var(--glass-bg);
    border: 1px solid var(--glass-border);
    font-size: 0.8125rem;
    font-weight: 600;
    line-height: 1.45;
    color: var(--muted);
  }

  .stats-play-style .stats-page__row {
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--space-md);
    margin-bottom: var(--space-lg);
  }

  @media (min-width: 520px) {
    .stats-play-style .stats-page__row {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  .stats-play-style .stats-page__item {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-xs);
    padding: var(--space-md);
    border-radius: var(--radius-sm);
    background: var(--glass-bg);
    border: 1px solid var(--glass-border);
    min-height: 4.5rem;
    transition:
      background var(--transition),
      border-color var(--transition);
  }

  @media (hover: hover) {
    .stats-play-style .stats-page__item:hover {
      background: var(--glass-bg-strong);
      border-color: rgba(168, 85, 247, 0.22);
    }
  }

  .stats-play-style .stats-page__value {
    font-size: 1.125rem;
    font-weight: 800;
    letter-spacing: -0.025em;
    line-height: 1.25;
    color: var(--fg);
  }

  .stats-play-style .stats-page__label {
    font-size: 0.68rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    line-height: 1.35;
  }

  .stats-play-style .stats-page__row + .stats-page__block,
  .stats-play-style .stats-page__hint + .stats-page__block {
    padding-top: var(--space-lg);
    margin-top: 0;
    border-top: 1px solid var(--border);
  }

  .stats-play-style .stats-page__description {
    margin: 0 0 var(--space-md) 0;
    font-size: 0.875rem;
    line-height: 1.55;
  }

  .stats-play-style .stats-page__description strong {
    color: var(--fg);
    font-weight: 700;
  }

  .stats-play-style .stats-page__delta {
    margin: var(--space-md) 0 0 0;
    padding: var(--space-sm) var(--space-md);
    border-radius: var(--radius-sm);
    background: rgba(168, 85, 247, 0.08);
    border: 1px solid rgba(168, 85, 247, 0.22);
    font-size: 0.8125rem;
    line-height: 1.45;
  }

  .stats-play-style__empty {
    margin: 0;
    position: relative;
    z-index: 1;
  }

  .stats-play-style__sr-only {
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

  .stats-play-style .stats-play-style__deck-col-head {
    width: 1%;
    text-align: center;
    vertical-align: middle;
  }

  .stats-play-style .stats-play-style__deck-cell {
    position: relative;
    text-align: center;
    vertical-align: middle;
  }

  .stats-play-style .stats-play-style__deck-cell :global(.ink-icons) {
    vertical-align: middle;
  }
</style>