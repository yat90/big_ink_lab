<script lang="ts">
  import { type Game, type GameStatus } from '$lib/matches';
  import IconPlay from '$lib/icons/IconPlay.svelte';
  import IconEdit from '$lib/icons/IconEdit.svelte';
  import IconTrash from '$lib/icons/IconTrash.svelte';
  import IconCrown from '$lib/icons/IconCrown.svelte';

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
    onEditStart,
    onEditDone,
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
    {#if isEditing}
      <button type="button" class="btn btn--sm" onclick={onEditDone} aria-label="Done editing">
        Done
      </button>
    {:else if onEditStart}
      <button
        type="button"
        class="btn btn--sm game-line__edit-btn"
        onclick={onEditStart}
        aria-label="Edit starter and winner"
        title="Edit starter and winner"
      >
        <IconEdit size={16} className="game-line__icon game-line__edit-icon" />
        <span class="game-line__icon-label">Edit</span>
      </button>
    {/if}
    {#if !gameWinnerId(game)}
      <a
        href="/matches/{matchId}/lore?game={index}"
        class="btn btn--primary game-line__continue-btn"
      >
        <IconPlay size={18} className="game-line__icon icon-play" />
        <span class="game-line__icon-label">Continue</span>
      </a>
    {/if}
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
      {/if}
    </button>
  </div>

  {#if isEditing}
    <div class="game-line__meta-row">
      <label class="label" style="margin: 0; align-items: center; gap: 6px;">
        <span class="muted" style="font-size: 0.85rem;">Starter</span>
        <select
          class="input"
          style="min-width: 120px;"
          value={typeof game.starter === 'object' && game.starter != null
            ? (game.starter as { _id?: string })._id
            : (game.starter ?? '')}
          disabled={isUpdating}
          onchange={(e) => onGameChange(index, { starter: e.currentTarget.value || undefined })}
          aria-label="Who started this game"
        >
          <option value="">–</option>
          {#if p1Id}
            <option value={p1Id}>{p1DisplayName}</option>
          {/if}
          {#if p2Id}
            <option value={p2Id}>{p2DisplayName}</option>
          {/if}
        </select>
      </label>
      <label class="label" style="margin: 0; align-items: center; gap: 6px;">
        <span class="muted" style="font-size: 0.85rem;">Winner</span>
        <select
          class="input"
          style="min-width: 140px;"
          value={typeof game.winner === 'object' && game.winner != null
            ? (game.winner as { _id?: string })._id
            : (game.winner ?? '')}
          disabled={isUpdating}
          onchange={(e) => {
            const winnerId = e.currentTarget.value || undefined;
            onGameChange(index, {
              winner: winnerId,
              status: (winnerId ? 'done' : 'in_progress') as GameStatus,
            });
          }}
        >
          <option value="">–</option>
          {#if p1Id}
            <option value={p1Id}>{p1DisplayName}</option>
          {/if}
          {#if p2Id}
            <option value={p2Id}>{p2DisplayName}</option>
          {/if}
        </select>
      </label>
    </div>
  {/if}
</div>

<style>
  .game-line {
    position: relative;
    background: var(--glass-bg);
    backdrop-filter: saturate(var(--glass-saturate)) blur(var(--glass-blur));
    -webkit-backdrop-filter: saturate(var(--glass-saturate)) blur(var(--glass-blur));
    border-radius: var(--radius);
    padding: 8px 8px 24px 8px;
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
    font-weight: 700;
    color: var(--fg);
    position: absolute;
    transform: translate(-45%, -25%);
    border-radius: var(--radius);
    border: 1px solid var(--glass-border);
    background: rgba(168, 85, 247, 0.95);
    opacity: 1;
    backdrop-filter: saturate(var(--glass-saturate)) blur(var(--glass-blur));
    -webkit-backdrop-filter: saturate(var(--glass-saturate)) blur(var(--glass-blur));
    padding: 4px 14px;
  }
  .game-line__actions {
    position: absolute;
   right: 8px;
    bottom: -24px;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    justify-content: space-between;
  }
  .game-line__actions .btn,
  .game-line__actions a.btn {
    font-size: 0.85rem;
    padding: 2px 20px;
    color: var(--fg);
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: saturate(var(--glass-saturate)) blur(var(--glass-blur));
    -webkit-backdrop-filter: saturate(var(--glass-saturate)) blur(var(--glass-blur));
    border-radius: var(--radius);
    opacity: 1;
  }
  .game-line__delete-btn,
  .game-line__actions .game-line__delete-btn {
    height:24px;
    padding-top: 0;
    padding-bottom: 0;
    color: var(--danger);
    opacity: 1;
  }
  .game-line__delete-btn:hover,
  .game-line__actions .game-line__delete-btn:hover {
    background-color: var(--danger);
    color: white;
  }
  .game-line__edit-btn,
  .game-line__actions .game-line__edit-btn {
    transition:
      background 0.15s ease,
      border-color 0.15s ease;
  }
  .game-line__edit-btn:hover,
  .game-line__actions .game-line__edit-btn:hover {
    background: var(--glass-bg-strong);
    border-color: var(--border-strong);
  }

  .game-line__icon-label {
    font-size: 0.9rem;
    padding-left: 6px;
  }

  .game-line__icon-label:hover {
    text-decoration: underline;
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
