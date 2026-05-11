<script lang="ts">
  import AppButton from '$lib/components/ui/AppButton.svelte';
  import IconClock from '$lib/icons/IconClock.svelte';
  import IconCrown from '$lib/icons/IconCrown.svelte';
  import IconPlay from '$lib/icons/IconPlay.svelte';
  import IconTrash from '$lib/icons/IconTrash.svelte';
  import { type Game, type GameStatus } from '$lib/matches';
  import { t } from '$lib/i18n';

  type Props = {
    game: Game;
    index: number;
    matchId: string;
    p1DisplayName: string;
    p2DisplayName: string;
    p1Id: string | undefined;
    p2Id: string | undefined;
    isEditing: boolean;
    isUpdating: boolean;
    isDeleting: boolean;
    onGameChange: (
      index: number,
      payload: { starter?: string; winner?: string; status?: GameStatus }
    ) => void;
    onDeleteGame: (index: number) => void;
    onEditStart?: () => void;
    onEditDone: () => void;
    onShowEvents?: (index: number) => void;
  };

  let {
    game,
    index,
    matchId,
    p1DisplayName,
    p2DisplayName,
    p1Id,
    p2Id,
    isEditing,
    isUpdating,
    isDeleting,
    onGameChange,
    onDeleteGame,
    onShowEvents,
  }: Props = $props();

  function gameWinnerId(g: Game): string | undefined {
    const w = g.winner;
    if (w == null) return undefined;
    return typeof w === 'object' && w !== null && '_id' in w
      ? (w as { _id: string })._id
      : String(w);
  }

  function gameStarterId(g: Game): string | undefined {
    const s = g.starter;
    if (s == null) return undefined;
    return typeof s === 'object' && s !== null && '_id' in s
      ? (s as { _id: string })._id
      : String(s);
  }
</script>

<div class="game-line">
  <div
    class="game-line__counter"
    aria-label={$t('matches.gameLine.counterAria', { n: String(index + 1) })}
  >
    <div class="game-line__counter-number">
      {index + 1}
    </div>
  </div>
  <div class="game-line__body">
    <span class="game-line__score-side game-line__score-side--p1">
      <span class="game-line__score-value game-line__score-value_p1"
        >{game.p1Lore ?? '–'}
        <span class="game-line__score-icons" aria-hidden="true">
          {#if gameStarterId(game) === p1Id}
            <IconPlay size={14} />
            <span class="game-line__score-icon-label">{$t('matches.gameLine.starter')}</span>
          {/if}
          {#if gameWinnerId(game) === p1Id}
            <IconCrown size={18} />
            <span class="game-line__score-icon-label">{$t('matches.gameLine.winner')}</span>
          {/if}
        </span>
      </span>
    </span>
    <div class="game-line__score-vs-row">{$t('matches.list.vs')}</div>
    <span class="game-line__score-side game-line__score-side--p2">
      <span class="game-line__score-value game-line__score-value_p2">
        <span class="game-line__score-icons" aria-hidden="true">
          {#if gameStarterId(game) === p2Id}
            <IconPlay size={14} />
            <span class="game-line__score-icon-label">{$t('matches.gameLine.starter')}</span>
          {/if}
          {#if gameWinnerId(game) === p2Id}
            <IconCrown size={18} />
            <span class="game-line__score-icon-label">{$t('matches.gameLine.winner')}</span>
          {/if}
        </span>
        {game.p2Lore ?? '–'}
      </span>
    </span>
  </div>

  <div class="game-line__actions">
    {#if onShowEvents}
      <AppButton
        type="button"
        variant="primary"
        size="sm"
        icon={true}
        onclick={() => onShowEvents(index)}
        aria-label={$t('matches.gameLine.viewEventsAria', { n: String(index + 1) })}
        title={$t('matches.gameLine.viewEventsTitle')}
      >
        <IconClock size={18} />
        {$t('matches.gameLine.eventsLabel')}
      </AppButton>
    {/if}
    {#if !gameWinnerId(game)}
      <AppButton href="/matches/{matchId}/lore?game={index}" variant="primary" size="sm" icon={true}>
        <IconPlay size={24} />
        {$t('matches.gameLine.continueLabel')}
      </AppButton>
    {/if}
  </div>

  {#if isEditing}
    {@const currentStarterId =
      typeof game.starter === 'object' && game.starter != null
        ? (game.starter as { _id?: string })._id
        : (game.starter ?? '')}
    {@const currentWinnerId =
      typeof game.winner === 'object' && game.winner != null
        ? (game.winner as { _id?: string })._id
        : (game.winner ?? '')}
    <div class="game-line__meta-row">
      <div
        class="game-line__meta-block"
        role="group"
        aria-label={$t('matches.gameLine.starterGroupAria')}
      >
        <div class="game-line__meta-title">
          <IconPlay size={14} />
          <span class="muted">{$t('matches.gameLine.starter')}</span>
        </div>
        <div
          class="game-line__toggle"
          role="group"
          aria-label={$t('matches.gameLine.chooseStarterAria')}
        >
          {#if p1Id}
            <button
              type="button"
              class="game-line__toggle-btn"
              class:game-line__toggle-btn--active={currentStarterId === p1Id}
              disabled={isUpdating}
              onclick={() => onGameChange(index, { starter: p1Id })}
              aria-pressed={currentStarterId === p1Id}
              aria-label={$t('matches.gameLine.playerStartedAria', { name: p1DisplayName })}
            >
              {p1DisplayName}
            </button>
          {/if}
          <button
            type="button"
            class="game-line__toggle-btn"
            class:game-line__toggle-btn--active={currentStarterId === ''}
            disabled={isUpdating}
            onclick={() => onGameChange(index, { starter: undefined })}
            aria-pressed={currentStarterId === ''}
            aria-label={$t('matches.gameLine.noStarterAria')}
          >
            –
          </button>
          {#if p2Id}
            <button
              type="button"
              class="game-line__toggle-btn"
              class:game-line__toggle-btn--active={currentStarterId === p2Id}
              disabled={isUpdating}
              onclick={() => onGameChange(index, { starter: p2Id })}
              aria-pressed={currentStarterId === p2Id}
              aria-label={$t('matches.gameLine.playerStartedAria', { name: p2DisplayName })}
            >
              {p2DisplayName}
            </button>
          {/if}
        </div>
      </div>
      <div
        class="game-line__meta-block"
        role="group"
        aria-label={$t('matches.gameLine.winnerGroupAria')}
      >
        <div class="game-line__meta-title">
          <IconCrown size={14} />
          <span class="muted">{$t('matches.gameLine.winner')}</span>
        </div>
        <div
          class="game-line__toggle"
          role="group"
          aria-label={$t('matches.gameLine.chooseWinnerAria')}
        >
          {#if p1Id}
            <button
              type="button"
              class="game-line__toggle-btn"
              class:game-line__toggle-btn--active={currentWinnerId === p1Id}
              disabled={isUpdating}
              onclick={() => onGameChange(index, { winner: p1Id, status: 'done' as GameStatus })}
              aria-pressed={currentWinnerId === p1Id}
              aria-label={$t('matches.detail.winsAria', { name: p1DisplayName })}
            >
              {p1DisplayName}
            </button>
          {/if}
          <button
            type="button"
            class="game-line__toggle-btn"
            class:game-line__toggle-btn--active={currentWinnerId === ''}
            disabled={isUpdating}
            onclick={() =>
              onGameChange(index, { winner: undefined, status: 'in_progress' as GameStatus })}
            aria-pressed={currentWinnerId === ''}
            aria-label={$t('matches.detail.noWinnerYetAria')}
          >
            –
          </button>
          {#if p2Id}
            <button
              type="button"
              class="game-line__toggle-btn"
              class:game-line__toggle-btn--active={currentWinnerId === p2Id}
              disabled={isUpdating}
              onclick={() => onGameChange(index, { winner: p2Id, status: 'done' as GameStatus })}
              aria-pressed={currentWinnerId === p2Id}
              aria-label={$t('matches.detail.winsAria', { name: p2DisplayName })}
            >
              {p2DisplayName}
            </button>
          {/if}
        </div>
      </div>
    </div>
  {/if}

  {#if isEditing}
    <AppButton
      type="button"
      variant="danger"
      icon={true}
      className="game-line__delete-btn"
      disabled={isDeleting}
      onclick={() => onDeleteGame(index)}
      aria-label={$t('matches.gameLine.deleteGameAria', { n: String(index + 1) })}
      title={$t('matches.gameLine.deleteGameTitle')}
    >
      {#if isDeleting}
        {$t('matches.gameLine.removing')}
      {:else}
        <IconTrash size={18} />

        {$t('matches.detail.deleteLabel')}
      {/if}
    </AppButton>
  {/if}
</div>

<style>
  .game-line {
    position: relative;
    background: var(--glass-bg);
    backdrop-filter: saturate(var(--glass-saturate)) blur(var(--glass-blur));
    -webkit-backdrop-filter: saturate(var(--glass-saturate)) blur(var(--glass-blur));
    border-radius: var(--radius);
    padding: 14px 8px 8px 8px;
    margin-top: 14px;
  }
  .game-line__counter {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }
  .game-line__counter-number {
    font-size: 1.2rem;
    font-weight: 800;
    color: var(--fg);
    position: absolute;
    transform: translate(-40%, -20%);
    border-radius: var(--radius);
    border: 1px solid var(--glass-border);
    background: rgba(155, 65, 239, 0.8);
    opacity: 1;
    backdrop-filter: saturate(var(--glass-saturate)) blur(var(--glass-blur));
    -webkit-backdrop-filter: saturate(var(--glass-saturate)) blur(var(--glass-blur));
    padding: 2px 8px;
  }
  .game-line__actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    gap: 8px;
    padding: 0;
    margin: 0;
  }
  .game-line__actions :global(.btn) {
    font-size: 0.85rem;
    padding: 2px 20px;
    color: var(--fg);
    background: rgba(0, 0, 0, 0.1);
    border-radius: var(--radius);
    opacity: 1;
  }
  :global(.game-line__delete-btn) {
    margin-top: 24px;
    width: 100%;
  }

  :global(.game-line__icon-label) {
    font-size: 0.9rem;
    padding-left: 6px;
  }

  .game-line__meta-row {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    gap: 16px 24px;
    margin-top: 12px;
  }

  .game-line__meta-block {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .game-line__meta-title {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.85rem;
  }

  .game-line__toggle {
    display: inline-flex;
    flex-wrap: wrap;
    gap: 0;
    border-radius: var(--radius);
    overflow: hidden;
    border: 1px solid var(--border);
    background: var(--glass-bg);
  }

  .game-line__toggle-btn {
    padding: 6px 12px;
    font-size: 0.85rem;
    border: none;
    background: transparent;
    color: var(--fg);
    cursor: pointer;
    transition:
      background 0.15s ease,
      color 0.15s ease;
    border-right: 1px solid var(--border);
    min-width: 0;
  }

  .game-line__toggle-btn:last-child {
    border-right: none;
  }

  .game-line__toggle-btn:hover:not(:disabled) {
    background: var(--glass-bg-strong);
  }

  .game-line__toggle-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .game-line__toggle-btn--active {
    background: var(--glass-bg-strong);
    color: var(--fg);
    font-weight: 600;
  }

  @media (max-width: 639px) {
    .game-line__actions :global(.game-line__icon-label) {
      display: none;
    }
    .game-line__actions :global(.btn--icon) {
      padding-left: 8px;
      padding-right: 8px;
    }
  }

  .game-line__body {
    display: flex;
    flex-direction: row;
    flex-wrap: nowrap;
    align-items: stretch;
    gap: 14px;
    width: 100%;
    min-height: 4rem;
  }
  .game-line__score-side {
    display: inline-flex;
    flex-direction: row;
    align-items: flex-end;
    justify-content: space-between;
    gap: 0px;
    flex: 1 1 0;
    min-width: 0;
    min-height: 100%;
  }
  .game-line__score-side--p1 {
    align-items: flex-start;
    justify-content: flex-start;
  }
  .game-line__score-side--p2 {
    align-items: flex-end;
    justify-content: flex-end;
  }
  .game-line__score-vs-row {
    flex: 0 0 auto;
    display: flex;
    justify-content: flex-end;
    align-items: flex-end;
    align-self: stretch;
    font-size: 3rem;
    line-height: 3rem;
    font-weight: bolder;
    color: var(--muted);
  }
  .game-line__score-value {
    font-size: 3rem;
    font-weight: bolder;
    margin-top: 8px;
    white-space: nowrap;
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }
  .game-line__score-value_p1 {
    text-align: left;
  }
  .game-line__score-value_p2 {
    text-align: right;
  }

  .game-line__score-icons {
    line-height: 0;
    padding: 0 8px;
    white-space: nowrap;
    /* display: flex; */
    /* flex-direction: column; */
  }
  .game-line__score-icon-label {
    display: none;
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    color: var(--muted);
  }
  @media (min-width: 640px) {
    .game-line__score-icon-label {
      display: inline;
    }
  }
</style>
