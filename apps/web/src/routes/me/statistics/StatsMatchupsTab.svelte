<script lang="ts">
  import PlayerStatsOverview, { type PlayerStats } from '$lib/PlayerStatsOverview.svelte';
  import { t } from '$lib/i18n';
  import type { MatchAnalysisSummary } from './stats-types';

  type MatrixMode = 'matches' | 'games';

  let {
    playerStats,
    decksUsed,
    filterDeckId = $bindable(''),
    selectedMatrixMode = $bindable<MatrixMode>('matches'),
    analyticsMatrixMode = $bindable<MatrixMode>('matches'),
    matchAnalysis,
    onDeckFilterChange,
    onMatrixModeChange,
  }: {
    playerStats: PlayerStats | null;
    decksUsed: { _id: string; name: string }[];
    filterDeckId?: string;
    selectedMatrixMode?: MatrixMode;
    analyticsMatrixMode?: MatrixMode;
    matchAnalysis: MatchAnalysisSummary | null;
    onDeckFilterChange: () => void | Promise<void>;
    onMatrixModeChange: (mode: MatrixMode) => void | Promise<void>;
  } = $props();
</script>

{#if playerStats}
  <PlayerStatsOverview
    stats={playerStats}
    sectionTitle={$t('statistics.matchupsTab.sectionTitle')}
    decksUsed={decksUsed}
    bind:filterDeckId
    onDeckFilterChange={onDeckFilterChange}
    bind:analysisMode={selectedMatrixMode}
    onMatrixModeChange={onMatrixModeChange}
    emptyText={$t('statistics.matchupsTab.emptyMatrix')}
  />
{/if}