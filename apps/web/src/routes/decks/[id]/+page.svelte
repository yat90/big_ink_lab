<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import InkIcons from '$lib/InkIcons.svelte';
  import { config } from '$lib/config';
  import type { Deck } from '$lib/decks';
  import { getDeckLastEditedByDisplay, getDeckPlayerId, getDeckPlayerName } from '$lib/decks';
  import IconEdit from '$lib/icons/IconEdit.svelte';
  import { onMount } from 'svelte';
  import DeckViewInfoTab from './DeckViewInfoTab.svelte';
  import DeckViewMatchesTab from './DeckViewMatchesTab.svelte';
  import DeckViewStatisticsTab from './DeckViewStatisticsTab.svelte';

  type DeckStatsSummary = {
    totalMatches: number;
    wins: number;
    losses: number;
    winRate: number | null;
  };

  const id = $page.params.id;
  let deck = $state<Deck | null>(null);
  let deckStats = $state<DeckStatsSummary | null>(null);
  let loading = $state(true);
  let deleting = $state(false);
  let error = $state('');
  let showDeletePrompt = $state(false);

  type TabId = 'info' | 'matches' | 'statistics';
  const TABS: { id: TabId; label: string }[] = [
    { id: 'info', label: 'Info' },
    { id: 'matches', label: 'Matches' },
    { id: 'statistics', label: 'Statistics' },
  ];
  let activeTab = $state<TabId>('info');

  const apiUrl = config.apiUrl ?? '/api';

  onMount(async () => {
    try {
      const [deckRes, statsRes] = await Promise.all([
        fetch(`${apiUrl}/decks/${id}`),
        fetch(`${apiUrl}/decks/${id}/stats`).catch(() => null),
      ]);
      if (!deckRes.ok) {
        error = 'Deck not found';
        loading = false;
        return;
      }
      deck = await deckRes.json();
      if (statsRes?.ok) {
        const statsData = await statsRes.json();
        deckStats = {
          totalMatches: statsData.totalMatches ?? 0,
          wins: statsData.wins ?? 0,
          losses: statsData.losses ?? 0,
          winRate: statsData.winRate ?? null,
        };
      }
    } catch {
      error = 'Could not load deck.';
    } finally {
      loading = false;
    }
  });

  async function confirmDelete() {
    if (!deck) return;
    deleting = true;
    error = '';
    try {
      const res = await fetch(`${apiUrl}/decks/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        error = data.message ?? 'Delete failed';
        deleting = false;
        showDeletePrompt = false;
        return;
      }
      await goto('/decks');
    } catch {
      error = 'Could not reach API.';
    } finally {
      deleting = false;
      showDeletePrompt = false;
    }
  }
</script>

<svelte:head>
  <title>{deck?.name ?? 'Deck'} · Big Ink Lab</title>
</svelte:head>

<div class="page">
  {#if loading}
    <div class="card">
      <div class="loading-skeleton" aria-busy="true" aria-live="polite">
        <div class="loading-skeleton__line loading-skeleton__line--title"></div>
        <div class="loading-skeleton__line loading-skeleton__line--short"></div>
        <div class="loading-skeleton__line"></div>
      </div>
      <p class="muted" style="margin-top: var(--space-md);">Loading deck…</p>
    </div>
  {:else if error && !deck}
    <div class="card" role="alert">
      <p class="alert">{error}</p>
      <a href="/decks" class="btn">Back to decks</a>
    </div>
  {:else if deck}
    <div class="card stack">
      <div class="deck-display__header">
        <h2 class="deck-header">{deck.name}</h2>
        <div class="deck-display__actions">
          <a href="/decks/{id}/edit" class="btn btn--primary">
            <IconEdit size={18} className="icon-inline" />
            <span style="margin-left: var(--space-xs);">Edit</span>
          </a>
          <button type="button" class="btn btn--danger" onclick={() => (showDeletePrompt = true)}>
            Delete
          </button>
        </div>
      </div>
      {#if deck.deckColor}
        <p class="deck-display__meta">
          <InkIcons deckColor={deck.deckColor} />
        </p>
      {/if}
      <dl class="deck-display__meta-list">
        <dt class="muted">Player</dt>
        <dd>
          {#if getDeckPlayerId(deck)}
            <a href="/players/{getDeckPlayerId(deck)}">{getDeckPlayerName(deck)}</a>
          {:else}
            {getDeckPlayerName(deck)}
          {/if}
        </dd>
        {#if deck.notes?.trim()}
          <dt class="muted">Notes</dt>
          <dd>{deck.notes}</dd>
        {/if}
        {#if deck.lastEditedAt || deck.lastEditedBy}
          <dt class="muted">Last edited</dt>
          <dd>
            {#if deck.lastEditedAt}
              {@const editedDate = new Date(deck.lastEditedAt).toLocaleString(undefined, {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
              {getDeckLastEditedByDisplay(deck) !== '–'
                ? `${getDeckLastEditedByDisplay(deck)} · ${editedDate}`
                : editedDate}
            {:else}
              {getDeckLastEditedByDisplay(deck)}
            {/if}
          </dd>
        {/if}
      </dl>

      <div class="deck-view__tabs" role="tablist" aria-label="Deck sections">
        {#each TABS as tab (tab.id)}
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls="panel-{tab.id}"
            id="tab-{tab.id}"
            class="deck-view__tab"
            class:deck-view__tab--active={activeTab === tab.id}
            onclick={() => (activeTab = tab.id)}
          >
            {tab.label}
          </button>
        {/each}
      </div>

      <div class="deck-view__panel" id="panel-info" role="tabpanel" aria-labelledby="tab-info" hidden={activeTab !== 'info'}>
        {#if activeTab === 'info' && deck}
          <DeckViewInfoTab {deck} deckStats={deckStats} />
        {/if}
      </div>
      <div class="deck-view__panel" id="panel-matches" role="tabpanel" aria-labelledby="tab-matches" hidden={activeTab !== 'matches'}>
        {#if activeTab === 'matches'}
          <DeckViewMatchesTab deckId={id!} />
        {/if}
      </div>
      <div class="deck-view__panel" id="panel-statistics" role="tabpanel" aria-labelledby="tab-statistics" hidden={activeTab !== 'statistics'}>
        {#if activeTab === 'statistics'}
          <DeckViewStatisticsTab deckId={id!} />
        {/if}
      </div>
    </div>

    {#if showDeletePrompt}
      <div
        class="modal-overlay"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-deck-title"
      >
        <button
          type="button"
          class="modal-backdrop"
          aria-label="Close"
          onclick={() => (showDeletePrompt = false)}
        ></button>
        <div class="card modal-card">
          <h2 id="delete-deck-title" class="card__title">Delete deck?</h2>
          <p class="muted">This cannot be undone.</p>
          <div class="row" style="gap: 12px; margin-top: var(--space-lg);">
            <button
              type="button"
              class="btn btn--danger"
              disabled={deleting}
              onclick={confirmDelete}
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
            <button
              type="button"
              class="btn"
              onclick={() => (showDeletePrompt = false)}
              disabled={deleting}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    {/if}
  {/if}
</div>

<style>
  .modal-overlay {
    position: fixed;
    inset: 0;
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
  }
  .modal-backdrop {
    position: absolute;
    inset: 0;
    padding: 0;
    border: none;
    background: rgba(0, 0, 0, 0.5);
    cursor: pointer;
    font: inherit;
  }
  .modal-card {
    position: relative;
    max-width: 420px;
    width: 100%;
  }

  .deck-display__header {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-md);
    margin-bottom: var(--space-sm);
  }

  .deck-display__header .deck-header {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 800;
    letter-spacing: -0.02em;
  }

  .deck-display__actions {
    display: flex;
    gap: var(--space-sm);
    flex-wrap: wrap;
  }

  .deck-display__meta {
    margin: 0 0 var(--space-sm) 0;
  }

  .deck-display__meta-list {
    display: grid;
    gap: var(--space-xs) var(--space-md);
    margin: 0 0 var(--space-lg) 0;
    font-size: 0.95rem;
  }

  .deck-display__meta-list dt {
    grid-column: 1;
  }

  .deck-display__meta-list dd {
    margin: 0;
    grid-column: 2;
  }

  .deck-header {
    margin-top: 0;
    margin-bottom: var(--space-md);
    font-size: 1.5rem;
    font-weight: 800;
    letter-spacing: -0.02em;
  }

  .deck-view__tabs {
    display: flex;
    gap: 0;
    margin: var(--space-lg) 0 var(--space-md) 0;
    border-bottom: 1px solid var(--border);
  }
  .deck-view__tab {
    padding: 0.5rem 1rem;
    font-size: 0.95rem;
    font-weight: 600;
    color: var(--muted);
    background: none;
    border: none;
    border-bottom: 2px solid transparent;
    cursor: pointer;
    margin-bottom: -1px;
    transition: color var(--transition), border-color var(--transition);
  }
  .deck-view__tab:hover {
    color: var(--fg);
  }
  .deck-view__tab--active {
    color: var(--primary);
    border-bottom-color: var(--primary);
  }
  .deck-view__panel {
    margin-top: var(--space-md);
  }
  .deck-view__panel[hidden] {
    display: none;
  }
</style>
