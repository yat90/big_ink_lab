<script lang="ts">
  import { config } from '$lib/config';
  import { onMount } from 'svelte';
  import type { Deck } from '$lib/decks';
  import { getDeckPlayerName } from '$lib/decks';
  import InkIcons from '$lib/InkIcons.svelte';

  let decks = $state<Deck[]>([]);
  let loading = $state(true);
  let error = $state('');

  const apiUrl = config.apiUrl ?? '/api';

  onMount(async () => {
    try {
      const res = await fetch(`${apiUrl}/decks`);
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
  });
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

    <div class="stack">
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
    </div>
  {/if}
</div>

<style>
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
