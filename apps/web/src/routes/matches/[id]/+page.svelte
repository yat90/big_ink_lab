<script lang="ts">
  import { config } from '$lib/config';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { type Game, type GameStatus, STAGE_OPTIONS, DECK_COLOR_OPTIONS } from '$lib/matches';

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

  const apiUrl = config.apiUrl ?? '/api';
  const p1Id = $derived(match && (typeof match.p1 === 'object' && match.p1 ? match.p1._id : match.p1));
  const p2Id = $derived(match && (typeof match.p2 === 'object' && match.p2 ? match.p2._id : match.p2));

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
      <p class="muted">Loading…</p>
    </div>
  {:else if error && !match}
    <div class="card">
      <p class="alert">{error}</p>
      <a href="/matches" class="btn">Back to matches</a>
    </div>
  {:else if match}
    <div class="card stack">
      <p class="card__sub">{playerName(match.p1)} vs {playerName(match.p2)} · {formatDate(match.playedAt)}</p>

      <dl class="stack" style="margin-top: 12px;">
        <div class="dl-row"><dt class="muted" style="font-size: 0.85rem;">Stage</dt><dd>{match.stage ?? '–'}</dd></div>
        {#if match.stage === 'Tournament'}
          {#if match.tournamentName}
            <div class="dl-row"><dt class="muted" style="font-size: 0.85rem;">Tournament</dt><dd>{match.tournamentName}</dd></div>
          {/if}
          {#if match.round != null}
            <div class="dl-row"><dt class="muted" style="font-size: 0.85rem;">Round</dt><dd>{match.round}</dd></div>
          {/if}
        {/if}
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
        <p class="alert">{error}</p>
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
