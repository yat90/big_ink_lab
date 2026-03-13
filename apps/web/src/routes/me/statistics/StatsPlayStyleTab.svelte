<script lang="ts">
  import type { PlayStyleSummary } from './stats-types';

  let { playStyle }: { playStyle: PlayStyleSummary | null } = $props();
</script>

{#if playStyle && (playStyle.matchesAnalyzed > 0 || playStyle.gamesAnalyzed > 0)}
  <p class="muted stats-page__hint">
    Based on {playStyle.matchesAnalyzed} matches and {playStyle.gamesAnalyzed} games.
  </p>
  {#if playStyle.preferredDeckColor || playStyle.bestPerformingDeckColor}
    <div class="stats-page__row">
      {#if playStyle.preferredDeckColor}
        <div class="stats-page__item">
          <span class="stats-page__value">{playStyle.preferredDeckColor}</span>
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
            <th scope="col">Deck</th>
            <th scope="col">Matches</th>
            <th scope="col">Match WR</th>
            <th scope="col">Games</th>
            <th scope="col">Game WR</th>
          </tr>
        </thead>
        <tbody>
          {#each playStyle.deckColorStats as row (row.deckColor)}
            <tr>
              <th scope="row" class="stats-page__row-header">{row.deckColor}</th>
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
  <p class="muted">No play-style data yet. Play more matches to see how you play.</p>
{/if}
