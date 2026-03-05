<script lang="ts">
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
    onEditStart: () => void;
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
      <span class="game-line__score-icons" aria-hidden="true">
        {#if gameStarterId(game) === p1Id}
          <span class="game-line__score-icon game-line__score-icon--starter" title="Started">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"><polygon points="5 3 19 12 5 21 5 3" /></svg
            >
            <span class="game-line__score-icon-label">Starter</span>
          </span>
        {/if}
        {#if gameWinnerId(game) === p1Id}
          <span class="game-line__score-icon game-line__score-icon--winner" title="Winner"
            >👑<span class="game-line__score-icon-label">Winner</span></span
          >
        {/if}
      </span>
      <span class="game-line__score-value game-line__score-value_p1">{game.p1Lore ?? '–'}</span>
    </span>
    <div class="game-line__score-vs-row">VS.</div>
    <span class="game-line__score-side game-line__score-side--p2">
      <span class="game-line__score-icons" aria-hidden="true">
        {#if gameStarterId(game) === p2Id}
          <span class="game-line__score-icon game-line__score-icon--starter" title="Started">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"><polygon points="5 3 19 12 5 21 5 3" /></svg
            >
            <span class="game-line__score-icon-label">Starter</span>
          </span>
        {/if}
        {#if gameWinnerId(game) === p2Id}
          <span class="game-line__score-icon game-line__score-icon--winner" title="Winner"
            >👑<span class="game-line__score-icon-label">Winner</span></span
          >
        {/if}
      </span>
      <span class="game-line__score-value game-line__score-value_p2">{game.p2Lore ?? '–'}</span>
    </span>
  </div>

  <div class="game-line__actions">
    {#if isEditing}
      <button type="button" class="btn btn--sm" onclick={onEditDone} aria-label="Done editing">
        Done
      </button>
    {:else}
      <button
        type="button"
        class="btn btn--sm game-line__edit-btn"
        onclick={onEditStart}
        aria-label="Edit starter and winner"
        title="Edit starter and winner"
      >
        <svg
          class="game-line__edit-icon"
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
          ><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path
            d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"
          /></svg
        > Edit
      </button>
    {/if}
    {#if !gameWinnerId(game)}
      <a
        href="/matches/{matchId}/lore?game={index}"
        class="btn btn--primary game-line__continue-btn"
      >
        <svg
          class="icon-play"
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"><polygon points="5 3 19 12 5 21 5 3" /></svg
        >
        Continue
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
        <svg
          class="icon-trash"
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
          ><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path
            d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"
          /><line x1="10" x2="10" y1="11" y2="17" /><line x1="14" x2="14" y1="11" y2="17" /></svg
        >
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
    padding: 8px;
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
    top: 0;
    left: 0;
    transform: translate(-50%, -50%);
    border-radius: var(--radius);
    border: 1px solid var(--glass-border);
    background: var(--primary);
    backdrop-filter: saturate(var(--glass-saturate)) blur(var(--glass-blur));
    -webkit-backdrop-filter: saturate(var(--glass-saturate)) blur(var(--glass-blur));
    padding: 2px 4px;
  }
  .game-line__actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    justify-content: space-between;
  }
  .game-line__actions .btn,
  .game-line__actions a.btn {
    font-size: 0.85rem;
    padding: 2px 8px;
    color: var(--fg);
    background: var(--glass-bg);
    backdrop-filter: saturate(var(--glass-saturate)) blur(var(--glass-blur));
    -webkit-backdrop-filter: saturate(var(--glass-saturate)) blur(var(--glass-blur));
    border-radius: var(--radius);
  }
  .game-line__delete-btn,
  .game-line__actions .game-line__delete-btn {
    color: var(--danger);
  }
  .game-line__delete-btn:hover,
  .game-line__actions .game-line__delete-btn:hover {
    background-color: var(--danger);
    color: white;
  }
  .game-line__edit-btn,
  .game-line__actions .game-line__edit-btn {
    transition: background 0.15s ease, border-color 0.15s ease;
  }
  .game-line__edit-btn:hover,
  .game-line__actions .game-line__edit-btn:hover {
    background: var(--glass-bg-strong);
    border-color: var(--border-strong);
  }
  .game-line__body {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    align-items: flex-end;
    gap: 14px;
    width: 100%;
  }
  .game-line__score-side {
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    flex: 1 1 0;
    min-width: 0;
  }
  .game-line__score-side--p1 {
    align-items: flex-start;
  }
  .game-line__score-side--p2 {
    align-items: flex-end;
  }
  .game-line__score-vs-row {
    flex: 0 0 auto;
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 3rem;
    font-weight: bolder;
    color: var(--muted);
  }
  .game-line__score-value {
    font-size: 3rem;
    font-weight: bolder;
  }
  .game-line__score-value_p1 {
    text-align: left;
  }
  .game-line__score-value_p2 {
    text-align: right;
  }

  .game-line__score-icons {
    font-size: 1.5rem;
  }
  .game-line__score-icon {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 1.5rem;
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
