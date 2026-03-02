<script lang="ts">
  import { config } from '$lib/config';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { STAGE_OPTIONS, DECK_COLOR_OPTIONS, deckColorToInk } from '$lib/matches';

  type Player = { _id: string; name: string; team: string };

  let players = $state<Player[]>([]);
  let p1 = $state('');
  let p2 = $state('');
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
  let games = $state<object[]>([{}]);
  let loading = $state(false);
  let error = $state('');

  let showAddPlayer = $state(false);

  function addGame() {
    games = [...games, {}];
  }

  function removeGame(i: number) {
    if (games.length <= 1) return;
    games = games.filter((_, idx) => idx !== i);
  }
  let newPlayerName = $state('');
  let newPlayerTeam = $state('');
  let addPlayerLoading = $state(false);
  let addPlayerError = $state('');

  const apiUrl = config.apiUrl ?? '/api';

  const winnerOptions = $derived(
    [p1, p2]
      .map((id) => players.find((pl) => pl._id === id))
      .filter((pl): pl is Player => !!pl),
  );

  $effect(() => {
    if (matchWinner && !winnerOptions.some((pl) => pl._id === matchWinner)) {
      matchWinner = '';
    }
  });

  async function fetchPlayers() {
    try {
      const res = await fetch(`${apiUrl}/players`);
      if (res.ok) players = await res.json();
    } catch {
      /* ignore */
    }
  }

  onMount(fetchPlayers);

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
        matchWinner: matchWinner || undefined,
        notes: notes.trim(),
        games: games.map(() => ({})),
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

<div class="page">
  <div class="card stack">
    <h2 class="card__title">New match</h2>
    <p class="card__sub">Create a new match between two players.</p>

    <form onsubmit={onSubmit} class="stack" style="margin-top: 8px;">
      <div class="formgrid">
        <label class="label" for="p1">
          Player 1 *
          <select id="p1" class="input" bind:value={p1} required>
            <option value="">Select player</option>
            {#each players as pl}
              <option value={pl._id}>{pl.name}{#if pl.team} ({pl.team}){/if}</option>
            {/each}
          </select>
        </label>
        <label class="label" for="p2">
          Player 2
          <select id="p2" class="input" bind:value={p2}>
            <option value="">Select player</option>
            {#each players as pl}
              <option value={pl._id}>{pl.name}{#if pl.team} ({pl.team}){/if}</option>
            {/each}
          </select>
        </label>
      </div>

      <div class="row" style="align-items: center; gap: 8px;">
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
        <div class="card stack" style="margin-top: 8px; padding: 14px;">
          <p class="card__sub" style="margin: 0;">Create a player and they'll be added to the list above.</p>
          <div class="stack formgrid" style="margin-top: 10px;">
            <label class="label" for="newPlayerName">Name *</label>
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
              <button type="button" class="btn btn--primary" disabled={addPlayerLoading} onclick={onAddPlayer}>
                {addPlayerLoading ? 'Adding…' : 'Add player'}
              </button>
            </div>
          </div>
        </div>
      {/if}

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
        <input id="tournamentName" type="text" class="input" bind:value={tournamentName} placeholder="Tournament name" />

        <div class="formgrid">
          <label class="label" for="round">Round</label>
          <input id="round" type="number" class="input" min="1" bind:value={round} placeholder="Round number" />
          <label class="label" for="matchWinner">Winner</label>
          <select id="matchWinner" class="input" bind:value={matchWinner}>
            <option value="">–</option>
            {#each winnerOptions as pl}
              <option value={pl._id}>{pl.name}{#if pl.team} ({pl.team}){/if}</option>
            {/each}
          </select>
        </div>
      {:else}
        <label class="label" for="matchWinner">Winner</label>
        <select id="matchWinner" class="input" bind:value={matchWinner}>
          <option value="">–</option>
          {#each winnerOptions as pl}
            <option value={pl._id}>{pl.name}{#if pl.team} ({pl.team}){/if}</option>
          {/each}
        </select>
      {/if}

      <div class="formgrid">
        <label class="label" for="p1DeckColor">P1 deck color</label>
        <select id="p1DeckColor" class="input" bind:value={p1DeckColor}>
          <option value="">–</option>
          {#each DECK_COLOR_OPTIONS as c}
            <option value={c} title={c}>{deckColorToInk(c)}</option>
          {/each}
        </select>
        <label class="label" for="p2DeckColor">P2 deck color</label>
        <select id="p2DeckColor" class="input" bind:value={p2DeckColor}>
          <option value="">–</option>
          {#each DECK_COLOR_OPTIONS as c}
            <option value={c} title={c}>{deckColorToInk(c)}</option>
          {/each}
        </select>
      </div>

      <div class="stack">
        <div class="row" style="justify-content: space-between; align-items: center;">
          <span class="label" style="margin: 0;">Games</span>
          <button type="button" class="btn" onclick={addGame}>+ Add game</button>
        </div>
        {#each games as _, i}
          <div class="row" style="align-items: center; gap: 8px;">
            <span class="label" style="margin: 0;">Game {i + 1}</span>
            <button
              type="button"
              class="btn"
              onclick={() => removeGame(i)}
              disabled={games.length <= 1}
              aria-label="Remove game"
            >
              Remove
            </button>
          </div>
        {/each}
      </div>

      <label class="label" for="notes">Notes</label>
      <input id="notes" type="text" class="input" bind:value={notes} placeholder="Optional" />

      {#if error}
        <p class="alert">{error}</p>
      {/if}

      <div class="row" style="margin-top: 8px; gap: 12px;">
        <button type="submit" class="btn btn--primary" disabled={loading}>
          {loading ? 'Creating…' : 'Create match'}
        </button>
        <a href="/matches" class="btn">Cancel</a>
      </div>
    </form>
  </div>
</div>
