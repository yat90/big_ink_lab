<script lang="ts">
  import InkIcons from '$lib/InkIcons.svelte';
  import { DECK_COLOR_OPTIONS } from '$lib/matches';

  type MatrixMode = 'matches' | 'games';
  type MatrixCell = { played: number; won: number };
  type Matrix = Record<string, Record<string, MatrixCell>>;

  let {
    matrix,
    analysisMode = $bindable<MatrixMode>('matches'),
    title = 'Deck color matchups',
    emptyText = 'No matchup data yet.',
    onchange = undefined,
  }: {
    matrix?: Matrix;
    analysisMode?: MatrixMode;
    title?: string;
    emptyText?: string;
    onchange?: (mode: MatrixMode) => void;
  } = $props();

  const hasData = $derived(!!matrix && Object.keys(matrix).length > 0);

  const subtitle = $derived(
    analysisMode === 'games'
      ? 'Rows: your deck color. Columns: opponent deck color. Cell: win rate by games.'
      : 'Rows: your deck color. Columns: opponent deck color. Cell: win rate by matches.'
  );

  function setAnalysisMode(nextMode: MatrixMode) {
    if (analysisMode === nextMode) return;
    analysisMode = nextMode;
    onchange?.(nextMode);
  }

  /** 0% = red, 50% = yellow, 100% = green. Returns dark HSL for readable light text. */
  function backgroundColorForPercent(pct: number | null): string {
    if (pct == null) return '';
    const hue = (Math.max(0, Math.min(100, pct)) / 100) * 120;
    return `hsl(${hue}, 65%, 28%)`;
  }
</script>

<section class="matchup-matrix" aria-label={title}>
  <div class="matchup-matrix__header">
    <div>
      <h3 class="matchup-matrix__title">{title}</h3>
      <p class="matchup-matrix__sub muted">{subtitle}</p>
    </div>
    <div class="matchup-matrix__toggle" role="group" aria-label="Analyze by">
      <button
        type="button"
        class="matchup-matrix__toggle-btn"
        class:matchup-matrix__toggle-btn--active={analysisMode === 'matches'}
        aria-pressed={analysisMode === 'matches'}
        onclick={() => setAnalysisMode('matches')}
      >
        Matches
      </button>
      <button
        type="button"
        class="matchup-matrix__toggle-btn"
        class:matchup-matrix__toggle-btn--active={analysisMode === 'games'}
        aria-pressed={analysisMode === 'games'}
        onclick={() => setAnalysisMode('games')}
      >
        Games
      </button>
    </div>
  </div>

  {#if hasData}
    <div class="matchup-matrix__wrap">
      <table class="matchup-matrix__table" aria-label="{title} matrix">
        <thead>
          <tr>
            <th scope="col" class="matchup-matrix__corner"></th>
            {#each DECK_COLOR_OPTIONS as oppDeck}
              <th scope="col" class="matchup-matrix__col-header" title={oppDeck}>
                <InkIcons deckColor={oppDeck} size="sm" />
              </th>
            {/each}
          </tr>
        </thead>
        <tbody>
          {#each DECK_COLOR_OPTIONS as myDeck}
            <tr>
              <th scope="row" class="matchup-matrix__row-header" title={myDeck}>
                <InkIcons deckColor={myDeck} size="sm" />
              </th>
              {#each DECK_COLOR_OPTIONS as oppDeck}
                {@const cell = matrix?.[myDeck]?.[oppDeck]}
                {@const winPct = cell ? Math.round((cell.won / cell.played) * 100) : null}
                <td
                  class="matchup-matrix__cell"
                  class:matchup-matrix__cell--tinted={winPct != null}
                  style={winPct != null ? `background-color: ${backgroundColorForPercent(winPct)}` : ''}
                >
                  {#if cell}
                    <span
                      class="matchup-matrix__cell-inner"
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
  {:else}
    <p class="muted">{emptyText}</p>
  {/if}
</section>

<style>
  .matchup-matrix {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
  }

  .matchup-matrix__header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: var(--space-md);
    flex-wrap: wrap;
  }

  .matchup-matrix__title {
    font-size: 1rem;
    font-weight: 700;
    letter-spacing: -0.02em;
    margin: 0;
  }

  .matchup-matrix__sub {
    margin: var(--space-xs) 0 0;
    font-size: 0.9rem;
  }

  .matchup-matrix__toggle {
    display: inline-flex;
    border: 1px solid var(--border);
    border-radius: var(--radius-full);
    overflow: hidden;
  }

  .matchup-matrix__toggle-btn {
    border: none;
    background: var(--glass-bg);
    color: inherit;
    font: inherit;
    font-weight: 700;
    font-size: 0.85rem;
    padding: 8px 14px;
    cursor: pointer;
    min-height: 40px;
  }

  .matchup-matrix__toggle-btn + .matchup-matrix__toggle-btn {
    border-left: 1px solid var(--border);
  }

  .matchup-matrix__toggle-btn--active {
    background: var(--ink);
    color: #fff;
  }

  .matchup-matrix__wrap {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  .matchup-matrix__table {
    width: 100%;
    min-width: 280px;
    border-collapse: collapse;
    font-size: 0.9rem;
  }

  .matchup-matrix__table th,
  .matchup-matrix__table td {
    border: 1px solid var(--border);
    padding: var(--space-xs) var(--space-sm);
    text-align: center;
  }

  .matchup-matrix__corner {
    position: sticky;
    left: 0;
    z-index: 2;
    min-width: 2.5rem;
    width: 2.5rem;
    background: var(--card);
    box-shadow: 2px 0 6px rgba(0, 0, 0, 0.15);
  }

  .matchup-matrix__col-header {
    font-weight: 600;
    background-color: rgba(71, 71, 71, 0.5);
    white-space: nowrap;
  }

  .matchup-matrix__row-header {
    position: sticky;
    left: 0;
    z-index: 1;
    font-weight: 600;
    background-color: rgba(138, 138, 138, 0.77);
    white-space: nowrap;
    box-shadow: 2px 0 6px rgba(0, 0, 0, 0.15);
  }

  .matchup-matrix__cell {
    font-variant-numeric: tabular-nums;
  }

  .matchup-matrix__cell--tinted {
    color: #fff;
  }

  .matchup-matrix__cell-inner {
    display: block;
    text-align: center;
  }
</style>
