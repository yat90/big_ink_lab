<script lang="ts">
  import { config } from '$lib/config';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';

  type Player = { _id: string; name: string; team: string };
  type Game = { p1Lore?: number; p2Lore?: number; status?: string; winner?: string };
  type Match = {
    _id: string;
    p1?: Player | string;
    p2?: Player | string;
    matchWinner?: Player | string;
    games?: Game[];
  };

  const id = $page.params.id;
  const gameParam = $page.url.searchParams.get('game');
  const initialGameIndex = gameParam ? Math.max(0, parseInt(gameParam, 10) || 0) : 0;
  let match = $state<Match | null>(null);
  let gameIndex = $state(initialGameIndex);
  let p1Lore = $state(0);
  let p2Lore = $state(0);
  let loading = $state(true);
  let saving = $state(false);
  let error = $state('');
  let winCheckTimeout: ReturnType<typeof setTimeout> | null = null;

  const apiUrl = config.apiUrl ?? '/api';
  const LORE_MAX = 25;
  const LORE_WIN = 20;

  function playerName(p: Player | string | undefined): string {
    if (!p) return '–';
    return typeof p === 'string' ? p : p.name ?? '–';
  }

  const games = $derived(match?.games ?? []);
  const p1Name = $derived(match ? playerName(match.p1) : 'P1');
  const p2Name = $derived(match ? playerName(match.p2) : 'P2');

  onMount(async () => {
    try {
      const res = await fetch(`${apiUrl}/matches/${id}`);
      if (!res.ok) {
        error = 'Match not found';
        loading = false;
        return;
      }
      match = await res.json();
      const maxIndex = (match?.games?.length ?? 1) - 1;
      if (gameIndex > maxIndex) gameIndex = maxIndex;
    } catch {
      error = 'Could not load match.';
    } finally {
      loading = false;
    }
  });

  $effect(() => {
    const cur = games[gameIndex];
    if (cur) {
      const p1 = cur.p1Lore ?? 0;
      const p2 = cur.p2Lore ?? 0;
      p1Lore = Math.min(LORE_MAX, Math.max(0, p1));
      p2Lore = Math.min(LORE_MAX, Math.max(0, p2));
    }
  });

  function scheduleWinCheck() {
    if (winCheckTimeout) clearTimeout(winCheckTimeout);
    winCheckTimeout = setTimeout(() => {
      winCheckTimeout = null;
      if (p1Lore >= LORE_WIN || p2Lore >= LORE_WIN) {
        saveAsDone();
      }
    }, 1000);
  }

  function incP1() {
    p1Lore = Math.min(LORE_MAX, p1Lore + 1);
    scheduleWinCheck();
  }
  function decP1() {
    p1Lore = Math.max(0, p1Lore - 1);
  }
  function incP2() {
    p2Lore = Math.min(LORE_MAX, p2Lore + 1);
    scheduleWinCheck();
  }
  function decP2() {
    p2Lore = Math.max(0, p2Lore - 1);
  }

  async function saveAsDone() {
    if (!match?.games?.length) return;
    const cur = match.games[gameIndex];
    if (cur?.status === 'done') return;
    const p1Id = typeof match.p1 === 'object' && match.p1 ? match.p1._id : match.p1;
    const p2Id = typeof match.p2 === 'object' && match.p2 ? match.p2._id : match.p2;
    let winnerId: string | undefined;
    if (p1Lore >= LORE_WIN && p2Lore >= LORE_WIN) {
      winnerId = p1Lore >= p2Lore ? p1Id : p2Id;
    } else if (p1Lore >= LORE_WIN) {
      winnerId = p1Id;
    } else if (p2Lore >= LORE_WIN) {
      winnerId = p2Id;
    }
    if (winnerId == null) return;
    saving = true;
    error = '';
    try {
      const updatedGames = [...match.games];
      if (!updatedGames[gameIndex]) updatedGames[gameIndex] = {};
      updatedGames[gameIndex] = {
        ...updatedGames[gameIndex],
        p1Lore,
        p2Lore,
        status: 'done',
        winner: winnerId,
      };
      const mw = match.matchWinner;
      const matchWinnerId = typeof mw === 'object' && mw ? mw._id : mw;
      const res = await fetch(`${apiUrl}/matches/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          p1: p1Id,
          p2: p2Id,
          matchWinner: matchWinnerId,
          games: updatedGames,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        error = data.message ?? 'Save failed';
      } else {
        match = await res.json();
      }
    } catch {
      error = 'Could not save.';
    } finally {
      saving = false;
    }
  }

  async function save() {
    if (!match?.games?.length) return;
    const clampedP1 = Math.min(LORE_MAX, Math.max(0, p1Lore));
    const clampedP2 = Math.min(LORE_MAX, Math.max(0, p2Lore));
    saving = true;
    error = '';
    try {
      const updatedGames = [...match.games];
      if (!updatedGames[gameIndex]) updatedGames[gameIndex] = {};
      updatedGames[gameIndex] = {
        ...updatedGames[gameIndex],
        p1Lore: clampedP1,
        p2Lore: clampedP2,
      };
      const p1Id = typeof match.p1 === 'object' && match.p1 ? match.p1._id : match.p1;
      const p2Id = typeof match.p2 === 'object' && match.p2 ? match.p2._id : match.p2;
      const mw = match.matchWinner;
      const winnerId = typeof mw === 'object' && mw ? mw._id : mw;
      const res = await fetch(`${apiUrl}/matches/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          p1: p1Id,
          p2: p2Id,
          matchWinner: winnerId,
          games: updatedGames,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        error = data.message ?? 'Save failed';
        saving = false;
        return;
      }
      match = await res.json();
    } catch {
      error = 'Could not save.';
    } finally {
      saving = false;
    }
  }
</script>

<div class="lore-page">
  {#if loading}
    <div class="lore-page__loading card">
      <p class="muted">Loading…</p>
    </div>
  {:else if error && !match}
    <div class="lore-page__loading card">
      <p class="alert">{error}</p>
      <a href="/matches/{id}" class="btn">Back to match</a>
    </div>
  {:else if match && games.length > 0}
    <div class="lore-page__cards">
      <!-- P2 top -->
      <div class="lore-card card lore-card--p2">
        <button type="button" class="lore-card__btn lore-card__btn--inc" onclick={incP2} aria-label="Increase Lore">+</button>
        <div class="lore-card__value">{p2Lore}</div>
        <button type="button" class="lore-card__btn lore-card__btn--dec" onclick={decP2} aria-label="Decrease Lore">−</button>
      </div>

      <div class="lore-page__names">
        <span class="lore-page__name">{p2Name}</span>
        <span class="lore-page__name">{p1Name}</span>
      </div>

      <!-- P1 bottom -->
      <div class="lore-card card lore-card--p1">
        <button type="button" class="lore-card__btn lore-card__btn--inc" onclick={incP1} aria-label="Increase Lore">+</button>
        <div class="lore-card__value">{p1Lore}</div>
        <button type="button" class="lore-card__btn lore-card__btn--dec" onclick={decP1} aria-label="Decrease Lore">−</button>
      </div>
    </div>

    <div class="lore-page__actions">
      <a href="/matches/{id}" class="btn">Done</a>
      <button type="button" class="btn btn--primary" disabled={saving} onclick={save}>
        {saving ? 'Saving…' : 'Save'}
      </button>
    </div>

    {#if error}
      <p class="alert">{error}</p>
    {/if}
  {:else}
    <div class="card">
      <p class="muted">No games in this match yet.</p>
      <a href="/matches/{id}" class="btn">Back to match</a>
    </div>
  {/if}
</div>

<style>
  .lore-page {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 16px;
    max-width: 420px;
    margin: 0 auto;
    width: 100%;
  }

  .lore-page__loading {
    text-align: center;
    padding: 24px;
  }

  .lore-page__cards {
    display: flex;
    flex-direction: column;
    gap: 0;
    flex: 1;
    min-height: 0;
  }

  .lore-page__names {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    gap: 16px;
    flex-shrink: 0;
    color: var(--muted);
    font-size: 0.95rem;
    font-weight: 600;
  }

  .lore-page__name {
    flex: 1;
    text-align: center;
  }

  .lore-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 24px;
    gap: 12px;
    flex: 1;
    min-height: 200px;
    justify-content: center;
  }

  /* Flip P2 (top) card so both players see their card right-side up when sitting across */
  .lore-card--p2 {
    transform: rotate(180deg);
  }

  .lore-card__btn {
    width: 100%;
    flex: 1;
    min-height: 56px;
    border-radius: var(--radius);
    border: 2px solid var(--border-strong);
    background: var(--glass-bg-strong);
    color: var(--fg);
    font-size: 1.75rem;
    font-weight: 700;
    cursor: pointer;
    transition: background var(--transition), transform var(--transition);
    display: flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
  }

  .lore-card__btn:hover {
    background: var(--glass-bg);
    transform: scale(1.02);
  }

  .lore-card__btn:active {
    transform: scale(0.98);
  }

  .lore-card__btn--inc {
    color: var(--ok);
    border-color: rgba(34, 197, 94, 0.4);
  }

  .lore-card__btn--dec {
    color: var(--danger);
    border-color: rgba(220, 38, 38, 0.4);
  }

  .lore-card__value {
    font-size: 3.5rem;
    font-weight: 800;
    line-height: 1;
    color: var(--fg);
    min-height: 3.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .lore-page__actions {
    display: flex;
    gap: 12px;
    justify-content: center;
    flex-wrap: wrap;
  }
</style>
