<script lang="ts">
  import IconClock from '$lib/icons/IconClock.svelte';
  import IconCrown from '$lib/icons/IconCrown.svelte';
  import IconPlay from '$lib/icons/IconPlay.svelte';
  import IconSparkle from '$lib/icons/IconSparkle.svelte';
  import IconTrash from '$lib/icons/IconTrash.svelte';
  import { type Game, type GameStatus } from '$lib/matches';

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
    onAnalyse?: (index: number) => void;
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
    onAnalyse,
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
  <div class="game-line__counter" aria-label="Game {index + 1}">
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
            <span class="game-line__score-icon-label"> Starter </span>
          {/if}
          {#if gameWinnerId(game) === p1Id}
            <IconCrown size={18} />
            <span class="game-line__score-icon-label">Winner</span>
          {/if}
        </span>
      </span>
    </span>
    <div class="game-line__score-vs-row">VS.</div>
    <span class="game-line__score-side game-line__score-side--p2">
      <span class="game-line__score-value game-line__score-value_p2">
        <span class="game-line__score-icons" aria-hidden="true">
          {#if gameStarterId(game) === p2Id}
            <IconPlay size={14} />
            <span class="game-line__score-icon-label">Starter</span>
          {/if}
          {#if gameWinnerId(game) === p2Id}
            <IconCrown size={18} />
            <span class="game-line__score-icon-label">Winner</span>
          {/if}
        </span>
        {game.p2Lore ?? '–'}
      </span>
    </span>
  </div>

  <div class="game-line__actions">
    {#if onShowEvents}
      <button
        type="button"
        class="btn btn--primary btn--sm game-line__events-btn"
        onclick={() => onShowEvents(index)}
        aria-label="View game {index + 1} events"
        title="View events"
      >
        <IconClock size={18} className="game-line__icon icon-clock" />
        <span class="game-line__icon-label">Events</span>
      </button>
    {/if}
    {#if !gameWinnerId(game)}
      <a
        href="/matches/{matchId}/lore?game={index}"
        class="btn btn--primary btn--sm game-line__continue-btn"
      >
        <IconPlay size={24} className="game-line__icon icon-play" />
        <span class="game-line__icon-label">Continue</span>
      </a>
    {/if}
    {#if onAnalyse}
      <button
        type="button"
        class="btn btn--primary btn--sm game-line__analyse-btn"
        onclick={() => onAnalyse(index)}
        aria-label="Analyse game {index + 1} with AI"
        title="Analyse with AI"
      >
        <IconSparkle size={18} className="game-line__icon icon-sparkle" />
        <span class="game-line__icon-label">Analyse</span>
      </button>
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
      <div class="game-line__meta-block" role="group" aria-label="Starter">
        <div class="game-line__meta-title">
          <IconPlay size={14} className="game-line__meta-icon" />
          <span class="muted">Starter</span>
        </div>
        <div class="game-line__toggle" role="group" aria-label="Choose starter">
          {#if p1Id}
            <button
              type="button"
              class="game-line__toggle-btn"
              class:game-line__toggle-btn--active={currentStarterId === p1Id}
              disabled={isUpdating}
              onclick={() => onGameChange(index, { starter: p1Id })}
              aria-pressed={currentStarterId === p1Id}
              aria-label={p1DisplayName + ' started'}
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
            aria-label="No starter"
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
              aria-label={p2DisplayName + ' started'}
            >
              {p2DisplayName}
            </button>
          {/if}
        </div>
      </div>
      <div class="game-line__meta-block" role="group" aria-label="Winner">
        <div class="game-line__meta-title">
          <IconCrown size={14} className="game-line__meta-icon" />
          <span class="muted">Winner</span>
        </div>
        <div class="game-line__toggle" role="group" aria-label="Choose winner">
          {#if p1Id}
            <button
              type="button"
              class="game-line__toggle-btn"
              class:game-line__toggle-btn--active={currentWinnerId === p1Id}
              disabled={isUpdating}
              onclick={() => onGameChange(index, { winner: p1Id, status: 'done' as GameStatus })}
              aria-pressed={currentWinnerId === p1Id}
              aria-label={p1DisplayName + ' wins'}
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
            aria-label="No winner yet"
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
              aria-label={p2DisplayName + ' wins'}
            >
              {p2DisplayName}
            </button>
          {/if}
        </div>
      </div>
    </div>
  {/if}

  {#if isEditing}
    <button
      type="button"
      class="btn btn--icon game-line__delete-btn"
      disabled={isDeleting}
      onclick={() => onDeleteGame(index)}
      aria-label="Delete game {index + 1}"
      title="Delete game"
    >
      {#if isDeleting}
        Removing…
      {:else}
        <IconTrash size={18} className="game-line__icon icon-trash" />
        <span class="game-line__icon-label">Delete</span>
      {/if}
    </button>
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
  .game-line__actions .btn,
  .game-line__actions a.btn {
    font-size: 0.85rem;
    padding: 2px 20px;
    color: var(--fg);
    background: rgba(0, 0, 0, 0.1);
    border-radius: var(--radius);
    opacity: 1;
  }
  .game-line__delete-btn {
    margin-top: 24px;
    color: var(--danger);
    opacity: 1;
    width: 100%;
  }
  .game-line__delete-btn:hover {
    background-color: var(--danger);
    color: white;
  }

  .game-line__icon-label {
    font-size: 0.9rem;
    padding-left: 6px;
  }


  .game-line__meta-icon {
    flex-shrink: 0;
    color: var(--muted);
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
    .game-line__actions .game-line__icon-label {
      display: none;
    }
    .game-line__actions .btn--icon {
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
