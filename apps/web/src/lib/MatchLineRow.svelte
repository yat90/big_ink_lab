<script lang="ts">
  import { DateDisplay } from '$lib/DateDisplay';
  import InkIcons from '$lib/InkIcons.svelte';
  import {
    getMatchLineRowView,
    type LorcanaMatch,
    type MatchLineRowPerspective,
  } from '$lib/lorcana-match';

  let {
    match,
    perspective,
  }: {
    match: LorcanaMatch;
    perspective: MatchLineRowPerspective;
  } = $props();

  const row = $derived(getMatchLineRowView(match, perspective));
  const showBothDecks = $derived(perspective.matchupMode === 'dual');
</script>

<li class="match-line-row__item">
  <a href="/matches/{match._id}" class="match-line-row__link">
    {#if row.isIntentionalDraw}
      <span class="match-line-row__result match-line-row__result--id" title="Intentional draw">
        ID
      </span>
    {:else if row.isBye}
      <span class="match-line-row__result match-line-row__result--bye" title="Bye (free win)">
        BYE
      </span>
    {:else}
      <span
        class="match-line-row__result"
        class:won={row.won}
        class:lost={!row.won}
        title={row.won ? 'Win' : 'Loss'}
      >
        {row.won ? 'W' : 'L'}
      </span>
    {/if}
    <span class="match-line-row__matchup">
      {#if showBothDecks}
        <span class="match-line-row__deck-color" title={row.myDeckColor ?? ''}>
          <InkIcons deckColor={row.myDeckColor ?? ''} size="sm" />
        </span>
        <span class="match-line-row__vs">vs</span>
      {:else}
        <span class="match-line-row__vs">vs</span>
      {/if}
      <span class="match-line-row__deck-color" title={row.opponentDeckColor}>
        <InkIcons deckColor={row.opponentDeckColor} size="sm" />
      </span>
    </span>
    <span class="match-line-row__meta muted">
      {row.stage}
    </span>
    <span class="match-line-row__meta muted">
      {#if row.isBye}
        <span title="Bye has no game rows">No games</span>
      {:else}
        <span class="match-line-row__score">{row.gamesWon}/{row.gamesPlayed}</span> games
      {/if}
    </span>
    <span class="match-line-row__date muted">{DateDisplay.formatRelativeDate(row.playedAt)}</span>
  </a>
</li>

<style>
  :global(ul.match-line-row__list) {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }

  .match-line-row__item {
    margin: 0;
  }

  .match-line-row__link {
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

  .match-line-row__link:hover {
    background: var(--glass-bg-strong);
  }

  .match-line-row__result {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 1.5rem;
    height: 1.5rem;
    border-radius: 4px;
    font-weight: 700;
    font-size: 0.8rem;
  }

  .match-line-row__result.won {
    background: var(--color-success-bg, rgba(34, 197, 94, 0.2));
    color: var(--color-success, #16a34a);
  }

  .match-line-row__result.lost {
    background: var(--color-error-bg, rgba(239, 68, 68, 0.2));
    color: var(--color-error, #dc2626);
  }

  .match-line-row__result--id {
    background: color-mix(in srgb, var(--muted) 18%, transparent);
    color: color-mix(in srgb, var(--fg) 72%, var(--muted));
    font-size: 0.72rem;
    letter-spacing: 0.04em;
    min-width: 1.75rem;
  }

  .match-line-row__result--bye {
    background: color-mix(in srgb, var(--primary) 15%, transparent);
    color: var(--primary, #3b82f6);
    font-size: 0.65rem;
    font-weight: 800;
    letter-spacing: 0.03em;
    min-width: 2.1rem;
  }

  .match-line-row__matchup {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    font-weight: 600;
  }

  .match-line-row__deck-color {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
  }

  .match-line-row__vs {
    color: var(--muted);
    font-weight: 500;
    margin: 0 0.15rem;
  }

  .match-line-row__score {
    color: var(--fg);
    font-weight: 600;
  }

  .match-line-row__meta {
    font-size: 0.9rem;
  }

  .match-line-row__date {
    margin-left: auto;
    font-size: 0.85rem;
  }
</style>
