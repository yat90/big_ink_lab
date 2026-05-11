<script lang="ts">
  import { afterNavigate } from '$app/navigation';
  import { toast, consumePendingToast } from '$lib/toast';
  import { getLocale, translate, t } from '$lib/i18n';

  /**
   * Render this once inside +layout.svelte.
   * Reads any pending sessionStorage toast on each navigation
   * (set via toast.schedule() before a goto() call) and shows it.
   */
  afterNavigate(() => {
    const pending = consumePendingToast();
    if (!pending) return;
    const { message, variant } = pending;
    if (variant === 'success') toast.success(message);
    else if (variant === 'danger') toast.danger(message);
    else if (variant === 'warning') toast.warning(message);
    else toast.info(message);
  }); 

</script>

{#if $toast.length > 0}
  <!--
    Separate polite/assertive regions so screen readers announce each correctly.
    - polite: success, info, warning (announced at the next pause)
    - assertive: danger (announced immediately, interrupting)
  -->
  {@const polite = $toast.filter((t) => t.variant !== 'danger')}
  {@const assertive = $toast.filter((t) => t.variant === 'danger')}

  <div class="toast-region" aria-label="Notifications">
    {#if polite.length > 0}
      <div aria-live="polite" aria-atomic="false">
        {#each polite as t (t.id)}
          <div class="toast toast--{t.variant}" role="status">
            <span class="toast__message">{t.message}</span>
            <button
              type="button"
              class="toast__dismiss"
              onclick={() => toast.dismiss(t.id)}
              aria-label={translate(getLocale(), 'common.toastDismiss')}
            >
              <span aria-hidden="true">✕</span>
            </button>
          </div>
        {/each}
      </div>
    {/if}
    {#if assertive.length > 0}
      <div aria-live="assertive" aria-atomic="false">
        {#each assertive as t (t.id)}
          <div class="toast toast--danger" role="alert">
            <span class="toast__message">{t.message}</span>
            <button
              type="button"
              class="toast__dismiss"
              onclick={() => toast.dismiss(t.id)}
              aria-label={translate(getLocale(), 'common.toastDismiss')}
            >
              <span aria-hidden="true">✕</span>
            </button>
          </div>
        {/each}
      </div>
    {/if}
  </div>
{/if}

<style>
  /* Fixed overlay — bottom-center on mobile (above nav bar), bottom-right on desktop */
  .toast-region {
    position: fixed;
    bottom: calc(72px + env(safe-area-inset-bottom));
    left: 50%;
    transform: translateX(-50%);
    z-index: 110;
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
    width: min(calc(100vw - 32px), 420px);
    pointer-events: none;
  }

  @media (min-width: 640px) {
    .toast-region {
      bottom: var(--space-xl);
      left: auto;
      right: var(--space-xl);
      transform: none;
    }
  }

  .toast {
    display: flex;
    align-items: flex-start;
    gap: var(--space-sm);
    padding: var(--space-md) 14px;
    border-radius: var(--radius-sm);
    border: 1px solid var(--glass-border);
    background: var(--glass-dark-bg);
    backdrop-filter: saturate(var(--glass-dark-saturate)) blur(var(--glass-dark-blur));
    -webkit-backdrop-filter: saturate(var(--glass-dark-saturate)) blur(var(--glass-dark-blur));
    box-shadow: var(--shadow-lg);
    color: var(--fg);
    pointer-events: all;
    animation: toast-in 0.18s var(--ease) both;
  }

  @keyframes toast-in {
    from {
      opacity: 0;
      transform: translateY(6px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .toast--success {
    border-color: color-mix(in srgb, var(--ok) 40%, transparent);
    background: color-mix(in srgb, var(--ok) 10%, var(--glass-dark-bg));
  }

  .toast--warning {
    border-color: color-mix(in srgb, var(--gold) 45%, transparent);
    background: color-mix(in srgb, var(--gold) 10%, var(--glass-dark-bg));
  }

  .toast--danger {
    border-color: rgba(220, 38, 38, 0.5);
    background: color-mix(in srgb, var(--danger) 10%, var(--glass-dark-bg));
  }

  .toast__message {
    flex: 1;
    font-weight: 600;
    font-size: 0.9rem;
    line-height: 1.4;
  }

  .toast__dismiss {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    padding: 0;
    font-size: 0.8rem;
    line-height: 1;
    color: var(--muted);
    background: transparent;
    border: none;
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition:
      color var(--transition),
      background var(--transition);
  }

  .toast__dismiss:hover {
    color: var(--fg);
    background: var(--glass-bg);
  }

  .toast__dismiss:focus-visible {
    outline: 2px solid var(--primary);
    outline-offset: 2px;
  }
</style>
