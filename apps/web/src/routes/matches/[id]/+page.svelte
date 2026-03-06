<script lang="ts">
  import { config } from '$lib/config';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { type Game, type GameStatus, STAGE_OPTIONS } from '$lib/matches';
  import GameLine from '$lib/GameLine.svelte';
  import InkIcons from '$lib/InkIcons.svelte';
  import MatchCardEdit from '$lib/MatchCardEdit.svelte';
  import IconEdit from '$lib/icons/IconEdit.svelte';
  import IconTrash from '$lib/icons/IconTrash.svelte';
  import IconCrown from '$lib/icons/IconCrown.svelte';

  type Player = { _id: string; name: string; team: string };
  type DeckRef = { _id: string; name: string };
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
    p1Deck?: DeckRef | string;
    p2Deck?: DeckRef | string;
    matchWinner?: Player | string;
    games?: Game[];
    notes?: string;
  };

  const id = $page.params.id;
  let match = $state<Match | null>(null);
  let players = $state<Player[]>([]);
  let decks = $state<{ _id: string; name: string }[]>([]);
  let loading = $state(true);
  let saving = $state(false);
  let error = $state('');
  let deleting = $state(false);
  let addingGame = $state(false);
  let updatingGameIndex = $state<number | null>(null);
  let deletingGameIndex = $state<number | null>(null);
  /** Index of game to delete; when set, show "really delete?" modal. */
  let gameToDeleteIndex = $state<number | null>(null);
  /** When true, all game lines show edit UI (Starter/Winner). */
  let editingGames = $state(false);
  /** Match card (players, deck colors, decks) in edit mode. */
  let editingMatchCard = $state(false);
  let showDeleteMatchPrompt = $state(false);
  let updatingDeckColor = $state(false);
  let updatingDeck = $state<'p1' | 'p2' | null>(null);
  let updatingMatchWinner = $state(false);
  let updatingPlayer = $state<'p1' | 'p2' | null>(null);
  let updatingStage = $state(false);
  let updatingTournamentName = $state(false);
  let updatingRound = $state(false);
  /** True when the player header is stuck at the top (sticky). */
  let playerHeaderStuck = $state(false);

  const apiUrl = config.apiUrl ?? '/api';
  const PREFERRED_TEAM = 'The Big Ink Theory';

  const p1Id = $derived(
    match && (typeof match.p1 === 'object' && match.p1 ? match.p1._id : match.p1)
  );
  const p2Id = $derived(
    match && (typeof match.p2 === 'object' && match.p2 ? match.p2._id : match.p2)
  );
  function getPlayerTeam(p: Player | string | undefined): string {
    if (!p || typeof p === 'string') return '';
    return (p.team ?? '').trim();
  }
  const showP1DeckSelect = $derived(!!p1Id && getPlayerTeam(match?.p1) === PREFERRED_TEAM);
  const showP2DeckSelect = $derived(!!p2Id && getPlayerTeam(match?.p2) === PREFERRED_TEAM);
  function getDeckId(d: DeckRef | string | undefined): string {
    if (!d) return '';
    return typeof d === 'string' ? d : d._id;
  }
  const p1DeckId = $derived(getDeckId(match?.p1Deck));
  const p2DeckId = $derived(getDeckId(match?.p2Deck));

  const playersForSelect = $derived(
    [...players].sort((a, b) => {
      const aPreferred = (a.team?.trim() ?? '') === PREFERRED_TEAM;
      const bPreferred = (b.team?.trim() ?? '') === PREFERRED_TEAM;
      if (aPreferred && !bPreferred) return -1;
      if (!aPreferred && bPreferred) return 1;
      return 0;
    })
  );
  const isQuickMatch = $derived(!p1Id && !p2Id);
  const matchWinnerId = $derived(
    match &&
      (typeof match.matchWinner === 'object' && match.matchWinner
        ? match.matchWinner._id
        : match.matchWinner)
  );

  function playerName(p: Player | string | undefined): string {
    if (!p) return '–';
    return typeof p === 'string' ? p : (p.name ?? '–');
  }

  /** Display name for UI: "Player 1" / "Player 2" when no player selected. */
  function displayPlayerName(
    p: Player | string | undefined,
    fallback: 'Player 1' | 'Player 2'
  ): string {
    const name = playerName(p);
    return name === '–' ? fallback : name;
  }

  function formatDate(s: string | undefined): string {
    if (!s) return '–';
    try {
      return new Date(s).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' });
    } catch {
      return s;
    }
  }

  function getDeckDisplayName(deck: DeckRef | string | undefined): string {
    if (!deck || typeof deck === 'string') return '—';
    return deck.name ?? '—';
  }

  function gameWinnerId(g: Game): string | undefined {
    const w = g.winner;
    if (w == null) return undefined;
    return typeof w === 'object' && w !== null && '_id' in w
      ? (w as { _id: string })._id
      : String(w);
  }

  function gamesWon(m: Match, playerId: string): number {
    const games = m.games ?? [];
    return games.filter((g) => gameWinnerId(g) === playerId).length;
  }

  /** Svelte action: observes a sentinel element; when it leaves the viewport (scrolled past), sets playerHeaderStuck. */
  function playerHeaderSentinel(node: HTMLElement) {
    const observer = new window.IntersectionObserver(
      (entries) => {
        const e = entries[0];
        if (e) playerHeaderStuck = !e.isIntersecting;
      },
      { threshold: 0 }
    );
    observer.observe(node);
    return {
      destroy() {
        observer.disconnect();
      },
    };
  }

  onMount(async () => {
    try {
      const [matchRes, playersRes, decksRes] = await Promise.all([
        fetch(`${apiUrl}/matches/${id}`),
        fetch(`${apiUrl}/players`),
        fetch(`${apiUrl}/decks`),
      ]);
      if (!matchRes.ok) {
        error = 'Match not found';
        loading = false;
        return;
      }
      const loadedMatch = await matchRes.json();
      match = loadedMatch;
      if (playersRes.ok) players = await playersRes.json();
      if (decksRes.ok) {
        const list = await decksRes.json();
        decks = Array.isArray(list)
          ? list.map((d: { _id: string; name: string }) => ({ _id: d._id, name: d.name }))
          : [];
      }
      if (loadedMatch) {
        const noPlayers =
          !(typeof loadedMatch.p1 === 'object' && loadedMatch.p1
            ? loadedMatch.p1._id
            : loadedMatch.p1) &&
          !(typeof loadedMatch.p2 === 'object' && loadedMatch.p2
            ? loadedMatch.p2._id
            : loadedMatch.p2);
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

  async function onTournamentNameChange(tournamentName: string) {
    if (!match) return;
    updatingTournamentName = true;
    error = '';
    try {
      const res = await fetch(`${apiUrl}/matches/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tournamentName: tournamentName.trim() || undefined }),
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
      updatingTournamentName = false;
    }
  }

  async function onRoundChange(round: number | '') {
    if (!match) return;
    updatingRound = true;
    error = '';
    try {
      const value = round === '' ? undefined : Number(round);
      const res = await fetch(`${apiUrl}/matches/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ round: value }),
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
      updatingRound = false;
    }
  }
  async function patchGames(games: Game[]) {
    if (!match || p1Id == null || p2Id == null) return false;
    const winnerId =
      typeof match.matchWinner === 'object' && match.matchWinner
        ? match.matchWinner._id
        : match.matchWinner;
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
          ? existing.map((g, i) =>
              i === existing.length - 1 ? { ...g, status: 'done' as GameStatus } : g
            )
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

  async function onDeckColorChange(
    p1DeckColor: string | undefined,
    p2DeckColor: string | undefined
  ) {
    if (!match) return;
    updatingDeckColor = true;
    error = '';
    try {
      const res = await fetch(`${apiUrl}/matches/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          p1DeckColor: p1DeckColor || undefined,
          p2DeckColor: p2DeckColor || undefined,
        }),
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

  async function onDeckChange(role: 'p1' | 'p2', deckId: string) {
    if (!match) return;
    updatingDeck = role;
    error = '';
    try {
      const body = role === 'p1' ? { p1Deck: deckId || null } : { p2Deck: deckId || null };
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
      updatingDeck = null;
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
      <div
        class="matchcard tack"
        style="margin: -18px -18px 0; padding: 18px 18px 12px; border-radius: var(--radius-lg) var(--radius-lg) 0 0;"
      >
        <div class="matchcard__top matchcard__top--row muted">
          <span class="matchcard__top-inner">{formatDate(match.playedAt)} ·</span>
          <span class="matchcard__top-inner">{match.stage ?? '–'}</span>
          {#if match.tournamentName}
            <span class="matchcard__top-inner">· {match.tournamentName}</span>
            {#if match.round != null}
              <span class="matchcard__top-inner">· R{match.round}</span>
            {/if}
          {/if}

          <div class="matchcard__top-actions">
            {#if editingMatchCard}
              <button
                type="button"
                class="matchcard__edit-done btn btn--sm"
                onclick={() => (editingMatchCard = false)}
                aria-label="Done editing"
              >
                Done
              </button>
            {:else}
              <button
                type="button"
                class="matchcard__edit-done btn btn--sm"
                onclick={() => (editingMatchCard = true)}
                aria-label="Edit match"
              >
                <IconEdit size={18} className="matchcard__edit-icon" />
                Edit
              </button>
            {/if}

            <button
              type="button"
              class="btn btn--danger btn--icon"
              onclick={openDeleteMatchModal}
              disabled={deleting}
              aria-label="Delete match"
              title="Delete match"
            >
              {#if deleting}
                Deleting…
              {:else}
                <IconTrash size={18} className="icon-trash" />
                Delete
              {/if}
            </button>
          </div>
        </div>
        {#if editingMatchCard}
          <MatchCardEdit
            p1Id={p1Id ?? undefined}
            p2Id={p2Id ?? undefined}
            p1DeckColor={match.p1DeckColor ?? ''}
            p2DeckColor={match.p2DeckColor ?? ''}
            {p1DeckId}
            {p2DeckId}
            players={playersForSelect}
            {decks}
            {showP1DeckSelect}
            {showP2DeckSelect}
            {updatingPlayer}
            {updatingDeckColor}
            {updatingDeck}
            {onPlayerChange}
            {onDeckColorChange}
            {onDeckChange}
          />
        {:else}
          <!-- Read-only match card -->
          <div class="matchcard__row">
            <div
              class="matchcard__player matchcard__player--left"
              class:matchcard__player--winner={matchWinnerId === p1Id}
            >
              <span class="matchcard__name">
                <span class="matchcard__name_text">
                  {displayPlayerName(match.p1, 'Player 1')}
                  {#if matchWinnerId === p1Id}
                    <span class="matchcard__badge matchcard__badge--winner" aria-label="Winner">
                      <IconCrown size={16} />
                    </span>
                  {/if}
                </span>
                <span class="matchcard__deck-readonly" aria-label="P1 deck color">
                  <InkIcons deckColor={match.p1DeckColor} size="sm" />
                  {#if getDeckDisplayName(match.p1Deck) !== '—'}
                    {#if p1DeckId}
                      <a
                        href="/decks/{p1DeckId}"
                        class="matchcard__deck-name matchcard__deck-link muted"
                        >- {getDeckDisplayName(match.p1Deck)}</a
                      >
                    {:else}
                      <span class="matchcard__deck-name muted"
                        >- {getDeckDisplayName(match.p1Deck)}</span
                      >
                    {/if}
                  {/if}
                </span>
              </span>
              <span class="matchcard__wins muted" title="Games won">
                {gamesWon(match, p1Id ?? '')}</span
              >
            </div>
            <div class="matchcard__vs" aria-hidden="true">VS.</div>
            <div
              class="matchcard__player matchcard__player--right"
              class:matchcard__player--winner={matchWinnerId === p2Id}
            >
              <span class="matchcard__wins muted" title="Games won"
                >{gamesWon(match, p2Id ?? '')}</span
              >
              <span class="matchcard__name">
                <span class="matchcard__name_text">
                  {displayPlayerName(match.p2, 'Player 2')}
                  {#if matchWinnerId === p2Id}
                    <span class="matchcard__badge matchcard__badge--winner" aria-label="Winner">
                      <IconCrown size={16} />
                    </span>
                  {/if}
                </span>
                <span class="matchcard__deck-readonly" aria-label="P2 deck color">
                  <InkIcons deckColor={match.p2DeckColor} size="sm" />
                  {#if getDeckDisplayName(match.p2Deck) !== '—'}
                    {#if p2DeckId}
                      <a
                        href="/decks/{p2DeckId}"
                        class="matchcard__deck-name matchcard__deck-link muted"
                        >- {getDeckDisplayName(match.p2Deck)}</a
                      >
                    {:else}
                      <span class="matchcard__deck-name muted"
                        >- {getDeckDisplayName(match.p2Deck)}</span
                      >
                    {/if}
                  {/if}
                </span>
              </span>
            </div>

            {#if match.notes}
              <div>
                <dt class="muted" style="font-size: 0.85rem;">Notes</dt>
                <dd>{match.notes}</dd>
              </div>
            {/if}
          </div>
        {/if}
      </div>

      <dl class="stack" style="margin-top: 12px;">
        {#if editingMatchCard}
          <div class="dl-row">
            <dt class="muted" style="font-size: 0.85rem;">Stage</dt>
            <dd>
              <select
                class="input"
                style="min-width: 140px;"
                value={match.stage ?? 'Casual'}
                disabled={updatingStage}
                onchange={(e) => onStageChange(e.currentTarget.value)}
                aria-label="Stage"
              >
                {#each STAGE_OPTIONS as s}
                  <option value={s}>{s}</option>
                {/each}
              </select>
            </dd>
          </div>
          {#if match.stage === 'Tournament'}
            <div class="dl-row">
              <dt class="muted" style="font-size: 0.85rem;">Tournament</dt>
              <dd>
                <input
                  type="text"
                  class="input"
                  style="min-width: 160px;"
                  value={match.tournamentName ?? ''}
                  disabled={updatingTournamentName}
                  onchange={(e) => onTournamentNameChange(e.currentTarget.value)}
                  placeholder="Name"
                  aria-label="Tournament name"
                />
              </dd>
            </div>
            <div class="dl-row">
              <dt class="muted" style="font-size: 0.85rem;">Round</dt>
              <dd>
                <input
                  type="number"
                  class="input"
                  style="width: 4rem;"
                  min="1"
                  value={match.round ?? ''}
                  disabled={updatingRound}
                  onchange={(e) => {
                    const v = e.currentTarget.value;
                    onRoundChange(v === '' ? '' : Number(v));
                  }}
                  placeholder="–"
                  aria-label="Round"
                />
              </dd>
            </div>
          {/if}
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
        {/if}
        {#if match.games?.length}
          <div class="stack" style="gap: 12px;">
            <div
              class="row"
              style="align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap;"
            >
              <h3 style="margin: 0;">Games</h3>
              {#if editingGames}
                <button
                  type="button"
                  class="btn btn--sm"
                  onclick={() => (editingGames = false)}
                  aria-label="Done editing"
                >
                  Done
                </button>
              {:else}
                <button
                  type="button"
                  class="btn btn--sm"
                  onclick={() => (editingGames = true)}
                  aria-label="Edit starter and winner for all games"
                  title="Edit starter and winner"
                >
                  <IconEdit size={16} className="icon-inline" />
                  <span style="margin-left: 4px;">Edit</span>
                </button>
              {/if}
            </div>
            <div class="player_header-sentinel" aria-hidden="true" use:playerHeaderSentinel></div>
            <div class="player_header" class:player_header--stuck={playerHeaderStuck}>
              <h4>{displayPlayerName(match.p1, 'Player 1')}</h4>
              <h4>{displayPlayerName(match.p2, 'Player 2')}</h4>
            </div>
            {#each match.games as g, i (i)}
              <GameLine
                game={g}
                index={i}
                matchId={id ?? ''}
                p1DisplayName={displayPlayerName(match.p1, 'Player 1')}
                p2DisplayName={displayPlayerName(match.p2, 'Player 2')}
                p1Id={p1Id ?? undefined}
                p2Id={p2Id ?? undefined}
                isEditing={editingGames}
                isUpdating={updatingGameIndex === i}
                isDeleting={deletingGameIndex === i}
                {onGameChange}
                {onDeleteGame}
                onEditDone={() => (editingGames = false)}
              />
            {/each}
          </div>
        {/if}
      </dl>

      {#if match.games != null}
        <div class="row" style="margin-top: 12px; gap: 12px; flex-wrap: wrap;">
          <button type="button" class="btn" disabled={addingGame} onclick={onAddGame}>
            {addingGame ? 'Adding…' : 'Add next game'}
          </button>
        </div>
      {/if}

      {#if error}
        <p class="alert" role="alert" aria-live="assertive">{error}</p>
      {/if}
    </div>

    <!-- Delete match confirmation -->
    {#if showDeleteMatchPrompt}
      <div
        class="delete-game-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-match-title"
      >
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
              <IconTrash size={18} className="icon-trash" />
              Delete
            </button>
            <button type="button" class="btn" onclick={closeDeleteMatchModal}>Cancel</button>
          </div>
        </div>
      </div>
    {/if}

    <!-- Delete game confirmation -->
    {#if gameToDeleteIndex != null}
      <div
        class="delete-game-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-game-title"
      >
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
              <IconTrash size={18} className="icon-trash" />
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
  .matchcard__edit-done {
    margin-left: auto;
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .matchcard__edit-icon {
    flex-shrink: 0;
  }
  .matchcard__deck-readonly {
    display: inline-flex;
    align-items: center;
  }
  .matchcard__deck-name {
    font-size: 0.9rem;
  }
  .matchcard__deck-link {
    text-decoration: none;
  }
  .matchcard__deck-link:hover {
    text-decoration: underline;
  }
  .matchcard__name {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    flex-direction: column;
  }
  .matchcard__name_text {
    font-size: 1.5rem;
  }

  .matchcard__wins,
  .matchcard__vs {
    font-size: 3rem;
  }
  .matchcard__vs {
    font-size: 2rem;
  }
  h3 {
    margin: 0 0 8px 0;
    font-size: 1.5rem;
  }

  .player_header-sentinel {
    height: 1px;
    margin-bottom: -1px;
    overflow: hidden;
    pointer-events: none;
  }
  .player_header {
    position: sticky;
    top: 0;
    z-index: 1;
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    font-size: 1.4rem;
    padding-bottom: 12px;
    font-weight: 600;
    color: var(--muted);
  }
  .player_header.player_header--stuck {
    background: color-mix(in srgb, var(--glass-bg-strong) 40%, var(--bg) 100%);
    backdrop-filter: saturate(var(--glass-saturate)) blur(var(--glass-blur));
    -webkit-backdrop-filter: saturate(var(--glass-saturate)) blur(var(--glass-blur));
    border: 1px solid var(--glass-border);
    border-radius: 0 0 var(--radius) var(--radius);
    box-shadow: var(--shadow-card);
    padding: 8px;
    padding-top: calc(12px + env(safe-area-inset-top));
    min-height: 54px;
    z-index: 10;
  }
  .player_header h4 {
    margin: 0;
  }
  /* on mobile move the vs to the right */
  @media (max-width: 640px) {
    .matchcard__vs {
      flex-grow: 1;
      text-align: right;
    }
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
</style>
