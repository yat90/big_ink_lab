<script lang="ts">
  import InkIcons from '$lib/InkIcons.svelte';
  import type { MatchAnalysisSummary } from './stats-types';

  let {
    matchAnalysis,
    formatRelativeDate,
  }: {
    matchAnalysis: MatchAnalysisSummary | null;
    formatRelativeDate: (s: string | undefined) => string;
  } = $props();
</script>

{#if matchAnalysis && matchAnalysis.totals.matchesPlayed > 0}
  <div class="stats-page__block">
    <h2 class="stats-page__subtitle">Overall results</h2>
    <div class="stats-page__row">
      <div class="stats-page__item">
        <span class="stats-page__value">{matchAnalysis.totals.matchesPlayed}</span>
        <span class="stats-page__label muted">Matches</span>
      </div>
      <div class="stats-page__item">
        <span class="stats-page__value">{matchAnalysis.totals.matchWinRate}%</span>
        <span class="stats-page__label muted">Match win rate</span>
      </div>
      <div class="stats-page__item">
        <span class="stats-page__value">{matchAnalysis.totals.gamesPlayed}</span>
        <span class="stats-page__label muted">Games</span>
      </div>
      <div class="stats-page__item">
        <span class="stats-page__value">{matchAnalysis.totals.gameWinRate}%</span>
        <span class="stats-page__label muted">Game win rate</span>
      </div>
    </div>
  </div>
  {#if matchAnalysis.byStage?.length > 0}
    <div class="stats-page__block">
      <h2 class="stats-page__subtitle">Results by stage</h2>
      <table class="stats-page__table stats-page__table--wide" aria-label="Stats by stage">
        <thead>
          <tr>
            <th scope="col">Stage</th>
            <th scope="col">Matches</th>
            <th scope="col">Match WR</th>
            <th scope="col">Games</th>
            <th scope="col">Game WR</th>
          </tr>
        </thead>
        <tbody>
          {#each matchAnalysis.byStage as row (row.stage)}
            <tr>
              <th scope="row" class="stats-page__row-header">{row.stage}</th>
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
  {#if matchAnalysis.avgLoreInWonGames != null || matchAnalysis.avgLoreInLostGames != null}
    <div class="stats-page__row">
      {#if matchAnalysis.avgLoreInWonGames != null}
        <div class="stats-page__item">
          <span class="stats-page__value">{matchAnalysis.avgLoreInWonGames.toFixed(1)}</span>
          <span class="stats-page__label muted">Avg lore in wins</span>
        </div>
      {/if}
      {#if matchAnalysis.avgLoreInLostGames != null}
        <div class="stats-page__item">
          <span class="stats-page__value">{matchAnalysis.avgLoreInLostGames.toFixed(1)}</span>
          <span class="stats-page__label muted">Avg lore in losses</span>
        </div>
      {/if}
    </div>
  {/if}
  {#if matchAnalysis.recentForm && matchAnalysis.recentForm.length > 0}
    {@const recentList = matchAnalysis.recentForm}
    <div class="stats-page__block">
      <h2 class="stats-page__subtitle">Your last {recentList.length} matches</h2>
      <p class="stats-page__hint muted">Tap a row to open the match.</p>
      <ul class="stats-page__recent-list">
        {#each recentList as match (match.matchId)}
          <li class="stats-page__recent-item">
            <a href="/matches/{match.matchId}" class="stats-page__recent-link">
              <span class="stats-page__recent-result" class:won={match.matchWon} class:lost={!match.matchWon}>
                {match.matchWon ? 'W' : 'L'}
              </span>
              <span class="stats-page__recent-matchup">
                <span class="stats-page__recent-deck-color" title={match.myDeckColor}>
                  <InkIcons deckColor={match.myDeckColor} size="sm" />
                  {match.myDeckColor || ''}
                </span>
                <span class="stats-page__recent-vs">vs</span>
                <span class="stats-page__recent-deck-color" title={match.opponentDeckColor}>
                  <InkIcons deckColor={match.opponentDeckColor} size="sm" />
                  {match.opponentDeckColor || ''}
                </span>
              </span>
              <span class="stats-page__recent-meta muted">
                {match.stage} · <span class="stats-page__recent-score">{match.gamesWon}/{match.gamesPlayed}</span> games
              </span>
              <span class="stats-page__recent-date muted">{formatRelativeDate(match.playedAt)}</span>
            </a>
          </li>
        {/each}
      </ul>
    </div>
  {/if}
{:else}
  <p class="muted">No match results yet. Play some matches to see results here.</p>
{/if}
