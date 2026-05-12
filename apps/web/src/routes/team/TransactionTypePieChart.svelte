<script lang="ts">
  import { formatMoney } from '$lib/team-utils';
  import type { TeamBalance } from '$lib/team-analytics';

  interface Props {
    balance: TeamBalance;
  }
  let { balance }: Props = $props();

  const SIZE = 220;
  const cx = SIZE / 2;
  const cy = SIZE / 2;
  const r = 82;

  type Seg = {
    key: string;
    label: string;
    value: number;
    fill: string;
  };

  /** Absolute transaction volume per type (same basis as treasury breakdown). */
  const segments = $derived.by((): Seg[] => {
    const t = balance.totals;
    return [
      {
        key: 'contribution',
        label: 'Contributions',
        value: t.contributions,
        fill: 'var(--primary)',
      },
      {
        key: 'penalty_fine',
        label: 'Penalty fines',
        value: t.penaltyFines ?? 0,
        fill: 'var(--gold)',
      },
      {
        key: 'income',
        label: 'Other income',
        value: t.income,
        fill: 'var(--ok)',
      },
      {
        key: 'expense',
        label: 'Expenses',
        value: t.expenses,
        fill: 'var(--danger)',
      },
    ].filter((s) => s.value > 0);
  });

  const totalVolume = $derived(segments.reduce((sum, s) => sum + s.value, 0));

  function slicePath(startAngle: number, sweepAngle: number): string {
    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const endAngle = startAngle + sweepAngle;
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    const largeArc = sweepAngle > Math.PI ? 1 : 0;
    return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
  }

  type SliceDraw = { kind: 'circle'; seg: Seg } | { kind: 'path'; d: string; seg: Seg };

  const slices = $derived.by((): SliceDraw[] => {
    if (totalVolume <= 0) return [];
    if (segments.length === 1) {
      return [{ kind: 'circle', seg: segments[0] }];
    }
    let angle = -Math.PI / 2;
    const out: SliceDraw[] = [];
    for (const seg of segments) {
      const sweep = (seg.value / totalVolume) * 2 * Math.PI;
      out.push({ kind: 'path', d: slicePath(angle, sweep), seg });
      angle += sweep;
    }
    return out;
  });

  function pct(value: number): string {
    if (totalVolume <= 0) return '0%';
    return `${Math.round((value / totalVolume) * 1000) / 10}%`;
  }

  const ariaLabel = $derived.by(() => {
    if (totalVolume <= 0) return 'No transaction volume by type yet.';
    const parts = segments.map((s) => `${s.label} ${pct(s.value)}`);
    return `Transaction volume by type: ${parts.join(', ')}`;
  });
</script>

<div class="tx-pie">
  <h3 class="tx-pie__title muted">Volume by type</h3>
  {#if totalVolume <= 0}
    <p class="tx-pie__empty muted">No amounts yet — add transactions to see the chart.</p>
  {:else}
    <div class="tx-pie__body">
      <svg
        class="tx-pie__svg"
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        role="img"
        aria-label={ariaLabel}
      >
        <title>{ariaLabel}</title>
        {#each slices as item (item.seg.key)}
          {#if item.kind === 'circle'}
            <circle {cx} {cy} {r} fill={item.seg.fill} class="tx-pie__slice" />
          {:else}
            <path
              d={item.d}
              fill={item.seg.fill}
              class="tx-pie__slice"
              stroke="var(--card)"
              stroke-width="2"
            />
          {/if}
        {/each}
      </svg>
      <ul class="tx-pie__legend" aria-hidden="true">
        {#each segments as seg (seg.key)}
          <li class="tx-pie__legend-row">
            <span class="tx-pie__swatch" style:background={seg.fill}></span>
            <span class="tx-pie__legend-label">{seg.label}</span>
            <span class="tx-pie__legend-pct">{pct(seg.value)}</span>
            <span class="tx-pie__legend-amt">{formatMoney(seg.value)}</span>
          </li>
        {/each}
      </ul>
    </div>
  {/if}
</div>

<style>
  .tx-pie {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
    min-width: 0;
  }

  .tx-pie__title {
    margin: 0;
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    font-weight: 600;
  }

  .tx-pie__empty {
    margin: 0;
    font-size: 0.9rem;
    line-height: 1.45;
  }

  .tx-pie__body {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-lg);
  }

  .tx-pie__svg {
    flex-shrink: 0;
    filter: drop-shadow(0 4px 16px rgba(0, 0, 0, 0.35));
  }

  .tx-pie__slice {
    outline: none;
  }

  .tx-pie__legend {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
    flex: 1;
    min-width: 12rem;
    font-size: 0.85rem;
  }

  .tx-pie__legend-row {
    display: grid;
    grid-template-columns: auto 1fr auto auto;
    gap: var(--space-sm);
    align-items: center;
  }

  .tx-pie__swatch {
    width: 0.55rem;
    height: 0.55rem;
    border-radius: 2px;
    flex-shrink: 0;
  }

  .tx-pie__legend-label {
    font-weight: 600;
    color: var(--fg);
    min-width: 0;
  }

  .tx-pie__legend-pct {
    font-variant-numeric: tabular-nums;
    color: var(--muted);
    font-size: 0.8rem;
  }

  .tx-pie__legend-amt {
    font-variant-numeric: tabular-nums;
    font-weight: 600;
    text-align: right;
  }

  @media (max-width: 520px) {
    .tx-pie__body {
      flex-direction: column;
      align-items: flex-start;
    }
  }
</style>
