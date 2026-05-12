<script lang="ts">
  import AppButton from '$lib/components/ui/AppButton.svelte';
  import IconTrash from '../../../lib/icons/IconTrash.svelte';
  import { t } from '$lib/i18n';
  import type { GameRow } from '$lib/tournament-results';

  interface Props {
    game: GameRow;
    gameIndex: number;
    totalGames: number;
    canPickP1: boolean;
    canPickP2: boolean;
    p2Label: string;
    onPatchGame: (patch: Partial<GameRow>) => void;
    onPatchLore: (lore: { p1Lore?: string; p2Lore?: string }) => void;
    onRemove: () => void;
  }

  let {
    game,
    gameIndex,
    totalGames,
    canPickP1,
    canPickP2,
    p2Label,
    onPatchGame,
    onPatchLore,
    onRemove,
  }: Props = $props();
</script>

<div class="tournament-results__game stack">
  <span class="tournament-results__game-label">
    {$t('tournaments.results.gameN', { n: String(gameIndex + 1) })}
  </span>
  <div
    class="tournament-results__lore-vs"
    role="group"
    aria-label={$t('tournaments.results.loreYouVsOpponent')}
  >
    <div class="tournament-results__lore-side tournament-results__lore-side--p1">
      <label class="tournament-results__lore-label" for="l1-{gameIndex}">
        {$t('tournaments.results.yourLore')}
      </label>
      <input
        id="l1-{gameIndex}"
        type="number"
        min="0"
        class="input tournament-results__lore-input"
        inputmode="numeric"
        value={game.p1Lore}
        oninput={(e) => onPatchLore({ p1Lore: e.currentTarget.value })}
      />
    </div>
    <div class="tournament-results__lore-vs-mid" aria-hidden="true">
      {$t('tournaments.results.vsDot')}
    </div>
    <div class="tournament-results__lore-side tournament-results__lore-side--p2">
      <label class="tournament-results__lore-label" for="l2-{gameIndex}">
        {$t('tournaments.results.opponentLore')}
      </label>
      <input
        id="l2-{gameIndex}"
        type="number"
        min="0"
        class="input tournament-results__lore-input tournament-results__lore-input--p2"
        inputmode="numeric"
        value={game.p2Lore}
        oninput={(e) => onPatchLore({ p2Lore: e.currentTarget.value })}
      />
    </div>
  </div>
  <div class="tournament-results__game-toggles">
    <div class="tournament-results__toggle-group">
      <p class="tournament-results__toggle-label" id="gs-label-{gameIndex}">
        {$t('tournaments.results.starterOptional')}
      </p>
      <div
        class="tournament-results__toggle"
        role="group"
        aria-labelledby="gs-label-{gameIndex}"
      >
        <button
          type="button"
          class="tournament-results__toggle-btn"
          aria-pressed={game.starterSide === 'p1'}
          disabled={!canPickP1}
          onclick={() => onPatchGame({ starterSide: 'p1' })}
        >
          {$t('tournaments.results.youToggle')}
        </button>
        <button
          type="button"
          class="tournament-results__toggle-btn tournament-results__toggle-btn--mid"
          aria-pressed={game.starterSide === ''}
          onclick={() => onPatchGame({ starterSide: '' })}
        >
          {$t('tournaments.results.dashNeutral')}
        </button>
        <button
          type="button"
          class="tournament-results__toggle-btn"
          aria-pressed={game.starterSide === 'p2'}
          disabled={!canPickP2}
          onclick={() => onPatchGame({ starterSide: 'p2' })}
        >
          {p2Label}
        </button>
      </div>
    </div>
    <div class="tournament-results__toggle-group">
      <p class="tournament-results__toggle-label" id="gw-label-{gameIndex}">
        {$t('tournaments.results.winner')}
      </p>
      <div
        class="tournament-results__toggle"
        role="group"
        aria-labelledby="gw-label-{gameIndex}"
        title={$t('tournaments.results.winnerLoreTitle')}
      >
        <button
          type="button"
          class="tournament-results__toggle-btn"
          aria-pressed={game.winnerSide === 'p1'}
          disabled={!canPickP1}
          onclick={() => onPatchGame({ winnerSide: 'p1' })}
        >
          {$t('tournaments.results.youToggle')}
        </button>
        <button
          type="button"
          class="tournament-results__toggle-btn tournament-results__toggle-btn--mid"
          aria-pressed={game.winnerSide === ''}
          onclick={() => onPatchGame({ winnerSide: '' })}
        >
          {$t('tournaments.results.dashNeutral')}
        </button>
        <button
          type="button"
          class="tournament-results__toggle-btn"
          aria-pressed={game.winnerSide === 'p2'}
          disabled={!canPickP2}
          onclick={() => onPatchGame({ winnerSide: 'p2' })}
        >
          {p2Label}
        </button>
      </div>
    </div>
  </div>
  <label class="label tournament-results__game-field-label" for="gn-{gameIndex}">
    {$t('tournaments.results.gameNotes')}
  </label>
  <textarea
    id="gn-{gameIndex}"
    rows="2"
    class="input tournament-results__note-input"
    value={game.notes}
    oninput={(e) => onPatchGame({ notes: e.currentTarget.value })}
    placeholder={$t('tournaments.results.gameNotesPlaceholder')}
  ></textarea>
  {#if totalGames > 1}
    <AppButton
      type="button"
      size="sm"
      variant="dangerOutline"
      className="tournament-results__remove-game-btn"
      onclick={onRemove}
    >
      <IconTrash size={18} className="game-line__icon icon-trash" />&nbsp;{$t(
        'tournaments.results.removeGame'
      )}
    </AppButton>
  {/if}
</div>

<style>
  .tournament-results__game {
    padding: 0.45rem 0.55rem;
    background: var(--glass-bg, rgba(255, 255, 255, 0.03));
    max-width: 100%;
  }
  .tournament-results__game.stack {
    gap: 0.35rem;
  }
  @media (max-width: 479px) {
    .tournament-results__game {
      padding: 0.55rem 0.65rem;
    }
    .tournament-results__game.stack {
      gap: 0.55rem;
    }
  }
  .tournament-results__game-label {
    font-weight: 600;
    font-size: 0.8125rem;
    color: var(--muted);
    margin-bottom: -0.05rem;
  }
  .tournament-results__game-field-label {
    gap: 4px;
    font-size: 0.8125rem;
  }
  .tournament-results__lore-vs {
    display: flex;
    flex-direction: row;
    flex-wrap: nowrap;
    align-items: stretch;
    gap: 0.35rem 0.5rem;
    width: 100%;
    min-width: 0;
  }
  .tournament-results__lore-side {
    flex: 1 1 0;
    min-width: 0;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    gap: 4px;
  }
  .tournament-results__lore-side--p1 {
    align-items: flex-start;
  }
  .tournament-results__lore-side--p2 {
    align-items: flex-end;
  }
  .tournament-results__lore-label {
    margin: 0;
    font-weight: 600;
    font-size: 0.8125rem;
    color: var(--muted);
  }
  .tournament-results__lore-vs-mid {
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    justify-content: center;
    align-self: center;
    padding: 0 0.15rem;
    font-size: clamp(1.25rem, 4vw, 1.75rem);
    line-height: 1;
    font-weight: 800;
    color: var(--muted);
    user-select: none;
  }
  /** Narrow screens: stack lore fields so inputs stay wide and tappable (no squeezed columns). */
  @media (max-width: 419px) {
    .tournament-results__lore-vs {
      flex-direction: column;
      align-items: stretch;
      gap: 0.45rem;
    }
    .tournament-results__lore-vs-mid {
      align-self: center;
      padding: 0.1rem 0;
      font-size: 0.9375rem;
      letter-spacing: 0.08em;
    }
    .tournament-results__lore-side--p2 {
      align-items: flex-start;
    }
    .tournament-results__lore-input--p2 {
      text-align: left;
    }
  }
  .tournament-results__lore-input {
    width: 100%;
    min-height: 44px;
    padding: 10px 12px;
    font-size: 16px;
  }
  .tournament-results__lore-input--p2 {
    text-align: right;
  }
  .tournament-results__note-input {
    min-height: 40px;
    padding: 8px 10px;
  }
  @media (max-width: 479px) {
    .tournament-results__note-input {
      min-height: 44px;
      padding: 10px 12px;
    }
  }
  .tournament-results__game-toggles {
    display: grid;
    gap: 0.35rem;
  }
  @media (min-width: 480px) {
    .tournament-results__game-toggles {
      grid-template-columns: 1fr 1fr;
      gap: 0.45rem;
    }
  }
  .tournament-results__toggle-label {
    margin: 0 0 0.2rem 0;
    font-weight: 600;
    font-size: 0.75rem;
    color: var(--muted);
    letter-spacing: 0.01em;
  }
  .tournament-results__toggle {
    display: flex;
    width: 100%;
    max-width: 100%;
    border-radius: var(--radius);
    border: 1px solid var(--border-strong);
    overflow: hidden;
    margin-bottom: 0;
  }
  .tournament-results__toggle-btn {
    flex: 1;
    min-width: 0;
    min-height: 44px;
    padding: 10px 6px;
    border: none;
    background: transparent;
    cursor: pointer;
    font-weight: 600;
    font-size: 0.8125rem;
    color: var(--text);
    transition: background 0.15s var(--ease);
    -webkit-tap-highlight-color: transparent;
  }
  @media (min-width: 480px) {
    .tournament-results__toggle-btn {
      min-height: 0;
      padding: 7px 4px;
      font-size: 0.75rem;
    }
  }
  .tournament-results__toggle-btn + .tournament-results__toggle-btn {
    border-left: 1px solid var(--border-strong);
  }
  .tournament-results__toggle-btn:not(.tournament-results__toggle-btn--mid) {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .tournament-results__toggle-btn:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
  .tournament-results__toggle-btn[aria-pressed='true'] {
    background: var(--glass-bg-strong);
  }
  .tournament-results__toggle-btn--mid {
    flex: 0 0 2.75rem;
    color: var(--muted);
    font-weight: 700;
  }
  @media (min-width: 480px) {
    .tournament-results__toggle-btn--mid {
      flex: 0 0 2.25rem;
    }
  }
  .tournament-results__remove-game-btn {
    min-height: 40px;
    padding: 8px 12px;
    font-size: 0.8125rem;
    align-self: flex-start;
  }
  @media (max-width: 379px) {
    .tournament-results__remove-game-btn {
      width: 100%;
      justify-content: center;
      align-self: stretch;
    }
  }
</style>
