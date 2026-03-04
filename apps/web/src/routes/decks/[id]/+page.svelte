<script lang="ts">
  import { config } from '$lib/config';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import type { Deck } from '$lib/decks';
  import { getDeckPlayerId } from '$lib/decks';
  import { DECK_COLOR_OPTIONS } from '$lib/matches';
  import DeckColorSelect from '$lib/DeckColorSelect.svelte';

  type Player = { _id: string; name: string; team: string };

  const id = $page.params.id;
  let deck = $state<Deck | null>(null);
  let players = $state<Player[]>([]);
  let loading = $state(true);
  let saving = $state(false);
  let deleting = $state(false);
  let error = $state('');
  let showDeletePrompt = $state(false);

  let name = $state('');
  let deckList = $state('');
  let deckColor = $state('');
  let notes = $state('');
  let playerId = $state('');

  const apiUrl = config.apiUrl ?? '/api';

  onMount(async () => {
    try {
      const [deckRes, playersRes] = await Promise.all([
        fetch(`${apiUrl}/decks/${id}`),
        fetch(`${apiUrl}/players`),
      ]);
      if (!deckRes.ok) {
        error = 'Deck not found';
        loading = false;
        return;
      }
      deck = await deckRes.json();
      if (playersRes.ok) players = await playersRes.json();
      if (deck) {
        name = deck.name;
        deckList = deck.deckList ?? '';
        deckColor = deck.deckColor ?? '';
        notes = deck.notes ?? '';
        playerId = getDeckPlayerId(deck) ?? '';
      }
    } catch {
      error = 'Could not load deck.';
    } finally {
      loading = false;
    }
  });

  async function save() {
    if (!deck) return;
    error = '';
    saving = true;
    try {
      const res = await fetch(`${apiUrl}/decks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          deckList: deckList.trim(),
          deckColor: deckColor || undefined,
          notes: notes.trim() || undefined,
          player: playerId || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        error = data.message ?? 'Update failed';
        saving = false;
        return;
      }
      deck = await res.json();
    } catch {
      error = 'Could not reach API.';
    } finally {
      saving = false;
    }
  }

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
      <div class="row" style="justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: var(--space-md);">
        <h1 class="card__title" style="margin: 0;">{deck.name}</h1>
        <div class="row" style="gap: var(--space-sm);">
          <a href="/deck-check" class="btn">Check deck</a>
          <a href="/decks" class="btn">Back to decks</a>
        </div>
      </div>

      <form onsubmit={(e) => { e.preventDefault(); save(); }} class="stack" style="margin-top: var(--space-lg);">
        <label class="label" for="name">Name <span aria-hidden="true">*</span></label>
        <input id="name" type="text" class="input" bind:value={name} required placeholder="Deck name" />

        <label class="label" for="deckList">Deck list</label>
        <textarea
          id="deckList"
          class="input"
          bind:value={deckList}
          rows="10"
          placeholder="2 Ariel&#10;1 Elsa - Snow Queen"
          style="resize: vertical; font-family: ui-monospace, monospace;"
        ></textarea>

        <label class="label" for="deckColor">Deck color</label>
        <DeckColorSelect id="deckColor" bind:value={deckColor} ariaLabel="Deck color" />

        <label class="label" for="player">Player</label>
        <select id="player" class="input" bind:value={playerId} aria-label="Player">
          <option value="">—</option>
          {#each players as p}
            <option value={p._id}>{p.name}{#if p.team} · {p.team}{/if}</option>
          {/each}
        </select>

        <label class="label" for="notes">Notes</label>
        <textarea id="notes" class="input" bind:value={notes} rows="3" placeholder="Notes" style="resize: vertical;"></textarea>

        {#if error}
          <p class="alert" role="alert">{error}</p>
        {/if}

        <div class="row" style="gap: 12px; flex-wrap: wrap;">
          <button type="submit" class="btn btn--primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button type="button" class="btn btn--danger" onclick={() => (showDeletePrompt = true)}>
            Delete
          </button>
        </div>
      </form>
    </div>

    {#if showDeletePrompt}
      <div class="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="delete-deck-title">
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
            <button type="button" class="btn btn--danger" disabled={deleting} onclick={confirmDelete}>
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
            <button type="button" class="btn" onclick={() => (showDeletePrompt = false)} disabled={deleting}>
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
</style>
