<script lang="ts">
  import type { PlayerStats } from '$lib/PlayerStatsOverview.svelte';
  import type { PlayStyleSummary, MatchAnalysisSummary, RecentFormSummary } from './stats-types';

  let {
    playerStats,
    playStyle,
    matchAnalysis,
    recentFormSummary,
  }: {
    playerStats: PlayerStats | null;
    playStyle: PlayStyleSummary | null;
    matchAnalysis: MatchAnalysisSummary | null;
    recentFormSummary: RecentFormSummary;
  } = $props();
</script>

<div class="stats-page__glance">
  {#if matchAnalysis && matchAnalysis.totals.matchesPlayed > 0}
    <div class="stats-page__glance-item">
      <span class="stats-page__glance-value">{matchAnalysis.totals.matchWinRate}%</span>
      <span class="stats-page__glance-label">Match win rate</span>
    </div>
    <div class="stats-page__glance-item">
      <span class="stats-page__glance-value">{matchAnalysis.totals.matchesPlayed}</span>
      <span class="stats-page__glance-label">Matches played</span>
    </div>
    <div class="stats-page__glance-item">
      <span class="stats-page__glance-value">{matchAnalysis.totals.gamesPlayed}</span>
      <span class="stats-page__glance-label">Games played</span>
    </div>
  {/if}
  {#if playStyle?.preferredDeckColor}
    <div class="stats-page__glance-item">
      <span class="stats-page__glance-value">{playStyle.preferredDeckColor}</span>
      <span class="stats-page__glance-label">Most played deck</span>
    </div>
  {/if}
  {#if recentFormSummary}
    <div class="stats-page__glance-item stats-page__glance-item--form">
      <span class="stats-page__glance-value">
        <span class="stats-page__form-wins">{recentFormSummary.wins}W</span>
        <span class="stats-page__form-losses">{recentFormSummary.losses}L</span>
      </span>
      <span class="stats-page__glance-label">Last {recentFormSummary.total} matches</span>
    </div>
  {/if}
</div>
{#if playerStats}
  <div class="stats-page__overview-block">
    <h2 class="stats-page__subtitle">Quick numbers</h2>
    <div class="stats-page__row">
      <div class="stats-page__item">
        <span class="stats-page__value">{playerStats.matchesWon} / {playerStats.matchesPlayed}</span>
        <span class="stats-page__label muted">Matches won</span>
      </div>
      <div class="stats-page__item">
        <span class="stats-page__value">{playerStats.gamesWon} / {playerStats.gamesPlayed}</span>
        <span class="stats-page__label muted">Games won</span>
      </div>
      <div class="stats-page__item">
        <span class="stats-page__value">{playerStats.starterWinRate}%</span>
        <span class="stats-page__label muted">Win rate when you go first</span>
      </div>
      <div class="stats-page__item">
        <span class="stats-page__value">{playerStats.nonStarterWinRate}%</span>
        <span class="stats-page__label muted">Win rate when you go second</span>
      </div>
    </div>
  </div>
{/if}
