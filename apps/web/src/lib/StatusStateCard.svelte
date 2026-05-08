<script lang="ts">
  import type { Snippet } from 'svelte';

  type StatusStateKind = 'loading' | 'error' | 'empty';
  type StatusStateAlign = 'left' | 'center';

  interface Props {
    kind: StatusStateKind;
    title?: string;
    message: string;
    align?: StatusStateAlign;
    actions?: Snippet;
    children?: Snippet;
  }

  let { kind, title = '', message, align = 'left', actions = undefined, children = undefined }: Props = $props();

  const role = $derived(kind === 'error' ? 'alert' : 'status');
  const live = $derived(kind === 'error' ? 'assertive' : 'polite');
</script>

<div
  class="card stack status-state-card"
  class:status-state-card--center={align === 'center'}
  class:status-state-card--error={kind === 'error'}
  role={role}
  aria-live={live}
  aria-busy={kind === 'loading'}
>
  {#if kind === 'loading'}
    <span class="spinner status-state-card__spinner" aria-hidden="true"></span>
  {/if}
  {#if title}
    <h2 class="card__title">{title}</h2>
  {/if}
  <p class="card__sub">{message}</p>
  {#if actions}
    {@render actions()}
  {/if}
  {#if children}
    {@render children()}
  {/if}
</div>

<style>
  .status-state-card {
    gap: var(--space-sm);
  }

  .status-state-card--center {
    align-items: center;
    text-align: center;
  }

  .status-state-card--error {
    border-color: color-mix(in srgb, var(--big) 25%, transparent);
    background: var(--danger-soft, rgba(220, 38, 38, 0.05));
  }

  .status-state-card--error :global(.card__title),
  .status-state-card--error :global(.card__sub) {
    color: var(--big);
  }

  .status-state-card__spinner {
    width: 1.25rem;
    height: 1.25rem;
  }
</style>
