<script lang="ts">
  import { config } from '$lib/config';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { type Game, type GameStatus, STAGE_OPTIONS, DECK_COLOR_OPTIONS } from '$lib/matches';
  import DeckColorSelect from '$lib/DeckColorSelect.svelte';

  type Player = { _id: string; name: string; team: string };
  type Match = {
    _id: string;
    stage?: string;
    tournamentName?: string;
    playedAt?: string;
    round?: number;
    p1?: Player | string;
    p2?: Player | string;
    p1DeckColor?: string;
    p2DeckColor?: string;
    matchWinner?: Player | string;
    games?: Game[];
    notes?: string;
  };

  const id = $page.params.id;
  let match = $state<Match | null>(null);
  let players = $state<Player[]>([]);
  let loading = $state(true);
  let saving = $state(false);
  let error = $state('');
  let deleting = $state(false);
  let addingGame = $state(false);
  let updatingGameIndex = $state<number | null>(null);
  let deletingGameIndex = $state<number | null>(null);
  /** Index of game to delete; when set, show "really delete?" modal. */
  let gameToDeleteIndex = $state<number | null>(null);
  let showDeleteMatchPrompt = $state(false);
  let updatingDeckColor = $state(false);
  let updatingMatchWinner = $state(false);
  let updatingPlayer = $state<'p1' | 'p2' | null>(null);
  let updatingStage = $state(false);

  const apiUrl = config.apiUrl ?? '/api';
  const PREFERRED_TEAM = 'The Big Ink Theory';
  const playersForSelect = $derived(
    [...players].sort((a, b) => {
      const aPreferred = (a.team?.trim() ?? '') === PREFERRED_TEAM;
      const bPreferred = (b.team?.trim() ?? '') === PREFERRED_TEAM;
      if (aPreferred && !bPreferred) return -1;
      if (!aPreferred && bPreferred) return 1;
      return 0;
    }),
  );
  const p1Id = $derived(match && (typeof match.p1 === 'object' && match.p1 ? match.p1._id : match.p1));
  const p2Id = $derived(match && (typeof match.p2 === 'object' && match.p2 ? match.p2._id : match.p2));
  const isQuickMatch = $derived(!p1Id && !p2Id);
  const matchWinnerId = $derived(
    match && (typeof match.matchWinner === 'object' && match.matchWinner ? match.matchWinner._id : match.matchWinner),
  );

  function playerName(p: Player | string | undefined): string {
    if (!p) return '–';
    return typeof p === 'string' ? p : p.name ?? '–';
  }

  /** Display name for UI: "Player 1" / "Player 2" when no player selected. */
  function displayPlayerName(p: Player | string | undefined, fallback: 'Player 1' | 'Player 2'): string {
    const name = playerName(p);
    return name === '–' ? fallback : name;
  }

  function formatDate(s: string | undefined): string {
    if (!s) return '–';
    try {
      return new Date(s).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
    } catch {
      return s;
    }
  }

  function gameWinnerId(g: Game): string | undefined {
    const w = g.winner;
    if (w == null) return undefined;
    return typeof w === 'object' && w !== null && '_id' in w ? (w as { _id: string })._id : String(w);
  }

  function gamesWon(m: Match, playerId: string): number {
    const games = m.games ?? [];
    return games.filter((g) => gameWinnerId(g) === playerId).length;
  }

  onMount(async () => {
    try {
      const [matchRes, playersRes] = await Promise.all([
        fetch(`${apiUrl}/matches/${id}`),
        fetch(`${apiUrl}/players`),
      ]);
      if (!matchRes.ok) {
        error = 'Match not found';
        loading = false;
        return;
      }
      const loadedMatch = await matchRes.json();
      match = loadedMatch;
      if (playersRes.ok) players = await playersRes.json();
      if (loadedMatch) {
        const noPlayers = !(typeof loadedMatch.p1 === 'object' && loadedMatch.p1 ? loadedMatch.p1._id : loadedMatch.p1) && !(typeof loadedMatch.p2 === 'object' && loadedMatch.p2 ? loadedMatch.p2._id : loadedMatch.p2);
        if (noPlayers && !loadedMatch.playedAt) {
          const res = await fetch(`${apiUrl}/matches/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ playedAt: new Date().toISOString() }),
          });
          if (res.ok) match = await res.json();
        }
      }
    } catch {
      error = 'Could not load match.';
    } finally {
      loading = false;
    }
  });

  async function onStageChange(stage: string) {
    if (!match) return;
    updatingStage = true;
    error = '';
    try {
      const res = await fetch(`${apiUrl}/matches/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: stage || undefined }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        error = data.message ?? 'Update failed';
        return;
      }
      match = await res.json();
    } catch {
      error = 'Could not reach API.';
    } finally {
      updatingStage = false;
    }
  }

  async function onUpdate(e: Event) {
    e.preventDefault();
    if (!match) return;
    saving = true;
    error = '';
    try {
      const p1Id = typeof match.p1 === 'object' && match.p1 ? match.p1._id : match.p1;
      const p2Id = typeof match.p2 === 'object' && match.p2 ? match.p2._id : match.p2;
      const winnerId = typeof match.matchWinner === 'object' && match.matchWinner ? match.matchWinner._id : match.matchWinner;
      const body = {
        ...match,
        p1: p1Id,
        p2: p2Id,
        matchWinner: winnerId,
      };
      const res = await fetch(`${apiUrl}/matches/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        error = data.message ?? 'Update failed';
        saving = false;
        return;
      }
      match = await res.json();
    } catch {
      error = 'Could not reach API.';
    } finally {
      saving = false;
    }
  }

  async function patchGames(games: Game[]) {
    if (!match || p1Id == null || p2Id == null) return false;
    const winnerId = typeof match.matchWinner === 'object' && match.matchWinner ? match.matchWinner._id : match.matchWinner;
    const res = await fetch(`${apiUrl}/matches/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ p1: p1Id, p2: p2Id, matchWinner: winnerId, games }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      error = data.message ?? 'Update failed';
      return false;
    }
    match = await res.json();
    return true;
  }

  async function onAddGame() {
    if (!match) return;
    addingGame = true;
    error = '';
    try {
      const existing = match.games ?? [];
      const withPreviousDone =
        existing.length > 0
          ? existing.map((g, i) => (i === existing.length - 1 ? { ...g, status: 'done' as GameStatus } : g))
          : existing;
      const games: Game[] = [...withPreviousDone, { status: 'in_progress' as GameStatus }];
      const ok = await patchGames(games);
      if (ok) await goto(`/matches/${id}/lore?game=${existing.length}`);
    } catch {
      error = 'Could not reach API.';
    } finally {
      addingGame = false;
    }
  }

  async function onTrackLore() {
    if (!match) return;
    const games = match.games ?? [];
    const lastGame = games[games.length - 1];
    const lastHasWinner = lastGame && (lastGame.status ?? 'in_progress') === 'done' && lastGame.winner;
    if (games.length === 0 || lastHasWinner) {
      await onAddGame();
    } else {
      await goto(`/matches/${id}/lore?game=${games.length - 1}`);
    }
  }

  async function onPlayerChange(role: 'p1' | 'p2', playerId: string) {
    if (!match) return;
    updatingPlayer = role;
    error = '';
    try {
      const body = role === 'p1' ? { p1: playerId || undefined } : { p2: playerId || undefined };
      const res = await fetch(`${apiUrl}/matches/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        error = data.message ?? 'Update failed';
        return;
      }
      match = await res.json();
    } catch {
      error = 'Could not reach API.';
    } finally {
      updatingPlayer = null;
    }
  }

  async function onDeckColorChange(p1DeckColor: string | undefined, p2DeckColor: string | undefined) {
    if (!match) return;
    updatingDeckColor = true;
    error = '';
    try {
      const res = await fetch(`${apiUrl}/matches/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ p1DeckColor: p1DeckColor || undefined, p2DeckColor: p2DeckColor || undefined }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        error = data.message ?? 'Update failed';
        return;
      }
      match = await res.json();
    } catch {
      error = 'Could not reach API.';
    } finally {
      updatingDeckColor = false;
    }
  }

  async function onMatchWinnerChange(winnerId: string | undefined) {
    if (!match) return;
    updatingMatchWinner = true;
    error = '';
    try {
      const res = await fetch(`${apiUrl}/matches/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchWinner: winnerId || undefined }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        error = data.message ?? 'Update failed';
        return;
      }
      match = await res.json();
    } catch {
      error = 'Could not reach API.';
    } finally {
      updatingMatchWinner = false;
    }
  }

  async function onGameChange(gameIndex: number, updates: Partial<Game>) {
    if (!match?.games?.length) return;
    updatingGameIndex = gameIndex;
    error = '';
    try {
      const games = match.games.map((g, i) => (i === gameIndex ? { ...g, ...updates } : g));
      await patchGames(games);
    } catch {
      error = 'Could not reach API.';
    } finally {
      updatingGameIndex = null;
    }
  }

  function openDeleteGameModal(index: number) {
    gameToDeleteIndex = index;
  }

  function closeDeleteGameModal() {
    gameToDeleteIndex = null;
  }

  async function confirmDeleteGame() {
    if (gameToDeleteIndex == null || !match?.games?.length) return;
    const gameIndex = gameToDeleteIndex;
    closeDeleteGameModal();
    deletingGameIndex = gameIndex;
    error = '';
    try {
      const games = match.games.filter((_, i) => i !== gameIndex);
      await patchGames(games);
    } catch {
      error = 'Could not reach API.';
    } finally {
      deletingGameIndex = null;
    }
  }

  async function onDeleteGame(gameIndex: number) {
    if (!match?.games?.length) return;
    openDeleteGameModal(gameIndex);
  }

  function openDeleteMatchModal() {
    showDeleteMatchPrompt = true;
  }

  function closeDeleteMatchModal() {
    showDeleteMatchPrompt = false;
  }

  async function confirmDeleteMatch() {
    if (!match) return;
    closeDeleteMatchModal();
    deleting = true;
    try {
      const res = await fetch(`${apiUrl}/matches/${id}`, { method: 'DELETE' });
      if (res.ok) await goto('/matches');
      else error = 'Delete failed';
    } catch {
      error = 'Could not reach API.';
    } finally {
      deleting = false;
    }
  }
</script>

<div class="page">
  {#if loading}
    <div class="card">
      <div class="loading-skeleton" aria-busy="true" aria-live="polite">
        <div class="loading-skeleton__line loading-skeleton__line--title"></div>
        <div class="loading-skeleton__line loading-skeleton__line--short"></div>
        <div class="loading-skeleton__line"></div>
      </div>
      <p class="muted" style="margin-top: var(--space-md);">Loading match…</p>
    </div>
  {:else if error && !match}
    <div class="card" role="alert">
      <p class="alert">{error}</p>
      <a href="/matches" class="btn">Back to matches</a>
    </div>
  {:else if match}
    <div class="card stack">
      <div class="matchcard tack" style="margin: -18px -18px 0; padding: 18px 18px 12px; border-radius: var(--radius-lg) var(--radius-lg) 0 0;">
        <div class="matchcard__top matchcard__top--row muted">
          <span class="matchcard__top-inner">{formatDate(match.playedAt)} ·</span>
          {#if isQuickMatch}
            <select
              class="input matchcard__top-select"
              value={match.stage ?? 'Casual'}
              disabled={updatingStage}
              onchange={(e) => onStageChange(e.currentTarget.value)}
              aria-label="Stage"
            >
              {#each STAGE_OPTIONS as s}
                <option value={s}>{s}</option>
              {/each}
            </select>
          {:else}
            <span class="matchcard__top-inner">{match.stage ?? '–'}</span>
          {/if}
          {#if match.tournamentName}<span class="matchcard__top-inner"> · {match.tournamentName}</span>{/if}
        </div>
        <div class="matchcard__row">
          <div class="matchcard__player matchcard__player--left" class:matchcard__player--winner={matchWinnerId === p1Id}>
            <span class="matchcard__name matchcard__name--with-select">
              <select
                class="input matchcard__player-select"
                value={p1Id ?? ''}
                disabled={updatingPlayer === 'p1'}
                onchange={(e) => onPlayerChange('p1', e.currentTarget.value)}
                aria-label="Player 1"
              >
                <option value="">Player 1</option>
                {#each playersForSelect as pl}
                  <option value={pl._id} disabled={pl._id === p2Id}>{pl.name}</option>
                {/each}
              </select>
              {#if matchWinnerId === p1Id}
                <span class="matchcard__badge matchcard__badge--winner" aria-label="Winner">👑</span>
              {/if}
            </span>
            <DeckColorSelect
              className="matchcard__deck-select"
              value={match.p1DeckColor ?? ''}
              disabled={updatingDeckColor}
              onchange={(v) => onDeckColorChange(v || undefined, match?.p2DeckColor)}
              ariaLabel="P1 deck color"
            />
            <span class="matchcard__wins muted" title="Games won">{gamesWon(match, p1Id ?? '')}</span>
          </div>
          <div class="matchcard__vs" aria-hidden="true">VS.</div>
          <div class="matchcard__player matchcard__player--right" class:matchcard__player--winner={matchWinnerId === p2Id}>
            <span class="matchcard__wins muted" title="Games won">{gamesWon(match, p2Id ?? '')}</span>
            <DeckColorSelect
              className="matchcard__deck-select"
              value={match.p2DeckColor ?? ''}
              disabled={updatingDeckColor}
              onchange={(v) => onDeckColorChange(match?.p1DeckColor, v || undefined)}
              ariaLabel="P2 deck color"
            />
            <span class="matchcard__name matchcard__name--with-select">
              <select
                class="input matchcard__player-select"
                value={p2Id ?? ''}
                disabled={updatingPlayer === 'p2'}
                onchange={(e) => onPlayerChange('p2', e.currentTarget.value)}
                aria-label="Player 2"
              >
                <option value="">Player 2</option>
                {#each playersForSelect as pl}
                  <option value={pl._id} disabled={pl._id === p1Id}>{pl.name}</option>
                {/each}
              </select>
              {#if matchWinnerId === p2Id}
                <span class="matchcard__badge matchcard__badge--winner" aria-label="Winner">👑</span>
              {/if}
            </span>
          </div>
        </div>
      </div>

      <dl class="stack" style="margin-top: 12px;">
        <div class="dl-row">
          <dt class="muted" style="font-size: 0.85rem;">Winner</dt>
          <dd>
            <select
              class="input"
              style="min-width: 160px;"
              value={matchWinnerId ?? ''}
              disabled={updatingMatchWinner}
              onchange={(e) => onMatchWinnerChange(e.currentTarget.value || undefined)}
              aria-label="Match winner"
            >
              <option value="">–</option>
              {#if p1Id}
                <option value={p1Id}>{displayPlayerName(match.p1, 'Player 1')}</option>
              {/if}
              {#if p2Id}
                <option value={p2Id}>{displayPlayerName(match.p2, 'Player 2')}</option>
              {/if}
            </select>
          </dd>
        </div>
        {#if match.games?.length}
          <div class="stack" style="gap: 12px;">
            <dt class="muted" style="font-size: 0.85rem;">Games</dt>
            {#each match.games as g, i}
              <dd class="game-line">
                <div class="game-line__row">
                  <span class="game-line__label">Game {i + 1}</span>
                  <span class="game-line__scores">{#if g.p1Lore != null || g.p2Lore != null}Lore: {g.p1Lore ?? '–'}–{g.p2Lore ?? '–'}{:else}–{/if}</span>
                </div>
                <div class="game-line__controls row">
                  <label class="label" style="margin: 0; align-items: center; gap: 6px;">
                    <span class="muted" style="font-size: 0.85rem;">Starter</span>
                    <select
                      class="input"
                      style="min-width: 120px;"
                      value={typeof g.starter === 'object' && g.starter != null ? (g.starter as { _id?: string })._id : (g.starter ?? '')}
                      disabled={updatingGameIndex === i}
                      onchange={(e) => onGameChange(i, { starter: e.currentTarget.value || undefined })}
                      aria-label="Who started this game"
                    >
                      <option value="">–</option>
                      {#if p1Id}
                        <option value={p1Id}>{displayPlayerName(match.p1, 'Player 1')}</option>
                      {/if}
                      {#if p2Id}
                        <option value={p2Id}>{displayPlayerName(match.p2, 'Player 2')}</option>
                      {/if}
                    </select>
                  </label>
                  <label class="label" style="margin: 0; align-items: center; gap: 6px;">
                    <span class="muted" style="font-size: 0.85rem;">Winner</span>
                    <select
                      class="input"
                      style="min-width: 140px;"
                      value={typeof g.winner === 'object' && g.winner != null ? (g.winner as { _id?: string })._id : (g.winner ?? '')}
                      disabled={updatingGameIndex === i}
                      onchange={(e) => {
                        const winnerId = e.currentTarget.value || undefined;
                        onGameChange(i, {
                          winner: winnerId,
                          status: (winnerId ? 'done' : 'in_progress') as GameStatus,
                        });
                      }}
                    >
                      <option value="">–</option>
                      {#if p1Id}
                        <option value={p1Id}>{displayPlayerName(match.p1, 'Player 1')}</option>
                      {/if}
                      {#if p2Id}
                        <option value={p2Id}>{displayPlayerName(match.p2, 'Player 2')}</option>
                      {/if}
                    </select>
                  </label>
                  {#if !gameWinnerId(g)}
                    <a href="/matches/{id}/lore?game={i}" class="btn btn--primary game-line__continue-btn">
                      <svg class="icon-play" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                      Continue
                    </a>
                  {/if}
                  <button
                    type="button"
                    class="btn btn--icon game-line__delete-btn"
                    disabled={deletingGameIndex === i}
                    onclick={() => onDeleteGame(i)}
                    aria-label="Delete game {i + 1}"
                    title="Delete game"
                  >
                    {#if deletingGameIndex === i}
                      Removing…
                    {:else}
                      <svg class="icon-trash" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                    {/if}
                  </button>
                </div>
              </dd>
            {/each}
          </div>
        {/if}
        {#if match.notes}
          <div><dt class="muted" style="font-size: 0.85rem;">Notes</dt><dd>{match.notes}</dd></div>
        {/if}
      </dl>

      {#if match.games != null}
        <div class="row" style="margin-top: 12px; gap: 12px; flex-wrap: wrap;">
          <button type="button" class="btn" disabled={addingGame} onclick={onTrackLore}>
            {addingGame ? 'Opening…' : 'Track Lore'}
          </button>
          <button type="button" class="btn" disabled={addingGame} onclick={onAddGame}>
            {addingGame ? 'Adding…' : 'Add next game'}
          </button>
        </div>
      {/if}

      {#if error}
        <p class="alert" role="alert" aria-live="assertive">{error}</p>
      {/if}

      <div class="row" style="margin-top: 16px; gap: 12px; flex-wrap: wrap;">
        <a href="/matches" class="btn">Back</a>
        <button type="button" class="btn btn--danger btn--icon" onclick={openDeleteMatchModal} disabled={deleting} aria-label="Delete match" title="Delete match">
          {#if deleting}
            Deleting…
          {:else}
            <svg class="icon-trash" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
            Delete
          {/if}
        </button>
      </div>
    </div>

    <!-- Delete match confirmation -->
    {#if showDeleteMatchPrompt}
      <div class="delete-game-modal" role="dialog" aria-modal="true" aria-labelledby="delete-match-title">
        <button
          type="button"
          class="delete-game-modal__backdrop"
          aria-label="Cancel"
          onclick={closeDeleteMatchModal}
        ></button>
        <div class="delete-game-modal__card card">
          <h2 id="delete-match-title" class="delete-game-modal__title">Delete match?</h2>
          <p class="delete-game-modal__text muted">Do you really want to delete this match?</p>
          <div class="delete-game-modal__actions row">
            <button type="button" class="btn btn--danger btn--icon" onclick={confirmDeleteMatch}>
              <svg class="icon-trash" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
              Delete
            </button>
            <button type="button" class="btn" onclick={closeDeleteMatchModal}>Cancel</button>
          </div>
        </div>
      </div>
    {/if}

    <!-- Delete game confirmation -->
    {#if gameToDeleteIndex != null}
      <div class="delete-game-modal" role="dialog" aria-modal="true" aria-labelledby="delete-game-title">
        <button
          type="button"
          class="delete-game-modal__backdrop"
          aria-label="Cancel"
          onclick={closeDeleteGameModal}
        ></button>
        <div class="delete-game-modal__card card">
          <h2 id="delete-game-title" class="delete-game-modal__title">Delete game?</h2>
          <p class="delete-game-modal__text muted">Do you really want to delete this game?</p>
          <div class="delete-game-modal__actions row">
            <button type="button" class="btn btn--danger btn--icon" onclick={confirmDeleteGame}>
              <svg class="icon-trash" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
              Delete
            </button>
            <button type="button" class="btn" onclick={closeDeleteGameModal}>Cancel</button>
          </div>
        </div>
      </div>
    {/if}
  {/if}
</div>

<style>
  .matchcard__name--with-select {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .matchcard__name--with-select .matchcard__player-select {
    flex: 1;
    min-width: 0;
  }

  .delete-game-modal {
    position: fixed;
    inset: 0;
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
  }

  .delete-game-modal__backdrop {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    border: none;
    padding: 0;
    cursor: pointer;
  }

  .delete-game-modal__card {
    position: relative;
    z-index: 1;
    max-width: 360px;
    width: 100%;
    text-align: center;
  }

  .delete-game-modal__title {
    font-size: 1.25rem;
    margin: 0 0 8px;
  }

  .delete-game-modal__text {
    margin: 0 0 20px;
  }

  .delete-game-modal__actions {
    gap: 12px;
    justify-content: center;
    flex-wrap: wrap;
  }

  .btn--icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
  }

  .btn--icon .icon-trash {
    flex-shrink: 0;
  }

  .btn--icon:not(:has(.icon-trash)) {
    gap: 0;
  }

  .game-line__delete-btn {
    margin-left: auto;
    background: transparent;
    border-color: transparent;
    color: var(--danger);
  }

  .game-line__delete-btn:hover:not(:disabled) {
    background: rgba(220, 38, 38, 0.1);
  }

  .game-line__continue-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-height: 46px;
    text-decoration: none;
  }

  .game-line__continue-btn .icon-play {
    flex-shrink: 0;
  }
</style>
