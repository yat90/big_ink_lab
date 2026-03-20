<script lang="ts">
  import PlayerStatsOverview, { type PlayerStats } from '$lib/PlayerStatsOverview.svelte';
  import MatchupStatistics from '$lib/MatchupStatistics.svelte';
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
    sectionTitle="Deck color matchups"
    decksUsed={decksUsed}
    bind:filterDeckId
    onDeckFilterChange={onDeckFilterChange}
    bind:analysisMode={selectedMatrixMode}
    onMatrixModeChange={onMatrixModeChange}
    emptyText="No matchup data yet."
  />
{/if}