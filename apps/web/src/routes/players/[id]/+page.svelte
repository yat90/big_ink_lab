<script lang="ts">
  import AppBanner from '$lib/components/ui/AppBanner.svelte';
  import AppButton from '$lib/components/ui/AppButton.svelte';
  import AppCard from '$lib/components/ui/AppCard.svelte';
  import { config } from '$lib/config';
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { t } from '$lib/i18n';
  import PlayerStatsOverview, { type PlayerStats } from '$lib/components/player/PlayerStatsOverview.svelte';
  import IconEdit from '../../../lib/icons/IconEdit.svelte';
  import { dicebearAvatarUrl } from '$lib/dicebearFunEmojiAvatar';

  type DeckUsed = { _id: string; name: string };
  type PlayerWithStats = {
    _id: string;
    name: string;
    realName?: string;
    team: string;
    isGuest?: boolean;
    hasLinkedAccount?: boolean;
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
    <AppCard>
      <div class="loading-skeleton" aria-busy="true" aria-live="polite">
        <div class="loading-skeleton__line loading-skeleton__line--title"></div>
        <div class="loading-skeleton__line loading-skeleton__line--short"></div>
        <div class="loading-skeleton__line"></div>
      </div>
      <p class="muted" style="margin-top: var(--space-md);">Loading player…</p>
    </AppCard>
  {:else if error || !player}
    <AppCard role="alert">
      <AppBanner variant="danger" message={error || 'Player not found'} />
    </AppCard>
  {:else}
    <div class="player-overview">
      <AppCard className="stack player-overview__header">
        <div
          class="row"
          style="justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: var(--space-md);"
        >
          <div class="player-overview__identity">
            <img
              class="player-overview__avatar"
              src={dicebearAvatarUrl(player._id, { size: 128 })}
              alt=""
              width="64"
              height="64"
              loading="eager"
              decoding="async"
            />
            <div class="player-overview__title-block">
              <h1 class="card__title" style="margin: 0;">{player.name}</h1>
            {#if player.realName}
              <p class="card__sub muted" style="margin-top: var(--space-xs);">{player.realName}</p>
            {/if}
            {#if player.isGuest}
              <p class="card__sub muted" style="margin-top: var(--space-xs);">
                Guest profile (no login)
              </p>
            {:else if player.hasLinkedAccount}
              <p class="card__sub muted" style="margin-top: var(--space-xs);">
                Roster — linked to a user account
              </p>
            {/if}
            {#if player.team}
              <p class="card__sub" style="margin-top: var(--space-xs);">{player.team}</p>
            {/if}
            </div>
          </div>
          <div class="row" style="gap: var(--space-sm);">
            <AppButton href="/players/{player._id}/edit" icon={true}>
              <IconEdit size={16} className="icon-inline" />
              <span style="margin-left: var(--space-xs);">Edit</span>
            </AppButton>
          </div>
        </div>
      </AppCard>

      {#if player.stats}
        <PlayerStatsOverview
          stats={player.stats}
          sectionTitle={$t('statistics.playerPublic.sectionTitle')}
          {decksUsed}
          bind:filterDeckId
          {onDeckFilterChange}
          bind:analysisMode={selectedMatrixMode}
          {onMatrixModeChange}
          emptyText={$t('statistics.playerPublic.emptyMatchupFilter')}
        />
      {:else}
        <AppCard>
          <p class="card__sub muted">{$t('statistics.playerPublic.noMatchDataYet')}</p>
        </AppCard>
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

  :global(.player-overview__header) {
    padding: var(--space-lg);
  }

  .player-overview__identity {
    display: flex;
    align-items: flex-start;
    gap: var(--space-md);
    min-width: 0;
  }

  .player-overview__title-block {
    min-width: 0;
  }

  .player-overview__avatar {
    flex-shrink: 0;
    width: 4rem;
    height: 4rem;
    border-radius: var(--radius-full);
    object-fit: cover;
    border: 1px solid var(--border-ui);
  }
</style>
