<script lang="ts">
  import AppBanner from '$lib/AppBanner.svelte';
  import AppButton from '$lib/AppButton.svelte';
  import AppCard from '$lib/AppCard.svelte';
  import { config } from '$lib/config';
  import { authMe } from '$lib/me';
  import { get } from 'svelte/store';
  import { DECK_COLOR_OPTIONS } from '$lib/matches';
  import FilterCard from '$lib/FilterCard.svelte';
  import InkIcons from '$lib/InkIcons.svelte';
  import Pagination from '$lib/Pagination.svelte';
  import { focusTrap, scrollLock } from '$lib/a11y';

  /** Move the modal root to document.body so it covers the full viewport. */
  function portal(node: HTMLElement) {
    document.body.appendChild(node);
    return {
      destroy() {
        if (node.parentNode) node.remove();
      },
    };
  }

  const BIG_INK_THEORY_TEAM = 'The Big Ink Theory';
  type DeckRow = { _id: string; name: string; deckColor?: string };
  type PlayerRow = { _id: string; name: string; team?: string };

  let {
    open = $bindable(false),
    title = 'Select deck',
    forLabel = '',
    /** When set, list is filtered to this player's decks (e.g. the selected P1/P2). Falls back to your linked player from /auth/me if empty. */
    filterPlayerId = '',
    onSelect,
    onClose,
  }: {
    open?: boolean;
    title?: string;
    /** Who the deck will be assigned to (e.g. "Player 1"). Shown as headline. */
    forLabel?: string;
    filterPlayerId?: string;
    onSelect: (deckId: string) => void | Promise<void>;
    onClose: () => void;
  } = $props();

  const apiUrl = config.apiUrl ?? '/api';
  const PAGE_SIZE = 5;

  let decks = $state<DeckRow[]>([]);
  let players = $state<PlayerRow[]>([]);
  let filterName = $state('');
  let filterColor = $state('');
  let filterPlayer = $state('');
  let currentPage = $state(1);
  let totalPages = $state(1);
  let total = $state(0);
  let loading = $state(false);
  let error = $state('');
  /** Set to true after preset player is applied so first load uses it. */
  let presetReady = $state(false);
  /** Filter inputs are hidden until expanded (collapsed by default). */
  let filtersExpanded = $state(false);

  const filterCardSummary = $derived(
    loading ? 'Loading…' : `${total} deck${total === 1 ? '' : 's'}`
  );
  const selectedPlayerName = $derived(
    filterPlayer ? (players.find((p) => p._id === filterPlayer)?.name ?? '') : ''
  );
  const filterBadges = $derived<string[]>(
    [
      filterName.trim() ? `Name: ${filterName.trim()}` : '',
      filterColor.trim() ? filterColor.trim() : '',
      selectedPlayerName ? `Player: ${selectedPlayerName}` : '',
    ].filter((b) => b.length > 0)
  );
  const canClearDeckPickerFilters = $derived(!!(filterName.trim() || filterColor.trim()));

  function clearDeckPickerFilters() {
    filterName = '';
    filterColor = '';
    const explicit = (filterPlayerId ?? '').trim();
    if (explicit) {
      filterPlayer = explicit;
    } else {
      const me = get(authMe);
      filterPlayer = (me?.player?._id ?? '').toString() || '';
    }
    currentPage = 1;
    loadDecks();
  }

  async function fetchPlayers() {
    try {
      const res = await fetch(`${apiUrl}/players?limit=100`);
      if (res.ok) {
        const json = await res.json();
        const data = json.data ?? json;
        players = Array.isArray(data)
          ? data.filter((p: PlayerRow) => (p.team ?? '').trim() === BIG_INK_THEORY_TEAM)
          : [];
      }
    } catch {
      players = [];
    }
  }

  async function loadDecks() {
    loading = true;
    error = '';
    try {
      const params = new URLSearchParams();
      if (filterName.trim()) params.set('name', filterName.trim());
      if (filterColor.trim()) params.set('color', filterColor.trim());
      if (filterPlayer.trim()) params.set('player', filterPlayer.trim());
      params.set('page', String(currentPage));
      params.set('limit', String(PAGE_SIZE));
      const res = await fetch(`${apiUrl}/decks?${params}`);
      if (!res.ok) {
        error = 'Failed to load decks';
        decks = [];
        return;
      }
      const json = await res.json();
      decks = json.data ?? [];
      totalPages = json.meta?.totalPages ?? 1;
      total = json.meta?.total ?? 0;
    } catch {
      error = 'Could not load decks.';
      decks = [];
    } finally {
      loading = false;
    }
  }

  function onFiltersChange() {
    currentPage = 1;
    loadDecks();
  }

  function onPageChange(page: number) {
    currentPage = page;
    loadDecks();
  }

  async function selectDeck(deckId: string) {
    await Promise.resolve(onSelect(deckId));
    onClose();
  }

  $effect(() => {
    if (open) fetchPlayers();
  });

  /** When modal opens, preset Player filter: explicit player id, else your linked player from /auth/me. */
  $effect(() => {
    if (!open) {
      presetReady = false;
      return;
    }
    filtersExpanded = false;
    presetReady = false;
    const explicit = (filterPlayerId ?? '').trim();
    if (explicit) {
      filterPlayer = explicit;
      presetReady = true;
      return;
    }
    const me = get(authMe);
    const id = (me?.player?._id ?? '').toString();
    if (id) filterPlayer = id;
    else filterPlayer = '';
    presetReady = true;
  });

  $effect(() => {
    if (!open || !presetReady) return;
    const _ = [currentPage, filterName, filterColor, filterPlayer];
    loadDecks();
  });
</script>

{#if open}
  <div
    class="deck-picker-modal"
    use:portal
    role="dialog"
    aria-modal="true"
    aria-labelledby="deck-picker-title"
  >
    <button type="button" class="deck-picker-modal__backdrop" aria-label="Close" onclick={onClose}
    ></button>
    <div
      class="deck-picker-modal__card"
      tabindex="-1"
      use:focusTrap={{ focusRoot: true }}
      use:scrollLock
    >
      <AppCard>
      <h2 id="deck-picker-title" class="deck-picker-modal__title">{title}</h2>
      {#if forLabel}
        <p class="deck-picker-modal__for muted">Selecting deck for <strong>{forLabel}</strong></p>
      {/if}

      <FilterCard
        bind:expanded={filtersExpanded}
        summary={filterCardSummary}
        badges={filterBadges}
        panelId="deck-picker-filter-panel"
        onClear={clearDeckPickerFilters}
        canClear={canClearDeckPickerFilters}
        showSummaryInExpandedPanel={false}
      >
        <div class="filters__row">
          <label class="filters__label" for="deck-picker-name">
            <span class="muted" style="font-size: 0.85rem;">Name</span>
            <input
              id="deck-picker-name"
              type="search"
              class="input filters__select"
              placeholder="Search by name…"
              bind:value={filterName}
              oninput={onFiltersChange}
              aria-label="Filter by deck name"
              autocomplete="off"
            />
          </label>
          <label class="filters__label" for="deck-picker-color">
            <span class="muted" style="font-size: 0.85rem;">Deck color</span>
            <select
              id="deck-picker-color"
              class="input filters__select"
              bind:value={filterColor}
              onchange={onFiltersChange}
              aria-label="Filter by deck color"
            >
              <option value="">All</option>
              {#each DECK_COLOR_OPTIONS as color (color)}
                <option value={color}>{color}</option>
              {/each}
            </select>
          </label>
          <label class="filters__label" for="deck-picker-player">
            <span class="muted" style="font-size: 0.85rem;">Player</span>
            <select
              id="deck-picker-player"
              class="input filters__select"
              bind:value={filterPlayer}
              onchange={onFiltersChange}
              aria-label="Filter by player"
            >
              <option value="">All</option>
              {#each players as p (p._id)}
                <option value={p._id}>{p.name}</option>
              {/each}
            </select>
          </label>
        </div>
      </FilterCard>

      {#if loading}
        <p class="muted">Loading decks…</p>
      {:else if error}
        <AppBanner variant="danger" message={error} />
      {:else if decks.length === 0}
        <p class="muted">No decks match the filters.</p>
      {:else}
        <ul class="deck-picker-modal__list">
          <li class="deck-picker-modal__item">
            <span class="deck-picker-modal__item-name muted">No deck</span>
            <AppButton type="button" size="sm" onclick={() => selectDeck('')}>
              Select
            </AppButton>
          </li>
          {#each decks as deck (deck._id)}
            <li class="deck-picker-modal__item">
              <span class="deck-picker-modal__item-name">
                {#if deck.deckColor}
                  <InkIcons deckColor={deck.deckColor} size="sm" />
                {/if}
                {deck.name}
              </span>
              <AppButton
                type="button"
                variant="primary"
                size="sm"
                onclick={() => selectDeck(deck._id)}
              >
                Select
              </AppButton>
            </li>
          {/each}
        </ul>
        <Pagination {currentPage} {totalPages} {onPageChange} />
      {/if}

        <div class="deck-picker-modal__actions">
          <AppButton type="button" onclick={onClose}>Cancel</AppButton>
        </div>
      </AppCard>
    </div>
  </div>
{/if}

<style>
  .deck-picker-modal {
    position: fixed;
    inset: 0;
    z-index: 1100;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-md);
  }
  .deck-picker-modal__backdrop {
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
  .deck-picker-modal__card {
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
  .deck-picker-modal__title {
    font-size: 1.1rem;
    font-weight: 700;
    margin: 0;
  }
  .deck-picker-modal__for {
    margin: 0;
    font-size: 0.9rem;
  }
  .deck-picker-modal__for strong {
    color: var(--fg);
  }
  .deck-picker-modal__list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }
  .deck-picker-modal__item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-sm);
    padding: var(--space-sm) var(--space-md);
    background: var(--bg2);
    border-radius: var(--radius-sm);
    border: 1px solid var(--border);
  }
  .deck-picker-modal__item-name {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    min-width: 0;
  }
  .deck-picker-modal__actions {
    margin-top: auto;
    padding-top: var(--space-sm);
  }
</style>
