<script lang="ts">
  import { config } from '$lib/config';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import type { Deck } from '$lib/decks';
  import { getDeckPlayerId } from '$lib/decks';
  import { INK_IMAGE } from '$lib/matches';
  import InkIcons from '$lib/InkIcons.svelte';

  type Player = { _id: string; name: string; team: string };

  const id = $page.params.id;
  let deck = $state<Deck | null>(null);
  let players = $state<Player[]>([]);
  let loading = $state(true);
  let saving = $state(false);
  let deleting = $state(false);
  let error = $state('');
  let showDeletePrompt = $state(false);

  let name = $state('');
  let deckList = $state('');
  let deckColor = $state('');
  let notes = $state('');
  let playerId = $state('');

  const apiUrl = config.apiUrl ?? '/api';

  onMount(async () => {
    try {
      const [deckRes, playersRes] = await Promise.all([
        fetch(`${apiUrl}/decks/${id}`),
        fetch(`${apiUrl}/players`),
      ]);
      if (!deckRes.ok) {
        error = 'Deck not found';
        loading = false;
        return;
      }
      deck = await deckRes.json();
      if (playersRes.ok) players = await playersRes.json();
      if (deck) {
        name = deck.name;
        deckList = deck.deckList ?? '';
        deckColor = deck.deckColor ?? '';
        notes = deck.notes ?? '';
        playerId = getDeckPlayerId(deck) ?? '';
        await loadResolved();
      }
    } catch {
      error = 'Could not load deck.';
    } finally {
      loading = false;
    }
  });

  async function save() {
    if (!deck) return;
    error = '';
    saving = true;
    try {
      const res = await fetch(`${apiUrl}/decks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          deckList: deckList.trim(),
          deckColor: deckColor || undefined,
          notes: notes.trim() || undefined,
          player: playerId || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        error = data.message ?? 'Update failed';
        saving = false;
        return;
      }
      const updated = await res.json();
      deck = updated;
      name = updated.name ?? '';
      deckList = updated.deckList ?? '';
      deckColor = updated.deckColor ?? '';
      notes = updated.notes ?? '';
      playerId = getDeckPlayerId(updated) ?? '';
      await loadResolved();
    } catch {
      error = 'Could not reach API.';
    } finally {
      saving = false;
    }
  }

  type ImageUris = {
    small?: string;
    normal?: string;
    large?: string;
    digital?: { small?: string; normal?: string; large?: string };
  };

  function getSmallImageUrl(uris: ImageUris | undefined): string | undefined {
    if (!uris) return undefined;
    return uris.small ?? uris.digital?.small ?? uris.normal ?? uris.digital?.normal;
  }

  /** Best URL for larger preview (modal / hover). */
  function getPreviewImageUrl(uris: ImageUris | undefined): string | undefined {
    if (!uris) return undefined;
    return (
      uris.normal ??
      uris.large ??
      uris.digital?.normal ??
      uris.digital?.large ??
      getSmallImageUrl(uris)
    );
  }

  type DisplayCard = {
    amount: number;
    name: string;
    version?: string;
    types: string[];
    ink?: string;
    inkwell?: boolean;
    cost?: number;
    img?: string;
    imgPreview?: string;
  };

  /** Display list: prefer populated deck.cards, else resolved lines from check. */
  const displayCards = $derived.by((): DisplayCard[] => {
    const cards = deck?.cards;
    if (cards?.length) {
      return cards.map((c) => {
        const cardObj =
          typeof c.card === 'object' && c.card != null
            ? (c.card as {
                name?: string;
                version?: string;
                type?: string[];
                ink?: string;
                inkwell?: boolean;
                cost?: number;
                image_uris?: ImageUris;
              })
            : null;
        return {
          amount: c.amount,
          name: cardObj?.name ?? '',
          version: cardObj?.version,
          types: cardObj?.type ?? [],
          ink: cardObj?.ink,
          inkwell: cardObj?.inkwell,
          cost: cardObj?.cost,
          img: cardObj ? getSmallImageUrl(cardObj.image_uris) : undefined,
          imgPreview: cardObj ? getPreviewImageUrl(cardObj.image_uris) : undefined,
        };
      });
    }
    return resolvedLines.map((line) => {
      const first = line.cards?.[0] as
        | { image_uris?: ImageUris; version?: string; type?: string[]; ink?: string; inkwell?: boolean; cost?: number }
        | undefined;
      return {
        amount: line.count,
        name: line.name,
        version: first?.version,
        types: first?.type ?? [],
        ink: first?.ink,
        inkwell: first?.inkwell,
        cost: first?.cost,
        img: first ? getSmallImageUrl(first.image_uris) : undefined,
        imgPreview: first ? getPreviewImageUrl(first.image_uris) : undefined,
      };
    });
  });

  /** Group cards by type: Characters, Actions, Songs, Items, Location, Other. Each entry has flatIndex for preview/hover. */
  const TYPE_ORDER = ['Character', 'Action', 'Song', 'Item', 'Location'] as const;
  const groupedByType = $derived.by(() => {
    const byType: Record<string, { card: DisplayCard; flatIndex: number }[]> = {};
    let flatIndex = 0;
    for (const card of displayCards) {
      const primary = (card.types?.[0] ?? '').trim();
      const key = primary ? primary.charAt(0).toUpperCase() + primary.slice(1).toLowerCase() : 'Other';
      if (!byType[key]) byType[key] = [];
      byType[key].push({ card, flatIndex: flatIndex++ });
    }
    const groups: { type: string; label: string; count: number; entries: { card: DisplayCard; flatIndex: number }[] }[] = [];
    /** Sort by ink cost (ascending); null/undefined cost last. */
    const sortByCost = (entries: { card: DisplayCard; flatIndex: number }[]) =>
      [...entries].sort((a, b) => (a.card.cost ?? 99) - (b.card.cost ?? 99));

    for (const type of TYPE_ORDER) {
      const entries = sortByCost(byType[type] ?? []);
      if (entries.length > 0) {
        const count = entries.reduce((s, e) => s + e.card.amount, 0);
        groups.push({ type, label: `${type}s`, count, entries });
      }
    }
    const other = sortByCost(byType['Other'] ?? []);
    if (other.length > 0) {
      groups.push({
        type: 'Other',
        label: 'Other',
        count: other.reduce((s, e) => s + e.card.amount, 0),
        entries: other,
      });
    }
    return groups;
  });

  type ResolvedLine = {
    count: number;
    name: string;
    cards: { image_uris?: ImageUris; version?: string; type?: string[]; ink?: string; inkwell?: boolean; cost?: number }[];
  };
  let resolvedLines = $state<ResolvedLine[]>([]);
  let resolving = $state(false);
  /** Mobile: index of card to show in preview modal (null = closed). */
  let previewIndex = $state<number | null>(null);
  /** Desktop: index of hovered card for right-side preview. */
  let hoveredIndex = $state<number | null>(null);
  /** Card list view: 'list' = full row, 'icons' = icon + amount only. */
  let cardViewMode = $state<'list' | 'icons'>('list');

  /** Ink key for INK_IMAGE lookup (Lorcast may return lowercase). */
  function getInkImageSrc(ink: string | undefined): string | undefined {
    if (!ink) return undefined;
    const key = ink.charAt(0).toUpperCase() + ink.slice(1).toLowerCase();
    return INK_IMAGE[key];
  }

  async function loadResolved() {
    const list = (deck?.deckList ?? deckList).trim();
    if (!list) {
      resolvedLines = [];
      return;
    }
    resolving = true;
    try {
      const res = await fetch(`${apiUrl}/decks/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deckList: list }),
      });
      if (res.ok) {
        const data = await res.json();
        resolvedLines = data.resolved ?? [];
      } else {
        resolvedLines = [];
      }
    } catch {
      resolvedLines = [];
    } finally {
      resolving = false;
    }
  }

  async function confirmDelete() {
    if (!deck) return;
    deleting = true;
    error = '';
    try {
      const res = await fetch(`${apiUrl}/decks/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        error = data.message ?? 'Delete failed';
        deleting = false;
        showDeletePrompt = false;
        return;
      }
      await goto('/decks');
    } catch {
      error = 'Could not reach API.';
    } finally {
      deleting = false;
      showDeletePrompt = false;
    }
  }
</script>

<svelte:head>
  <title>{deck?.name ?? 'Deck'} · Big Ink Lab</title>
</svelte:head>

<div class="page">
  {#if loading}
    <div class="card">
      <div class="loading-skeleton" aria-busy="true" aria-live="polite">
        <div class="loading-skeleton__line loading-skeleton__line--title"></div>
        <div class="loading-skeleton__line loading-skeleton__line--short"></div>
        <div class="loading-skeleton__line"></div>
      </div>
      <p class="muted" style="margin-top: var(--space-md);">Loading deck…</p>
    </div>
  {:else if error && !deck}
    <div class="card" role="alert">
      <p class="alert">{error}</p>
      <a href="/decks" class="btn">Back to decks</a>
    </div>
  {:else if deck}
    <div class="card stack">
      <form
        onsubmit={(e) => {
          e.preventDefault();
          save();
        }}
        class="stack"
      >
        <h2 class="deck-header">Deck details</h2>
        <div class="row row--name">
          <span class="label deck-form__label">Name</span>
          <input
            id="name"
            type="text"
            class="input input--grow"
            bind:value={name}
            required
            placeholder="Deck name"
          />
          <span class="deck-color-readonly">
            {#if deckColor}
              <InkIcons {deckColor} />
            {/if}
          </span>
        </div>
        <div class="row row--player">
          <label class="label deck-form__label" for="player">Player</label>
          <select id="player" class="input input--grow" bind:value={playerId} aria-label="Player">
            <option value="">—</option>
            {#each players as p (p._id)}
              <option value={p._id}
                >{p.name}{#if p.team}
                  · {p.team}{/if}</option
              >
            {/each}
          </select>
        </div>
        <div class="row row--notes">
          <label class="label deck-form__label" for="notes">Notes</label>
          <textarea
            id="notes"
            class="input input--grow"
            bind:value={notes}
            rows="3"
            placeholder="Notes"
            style="resize: vertical;"
          ></textarea>
        </div>
        {#if error}
          <p class="alert" role="alert">{error}</p>
        {/if}

        <div class="row" style="gap: 12px; flex-wrap: wrap;">
          <button type="submit" class="btn btn--primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button type="button" class="btn btn--danger" onclick={() => (showDeletePrompt = true)}>
            Delete
          </button>
        </div>
      </form>

      <div class="deck-cards">
        <div class="deck-cards__head">
          <h3 class="label" style="margin: 0;">Cards</h3>
          <div class="deck-cards__head-actions">
            <div class="deck-cards__view-toggle" role="tablist" aria-label="Card view mode">
              <button
                type="button"
                role="tab"
                aria-selected={cardViewMode === 'list'}
                class="deck-cards__view-btn"
                class:deck-cards__view-btn--active={cardViewMode === 'list'}
                onclick={() => (cardViewMode = 'list')}
              >
                List
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={cardViewMode === 'icons'}
                class="deck-cards__view-btn"
                class:deck-cards__view-btn--active={cardViewMode === 'icons'}
                onclick={() => (cardViewMode = 'icons')}
              >
                Icons
              </button>
            </div>
            <a href="/decks/{id}/stats" class="deck-cards__stats-link">View deck stats</a>
          </div>
        </div>
        {#if resolving && displayCards.length === 0}
          <p class="muted">Loading cards…</p>
        {:else if displayCards.length === 0}
          <p class="muted">No cards. Use Deck Check to add a list.</p>
        {:else}
          <div class="deck-cards__wrap">
            <div class="deck-cards__groups">
              {#each groupedByType as group (group.type)}
                <section class="deck-cards__group" aria-labelledby="deck-group-{group.type}">
                  <h4 id="deck-group-{group.type}" class="deck-cards__group-title">{group.label} {group.count}</h4>
                  {#if cardViewMode === 'icons'}
                    <div class="deck-cards__icon-grid" role="list">
                      {#each group.entries as { card, flatIndex } (card.name + '-' + flatIndex)}
                        <div
                          role="listitem"
                          class="deck-cards__icon-item"
                          class:deck-cards__icon-item--hover={hoveredIndex === flatIndex}
                          onmouseenter={() => (hoveredIndex = flatIndex)}
                          onmouseleave={() => (hoveredIndex = null)}
                        >
                          <button
                            type="button"
                            class="deck-cards__icon-trigger"
                            aria-label="Preview {card.name}, {card.amount}×"
                            onclick={() => (previewIndex = flatIndex)}
                          >
                            {#if card.img}
                              <img
                                src={card.img}
                                alt=""
                                class="deck-cards__icon-img"
                                width="90"
                                height="126"
                                loading="lazy"
                              />
                            {:else}
                              <span class="deck-cards__icon-placeholder" aria-hidden="true">?</span>
                            {/if}
                            <span class="deck-cards__icon-count" aria-hidden="true">{card.amount}×</span>
                          </button>
                        </div>
                      {/each}
                    </div>
                  {:else}
                    <ul class="deck-cards__list" role="list">
                      {#each group.entries as { card, flatIndex } (card.name + '-' + flatIndex)}
                        {@const inkSrc = getInkImageSrc(card.ink)}
                        <li
                        class="deck-cards__item"
                        class:deck-cards__item--hover={hoveredIndex === flatIndex}
                        onmouseenter={() => (hoveredIndex = flatIndex)}
                        onmouseleave={() => (hoveredIndex = null)}
                      >
                        <span class="deck-cards__count" aria-label="Quantity">{card.amount}×</span>
                        <span class="deck-cards__ink" title={card.ink ?? 'Unknown ink'} aria-label="Ink: {card.ink ?? 'unknown'}">
                          {#if inkSrc}
                            <img src={inkSrc} alt="" width="24" height="24" class="deck-cards__ink-img" />
                          {:else}
                            <span class="deck-cards__ink-placeholder" aria-hidden="true">—</span>
                          {/if}
                        </span>
                        <span class="deck-cards__inkable" title={card.inkwell ? `Inkable, cost ${card.cost ?? '?'}` : card.cost != null ? `Cost ${card.cost} (not inkable)` : 'No cost'} aria-label={card.inkwell ? `Inkable, cost ${card.cost ?? '?'}` : card.cost != null ? `Cost ${card.cost}, not inkable` : 'No cost'}>
                          {#if card.inkwell && card.cost != null}
                            <span class="deck-cards__inkable-cost">{card.cost}</span>
                          {:else if card.cost != null}
                            <span class="deck-cards__inkable-cost deck-cards__inkable-cost--plain">{card.cost}</span>
                          {:else}
                            <span class="deck-cards__inkable-na" aria-hidden="true">—</span>
                          {/if}
                        </span>
                        <span class="deck-cards__info">
                          <span class="deck-cards__name">{card.name}</span>
                          {#if card.version}
                            <span class="deck-cards__version muted">{card.version}</span>
                          {/if}
                        </span>
                        <button
                          type="button"
                          class="deck-cards__preview-btn"
                          aria-label="Preview card"
                          onclick={() => (previewIndex = flatIndex)}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                            aria-hidden="true"
                            ><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle
                              cx="12"
                              cy="12"
                              r="3"
                            /></svg
                          >
                          <span class="deck-cards__preview-btn-label">Preview</span>
                        </button>
                      </li>
                    {/each}
                  </ul>
                  {/if}
                </section>
              {/each}
            </div>
            <!-- Desktop: hover preview on the right -->
            <div
              class="deck-cards__hover-preview"
              class:deck-cards__hover-preview--visible={hoveredIndex !== null}
            >
              {#if hoveredIndex !== null && displayCards[hoveredIndex]}
                {@const c = displayCards[hoveredIndex]}
                {#if c.imgPreview}
                  <img
                    src={c.imgPreview}
                    alt=""
                    class="deck-cards__hover-img"
                    width="280"
                    height="391"
                  />
                {:else}
                  <span class="deck-cards__hover-placeholder">?</span>
                {/if}
                <p class="deck-cards__hover-name">{c.name}</p>
                {#if c.version}<p class="deck-cards__hover-version muted">{c.version}</p>{/if}
              {/if}
            </div>
          </div>
        {/if}
      </div>
    </div>

    <!-- Mobile: card preview modal -->
    {#if previewIndex !== null && displayCards[previewIndex]}
      {@const c = displayCards[previewIndex]}
      <div
        class="modal-overlay deck-preview-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Card preview"
      >
        <button
          type="button"
          class="modal-backdrop"
          aria-label="Close preview"
          onclick={() => (previewIndex = null)}
        ></button>
        <div class="deck-preview-card">
          {#if c.imgPreview}
            <img
              src={c.imgPreview}
              alt=""
              class="deck-preview-card__img"
              width="280"
              height="391"
            />
          {:else}
            <span class="deck-preview-card__placeholder">?</span>
          {/if}
          <p class="deck-preview-card__name">{c.name}</p>
          {#if c.version}<p class="deck-preview-card__version muted">{c.version}</p>{/if}
          <p class="deck-preview-card__meta muted">× {c.amount}</p>
          <button
            type="button"
            class="btn deck-preview-card__close"
            onclick={() => (previewIndex = null)}>Close</button
          >
        </div>
      </div>
    {/if}

    {#if showDeletePrompt}
      <div
        class="modal-overlay"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-deck-title"
      >
        <button
          type="button"
          class="modal-backdrop"
          aria-label="Close"
          onclick={() => (showDeletePrompt = false)}
        ></button>
        <div class="card modal-card">
          <h2 id="delete-deck-title" class="card__title">Delete deck?</h2>
          <p class="muted">This cannot be undone.</p>
          <div class="row" style="gap: 12px; margin-top: var(--space-lg);">
            <button
              type="button"
              class="btn btn--danger"
              disabled={deleting}
              onclick={confirmDelete}
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
            <button
              type="button"
              class="btn"
              onclick={() => (showDeletePrompt = false)}
              disabled={deleting}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    {/if}
  {/if}
</div>

<style>
  .modal-overlay {
    position: fixed;
    inset: 0;
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
  }
  .modal-backdrop {
    position: absolute;
    inset: 0;
    padding: 0;
    border: none;
    background: rgba(0, 0, 0, 0.5);
    cursor: pointer;
    font: inherit;
  }
  .modal-card {
    position: relative;
    max-width: 420px;
    width: 100%;
  }

  .deck-header {
    margin-top: 0;
    margin-bottom: var(--space-md);
    font-size: 1.5rem;
    font-weight: 800;
    letter-spacing: -0.02em;
  }
  .deck-cards__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: var(--space-md);
    margin-top: var(--space-xl);
    margin-bottom: var(--space-sm);
  }
  .deck-cards__head-actions {
    display: flex;
    align-items: center;
    gap: var(--space-md);
  }
  .deck-cards__view-toggle {
    display: inline-flex;
    border-radius: var(--radius-sm);
    background: var(--glass-bg);
    padding: 2px;
    border: 1px solid var(--glass-border);
  }
  .deck-cards__view-btn {
    padding: 6px 12px;
    font-size: 0.875rem;
    font-weight: 600;
    border: none;
    border-radius: 4px;
    background: transparent;
    color: var(--muted);
    cursor: pointer;
    transition: background 0.15s, color 0.15s;
  }
  .deck-cards__view-btn:hover {
    color: var(--fg);
  }
  .deck-cards__view-btn--active {
    background: var(--ink);
    color: white;
  }
  .deck-cards__stats-link {
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--ink);
    text-decoration: none;
  }
  .deck-cards__stats-link:hover {
    text-decoration: underline;
  }
  .deck-cards__wrap {
    display: flex;
    gap: var(--space-xl);
    align-items: flex-start;
  }
  .deck-cards__groups {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-lg);
  }
  .deck-cards__group-title {
    font-size: 1rem;
    font-weight: 700;
    margin: 0 0 var(--space-xs) 0;
    color: var(--muted);
  }
  .deck-cards__icon-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
    gap: var(--space-md);
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .deck-cards__icon-item {
    position: relative;
  }
  .deck-cards__icon-item--hover {
    opacity: 0.9;
  }
  .deck-cards__icon-trigger {
    display: block;
    position: relative;
    width: 100%;
    padding: 0;
    border: none;
    border-radius: 8px;
    background: transparent;
    cursor: pointer;
    overflow: hidden;
    transition: transform 0.15s;
  }
  .deck-cards__icon-trigger:hover {
    transform: scale(1.05);
  }
  .deck-cards__icon-img {
    width: 100%;
    max-width: 90px;
    height: auto;
    aspect-ratio: 40 / 56;
    object-fit: contain;
    display: block;
    border-radius: 6px;
  }
  .deck-cards__icon-placeholder {
    width: 90px;
    min-height: 126px;
    aspect-ratio: 40 / 56;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--glass-bg-strong);
    border-radius: 6px;
    color: var(--muted);
    font-size: 1.5rem;
  }
  .deck-cards__icon-count {
    position: absolute;
    bottom: 4px;
    right: 4px;
    font-size: 1rem;
    font-weight: 700;
    background: rgba(0, 0, 0, 0.75);
    color: white;
    padding: 2px 6px;
    border-radius: 4px;
    line-height: 1.2;
  }
  .deck-cards__list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
    min-width: 0;
  }
  .deck-cards__item {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    padding: 8px 10px;
    border-radius: var(--radius-sm);
    background: var(--glass-bg);
    transition: background 0.15s;
  }
  .deck-cards__item--hover {
    background: var(--glass-bg-strong);
  }
  .deck-cards__count {
    font-weight: 700;
    min-width: 1.5em;
    font-size: 1.5rem;
  }
  .deck-cards__ink {
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
  }
  .deck-cards__ink-img {
    width: 24px;
    height: 24px;
    object-fit: contain;
  }
  .deck-cards__ink-placeholder {
    color: var(--muted);
    font-size: 0.9rem;
  }
  .deck-cards__inkable {
    flex-shrink: 0;
    width: 28px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
  .deck-cards__inkable-cost {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    border: 2px solid var(--fg);
    font-size: 0.75rem;
    font-weight: 700;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
  }
  .deck-cards__inkable-cost--plain {
    width: auto;
    height: auto;
    min-width: 1.25em;
    border-radius: 0;
    border: none;
    color: var(--muted);
  }
  .deck-cards__inkable-na {
    color: var(--muted);
    font-size: 0.9rem;
  }
  .deck-cards__info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 6px;
  }
  .deck-cards__name {
    font-size: 0.95rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .deck-cards__version {
    font-size: 0.8rem;
  }
  .deck-cards__preview-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 10px;
    border: none;
    border-radius: var(--radius-sm);
    background: var(--glass-bg-strong);
    color: var(--fg);
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }
  .deck-cards__preview-btn:hover {
    background: var(--ink);
    color: white;
  }
  .deck-cards__preview-btn-label {
    display: none;
  }
  @media (min-width: 640px) {
    .deck-cards__preview-btn-label {
      display: inline;
    }
  }
  /* Desktop: hide preview button when hover panel is used (optional: keep for touch) */
  @media (min-width: 900px) {
    .deck-cards__preview-btn {
      opacity: 0.7;
    }
    .deck-cards__item:hover .deck-cards__preview-btn {
      opacity: 1;
    }
  }

  /* Hover preview panel (desktop, fixed on right so it stays visible while scrolling) */
  .deck-cards__hover-preview {
    position: fixed;
    right: 24px;
    top: 50%;
    transform: translateY(-50%);
    width: 280px;
    padding: 16px;
    border-radius: var(--radius-sm);
    background: var(--card);
    border: 1px solid var(--glass-border);
    box-shadow: var(--shadow);
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.15s;
    z-index: 20;
  }
  .deck-cards__hover-preview--visible {
    opacity: 1;
    pointer-events: auto;
  }
  .deck-cards__hover-img {
    width: 100%;
    height: auto;
    display: block;
    border-radius: 6px;
  }
  .deck-cards__hover-placeholder {
    width: 280px;
    height: 391px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--glass-bg-strong);
    border-radius: 6px;
    font-size: 3rem;
    color: var(--muted);
  }
  .deck-cards__hover-name {
    margin: 8px 0 0;
    font-weight: 600;
    font-size: 0.95rem;
  }
  .deck-cards__hover-version {
    margin: 2px 0 0;
    font-size: 0.8rem;
  }
  @media (max-width: 899px) {
    .deck-cards__hover-preview {
      display: none;
    }
  }

  /* Mobile card preview modal */
  .deck-preview-modal .deck-preview-card {
    position: relative;
    max-width: 380px;
    width: 100%;
    padding: var(--space-lg);
    background: var(--card);
    border-radius: var(--radius-lg);
    border: 1px solid var(--glass-border);
    text-align: center;
  }
  .deck-preview-card__img {
    width: 100%;
    max-width: 280px;
    height: auto;
    display: block;
    margin: 0 auto;
    border-radius: 8px;
  }
  .deck-preview-card__placeholder {
    width: 280px;
    height: 391px;
    max-width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto;
    background: var(--glass-bg-strong);
    border-radius: 8px;
    font-size: 3rem;
    color: var(--muted);
  }
  .deck-preview-card__name {
    margin: var(--space-md) 0 0;
    font-weight: 700;
    font-size: 1.1rem;
  }
  .deck-preview-card__version {
    margin: 2px 0 0;
    font-size: 0.9rem;
  }
  .deck-preview-card__meta {
    margin: 4px 0 0;
    font-size: 0.9rem;
  }
  .deck-preview-card__close {
    margin-top: var(--space-lg);
  }
  @media (min-width: 900px) {
    .deck-preview-modal {
      display: none;
    }
  }

  .row--name,
  .row--player,
  .row--notes {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: var(--space-md);
  }
  .row--notes {
    align-items: flex-start;
  }
  .deck-form__label {
    min-width: 5.5rem;
    flex-shrink: 0;
  }
  .row--name .input--grow,
  .row--player .input--grow,
  .row--notes .input--grow {
    flex: 1;
    min-width: 0;
  }
  .deck-color-readonly {
    display: inline-flex;
    align-items: center;
    gap: var(--space-sm);
  }
</style>
