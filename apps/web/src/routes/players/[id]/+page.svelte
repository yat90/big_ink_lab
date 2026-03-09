<script lang="ts">
  import { config } from '$lib/config';
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import PlayerStatsOverview, { type PlayerStats } from '$lib/PlayerStatsOverview.svelte';
  import IconEdit from '../../../lib/icons/IconEdit.svelte';

  type DeckUsed = { _id: string; name: string };
  type PlayerWithStats = {
    _id: string;
    name: string;
    team: string;
    stats?: PlayerStats;
    decksUsed?: DeckUsed[];
  };

  const id = $page.params.id;
  let player = $state<PlayerWithStats | null>(null);
  let loading = $state(true);
  let error = $state('');
  let filterDeckId = $state('');
  type MatrixMode = 'matches' | 'games';
  let selectedMatrixMode = $state<MatrixMode>('matches');

  const apiUrl = config.apiUrl ?? '/api';
  const decksUsed = $derived(player?.decksUsed ?? []);

  async function loadPlayer(deckId?: string, matrixMode: MatrixMode = 'matches') {
    loading = true;
    error = '';
    try {
      const params = new URLSearchParams();
      if (deckId?.trim()) params.set('deckId', deckId.trim());
      params.set('matrixMode', matrixMode);
      const url = `${apiUrl}/players/${id}${params.toString() ? `?${params.toString()}` : ''}`;
      const res = await fetch(url);
      if (!res.ok) {
        error = 'Player not found';
        return;
      }
      player = await res.json();
    } catch {
      error = 'Could not load player.';
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    loadPlayer(filterDeckId || undefined, selectedMatrixMode);
  });

  async function onDeckFilterChange() {
    await loadPlayer(filterDeckId || undefined, selectedMatrixMode);
  }

  async function onMatrixModeChange(mode: MatrixMode) {
    selectedMatrixMode = mode;
    await loadPlayer(filterDeckId || undefined, selectedMatrixMode);
  }
</script>

<svelte:head>
  <title>{player?.name ?? 'Player'} · Big Ink Lab</title>
</svelte:head>

<div class="page page--player">
  {#if loading}
    <div class="card">
      <div class="loading-skeleton" aria-busy="true" aria-live="polite">
        <div class="loading-skeleton__line loading-skeleton__line--title"></div>
        <div class="loading-skeleton__line loading-skeleton__line--short"></div>
        <div class="loading-skeleton__line"></div>
      </div>
      <p class="muted" style="margin-top: var(--space-md);">Loading player…</p>
    </div>
  {:else if error || !player}
    <div class="card" role="alert">
      <p class="alert">{error || 'Player not found'}</p>
    </div>
  {:else}
    <div class="player-overview">
      <div class="card stack player-overview__header">
        <div
          class="row"
          style="justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: var(--space-md);"
        >
          <div>
            <h1 class="card__title" style="margin: 0;">{player.name}</h1>
            {#if player.team}
              <p class="card__sub" style="margin-top: var(--space-xs);">{player.team}</p>
            {/if}
          </div>
          <div class="row" style="gap: var(--space-sm);">
            <a href="/players/{player._id}/edit" class="btn">
              <IconEdit size={16} className="icon-inline" />
              <span style="margin-left: var(--space-xs);">Edit</span>
            </a>
          </div>
        </div>
      </div>

      {#if player.stats}
        <PlayerStatsOverview
          stats={player.stats}
          sectionTitle="Game statistics"
          decksUsed={decksUsed}
          bind:filterDeckId
          onDeckFilterChange={onDeckFilterChange}
          bind:analysisMode={selectedMatrixMode}
          onMatrixModeChange={onMatrixModeChange}
          emptyText="No matchup data found for this player and filter combination."
        />
      {:else}
        <div class="card">
          <p class="card__sub muted">No match data yet. Play some matches to see statistics.</p>
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  @media (min-width: 1024px) {
    :global(.page.page--player) {
      max-width: 1200px;
    }
  }

  .player-overview {
    display: flex;
    flex-direction: column;
    gap: var(--space-lg);
  }

  .player-overview__header {
    padding: var(--space-lg);
  }
</style>
