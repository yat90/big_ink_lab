<script lang="ts">
  import { config } from '$lib/config';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { getAuthToken } from '$lib/auth';
  import PlayerPickerModal from '$lib/PlayerPickerModal.svelte';

  let deckList = $state('');
  let notes = $state('');
  let playerId = $state('');
  let selectedPlayerLabel = $state('—');
  let playerPickerOpen = $state(false);
  let loading = $state(false);
  let error = $state('');

  const apiUrl = config.apiUrl ?? '/api';

  onMount(async () => {
    try {
      const res = await fetch(`${apiUrl}/auth/me`, {
        headers: { Authorization: `Bearer ${getAuthToken()}` },
      });
      if (res.ok) {
        const me = await res.json();
        if (me?.player?._id) {
          playerId = me.player._id;
          const p = me.player as { name?: string; team?: string };
          selectedPlayerLabel = p.name
            ? `${p.name}${p.team ? ` · ${p.team}` : ''}`
            : '—';
        }
      }
    } catch {
      /* ignore */
    }
  });

  function onPlayerSelect(id: string, player?: { name: string; team?: string }) {
    playerId = id;
    selectedPlayerLabel = player ? `${player.name}${player.team ? ` · ${player.team}` : ''}` : '—';
  }

  async function onSubmit(e: Event) {
    e.preventDefault();
    error = '';
    loading = true;
    try {
      const res = await fetch(`${apiUrl}/decks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deckList: deckList.trim(),
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
    <p class="card__sub">Add a new deck with a card list (one card per line, e.g. 2 Ariel). A funny name will be generated for you.</p>

    <form onsubmit={onSubmit} class="stack" style="margin-top: 8px;">
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
      <div class="label">
        Player <span class="hint">(optional)</span>
        <button
          type="button"
          class="input deck-new__player-btn"
          onclick={() => (playerPickerOpen = true)}
          aria-label="Choose player"
        >
          <span class="deck-new__player-label">{selectedPlayerLabel}</span>
        </button>
      </div>
      <PlayerPickerModal
        bind:open={playerPickerOpen}
        title="Select player"
        forLabel="this deck"
        onSelect={onPlayerSelect}
        onClose={() => (playerPickerOpen = false)}
      />
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

<style>
  .deck-new__player-btn {
    text-align: left;
    cursor: pointer;
  }
  .deck-new__player-label {
    color: var(--fg);
  }
</style>
