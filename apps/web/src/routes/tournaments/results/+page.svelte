<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { getAuthToken } from '$lib/auth';
  import { config } from '$lib/config';
  import DeckColorSelect from '$lib/DeckColorSelect.svelte';
  import DeckPickerModal from '$lib/DeckPickerModal.svelte';
  import PlayerPickerModal from '$lib/PlayerPickerModal.svelte';
  import { onMount } from 'svelte';

  type Player = { _id: string; name: string; team: string };

  type GameRow = {
    winnerSide: '' | 'p1' | 'p2';
    starterSide: '' | 'p1' | 'p2';
    p1Lore: string;
    p2Lore: string;
    notes: string;
  };
  type RoundRow = {
    round: number;
    p2: string;
    p2DeckId: string;
    p2DeckDisplayName: string;
    p2DeckColor: string;
    notes: string;
    games: GameRow[];
  };

  type PlayerPickerCtx = { scope: 'event-p1' } | { scope: 'round-p2'; roundIndex: number };
  type DeckPickerCtx = { scope: 'event-p1' } | { scope: 'round-p2'; roundIndex: number };
  type AddPlayerCtx = null | { kind: 'event-p1' } | { kind: 'round-p2'; roundIndex: number };

  const apiUrl = config.apiUrl ?? '/api';
  const BIG_INK_TEAM = 'The Big Ink Theory';

  let tournamentName = $state('');
  let playedAt = $state('');
  let tournamentNames = $state<string[]>([]);
  let players = $state<Player[]>([]);
  /** You — one choice for the whole event. */
  let eventP1 = $state('');
  let p1DeckId = $state('');
  let p1DeckDisplayName = $state('');
  /** Shared across all rounds (same as your deck). */
  let p1DeckColor = $state('');
  let rounds = $state<RoundRow[]>([emptyRound(1)]);
  let loading = $state(false);
  let error = $state('');
  let resultMessage = $state('');

  let playerPickerOpen = $state(false);
  let playerPickerContext = $state<PlayerPickerCtx | null>(null);
  let deckPickerOpen = $state(false);
  let deckPickerContext = $state<DeckPickerCtx | null>(null);

  let addPlayerContext = $state<AddPlayerCtx>(null);
  let newPlayerName = $state('');
  let newPlayerTeam = $state('');
  let addPlayerLoading = $state(false);
  let addPlayerError = $state('');

  function nowForDatetimeLocal(): string {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function emptyGame(): GameRow {
    return {
      winnerSide: '',
      starterSide: '',
      p1Lore: '',
      p2Lore: '',
      notes: '',
    };
  }

  function emptyRound(n: number): RoundRow {
    return {
      round: n,
      p2: '',
      p2DeckId: '',
      p2DeckDisplayName: '',
      p2DeckColor: '',
      notes: '',
      games: [emptyGame()],
    };
  }

  function getPlayerTeam(playerId: string): string {
    return (players.find((pl) => pl._id === playerId)?.team ?? '').trim();
  }

  const eventP1Label = $derived(
    eventP1 ? (players.find((pl) => pl._id === eventP1)?.name ?? 'You') : '—'
  );

  function roundP2Label(r: RoundRow): string {
    if (!r.p2) return 'Opponent';
    return players.find((pl) => pl._id === r.p2)?.name ?? 'Opponent';
  }

  function showEventP1DeckSelect(): boolean {
    return !!eventP1 && getPlayerTeam(eventP1) === BIG_INK_TEAM;
  }

  function showRoundP2DeckSelect(r: RoundRow): boolean {
    return !!r.p2 && getPlayerTeam(r.p2) === BIG_INK_TEAM;
  }

  async function fetchDeck(deckId: string): Promise<{ name: string; deckColor: string } | null> {
    if (!deckId.trim()) return null;
    try {
      const res = await fetch(`${apiUrl}/decks/${deckId}`);
      if (res.ok) {
        const deck = await res.json();
        return { name: deck?.name ?? '', deckColor: (deck?.deckColor ?? '').trim() };
      }
    } catch {
      /* ignore */
    }
    return null;
  }

  async function fetchPlayers() {
    try {
      const res = await fetch(`${apiUrl}/players?limit=200`);
      if (res.ok) {
        const json = await res.json();
        players = Array.isArray(json) ? json : (json?.data ?? []);
      }
    } catch {
      /* ignore */
    }
  }

  async function fetchTournamentNames() {
    try {
      const res = await fetch(`${apiUrl}/matches/tournaments`);
      if (res.ok) {
        const data = await res.json();
        tournamentNames = data.tournamentNames ?? [];
      }
    } catch {
      tournamentNames = [];
    }
  }

  /** Preselect You from the logged-in user's linked player (same as new match). */
  async function preselectMyPlayer() {
    const token = getAuthToken();
    if (!token) return;
    try {
      const res = await fetch(`${apiUrl}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const id = data?.player?._id;
        if (id && typeof id === 'string' && !eventP1) {
          eventP1 = id;
        }
      }
    } catch {
      /* ignore */
    }
  }

  onMount(async () => {
    playedAt = nowForDatetimeLocal();
    const q = $page.url.searchParams.get('tournamentName');
    if (q) tournamentName = decodeURIComponent(q);
    await Promise.all([fetchPlayers(), fetchTournamentNames()]);
    await preselectMyPlayer();
  });

  function toggleAddPlayerEventP1() {
    addPlayerError = '';
    if (addPlayerContext?.kind === 'event-p1') {
      addPlayerContext = null;
      newPlayerName = '';
      newPlayerTeam = '';
      return;
    }
    addPlayerContext = { kind: 'event-p1' };
    newPlayerName = '';
    newPlayerTeam = '';
  }

  function toggleAddPlayerRoundP2(roundIndex: number) {
    addPlayerError = '';
    if (addPlayerContext?.kind === 'round-p2' && addPlayerContext.roundIndex === roundIndex) {
      addPlayerContext = null;
      newPlayerName = '';
      newPlayerTeam = '';
      return;
    }
    addPlayerContext = { kind: 'round-p2', roundIndex };
    newPlayerName = '';
    newPlayerTeam = '';
  }

  async function onAddPlayer(e: Event) {
    e.preventDefault();
    addPlayerError = '';
    if (!addPlayerContext) return;
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
        addPlayerError = (data as { message?: string }).message ?? 'Failed to add player';
        addPlayerLoading = false;
        return;
      }
      const created = await res.json();
      await fetchPlayers();
      newPlayerName = '';
      newPlayerTeam = '';
      const ctx = addPlayerContext;
      addPlayerContext = null;
      if (ctx.kind === 'event-p1') {
        if (eventP1) {
          addPlayerError = 'You are already selected.';
          addPlayerLoading = false;
          return;
        }
        eventP1 = created._id;
      } else {
        const ri = ctx.roundIndex;
        if (rounds[ri].p2) {
          addPlayerError = 'Opponent is already selected.';
          addPlayerLoading = false;
          return;
        }
        rounds = rounds.map((r, i) => (i === ri ? { ...r, p2: created._id } : r));
      }
    } catch {
      addPlayerError = 'Could not reach API.';
    } finally {
      addPlayerLoading = false;
    }
  }

  function openEventPlayerPicker() {
    playerPickerContext = { scope: 'event-p1' };
    playerPickerOpen = true;
  }

  function openRoundPlayerPicker(roundIndex: number) {
    playerPickerContext = { scope: 'round-p2', roundIndex };
    playerPickerOpen = true;
  }

  function handlePlayerSelect(playerId: string) {
    if (!playerPickerContext) return;
    if (playerPickerContext.scope === 'event-p1') {
      eventP1 = playerId;
    } else {
      const ri = playerPickerContext.roundIndex;
      rounds = rounds.map((row, i) => (i === ri ? { ...row, p2: playerId } : row));
    }
    playerPickerOpen = false;
    playerPickerContext = null;
  }

  function openDeckPickerEventP1() {
    deckPickerContext = { scope: 'event-p1' };
    deckPickerOpen = true;
  }

  function openDeckPickerRoundP2(roundIndex: number) {
    deckPickerContext = { scope: 'round-p2', roundIndex };
    deckPickerOpen = true;
  }

  async function handleDeckSelect(deckId: string) {
    /** Snapshot before await — modal onClose used to clear context while fetchDeck was in flight. */
    const ctx = deckPickerContext;
    if (!ctx) return;
    const deck = deckId.trim() ? await fetchDeck(deckId) : null;
    if (ctx.scope === 'event-p1') {
      p1DeckId = deckId;
      p1DeckDisplayName = deck?.name ?? '';
      if (deck?.deckColor?.trim()) {
        p1DeckColor = deck.deckColor.trim();
      } else if (!deckId.trim()) {
        p1DeckColor = '';
      }
    } else {
      const ri = ctx.roundIndex;
      rounds = rounds.map((row, i) => {
        if (i !== ri) return row;
        return {
          ...row,
          p2DeckId: deckId,
          p2DeckDisplayName: deck?.name ?? '',
          p2DeckColor: deck?.deckColor ? deck.deckColor : deckId ? row.p2DeckColor : '',
        };
      });
    }
    deckPickerOpen = false;
    deckPickerContext = null;
  }

  function addRound() {
    const n = rounds.length + 1;
    rounds = [...rounds, emptyRound(n)];
  }

  function removeRound(index: number) {
    if (rounds.length <= 1) return;
    rounds = rounds.filter((_, i) => i !== index).map((r, i) => ({ ...r, round: i + 1 }));
  }

  function patchGame(roundIndex: number, gameIndex: number, patch: Partial<GameRow>) {
    rounds = rounds.map((row, i) => {
      if (i !== roundIndex) return row;
      return {
        ...row,
        games: row.games.map((g, gi) => (gi === gameIndex ? { ...g, ...patch } : g)),
      };
    });
  }

  function addGame(roundIndex: number) {
    rounds = rounds.map((row, i) =>
      i === roundIndex ? { ...row, games: [...row.games, emptyGame()] } : row
    );
  }

  function removeGame(roundIndex: number, gameIndex: number) {
    rounds = rounds.map((row, i) => {
      if (i !== roundIndex || row.games.length <= 1) return row;
      return { ...row, games: row.games.filter((_, gi) => gi !== gameIndex) };
    });
  }

  const pickerExcludeId = $derived(
    playerPickerContext?.scope === 'round-p2' ? eventP1 : ''
  );

  const deckPickerLabel = $derived(
    deckPickerContext?.scope === 'event-p1'
      ? eventP1Label
      : deckPickerContext?.scope === 'round-p2'
        ? roundP2Label(rounds[deckPickerContext.roundIndex])
        : ''
  );

  function parseLoreField(s: string): number | undefined {
    const t = s.trim();
    if (t === '') return undefined;
    const n = Number.parseInt(t, 10);
    if (Number.isNaN(n) || n < 0) return undefined;
    return n;
  }

  async function onSubmit(e: Event) {
    e.preventDefault();
    error = '';
    resultMessage = '';
    if (!tournamentName.trim()) {
      error = 'Tournament name is required.';
      return;
    }
    if (!eventP1.trim()) {
      error = 'Choose You in Event.';
      return;
    }
    const bodyRounds = [];
    for (const r of rounds) {
      if (!r.p2.trim()) {
        error = `Round ${r.round}: choose Opponent.`;
        return;
      }
      if (eventP1 === r.p2) {
        error = `Round ${r.round}: Opponent must be different from You.`;
        return;
      }
      const games = [];
      for (const g of r.games) {
        if (g.winnerSide !== 'p1' && g.winnerSide !== 'p2') {
          error = `Round ${r.round}: each game needs a winner (You or Opponent).`;
          return;
        }
        const winnerId = g.winnerSide === 'p1' ? eventP1 : r.p2;
        const starterId =
          g.starterSide === 'p1' ? eventP1 : g.starterSide === 'p2' ? r.p2 : undefined;
        const p1Lore = parseLoreField(g.p1Lore);
        const p2Lore = parseLoreField(g.p2Lore);
        games.push({
          winner: winnerId,
          starter: starterId,
          ...(p1Lore !== undefined ? { p1Lore } : {}),
          ...(p2Lore !== undefined ? { p2Lore } : {}),
          notes: g.notes.trim() || undefined,
        });
      }
      bodyRounds.push({
        round: r.round,
        p1: eventP1,
        p2: r.p2,
        p1Deck: p1DeckId.trim() || undefined,
        p2Deck: r.p2DeckId.trim() || undefined,
        p1DeckColor: p1DeckColor || undefined,
        p2DeckColor: r.p2DeckColor || undefined,
        notes: r.notes.trim() || undefined,
        games,
      });
    }

    const playedIso = new Date(playedAt);
    if (Number.isNaN(playedIso.getTime())) {
      error = 'Invalid date/time.';
      return;
    }

    loading = true;
    try {
      const res = await fetch(`${apiUrl}/matches/tournaments/bulk-results`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tournamentName: tournamentName.trim(),
          playedAt: playedIso.toISOString(),
          rounds: bodyRounds,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        error = (data as { message?: string }).message ?? `Error ${res.status}`;
        loading = false;
        return;
      }
      const created = (data as { created?: { _id: string }[] }).created ?? [];
      const failed = (data as { failed?: { round: number; message: string }[] }).failed ?? [];
      if (failed.length) {
        resultMessage = `Created ${created.length} match(es). Failed: ${failed.map((f) => `R${f.round}: ${f.message}`).join('; ')}`;
      } else {
        resultMessage = `Created ${created.length} match(es).`;
      }
      if (created.length === bodyRounds.length && created[0]?._id) {
        await goto(`/matches/${created[0]._id}`);
        return;
      }
    } catch {
      error = 'Could not reach API.';
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head>
  <title>Tournament results · Big Ink Lab</title>
</svelte:head>

<div class="page tournament-results-page">
  <h1 class="page-title">Tournament results</h1>
  <p class="page-sub">
    Choose You, your deck, and your deck color once under Event, then each round pick Opponent and
    opponent deck color. All rounds share the same event time.
  </p>

  <form class="stack tournament-results__form" onsubmit={onSubmit}>
    <section class="card stack">
      <h2 class="card__title">Event</h2>
      <label class="label" for="tournamentName">Tournament name</label>
      <input
        id="tournamentName"
        class="input"
        bind:value={tournamentName}
        placeholder="Name"
        list="tournament-results-datalist"
        autocomplete="off"
        required
      />
      {#if tournamentNames.length > 0}
        <datalist id="tournament-results-datalist">
          {#each tournamentNames as name (name)}
            <option value={name}></option>
          {/each}
        </datalist>
      {/if}
      <label class="label" for="playedAt">Played at (event time)</label>
      <input id="playedAt" type="datetime-local" class="input" bind:value={playedAt} required />

      <label class="label" for="event-p1">You</label>
      <button
        id="event-p1"
        type="button"
        class="input tournament-results__select-btn"
        onclick={openEventPlayerPicker}
      >
        {eventP1Label}
      </button>

      <div class="row tournament-results__add-player-row">
        {#if !eventP1}
          <button
            type="button"
            class="btn"
            aria-expanded={addPlayerContext?.kind === 'event-p1'}
            onclick={toggleAddPlayerEventP1}
          >
            {addPlayerContext?.kind === 'event-p1' ? 'Cancel' : '+ New player (you)'}
          </button>
        {/if}
      </div>

      {#if addPlayerContext?.kind === 'event-p1'}
        <div class="card stack tournament-results__add-player-card">
          <p class="card__sub" style="margin: 0;">Create a player and assign them as You.</p>
          <div class="stack formgrid" style="margin-top: 10px;">
            <label class="label" for="tr-new-name-event">Name</label>
            <input
              id="tr-new-name-event"
              type="text"
              class="input"
              bind:value={newPlayerName}
              placeholder="Player name"
            />
            <label class="label" for="tr-new-team-event">Team</label>
            <input
              id="tr-new-team-event"
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

      {#if showEventP1DeckSelect()}
        <label class="label" for="event-p1-deck">Your Deck</label>
        <button
          id="event-p1-deck"
          type="button"
          class="input tournament-results__select-btn"
          onclick={openDeckPickerEventP1}
        >
          {p1DeckDisplayName || '—'}
        </button>
      {/if}

      {#if eventP1}
        <label class="label" for="event-p1-deck-color">Your deck color</label>
        <DeckColorSelect
          id="event-p1-deck-color"
          bind:value={p1DeckColor}
          ariaLabel="Your deck color"
        />
      {/if}
    </section>

    {#each rounds as r, roundIndex (roundIndex)}
      <section class="card stack tournament-results__round">
        <div class="tournament-results__round-head row">
          <h2 class="card__title">Round {r.round}</h2>
          {#if rounds.length > 1}
            <button type="button" class="btn" onclick={() => removeRound(roundIndex)}>
              Remove round
            </button>
          {/if}
        </div>

        <label class="label" for="p2-{roundIndex}">Opponent</label>
        <button
          id="p2-{roundIndex}"
          type="button"
          class="input tournament-results__select-btn"
          onclick={() => openRoundPlayerPicker(roundIndex)}
        >
          {roundP2Label(r)}
        </button>

        <div class="row tournament-results__add-player-row">
          {#if !r.p2}
            <button
              type="button"
              class="btn"
              aria-expanded={addPlayerContext?.kind === 'round-p2' &&
                addPlayerContext.roundIndex === roundIndex}
              onclick={() => toggleAddPlayerRoundP2(roundIndex)}
            >
              {addPlayerContext?.kind === 'round-p2' && addPlayerContext.roundIndex === roundIndex
                ? 'Cancel'
                : '+ New player (Opponent)'}
            </button>
          {/if}
        </div>

        {#if addPlayerContext?.kind === 'round-p2' && addPlayerContext.roundIndex === roundIndex}
          <div class="card stack tournament-results__add-player-card">
            <p class="card__sub" style="margin: 0;">Create a player and assign them as Opponent.</p>
            <div class="stack formgrid" style="margin-top: 10px;">
              <label class="label" for="tr-new-name-{roundIndex}">Name</label>
              <input
                id="tr-new-name-{roundIndex}"
                type="text"
                class="input"
                bind:value={newPlayerName}
                placeholder="Player name"
              />
              <label class="label" for="tr-new-team-{roundIndex}">Team</label>
              <input
                id="tr-new-team-{roundIndex}"
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

        {#if showRoundP2DeckSelect(r)}
          <label class="label" for="p2deck-{roundIndex}">Opponent deck</label>
          <button
            id="p2deck-{roundIndex}"
            type="button"
            class="input tournament-results__select-btn"
            onclick={() => openDeckPickerRoundP2(roundIndex)}
          >
            {r.p2DeckDisplayName || '—'}
          </button>
        {/if}

        <label class="label" for="p2c-{roundIndex}">Opponent deck color</label>
        <DeckColorSelect
          id="p2c-{roundIndex}"
          bind:value={r.p2DeckColor}
          ariaLabel="Opponent deck color"
        />

        <label class="label" for="mnotes-{roundIndex}">Match notes</label>
        <textarea
          id="mnotes-{roundIndex}"
          class="input"
          rows="2"
          bind:value={r.notes}
          placeholder="Optional notes for this match"
        ></textarea>

        <h3 class="tournament-results__games-title">Games</h3>
        {#each r.games as g, gi (`${roundIndex}-${gi}`)}
          <div class="tournament-results__game card stack">
            <span class="tournament-results__game-label">Game {gi + 1}</span>
            <div class="formgrid tournament-results__lore-row">
              <div>
                <label class="label" for="l1-{roundIndex}-{gi}">Your lore</label>
                <input
                  id="l1-{roundIndex}-{gi}"
                  type="number"
                  min="0"
                  class="input"
                  inputmode="numeric"
                  value={g.p1Lore}
                  oninput={(e) =>
                    patchGame(roundIndex, gi, { p1Lore: e.currentTarget.value })}
                />
              </div>
              <div>
                <label class="label" for="l2-{roundIndex}-{gi}">Opponent lore</label>
                <input
                  id="l2-{roundIndex}-{gi}"
                  type="number"
                  min="0"
                  class="input"
                  inputmode="numeric"
                  value={g.p2Lore}
                  oninput={(e) =>
                    patchGame(roundIndex, gi, { p2Lore: e.currentTarget.value })}
                />
              </div>
            </div>
            <p class="label" id="gs-label-{roundIndex}-{gi}">Starter (optional)</p>
            <div
              class="tournament-results__toggle"
              role="group"
              aria-labelledby="gs-label-{roundIndex}-{gi}"
            >
              <button
                type="button"
                class="tournament-results__toggle-btn"
                aria-pressed={g.starterSide === 'p1'}
                disabled={!eventP1}
                onclick={() => patchGame(roundIndex, gi, { starterSide: 'p1' })}
              >
                You
              </button>
              <button
                type="button"
                class="tournament-results__toggle-btn tournament-results__toggle-btn--mid"
                aria-pressed={g.starterSide === ''}
                onclick={() => patchGame(roundIndex, gi, { starterSide: '' })}
              >
                —
              </button>
              <button
                type="button"
                class="tournament-results__toggle-btn"
                aria-pressed={g.starterSide === 'p2'}
                disabled={!r.p2}
                onclick={() => patchGame(roundIndex, gi, { starterSide: 'p2' })}
              >
                {r.p2 ? roundP2Label(r) : 'Opponent'}
              </button>
            </div>
            <p class="label" id="gw-label-{roundIndex}-{gi}">Winner</p>
            <div
              class="tournament-results__toggle"
              role="group"
              aria-labelledby="gw-label-{roundIndex}-{gi}"
            >
              <button
                type="button"
                class="tournament-results__toggle-btn"
                aria-pressed={g.winnerSide === 'p1'}
                disabled={!eventP1}
                onclick={() => patchGame(roundIndex, gi, { winnerSide: 'p1' })}
              >
                You
              </button>
              <button
                type="button"
                class="tournament-results__toggle-btn tournament-results__toggle-btn--mid"
                aria-pressed={g.winnerSide === ''}
                onclick={() => patchGame(roundIndex, gi, { winnerSide: '' })}
              >
                —
              </button>
              <button
                type="button"
                class="tournament-results__toggle-btn"
                aria-pressed={g.winnerSide === 'p2'}
                disabled={!r.p2}
                onclick={() => patchGame(roundIndex, gi, { winnerSide: 'p2' })}
              >
                {r.p2 ? roundP2Label(r) : 'Opponent'}
              </button>
            </div>
            <label class="label" for="gn-{roundIndex}-{gi}">Game notes</label>
            <input
              id="gn-{roundIndex}-{gi}"
              type="text"
              class="input"
              value={g.notes}
              oninput={(e) => patchGame(roundIndex, gi, { notes: e.currentTarget.value })}
              placeholder="Optional"
            />
            {#if r.games.length > 1}
              <button type="button" class="btn" onclick={() => removeGame(roundIndex, gi)}>
                Remove game
              </button>
            {/if}
          </div>
        {/each}
        <button type="button" class="btn" onclick={() => addGame(roundIndex)}>+ Add game</button>
      </section>
    {/each}

    <button type="button" class="btn" onclick={addRound}>+ Add round</button>

    {#if error}
      <p class="alert" role="alert">{error}</p>
    {/if}
    {#if resultMessage}
      <p class="card__sub" role="status">{resultMessage}</p>
    {/if}

    <div class="row tournament-results__actions">
      <button type="submit" class="btn btn--primary" disabled={loading}>
        {loading ? 'Saving…' : 'Save all matches'}
      </button>
      <a href="/matches" class="btn">Cancel</a>
    </div>
  </form>

  <PlayerPickerModal
    bind:open={playerPickerOpen}
    title="Select player"
    forLabel={playerPickerContext?.scope === 'event-p1' ? 'You' : 'Opponent'}
    presetTeamFromMe={playerPickerContext?.scope !== 'round-p2'}
    excludePlayerId={pickerExcludeId}
    onSelect={handlePlayerSelect}
    onClose={() => {
      playerPickerOpen = false;
      playerPickerContext = null;
    }}
  />
  <DeckPickerModal
    bind:open={deckPickerOpen}
    title="Select deck"
    forLabel={deckPickerLabel}
    filterPlayerId={deckPickerContext?.scope === 'event-p1'
      ? eventP1
      : deckPickerContext?.scope === 'round-p2'
        ? rounds[deckPickerContext.roundIndex]?.p2 ?? ''
        : ''}
    onSelect={handleDeckSelect}
    onClose={() => {
      deckPickerOpen = false;
      deckPickerContext = null;
    }}
  />
</div>

<style>
  .tournament-results-page {
    max-width: 720px;
  }
  .page-title {
    margin: 0 0 0.25rem 0;
    font-size: 1.5rem;
    font-weight: 700;
  }
  .page-sub {
    margin: 0 0 1.25rem 0;
    color: var(--muted);
    font-size: 0.9375rem;
  }
  .tournament-results__round-head {
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  .tournament-results__select-btn {
    text-align: left;
    cursor: pointer;
    width: 100%;
  }
  .tournament-results__add-player-row {
    margin-bottom: var(--space-sm, 0.5rem);
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  .tournament-results__add-player-card {
    margin-bottom: var(--space-md, 1rem);
  }
  .tournament-results__games-title {
    margin: 0.5rem 0 0.25rem 0;
    font-size: 1rem;
    font-weight: 600;
  }
  .tournament-results__game {
    padding: var(--space-md, 1rem);
    background: var(--glass-bg, rgba(255, 255, 255, 0.03));
  }
  .tournament-results__game-label {
    font-weight: 600;
    font-size: 0.875rem;
    color: var(--muted);
  }
  .tournament-results__lore-row {
    margin-bottom: 0.25rem;
  }
  .tournament-results__toggle {
    display: flex;
    width: 100%;
    max-width: 100%;
    border-radius: var(--radius);
    border: 1px solid var(--border-strong);
    overflow: hidden;
    margin-bottom: 0.75rem;
  }
  .tournament-results__toggle-btn {
    flex: 1;
    min-width: 0;
    padding: 10px 6px;
    border: none;
    background: transparent;
    cursor: pointer;
    font-weight: 600;
    font-size: 0.8125rem;
    color: var(--text);
    transition: background 0.15s var(--ease);
  }
  .tournament-results__toggle-btn + .tournament-results__toggle-btn {
    border-left: 1px solid var(--border-strong);
  }
  .tournament-results__toggle-btn:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
  .tournament-results__toggle-btn[aria-pressed='true'] {
    background: var(--glass-bg-strong);
  }
  .tournament-results__toggle-btn--mid {
    flex: 0 0 2.75rem;
    color: var(--muted);
    font-weight: 700;
  }
  .tournament-results__actions {
    gap: 0.75rem;
    flex-wrap: wrap;
  }
  @media (min-width: 640px) {
    .tournament-results__form .formgrid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--space-md, 1rem);
      align-items: start;
    }
    .tournament-results__form .formgrid .label {
      grid-column: span 1;
    }
    .tournament-results__form .formgrid > div {
      min-width: 0;
    }
  }
  .tournament-results__form :global(.deck-color-select) {
    z-index: 1;
  }
  .tournament-results__round:has(:global(.deck-color-select__trigger--open)) {
    z-index: 10;
    position: relative;
  }
</style>
