<script lang="ts">
  import InkIcons from '$lib/InkIcons.svelte';

  interface DeckStatsByOpponent {
    played: number;
    won: number;
  }

  interface Props {
    stats: {
      totalMatches: number;
      wins: number;
      losses: number;
      winRate: number | null;
      byOpponentDeckColor: Record<string, DeckStatsByOpponent>;
    };
    matrixRows: [string, DeckStatsByOpponent][];
  }

  let { stats, matrixRows }: Props = $props();
</script>

<div id="panel-matches" role="tabpanel" aria-labelledby="tab-matches" class="deck-stats__panel">
  <div class="deck-stats__totals">
    <div class="deck-stats__stat">
      <span class="deck-stats__stat-value">{stats.totalMatches}</span>
      <span class="muted">Matches</span>
    </div>
    <div class="deck-stats__stat">
      <span class="deck-stats__stat-value">{stats.wins}</span>
      <span class="muted">Wins</span>
    </div>
    <div class="deck-stats__stat">
      <span class="deck-stats__stat-value">{stats.losses}</span>
      <span class="muted">Losses</span>
    </div>
    {#if stats.winRate != null}
      <div class="deck-stats__stat">
        <span class="deck-stats__stat-value">{(stats.winRate * 100).toFixed(1)}%</span>
        <span class="muted">Win rate</span>
      </div>
    {/if}
  </div>

  {#if stats.totalMatches > 0}
    <section class="deck-stats__matrix stack" aria-label="Matchup by opponent deck color">
      <h2 class="deck-stats__section-title">Matchup by opponent deck color</h2>
      <div class="deck-stats__table-wrap">
        <table class="deck-stats__table">
          <thead>
            <tr>
              <th>Opponent</th>
              <th class="deck-stats__num">Played</th>
              <th class="deck-stats__num">Won</th>
              <th class="deck-stats__num">Win %</th>
            </tr>
          </thead>
          <tbody>
            {#each matrixRows as [opponentColor, data] (opponentColor)}
              {@const pct = data.played > 0 ? (data.won / data.played) * 100 : 0}
              <tr>
                <td>
                  <span class="deck-stats__opponent-color">
                    <InkIcons deckColor={opponentColor} size="sm" />
                    {opponentColor}
                  </span>
                </td>
                <td class="deck-stats__num">{data.played}</td>
                <td class="deck-stats__num">{data.won}</td>
                <td class="deck-stats__num">{pct.toFixed(1)}%</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
      {#if matrixRows.length === 0}
        <p class="muted">No matchup data yet. Link this deck to matches to see statistics.</p>
      {/if}
    </section>
  {:else}
    <p class="muted">
      No matches recorded for this deck yet. Link this deck to matches (as Player 1 or Player 2
      deck) to see statistics.
    </p>
  {/if}
</div>

<style>
  .deck-stats__panel {
    min-height: 2rem;
  }
  .deck-stats__section-title {
    font-size: 1.1rem;
    font-weight: 700;
    margin: 0.5rem 0 0 0;
  }
  .deck-stats__totals {
    display: flex;
    flex-wrap: wrap;
    gap: 1.5rem;
  }
  .deck-stats__stat {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  .deck-stats__stat-value {
    font-size: 1.5rem;
    font-weight: 700;
  }
  .deck-stats__table-wrap {
    overflow-x: auto;
  }
  .deck-stats__table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.9rem;
  }
  .deck-stats__table th,
  .deck-stats__table td {
    padding: 0.5rem 0.75rem;
    text-align: left;
    border-bottom: 1px solid var(--border);
  }
  .deck-stats__table th {
    font-weight: 600;
    color: var(--muted);
  }
  .deck-stats__num {
    text-align: right;
  }
  .deck-stats__opponent-color {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
  }
</style>
