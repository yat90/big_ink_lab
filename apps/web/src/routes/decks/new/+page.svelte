<script lang="ts">
  import { config } from '$lib/config';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { DECK_COLOR_OPTIONS, deckColorToInk } from '$lib/matches';

  type Player = { _id: string; name: string; team: string };

  let name = $state('');
  let deckList = $state('');
  let deckColor = $state('');
  let notes = $state('');
  let playerId = $state('');
  let players = $state<Player[]>([]);
  let loading = $state(false);
  let error = $state('');

  const apiUrl = config.apiUrl ?? '/api';

  onMount(async () => {
    try {
      const res = await fetch(`${apiUrl}/players`);
      if (res.ok) players = await res.json();
    } catch {
      /* ignore */
    }
  });

  async function onSubmit(e: Event) {
    e.preventDefault();
    error = '';
    loading = true;
    try {
      const res = await fetch(`${apiUrl}/decks`, {
        method: 'POST',
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
        error = data.message ?? `Error ${res.status}`;
        loading = false;
        return;
      }
      const deck = await res.json();
      await goto(`/decks/${deck._id}`);
    } catch {
      error = 'Could not reach API.';
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head>
  <title>New deck · Big Ink Lab</title>
</svelte:head>

<div class="page">
  <div class="card stack">
    <h2 class="card__title">Create deck</h2>
    <p class="card__sub">Add a new deck with name and card list (one card per line, e.g. 2 Ariel).</p>

    <form onsubmit={onSubmit} class="stack" style="margin-top: 8px;">
      <label class="label" for="name">
        Name <span aria-hidden="true">*</span>
        <input
          id="name"
          type="text"
          class="input"
          bind:value={name}
          required
          placeholder="Deck name"
        />
      </label>
      <label class="label" for="deckList">
        Deck list <span class="hint">(optional)</span>
        <textarea
          id="deckList"
          class="input"
          bind:value={deckList}
          rows="8"
          placeholder="2 Ariel&#10;1 Elsa - Snow Queen"
          style="resize: vertical; font-family: ui-monospace, monospace;"
        ></textarea>
      </label>
      <label class="label" for="deckColor">
        Deck color <span class="hint">(optional)</span>
        <select id="deckColor" class="input" bind:value={deckColor} aria-label="Deck color">
          <option value="">—</option>
          {#each DECK_COLOR_OPTIONS as c}
            <option value={c} title={c}>{deckColorToInk(c)} {c}</option>
          {/each}
        </select>
      </label>
      <label class="label" for="player">
        Player <span class="hint">(optional)</span>
        <select id="player" class="input" bind:value={playerId} aria-label="Player">
          <option value="">—</option>
          {#each players as p}
            <option value={p._id}>{p.name}{#if p.team} · {p.team}{/if}</option>
          {/each}
        </select>
      </label>
      <label class="label" for="notes">
        Notes <span class="hint">(optional)</span>
        <textarea
          id="notes"
          class="input"
          bind:value={notes}
          rows="3"
          placeholder="Notes"
          style="resize: vertical;"
        ></textarea>
      </label>

      {#if error}
        <p class="alert" role="alert" aria-live="assertive">{error}</p>
      {/if}

      <div class="row" style="margin-top: 8px; gap: 12px;">
        <button type="submit" class="btn btn--primary" disabled={loading}>
          {loading ? 'Creating…' : 'Create deck'}
        </button>
        <a href="/decks" class="btn">Cancel</a>
      </div>
    </form>
  </div>
</div>
