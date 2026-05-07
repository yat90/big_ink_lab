<script lang="ts">
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import { config } from '$lib/config';
  import { getAuthToken } from '$lib/auth';
  import { translate, t, locale } from '$lib/i18n';
  import type { PlayerStats } from '$lib/PlayerStatsOverview.svelte';
  import type { PlayStyleSummary, MatchAnalysisSummary } from './stats-types';
  import StatsOverviewTab from './StatsOverviewTab.svelte';
  import StatsMatchupsTab from './StatsMatchupsTab.svelte';
  import StatsPlayStyleTab from './StatsPlayStyleTab.svelte';

  type MePlayer = { _id: string; name: string; team: string };

  type TabId = 'overview' | 'matchups' | 'play-style' | 'results';
  type MatrixMode = 'matches' | 'games';

  const tabs = $derived.by((): { id: TabId; label: string }[] => {
    const loc = get(locale);
    return [
      { id: 'overview', label: translate(loc, 'statistics.myPage.tabOverview') },
      { id: 'matchups', label: translate(loc, 'statistics.myPage.tabMatchups') },
      { id: 'play-style', label: translate(loc, 'statistics.myPage.tabPlayStyle') },
    ];
  });

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
      error = translate(get(locale), 'statistics.myPage.notLoggedIn');
      loading = false;
      return;
    }
    try {
      const res = await fetch(`${apiUrl}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        error = translate(get(locale), 'statistics.myPage.loadProfileError');
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
      error = translate(get(locale), 'common.apiUnreachable');
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
  <title>{$t('statistics.myPage.pageTitle')}</title>
</svelte:head>

<div class="page stats-page">
  <div class="card stack stats-page__card">
    <h1 class="stats-page__title">{$t('statistics.myPage.title')}</h1>
    <p class="stats-page__intro muted">
      {$t('statistics.myPage.intro')}
    </p>

    {#if loading}
      <p class="muted">{$t('statistics.myPage.loading')}</p>
    {:else if error && !player}
      <p class="alert" role="alert">{error}</p>
    {:else if !player}
      <p class="muted">{$t('statistics.myPage.linkPlayerHint')}</p>
    {:else if !hasAnyStats}
      <p class="muted">{$t('statistics.myPage.noMatchDataYet')}</p>
    {/if}
  </div>
</div>

{#if !loading && !error && player && hasAnyStats}
  <div class="page stats-page">
    <div class="app-tabs" role="tablist" aria-label={$t('statistics.myPage.tablistAria')}>
      {#each tabs as tab (tab.id)}
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === tab.id}
          aria-controls="panel-{tab.id}"
          id="tab-{tab.id}"
          class="app-tabs__tab"
          class:app-tabs__tab--active={activeTab === tab.id}
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
