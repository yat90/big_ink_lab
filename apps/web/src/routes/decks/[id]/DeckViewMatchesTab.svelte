<script lang="ts">
  import { config } from '$lib/config';
  import InkIcons from '$lib/InkIcons.svelte';
  import Pagination from '$lib/Pagination.svelte';

  type Player = { _id: string; name: string; team?: string };
  type DeckRef = { _id: string; name?: string } | string;
  type Game = { winner?: { _id: string } | string };
  type Match = {
    _id: string;
    stage?: string;
    playedAt?: string;
    p1?: Player | string;
    p2?: Player | string;
    p1Deck?: DeckRef;
    p2Deck?: DeckRef;
    p1DeckColor?: string;
    p2DeckColor?: string;
    matchWinner?: Player | string;
    games?: Game[];
  };

  let { deckId }: { deckId: string } = $props();

  const apiUrl = config.apiUrl ?? '/api';
  const PAGE_SIZE = 10;

  let matches = $state<Match[]>([]);
  let total = $state(0);
  let currentPage = $state(1);
  let loading = $state(true);
  let error = $state('');

  const totalPages = $derived(Math.max(1, Math.ceil(total / PAGE_SIZE)));

  function getDeckId(ref: DeckRef | undefined): string | undefined {
    if (!ref) return undefined;
    return typeof ref === 'string' ? ref : ref._id;
  }

  function getPlayerId(p: Player | string | undefined): string | undefined {
    if (!p) return undefined;
    return typeof p === 'string' ? p : p._id;
  }

  function matchWinnerId(m: Match): string | undefined {
    const w = m.matchWinner;
    if (!w) return undefined;
    return typeof w === 'object' && w !== null ? w._id : (w as string);
  }

  /** True if the deck (deckId) won this match. */
  function deckWon(match: Match): boolean {
    const winnerId = matchWinnerId(match);
    if (!winnerId) return false;
    const p1Id = getPlayerId(match.p1);
    const p2Id = getPlayerId(match.p2);
    const p1DeckId = getDeckId(match.p1Deck);
    const p2DeckId = getDeckId(match.p2Deck);
    if (p1DeckId === deckId && p1Id === winnerId) return true;
    if (p2DeckId === deckId && p2Id === winnerId) return true;
    return false;
  }

  /** Our deck color and opponent deck color for this match (from deckId). */
  function getMatchupColors(match: Match): { myDeckColor: string; opponentDeckColor: string } {
    const p1DeckId = getDeckId(match.p1Deck);
    const isP1 = p1DeckId === deckId;
    return {
      myDeckColor: isP1 ? (match.p1DeckColor ?? '–') : (match.p2DeckColor ?? '–'),
      opponentDeckColor: isP1 ? (match.p2DeckColor ?? '–') : (match.p1DeckColor ?? '–'),
    };
  }

  function gameWinnerId(g: Game): string | undefined {
    const w = g.winner;
    if (w == null) return undefined;
    return typeof w === 'object' && w !== null && '_id' in w ? w._id : String(w);
  }

  /** Games won by our deck and total games in this match. */
  function getGameScore(match: Match): { ourWins: number; total: number } {
    const games = match.games ?? [];
    const total = games.length;
    const p1Id = getPlayerId(match.p1);
    const p2Id = getPlayerId(match.p2);
    const p1DeckId = getDeckId(match.p1Deck);
    const isP1 = p1DeckId === deckId;
    const ourPlayerId = isP1 ? p1Id : p2Id;
    const ourWins = ourPlayerId ? games.filter((g) => gameWinnerId(g) === ourPlayerId).length : 0;
    return { ourWins, total };
  }

  function formatRelativeDate(s: string | undefined): string {
    if (!s) return '–';
    try {
      const d = new Date(s);
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays} days ago`;
      if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
      return d.toLocaleDateString(undefined, { dateStyle: 'medium' });
    } catch {
      return s;
    }
  }

  async function loadMatches(page: number) {
    if (!deckId) return;
    loading = true;
    error = '';
    try {
      const params = new URLSearchParams();
      params.set('deck', deckId);
      params.set('page', String(page));
      params.set('limit', String(PAGE_SIZE));
      params.set('sort', 'newest');
      const res = await fetch(`${apiUrl}/matches?${params}`);
      if (!res.ok) {
        error = 'Could not load matches.';
        return;
      }
      const data = await res.json();
      matches = data.data ?? [];
      total = data.total ?? 0;
      currentPage = page;
    } catch {
      error = 'Could not load matches.';
    } finally {
      loading = false;
    }
  }

  $effect(() => {
    if (deckId) loadMatches(1);
  });
</script>

<div class="deck-view-matches" role="tabpanel" aria-label="Matches with this deck">
  {#if loading && matches.length === 0}
    <p class="muted">Loading matches…</p>
  {:else if error}
    <p class="deck-view-matches__error">{error}</p>
  {:else if matches.length === 0}
    <p class="muted">No matches recorded with this deck yet.</p>
  {:else}
    <ul class="deck-view-matches__list">
      {#each matches as match (match._id)}
        {@const matchup = getMatchupColors(match)}
        {@const score = getGameScore(match)}
        <li class="deck-view-matches__item">
          <a href="/matches/{match._id}" class="deck-view-matches__link">
            <span
              class="deck-view-matches__result"
              class:won={deckWon(match)}
              class:lost={!deckWon(match)}
              title={deckWon(match) ? 'Win' : 'Loss'}
            >
              {deckWon(match) ? 'W' : 'L'}
            </span>
            <span class="deck-view-matches__matchup">
              <span class="deck-view-matches__vs">vs</span>
              <span class="deck-view-matches__deck-color" title={matchup.opponentDeckColor}>
                <InkIcons deckColor={matchup.opponentDeckColor} size="sm" />
                {matchup.opponentDeckColor !== '–' ? matchup.opponentDeckColor : ''}
              </span>
            </span>
            <span class="deck-view-matches__meta muted">
              {match.stage ?? '–'} · <span class="deck-view-matches__score">{score.ourWins}/{score.total}</span> games
            </span>
            <span class="deck-view-matches__date muted">{formatRelativeDate(match.playedAt)}</span>
          </a>
        </li>
      {/each}
    </ul>
    {#if totalPages > 1}
      <div class="deck-view-matches__pagination">
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={(p) => loadMatches(p)}
        />
      </div>
    {/if}
  {/if}
</div>

<style>
  .deck-view-matches__error {
    color: var(--danger);
  }
  .deck-view-matches__list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }
  .deck-view-matches__item {
    margin: 0;
  }
  .deck-view-matches__link {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-sm) var(--space-md);
    padding: var(--space-sm) var(--space-md);
    border-radius: var(--radius-sm);
    background: var(--glass-bg);
    color: inherit;
    text-decoration: none;
    transition: background 0.15s;
  }
  .deck-view-matches__link:hover {
    background: var(--glass-bg-strong);
  }
  .deck-view-matches__result {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 1.5rem;
    height: 1.5rem;
    border-radius: 4px;
    font-weight: 700;
    font-size: 0.8rem;
  }
  .deck-view-matches__result.won {
    background: var(--color-success-bg, rgba(34, 197, 94, 0.2));
    color: var(--color-success, #16a34a);
  }
  .deck-view-matches__result.lost {
    background: var(--color-error-bg, rgba(239, 68, 68, 0.2));
    color: var(--color-error, #dc2626);
  }
  .deck-view-matches__matchup {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    font-weight: 600;
  }
  .deck-view-matches__deck-color {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
  }
  .deck-view-matches__vs {
    color: var(--muted);
    font-weight: 500;
    margin: 0 0.15rem;
  }
  .deck-view-matches__score {
    color: var(--fg);
    font-weight: 600;
  }
  .deck-view-matches__meta {
    font-size: 0.9rem;
  }
  .deck-view-matches__date {
    margin-left: auto;
    font-size: 0.85rem;
  }
  .deck-view-matches__pagination {
    margin-top: var(--space-lg);
  }
</style>
