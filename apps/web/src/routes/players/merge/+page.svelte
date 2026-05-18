<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { authMe } from '$lib/me';
  import { postJson, ApiError } from '$lib/api-client';
  import AppBanner from '$lib/components/ui/AppBanner.svelte';
  import AppButton from '$lib/components/ui/AppButton.svelte';
  import AppCard from '$lib/components/ui/AppCard.svelte';
  import PlayerPickerModal from '$lib/components/player/PlayerPickerModal.svelte';
  import { toast } from '$lib/toast';

  type Player = { _id: string; name: string; team?: string };

  let isAdmin = $state(false);
  let authLoaded = $state(false);

  let sourcePlayer = $state<Player | null>(null);
  let targetPlayer = $state<Player | null>(null);
  let sourceOpen = $state(false);
  let targetOpen = $state(false);

  let merging = $state(false);
  let mergeError = $state('');
  let confirmed = $state(false);

  onMount(() =>
    authMe.subscribe((val) => {
      if (val !== null) {
        isAdmin = val.user?.role === 'admin';
        authLoaded = true;
      }
    }),
  );

  function pickSource(id: string, player?: { name: string; team?: string }) {
    sourcePlayer = id ? { _id: id, ...player } : null;
    confirmed = false;
    mergeError = '';
  }

  function pickTarget(id: string, player?: { name: string; team?: string }) {
    targetPlayer = id ? { _id: id, ...player } : null;
    confirmed = false;
    mergeError = '';
  }

  const canMerge = $derived(
    !!sourcePlayer && !!targetPlayer && sourcePlayer._id !== targetPlayer._id,
  );

  async function doMerge() {
    if (!sourcePlayer || !targetPlayer) return;
    merging = true;
    mergeError = '';
    try {
      const result = await postJson<{ matchesUpdated: number }>('/players/merge', {
        sourceId: sourcePlayer._id,
        targetId: targetPlayer._id,
      });
      const n = result.matchesUpdated;
      toast.schedule(
        `Merged "${sourcePlayer.name}" into "${targetPlayer.name}" (${n} match${n === 1 ? '' : 'es'} updated).`,
        'success',
      );
      await goto(`/players/${targetPlayer._id}`);
    } catch (err) {
      mergeError = err instanceof ApiError ? err.message : 'Could not reach API.';
    } finally {
      merging = false;
    }
  }
</script>

<div class="page merge-page">
  {#if !authLoaded}
    <p class="muted">Loading…</p>
  {:else if !isAdmin}
    <AppCard className="stack">
      <AppBanner variant="danger" title="Access denied" message="This page is only available to admins." />
      <div class="merge-page__back">
        <AppButton href="/players">Back to players</AppButton>
      </div>
    </AppCard>
  {:else}
    <AppCard className="stack">
      <h2 class="card__title">Merge players</h2>
      <p class="card__sub">
        Pick a <strong>source</strong> and a <strong>target</strong>. All match records belonging to
        the source will be moved to the target, then the source player will be permanently deleted.
      </p>

      <div class="merge-page__grid">
        <div class="merge-page__col">
          <p class="merge-page__col-label">Source <span class="muted">(will be deleted)</span></p>
          {#if sourcePlayer}
            <div class="merge-page__chip">
              <div class="merge-page__chip-info">
                <span class="merge-page__chip-name">{sourcePlayer.name}</span>
                {#if sourcePlayer.team}
                  <span class="muted merge-page__chip-team">{sourcePlayer.team}</span>
                {/if}
              </div>
              <button
                type="button"
                class="merge-page__clear-btn"
                onclick={() => { sourcePlayer = null; confirmed = false; mergeError = ''; }}
                aria-label="Clear source player"
              >✕</button>
            </div>
          {:else}
            <AppButton onclick={() => (sourceOpen = true)}>Select source player…</AppButton>
          {/if}
        </div>

        <div class="merge-page__arrow" aria-hidden="true">→</div>

        <div class="merge-page__col">
          <p class="merge-page__col-label">Target <span class="muted">(will be kept)</span></p>
          {#if targetPlayer}
            <div class="merge-page__chip">
              <div class="merge-page__chip-info">
                <span class="merge-page__chip-name">{targetPlayer.name}</span>
                {#if targetPlayer.team}
                  <span class="muted merge-page__chip-team">{targetPlayer.team}</span>
                {/if}
              </div>
              <button
                type="button"
                class="merge-page__clear-btn"
                onclick={() => { targetPlayer = null; confirmed = false; mergeError = ''; }}
                aria-label="Clear target player"
              >✕</button>
            </div>
          {:else}
            <AppButton onclick={() => (targetOpen = true)}>Select target player…</AppButton>
          {/if}
        </div>
      </div>

      {#if sourcePlayer && targetPlayer && sourcePlayer._id === targetPlayer._id}
        <AppBanner variant="warning" message="Source and target must be different players." />
      {:else if canMerge && !confirmed}
        <AppBanner variant="warning">
          {#snippet children()}
            <p class="app-banner__message">
              This will permanently delete <strong>{sourcePlayer?.name}</strong> and move all their
              matches to <strong>{targetPlayer?.name}</strong>. This action cannot be undone.
            </p>
            <div class="merge-page__confirm-action">
              <AppButton variant="primary" onclick={() => (confirmed = true)}>
                I understand — proceed
              </AppButton>
            </div>
          {/snippet}
        </AppBanner>
      {/if}

      {#if mergeError}
        <AppBanner variant="danger" message={mergeError} />
      {/if}

      {#if confirmed && canMerge}
        <div class="merge-page__actions">
          <AppButton variant="primary" disabled={merging} onclick={doMerge}>
            {merging ? 'Merging…' : 'Merge players'}
          </AppButton>
          <AppButton onclick={() => (confirmed = false)} disabled={merging}>Cancel</AppButton>
        </div>
      {/if}

      <div class="merge-page__back">
        <AppButton href="/players">Back to players</AppButton>
      </div>
    </AppCard>
  {/if}
</div>

<PlayerPickerModal
  bind:open={sourceOpen}
  title="Select source player"
  forLabel="source (will be deleted)"
  excludePlayerId={targetPlayer?._id ?? ''}
  presetTeamFromMe={false}
  includeGuests={true}
  onSelect={pickSource}
  onClose={() => (sourceOpen = false)}
/>

<PlayerPickerModal
  bind:open={targetOpen}
  title="Select target player"
  forLabel="target (will be kept)"
  excludePlayerId={sourcePlayer?._id ?? ''}
  presetTeamFromMe={false}
  includeGuests={true}
  onSelect={pickTarget}
  onClose={() => (targetOpen = false)}
/>

<style>
  .merge-page {
    max-width: 760px;
  }

  .merge-page__grid {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    gap: var(--space-md);
    align-items: center;
    margin-top: var(--space-md);
  }

  @media (max-width: 560px) {
    .merge-page__grid {
      grid-template-columns: 1fr;
    }

    .merge-page__arrow {
      display: none;
    }
  }

  .merge-page__col-label {
    font-weight: 700;
    margin: 0 0 8px;
    font-size: 0.85rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .merge-page__arrow {
    font-size: 1.4rem;
    color: var(--muted);
    text-align: center;
  }

  .merge-page__chip {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 12px;
    border-radius: var(--radius-sm);
    border: 1px solid var(--border-strong);
    background: var(--glass-bg);
  }

  .merge-page__chip-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .merge-page__chip-name {
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .merge-page__chip-team {
    font-size: 0.82rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .merge-page__clear-btn {
    background: none;
    border: none;
    cursor: pointer;
    color: var(--muted);
    font-size: 0.85rem;
    line-height: 1;
    padding: 4px 6px;
    flex-shrink: 0;
    border-radius: var(--radius-sm);
  }

  .merge-page__clear-btn:hover {
    color: var(--fg);
    background: var(--glass-bg-strong);
  }

  .merge-page__confirm-action {
    margin-top: 10px;
  }

  .merge-page__actions {
    display: flex;
    gap: 12px;
    margin-top: var(--space-sm);
  }

  .merge-page__back {
    margin-top: var(--space-md);
  }
</style>
