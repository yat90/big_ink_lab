<script lang="ts">
  import { get } from 'svelte/store';
  import { config } from '$lib/config';
  import { STAGE_OPTIONS } from '$lib/matches';
  import MatchupStatistics from '$lib/MatchupStatistics.svelte';
  import { translate, t, locale } from '$lib/i18n';

  type GlobalStats = {
    totalMatches: number;
    matchesByStage: Record<string, number>;
    totalGames: number;
    gamesWonByStarter: number;
    gamesWonByNonStarter: number;
    starterWinRate: number;
    deckColorMatrix: Record<string, Record<string, { played: number; won: number }>>;
  };

  let stats = $state<GlobalStats | null>(null);
  let loading = $state(true);
  let error = $state('');
  type StageOption = (typeof STAGE_OPTIONS)[number];
  type MatrixMode = 'matches' | 'games';
  let selectedStages = $state<StageOption[]>([...STAGE_OPTIONS]);
  let selectedTournamentId = $state('');
  let selectedMatrixMode = $state<MatrixMode>('matches');
  type TournamentRow = { _id: string; name: string };
  let tournamentRows = $state<TournamentRow[]>([]);

  const apiUrl = config.apiUrl ?? '/api';
  const tournamentStageSelected = $derived(selectedStages.includes('Tournament'));

  const selectedTournamentLabel = $derived.by(() => {
    if (!selectedTournamentId.trim()) return '';
    return tournamentRows.find((t) => t._id === selectedTournamentId)?.name ?? '';
  });

  async function fetchTournamentRows() {
    try {
      const res = await fetch(`${apiUrl}/tournaments?limit=100&page=1`);
      if (res.ok) {
        const json = await res.json();
        const data: unknown[] = Array.isArray(json) ? json : (json?.data ?? []);
        tournamentRows = data.map((row) => {
          const r = row as Record<string, unknown>;
          return { _id: String(r._id ?? ''), name: String(r.name ?? '') };
        });
      }
    } catch {
      tournamentRows = [];
    }
  }

  async function fetchStats(
    stages: StageOption[],
    tournamentId?: string,
    matrixMode: MatrixMode = 'matches',
  ) {
    loading = true;
    error = '';
    try {
      const params = new URLSearchParams();
      if (stages.length > 0 && stages.length < STAGE_OPTIONS.length) {
        stages.forEach((s) => params.append('stage', s));
      }
      if (tournamentId?.trim()) params.set('tournamentId', tournamentId.trim());
      params.set('matrixMode', matrixMode);
      const url = `${apiUrl}/matches/stats${params.toString() ? `?${params}` : ''}`;
      const res = await fetch(url);
      if (!res.ok) {
        error = translate(get(locale), 'statistics.globalPage.loadError');
        return;
      }
      stats = await res.json();
    } catch {
      error = translate(get(locale), 'common.apiUnreachable');
    } finally {
      loading = false;
    }
  }

  function toggleStage(stage: StageOption) {
    if (selectedStages.includes(stage)) {
      selectedStages = selectedStages.filter((s) => s !== stage);
      if (stage === 'Tournament') selectedTournamentId = '';
    } else {
      selectedStages = [...selectedStages, stage].sort(
        (a, b) => STAGE_OPTIONS.indexOf(a) - STAGE_OPTIONS.indexOf(b),
      );
    }
  }

  $effect(() => {
    if (tournamentStageSelected) void fetchTournamentRows();
  });

  $effect(() => {
    fetchStats(selectedStages, selectedTournamentId || undefined, selectedMatrixMode);
  });
</script>

<svelte:head>
  <title>{$t('statistics.globalPage.pageTitle')}</title>
</svelte:head>

<div class="page">
  {#if loading}
    <div class="card">
      <div class="loading-skeleton" aria-busy="true" aria-live="polite">
        <div class="loading-skeleton__line loading-skeleton__line--title"></div>
        <div class="loading-skeleton__line loading-skeleton__line--short"></div>
        <div class="loading-skeleton__line"></div>
      </div>
      <p class="muted margin-top-md">{$t('statistics.globalPage.loading')}</p>
    </div>
  {:else if error}
    <div class="card" role="alert">
      <p class="alert">{error}</p>
      <div class="row row--sm margin-top-md">
        <a href="/me/statistics" class="btn">{$t('statistics.globalPage.myStatistics')}</a>
        <a href="/" class="btn">{$t('statistics.globalPage.backHome')}</a>
      </div>
    </div>
  {:else if stats}
    <div class="row row--between row--center-y gap-md margin-bottom-md">
      <h2 class="card__title card-title-reset">{$t('statistics.globalPage.heading')}</h2>
      <div class="row row--sm">
        <a href="/me/statistics" class="btn">{$t('statistics.globalPage.myStatistics')}</a>
        <a href="/" class="btn">{$t('statistics.globalPage.backHome')}</a>
      </div>
    </div>

    <div class="card match-stats__card match-stats__filter">
      <h3 class="match-stats__title">{$t('statistics.globalPage.filterByStage')}</h3>
      <div class="match-stats__stage-chips" role="group" aria-label={$t('statistics.globalPage.stageFilterAria')}>
        {#each STAGE_OPTIONS as stage}
          <label class="match-stats__stage-chip" class:match-stats__stage-chip--active={selectedStages.includes(stage)}>
            <input
              type="checkbox"
              checked={selectedStages.includes(stage)}
              onchange={() => toggleStage(stage)}
              class="match-stats__stage-checkbox"
              aria-label="{stage}"
            />
            <span class="match-stats__stage-label">{stage}</span>
          </label>
        {/each}
      </div>
      {#if tournamentStageSelected}
        <div class="match-stats__tournament-filter">
          <label for="filter-tournament" class="match-stats__tournament-label"
            >{$t('statistics.globalPage.tournament')}</label
          >
          <select
            id="filter-tournament"
            class="input match-stats__tournament-select"
            bind:value={selectedTournamentId}
            aria-label={$t('statistics.globalPage.filterByTournamentAria')}
          >
            <option value="">{$t('statistics.globalPage.allTournaments')}</option>
            {#each tournamentRows as t (t._id)}
              <option value={t._id}>{t.name}</option>
            {/each}
          </select>
        </div>
      {/if}
      {#if selectedStages.length < STAGE_OPTIONS.length}
        <p class="muted margin-top-sm text-sm">
          {#if selectedStages.length === 0}
            {$t('statistics.globalPage.showingForAllStages')}
          {:else}
            {$t('statistics.globalPage.showingForStages', { stages: selectedStages.join(', ') })}
          {/if}
          {#if selectedTournamentLabel}
            · {selectedTournamentLabel}
          {/if}
        </p>
      {/if}
    </div>

    <div class="match-stats">
      <div class="card match-stats__card">
        <h3 class="match-stats__title">{$t('statistics.globalPage.matchOverview')}</h3>
        <div class="match-stats__grid">
          <div class="match-stats__item">
            <span class="match-stats__value">{stats.totalMatches}</span>
            <span class="match-stats__label muted">{$t('statistics.globalPage.totalMatches')}</span>
          </div>
          <div class="match-stats__item">
            <span class="match-stats__value">{stats.totalGames}</span>
            <span class="match-stats__label muted">{$t('statistics.globalPage.totalGames')}</span>
          </div>
        </div>
      </div>

      <div class="card match-stats__card">
        <h3 class="match-stats__title">{$t('statistics.globalPage.matchesByStage')}</h3>
        <div class="match-stats__grid">
          {#each Object.entries(stats.matchesByStage) as [stage, count]}
            <div class="match-stats__item">
              <span class="match-stats__value">{count}</span>
              <span class="match-stats__label muted">{stage}</span>
            </div>
          {/each}
        </div>
      </div>

      <div class="card match-stats__card">
        <h3 class="match-stats__title">{$t('statistics.globalPage.byStartingPlayer')}</h3>
        <div class="match-stats__grid">
          <div class="match-stats__item">
            <span class="match-stats__value">{stats.gamesWonByStarter}</span>
            <span class="match-stats__label muted"
              >{$t('statistics.globalPage.gamesWonByStarter')}</span
            >
          </div>
          <div class="match-stats__item">
            <span class="match-stats__value">{stats.gamesWonByNonStarter}</span>
            <span class="match-stats__label muted"
              >{$t('statistics.globalPage.gamesWonByNonStarter')}</span
            >
          </div>
          <div class="match-stats__item">
            <span class="match-stats__value">{stats.starterWinRate}%</span>
            <span class="match-stats__label muted">{$t('statistics.globalPage.starterWinRate')}</span>
          </div>
        </div>
      </div>

      <div class="card match-stats__card match-stats__card--wide">
        <MatchupStatistics
          matrix={stats.deckColorMatrix}
          bind:analysisMode={selectedMatrixMode}
          title={$t('statistics.matrix.titleDefault')}
          emptyText={$t('statistics.globalPage.matrixEmpty')}
        />
      </div>
    </div>
  {/if}
</div>

<style>
  .match-stats {
    display: flex;
    flex-direction: column;
    gap: var(--space-lg);
  }

  .match-stats__card {
    padding: var(--space-lg);
  }

  .match-stats__filter {
    margin-bottom: 0;
  }

  .match-stats__tournament-filter {
    display: flex;
    align-items: center;
    gap: var(--space-md);
    margin-top: var(--space-md);
  }

  .match-stats__tournament-label {
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--muted);
  }

  .match-stats__tournament-select {
    min-width: 14rem;
  }

  .match-stats__stage-chips {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-sm);
  }

  .match-stats__stage-chip {
    display: inline-flex;
    align-items: center;
    gap: var(--space-xs);
    padding: 8px 14px;
    border-radius: var(--radius-full);
    border: 1px solid var(--border);
    background: var(--glass-bg);
    cursor: pointer;
    font-size: 0.9rem;
    font-weight: 600;
    transition: background var(--transition), border-color var(--transition), color var(--transition);
  }

  .match-stats__stage-chip:hover {
    background: var(--glass-bg-strong);
  }

  .match-stats__stage-chip--active {
    background: var(--ink);
    border-color: var(--ink);
    color: white;
  }

  .match-stats__stage-chip--active:hover {
    background: var(--ink-hover);
    border-color: var(--ink-hover);
    color: white;
  }

  .match-stats__stage-checkbox {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  .match-stats__stage-label {
    user-select: none;
  }

  .match-stats__card--wide {
    overflow: hidden;
  }

  .match-stats__title {
    font-size: 1rem;
    font-weight: 700;
    letter-spacing: -0.02em;
    margin: 0 0 var(--space-md);
  }

  .match-stats__grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: var(--space-lg);
  }

  .match-stats__item {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }

  .match-stats__value {
    font-size: 1.5rem;
    font-weight: 800;
    letter-spacing: -0.02em;
  }

  .match-stats__label {
    font-size: 0.85rem;
    font-weight: 500;
  }

</style>
