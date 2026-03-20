<script lang="ts">
  import MatchLineRow from '$lib/MatchLineRow.svelte';
  import InkIcons from '$lib/InkIcons.svelte';
  import { recentFormToLorcanaMatch } from '$lib/lorcana-match';
  import type { PlayerStats } from '$lib/PlayerStatsOverview.svelte';
  import type { PlayStyleSummary, MatchAnalysisSummary, RecentFormSummary } from './stats-types';

  let {
    playerStats,
    playStyle,
    matchAnalysis,
    recentFormSummary,
    playerId,
  }: {
    playerStats: PlayerStats | null;
    playStyle: PlayStyleSummary | null;
    matchAnalysis: MatchAnalysisSummary | null;
    recentFormSummary: RecentFormSummary;
    playerId: string;
  } = $props();
</script>

<div class="stats-overview-tab">
  <div class="stats-overview-hero card stack stats-page__card">
    <div class="stats-page__glance">
      {#if matchAnalysis && matchAnalysis.totals.matchesPlayed > 0}
        <div class="stats-page__glance-item stats-page__glance-item--highlight">
          <span class="stats-page__glance-value">{matchAnalysis.totals.matchWinRate}%</span>
          <span class="stats-page__glance-label">Match win rate</span>
        </div>
        <div class="stats-page__glance-item">
          <span
            class="stats-page__glance-value"
            class:stats-page__glance-value--fraction={!!playerStats}
          >
            {#if playerStats}
              {playerStats.matchesWon} / {playerStats.matchesPlayed}
            {:else}
              {matchAnalysis.totals.matchesPlayed}
            {/if}
          </span>
          <span class="stats-page__glance-label">
            {#if playerStats}
              Matches won
            {:else}
              Matches played
            {/if}
          </span>
        </div>
        <div class="stats-page__glance-item">
          <span
            class="stats-page__glance-value"
            class:stats-page__glance-value--fraction={!!playerStats}
          >
            {#if playerStats}
              {playerStats.gamesWon} / {playerStats.gamesPlayed}
            {:else}
              {matchAnalysis.totals.gamesPlayed}
            {/if}
          </span>
          <span class="stats-page__glance-label">
            {#if playerStats}
              Games won
            {:else}
              Games played
            {/if}
          </span>
        </div>
      {/if}
      {#if playerStats}
        <div class="stats-page__glance-item">
          <span class="stats-page__glance-value stats-page__glance-value--fraction"
            >{playerStats.starterWinRate}%</span
          >
          <span class="stats-page__glance-label stats-page__glance-label--wrap"
            >Win rate when you go first</span
          >
        </div>
        <div class="stats-page__glance-item">
          <span class="stats-page__glance-value stats-page__glance-value--fraction"
            >{playerStats.nonStarterWinRate}%</span
          >
          <span class="stats-page__glance-label stats-page__glance-label--wrap"
            >Win rate when you go second</span
          >
        </div>
      {/if}
      {#if playStyle?.preferredDeck || playStyle?.preferredDeckColor}
        {@const deckInk = playStyle.preferredDeck?.deckColor ?? playStyle.preferredDeckColor ?? ''}
        {@const deckTitle = playStyle.preferredDeck?.name ?? playStyle.preferredDeckColor ?? ''}
        <div class="stats-page__glance-item stats-page__glance-item--deck">
          <span class="stats-page__glance-value stats-page__glance-value--deck">
            {#if deckInk}
              <InkIcons deckColor={deckInk} size="sm" />
            {/if}
            <span class="stats-page__glance-deck-name">{deckTitle}</span>
          </span>
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
      {#if matchAnalysis && matchAnalysis.avgLoreInLostGames != null}
      <div class="stats-overview-lore-card__metric">
        <span class="stats-overview-lore-card__value"
          >{matchAnalysis.avgLoreInLostGames.toFixed(1)}</span
        >
        <span class="stats-overview-lore-card__label muted">Avg lore in losses</span>
      </div>
    {/if}
    </div>
  </div>

  <div class="card stack stats-page__card">
    {#if matchAnalysis && matchAnalysis.totals.matchesPlayed > 0}
      {#if matchAnalysis.byStage?.length > 0}
        <div class="stats-page__block">
          <h2 class="stats-page__subtitle">Results by stage</h2>
          <table class="stats-page__table stats-page__table--wide" aria-label="Stats by stage">
            <thead>
              <tr>
                <th scope="col">Stage</th>
                <th scope="col">Matches</th>
                <th scope="col">MWR</th>
                <th scope="col">Games</th>
                <th scope="col">GWR</th>
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
      {#if matchAnalysis.recentForm && matchAnalysis.recentForm.length > 0}
        {@const recentList = matchAnalysis.recentForm}
        <div class="stats-page__block">
          <h2 class="stats-page__subtitle">Your last {recentList.length} matches</h2>
          <p class="stats-page__hint muted">Tap a row to open the match.</p>
          <ul class="match-line-row__list">
            {#each recentList as m (m.matchId)}
              <MatchLineRow
                match={recentFormToLorcanaMatch(
                  {
                    matchId: m.matchId,
                    playedAt: m.playedAt,
                    stage: m.stage,
                    opponentDeckColor: m.opponentDeckColor,
                    myDeckColor: m.myDeckColor,
                    matchWon: m.matchWon,
                    gamesWon: m.gamesWon,
                    gamesPlayed: m.gamesPlayed,
                  },
                  playerId
                )}
                perspective={{ matchupMode: 'dual', playerId }}
              />
            {/each}
          </ul>
        </div>
      {/if}
    {:else}
      <p class="muted">No match results yet. Play some matches to see results here.</p>
    {/if}
  </div>
</div>

<style>
  .stats-overview-tab {
    display: flex;
    flex-direction: column;
    gap: var(--space-lg);
    width: 100%;
    min-width: 0;
  }

  .stats-overview-hero {
    position: relative;
    overflow: hidden;
    padding: var(--space-xl);
    background: linear-gradient(
      155deg,
      rgba(168, 85, 247, 0.12) 0%,
      rgba(168, 85, 247, 0.03) 38%,
      var(--card) 55%
    );
    border: 1px solid var(--border-strong);
    box-shadow: var(--shadow-card);
  }

  .stats-overview-hero::before {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(
      ellipse 80% 50% at 100% -20%,
      rgba(168, 85, 247, 0.18),
      transparent 55%
    );
    pointer-events: none;
  }

  .stats-overview-hero > :global(.stats-page__glance) {
    position: relative;
    z-index: 1;
  }

  .stats-overview-hero :global(.stats-page__glance) {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--space-sm);
  }

  @media (min-width: 520px) {
    .stats-overview-hero :global(.stats-page__glance) {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }

  @media (min-width: 768px) {
    .stats-overview-hero :global(.stats-page__glance) {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }
  }

  .stats-overview-hero :global(.stats-page__glance-item) {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-xs);
    padding: var(--space-md);
    border-radius: var(--radius-sm);
    background: var(--glass-bg);
    border: 1px solid var(--glass-border);
    min-height: 4.75rem;
    transition:
      background var(--transition),
      border-color var(--transition);
  }

  .stats-overview-hero :global(.stats-page__glance-item--highlight) {
    background: rgba(168, 85, 247, 0.1);
    border-color: rgba(168, 85, 247, 0.35);
    box-shadow: 0 0 0 1px rgba(168, 85, 247, 0.12);
  }

  .stats-overview-hero :global(.stats-page__glance-value) {
    font-size: 1.5rem;
    font-weight: 800;
    letter-spacing: -0.03em;
    font-variant-numeric: tabular-nums;
    color: var(--fg);
    line-height: 1.1;
  }

  .stats-overview-hero :global(.stats-page__glance-item--highlight .stats-page__glance-value) {
    font-size: 1.85rem;
    color: var(--ink);
    text-shadow: 0 0 28px var(--ink-glow);
  }

  .stats-overview-hero :global(.stats-page__glance-value--fraction) {
    font-size: 1.35rem;
    letter-spacing: -0.02em;
  }

  .stats-overview-hero :global(.stats-page__glance-value--deck) {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 1rem;
    font-weight: 700;
    letter-spacing: -0.02em;
    line-height: 1.25;
  }

  .stats-overview-hero :global(.stats-page__glance-deck-name) {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .stats-overview-hero :global(.stats-page__glance-label) {
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: var(--muted);
    line-height: 1.3;
  }

  .stats-overview-hero :global(.stats-page__glance-label--wrap) {
    text-transform: none;
    letter-spacing: 0.02em;
    font-weight: 500;
    line-height: 1.35;
    max-width: 11rem;
  }

  .stats-overview-hero :global(.stats-page__form-wins) {
    color: var(--ok);
    font-weight: 800;
  }

  .stats-overview-hero :global(.stats-page__form-losses) {
    color: var(--danger);
    font-weight: 800;
    margin-left: 0.35rem;
  }

  .stats-overview-lore-card__title {
    margin: 0;
    font-size: 0.8rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--muted);
  }

  .stats-overview-lore-card__grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr));
    gap: var(--space-md);
  }

  .stats-overview-lore-card__metric {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
    padding: var(--space-md);
    border-radius: var(--radius-sm);
    background: var(--glass-bg);
    border: 1px solid var(--glass-border);
  }

  .stats-overview-lore-card__value {
    font-size: 1.35rem;
    font-weight: 800;
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.02em;
    color: var(--fg);
    line-height: 1.1;
  }

  .stats-overview-lore-card__label {
    font-size: 0.8rem;
    line-height: 1.35;
  }
</style>
