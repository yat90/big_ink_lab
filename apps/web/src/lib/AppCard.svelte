<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    href = '',
    className = '',
    children = undefined,
    ...rest
  }: {
    href?: string;
    className?: string;
    children?: Snippet;
    [key: string]: unknown;
  } = $props();

  const classes = $derived(['card', 'ui-card', className].filter(Boolean).join(' '));
</script>

{#if href}
  <a href={href} class={`${classes} link-inherit`} {...rest}>
    {#if children}
      {@render children()}
    {/if}
  </a>
{:else}
  <div class={classes} {...rest}>
    {#if children}
      {@render children()}
    {/if}
  </div>
{/if}
