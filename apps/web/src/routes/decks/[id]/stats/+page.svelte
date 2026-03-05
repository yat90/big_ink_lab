<script lang="ts">
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { config } from '$lib/config';
  import { INK_IMAGE } from '$lib/matches';
  import InkIcons from '$lib/InkIcons.svelte';

  type DeckStatsByOpponent = { played: number; won: number };
  type DeckStats = {
    deckColor: string | null;
    totalMatches: number;
    wins: number;
    losses: number;
    winRate: number | null;
    byOpponentDeckColor: Record<string, DeckStatsByOpponent>;
    curve: Record<string, number>;
    curveByInk: Record<string, Record<string, number>>;
    byType: Record<string, number>;
    inkable: { inkable: number; notInkable: number };
    byInk: Record<string, number>;
    cardList: {
      name: string;
      amount: number;
      ink?: string;
      cost?: number;
      inkwell?: boolean;
      version?: string;
    }[];
  };

  type TabId = 'card' | 'matches' | 'mulligan';
  let activeTab = $state<TabId>('card');

  const id = $page.params.id;
  const apiUrl = config.apiUrl ?? '/api';

  let stats = $state<DeckStats | null>(null);
  let loading = $state(true);
  let error = $state('');

  onMount(async () => {
    try {
      const res = await fetch(`${apiUrl}/decks/${id}/stats` );
      if (!res.ok) {
        error = res.status === 404 ? 'Deck not found' : 'Could not load statistics';
        loading = false;
        return;
      }
      stats = await res.json();
    } catch {
      error = 'Could not load statistics.';
    } finally {
      loading = false;
    }
  });

  const matrixRows = $derived.by(() => {
    if (!stats) return [];
    const entries = Object.entries(stats.byOpponentDeckColor).filter(([, v]) => v.played > 0);
    return entries.sort((a, b) => b[1].played - a[1].played);
  });

  const INK_ORDER = ['Amber', 'Amethyst', 'Emerald', 'Ruby', 'Sapphire', 'Steel'];
  const inkRows = $derived.by(() => {
    if (!stats?.byInk) return [];
    return INK_ORDER.filter((ink) => (stats!.byInk[ink] ?? 0) > 0).map((ink) => ({
      ink,
      count: stats!.byInk[ink],
      imgSrc: INK_IMAGE[ink],
    }));
  });

  const CURVE_ORDER = ['0', '1', '2', '3', '4', '5', '6', '7', '8+'];
  const INK_CHART_COLORS: Record<string, string> = {
    Amber: '#f59e0b',
    Amethyst: '#7c3aed',
    Emerald: '#10b981',
    Ruby: '#ef4444',
    Sapphire: '#06b6d4',
    Steel: '#64748b',
    Other: '#475569',
  };
  const curveBars = $derived.by(() => {
    if (!stats?.curve) return [];
    const max = Math.max(1, ...Object.values(stats.curve));
    return CURVE_ORDER.map((cost) => ({
      cost,
      count: stats!.curve[cost] ?? 0,
      pct: max > 0 ? ((stats!.curve[cost] ?? 0) / max) * 100 : 0,
    }));
  });
  const curveTotal = $derived(curveBars.reduce((s, b) => s + b.count, 0));

  /** Stacked curve: for each cost, list of { ink, count, color } in INK_ORDER. */
  const curveStacked = $derived.by(() => {
    const byInk = stats?.curveByInk;
    if (!byInk) return [];
    return CURVE_ORDER.map((cost) => {
      const segs = (byInk[cost] ?? {}) as Record<string, number>;
      const total = Object.values(segs).reduce((a, b) => a + b, 0);
      let acc = 0;
      const segments = INK_ORDER.filter((ink) => (segs[ink] ?? 0) > 0).map((ink) => {
        const count = segs[ink] ?? 0;
        const pct = total > 0 ? (count / total) * 100 : 0;
        const start = acc;
        acc += pct;
        return { ink, count, pct, start, end: acc, color: INK_CHART_COLORS[ink] ?? INK_CHART_COLORS.Other };
      });
      return { cost, total, segments };
    });
  });
  const curveMaxCount = $derived(Math.max(1, ...curveStacked.map((b) => b.total)));
  const curveYScale = 2; // grid step for y-axis labels (0, 2, 4, ...)
  const curveYLabels = $derived.by(() => {
    const max = curveMaxCount;
    const step = curveYScale;
    const top = Math.ceil(max / step) * step || step;
    const count = Math.floor(top / step) + 1;
    return Array.from({ length: count }, (_, i) => top - i * step);
  });

  const typeColors: Record<string, string> = {
    Character: '#a855f7',
    Action: '#dc2626',
    Song: '#eab308',
    Item: '#22c55e',
    Location: '#0ea5e9',
    Other: '#64748b',
  };
  const typeChartData = $derived.by(() => {
    if (!stats?.byType) return [];
    const total = Object.values(stats.byType).reduce((a, b) => a + b, 0);
    if (total === 0) return [];
    let acc = 0;
    return Object.entries(stats.byType)
      .filter(([, n]) => n > 0)
      .map(([type, count]) => {
        const pct = (count / total) * 100;
        const start = acc;
        acc += pct;
        return { type, count, pct, start, end: acc, color: typeColors[type] ?? '#94a3b8' };
      });
  });
  const typeConicGradient = $derived.by(() => {
    return typeChartData
      .map((d) => `${d.color} ${d.start}% ${d.end}%`)
      .join(', ');
  });

  /** Colors pie (byInk) for Card tab. */
  const colorsChartData = $derived.by(() => {
    if (!stats?.byInk) return [];
    const total = Object.values(stats.byInk).reduce((a, b) => a + b, 0);
    if (total === 0) return [];
    let acc = 0;
    return INK_ORDER.filter((ink) => (stats!.byInk[ink] ?? 0) > 0).map((ink) => {
      const count = stats!.byInk[ink] ?? 0;
      const pct = (count / total) * 100;
      const start = acc;
      acc += pct;
      return { ink, count, pct, start, end: acc, color: INK_CHART_COLORS[ink] ?? '#94a3b8' };
    });
  });
  const colorsConicGradient = $derived.by(() =>
    colorsChartData.map((d) => `${d.color} ${d.start}% ${d.end}%`).join(', '),
  );

  const inkableTotal = $derived.by(() => {
    if (!stats?.inkable) return 0;
    return stats.inkable.inkable + stats.inkable.notInkable;
  });
  const inkableChart = $derived.by(() => {
    if (!stats?.inkable || inkableTotal === 0)
      return { inkablePct: 0, notInkablePct: 0, gradient: 'var(--muted) 0% 100%' };
    const inkablePct = (stats.inkable.inkable / inkableTotal) * 100;
    const notInkablePct = (stats.inkable.notInkable / inkableTotal) * 100;
    const gradient = `var(--ok) 0% ${inkablePct}%, var(--muted) ${inkablePct}% 100%`;
    return { inkablePct, notInkablePct, gradient };
  });

  /** Binomial C(n,k) = number of ways to choose k from n. */
  function binom(n: number, k: number): number {
    if (k > n || k < 0) return 0;
    if (k === 0) return 1;
    let num = 1;
    let den = 1;
    for (let i = 0; i < k; i++) {
      num *= n - i;
      den *= i + 1;
    }
    return Math.round(num / den);
  }

  const deckSize = $derived(
    stats?.cardList?.reduce((s, c) => s + c.amount, 0) ?? 0,
  );
  const MULLIGAN_DRAW = 7;
  const mulliganList = $derived.by(() => {
    const list = stats?.cardList ?? [];
    if (list.length === 0 || deckSize < MULLIGAN_DRAW) return [];
    const cTotal = binom(deckSize, MULLIGAN_DRAW);
    if (cTotal === 0) return list.map((c) => ({ ...c, probability: 1 }));
    return list.map((card) => {
      const { amount } = card;
      const without = binom(deckSize - amount, MULLIGAN_DRAW);
      const pNone = without / cTotal;
      const probability = Math.min(1, Math.max(0, 1 - pNone));
      return { ...card, probability };
    });
  });
</script>

<div class="page">
  <div class="card stack">
    <h1 class="deck-stats__title">Deck statistics</h1>

    {#if loading}
      <p class="muted">Loading…</p>
    {:else if error}
      <p class="deck-stats__error">{error}</p>
    {:else if stats}
      <div class="deck-stats__tabs" role="tablist" aria-label="Deck statistics sections">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'card'}
          aria-controls="panel-card"
          id="tab-card"
          class="deck-stats__tab"
          class:deck-stats__tab--active={activeTab === 'card'}
          onclick={() => (activeTab = 'card')}
        >
          Card
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'matches'}
          aria-controls="panel-matches"
          id="tab-matches"
          class="deck-stats__tab"
          class:deck-stats__tab--active={activeTab === 'matches'}
          onclick={() => (activeTab = 'matches')}
        >
          Matches
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'mulligan'}
          aria-controls="panel-mulligan"
          id="tab-mulligan"
          class="deck-stats__tab"
          class:deck-stats__tab--active={activeTab === 'mulligan'}
          onclick={() => (activeTab = 'mulligan')}
        >
          Mulligan
        </button>
      </div>

      <div class="deck-stats__summary stack">
        <!-- Card tab -->
        {#if activeTab === 'card'}
          <div id="panel-card" role="tabpanel" aria-labelledby="tab-card" class="deck-stats__panel">
            <!-- Cost curve: vertical stacked bar chart with axes -->
            {#if curveTotal > 0}
              {@const yMax = Math.ceil(curveMaxCount / curveYScale) * curveYScale || curveYScale}
              <section class="deck-stats__chart deck-stats__chart--curve" aria-label="Cost curve by ink cost">
                <h2 class="deck-stats__section-title">Cost curve</h2>
                <div class="deck-stats__curve-chart">
                  <div class="deck-stats__curve-y-axis" aria-hidden="true">
                    {#each curveYLabels as val (val)}
                      <span class="deck-stats__curve-y-tick">{val}</span>
                    {/each}
                  </div>
                  <div class="deck-stats__curve-main">
                    <div class="deck-stats__curve-bars-wrap">
                      <div class="deck-stats__curve-bars" style="--curve-max: {yMax};">
                        {#each curveStacked as bar (bar.cost)}
                          <div class="deck-stats__curve-col" title="Cost {bar.cost}: {bar.total} cards">
                            <div
                              class="deck-stats__curve-stack"
                              style="height: {(bar.total / yMax) * 100}%"
                              role="img"
                              aria-label="Cost {bar.cost}: {bar.total} cards"
                            >
                              {#each bar.segments as seg (seg.ink)}
                                <div
                                  class="deck-stats__curve-segment"
                                  style="height: {seg.pct}%; background: {seg.color};"
                                  title="{seg.ink}: {seg.count}"
                                ></div>
                              {/each}
                            </div>
                          </div>
                        {/each}
                      </div>
                    </div>
                    <div class="deck-stats__curve-x-axis" aria-hidden="true">
                      {#each curveStacked as bar (bar.cost)}
                        <span class="deck-stats__curve-x-tick">
                          <span class="deck-stats__curve-x-cost">{bar.cost}</span>
                          <span class="deck-stats__curve-x-meta">{bar.total} ({curveTotal > 0 ? (bar.total / curveTotal * 100).toFixed(0) : 0}%)</span>
                        </span>
                      {/each}
                    </div>
                  </div>
                </div>
              </section>
            {/if}

            <!-- Three pie charts in a row: Colors, Inkable, Card types -->
            <section class="deck-stats__pies-section" aria-label="Deck composition charts">
              <h2 class="deck-stats__section-title deck-stats__pies-section-title">Deck composition</h2>
              <div class="deck-stats__pies-row">
                {#if colorsChartData.length > 0}
                  <div class="deck-stats__pie-block" role="group" aria-labelledby="pie-label-colors">
                    <span id="pie-label-colors" class="deck-stats__pie-label">Colors</span>
                    <div
                      class="deck-stats__pie deck-stats__pie--bordered"
                      style="background: conic-gradient({colorsConicGradient})"
                      role="img"
                      aria-label="Deck colors distribution"
                    ></div>
                    <ul class="deck-stats__pie-legend" aria-hidden="true">
                      {#each colorsChartData as d (d.ink)}
                        <li>
                          <span class="deck-stats__pie-legend-dot" style="background: {d.color}"></span>
                          <span>{d.ink}: {d.pct.toFixed(1)}% ({d.count})</span>
                        </li>
                      {/each}
                    </ul>
                  </div>
                {/if}
                {#if inkableTotal > 0}
                  <div class="deck-stats__pie-block" role="group" aria-labelledby="pie-label-inkable">
                    <span id="pie-label-inkable" class="deck-stats__pie-label">Inkable</span>
                    <div
                      class="deck-stats__pie deck-stats__pie--bordered"
                      style="background: conic-gradient({inkableChart.gradient})"
                      role="img"
                      aria-label="Inkable vs not inkable"
                    ></div>
                    <ul class="deck-stats__pie-legend" aria-hidden="true">
                      <li>
                        <span class="deck-stats__pie-legend-dot" style="background: var(--ok)"></span>
                        <span>Inkable: {inkableChart.inkablePct.toFixed(1)}% ({stats.inkable.inkable})</span>
                      </li>
                      <li>
                        <span class="deck-stats__pie-legend-dot" style="background: var(--muted)"></span>
                        <span>Not inkable: {inkableChart.notInkablePct.toFixed(1)}% ({stats.inkable.notInkable})</span>
                      </li>
                    </ul>
                  </div>
                {/if}
                {#if typeChartData.length > 0}
                  <div class="deck-stats__pie-block" role="group" aria-labelledby="pie-label-types">
                    <span id="pie-label-types" class="deck-stats__pie-label">Card types</span>
                    <div
                      class="deck-stats__pie deck-stats__pie--bordered"
                      style="background: conic-gradient({typeConicGradient})"
                      role="img"
                      aria-label="Card types distribution"
                    ></div>
                    <ul class="deck-stats__pie-legend" aria-hidden="true">
                      {#each typeChartData as d (d.type)}
                        <li>
                          <span class="deck-stats__pie-legend-dot" style="background: {d.color}"></span>
                          <span>{d.type}: {d.pct.toFixed(1)}% ({d.count})</span>
                        </li>
                      {/each}
                    </ul>
                  </div>
                {/if}
              </div>
            </section>
          </div>
        {/if}

        <!-- Matches tab -->
        {#if activeTab === 'matches'}
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
        {/if}

        <!-- Mulligan tab -->
        {#if activeTab === 'mulligan'}
          <div id="panel-mulligan" role="tabpanel" aria-labelledby="tab-mulligan" class="deck-stats__panel">
            <p class="deck-stats__mulligan-intro muted">
              Probability of drawing at least one copy in your opening 7 cards (deck size: {deckSize}).
            </p>
            {#if mulliganList.length > 0}
              <div class="deck-stats__table-wrap">
                <table class="deck-stats__table deck-stats__mulligan-table">
                  <thead>
                    <tr>
                      <th class="deck-stats__mulligan-count">Count</th>
                      <th class="deck-stats__mulligan-ink-th">Ink</th>
                      <th class="deck-stats__mulligan-cost-th">Cost</th>
                      <th>Card</th>
                      <th class="deck-stats__num">P(draw ≥1 in 7)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {#each mulliganList as row (row.name + String(row.amount))}
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
                        <td class="deck-stats__mulligan-card">
                          <span class="deck-stats__mulligan-name">{row.name}</span>
                          {#if row.version}
                            <span class="deck-stats__mulligan-version muted">{row.version}</span>
                          {/if}
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
        {/if}
      </div>
    {/if}

    <a href="/decks/{id}" class="btn btn--primary">Back to deck</a>
  </div>
</div>

<style>
  .deck-stats__title {
    margin-top: 0;
    margin-bottom: var(--space-sm);
    font-size: 1.5rem;
    font-weight: 800;
  }
  .deck-stats__error {
    color: var(--danger);
  }

  .deck-stats__tabs {
    display: flex;
    gap: 0;
    margin-bottom: 1rem;
    border-bottom: 1px solid var(--border);
  }
  .deck-stats__tab {
    padding: 0.5rem 1rem;
    font-size: 0.95rem;
    font-weight: 600;
    color: var(--muted);
    background: none;
    border: none;
    border-bottom: 2px solid transparent;
    cursor: pointer;
    margin-bottom: -1px;
    transition: color var(--transition), border-color var(--transition);
  }
  .deck-stats__tab:hover {
    color: var(--fg);
  }
  .deck-stats__tab--active {
    color: var(--primary);
    border-bottom-color: var(--primary);
  }
  .deck-stats__panel {
    min-height: 2rem;
  }

  .deck-stats__summary {
    gap: 1rem;
  }

  .deck-stats__mulligan-intro {
    margin-top: 0;
    margin-bottom: 0.75rem;
    font-size: 0.9rem;
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
  .deck-stats__section-title {
    font-size: 1.1rem;
    font-weight: 700;
    margin: 0.5rem 0 0 0;
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

  .deck-stats__chart {
    gap: 0.75rem;
  }

  .deck-stats__chart--curve {
    margin-bottom: 1.5rem;
  }

  .deck-stats__curve-chart {
    display: flex;
    flex-direction: row;
    align-items: stretch;
    gap: 0.5rem;
  }
  .deck-stats__curve-main {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  .deck-stats__curve-y-axis {
    display: flex;
    flex-direction: column-reverse;
    justify-content: space-between;
    height: 8rem;
    padding-right: 0.5rem;
    font-size: 0.75rem;
    color: var(--muted);
    text-align: right;
  }
  .deck-stats__curve-y-tick {
    line-height: 1;
  }
  .deck-stats__curve-bars-wrap {
    display: flex;
    align-items: flex-end;
    min-height: 8rem;
    padding: 0 0.25rem;
  }
  .deck-stats__curve-bars {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 0.25rem;
    width: 100%;
    height: 8rem;
  }
  .deck-stats__curve-col {
    flex: 1;
    min-width: 0;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
  }
  .deck-stats__curve-stack {
    width: 100%;
    min-height: 2px;
    display: flex;
    flex-direction: column-reverse;
    border-radius: var(--radius-sm) var(--radius-sm) 0 0;
    overflow: hidden;
  }
  .deck-stats__curve-segment {
    min-height: 2px;
    width: 100%;
  }
  .deck-stats__curve-x-axis {
    display: flex;
    justify-content: space-between;
    gap: 0.25rem;
    font-size: 0.8rem;
    color: var(--muted);
    text-align: center;
  }
  .deck-stats__curve-x-tick {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }
  .deck-stats__curve-x-cost {
    font-weight: 600;
    color: var(--fg);
  }
  .deck-stats__curve-x-meta {
    font-size: 0.7rem;
    color: var(--muted);
  }

  .deck-stats__pies-section {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  .deck-stats__pies-section-title {
    margin-bottom: 0;
  }
  .deck-stats__pies-row {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    gap: 2rem;
  }
  .deck-stats__pie-block {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
  }
  .deck-stats__pie-label {
    display: block;
    font-size: 1rem;
    font-weight: 700;
    color: var(--fg);
    text-align: center;
    letter-spacing: 0.02em;
  }
  .deck-stats__pie--bordered {
    border: 2px solid rgba(255, 255, 255, 0.25);
    box-sizing: border-box;
  }
  .deck-stats__pie-legend {
    list-style: none;
    margin: 0;
    padding: 0;
    font-size: 0.8rem;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  .deck-stats__pie-legend li {
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }
  .deck-stats__pie-legend-dot {
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 50%;
    flex-shrink: 0;
  }

  /* Mulligan table: card info like deck details */
  .deck-stats__mulligan-count {
    white-space: nowrap;
    font-weight: 600;
  }
  .deck-stats__mulligan-ink-th,
  .deck-stats__mulligan-cost-th {
    width: 1%;
    white-space: nowrap;
  }
  .deck-stats__mulligan-ink {
    vertical-align: middle;
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
  .deck-stats__mulligan-cost {
    vertical-align: middle;
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
    align-items: baseline;
    gap: 0.35rem;
  }
  .deck-stats__mulligan-name {
    font-weight: 500;
  }
  .deck-stats__mulligan-version {
    font-size: 0.85rem;
  }

  .deck-stats__pie {
    width: 10rem;
    height: 10rem;
    border-radius: 50%;
    flex-shrink: 0;
  }
</style>
