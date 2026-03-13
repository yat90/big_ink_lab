<script lang="ts">
  import InkIcons from '$lib/InkIcons.svelte';
  import IconEye from '$lib/icons/IconEye.svelte';
  import { INK_IMAGE } from '$lib/matches';
  import type { Deck } from '$lib/decks';

  type DeckStatsSummary = {
    totalMatches: number;
    wins: number;
    losses: number;
    winRate: number | null;
  };

  type ImageUris = {
    small?: string;
    normal?: string;
    large?: string;
    digital?: { small?: string; normal?: string; large?: string };
  };

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

  let {
    deck,
    deckStats = null,
  }: {
    deck: Deck;
    deckStats?: DeckStatsSummary | null;
  } = $props();

  function getSmallImageUrl(uris: ImageUris | undefined): string | undefined {
    if (!uris) return undefined;
    return uris.small ?? uris.digital?.small ?? uris.normal ?? uris.digital?.normal;
  }

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

  const displayCards = $derived.by((): DisplayCard[] => {
    const cards = deck?.cards;
    if (!cards?.length) return [];
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
  });

  const totalCards = $derived(displayCards.reduce((sum, c) => sum + c.amount, 0));

  const TYPE_ORDER = ['Character', 'Action', 'Song', 'Item', 'Location'] as const;
  const groupedByType = $derived.by(() => {
    const byType: Record<string, { card: DisplayCard; flatIndex: number }[]> = {};
    let flatIndex = 0;
    for (const card of displayCards) {
      const primary = (card.types?.[0] ?? '').trim();
      const key = primary
        ? primary.charAt(0).toUpperCase() + primary.slice(1).toLowerCase()
        : 'Other';
      if (!byType[key]) byType[key] = [];
      byType[key].push({ card, flatIndex: flatIndex++ });
    }
    const groups: {
      type: string;
      label: string;
      count: number;
      entries: { card: DisplayCard; flatIndex: number }[];
    }[] = [];
    const sortByCost = (entries: { card: DisplayCard; flatIndex: number }[]) =>
      [...entries].sort((a, b) => (a.card.cost ?? 99) - (b.card.cost ?? 99));
    for (const type of TYPE_ORDER) {
      const entries = sortByCost(byType[type] ?? []);
      if (entries.length > 0) {
        groups.push({
          type,
          label: `${type}s`,
          count: entries.reduce((s, e) => s + e.card.amount, 0),
          entries,
        });
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

  function getInkImageSrc(ink: string | undefined): string | undefined {
    if (!ink) return undefined;
    const key = ink.charAt(0).toUpperCase() + ink.slice(1).toLowerCase();
    return INK_IMAGE[key];
  }

  let cardViewMode = $state<'list' | 'icons'>('list');
  let previewIndex = $state<number | null>(null);
  let hoveredIndex = $state<number | null>(null);
</script>

{#if deckStats && (deckStats.totalMatches > 0 || deckStats.winRate != null)}
  <div class="deck-view-info__winrate">
    <h3 class="deck-view-info__winrate-title">Win rate</h3>
    <div class="deck-view-info__winrate-stats">
      <div class="deck-view-info__stat">
        <span class="deck-view-info__stat-value">{deckStats.totalMatches}</span>
        <span class="muted">Matches</span>
      </div>
      <div class="deck-view-info__stat">
        <span class="deck-view-info__stat-value">{deckStats.wins}</span>
        <span class="muted">Wins</span>
      </div>
      <div class="deck-view-info__stat">
        <span class="deck-view-info__stat-value">{deckStats.losses}</span>
        <span class="muted">Losses</span>
      </div>
      {#if deckStats.winRate != null}
        <div class="deck-view-info__stat">
          <span class="deck-view-info__stat-value">{(deckStats.winRate * 100).toFixed(1)}%</span>
          <span class="muted">Win rate</span>
        </div>
      {/if}
    </div>
  </div>
{/if}

<div class="deck-cards">
  <div class="deck-cards__head">
    <h2 class="deck-cards__title" style="margin: 0;">
      Cards <span class="deck-cards__total muted">({totalCards})</span>
    </h2>
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
  </div>
  {#if displayCards.length === 0}
    <p class="muted">No cards.</p>
  {:else}
    <div class="deck-cards__wrap">
      <div class="deck-cards__groups">
        {#each groupedByType as group (group.type)}
          <section class="deck-cards__group" aria-labelledby="deck-group-{group.type}">
            <h4 id="deck-group-{group.type}" class="deck-cards__group-title">
              {group.label}
              {group.count}
            </h4>
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
                    <span
                      class="deck-cards__ink"
                      title={card.ink ?? 'Unknown ink'}
                      aria-label="Ink: {card.ink ?? 'unknown'}"
                    >
                      {#if inkSrc}
                        <img
                          src={inkSrc}
                          alt=""
                          width="24"
                          height="24"
                          class="deck-cards__ink-img"
                        />
                      {:else}
                        <span class="deck-cards__ink-placeholder" aria-hidden="true">—</span>
                      {/if}
                    </span>
                    <span
                      class="deck-cards__inkable deck-cards__inkable--{card.inkwell
                        ? 'inkwell'
                        : card.cost != null
                          ? 'cost'
                          : 'na'}"
                      title={card.inkwell
                        ? `Inkable, cost ${card.cost ?? '?'}`
                        : card.cost != null
                          ? `Cost ${card.cost} (not inkable)`
                          : 'No cost'}
                      aria-label={card.inkwell
                        ? `Inkable, cost ${card.cost ?? '?'}`
                        : card.cost != null
                          ? `Cost ${card.cost}, not inkable`
                          : 'No cost'}
                    >
                      {#if card.inkwell && card.cost != null}
                        <span class="deck-cards__inkable-cost">{card.cost}</span>
                      {:else if card.cost != null}
                        <span class="deck-cards__inkable-cost deck-cards__inkable-cost--plain"
                          >{card.cost}</span
                        >
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
                      <IconEye size={20} />
                      <span class="deck-cards__preview-btn-label">Preview</span>
                    </button>
                  </li>
                {/each}
              </ul>
            {/if}
          </section>
        {/each}
      </div>
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
      <button type="button" class="btn deck-preview-card__close" onclick={() => (previewIndex = null)}
        >Close</button
      >
    </div>
  </div>
{/if}

<style>
  .deck-view-info__winrate {
    margin-bottom: var(--space-lg);
  }
  .deck-view-info__winrate-title {
    font-size: 1rem;
    font-weight: 700;
    margin: 0 0 var(--space-sm) 0;
    color: var(--muted);
  }
  .deck-view-info__winrate-stats {
    display: flex;
    flex-wrap: wrap;
    gap: 1.5rem;
  }
  .deck-view-info__stat {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  .deck-view-info__stat-value {
    font-size: 1.5rem;
    font-weight: 700;
  }
  :global(.deck-cards__head) {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: var(--space-md);
    margin-bottom: var(--space-sm);
  }
  :global(.deck-cards__title) {
    margin: 0;
  }
  :global(.deck-cards__total) {
    font-weight: 500;
  }
  :global(.deck-cards__view-toggle) {
    display: inline-flex;
    border-radius: var(--radius-sm);
    background: var(--glass-bg);
    padding: 2px;
    border: 1px solid var(--glass-border);
  }
  :global(.deck-cards__view-btn) {
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
  :global(.deck-cards__view-btn:hover) {
    color: var(--fg);
  }
  :global(.deck-cards__view-btn--active) {
    background: var(--ink);
    color: white;
  }
  :global(.deck-cards__wrap) {
    display: flex;
    gap: var(--space-xl);
    align-items: flex-start;
  }
  :global(.deck-cards__groups) {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-lg);
  }
  :global(.deck-cards__group-title) {
    font-size: 1rem;
    font-weight: 700;
    margin: 0 0 var(--space-xs) 0;
    color: var(--muted);
  }
  :global(.deck-cards__icon-grid) {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
    gap: var(--space-md);
    list-style: none;
    margin: 0;
    padding: 0;
  }
  :global(.deck-cards__icon-item) {
    position: relative;
  }
  :global(.deck-cards__icon-item--hover) {
    opacity: 0.9;
  }
  :global(.deck-cards__icon-trigger) {
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
  :global(.deck-cards__icon-trigger:hover) {
    transform: scale(1.05);
  }
  :global(.deck-cards__icon-img) {
    width: 100%;
    max-width: 90px;
    height: auto;
    aspect-ratio: 40 / 56;
    object-fit: contain;
    display: block;
    border-radius: 6px;
  }
  :global(.deck-cards__icon-placeholder) {
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
  :global(.deck-cards__icon-count) {
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
  :global(.deck-cards__list) {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
    min-width: 0;
  }
  :global(.deck-cards__item) {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-sm);
    padding: 8px 10px;
    border-radius: var(--radius-sm);
    background: var(--glass-bg);
    transition: background 0.15s;
  }
  :global(.deck-cards__item--hover) {
    background: var(--glass-bg-strong);
  }
  :global(.deck-cards__count) {
    font-weight: 700;
    min-width: 1.5em;
    font-size: 1.5rem;
  }
  :global(.deck-cards__ink) {
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
  }
  :global(.deck-cards__ink-img) {
    width: 24px;
    height: 24px;
    object-fit: contain;
  }
  :global(.deck-cards__ink-placeholder) {
    color: var(--muted);
    font-size: 0.9rem;
  }
  :global(.deck-cards__inkable) {
    flex-shrink: 0;
    width: 32px;
    height: 32px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background-size: contain;
    background-repeat: no-repeat;
    background-position: center;
  }
  :global(.deck-cards__inkable--inkwell) {
    background-image: url('/ink/inkwell.svg');
    background-size: 34px;
  }
  :global(.deck-cards__inkable--cost) {
    background-image: url('/ink/inkcost.svg');
    background-size: 30px;
  }
  :global(.deck-cards__inkable-cost) {
    font-size: 0.85rem;
    font-weight: 600;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: #ffffff;
  }
  :global(.deck-cards__inkable-cost--plain) {
    color: #ffffff;
  }
  :global(.deck-cards__inkable-na) {
    color: var(--muted);
    font-size: 0.9rem;
  }
  :global(.deck-cards__info) {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 6px;
  }
  :global(.deck-cards__name) {
    font-size: 0.95rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  :global(.deck-cards__version) {
    font-size: 0.8rem;
  }
  :global(.deck-cards__preview-btn) {
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
  :global(.deck-cards__preview-btn:hover) {
    background: var(--ink);
    color: white;
  }
  :global(.deck-cards__preview-btn-label) {
    display: none;
  }
  @media (min-width: 640px) {
    :global(.deck-cards__preview-btn-label) {
      display: inline;
    }
  }
  :global(.deck-cards__hover-preview) {
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
  :global(.deck-cards__hover-preview--visible) {
    opacity: 1;
    pointer-events: auto;
  }
  :global(.deck-cards__hover-img) {
    width: 100%;
    height: auto;
    display: block;
    border-radius: 6px;
  }
  :global(.deck-cards__hover-placeholder) {
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
  :global(.deck-cards__hover-name) {
    margin: 8px 0 0;
    font-weight: 600;
    font-size: 0.95rem;
  }
  :global(.deck-cards__hover-version) {
    margin: 2px 0 0;
    font-size: 0.8rem;
  }
  @media (max-width: 899px) {
    :global(.deck-cards__hover-preview) {
      display: none;
    }
  }
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
  :global(.deck-preview-modal .deck-preview-card) {
    position: relative;
    max-width: 380px;
    width: 100%;
    padding: var(--space-lg);
    background: var(--card);
    border-radius: var(--radius-lg);
    border: 1px solid var(--glass-border);
    text-align: center;
  }
  :global(.deck-preview-card__img) {
    width: 100%;
    max-width: 280px;
    height: auto;
    display: block;
    margin: 0 auto;
    border-radius: 8px;
  }
  :global(.deck-preview-card__placeholder) {
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
  :global(.deck-preview-card__name) {
    margin: var(--space-md) 0 0;
    font-weight: 700;
    font-size: 1.1rem;
  }
  :global(.deck-preview-card__version) {
    margin: 2px 0 0;
    font-size: 0.9rem;
  }
  :global(.deck-preview-card__meta) {
    margin: 4px 0 0;
    font-size: 0.9rem;
  }
  :global(.deck-preview-card__close) {
    margin-top: var(--space-lg);
  }
  @media (min-width: 900px) {
    .deck-preview-modal {
      display: none;
    }
  }
</style>
