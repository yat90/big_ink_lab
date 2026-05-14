<script lang="ts">
  import { onMount } from 'svelte';
  import AppBanner from '$lib/components/ui/AppBanner.svelte';
  import AppButton from '$lib/components/ui/AppButton.svelte';
  import AppCard from '$lib/components/ui/AppCard.svelte';
  import { config } from '$lib/config';
  import { focusTrap, scrollLock } from '$lib/a11y';
  import { portal } from '$lib/portal';
  import { addTeamMember } from '$lib/components/team/team-members';

  interface Props {
    team: string;
    /** Players already in the team — these are filtered out of the picker. */
    existingPlayerIds: Set<string>;
    onClose: () => void;
    onAdded: () => void;
  }
  let { team, existingPlayerIds, onClose, onAdded }: Props = $props();

  type PlayerRow = { _id: string; name: string; team?: string };

  const apiUrl = config.apiUrl ?? '/api';
  const PAGE_SIZE = 8;

  let players = $state<PlayerRow[]>([]);
  let loading = $state(false);
  let error = $state('');
  let search = $state('');
  let selectedId = $state('');
  let saving = $state(false);
  let saveError = $state('');

  const eligiblePlayers = $derived(players.filter((p) => !existingPlayerIds.has(p._id)));

  function buildPlayersQuery(name: string): string {
    const parts = [`limit=${PAGE_SIZE}`];
    if (name.trim()) parts.push(`name=${encodeURIComponent(name.trim())}`);
    return parts.join('&');
  }

  async function loadPlayers() {
    loading = true;
    error = '';
    try {
      const res = await fetch(`${apiUrl}/players?${buildPlayersQuery(search)}`);
      if (!res.ok) {
        error = "Couldn't search players.";
        players = [];
        return;
      }
      const json = await res.json();
      players = (json.data ?? []) as PlayerRow[];
    } catch {
      error = 'Network error.';
    } finally {
      loading = false;
    }
  }

  async function submit(e: Event) {
    e.preventDefault();
    if (!selectedId) {
      saveError = 'Pick a player to add.';
      return;
    }
    saving = true;
    saveError = '';
    try {
      await addTeamMember({ playerId: selectedId });
      onAdded();
    } catch (err) {
      saveError = err instanceof Error ? err.message : "Couldn't add member.";
    } finally {
      saving = false;
    }
  }

  $effect(() => {
    void search;
    void loadPlayers();
  });

  onMount(() => {
    void loadPlayers();
  });
</script>

<div use:portal>
  <div class="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="add-member-title">
    <button type="button" class="modal-backdrop" aria-label="Close" onclick={onClose}></button>
    <div class="modal-card" use:focusTrap use:scrollLock>
      <AppCard>
      <h2 id="add-member-title" class="card__title">Add member to {team}</h2>
      <p class="card__sub muted">
        Pick a roster player to add to your team. Monthly dues are configured team-wide on the
        Finance tab.
      </p>

        <form class="stack" onsubmit={submit}>
        <label class="label">
          Search player
          <input
            type="search"
            class="input"
            placeholder="Name…"
            bind:value={search}
            autocomplete="off"
          />
        </label>

        <div class="picker">
          {#if loading}
            <p class="muted">Searching…</p>
          {:else if error}
            <AppBanner variant="danger" message={error} />
          {:else if eligiblePlayers.length === 0}
            <p class="muted">
              {#if search.trim()}
                No matching players found.
              {:else}
                No more roster players to add.
              {/if}
            </p>
          {:else}
            <ul class="picker__list" role="list">
              {#each eligiblePlayers as p (p._id)}
                <li>
                  <button
                    type="button"
                    class="picker__row"
                    class:picker__row--active={selectedId === p._id}
                    onclick={() => (selectedId = p._id)}
                  >
                    <span class="picker__name">{p.name}</span>
                    {#if p.team && p.team !== team}
                      <span class="picker__hint muted">currently in "{p.team}"</span>
                    {:else if !p.team}
                      <span class="picker__hint muted">no team set</span>
                    {/if}
                  </button>
                </li>
              {/each}
            </ul>
          {/if}
        </div>

        {#if saveError}
          <AppBanner variant="danger" message={saveError} />
        {/if}

        <div class="row" style="gap: 12px; margin-top: 8px;">
          <AppButton type="submit" variant="primary" disabled={saving || !selectedId}>
            {saving ? 'Adding…' : 'Add to team'}
          </AppButton>
          <AppButton type="button" onclick={onClose} disabled={saving}>Cancel</AppButton>
        </div>
        </form>
      </AppCard>
    </div>
  </div>
</div>

<style>
  .modal-overlay {
    position: fixed;
    inset: 0;
    z-index: 1200;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
  }
  .modal-backdrop {
    position: absolute;
    inset: 0;
    border: none;
    padding: 0;
    background: rgba(0, 0, 0, 0.55);
    cursor: pointer;
  }
  .modal-card {
    position: relative;
    z-index: 1;
    max-width: 480px;
    width: 100%;
  }
  .picker {
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    max-height: 14rem;
    overflow-y: auto;
    background: var(--bg2);
  }
  .picker__list {
    list-style: none;
    padding: 0;
    margin: 0;
  }
  .picker__row {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.15rem;
    width: 100%;
    padding: 0.65rem 0.85rem;
    background: transparent;
    border: none;
    border-bottom: 1px solid var(--border);
    color: inherit;
    font-family: inherit;
    text-align: left;
    cursor: pointer;
    transition: background var(--transition);
  }
  .picker__row:last-child {
    border-bottom: none;
  }
  .picker__row:hover {
    background: var(--glass-bg);
  }
  .picker__row--active {
    background: var(--glass-bg-strong);
    box-shadow: inset 0 0 0 2px var(--primary);
  }
  .picker__name {
    font-weight: 600;
  }
  .picker__hint {
    font-size: 0.8rem;
  }
</style>
