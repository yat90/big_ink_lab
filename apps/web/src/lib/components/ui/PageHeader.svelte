<script lang="ts">
  import type { Snippet } from 'svelte';

  /**
   * PageHeader — standardized list-page header.
   *
   * Place it above FilterCard. It owns the title, result count,
   * active-filter chips, and primary action buttons.
   *
   * Example (basic):
   *   <PageHeader title="Matches" resultSummary="24 matches">
   *     {#snippet actions()}
   *       <AppButton href="/matches/new" variant="primary">New match</AppButton>
   *     {/snippet}
   *   </PageHeader>
   *
   * Example (with dismissible filter chips):
   *   <PageHeader
   *     title="Players"
   *     resultSummary="12 players"
   *     chips={[{ label: 'Team: Big Ink', onRemove: clearTeamFilter }]}
   *   >
   *     {#snippet actions()}…{/snippet}
   *   </PageHeader>
   *
   * Guidance for new list pages:
   * - Move FilterCard's `summary` text here as `resultSummary` so it is
   *   always visible, not buried inside the collapsible panel.
   * - Surface the most important active filter as a `chip` so users can
   *   dismiss it without opening the filter panel.
   * - Pass secondary actions (e.g. import, refresh) alongside the primary
   *   CTA inside the `actions` snippet; they get the `.row.row--sm` gap
   *   automatically.
   */

  interface Chip {
    label: string;
    onRemove: () => void;
  }

  interface Props {
    /** Heading text. */
    title: string;
    /** Heading level. Defaults to h2. */
    level?: 2 | 3;
    /** Result count or summary shown muted after the title (e.g. "24 matches"). */
    resultSummary?: string;
    /** Dismissible active-filter chips rendered below the title. */
    chips?: Chip[];
    /** Primary action buttons rendered on the trailing side. */
    actions?: Snippet;
  }

  let { title, level = 2, resultSummary = '', chips = [], actions }: Props = $props();
</script>

<div class="page-header">
  <div class="page-header__main">
    <div class="page-header__title-row">
      {#if level === 3}
        <h3 class="card__title card-title-reset">{title}</h3>
      {:else}
        <h2 class="card__title card-title-reset">{title}</h2>
      {/if}
      {#if resultSummary}
        <span class="page-header__count muted">{resultSummary}</span>
      {/if}
    </div>
    {#if chips.length > 0}
      <div class="page-header__chips" role="group" aria-label="Active filters">
        {#each chips as chip (chip.label)}
          <button
            type="button"
            class="page-header__chip"
            onclick={chip.onRemove}
            aria-label="Remove filter: {chip.label}"
          >
            <span>{chip.label}</span>
            <span class="page-header__chip-dismiss" aria-hidden="true">✕</span>
          </button>
        {/each}
      </div>
    {/if}
  </div>
  {#if actions}
    <div class="page-header__actions">
      {@render actions()}
    </div>
  {/if}
</div>
