<script lang="ts">
  interface CurveSegment {
    ink: string;
    count: number;
    pct: number;
    start: number;
    end: number;
    color: string;
  }
  interface CurveBar {
    cost: string;
    total: number;
    segments: CurveSegment[];
  }
  interface ChartSegment {
    count: number;
    pct: number;
    start: number;
    end: number;
    color: string;
  }
  interface InkableChart {
    inkablePct: number;
    notInkablePct: number;
    gradient: string;
  }

  interface Props {
    stats: {
      inkable: { inkable: number; notInkable: number };
    };
    curveStacked: CurveBar[];
    curveTotal: number;
    curveMaxCount: number;
    curveYScale: number;
    curveYLabels: number[];
    colorsChartData: (ChartSegment & { ink: string })[];
    colorsConicGradient: string;
    inkableTotal: number;
    inkableChart: InkableChart;
    typeChartData: (ChartSegment & { type: string })[];
    typeConicGradient: string;
  }

  let {
    stats,
    curveStacked,
    curveTotal,
    curveMaxCount,
    curveYScale,
    curveYLabels,
    colorsChartData,
    colorsConicGradient,
    inkableTotal,
    inkableChart,
    typeChartData,
    typeConicGradient,
  }: Props = $props();
</script>

<div id="panel-card" role="tabpanel" aria-labelledby="tab-card" class="deck-stats__panel">
  <!-- Cost curve -->
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

  <!-- Pie charts -->
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

<style>
  .deck-stats__panel {
    min-height: 2rem;
  }
  .deck-stats__chart {
    gap: 0.75rem;
  }
  .deck-stats__chart--curve {
    margin-bottom: 1.5rem;
  }
  .deck-stats__section-title {
    font-size: 1.1rem;
    font-weight: 700;
    margin: 0.5rem 0 0 0;
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
  .deck-stats__pie {
    width: 10rem;
    height: 10rem;
    border-radius: 50%;
    flex-shrink: 0;
  }
</style>
