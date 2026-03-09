<script lang="ts">
  import DeckColorSelect from '$lib/DeckColorSelect.svelte';
  import DeckPickerModal from '$lib/DeckPickerModal.svelte';

  type PlayerOption = { _id: string; name: string };
  type DeckOption = { _id: string; name: string };

  type Props = {
    p1Id: string | undefined;
    p2Id: string | undefined;
    p1DeckColor: string;
    p2DeckColor: string;
    p1DeckId: string;
    p2DeckId: string;
    /** Display name from match (populated deck); used so selected deck name shows after save. */
    p1DeckDisplayName?: string;
    p2DeckDisplayName?: string;
    /** Player display names for deck picker headline (e.g. "Robert" not "Player 1"). */
    p1PlayerName?: string;
    p2PlayerName?: string;
    players: PlayerOption[];
    decks: DeckOption[];
    showP1DeckSelect: boolean;
    showP2DeckSelect: boolean;
    updatingPlayer: 'p1' | 'p2' | null;
    updatingDeckColor: boolean;
    updatingDeck: 'p1' | 'p2' | null;
    onPlayerChange: (role: 'p1' | 'p2', playerId: string) => void;
    onDeckColorChange: (p1DeckColor: string | undefined, p2DeckColor: string | undefined) => void;
    onDeckChange: (role: 'p1' | 'p2', deckId: string) => void;
  };

  let {
    p1Id,
    p2Id,
    p1DeckColor,
    p2DeckColor,
    p1DeckId,
    p2DeckId,
    p1DeckDisplayName = '',
    p2DeckDisplayName = '',
    p1PlayerName = 'Player 1',
    p2PlayerName = 'Player 2',
    players,
    decks,
    showP1DeckSelect,
    showP2DeckSelect,
    updatingPlayer,
    updatingDeckColor,
    updatingDeck,
    onPlayerChange,
    onDeckColorChange,
    onDeckChange,
  }: Props = $props();

  let deckPickerOpen = $state(false);
  let deckPickerRole = $state<'p1' | 'p2'>('p1');

  function openDeckPicker(role: 'p1' | 'p2') {
    deckPickerRole = role;
    deckPickerOpen = true;
  }

  function handleDeckSelect(deckId: string) {
    onDeckChange(deckPickerRole, deckId);
    deckPickerOpen = false;
  }

  const p1DeckName = $derived(
    (p1DeckDisplayName && p1DeckDisplayName !== '—' ? p1DeckDisplayName : null) ??
      decks.find((d) => d._id === p1DeckId)?.name ??
      '—',
  );
  const p2DeckName = $derived(
    (p2DeckDisplayName && p2DeckDisplayName !== '—' ? p2DeckDisplayName : null) ??
      decks.find((d) => d._id === p2DeckId)?.name ??
      '—',
  );
</script>

<div class="matchcard__edit">
  <div class="matchcard__edit-section">
    <span class="matchcard__edit-label muted">Player 1</span>
    <div class="matchcard__edit-fields">
      <div class="matchcard__edit-field">
        <span class="matchcard__edit-field-label">Player</span>
        <select
          class="input matchcard__player-select"
          value={p1Id ?? ''}
          disabled={updatingPlayer === 'p1'}
          onchange={(e) => onPlayerChange('p1', e.currentTarget.value)}
          aria-label="Player 1"
        >
          <option value="">Player 1</option>
          {#each players as pl (pl._id)}
            <option value={pl._id} disabled={pl._id === p2Id}>{pl.name}</option>
          {/each}
        </select>
      </div>
      <div class="matchcard__edit-field">
        <span class="matchcard__edit-field-label">Deck color</span>
        <DeckColorSelect
          className="matchcard__deck-select"
          value={p1DeckColor}
          disabled={updatingDeckColor || !!p1DeckId}
          onchange={(v) => onDeckColorChange(v || undefined, p2DeckColor || undefined)}
          ariaLabel="P1 deck color"
        />
      </div>
      {#if showP1DeckSelect}
        <div class="matchcard__edit-field">
          <span class="matchcard__edit-field-label">Deck</span>
          <button
            type="button"
            class="input matchcard__deck-select matchcard__deck-select-btn"
            disabled={updatingDeck === 'p1'}
            onclick={() => openDeckPicker('p1')}
            aria-label="P1 deck (optional)"
            title="Optional deck – click to choose"
          >
            {p1DeckName}
          </button>
        </div>
      {/if}
    </div>
  </div>
  <div class="matchcard__edit-section">
    <span class="matchcard__edit-label muted">Player 2</span>
    <div class="matchcard__edit-fields">
      <div class="matchcard__edit-field">
        <span class="matchcard__edit-field-label">Player</span>
        <select
          class="input matchcard__player-select"
          value={p2Id ?? ''}
          disabled={updatingPlayer === 'p2'}
          onchange={(e) => onPlayerChange('p2', e.currentTarget.value)}
          aria-label="Player 2"
        >
          <option value="">Player 2</option>
          {#each players as pl (pl._id)}
            <option value={pl._id} disabled={pl._id === p1Id}>{pl.name}</option>
          {/each}
        </select>
      </div>
      <div class="matchcard__edit-field">
        <span class="matchcard__edit-field-label">Deck color</span>
        <DeckColorSelect
          className="matchcard__deck-select"
          value={p2DeckColor}
          disabled={updatingDeckColor || !!p2DeckId}
          onchange={(v) => onDeckColorChange(p1DeckColor || undefined, v || undefined)}
          ariaLabel="P2 deck color"
        />
      </div>
      {#if showP2DeckSelect}
        <div class="matchcard__edit-field">
          <span class="matchcard__edit-field-label">Deck</span>
          <button
            type="button"
            class="input matchcard__deck-select matchcard__deck-select-btn"
            disabled={updatingDeck === 'p2'}
            onclick={() => openDeckPicker('p2')}
            aria-label="P2 deck (optional)"
            title="Optional deck – click to choose"
          >
            {p2DeckName}
          </button>
        </div>
      {/if}
    </div>
  </div>

  <DeckPickerModal
    bind:open={deckPickerOpen}
    title="Select deck"
    forLabel={deckPickerRole === 'p1' ? p1PlayerName : p2PlayerName}
    onSelect={handleDeckSelect}
    onClose={() => (deckPickerOpen = false)}
  />
</div>

<style>
  .matchcard__edit {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }
  .matchcard__edit-section {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  .matchcard__edit-label {
    font-size: 0.9375rem;
    font-weight: 700;
    margin-bottom: 0.25rem;
  }
  .matchcard__edit-fields {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem 1.5rem;
    align-items: flex-start;
  }
  .matchcard__edit-field {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    min-width: 160px;
  }
  .matchcard__edit-field-label {
    font-size: 0.8125rem;
    font-weight: 600;
    color: var(--muted, #666);
  }
  .matchcard__edit-fields .matchcard__player-select,
  .matchcard__edit-fields .matchcard__deck-select {
    min-width: 160px;
  }
  .matchcard__deck-select-btn {
    text-align: left;
    cursor: pointer;
  }
</style>
