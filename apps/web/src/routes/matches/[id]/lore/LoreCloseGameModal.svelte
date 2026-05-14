<script lang="ts">
  import AppButton from '$lib/components/ui/AppButton.svelte';
  import AppCard from '$lib/components/ui/AppCard.svelte';
  import { t } from '$lib/i18n';
  import LoreModal from './LoreModal.svelte';

  interface Props {
    onConfirm: () => void;
    onDismiss: () => void;
  }

  let { onConfirm, onDismiss }: Props = $props();
</script>

<LoreModal labelledBy="close-game-title" {onDismiss}>
  <AppCard className="lore-modal__card">
    <h2 id="close-game-title" class="lore-modal__title">{$t('matches.lore.leaveGameTitle')}</h2>
    <p class="lore-modal__text muted">{$t('matches.lore.leaveGameBody')}</p>
    <div class="lore-modal__actions">
      <AppButton type="button" variant="primary" onclick={onConfirm}>{$t('matches.lore.leave')}</AppButton>
      <AppButton type="button" onclick={onDismiss}>{$t('common.cancel')}</AppButton>
    </div>
  </AppCard>
</LoreModal>

<style>
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

  @media (max-width: 480px) {
    .lore-modal__actions :global(.btn) {
      min-height: 52px;
      padding: 14px 24px;
      font-size: 1.1rem;
    }
  }
</style>
