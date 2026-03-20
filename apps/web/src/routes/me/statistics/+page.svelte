<script lang="ts">
  import { onMount } from 'svelte';
  import { config } from '$lib/config';
  import { getAuthToken } from '$lib/auth';
  import type { PlayerStats } from '$lib/PlayerStatsOverview.svelte';
  import type { PlayStyleSummary, MatchAnalysisSummary } from './stats-types';
  import StatsOverviewTab from './StatsOverviewTab.svelte';
  import StatsMatchupsTab from './StatsMatchupsTab.svelte';
  import StatsPlayStyleTab from './StatsPlayStyleTab.svelte';

  type MePlayer = { _id: string; name: string; team: string };

  type TabId = 'overview' | 'matchups' | 'play-style' | 'results';
  type MatrixMode = 'matches' | 'games';

  const TABS: { id: TabId; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'matchups', label: 'Matchups' },
    { id: 'play-style', label: 'Play style' }, 
  ];

  let player = $state<MePlayer | null>(null);
  let playerStats = $state<PlayerStats | null>(null);
  let decksUsed = $state<{ _id: string; name: string }[]>([]);
  let filterDeckId = $state('');
  let playStyle = $state<PlayStyleSummary | null>(null);
  let matchAnalysis = $state<MatchAnalysisSummary | null>(null);
  let loading = $state(true);
  let error = $state('');
  let activeTab = $state<TabId>('overview');
  let selectedMatrixMode = $state<MatrixMode>('matches');
  let analyticsMatrixMode = $state<MatrixMode>('matches');

  const apiUrl = config.apiUrl ?? '/api';
  const token = $derived(getAuthToken());

  async function loadPlayerStats(matrixMode: MatrixMode, deckId?: string) {
    if (!player?._id) return;
    try {
      const params = new URLSearchParams();
      params.set('matrixMode', matrixMode);
      if (deckId?.trim()) params.set('deckId', deckId.trim());
      const statsRes = await fetch(
        `${apiUrl}/players/${player._id}${params.toString() ? `?${params}` : ''}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (statsRes.ok) {
        const withStats = await statsRes.json();
        playerStats = withStats?.stats ?? null;
        decksUsed = Array.isArray(withStats?.decksUsed) ? withStats.decksUsed : [];
        selectedMatrixMode = matrixMode;
      }
    } catch {
      /* ignore */
    }
  }

  async function onDeckFilterChange() {
    await loadPlayerStats(selectedMatrixMode, filterDeckId || undefined);
  }

  async function loadStatistics() {
    if (!token) {
      error = 'Not logged in.';
      loading = false;
      return;
    }
    try {
      const res = await fetch(`${apiUrl}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        error = 'Could not load profile.';
        loading = false;
        return;
      }
      const data = await res.json();
      player = data?.player ?? null;
      if (player?._id) {
        await loadPlayerStats('matches');
        const headers = { Authorization: `Bearer ${token}` };
        try {
          const [playStyleRes, matchAnalysisRes] = await Promise.all([
            fetch(`${apiUrl}/analytics/play-style/${player._id}`, { headers }),
            fetch(`${apiUrl}/analytics/matches/${player._id}?recentCount=10`, { headers }),
          ]);
          playStyle = playStyleRes.ok ? await playStyleRes.json() : null;
          matchAnalysis = matchAnalysisRes.ok ? await matchAnalysisRes.json() : null;
        } catch {
          playStyle = null;
          matchAnalysis = null;
        }
      } else {
        playerStats = null;
        playStyle = null;
        matchAnalysis = null;
      }
    } catch {
      error = 'Could not reach API.';
    } finally {
      loading = false;
    }
  }

  const recentFormSummary = $derived(
    (() => {
      const list = matchAnalysis?.recentForm ?? [];
      if (list.length === 0) return null;
      const wins = list.filter((m) => m.matchWon).length;
      return { wins, losses: list.length - wins, total: list.length };
    })()
  );

  const hasAnyStats = $derived(
    playerStats != null ||
      (playStyle != null && (playStyle.matchesAnalyzed > 0 || playStyle.gamesAnalyzed > 0)) ||
      (matchAnalysis != null &&
        (matchAnalysis.totals.matchesPlayed > 0 || (matchAnalysis.recentForm?.length ?? 0) > 0))
  );

  onMount(loadStatistics);
</script>

<svelte:head>
  <title>My statistics · Big Ink Lab</title>
</svelte:head>

<div class="page stats-page">
  <div class="card stack stats-page__card">
    <h1 class="stats-page__title">My statistics</h1>
    <p class="stats-page__intro muted">
      Your performance, play style, and matchup data in one place. Use the tabs to switch between
      categories.
    </p>

    {#if loading}
      <p class="muted">Loading…</p>
    {:else if error && !player}
      <p class="alert" role="alert">{error}</p>
    {:else if !player}
      <p class="muted">Link a player to your account to see statistics.</p>
    {:else if !hasAnyStats}
      <p class="muted">No match data yet. Play some matches to see your statistics here.</p>
    {/if}
  </div>
</div>

{#if !loading && !error && player && hasAnyStats}
  <div class="page stats-page">
    <div class="stats-page__tabs" role="tablist" aria-label="Statistics categories">
      {#each TABS as tab (tab.id)}
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === tab.id}
          aria-controls="panel-{tab.id}"
          id="tab-{tab.id}"
          class="stats-page__tab"
          class:stats-page__tab--active={activeTab === tab.id}
          onclick={() => (activeTab = tab.id)}
        >
          {tab.label}
        </button>
      {/each}
    </div>
  </div>

  <div class="stats-page__panels">
    <!-- Overview -->
    <div
      id="panel-overview"
      role="tabpanel"
      aria-labelledby="tab-overview"
      class="stats-page__panel"
      hidden={activeTab !== 'overview'}
    >
      <StatsOverviewTab
        {playerStats}
        {playStyle}
        {matchAnalysis}
        {recentFormSummary}
        playerId={player._id}
      />
    </div>

    <!-- Matchups -->
    <div
      id="panel-matchups"
      role="tabpanel"
      aria-labelledby="tab-matchups"
      class="stats-page__panel"
      hidden={activeTab !== 'matchups'}
    >
      <StatsMatchupsTab
        {playerStats}
        {decksUsed}
        bind:filterDeckId
        bind:selectedMatrixMode
        bind:analyticsMatrixMode
        {matchAnalysis}
        {onDeckFilterChange}
        onMatrixModeChange={(mode) => loadPlayerStats(mode, filterDeckId || undefined)}
      />
    </div>

    <!-- Play style -->
    <div
      id="panel-play-style"
      role="tabpanel"
      aria-labelledby="tab-play-style"
      class="stats-page__panel"
      hidden={activeTab !== 'play-style'}
    >
      <StatsPlayStyleTab {playStyle} />
    </div>
    
  </div>
{/if}

<style>
  .stats-page {
    width: 100%;
    min-width: 0;
  }

  @media (min-width: 960px) {
    .stats-page {
      max-width: min(1200px, 100%);
    }
  }

  .stats-page__card {
    width: 100%;
    min-width: 0;
    max-width: 100%;
  }

  .stats-page__title {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 700;
  }

  .stats-page__intro {
    margin: 0 0 var(--space-md) 0;
    font-size: 0.95rem;
    line-height: 1.5;
  }

  .stats-page__tabs {
    margin-top: var(--space-md);
    width: 100%;
    min-width: 0;
    max-width: 100%;
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-xs);
    padding-bottom: var(--space-md);
    border-bottom: 1px solid var(--border);
    margin-bottom: var(--space-lg);
  }

  .stats-page__tab {
    padding: var(--space-sm) var(--space-md);
    font-weight: 600;
    font-size: 1.05rem;
    color: var(--muted);
    background: none;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    transition:
      color 0.15s ease,
      background 0.15s ease;
  }

  .stats-page__tab:hover {
    color: var(--text);
    background: var(--glass-bg-strong, rgba(0, 0, 0, 0.05));
  }

  .stats-page__tab--active {
    color: var(--text);
    background: var(--glass-bg-strong, rgba(0, 0, 0, 0.08));
  }

  .stats-page__panels {
    display: flex;
    flex-direction: column;
    gap: var(--space-lg);
  }

  .stats-page__panel {
    min-width: 0;
    max-width: 100%;
    margin-bottom: var(--space-lg);

  }

  .stats-page__panel[hidden] {
    display: none;
  }

  /* Shared with tab components (scoped markup lives in child Svelte files). */
  :global(.stats-page__block) {
    min-width: 0;
  }

  :global(.stats-page__block:has(.stats-page__table--wide)) {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  :global(.stats-page__block + .stats-page__block) {
    margin-top: var(--space-lg);
    padding-top: var(--space-lg);
    border-top: 1px solid var(--border);
  }

  :global(.stats-page__subtitle) {
    margin: 0 0 var(--space-md) 0;
    font-size: 0.95rem;
    font-weight: 700;
    letter-spacing: -0.02em;
    color: var(--fg);
  }

  :global(.stats-page__hint) {
    margin: 0 0 var(--space-md) 0;
    font-size: 0.875rem;
    line-height: 1.45;
  }

  :global(.stats-page__table) {
    width: 100%;
    max-width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    font-size: 0.875rem;
    line-height: 1.35;
    border-radius: var(--radius-sm);
    overflow: hidden;
    border: 1px solid var(--border);
    background: var(--glass-bg);
  }

  :global(.stats-page__table thead th) {
    padding: var(--space-sm) var(--space-md);
    font-size: 0.65rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: var(--muted);
    background: rgba(168, 85, 247, 0.09);
    border-bottom: 1px solid var(--border);
    white-space: nowrap;
  }

  :global(.stats-page__table thead th:first-child) {
    text-align: left;
  }

  :global(.stats-page__table--wide thead th:not(:first-child)) {
    text-align: right;
  }

  :global(.stats-page__table:not(.stats-page__table--wide) thead th:not(:first-child)) {
    text-align: center;
  }

  :global(.stats-page__table tbody th),
  :global(.stats-page__table tbody td) {
    padding: var(--space-sm) var(--space-md);
    border-bottom: 1px solid var(--border);
    vertical-align: middle;
  }

  :global(.stats-page__table tbody tr:last-child th),
  :global(.stats-page__table tbody tr:last-child td) {
    border-bottom: none;
  }

  :global(.stats-page__table tbody th[scope='row']) {
    text-align: left;
    font-weight: 600;
    color: var(--fg);
  }

  :global(.stats-page__table--wide tbody td) {
    text-align: right;
    font-variant-numeric: tabular-nums;
    color: var(--fg);
  }

  :global(.stats-page__table:not(.stats-page__table--wide) tbody td) {
    text-align: center;
    font-variant-numeric: tabular-nums;
    color: var(--fg);
  }

  @media (hover: hover) {
    :global(.stats-page__table tbody tr:hover th),
    :global(.stats-page__table tbody tr:hover td) {
      background: rgba(255, 255, 255, 0.045);
    }
  }

  :global(.stats-page__row-header) {
    font-weight: 600;
  }
</style>
