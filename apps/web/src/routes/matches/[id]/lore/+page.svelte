<script lang="ts">
  import { config } from '$lib/config';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';

  type Player = { _id: string; name: string; team: string };
  type Game = {
    p1Lore?: number;
    p2Lore?: number;
    status?: string;
    winner?: string;
    starter?: string | { _id: string };
  };
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
  let starter = $state<string>('');
  let loading = $state(true);
  let saving = $state(false);
  let error = $state('');
  let winCheckTimeout: ReturnType<typeof setTimeout> | null = null;
  let debouncedSaveTimeout: ReturnType<typeof setTimeout> | null = null;

  /** Game indices for which the user dismissed the "choose starter" prompt (Skip). */
  let starterPromptDismissed = $state<Record<number, boolean>>({});
  /** True when showing the "choose starting player" modal. */
  let showStarterPrompt = $state(false);
  let starterSaving = $state(false);

  /** When a game ends (player reached 20 Lore): winner id and show "next game?" prompt. */
  let gameOverWinnerId = $state<string | null>(null);
  let showGameOverPrompt = $state(false);

  /** Menu button: show "close game?" confirmation modal. */
  let showCloseGamePrompt = $state(false);

  const apiUrl = config.apiUrl ?? '/api';
  const LORE_MAX = 25;
  const LORE_WIN = 20;

  function playerName(p: Player | string | undefined): string {
    if (!p) return '–';
    return typeof p === 'string' ? p : (p.name ?? '–');
  }

  const games = $derived(match?.games ?? []);
  const p1Name = $derived(
    match ? (playerName(match.p1) === '–' ? 'Player 1' : playerName(match.p1)) : 'P1'
  );
  const p2Name = $derived(
    match ? (playerName(match.p2) === '–' ? 'Player 2' : playerName(match.p2)) : 'P2'
  );
  const p1Id = $derived(
    match && (typeof match.p1 === 'object' && match.p1 ? match.p1._id : match.p1)
  );
  const p2Id = $derived(
    match && (typeof match.p2 === 'object' && match.p2 ? match.p2._id : match.p2)
  );
  const gameOverWinnerName = $derived(
    gameOverWinnerId === p1Id ? p1Name : gameOverWinnerId === p2Id ? p2Name : 'Winner'
  );
  function gameWinnerId(g: Game): string | undefined {
    if (!g.winner) return undefined;
    return typeof g.winner === 'string' ? g.winner : (g.winner as { _id?: string })?._id;
  }
  let p1GamesWon = $derived(
    games.filter((g) => g.status === 'done' && gameWinnerId(g) === p1Id).length
  );
  let p2GamesWon = $derived(
    games.filter((g) => g.status === 'done' && gameWinnerId(g) === p2Id).length
  );

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
      starter =
        typeof cur.starter === 'object' && cur.starter != null
          ? cur.starter._id
          : (cur.starter ?? '');
    }
  });

  /** Show "choose starter" prompt when current game has no starter and not dismissed. Skip in quick play (no players). */
  $effect(() => {
    if (!match || games.length === 0) return;
    if (!p1Id || !p2Id) return; /* quick play: skip */
    const cur = games[gameIndex];
    const hasStarter =
      cur && (typeof cur.starter === 'object' ? cur.starter != null : !!cur.starter);
    if (!hasStarter && !starterPromptDismissed[gameIndex]) {
      showStarterPrompt = true;
    }
  });

  function dismissStarterPrompt() {
    starterPromptDismissed = { ...starterPromptDismissed, [gameIndex]: true };
    showStarterPrompt = false;
  }

  async function chooseStarter(playerId: string) {
    if (starterSaving) return;
    starter = playerId;
    starterSaving = true;
    try {
      await save();
      dismissStarterPrompt();
    } finally {
      starterSaving = false;
    }
  }

  function scheduleWinCheck() {
    if (winCheckTimeout) clearTimeout(winCheckTimeout);
    winCheckTimeout = setTimeout(() => {
      winCheckTimeout = null;
      if (p1Lore >= LORE_WIN || p2Lore >= LORE_WIN) {
        saveAsDone();
      }
    }, 500);
  }

  /** Schedule save 1s after last change; resets on each call. */
  function scheduleDebouncedSave() {
    if (debouncedSaveTimeout) clearTimeout(debouncedSaveTimeout);
    debouncedSaveTimeout = setTimeout(async () => {
      debouncedSaveTimeout = null;
      if (!saving) await save();
    }, 500);
  }

  function incP1() {
    p1Lore = Math.min(LORE_MAX, p1Lore + 1);
    scheduleWinCheck();
    scheduleDebouncedSave();
  }
  function decP1() {
    p1Lore = Math.max(0, p1Lore - 1);
    scheduleDebouncedSave();
  }
  function incP2() {
    p2Lore = Math.min(LORE_MAX, p2Lore + 1);
    scheduleWinCheck();
    scheduleDebouncedSave();
  }
  function decP2() {
    p2Lore = Math.max(0, p2Lore - 1);
    scheduleDebouncedSave();
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
        ...(starter ? { starter } : {}),
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
        gameOverWinnerId = winnerId;
        showGameOverPrompt = true;
      }
    } catch {
      error = 'Could not save.';
    } finally {
      saving = false;
    }
  }

  async function goToNextGame() {
    showGameOverPrompt = false;
    gameOverWinnerId = null;
    // save match with a new game
    const newGame = {
      p1Lore: 0,
      p2Lore: 0,
      status: 'in_progress',
      winner: null,
      starter: null,
    };
    const updatedGames = [...games, newGame];
    const res = await fetch(`${apiUrl}/matches/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ games: updatedGames }),
    });
    if (!res.ok) {
      error = 'Could not save.';
    }
    match = await res.json();
    gameIndex = updatedGames.length - 1;
    // update the game counter
    p1GamesWon = updatedGames.filter(
      (g) => g.status === 'done' && gameWinnerId(g as Game) === p1Id
    ).length;
    p2GamesWon = updatedGames.filter(
      (g) => g.status === 'done' && gameWinnerId(g as Game) === p2Id
    ).length;

    // redirect to the new game
    goto(`/matches/${id}/lore?game=${gameIndex}`, { replaceState: true });
  }

  function closeGameAndLeave() {
    showCloseGamePrompt = false;
    goto(`/matches/${id}`);
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
        ...(starter ? { starter } : {}),
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
    <div class="lore-page__loading card" role="alert">
      <p class="alert">{error}</p>
      <a href="/matches/{id}" class="btn">Back to match</a>
    </div>
  {:else if match && games.length > 0}
    <div class="lore-split">
      <!-- Vertical game counter: half in top, half in bottom -->
      <div class="lore-score-pill-wrap" aria-label="Games won">
        <div class="lore-score-pill">
          <span class="lore-score-pill__score">{p2GamesWon} – {p1GamesWon}</span>
        </div>
      </div>

      <!-- P2 top (purple) -->
      <div
        class="lore-panel lore-panel--p2"
        class:lore-panel--winner={showGameOverPrompt && gameOverWinnerId === p2Id}
      >
        <div class="lore-panel__center">
          <button
            type="button"
            class="lore-panel__btn lore-panel__btn--dec"
            onclick={decP2}
            aria-label="Decrease Lore">−</button
          >
          <span class="lore-panel__value">{p2Lore}</span>
          <button
            type="button"
            class="lore-panel__btn lore-panel__btn--inc"
            onclick={incP2}
            aria-label="Increase Lore">+</button
          >
        </div>
      </div>

      <div class="lore-divider">
        <button
          type="button"
          class="lore-divider__menu"
          aria-label="Menu"
          onclick={() => (showCloseGamePrompt = true)}>☰</button
        >
      </div>

      <!-- P1 bottom (grey): left = decrease, right = increase -->
      <div
        class="lore-panel lore-panel--p1"
        class:lore-panel--winner={showGameOverPrompt && gameOverWinnerId === p1Id}
      >
        <div class="lore-panel__center">
          <button
            type="button"
            class="lore-panel__btn lore-panel__btn--dec"
            onclick={decP1}
            aria-label="Decrease Lore">−</button
          >
          <span class="lore-panel__value">{p1Lore}</span>
          <button
            type="button"
            class="lore-panel__btn lore-panel__btn--inc"
            onclick={incP1}
            aria-label="Increase Lore">+</button
          >
        </div>
      </div>
    </div>

    {#if error}
      <p class="alert" role="alert" aria-live="assertive">{error}</p>
    {/if}
  {:else}
    <div class="card">
      <p class="muted">No games in this match yet.</p>
      <a href="/matches/{id}" class="btn">Back to match</a>
    </div>
  {/if}

  <!-- Close game?: confirm before leaving lore tracker -->
  {#if showCloseGamePrompt}
    <div class="lore-modal" role="dialog" aria-modal="true" aria-labelledby="close-game-title">
      <button
        type="button"
        class="lore-modal__backdrop"
        aria-label="Close"
        onclick={() => (showCloseGamePrompt = false)}
      ></button>
      <div class="lore-modal__card card">
        <h2 id="close-game-title" class="lore-modal__title">Close the game?</h2>
        <p class="lore-modal__text muted">Do you want to leave the lore tracker?</p>
        <div class="lore-modal__actions">
          <button type="button" class="btn btn--primary" onclick={closeGameAndLeave}>Leave</button>
          <button type="button" class="btn" onclick={() => (showCloseGamePrompt = false)}
            >Cancel</button
          >
        </div>
      </div>
    </div>
  {/if}

  <!-- Choose starting player: two large buttons in player direction (P2 top, P1 bottom) -->
  {#if showStarterPrompt}
    <div class="lore-modal" role="dialog" aria-modal="true" aria-labelledby="starter-choice-title">
      <button
        type="button"
        class="lore-modal__backdrop"
        aria-label="Close"
        onclick={dismissStarterPrompt}
      ></button>
      <div class="lore-modal__card card lore-starter-choice">
        <h2 id="starter-choice-title" class="lore-starter-choice__title">Choose starting player</h2>
        <div class="lore-starter-choice__buttons">
          <button
            type="button"
            class="lore-starter-choice__btn lore-starter-choice__btn--p2"
            disabled={starterSaving}
            onclick={() => p2Id && chooseStarter(p2Id)}
            aria-label={`${p2Name} starts`}
          >
            {starterSaving ? 'Saving…' : p2Name}
          </button>
          <button
            type="button"
            class="lore-starter-choice__btn lore-starter-choice__btn--p1"
            disabled={starterSaving}
            onclick={() => p1Id && chooseStarter(p1Id)}
            aria-label={`${p1Name} starts`}
          >
            {starterSaving ? 'Saving…' : p1Name}
          </button>
        </div>
      </div>
    </div>
  {/if}

  <!-- Game over: winner animation + "Go to next game?" -->
  {#if showGameOverPrompt}
    <div class="lore-modal" role="dialog" aria-modal="true" aria-labelledby="game-over-title">
      <div class="lore-modal__backdrop"></div>
      <div class="lore-modal__card card">
        <h2 id="game-over-title" class="lore-modal__title lore-game-over__title">
          {gameOverWinnerName} wins!
        </h2>
        <p class="lore-modal__text muted">Go to the next game?</p>
        <div class="lore-modal__actions">
          <a href="/matches/{id}" class="btn btn--primary">Back to match</a>
          <button type="button" class="btn" onclick={() => goToNextGame()}>Next Game</button>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .lore-page {
    flex: 1;
    display: flex;
    flex-direction: column;
    /* gap: 16px; */
    width: 100%;
    min-height: 0;
    user-select: none;
    -webkit-user-select: none;
  }

  .lore-page__loading {
    text-align: center;
    padding: 24px;
    max-width: 420px;
    margin: 0 auto;
  }

  /* Split layout: two full-height halves + divider */
  .lore-split {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
    width: 100%;
    position: relative;
  }

  /* Vertical game counter: straddles the divider, half in top panel and half in bottom */
  .lore-score-pill-wrap {
    position: absolute;
    left: 0px;
    top: 0;
    bottom: 0;
    width: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2;
    pointer-events: none;
  }

  .lore-score-pill {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    background: rgba(30, 30, 30, 0.762);
    backdrop-filter: saturate(var(--glass-saturate)) blur(var(--glass-blur));
    -webkit-backdrop-filter: saturate(var(--glass-saturate)) blur(var(--glass-blur));
    border: 1px solid var(--glass-border);
    color: #fff;
    padding: 10px;
    border-radius: 0 12px 12px 0;
  }

  .lore-score-pill__score {
    font-size: 1.25rem;
    font-weight: 700;
    letter-spacing: 0.05em;
    flex-shrink: 0;
  }

  .lore-panel {
    flex: 1 1 0;
    min-height: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
  }

  .lore-panel--p1 {
    background: rgba(87, 101, 124, 0.65);
    backdrop-filter: saturate(var(--glass-saturate)) blur(var(--glass-blur));
    -webkit-backdrop-filter: saturate(var(--glass-saturate)) blur(var(--glass-blur));
    border: 1px solid var(--glass-border);
  }

  .lore-panel--p2 {
    background: rgba(122, 54, 171, 0.65);
    backdrop-filter: saturate(var(--glass-saturate)) blur(var(--glass-blur));
    -webkit-backdrop-filter: saturate(var(--glass-saturate)) blur(var(--glass-blur));
    border: 1px solid var(--glass-border);
    transform: rotate(180deg);
  }

  .lore-panel--winner {
    animation: lore-winner-pulse-panel 2s ease-in-out;
    box-shadow: inset 0 0 0 3px var(--ok);
  }

  @keyframes lore-winner-pulse-panel {
    0%,
    100% {
      box-shadow:
        inset 0 0 0 3px var(--ok),
        inset 0 0 24px rgba(34, 197, 94, 0.2);
    }
    50% {
      box-shadow:
        inset 0 0 0 4px var(--ok),
        inset 0 0 32px rgba(34, 197, 94, 0.35);
    }
  }

  .lore-panel__center {
    display: flex;
    align-items: center;
    justify-content: center;
    /* gap: 16px; */
  }

  .lore-panel__value {
    font-size: 15rem;
    font-weight: 500;
    line-height: 15rem;
    color: #fff;
    min-width: 2ch;
    z-index: 1;
    text-align: center;
    position: absolute;
    pointer-events: none;
  }

  .lore-panel__btn {
    width: 50vw;
    height: 50vh;
    min-width: 48px;
    min-height: 48px;
    border: none;
    background: transparent;
    color: #fff;
    font-size: 10rem;
    font-weight: 400;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition:
      background 0.15s,
      transform 0.1s;
    touch-action: manipulation;
    position: relative;
    z-index: 2;
  }

  .lore-panel__btn:hover {
    background: rgba(30, 30, 30, 0.15);
  }

  .lore-panel__btn:active {
    transform: scale(0.95);
  }

  @media (max-width: 480px) {
    .lore-panel__btn {
      min-width: 64px;
      font-size: 2rem;
    }
  }

  .lore-divider {
    flex-shrink: 0;
    height: 2px;
    background: #000;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .lore-divider__menu {
    position: absolute;
    width: 48px;
    height: 48px;
    padding: 0;
    border-radius: 50%;
    background: #111;
    cursor: pointer;
    font: inherit;
    appearance: none;
    backdrop-filter: saturate(var(--glass-saturate)) blur(var(--glass-blur));
    -webkit-backdrop-filter: saturate(var(--glass-saturate)) blur(var(--glass-blur));
    border: 1px solid var(--glass-border);
    z-index: 2;
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
    font-weight: 700;
    text-decoration: none;
    line-height: 1;
    transition:
      background 0.15s,
      transform 0.1s;
    box-shadow: 0 0 0 2px #000;
  }

  .lore-divider__menu:hover {
    background: #222;
    transform: scale(1.05);
  }

  .lore-divider__menu:active {
    transform: scale(0.98);
  }

  .lore-game-over__title {
    color: var(--ok);
  }

  /* Modal overlay */
  .lore-modal {
    position: fixed;
    inset: 0;
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    animation: lore-fade-in 0.2s ease-out;
  }

  .lore-modal__backdrop {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    padding: 0;
    border: none;
    background: rgba(0, 0, 0, 0.5);
    cursor: pointer;
    appearance: none;
  }

  .lore-modal__card {
    position: relative;
    z-index: 1;
    max-width: 420px;
    width: 100%;
    text-align: center;
  }

  .lore-modal__title {
    font-size: 1.5rem;
    font-weight: 800;
    margin: 0 0 24px;
  }

  .lore-modal__text {
    margin: 0 0 24px;
  }

  .lore-modal__actions {
    display: flex;
    gap: 12px;
    justify-content: center;
    flex-wrap: wrap;
  }

  @media (max-width: 480px) {
    .lore-modal__actions .btn {
      min-height: 52px;
      padding: 14px 24px;
      font-size: 1.1rem;
    }
  }

  /* Choose starting player: two large buttons in player direction (P2 top, P1 bottom) */
  .lore-starter-choice {
    padding: 0;
    max-width: 420px;
    overflow: hidden;
  }

  .lore-starter-choice__title {
    margin: 0;
    padding: 20px 20px 12px;
    font-size: 1.25rem;
    text-align: center;
  }

  .lore-starter-choice__buttons {
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  .lore-starter-choice__btn {
    flex: 1;
    min-height: 120px;
    border: none;
    padding: 24px 20px;
    font-size: 1.5rem;
    font-weight: 700;
    font-family: inherit;
    cursor: pointer;
    transition:
      filter 0.15s,
      transform 0.1s;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    color: #fff;
  }

  .lore-starter-choice__btn:hover:not(:disabled) {
    filter: brightness(1.1);
    transform: scale(1.01);
  }

  .lore-starter-choice__btn:active:not(:disabled) {
    transform: scale(0.99);
  }

  .lore-starter-choice__btn:disabled {
    opacity: 0.8;
    cursor: wait;
  }

  .lore-starter-choice__btn--p2 {
    background: linear-gradient(145deg, #5b21b6, #7c3aed);
  }

  .lore-starter-choice__btn--p1 {
    background: linear-gradient(145deg, #4b5563, #6b7280);
  }

  @keyframes lore-fade-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
</style>
