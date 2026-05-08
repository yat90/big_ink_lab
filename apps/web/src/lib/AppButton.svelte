<script lang="ts">
  import type { Snippet } from 'svelte';

  type ButtonVariant = 'default' | 'primary' | 'danger' | 'dangerOutline';
  type ButtonSize = 'md' | 'sm';

  let {
    href = '',
    variant = 'default',
    size = 'md',
    icon = false,
    className = '',
    children = undefined,
    ...rest
  }: {
    href?: string;
    variant?: ButtonVariant;
    size?: ButtonSize;
    icon?: boolean;
    className?: string;
    children?: Snippet;
    [key: string]: unknown;
  } = $props();

  const classes = $derived(
    [
      'app-button',
      'btn',
      variant === 'primary' ? 'btn--primary' : '',
      variant === 'danger' ? 'btn--danger' : '',
      variant === 'dangerOutline' ? 'btn--danger-outline' : '',
      size === 'sm' ? 'btn--sm' : '',
      icon ? 'btn--icon' : '',
      icon ? 'app-button--icon' : '',
      className,
    ]
      .filter(Boolean)
      .join(' ')
  );
</script>

{#if href}
  <a href={href} class={classes} {...rest}>
    {#if children}
      {@render children()}
    {/if}
  </a>
{:else}
  <button class={classes} {...rest}>
    {#if children}
      {@render children()}
    {/if}
  </button>
{/if}

<style>
  :global(.app-button--icon > svg) {
    padding-right: var(--space-xs, 4px);
  }
</style>
