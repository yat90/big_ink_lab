<script lang="ts">
  import { INK_IMAGE } from '$lib/matches';

  interface MulliganRow {
    name: string;
    amount: number;
    ink?: string;
    cost?: number;
    inkwell?: boolean;
    version?: string;
    probability: number;
  }

  interface Props {
    deckSize: number;
    mulliganList: MulliganRow[];
  }

  let { deckSize, mulliganList }: Props = $props();

  type SortDir = 'asc' | 'desc';
  let sortByChance = $state<SortDir>('desc');

  const sortedList = $derived.by(() => {
    const list = [...mulliganList];
    list.sort((a, b) => {
      const diff = a.probability - b.probability;
      return sortByChance === 'desc' ? -diff : diff;
    });
    return list;
  });
</script>

<div id="panel-mulligan" role="tabpanel" aria-labelledby="tab-mulligan" class="deck-stats__panel">
  <p class="deck-stats__mulligan-intro muted">
    Probability of drawing at least one copy in your opening 7 cards (deck size: {deckSize}).
  </p>
  {#if mulliganList.length > 0}
    <div class="deck-stats__table-wrap">
      <table class="deck-stats__table deck-stats__mulligan-table">
        <thead>
          <tr>
            <th class="deck-stats__mulligan-count-th">Count</th>
            <th class="deck-stats__mulligan-ink-th">Ink</th>
            <th class="deck-stats__mulligan-cost-th">Cost</th>
            <th>Card</th>
            <th class="deck-stats__num deck-stats__th-sort" aria-sort={sortByChance === 'desc' ? 'descending' : 'ascending'}>
              <button
                type="button"
                class="deck-stats__th-sort-btn"
                onclick={() => (sortByChance = sortByChance === 'desc' ? 'asc' : 'desc')}
              >
                Chance
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          {#each sortedList as row, i (row.name + String(row.amount) + '-' + i)}
            <tr>
              <td class="deck-stats__mulligan-count">{row.amount}×</td>
              <td class="deck-stats__mulligan-ink">
                {#if row.ink && INK_IMAGE[row.ink]}
                  <img src={INK_IMAGE[row.ink]} alt="" width="24" height="24" class="deck-stats__mulligan-ink-img" aria-hidden="true" />
                {:else}
                  <span class="deck-stats__mulligan-ink-na" aria-hidden="true">—</span>
                {/if}
              </td>
              <td class="deck-stats__mulligan-cost">
                <span
                  class="deck-stats__mulligan-inkable deck-stats__mulligan-inkable--{row.inkwell ? 'inkwell' : row.cost != null ? 'cost' : 'na'}"
                  title={row.inkwell ? `Inkable, cost ${row.cost ?? '?'}` : row.cost != null ? `Cost ${row.cost} (not inkable)` : 'No cost'}
                >
                  {#if row.inkwell && row.cost != null}
                    <span class="deck-stats__mulligan-inkable-num">{row.cost}</span>
                  {:else if row.cost != null}
                    <span class="deck-stats__mulligan-inkable-num deck-stats__mulligan-inkable-num--plain">{row.cost}</span>
                  {:else}
                    <span class="deck-stats__mulligan-inkable-na" aria-hidden="true">—</span>
                  {/if}
                </span>
              </td>
              <td><div class="deck-stats__mulligan-card">{row.name}
                {#if row.version}
                  <span class="deck-stats__mulligan-version muted">{row.version}</span>
                {/if}
                </div>
              </td>
              <td class="deck-stats__num">{(row.probability * 100).toFixed(1)}%</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {:else}
    <p class="muted">No card list available. Save the deck with a valid deck list to see mulligan probabilities.</p>
  {/if}
</div>

<style>
  .deck-stats__panel {
    min-height: 2rem;
  }
  .deck-stats__mulligan-intro {
    margin-top: 0;
    margin-bottom: 0.75rem;
    font-size: 0.9rem;
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
  .deck-stats__th-sort {
    text-align: right;
  }
  .deck-stats__th-sort-btn {
    font: inherit;
    font-weight: 600;
    color: var(--muted);
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    display: inline-block;
  }
  .deck-stats__th-sort-btn:hover {
    color: var(--fg);
  }
  .deck-stats__mulligan-table th,
  .deck-stats__mulligan-table td {
    vertical-align: middle;
  }
  .deck-stats__mulligan-count {
    white-space: nowrap;
    font-weight: 600;
  }

  .deck-stats__mulligan-count-th,
  .deck-stats__mulligan-ink-th,
  .deck-stats__mulligan-cost-th {
    width: 15px;
    white-space: nowrap;
  }
  .deck-stats__mulligan-ink-img {
    width: 24px;
    height: 24px;
    object-fit: contain;
    display: block;
  }
  .deck-stats__mulligan-ink-na {
    color: var(--muted);
  }
  .deck-stats__mulligan-inkable {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    background-size: contain;
    background-repeat: no-repeat;
    background-position: center;
  }
  .deck-stats__mulligan-inkable--inkwell {
    background-image: url('/ink/inkwell.svg');
  }
  .deck-stats__mulligan-inkable--cost {
    background-image: url('/ink/inkcost.svg');
  }
  .deck-stats__mulligan-inkable-num {
    font-size: 0.7rem;
    font-weight: 700;
    color: #d4b889;
    text-shadow: 0 0 1px rgba(0, 0, 0, 0.8), 0 1px 2px rgba(0, 0, 0, 0.6);
  }
  .deck-stats__mulligan-inkable-num--plain {
    color: #d4b889;
  }
  .deck-stats__mulligan-inkable-na {
    color: var(--muted);
    font-size: 0.9rem;
  }
  .deck-stats__mulligan-card {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.35rem;
    min-height: 2.5rem;
    font-weight: 500;
  }
  .deck-stats__mulligan-version {
    font-size: 0.85rem;
  }
</style>
