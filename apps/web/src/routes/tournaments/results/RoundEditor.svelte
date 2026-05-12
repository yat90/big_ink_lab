<script lang="ts">
  import AppButton from '$lib/components/ui/AppButton.svelte';
  import AppCard from '$lib/components/ui/AppCard.svelte';
  import DeckColorSelect from '$lib/components/deck/DeckColorSelect.svelte';
  import IconTrash from '../../../lib/icons/IconTrash.svelte';
  import { t } from '$lib/i18n';
  import { get } from 'svelte/store';
  import { locale, translate } from '$lib/i18n';
  import {
    emptyGame,
    starterSideAfterPrevious,
    winnerSideFromLore,
    type GameRow,
    type RoundRow,
    type TournamentRoundResultMode,
  } from '$lib/tournament-results';
  import GameRowEditor from './GameRowEditor.svelte';

  interface Props {
    round: RoundRow;
    roundIndex: number;
    totalRounds: number;
    eventP1: string;
    onSetLabel: (raw: string) => void;
    onBlurLabel: (fallback: string) => void;
    onSetResultMode: (mode: TournamentRoundResultMode) => void;
    onPatchRound: (patch: Partial<Pick<RoundRow, 'opponentName' | 'p2DeckColor' | 'notes'>>) => void;
    onRemoveRound: () => void;
    onUpdateGames: (games: GameRow[]) => void;
  }

  let {
    round,
    roundIndex,
    totalRounds,
    eventP1,
    onSetLabel,
    onBlurLabel,
    onSetResultMode,
    onPatchRound,
    onRemoveRound,
    onUpdateGames,
  }: Props = $props();

  const p2Label = $derived.by(() => {
    const name = round.opponentName.trim();
    return name || translate(get(locale), 'tournaments.results.opponentFallback');
  });

  function addGame() {
    const prev = round.games[round.games.length - 1];
    const starterSide = starterSideAfterPrevious(prev);
    onUpdateGames([...round.games, { ...emptyGame(), starterSide }]);
  }

  function removeGame(gi: number) {
    if (round.games.length <= 1) return;
    onUpdateGames(round.games.filter((_, i) => i !== gi));
  }

  function patchGame(gi: number, patch: Partial<GameRow>) {
    onUpdateGames(round.games.map((g, i) => (i === gi ? { ...g, ...patch } : g)));
  }

  function patchGameLore(gi: number, lore: { p1Lore?: string; p2Lore?: string }) {
    onUpdateGames(
      round.games.map((g, i) => {
        if (i !== gi) return g;
        const next = { ...g, ...lore };
        return { ...next, winnerSide: winnerSideFromLore(next.p1Lore, next.p2Lore) };
      })
    );
  }
</script>

<div class="tournament-results__round-head row">
  <h2 class="card__title tournament-results__round-heading">
    <span class="tournament-results__round-heading-prefix">
      {$t('tournaments.results.roundHeadingPrefix')}
    </span>
    <input
      id="round-label-{roundIndex}"
      type="text"
      class="input tournament-results__round-heading-input"
      value={round.round}
      maxlength="40"
      autocomplete="off"
      aria-label={$t('tournaments.results.roundLabelAria')}
      oninput={(e) => onSetLabel(e.currentTarget.value)}
      onblur={() => onBlurLabel(String(roundIndex + 1))}
    />
  </h2>
  {#if totalRounds > 1}
    <AppButton type="button" size="sm" variant="dangerOutline" onclick={onRemoveRound}>
      <IconTrash size={18} className="game-line__icon icon-trash" />&nbsp;{$t(
        'tournaments.results.remove'
      )}
    </AppButton>
  {/if}
</div>

<div class="tournament-results__id-field">
  <p
    class="label tournament-results__id-field-label"
    id="tr-round-mode-label-{roundIndex}"
  >
    {$t('tournaments.results.pairingResult')}
  </p>
  <div
    class="tournament-results__id-chips tournament-results__mode-chips"
    role="radiogroup"
    aria-labelledby="tr-round-mode-label-{roundIndex}"
  >
    <label
      class="tournament-results__id-chip"
      class:tournament-results__id-chip--active={round.resultMode === 'match'}
    >
      <input
        type="radio"
        class="tournament-results__id-chip-input"
        name="tr-round-mode-{roundIndex}"
        checked={round.resultMode === 'match'}
        onchange={() => onSetResultMode('match')}
      />
      <span class="tournament-results__id-chip-text">
        {$t('tournaments.results.modeMatch')}
      </span>
    </label>
    <label
      class="tournament-results__id-chip"
      class:tournament-results__id-chip--active={round.resultMode === 'intentionalDraw'}
    >
      <input
        type="radio"
        class="tournament-results__id-chip-input"
        name="tr-round-mode-{roundIndex}"
        checked={round.resultMode === 'intentionalDraw'}
        onchange={() => onSetResultMode('intentionalDraw')}
      />
      <span class="tournament-results__id-chip-text">
        {$t('tournaments.results.modeIntentionalDraw')}
      </span>
    </label>
    <label
      class="tournament-results__id-chip"
      class:tournament-results__id-chip--active={round.resultMode === 'bye'}
    >
      <input
        type="radio"
        class="tournament-results__id-chip-input"
        name="tr-round-mode-{roundIndex}"
        checked={round.resultMode === 'bye'}
        onchange={() => onSetResultMode('bye')}
      />
      <span class="tournament-results__id-chip-text">
        {$t('tournaments.results.modeBye')}
      </span>
    </label>
  </div>
  <p class="card__sub muted tournament-results__id-help">
    {#if round.resultMode === 'intentionalDraw'}
      {$t('tournaments.results.helpIntentionalDraw')}
    {:else if round.resultMode === 'bye'}
      {$t('tournaments.results.helpBye')}
    {:else}
      {$t('tournaments.results.helpMatch')}
    {/if}
  </p>
</div>

{#if round.resultMode === 'bye'}
  <p class="card__sub muted" style="margin: 0 0 0.35rem 0;">
    {$t('tournaments.results.byeNoOpponent')}
  </p>
{:else}
  <label class="label" for="opponent-{roundIndex}">
    {$t('tournaments.results.opponent')}
  </label>
  <input
    id="opponent-{roundIndex}"
    type="text"
    class="input"
    maxlength="120"
    value={round.opponentName}
    oninput={(e) => onPatchRound({ opponentName: e.currentTarget.value })}
    placeholder={round.resultMode === 'intentionalDraw'
      ? $t('tournaments.results.opponentPlaceholderId')
      : $t('tournaments.results.opponentPlaceholder')}
    aria-label={$t('tournaments.results.opponentAria')}
  />

  <label class="label" for="p2c-{roundIndex}">
    {$t('tournaments.results.opponentDeckColor')}
  </label>
  <DeckColorSelect
    id="p2c-{roundIndex}"
    bind:value={round.p2DeckColor}
    ariaLabel={$t('tournaments.results.opponentDeckColorAria')}
  />
{/if}

<label class="label" for="mnotes-{roundIndex}">
  {$t('tournaments.results.matchNotes')}
</label>
<textarea
  id="mnotes-{roundIndex}"
  class="input"
  rows="2"
  bind:value={round.notes}
  placeholder={$t('tournaments.results.matchNotesPlaceholder')}
></textarea>

{#if round.resultMode === 'match'}
  <div class="tournament-results__games-head row">
    <h3 class="tournament-results__games-title">
      {$t('tournaments.results.gamesTitle')}
    </h3>
    <AppButton
      type="button"
      className="tournament-results__add-game-btn"
      onclick={addGame}
    >
      + {$t('tournaments.results.addGame')}
    </AppButton>
  </div>
  {#each round.games as game, gi (`${roundIndex}-${gi}`)}
    <GameRowEditor
      {game}
      gameIndex={gi}
      totalGames={round.games.length}
      canPickP1={!!eventP1}
      canPickP2={!!round.opponentName.trim()}
      {p2Label}
      onPatchGame={(patch) => patchGame(gi, patch)}
      onPatchLore={(lore) => patchGameLore(gi, lore)}
      onRemove={() => removeGame(gi)}
    />
  {/each}
  <AppButton
    type="button"
    className="tournament-results__add-game-btn tournament-results__add-game-btn--footer"
    onclick={addGame}
  >
    + {$t('tournaments.results.addGame')}
  </AppButton>
{:else if round.resultMode === 'intentionalDraw'}
  <AppCard className="tournament-results__id-games-skip stack">
    <p class="card__sub muted" style="margin: 0;">
      {$t('tournaments.results.skipIdGames')}
    </p>
  </AppCard>
{:else if round.resultMode === 'bye'}
  <AppCard className="tournament-results__id-games-skip stack">
    <p class="card__sub muted" style="margin: 0;">
      {$t('tournaments.results.skipByeGames')}
    </p>
  </AppCard>
{/if}

<style>
  .tournament-results__round-head {
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  .tournament-results__round-heading {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.35rem 0.5rem;
    margin: 0;
    flex: 1 1 auto;
    min-width: 0;
    font-size: 1.25rem;
    font-weight: 700;
    line-height: 1.3;
  }
  .tournament-results__round-heading-prefix {
    flex-shrink: 0;
    color: var(--fg);
  }
  .tournament-results__round-heading-input {
    flex: 1 1 6rem;
    min-width: 4rem;
    max-width: 18rem;
    min-height: 44px;
    padding: 0.35rem 0.65rem;
    font: inherit;
    font-weight: 700;
    font-size: 1.25rem;
    line-height: 1.2;
  }
  .tournament-results__id-field {
    margin-top: 0.15rem;
  }
  .tournament-results__id-field-label {
    margin: 0 0 0.35rem 0;
    font-size: 0.8125rem;
    font-weight: 600;
    color: var(--muted);
    letter-spacing: 0.02em;
  }
  .tournament-results__id-chips {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-sm, 0.5rem);
  }
  .tournament-results__id-chip {
    position: relative;
    display: inline-flex;
    align-items: center;
    gap: var(--space-xs, 4px);
    padding: 10px 16px;
    min-height: 44px;
    border-radius: var(--radius-full);
    border: 1px solid var(--border);
    background: var(--glass-bg);
    cursor: pointer;
    font-size: 0.9rem;
    font-weight: 600;
    font-family: inherit;
    color: var(--fg);
    transition:
      background var(--transition),
      border-color var(--transition),
      color var(--transition);
  }
  .tournament-results__id-chip:hover {
    background: var(--glass-bg-strong);
    border-color: var(--border-strong);
  }
  .tournament-results__id-chip:focus-within {
    outline: 2px solid var(--ink-glow);
    outline-offset: 2px;
  }
  .tournament-results__id-chip--active:focus-within {
    outline-color: rgba(255, 255, 255, 0.35);
  }
  .tournament-results__id-chip--active {
    background: var(--ink);
    border-color: var(--ink);
    color: white;
  }
  .tournament-results__id-chip--active:hover {
    background: var(--ink-hover);
    border-color: var(--ink-hover);
    color: white;
  }
  .tournament-results__id-chip-input {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
  .tournament-results__id-chip-text {
    user-select: none;
  }
  .tournament-results__id-help {
    margin: 0.5rem 0 0.85rem 0;
    font-size: 0.8125rem;
    line-height: 1.45;
  }
  .tournament-results__id-games-skip {
    margin-top: 0.35rem;
    padding: 0.65rem 0.75rem;
    background: var(--glass-bg, rgba(255, 255, 255, 0.03));
    border: 1px solid var(--border);
    border-radius: var(--radius);
  }
  .tournament-results__games-head {
    justify-content: space-between;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
    margin: 0.35rem 0 0.4rem 0;
  }
  @media (max-width: 380px) {
    .tournament-results__games-head {
      flex-direction: column;
      align-items: stretch;
    }
    .tournament-results__add-game-btn {
      width: 100%;
      justify-content: center;
    }
  }
  .tournament-results__games-title {
    margin: 0;
    font-size: 0.9375rem;
    font-weight: 600;
  }
  .tournament-results__add-game-btn {
    flex-shrink: 0;
    min-height: 40px;
    padding: 7px 12px;
    font-size: 0.875rem;
  }
  @media (max-width: 479px) {
    .tournament-results__add-game-btn {
      min-height: 44px;
    }
  }
  .tournament-results__add-game-btn--footer {
    width: 100%;
    margin-top: 0.15rem;
  }
</style>
