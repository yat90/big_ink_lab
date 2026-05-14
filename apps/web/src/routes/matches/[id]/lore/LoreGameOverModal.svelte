<script lang="ts">
  import AppButton from '$lib/components/ui/AppButton.svelte';
  import AppCard from '$lib/components/ui/AppCard.svelte';
  import { t } from '$lib/i18n';

  interface Props {
    winnerName: string;
    matchId: string;
    canEditMatch: boolean;
    onNextGame: () => void;
  }

  let { winnerName, matchId, canEditMatch, onNextGame }: Props = $props();
</script>

<div class="lore-modal" role="dialog" aria-modal="true" aria-labelledby="game-over-title">
  <div class="lore-modal__backdrop"></div>
  <AppCard className="lore-modal__card">
    <h2 id="game-over-title" class="lore-modal__title lore-game-over__title">
      {$t('matches.lore.winsExclaim', { name: winnerName })}
    </h2>
    <p class="lore-modal__text muted">{$t('matches.lore.nextGamePrompt')}</p>
    <div class="lore-modal__actions">
      <AppButton href="/matches/{matchId}" variant="primary">{$t('matches.lore.backToMatch')}</AppButton>
      {#if canEditMatch}
        <AppButton type="button" onclick={onNextGame}>{$t('matches.lore.nextGame')}</AppButton>
      {/if}
    </div>
  </AppCard>
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
    background: rgba(0, 0, 0, 0.5);
  }

  .lore-modal__title {
    font-size: 1.5rem;
    font-weight: 800;
    margin: 0 0 24px;
  }

  .lore-modal__text {
    margin: 0 0 24px;
  }

  .lore-modal__actions {
    display: flex;
    gap: 12px;
    justify-content: center;
    flex-wrap: wrap;
  }

  .lore-game-over__title {
    color: var(--ok);
  }

  @media (max-width: 480px) {
    .lore-modal__actions :global(.btn) {
      min-height: 52px;
      padding: 14px 24px;
      font-size: 1.1rem;
    }
  }

  @keyframes lore-fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }
</style>
