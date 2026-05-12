<script lang="ts">
  import { t } from '$lib/i18n';
  import type { Snippet } from 'svelte';

  interface Props {
    labelledBy: string;
    onDismiss: () => void;
    children: Snippet;
  }
  let { labelledBy, onDismiss, children }: Props = $props();
</script>

<div class="lore-modal" role="dialog" aria-modal="true" aria-labelledby={labelledBy}>
  <button
    type="button"
    class="lore-modal__backdrop"
    aria-label={$t('matches.lore.close')}
    onclick={onDismiss}
  ></button>
  {@render children()}
</div>

<style>
  .lore-modal {
    position: fixed;
    inset: 0;
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    animation: lore-fade-in 0.2s ease-out;
  }

  .lore-modal__backdrop {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    padding: 0;
    border: none;
    background: rgba(0, 0, 0, 0.5);
    cursor: pointer;
    appearance: none;
  }

  /* Applied via className prop on AppCard in each child component. */
  :global(.lore-modal__card) {
    position: relative;
    z-index: 1;
    max-width: 420px;
    width: 100%;
    text-align: center;
  }

  @keyframes lore-fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }
</style>
