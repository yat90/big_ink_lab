<script lang="ts">
  import type { TeamHeadToHeadMatrix, TeamInternalRankingRow } from '$lib/team';

  interface Props {
    rows: TeamInternalRankingRow[];
    matrix: TeamHeadToHeadMatrix;
    currentPlayerId: string | null;
  }
  let { rows, matrix, currentPlayerId }: Props = $props();

  type ViewId = 'ladder' | 'matrix';
  let view = $state<ViewId>('ladder');

  const pctFormatter = new Intl.NumberFormat(undefined, {
    style: 'percent',
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  });

  function formatWinRate(rate: number | null): string {
    if (rate === null) return '–';
    return pctFormatter.format(rate);
  }

  function colHeadTitle(colIndex: number): string {
    const id = matrix.playerIds[colIndex];
    const name = matrix.names[colIndex] ?? '';
    return id ? `${name} (${id})` : name;
  }

  const totalInternalMatches = $derived.by(() => rows.reduce((sum, r) => sum + r.matches, 0));
  const hasAnyInternalPlay = $derived(totalInternalMatches > 0);
</script>

<div class="ranking-tab stack">
  {#if rows.length === 0}
    <div class="card stack">
      <p class="card__sub muted">No team members to rank.</p>
    </div>
  {:else}
    <div class="ranking-toolbar card">
      <p class="ranking-toolbar__intro muted">
        Internal stats only include matches between teammates recorded here (same rules as global
        stats: intentional draws and unfinished tournament rows excluded).
      </p>
      <div class="ranking-view-toggle" role="group" aria-label="Ranking display">
        <button
          type="button"
          class="ranking-view-toggle__btn"
          class:ranking-view-toggle__btn--active={view === 'ladder'}
          aria-pressed={view === 'ladder'}
          onclick={() => (view = 'ladder')}
        >
          Ladder
        </button>
        <button
          type="button"
          class="ranking-view-toggle__btn"
          class:ranking-view-toggle__btn--active={view === 'matrix'}
          aria-pressed={view === 'matrix'}
          onclick={() => (view = 'matrix')}
        >
          Matrix
        </button>
      </div>
    </div>

    {#if view === 'ladder'}
      {#if !hasAnyInternalPlay}
        <p class="muted text-sm ranking-tab__hint" role="status">
          No internal matches yet — log games between teammates to populate this table.
        </p>
      {/if}

      <div class="card ranking-tab__table-wrap">
        <table class="ranking-table">
          <thead>
            <tr>
              <th scope="col" class="ranking-table__col-rank">#</th>
              <th scope="col">Player</th>
              <th scope="col" class="ranking-table__col-num">W–L</th>
              <th scope="col" class="ranking-table__col-num">Win %</th>
            </tr>
          </thead>
          <tbody>
            {#each rows as row, index (row.playerId)}
              <tr
                class="ranking-table__row"
                class:ranking-table__row--you={row.playerId === currentPlayerId}
              >
                <td class="ranking-table__col-rank muted">{index + 1}</td>
                <td>
                  <a href="/players/{row.playerId}" class="ranking-table__name">{row.name}</a>
                  {#if row.playerId === currentPlayerId}
                    <span class="ranking-table__you-badge">You</span>
                  {/if}
                </td>
                <td class="ranking-table__col-num">{row.wins}–{row.losses}</td>
                <td class="ranking-table__col-num">{formatWinRate(row.winRate)}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {:else}
      <p class="muted text-sm ranking-tab__hint matrix-hint" role="note">
        Rows are the player; columns are the opponent. Each cell is that row player’s wins vs the
        column player (losses are the opponent’s wins against them). Diagonal is empty.
      </p>

      <div class="card matrix-scroll">
        <table class="matrix-table">
          <thead>
            <tr>
              <th scope="col" class="matrix-table__corner"></th>
              {#each matrix.names as name, j (matrix.playerIds[j] ?? j)}
                <th scope="col" class="matrix-table__colhead" title={colHeadTitle(j)}>
                  <span class="matrix-table__colhead-inner">{name}</span>
                </th>
              {/each}
            </tr>
          </thead>
          <tbody>
            {#each matrix.cells as row, i (matrix.playerIds[i] ?? i)}
              <tr
                class="matrix-table__row"
                class:matrix-table__row--you={matrix.playerIds[i] === currentPlayerId}
              >
                <th scope="row" class="matrix-table__rowhead">
                  <a href="/players/{matrix.playerIds[i]}" class="matrix-table__row-link">
                    {matrix.names[i]}
                  </a>
                  {#if matrix.playerIds[i] === currentPlayerId}
                    <span class="matrix-table__you">You</span>
                  {/if}
                </th>
                {#each row as cell, j (j)}
                  <td
                    class="matrix-table__cell"
                    class:matrix-table__cell--you={matrix.playerIds[i] === currentPlayerId ||
                      matrix.playerIds[j] === currentPlayerId}
                    title={cell === null
                      ? ''
                      : `${matrix.names[i]} vs ${matrix.names[j]}: ${cell.wins}–${cell.losses}`}
                  >
                    {#if cell === null}
                      <span class="muted">—</span>
                    {:else if cell.wins === 0 && cell.losses === 0}
                      <span class="muted">–</span>
                    {:else}
                      {cell.wins}–{cell.losses}
                    {/if}
                  </td>
                {/each}
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  {/if}
</div>

<style>
  .ranking-tab.stack {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
  }

  .ranking-toolbar {
    padding: var(--space-md) var(--space-lg);
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
  }

  .ranking-toolbar__intro {
    margin: 0;
    font-size: 0.9rem;
    line-height: 1.45;
  }

  .ranking-view-toggle {
    display: inline-flex;
    border-radius: var(--radius-sm);
    border: 1px solid var(--border);
    overflow: hidden;
    align-self: flex-start;
  }

  .ranking-view-toggle__btn {
    padding: 0.45rem 1rem;
    font-size: 0.9rem;
    font-weight: 600;
    font-family: inherit;
    border: none;
    background: transparent;
    color: var(--muted);
    cursor: pointer;
    transition:
      background var(--transition),
      color var(--transition);
  }

  .ranking-view-toggle__btn:hover {
    color: var(--fg);
    background: color-mix(in srgb, var(--fg) 6%, transparent);
  }

  .ranking-view-toggle__btn--active {
    color: var(--primary);
    background: color-mix(in srgb, var(--primary) 12%, transparent);
  }

  .ranking-tab__hint {
    margin: 0;
    padding: 0 var(--space-xs);
  }

  .matrix-hint {
    max-width: 42rem;
  }

  .ranking-tab__table-wrap {
    padding: 0;
    overflow-x: auto;
  }

  .ranking-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.95rem;
  }

  .ranking-table thead {
    border-bottom: 1px solid var(--border);
  }

  .ranking-table th {
    text-align: left;
    padding: var(--space-md) var(--space-lg);
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--muted);
    font-weight: 600;
  }

  .ranking-table td {
    padding: var(--space-md) var(--space-lg);
    vertical-align: middle;
    border-bottom: 1px solid var(--border);
  }

  .ranking-table tbody tr:last-child td {
    border-bottom: none;
  }

  .ranking-table__col-rank {
    width: 3rem;
  }

  .ranking-table__col-num {
    text-align: right;
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
  }

  .ranking-table__name {
    font-weight: 600;
    color: var(--primary);
    text-decoration: none;
  }

  .ranking-table__name:hover {
    text-decoration: underline;
  }

  .ranking-table__you-badge {
    margin-left: var(--space-sm);
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--primary);
    border: 1px solid var(--border);
    padding: 0.1rem 0.35rem;
    border-radius: var(--radius-sm);
  }

  .ranking-table__row--you {
    background: color-mix(in srgb, var(--primary) 8%, transparent);
  }

  .matrix-scroll {
    padding: 0;
    overflow: auto;
    max-width: 100%;
  }

  .matrix-table {
    border-collapse: separate;
    border-spacing: 0;
    font-size: 0.85rem;
    min-width: min(100%, 720px);
  }

  .matrix-table__corner {
    position: sticky;
    left: 0;
    top: 0;
    z-index: 3;
    background: var(--card);
    box-shadow:
      1px 0 0 var(--border),
      0 1px 0 var(--border);
    width: 7rem;
    min-width: 7rem;
  }

  .matrix-table thead th {
    position: sticky;
    top: 0;
    z-index: 1;
    padding: var(--space-sm) var(--space-xs);
    background: var(--card);
    border-bottom: 1px solid var(--border);
    vertical-align: bottom;
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--muted);
    max-width: 5.5rem;
  }

  .matrix-table__colhead {
    box-shadow: 0 1px 0 var(--border);
  }

  .matrix-table__colhead-inner {
    display: -webkit-box;
    -webkit-line-clamp: 3;
    line-clamp: 3;
    -webkit-box-orient: vertical;
    max-height: 4.5rem;
    overflow: hidden;
    line-height: 1.25;
    hyphens: auto;
    word-break: break-word;
  }

  .matrix-table__rowhead {
    position: sticky;
    left: 0;
    z-index: 2;
    padding: var(--space-sm) var(--space-md);
    text-align: left;
    font-weight: 600;
    font-size: 0.85rem;
    background: var(--card);
    border-bottom: 1px solid var(--border);
    border-right: 1px solid var(--border);
    box-shadow: 1px 0 0 var(--border);
    vertical-align: middle;
    max-width: 10rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .matrix-table__row-link {
    color: var(--primary);
    text-decoration: none;
    font-weight: 600;
  }

  .matrix-table__row-link:hover {
    text-decoration: underline;
  }

  .matrix-table__you {
    margin-left: var(--space-xs);
    font-size: 0.65rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--primary);
  }

  .matrix-table__cell {
    padding: var(--space-sm) var(--space-md);
    text-align: center;
    border-bottom: 1px solid var(--border);
    border-right: 1px solid var(--border);
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
    min-width: 3rem;
  }

  .matrix-table__cell:last-of-type {
    border-right: none;
  }

  .matrix-table__cell--you {
    background: color-mix(in srgb, var(--primary) 6%, transparent);
  }

  .matrix-table__row--you .matrix-table__rowhead {
    background: color-mix(in srgb, var(--primary) 10%, var(--card));
  }

  .matrix-table tbody tr:last-child th,
  .matrix-table tbody tr:last-child td {
    border-bottom: none;
  }
</style>
