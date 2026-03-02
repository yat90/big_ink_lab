<script lang="ts">
  import { config } from '$lib/config';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';

  type Player = { _id: string; name: string; team: string };
  type Game = { p1Lore?: number; p2Lore?: number; status?: string; winner?: string; starter?: string | { _id: string } };
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

  /** Game indices for which the user dismissed the "flip coin?" prompt (Skip). */
  let coinFlipPromptDismissed = $state<Record<number, boolean>>({});
  /** True when showing the "flip coin to choose starter?" modal. */
  let showCoinFlipPrompt = $state(false);
  /** True when showing the coin flip UI (two-sided coin, flip to pick starter). */
  let showCoinFlipUI = $state(false);
  /** After flipping: 'flipping' | winner id (p1 or p2) | null before flip. */
  let coinFlipResult = $state<string | 'flipping' | null>(null);
  let coinFlipSaving = $state(false);

  const apiUrl = config.apiUrl ?? '/api';
  const LORE_MAX = 25;
  const LORE_WIN = 20;

  function playerName(p: Player | string | undefined): string {
    if (!p) return '–';
    return typeof p === 'string' ? p : p.name ?? '–';
  }

  const games = $derived(match?.games ?? []);
  const p1Name = $derived(
    match ? (playerName(match.p1) === '–' ? 'Player 1' : playerName(match.p1)) : 'P1',
  );
  const p2Name = $derived(
    match ? (playerName(match.p2) === '–' ? 'Player 2' : playerName(match.p2)) : 'P2',
  );
  const p1Id = $derived(match && (typeof match.p1 === 'object' && match.p1 ? match.p1._id : match.p1));
  const p2Id = $derived(match && (typeof match.p2 === 'object' && match.p2 ? match.p2._id : match.p2));

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
      starter = typeof cur.starter === 'object' && cur.starter != null ? cur.starter._id : (cur.starter ?? '');
    }
  });

  /** Show "flip coin?" prompt when current game has no starter and not dismissed. Skip in quick play (no players). */
  $effect(() => {
    if (!match || games.length === 0 || showCoinFlipUI) return;
    if (!p1Id || !p2Id) return; /* quick play: skip coin flip */
    const cur = games[gameIndex];
    const hasStarter = cur && (typeof cur.starter === 'object' ? cur.starter != null : !!cur.starter);
    if (!hasStarter && !coinFlipPromptDismissed[gameIndex]) {
      showCoinFlipPrompt = true;
    }
  });

  function dismissCoinFlipPrompt(skip: boolean) {
    coinFlipPromptDismissed = { ...coinFlipPromptDismissed, [gameIndex]: true };
    showCoinFlipPrompt = false;
    if (skip) return;
    showCoinFlipUI = true;
    coinFlipResult = null;
  }

  /** Runs automatically when coin modal opens: flashy flip, then show result. Does not save. */
  async function runFlipAnimation() {
    if (!p1Id || !p2Id) return;
    coinFlipResult = 'flipping';
    const winnerId = Math.random() < 0.5 ? p1Id : p2Id;
    await new Promise((r) => setTimeout(r, 1400));
    coinFlipResult = winnerId;
  }

  /** User chooses flip winner as starter. */
  function chooseStarterAsFlipWinner() {
    if (coinFlipResult === null || coinFlipResult === 'flipping') return;
    starter = coinFlipResult;
    showCoinFlipUI = false;
    coinFlipResult = null;
    scheduleDebouncedSave();
  }

  /** User gives start to the opponent (other player). */
  function chooseOpponentStarter() {
    if (coinFlipResult === null || coinFlipResult === 'flipping' || !p1Id || !p2Id) return;
    starter = coinFlipResult === p1Id ? p2Id : p1Id;
    showCoinFlipUI = false;
    coinFlipResult = null;
    scheduleDebouncedSave();
  }

  /** Auto-start flip when coin modal opens. */
  $effect(() => {
    if (showCoinFlipUI && coinFlipResult === null && match && p1Id && p2Id) {
      runFlipAnimation();
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

  /** Schedule save 1s after last change; resets on each call. */
  function scheduleDebouncedSave() {
    if (debouncedSaveTimeout) clearTimeout(debouncedSaveTimeout);
    debouncedSaveTimeout = setTimeout(async () => {
      debouncedSaveTimeout = null;
      if (!saving) await save();
    }, 1000);
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
    <div class="lore-page__cards">
      <!-- P2 top -->
      <div class="lore-card card lore-card--p2" class:lore-card--starter={starter === p2Id} class:lore-card--second={starter === p1Id}>
        <span class="lore-card__name">{p2Name}</span>
        <button type="button" class="lore-card__btn lore-card__btn--inc" onclick={incP2} aria-label="Increase Lore">+</button>
        <div class="lore-card__value">{p2Lore}</div>
        <button type="button" class="lore-card__btn lore-card__btn--dec" onclick={decP2} aria-label="Decrease Lore">−</button>
      </div>

      <div class="lore-page__actions">
        <a href="/matches/{id}" class="btn btn--primary lore-page__done-btn">Done</a>
      </div>

      <!-- P1 bottom -->
      <div class="lore-card card lore-card--p1" class:lore-card--starter={starter === p1Id} class:lore-card--second={starter === p2Id}>
        <span class="lore-card__name">{p1Name}</span>
        <button type="button" class="lore-card__btn lore-card__btn--inc" onclick={incP1} aria-label="Increase Lore">+</button>
        <div class="lore-card__value">{p1Lore}</div>
        <button type="button" class="lore-card__btn lore-card__btn--dec" onclick={decP1} aria-label="Decrease Lore">−</button>
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

  <!-- Coin flip prompt: choose whether to flip for starting player -->
  {#if showCoinFlipPrompt}
    <div class="lore-modal" role="dialog" aria-modal="true" aria-labelledby="coin-flip-prompt-title">
      <button
        type="button"
        class="lore-modal__backdrop"
        aria-label="Close"
        onclick={() => dismissCoinFlipPrompt(true)}
      ></button>
      <div class="lore-modal__card card">
        <h2 id="coin-flip-prompt-title" class="lore-modal__title">Choose starting player</h2>
        <p class="lore-modal__text muted">Flip a coin to decide who goes first?</p>
        <div class="lore-modal__actions">
          <button type="button" class="btn btn--primary" onclick={() => dismissCoinFlipPrompt(false)}>Flip coin</button>
          <button type="button" class="btn" onclick={() => dismissCoinFlipPrompt(true)}>Skip</button>
        </div>
      </div>
    </div>
  {/if}

  <!-- Coin flip UI: auto-flip, then choose who starts -->
  {#if showCoinFlipUI && match}
    <div class="lore-modal" role="dialog" aria-modal="true" aria-labelledby="coin-flip-title">
      <div class="lore-modal__backdrop"></div>
      <div class="lore-modal__card card lore-coin-wrap">
        <h2 id="coin-flip-title" class="lore-modal__title">Who goes first?</h2>
        {#if coinFlipResult === null}
          <div class="lore-coin lore-coin--flipping" aria-busy="true">
            <span class="lore-coin__face lore-coin__face--p1">{p2Name}</span>
            <span class="lore-coin__face lore-coin__face--p2">{p1Name}</span>
          </div>
          <p class="muted">Flipping…</p>
        {:else if coinFlipResult === 'flipping'}
          <div class="lore-coin lore-coin--flipping" aria-busy="true">
            <span class="lore-coin__face lore-coin__face--p1">{p2Name}</span>
            <span class="lore-coin__face lore-coin__face--p2">{p1Name}</span>
          </div>
          <p class="muted">Flipping…</p>
        {:else}
          <div class="lore-coin lore-coin--result lore-coin--reveal" class:lore-coin--p1-wins={coinFlipResult === p2Id} class:lore-coin--p2-wins={coinFlipResult === p1Id}>
            <span class="lore-coin__face lore-coin__face--p1">{p2Name}</span>
            <span class="lore-coin__face lore-coin__face--p2">{p1Name}</span>
          </div>
          <p class="lore-coin-result-text lore-coin-result-text--flashy">
            {coinFlipResult === p1Id ? p1Name : p2Name} won the flip!
          </p>
          <p class="lore-coin-choose muted">Who starts?</p>
          <div class="lore-modal__actions">
            <button
              type="button"
              class="btn btn--primary"
              disabled={coinFlipSaving}
              onclick={chooseStarterAsFlipWinner}
            >
              {coinFlipSaving ? 'Saving…' : 'I start'}
            </button>
            <button
              type="button"
              class="btn"
              disabled={coinFlipSaving}
              onclick={chooseOpponentStarter}
            >
              {coinFlipSaving ? 'Saving…' : 'Opponent starts'}
            </button>
          </div>
        {/if}
      </div>
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
    gap: 16px;
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }

  .lore-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 24px;
    gap: 12px;
    flex: 1 1 0;
    min-height: 0;
    max-height: 50%;
    justify-content: center;
  }

  .lore-card__name {
    flex-shrink: 0;
    color: var(--muted);
    font-size: 0.95rem;
    font-weight: 600;
    text-align: center;
  }

  /* Flip P2 (top) card so both players see their card right-side up when sitting across */
  .lore-card--p2 {
    transform: rotate(180deg);
  }

  .lore-card--starter {
    border: 3px solid var(--ok);
    box-shadow: 0 0 0 1px var(--ok);
  }

  .lore-card--starter:hover {
    border-color: var(--ok);
    box-shadow: 0 0 0 1px var(--ok);
  }

  .lore-card--second {
    border: 3px solid #b91c1c;
    box-shadow: 0 0 0 1px rgba(185, 28, 28, 0.5);
  }

  .lore-card--second:hover {
    border-color: #b91c1c;
    box-shadow: 0 0 0 1px rgba(185, 28, 28, 0.5);
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
    flex-shrink: 0;
  }

  .lore-page__done-btn {
    min-width: 200px;
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
    max-width: 360px;
    width: 100%;
    text-align: center;
  }

  .lore-modal__title {
    font-size: 1.25rem;
    margin: 0 0 8px;
  }

  .lore-modal__text {
    margin: 0 0 20px;
  }

  .lore-modal__actions {
    display: flex;
    gap: 12px;
    justify-content: center;
    flex-wrap: wrap;
  }

  /* Two-sided coin */
  .lore-coin-wrap {
    padding: 24px;
  }

  .lore-coin {
    position: relative;
    width: 120px;
    height: 120px;
    margin: 0 auto 16px;
    border-radius: 50%;
    background: linear-gradient(145deg, var(--glass-bg-strong), var(--border-strong));
    border: 3px solid var(--border-strong);
    cursor: pointer;
    transform-style: preserve-3d;
    transition: transform 0.1s ease-out;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .lore-coin:hover {
    transform: scale(1.05);
  }

  .lore-coin__face {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    backface-visibility: hidden;
    font-weight: 700;
    font-size: 0.9rem;
    padding: 8px;
    text-align: center;
  }

  .lore-coin__face--p1 {
    background: linear-gradient(145deg, #1e3a5f, #2d5a87);
    color: #e0e7ff;
  }

  .lore-coin__face--p2 {
    background: linear-gradient(145deg, #3d2c1e, #6b5344);
    color: #fef3c7;
    transform: rotateY(180deg);
  }

  .lore-coin--flipping {
    cursor: default;
    animation: lore-coin-flip 1.2s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
  }

  .lore-coin--result {
    cursor: default;
  }

  .lore-coin--reveal {
    animation: lore-coin-reveal 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
  }

  .lore-coin--p1-wins {
    transform: rotateY(0deg);
  }

  .lore-coin--p2-wins {
    transform: rotateY(180deg);
  }

  .lore-coin-result-text {
    font-weight: 600;
    margin: 0 0 8px;
  }

  .lore-coin-result-text--flashy {
    font-size: 1.15rem;
    animation: lore-result-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s both;
  }

  .lore-coin-choose {
    font-size: 0.9rem;
    margin: 0 0 16px;
  }

  @keyframes lore-fade-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @keyframes lore-coin-flip {
    0% {
      transform: rotateY(0deg) scale(1);
      filter: brightness(1);
    }
    15% {
      transform: rotateY(180deg) scale(1.08);
      filter: brightness(1.2);
    }
    50% {
      transform: rotateY(900deg) scale(1.15);
      filter: brightness(1.3);
    }
    85% {
      transform: rotateY(1620deg) scale(1.05);
      filter: brightness(1.15);
    }
    100% {
      transform: rotateY(1800deg) scale(1);
      filter: brightness(1);
    }
  }

  @keyframes lore-coin-reveal {
    0% {
      transform: rotateY(0deg) scale(0.5);
      opacity: 0;
      filter: drop-shadow(0 0 0 transparent);
    }
    60% {
      transform: rotateY(0deg) scale(1.15);
      filter: drop-shadow(0 0 20px var(--ok-glow));
    }
    100% {
      transform: rotateY(0deg) scale(1);
      opacity: 1;
      filter: drop-shadow(0 0 12px var(--ok-glow));
    }
  }

  .lore-coin--p2-wins.lore-coin--reveal {
    animation: lore-coin-reveal-p2 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
  }

  @keyframes lore-coin-reveal-p2 {
    0% {
      transform: rotateY(180deg) scale(0.5);
      opacity: 0;
      filter: drop-shadow(0 0 0 transparent);
    }
    60% {
      transform: rotateY(180deg) scale(1.15);
      filter: drop-shadow(0 0 20px var(--ok-glow));
    }
    100% {
      transform: rotateY(180deg) scale(1);
      opacity: 1;
      filter: drop-shadow(0 0 12px var(--ok-glow));
    }
  }

  @keyframes lore-result-pop {
    0% {
      opacity: 0;
      transform: scale(0.8);
    }
    100% {
      opacity: 1;
      transform: scale(1);
    }
  }
</style>
