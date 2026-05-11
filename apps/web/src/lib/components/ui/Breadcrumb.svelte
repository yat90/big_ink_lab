<script lang="ts">
  import { t } from '$lib/i18n';

  /** One segment. Segments with `href` render as links; without `href` (usually the last) as the current page. */
  export type Item = { label: string; href?: string };

  let {
    items,
    ariaLabel,
    muted = true,
  }: {
    items: Item[];
    ariaLabel?: string;
    /** Apply muted text color (default true). */
    muted?: boolean;
  } = $props();
</script>

<nav
  class="breadcrumb"
  class:muted
  aria-label={ariaLabel?.trim() ? ariaLabel : $t('common.breadcrumbAria')}
>
  <ol class="breadcrumb__list">
    {#each items as item}
      <li class="breadcrumb__item">
        {#if item.href}
          <a class="breadcrumb__link" href={item.href}>{item.label}</a>
        {:else}
          <span class="breadcrumb__current" aria-current="page">{item.label}</span>
        {/if}
      </li>
    {/each}
  </ol>
</nav>

<style>
  .breadcrumb {
    margin: 0 0 var(--space-sm, 0.5rem) 0;
    font-size: 0.875rem;
  }

  .breadcrumb__list {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    list-style: none;
    margin: 0;
    padding: 0;
    gap: 0;
  }

  .breadcrumb__item {
    display: inline-flex;
    align-items: baseline;
    max-width: 100%;
  }

  .breadcrumb__item + .breadcrumb__item::before {
    content: '/';
    padding: 0 0.35rem;
    color: var(--muted);
    flex-shrink: 0;
  }

  .breadcrumb__link {
    color: inherit;
    text-decoration: underline;
    text-underline-offset: 2px;
    word-break: break-word;
  }

  .breadcrumb__current {
    word-break: break-word;
    min-width: 0;
  }
</style>
