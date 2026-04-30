<script lang="ts">
  import { browser } from '$app/environment';
  import { pullDistance, pullRefreshing } from '$lib/pullToRefreshState';
  import { PULL_TO_REFRESH_THRESHOLD } from '$lib/pullToRefreshConstants';
</script>

{#if browser && ($pullRefreshing || $pullDistance > 4)}
  <div
    class="ptr-indicator"
    role={$pullRefreshing ? 'status' : 'presentation'}
    aria-live={$pullRefreshing ? 'polite' : 'off'}
    aria-busy={$pullRefreshing}
  >
    <div
      class="ptr-indicator__inner"
      style:transform="translateY({$pullRefreshing
        ? 0
        : Math.min(36, $pullDistance * 0.45)}px)"
    >
      {#if $pullRefreshing}
        <span class="spinner ptr-indicator__spinner" aria-hidden="true"></span>
        <span class="ptr-indicator__text">Refreshing…</span>
      {:else}
        <span class="ptr-indicator__text">
          {$pullDistance >= PULL_TO_REFRESH_THRESHOLD ? 'Release to refresh' : 'Pull to refresh'}
        </span>
      {/if}
    </div>
  </div>
{/if}

<style>
  .ptr-indicator {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 40;
    display: flex;
    justify-content: center;
    padding-top: calc(8px + env(safe-area-inset-top, 0px));
    padding-left: env(safe-area-inset-left, 0);
    padding-right: env(safe-area-inset-right, 0);
    pointer-events: none;
  }

  .ptr-indicator__inner {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 10px 18px;
    border-radius: var(--radius-full, 9999px);
    background: var(--glass-dark-bg, rgba(15, 15, 18, 0.92));
    backdrop-filter: saturate(var(--glass-dark-saturate, 160%)) blur(var(--glass-dark-blur, 24px));
    -webkit-backdrop-filter: saturate(var(--glass-dark-saturate, 160%))
      blur(var(--glass-dark-blur, 24px));
    border: 1px solid var(--glass-dark-border, rgba(255, 255, 255, 0.1));
    box-shadow: var(--glass-dark-shadow, 0 4px 24px rgba(0, 0, 0, 0.35));
    transition: transform 0.08s ease-out;
  }

  .ptr-indicator__text {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--fg, #fafafa);
    white-space: nowrap;
  }

  .ptr-indicator__spinner {
    flex-shrink: 0;
  }

  @media (min-width: 640px) {
    .ptr-indicator {
      padding-top: calc(12px + env(safe-area-inset-top, 0px));
    }
  }
</style>
