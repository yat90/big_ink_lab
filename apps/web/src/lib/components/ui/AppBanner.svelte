<script lang="ts">
  import type { Snippet } from 'svelte';

  type BannerVariant = 'info' | 'success' | 'warning' | 'danger';

  let {
    variant = 'info',
    title = '',
    message = '',
    children = undefined,
    ...rest
  }: {
    variant?: BannerVariant;
    title?: string;
    message?: string;
    children?: Snippet;
    [key: string]: unknown;
  } = $props();

  const role = $derived(variant === 'danger' ? 'alert' : 'status');
  const live = $derived(variant === 'danger' ? 'assertive' : 'polite');
</script>

<div
  class="app-banner"
  class:app-banner--danger={variant === 'danger'}
  class:app-banner--warning={variant === 'warning'}
  class:app-banner--success={variant === 'success'}
  role={role}
  aria-live={live}
  {...rest}
>
  {#if title}
    <p class="app-banner__title">{title}</p>
  {/if}
  {#if message}
    <p class="app-banner__message">{message}</p>
  {/if}
  {#if children}
    {@render children()}
  {/if}
</div>

<style>
  .app-banner {
    margin-top: var(--space-md);
    padding: var(--space-md) 14px;
    border-radius: var(--radius-sm);
    border: 1px solid var(--glass-border);
    background: var(--glass-bg);
    color: var(--fg);
  }

  .app-banner--danger {
    border-color: rgba(220, 38, 38, 0.5);
    background: rgba(220, 38, 38, 0.1);
  }

  .app-banner--warning {
    border-color: color-mix(in srgb, var(--gold) 45%, transparent);
    background: color-mix(in srgb, var(--gold) 14%, transparent);
  }

  .app-banner--success {
    border-color: color-mix(in srgb, var(--ok) 40%, transparent);
    background: color-mix(in srgb, var(--ok) 14%, transparent);
  }

  .app-banner__title {
    margin: 0 0 4px;
    font-weight: 700;
  }

  .app-banner__message {
    margin: 0;
    font-weight: 600;
  }
</style>
