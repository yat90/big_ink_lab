<script lang="ts">
  import { goto } from '$app/navigation';
  import { getAuthToken } from '$lib/auth';
  import { config } from '$lib/config';
  import DeckColorSelect from '$lib/DeckColorSelect.svelte';
  import DeckPickerModal from '$lib/DeckPickerModal.svelte';
  import PlayerPickerModal from '$lib/PlayerPickerModal.svelte';
  import { STAGE_OPTIONS } from '$lib/matches';
  import { onMount } from 'svelte';

  type Player = { _id: string; name: string; team: string };

  let players = $state<Player[]>([]);
  let p1 = $state('');
  let p2 = $state('');
  let p1DeckId = $state('');
  let p2DeckId = $state('');
  let p1DeckDisplayName = $state('');
  let p2DeckDisplayName = $state('');
  let playerPickerOpen = $state(false);
  let playerPickerRole = $state<'p1' | 'p2'>('p1');
  let deckPickerOpen = $state(false);
  let deckPickerRole = $state<'p1' | 'p2'>('p1');
  let stage = $state('Casual');
  let tournamentName = $state('');
  function nowForDatetimeLocal(): string {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  let playedAt = $state(nowForDatetimeLocal());
  let round = $state<number | ''>('');
  let p1DeckColor = $state('');
  let p2DeckColor = $state('');
  let matchWinner = $state('');
  let notes = $state('');
  let loading = $state(false);
  let error = $state('');

  let showAddPlayer = $state(false);
  let newPlayerName = $state('');
  let newPlayerTeam = $state('');
  let addPlayerLoading = $state(false);
  let addPlayerError = $state('');

  const apiUrl = config.apiUrl ?? '/api';

  const BIG_INK_TEAM = 'The Big Ink Theory';
  const playersForSelect = $derived(
    [...players].sort((a, b) => {
      const aPreferred = (a.team?.trim() ?? '') === BIG_INK_TEAM;
      const bPreferred = (b.team?.trim() ?? '') === BIG_INK_TEAM;
      if (aPreferred && !bPreferred) return -1;
      if (!aPreferred && bPreferred) return 1;
      return 0;
    })
  );

  const winnerOptions = $derived(
    [p1, p2].map((id) => players.find((pl) => pl._id === id)).filter((pl): pl is Player => !!pl)
  );

  function getPlayerTeam(playerId: string): string {
    return (players.find((pl) => pl._id === playerId)?.team ?? '').trim();
  }
  const showP1DeckSelect = $derived(!!p1 && getPlayerTeam(p1) === BIG_INK_TEAM);
  const showP2DeckSelect = $derived(!!p2 && getPlayerTeam(p2) === BIG_INK_TEAM);

  const p1PlayerDisplayName = $derived(
    p1 ? (players.find((pl) => pl._id === p1)?.name ?? 'Player 1') : 'Player 1'
  );
  const p2PlayerDisplayName = $derived(
    p2 ? (players.find((pl) => pl._id === p2)?.name ?? 'Player 2') : 'Player 2'
  );

  async function fetchDeck(deckId: string): Promise<{ name: string; deckColor: string } | null> {
    if (!deckId.trim()) return null;
    try {
      const res = await fetch(`${apiUrl}/decks/${deckId}`);
      if (res.ok) {
        const deck = await res.json();
        return {
          name: deck?.name ?? '',
          deckColor: (deck?.deckColor ?? '').trim(),
        };
      }
    } catch {
      /* ignore */
    }
    return null;
  }

  function openPlayerPicker(role: 'p1' | 'p2') {
    playerPickerRole = role;
    playerPickerOpen = true;
  }

  function handlePlayerSelect(playerId: string) {
    if (playerPickerRole === 'p1') p1 = playerId;
    else p2 = playerId;
    playerPickerOpen = false;
  }

  function openDeckPicker(role: 'p1' | 'p2') {
    deckPickerRole = role;
    deckPickerOpen = true;
  }

  async function handleDeckSelect(deckId: string) {
    const deck = deckId.trim() ? await fetchDeck(deckId) : null;
    if (deckPickerRole === 'p1') {
      p1DeckId = deckId;
      p1DeckDisplayName = deck?.name ?? '';
      if (deck?.deckColor) p1DeckColor = deck.deckColor;
      else if (!deckId.trim()) p1DeckColor = '';
    } else {
      p2DeckId = deckId;
      p2DeckDisplayName = deck?.name ?? '';
      if (deck?.deckColor) p2DeckColor = deck.deckColor;
      else if (!deckId.trim()) p2DeckColor = '';
    }
    deckPickerOpen = false;
  }

  const p1DeckButtonLabel = $derived(p1DeckDisplayName || '—');
  const p2DeckButtonLabel = $derived(p2DeckDisplayName || '—');

  $effect(() => {
    if (matchWinner && !winnerOptions.some((pl) => pl._id === matchWinner)) {
      matchWinner = '';
    }
  });

  $effect(() => {
    if (p1 && p2 === p1) {
      p2 = '';
    }
  });

  async function fetchPlayers() {
    try {
      const res = await fetch(`${apiUrl}/players?limit=100`);
      if (res.ok) {
        const json = await res.json();
        players = Array.isArray(json) ? json : (json?.data ?? []);
      }
    } catch {
      /* ignore */
    }
  }

  async function preselectMyPlayer() {
    const token = getAuthToken();
    if (!token) return;
    try {
      const res = await fetch(`${apiUrl}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.player?._id) p1 = data.player._id;
      }
    } catch {
      /* ignore */
    }
  }

  onMount(async () => {
    await fetchPlayers();
    await preselectMyPlayer();
  });

  async function onAddPlayer(e: Event) {
    e.preventDefault();
    addPlayerError = '';
    if (!newPlayerName.trim()) return;
    addPlayerLoading = true;
    try {
      const res = await fetch(`${apiUrl}/players`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newPlayerName.trim(), team: newPlayerTeam.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        addPlayerError = data.message ?? 'Failed to add player';
        addPlayerLoading = false;
        return;
      }
      const created = await res.json();
      await fetchPlayers();
      newPlayerName = '';
      newPlayerTeam = '';
      showAddPlayer = false;
      if (!p1) p1 = created._id;
      else if (!p2) p2 = created._id;
    } catch {
      addPlayerError = 'Could not reach API.';
    } finally {
      addPlayerLoading = false;
    }
  }

  async function onSubmit(e: Event) {
    e.preventDefault();
    error = '';
    loading = true;
    try {
      const body: Record<string, unknown> = {
        p1,
        p2: p2 || undefined,
        stage,
        playedAt: playedAt ? new Date(playedAt).toISOString() : new Date().toISOString(),
        p1DeckColor: p1DeckColor || undefined,
        p2DeckColor: p2DeckColor || undefined,
        p1Deck: p1DeckId.trim() || undefined,
        p2Deck: p2DeckId.trim() || undefined,
        matchWinner: matchWinner || undefined,
        notes: notes.trim(),
        games: [],
      };
      if (stage === 'Tournament') {
        body.tournamentName = tournamentName.trim();
        body.round = round === '' ? undefined : Number(round);
      }
      const res = await fetch(`${apiUrl}/matches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        error = data.message ?? `Error ${res.status}`;
        loading = false;
        return;
      }
      const match = await res.json();
      await goto(`/matches/${match._id}`);
    } catch {
      error = 'Could not reach API.';
    } finally {
      loading = false;
    }
  }
</script>

<div class="page new-match-page">
  <h2 class="page-title">New match</h2>
  <p class="page-sub">Create a new match between two players.</p>

  <form onsubmit={onSubmit} class="new-match__form stack">
    <input type="hidden" name="p1" value={p1} required />

    <!-- Match base info -->
    <section class="card stack new-match__card" aria-labelledby="match-card-title">
      <h3 id="match-card-title" class="card__title new-match__card-title">Match</h3>
      <div class="formgrid">
        <label class="label" for="stage">
          Stage
          <select id="stage" class="input" bind:value={stage}>
            {#each STAGE_OPTIONS as s}
              <option value={s}>{s}</option>
            {/each}
          </select>
        </label>
        <label class="label" for="playedAt">
          Played at
          <input id="playedAt" type="datetime-local" class="input" bind:value={playedAt} />
        </label>
      </div>
      {#if stage === 'Tournament'}
        <label class="label" for="tournamentName">Tournament name</label>
        <input
          id="tournamentName"
          type="text"
          class="input"
          bind:value={tournamentName}
          placeholder="Tournament name"
        />
        <div class="formgrid">
          <label class="label" for="round">Round</label>
          <input
            id="round"
            type="number"
            class="input"
            min="1"
            bind:value={round}
            placeholder="Round number"
          />
          <label class="label" for="matchWinner">Winner</label>
          <select id="matchWinner" class="input" bind:value={matchWinner}>
            <option value="">–</option>
            {#each winnerOptions as pl}
              <option value={pl._id}
                >{pl.name}{#if pl.team}
                  – {pl.team}{/if}</option
              >
            {/each}
          </select>
        </div>
      {:else}
        <label class="label" for="matchWinner">Winner</label>
        <select id="matchWinner" class="input" bind:value={matchWinner}>
          <option value="">–</option>
          {#each winnerOptions as pl}
            <option value={pl._id}
              >{pl.name}{#if pl.team}
                – {pl.team}{/if}</option
            >
          {/each}
        </select>
      {/if}
      <label class="label" for="notes">Notes</label>
      <input id="notes" type="text" class="input" bind:value={notes} placeholder="Optional" />
    </section>

    <!-- Player 1 -->
    <section class="card stack new-match__card" aria-labelledby="p1-card-title">
      <h3 id="p1-card-title" class="card__title new-match__card-title">Player 1</h3>
      <label class="label" for="p1">Player</label>
      <button
        id="p1"
        type="button"
        class="input new-match__select-btn"
        onclick={() => openPlayerPicker('p1')}
        title="Click to choose player"
      >
        {p1PlayerDisplayName}
      </button>
      {#if showP1DeckSelect}
        <label class="label" for="p1Deck">Deck</label>
        <button
          id="p1Deck"
          type="button"
          class="input new-match__select-btn"
          onclick={() => openDeckPicker('p1')}
          title="Optional deck – click to choose"
        >
          {p1DeckButtonLabel}
        </button>
      {/if}
      <label class="label" for="p1DeckColor">Deck color</label>
      <DeckColorSelect id="p1DeckColor" bind:value={p1DeckColor} ariaLabel="P1 deck color" />
    </section>

    <!-- Player 2 -->
    <section class="card stack new-match__card" aria-labelledby="p2-card-title">
      <h3 id="p2-card-title" class="card__title new-match__card-title">Player 2</h3>
      <label class="label" for="p2">Player</label>
      <button
        id="p2"
        type="button"
        class="input new-match__select-btn"
        onclick={() => openPlayerPicker('p2')}
        title="Click to choose player"
      >
        {p2PlayerDisplayName}
      </button>
      {#if showP2DeckSelect}
        <label class="label" for="p2Deck">Deck</label>
        <button
          id="p2Deck"
          type="button"
          class="input new-match__select-btn"
          onclick={() => openDeckPicker('p2')}
          title="Optional deck – click to choose"
        >
          {p2DeckButtonLabel}
        </button>
      {/if}

      <div class="row new-match__add-player-row">
        <button
          type="button"
          class="btn"
          onclick={() => (showAddPlayer = !showAddPlayer)}
          aria-expanded={showAddPlayer}
        >
          {showAddPlayer ? 'Cancel' : '+ Add new player'}
        </button>
      </div>

      {#if showAddPlayer}
        <div class="card stack new-match__card new-match__add-player-card">
          <p class="card__sub" style="margin: 0;">
            Create a player and they'll be added to the list.
          </p>
          <div class="stack formgrid" style="margin-top: 10px;">
            <label class="label" for="newPlayerName">Name</label>
            <input
              id="newPlayerName"
              type="text"
              class="input"
              bind:value={newPlayerName}
              placeholder="Player name"
            />
            <label class="label" for="newPlayerTeam">Team</label>
            <input
              id="newPlayerTeam"
              type="text"
              class="input"
              bind:value={newPlayerTeam}
              placeholder="Optional"
            />
            {#if addPlayerError}
              <p class="alert" style="grid-column: 1 / -1;">{addPlayerError}</p>
            {/if}
            <div class="row" style="grid-column: 1 / -1;">
              <button
                type="button"
                class="btn btn--primary"
                disabled={addPlayerLoading}
                onclick={onAddPlayer}
              >
                {addPlayerLoading ? 'Adding…' : 'Add player'}
              </button>
            </div>
          </div>
        </div>
      {/if}

      <label class="label" for="p2DeckColor">Deck color</label>
      <DeckColorSelect id="p2DeckColor" bind:value={p2DeckColor} ariaLabel="P2 deck color" />
    </section>

    {#if error}
      <p class="alert" role="alert" aria-live="assertive">{error}</p>
    {/if}

    <div class="row new-match__actions">
      <button type="submit" class="btn btn--primary" disabled={loading}>
        {loading ? 'Creating…' : 'Create match'}
      </button>
      <a href="/matches" class="btn">Cancel</a>
    </div>
  </form>

  <PlayerPickerModal
    bind:open={playerPickerOpen}
    title="Select player"
    forLabel={playerPickerRole === 'p1' ? 'Player 1' : 'Player 2'}
    excludePlayerId={playerPickerRole === 'p1' ? p2 : p1}
    onSelect={handlePlayerSelect}
    onClose={() => (playerPickerOpen = false)}
  />
  <DeckPickerModal
    bind:open={deckPickerOpen}
    title="Select deck"
    forLabel={deckPickerRole === 'p1' ? p1PlayerDisplayName : p2PlayerDisplayName}
    onSelect={handleDeckSelect}
    onClose={() => (deckPickerOpen = false)}
  />
</div>

<style>
  .new-match-page {
    max-width: 720px;
  }
  .new-match-page .page-title {
    margin: 0 0 0.25rem 0;
    font-size: 1.5rem;
    font-weight: 700;
  }
  .new-match-page .page-sub {
    margin: 0 0 1.25rem 0;
    color: var(--muted);
    font-size: 0.9375rem;
  }
  .new-match__form {
    margin-top: 0;
  }
  .new-match__card {
    margin-bottom: var(--space-md, 1rem);
    z-index:1;
  }
  .new-match__card-title {
    font-size: 1rem;
    margin-bottom: 0.75rem;
  }
  .new-match__add-player-row {
    margin-bottom: var(--space-sm, 0.5rem);
  }
  .new-match__add-player-card {
    margin-bottom: var(--space-md, 1rem);
  }
  .new-match__actions {
    margin-top: var(--space-md, 1rem);
    gap: 0.75rem;
  }
  @media (min-width: 640px) {
    .new-match__form {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--space-md, 1rem);
      align-items: start;
    }
    .new-match__form .new-match__card:first-of-type {
      grid-column: 1 / -1;
    }
    .new-match__form .new-match__add-player-row,
    .new-match__form .new-match__add-player-card,
    .new-match__form .alert,
    .new-match__form .new-match__actions {
      grid-column: 1 / -1;
    }
  }
  .new-match__select-btn {
    text-align: left;
    cursor: pointer;
    width: 100%;
  }
</style>
