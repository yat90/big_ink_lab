<script lang="ts">
  import AppBanner from '$lib/components/ui/AppBanner.svelte';
  import AppButton from '$lib/components/ui/AppButton.svelte';
  import AppCard from '$lib/components/ui/AppCard.svelte';
  import { config } from '$lib/config';
  import { ERR, messageFromFailedResponse } from '$lib/errors';
  import Pagination from '$lib/components/ui/Pagination.svelte';
  import { focusTrap, scrollLock } from '$lib/a11y';
  import { get } from 'svelte/store';
  import { authMe } from '../../me';

  /** Move the modal root to document.body so it covers the full viewport. */
  function portal(node: HTMLElement) {
    document.body.appendChild(node);
    return {
      destroy() {
        if (node.parentNode) node.remove();
      },
    };
  }

  type PlayerRow = { _id: string; name: string; team?: string };

  let {
    open = $bindable(false),
    title = 'Select player',
    forLabel = '',
    /** Player ID to disable in the list (e.g. the other side's player). */
    excludePlayerId = '',
    /** When true, pre-fill the Team filter from the logged-in user's player (e.g. P1). Set false for opponent (P2) so the list is not team-scoped. */
    presetTeamFromMe = true,
    /** When true, include guest players in results. */
    includeGuests = false,
    onSelect,
    onClose,
  }: {
    open?: boolean;
    title?: string;
    forLabel?: string;
    excludePlayerId?: string;
    presetTeamFromMe?: boolean;
    includeGuests?: boolean;
    /** Second arg is the selected player's name/team when selecting from list; undefined when "No player". */
    onSelect: (playerId: string, player?: { name: string; team?: string }) => void;
    onClose: () => void;
  } = $props();

  const apiUrl = config.apiUrl ?? '/api';
  const PAGE_SIZE = 5;

  let players = $state<PlayerRow[]>([]);
  let filterName = $state('');
  let filterTeam = $state('The Big Ink Theory');
  let currentPage = $state(1);
  let totalPages = $state(1);
  let loading = $state(false);
  let error = $state('');
  /** Set to true after preset team is fetched so first load uses it. */
  let presetReady = $state(false);

  async function loadPlayers() {
    loading = true;
    error = '';
    try {
      const params = new URLSearchParams();
      if (filterName.trim()) params.set('name', filterName.trim());
      if (filterTeam.trim()) params.set('team', filterTeam.trim());
      params.set('page', String(currentPage));
      params.set('limit', String(PAGE_SIZE));
      if (includeGuests) params.set('includeGuests', 'true');
      const res = await fetch(`${apiUrl}/players?${params}`);
      if (!res.ok) {
        error = await messageFromFailedResponse(res, ERR.loadPlayers);
        players = [];
        return;
      }
      const json = await res.json();
      players = json.data ?? [];
      totalPages = json.meta?.totalPages ?? 1;
    } catch {
      error = ERR.network;
      players = [];
    } finally {
      loading = false;
    }
  }

  function onFiltersChange() {
    currentPage = 1;
    loadPlayers();
  }

  function onPageChange(page: number) {
    currentPage = page;
    loadPlayers();
  }

  function selectPlayer(playerId: string, player?: { name: string; team?: string }) {
    onSelect(playerId, player);
    onClose();
  }

  /** When modal opens, optionally fetch current user's team and preset the Team filter. */
  $effect(() => {
    if (!open) {
      presetReady = false;
      return;
    }
    presetReady = false;
    if (presetTeamFromMe) {
      // preset the team filter to the logged-in user's team
      const me = get(authMe);
      const myTeam = (me?.player?.team ?? '').trim();
      if (myTeam) {
        filterTeam = myTeam;
        presetReady = true;
        return;
      }
    } else {
      filterTeam = '';
      presetReady = true;
      return;
    }
    presetReady = true;
  });

  $effect(() => {
    if (!open || !presetReady) return;
    const _ = [currentPage, filterName, filterTeam];
    loadPlayers();
  });
</script>

{#if open}
  <div
    class="player-picker-modal"
    use:portal
    role="dialog"
    aria-modal="true"
    aria-labelledby="player-picker-title"
  >
    <button type="button" class="player-picker-modal__backdrop" aria-label="Close" onclick={onClose}
    ></button>
    <div class="player-picker-modal__card" use:focusTrap use:scrollLock>
      <AppCard>
        <h2 id="player-picker-title" class="player-picker-modal__title">{title}</h2>
        {#if forLabel}
          <p class="player-picker-modal__for muted">
            Selecting player for <strong>{forLabel}</strong>
          </p>
        {/if}

        <div class="player-picker-modal__filters">
          <label for="player-picker-name" class="player-picker-modal__label">Name</label>
          <input
            id="player-picker-name"
            type="text"
            class="input player-picker-modal__input"
            placeholder="Search by name…"
            bind:value={filterName}
            oninput={onFiltersChange}
            aria-label="Filter by name"
          />
          <label for="player-picker-team" class="player-picker-modal__label">Team</label>
          <input
            id="player-picker-team"
            type="text"
            class="input player-picker-modal__input"
            placeholder="Filter by team…"
            bind:value={filterTeam}
            oninput={onFiltersChange}
            aria-label="Filter by team"
          />
        </div>

        <div
          role="status"
          aria-live="polite"
          aria-atomic="true"
          class="player-picker-modal__sr-status"
        >
          {#if loading}Loading players…{:else if error}{error}{:else if players.length === 0}No
            players match the filters.{/if}
        </div>

        {#if loading}
          <p class="muted">Loading players…</p>
        {:else if error}
          <AppBanner variant="danger" message={error} />
        {:else if players.length === 0}
          <p class="muted">No players match the filters.</p>
        {:else}
          <ul class="player-picker-modal__list">
            <li class="player-picker-modal__item">
              <span class="player-picker-modal__item-name muted">No player</span>
              <AppButton
                type="button"
                size="sm"
                aria-label="Select no player"
                onclick={() => selectPlayer('', undefined)}>Select</AppButton
              >
            </li>
            {#each players as player (player._id)}
              {@const alreadySelected = excludePlayerId === player._id}
              <li class="player-picker-modal__item">
                <span class="player-picker-modal__item-name">
                  {player.name}
                  {#if player.team}
                    <span class="muted">({player.team})</span>
                  {/if}
                </span>
                <AppButton
                  type="button"
                  variant="primary"
                  size="sm"
                  disabled={alreadySelected}
                  aria-disabled={alreadySelected}
                  aria-label={alreadySelected
                    ? `${player.name} already selected as other player`
                    : `Select ${player.name}`}
                  onclick={() => selectPlayer(player._id, { name: player.name, team: player.team })}
                >
                  Select
                </AppButton>
              </li>
            {/each}
          </ul>
          <Pagination {currentPage} {totalPages} {onPageChange} />
        {/if}

        <div class="player-picker-modal__actions">
          <AppButton type="button" onclick={onClose}>Cancel</AppButton>
        </div>
      </AppCard>
    </div>
  </div>
{/if}

<style>
  .player-picker-modal {
    position: fixed;
    inset: 0;
    z-index: 1100;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-md);
  }
  .player-picker-modal__backdrop {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
    border: none;
    cursor: pointer;
    width: 100vw;
    height: 100vh;
    z-index: 999;
  }
  .player-picker-modal__card {
    position: relative;
    z-index: 1000;
    max-width: 480px;
    width: 100%;
    max-height: 85vh;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
    background: var(--card);
  }
  .player-picker-modal__title {
    font-size: 1.1rem;
    font-weight: 700;
    margin: 0;
  }
  .player-picker-modal__for {
    margin: 0;
    font-size: 0.9rem;
  }
  .player-picker-modal__for strong {
    color: var(--fg);
  }
  .player-picker-modal__filters {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-sm);
  }
  .player-picker-modal__label {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--muted);
  }
  .player-picker-modal__input {
    min-width: 10rem;
  }
  .player-picker-modal__list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }
  .player-picker-modal__item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-sm);
    padding: var(--space-sm) var(--space-md);
    background: var(--bg2);
    border-radius: var(--radius-sm);
    border: 1px solid var(--border);
  }
  .player-picker-modal__item-name {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    min-width: 0;
  }
  .player-picker-modal__actions {
    margin-top: auto;
    padding-top: var(--space-sm);
  }
  .player-picker-modal__sr-status {
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
</style>
