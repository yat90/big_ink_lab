<script lang="ts">
  import DeckStatsCardTab from './DeckStatsCardTab.svelte';
  import DeckStatsMatchesTab from './DeckStatsMatchesTab.svelte';
  import DeckStatsMulliganTab from './DeckStatsMulliganTab.svelte';

  type DeckStatsByOpponent = { played: number; won: number };
  export type DeckStats = {
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

  let {
    stats = null,
    loading = false,
    error = '',
    showBackLink = false,
    deckId = '',
  }: {
    stats?: DeckStats | null;
    loading?: boolean;
    error?: string;
    showBackLink?: boolean;
    deckId?: string;
  } = $props();

  let activeTab = $state<TabId>('card');

  const matrixRows = $derived.by(() => {
    if (!stats) return [];
    const entries = Object.entries(stats.byOpponentDeckColor).filter(([, v]) => v.played > 0);
    return entries.sort((a, b) => b[1].played - a[1].played);
  });

  const INK_ORDER = ['Amber', 'Amethyst', 'Emerald', 'Ruby', 'Sapphire', 'Steel'];
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
  const curveYScale = 2;
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
  const typeConicGradient = $derived.by(() =>
    typeChartData.map((d) => `${d.color} ${d.start}% ${d.end}%`).join(', '),
  );

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

  const deckSize = $derived(stats?.cardList?.reduce((s, c) => s + c.amount, 0) ?? 0);
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
    {#if activeTab === 'card' && stats}
      <DeckStatsCardTab
        stats={stats}
        curveStacked={curveStacked}
        curveTotal={curveTotal}
        curveMaxCount={curveMaxCount}
        curveYScale={curveYScale}
        curveYLabels={curveYLabels}
        colorsChartData={colorsChartData}
        colorsConicGradient={colorsConicGradient}
        inkableTotal={inkableTotal}
        inkableChart={inkableChart}
        typeChartData={typeChartData}
        typeConicGradient={typeConicGradient}
      />
    {:else if activeTab === 'matches' && stats}
      <DeckStatsMatchesTab stats={stats} matrixRows={matrixRows} />
    {:else if activeTab === 'mulligan' && stats}
      <DeckStatsMulliganTab deckSize={deckSize} mulliganList={mulliganList} />
    {/if}
  </div>
{/if}

{#if showBackLink && deckId}
  <a href="/decks/{deckId}" class="btn btn--primary">Back to deck</a>
{/if}

<style>
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
  .deck-stats__summary {
    gap: 1rem;
  }
</style>
