<script lang="ts">
  import { config } from '$lib/config';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { getAuthToken } from '$lib/auth';
  import { getDeckPlayerId } from '$lib/decks';
  import PlayerPickerModal from '$lib/PlayerPickerModal.svelte';

  const id = $page.params.id;
  let name = $state('');
  let deckList = $state('');
  let notes = $state('');
  let playerId = $state('');
  let selectedPlayerLabel = $state('—');
  let playerPickerOpen = $state(false);
  let loading = $state(true);
  let saving = $state(false);
  let error = $state('');

  const apiUrl = config.apiUrl ?? '/api';

  onMount(async () => {
    try {
      const res = await fetch(`${apiUrl}/decks/${id}`, {
        headers: { Authorization: `Bearer ${getAuthToken()}` },
      });
      if (!res.ok) {
        error = 'Deck not found';
        loading = false;
        return;
      }
      const deck = await res.json();
      name = deck.name ?? '';
      deckList = deck.deckList ?? '';
      notes = deck.notes ?? '';
      const pid = getDeckPlayerId(deck);
      playerId = pid ?? '';
      if (typeof deck.player === 'object' && deck.player?.name) {
        const p = deck.player;
        selectedPlayerLabel = `${p.name}${p.team ? ` · ${p.team}` : ''}`;
      } else {
        selectedPlayerLabel = playerId ? '—' : '—';
      }
    } catch {
      error = 'Could not load deck.';
    } finally {
      loading = false;
    }
  });

  function onPlayerSelect(selectedId: string, player?: { name: string; team?: string }) {
    playerId = selectedId;
    selectedPlayerLabel = player ? `${player.name}${player.team ? ` · ${player.team}` : ''}` : '—';
  }

  async function onSubmit(e: Event) {
    e.preventDefault();
    error = '';
    saving = true;
    try {
      const res = await fetch(`${apiUrl}/decks/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          deckList: deckList.trim(),
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
      await goto(`/decks/${id}`);
    } catch {
      error = 'Could not reach API.';
    } finally {
      saving = false;
    }
  }
</script>

<svelte:head>
  <title>Edit deck · Big Ink Lab</title>
</svelte:head>

<div class="page">
  {#if loading}
    <div class="card">
      <p class="muted">Loading deck…</p>
    </div>
  {:else if error && !name && !deckList}
    <div class="card" role="alert">
      <p class="alert">{error}</p>
      <a href="/decks/{id}" class="btn">Back to deck</a>
    </div>
  {:else}
    <div class="card stack">
      <h2 class="card__title">Edit deck</h2>
      <p class="card__sub">Change the deck name, player, or card list.</p>

      <form onsubmit={onSubmit} class="stack" style="margin-top: 8px;">
        <label class="label" for="deck-edit-name">
          Name
          <input
            id="deck-edit-name"
            type="text"
            class="input"
            bind:value={name}
            required
            placeholder="Deck name"
          />
        </label>
        <div class="label">
          Player <span class="hint">(optional)</span>
          <button
            type="button"
            class="input deck-edit__player-btn"
            onclick={() => (playerPickerOpen = true)}
            aria-label="Choose player"
          >
            <span class="deck-edit__player-label">{selectedPlayerLabel}</span>
          </button>
        </div>
        <PlayerPickerModal
          bind:open={playerPickerOpen}
          title="Select player"
          forLabel="this deck"
          onSelect={onPlayerSelect}
          onClose={() => (playerPickerOpen = false)}
        />
        <label class="label" for="deck-edit-list">
          Deck list
          <span class="hint">(one card per line, e.g. 2 Ariel)</span>
        </label>
        <textarea
          id="deck-edit-list"
          class="input"
          bind:value={deckList}
          rows="12"
          placeholder="2 Ariel&#10;1 Elsa - Snow Queen"
          style="resize: vertical; font-family: ui-monospace, monospace;"
        ></textarea>
        <label class="label" for="deck-edit-notes">
          Notes <span class="hint">(optional)</span>
          <textarea
            id="deck-edit-notes"
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
          <button type="submit" class="btn btn--primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
          <a href="/decks/{id}" class="btn">Cancel</a>
        </div>
      </form>
    </div>
  {/if}
</div>

<style>
  .deck-edit__player-btn {
    text-align: left;
    cursor: pointer;
  }
  .deck-edit__player-label {
    color: var(--fg);
  }
</style>
