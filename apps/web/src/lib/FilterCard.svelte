<script lang="ts">
  import type { Snippet } from 'svelte';
  import IconFilter from '$lib/icons/IconFilter.svelte';

  interface Props {
    /** Header label shown next to the filter icon. */
    title?: string;
    /** Two-way bindable expanded state. Defaults to collapsed. */
    expanded?: boolean;
    /** Small text shown beneath the card while collapsed (e.g. "12 items, guests hidden"). */
    summary?: string;
    /** Chips rendered next to the title to surface active filters at a glance. */
    badges?: string[];
    /** Filter inputs rendered inside the panel when expanded. */
    children?: Snippet;
    /** Stable id used to link the toggle button to the panel for assistive tech. */
    panelId?: string;
    /** When set, a Clear control is shown next to the collapsed summary so filters can be reset without expanding. */
    onClear?: () => void;
    /** Whether {@link onClear} should be enabled. Required when `onClear` is used. */
    canClear?: boolean;
    /** Label for the collapsed (and optional) clear control. */
    clearLabel?: string;
    /**
     * When false, the summary is not repeated at the bottom of the expanded panel
     * (e.g. total count is shown only in the slot’s filters footer).
     */
    showSummaryInExpandedPanel?: boolean;
  }

  let {
    title = 'Filters',
    expanded = $bindable(false),
    summary = '',
    badges = [],
    children,
    panelId = 'filter-card-panel',
    onClear,
    canClear = false,
    clearLabel = 'Clear filters',
    showSummaryInExpandedPanel = true,
  }: Props = $props();

  function toggle() {
    expanded = !expanded;
  }
</script>

<div class="filter-card-wrap">
  <div class="card stack filter-card">
    <button
      type="button"
      class="filter-card__toggle"
      aria-expanded={expanded}
      aria-controls={panelId}
      onclick={toggle}
    >
      <span class="filter-card__toggle-main">
        <span class="filter-card__toggle-icon" aria-hidden="true">
          <IconFilter size={20} />
        </span>
        <span class="filter-card__toggle-label">{title}</span>
        {#each badges as badge (badge)}
          <span class="filter-card__toggle-badge" aria-hidden="true">{badge}</span>
        {/each}
      </span>
      <span class="filter-card__chevron" aria-hidden="true">{expanded ? '▼' : '▶'}</span>
    </button>
    {#if expanded}
      <div id={panelId} class="filter-card__panel">
        {@render children?.()}
        {#if summary && showSummaryInExpandedPanel}
          <p class="filter-card__count muted">{summary}</p>
        {/if}
      </div>
    {/if}
  </div>
  {#if !expanded && (summary || onClear)}
    <div class="filter-card__collapsed-row">
      {#if summary}
        <p class="muted filter-card__summary filter-card__summary--inline">{summary}</p>
      {/if}
      {#if onClear}
        <button
          type="button"
          class="btn filter-card__clear"
          onclick={() => onClear?.()}
          disabled={!canClear}
        >
          {clearLabel}
        </button>
      {/if}
    </div>
  {/if}
</div>
