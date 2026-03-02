<script lang="ts">
  import { config } from '$lib/config';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { type Game, type GameStatus, STAGE_OPTIONS, DECK_COLOR_OPTIONS, deckColorToInk } from '$lib/matches';

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
  let updatingDeckColor = $state(false);
  let updatingMatchWinner = $state(false);

  const apiUrl = config.apiUrl ?? '/api';
  const p1Id = $derived(match && (typeof match.p1 === 'object' && match.p1 ? match.p1._id : match.p1));
  const p2Id = $derived(match && (typeof match.p2 === 'object' && match.p2 ? match.p2._id : match.p2));
  const matchWinnerId = $derived(
    match && (typeof match.matchWinner === 'object' && match.matchWinner ? match.matchWinner._id : match.matchWinner),
  );

  function playerName(p: Player | string | undefined): string {
    if (!p) return '–';
    return typeof p === 'string' ? p : p.name ?? '–';
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
      match = await matchRes.json();
      if (playersRes.ok) players = await playersRes.json();
    } catch {
      error = 'Could not load match.';
    } finally {
      loading = false;
    }
  });

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

  async function onDeleteGame(gameIndex: number) {
    if (!match?.games?.length) return;
    const game = match.games[gameIndex];
    if ((game?.status ?? 'in_progress') === 'done') return;
    if (!confirm('Remove this game?')) return;
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

  async function onDelete() {
    if (!confirm('Delete this match?')) return;
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
        <div class="matchcard__top muted">
          {formatDate(match.playedAt)} · {match.stage ?? '–'}{#if match.tournamentName} · {match.tournamentName}{/if}
        </div>
        <div class="matchcard__row">
          <div class="matchcard__player matchcard__player--left" class:matchcard__player--winner={matchWinnerId === p1Id}>
            <span class="matchcard__name">
              {playerName(match.p1)}
              {#if matchWinnerId === p1Id}
                <span class="matchcard__badge matchcard__badge--winner" aria-label="Winner">👑</span>
              {:else if matchWinnerId}
                <span class="matchcard__badge matchcard__badge--loser" aria-label="Loser">L</span>
              {/if}
            </span>
            <select
              class="input matchcard__deck-select"
              value={match.p1DeckColor ?? ''}
              disabled={updatingDeckColor}
              onchange={(e) => onDeckColorChange(e.currentTarget.value || undefined, match?.p2DeckColor)}
              aria-label="P1 deck color"
            >
              <option value="">–</option>
              {#each DECK_COLOR_OPTIONS as c}
                <option value={c} title={c}>{deckColorToInk(c)}</option>
              {/each}
            </select>
            <span class="matchcard__wins muted" title="Games won">{gamesWon(match, p1Id ?? '')}</span>
          </div>
          <div class="matchcard__vs" aria-hidden="true">VS.</div>
          <div class="matchcard__player matchcard__player--right" class:matchcard__player--winner={matchWinnerId === p2Id}>
            <span class="matchcard__wins muted" title="Games won">{gamesWon(match, p2Id ?? '')}</span>
            <select
              class="input matchcard__deck-select"
              value={match.p2DeckColor ?? ''}
              disabled={updatingDeckColor}
              onchange={(e) => onDeckColorChange(match?.p1DeckColor, e.currentTarget.value || undefined)}
              aria-label="P2 deck color"
            >
              <option value="">–</option>
              {#each DECK_COLOR_OPTIONS as c}
                <option value={c} title={c}>{deckColorToInk(c)}</option>
              {/each}
            </select>
            <span class="matchcard__name">
              {playerName(match.p2)}
              {#if matchWinnerId === p2Id}
                <span class="matchcard__badge matchcard__badge--winner" aria-label="Winner">👑</span>
              {:else if matchWinnerId}
                <span class="matchcard__badge matchcard__badge--loser" aria-label="Loser">L</span>
              {/if}
            </span>
          </div>
        </div>
      </div>

      <dl class="stack" style="margin-top: 12px;">
        <div class="match-meta-row">
          <div class="dl-row"><dt class="muted" style="font-size: 0.85rem;">Stage</dt><dd>{match.stage ?? '–'}</dd></div>
          {#if match.stage === 'Tournament'}
            {#if match.tournamentName}
              <div class="dl-row"><dt class="muted" style="font-size: 0.85rem;">Tournament</dt><dd>{match.tournamentName}</dd></div>
            {/if}
            {#if match.round != null}
              <div class="dl-row"><dt class="muted" style="font-size: 0.85rem;">Round</dt><dd>{match.round}</dd></div>
            {/if}
          {/if}
        </div>
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
                <option value={p1Id}>{playerName(match.p1)}</option>
              {/if}
              {#if p2Id}
                <option value={p2Id}>{playerName(match.p2)}</option>
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
                    <span class="muted" style="font-size: 0.85rem;">Starting player</span>
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
                        <option value={p1Id}>{playerName(match.p1)}</option>
                      {/if}
                      {#if p2Id}
                        <option value={p2Id}>{playerName(match.p2)}</option>
                      {/if}
                    </select>
                  </label>
                  <label class="label" style="margin: 0; align-items: center; gap: 6px;">
                    <span class="muted" style="font-size: 0.85rem;">Status</span>
                    <select
                      class="input"
                      style="min-width: 120px;"
                      value={g.status ?? 'in_progress'}
                      disabled={updatingGameIndex === i}
                      onchange={(e) => onGameChange(i, { status: (e.currentTarget.value as GameStatus) })}
                    >
                      <option value="in_progress">In progress</option>
                      <option value="done">Done</option>
                    </select>
                  </label>
                  {#if (g.status ?? 'in_progress') === 'done'}
                    <label class="label" style="margin: 0; align-items: center; gap: 6px;">
                      <span class="muted" style="font-size: 0.85rem;">Winner</span>
                      <select
                        class="input"
                        style="min-width: 140px;"
                        value={g.winner ?? ''}
                        disabled={updatingGameIndex === i}
                        onchange={(e) => onGameChange(i, { winner: e.currentTarget.value || undefined })}
                      >
                        <option value="">–</option>
                        {#if p1Id}
                          <option value={p1Id}>{playerName(match.p1)}</option>
                        {/if}
                        {#if p2Id}
                          <option value={p2Id}>{playerName(match.p2)}</option>
                        {/if}
                      </select>
                    </label>
                  {:else}
                    <button
                      type="button"
                      class="btn btn--danger"
                      disabled={deletingGameIndex === i}
                      onclick={() => onDeleteGame(i)}
                      aria-label="Remove game {i + 1}"
                    >
                      {deletingGameIndex === i ? 'Removing…' : 'Delete game'}
                    </button>
                  {/if}
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
        <button type="button" class="btn btn--danger" onclick={onDelete} disabled={deleting}>
          {deleting ? 'Deleting…' : 'Delete'}
        </button>
      </div>
    </div>
  {/if}
</div>
