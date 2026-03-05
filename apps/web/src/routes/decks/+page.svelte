<script lang="ts">
  import { config } from '$lib/config';
  import { onMount } from 'svelte';
  import type { Deck } from '$lib/decks';
  import { getDeckPlayerName } from '$lib/decks';
  import { DECK_COLOR_OPTIONS } from '$lib/matches';
  import InkIcons from '$lib/InkIcons.svelte';

  const BIG_INK_THEORY_TEAM = 'The Big Ink Theory';
  type Player = { _id: string; name: string; team?: string };

  let decks = $state<Deck[]>([]);
  let allPlayers = $state<Player[]>([]);
  const players = $derived(allPlayers.filter((p) => (p.team ?? '').trim() === BIG_INK_THEORY_TEAM));
  let loading = $state(true);
  let error = $state('');
  let filterColor = $state('');
  let filterPlayer = $state('');

  const apiUrl = config.apiUrl ?? '/api';

  async function loadDecks() {
    loading = true;
    error = '';
    try {
      const params = new URLSearchParams();
      if (filterColor.trim()) params.set('color', filterColor.trim());
      if (filterPlayer.trim()) params.set('player', filterPlayer.trim());
      const qs = params.toString();
      const url = qs ? `${apiUrl}/decks?${qs}` : `${apiUrl}/decks`;
      const res = await fetch(url);
      if (!res.ok) {
        error = 'Failed to load decks';
        return;
      }
      decks = await res.json();
    } catch {
      error = 'Could not reach API.';
    } finally {
      loading = false;
    }
  }

  onMount(async () => {
    try {
      const playersRes = await fetch(`${apiUrl}/players`);
      if (playersRes.ok) allPlayers = await playersRes.json();
    } catch {
      // non-blocking
    }
    await loadDecks();
  });

  async function onFilterChange() {
    await loadDecks();
  }
</script>

<svelte:head>
  <title>Decks · Big Ink Lab</title>
</svelte:head>

<div class="page">
  {#if loading}
    <div class="card">
      <div class="loading-skeleton" aria-busy="true" aria-live="polite">
        <div class="loading-skeleton__line loading-skeleton__line--title"></div>
        <div class="loading-skeleton__line loading-skeleton__line--short"></div>
        <div class="loading-skeleton__line"></div>
      </div>
      <p class="muted" style="margin-top: var(--space-md);">Loading decks…</p>
    </div>
  {:else if error}
    <div class="card" role="alert" aria-live="assertive">
      <p class="alert">{error}</p>
    </div>
  {:else if decks.length === 0}
    <div class="card stack">
      <h2 class="card__title">No decks yet</h2>
      <p class="card__sub">Create a deck with name and card list.</p>
      <a href="/decks/new" class="btn btn--primary" style="align-self: flex-start; margin-top: var(--space-sm);">
        New deck
      </a>
    </div>
  {:else}
    <div class="page-header">
      <h2 class="card__title" style="margin: 0;">Decks</h2>
      <a href="/decks/new" class="btn btn--primary">New deck</a>
    </div>

    <div class="decks-filters">
      <label for="filter-color" class="decks-filters__label">Deck color</label>
      <select
        id="filter-color"
        class="input decks-filters__select"
        bind:value={filterColor}
        onchange={onFilterChange}
        aria-label="Filter by deck color"
      >
        <option value="">All</option>
        {#each DECK_COLOR_OPTIONS as color (color)}
          <option value={color}>{color}</option>
        {/each}
      </select>
      <label for="filter-player" class="decks-filters__label">Player</label>
      <select
        id="filter-player"
        class="input decks-filters__select"
        bind:value={filterPlayer}
        onchange={onFilterChange}
        aria-label="Filter by player"
      >
        <option value="">All</option>
        {#each players as p (p._id)}
          <option value={p._id}>{p.name}</option>
        {/each}
      </select>
    </div>

    <div class="stack">
      {#if decks.length === 0 && (filterColor || filterPlayer)}
        <p class="muted">No decks match the selected filter.</p>
      {:else}
        {#each decks as deck}
          <a href="/decks/{deck._id}" class="card deckcard" style="text-decoration: none; color: inherit;">
            <div class="deckcard__name">{deck.name}</div>
            <div class="deckcard__meta row" style="gap: var(--space-md); flex-wrap: wrap;">
              {#if deck.deckColor}
                <span class="deckcard__ink" title={deck.deckColor} aria-hidden="true">
                  <InkIcons deckColor={deck.deckColor} />
                </span>
              {/if}
              {#if getDeckPlayerName(deck) !== '–'}
                <span class="muted">{getDeckPlayerName(deck)}</span>
              {/if}
            </div>
          </a>
        {/each}
      {/if}
    </div>
  {/if}
</div>

<style>
  .decks-filters {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-md);
    margin-bottom: var(--space-lg);
  }
  .decks-filters__label {
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--muted);
  }
  .decks-filters__select {
    min-width: 10rem;
  }
  .deckcard__name {
    font-weight: 700;
    font-size: 1.1rem;
  }
  .deckcard__meta {
    margin-top: var(--space-xs);
    font-size: 0.9rem;
  }
  .deckcard__ink {
    font-size: 1rem;
  }
</style>
